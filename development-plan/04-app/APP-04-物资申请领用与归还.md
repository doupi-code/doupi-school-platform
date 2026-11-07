# APP-04 物资申请领用与归还

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#app-04)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P1；工期：4个单人工作日；依赖：APP-03、ADM-09。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含单品/套装申请、批准及未发数量、领取确认、归还交回资料和仓库验收结果、损坏/遗失责任进度。普通申请人只提交实物交回意向与证据，只有仓库权限的实际验收人可调用returns确认；不让“我要归还”按钮直接增加库存。

- [ ] 第1日：`pages/work/material`申请、套装展开和详情，保存真实server ID，显示requested/approved/issued/signed/cancelled。
- [ ] 第2日：分次发放领取确认、应还列表和归还意向后端/页面；提交原发放行、拟还数量、状况和私有凭证，普通用户显示“待仓库验收”，仓管核实实物后在专用入口确认。
- [ ] 第3日：仓库意向列表、私有凭证、现场核实ACCEPT/REJECT与原实物归还同事务；拒绝/本人撤销不入库。
- [ ] 第4日：损坏/遗失责任、重复归还和跨端验收回归；后台结果刷新后相同原单一致。归还意向后端补充1日计在本模块4日内，ADM-09仅共享规格，不重复计入其P0工期。

