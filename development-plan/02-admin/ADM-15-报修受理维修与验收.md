# ADM-15 报修受理维修与验收

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-15)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期2人日，P1；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-14。

P1覆盖位置和故障登记、固定受理岗位派修、受派人记录维修完成、真实申请人验收、拒绝验收后重新派修。物资耗材如需领用走物资域；不混入设备折旧、外包支付或保修供应商接口。

- [ ] 第1日：`OperationsService.repair/repairAction`及repair_ticket表
- [ ] 第2日：在`doupi-web-admin-react/src/pages/office/repair/index.tsx`（待实施）接入派修与验收，验证维修人员不能冒充申请人验收、验收不通过重开任务。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

创建公共字段：`title:string(1..200)`可选，缺省为业务名申请；`applicantUserId:ID`可选，缺省真实Actor，指定他人须`office:request:delegate`及部门范围；`clientSource:enum(ADMIN_WEB,STAFF_APP,WECHAT_MINI,PUBLIC_WEB)`可选默认ADMIN_WEB，只审计终端；`dueAt:ISO8601`可选，表示事项期限，不改变权限。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 故障报修 | POST | `/api/v1/office/repairs` | 公共创建字段；`location:string1..200,assetName:string1..120,description:string1..2000`必填 | ticketId,requestId:string(ID),version:integer,status:string(业务状态)=SUBMITTED；201 | repair:create |
| 派修办理 | POST | `/api/v1/office/repairs/{id}/assign` | id:requestId；expectedVersion:integer>=0必填(根版本)；`assigneeUserId:ID`必填有效员工 | ticketId,requestId:string(ID),version:integer,status:string(业务状态)=PROCESSING；200 | repair:assign且已受理REPAIR_ASSIGN |
| 维修完成 | POST | `/api/v1/office/repairs/{id}/finish` | id；expectedVersion:integer>=0必填(根版本)；`resolution:string1..2000`必填真实维修结果 | ticketId,requestId:string(ID),version:integer,status:string(业务状态)=WAIT_RECEIPT；200 | repair:finish且本人受派REPAIR_FINISH |
| 验收确认 | POST | `/api/v1/office/repairs/{id}/accept` | id；expectedVersion:integer>=0必填(根版本)；`accepted:boolean`必填，`comment:string1..1000`必填验收意见 | ticketId,requestId:string(ID),version:integer,status:string(业务状态)=COMPLETED/RETURNED；200 | repair:accept且本人REPAIR_ACCEPT任务 |
| 详情查询 | GET | `/api/v1/office/operations/{id}` | id | request:object,detail:object；detail:object含ticket_id,request_id,location,asset_name,description,assignee_user_id,status:string(业务状态),resolution,finished_at,accepted_by,accepted_at,version:integer；200 | operations:query及根范围 |

## 3. 数据流转细节

| 接口 | 字段流转和SQL | 事务与后续 |
|---|---|---|
| create | 创建真实REPAIR根、repair_ticket.SUBMITTED及location/asset_name/description快照 | REPAIR_CREATE，创建executorRoleId的REPAIR_ASSIGN，REPAIR_SUBMITTED Outbox |
| assign | 锁root→ticket；SUBMITTED/REOPENED才允许；校验有效assignee员工和本人已受理固定任务；ticket.assignee_user_id/status=PROCESSING/version+1，根handler_user_id=受派人 | 关闭派修任务，创建个人REPAIR_FINISH；动作与REPAIR_UPDATED事件同提交 |
| finish | ticket须PROCESSING且本人固定任务；resolution写维修结果，finished_at服务端时间，ticket.WAIT_RECEIPT/version+1 | 关闭维修任务，建applicant个人REPAIR_ACCEPT；根WAIT_RECEIPT，不以维修人点击完工作为申请人验收 |
| accept | WAIT_RECEIPT、本人验收任务；accepted决定COMPLETED或REOPENED，accepted_by/at记录真实验收人，comment写audit | 关闭验收任务；不通过重建executor岗位REPAIR_ASSIGN，根RETURNED；通过根COMPLETED/closed_at；保持原动作过程，不删旧维修结果 |
| detail | 根范围先授权再查ticket，version为本子行状态修改次数 | 不缓存私有故障和人员信息 |

ticket.version由本域在状态改变时增加，根version仍仅Commands一次增加，两者语义不同。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**repair_ticket**

```sql
CREATE TABLE repair_ticket (
  ticket_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '报修ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  location VARCHAR(200) NOT NULL COMMENT '报修位置或资源地点',
  asset_name VARCHAR(120) NOT NULL COMMENT '维修对象名称快照',
  description VARCHAR(2000) NOT NULL COMMENT '故障描述',
  assignee_user_id BIGINT NULL COMMENT '核实受派员工',
  status VARCHAR(20) NOT NULL COMMENT '本表办理状态',
  resolution VARCHAR(2000) NULL COMMENT '维修结果描述',
  finished_at DATETIME(3) NULL COMMENT '维修完成UTC时间',
  accepted_by BIGINT NULL COMMENT '验收员工',
  accepted_at DATETIME(3) NULL COMMENT '验收UTC时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观版本',
  CONSTRAINT fk_repair_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_repair_user FOREIGN KEY (assignee_user_id) REFERENCES sys_user (
    user_id
  ),
  INDEX idx_repair_assignee (assignee_user_id, status)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='受理、维修、本人验收分开';
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

400：故障、位置、结果和验收意见为空；403：其他维修人员办理、非申请人验收、未受理派修岗位任务；404：不可见事项；409：状态或根版本变化、重复派修/完工/验收。停用员工不可新派修。失败不关闭原任务、不发成功消息；重开保留旧动作与意见，库存和财务均不受报修状态直接影响。
