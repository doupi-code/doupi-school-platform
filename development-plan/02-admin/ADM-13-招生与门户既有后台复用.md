# ADM-13 招生与门户既有后台复用

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-13)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期2人日，P0；单Java开发者配合AI串行实施，依赖ADM-12。保留既有招生确认、取消、核销、接待备注、开放日期/时段/限额，以及门户文章草稿、直接发布、撤下和明确公开配置维护；本模块不计P1排班、回访及内容审核为既有完成能力。

- [ ] 第1日：核对`doupi-web-admin-react/src/api/recruit/appointment.ts`、`config.ts`与`src/pages/recruit/appointment/index.tsx`、`verify/index.tsx`，将请求适配到共享recruit参考Controller，不复制第二套预约状态
- [ ] 第2日：复用`src/pages/cms/article/index.tsx`、`src/api/cms/article.ts`界面和`cms/BaselineCmsController.java`适配，校对发布前后公众查询、配置白名单和幂等。招生旧config前端POST `/recruit/config`与后端实际`/recruit/config/save`不一致，迁移时统一到本文新路径；不能仅复用旧按钮宣称联通。本轮只整理计划与已内嵌代码定位，不改生产src。

原有师资、设施、横幅、FAQ和页面搭建继续由既有CMS模块承载，不在2日内重建编辑器或全量CMS。既有对应API和字段保留，发布写入纳入ADM-18约束后再启用审核。本模块新参考适配只列本次改造的文章、公开配置和招生规则，不为未动的原有CRUD重复生成业务代码。

验收：同一预约在Web、小程序和后台显示同一状态；仅到访当日有效凭证可核销，重复核销不加到校数量；文章草稿不公开，明确发布后可公开查询；将已发布文章存成草稿必须显式确认撤下；contentReviewRequired=true后旧直发适配被拒绝，必须走ADM-18。

## 2. 接口设计清单

所有新路径前缀`/api/v1`，员工JWT，ID以十进制字符串传输；持久化动作Idempotency-Key为8—64字符`[A-Za-z0-9_.:-]`；只从Actor取操作者。新响应外层`code,msg,traceId,replayed,data`。recruit使用原共享服务和channel_idempotency，不创建虚假office根。本节列本模块完整新适配API，未列入的原CMS既有CRUD保持旧契约另行原模块验收。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 预约列表 | GET | `/api/v1/staff/appointments` | 无正文 | items:array<object>最多100条职责内预约投影；200 | recruit:appointment:query；接待本人或校区部门 |
| 详情查询 | GET | `/api/v1/staff/appointments/{id}` | id:ID必填 | appointmentId,appointmentNo,status:string(业务状态),studentName,studentGrade,campusId,campusName,visitDate,timeSlot,version:integer,checkInCode,parentName,parentPhone,remark,assignedTeacherUserId；200 | 同上 |
| 预约确认 | POST | `/api/v1/staff/appointments/{id}/confirm` | id；expectedVersion:integer>=0；decision:enum(APPROVE,REJECT)、remark:string1..500必填；批准时assignedTeacherUserId:ID必填，须有效员工且有同校区接待资格 | 同上预约投影；200 | recruit:appointment:confirm；代指定他人还需recruit:appointment:assign |
| 现场核销 | POST | `/api/v1/staff/appointments/{id}/verify` | id；expectedVersion:integer>=0、checkInCode:string1..64必填 | 同上预约投影，重复有效核销另alreadyVerified:boolean=true；200 | recruit:appointment:verify及预约范围 |
| 接待备注 | POST | `/api/v1/staff/appointments/{id}/remark` | id；expectedVersion:integer>=0必填(根版本)、remark:string1..500必填 | 同上投影；200 | recruit:appointment:edit及预约范围 |
| 公开文章 | GET | `/api/v1/staff/cms/articles` | query after:integer>=0可选0，0最新页，其他取article_id<after | items:array<object>最多100，逐项article_id,title,kind,category,summary,cover_url,status:string(业务状态),revision:integer,version:integer,published_at,published_by,published_date,author,sort_order；200，下一页after取末条article_id | cms:article:list |
| 详情查询 | GET | `/api/v1/staff/cms/articles/{id}` | id:ID | article:object完整目标表行含正文；200 | cms:article:list |
| 公开文章 | POST | `/api/v1/staff/cms/articles` | title:string1..255,kind:enum(updates,notices),category:string1..64,content:string1..200000纯文本,author:string1..64,status:enum(0发布,1草稿),sortOrder:integer>=0必填；summary:string<=500、coverUrl:string<=512可空，封面须HTTPS公共素材 | article:object完整行；201 | cms:article:add；status=0另需cms:article:publish |
| 保存修改 | PUT | `/api/v1/staff/cms/articles/{id}` | id；上述全部文章必填/可空字段；expectedArticleVersion:integer>=0必填；withdraw:boolean可选false，从0到1必须true | article:object完整行；200 | cms:article:edit；修改已发布/发布/撤下另需cms:article:publish |
| 站点公开配置 | GET | `/api/v1/staff/cms/site-settings` | 无正文 | items:array<object>[{config_key,config_value,config_name,remark}]；200 | cms:config:list |
| 站点公开配置 | POST | `/api/v1/staff/cms/site-settings` | configKey:string1..64、configValue:string1..1000必填；键仅site_name/site_name_en/slogan/subtitle/address/hotlines/office_hours/icp/privacy_policy/privacy_version | configKey:string(配置键),configValue:string(公开配置值)；200 | cms:config:edit |
| 详情查询 | GET | `/api/v1/staff/recruit-settings/{name}` | name:enum(basic_config,time_slots)必填 | config:object{config_key,config_value,remark}，未配置为空对象；200 | recruit:config:edit |
| 保存修改 | PUT | `/api/v1/staff/recruit-settings/{name}` | name同上；configValue:string1..10000必填JSON；remark:string<=255可空 | configKey:string(配置键),rules:object{openDaysAhead,needAudit,timeSlots}；200 | recruit:config:edit |

