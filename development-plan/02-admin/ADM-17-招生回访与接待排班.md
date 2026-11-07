# ADM-17 招生回访与接待排班

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-17)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期3人日，P1；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-16。

P1覆盖接待人员未来班次、人员时间冲突、单次预约容量分派与改期、原预约公开规则联动、回访负责人/期限/结果和继续跟进。保留P0预约确认、取消、核销事实，回访状态不改成到校状态。

- [ ] 第1日：`RecruitOperationsService.shift/assign`及班次/分派表
- [ ] 第2日：reschedule与公开日期/时段quota复核
- [ ] 第3日：followup/completeFollowup和`doupi-web-admin-react/src/pages/recruit/followup/index.tsx`、`shift/index.tsx`（待实施）联调容量、改期、回访。验收班次容量1同时分派两预约最多一成功；旧新班次容量同事务调整；本人记录回访后可继续下次或结束，不增加到校统计。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

创建公共字段：`title:string(1..200)`可选，缺省为业务名申请；`applicantUserId:ID`可选，缺省真实Actor，指定他人须`office:request:delegate`及部门范围；`clientSource:enum(ADMIN_WEB,STAFF_APP,WECHAT_MINI,PUBLIC_WEB)`可选默认ADMIN_WEB，只审计终端；`dueAt:ISO8601`可选，表示事项期限，不改变权限。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 接待排班 | POST | `/api/v1/office/recruit-shifts` | 公共创建字段；`teacherUserId:ID,campusId:string1..32,startsAt:ISO8601,endsAt:ISO8601,capacity:integer>0`必填 | shiftId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=APPROVED；201 | recruit:shift:manage及校区部门范围 |
| 预约分派 | POST | `/api/v1/office/recruit-assignments` | 公共创建字段；`appointmentId:ID,shiftId:ID,visitAt:ISO8601,timeSlot:string1..64,expectedAppointmentVersion:integer>=0`必填 | assignmentId:string(ID),shiftId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=APPROVED；201 | recruit:shift:assign及预约校区范围 |
| 确认改期 | POST | `/api/v1/office/recruit-assignments/{id}/reschedule` | id为assignment的独立requestId；expectedVersion:integer>=0必填(根版本)；`shiftId,visitAt,timeSlot,expectedAppointmentVersion`必填同上；`reason:string1..1000`必填；新旧shift必须不同 | assignmentId:string(ID),shiftId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)；200 | 同上 |
| 创建回访 | POST | `/api/v1/office/recruit-followups` | 公共创建字段；`appointmentId:ID,assigneeUserId:ID,dueAt:ISO8601`必填，dueAt必须未来 | followupId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=PROCESSING；201 | recruit:followup:create及预约工作范围 |
| 记录回访结果 | POST | `/api/v1/office/recruit-followups/{id}/complete` | id为followup根；expectedVersion:integer>=0必填(根版本)；`outcome:string1..2000`必填；`nextDueAt:ISO8601`可选未来，出现则继续回访 | followupId:string(ID),continues:boolean,requestId:string(ID),version:integer,status:string(业务状态)=PROCESSING/COMPLETED；200 | recruit:followup:complete且本人受派 |
| 详情查询 | GET | `/api/v1/office/operations/{id}` | rootId | request:object/detail:object；200。班次detail:object为shift_id,request_id,teacher_user_id,campus_id,starts_at,ends_at,capacity,assigned_count,status:string(业务状态)；分派为assignment_id,request_id,appointment_id,shift_id,assigned_by,assigned_at；回访为followup_id,request_id,appointment_id,assignee_user_id,due_at,outcome,status:string(业务状态),completed_at,next_due_at | operations:query及范围 |

## 3. 数据流转细节

