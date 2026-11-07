# ADM-08 物资申请部分发放与签收

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-08)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期4人日，P0；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-03, ADM-07。

覆盖教师、学生和班级的需求、套装展开、逐行获准、缺货待补、分次发放、指定领取人签收、交接争议核定及取消未发剩余。库存只在真实发放时减少，签收不再扣库；应归还教具转入ADM-09继续跟踪。

文件与实施顺序：

- [ ] 第1日：参考`material/MaterialMapper.java`、`MaterialService.java`落地申请行快照与逐行审批
- [ ] 第2日：接入统一StockLedger和分次实发
- [ ] 第3日：新增`doupi-web-admin-react/src/pages/office/material/index.tsx`、`src/api/officeMaterial.ts`（待实施路径），联调签收和争议
- [ ] 第4日：运行MaterialMathTest及MaterialFlowIntegrationTest并验收部分发放、同键重放、自审、越权、超发、争议重确认。验收以20本获准先发12本仍待补8本、签收后库存不再变化为准。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

创建公共字段：`title:string(1..200)`可选，缺省为业务名申请；`applicantUserId:ID`可选，缺省真实Actor，指定他人须`office:request:delegate`及部门范围；`clientSource:enum(ADMIN_WEB,STAFF_APP,WECHAT_MINI,PUBLIC_WEB)`可选默认ADMIN_WEB，只审计终端；`dueAt:ISO8601`可选，表示事项期限，不改变权限。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 创建物资申请 | POST | `/api/v1/office/material-requests` | 公共创建字段；`targetType:string`必填1教师/2学生/3班级；`targetId:ID`可空真实主体；`targetName:string1..64`必填对象快照；`classId:ID`可空；`items:array<=500`可选单品`{goodsId:ID必填,qty:integer>0必填}`；`kitId:ID`可选，出现则`kitCount:integer>0`必填，服务端展开套装，单品与套装结果不可重复goodsId；至少一行 | requestId:string(ID),version:integer,status:string(业务状态)=SUBMITTED,items:array<object>[{requestItemId:string(ID),requestedQty:integer}]；201 | material:request:create |
| 详情查询 | GET | `/api/v1/office/material-requests/{id}` | path id:ID必填 | request:object根、items:array<object>申请明细、records:array<object>领退头、actualItems:array<object>原实发及归还明细；200 | material:request:query |
| 逐行批准 | POST | `/api/v1/office/material-requests/{id}/approve` | id；expectedVersion:integer>=0必填(根版本)；`items:array`必填全体明细，每项`requestItemId:ID,approvedQty:integer>=0`均必填 | requestId:string(ID),version:integer,status:string(业务状态)；200，全部批准0则COMPLETED | material:request:approve |
| 实际发放 | POST | `/api/v1/office/material-requests/{id}/issues` | id；expectedVersion:integer>=0必填(根版本)；`receiverUserId:ID,receiverName:string1..64`必填；`delegateReason:string1..500`指定非申请人/教师对象领取时必填且须material:receiver:delegate；`items:array`非空，每项requestItemId:ID、qty:integer>0必填 | requestId:string(ID),version:integer,status:string(业务状态),recordId:string(ID),receiptStatus:string(交接状态)=PENDING；201 | material:issue:confirm |
| 领取确认 | POST | `/api/v1/office/material-requests/{id}/records/{recordId}/receipt` | id/recordId:ID；expectedVersion:integer>=0必填(根版本)；`expectedRecordVersion:integer>=0`必填；`accepted:boolean`必填，true时`receivedQty:integer>0`必填且等于本次实交合计；`comment:string<=500`可选，争议时必填 | recordId:string(ID),receiptStatus:string(交接状态)=CONFIRMED/DISPUTED,requestId:string(ID),version:integer,status:string(业务状态)；200 | material:receipt:confirm且本人受派 |
| 争议核定 | POST | `/api/v1/office/material-requests/{id}/records/{recordId}/resolve-dispute` | id/recordId；expectedVersion:integer>=0必填(根版本)；expectedRecordVersion:integer>=0必填(领退版本)；`comment:string1..1000`必填核定事实 | recordId:string(ID),receiptStatus:string(交接状态)=PENDING,requestId:string(ID),version:integer,status:string(业务状态)；200，再次交领取人确认 | material:dispute:resolve且固定核定任务 |
| 取消未发 | POST | `/api/v1/office/material-requests/{id}/cancel-remainder` | id；expectedVersion:integer>=0必填(根版本)；`reason:string1..500`必填 | requestId:string(ID),version:integer,status:string(业务状态),items:array<object>；200 | material:request:cancel且申请人/代录人 |

items申请明细逐行返回request_item_id/request_id/line_no/goods_id/kit_id/goods_name/spec/unit/requested_qty/approved_qty/issued_qty/signed_qty/returned_qty/cancelled_qty/target_type/target_id/target_name/class_id/return_required/due_back_at/version/created_by_user_id/created_at/updated_at。records和actualItems包含对应第4节表字段，movement_id为真实流水引用，损坏回收可空；不返回私有文件定位。

## 3. 数据流转细节

| 接口 | 字段处理与固定SQL事实 | 事务、任务、缓存 |
|---|---|---|
| create | 服务端把bizType=MATERIAL加入canonical正文摘要，固定CREATE_REQUEST。Roots核实申请人与部门及rule_snapshot；goodsId查有效edu_goods并复制名称、规格、base_unit、return_required。kitId查启用套装并以quantity×kitCount精确乘法展开。requested_qty来自核对清单，approved/issued/signed/returned/cancelled均0 | 同事务根、申请行、REVIEW/REQUEST任务、MATERIAL_SUBMITTED Outbox、动作结果；不占库存；审核排除真实申请人 |
| detail | 先按biz_type=MATERIAL定位根，Access校验本人、经办、部门或显式个人任务指派，再按request_id关联明细和领退事实 | 只读实时事实，不按姓名猜归属 |
| approve | 锁根后逐request_item_id锁行；逐行0<=approvedQty<=requested_qty，不能漏行或重复行，不能申请人或录入人自审；根SUBMITTED才允许 | 关闭REVIEW；有正批准量建MATERIAL_ISSUE/REQUEST仓库岗位任务，否则COMPLETED；MATERIAL_APPROVED事件；不扣库存 |
| issues | 先锁申请行，检查qty<=approved-issued-cancelled；receiver须有效员工，核实代理资格与理由存audit；建record_type=1和actual item，goods_id升序调用ledger.move负数ISSUE并回填movement_id；issued_qty+=qty | 根WAIT_RECEIPT；创建本次record个人MATERIAL_RECEIPT任务，发MATERIAL_ISSUED；根、实发、余额、旧凭证投影、流水、任务、action及Outbox全原子 |
| receipt | root版本与record版本均匹配；本人受派任务；accepted=true核对receivedQty==total_quantity，记录CONFIRMED/confirmed_by/at，逐明细signed_qty+=base_qty；false记录DISPUTED及原因，signed不变 | 关闭本次签收任务；争议创建MATERIAL_DISPUTE固定岗位任务；记录版本+1，根由全部子项聚合；不修改库存或释放可补发额度 |
| resolve-dispute | 独立核定人先CLAIM争议任务，record必须DISPUTED；记录核实结论，状态回PENDING并找原指定领取人重建个人确认任务 | 原实发量与库存均保留；MATERIAL_DISPUTE_RESOLVED事件定向原领取人；不能凭核定人单方点击增加signed_qty |
| cancel-remainder | 只取消APPROVED/PROCESSING/WAIT_RECEIPT/WAIT_SETTLEMENT中的未发额度，cancelled_qty=approved_qty-issued_qty；reason进动作证据 | 不回滚已发，不增库存。全部获准已签收或取消后，仍按应归还与责任待办决定WAIT_SETTLEMENT或COMPLETED |

