# APP-02 真实工作台与消息回执

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#app-02)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P1；工期：2个单人工作日；依赖：APP-01、ADM-12。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含我的申请、待我处理、我经办/已办的真实事项与通知阅读/明确回执；不把通知已读等同任务完成，不实现独立原生推送平台。

- [ ] 第1日：替换`pages/index/index.uvue,pages/work/index.uvue,pages/message/index.uvue`演示数据，调用事项/任务/收件接口，按服务端身份显示入口。
- [ ] 第2日：通知点击进入source_request_id对应详情、分页/空/失败状态、读与回执按钮分别操作；跨后台更新后刷新验证。

验收：非本人任务不可操作；阅读不自动回执；通知失败不影响已提交业务；退出切换账户无前人消息。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 事项列表 | GET | `/api/v1/office/requests` | afterId/string/否默认0/扫描游标 | items/office_request[]；scannedThroughId/string/下页扫描边界 | office:request:list |
| 事项详情 | GET | `/api/v1/office/requests/{id}` | id/string/是 | request/根字段；history/动作摘要[] | office:request:read且范围 |
| 我的待办 | GET | `/api/v1/office/tasks` | 无body | items/任务数组，含task_id,request_id,target_type,target_id,node_code,status,version,assignee_user_id,assignee_role_id | office:task:list |
| 本人通知 | GET | `/api/v1/office/notices` | after/string/否默认0/通知游标 | items[{notice_id:string,notice_title:string,notice_content:string,source_request_id:string或null,published_at:datetime,read_at:datetime或null,acknowledged_at:datetime或null,ack_required:int}] | notice:inbox:read |
| 阅读 | POST | `/api/v1/office/notices/{id}/read` | id/string/是；body空对象；幂等头必填 | notice_id/string；read_at,acknowledged_at/datetime或null | notice:inbox:read且本人ACTIVE收件人 |
| 明确回执 | POST | `/api/v1/office/notices/{id}/ack` | id/string/是；acknowledged/boolean=true/是 | 同阅读 | notice:inbox:read且本人收件快照要求回执 |

## 3. 数据流转细节

所有移动写动作使用同一后端Controller→Service→Repository，不新建App专用库存/事项表。Bearer由服务端生成，clientSource=STAFF_APP仅审计。App不接收和保存学校secret；列表/权限以服务端返回为准。网络超时先展示“结果待确认”，原CommandTicket重发，禁止自动改变expectedVersion或生成新键。

1. 列表：App afterId→OfficeRepository查`office_request.request_id`顺序扫描，Access检查真实申请人/录入人/经办人/部门或显式任务受派人；以scannedThroughId续读，不能以当前可见最后一行跳过记录。App按applicant_user_id/handler_user_id及root状态分类，不新增本地真相。
2. 待办：Actor.userId和有效role关联→`office_task.assignee_user_id/assignee_role_id,excluded_user_id,status`→服务端重新核实事项范围。阅读不修改status/version。
3. 通知：Actor.userId→`sys_notice_recipient(user_id,status=ACTIVE)`关联`sys_notice.publication_status=PUBLISHED`→返回实际read_at/acknowledged_at。没有通知返回空数组，不显示示例提醒。
4. read/ack：路径noticeId和body纳入摘要，事务占`sys_notice_user_action(user_id,action_code,key)`，锁本人收件行；READ只`read_at=COALESCE(read_at,now)`；ACK须true且ack_required1，同时填缺失read_at及acknowledged_at；同事务保存响应。无office root，无库存操作；缓存只保当前页面、切账户清空。

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

**sys_notice**

```sql
CREATE TABLE `sys_notice` (
  `notice_id` INT NOT NULL AUTO_INCREMENT COMMENT '公告ID',
  `notice_title` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `notice_type` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告类型（1通知 2公告）',
  `notice_content` LONGBLOB COMMENT '公告内容',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '公告状态（0正常 1关闭）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`notice_id`),
  `publication_status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '新增，DRAFT/PUBLISHED/WITHDRAWN',
  `audience_type` VARCHAR(16) NOT NULL DEFAULT 'ALL' COMMENT '新增，ALL/DEPT/ROLE/USER',
  `audience_snapshot` JSON NULL COMMENT '新增，发布时选定范围快照',
  `ack_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新增，需明确回执',
  `ack_due_at` DATETIME(3) NULL COMMENT '新增，回执期限',
  `publisher_user_id` BIGINT NULL COMMENT '新增，真实发布者',
  `published_at` DATETIME(3) NULL COMMENT '新增',
  `source_request_id` BIGINT NULL COMMENT '新增，关联业务事项',
  `source_event_id` BIGINT NULL COMMENT '新增，事务消息生成通知的稳定身份，事件重试不能再次新建notice',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，防重复发布',
  UNIQUE `uk_notice_source_event` (
    `source_event_id`
  ),
  INDEX `idx_notice_published` (`publication_status`, `published_at`),
  INDEX `idx_notice_request` (`source_request_id`),
  CONSTRAINT `fk_ref_078` FOREIGN KEY (`publisher_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_079` FOREIGN KEY (`source_event_id`) REFERENCES `sys_outbox_event` (
    `event_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知公告表';
