# ADM-14 采购需求与分批验收

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-14)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期3人日，P1；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-13。

P1覆盖采购需求、供应商、分币报价预算、独立审批与分批合格验收；不实施付款、报销、电子发票或供应商外部集成。复用统一StockLedger，验收只计真实合格实收。

- [ ] 第1日：`operations/OperationsService.procurement/approveProcurement`及P1三张表
- [ ] 第2日：`acceptProcurement`接库存及兼容凭证
- [ ] 第3日：在`doupi-web-admin-react/src/pages/office/procurement/index.tsx`、`src/api/officeOperations.ts`（待实施）联调分次验收、越权和重放。验收采购5件分收3+2件，只生成+3和+2两笔流水，总预算使用整数分，任何一笔超收失败不增加库存。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

创建公共字段：`title:string(1..200)`可选，缺省为业务名申请；`applicantUserId:ID`可选，缺省真实Actor，指定他人须`office:request:delegate`及部门范围；`clientSource:enum(ADMIN_WEB,STAFF_APP,WECHAT_MINI,PUBLIC_WEB)`可选默认ADMIN_WEB，只审计终端；`dueAt:ISO8601`可选，表示事项期限，不改变权限。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 采购需求 | POST | `/api/v1/office/procurements` | 公共创建字段；`supplierId:ID`必填；`items:array1..500`每项`goodsId:ID,qty:integer>0,unitPriceCents:integer>=0`必填，同goods不得重复 | orderId:string(ID),totalCents:integer(分),requestId:string(ID),version:integer,status:string(业务状态)=SUBMITTED；201 | procurement:create |
| 审核决定 | POST | `/api/v1/office/procurements/{id}/review` | path id为requestId；expectedVersion:integer>=0必填(根版本)；`approved:boolean`可选true；`comment:string1..1000`必填决定依据 | orderId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=APPROVED/REJECTED；200 | procurement:approve及本人已受理PROCUREMENT_REVIEW |
| 验收确认 | POST | `/api/v1/office/procurements/{id}/items/{item}/accept` | id/item:ID；expectedVersion:integer>=0必填(根版本)；`qty:integer>0`必填本次验收合格量 | receiptId:string(ID),movementId:string(ID),qty:integer,requestId:string(ID),version:integer,status:string(业务状态)=PROCESSING/COMPLETED；201 | procurement:accept及已受理PROCUREMENT_ACCEPT |
| 详情查询 | GET | `/api/v1/office/operations/{id}` | path id:ID | request:object、detail:object采购头、items:array<object>采购明细；200 | operations:query及根范围 |

采购头字段order_id,request_id,supplier_id,status,total_cents,created_by_user_id,created_at,updated_at；items字段order_item_id,order_id,line_no,goods_id,ordered_qty,accepted_qty,unit_price_cents。需求总额=Σqty×unitPriceCents，不能混用浮点元。

## 3. 数据流转细节

| 接口 | 业务/SQL | 事务与缓存 |
|---|---|---|
| create | 校验有效supplier及goods，非空不重复明细；Math.multiplyExact/addExact计算预算分；插procurement_order(SUBMITTED)、item(ordered_qty,accepted_qty=0,unit_price_cents) | 固定PROCUREMENT_CREATE；根SUBMITTED，创建materialReviewerRoleId的PROCUREMENT_REVIEW排除申请人；PROCUREMENT_SUBMITTED Outbox；不加库存 |
| review | 锁采购头、本人已受理固定任务；approved决定APPROVED/REJECTED；comment进audit；完成审核任务 | 批准建warehouseRoleId的PROCUREMENT_ACCEPT，拒绝根REJECTED；PROCUREMENT_REVIEWED事件；配置管理员不可替代审核任务 |
| accept | 根→order→指定order_item锁，必须同订单、APPROVED/PARTIAL，qty<=ordered−accepted；插receipt取得ID，ledger正向RECEIPT、source=PROCUREMENT_RECEIPT/receiptId，回填movement_id，accepted_qty+=qty | 业务行、库存、旧入库凭证投影、movement、action/Outbox同事务；余量0关闭验收任务、订单/根COMPLETED，否则PARTIAL/PROCESSING；item路径固定加入hash |
| detail | Access先校验root，按request_id取得头，再order_id读全明细 | 不依赖Redis，不从预算推断已付金额 |

