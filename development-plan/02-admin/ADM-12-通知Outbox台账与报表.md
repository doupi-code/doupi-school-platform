# ADM-12 通知Outbox台账与报表

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-12)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期4人日，P0；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-11。

覆盖定向站内通知、阅读和明确回执、固定任务超期提醒、Outbox租约/重试、与事项同范围的明细、CSV分批导出和状态统计。通知不替代任务办理，CSV不是财务账。

- [ ] 第1日：`notice/NoticeService.java`、`admin-p1-extra.sql`实现独立通知用户命令幂等
- [ ] 第2日：`OutboxWorker.java`和`DeadlineWorker.java`实现受限后台投递
- [ ] 第3日：增加`doupi-web-admin-react/src/pages/office/notices/index.tsx`、`ledger/index.tsx`及`src/api/officeNotice.ts`（待实施），联调分页和统计
- [ ] 第4日：运行NoticePolicyTest/NoticeIntegrationTest，验收重复投递不新增通知、不重置已读，ACK错误回滚可同键纠正重试。配置plan.outbox-enabled默认false，隔离环境确认规则后再启用。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 通知收件箱 | GET | `/api/v1/office/notices` | query `after:integer>=0`可选0，notice_id正向游标 | items:array<object>最多100；每项notice_id:string(ID),notice_title,notice_content(UTF8文本),source_request_id,published_at,read_at:ISO8601或null,acknowledged_at:ISO8601或null,ack_required；200 | notice:inbox:read |
| 发布定向通知 | POST | `/api/v1/office/notices` | `title:string1..50,content:string1..20000,audienceType:enum(ALL,USER,DEPT,ROLE)`必填；`audienceIds:ID[]<=500`除ALL必填且非空；`ackRequired:boolean`可选false；Idempotency-Key需8..64的字母数字_.:- | noticeId:string(ID),recipientCount:integer,ackRequired:boolean；201 | notice:publish；ALL另需notice:publish:all |
| 标记已读 | POST | `/api/v1/office/notices/{id}/read` | path id:ID；body `{}`必填，无用户ID/根版本 | notice_id:string(ID),read_at:ISO8601或null,acknowledged_at:ISO8601或null；200 | notice:inbox:read且该收件人 |
| 明确回执 | POST | `/api/v1/office/notices/{id}/ack` | id；`acknowledged:boolean`必填true | notice_id:string(ID),read_at:ISO8601或null,acknowledged_at:ISO8601或null；200 | 同上且本人需回执 |
| 阅读回执台账 | GET | `/api/v1/office/notices/{id}/receipts` | id | items:array<object>[{user_id,delivered_at,read_at:ISO8601或null,acknowledged_at:ISO8601或null,ack_required,status:string(业务状态)}]；200 | notice:receipts:read且发布者或allData |
| 业务台账 | GET | `/api/v1/office/ledger` | query after非负可选0 | items:array<object>最多扫描500行后可见记录、scannedThroughId:string(ID)、pageTotals:object<业务:状态,integer>、aggregationScope:string(统计范围)=VISIBLE_PAGE；200 | office:ledger:read及逐事项范围 |
| 业务报表 | GET | `/api/v1/office/reports` | 无业务正文；兼容query after但全量汇总不按其截断 | totals:object<业务:状态,integer>按bizType:status分组、visibleRequestCount:integer、scannedThroughId:string(ID)、aggregationScope:string(统计范围)=ALL_VISIBLE_REQUESTS；200 | office:ledger:read及相同范围 |
| 台账批次导出 | GET | `/api/v1/office/ledger/export` | query after非负可选0，与ledger同扫描批次；下一批游标从ledger.scannedThroughId取得 | UTF8 BOM CSV附件office-ledger.csv，列requestId:string(ID),requestNo,bizType,title,status:string(业务状态),applicantUserId,submittedAt,closedAt；200 | office:ledger:read及相同范围 |

ledger.items逐项即CSV所列8字段；pageTotals只统计当前可见批次，不能当全校总量。read/ack使用sys_notice_user_action，不造office_request；noticeId与完整正文都入hash，unique(user_id,action_code,key)。

## 3. 数据流转细节