每条写命令的expectedVersion只由Commands比较并递增一次；子路径recordId被服务端加入摘要，不能同键换另一交接单重放。全体signed、应归还、损坏责任任一未清都不提前关闭。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**office_request**

```sql
CREATE TABLE `office_request` (
  `request_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '一次申请/审批聚合',
  `request_no` VARCHAR(32) NOT NULL COMMENT '事项编号',
  `biz_type` VARCHAR(24) NOT NULL COMMENT 'PRINT/MATERIAL/STOCK_CHECK等固定业务',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `created_by_user_id` BIGINT NOT NULL COMMENT '实际录入主体，来自认证上下文，代录时不冒充申请人',
  `applicant_user_id` BIGINT NOT NULL COMMENT '真实原申请人，默认JWT主体；仅有代录权限且范围内可指定，经服务器核实',
  `applicant_dept_id` BIGINT NOT NULL COMMENT '从真实申请人资料派生的提交部门快照，不信任客户端部门',
  `handler_user_id` BIGINT NULL COMMENT '当前经办人',
  `client_source` VARCHAR(16) NOT NULL COMMENT 'ADMIN_WEB/STAFF_APP/WECHAT_MINI/PUBLIC_WEB，仅来源',
  `status` VARCHAR(24) NOT NULL COMMENT '根状态，不代表库存事实',
  `current_node` VARCHAR(32) NULL COMMENT '当前固定节点',
  `rule_snapshot` JSON NOT NULL COMMENT '本次固定节点规则快照：规则版本、审批人/职责、免审条件、判定来源，禁止客户端任意定义',
  `revision` INT NOT NULL DEFAULT 1 COMMENT '内容修订轮次',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '跨子项动作根行版本',
  `request_key` VARCHAR(64) NOT NULL COMMENT '创建幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '规范创建载荷摘要',
  `due_at` DATETIME(3) NULL COMMENT '期限',
  `submitted_at` DATETIME(3) NULL COMMENT '最近提交',
  `closed_at` DATETIME(3) NULL COMMENT '完成/取消结案',
  `cancelled_at` DATETIME(3) NULL COMMENT '取消决定，不自动退库',
  `cancel_reason` VARCHAR(500) NULL COMMENT '取消原因',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`request_id`),
  UNIQUE `uk_request_no` (
    `request_no`
  ),
  UNIQUE `uk_request_create` (
    `created_by_user_id`,
    `biz_type`,
    `request_key`
  ),
  INDEX `idx_request_applicant` (`applicant_user_id`, `status`, `created_at`),
  INDEX `idx_request_handler` (`handler_user_id`, `status`, `due_at`),
  INDEX `idx_request_dept` (`applicant_dept_id`, `biz_type`, `status`, `created_at`),
  CONSTRAINT `fk_ref_002` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_003` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_004` FOREIGN KEY (`applicant_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_005` FOREIGN KEY (`handler_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request';
```

**office_task**

```sql
CREATE TABLE `office_task` (
  `task_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '待办',
  `request_id` BIGINT NOT NULL COMMENT '所属事项',
  `target_type` VARCHAR(32) NOT NULL COMMENT '具体任务对象REQUEST/PRINT/DELIVERY等',
  `target_id` BIGINT NOT NULL COMMENT '审批指request_id、核销指print_id、签收指delivery_id；强制校验所属根',
  `node_code` VARCHAR(32) NOT NULL COMMENT 'REVIEW/PRINT_EXECUTE/RECEIPT/CHECK_REVIEW等',
  `round_no` INT NOT NULL COMMENT '退回后新轮次',
  `task_order` INT NOT NULL DEFAULT 1 COMMENT '同节点固定任务序号',
  `assignee_user_id` BIGINT NULL COMMENT '指派/认领人',
  `assignee_role_id` BIGINT NULL COMMENT '职责队列，仍检查资格及范围',
  `excluded_user_id` BIGINT NULL COMMENT '盘点经办人等不得完成复核者',
  `status` VARCHAR(16) NOT NULL COMMENT 'OPEN/CLAIMED/COMPLETED/CANCELLED',
  `due_at` DATETIME(3) NULL COMMENT '期限',
  `claimed_at` DATETIME(3) NULL COMMENT '认领时间',
  `acted_by` BIGINT NULL COMMENT '实际完成人',
  `acted_at` DATETIME(3) NULL COMMENT '完成时间',
  `decision` VARCHAR(24) NULL COMMENT 'APPROVE/RETURN等',
  `comment` VARCHAR(1000) NULL COMMENT '意见、退回原因',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '并发认领/完成',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`task_id`),
  UNIQUE `uk_task_node` (
    `request_id`,
    `node_code`,
    `round_no`,
    `task_order`
  ),
  INDEX `idx_task_user` (`assignee_user_id`, `status`, `due_at`),
  INDEX `idx_task_role` (`assignee_role_id`, `status`, `due_at`),
  INDEX `idx_task_request` (`request_id`, `status`),
  INDEX `idx_task_target` (`target_type`, `target_id`, `status`),
  CONSTRAINT `fk_ref_006` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_007` FOREIGN KEY (`assignee_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_008` FOREIGN KEY (`excluded_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_009` FOREIGN KEY (`acted_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_010` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_101` FOREIGN KEY (`assignee_role_id`) REFERENCES `sys_role` (
    `role_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_task';
```

**office_action_log**

```sql
CREATE TABLE `office_action_log` (
  `action_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '已提交动作',
  `request_id` BIGINT NOT NULL COMMENT '聚合',
  `task_id` BIGINT NULL COMMENT '待办',
  `target_type` VARCHAR(32) NOT NULL COMMENT 'PRINT/ISSUE/SETTLEMENT/DELIVERY等',
  `target_id` BIGINT NULL COMMENT '本次子记录，创建时同事务回填',
  `action_code` VARCHAR(64) NOT NULL COMMENT '幂等operation固定动作，如PRINT_ISSUE，不拼目标ID',
  `actor_user_id` BIGINT NOT NULL COMMENT '认证上下文操作者',
  `actor_dept_id` BIGINT NULL COMMENT '部门快照',
  `client_source` VARCHAR(16) NOT NULL COMMENT '四端来源，仅审计',
  `from_status` VARCHAR(24) NULL COMMENT '前状态',
  `to_status` VARCHAR(24) NULL COMMENT '后状态',
  `request_revision` INT NOT NULL COMMENT '所依据申请版本',
  `idempotency_key` VARCHAR(64) NOT NULL COMMENT '幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '含目标ID及规范正文',
  `result_code` INT NOT NULL COMMENT '已提交响应状态',
  `result_json` JSON NOT NULL COMMENT '可重放最小响应，不含临时文件地址/凭证',
  `before_json` JSON NULL COMMENT '脱敏前值快照',
  `after_json` JSON NULL COMMENT '脱敏后值快照，含核销更正历史',
  `created_at` DATETIME(3) NOT NULL COMMENT '提交时间，不允许普通编辑删除',
  PRIMARY KEY (`action_id`),
  UNIQUE `uk_action_idempotency` (
    `actor_user_id`,
    `action_code`,
    `idempotency_key`
  ),
  INDEX `idx_action_request` (`request_id`, `action_id`),
  INDEX `idx_action_task` (`task_id`),
  CONSTRAINT `fk_ref_011` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_012` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_013` FOREIGN KEY (`actor_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_102` FOREIGN KEY (`task_id`) REFERENCES `office_task` (
    `task_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_action_log';
```

**edu_material_request_item**

```sql
CREATE TABLE `edu_material_request_item` (
  `request_item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '申请明细',
  `request_id` BIGINT NOT NULL COMMENT '根1:N',
  `line_no` INT NOT NULL COMMENT '申请内稳定行号',
  `goods_id` BIGINT NOT NULL COMMENT '物品',
  `kit_id` BIGINT NULL COMMENT '套装来源',
  `goods_name` VARCHAR(100) NOT NULL COMMENT '申请快照',
  `spec` VARCHAR(100) NULL COMMENT '规格快照',
  `unit` VARCHAR(20) NOT NULL COMMENT '基础单位快照',
  `requested_qty` BIGINT NOT NULL COMMENT '申请量',
  `approved_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '获准量',
  `issued_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '实发累计投影',
  `signed_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '已签收累计投影',
  `returned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '已接收实物归还，包含接收损坏品',
  `cancelled_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '取消未发量',
  `target_type` CHAR(1) NOT NULL COMMENT '教师/学生/班级',
  `target_id` BIGINT NULL COMMENT '真实对象，无学生档案不编造ID',
  `target_name` VARCHAR(64) NOT NULL COMMENT '快照',
  `class_id` BIGINT NULL COMMENT '班级',
  `return_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '批准时应归还快照',
  `due_back_at` DATETIME(3) NULL COMMENT '归还期限',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '并发发放/归还',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`request_item_id`),
  UNIQUE `uk_material_request_line` (
    `request_id`,
    `line_no`
  ),
  INDEX `idx_material_request_goods` (`goods_id`, `request_id`),
  CONSTRAINT `fk_ref_068` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_069` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_070` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (
    `kit_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_071` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_072` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_material_request_item';
```

**edu_material_record**

```sql
CREATE TABLE `edu_material_record` (
  `record_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务流水单号',
  `record_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务类型(1发放领取 2退还回收)',
  `business_category` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务场景(教师工作武器/学生选科领书/班级领用/教师离职交接/学生退学退书/其他)',
  `target_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '对象类型(1教师 2学生 3班级)',
  `target_id` BIGINT DEFAULT NULL COMMENT '关联对象ID(如教师ID/班级ID)',
  `target_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领用/归还人姓名(教师姓名/学生姓名)',
  `class_id` BIGINT DEFAULT NULL COMMENT '关联班级ID',
  `class_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联班级名称',
  `grade` VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属年级',
  `subject` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属选科/学科',
  `kit_id` BIGINT DEFAULT NULL COMMENT '引用的物资套装ID',
  `kit_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '引用的物资套装名称',
  `total_quantity` BIGINT NOT NULL DEFAULT '0' COMMENT '总件数',
  `image_url` VARCHAR(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '实物/签领拍照留存图片URL(非必填)',
  `operator` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办教务人员',
  `operate_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() COMMENT '经办时间',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态(0正常 1已撤销)',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志(0正常 2删除)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注说明',
  PRIMARY KEY (`record_id`),
  UNIQUE `idx_record_no` (
    `record_no`
  ),
  INDEX `idx_record_type` (`record_type`),
  INDEX `idx_operate_time` (`operate_time`),
  INDEX `idx_target_name` (`target_name`),
  `request_id` BIGINT NULL COMMENT '新增，同一申请可多次领退',
  `operator_user_id` BIGINT NULL COMMENT '新增，新记录须真实身份',
  `receipt_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/CONFIRMED/DISPUTED',
  `confirmed_by` BIGINT NULL COMMENT '新增，领取/归还确认人',
  `confirmed_at` DATETIME(3) NULL COMMENT '新增',
  `action_id` BIGINT NULL COMMENT '新增，历史可空',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_material_action` (
    `action_id`
  ),
  INDEX `idx_material_request` (`request_id`, `operate_time`),
  INDEX `idx_material_target` (`target_type`, `target_id`, `operate_time`),
  INDEX `idx_material_class` (`class_id`, `operate_time`),
  CONSTRAINT `fk_ref_060` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_061` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_062` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (
    `kit_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_063` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_064` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_065` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退记录表';
```

**edu_material_record_item**

```sql
CREATE TABLE `edu_material_record_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `record_id` BIGINT NOT NULL COMMENT '主记录ID',
  `goods_id` BIGINT NOT NULL COMMENT '物资ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物资名称',
  `spec` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格型号',
  `unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '计量单位',
  `quantity` BIGINT NOT NULL DEFAULT '1' COMMENT '数量',
  `item_status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '完好' COMMENT '物品状态(完好/轻微磨损/损坏报损)',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  PRIMARY KEY (`item_id`),
  INDEX `idx_record_id` (`record_id`),
  INDEX `idx_goods_id` (`goods_id`),
  `request_item_id` BIGINT NULL COMMENT '新增，获准申请明细',
  `original_issue_item_id` BIGINT NULL COMMENT '新增，归还必须指向原发放明细',
  `base_qty` BIGINT NOT NULL COMMENT '新增，基础数量',
  `conversion_rate` INT NOT NULL DEFAULT 1 COMMENT '新增，换算快照',
  `condition_code` VARCHAR(16) NOT NULL COMMENT '新增，GOOD/REUSABLE/DAMAGED/LOST',
  `usable_return_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，本次验收可用归还量',
  `liability_status` VARCHAR(16) NOT NULL DEFAULT 'NONE' COMMENT '新增，NONE/PENDING/RESOLVED，物归还不代表责任结清',
  `liability_decided_by` BIGINT NULL COMMENT '新增，有权处置人',
  `liability_decided_at` DATETIME(3) NULL COMMENT '新增',
  `liability_comment` VARCHAR(1000) NULL COMMENT '新增，处置意见',
  `movement_id` BIGINT NULL COMMENT '新增，损坏归还为NULL，不产生可用正流水',
  INDEX `idx_material_request_item` (`request_item_id`),
  INDEX `idx_material_original` (`original_issue_item_id`),
  UNIQUE `uk_material_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_066` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_067` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_112` FOREIGN KEY (`record_id`) REFERENCES `edu_material_record` (
    `record_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_113` FOREIGN KEY (`request_item_id`) REFERENCES `edu_material_request_item` (
    `request_item_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_114` FOREIGN KEY (`original_issue_item_id`) REFERENCES `edu_material_record_item` (
    `item_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  liability_qty BIGINT NOT NULL DEFAULT 0 COMMENT '原发放行本轮遗失申报量，不作实物归还',
  written_off_qty BIGINT NOT NULL DEFAULT 0 COMMENT '有权核准免追还数量，不增可用库存',
  CONSTRAINT chk_material_disposal CHECK (liability_qty >= 0 AND written_off_qty >= 0 AND written_off_qty <= base_qty)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退明细表';
```

**stock_movement**

```sql
CREATE TABLE `stock_movement` (
  `movement_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '流水，不当作全库提交顺序',
  `goods_id` BIGINT NOT NULL COMMENT '所有写入先锁该物品余额',
  `request_id` BIGINT NULL COMMENT '来源事项',
  `action_id` BIGINT NOT NULL COMMENT '一次动作可多物品',
  `source_type` VARCHAR(32) NOT NULL COMMENT 'IN_ITEM/OUT_ITEM/PRINT_PAPER/CHECK_ITEM等',
  `source_id` BIGINT NOT NULL COMMENT '来源头/纸张事件',
  `source_item_id` BIGINT NOT NULL COMMENT '来源明细，一规格事件取issue_id',
  `movement_kind` VARCHAR(24) NOT NULL COMMENT 'RECEIVE/ISSUE/RETURN/CHECK_ADJUST/CORRECTION/OPENING',
  `delta_qty` BIGINT NOT NULL COMMENT '基础量增减，入正出负',
  `before_qty` BIGINT NOT NULL COMMENT '变化前可用量',
  `after_qty` BIGINT NOT NULL COMMENT '变化后量，必须非负',
  `base_unit` VARCHAR(20) NOT NULL COMMENT '历史单位快照',
  `goods_version` BIGINT NOT NULL COMMENT '该物品变化后版本，逐物品递增',
  `actor_user_id` BIGINT NOT NULL COMMENT '操作者身份',
  `occurred_at` DATETIME(3) NOT NULL COMMENT '实物时间，可补录，不作并发边界',
  `posted_at` DATETIME(3) NOT NULL COMMENT '入账时间',
  `reversal_of_movement_id` BIGINT NULL COMMENT '经批准更正的原流水，真实归还是RETURN',
  `reason` VARCHAR(1000) NULL COMMENT '变动依据',
  PRIMARY KEY (`movement_id`),
  UNIQUE `uk_movement_source` (
    `source_type`,
    `source_id`,
    `source_item_id`,
    `movement_kind`
  ),
  UNIQUE `uk_goods_movement_version` (
    `goods_id`,
    `goods_version`
  ),
  INDEX `idx_movement_goods` (`goods_id`, `movement_id`),
  INDEX `idx_movement_request` (`request_id`, `movement_id`),
  INDEX `idx_movement_action` (`action_id`),
  INDEX `idx_movement_reversal` (`reversal_of_movement_id`),
  CONSTRAINT `ck_stock_movement_0` CHECK (delta_qty <> 0),
  CONSTRAINT `ck_stock_movement_1` CHECK (after_qty >= 0),
  CONSTRAINT `fk_ref_073` FOREIGN KEY (reversal_of_movement_id) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_074` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_075` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_076` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_077` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='stock_movement';
```

**sys_outbox_event**

```sql
CREATE TABLE `sys_outbox_event` (
  `event_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消费去重身份',
  `event_key` VARCHAR(128) NOT NULL COMMENT '稳定事件键',
  `event_type` VARCHAR(64) NOT NULL COMMENT 'REQUEST_SUBMITTED/TASK_ASSIGNED等',
  `aggregate_type` VARCHAR(32) NOT NULL COMMENT 'REQUEST/NOTICE/APPOINTMENT等',
  `aggregate_id` BIGINT NOT NULL COMMENT '根ID',
  `aggregate_version` BIGINT NOT NULL COMMENT '提交后的根版本',
  `request_id` BIGINT NULL COMMENT '办公事项可空',
  `payload` JSON NOT NULL COMMENT '最小引用，不存原稿、临时地址、令牌',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PROCESSING/SENT/DEAD',
  `attempts` INT NOT NULL DEFAULT 0 COMMENT '尝试次数',
  `next_attempt_at` DATETIME(3) NOT NULL COMMENT '下次重试',
  `locked_by` VARCHAR(64) NULL COMMENT '租约持有者',
  `locked_until` DATETIME(3) NULL COMMENT '租约到期，故障可恢复',
  `last_error` VARCHAR(1000) NULL COMMENT '脱敏错误',
  `created_at` DATETIME(3) NOT NULL COMMENT '业务事务内创建',
  `published_at` DATETIME(3) NULL COMMENT '派发成功时间',
  PRIMARY KEY (`event_id`),
  UNIQUE `uk_outbox_key` (
    `event_key`
  ),
  UNIQUE `uk_outbox_aggregate` (
    `aggregate_type`,
    `aggregate_id`,
    `aggregate_version`,
    `event_type`
  ),
  INDEX `idx_outbox_pending` (`status`, `next_attempt_at`, `event_id`),
  INDEX `idx_outbox_lease` (`status`, `locked_until`),
  INDEX `idx_outbox_request` (`request_id`),
  CONSTRAINT `fk_ref_082` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_outbox_event';
```

## 5. 代码实现骨架

Java17、Spring Boot4.0.3、MyBatis4.0.1可运行参考实现如下，公共依赖见[公共契约](../00-shared/公共契约.md)。本轮维护开发计划、数据库结构资料与目录，不开发业务功能。



**backend/src/main/java/com/doupi/planref/material/MaterialController.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/material-requests")
public class MaterialController {
    private final MaterialService service;
    public MaterialController(MaterialService service){this.service=service;}
    @PostMapping public ResponseEntity<Map<String,Object>> create(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.create(key,b),201);}
    @GetMapping("/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
    @PostMapping("/{id}/approve") public ResponseEntity<Map<String,Object>> approve(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.approve(id,key,b),200);}
    @PostMapping("/{id}/issues") public ResponseEntity<Map<String,Object>> issue(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.issue(id,key,b),201);}
    @PostMapping("/{id}/records/{recordId}/receipt") public ResponseEntity<Map<String,Object>> receipt(@PathVariable long id,@PathVariable long recordId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.receipt(id,recordId,key,b),200);}
    @PostMapping("/{id}/cancel-remainder") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.cancelRemainder(id,key,b),200);}
    @PostMapping("/{id}/returns") public ResponseEntity<Map<String,Object>> returns(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.receiveReturn(id,key,b),201);}
    @PostMapping("/{id}/items/{itemId}/liability") public ResponseEntity<Map<String,Object>> liability(@PathVariable long id,@PathVariable long itemId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.liability(id,itemId,key,b),200);}
    @PostMapping("/{id}/records/{recordId}/resolve-dispute") public ResponseEntity<Map<String,Object>> dispute(@PathVariable long id,@PathVariable long recordId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.resolveDispute(id,recordId,key,b),200);}
    @PostMapping("/{id}/losses") public ResponseEntity<Map<String,Object>> loss(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.reportLoss(id,key,b),201);}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialService.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MaterialService {
    private final MaterialMapper mapper;
    private final Commands commands;
    private final Roots roots;
    private final Rules rules;
    private final StockLedger ledger;
    public MaterialService(MaterialMapper mapper,Commands commands,Roots roots,Rules rules,StockLedger ledger) {
        this.mapper=mapper;this.commands=commands;this.roots=roots;this.rules=rules;this.ledger=ledger;
    }
    public Map<String,Object> create(String key,Map<String,Object> body) {
        Actors.current().require("material:request:create");
        Map<String,Object>canonical=new LinkedHashMap<>(body);canonical.put("bizType","MATERIAL");
        return commands.create("CREATE_REQUEST",key,canonical,201,()->roots.create("MATERIAL",key,canonical),c->{
            requireMaterial(c);
            List<Map<String,Object>> items=new ArrayList<>(body.containsKey("items")?Inputs.list(body,"items"):List.of());
            Long kitId=body.get("kitId")==null?null:Inputs.id(body,"kitId");
            if(kitId!=null) {
                long multiplier=Inputs.positive(body,"kitCount");
                for(Map<String,Object> line:mapper.kit(kitId)) items.add(P.of("goodsId",line.get("goods_id"),"qty",Math.multiplyExact(Inputs.number(line.get("quantity")),multiplier)));
            }
            if(items.isEmpty()) throw Problem.bad("至少选择一个单品或非空套装");
            Set<Long> seen=new HashSet<>();List<Map<String,Object>> result=new ArrayList<>();int lineNo=0;
            for(Map<String,Object> item:items) {
                long goodsId=Inputs.id(item,"goodsId"),qty=Inputs.positive(item,"qty");
                if(!seen.add(goodsId)) throw Problem.bad("同物品请合并数量，不能重复行");
                Map<String,Object> goods=mapper.goods(goodsId);
                String targetName=Inputs.text(body,"targetName",1,64);
                long id=mapper.insertLine(P.of("request",c.requestId(),"line",++lineNo,"goods",goodsId,"kit",kitId,"name",goods.get("goods_name"),"spec",goods.get("spec"),"unit",goods.get("base_unit"),"qty",qty,"type",targetType(body),"target",body.get("targetId"),"targetName",targetName,"classId",body.get("classId"),"returnRequired",goods.get("return_required"),"actor",c.actor().userId()));
                result.add(P.of("requestItemId",id,"requestedQty",qty));
            }
            mapper.db().write("UPDATE office_request SET status='SUBMITTED',current_node='REVIEW',submitted_at=CURRENT_TIMESTAMP WHERE request_id=#{p.id}",P.of("id",c.requestId()));
            Long role=rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot")));
            c.task("REVIEW","REQUEST",c.requestId(),null,role,n(c.request(),"applicant_user_id"));
            c.event("MATERIAL_SUBMITTED",P.of("title","物资申请待审核"));
            c.target("REQUEST",c.requestId());return P.of("requestId",c.requestId(),"items",result,"status","SUBMITTED");
        });
    }
    public Map<String,Object> approve(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:request:approve");
        return commands.run(id,"MATERIAL_APPROVE",key,body,200,c->{
            requireMaterial(c);
            if(!"SUBMITTED".equals(c.request().get("status"))) throw Problem.conflict("不在待审核状态");
            if(n(c.request(),"applicant_user_id")==c.actor().userId()||n(c.request(),"created_by_user_id")==c.actor().userId()) throw Problem.forbidden("不能审批本人申请");
            requireTask(c,"REVIEW","REQUEST",id);
            Set<Long> seen=new HashSet<>();
            for(Map<String,Object> decision:Inputs.list(body,"items")) {
                long lineId=Inputs.id(decision,"requestItemId"),qty=Inputs.nonNegative(decision,"approvedQty");
                if(!seen.add(lineId)) throw Problem.bad("重复审核行");
                Map<String,Object> line=mapper.item(lineId,id);
                if(qty>Inputs.number(line.get("requested_qty"))) throw Problem.bad("批准量不能超过申请量");
                mapper.db().write("UPDATE edu_material_request_item SET approved_qty=#{p.qty},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",lineId));
            }
            if(seen.size()!=mapper.lines(id).size()) throw Problem.bad("必须逐项确认全部申请明细");
            boolean hasApproved=mapper.lines(id).stream().anyMatch(l->n(l,"approved_qty")>0);
            mapper.db().write("UPDATE office_request SET status=#{p.state},current_node=#{p.node},closed_at=CASE WHEN #{p.state}='COMPLETED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE request_id=#{p.id}",P.of("state",hasApproved?"APPROVED":"COMPLETED","node",hasApproved?"MATERIAL_ISSUE":null,"id",id));
            c.closeTasks("REVIEW","REQUEST",id);
            if(hasApproved)c.task("MATERIAL_ISSUE","REQUEST",id,null,rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot"))),null);
            c.event("MATERIAL_APPROVED",P.of("title","物资申请已批准"));
            return P.of("requestId",id,"status","APPROVED");
        });
    }
    public Map<String,Object> issue(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:issue:confirm");
        return commands.run(id,"MATERIAL_ISSUE",key,body,201,c->{
            requireMaterial(c);
            if(!Set.of("APPROVED","PROCESSING","WAIT_RECEIPT").contains(c.request().get("status"))) throw Problem.conflict("当前事项不能发放");
            List<Map<String,Object>> inputs=Inputs.list(body,"items");if(inputs.isEmpty()) throw Problem.bad("发放明细不能为空");
            requireTask(c,"MATERIAL_ISSUE","REQUEST",id);
            long total=0;Set<Long> ids=new HashSet<>();List<Map<String,Object>> locked=new ArrayList<>();
            inputs.sort(Comparator.comparingLong(x->Inputs.id(x,"requestItemId")));
            for(Map<String,Object> input:inputs) {
                long lineId=Inputs.id(input,"requestItemId"),qty=Inputs.positive(input,"qty");if(!ids.add(lineId)) throw Problem.bad("重复发放行");
                Map<String,Object> line=mapper.item(lineId,id);
                if(qty>MaterialMath.remaining(n(line,"approved_qty"),n(line,"issued_qty"),n(line,"cancelled_qty"))) throw Problem.conflict("发放超过获准待发量");
                line.put("this_qty",qty);locked.add(line);total=Math.addExact(total,qty);
            }
            long receiver=Inputs.id(body,"receiverUserId");
            mapper.db().required("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",receiver));
            boolean direct=receiver==n(c.request(),"applicant_user_id")||locked.stream().anyMatch(l->"1".equals(l.get("target_type"))&&l.get("target_id")!=null&&n(l,"target_id")==receiver);
            if(!direct){c.actor().require("material:receiver:delegate");Inputs.text(body,"delegateReason",1,500);}
            c.audit(P.of("receiverUserId",receiver,"delegateReason",body.get("delegateReason")));
            long recordId=mapper.insertRecord(c,"1",Inputs.text(body,"receiverName",1,64),total);
            locked.sort(Comparator.comparingLong(x->n(x,"goods_id")));
            for(Map<String,Object> line:locked) {
                long qty=n(line,"this_qty"),itemId=mapper.insertActual(recordId,line,qty,null,"GOOD",c);
                long movementId=ledger.move(c,n(line,"goods_id"),-qty,"MATERIAL_RECORD",recordId,itemId,"ISSUE","物资实物发放");
                mapper.movement(itemId,movementId);
                mapper.db().write("UPDATE edu_material_request_item SET issued_qty=issued_qty+#{p.qty},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",line.get("request_item_id")));
            }
            mapper.db().write("UPDATE office_request SET status='WAIT_RECEIPT',current_node='MATERIAL_RECEIPT' WHERE request_id=#{p.id}",P.of("id",id));
            c.target("MATERIAL_RECORD",recordId);c.task("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId,Inputs.id(body,"receiverUserId"),null,null);
            c.event("MATERIAL_ISSUED",P.of("recordId",recordId,"userId",Inputs.id(body,"receiverUserId"),"title","请确认实际领取物资"));
            return P.of("requestId",id,"recordId",recordId,"receiptStatus","PENDING");
        });
    }
    public Map<String,Object> receipt(long id,long recordId,String key,Map<String,Object> body) {
        Actors.current().require("material:receipt:confirm");
        return commands.run(id,"MATERIAL_RECEIPT",key,target(body,"MATERIAL_RECORD",recordId),200,c->{
            requireMaterial(c);
            Map<String,Object> record=mapper.record(recordId,id);if(!"1".equals(record.get("record_type"))||!"PENDING".equals(record.get("receipt_status"))) throw Problem.conflict("该实发记录不能再次签收");
            requireTask(c,"MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
            if(!body.containsKey("accepted"))throw Problem.bad("accepted必填");
            boolean accepted=Inputs.bool(body,"accepted",false);
            if(Inputs.nonNegative(body,"expectedRecordVersion")!=n(record,"version"))throw Problem.conflict("实发记录已更新");
            if(accepted)MaterialMath.requireSignature(n(record,"total_quantity"),Inputs.positive(body,"receivedQty"));
            String remark=Inputs.optionalText(body,"comment",500);if(!accepted&&(remark==null||remark.isBlank())) throw Problem.bad("争议必须说明原因");
            mapper.db().write("UPDATE edu_material_record SET receipt_status=#{p.state},confirmed_by=#{p.actor},confirmed_at=CURRENT_TIMESTAMP,version=version+1 WHERE record_id=#{p.id}",P.of("state",accepted?"CONFIRMED":"DISPUTED","actor",c.actor().userId(),"id",recordId));
            if(accepted) {
                for(Map<String,Object> item:mapper.db().list("SELECT * FROM edu_material_record_item WHERE record_id=#{p.id}",P.of("id",recordId)))
                    mapper.db().write("UPDATE edu_material_request_item SET signed_qty=signed_qty+#{p.qty},version=version+1 WHERE request_item_id=#{p.id}",P.of("qty",item.get("base_qty"),"id",item.get("request_item_id")));
                c.closeTasks("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
            }
            else {
                c.closeTasks("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
                c.task("MATERIAL_DISPUTE","MATERIAL_RECORD",recordId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());
            }
            c.audit(P.of("receiptComment",remark,"accepted",accepted));
            refresh(c);c.target("MATERIAL_RECORD",recordId);return P.of("recordId",recordId,"receiptStatus",accepted?"CONFIRMED":"DISPUTED");
        });
    }
    public Map<String,Object> cancelRemainder(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:request:cancel");
        return commands.run(id,"MATERIAL_CANCEL_REMAINDER",key,body,200,c->{
            requireMaterial(c);
            if(!Set.of("APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT").contains(c.request().get("status")))throw Problem.conflict("当前不能取消剩余获准量");
            if(n(c.request(),"applicant_user_id")!=c.actor().userId()&&n(c.request(),"created_by_user_id")!=c.actor().userId())throw Problem.forbidden("仅申请人或录入人可取消未发需求");
            String reason=Inputs.text(body,"reason",1,500);c.audit(P.of("reason",reason));
            for(Map<String,Object> line:mapper.lines(id)) mapper.db().write("UPDATE edu_material_request_item SET cancelled_qty=approved_qty-issued_qty,version=version+1 WHERE request_item_id=#{p.id}",P.of("id",line.get("request_item_id")));
            refresh(c);return P.of("requestId",id,"items",mapper.lines(id));
        });
    }
    public Map<String,Object> receiveReturn(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:return:accept");
        return commands.run(id,"MATERIAL_RETURN",key,body,201,c->receiveReturnWithin(c,body));
    }
    // Reuse the existing physical-return transaction without starting a nested Commands command.
    Map<String,Object> receiveReturnWithin(Commands.Context c,Map<String,Object> body) {
            c.actor().require("material:return:accept");
            long id=c.requestId();
            requireMaterial(c);
            requireWarehouse(c);
            List<Map<String,Object>> values=Inputs.list(body,"items");if(values.isEmpty()) throw Problem.bad("归还明细不能为空");
            values.sort(Comparator.comparingLong(v->Inputs.id(v,"originalIssueItemId")));
            List<Map<String,Object>> prepared=new ArrayList<>();
            for(Map<String,Object> input:values){Map<String,Object> original=mapper.original(Inputs.id(input,"originalIssueItemId"),id);Map<String,Object> line=mapper.item(n(original,"request_item_id"),id);Map<String,Object> v=new LinkedHashMap<>(input);v.put("_original",original);v.put("_line",line);prepared.add(v);}
            prepared.sort(Comparator.comparingLong(v->n(Inputs.map(v.get("_line")),"goods_id")));
            long total=0;for(Map<String,Object> v:values) total=Math.addExact(total,Inputs.positive(v,"qty"));
            long recordId=mapper.insertRecord(c,"2",Inputs.text(body,"receiverName",1,64),total);
            List<Long> results=new ArrayList<>();
            for(Map<String,Object> input:prepared) {
                long originalId=Inputs.id(input,"originalIssueItemId"),qty=Inputs.positive(input,"qty");
                Map<String,Object> original=Inputs.map(input.get("_original")),line=Inputs.map(input.get("_line"));
                if(qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(originalId))) throw Problem.conflict("超过原单可归还数量");
                String condition=Inputs.text(input,"condition",1,16);
                if(!Set.of("GOOD","REUSABLE","DAMAGED").contains(condition)) throw Problem.bad("实际接收只允许完好、可再用或损坏；遗失须责任处置");
                long usable=MaterialMath.usable(qty,condition),itemId=mapper.insertActual(recordId,line,qty,originalId,condition,c);results.add(itemId);
                if(usable>0) mapper.movement(itemId,ledger.move(c,n(line,"goods_id"),usable,"MATERIAL_RECORD",recordId,itemId,"RETURN","原单可用实物归还"));
                mapper.db().write("UPDATE edu_material_request_item SET returned_qty=returned_qty+#{p.qty},version=version+1 WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",line.get("request_item_id")));
                if("DAMAGED".equals(condition)) c.task("MATERIAL_LIABILITY","MATERIAL_ITEM",itemId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());
            }
            refresh(c);c.target("MATERIAL_RECORD",recordId);c.event("MATERIAL_RETURNED",P.of("recordId",recordId,"title","物资归还已验收"));return P.of("recordId",recordId,"itemIds",results);
    }
    public Map<String,Object> liability(long id,long itemId,String key,Map<String,Object> body) {
        Actors.current().require("material:liability:decide");
        return commands.run(id,"MATERIAL_LIABILITY",key,target(body,"MATERIAL_ITEM",itemId),200,c->{
            requireMaterial(c);
            Map<String,Object> item=mapper.db().required("SELECT i.* FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE i.item_id=#{p.id} AND r.request_id=#{p.request} FOR UPDATE",P.of("id",itemId,"request",id));
            if(!"PENDING".equals(item.get("liability_status"))) throw Problem.conflict("责任不是待处置状态");
            requireTask(c,"MATERIAL_LIABILITY","MATERIAL_ITEM",itemId);
            String decision=Inputs.text(body,"decision",1,24),comment=Inputs.text(body,"comment",1,1000);
            if(!Set.of("WRITE_OFF","RETURN_REQUIRED","NO_FURTHER_ACTION").contains(decision))throw Problem.bad("责任决定不合法");
            boolean loss=item.get("original_issue_item_id")==null&&n(item,"liability_qty")>0;
            if(!loss&&"WRITE_OFF".equals(decision))throw Problem.bad("已接收损坏物品不再次核减原单实物归还量");
            if(loss&&"NO_FURTHER_ACTION".equals(decision))throw Problem.bad("遗失须明确核准核销或继续追还");
            long writtenOff=loss&&"WRITE_OFF".equals(decision)?n(item,"liability_qty"):0;
            if(writtenOff>MaterialMath.returnable(n(item,"base_qty")-n(item,"written_off_qty"),mapper.alreadyReturned(itemId)))throw Problem.conflict("遗失申报后发生归还，请重新核对责任数量");
            mapper.db().write("UPDATE edu_material_record_item SET liability_status='RESOLVED',written_off_qty=written_off_qty+#{p.written},liability_decided_by=#{p.actor},liability_decided_at=CURRENT_TIMESTAMP,liability_comment=#{p.comment} WHERE item_id=#{p.id}",P.of("written",writtenOff,"actor",c.actor().userId(),"comment",comment,"id",itemId));
            c.audit(P.of("decision",decision,"comment",comment,"writtenOffQty",writtenOff));
            c.closeTasks("MATERIAL_LIABILITY","MATERIAL_ITEM",itemId);refresh(c);c.target("MATERIAL_ITEM",itemId);return P.of("itemId",itemId,"liabilityStatus","RESOLVED");
        });
    }
    public Map<String,Object> resolveDispute(long id,long recordId,String key,Map<String,Object>body){
        Actors.current().require("material:dispute:resolve");
        return commands.run(id,"MATERIAL_DISPUTE_RESOLVE",key,target(body,"MATERIAL_RECORD",recordId),200,c->{
            requireMaterial(c);Map<String,Object>r=mapper.record(recordId,id);if(!"DISPUTED".equals(r.get("receipt_status")))throw Problem.conflict("不是待核定争议");
            if(Inputs.nonNegative(body,"expectedRecordVersion")!=n(r,"version"))throw Problem.conflict("实发记录已变更");
            requireTask(c,"MATERIAL_DISPUTE","MATERIAL_RECORD",recordId);String comment=Inputs.text(body,"comment",1,1000);
            Map<String,Object>previous=mapper.db().required("SELECT assignee_user_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND target_id=#{p.record} ORDER BY task_id DESC LIMIT 1",P.of("request",id,"record",recordId));
            long receiver=n(previous,"assignee_user_id");mapper.db().write("UPDATE edu_material_record SET receipt_status='PENDING',confirmed_by=NULL,confirmed_at=NULL,version=version+1 WHERE record_id=#{p.id}",P.of("id",recordId));
            c.closeTasks("MATERIAL_DISPUTE","MATERIAL_RECORD",recordId);c.task("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId,receiver,null,null);c.audit(P.of("resolution",comment,"result","RECONFIRM"));refresh(c);c.target("MATERIAL_RECORD",recordId);c.event("MATERIAL_DISPUTE_RESOLVED",P.of("title","交接争议已核定，请重新确认","userId",receiver));return P.of("recordId",recordId,"receiptStatus","PENDING");
        });
    }
    public Map<String,Object> reportLoss(long id,String key,Map<String,Object>body){
        Actors.current().require("material:loss:report");return commands.run(id,"MATERIAL_LOSS_REPORT",key,body,201,c->{requireMaterial(c);long originalId=Inputs.id(body,"originalIssueItemId"),qty=Inputs.positive(body,"qty");Map<String,Object>original=mapper.original(originalId,id);if("PENDING".equals(original.get("liability_status")))throw Problem.conflict("原发放行尚有未结责任申报");if(qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(originalId)))throw Problem.conflict("遗失数量超过原行在外数量");String reason=Inputs.text(body,"reason",1,1000);mapper.db().write("UPDATE edu_material_record_item SET liability_status='PENDING',liability_qty=#{p.qty},liability_decided_by=NULL,liability_decided_at=NULL,liability_comment=NULL WHERE item_id=#{p.id}",P.of("qty",qty,"id",originalId));c.task("MATERIAL_LIABILITY","MATERIAL_ITEM",originalId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());c.audit(P.of("reason",reason,"reportedLostQty",qty));refresh(c);c.target("MATERIAL_ITEM",originalId);c.event("MATERIAL_LOSS_REPORTED",P.of("title","原单遗失责任待核定"));return P.of("originalIssueItemId",originalId,"liabilityStatus","PENDING");});
    }
    public Map<String,Object> detail(long id) {
        Actor actor=Actors.current();actor.require("material:request:query");Map<String,Object> row=mapper.db().required("SELECT * FROM office_request WHERE request_id=#{p.id} AND biz_type='MATERIAL'",P.of("id",id));Access.requireRequest(actor,row,mapper.db());
        return P.of("request",row,"items",mapper.lines(id),"records",mapper.db().list("SELECT * FROM edu_material_record WHERE request_id=#{p.id} ORDER BY record_id",P.of("id",id)),"actualItems",mapper.db().list("SELECT i.* FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE r.request_id=#{p.id} ORDER BY i.item_id",P.of("id",id)));
    }
    private void refresh(Commands.Context c) {refreshWithin(c);}
    public void refreshWithin(Commands.Context c) {
        List<Map<String,Object>> lines=mapper.lines(c.requestId());boolean pending=false,returnPending=false;
        for(Map<String,Object> line:lines) {pending|=MaterialMath.remaining(n(line,"approved_qty"),n(line,"issued_qty"),n(line,"cancelled_qty"))>0||n(line,"signed_qty")<n(line,"issued_qty");returnPending|=n(line,"return_required")==1&&n(line,"returned_qty")+writtenOff(n(line,"request_item_id"))<n(line,"issued_qty");}
        long unresolved=Inputs.number(mapper.db().required("SELECT COUNT(*) AS n FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE r.request_id=#{p.id} AND i.liability_status='PENDING'",P.of("id",c.requestId())).get("n"));
        long returnIntents=n(mapper.db().required("SELECT COUNT(*) AS n FROM office_task WHERE request_id=#{p.id} AND target_type='MATERIAL_RETURN_INTENT' AND status IN ('OPEN','CLAIMED')",P.of("id",c.requestId())),"n");
        String status=pending?"PROCESSING":returnPending||unresolved>0||returnIntents>0?"WAIT_SETTLEMENT":"COMPLETED";
        mapper.db().write("UPDATE office_request SET status=#{p.state},current_node=CASE WHEN #{p.state}='COMPLETED' THEN NULL ELSE 'MATERIAL_FOLLOWUP' END,closed_at=CASE WHEN #{p.state}='COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE request_id=#{p.id}",P.of("state",status,"id",c.requestId()));
        if(!pending)c.closeTasks("MATERIAL_ISSUE","REQUEST",c.requestId());
    }
    private void requireTask(Commands.Context c,String node,String type,long target) {
        List<Map<String,Object>> tasks=mapper.db().list("SELECT * FROM office_task WHERE request_id=#{p.request} AND node_code=#{p.node} AND target_type=#{p.type} AND target_id=#{p.target} AND status IN('OPEN','CLAIMED') FOR UPDATE",P.of("request",c.requestId(),"node",node,"type",type,"target",target));
        boolean allowed=false;for(Map<String,Object> t:tasks){
            if(t.get("excluded_user_id")!=null&&n(t,"excluded_user_id")==c.actor().userId())continue;
            if(t.get("assignee_user_id")!=null){if(n(t,"assignee_user_id")==c.actor().userId())allowed=true;}
            else if(t.get("assignee_role_id")!=null&&!mapper.db().one("SELECT user_id FROM sys_user_role WHERE user_id=#{p.user} AND role_id=#{p.role}",P.of("user",c.actor().userId(),"role",t.get("assignee_role_id"))).isEmpty())throw Problem.conflict("请先在固定任务入口受理岗位任务");
        }if(!allowed)throw Problem.forbidden("不属于当前固定办理任务");
    }
    private long writtenOff(long line){return n(mapper.db().required("SELECT COALESCE(SUM(written_off_qty),0) AS n FROM edu_material_record_item WHERE request_item_id=#{p.id} AND original_issue_item_id IS NULL",P.of("id",line)),"n");}
    private void requireWarehouse(Commands.Context c){long role=rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot")));if(mapper.db().one("SELECT ur.user_id FROM sys_user_role ur JOIN sys_role r ON r.role_id=ur.role_id WHERE ur.user_id=#{p.user} AND ur.role_id=#{p.role} AND r.status='0' AND r.del_flag='0'",P.of("user",c.actor().userId(),"role",role)).isEmpty())throw Problem.forbidden("不属于固定仓库验收岗位");}
    private void requireMaterial(Commands.Context c){if(!"MATERIAL".equals(c.request().get("biz_type")))throw Problem.bad("不是物资申请事项");}
    private static Map<String,Object> target(Map<String,Object>body,String type,long id){Map<String,Object>p=new LinkedHashMap<>(body);p.put("_fixedTarget",P.of("type",type,"id",id));return p;}
    private String targetType(Map<String,Object>body){String type=Inputs.text(body,"targetType",1,1);if(!Set.of("1","2","3").contains(type))throw Problem.bad("targetType须为教师1、学生2或班级3");return type;}
    private static long n(Map<String,Object> m,String key){return m.get(key)==null?0:Inputs.number(m.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialMapper.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class MaterialMapper {
    private final Db db;
    public MaterialMapper(Db db) { this.db = db; }
    public Map<String,Object> item(long id, long requestId) {
        return db.required("SELECT * FROM edu_material_request_item WHERE request_item_id=#{p.id} AND request_id=#{p.request} FOR UPDATE", P.of("id",id,"request",requestId));
    }
    public List<Map<String,Object>> lines(long requestId) {
        return db.list("SELECT * FROM edu_material_request_item WHERE request_id=#{p.id} ORDER BY request_item_id",P.of("id",requestId));
    }
    public Map<String,Object> record(long id,long requestId) {
        return db.required("SELECT * FROM edu_material_record WHERE record_id=#{p.id} AND request_id=#{p.request} FOR UPDATE",P.of("id",id,"request",requestId));
    }
    public Map<String,Object> original(long id,long requestId) {
        return db.required("SELECT i.*,r.request_id FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE i.item_id=#{p.id} AND r.request_id=#{p.request} AND r.record_type='1' FOR UPDATE",P.of("id",id,"request",requestId));
    }
    public long alreadyReturned(long originalId) {
        return Inputs.number(db.required("SELECT COALESCE(SUM(base_qty),0) AS n FROM edu_material_record_item WHERE original_issue_item_id=#{p.id}",P.of("id",originalId)).get("n"));
    }
    public Map<String,Object> goods(long id) {
        return db.required("SELECT * FROM edu_goods WHERE goods_id=#{p.id} AND del_flag='0'",P.of("id",id));
    }
    public List<Map<String,Object>> kit(long id) {
        db.required("SELECT kit_id FROM edu_goods_kit WHERE kit_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",id));
        return db.list("SELECT goods_id,quantity FROM edu_goods_kit_item WHERE kit_id=#{p.id} ORDER BY goods_id",P.of("id",id));
    }
    public long insertLine(Map<String,Object> p) {
        return db.insert("INSERT INTO edu_material_request_item(request_id,line_no,goods_id,kit_id,goods_name,spec,unit,requested_qty,approved_qty,issued_qty,signed_qty,returned_qty,cancelled_qty,target_type,target_id,target_name,class_id,return_required,version,created_by_user_id,created_at,updated_at) VALUES(#{p.request},#{p.line},#{p.goods},#{p.kit},#{p.name},#{p.spec},#{p.unit},#{p.qty},0,0,0,0,0,#{p.type},#{p.target},#{p.targetName},#{p.classId},#{p.returnRequired},0,#{p.actor},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",p);
    }
    public long insertRecord(Commands.Context c,String type,String targetName,long quantity) {
        return db.insert("INSERT INTO edu_material_record(record_no,request_id,record_type,business_category,target_type,target_name,total_quantity,operator,operator_user_id,operate_time,status,receipt_status,action_id,version) VALUES(#{p.no},#{p.request},#{p.type},'OFFICE','1',#{p.name},#{p.qty},#{p.operator},#{p.actor},CURRENT_TIMESTAMP,'0',#{p.receipt},#{p.action},0)",P.of("no","MR"+UUID.randomUUID().toString().replace("-", "").substring(0,24),"request",c.requestId(),"type",type,"name",targetName,"qty",quantity,"operator",Long.toString(c.actor().userId()),"actor",c.actor().userId(),"receipt","2".equals(type)?"CONFIRMED":"PENDING","action",c.actionId()));
    }
    public long insertActual(long recordId,Map<String,Object> line,long qty,Long originalId,String condition,Commands.Context c) {
        return db.insert("INSERT INTO edu_material_record_item(record_id,request_item_id,original_issue_item_id,goods_id,goods_name,spec,unit,quantity,base_qty,conversion_rate,condition_code,usable_return_qty,liability_status) VALUES(#{p.record},#{p.line},#{p.original},#{p.goods},#{p.name},#{p.spec},#{p.unit},#{p.qty},#{p.qty},1,#{p.condition},#{p.usable},#{p.liability})",P.of("record",recordId,"line",line.get("request_item_id"),"original",originalId,"goods",line.get("goods_id"),"name",line.get("goods_name"),"spec",line.get("spec"),"unit",line.get("unit"),"qty",qty,"condition",condition,"usable",originalId==null?0:MaterialMath.usable(qty,condition),"liability",Set.of("DAMAGED","LOST").contains(condition)?"PENDING":"NONE"));
    }
    public void movement(long itemId,long movementId) {
        db.write("UPDATE edu_material_record_item SET movement_id=#{p.movement} WHERE item_id=#{p.id} AND movement_id IS NULL",P.of("movement",movementId,"id",itemId));
    }
    public Db db() { return db; }
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialMath.java**

```java
package com.doupi.planref.material;

/** Pure quantity invariants; services translate invalid state to a business conflict. */
public final class MaterialMath {
    private MaterialMath() {}
    public static long remaining(long approved, long issued, long cancelled) {
        if (approved < 0 || issued < 0 || cancelled < 0) throw new IllegalArgumentException("negative quantity");
        long value = Math.subtractExact(Math.subtractExact(approved, issued), cancelled);
        if (value < 0) throw new IllegalArgumentException("issue exceeds approval");
        return value;
    }
    public static long returnable(long issued, long returned) { return remaining(issued, returned, 0); }
    public static long usable(long qty, String condition) {
        if (qty <= 0) throw new IllegalArgumentException("return quantity must be positive");
        return switch (condition) {
            case "GOOD", "REUSABLE" -> qty;
            case "DAMAGED", "LOST" -> 0;
            default -> throw new IllegalArgumentException("unknown condition");
        };
    }
    public static void requireSignature(long actual, long acknowledged) {
        if (actual <= 0 || actual != acknowledged) throw new IllegalArgumentException("receipt differs from actual handover");
    }
}
```



## 6. 边界与异常场景处理

400：空清单、重复goodsId/行ID、非法对象类型、漏审、未说明代理或争议；403：未领取岗位任务、非指定领取人、缺少代理资格、申请人与录入人自审；404：不可见根、异根明细；409：过期根/领退版本、超发、库存不足、签收数量差异、异目标同键、重复处理。500/数据库错误整体回滚，不能保留未回填流水的成功单。20件获准发12件后库存只扣12件，仍保留8件待补；争议不能再次发12件。HTTP超时保留原键原正文重试，缺货报409后刷新库存与待补数量再由人决定新动作。数量和金额溢出明确失败，不截断。
