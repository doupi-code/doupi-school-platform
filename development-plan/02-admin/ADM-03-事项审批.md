# ADM-03 事项、固定任务与审批

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-03)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期5人日。P0负责管理后台个人办事、事项查询、固定岗位待办、领取任务、审核、退回、拒绝、取消和最终关闭；文印及物资明细由各自模块维护。本模块不提供任意流程设计器，不以配置管理员身份替代审核岗位。依赖ADM-01工程基线和ADM-02认证/权限/行范围，以及预定义的PRINT/MATERIAL根与任务契约；业务联调在ADM-05/08实施，不构成前置排期依赖。

实施文件与顺序：

- [ ] 第1日：核对`doupi-server/doupi-system`身份和部门范围，实施参考`office/OfficeRepository.java`查询及根锁契约
- [ ] 第2日：实现`OfficeService.java`固定节点、岗位校验与不自审
- [ ] 第3日：落实`OfficeController.java`及`Commands.java`动作幂等、Outbox和版本
- [ ] 第4日：在`doupi-web-admin-react/src/pages/office/requests/index.tsx`、`tasks/index.tsx`与`src/api/office.ts`新增页面和接口适配
- [ ] 第5日：完成超时重放、跨部门、拒绝、取消及多子项关闭验收。这些前端路径是待实施文件，不表示本轮已改生产源码。

验收：同一事项允许多个印品；新动作只增加一次根version；同键原正文重发优先返回原结果；换taskId不得复用旧幂等结果；申请人及代录人均不能审核本人事项；未清余纸、未签收、争议未结时不能关闭。后续验证只运行于新建隔离库。

## 2. 接口设计清单

所有路径前缀`/api/v1/office`。ID以字符串传输；`expectedVersion`为非负整数；写操作要求员工JWT和1—64字符`Idempotency-Key`，操作者只能由服务端Actor取得。返回外层为`code,msg,traceId,replayed,data`，下表列data。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 查询 requests | GET | `/api/v1/office/requests` | query `afterId`非负，默认0 | `items`根行数组、`scannedThroughId`；200，每批最多扫描200行 | `office:request:list` |
| 查询 {id} | GET | `/api/v1/office/requests/{id}` | path `id`正ID | `request`根、`history`动作摘要数组；200 | `office:request:read` |
| 查询 tasks | GET | `/api/v1/office/tasks` | 无正文 | `items`本人受派/岗位且未排除的OPEN/CLAIMED任务；200 | `office:task:list` |
| 办理 submit | POST | `/api/v1/office/requests/{id}/submit` | path id；body `expectedVersion` | `submitted=true,requestId,version,status`；200 | `office:request:submit` |
| 办理 actions | POST | `/api/v1/office/tasks/{id}/actions` | path taskId；body `expectedVersion,expectedTaskVersion,decision`枚举CLAIM/APPROVE/RETURN/REJECT，`comment`可空≤1000，RETURN/REJECT必填 | `taskId,taskStatus=CLAIMED`或`taskId,decision`，及`requestId,version,status`；200 | `office:task:act` |
| 办理 cancel-request | POST | `/api/v1/office/requests/{id}/cancel-request` | path id；body `expectedVersion,reason`必填1—500 | `cancelStatus=CANCEL_PENDING/CANCELLED,requestId,version,status`；200；本参考公共入口只处理PRINT | `office:request:cancel` |
| 办理 close | POST | `/api/v1/office/requests/{id}/close` | path id；body `expectedVersion` | `closed=true,requestId,version,status`；200；PRINT/MATERIAL可用，其他业务用专属结案 | `office:request:close` |

`request`返回`request_id,request_no,biz_type,title,applicant_user_id,applicant_dept_id,created_by_user_id,handler_user_id,client_source,status,current_node,rule_snapshot,revision,version,request_key,payload_hash,due_at,submitted_at,closed_at,created_at,updated_at`；列表/详情按Actor范围过滤。`history`只含`action_id,target_type,target_id,action_code,actor_user_id,from_status,to_status,request_revision,created_at`，不直接向列表暴露私有证据快照。任务返回`task_id,request_id,node_code,round_no,task_order,target_type,target_id,assignee_user_id,assignee_role_id,excluded_user_id,status,version,claimed_at,acted_by,acted_at,decision,comment,created_by_user_id,created_at,updated_at`。