验收：只按实发扣库存；签收不二次扣；可用归还才加库存；损坏/核销不伪造实物归还。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 目录与套装 | GET | `/api/v1/office/directory/{kind}`、`/api/v1/office/directory/kits/{id}` | kind/goods或classes或staff/是；id/string/套装详情是 | items/目录数组字段见ADM-02；套装kit_id,kit_name,target_type,status,version及items[{goods_id:string,quantity:long}] | directory:read |
| 物资申请 | POST | `/api/v1/office/material-requests` | clientSource/STAFF_APP/是；title/string/否；targetType/1教师、2学生或3班级/是；targetId/string/否；targetName/string≤64/是；classId/string/否；items/[{goodsId:string,qty:正long}]/是可空但须kit；kitId/string/否；kitCount/正long/有kit必填 | requestId/string；version/long；status/string；items[{requestItemId:string,requestedQty:long}] | material:request:create |
| 原单详情 | GET | `/api/v1/office/material-requests/{id}` | id/string/是 | request/根；items/申请行；records/实际收发头；actualItems/实际明细；字段以ADM-08/09完整表定义 | material:request:query且范围 |
| 员工归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents` | id/string/是；expectedVersion/非负long/是；reason/string1..1000/是；items/[{originalIssueItemId:string,qty:正long,condition:GOOD或REUSABLE或DAMAGED}]/是且原行不重复；evidenceFileIds/string[]/否，本人私有上传 | intentId,requestId/string；intentVersion,version/long；intentStatus=PENDING、status/string | material:return:intent:create且原申请人或原发放实际签收人 |
| 归还意向列表 | GET | `/api/v1/office/material-requests/{id}/return-intents` | id/string/是 | requestId/string；version/long；intents/[{intentId:string,intentVersion:long,intentStatus:string,reason:string,items:[{originalIssueItemId:string,qty:long,condition:string}],evidenceFileIds:string[],createdByUserId:string,createdAt:datetime,comment:string或null,returnRecordId:string或null,resolvedByUserId:string或null,resolvedAt:datetime或null}] | material:request:query，原申请人、本人签收意向或快照仓管 |
| 仓库办理归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents/{intentId}/review` | id,intentId/string/是；expectedVersion,expectedIntentVersion/非负long/是；decision/ACCEPT或REJECT/是；comment/string≤1000/拒绝必填；receiverName/string1..64/验收必填 | intentId,requestId/string；intentVersion,version/long；intentStatus/ACCEPTED或REJECTED；recordId/string或null；status/string | material:return:accept且规则快照仓库岗位；ACCEPT须现场核实实物 |
| 撤销本人归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents/{intentId}/cancel` | id,intentId/string/是；expectedVersion,expectedIntentVersion/非负long/是；comment/string≤1000/否 | intentId,requestId/string；intentVersion,version/long；intentStatus=CANCELLED、status/string | material:return:intent:cancel且意向提交人 |
| 发放签收 | POST | `/api/v1/office/material-requests/{id}/records/{recordId}/receipt` | id,recordId/string/是；expectedVersion,expectedRecordVersion/非负long/是；accepted/boolean/否默认false；receivedQty/正long/accepted=true时是；comment/string≤500/争议时是 | requestId,recordId/string；version/long；status,receiptStatus/string | material:receipt:confirm及实际领取人 |
| 仓库归还验收 | POST | `/api/v1/office/material-requests/{id}/returns` | id/string/是；expectedVersion/非负long/是；receiverName/string(1..64)/是/实际交回人快照；items/[{originalIssueItemId:string,qty:正long,condition:GOOD或REUSABLE或DAMAGED}]/是 | recordId,requestId/string；version/long；status/string；itemIds/string[]/新归还明细ID | material:return:accept及仓管职责 |
| 遗失申报 | POST | `/api/v1/office/material-requests/{id}/losses` | id/string/是；expectedVersion/非负long/是；originalIssueItemId/string/是；qty/正long/是；reason/string(1..1000)/是 | originalIssueItemId,requestId/string；version/long；status,liabilityStatus/string | material:loss:report且原事项范围 |

## 3. 数据流转细节

所有移动写动作使用同一后端Controller→Service→Repository，不新建App专用库存/事项表。Bearer由服务端生成，clientSource=STAFF_APP仅审计。App不接收和保存学校secret；列表/权限以服务端返回为准。网络超时先展示“结果待确认”，原CommandTicket重发，禁止自动改变expectedVersion或生成新键。

1. 选择目录/套装：读取goods.base_unit/return_required等，套装模板仅预填；服务端创建时重读有效资料，合并规则/重复行验证后写`edu_material_request_item(request_id,line_no,goods_id,kit_id,goods_name/spec/unit快照,requested_qty,target_type/id/name,class_id,return_required,approved_qty/issued_qty/signed_qty/returned_qty/cancelled_qty=0)`，根SUBMITTED、REVIEW任务/action/Outbox同事务。
2. 详情展示：原根与申请行关联`edu_material_record.request_id`及`edu_material_record_item.record_id/request_item_id`，批准、实际发出、签收、已返还、责任核销各自独立字段，不把申请量当发出量。
3. 签收：路径recordId纳入幂等摘要；锁原根/发放头与行，校指定MATERIAL_RECEIPT任务、receipt_status=PENDING和expectedRecordVersion；accepted=true必须receivedQty等于本批total_quantity，更新头receipt_status/confirmed_by/confirmed_at/version及申请行signed_qty。accepted=false须comment，写DISPUTED并建MATERIAL_DISPUTE任务，保留原实发和库存，不自动反向入库；由后台核定后重新确认。
4. 仓管归还验收：锁根、原发放头、原发放item，按goodsId升序锁余额；校原行与root/request_item及物品匹配、qty≤实发-已还-已核准核销。condition为GOOD/REUSABLE时usable=qty，DAMAGED时usable=0，客户端不得自报usableQty。插record_type=2头（target_name取receiverName）和item.original_issue_item_id/request_item_id/quantity/base_qty/condition_code/usable_return_qty；已还量由归还行SUM(base_qty)派生，申请行returned_qty累计；只有usable>0调用StockLedger正movement，余额与投影同事务。
5. 损坏非可用量只进入责任状态，不加库存；遗失liability_qty与核准written_off_qty另列且审计，不递增returned_qty。普通用户无验收权限，界面不会把提交图片当正式返还。详情刷新显示剩余应还与责任。
6. 普通员工POST归还意向：先校原申请人或原发放单实际签收任务身份、已签收状态及同原行剩余；同一原行只允许一个PENDING意向。插`material_return_intent(request_id,status=PENDING,reason,evidence_file_ids,created_by_user_id,version=0,created_action_id)`及`material_return_intent_item(intent_id,original_issue_item_id,qty,condition_code,active_source_item_id)`；证据逐件核本人READY，绑定`office_request_file`并清临时期限；建MATERIAL_RETURN_REVIEW任务及Outbox，余额不变。GET按本人/实际签收人/仓管过滤并返回行字段，不借全部门权限泄露他人意向。
7. review：路径intentId进hash，根锁后意向锁，验双版本/PENDING及固定仓库角色。ACCEPT重核全部原行当前可退量，使用同一Commands.Context调用receiveReturnWithin，在本事务完成第4步真实收回并将intent ACCEPTED/return_record_id/操作者/时间/version+1；不嵌套第二个Commands递增根版本。REJECT必填说明，cancel仅本人，均不改库存；终态释放active_source_item_id唯一占用并关具体任务。根结案须无未办意向任务。
8. 意向表为本轮App P1补充，P0后台继续直接实物验收，P0闭环只看现有office_task而不依赖意向表部署。缓存仅目录展示，提交重读正式事实；失败回滚意向、归还、库存、动作、Outbox，原键重试。

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

**material_return_intent**

```sql
CREATE TABLE material_return_intent (
  intent_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '员工归还意向ID，不是实物回收单',
  request_id BIGINT NOT NULL COMMENT '同一原物资申请事项根',
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING待实物验收、ACCEPTED已验收、REJECTED已拒绝、CANCELLED本人撤销',
  reason VARCHAR(1000) NOT NULL COMMENT '本人归还说明',
  evidence_file_ids JSON NOT NULL COMMENT 'fileIds数组快照，仅本人READY且PASSED文件，真实授权以当前根附件绑定为准',
  return_record_id BIGINT NULL UNIQUE COMMENT 'ACCEPTED才填写实际回收record_type为2的记录',
  comment VARCHAR(1000) NULL COMMENT '仓库核实意见或本人撤销说明',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '意向自身乐观锁，与事项根版本分别校验',
  created_by_user_id BIGINT NOT NULL COMMENT '真实申报员工，须原申请人或原签收任务办理人',
  created_at DATETIME(3) NOT NULL COMMENT '申报UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '最近更新UTC时间',
  resolved_by_user_id BIGINT NULL COMMENT '仓库验收拒绝员工或本人撤销员工',
  resolved_at DATETIME(3) NULL COMMENT '本意向办结UTC时间',
  created_action_id BIGINT NOT NULL UNIQUE COMMENT '提交归还意向真实动作',
  resolved_action_id BIGINT NULL UNIQUE COMMENT '终态对应动作，回收事实共用该动作及同一事务',
  CONSTRAINT fk_mri_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_mri_record FOREIGN KEY (return_record_id) REFERENCES edu_material_record (
    record_id
  ),
  CONSTRAINT fk_mri_creator FOREIGN KEY (created_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_mri_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_mri_create_action FOREIGN KEY (created_action_id) REFERENCES office_action_log (
    action_id
  ),
  CONSTRAINT fk_mri_resolve_action FOREIGN KEY (resolved_action_id) REFERENCES office_action_log (
    action_id
  ),
  CONSTRAINT chk_mri_state CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT chk_mri_version CHECK (version >= 0),
  CONSTRAINT chk_mri_physical CHECK ((
    status = 'ACCEPTED' AND NOT return_record_id IS NULL
  )
  OR (
    status <> 'ACCEPTED' AND return_record_id IS NULL
  )),
  INDEX idx_mri_request_status (request_id, status, intent_id),
  INDEX idx_mri_creator_status (created_by_user_id, status, created_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1原单归还意向，申报与实物验收入库分离';
```

**material_return_intent_item**

```sql
CREATE TABLE material_return_intent_item (
  intent_item_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '归还意向明细ID',
  intent_id BIGINT NOT NULL COMMENT '意向头ID',
  original_issue_item_id BIGINT NOT NULL COMMENT '同事项实际原发放行，不接受跨单或回收行',
  qty BIGINT NOT NULL COMMENT '本次拟归还基础数量，提交和验收都重算上限',
  condition_code VARCHAR(16) NOT NULL COMMENT '拟交回实物状态GOOD完好、REUSABLE可再用、DAMAGED损坏',
  active_source_item_id BIGINT NULL UNIQUE COMMENT '待办时等于原发放行，终态置空；唯一约束防同原行重复未办意向',
  CONSTRAINT uk_mrii_source UNIQUE (
    intent_id,
    original_issue_item_id
  ),
  CONSTRAINT fk_mrii_intent FOREIGN KEY (intent_id) REFERENCES material_return_intent (
    intent_id
  ),
  CONSTRAINT fk_mrii_original FOREIGN KEY (original_issue_item_id) REFERENCES edu_material_record_item (
    item_id
  ),
  CONSTRAINT fk_mrii_active FOREIGN KEY (active_source_item_id) REFERENCES edu_material_record_item (
    item_id
  ),
  CONSTRAINT chk_mrii_qty CHECK (qty > 0),
  CONSTRAINT chk_mrii_condition CHECK (condition_code IN ('GOOD', 'REUSABLE', 'DAMAGED')),
  CONSTRAINT chk_mrii_active CHECK (active_source_item_id IS NULL OR active_source_item_id = original_issue_item_id),
  INDEX idx_mrii_original (original_issue_item_id, intent_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1归还意向原单明细，未验收不记实物归还和库存';
```

**edu_goods**

```sql
CREATE TABLE `edu_goods` (
  `goods_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '物品ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物品名称',
  `category` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类：1-教师办公品 2-学生教材 3-文印耗材',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '默认供应商ID',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '适用年级（如高一、初一，非教材类为空）',
  `spec` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '规格',
  `unit` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `stock_num` BIGINT NOT NULL DEFAULT '0' COMMENT '当前库存',
  `warn_low` BIGINT NOT NULL DEFAULT '0' COMMENT '库存下限',
  `location` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '存放位置',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志 0存在 2删除',
  `conversion_rate` INT DEFAULT '500' COMMENT '每包装基础数量换算率(如1000张/包)',
  `base_unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '张' COMMENT '最小基础消耗单位(如张/支/本)',
  `remain_sheets` INT DEFAULT '0' COMMENT '散张/零头余量(如整包拆开后剩余散张数)',
  PRIMARY KEY (`goods_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_grade` (`grade`),
  INDEX `idx_supplier_id` (`supplier_id`),
  `stock_qty_base` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，唯一可写基础单位余额',
  `warn_low_base_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，基础单位预警线',
  `return_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新增，应归还标记',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，库存行版本',
  INDEX `idx_goods_active` (`category`, `del_flag`),
  CONSTRAINT `ck_edu_goods_0` CHECK (stock_qty_base >= 0),
  CONSTRAINT `ck_edu_goods_1` CHECK (conversion_rate > 0),
  CONSTRAINT `ck_edu_goods_2` CHECK (remain_sheets >= 0 AND remain_sheets < conversion_rate),
  CONSTRAINT `fk_ref_022` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_023` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (
    `supplier_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='物品档案表';
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

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



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

**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentController.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/material-requests/{id}/return-intents")
public class MaterialReturnIntentController {
    private final MaterialReturnIntentService service;
    public MaterialReturnIntentController(MaterialReturnIntentService service) {this.service=service;}
    @PostMapping public ResponseEntity<Map<String,Object>> create(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.create(id,key,body),201);}
    @GetMapping public ResponseEntity<Map<String,Object>> list(@PathVariable long id) {return ApiReply.of(service.list(id),200);}
    @PostMapping("/{intentId}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@PathVariable long intentId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.review(id,intentId,key,body),200);}
    @PostMapping("/{intentId}/cancel") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@PathVariable long intentId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.cancel(id,intentId,key,body),200);}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentService.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MaterialReturnIntentService {
    private final MaterialReturnIntentRepository repo;
    private final MaterialMapper mapper;
    private final MaterialService material;
    private final Commands commands;
    private final Rules rules;
    public MaterialReturnIntentService(MaterialReturnIntentRepository repo,MaterialMapper mapper,MaterialService material,Commands commands,Rules rules) {
        this.repo=repo;this.mapper=mapper;this.material=material;this.commands=commands;this.rules=rules;
    }
    public Map<String,Object> create(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:return:intent:create");
        return commands.run(id,"MATERIAL_RETURN_INTENT_CREATE",key,body,201,c->{
            requireMaterial(c.request());
            String reason=Inputs.text(body,"reason",1,1000);
            List<Map<String,Object>> items=Inputs.list(body,"items");
            if(items.isEmpty()) throw Problem.bad("归还意向明细不能为空");
            List<Long> evidence=body.containsKey("evidenceFileIds")?Inputs.ids(body,"evidenceFileIds"):List.of();
            if(new HashSet<>(evidence).size()!=evidence.size()) throw Problem.bad("归还凭证不能重复");
            Set<Long> seen=new HashSet<>();
            items.sort(Comparator.comparingLong(x->Inputs.id(x,"originalIssueItemId")));
            for(Map<String,Object> input:items) {
                long source=Inputs.id(input,"originalIssueItemId");
                if(!seen.add(source)) throw Problem.bad("同一原发放行只能申报一条归还意向明细");
                Map<String,Object> original=mapper.original(source,id);
                if(n(c.request(),"applicant_user_id")!=c.actor().userId()&&!repo.receiver(id,n(original,"record_id"),c.actor().userId())) throw Problem.forbidden("仅原申请人或该发放单实际签收任务办理人可申报");
                requireSource(original,id,Inputs.positive(input,"qty"));
                condition(input);
                if(repo.pending(source)) throw Problem.conflict("原发放行已有待验收归还意向，请先办理或撤销");
            }
            repo.bindEvidence(c,evidence);
            long intent=repo.insert(c,reason,evidence);
            for(Map<String,Object> input:items) repo.insertItem(intent,Inputs.id(input,"originalIssueItemId"),Inputs.positive(input,"qty"),condition(input));
            long role=rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot")));
            c.task("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intent,null,role,null);
            material.refreshWithin(c);
            c.target("MATERIAL_RETURN_INTENT",intent);
            c.event("MATERIAL_RETURN_INTENT_SUBMITTED",P.of("intentId",intent,"title","归还意向待仓库实物验收"));
            return P.of("intentId",Long.toString(intent),"intentVersion",0,"intentStatus","PENDING");
        });
    }
    public Map<String,Object> list(long id) {
        Actor actor=Actors.current();actor.require("material:request:query");
        Map<String,Object> root=repo.db().required("SELECT * FROM office_request WHERE request_id=#{p.id}",P.of("id",id));
        Access.requireRequest(actor,root,repo.db());requireMaterial(root);
        boolean owner=n(root,"applicant_user_id")==actor.userId();
        boolean warehouse=actor.permissions().contains("*")||actor.permissions().contains("material:return:accept");
        warehouse=warehouse&&warehouse(actor,root);
        if(!owner&&!warehouse&&!repo.anyReceiver(id,actor.userId())) throw Problem.forbidden("仅原申请人、原签收办理人或快照仓库岗位可查看归还意向");
        List<Map<String,Object>> result=new ArrayList<>();
        for(Map<String,Object> intent:repo.db().list("SELECT * FROM material_return_intent WHERE request_id=#{p.request} AND (#{p.all}=1 OR created_by_user_id=#{p.actor}) ORDER BY intent_id",P.of("request",id,"all",owner||warehouse?1:0,"actor",actor.userId()))) {
            List<Map<String,Object>> items=new ArrayList<>();
            for(Map<String,Object> item:repo.items(n(intent,"intent_id"))) items.add(P.of("originalIssueItemId",Long.toString(n(item,"original_issue_item_id")),"qty",n(item,"qty"),"condition",item.get("condition_code")));
            List<Long> evidence=Inputs.ids(Json.readMap(intent.get("evidence_file_ids")),"fileIds");
            result.add(P.of("intentId",Long.toString(n(intent,"intent_id")),"intentVersion",n(intent,"version"),"intentStatus",intent.get("status"),"reason",intent.get("reason"),"items",items,"evidenceFileIds",evidence.stream().map(String::valueOf).toList(),"createdByUserId",Long.toString(n(intent,"created_by_user_id")),"createdAt",intent.get("created_at"),"comment",intent.get("comment"),"returnRecordId",intent.get("return_record_id")==null?null:Long.toString(n(intent,"return_record_id")),"resolvedByUserId",intent.get("resolved_by_user_id")==null?null:Long.toString(n(intent,"resolved_by_user_id")),"resolvedAt",intent.get("resolved_at")));
        }
        return P.of("requestId",Long.toString(id),"version",n(root,"version"),"intents",result);
    }
    public Map<String,Object> review(long id,long intentId,String key,Map<String,Object> body) {
        Actors.current().require("material:return:accept");
        return commands.run(id,"MATERIAL_RETURN_INTENT_REVIEW",key,target(body,intentId),200,c->{
            requireMaterial(c.request());
            if(!warehouse(c.actor(),c.request())) throw Problem.forbidden("不属于事项快照中的固定仓库验收岗位");
            Map<String,Object> intent=repo.lock(id,intentId);requirePending(intent,body);
            String decision=Inputs.text(body,"decision",1,16);
            if(!Set.of("ACCEPT","REJECT").contains(decision)) throw Problem.bad("decision只允许ACCEPT或REJECT");
            String comment="REJECT".equals(decision)?Inputs.text(body,"comment",1,1000):Inputs.optionalText(body,"comment",1000);
            Long recordId=null;
            if("ACCEPT".equals(decision)) {
                List<Map<String,Object>> physical=new ArrayList<>();
                for(Map<String,Object> item:repo.items(intentId)) {
                    long source=n(item,"original_issue_item_id"),qty=n(item,"qty");
                    requireSource(mapper.original(source,id),id,qty);
                    physical.add(P.of("originalIssueItemId",source,"qty",qty,"condition",item.get("condition_code")));
                }
                Map<String,Object> accepted=material.receiveReturnWithin(c,P.of("receiverName",Inputs.text(body,"receiverName",1,64),"items",physical));
                recordId=Inputs.number(accepted.get("recordId"));
            }
            String state="ACCEPT".equals(decision)?"ACCEPTED":"REJECTED";
            repo.finish(c,intentId,state,comment,recordId);
            c.closeTasks("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intentId);
            material.refreshWithin(c);
            c.audit(P.of("intentId",intentId,"decision",decision,"comment",comment,"returnRecordId",recordId));
            c.target("MATERIAL_RETURN_INTENT",intentId);
            c.event("MATERIAL_RETURN_INTENT_"+state,P.of("intentId",intentId,"recordId",recordId,"userId",intent.get("created_by_user_id"),"title","归还意向已有验收结果"));
            return P.of("intentId",Long.toString(intentId),"intentVersion",n(intent,"version")+1,"intentStatus",state,"recordId",recordId==null?null:Long.toString(recordId));
        });
    }
    public Map<String,Object> cancel(long id,long intentId,String key,Map<String,Object> body) {
        Actors.current().require("material:return:intent:cancel");
        return commands.run(id,"MATERIAL_RETURN_INTENT_CANCEL",key,target(body,intentId),200,c->{
            requireMaterial(c.request());Map<String,Object> intent=repo.lock(id,intentId);
            if(n(intent,"created_by_user_id")!=c.actor().userId()) throw Problem.forbidden("仅归还意向提交人可撤销本人意向");
            requirePending(intent,body);String comment=Inputs.optionalText(body,"comment",1000);
            repo.finish(c,intentId,"CANCELLED",comment,null);
            c.closeTasks("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intentId);
            material.refreshWithin(c);
            c.target("MATERIAL_RETURN_INTENT",intentId);
            c.event("MATERIAL_RETURN_INTENT_CANCELLED",P.of("intentId",intentId,"title","归还意向已由本人撤销"));
            return P.of("intentId",Long.toString(intentId),"intentVersion",n(intent,"version")+1,"intentStatus","CANCELLED");
        });
    }
    private void requireSource(Map<String,Object> original,long requestId,long qty) {
        mapper.item(n(original,"request_item_id"),requestId);
        Map<String,Object> record=mapper.record(n(original,"record_id"),requestId);
        if(!"CONFIRMED".equals(record.get("receipt_status"))) throw Problem.conflict("请先完成原发放单实际签收再申报归还");
        if(qty<=0||qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(n(original,"item_id")))) throw Problem.conflict("归还意向超过原发放行当前可归还数量");
    }
    private boolean warehouse(Actor actor,Map<String,Object> root) {
        long role=rules.role("warehouseRoleId",Json.readMap(root.get("rule_snapshot")));
        return !repo.db().one("SELECT ur.user_id FROM sys_user_role ur JOIN sys_role r ON r.role_id=ur.role_id WHERE ur.user_id=#{p.user} AND ur.role_id=#{p.role} AND r.status='0' AND r.del_flag='0'",P.of("user",actor.userId(),"role",role)).isEmpty();
    }
    private static void requirePending(Map<String,Object> intent,Map<String,Object> body) {
        if(Inputs.nonNegative(body,"expectedIntentVersion")!=n(intent,"version")) throw Problem.conflict("归还意向已更新，请刷新");
        if(!"PENDING".equals(intent.get("status"))) throw Problem.conflict("归还意向已办结，不能重复办理");
    }
    private static String condition(Map<String,Object> input) {
        String value=Inputs.text(input,"condition",1,16);
        if(!Set.of("GOOD","REUSABLE","DAMAGED").contains(value)) throw Problem.bad("condition只允许GOOD、REUSABLE或DAMAGED");
        return value;
    }
    private static Map<String,Object> target(Map<String,Object> body,long intentId) {Map<String,Object> p=new LinkedHashMap<>(body);p.put("_fixedTarget",P.of("type","MATERIAL_RETURN_INTENT","id",intentId));return p;}
    private static void requireMaterial(Map<String,Object> root) {if(!"MATERIAL".equals(root.get("biz_type"))) throw Problem.bad("不是物资申请事项");}
    private static long n(Map<String,Object> row,String key) {return row.get(key)==null?0:Inputs.number(row.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentRepository.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class MaterialReturnIntentRepository {
    private final Db db;
    public MaterialReturnIntentRepository(Db db) {this.db=db;}
    public Db db() {return db;}
    public Map<String,Object> lock(long requestId,long intentId) {
        return db.required("SELECT * FROM material_return_intent WHERE intent_id=#{p.id} AND request_id=#{p.request} FOR UPDATE",P.of("id",intentId,"request",requestId));
    }
    public List<Map<String,Object>> items(long intentId) {
        return db.list("SELECT * FROM material_return_intent_item WHERE intent_id=#{p.id} ORDER BY original_issue_item_id",P.of("id",intentId));
    }
    public boolean receiver(long requestId,long recordId,long userId) {
        return !db.one("SELECT task_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND target_id=#{p.record} AND assignee_user_id=#{p.user} AND status IN ('OPEN','CLAIMED','COMPLETED') ORDER BY task_id DESC LIMIT 1",P.of("request",requestId,"record",recordId,"user",userId)).isEmpty();
    }
    public boolean anyReceiver(long requestId,long userId) {
        return !db.one("SELECT task_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND assignee_user_id=#{p.user} AND status IN ('OPEN','CLAIMED','COMPLETED') LIMIT 1",P.of("request",requestId,"user",userId)).isEmpty();
    }
    public boolean pending(long originalId) {
        return !db.one("SELECT intent_item_id FROM material_return_intent_item WHERE active_source_item_id=#{p.id}",P.of("id",originalId)).isEmpty();
    }
    public long insert(Commands.Context c,String reason,List<Long> evidence) {
        return db.insert("INSERT INTO material_return_intent(request_id,status,reason,evidence_file_ids,created_by_user_id,created_at,updated_at,version,created_action_id) VALUES(#{p.request},'PENDING',#{p.reason},#{p.evidence},#{p.actor},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3),0,#{p.action})",P.of("request",c.requestId(),"reason",reason,"evidence",Json.write(P.of("fileIds",evidence)),"actor",c.actor().userId(),"action",c.actionId()));
    }
    public void insertItem(long intentId,long originalId,long qty,String condition) {
        db.insert("INSERT INTO material_return_intent_item(intent_id,original_issue_item_id,qty,condition_code,active_source_item_id) VALUES(#{p.intent},#{p.original},#{p.qty},#{p.condition},#{p.original})",P.of("intent",intentId,"original",originalId,"qty",qty,"condition",condition));
    }
    public void finish(Commands.Context c,long intentId,String state,String comment,Long recordId) {
        db.write("UPDATE material_return_intent SET status=#{p.state},comment=#{p.comment},return_record_id=#{p.record},resolved_by_user_id=#{p.actor},resolved_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3),version=version+1,resolved_action_id=#{p.action} WHERE intent_id=#{p.id} AND status='PENDING'",P.of("id",intentId,"state",state,"comment",comment,"record",recordId,"actor",c.actor().userId(),"action",c.actionId()));
        db.write("UPDATE material_return_intent_item SET active_source_item_id=NULL WHERE intent_id=#{p.id}",P.of("id",intentId));
    }
    public void bindEvidence(Commands.Context c,List<Long> evidence) {
        for(long fileId:evidence) {
            Map<String,Object> file=db.required("SELECT * FROM sys_file WHERE file_id=#{p.id} AND status='READY' AND scan_status='PASSED' FOR UPDATE",P.of("id",fileId));
            if(Inputs.number(file.get("owner_user_id"))!=c.actor().userId()) throw Problem.forbidden("归还凭证只能使用本人上传的可用文件");
            if(db.one("SELECT link_id FROM office_request_file WHERE request_id=#{p.request} AND file_id=#{p.file} AND purpose='RECEIPT' AND record_scope_id=0",P.of("request",c.requestId(),"file",fileId)).isEmpty())
                db.insert("INSERT INTO office_request_file(request_id,file_id,purpose,record_scope_id,revision,sort_order,linked_by,linked_at) VALUES(#{p.request},#{p.file},'RECEIPT',0,#{p.revision},0,#{p.actor},CURRENT_TIMESTAMP(3))",P.of("request",c.requestId(),"file",fileId,"revision",c.request().get("revision"),"actor",c.actor().userId()));
            db.write("UPDATE sys_file SET expires_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE file_id=#{p.id}",P.of("id",fileId));
        }
    }
}
```

**backend/src/main/java/com/doupi/planref/StockLedger.java**

```java
package com.doupi.planref;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public final class StockLedger {
    private final Db db;
    public StockLedger(Db db){this.db=db;}
    public long move(Commands.Context ctx,long goodsId,long delta,String sourceType,long sourceId,long sourceItemId,String kind,String reason){
        if(delta==0)throw Problem.bad("库存变动不得为零");
        Map<String,Object> g=db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0' for update",P.of("id",goodsId));
        long before=Inputs.number(g.get("stock_qty_base")),version=Inputs.number(g.get("version"));
        long after;
        try{after=BusinessMath.stockAfter(before,delta);}catch(IllegalArgumentException|ArithmeticException ex){throw Problem.conflict("库存不足或数量溢出");}
        long rate=Inputs.number(g.get("conversion_rate"));
        String unit=String.valueOf(g.get("base_unit"));
        if(rate<=0||g.get("base_unit")==null||unit.isBlank())throw Problem.conflict("物品基础单位尚未核定");
        int changed=db.write("update edu_goods set stock_qty_base=#{p.after},stock_num=#{p.pack},remain_sheets=#{p.remain},version=version+1,update_time=current_timestamp where goods_id=#{p.id} and version=#{p.version}",P.of("after",after,"pack",after/rate,"remain",after%rate,"id",goodsId,"version",version));
        if(changed!=1)throw Problem.conflict("库存版本冲突");
        long movement=db.insert("insert into stock_movement(goods_id,request_id,action_id,source_type,source_id,source_item_id,movement_kind,delta_qty,before_qty,after_qty,base_unit,goods_version,actor_user_id,occurred_at,posted_at,reason) values(#{p.goods},#{p.request},#{p.action},#{p.sourceType},#{p.source},#{p.item},#{p.kind},#{p.delta},#{p.before},#{p.after},#{p.unit},#{p.version},#{p.actor},#{p.at},#{p.at},#{p.reason})",P.of("goods",goodsId,"request",ctx.requestId(),"action",ctx.actionId(),"sourceType",sourceType,"source",sourceId,"item",sourceItemId,"kind",kind,"delta",delta,"before",before,"after",after,"unit",unit,"version",Math.addExact(version,1),"actor",ctx.actor().userId(),"at",Timestamp.from(Instant.now()),"reason",reason));
        project(ctx,goodsId,delta,sourceType,sourceId,sourceItemId,unit,movement,reason);return movement;
    }
    private void project(Commands.Context c,long goods,long delta,String source,long sourceId,long item,String unit,long movement,String reason){
        if("ARRIVAL".equals(source)){if(delta<=0)throw Problem.bad("到货只允许可用量入库");int n=db.write("update edu_stock_in_item set movement_id=#{p.m} where item_id=#{p.item} and in_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("验收明细流水重复");return;}
        if("INVENTORY_OUT".equals(source)){if(delta>=0)throw Problem.bad("调出必须为负向流水");int n=db.write("update edu_stock_out_item set movement_id=#{p.m} where item_id=#{p.item} and out_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("调出明细流水重复");return;}
        String name=String.valueOf(db.required("select nick_name from sys_user where user_id=#{p.id}",P.of("id",c.actor().userId())).get("nick_name"));
        long qty=delta>0?delta:Math.negateExact(delta),head;
        if(delta>0){Map<String,Object> old=db.one("select in_id from edu_stock_in where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_in(in_no,in_type,request_id,operator_id,operator,in_time,status,acceptance_status,source_type,source_id,action_id,version,remark,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','ACCEPTED',#{p.source},#{p.sourceId},#{p.action},0,#{p.reason},'0')",P.of("no","IN"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"source",source,"sourceId",sourceId,"action",c.actionId(),"reason",reason)):Inputs.number(old.get("in_id"));
            db.insert("insert into edu_stock_in_item(in_id,goods_id,quantity,base_qty,arrived_qty,rejected_qty,unit,conversion_rate,price,amount,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.qty},0,#{p.unit},1,0,0,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set in_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));
        }else{Map<String,Object> old=db.one("select out_id from edu_stock_out where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_out(out_no,out_type,request_id,operator_id,operator,out_time,status,receipt_status,action_id,version,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','PENDING',#{p.action},0,'0')",P.of("no","OUT"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"action",c.actionId())):Inputs.number(old.get("out_id"));
            db.insert("insert into edu_stock_out_item(out_id,goods_id,quantity,base_qty,unit,conversion_rate,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.unit},1,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set out_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));}
    }
}
```





**app/office-api.uts**

```typescript
// Copy into doupi-app/api/office-plan.uts after APP-01 toolchain verification.
// Set the reviewed HTTPS origin in a build environment; never put server secrets here.
const apiOrigin = 'https://replace-with-test-domain.invalid/api/v1'
const tokenKey = 'office_employee_token'

export type CommandTicket = { key: string, body: UTSJSONObject }
export function newTicket(body: UTSJSONObject): CommandTicket {
  return { key: 'app-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 14), body: body }
}
export function setEmployeeToken(token: string): void { uni.setStorageSync(tokenKey, token) }
export function clearEmployeeToken(): void { uni.removeStorageSync(tokenKey) }
export function callOffice(path: string, method: string, body: UTSJSONObject | null = null, key: string = ''): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const headers: UTSJSONObject = { 'Content-Type': 'application/json' }
    const token = uni.getStorageSync(tokenKey) as string
    if (token != null && token.length > 0) headers['Authorization'] = 'Bearer ' + token
    if (key.length > 0) headers['Idempotency-Key'] = key
    uni.request<UTSJSONObject>({
      url: apiOrigin + path,
      method: method as RequestMethod,
      data: body,
      header: headers,
      timeout: 15000,
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = res.data
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) {
          reject(new Error('HTTP_' + res.statusCode.toString() + ': ' + (reply?.getString('msg') ?? '请求失败')))
          return
        }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      },
      fail: (error) => { reject(new Error('NETWORK_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
export function login(username: string, password: string): Promise<UTSJSONObject> {
  return callOffice('/auth/login', 'POST', { username: username, password: password }).then((data: UTSJSONObject): UTSJSONObject => {
    if (data.getString('kind') != 'STAFF') throw new Error('STAFF_IDENTITY_REQUIRED')
    const token = data.getString('token')
    if (token == null) throw new Error('TOKEN_MISSING')
    setEmployeeToken(token)
    return data
  })
}
export function command(path: string, ticket: CommandTicket): Promise<UTSJSONObject> {
  // Retry the same ticket after an uncertain timeout; a changed payload needs explicit reconfirmation and a new ticket.
  return callOffice(path, 'POST', ticket.body, ticket.key)
}
export function workbench(): Promise<UTSJSONObject> { return callOffice('/office/requests?afterId=0', 'GET') }
export function tasks(): Promise<UTSJSONObject> { return callOffice('/office/tasks', 'GET') }
export function inbox(): Promise<UTSJSONObject> { return callOffice('/office/notices?after=0', 'GET') }
export function printDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/print-requests/' + encodeURIComponent(id), 'GET') }
export function materialDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id), 'GET') }
export function readNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/read', ticket) }
export function acknowledgeNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/ack', ticket) }
export function createPrint(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests', ticket) }
export function taskAction(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/tasks/' + encodeURIComponent(id) + '/actions', ticket) }
export function confirmPrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/confirm', ticket) }
export function disputePrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/dispute', ticket) }
export function createMaterial(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests', ticket) }
export function receiveMaterial(id: string, record: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/records/' + encodeURIComponent(record) + '/receipt', ticket) }
export function returnMaterial(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/returns', ticket) }
export function returnIntents(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', 'GET') }
export function proposeReturn(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', ticket) }
export function reviewReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/review', ticket) }
export function cancelReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/cancel', ticket) }
export function verifyAppointment(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/staff/appointments/' + encodeURIComponent(id) + '/verify', ticket) }
export function uploadPrivate(filePath: string, key: string): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const token = uni.getStorageSync(tokenKey) as string
    if (token == null || token.length == 0) { reject(new Error('AUTH_REQUIRED')); return }
    uni.uploadFile({ url: apiOrigin + '/staff/files', filePath: filePath, name: 'file', header: { 'Authorization': 'Bearer ' + token, 'Idempotency-Key': key },
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = JSON.parseObject(res.data)
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) { reject(new Error('UPLOAD_FAILED')); return }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      }, fail: (error) => { reject(new Error('UPLOAD_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
```



## 6. 边界与异常场景处理

- 401清员工会话后重新登录；403显示岗位不允许；对象不可见404；409刷新正式事实并让用户重新核对，新决定用新ticket，原载荷重试用旧ticket。
- 网络失败/超时不显示成功，不本地模拟审批/签收/扣库；返回前进程退出须通过事项列表核对，不按最后点击状态推断提交结果。
- 私有文件无权限不显示临时地址；原稿、照片、学生联系资料和JWT不打印日志或写普通公共缓存；退出清理临时预览。
- 参考UTS需在APP-01锁定的HBuilderX/Android工具链实编译并真机验收，当前Java/H2/TS验证不代表原生平台已验证。