每次验收只能处理一个采购明细，receipt.action_id唯一，无同一次动作多个不同验收头的歧义；多品分别命令以新key办理。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**procurement_order**

```sql
/* ADM-14 through ADM-18 target definitions. The complete schema is at database/target/schema.sql. */
CREATE TABLE procurement_order (
  order_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '采购需求头',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  supplier_id BIGINT NOT NULL COMMENT '实际供应商',
  status VARCHAR(20) NOT NULL COMMENT '本表办理状态',
  total_cents BIGINT NOT NULL DEFAULT 0 COMMENT '需求总额分，仅预算不代表付款',
  created_by_user_id BIGINT NOT NULL COMMENT '真实创建员工',
  created_at DATETIME(3) NOT NULL COMMENT '创建UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '最近更新UTC时间',
  CONSTRAINT fk_po_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES edu_supplier (
    supplier_id
  ),
  CHECK (total_cents >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1采购办理，不代表付款';
```

**procurement_order_item**

```sql
CREATE TABLE procurement_order_item (
  order_item_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '采购明细ID',
  order_id BIGINT NOT NULL COMMENT '采购需求ID',
  line_no INT NOT NULL COMMENT '单内稳定行号',
  goods_id BIGINT NOT NULL COMMENT '基础物品ID',
  ordered_qty BIGINT NOT NULL COMMENT '获准采购基础数量',
  accepted_qty BIGINT NOT NULL DEFAULT 0 COMMENT '累计实收合格基础数量',
  unit_price_cents BIGINT NOT NULL COMMENT '单位价格分',
  UNIQUE (
    order_id,
    line_no
  ),
  CONSTRAINT fk_poi_order FOREIGN KEY (order_id) REFERENCES procurement_order (
    order_id
  ),
  CONSTRAINT fk_poi_goods FOREIGN KEY (goods_id) REFERENCES edu_goods (
    goods_id
  ),
  CHECK (ordered_qty > 0
  AND accepted_qty >= 0
  AND accepted_qty <= ordered_qty
  AND unit_price_cents >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='按基础单位计量及分批验收';
```

**procurement_receipt**

```sql
CREATE TABLE procurement_receipt (
  receipt_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '验收事实ID',
  order_item_id BIGINT NOT NULL COMMENT '采购明细ID',
  qty BIGINT NOT NULL COMMENT '本次基础数量',
  movement_id BIGINT NULL UNIQUE COMMENT '同事务库存流水，提交前回填',
  action_id BIGINT NOT NULL UNIQUE COMMENT '真实业务动作',
  accepted_by BIGINT NOT NULL COMMENT '验收员工',
  accepted_at DATETIME(3) NOT NULL COMMENT '验收UTC时间',
  CONSTRAINT fk_pr_item FOREIGN KEY (order_item_id) REFERENCES procurement_order_item (
    order_item_id
  ),
  CONSTRAINT fk_pr_movement FOREIGN KEY (movement_id) REFERENCES stock_movement (
    movement_id
  ),
  CONSTRAINT fk_pr_action FOREIGN KEY (action_id) REFERENCES office_action_log (
    action_id
  ),
  CHECK (qty > 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='实收合格量才入库，流水事务内回填';
```

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



**backend/src/main/java/com/doupi/planref/operations/OperationsController.java**