| 入口 | 字段与SQL流转 | 事务/缓存 |
|---|---|---|
| publish | audienceType服务端固定SQL解析到有效员工user_id，用户/部门/岗位范围须在发布者授权部门内，ALL须独立权限；以发布时具体users形成audience_snapshot | ExternalCommands独立channel_idempotency以真实发布者作用域占键，事务插sys_notice(PUBLISHED)+recipient，返回真实noticeId；不创建办公根，不模拟短信 |
| inbox/receipts | inbox只查本人ACTIVE收件人且通知PUBLISHED；notice_content longblob转UTF8。receipts先验证publisher_user_id或allData | 实时读取，不把打开页面当已回执 |
| read/ack | 插sys_notice_user_action占user/action/key，锁动作比较hash({noticeId,body})，有result_json先重放；锁本人有效recipient。READ只COALESCE(read_at)；ACK要求ack_required=1且acknowledged=true，并COALESCE两个时间 | 同事务保存result_code=200/result_json。失败回滚占键，重试不复写时间、不增加业务根版本 |
| Commands事件 | 任一业务命令在业务事务插Outbox，event_key和aggregate/type/version唯一，payload仅引用及安全标题 | 原业务成功即提交，不等站内worker或外部消息 |
| OutboxWorker | 短事务FOR UPDATE SKIP LOCKED领取PENDING或过期PROCESSING，写locked_by/locked_until。另一个事务重验租约，按source_event_id唯一建立/读取同一notice，以notice_id/user_id唯一投递；收件人为payload指定者、原事项申请/录入/经办与当前真实任务个人/岗位用户 | notice和recipient以及event.SENT同提交；重试保留read/ack；无Actor冒名。失败事务外另事务attempts+1，指数退避上限1小时，12次后DEAD，last_error只存异常类型 |
| DeadlineWorker | 锁50条超期OPEN/CLAIMED任务，以taskId+dueAt摘要稳定event_key插TASK_OVERDUE；任务变更期限时version改变后可发新轮提醒 | 只建真实Outbox，不办理或完成任务；同期限重复扫描不重复提醒 |
| ledger/export | 固定request_id升序扫描500，Access按本人/录入/经办/部门/显式个人任务过滤，scannedThroughId取扫描行不是末尾可见行 | CSV同范围同口径；字符串转义引号且对=+-@开头加单引号防公式执行；只导本批次，前端按游标分批 |
| reports | 一个数据库事务按500行扫描全体根，每行同Access过滤后累加biz/status计数；不回传不相关根 | MySQL REPEATABLE-READ保证同次汇总快照；Redis丢失不影响统计或收件事实 |

投递至少一次，业务唯一约束达到站内去重；不承诺未接入短信/微信服务已经送达。管理后台对DEAD事件报警并人工修复配置后受控重试，不删除原事件重建通知。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

**channel_idempotency**

```sql
/* Target schema definition. The complete schema is at database/target/schema.sql. */
/* This file adds six channel tables. Existing technical-design tables are not recreated. */
CREATE TABLE channel_idempotency (
  command_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '渠道命令主键',
  scope_key VARCHAR(128) NOT NULL COMMENT '服务端主体范围IDENTITY或STAFF，不接受body操作者',
  action_code VARCHAR(64) NOT NULL COMMENT '固定动作代码，目标ID只进入payload摘要',
  idempotency_key VARCHAR(64) NOT NULL COMMENT '客户端同一命令重试键',
  payload_hash CHAR(64) NOT NULL COMMENT '规范载荷SHA256，包含路径目标ID',
  http_status SMALLINT NULL COMMENT '成功归档HTTP状态，事务提交前填充',
  result_json JSON NULL COMMENT '可重放业务结果，不含token和查询明文凭证',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC占键时间',
  PRIMARY KEY (command_id),
  UNIQUE uk_channel_command (
    scope_key,
    action_code,
    idempotency_key
  ) COMMENT '同主体同动作同键只执行一次',
  INDEX idx_channel_created (created_at, command_id)   COMMENT '审计查询和归档，不自动删除有效业务重试记录',
  CONSTRAINT ck_channel_result CHECK ((
    http_status IS NULL AND result_json IS NULL
  )
  OR (
    http_status BETWEEN 200 AND 299 AND NOT result_json IS NULL
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='无office_request根的渠道动作幂等，与业务同事务';
```