basic_config的JSON必须含openDaysAhead:integer1..60及needAudit:boolean；time_slots的JSON为非空数组，每项name:string1..64不重复、maxQuota:integer>0。服务端保存后调用同一RecruitService.rules重新完整验证，不合法整事务回滚。预约状态只用PENDING/APPROVED/VERIFIED/CANCELLED，分别呈现待确认、待到校、已到校、已取消；不返回录取、报名或支付结果。

## 3. 数据流转细节

| API | 字段级业务与SQL | 事务/缓存 |
|---|---|---|
| staff appointment list/detail | RecruitRepository.staffScope只认assigned_teacher_user_id本人、allData或recruit_campus_scope部门；列表SQL先过滤后LIMIT，详情同规则；投影只向员工返回必要联系信息 | 共享recruit服务，非第二套后台私表；没有人造成功数据 |
| confirm | ExternalCommands作用域STAFF:真实user，固定APPOINTMENT_CONFIRM，hash含appointmentId/body；锁appointment、比version，仅PENDING；核实接待教师为AuthRepository.staff真实权限与校区范围 | APPROVE写APPROVED/assigned_teacher/check_in_code/version+1；REJECT写CANCELLED；recruit_appointment_action和站内访客通知同事务 |
| verify | 固定APPOINTMENT_VERIFY；先验checkInCode；APPROVED且visit_on为上海当天才允许；VERIFIED再次有效核销直接alreadyVerified，不二次增加事实 | 写VERIFIED/verify_time/verifier_user_id/version+1及action；不把站内消息送达当作核销条件 |
| remark | 固定APPOINTMENT_REMARK；锁根预约、比version，remark写audit_remark，版本+1；action保留经办身份 | 不伪改到校时间，不另加office_request |
| CMS article list/detail | 员工权限下允许看草稿；公众只按status=0、published_at<=当前UTC读取 | 不把后台预览链接当匿名发布链接 |
| article create/save | ExternalCommands BASELINE_ARTICLE_SAVE摘要含articleId/body，先锁office.rules并要求contentReviewRequired=false；纯文本转义、封面HTTPS校验；发布/修改已发布/撤下检查专门publish权限。更新锁article并校验expectedArticleVersion；已发布转草稿必须withdraw=true | 新建revision=1/version=0，更新revision/version各+1；status=0由服务端写published_at/by/date。保存草稿不冒充发布成功；旧内容修订审核在ADM-18启用后此直写入口报409 |
| site-settings GET/POST | 公开键白名单，固定SQL upsert doupi_cms_config，config_value不接受数据库连接/密钥配置 | 独立SITE_SETTING_SAVE命令与真实结果同事务；公开端PublicRepository同白名单读取，私有办公配置不出现在公开接口 |
| recruit-settings GET/PUT | 路径name严格白名单，固定RECRUIT_SETTING_SAVE摘要含name/body；upsert既有doupi_recruit_config，然后recruit.rules校验两项组合 | 配置与幂等结果同事务；公开规则端与预约创建均从此同表读取。修改开放配置不重写已到校历史 |