## 3. 数据流转细节

| API与字段来源 | 服务端校验/计算 | 读取/写入表字段 | 事务及缓存 |
|---|---|---|---|
| requests：afterId来自query | 不得负数；固定按request_id升序扫描，逐根校验本人/代录/经办/部门范围；不可见行不回传 | 读office_request所有根字段；scannedThroughId取最后扫描ID而非最后可见ID | 只读；不缓存越权后的整列表 |
| detail：id来自path | 先查根再授权；不存在或不可见统一404 | office_request；office_action_log按request_id取摘要 | 无写入，不缓存私有历史 |
| tasks：Actor.userId | 活跃任务按assignee_user_id或有效岗位资格命中，excluded_user_id必须不同；再次校验根可见性 | office_task、sys_user_role、sys_role、office_request | 只读实时任务，不用Redis作为办理依据 |
| submit：expectedVersion来自body | 仅DRAFT/RETURNED的PRINT/MATERIAL；审核roleId只能由根rule_snapshot解析；根快照来自sys_config.office.rules的角色key经sys_role取得ID | office_request.status=SUBMITTED/current_node=REVIEW/submitted_at；插office_task节点REVIEW，target=REQUEST/id，excluded=真实applicant；action REQUEST_SUBMIT；Outbox REQUEST_SUBMITTED | Commands锁根→比版本→占action→任务/事件/根状态→统一version+1→保存响应，全事务；成功后可失效查询缓存 |
| task action：path id、expectedTaskVersion、decision、comment | 路径taskId服务端加入摘要targetTaskId；先验证固定action枚举，重放先于版本。CLAIM验证受派、排除和岗位；审核只接受REVIEW/REQUEST且根SUBMITTED，申请人及created_by不能自审；任务version须匹配 | CLAIM写assignee_user_id/status/claimed_at/version；审批写acted_by/acted_at/decision/comment/status=COMPLETED/version。APPROVE根APPROVED，建PRINT_EXECUTE/MATERIAL_EXECUTE，角色来自executorRoleId；RETURN根RETURNED；REJECT根REJECTED/closed_at；action固定TASK_CLAIM/REVIEW_APPROVE/REVIEW_RETURN/REVIEW_REJECT，audit保留决定及意见 | 锁根后锁task；无库存写入；任务与根、action、Outbox TASK_DECIDED同提交；不能重复根version |
| cancel：id、expectedVersion、reason；Actor | 只允许DRAFT/RETURNED/SUBMITTED/APPROVED/PROCESSING/WAIT_RECEIPT/WAIT_SETTLEMENT；逐print核对issued=returned+consumed和delivered=signed | edu_print_record事实；取消OPEN/CLAIMED任务；未清写office_request.CANCEL_PENDING和RECONCILE任务，已清写CANCELLED/closed_at；audit及REQUEST_CANCELLED事件存reason | 原耗用、交付、流水均保留；不生成反向库存；只允许实物余纸经专属RETURN增加库存 |
| close：id、expectedVersion；Actor | PRINT每子项必须issued=returned+consumed，delivery都已签，正常完成还需production FINISHED、settlement CLOSED、signed=good_copy_count；CANCEL_PENDING结清后才CANCELLED。MATERIAL校验approved=issued+cancelled、signed=issued和无PENDING责任 | 读edu_print_record/settlement、material_request_item、material_record/item；取消剩余任务；根COMPLETED或CANCELLED，closed_at；action REQUEST_CLOSE与REQUEST_CLOSED事件 | 根锁内重读所有事实；余额不变；Redis丢失不能影响结案条件 |

Commands保存actor/action_code/key唯一动作及`hash({targetRequestId,body})`；任务路径目标必须规范化加入body。首次动作正文的旧expectedVersion在合法重放时仍返回归档结果；同键异目标/异正文409。角色配置缺失保持待分派并报503，不跳节点。所有API响应的根version由Commands计算一次。

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

以下可运行Java17/Spring Boot4.0.3/MyBatis4.0.1代码依赖公共契约，不连接默认生产数据源。OfficeService负责具体任务资格，Commands负责事务和根version。