```

**sys_notice_recipient**

```sql
CREATE TABLE `sys_notice_recipient` (
  `recipient_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '收件记录',
  `notice_id` INT NOT NULL COMMENT '通知',
  `user_id` BIGINT NOT NULL COMMENT '发布时解析的具体收件人',
  `delivered_at` DATETIME(3) NOT NULL COMMENT '进入收件箱，不等于短信已送达',
  `read_at` DATETIME(3) NULL COMMENT '阅读时间',
  `acknowledged_at` DATETIME(3) NULL COMMENT '明确回执时间，阅读不等于回执',
  `ack_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '本人的回执要求快照',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE/WITHDRAWN',
  `source_event_id` BIGINT NULL COMMENT '来源事件',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`recipient_id`),
  UNIQUE `uk_notice_recipient` (
    `notice_id`,
    `user_id`
  ),
  INDEX `idx_recipient_inbox` (`user_id`, `status`, `read_at`, `notice_id`),
  INDEX `idx_recipient_ack` (`notice_id`, `acknowledged_at`),
  INDEX `idx_recipient_event` (`source_event_id`),
  CONSTRAINT `fk_ref_080` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice` (
    `notice_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_081` FOREIGN KEY (`source_event_id`) REFERENCES `sys_outbox_event` (
    `event_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_notice_recipient';
```

**sys_notice_user_action**

```sql
CREATE TABLE sys_notice_user_action (
  user_action_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '通知用户动作ID',
  user_id BIGINT NOT NULL COMMENT '真实认证员工',
  action_code VARCHAR(16) NOT NULL COMMENT 'READ或ACK固定动作',
  idempotency_key VARCHAR(64) NOT NULL COMMENT '客户端命令键',
  notice_id INT NOT NULL COMMENT '通知目标',
  payload_hash CHAR(64) NOT NULL COMMENT '含noticeId和body的规范摘要',
  result_code INT NULL COMMENT '真实HTTP结果',
  result_json JSON NULL COMMENT '可重放结果',
  created_at DATETIME(3) NOT NULL COMMENT '命令时间',
  UNIQUE (
    user_id,
    action_code,
    idempotency_key
  ),
  CONSTRAINT fk_notice_action_user FOREIGN KEY (user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_notice_action_notice FOREIGN KEY (notice_id) REFERENCES sys_notice (
    notice_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知阅读回执独立幂等，不制造办公根';
```

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



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

**backend/src/main/java/com/doupi/planref/notice/NoticeController.java**

```java
package com.doupi.planref.notice;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/office")
public class NoticeController {
 private final NoticeService service;
 public NoticeController(NoticeService service){this.service=service;}
 @GetMapping("/notices") public ResponseEntity<Map<String,Object>> inbox(@RequestParam(defaultValue="0")long after){return ApiReply.of(service.inbox(after),200);}
 @PostMapping("/notices") public ResponseEntity<Map<String,Object>> publish(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.publish(key,b),201);}
 @PostMapping("/notices/{id}/read") public ResponseEntity<Map<String,Object>> read(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.act(id,"READ",key,b),200);}
 @PostMapping("/notices/{id}/ack") public ResponseEntity<Map<String,Object>> ack(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.act(id,"ACK",key,b),200);}
 @GetMapping("/notices/{id}/receipts") public ResponseEntity<Map<String,Object>> receipts(@PathVariable long id){return ApiReply.of(service.receipts(id),200);}
 @GetMapping("/ledger") public ResponseEntity<Map<String,Object>> ledger(@RequestParam(defaultValue="0")long after){return ApiReply.of(service.ledger(after),200);}
 @GetMapping("/reports") public ResponseEntity<Map<String,Object>> reports(@RequestParam(defaultValue="0")long after){return ApiReply.of(service.report(),200);}
 @GetMapping(value="/ledger/export",produces="text/csv") public ResponseEntity<byte[]> export(@RequestParam(defaultValue="0")long after){return ResponseEntity.ok().header("Content-Disposition","attachment; filename=office-ledger.csv").body(service.export(after));}
}
```

**backend/src/main/java/com/doupi/planref/notice/NoticeService.java**

```java
package com.doupi.planref.notice;