```java
package com.doupi.planref.operations;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/office")
public class OperationsController {
 private final OperationsService service;private final RecruitOperationsService recruit;
 public OperationsController(OperationsService service,RecruitOperationsService recruit){this.service=service;this.recruit=recruit;}
 @GetMapping("/operations/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
 @PostMapping("/procurements") public ResponseEntity<Map<String,Object>> procurement(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.procurement(key,b),201);}
 @PostMapping("/procurements/{id}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.approveProcurement(id,key,b),200);}
 @PostMapping("/procurements/{id}/items/{item}/accept") public ResponseEntity<Map<String,Object>> accept(@PathVariable long id,@PathVariable long item,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.acceptProcurement(id,item,key,b),201);}
 @PostMapping("/repairs") public ResponseEntity<Map<String,Object>> repair(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.repair(key,b),201);}
 @PostMapping("/repairs/{id}/{action:assign|finish|accept}") public ResponseEntity<Map<String,Object>> repairAction(@PathVariable long id,@PathVariable String action,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.repairAction(id,action,key,b),200);}
 @PostMapping("/resources") public ResponseEntity<Map<String,Object>> resourceCreate(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveResource(0,key,b),201);}
 @PutMapping("/resources/{id}") public ResponseEntity<Map<String,Object>> resourceSave(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveResource(id,key,b),200);}
 @GetMapping("/resources") public ResponseEntity<Map<String,Object>> resources(){return ApiReply.of(service.resources(),200);}
 @PostMapping("/resource-bookings") public ResponseEntity<Map<String,Object>> book(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.book(key,b),201);}
 @PostMapping("/resource-bookings/{id}/cancel") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.cancelBooking(id,key,b),200);}
 @PostMapping("/recruit-shifts") public ResponseEntity<Map<String,Object>> shift(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(recruit.shift(key,b),201);}
 @PostMapping("/recruit-assignments") public ResponseEntity<Map<String,Object>> assign(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(recruit.assign(key,b),201);}
 @PostMapping("/recruit-assignments/{id}/reschedule") public ResponseEntity<Map<String,Object>> reschedule(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(recruit.reschedule(id,key,b),200);}
 @PostMapping("/recruit-followups") public ResponseEntity<Map<String,Object>> followup(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(recruit.followup(key,b),201);}
 @PostMapping("/recruit-followups/{id}/complete") public ResponseEntity<Map<String,Object>> complete(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(recruit.completeFollowup(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/operations/OperationsService.java**

```java
package com.doupi.planref.operations;
import com.doupi.planref.*;
import com.doupi.planref.office.OfficeService;
import com.doupi.planref.auth.ExternalCommands;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
@Service
public class OperationsService {
 private final Db db;private final Commands commands;private final Roots roots;private final Rules rules;private final StockLedger ledger;private final OfficeService office;private final ExternalCommands external;
 public OperationsService(Db db,Commands commands,Roots roots,Rules rules,StockLedger ledger,OfficeService office,ExternalCommands external){this.db=db;this.commands=commands;this.roots=roots;this.rules=rules;this.ledger=ledger;this.office=office;this.external=external;}
 private static long n(Map<String,Object> row,String key){return Inputs.number(row.get(key));}
 private Long role(Commands.Context c,String key){return rules.role(key,Json.readMap(c.request().get("rule_snapshot")));}
 private static Map<String,Object> target(Map<String,Object>b,String type,long id){Map<String,Object> p=new LinkedHashMap<>(b);p.put("_target",P.of("type",type,"id",id));return p;}
 private void state(Commands.Context c,String status,String node){db.write("UPDATE office_request SET status=#{p.status},current_node=#{p.node},closed_at=CASE WHEN #{p.status} IN('COMPLETED','CANCELLED','REJECTED') THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE request_id=#{p.id}",P.of("status",status,"node",node,"id",c.requestId()));}
 private Timestamp time(Map<String,Object>b,String key){try{return Timestamp.from(OffsetDateTime.parse(Inputs.text(b,key,20,40)).toInstant().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));}catch(DateTimeException e){throw Problem.bad(key+"必须为含时区时间");}}
 private void user(long id){db.required("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",id));}
 public Map<String,Object> procurement(String key,Map<String,Object>b){Actors.current().require("procurement:create");return commands.create("PROCUREMENT_CREATE",key,b,201,()->roots.create("PROCUREMENT",key,b),c->{
  long supplier=Inputs.id(b,"supplierId");db.required("SELECT supplier_id FROM edu_supplier WHERE supplier_id=#{p.id} AND del_flag='0'",P.of("id",supplier));
  List<Map<String,Object>> items=Inputs.list(b,"items");if(items.isEmpty())throw Problem.bad("采购清单不能为空");
  long order=db.insert("INSERT INTO procurement_order(request_id,supplier_id,status,total_cents,created_by_user_id,created_at,updated_at) VALUES(#{p.request},#{p.supplier},'SUBMITTED',0,#{p.actor},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))",P.of("request",c.requestId(),"supplier",supplier,"actor",c.actor().userId()));
  long total=0;int line=0;Set<Long> seen=new HashSet<>();for(Map<String,Object> i:items){long goods=Inputs.id(i,"goodsId"),qty=Inputs.positive(i,"qty"),cents=Inputs.nonNegative(i,"unitPriceCents");if(!seen.add(goods))throw Problem.bad("采购物品不得重复行");db.required("SELECT goods_id FROM edu_goods WHERE goods_id=#{p.id} AND del_flag='0'",P.of("id",goods));total=Math.addExact(total,OperationsPolicy.lineTotal(qty,cents));db.insert("INSERT INTO procurement_order_item(order_id,line_no,goods_id,ordered_qty,accepted_qty,unit_price_cents) VALUES(#{p.order},#{p.line},#{p.goods},#{p.qty},0,#{p.cents})",P.of("order",order,"line",++line,"goods",goods,"qty",qty,"cents",cents));}
  db.write("UPDATE procurement_order SET total_cents=#{p.total} WHERE order_id=#{p.id}",P.of("total",total,"id",order));state(c,"SUBMITTED","PROCUREMENT_REVIEW");c.task("PROCUREMENT_REVIEW","PROCUREMENT",order,null,role(c,"materialReviewerRoleId"),n(c.request(),"applicant_user_id"));c.event("PROCUREMENT_SUBMITTED",P.of("title","采购需求待审核"));c.target("PROCUREMENT",order);return P.of("orderId",order,"totalCents",total);
 });}
 public Map<String,Object> approveProcurement(long id,String key,Map<String,Object>b){Actors.current().require("procurement:approve");return commands.run(id,"PROCUREMENT_APPROVE",key,b,200,c->{Map<String,Object> o=db.required("SELECT * FROM procurement_order WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));if(!"SUBMITTED".equals(o.get("status")))throw Problem.conflict("采购不是待审核");office.requireTask(c,"PROCUREMENT_REVIEW","PROCUREMENT",n(o,"order_id"));boolean approve=Inputs.bool(b,"approved",true);String comment=Inputs.text(b,"comment",1,1000);db.write("UPDATE procurement_order SET status=#{p.status},updated_at=CURRENT_TIMESTAMP(3) WHERE order_id=#{p.id}",P.of("status",approve?"APPROVED":"REJECTED","id",o.get("order_id")));c.closeTasks("PROCUREMENT_REVIEW","PROCUREMENT",n(o,"order_id"));state(c,approve?"APPROVED":"REJECTED",approve?"PROCUREMENT_ACCEPT":null);if(approve)c.task("PROCUREMENT_ACCEPT","PROCUREMENT",n(o,"order_id"),null,role(c,"warehouseRoleId"),null);c.audit(P.of("comment",comment));c.target("PROCUREMENT",n(o,"order_id"));c.event("PROCUREMENT_REVIEWED",P.of("title","采购审核结果已更新"));return P.of("orderId",o.get("order_id"));});}
 public Map<String,Object> acceptProcurement(long id,long item,String key,Map<String,Object>b){Actors.current().require("procurement:accept");return commands.run(id,"PROCUREMENT_ACCEPT",key,target(b,"PROCUREMENT_ITEM",item),201,c->{Map<String,Object> o=db.required("SELECT * FROM procurement_order WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));if(!Set.of("APPROVED","PARTIAL").contains(o.get("status")))throw Problem.conflict("采购未获准或已结束");office.requireTask(c,"PROCUREMENT_ACCEPT","PROCUREMENT",n(o,"order_id"));Map<String,Object> i=db.required("SELECT * FROM procurement_order_item WHERE order_item_id=#{p.item} AND order_id=#{p.order} FOR UPDATE",P.of("item",item,"order",o.get("order_id")));long qty=Inputs.positive(b,"qty");if(qty>OperationsPolicy.acceptanceRemaining(n(i,"ordered_qty"),n(i,"accepted_qty")))throw Problem.conflict("验收量超过未收量");long receipt=db.insert("INSERT INTO procurement_receipt(order_item_id,qty,action_id,accepted_by,accepted_at) VALUES(#{p.item},#{p.qty},#{p.action},#{p.actor},CURRENT_TIMESTAMP(3))",P.of("item",item,"qty",qty,"action",c.actionId(),"actor",c.actor().userId()));long movement=ledger.move(c,n(i,"goods_id"),qty,"PROCUREMENT_RECEIPT",receipt,receipt,"RECEIPT","采购实收合格验收");db.write("UPDATE procurement_receipt SET movement_id=#{p.movement} WHERE receipt_id=#{p.id}",P.of("movement",movement,"id",receipt));db.write("UPDATE procurement_order_item SET accepted_qty=accepted_qty+#{p.qty} WHERE order_item_id=#{p.id}",P.of("qty",qty,"id",item));long left=n(db.required("SELECT COUNT(*) AS n FROM procurement_order_item WHERE order_id=#{p.id} AND accepted_qty<ordered_qty",P.of("id",o.get("order_id"))),"n");db.write("UPDATE procurement_order SET status=#{p.status},updated_at=CURRENT_TIMESTAMP(3) WHERE order_id=#{p.id}",P.of("status",left==0?"COMPLETED":"PARTIAL","id",o.get("order_id")));state(c,left==0?"COMPLETED":"PROCESSING",left==0?null:"PROCUREMENT_ACCEPT");if(left==0)c.closeTasks("PROCUREMENT_ACCEPT","PROCUREMENT",n(o,"order_id"));c.target("PROCUREMENT_RECEIPT",receipt);c.event("PROCUREMENT_ACCEPTED",P.of("title","采购验收已记账"));return P.of("receiptId",receipt,"movementId",movement,"qty",qty);});}
 public Map<String,Object> repair(String key,Map<String,Object>b){Actors.current().require("repair:create");return commands.create("REPAIR_CREATE",key,b,201,()->roots.create("REPAIR",key,b),c->{long ticket=db.insert("INSERT INTO repair_ticket(request_id,location,asset_name,description,status,version) VALUES(#{p.request},#{p.location},#{p.asset},#{p.description},'SUBMITTED',0)",P.of("request",c.requestId(),"location",Inputs.text(b,"location",1,200),"asset",Inputs.text(b,"assetName",1,120),"description",Inputs.text(b,"description",1,2000)));state(c,"SUBMITTED","REPAIR_ASSIGN");c.task("REPAIR_ASSIGN","REPAIR",ticket,null,role(c,"executorRoleId"),null);c.target("REPAIR",ticket);c.event("REPAIR_SUBMITTED",P.of("title","报修待安排"));return P.of("ticketId",ticket);});}
 public Map<String,Object> repairAction(long id,String action,String key,Map<String,Object>b){String code=switch(action){case "assign"->"REPAIR_ASSIGN";case "finish"->"REPAIR_FINISH";case "accept"->"REPAIR_ACCEPT";default->throw Problem.bad("不支持维修动作");};Actors.current().require("repair:"+action);return commands.run(id,code,key,b,200,c->{Map<String,Object> t=db.required("SELECT * FROM repair_ticket WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));long ticket=n(t,"ticket_id");switch(action){case "assign"->{if(!Set.of("SUBMITTED","REOPENED").contains(t.get("status")))throw Problem.conflict("不能重复派修");office.requireTask(c,"REPAIR_ASSIGN","REPAIR",ticket);long who=Inputs.id(b,"assigneeUserId");user(who);db.write("UPDATE repair_ticket SET assignee_user_id=#{p.user},status='PROCESSING',version=version+1 WHERE ticket_id=#{p.id}",P.of("user",who,"id",ticket));db.write("UPDATE office_request SET handler_user_id=#{p.user} WHERE request_id=#{p.id}",P.of("user",who,"id",id));c.closeTasks("REPAIR_ASSIGN","REPAIR",ticket);c.task("REPAIR_FINISH","REPAIR",ticket,who,null,null);state(c,"PROCESSING","REPAIR_FINISH");}
 case "finish"->{if(!"PROCESSING".equals(t.get("status")))throw Problem.conflict("不是维修处理中");office.requireTask(c,"REPAIR_FINISH","REPAIR",ticket);db.write("UPDATE repair_ticket SET status='WAIT_RECEIPT',resolution=#{p.result},finished_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE ticket_id=#{p.id}",P.of("result",Inputs.text(b,"resolution",1,2000),"id",ticket));c.closeTasks("REPAIR_FINISH","REPAIR",ticket);c.task("REPAIR_ACCEPT","REPAIR",ticket,n(c.request(),"applicant_user_id"),null,null);state(c,"WAIT_RECEIPT","REPAIR_ACCEPT");}
 case "accept"->{if(!"WAIT_RECEIPT".equals(t.get("status")))throw Problem.conflict("没有待验收结果");office.requireTask(c,"REPAIR_ACCEPT","REPAIR",ticket);if(!b.containsKey("accepted"))throw Problem.bad("accepted必填");boolean accepted=Inputs.bool(b,"accepted",false);String comment=Inputs.text(b,"comment",1,1000);db.write("UPDATE repair_ticket SET status=#{p.status},accepted_by=#{p.user},accepted_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE ticket_id=#{p.id}",P.of("status",accepted?"COMPLETED":"REOPENED","user",c.actor().userId(),"id",ticket));c.closeTasks("REPAIR_ACCEPT","REPAIR",ticket);if(!accepted)c.task("REPAIR_ASSIGN","REPAIR",ticket,null,role(c,"executorRoleId"),null);state(c,accepted?"COMPLETED":"RETURNED",accepted?null:"REPAIR_ASSIGN");c.audit(P.of("acceptanceComment",comment));}
 default->throw new IllegalStateException();}c.target("REPAIR",ticket);c.event("REPAIR_UPDATED",P.of("title","报修办理进度已更新"));return P.of("ticketId",ticket);});}
 public Map<String,Object> saveResource(long id,String key,Map<String,Object>b){Actor a=Actors.current();a.require("resource:manage");return external.run("RESOURCE:"+a.userId(),"RESOURCE_SAVE",key,target(b,"RESOURCE",id),id==0?201:200,()->{String code=Inputs.text(b,"resourceCode",1,40),name=Inputs.text(b,"resourceName",1,120),location=Inputs.text(b,"location",1,200);long capacity=Inputs.positive(b,"capacity");boolean enabled=Inputs.bool(b,"enabled",true);long resource=id;if(id==0)resource=db.insert("INSERT INTO campus_resource(resource_code,resource_name,location,capacity,enabled,version) VALUES(#{p.code},#{p.name},#{p.location},#{p.capacity},#{p.enabled},0)",P.of("code",code,"name",name,"location",location,"capacity",capacity,"enabled",enabled));else{Map<String,Object>r=db.required("SELECT * FROM campus_resource WHERE resource_id=#{p.id} FOR UPDATE",P.of("id",id));if(n(r,"version")!=Inputs.nonNegative(b,"expectedResourceVersion"))throw Problem.conflict("资源目录版本已变更");if(n(db.required("SELECT COUNT(*) AS n FROM resource_booking WHERE resource_id=#{p.id} AND status='CONFIRMED' AND ends_at>CURRENT_TIMESTAMP(3) AND (attendee_count>#{p.capacity} OR #{p.enabled}=0)",P.of("id",id,"capacity",capacity,"enabled",enabled)),"n")>0)throw Problem.conflict("仍有有效预约，不能停用或缩减至不足容量");db.write("UPDATE campus_resource SET resource_code=#{p.code},resource_name=#{p.name},location=#{p.location},capacity=#{p.capacity},enabled=#{p.enabled},version=version+1 WHERE resource_id=#{p.id}",P.of("code",code,"name",name,"location",location,"capacity",capacity,"enabled",enabled,"id",id));}return P.of("resource",db.required("SELECT * FROM campus_resource WHERE resource_id=#{p.id}",P.of("id",resource)));});}
 public Map<String,Object> resources(){Actor a=Actors.current();a.requireStaff();a.require("resource:query");return P.of("items",db.list("SELECT resource_id,resource_code,resource_name,location,capacity,version FROM campus_resource WHERE enabled=1 ORDER BY resource_id",P.of()));}
 public Map<String,Object> book(String key,Map<String,Object>b){Actors.current().require("resource:book");return commands.create("RESOURCE_BOOK",key,b,201,()->roots.create("RESOURCE",key,b),c->{long resource=Inputs.id(b,"resourceId"),people=Inputs.positive(b,"attendeeCount");Timestamp start=time(b,"startsAt"),end=time(b,"endsAt");if(!end.after(start)||!start.toInstant().isAfter(Instant.now()))throw Problem.bad("预约必须为未来有效时间段");Map<String,Object> r=db.required("SELECT * FROM campus_resource WHERE resource_id=#{p.id} AND enabled=1 FOR UPDATE",P.of("id",resource));if(people>n(r,"capacity"))throw Problem.conflict("人数超过资源容量");if(n(db.required("SELECT COUNT(*) AS n FROM resource_booking WHERE resource_id=#{p.id} AND status='CONFIRMED' AND starts_at<#{p.end} AND ends_at>#{p.start}",P.of("id",resource,"start",start,"end",end)),"n")>0)throw Problem.conflict("资源时间冲突");long booking=db.insert("INSERT INTO resource_booking(request_id,resource_id,starts_at,ends_at,purpose,attendee_count,status) VALUES(#{p.request},#{p.resource},#{p.start},#{p.end},#{p.purpose},#{p.people},'CONFIRMED')",P.of("request",c.requestId(),"resource",resource,"start",start,"end",end,"purpose",Inputs.text(b,"purpose",1,500),"people",people));state(c,"APPROVED","RESOURCE_USE");c.target("RESOURCE_BOOKING",booking);c.event("RESOURCE_BOOKED",P.of("title","资源预约已确认"));return P.of("bookingId",booking);});}
 public Map<String,Object> cancelBooking(long id,String key,Map<String,Object>b){Actors.current().require("resource:cancel");return commands.run(id,"RESOURCE_CANCEL",key,b,200,c->{if(n(c.request(),"applicant_user_id")!=c.actor().userId()&&!c.actor().permissions().contains("resource:manage")&&!c.actor().permissions().contains("*"))throw Problem.forbidden("仅预约人或资源负责人可取消");Map<String,Object> r=db.required("SELECT * FROM resource_booking WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));db.required("SELECT resource_id FROM campus_resource WHERE resource_id=#{p.id} FOR UPDATE",P.of("id",r.get("resource_id")));if(!"CONFIRMED".equals(r.get("status")))throw Problem.conflict("预约已取消");Inputs.text(b,"reason",1,500);db.write("UPDATE resource_booking SET status='CANCELLED' WHERE booking_id=#{p.id}",P.of("id",r.get("booking_id")));state(c,"CANCELLED",null);c.target("RESOURCE_BOOKING",n(r,"booking_id"));c.event("RESOURCE_CANCELLED",P.of("title","资源预约已取消"));return P.of("bookingId",r.get("booking_id"));});}
 public Map<String,Object> detail(long id){Actor a=Actors.current();a.requireStaff();a.require("operations:query");Map<String,Object> root=db.required("SELECT * FROM office_request WHERE request_id=#{p.id}",P.of("id",id));Access.requireRequest(a,root,db);String biz=String.valueOf(root.get("biz_type"));String sql=switch(biz){case "PROCUREMENT"->"SELECT * FROM procurement_order WHERE request_id=#{p.id}";case "REPAIR"->"SELECT * FROM repair_ticket WHERE request_id=#{p.id}";case "RESOURCE"->"SELECT * FROM resource_booking WHERE request_id=#{p.id}";case "RECRUIT_SHIFT"->"SELECT * FROM recruit_shift WHERE request_id=#{p.id}";case "RECRUIT_FOLLOWUP"->"SELECT * FROM recruit_followup WHERE request_id=#{p.id}";case "RECRUIT_ASSIGNMENT"->"SELECT * FROM recruit_assignment WHERE request_id=#{p.id}";default->throw Problem.bad("不是P1运营事项");};Map<String,Object> detail=db.required(sql,P.of("id",id));Map<String,Object> result=P.of("request",root,"detail",detail);if("PROCUREMENT".equals(biz))result.put("items",db.list("SELECT * FROM procurement_order_item WHERE order_id=#{p.id} ORDER BY line_no",P.of("id",detail.get("order_id"))));return result;}
}
```

**backend/src/main/java/com/doupi/planref/operations/OperationsPolicy.java**

```java
package com.doupi.planref.operations;
import java.time.Instant;
public final class OperationsPolicy {
 private OperationsPolicy(){}
 public static boolean overlaps(Instant a,Instant b,Instant c,Instant d){if(!b.isAfter(a)||!d.isAfter(c))throw new IllegalArgumentException("invalid interval");return a.isBefore(d)&&c.isBefore(b);}
 public static long lineTotal(long qty,long cents){if(qty<=0||cents<0)throw new IllegalArgumentException("invalid amount");return Math.multiplyExact(qty,cents);}
 public static long acceptanceRemaining(long ordered,long accepted){if(ordered<=0||accepted<0||accepted>ordered)throw new IllegalArgumentException("invalid acceptance");return Math.subtractExact(ordered,accepted);}
}
```



## 6. 边界与异常场景处理

400：重复物品、数量/金额非法；403：自审/未受理固定岗位任务；404：异订单item或不可见根；409：未批准、超收、已完成、同键换item/qty或根版本过期。收货不合格部分不传为qty，不增可用库存；不把采购金额称为已付款。验收失败回滚receipt、库存流水和动作，不保存“已验收”伪成功。