| 入口 | 字段级业务与SQL | 原子性与提醒 |
|---|---|---|
| shift | 校验有效员工、校区范围、未来半开区间；锁sys_user接待员工行作为全班次冲突门，查ACTIVE班次同teacher且start<end重叠 | 创建真实RECRUIT_SHIFT根与recruit_shift，assigned_count=0；RECRUIT_SHIFT_CREATED Outbox定向接待人；不创建员工绑定或冒充教师身份 |
| assign | 创建独立RECRUIT_ASSIGNMENT根承载一次预约分派，锁appointment、shift；预约APPROVED且expectedAppointmentVersion匹配，校区相同；班次ACTIVE，visitAt位于未来[start,end)，真实占用从assignment JOIN有效APPROVED/VERIFIED预约重新计数，避免P0取消后容量投影滞后阻塞名额 | appointment_id UNIQUE防重复分派；insert assignment、班次count+1、预约assigned_teacher/date/time_slot/version+1、action、RECRUIT_ASSIGNED Outbox同事务 |
| reschedule | 锁分派根与assignment/appointment，旧新shift按shift_id升序锁；新班次重做全部校验。沿用RecruitService.rules的openDaysAhead、timeSlots/maxQuota，锁既有campus行，排除本预约重算目标日/时段容量 | 旧班次count−1，新+1；更新assignment当前shift；更新原预约日期/时段/接待教师及version，保留原appointmentId/凭证；audit保留旧新shift/reason，RECRUIT_RESCHEDULED定向新旧接待人；访客收到真实站内状态消息 |
| followup create | 锁原预约并复用RecruitRepository.staffScope；核对有效assignee和未来dueAt；创建真实RECRUIT_FOLLOWUP根、followup.OPEN、根handler | 建个人RECRUIT_FOLLOWUP任务并写任务due_at；RECRUIT_FOLLOWUP_CREATED事件；不改appointment.status或verify_time |
| complete | 锁本人OPEN followup；outcome保存本轮结果，audit保留每次历史；有nextDueAt则继续OPEN并把due_at/任务期限移至下次，任务version+1；无next则COMPLETED、completed_at与根closed_at | 完成时关闭个人任务；每次只增本回访根一次version，RECRUIT_FOLLOWUP_UPDATED事件；超期由ADM-12真实任务扫描提醒 |
| detail | Access先限定root，再固定SQL按request_id查对应shift/assignment/followup | 访客无权看内部回访结论；公开预约接口保持脱敏投影 |

时间统一截断至DATETIME(3)毫秒精度后比较与保存；班次assigned_count是分派投影，分派/改期拥有各自事项根，避免跨两个班次根重复递增Commands版本。锁后重算活跃占用，已取消预约不继续占有效排班容量；旧资料仅保留历史归属。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**recruit_shift**

```sql
CREATE TABLE recruit_shift (
  shift_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '接待班次ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  teacher_user_id BIGINT NOT NULL COMMENT '已核实接待员工',
  campus_id VARCHAR(32) NOT NULL COMMENT '既有校区标识',
  starts_at DATETIME(3) NOT NULL COMMENT '开始UTC时间，含边界',
  ends_at DATETIME(3) NOT NULL COMMENT '结束UTC时间，不含边界',
  capacity INT NOT NULL COMMENT '最大人数或接待容量',
  assigned_count INT NOT NULL DEFAULT 0 COMMENT '当前占用容量投影',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  CONSTRAINT fk_shift_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_shift_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ),
  CONSTRAINT fk_shift_teacher FOREIGN KEY (teacher_user_id) REFERENCES sys_user (
    user_id
  ),
  CHECK (ends_at > starts_at
  AND capacity > 0
  AND assigned_count >= 0
  AND assigned_count <= capacity),
  INDEX idx_shift_teacher (teacher_user_id, status, starts_at, ends_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='接待岗位排班，不修改员工身份绑定';
```

**recruit_assignment**

```sql
CREATE TABLE recruit_assignment (
  request_id BIGINT NOT NULL UNIQUE COMMENT '独立分派及改期事项根',
  assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '预约分派ID',
  appointment_id BIGINT NOT NULL UNIQUE COMMENT '既有真实预约',
  shift_id BIGINT NOT NULL COMMENT '接待班次ID',
  assigned_by BIGINT NOT NULL COMMENT '真实分派员工',
  assigned_at DATETIME(3) NOT NULL COMMENT '分派UTC时间',
  CONSTRAINT fk_assignment_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_assignment_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ),
  CONSTRAINT fk_assignment_shift FOREIGN KEY (shift_id) REFERENCES recruit_shift (
    shift_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='一次预约的当前班次，改期保留动作轨迹';
```

**recruit_followup**