## 5. 代码实现骨架

Java17、Spring Boot4.0.3、MyBatis4.0.1可运行参考实现如下，公共依赖见[公共契约](../00-shared/公共契约.md)。本轮维护开发计划、数据库结构资料与目录，不开发业务功能。



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

**backend/src/main/java/com/doupi/planref/notice/OutboxWorker.java**

```java
package com.doupi.planref.notice;

import com.doupi.planref.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Restricted worker: it does not impersonate a staff member or call Commands. */
@Component
@ConditionalOnProperty(name="plan.outbox-enabled",havingValue="true")
public class OutboxWorker {
 private final Db db;private final NoticeService notices;private final TransactionTemplate tx;
 private final String worker=UUID.randomUUID().toString();
 public OutboxWorker(Db db,NoticeService notices,PlatformTransactionManager manager){this.db=db;this.notices=notices;this.tx=new TransactionTemplate(manager);}
 @Scheduled(fixedDelayString="${plan.outbox-delay-ms:5000}")
 public void poll(){
  Long id=tx.execute(s->{Map<String,Object> e=db.one("SELECT event_id FROM sys_outbox_event WHERE (status='PENDING' AND next_attempt_at<=CURRENT_TIMESTAMP(3)) OR (status='PROCESSING' AND locked_until<CURRENT_TIMESTAMP(3)) ORDER BY event_id LIMIT 1 FOR UPDATE SKIP LOCKED",P.of());if(e.isEmpty())return null;long found=Inputs.number(e.get("event_id"));db.write("UPDATE sys_outbox_event SET status='PROCESSING',locked_by=#{p.worker},locked_until=TIMESTAMPADD(SECOND,60,CURRENT_TIMESTAMP(3)) WHERE event_id=#{p.id}",P.of("worker",worker,"id",found));return found;});
  if(id==null)return;
  try{tx.executeWithoutResult(s->deliver(id));}catch(RuntimeException failure){tx.executeWithoutResult(s->{Map<String,Object> e=db.one("SELECT attempts FROM sys_outbox_event WHERE event_id=#{p.id} AND locked_by=#{p.worker} AND status='PROCESSING' FOR UPDATE",P.of("id",id,"worker",worker));if(e.isEmpty())return;long attempts=Inputs.number(e.get("attempts"))+1;db.write("UPDATE sys_outbox_event SET status=#{p.status},attempts=#{p.attempts},next_attempt_at=TIMESTAMPADD(SECOND,#{p.delay},CURRENT_TIMESTAMP(3)),locked_by=NULL,locked_until=NULL,last_error=#{p.error} WHERE event_id=#{p.id} AND locked_by=#{p.worker}",P.of("status",attempts>=12?"DEAD":"PENDING","attempts",attempts,"delay",NoticePolicy.retrySeconds(attempts),"error",failure.getClass().getSimpleName(),"id",id,"worker",worker));});}
 }
 private void deliver(long id){
  Map<String,Object> e=db.required("SELECT * FROM sys_outbox_event WHERE event_id=#{p.id} AND status='PROCESSING' AND locked_by=#{p.worker} FOR UPDATE",P.of("id",id,"worker",worker));
  Map<String,Object> p=Json.readMap(e.get("payload"));Set<Long> users=new TreeSet<>();
  if(p.get("userId")!=null)users.add(Inputs.number(p.get("userId")));
  if(p.get("recipientUserIds")!=null)users.addAll(Inputs.ids(p,"recipientUserIds"));
  Object request=e.get("request_id");
  if(request!=null){Map<String,Object> r=db.required("SELECT applicant_user_id,created_by_user_id,handler_user_id FROM office_request WHERE request_id=#{p.id}",P.of("id",request));for(String key:List.of("applicant_user_id","created_by_user_id","handler_user_id"))if(r.get(key)!=null)users.add(Inputs.number(r.get(key)));for(Map<String,Object> t:db.list("SELECT DISTINCT COALESCE(t.assignee_user_id,ur.user_id) AS user_id FROM office_task t LEFT JOIN sys_user_role ur ON t.assignee_user_id IS NULL AND ur.role_id=t.assignee_role_id WHERE t.request_id=#{p.id} AND t.status IN('OPEN','CLAIMED') AND (t.excluded_user_id IS NULL OR t.excluded_user_id<>COALESCE(t.assignee_user_id,ur.user_id))",P.of("id",request)))if(t.get("user_id")!=null)users.add(Inputs.number(t.get("user_id")));}
  String title=p.get("title")==null?"事项状态已更新":p.get("title").toString();if(title.length()>50)title=title.substring(0,50);
  db.write("INSERT INTO sys_notice(notice_title,notice_type,notice_content,status,publication_status,audience_type,audience_snapshot,ack_required,source_request_id,source_event_id,published_at,version) VALUES(#{p.title},'1',#{p.content},'0','PUBLISHED','USER',#{p.users},0,#{p.request},#{p.event},CURRENT_TIMESTAMP(3),1) ON DUPLICATE KEY UPDATE notice_id=notice_id",P.of("title",title,"content","请在站内打开对应事项查看最新状态与待办。".getBytes(StandardCharsets.UTF_8),"users",Json.write(users),"request",request,"event",id));
  long notice=Inputs.number(db.required("SELECT notice_id FROM sys_notice WHERE source_event_id=#{p.id}",P.of("id",id)).get("notice_id"));
  for(long user:users){if(!db.one("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",user)).isEmpty())notices.recipient(notice,user,id,false);}
  db.write("UPDATE sys_outbox_event SET status='SENT',published_at=CURRENT_TIMESTAMP(3),locked_by=NULL,locked_until=NULL,last_error=NULL WHERE event_id=#{p.id} AND locked_by=#{p.worker}",P.of("id",id,"worker",worker));
 }
}
```