公开内容与内部sys_notice分表。文章作者是署名，发布人是认证员工，不能互相冒名。旧CMS直接写路由迁移时必须进入此发布资格控制或关闭，P1启用审核后全部文章写入转内容修订服务；不能保留旧直发旁路。招生开放配置不是接待员工班次，P1另用ADM-17。

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

**recruit_campus_scope**

```sql
CREATE TABLE recruit_campus_scope (
  campus_id VARCHAR(32) NOT NULL COMMENT '既有校区字符串ID，不等于dept_id',
  dept_id BIGINT NOT NULL COMMENT '可办理该校区的学校部门；还须动作权限及数据范围',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC授权配置时间',
  PRIMARY KEY (campus_id, dept_id),
  INDEX idx_recruit_scope_dept (dept_id, campus_id)   COMMENT '按有效员工部门范围查询校区预约',
  CONSTRAINT fk_recruit_scope_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_scope_dept FOREIGN KEY (dept_id) REFERENCES sys_dept (
    dept_id
  ) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生校区与学校部门授权映射，不将校区ID强转数字';
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

**doupi_cms_article**

```sql
CREATE TABLE `doupi_cms_article` (
  `article_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '资讯ID',
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章标题',
  `kind` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'updates' COMMENT '类型: updates-高招资讯 notices-校园公告',
  `category` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '校园动态' COMMENT '栏目分类',
  `summary` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '摘要提炼',
  `content` LONGTEXT COLLATE utf8mb4_unicode_ci COMMENT '富文本正文',
  `cover_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published_date` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发布日期(YYYY-MM-DD)',
  `author` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '汉外华襄校办' COMMENT '发布作者/署名',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-正常发布 1-草稿箱',
  `sort_order` INT DEFAULT '0' COMMENT '排序权重',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`article_id`),
  INDEX `idx_kind` (`kind`),
  INDEX `idx_status` (`status`),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，并发编辑发布',
  `published_at` DATETIME(3) NULL COMMENT '新增，真实发布时间',
  `published_by` BIGINT NULL COMMENT '新增，发布身份',
  INDEX `idx_article_public` (`kind`, `status`, `published_at`, `article_id`),
  CONSTRAINT `fk_ref_085` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网公文与资讯表';
```

**doupi_cms_config**

```sql
CREATE TABLE `doupi_cms_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键名',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键值(JSON或字符串)',
  `config_name` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数中文名称',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注说明',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网门户参数表';
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

共享招生代码仅引用本轮其他端已维护的同一实现，本模块不修改recruit包；基础门户适配代码可直接在独立参考工程编译。旧CMS师资、设施、横幅、FAQ和页面搭建服务仍按现有模块边界复用，不纳入新员工认证旁路。



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

**backend/src/main/java/com/doupi/planref/cms/BaselineCmsController.java**

```java
package com.doupi.planref.cms;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/staff")
public class BaselineCmsController {
 private final BaselineCmsService service;public BaselineCmsController(BaselineCmsService service){this.service=service;}
 @GetMapping("/cms/articles") public ResponseEntity<Map<String,Object>> articles(@RequestParam(defaultValue="0")long after){return ApiReply.of(service.articles(after),200);}
 @GetMapping("/cms/articles/{id}") public ResponseEntity<Map<String,Object>> article(@PathVariable long id){return ApiReply.of(service.article(id),200);}
 @PostMapping("/cms/articles") public ResponseEntity<Map<String,Object>> create(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveArticle(0,key,b),201);}
 @PutMapping("/cms/articles/{id}") public ResponseEntity<Map<String,Object>> save(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveArticle(id,key,b),200);}
 @GetMapping("/cms/site-settings") public ResponseEntity<Map<String,Object>> settings(){return ApiReply.of(service.settings(),200);}
 @PostMapping("/cms/site-settings") public ResponseEntity<Map<String,Object>> setting(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveSetting(key,b),200);}
 @GetMapping("/recruit-settings/{name}") public ResponseEntity<Map<String,Object>> recruitSetting(@PathVariable String name){return ApiReply.of(service.recruitSetting(name),200);}
 @PutMapping("/recruit-settings/{name}") public ResponseEntity<Map<String,Object>> recruitSave(@PathVariable String name,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveRecruitSetting(name,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/cms/BaselineCmsService.java**

```java
package com.doupi.planref.cms;
import com.doupi.planref.*;
import com.doupi.planref.auth.ExternalCommands;
import com.doupi.planref.recruit.RecruitService;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
/** P0 adapters for retained article/settings screens; P1 turns direct article writes off. */
@Service
public class BaselineCmsService {
 private final Db db;private final ExternalCommands commands;private final RecruitService recruit;
 public BaselineCmsService(Db db,ExternalCommands commands,RecruitService recruit){this.db=db;this.commands=commands;this.recruit=recruit;}
 public Map<String,Object> articles(long after){if(after<0)throw Problem.bad("after不能为负");Actors.current().require("cms:article:list");return P.of("items",db.list("SELECT article_id,title,kind,category,summary,cover_url,status,revision,version,published_at,published_by,published_date,author,sort_order FROM doupi_cms_article WHERE (#{p.after}=0 OR article_id<#{p.after}) ORDER BY article_id DESC LIMIT 100",P.of("after",after)));}
 public Map<String,Object> article(long id){Actors.current().require("cms:article:list");return P.of("article",db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id}",P.of("id",id)));}
 public Map<String,Object> saveArticle(long id,String key,Map<String,Object>b){Actor a=Actors.current();a.require(id==0?"cms:article:add":"cms:article:edit");return commands.run("CMS:"+a.userId(),"BASELINE_ARTICLE_SAVE",key,P.of("articleId",id,"body",b),id==0?201:200,()->{
  Map<String,Object>config=db.required("SELECT config_value FROM sys_config WHERE config_key='office.rules' FOR UPDATE",P.of());if(Inputs.bool(Json.readMap(config.get("config_value")),"contentReviewRequired",true))throw Problem.conflict("已启用内容审核，请使用内容修订送审发布入口");
  String status=Inputs.text(b,"status",1,1);if(!Set.of("0","1").contains(status))throw Problem.bad("文章状态须为0发布或1草稿");
  if("0".equals(status))a.require("cms:article:publish");
  Map<String,Object>p=P.of("title",Inputs.text(b,"title",1,255),"kind",ContentService.publicKind(b),"category",Inputs.text(b,"category",1,64),"summary",Inputs.optionalText(b,"summary",500),"cover",ContentService.publicCover(b),"content",ContentService.safeText(Inputs.text(b,"content",1,200000)),"author",Inputs.text(b,"author",1,64),"status",status,"sort",Inputs.nonNegative(b,"sortOrder"),"actor",a.userId(),"date",LocalDate.now(ZoneOffset.UTC).toString());
  long article=id;if(id==0)article=db.insert("INSERT INTO doupi_cms_article(title,kind,category,summary,content,cover_url,status,author,sort_order,revision,version,published_at,published_by,published_date) VALUES(#{p.title},#{p.kind},#{p.category},#{p.summary},#{p.content},#{p.cover},#{p.status},#{p.author},#{p.sort},1,0,CASE WHEN #{p.status}='0' THEN CURRENT_TIMESTAMP(3) ELSE NULL END,CASE WHEN #{p.status}='0' THEN #{p.actor} ELSE NULL END,CASE WHEN #{p.status}='0' THEN #{p.date} ELSE NULL END)",p);
  else{Map<String,Object>old=db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id} FOR UPDATE",P.of("id",id));if(Inputs.nonNegative(b,"expectedArticleVersion")!=Inputs.number(old.get("version")))throw Problem.conflict("文章版本已变化");if("0".equals(old.get("status"))){a.require("cms:article:publish");if("1".equals(status)&&!Inputs.bool(b,"withdraw",false))throw Problem.bad("从已发布改成草稿须明确withdraw=true");}p.put("id",id);db.write("UPDATE doupi_cms_article SET title=#{p.title},kind=#{p.kind},category=#{p.category},summary=#{p.summary},content=#{p.content},cover_url=#{p.cover},status=#{p.status},author=#{p.author},sort_order=#{p.sort},revision=revision+1,version=version+1,published_at=CASE WHEN #{p.status}='0' THEN CURRENT_TIMESTAMP(3) ELSE published_at END,published_by=CASE WHEN #{p.status}='0' THEN #{p.actor} ELSE published_by END,published_date=CASE WHEN #{p.status}='0' THEN #{p.date} ELSE published_date END WHERE article_id=#{p.id}",p);}
  return P.of("article",db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id}",P.of("id",article)));
 });}
 public Map<String,Object> settings(){Actors.current().require("cms:config:list");return P.of("items",db.list("SELECT config_key,config_value,config_name,remark FROM doupi_cms_config ORDER BY config_key",P.of()));}
 public Map<String,Object> saveSetting(String key,Map<String,Object>b){Actor a=Actors.current();a.require("cms:config:edit");return commands.run("CMS:"+a.userId(),"SITE_SETTING_SAVE",key,b,200,()->{String name=Inputs.text(b,"configKey",1,64);if(!Set.of("site_name","site_name_en","slogan","subtitle","address","hotlines","office_hours","icp","privacy_policy","privacy_version").contains(name))throw Problem.bad("只允许明确公开的站点联系与备案配置键");String value=Inputs.text(b,"configValue",1,1000);db.write("INSERT INTO doupi_cms_config(config_key,config_value,config_name,update_by,update_time) VALUES(#{p.key},#{p.value},#{p.name},#{p.actor},CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE config_value=#{p.value},update_by=#{p.actor},update_time=CURRENT_TIMESTAMP(3)",P.of("key",name,"value",value,"name",name,"actor",Long.toString(a.userId())));return P.of("configKey",name,"configValue",value);});}
 public Map<String,Object> recruitSetting(String name){Actors.current().require("recruit:config:edit");if(!Set.of("basic_config","time_slots").contains(name))throw Problem.bad("配置键不在开放规则白名单");return P.of("config",db.one("SELECT config_key,config_value,remark FROM doupi_recruit_config WHERE config_key=#{p.key}",P.of("key",name)));}
 public Map<String,Object> saveRecruitSetting(String name,String key,Map<String,Object>b){Actor a=Actors.current();a.require("recruit:config:edit");if(!Set.of("basic_config","time_slots").contains(name))throw Problem.bad("配置键不在开放规则白名单");return commands.run("RECRUIT_CONFIG:"+a.userId(),"RECRUIT_SETTING_SAVE",key,P.of("name",name,"body",b),200,()->{String value=Inputs.text(b,"configValue",1,10000),remark=Inputs.optionalText(b,"remark",255);db.write("INSERT INTO doupi_recruit_config(config_key,config_value,remark,update_time) VALUES(#{p.key},#{p.value},#{p.remark},CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE config_value=#{p.value},remark=#{p.remark},update_time=CURRENT_TIMESTAMP(3)",P.of("key",name,"value",value,"remark",remark));Map<String,Object>rules=recruit.rules();return P.of("configKey",name,"rules",rules);});}
}
```



## 6. 边界与异常场景处理

400：未知规则键/公开配置键、时段重复、非法quota、缺少文章字段、非HTTPS封面、已发布转草稿未明确withdraw；403：超校区、他人接待资格不符、缺发布权限；404：预约或文章不存在/不可见；409：预约/文章版本变化、非当日核销、状态不允许、同键异预约或正文、已启用审核仍尝试直发；503：缺失或失效开放规则。前端不能吞失败后仍弹成功；HTTP超时使用同键原正文重试。被取消或已到校预约不可改成新的未到校事实；不增加支付/SMS/录取占位响应。
