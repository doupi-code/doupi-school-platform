# WEB-02 访校预约、受控本人查询与取消

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#web-02)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，3个工作日。** 一名单人Java开发者结合AI负责Java、React页面、联调与自测；不假设独立前端或QA团队。保留React19、TypeScript6、Vite8、AntD6、Tailwind4、Router7和Zustand5既有工程，不为此次预约统一规则整体重建门户。App仍为P1。

覆盖访校表单、提交结果、预约号与查询凭证、本人状态与有效到校凭证、取消确认。访客以浏览器受控身份+高熵秘密共同核验本人，不以手机号或预约号单独查单。预约与小程序同库同规则，后台确认、更正、取消或核销实时反映。

文件路径与任务：

- [ ] `doupi-web-client-react/src/`预约表单、结果与本人查询页面：独立visitor会话、随机查询证明、状态说明、取消交互。
- [ ] `web/src/api.ts`：Web Crypto安全随机数、sessionStorage、本次命令重放、服务端错误处理；识别现有STAFF会话后重建VISITOR。
- [ ] `backend/src/main/java/com/doupi/planref/auth/AuthService.java`：生成WEB外部身份，只签VISITOR。
- [ ] `backend/src/main/java/com/doupi/planref/recruit/{RecruitController,RecruitService,RecruitRepository}.java`：共用创建/查询/取消；不建立Web预约独立表。
- [ ] `backend/src/main/java/com/doupi/planref/auth/ChannelRateLimitFilter.java`：Redis原子限流。
- [ ] 门户改用访客会话、预约号和高熵凭证查单，按预约号精确查找并验证本人凭证；切换时关闭旧 `GET /api/public/v1/bookings/query` 匿名手机号查单入口。用隔离数据回归合法手机号、部分号码、通配符和空白输入，均不得从旧入口取得预约、学生资料或核销码；新入口的错误凭证与非本人统一返回 404。

依赖：WEB-01正式内容/隐私和开放规则；MINI-04预约应用服务；公共JWT+Redis；HTTPS提供Web Crypto。短信真实接入不是P0强制依赖，凭证遗失由学校人工核实。

验收：手机号无法枚举他人预约；换会话/错误凭证统一404；Web visitor始终无员工权限；网络结果未明保留原key/body/proof重试；重复提交只一笔；取消后无有效凭证，已核销不能取消；Web和小程序状态同步。

## 2. 接口设计清单