**backend/src/main/java/com/doupi/planref/notice/DeadlineWorker.java**

```java
package com.doupi.planref.notice;
import com.doupi.planref.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
@Component
@ConditionalOnProperty(name="plan.outbox-enabled",havingValue="true")
public class DeadlineWorker {
 private final Db db;private final TransactionTemplate tx;
 public DeadlineWorker(Db db,PlatformTransactionManager manager){this.db=db;this.tx=new TransactionTemplate(manager);}
 @Scheduled(fixedDelayString="${plan.deadline-delay-ms:60000}") public void scan(){tx.executeWithoutResult(s->{for(Map<String,Object>t:db.list("SELECT task_id,request_id,version,due_at FROM office_task WHERE status IN('OPEN','CLAIMED') AND due_at<CURRENT_TIMESTAMP(3) ORDER BY task_id LIMIT 50 FOR UPDATE SKIP LOCKED",P.of())){String key="TASK_OVERDUE:"+t.get("task_id")+":"+Json.hash(t.get("due_at"));db.write("INSERT INTO sys_outbox_event(event_key,event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload,status,attempts,next_attempt_at,created_at) VALUES(#{p.key},'TASK_OVERDUE','TASK',#{p.task},#{p.version},#{p.request},#{p.payload},'PENDING',0,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE event_id=event_id",P.of("key",key,"task",t.get("task_id"),"version",t.get("version"),"request",t.get("request_id"),"payload",Json.write(P.of("title","任务已超期，请及时办理","taskId",t.get("task_id")))));}});}
}
```

**backend/src/main/java/com/doupi/planref/notice/NoticePolicy.java**

```java
package com.doupi.planref.notice;
import com.doupi.planref.*;
import java.util.Map;
public final class NoticePolicy {
 private NoticePolicy(){}
 public static String commandHash(long noticeId,Map<String,Object> body){return Json.hash(P.of("noticeId",noticeId,"body",body));}
 public static long retrySeconds(long attempt){return Math.min(3600,1L<<Math.min(12,Math.max(1,attempt)));}
}
```



## 6. 边界与异常场景处理

400：负游标、非法范围、空收件人、回执非true；403：越过发布部门范围、ALL缺单独权限、无查看回执资格；404：非本人收件、已撤下或不可见通知；409：同动作键换notice或正文、无需回执却ACK、重复处理中。worker崩溃在租约到期后恢复；notice/recipient/SENT同事务避免投了一半；同源事件再投不新建notice。read不完成task，ACK不代替签收业务。CSV批次与全量reports清楚标口径；报表不使用空数组假装完整结果。