import com.doupi.planref.*;
import com.doupi.planref.auth.ExternalCommands;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class NoticeService {
 private final Db db; private final TransactionTemplate tx; private final ExternalCommands external;
 public NoticeService(Db db,PlatformTransactionManager manager,ExternalCommands external){this.db=db;this.tx=new TransactionTemplate(manager);this.external=external;}
 public Map<String,Object> inbox(long after){if(after<0)throw Problem.bad("after不能为负");Actor a=Actors.current();a.requireStaff();a.require("notice:inbox:read");List<Map<String,Object>> items=db.list("SELECT n.notice_id,n.notice_title,n.notice_content,n.source_request_id,n.published_at,r.read_at,r.acknowledged_at,r.ack_required FROM sys_notice_recipient r JOIN sys_notice n ON n.notice_id=r.notice_id WHERE r.user_id=#{p.user} AND r.status='ACTIVE' AND n.publication_status='PUBLISHED' AND n.notice_id>#{p.after} ORDER BY n.notice_id LIMIT 100",P.of("user",a.userId(),"after",after));for(Map<String,Object> item:items)if(item.get("notice_content") instanceof byte[] bytes)item.put("notice_content",new String(bytes,StandardCharsets.UTF_8));return P.of("items",items);}
 public Map<String,Object> act(long id,String action,String key,Map<String,Object> body){
  Actor a=Actors.current();a.requireStaff();a.require("notice:inbox:read");
  if(!Set.of("READ","ACK").contains(action))throw Problem.bad("未知通知动作");
  if(key==null||key.isBlank()||key.length()>64)throw Problem.bad("必须提供1至64字符Idempotency-Key");
  String hash=NoticePolicy.commandHash(id,body);Map<String,Object> p=P.of("user",a.userId(),"action",action,"key",key,"hash",hash,"notice",id);
  return tx.execute(s->{
   db.write("INSERT INTO sys_notice_user_action(user_id,action_code,idempotency_key,notice_id,payload_hash,created_at) VALUES(#{p.user},#{p.action},#{p.key},#{p.notice},#{p.hash},CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE user_action_id=user_action_id",p);
   Map<String,Object> command=db.required("SELECT * FROM sys_notice_user_action WHERE user_id=#{p.user} AND action_code=#{p.action} AND idempotency_key=#{p.key} FOR UPDATE",p);
   if(!hash.equals(command.get("payload_hash")))throw Problem.conflict("相同通知命令键的目标或正文不同");
   if(command.get("result_json")!=null){Map<String,Object> out=Json.readMap(command.get("result_json"));out.put("_replayed",true);return out;}
   Map<String,Object> r=db.required("SELECT r.* FROM sys_notice_recipient r JOIN sys_notice n ON n.notice_id=r.notice_id WHERE r.notice_id=#{p.notice} AND r.user_id=#{p.user} AND r.status='ACTIVE' AND n.publication_status='PUBLISHED' FOR UPDATE",p);
   if("ACK".equals(action)&&!Inputs.bool(body,"acknowledged",false))throw Problem.bad("回执须明确acknowledged=true");
   if("ACK".equals(action)&&Inputs.number(r.get("ack_required"))!=1)throw Problem.conflict("该通知无需回执");
   String sql="ACK".equals(action)?"UPDATE sys_notice_recipient SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3)),acknowledged_at=COALESCE(acknowledged_at,CURRENT_TIMESTAMP(3)) WHERE recipient_id=#{p.id}":"UPDATE sys_notice_recipient SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3)) WHERE recipient_id=#{p.id}";
   db.write(sql,P.of("id",r.get("recipient_id")));
   Map<String,Object> out=db.required("SELECT notice_id,read_at,acknowledged_at FROM sys_notice_recipient WHERE recipient_id=#{p.id}",P.of("id",r.get("recipient_id")));
   db.write("UPDATE sys_notice_user_action SET result_json=#{p.result},result_code=200 WHERE user_action_id=#{p.id}",P.of("result",Json.write(out),"id",command.get("user_action_id")));return out;
  });
 }
 public Map<String,Object> publish(String key,Map<String,Object> body){
  Actor a=Actors.current();a.requireStaff();a.require("notice:publish");
  return external.run("NOTICE:"+a.userId(),"NOTICE_PUBLISH",key,body,201,()->{
   String title=Inputs.text(body,"title",1,50),content=Inputs.text(body,"content",1,20000),type=Inputs.text(body,"audienceType",1,16);
   Set<Long> users=new TreeSet<>();List<Long> ids="ALL".equals(type)?List.of():Inputs.ids(body,"audienceIds");
   if(!Set.of("ALL","USER","DEPT","ROLE").contains(type))throw Problem.bad("audienceType不合法");
   if(!"ALL".equals(type)&&ids.isEmpty())throw Problem.bad("发布范围不能为空");
   if("ALL".equals(type)){a.require("notice:publish:all");for(Map<String,Object> u:db.list("SELECT user_id FROM sys_user WHERE status='0' AND del_flag='0'",P.of()))users.add(Inputs.number(u.get("user_id")));}
   for(long id:ids){String sql=switch(type){case "USER"->"SELECT user_id,dept_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'";case "DEPT"->"SELECT user_id,dept_id FROM sys_user WHERE dept_id=#{p.id} AND status='0' AND del_flag='0'";default->"SELECT u.user_id,u.dept_id FROM sys_user u JOIN sys_user_role r ON r.user_id=u.user_id WHERE r.role_id=#{p.id} AND u.status='0' AND u.del_flag='0'";};for(Map<String,Object> u:db.list(sql,P.of("id",id))){if(!a.allData()&&!a.scopeDeptIds().contains(Inputs.number(u.get("dept_id")))&&Inputs.number(u.get("user_id"))!=a.userId())throw Problem.forbidden("发布范围超出部门授权");users.add(Inputs.number(u.get("user_id")));}}
   if(users.isEmpty())throw Problem.bad("发布范围未解析出有效员工");
   boolean ack=Inputs.bool(body,"ackRequired",false);
   long notice=db.insert("INSERT INTO sys_notice(notice_title,notice_type,notice_content,status,publication_status,audience_type,audience_snapshot,ack_required,publisher_user_id,published_at,version) VALUES(#{p.title},'1',#{p.content},'0','PUBLISHED',#{p.type},#{p.snapshot},#{p.ack},#{p.actor},CURRENT_TIMESTAMP(3),1)",P.of("title",title,"content",content.getBytes(StandardCharsets.UTF_8),"type",type,"snapshot",Json.write(users),"ack",ack,"actor",a.userId()));
   for(long user:users)recipient(notice,user,null,ack);
   return P.of("noticeId",notice,"recipientCount",users.size(),"ackRequired",ack);
  });
 }
 void recipient(long notice,long user,Long event,boolean ack){db.write("INSERT INTO sys_notice_recipient(notice_id,user_id,delivered_at,ack_required,status,source_event_id,created_at) VALUES(#{p.notice},#{p.user},CURRENT_TIMESTAMP(3),#{p.ack},'ACTIVE',#{p.event},CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE recipient_id=recipient_id",P.of("notice",notice,"user",user,"event",event,"ack",ack));}
 public Map<String,Object> receipts(long notice){Actor a=Actors.current();a.requireStaff();a.require("notice:receipts:read");Map<String,Object> n=db.required("SELECT publisher_user_id FROM sys_notice WHERE notice_id=#{p.id}",P.of("id",notice));if(!a.allData()&&(n.get("publisher_user_id")==null||Inputs.number(n.get("publisher_user_id"))!=a.userId()))throw Problem.forbidden("仅发布者或全范围查询者可查看回执");return P.of("items",db.list("SELECT user_id,delivered_at,read_at,acknowledged_at,ack_required,status FROM sys_notice_recipient WHERE notice_id=#{p.id} ORDER BY user_id",P.of("id",notice)));}
 public Map<String,Object> ledger(long after){if(after<0)throw Problem.bad("after不能为负");Actor a=Actors.current();a.requireStaff();a.require("office:ledger:read");List<Map<String,Object>> rows=new ArrayList<>();long cursor=after;for(Map<String,Object> r:db.list("SELECT * FROM office_request WHERE request_id>#{p.after} ORDER BY request_id LIMIT 500",P.of("after",after))){cursor=Inputs.number(r.get("request_id"));try{Access.requireRequest(a,r,db);rows.add(P.of("requestId",r.get("request_id"),"requestNo",r.get("request_no"),"bizType",r.get("biz_type"),"title",r.get("title"),"status",r.get("status"),"applicantUserId",r.get("applicant_user_id"),"submittedAt",r.get("submitted_at"),"closedAt",r.get("closed_at")));}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}Map<String,Long> pageTotals=new TreeMap<>();for(Map<String,Object> row:rows)pageTotals.merge(String.valueOf(row.get("bizType"))+":"+row.get("status"),1L,Long::sum);return P.of("items",rows,"scannedThroughId",cursor,"pageTotals",pageTotals,"aggregationScope","VISIBLE_PAGE");}
 public Map<String,Object> report(){Actor a=Actors.current();a.require("office:ledger:read");return tx.execute(s->{Map<String,Long>totals=new TreeMap<>();long after=0,visible=0;while(true){List<Map<String,Object>>batch=db.list("SELECT * FROM office_request WHERE request_id>#{p.after} ORDER BY request_id LIMIT 500",P.of("after",after));for(Map<String,Object>r:batch){after=Inputs.number(r.get("request_id"));try{Access.requireRequest(a,r,db);visible++;totals.merge(r.get("biz_type")+":"+r.get("status"),1L,Long::sum);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}if(batch.size()<500)break;}return P.of("totals",totals,"visibleRequestCount",visible,"scannedThroughId",after,"aggregationScope","ALL_VISIBLE_REQUESTS");});}
 public byte[] export(long after){Map<String,Object>page=ledger(after);StringBuilder csv=new StringBuilder("\ufeffrequestId,requestNo,bizType,title,status,applicantUserId,submittedAt,closedAt\r\n");for(Map<String,Object>row:Inputs.list(page,"items")){List<String>cells=new ArrayList<>();for(String key:List.of("requestId","requestNo","bizType","title","status","applicantUserId","submittedAt","closedAt")){String value=row.get(key)==null?"":row.get(key).toString();if(!value.isEmpty()&&"=+-@".indexOf(value.charAt(0))>=0)value="'"+value;cells.add("\""+value.replace("\"","\"\"")+"\"");}csv.append(String.join(",",cells)).append("\r\n");}return csv.toString().getBytes(StandardCharsets.UTF_8);}
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

**app/Workbench.uvue**

```vue
<template>
  <view class="page">
    <text class="title">移动办公工作台</text>
    <button :disabled="loading" @click="reload">刷新我的事项与待办</button>
    <text v-if="loading">正在读取</text>
    <text v-if="error.length > 0">{{ error }}</text>
    <text class="body">{{ requestText }}</text>
    <text class="body">{{ taskText }}</text>
  </view>
</template>
<script setup lang="uts">
import { ref } from 'vue'
import { workbench, tasks } from './office-api.uts'
const loading = ref(false)
const error = ref('')
const requestText = ref('')
const taskText = ref('')
function reload(): void {
  if (loading.value) return
  loading.value = true
  error.value = ''
  workbench().then((data: UTSJSONObject): Promise<UTSJSONObject> => {
    requestText.value = JSON.stringify(data)
    return tasks()
  }).then((data: UTSJSONObject): void => {
    taskText.value = JSON.stringify(data)
    loading.value = false
  }).catch((failure: Error): void => {
    error.value = failure.message
    loading.value = false
  })
}
</script>
<style>
.page { padding: 20px; }
.title { font-size: 22px; margin-bottom: 16px; }
.body { margin-top: 16px; font-size: 14px; }
</style>
```



## 6. 边界与异常场景处理

- 401清员工会话后重新登录；403显示岗位不允许；对象不可见404；409刷新正式事实并让用户重新核对，新决定用新ticket，原载荷重试用旧ticket。
- 网络失败/超时不显示成功，不本地模拟审批/签收/扣库；返回前进程退出须通过事项列表核对，不按最后点击状态推断提交结果。
- 私有文件无权限不显示临时地址；原稿、照片、学生联系资料和JWT不打印日志或写普通公共缓存；退出清理临时预览。
- 参考UTS需在APP-01锁定的HBuilderX/Android工具链实编译并真机验收，当前Java/H2/TS验证不代表原生平台已验证。