```sql
CREATE TABLE recruit_followup (
  followup_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '回访ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  appointment_id BIGINT NOT NULL COMMENT '既有真实预约',
  assignee_user_id BIGINT NOT NULL COMMENT '核实受派员工',
  due_at DATETIME(3) NOT NULL COMMENT '当前回访UTC期限',
  outcome VARCHAR(2000) NULL COMMENT '最近结果，历次结果保留动作快照',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  completed_at DATETIME(3) NULL COMMENT '结清UTC时间',
  next_due_at DATETIME(3) NULL COMMENT '下次回访UTC时间',
  CONSTRAINT fk_followup_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_followup_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ),
  CONSTRAINT fk_followup_user FOREIGN KEY (assignee_user_id) REFERENCES sys_user (
    user_id
  ),
  INDEX idx_followup_due (assignee_user_id, status, due_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='回访任务和到校事实分开';
```

**doupi_recruit_appointment**

```sql
CREATE TABLE `doupi_recruit_appointment` (
  `appointment_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '预约ID',
  `appointment_no` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约单号',
  `openid` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' COMMENT '状态: PENDING-待审核 APPROVED-已通过 CANCELLED-已取消 VERIFIED-已核销/已到校',
  `parent_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '家长姓名',
  `parent_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生姓名',
  `student_gender` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT '男' COMMENT '学生性别',
  `student_grade` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_school` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '原就读学校',
  `campus_id` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT '校区ID',
  `campus_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '汉阳校区' COMMENT '校区名称',
  `visit_date` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约访校日期(YYYY-MM-DD)',
  `time_slot` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约时间段',
  `check_in_code` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '对接教师姓名',
  `verify_time` DATETIME DEFAULT NULL COMMENT '核销到校时间',
  `verifier` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '家长备注/诉求',
  `audit_remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '审核/接待备注',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`appointment_id`),
  UNIQUE `uk_appointment_no` (
    `appointment_no`
  ),
  INDEX `idx_phone` (`parent_phone`),
  INDEX `idx_visit_date` (`visit_date`),
  INDEX `idx_status` (`status`),
  `visitor_identity_id` BIGINT NULL COMMENT '新增，关联已识别访客的sys_external_identity，不能自动继承员工权限',
  `public_access_token_hash` CHAR(64) NULL COMMENT '新增，Web查询高熵访问凭证的摘要，结合本人核验；不存明文凭证',
  `visit_on` DATE NULL COMMENT '新增，校验后日期',
  `assigned_teacher_user_id` BIGINT NULL COMMENT '新增，明确sys_user关联',
  `verifier_user_id` BIGINT NULL COMMENT '新增，核销身份',
  `source_channel` VARCHAR(16) NOT NULL DEFAULT 'LEGACY' COMMENT '新增，四端来源，仅审计',
  `create_key` VARCHAR(64) NULL COMMENT '新增，创建重试键',
  `create_actor_key` VARCHAR(128) NULL COMMENT '新增，认证家长或受控访客会话，不由任意body指定',
  `payload_hash` CHAR(64) NULL COMMENT '新增，规范创建摘要',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，分配/取消/核销并发',
  UNIQUE `uk_appointment_create` (
    `create_actor_key`,
    `create_key`
  ),
  UNIQUE `uk_appointment_public_token` (
    `public_access_token_hash`
  ),
  INDEX `idx_appointment_visitor` (`visitor_identity_id`, `appointment_id`),
  INDEX `idx_appointment_teacher` (`assigned_teacher_user_id`, `status`, `visit_on`),
  INDEX `idx_appointment_owner` (`openid`, `appointment_id`),
  INDEX `idx_appointment_code` (`campus_id`, `check_in_code`, `status`),
  CONSTRAINT `fk_ref_083` FOREIGN KEY (`assigned_teacher_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_084` FOREIGN KEY (`verifier_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_100` FOREIGN KEY (`visitor_identity_id`) REFERENCES `sys_external_identity` (
    `identity_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='访校预约表';