**backend/src/main/java/com/doupi/planref/office/OfficeController.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office")
public final class OfficeController {
    private final OfficeService service;
    public OfficeController(OfficeService service){this.service=service;}
    @GetMapping("/requests") public ResponseEntity<Map<String,Object>> list(@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.list(afterId),200);}
    @GetMapping("/requests/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
    @GetMapping("/tasks") public ResponseEntity<Map<String,Object>> tasks(){return ApiReply.of(service.tasks(),200);}
    @PostMapping("/requests/{id}/submit") public ResponseEntity<Map<String,Object>> submit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.submit(id,key,b),200);}
    @PostMapping("/tasks/{id}/actions") public ResponseEntity<Map<String,Object>> action(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.taskAction(id,key,b),200);}
    @PostMapping("/requests/{id}/cancel-request") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.cancel(id,key,b),200);}
    @PostMapping("/requests/{id}/close") public ResponseEntity<Map<String,Object>> close(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.close(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/office/OfficeService.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public final class OfficeService {
    private final OfficeRepository repo;
    private final Commands commands;
    private final Rules rules;
    public OfficeService(OfficeRepository repo,Commands commands,Rules rules){this.repo=repo;this.commands=commands;this.rules=rules;}
    public Map<String,Object> list(long after){
        Actor a=Actors.current();a.requireStaff();a.require("office:request:list");
        List<Map<String,Object>> visible=new ArrayList<>();long scanned=after;
        if(after<0)throw Problem.bad("afterId不能为负数");for(Map<String,Object> row:repo.requests(after)){scanned=Inputs.number(row.get("request_id"));try{Access.requireRequest(a,row,repo.db());visible.add(row);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}
        return P.of("items",visible,"scannedThroughId",scanned);
    }
    public Map<String,Object> detail(long id){Actor a=Actors.current();a.requireStaff();a.require("office:request:read");Map<String,Object> r=repo.request(id);Access.requireRequest(a,r,repo.db());return P.of("request",r,"history",repo.history(id));}
    public Map<String,Object> tasks(){Actor a=Actors.current();a.requireStaff();a.require("office:task:list");List<Map<String,Object>> out=new ArrayList<>();for(Map<String,Object> t:repo.tasks(a.userId())){try{Access.requireRequest(a,repo.request(Inputs.number(t.get("request_id"))),repo.db());out.add(t);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}return P.of("items",out);}
    public void requireState(Map<String,Object> r,String...allowed){if(Arrays.stream(allowed).noneMatch(x->x.equals(r.get("status"))))throw Problem.conflict("当前事项状态不允许此操作");}
    public Long role(Map<String,Object> r,String name){return rules.role(name,Json.readMap(r.get("rule_snapshot")));}
    public void requireRole(Commands.Context c,String name){Long id=role(c.request(),name);if(id==null||!repo.inRole(c.actor().userId(),id))throw Problem.forbidden("不具备该事项固定岗位资格");}
    public void eligible(Actor a,Map<String,Object> t){
        if(!Set.of("OPEN","CLAIMED").contains(String.valueOf(t.get("status"))))throw Problem.conflict("任务已经结清");
        if(t.get("excluded_user_id")!=null&&Inputs.number(t.get("excluded_user_id"))==a.userId())throw Problem.forbidden("不能办理本人须回避的审核");
        if(t.get("assignee_user_id")!=null){if(Inputs.number(t.get("assignee_user_id"))!=a.userId())throw Problem.forbidden("任务已指派其他人员");}
        else if(t.get("assignee_role_id")==null||!repo.inRole(a.userId(),Inputs.number(t.get("assignee_role_id"))))throw Problem.forbidden("不具备任务岗位资格");
    }
    public void requireTask(Commands.Context c,String node,String type,long target){eligible(c.actor(),repo.taskFor(c.requestId(),node,type,target));}
    public void submitWithin(Commands.Context c){
        requireState(c.request(),"DRAFT","RETURNED");String biz=String.valueOf(c.request().get("biz_type"));
        String field=switch(biz){case "PRINT"->"printReviewerRoleId";case "MATERIAL"->"materialReviewerRoleId";default->throw Problem.conflict("该业务请使用专属提交入口");};
        Long reviewer=role(c.request(),field);if(reviewer==null)throw new Problem(503,"RULE_MISSING","审核岗位尚未配置");
        repo.state(c.requestId(),"SUBMITTED","REVIEW");c.task("REVIEW","REQUEST",c.requestId(),null,reviewer,Inputs.number(c.request().get("applicant_user_id")));
        c.target("REQUEST",c.requestId());c.event("REQUEST_SUBMITTED",P.of("requestId",c.requestId()));
    }
    public Map<String,Object> submit(long id,String key,Map<String,Object> b){Actors.current().require("office:request:submit");return commands.run(id,"REQUEST_SUBMIT",key,b,200,c->{submitWithin(c);return P.of("submitted",true);});}
    public Map<String,Object> taskAction(long taskId,String key,Map<String,Object> b){
        Actor a=Actors.current();a.require("office:task:act");Map<String,Object> t=repo.locateTask(taskId);long id=Inputs.number(t.get("request_id"));
        String decision=Inputs.text(b,"decision",1,24);String comment=Inputs.optionalText(b,"comment",1000);
        String action=switch(decision){case "CLAIM"->"TASK_CLAIM";case "APPROVE"->"REVIEW_APPROVE";case "RETURN"->"REVIEW_RETURN";case "REJECT"->"REVIEW_REJECT";default->throw Problem.bad("不支持的任务决定");};Map<String,Object> payload=new LinkedHashMap<>(b);payload.put("targetTaskId",taskId);
        return commands.run(id,action,key,payload,200,c->{Map<String,Object> locked=repo.task(taskId);eligible(c.actor(),locked);if(Inputs.nonNegative(b,"expectedTaskVersion")!=Inputs.number(locked.get("version")))throw Problem.conflict("任务版本已变化");c.target("TASK",taskId);
            if("CLAIM".equals(decision)){repo.claim(taskId,c.actor().userId());return P.of("taskId",taskId,"taskStatus","CLAIMED");}
            if(!"REVIEW".equals(locked.get("node_code"))||!"REQUEST".equals(locked.get("target_type")))throw Problem.conflict("须通过该任务的业务办理入口操作");
            requireState(c.request(),"SUBMITTED");if(Inputs.number(c.request().get("applicant_user_id"))==c.actor().userId()||Inputs.number(c.request().get("created_by_user_id"))==c.actor().userId())throw Problem.forbidden("不能审核本人申请或本人代录事项");
            if("MATERIAL".equals(c.request().get("biz_type"))&&"APPROVE".equals(decision))throw Problem.conflict("物资批准必须通过逐项获准数量的专属审批入口");
            if(Set.of("RETURN","REJECT").contains(decision)&&(comment==null||comment.isBlank()))throw Problem.bad("退回或拒绝原因必填");
            repo.finish(taskId,c.actor().userId(),decision,comment);
            if("RETURN".equals(decision))repo.state(id,"RETURNED",null);
            else if("REJECT".equals(decision))repo.state(id,"REJECTED",null);
            else{repo.state(id,"APPROVED","EXECUTE");String node="PRINT".equals(c.request().get("biz_type"))?"PRINT_EXECUTE":"MATERIAL_EXECUTE";c.task(node,"REQUEST",id,null,role(c.request(),"executorRoleId"),null);}
            c.audit(P.of("taskId",taskId,"decision",decision,"comment",comment));c.event("TASK_DECIDED",P.of("taskId",taskId,"decision",decision));return P.of("taskId",Long.toString(taskId),"decision",decision);
        });
    }
    public Map<String,Object> cancel(long id,String key,Map<String,Object> b){Actors.current().require("office:request:cancel");String reason=Inputs.text(b,"reason",1,500);return commands.run(id,"REQUEST_CANCEL",key,b,200,c->{
        requireState(c.request(),"DRAFT","RETURNED","SUBMITTED","APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT");
        if(!"PRINT".equals(c.request().get("biz_type")))throw Problem.conflict("请使用该业务的专属取消入口");
        boolean outstanding=repo.printFacts(id).stream().anyMatch(p->Inputs.number(p.get("issued_qty"))!=Inputs.number(p.get("returned_qty"))+Inputs.number(p.get("consumed_qty"))||Inputs.number(p.get("delivered_count"))!=Inputs.number(p.get("signed_count")));
        if(!outstanding)repo.cancelTasks(id);else{c.closeTasks("REVIEW","REQUEST",id);c.closeTasks("PRINT_EXECUTE","REQUEST",id);}
        repo.state(id,outstanding?"CANCEL_PENDING":"CANCELLED",outstanding?"RECONCILE":null);
        if(outstanding)c.task("RECONCILE","REQUEST",id,null,role(c.request(),"warehouseRoleId"),null);
        c.target("REQUEST",id);c.event("REQUEST_CANCELLED",P.of("requestId",id,"reason",reason,"reconciliationRequired",outstanding));return P.of("cancelStatus",outstanding?"CANCEL_PENDING":"CANCELLED");
    });}
    public Map<String,Object> close(long id,String key,Map<String,Object> b){Actors.current().require("office:request:close");return commands.run(id,"REQUEST_CLOSE",key,b,200,c->{
        String biz=String.valueOf(c.request().get("biz_type"));boolean cancelling="CANCEL_PENDING".equals(c.request().get("status"));
        requireState(c.request(),"APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT","CANCEL_PENDING");
        if("PRINT".equals(biz)){
            List<Map<String,Object>> facts=repo.printFacts(id);if(facts.isEmpty())throw Problem.conflict("事项没有印品");
            for(Map<String,Object> p:facts){long issued=Inputs.number(p.get("issued_qty")),returned=Inputs.number(p.get("returned_qty")),consumed=Inputs.number(p.get("consumed_qty"));
                if(issued!=Math.addExact(returned,consumed)||Inputs.number(p.get("delivered_count"))!=Inputs.number(p.get("signed_count")))throw Problem.conflict("领纸或交付尚未核清");
                if(!cancelling&&(!"CLOSED".equals(p.get("paper_status"))||!"FINISHED".equals(p.get("production_status"))||Inputs.number(p.get("signed_count"))!=Inputs.number(p.get("good_copy_count"))))throw Problem.conflict("仍有子项未完成核销及全部领取");}
        }else if("MATERIAL".equals(biz)){if(repo.materialOutstanding(id)!=0||repo.materialReturnsOutstanding(id)!=0||repo.liabilities(id)!=0)throw Problem.conflict("尚有待发、未签收、待归还或责任事项");}
        else throw Problem.conflict("该业务通过专属结案动作完成");
        repo.cancelTasks(id);repo.state(id,cancelling?"CANCELLED":"COMPLETED",null);c.target("REQUEST",id);c.event("REQUEST_CLOSED",P.of("requestId",id));return P.of("closed",true);
    });}
}
```

**backend/src/main/java/com/doupi/planref/office/OfficeRepository.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class OfficeRepository {
    private final Db db;
    public OfficeRepository(Db db){this.db=db;}
    public Db db(){return db;}
    public Map<String,Object> request(long id){return db.required("select * from office_request where request_id=#{p.id}",P.of("id",id));}
    public List<Map<String,Object>> requests(long after){return db.list("select * from office_request where request_id>#{p.after} order by request_id limit 200",P.of("after",after));}
    public List<Map<String,Object>> tasks(long user){return db.list("select t.* from office_task t where t.status in ('OPEN','CLAIMED') and (t.excluded_user_id is null or t.excluded_user_id<>#{p.user}) and (t.assignee_user_id=#{p.user} or (t.assignee_user_id is null and t.assignee_role_id in(select role_id from sys_user_role where user_id=#{p.user}))) order by t.task_id limit 200",P.of("user",user));}
    public Map<String,Object> task(long id){return db.required("select * from office_task where task_id=#{p.id} for update",P.of("id",id));}
    public Map<String,Object> locateTask(long id){return db.required("select * from office_task where task_id=#{p.id}",P.of("id",id));}
    public Map<String,Object> taskFor(long request,String node,String type,long target){return db.required("select * from office_task where request_id=#{p.request} and node_code=#{p.node} and target_type=#{p.type} and target_id=#{p.target} and status in('OPEN','CLAIMED') order by task_id desc limit 1 for update",P.of("request",request,"node",node,"type",type,"target",target));}
    public boolean inRole(long user,long role){return !db.one("select ur.role_id from sys_user_role ur join sys_role r on r.role_id=ur.role_id where ur.user_id=#{p.user} and ur.role_id=#{p.role} and r.status='0' and r.del_flag='0'",P.of("user",user,"role",role)).isEmpty();}
    public void state(long id,String state,String node){db.write("update office_request set status=#{p.state},current_node=#{p.node},submitted_at=case when #{p.state}='SUBMITTED' then current_timestamp else submitted_at end,closed_at=case when #{p.state} in('COMPLETED','CANCELLED','REJECTED') then current_timestamp else closed_at end,updated_at=current_timestamp where request_id=#{p.id}",P.of("id",id,"state",state,"node",node));}
    public void claim(long id,long user){db.write("update office_task set assignee_user_id=#{p.user},status='CLAIMED',claimed_at=current_timestamp,version=version+1,updated_at=current_timestamp where task_id=#{p.id}",P.of("id",id,"user",user));}
    public void finish(long id,long user,String decision,String comment){db.write("update office_task set status='COMPLETED',acted_by=#{p.user},acted_at=current_timestamp,decision=#{p.decision},comment=#{p.comment},version=version+1,updated_at=current_timestamp where task_id=#{p.id}",P.of("id",id,"user",user,"decision",decision,"comment",comment));}
    public void cancelTasks(long request){db.write("update office_task set status='CANCELLED',version=version+1,updated_at=current_timestamp where request_id=#{p.id} and status in('OPEN','CLAIMED')",P.of("id",request));}
    public List<Map<String,Object>> printFacts(long request){return db.list("select p.*,s.good_copy_count,s.unused_qty,s.status as paper_status from edu_print_record p left join edu_print_settlement s on s.print_id=p.print_id and s.paper_goods_id=p.paper_goods_id where p.request_id=#{p.id} and p.del_flag='0' order by p.print_id",P.of("id",request));}
    public long materialOutstanding(long request){long lines=Inputs.number(db.required("select count(*) as n from edu_material_request_item where request_id=#{p.id} and (approved_qty<>issued_qty+cancelled_qty or signed_qty<>issued_qty)",P.of("id",request)).get("n"));long intents=Inputs.number(db.required("select count(*) as n from office_task where request_id=#{p.id} and target_type='MATERIAL_RETURN_INTENT' and status in ('OPEN','CLAIMED')",P.of("id",request)).get("n"));return Math.addExact(lines,intents);}
    public long materialReturnsOutstanding(long request){return Inputs.number(db.required("select count(*) as n from edu_material_request_item q where q.request_id=#{p.id} and q.return_required=1 and q.returned_qty+coalesce((select sum(i.written_off_qty) from edu_material_record_item i join edu_material_record r on r.record_id=i.record_id where i.request_item_id=q.request_item_id and r.record_type='1'),0)<q.issued_qty",P.of("id",request)).get("n"));}
    public long liabilities(long request){return Inputs.number(db.required("select count(*) as n from edu_material_record_item i join edu_material_record r on r.record_id=i.record_id where r.request_id=#{p.id} and i.liability_status='PENDING'",P.of("id",request)).get("n"));}
    public List<Map<String,Object>> history(long request){return db.list("select action_id,target_type,target_id,action_code,actor_user_id,from_status,to_status,request_revision,created_at from office_action_log where request_id=#{p.id} order by action_id",P.of("id",request));}
}
```



## 6. 边界与异常场景处理

400：非法decision、负分页游标、缺少版本和理由。403：无权限、岗位不符、自审和任务已指派他人。404：事项不可见、子任务不存在。409：根/任务版本变化、已办任务、不同载荷重用幂等键、结案事实不齐。503：规则角色不存在/停用或数据库不可用。任何异常回滚任务、状态、动作占键及Outbox，客户端保留输入；HTTP超时使用原key原正文重试。任务阅读不等于办理；通知失败不回滚已提交审批。死锁或超时回滚后只用原键重试。多印品逐项检查，不能只以第一子项完成判断根完成。