接口统一`/api/v1`，响应`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识字符串。鉴权接口的受控访客JWT为Authorization:string必填，写命令Idempotency-Key:string(8..64)必填。Web访客会话独立签发，不能继承后台员工JWT；客户端身份和手机号不授权。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 提交访校预约 | POST | `/api/v1/public/appointments` | Authorization:string／是／原受控identity会话；Idempotency-Key:string(8..64)／是；parentName:string(1..64)／是／联系人；parentPhone:string(11..16)／是／加号可选、11..15位数字；studentName:string(1..64)／是；studentGrade:string(1..64)／是；campusId:string(1..32)／是／公开校区ID；visitDate:string YYYY-MM-DD／是／上海日历日期；timeSlot:string(1..64)／是／开放时段名；querySecret:base64url string(43..128)／是／至少32字节密码学随机凭证；remark:string(0..500)／否／咨询需求 | HTTP201；appointmentId:string（预约ID）；appointmentNo:string（预约编号）；status:string（PENDING待确认/APPROVED已确认/CANCELLED已取消/VERIFIED已到校）；studentName/studentGrade:string（学生姓名/意向年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（访校时段）；parentPhoneMasked:string（脱敏联系电话）；assignedTeacherName:string或null（已分配接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；version:int>=0（并发版本）；checkInCode:string或null（仅本人APPROVED时的有效到校凭证） | 已认证外部identity；来源按provider由服务端写WECHAT_MINI或PUBLIC_WEB |
| 本人预约列表 | GET | `/api/v1/visitor/appointments` | Authorization:string／是；无body | items:object[]（最近100笔本人预约，每项appointmentId:string预约ID、appointmentNo:string编号、status:string当前状态、campusName:string校区名、visitDate:string YYYY-MM-DD日期、timeSlot:string时段、version:int并发版本） | identity本人 |
| 本人预约详情 | GET | `/api/v1/visitor/appointments/{id}` | Authorization:string／是；id:long>0路径／是 | appointmentId:string（预约ID）；appointmentNo:string（预约编号）；status:string（PENDING待确认/APPROVED已确认/CANCELLED已取消/VERIFIED已到校）；studentName/studentGrade:string（学生姓名/意向年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（访校时段）；parentPhoneMasked:string（脱敏联系电话）；assignedTeacherName:string或null（已分配接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；version:int>=0（并发版本）；checkInCode:string或null（仅本人APPROVED时的有效到校凭证） | 原identity本人；员工若同时为该家长也仅查自己 |
| 凭证查询本人预约 | POST | `/api/v1/public/appointments/query` | Authorization:string／是；appointmentNo:string(1..32)／是；querySecret:base64url string(43..128)／是 | appointmentId:string（预约ID）；appointmentNo:string（预约编号）；status:string（PENDING待确认/APPROVED已确认/CANCELLED已取消/VERIFIED已到校）；studentName/studentGrade:string（学生姓名/意向年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（访校时段）；parentPhoneMasked:string（脱敏联系电话）；assignedTeacherName:string或null（已分配接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；version:int>=0（并发版本）；checkInCode:string或null（仅本人APPROVED时的有效到校凭证） | 原identity+预约号+秘密凭证共同核验；仅手机号无效 |
| 取消本人预约 | POST | `/api/v1/public/appointments/{id}/cancel` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；id:long>0路径／是；appointmentNo、querySecret同查询／是；expectedVersion:int>=0／是；reason:string(1..500)／是 | HTTP200；appointmentId:string（预约ID）；appointmentNo:string（预约编号）；status:string（PENDING待确认/APPROVED已确认/CANCELLED已取消/VERIFIED已到校）；studentName/studentGrade:string（学生姓名/意向年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（访校时段）；parentPhoneMasked:string（脱敏联系电话）；assignedTeacherName:string或null（已分配接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；version:int>=0（并发版本）；checkInCode:string或null（仅本人APPROVED时的有效到校凭证）；最终status=CANCELLED、checkInCode=null | 原identity本人+证明；PENDING/APPROVED可取消 |
| 建立Web受控访客会话 | POST | `/api/v1/auth/visitor` | 无body；不接受或继承客户端员工身份 | HTTP201；token:string（独立访客会话）；kind:string=VISITOR（访客）；userId:string=0（无员工身份）；identityId:string（服务端生成WEB外部身份ID） | 匿名受限入口；即使原请求带员工会话也只签访客 |



## 3. 数据流转细节

| 接口 | 请求／认证来源 → 数据库明确字段 → 返回 | 事务、缓存与一致性 |
|---|---|---| 
| 创建 | parent/student字段→appointment.parent_name/parent_phone/student_name/student_grade；campusId→campus_id/campus_name快照；visitDate→visit_date/visit_on；timeSlot→time_slot；querySecret SHA256→public_access_token_hash；认证→visitor_identity_id/openid/source_channel/create_actor_key；key/hash→create_key/payload_hash；remark→remark；服务端生成appointment_no/status/check_in_code/version/create_time→返回预约视图 | 固定APPOINTMENT_CREATE，IDENTITY作用域，channel_idempotency先占键；锁published校区行再统计同campus/visit_on/time_slot有效预约，检查配额；预约、CREATE轨迹、站内通知、HTTP201归档同事务。任何失败全回滚，缓存不分配名额 |
| 本人列表 | actor.identityId→appointment.visitor_identity_id WHERE条件；读取appointment_id/no/status/campus_name/visit_date/time_slot/version→items，ID转字符串 | DB按归属过滤后ORDER/LIMIT；不按手机号或客户端openid查单，不返未脱敏联系信息 |
| 本人详情 | 路径id→appointment_id；actor.identityId=visitor_identity_id→view；仅APPROVED返回check_in_code | 查不到和非本人均404；无缓存，后台更正立即可见 |
| 证明查询 | appointmentNo→appointment_no；当前identity对visitor_identity_id；querySecret恒时比对public_access_token_hash→view | 只读；证明永不进URL、日志或响应；Redis限制查询错误尝试，未匹配返回相同404 |
| 取消 | 路径id进入规范payload.appointmentId；proof/identity同查询；expectedVersion对version；reason→audit_remark；status=CANCELLED/check_in_code=NULL/version+1/update_time；CANCEL轨迹previous_status/next_status/actor字段与通知→最终视图 | 固定APPOINTMENT_CANCEL，IDENTITY+key；先幂等再锁预约检查版本；已取消可返回当前最终态；VERIFIED拒绝。与核销共用根行锁，失败不留通知；取消不影响库存或办公事项 |
| 受控Web会话 | 服务端随机subject→sys_external_identity.provider=WEB/app_id=PUBLIC_WEB/subject_id唯一/link_status=VISITOR/user_id=NULL；新identity→只含本人主体的JWT和Redis TTL→kind=VISITOR | DB建立身份后签发；不读取请求中员工角色；Web已有STAFF会话须重新申请独立访客会话。访客入口限流10次/分钟/IP，Redis不可用503 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

**doupi_recruit_campus**

```sql
CREATE TABLE `doupi_recruit_campus` (
  `campus_id` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区ID',
  `campus_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区名称',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '华襄校园介绍' COMMENT '展示标题',
  `summary` TEXT COLLATE utf8mb4_unicode_ci COMMENT '简介概览',
  `intro` TEXT COLLATE utf8mb4_unicode_ci COMMENT '详细图文/介绍',
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '校区地址',
  `latitude` DECIMAL(10, 6) DEFAULT '30.550000' COMMENT '纬度',
  `longitude` DECIMAL(10, 6) DEFAULT '114.280000' COMMENT '经度',
  `contact_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT '027-88888888' COMMENT '联系电话',
  `nature` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '全日制寄宿' COMMENT '办学性质',
  `section` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '小初高一贯制' COMMENT '开设学段',
  `cover_image` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published` TINYINT(1) DEFAULT '1' COMMENT '是否发布(1-是 0-否)',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`campus_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='校区信息表';
```

**doupi_recruit_config**

```sql
CREATE TABLE `doupi_recruit_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值(JSON或字符串)',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '说明',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生与系统配置表';
```

**sys_external_identity**

```sql
CREATE TABLE `sys_external_identity` (
  `identity_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '外部渠道身份',
  `provider` VARCHAR(16) NOT NULL COMMENT '如WECHAT，受控渠道类型',
  `app_id` VARCHAR(64) NOT NULL COMMENT '渠道应用标识，避免跨小程序subject冲突',
  `subject_id` VARCHAR(128) NOT NULL COMMENT '经渠道服务端认证的主体，非任意客户端字符串',
  `user_id` BIGINT NULL COMMENT '已核实绑定的学校员工，访客保持NULL',
  `link_status` VARCHAR(16) NOT NULL COMMENT 'VISITOR/PENDING/VERIFIED/REVOKED',
  `verified_by` BIGINT NULL COMMENT '学校核实操作人',
  `verified_at` DATETIME(3) NULL COMMENT '核实时间',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`identity_id`),
  UNIQUE `uk_external_subject` (
    `provider`,
    `app_id`,
    `subject_id`
  ),
  INDEX `idx_external_user` (`user_id`, `link_status`),
  CONSTRAINT `fk_ref_087` FOREIGN KEY (`verified_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_099` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_external_identity';
```

**sys_user**

```sql
CREATE TABLE `sys_user` (
  `user_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `dept_id` BIGINT DEFAULT NULL COMMENT '部门ID',
  `user_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户账号',
  `nick_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户昵称',
  `user_type` VARCHAR(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '00' COMMENT '用户类型（00系统用户）',
  `email` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户邮箱',
  `phonenumber` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '手机号码',
  `sex` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '用户性别（0男 1女 2未知）',
  `avatar` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '头像地址',
  `password` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '密码',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `login_ip` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '最后登录IP',
  `login_date` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `pwd_update_date` DATETIME DEFAULT NULL COMMENT '密码最后更新时间',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `grade` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教年级',
  `subject` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教科目',
  `class_ids` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教班级ID集合，逗号分隔',
  PRIMARY KEY (`user_id`),
  `auth_version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，停用/角色变更使旧会话失效',
  UNIQUE `uk_user_name` (
    `user_name`
  ),
  INDEX `idx_user_dept_status` (`dept_id`, `status`, `del_flag`),
  CONSTRAINT `fk_ref_000` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户信息表';
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

## 5. 代码实现骨架

参考Web为独立React19／TypeScript6／Vite8可运行项目：安装自身package.json依赖，配置后端环境，运行`npm run dev`，Vite将`/api/v1`代理到18080。部署由Nginx保留此前缀。Java层为Java17、Boot4.0.3、MyBatis4.0.1，依赖公共Db/Inputs/Json/Actors等契约。参考表单使用原生控件便于独立验证，正式页面沿用AntD/Tailwind与已有视觉。



**backend/src/main/java/com/doupi/planref/auth/AuthController.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) {this.service=service;}
    @PostMapping("/auth/login") public ResponseEntity<Map<String,Object>> login(@RequestBody Map<String,Object> body) {return ApiReply.of(service.password(body),200);}
    @PostMapping("/auth/visitor") public ResponseEntity<Map<String,Object>> visitor() {return ApiReply.of(service.visitor(),201);}
    @PostMapping("/auth/wechat") public ResponseEntity<Map<String,Object>> wechat(@RequestBody Map<String,Object> body) {return ApiReply.of(service.wechat(body),200);}
    @GetMapping("/auth/me") public ResponseEntity<Map<String,Object>> me() {return ApiReply.of(service.me(),200);}
    @PostMapping("/auth/logout") public ResponseEntity<Map<String,Object>> logout(@RequestHeader("Authorization") String token) {return ApiReply.of(service.logout(token),200);}
    @PostMapping("/auth/employee-bindings") public ResponseEntity<Map<String,Object>> binding(@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.applyBinding(body,key),201);}
    @PostMapping("/staff/employee-bindings/{id}/review") public ResponseEntity<Map<String,Object>> approve(@PathVariable long id,@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.approveBinding(id,body,key),200);}
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthService.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final Db db; private final AuthRepository repo; private final SessionTokens sessions; private final ExternalCommands commands;
    private final String appId,secret;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public AuthService(Db db,AuthRepository repo,SessionTokens sessions,ExternalCommands commands,
        @Value("${plan.wechat.app-id:}") String appId,@Value("${plan.wechat.secret:}") String secret) {
        this.db=db;this.repo=repo;this.sessions=sessions;this.commands=commands;this.appId=appId;this.secret=secret;
    }
    public Map<String,Object> password(Map<String,Object> b) {
        String name=Inputs.text(b,"username",1,30),password=Inputs.text(b,"password",8,128);
        Map<String,Object> u=repo.username(name);
        boolean matches=false;
        if(!u.isEmpty()) try { matches=new BCryptPasswordEncoder().matches(password,String.valueOf(u.get("password"))); } catch(IllegalArgumentException ignored) { matches=false; }
        if(!matches) throw new Problem(401,"LOGIN_FAILED","Invalid account or password");
        return issued(repo.staff(Inputs.number(u.get("user_id")),0));
    }
    @Transactional
    public Map<String,Object> visitor() {
        long id=repo.external("WEB","PUBLIC_WEB",UUID.randomUUID().toString());
        return issued(visitorActor(id));
    }
    @Transactional
    public Map<String,Object> wechat(Map<String,Object> b) {
        String code=Inputs.text(b,"code",1,128);
        if(appId.isBlank()||secret.isBlank()) throw new Problem(503,"WX_NOT_CONFIGURED","WeChat identity exchange is not configured");
        Map<String,Object> wx;
        try {
            String url="https://api.weixin.qq.com/sns/jscode2session?appid="+enc(appId)+"&secret="+enc(secret)+"&js_code="+enc(code)+"&grant_type=authorization_code";
            HttpRequest req=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());
            if(res.statusCode()!=200) throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable");
            wx=Json.readMap(res.body());
        } catch(InterruptedException ex) { Thread.currentThread().interrupt();throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange interrupted"); }
          catch(java.io.IOException ex) { throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable"); }
          catch(Problem ex) { if(ex.http()==503) throw ex;throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data"); }
        if(wx.get("errcode")!=null) {
            long error;try {error=Inputs.number(wx.get("errcode"));}catch(Problem ex){throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data");}
            if(error!=0) throw new Problem(401,"WX_CODE_REJECTED","WeChat login code is invalid or expired");
        }
        String openid=wx.get("openid")==null?"":wx.get("openid").toString();
        if(openid.isBlank()||openid.length()>128) throw new Problem(503,"WX_INVALID_RESPONSE","WeChat identity was not returned");
        long id=repo.external("WECHAT",appId,openid); Map<String,Object> identity=repo.identity(id,false);
        Actor actor="VERIFIED".equals(identity.get("link_status")) && identity.get("user_id")!=null
            ?repo.staff(Inputs.number(identity.get("user_id")),id):visitorActor(id);
        return issued(actor);
    }
    private static String enc(String s) {return URLEncoder.encode(s,StandardCharsets.UTF_8);}
    private Actor visitorActor(long id) {return new Actor(0,0,id,"VISITOR",Set.of(),Set.of(),false);}
    private Map<String,Object> issued(Actor a) { return P.of("token",sessions.issue(a),"kind",a.kind(),"userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId())); }
    public Map<String,Object> me() {
        Actor a=Actors.current();
        Map<String,Object> identity=a.identityId()>0?repo.identity(a.identityId(),false):Map.of();
        return P.of("userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId()),"deptId",Long.toString(a.deptId()),"kind",a.kind(),"permissions",a.permissions(),"scopeDeptIds",a.scopeDeptIds().stream().map(String::valueOf).toList(),"bindingStatus",identity.get("link_status"));
    }
    public Map<String,Object> logout(String token) {
        sessions.revoke(token.startsWith("Bearer ")?token.substring(7):token);
        return P.of("revoked",true);
    }
    public Map<String,Object> applyBinding(Map<String,Object> b,String key) {
        Actor a=Actors.current(); if(a.identityId()<=0) throw Problem.forbidden("External identity required");
        String username=Inputs.text(b,"username",1,30),reason=Inputs.text(b,"reason",5,300);
        return commands.run("IDENTITY:"+a.identityId(),"BINDING_APPLY",key,b,201,()->{
            Map<String,Object> identity=repo.identity(a.identityId(),true);
            if(!"WECHAT".equals(identity.get("provider"))) throw Problem.forbidden("WeChat identity required");
            if("VERIFIED".equals(identity.get("link_status"))) throw Problem.conflict("Identity already verified");
            Map<String,Object> u=repo.username(username); if(u.isEmpty()) throw Problem.notFound("School account not found");
            long staffId=Inputs.number(u.get("user_id"));repo.staff(staffId,0);
            if(!db.one("SELECT binding_request_id FROM auth_binding_request WHERE identity_id=#{p.id} AND status='PENDING'",P.of("id",a.identityId())).isEmpty()) throw Problem.conflict("A binding request is already pending");
            long id=db.insert("INSERT INTO auth_binding_request(identity_id,staff_user_id,status,reason,version,created_at) "
                + "VALUES(#{p.identity},#{p.user},'PENDING',#{p.reason},0,CURRENT_TIMESTAMP(3))",P.of("identity",a.identityId(),"user",staffId,"reason",reason));
            db.write("UPDATE sys_external_identity SET link_status='PENDING' WHERE identity_id=#{p.id}",P.of("id",a.identityId()));
            return P.of("bindingRequestId",Long.toString(id),"status","PENDING","version",0);
        });
    }
    public Map<String,Object> approveBinding(long id,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();a.require("identity:binding:approve");
        return commands.run("STAFF:"+a.userId(),"BINDING_APPROVE",key,P.of("bindingRequestId",id,"body",b),200,()->{
            Map<String,Object> row=db.required("SELECT * FROM auth_binding_request WHERE binding_request_id=#{p.id} FOR UPDATE",P.of("id",id));
            long version=Inputs.nonNegative(b,"expectedVersion"),target=Inputs.number(row.get("staff_user_id"));
            if(version!=Inputs.number(row.get("version"))) throw Problem.conflict("Binding version changed");
            if(!"PENDING".equals(row.get("status"))) throw Problem.conflict("Binding is no longer pending");
            if(a.userId()==target) throw Problem.forbidden("Binding must be verified by a different school officer");
            Actor targetActor=repo.staff(target,0);
            if(!a.allData()&&!a.scopeDeptIds().contains(targetActor.deptId())) throw Problem.forbidden("Account outside binding approval scope");
            String decision=Inputs.text(b,"decision",6,8),remark=Inputs.text(b,"remark",1,300);
            if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid binding decision");
            long identity=Inputs.number(row.get("identity_id"));Map<String,Object> external=repo.identity(identity,true);
            if(!"PENDING".equals(external.get("link_status"))) throw Problem.conflict("External identity binding state changed");
            String status=decision.equals("APPROVE")?"VERIFIED":"REJECTED";
            db.write("UPDATE auth_binding_request SET status=#{p.status},reviewed_by=#{p.by},review_remark=#{p.remark},reviewed_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE binding_request_id=#{p.id}",P.of("status",status,"by",a.userId(),"remark",remark,"id",id));
            db.write("UPDATE sys_external_identity SET user_id=#{p.user},link_status=#{p.status},verified_by=#{p.by},verified_at=CURRENT_TIMESTAMP(3) WHERE identity_id=#{p.id}",P.of("user",decision.equals("APPROVE")?target:null,"status",decision.equals("APPROVE")?"VERIFIED":"VISITOR","by",a.userId(),"id",identity));
            return P.of("bindingRequestId",Long.toString(id),"status",status,"version",version+1,"loginAgainRequired",true);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthRepository.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
    private final Db db;
    public AuthRepository(Db db) { this.db=db; }
    public Map<String,Object> username(String name) {
        return db.one("SELECT user_id,dept_id,password,status,del_flag FROM sys_user WHERE user_name=#{p.name}",P.of("name",name));
    }
    public Map<String,Object> identity(long id, boolean lock) {
        return db.required("SELECT * FROM sys_external_identity WHERE identity_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));
    }
    public long external(String provider,String appId,String subject) {
        Map<String,Object> p=P.of("provider",provider,"app",appId,"subject",subject);
        db.write("INSERT INTO sys_external_identity(provider,app_id,subject_id,link_status,created_at) "
            + "VALUES(#{p.provider},#{p.app},#{p.subject},'VISITOR',CURRENT_TIMESTAMP(3)) "
            + "ON DUPLICATE KEY UPDATE identity_id=identity_id",p);
        return Inputs.number(db.required("SELECT identity_id FROM sys_external_identity WHERE provider=#{p.provider} "
            + "AND app_id=#{p.app} AND subject_id=#{p.subject}",p).get("identity_id"));
    }
    public Actor staff(long userId,long identityId) {
        Map<String,Object> u=db.required("SELECT user_id,dept_id,status,del_flag FROM sys_user WHERE user_id=#{p.id}",P.of("id",userId));
        if (!"0".equals(String.valueOf(u.get("status"))) || !"0".equals(String.valueOf(u.get("del_flag"))))
            throw new Problem(401,"ACCOUNT_DISABLED","Account is disabled");
        long dept=u.get("dept_id")==null?0:Inputs.number(u.get("dept_id"));
        List<Map<String,Object>> roles=db.list("SELECT r.role_id,r.data_scope FROM sys_role r JOIN sys_user_role ur ON ur.role_id=r.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0'",P.of("id",userId));
        Set<String> permissions=new HashSet<>();
        for (Map<String,Object> m:db.list("SELECT DISTINCT m.perms FROM sys_menu m JOIN sys_role_menu rm ON rm.menu_id=m.menu_id "
            + "JOIN sys_user_role ur ON ur.role_id=rm.role_id JOIN sys_role r ON r.role_id=ur.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0' AND m.status='0'",P.of("id",userId))) {
            if(m.get("perms")!=null && !m.get("perms").toString().isBlank()) permissions.add(m.get("perms").toString());
        }
        Set<Long> scopes=new HashSet<>(); boolean all=false;
        for(Map<String,Object> r:roles) {
            String scope=String.valueOf(r.get("data_scope"));
            if("1".equals(scope)) all=true;
            if("2".equals(scope)) for(Map<String,Object> d:db.list("SELECT dept_id FROM sys_role_dept WHERE role_id=#{p.id}",P.of("id",r.get("role_id")))) scopes.add(Inputs.number(d.get("dept_id")));
            if("3".equals(scope)&&dept>0) scopes.add(dept);
            if("4".equals(scope)&&dept>0) {
                Set<Long> branch=new HashSet<>();branch.add(dept);
                List<Map<String,Object>> depts=db.list("SELECT dept_id,parent_id FROM sys_dept WHERE status='0' AND del_flag='0'",Map.of());
                boolean changed=true;
                while(changed) { changed=false; for(Map<String,Object> d:depts) if(d.get("parent_id")!=null && branch.contains(Inputs.number(d.get("parent_id")))) changed |= branch.add(Inputs.number(d.get("dept_id"))); }
                scopes.addAll(branch);
            }
        }
        return new Actor(userId,dept,identityId,"STAFF",Set.copyOf(permissions),Set.copyOf(scopes),all);
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/ExternalCommands.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Transactional idempotency for channel operations without an office_request root. */
@Component
public class ExternalCommands {
    private final Db db;
    private final TransactionTemplate tx;
    public ExternalCommands(Db db, PlatformTransactionManager manager) {
        this.db = db;
        this.tx = new TransactionTemplate(manager);
    }
    public Map<String,Object> run(String scope, String action, String key, Map<String,Object> payload,
                                  int status, Supplier<Map<String,Object>> work) {
        if (key == null || !key.matches("[A-Za-z0-9_.:-]{8,64}")) throw Problem.bad("Invalid Idempotency-Key");
        String hash = Json.hash(payload);
        Map<String,Object> p = P.of("scope",scope,"action",action,"key",key,"hash",hash);
        return tx.execute(ignored -> {
            db.write("INSERT INTO channel_idempotency(scope_key,action_code,idempotency_key,payload_hash,created_at) "
                + "VALUES(#{p.scope},#{p.action},#{p.key},#{p.hash},CURRENT_TIMESTAMP(3)) "
                + "ON DUPLICATE KEY UPDATE command_id=command_id",p);
            Map<String,Object> row = db.required("SELECT * FROM channel_idempotency WHERE scope_key=#{p.scope} "
                + "AND action_code=#{p.action} AND idempotency_key=#{p.key} FOR UPDATE",p);
            if (!hash.equals(row.get("payload_hash"))) throw Problem.conflict("Same key has a different payload");
            Object saved = row.get("result_json");
            if (saved != null) {
                Map<String,Object> replay = new LinkedHashMap<>(Json.readMap(saved));
                replay.put("_replayed",true);
                replay.put("_httpStatus",Inputs.number(row.get("http_status")));
                return replay;
            }
            Map<String,Object> out = new LinkedHashMap<>(work.get());
            db.write("UPDATE channel_idempotency SET result_json=#{p.result},http_status=#{p.status} "
                + "WHERE command_id=#{p.id}",P.of("result",Json.write(out),"status",status,"id",row.get("command_id")));
            out.put("_httpStatus",status);
            return out;
        });
    }
    public static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    public static boolean matches(String value, String expectedHash) {
        return expectedHash != null && MessageDigest.isEqual(sha256(value).getBytes(StandardCharsets.US_ASCII),
            expectedHash.getBytes(StandardCharsets.US_ASCII));
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/ChannelRateLimitFilter.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Shared Redis fixed-window limits for public identity and proof endpoints. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE+10)
public class ChannelRateLimitFilter extends OncePerRequestFilter {
 private final StringRedisTemplate redis;
 private final DefaultRedisScript<Long> script=new DefaultRedisScript<>("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",Long.class);
 public ChannelRateLimitFilter(StringRedisTemplate redis){this.redis=redis;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
  String path=req.getRequestURI();int limit=0;
  if("POST".equals(req.getMethod())) {
   if(Set.of("/api/v1/auth/login","/api/v1/auth/wechat").contains(path)) limit=20;
   else if("/api/v1/auth/visitor".equals(path)) limit=10;
   else if("/api/v1/public/appointments".equals(path)) limit=5;
   else if("/api/v1/public/appointments/query".equals(path)||path.matches("/api/v1/public/appointments/[0-9]+/cancel")) {limit=10;path="/api/v1/public/appointments/proof";}
  }
  if(limit==0){chain.doFilter(req,res);return;}
  try {
   String key="plan:channel-limit:"+ExternalCommands.sha256(req.getRemoteAddr()+":"+path)+":"+(System.currentTimeMillis()/60000);
   Long count=redis.execute(script,List.of(key),"65");
   if(count==null) {failure(res,503,"RATE_LIMIT_UNAVAILABLE","访问校验暂不可用");return;}
   if(count>limit){res.setHeader("Retry-After","60");failure(res,429,"RATE_LIMITED","操作过于频繁，请稍后重试");return;}
  } catch(RedisConnectionFailureException e){failure(res,503,"RATE_LIMIT_UNAVAILABLE","访问校验暂不可用");return;}
  chain.doFilter(req,res);
 }
 private void failure(HttpServletResponse res,int status,String code,String message)throws IOException {
  String trace=UUID.randomUUID().toString();res.setHeader("X-Trace-Id",trace);res.setStatus(status);res.setContentType("application/json;charset=UTF-8");
  res.getWriter().write(Json.write(P.of("code",status,"errorCode",code,"msg",message,"traceId",trace,"replayed",false,"data",Map.of())));
 }
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitController.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class RecruitController {
    private final RecruitService service;
    public RecruitController(RecruitService service) {this.service=service;}
    @GetMapping("/public/appointment-rules") public ResponseEntity<Map<String,Object>> rules(){return ApiReply.of(service.rules(),200);}
    @PostMapping("/public/appointments") public ResponseEntity<Map<String,Object>> create(@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.create(b,key),201);}
    @PostMapping("/public/appointments/query") public ResponseEntity<Map<String,Object>> query(@RequestBody Map<String,Object> b){return ApiReply.of(service.query(b),200);}
    @GetMapping("/visitor/appointments") public ResponseEntity<Map<String,Object>> mine(){return ApiReply.of(service.mine(),200);}
    @GetMapping("/visitor/appointments/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.mineDetail(id),200);}
    @GetMapping("/staff/appointments/{id}") public ResponseEntity<Map<String,Object>> staffDetail(@PathVariable long id){return ApiReply.of(service.staffDetail(id),200);}
    @PostMapping("/public/appointments/{id}/cancel") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.cancel(id,b,key),200);}
    @GetMapping("/staff/appointments") public ResponseEntity<Map<String,Object>> staff(){return ApiReply.of(service.staffList(),200);}
    @PostMapping("/staff/appointments/{id}/{action:confirm|verify|remark}") public ResponseEntity<Map<String,Object>> action(@PathVariable long id,@PathVariable String action,@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.staffAction(id,action,b,key),200);}
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitService.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import com.doupi.planref.auth.*;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RecruitService {
    private final Db db;private final RecruitRepository repo;private final ExternalCommands commands;private final AuthRepository auth;
    public RecruitService(Db db,RecruitRepository repo,ExternalCommands commands,AuthRepository auth) {this.db=db;this.repo=repo;this.commands=commands;this.auth=auth;}
    public Map<String,Object> rules() {
        Map<String,Object> basic=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='basic_config'",Map.of());
        Map<String,Object> slots=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='time_slots'",Map.of());
        if(basic.isEmpty()||slots.isEmpty()) throw new Problem(503,"BOOKING_RULES_NOT_CONFIGURED","School booking rules are not configured");
        try {
            Map<String,Object> b=Json.readMap(basic.get("config_value").toString());
            long days=Inputs.positive(b,"openDaysAhead");
            if(days>60||!b.containsKey("needAudit")) throw Problem.bad("Invalid booking rules");
            List<Map<String,Object>> list=Inputs.list(Json.readMap("{\"slots\":"+slots.get("config_value")+"}"),"slots");
            if(list.isEmpty()) throw Problem.bad("No available booking slots");
            Set<String> names=new HashSet<>();
            for(Map<String,Object> s:list) {String name=Inputs.text(s,"name",1,64);if(!names.add(name)) throw Problem.bad("Duplicate slot");Inputs.positive(s,"maxQuota");}
            return P.of("openDaysAhead",days,"needAudit",Inputs.bool(b,"needAudit",true),"timeSlots",list);
        } catch(RuntimeException ex) {throw new Problem(503,"BOOKING_RULES_INVALID","School booking rules require correction");}
    }
    public Map<String,Object> create(Map<String,Object> b,String key) {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Controlled visitor session required");
        String student=Inputs.text(b,"studentName",1,64),parent=Inputs.text(b,"parentName",1,64),phone=Inputs.text(b,"parentPhone",11,16);
        if(!phone.matches("\\+?[0-9]{11,15}")) throw Problem.bad("Invalid contact phone");
        String campus=Inputs.text(b,"campusId",1,32),grade=Inputs.text(b,"studentGrade",1,64),slot=Inputs.text(b,"timeSlot",1,64),date=Inputs.text(b,"visitDate",10,10);
        String proof=proof(b),remark=Inputs.optionalText(b,"remark",500); LocalDate visit;
        try {visit=LocalDate.parse(date);} catch(DateTimeParseException ex) {throw Problem.bad("Invalid visit date");}
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        return commands.run("IDENTITY:"+a.identityId(),"APPOINTMENT_CREATE",key,b,201,()->{
            Map<String,Object> r=rules();
            if(visit.isBefore(today)||visit.isAfter(today.plusDays(Inputs.number(r.get("openDaysAhead"))))) throw Problem.bad("Date outside booking window");
            long quota=0;
            for(Map<String,Object> s:Inputs.list(r,"timeSlots")) if(slot.equals(s.get("name"))) quota=Inputs.positive(s,"maxQuota");
            if(quota==0) throw Problem.bad("Slot is not open");
            Map<String,Object> c=db.required("SELECT campus_id,campus_name FROM doupi_recruit_campus WHERE campus_id=#{p.campus} AND published=1 FOR UPDATE",P.of("campus",campus));
            Map<String,Object> count=db.required("SELECT COUNT(*) AS used_count FROM doupi_recruit_appointment WHERE campus_id=#{p.campus} AND visit_on=#{p.date} AND time_slot=#{p.slot} AND status IN ('PENDING','APPROVED','VERIFIED')",P.of("campus",campus,"date",date,"slot",slot));
            if(Inputs.number(count.get("used_count"))>=quota) throw Problem.conflict("Booking slot is full");
            Map<String,Object> identity=auth.identity(a.identityId(),false);
            String status=Inputs.bool(r,"needAudit",true)?"PENDING":"APPROVED";
            String no="A"+UUID.randomUUID().toString().replace("-","").substring(0,28);
            String code="APPROVED".equals(status)?UUID.randomUUID().toString().replace("-",""):null;
            Map<String,Object> p=P.of("no",no,"identity",a.identityId(),"hash",ExternalCommands.sha256(proof),"openid","WECHAT".equals(identity.get("provider"))?identity.get("subject_id"):null,
                "status",status,"parent",parent,"phone",phone,"student",student,"grade",grade,"campus",campus,"campusName",c.get("campus_name"),"date",date,"slot",slot,"code",code,
                "channel","WECHAT".equals(identity.get("provider"))?"WECHAT_MINI":"PUBLIC_WEB","key",key,"actor","IDENTITY:"+a.identityId(),"payloadHash",Json.hash(b),"remark",remark);
            long id=db.insert("INSERT INTO doupi_recruit_appointment(appointment_no,visitor_identity_id,public_access_token_hash,openid,status,parent_name,parent_phone,student_name,student_grade,campus_id,campus_name,visit_date,visit_on,time_slot,check_in_code,source_channel,create_key,create_actor_key,payload_hash,remark,version,create_time) "
                + "VALUES(#{p.no},#{p.identity},#{p.hash},#{p.openid},#{p.status},#{p.parent},#{p.phone},#{p.student},#{p.grade},#{p.campus},#{p.campusName},#{p.date},#{p.date},#{p.slot},#{p.code},#{p.channel},#{p.key},#{p.actor},#{p.payloadHash},#{p.remark},0,CURRENT_TIMESTAMP(3))",p);
            repo.audit(id,a,"CREATE",null,status,"Visitor created appointment");
            Map<String,Object> row=repo.appointment(id,false);repo.notifyVisitor(row,"预约已登记","请在本人预约中查询确认状态，未确认前不承诺接待。");
            return repo.view(row,false);
        });
    }
    private String proof(Map<String,Object> b) {
        String s=Inputs.text(b,"querySecret",43,128);
        if(!s.matches("[A-Za-z0-9_-]{43,128}")) throw Problem.bad("Query proof must be cryptographically generated base64url");
        return s;
    }
    private void owner(Map<String,Object> row,Map<String,Object> b) {
        Actor actor=Actors.current();
        if(actor.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=actor.identityId()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        String no=Inputs.text(b,"appointmentNo",1,32),secret=proof(b);
        if(!no.equals(row.get("appointment_no"))||!ExternalCommands.matches(secret,String.valueOf(row.get("public_access_token_hash"))))
            throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
    }
    public Map<String,Object> query(Map<String,Object> b) {
        String no=Inputs.text(b,"appointmentNo",1,32);proof(b);
        Map<String,Object> row=db.one("SELECT * FROM doupi_recruit_appointment WHERE appointment_no=#{p.no}",P.of("no",no));
        if(row.isEmpty()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        owner(row,b);return repo.view(row,false);
    }
    public Map<String,Object> mine() {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Visitor identity required");
        List<Map<String,Object>> items=db.list("SELECT appointment_id,appointment_no,status,campus_name,visit_date,time_slot,version FROM doupi_recruit_appointment WHERE visitor_identity_id=#{p.id} ORDER BY appointment_id DESC LIMIT 100",P.of("id",a.identityId()));
        List<Map<String,Object>> out=new ArrayList<>();
        for(Map<String,Object> row:items) out.add(P.of("appointmentId",String.valueOf(row.get("appointment_id")),"appointmentNo",row.get("appointment_no"),"status",row.get("status"),"campusName",row.get("campus_name"),"visitDate",row.get("visit_date"),"timeSlot",row.get("time_slot"),"version",row.get("version")));
        return P.of("items",out);
    }
    public Map<String,Object> mineDetail(long id) {
        Actor a=Actors.current();Map<String,Object> row=repo.appointment(id,false);
        if(a.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=a.identityId()) throw Problem.notFound("Appointment not found");
        return repo.view(row,false);
    }
    public Map<String,Object> staffDetail(long id) {
        Actor a=Actors.current();a.require("recruit:appointment:query");Map<String,Object> row=repo.appointment(id,false);repo.staffScope(a,row);return repo.view(row,true);
    }
    public Map<String,Object> cancel(long id,Map<String,Object> b,String key) {
        Map<String,Object> prior=repo.appointment(id,false);owner(prior,b);
        String reason=Inputs.text(b,"reason",1,500);
        return commands.run("IDENTITY:"+Actors.current().identityId(),"APPOINTMENT_CANCEL",key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);owner(row,b);
            if("CANCELLED".equals(row.get("status"))) return repo.view(row,false);
            requireVersion(row,b);
            if(!BookingPolicy.canCancel(String.valueOf(row.get("status")))) throw Problem.conflict("Checked-in appointment cannot be cancelled");
            db.write("UPDATE doupi_recruit_appointment SET status='CANCELLED',audit_remark=#{p.reason},check_in_code=NULL,version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"reason",reason));
            Actor a=Actors.current();repo.audit(id,a,"CANCEL",String.valueOf(row.get("status")),"CANCELLED",reason);
            repo.notifyVisitor(row,"预约已取消","本预约已取消，原到校凭证不再有效。");return repo.view(repo.appointment(id,false),false);
        });
    }
    private void requireVersion(Map<String,Object> row,Map<String,Object> b) {
        if(Inputs.nonNegative(b,"expectedVersion")!=Inputs.number(row.get("version"))) throw Problem.conflict("Appointment changed; refresh first");
    }
    public Map<String,Object> staffList() {
        Actor a=Actors.current();a.requireStaff();a.require("recruit:appointment:query");
        Map<String,Object> p=P.of("user",a.userId());
        List<String> placeholders=new ArrayList<>();int n=0;
        for(Long dept:a.scopeDeptIds()) {String k="scope"+(n++);p.put(k,dept);placeholders.add("#{p."+k+"}");}
        String scopes=placeholders.isEmpty()?"1=0":"cs.dept_id IN ("+String.join(",",placeholders)+")";
        String clause=a.allData()?"1=1":"(a.assigned_teacher_user_id=#{p.user} OR EXISTS (SELECT 1 FROM recruit_campus_scope cs WHERE cs.campus_id=a.campus_id AND "+scopes+"))";
        List<Map<String,Object>> visible=new ArrayList<>();
        for(Map<String,Object> row:db.list("SELECT a.* FROM doupi_recruit_appointment a WHERE "+clause+" ORDER BY a.appointment_id DESC LIMIT 100",p)) visible.add(repo.view(row,true));
        return P.of("items",visible);
    }
    public Map<String,Object> staffAction(long id,String action,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();
        String permission=switch(action){case "confirm"->"recruit:appointment:confirm";case "verify"->"recruit:appointment:verify";case "remark"->"recruit:appointment:edit";default->throw Problem.bad("Invalid appointment action");};
        a.require(permission);repo.staffScope(a,repo.appointment(id,false));
        String actionCode=switch(action){case "confirm"->"APPOINTMENT_CONFIRM";case "verify"->"APPOINTMENT_VERIFY";case "remark"->"APPOINTMENT_REMARK";default->throw Problem.bad("Invalid appointment action");};
        return commands.run("STAFF:"+a.userId(),actionCode,key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);repo.staffScope(a,row);
            String from=String.valueOf(row.get("status")),to=from,reason;
            if("verify".equals(action)) {
                String code=Inputs.text(b,"checkInCode",1,64);
                if(!ExternalCommands.matches(code,ExternalCommands.sha256(String.valueOf(row.get("check_in_code"))))) throw Problem.bad("Invalid check-in proof");
                boolean change;
                try {change=BookingPolicy.checkInChangesState(from);}catch(IllegalArgumentException ex){throw Problem.conflict("Appointment is not approved for check-in");}
                if(!change) {Map<String,Object> out=repo.view(row,true);out.put("alreadyVerified",true);return out;}
                if(row.get("visit_on")==null || !LocalDate.now(ZoneId.of("Asia/Shanghai")).toString().equals(row.get("visit_on").toString())) throw Problem.conflict("Check-in is only valid on the appointment date");
                requireVersion(row,b);to="VERIFIED";reason="Checked in by authorized staff";
                db.write("UPDATE doupi_recruit_appointment SET status='VERIFIED',verify_time=CURRENT_TIMESTAMP(3),verifier_user_id=#{p.user},verifier=#{p.name},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"user",a.userId(),"name",Long.toString(a.userId())));
            } else if("confirm".equals(action)) {
                requireVersion(row,b);if(!"PENDING".equals(from)) throw Problem.conflict("Appointment is not pending confirmation");
                String decision=Inputs.text(b,"decision",6,7);reason=Inputs.text(b,"remark",1,500);
                if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid confirmation decision");
                to="APPROVE".equals(decision)?"APPROVED":"CANCELLED";
                Long teacher="APPROVE".equals(decision)?Inputs.id(b,"assignedTeacherUserId"):null;
                if(teacher!=null) {
                    if(teacher!=a.userId()) a.require("recruit:appointment:assign");
                    Actor receiver=auth.staff(teacher,0);receiver.require("recruit:appointment:query");
                    Map<String,Object> target=P.of("assigned_teacher_user_id",null,"campus_id",row.get("campus_id"));
                    repo.staffScope(receiver,target);
                }
                db.write("UPDATE doupi_recruit_appointment SET status=#{p.status},assigned_teacher_user_id=#{p.teacher},teacher_name=(SELECT nick_name FROM sys_user WHERE user_id=#{p.teacher}),audit_remark=#{p.remark},check_in_code=#{p.code},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"status",to,"teacher",teacher,"remark",reason,"code","APPROVED".equals(to)?UUID.randomUUID().toString().replace("-",""):null));
            } else {
                requireVersion(row,b);reason=Inputs.text(b,"remark",1,500);
                db.write("UPDATE doupi_recruit_appointment SET audit_remark=#{p.remark},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"remark",reason));
            }
            repo.audit(id,a,action.toUpperCase(Locale.ROOT),from,to,reason);
            if(!from.equals(to)) repo.notifyVisitor(row,"预约状态更新","请在本人预约详情查看正式结果。");
            return repo.view(repo.appointment(id,false),true);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitRepository.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class RecruitRepository {
    private final Db db;
    public RecruitRepository(Db db) {this.db=db;}
    public Map<String,Object> appointment(long id,boolean lock) {
        return db.required("SELECT * FROM doupi_recruit_appointment WHERE appointment_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));
    }
    public void staffScope(Actor a,Map<String,Object> row) {
        a.requireStaff();
        if(a.allData() || (row.get("assigned_teacher_user_id")!=null && Inputs.number(row.get("assigned_teacher_user_id"))==a.userId())) return;
        for(Map<String,Object> d:db.list("SELECT dept_id FROM recruit_campus_scope WHERE campus_id=#{p.id}",P.of("id",row.get("campus_id"))))
            if(a.scopeDeptIds().contains(Inputs.number(d.get("dept_id")))) return;
        throw Problem.forbidden("Appointment outside staff scope");
    }
    public void audit(long id,Actor a,String action,String from,String to,String reason) {
        db.insert("INSERT INTO recruit_appointment_action(appointment_id,actor_user_id,actor_identity_id,action_code,previous_status,next_status,remark,created_at) "
            + "VALUES(#{p.id},#{p.user},#{p.identity},#{p.action},#{p.from},#{p.to},#{p.reason},CURRENT_TIMESTAMP(3))",
            P.of("id",id,"user",a.userId()>0?a.userId():null,"identity",a.identityId()>0?a.identityId():null,"action",action,"from",from,"to",to,"reason",reason));
    }
    public void notifyVisitor(Map<String,Object> row,String title,String content) {
        if(row.get("visitor_identity_id")==null) return;
        db.insert("INSERT INTO recruit_notification(appointment_id,recipient_identity_id,title,content,is_read,provider_status,created_at) "
            + "VALUES(#{p.id},#{p.identity},#{p.title},#{p.content},0,'NOT_REQUESTED',CURRENT_TIMESTAMP(3))",
            P.of("id",row.get("appointment_id"),"identity",row.get("visitor_identity_id"),"title",title,"content",content));
    }
    public Map<String,Object> view(Map<String,Object> r,boolean staff) {
        Map<String,Object> out=P.of("appointmentId",String.valueOf(r.get("appointment_id")),"appointmentNo",r.get("appointment_no"),
            "status",r.get("status"),"studentName",r.get("student_name"),"studentGrade",r.get("student_grade"),
            "campusId",r.get("campus_id"),"campusName",r.get("campus_name"),"visitDate",r.get("visit_date"),
            "timeSlot",r.get("time_slot"),"version",r.get("version"),"assignedTeacherName",r.get("teacher_name"),"verifiedAt",r.get("verify_time") instanceof java.sql.Timestamp t?t.toInstant().toString():r.get("verify_time"),"checkInCode",!staff&&"APPROVED".equals(r.get("status"))?r.get("check_in_code"):null);
        if(staff) {out.put("parentName",r.get("parent_name"));out.put("parentPhone",r.get("parent_phone"));out.put("remark",r.get("remark"));out.put("auditRemark",r.get("audit_remark"));out.put("assignedTeacherUserId",r.get("assigned_teacher_user_id")==null?null:String.valueOf(r.get("assigned_teacher_user_id")));}
        else {String phone=String.valueOf(r.get("parent_phone"));out.put("parentPhoneMasked",phone.length()>=7?phone.substring(0,3)+"****"+phone.substring(phone.length()-4):"***");}
        return out;
    }
}
```

**web/package.json**

```json
{
  "name": "planref-portal",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "typescript": "6.0.3",
    "vite": "8.3.1"
  }
}
```

**web/tsconfig.json**

```json
{"compilerOptions":{"target":"ES2022","lib":["ES2022","DOM"],"jsx":"react-jsx","module":"ESNext","moduleResolution":"Bundler","strict":true,"noEmit":true,"skipLibCheck":true},"include":["src"]}
```

**web/vite.config.mjs**

```text
export default { server: { proxy: { '/api/v1': 'http://127.0.0.1:18080' } } };
```

**web/index.html**

```html
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>学校访校预约参考</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

**web/src/api.ts**

```typescript
export type Row = Record<string, any>;
export class ApiError extends Error { constructor(public status: number, message: string, public traceId?: string) { super(message); } }
export async function request(path: string, method = 'GET', body?: Row, key?: string): Promise<Row> {
  const token = sessionStorage.getItem('planref.token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !['/auth/visitor','/auth/wechat','/auth/login'].includes(path)) headers.Authorization = 'Bearer ' + token;
  if (key) headers['Idempotency-Key'] = key;
  let response: Response;
  try { response = await fetch('/api/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000), credentials: 'omit' }); }
  catch { throw new Error('网络未确认结果，请保留原命令重试'); }
  const envelope = await response.json();
  if (!response.ok) { if (response.status === 401) sessionStorage.removeItem('planref.token'); throw new ApiError(response.status, envelope.msg || '请求失败', envelope.traceId); }
  return envelope.data;
}
export function secret(): string { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function ensureVisitor(): Promise<void> {
  const unresolvedCreate = !!sessionStorage.getItem('planref.create');
  if (sessionStorage.getItem('planref.token')) {
    try { const me=await request('/auth/me'); if(me.kind==='VISITOR') return; }
    catch(error) { if(!(error instanceof ApiError) || error.status!==401) throw error; }
    if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
    sessionStorage.removeItem('planref.token');
  }
  if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
  const session=await request('/auth/visitor','POST');
  if(session.kind!=='VISITOR') throw new Error('访客会话类型错误');
  sessionStorage.setItem('planref.token',session.token);
}
export async function command(path: string, body: Row, slot: string): Promise<Row> {
  const raw = sessionStorage.getItem(slot); const pending = raw ? JSON.parse(raw) : { key: secret(), body };
  if (!raw) sessionStorage.setItem(slot,JSON.stringify(pending));
  try { const data = await request(path,'POST',pending.body,pending.key); sessionStorage.removeItem(slot); return data; }
  catch (error) { if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401,403].includes(error.status)) sessionStorage.removeItem(slot); throw error; }
}
```

**web/src/env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**web/src/main.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request, command, ensureVisitor, secret, type Row } from './api';
import './style.css';
function App() {
 const [site,setSite]=useState<Row>({}),[campuses,setCampuses]=useState<Row[]>([]),[articles,setArticles]=useState<Row[]>([]),[article,setArticle]=useState<Row|null>(null),[rules,setRules]=useState<Row|null>(null),[result,setResult]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(!!sessionStorage.getItem('planref.create'));
 const [form,setForm]=useState<Row>({parentName:'',parentPhone:'',studentName:'',studentGrade:'',campusId:'',visitDate:'',timeSlot:'',remark:''}),[accepted,setAccepted]=useState(false),[no,setNo]=useState(''),[proof,setProof]=useState('');
 function fail(e: unknown) {setError(e instanceof Error?e.message:'请求失败');}
 useEffect(()=>{ Promise.all([request('/public/site'),request('/public/campuses'),request('/public/articles'),request('/public/appointment-rules')]).then(([s,c,a,r])=>{setSite(s.config);setCampuses(c.items);setArticles(a.items);setRules(r);}).catch(fail); },[]);
 async function create(e: React.FormEvent) {
  e.preventDefault();setBusy(true);setError('');
  try {
   if(!accepted) throw new Error('请阅读并确认学校隐私说明');
   await ensureVisitor();const raw=sessionStorage.getItem('planref.create');const body=raw?JSON.parse(raw).body:{...form,querySecret:secret()};
   const data=await command('/public/appointments',body,'planref.create');sessionStorage.setItem('planref.proof.'+data.appointmentId,JSON.stringify({appointmentNo:data.appointmentNo,querySecret:body.querySecret}));setResult(data);setNo(data.appointmentNo);setProof(body.querySecret);
  }catch(e){fail(e);}finally{setBusy(false);setPending(!!sessionStorage.getItem('planref.create'));}
 }
 async function query(e: React.FormEvent) { e.preventDefault();try{await ensureVisitor();setResult(await request('/public/appointments/query','POST',{appointmentNo:no,querySecret:proof}));setError('');}catch(e){fail(e);} }
 async function cancel() {if(!result)return;try{const body={appointmentNo:no,querySecret:proof,expectedVersion:result.version,reason:'联系人取消预约'};setResult(await command('/public/appointments/'+result.appointmentId+'/cancel',body,'planref.cancel.'+result.appointmentId));setError('');}catch(e){fail(e);}}
 const field=(name:string,label:string,type='text')=><label>{label}<input required={name!=='remark'} type={type} value={form[name]} disabled={pending||busy} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>;
 return <main><header><h1>{site.site_name||'学校公开信息'}</h1><p>{site.slogan}</p><p>{site.address} {site.hotlines}</p></header>
  {error&&<p role="alert">{error}</p>}<section><h2>正式资讯</h2>{articles.map(a=><article key={a.articleId}><button onClick={()=>request('/public/articles/'+a.articleId).then(setArticle).catch(fail)}>{a.title}</button><p>{a.summary}</p><time>{a.publishedAt}</time></article>)}{article&&<article><h3>{article.title}</h3><p className="content">{article.content}</p></article>}</section>
  <section><h2>公开校区</h2>{campuses.map(c=><article key={c.campus_id}><h3>{c.campus_name}</h3><p>{c.summary}</p><p>{c.address} {c.contact_phone}</p></article>)}</section>
  <section><h2>访校预约</h2><p>待确认不等于已经安排接待。{rules&&`开放未来${rules.openDaysAhead}天。`}</p><form onSubmit={create}>{field('parentName','联系人')}{field('parentPhone','联系电话','tel')}{field('studentName','学生姓名')}{field('studentGrade','意向年级')}<label>校区<select required disabled={pending||busy} value={form.campusId} onChange={e=>setForm({...form,campusId:e.target.value})}><option value="">请选择</option>{campuses.map(c=><option key={c.campus_id} value={c.campus_id}>{c.campus_name}</option>)}</select></label>{field('visitDate','期望日期','date')}<label>开放时段<select required disabled={pending||busy} value={form.timeSlot} onChange={e=>setForm({...form,timeSlot:e.target.value})}><option value="">请选择</option>{rules?.timeSlots.map((s:Row)=><option key={s.name}>{s.name}</option>)}</select></label>{field('remark','咨询需求（可选）')}<p className="content">{site.privacy_policy||'学校未发布正式隐私说明，当前不能提交个人信息。'}</p><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>我已阅读学校隐私说明</label><button disabled={busy||!site.privacy_policy}>{pending?'原键重试结果未明的预约':'提交预约'}</button></form></section>
  <section><h2>本人预约查询</h2><p>预约号、凭证和本浏览器访客会话共同核验。会话失效或凭证遗失请联系学校，不按手机号公开查单。</p><form onSubmit={query}><label>预约号<input required value={no} onChange={e=>setNo(e.target.value)}/></label><label>本次查询凭证<input required type="password" autoComplete="off" value={proof} onChange={e=>setProof(e.target.value)}/></label><button>查询本人预约</button></form>{result&&<article><p>{result.appointmentNo}：{result.status}</p><p>{result.campusName} {result.visitDate} {result.timeSlot}</p><p>接待人：{result.assignedTeacherName||'待分配'}；到校时间：{result.verifiedAt||'未到校'}</p><p>有效到校凭证：{result.checkInCode||'尚无有效凭证'}</p>{['PENDING','APPROVED'].includes(result.status)&&<button onClick={cancel}>取消该预约</button>}</article>}</section>
  <footer><p>个人信息用于学校访校接待。未经学校核实无法取得员工身份。</p><p>{site.icp}</p><button onClick={async()=>{try{if(sessionStorage.getItem('planref.create'))throw new Error('预约结果仍未确认，请先原键重试或联系学校核实');await request('/auth/logout','POST');Object.keys(sessionStorage).filter(key=>key.startsWith('planref.')).forEach(key=>sessionStorage.removeItem(key));setResult(null);setProof('');}catch(e){fail(e);}}}>退出并清除此页会话</button></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
```

**web/src/style.css**

```css
*{box-sizing:border-box}body{margin:0;background:#f4f7f7;color:#193333;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px}header,section,footer{padding:24px;background:#fff;margin-bottom:20px;border-radius:12px}h1,h2,h3{line-height:1.25}form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}label{display:flex;flex-direction:column;gap:6px}input,select,button{font:inherit;min-height:44px;padding:8px;border:1px solid #8babab;border-radius:6px}button{cursor:pointer;background:#e4f1ed}input[type=checkbox]{width:24px;min-height:24px}.content{white-space:pre-wrap;overflow-wrap:anywhere}article{padding:12px 0;border-bottom:1px solid #dae4e4}[role=alert]{color:#9c250f;padding:12px;background:#ffebe4}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #0a7262;outline-offset:3px}@media(max-width:640px){main{padding:12px}header,section,footer{padding:16px}form{grid-template-columns:1fr}}
```



## 6. 边界与异常场景处理

- 查询token/proof不放URL、分享参数、分析埋点、日志；只放本页sessionStorage和POST body。退出只清理planref前缀存储；浏览器会话失效后不按手机号重新取回凭证。
- 预约未审核明确PENDING；有效码仅本人APPROVED时返回，取消清码，核销后不继续展示有效凭证。
- 公开查询、创建、取消路径仍需要受控会话；未带token401。错误identity/预约号/proof统一404，查询和取消合并限流10次/分钟/IP、创建5次/分钟/IP；受信反向代理部署时按网关配置真实来源，不盲信任X-Forwarded-For。
- 未确认创建命令仍在但原Web会话过期时停止重建新访客，保留命令并请学校人工核实；防止同键在新identity作用域重复创建。
- 同键异载荷或异预约目标409；quota不足409；非法日期/表单422；规则不可用503。前端保留网络未确认命令，不能因超时生成新键重复预约。
- 共享设备退出清理本端会话和凭证，后端按原归属保留历史事实；未接短信或微信发送不显示已通知。