```

**recruit_appointment_action**

```sql
CREATE TABLE recruit_appointment_action (
  action_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '招生预约动作轨迹ID',
  appointment_id BIGINT NOT NULL COMMENT '同一预约聚合',
  actor_user_id BIGINT NULL COMMENT '真实员工操作者；访客为空',
  actor_identity_id BIGINT NULL COMMENT '真实认证渠道身份；纯员工密码登录可空',
  action_code VARCHAR(32) NOT NULL COMMENT 'CREATE、CANCEL、CONFIRM、VERIFY、REMARK固定动作',
  previous_status VARCHAR(20) NULL COMMENT '动作前状态，创建为空',
  next_status VARCHAR(20) NOT NULL COMMENT '动作后状态',
  remark VARCHAR(500) NOT NULL COMMENT '动作原因或学校处理说明',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC事实时间',
  PRIMARY KEY (action_id),
  INDEX idx_recruit_action_root (appointment_id, action_id)   COMMENT '预约有序轨迹',
  INDEX idx_recruit_action_user (actor_user_id, created_at)   COMMENT '员工审计',
  INDEX idx_recruit_action_identity (actor_identity_id, created_at)   COMMENT '访客审计',
  CONSTRAINT fk_recruit_action_root FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_action_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_action_identity FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_recruit_action_actor CHECK (NOT actor_user_id IS NULL OR NOT actor_identity_id IS NULL),
  CONSTRAINT ck_recruit_action_code CHECK (action_code IN ('CREATE', 'CANCEL', 'CONFIRM', 'VERIFY', 'REMARK'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='预约状态和接待备注审计，与预约及通知同事务';
```

**recruit_notification**

```sql
CREATE TABLE recruit_notification (
  notification_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '访客站内通知ID',
  appointment_id BIGINT NOT NULL COMMENT '业务预约引用',
  recipient_identity_id BIGINT NOT NULL COMMENT '定向访客身份',
  title VARCHAR(128) NOT NULL COMMENT '不含隐私的提示标题',
  content VARCHAR(500) NOT NULL COMMENT '最小站内提示，不含核销码和手机号',
  is_read TINYINT NOT NULL DEFAULT 0 COMMENT '仅站内阅读状态，非外部送达',
  read_at DATETIME(3) NULL COMMENT 'UTC首次阅读时间',
  provider_status VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUESTED' COMMENT '外部消息状态，本示例未请求供应商发送',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC生成时间',
  PRIMARY KEY (notification_id),
  INDEX idx_recruit_notice_recipient (recipient_identity_id, notification_id)   COMMENT '本人通知倒序查询',
  INDEX idx_recruit_notice_appointment (appointment_id, notification_id)   COMMENT '预约通知审计',
  CONSTRAINT fk_recruit_notice_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_notice_identity FOREIGN KEY (recipient_identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_recruit_notice_read CHECK (is_read IN (0, 1)),
  CONSTRAINT ck_recruit_notice_provider CHECK (provider_status IN ('NOT_REQUESTED', 'PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生访客站内通知；未接真实微信发送不记录已发送';
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

**backend/src/main/java/com/doupi/planref/operations/RecruitOperationsService.java**

```java
package com.doupi.planref.operations;
import com.doupi.planref.*;
import com.doupi.planref.recruit.RecruitRepository;
import com.doupi.planref.recruit.RecruitService;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
@Service
public class RecruitOperationsService {
 private final Db db;private final Commands commands;private final Roots roots;private final RecruitRepository recruit;private final RecruitService booking;
 public RecruitOperationsService(Db db,Commands commands,Roots roots,RecruitRepository recruit,RecruitService booking){this.db=db;this.commands=commands;this.roots=roots;this.recruit=recruit;this.booking=booking;}
 private static long n(Map<String,Object>r,String k){return Inputs.number(r.get(k));}
 private Timestamp time(Map<String,Object>b,String k){try{return Timestamp.from(OffsetDateTime.parse(Inputs.text(b,k,20,40)).toInstant().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));}catch(DateTimeException ex){throw Problem.bad(k+"必须为含时区时间");}}
 private void campus(Actor a,String campus){if(a.allData())return;boolean allowed=db.list("SELECT dept_id FROM recruit_campus_scope WHERE campus_id=#{p.id}",P.of("id",campus)).stream().anyMatch(r->a.scopeDeptIds().contains(n(r,"dept_id")));if(!allowed)throw Problem.forbidden("超出校区工作范围");}
 private void state(long id,String state){db.write("UPDATE office_request SET status=#{p.status},closed_at=CASE WHEN #{p.status} IN('COMPLETED','CANCELLED') THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE request_id=#{p.id}",P.of("status",state,"id",id));}
 public Map<String,Object> shift(String key,Map<String,Object>b){Actors.current().require("recruit:shift:manage");return commands.create("RECRUIT_SHIFT_CREATE",key,b,201,()->roots.create("RECRUIT_SHIFT",key,b),c->{long teacher=Inputs.id(b,"teacherUserId"),capacity=Inputs.positive(b,"capacity");String campus=Inputs.text(b,"campusId",1,32);campus(c.actor(),campus);Timestamp start=time(b,"startsAt"),end=time(b,"endsAt");if(!end.after(start)||!start.toInstant().isAfter(Instant.now()))throw Problem.bad("排班必须是未来有效区间");db.required("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0' FOR UPDATE",P.of("id",teacher));if(n(db.required("SELECT COUNT(*) AS n FROM recruit_shift WHERE teacher_user_id=#{p.user} AND status='ACTIVE' AND starts_at<#{p.end} AND ends_at>#{p.start}",P.of("user",teacher,"start",start,"end",end)),"n")>0)throw Problem.conflict("接待人员排班时间冲突");long shift=db.insert("INSERT INTO recruit_shift(request_id,teacher_user_id,campus_id,starts_at,ends_at,capacity,assigned_count,status) VALUES(#{p.request},#{p.teacher},#{p.campus},#{p.start},#{p.end},#{p.capacity},0,'ACTIVE')",P.of("request",c.requestId(),"teacher",teacher,"campus",campus,"start",start,"end",end,"capacity",capacity));state(c.requestId(),"APPROVED");c.target("RECRUIT_SHIFT",shift);c.event("RECRUIT_SHIFT_CREATED",P.of("title","接待排班已安排","userId",teacher));return P.of("shiftId",shift);});}
 public Map<String,Object> assign(String key,Map<String,Object>b){Actors.current().require("recruit:shift:assign");return commands.create("RECRUIT_ASSIGNMENT_CREATE",key,b,201,()->roots.create("RECRUIT_ASSIGNMENT",key,b),c->{long app=Inputs.id(b,"appointmentId");Map<String,Object> appointment=recruit.appointment(app,true);recruit.staffScope(c.actor(),appointment);if(!db.one("SELECT assignment_id FROM recruit_assignment WHERE appointment_id=#{p.id}",P.of("id",app)).isEmpty())throw Problem.conflict("已有分派，请使用原分派事项改期");long shift=Inputs.id(b,"shiftId");Map<String,Object> s=db.required("SELECT * FROM recruit_shift WHERE shift_id=#{p.id} FOR UPDATE",P.of("id",shift));validate(appointment,s,b);long assignment=db.insert("INSERT INTO recruit_assignment(request_id,appointment_id,shift_id,assigned_by,assigned_at) VALUES(#{p.request},#{p.app},#{p.shift},#{p.actor},CURRENT_TIMESTAMP(3))",P.of("request",c.requestId(),"app",app,"shift",shift,"actor",c.actor().userId()));apply(appointment,s,b,c.actor());state(c.requestId(),"APPROVED");c.target("RECRUIT_ASSIGNMENT",assignment);c.event("RECRUIT_ASSIGNED",P.of("title","接待安排已更新","userId",s.get("teacher_user_id")));return P.of("assignmentId",assignment,"shiftId",shift);});}
 public Map<String,Object> reschedule(long id,String key,Map<String,Object>b){Actors.current().require("recruit:shift:assign");return commands.run(id,"RECRUIT_ASSIGNMENT_RESCHEDULE",key,b,200,c->{Map<String,Object> a=db.required("SELECT * FROM recruit_assignment WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));Map<String,Object> app=recruit.appointment(n(a,"appointment_id"),true);recruit.staffScope(c.actor(),app);long next=Inputs.id(b,"shiftId"),old=n(a,"shift_id");if(next==old)throw Problem.bad("改期必须选择不同班次");Map<Long,Map<String,Object>> locked=new TreeMap<>();for(long shift:new TreeSet<>(List.of(old,next)))locked.put(shift,db.required("SELECT * FROM recruit_shift WHERE shift_id=#{p.id} FOR UPDATE",P.of("id",shift)));Map<String,Object>s=locked.get(next);validate(app,s,b);String reason=Inputs.text(b,"reason",1,1000);if(db.write("UPDATE recruit_shift SET assigned_count=assigned_count-1 WHERE shift_id=#{p.id} AND assigned_count>0",P.of("id",old))!=1)throw Problem.conflict("旧班次容量投影异常");db.write("UPDATE recruit_assignment SET shift_id=#{p.shift},assigned_by=#{p.actor},assigned_at=CURRENT_TIMESTAMP(3) WHERE assignment_id=#{p.id}",P.of("shift",next,"actor",c.actor().userId(),"id",a.get("assignment_id")));apply(app,s,b,c.actor());c.audit(P.of("previousShiftId",old,"nextShiftId",next,"reason",reason));c.target("RECRUIT_ASSIGNMENT",n(a,"assignment_id"));c.event("RECRUIT_RESCHEDULED",P.of("title","接待改期已确认","recipientUserIds",List.of(locked.get(old).get("teacher_user_id"),s.get("teacher_user_id"))));return P.of("assignmentId",a.get("assignment_id"),"shiftId",next);});}
 private void validate(Map<String,Object>a,Map<String,Object>s,Map<String,Object>b){if(Inputs.nonNegative(b,"expectedAppointmentVersion")!=n(a,"version"))throw Problem.conflict("预约版本已变更，请重新核对改期安排");long active=n(db.required("SELECT COUNT(*) AS n FROM recruit_assignment x JOIN doupi_recruit_appointment a ON a.appointment_id=x.appointment_id WHERE x.shift_id=#{p.id} AND a.status IN('APPROVED','VERIFIED')",P.of("id",s.get("shift_id"))),"n");s.put("assigned_count",active);db.write("UPDATE recruit_shift SET assigned_count=#{p.n} WHERE shift_id=#{p.id}",P.of("n",active,"id",s.get("shift_id")));if(!"APPROVED".equals(a.get("status")))throw Problem.conflict("仅已确认待到校预约可分派或改期");if(!String.valueOf(s.get("campus_id")).equals(String.valueOf(a.get("campus_id"))))throw Problem.bad("班次和预约校区不一致");if(!"ACTIVE".equals(s.get("status"))||n(s,"assigned_count")>=n(s,"capacity"))throw Problem.conflict("班次不可用或已满");Timestamp start=time(b,"visitAt");Instant begin=instant(s.get("starts_at")),end=instant(s.get("ends_at"));if(start.toInstant().isBefore(begin)||!start.toInstant().isBefore(end)||!start.toInstant().isAfter(Instant.now()))throw Problem.bad("visitAt须位于未来班次区间内");}
 private Instant instant(Object value){if(value instanceof Timestamp t)return t.toInstant();if(value instanceof java.time.LocalDateTime t)return t.toInstant(ZoneOffset.UTC);throw new IllegalStateException("unsupported timestamp mapping");}
 private void apply(Map<String,Object>a,Map<String,Object>s,Map<String,Object>b,Actor actor){Timestamp at=time(b,"visitAt");String slot=Inputs.text(b,"timeSlot",1,64);LocalDate date=at.toInstant().atZone(ZoneId.of("Asia/Shanghai")).toLocalDate(),today=LocalDate.now(ZoneId.of("Asia/Shanghai"));Map<String,Object>rules=booking.rules();if(date.isBefore(today)||date.isAfter(today.plusDays(n(rules,"openDaysAhead"))))throw Problem.bad("改期超出公开预约日期范围");long quota=0;for(Map<String,Object>configured:Inputs.list(rules,"timeSlots"))if(slot.equals(configured.get("name")))quota=Inputs.positive(configured,"maxQuota");if(quota==0)throw Problem.bad("预约时段未开放");db.required("SELECT campus_id FROM doupi_recruit_campus WHERE campus_id=#{p.id} AND published=1 FOR UPDATE",P.of("id",s.get("campus_id")));if(n(db.required("SELECT COUNT(*) AS n FROM doupi_recruit_appointment WHERE campus_id=#{p.campus} AND visit_on=#{p.date} AND time_slot=#{p.slot} AND status IN('PENDING','APPROVED','VERIFIED') AND appointment_id<>#{p.id}",P.of("campus",s.get("campus_id"),"date",date.toString(),"slot",slot,"id",a.get("appointment_id"))),"n")>=quota)throw Problem.conflict("公开预约时段容量已满");db.write("UPDATE recruit_shift SET assigned_count=assigned_count+1 WHERE shift_id=#{p.id}",P.of("id",s.get("shift_id")));db.write("UPDATE doupi_recruit_appointment SET assigned_teacher_user_id=#{p.teacher},visit_on=#{p.date},visit_date=#{p.date},time_slot=#{p.slot},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("teacher",s.get("teacher_user_id"),"date",at.toInstant().atZone(ZoneId.of("Asia/Shanghai")).toLocalDate().toString(),"slot",slot,"id",a.get("appointment_id")));recruit.audit(n(a,"appointment_id"),actor,"SCHEDULE",String.valueOf(a.get("status")),String.valueOf(a.get("status")),Inputs.optionalText(b,"reason",1000));recruit.notifyVisitor(a,"访校安排已更新","请重新查看预约日期、时段及凭证。");}
 public Map<String,Object> followup(String key,Map<String,Object>b){Actors.current().require("recruit:followup:create");return commands.create("RECRUIT_FOLLOWUP_CREATE",key,b,201,()->roots.create("RECRUIT_FOLLOWUP",key,b),c->{long app=Inputs.id(b,"appointmentId"),who=Inputs.id(b,"assigneeUserId");Map<String,Object>a=recruit.appointment(app,true);recruit.staffScope(c.actor(),a);db.required("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",who));Timestamp due=time(b,"dueAt");if(!due.toInstant().isAfter(Instant.now()))throw Problem.bad("回访期限必须在未来");long follow=db.insert("INSERT INTO recruit_followup(request_id,appointment_id,assignee_user_id,due_at,status) VALUES(#{p.request},#{p.app},#{p.user},#{p.due},'OPEN')",P.of("request",c.requestId(),"app",app,"user",who,"due",due));db.write("UPDATE office_request SET handler_user_id=#{p.user} WHERE request_id=#{p.id}",P.of("user",who,"id",c.requestId()));state(c.requestId(),"PROCESSING");long task=c.task("RECRUIT_FOLLOWUP","FOLLOWUP",follow,who,null,null);db.write("UPDATE office_task SET due_at=#{p.due} WHERE task_id=#{p.id}",P.of("due",due,"id",task));c.target("FOLLOWUP",follow);c.event("RECRUIT_FOLLOWUP_CREATED",P.of("title","请按期完成招生回访","userId",who));return P.of("followupId",follow);});}
 public Map<String,Object> completeFollowup(long id,String key,Map<String,Object>b){Actors.current().require("recruit:followup:complete");return commands.run(id,"RECRUIT_FOLLOWUP_COMPLETE",key,b,200,c->{Map<String,Object>f=db.required("SELECT * FROM recruit_followup WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));if(!"OPEN".equals(f.get("status"))||n(f,"assignee_user_id")!=c.actor().userId())throw Problem.forbidden("不是本人待完成回访");String outcome=Inputs.text(b,"outcome",1,2000);Timestamp next=b.get("nextDueAt")==null?null:time(b,"nextDueAt");if(next!=null&&!next.toInstant().isAfter(Instant.now()))throw Problem.bad("下次回访时间须在未来");db.write("UPDATE recruit_followup SET status=#{p.status},outcome=#{p.outcome},completed_at=CASE WHEN #{p.status}='COMPLETED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END,next_due_at=#{p.next},due_at=COALESCE(#{p.next},due_at) WHERE followup_id=#{p.id}",P.of("status",next==null?"COMPLETED":"OPEN","outcome",outcome,"next",next,"id",f.get("followup_id")));if(next!=null)db.write("UPDATE office_task SET due_at=#{p.due},version=version+1,updated_at=CURRENT_TIMESTAMP(3) WHERE request_id=#{p.request} AND node_code='RECRUIT_FOLLOWUP' AND status IN('OPEN','CLAIMED')",P.of("due",next,"request",id));if(next==null){c.closeTasks("RECRUIT_FOLLOWUP","FOLLOWUP",n(f,"followup_id"));state(id,"COMPLETED");}c.audit(P.of("outcome",outcome,"nextDueAt",b.get("nextDueAt")));c.target("FOLLOWUP",n(f,"followup_id"));c.event("RECRUIT_FOLLOWUP_UPDATED",P.of("title","回访结果已登记"));return P.of("followupId",f.get("followup_id"),"continues",next!=null);});}
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



## 6. 边界与异常场景处理

400：非法时间区间、visitAt不在班次、校区不一致、时段未开放、nextDueAt过去；403：校区/预约超范围、他人回访；404：原预约/事项不可见；409：人员时间冲突、班次/公开时段满额、预约非APPROVED、已分派、版本变化、旧新班次相同。所有容量与原预约字段在同事务更新，失败两边都不变；改期不变更到校事实，VERIFIED不允许改期。短信和微信订阅尚无真实供应商适配，本模块不返回已送达。
