-- 最新完整目标设计：131表 = 66张线上保留表 + 65张待新增设计表。
-- 更新2026-11-06；仅用于空库设计审阅，不是增量迁移或已上线证明。
-- 先创建全部表，后建外键；清重、映射和回填前提见结构差异文档。
SET NAMES utf8mb4;

CREATE TABLE `QRTZ_BLOB_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `blob_data` BLOB COMMENT '存放持久化Trigger对象',
  PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Blob类型的触发器表';

CREATE TABLE `QRTZ_CALENDARS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `calendar_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日历名称',
  `calendar` BLOB NOT NULL COMMENT '存放持久化calendar对象',
  PRIMARY KEY (`sched_name`, `calendar_name`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='日历信息表';

CREATE TABLE `QRTZ_CRON_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `cron_expression` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'cron表达式',
  `time_zone_id` VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '时区',
  PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Cron类型的触发器表';

CREATE TABLE `QRTZ_FIRED_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `entry_id` VARCHAR(95) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度器实例id',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `instance_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度器实例名',
  `fired_time` BIGINT NOT NULL COMMENT '触发的时间',
  `sched_time` BIGINT NOT NULL COMMENT '定时器制定的时间',
  `priority` INT NOT NULL COMMENT '优先级',
  `state` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态',
  `job_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务名称',
  `job_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务组名',
  `is_nonconcurrent` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否并发',
  `requests_recovery` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否接受恢复执行',
  PRIMARY KEY (`sched_name`, `entry_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='已触发的触发器表';

CREATE TABLE `QRTZ_JOB_DETAILS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `job_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `job_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务组名',
  `description` VARCHAR(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相关介绍',
  `job_class_name` VARCHAR(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '执行任务类名称',
  `is_durable` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否持久化',
  `is_nonconcurrent` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否并发',
  `is_update_data` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否更新数据',
  `requests_recovery` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否接受恢复执行',
  `job_data` BLOB COMMENT '存放持久化job对象',
  PRIMARY KEY (`sched_name`, `job_name`, `job_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='任务详细信息表';

CREATE TABLE `QRTZ_LOCKS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `lock_name` VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '悲观锁名称',
  PRIMARY KEY (`sched_name`, `lock_name`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='存储的悲观锁信息表';

CREATE TABLE `QRTZ_PAUSED_TRIGGER_GRPS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  PRIMARY KEY (`sched_name`, `trigger_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='暂停的触发器表';

CREATE TABLE `QRTZ_SCHEDULER_STATE` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `instance_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '实例名称',
  `last_checkin_time` BIGINT NOT NULL COMMENT '上次检查时间',
  `checkin_interval` BIGINT NOT NULL COMMENT '检查间隔时间',
  PRIMARY KEY (`sched_name`, `instance_name`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='调度器状态表';

CREATE TABLE `QRTZ_SIMPLE_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `repeat_count` BIGINT NOT NULL COMMENT '重复的次数统计',
  `repeat_interval` BIGINT NOT NULL COMMENT '重复的间隔时间',
  `times_triggered` BIGINT NOT NULL COMMENT '已经触发的次数',
  PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='简单触发器的信息表';

CREATE TABLE `QRTZ_SIMPROP_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `str_prop_1` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第一个参数',
  `str_prop_2` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第二个参数',
  `str_prop_3` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第三个参数',
  `int_prop_1` INT DEFAULT NULL COMMENT 'int类型的trigger的第一个参数',
  `int_prop_2` INT DEFAULT NULL COMMENT 'int类型的trigger的第二个参数',
  `long_prop_1` BIGINT DEFAULT NULL COMMENT 'long类型的trigger的第一个参数',
  `long_prop_2` BIGINT DEFAULT NULL COMMENT 'long类型的trigger的第二个参数',
  `dec_prop_1` DECIMAL(13, 4) DEFAULT NULL COMMENT 'decimal类型的trigger的第一个参数',
  `dec_prop_2` DECIMAL(13, 4) DEFAULT NULL COMMENT 'decimal类型的trigger的第二个参数',
  `bool_prop_1` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Boolean类型的trigger的第一个参数',
  `bool_prop_2` VARCHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Boolean类型的trigger的第二个参数',
  PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='同步机制的行锁表';

CREATE TABLE `QRTZ_TRIGGERS` (
  `sched_name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器的名字',
  `trigger_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器所属组的名字',
  `job_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_job_details表job_name的外键',
  `job_group` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_job_details表job_group的外键',
  `description` VARCHAR(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相关介绍',
  `next_fire_time` BIGINT DEFAULT NULL COMMENT '上一次触发时间（毫秒）',
  `prev_fire_time` BIGINT DEFAULT NULL COMMENT '下一次触发时间（默认为-1表示不触发）',
  `priority` INT DEFAULT NULL COMMENT '优先级',
  `trigger_state` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器状态',
  `trigger_type` VARCHAR(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器的类型',
  `start_time` BIGINT NOT NULL COMMENT '开始时间',
  `end_time` BIGINT DEFAULT NULL COMMENT '结束时间',
  `calendar_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日程表名称',
  `misfire_instr` SMALLINT DEFAULT NULL COMMENT '补偿执行的策略',
  `job_data` BLOB COMMENT '存放持久化job对象',
  PRIMARY KEY (`sched_name`, `trigger_name`, `trigger_group`),
  INDEX `sched_name` (`sched_name`, `job_name`, `job_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='触发器详细信息表';

CREATE TABLE auth_binding_request (
  binding_request_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '员工身份核实申请ID',
  identity_id BIGINT NOT NULL COMMENT '已微信认证的外部身份',
  staff_user_id BIGINT NOT NULL COMMENT '待核实学校员工账号',
  status VARCHAR(16) NOT NULL COMMENT 'PENDING、VERIFIED、REJECTED',
  reason VARCHAR(300) NOT NULL COMMENT '申请者核实依据说明',
  reviewed_by BIGINT NULL COMMENT '学校核实人，不能为目标本人',
  review_remark VARCHAR(300) NULL COMMENT '核实依据与结论，不保存密码证件原文',
  reviewed_at DATETIME(3) NULL COMMENT 'UTC核实时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC申请时间',
  pending_identity_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN identity_id ELSE NULL END) STORED COMMENT '仅待核实申请占唯一槽',
  PRIMARY KEY (binding_request_id),
  UNIQUE uk_binding_pending (
    pending_identity_id
  ) COMMENT '一个外部身份至多一份待核实申请',
  INDEX idx_binding_identity (identity_id, created_at, binding_request_id)   COMMENT '本人申请历史',
  INDEX idx_binding_staff (staff_user_id, status, binding_request_id)   COMMENT '学校核实范围筛选',
  INDEX idx_binding_reviewer (reviewed_by)   COMMENT '核实审计',
  CONSTRAINT ck_binding_status CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  CONSTRAINT ck_binding_version CHECK (version >= 0),
  CONSTRAINT ck_binding_separation CHECK (reviewed_by IS NULL OR reviewed_by <> staff_user_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='学校核实微信员工绑定，不按手机号自动授员工权限';

CREATE TABLE campus_resource (
  resource_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '公共资源ID',
  resource_code VARCHAR(40) NOT NULL UNIQUE COMMENT '稳定资源编码',
  resource_name VARCHAR(120) NOT NULL COMMENT '资源名称',
  location VARCHAR(200) NOT NULL COMMENT '报修位置或资源地点',
  capacity INT NOT NULL COMMENT '最大人数或接待容量',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '1启用0停用',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观版本',
  CHECK (capacity > 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='会议室及公共场地目录';

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

CREATE TABLE cms_article_revision (
  base_article_version BIGINT NOT NULL COMMENT '编辑时正式文章版本，发布时校验',
  revision_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '内容修订ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  article_id BIGINT NOT NULL COMMENT '正式文章ID',
  revision INT NOT NULL COMMENT '文章内修订序号',
  title VARCHAR(255) NOT NULL COMMENT '送审标题快照',
  kind VARCHAR(32) NOT NULL COMMENT '公开内容类型',
  category VARCHAR(64) NOT NULL COMMENT '公开分类',
  summary VARCHAR(500) NULL COMMENT '摘要快照',
  content LONGTEXT NOT NULL COMMENT '已转义正文快照，不提前覆盖正式内容',
  cover_url VARCHAR(512) NULL COMMENT 'HTTPS公共封面素材地址',
  author_name VARCHAR(100) NOT NULL COMMENT '署名快照',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  created_by_user_id BIGINT NOT NULL COMMENT '真实创建员工',
  created_at DATETIME(3) NOT NULL COMMENT '创建UTC时间',
  UNIQUE (
    article_id,
    revision
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='审核草稿不可提前覆盖公众已发布正文';

CREATE TABLE cms_content_review (
  review_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '内容审核ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  revision_id BIGINT NOT NULL UNIQUE COMMENT '内容修订ID',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  reviewed_by BIGINT NULL COMMENT '真实审核员工',
  reviewed_at DATETIME(3) NULL COMMENT '审核UTC时间',
  comment VARCHAR(1000) NULL COMMENT '审核意见'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='固定内容审核，审批人与作者分离';

CREATE TABLE directory_change_log (
  change_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '档案变更事件',
  entity_type VARCHAR(24) NOT NULL COMMENT 'CLASS/SUPPLIER/KIT',
  entity_id BIGINT NOT NULL COMMENT '类型内主键，逻辑关联',
  actor_user_id BIGINT NOT NULL COMMENT '真实操作人',
  before_json JSON NOT NULL COMMENT '变更前快照',
  after_json JSON NOT NULL COMMENT '变更后快照',
  created_at DATETIME(3) NOT NULL COMMENT '变更时间UTC',
  PRIMARY KEY (change_id),
  INDEX idx_directory_entity (entity_type, entity_id, change_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='档案变更审计，禁止一般编辑删除';

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
  INDEX `idx_article_public` (`kind`, `status`, `published_at`, `article_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网公文与资讯表';

CREATE TABLE `doupi_cms_banner` (
  `banner_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '轮播图ID',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '海报标题',
  `image_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '海报图片URL',
  `link_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '点击跳转链接',
  `platform` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '展示端: all-全端 pc-电脑端 mobile-手机端',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-启用 1-停用',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`banner_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网轮播横幅表';

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

CREATE TABLE `doupi_cms_facility` (
  `facility_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '设施ID',
  `facility_code` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设施编号(如c1,c2)',
  `name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '建筑/场馆名称',
  `tag` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设施标签(如独立卫浴/4人间)',
  `zone` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '教学' COMMENT '所属分区: 教学/运动/生活/生态',
  `area` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '建筑占地面积',
  `detail` TEXT COLLATE utf8mb4_unicode_ci COMMENT '详细硬件与功能介绍',
  `image_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实景高清照片URL',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-正常 1-隐藏',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`facility_id`),
  UNIQUE `uk_facility_code` (
    `facility_code`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网校园设施表';

CREATE TABLE `doupi_cms_faq` (
  `faq_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '问答ID',
  `category` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类: 报名/费用/课程/管理/住宿/心理',
  `question` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '咨询问题',
  `answer` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '官方规范答复',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`faq_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网常见问答表';

CREATE TABLE `doupi_cms_global` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '布局类别: header, footer, seo, floating',
  `config_content` JSON NOT NULL COMMENT '具体配置结构化JSON',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '说明',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE `uk_category` (
    `category`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网全局布局与公共组件配置表';

CREATE TABLE `doupi_cms_page` (
  `page_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '页面ID',
  `page_slug` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面访问路由 (如 / 或 about/campuses)',
  `page_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面中文名称',
  `seo_title` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO关键字',
  `seo_description` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO描述',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '发布状态: 0=已发布, 1=草稿',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`page_id`),
  UNIQUE `uk_slug` (
    `page_slug`
  ),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，页面区块共同修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，页面编辑根版本',
  `published_revision` INT NULL COMMENT '新增，公开版本',
  `published_at` DATETIME(3) NULL COMMENT '新增',
  `published_by` BIGINT NULL COMMENT '新增',
  INDEX `idx_page_public` (`status`, `page_slug`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网页面定义表';

CREATE TABLE `doupi_cms_section` (
  `section_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '区块ID',
  `page_id` BIGINT NOT NULL COMMENT '所属页面ID',
  `section_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '区块类型: hero, results, intro, reasons, stories, faculty, campus, news, rich_text, faq',
  `section_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '区块别名',
  `sort_order` INT DEFAULT '0' COMMENT '排序权重(越小越靠前)',
  `is_visible` TINYINT(1) DEFAULT '1' COMMENT '是否可见: 1=可见, 0=隐藏',
  `content_data` JSON NOT NULL COMMENT '区块专属详细配置JSON',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`section_id`),
  INDEX `idx_page_order` (`page_id`, `sort_order`),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，页面修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，并发编辑',
  INDEX `idx_section_revision` (`page_id`, `revision`, `sort_order`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网页面动态区块表';

CREATE TABLE `doupi_cms_teacher` (
  `teacher_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '名师ID',
  `slug` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL别名/唯一标识',
  `name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '教师姓名',
  `subject` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任教学科',
  `title` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '职级头衔(如副校长/语文特级教师)',
  `category` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'faculty' COMMENT '类别: principal-校级领导 special-特级教师 backbone-骨干',
  `group_name` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'faculty' COMMENT '群组: management-管理层 faculty-学科名师',
  `tags` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '荣誉标签(英文逗号分隔)',
  `bio` TEXT COLLATE utf8mb4_unicode_ci COMMENT '生平履历与名校背景介绍',
  `quote` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '治学格言/名言金句',
  `years` INT DEFAULT '10' COMMENT '深耕高中备考教龄',
  `achievement` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '标杆荣誉/突出战绩',
  `avatar_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '名师正面肖像图URL',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`teacher_id`),
  UNIQUE `uk_slug` (
    `slug`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网名师天团表';

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
  INDEX `idx_appointment_code` (`campus_id`, `check_in_code`, `status`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='访校预约表';

CREATE TABLE `doupi_recruit_banner` (
  `banner_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '轮播图ID',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `image_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '图片URL',
  `link_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '跳转链接',
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active-启用 inactive-禁用',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`banner_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生轮播图表';

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

CREATE TABLE `doupi_recruit_message` (
  `message_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `user_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收人OpenID或用户ID',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息标题',
  `content` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息正文',
  `type` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT 'APPOINTMENT' COMMENT '消息类型: APPOINTMENT-预约 BINDING-绑定 SYSTEM-系统',
  `is_read` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '是否已读(0-未读 1-已读)',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '发送时间',
  PRIMARY KEY (`message_id`),
  INDEX `idx_user_msg` (`user_id`, `is_read`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生与系统通知消息表';

CREATE TABLE `doupi_recruit_teacher_binding` (
  `binding_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '绑定ID',
  `teacher_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '教师姓名',
  `teacher_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `director_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `director_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '招生主管姓名',
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'APPROVED' COMMENT '状态: PENDING-待审核 APPROVED-已通过 REJECTED-已驳回',
  `audit_remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '审批意见',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '申请时间',
  `audit_time` DATETIME DEFAULT NULL COMMENT '审批时间',
  PRIMARY KEY (`binding_id`),
  INDEX `idx_teacher` (`teacher_id`),
  INDEX `idx_director` (`director_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教师招生绑定表';

CREATE TABLE `edu_celebration` (
  `celebration_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '喜报记录ID',
  `student_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生姓名',
  `masked_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '脱敏姓名',
  `subject` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '选科组合',
  `before_score` DECIMAL(6, 1) DEFAULT NULL COMMENT '原始/前次分数',
  `after_score` DECIMAL(6, 1) DEFAULT NULL COMMENT '现考/提升后分数',
  `upgrade_score` DECIMAL(6, 1) DEFAULT NULL COMMENT '提升分值',
  `batch_title` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '2026年高考提分喜报' COMMENT '喜报批次/届别',
  `tag` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '去向/荣誉标签',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `order_num` INT DEFAULT '0' COMMENT '排序权重',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`celebration_id`),
  INDEX `idx_batch` (`batch_title`),
  INDEX `idx_upgrade` (`upgrade_score`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='提分喜报光荣榜';

CREATE TABLE `edu_class` (
  `class_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '班级ID',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '年级',
  `class_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '班级名称',
  `student_num` INT NOT NULL DEFAULT '0' COMMENT '班级人数',
  `head_teacher_id` BIGINT DEFAULT NULL COMMENT '????????D',
  `head_teacher` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'ç­ä¸»ä»»å§“å',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`class_id`),
  UNIQUE `uk_grade_class` (
    `grade`,
    `class_name`
  ),
  `dept_id` BIGINT NULL COMMENT '新增，管理范围',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT '新增，ACTIVE/ARCHIVED',
  INDEX `idx_class_head` (`head_teacher_id`),
  INDEX `idx_class_dept` (`dept_id`, `status`),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '档案并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='班级档案表';

CREATE TABLE edu_exam (
  exam_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试ID',
  exam_name VARCHAR(128) NOT NULL COMMENT '考试名',
  exam_date DATE NOT NULL COMMENT '上海教学考试日期',
  academic_year VARCHAR(9) NOT NULL COMMENT '显式学年YYYY-YYYY，创建后冻结',
  semester TINYINT NOT NULL COMMENT '显式学期1/2，不按日期推断',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '配置冻结版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (exam_id),
  INDEX idx_exam_date (exam_date, exam_id),
  INDEX idx_exam_term (academic_year, semester, exam_date, exam_id),
  CONSTRAINT ck_exam_version CHECK (version >= 0),
  CONSTRAINT ck_exam_term CHECK (REGEXP_LIKE(academic_year, '^[0-9]{4}-[0-9]{4}$')
  AND CAST(SUBSTRING(academic_year, 6, 4) AS UNSIGNED) = CAST(SUBSTRING(academic_year, 1, 4) AS UNSIGNED) + 1
  AND semester IN (1, 2))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='创建后配置冻结的考试'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_exam_class (
  exam_class_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试班级根',
  exam_id BIGINT NOT NULL COMMENT '考试',
  class_id BIGINT NOT NULL COMMENT '考试当时班级',
  class_name_snapshot VARCHAR(50) NOT NULL COMMENT '冻结班名，后续改名不覆盖',
  status VARCHAR(16) NOT NULL COMMENT 'DRAFT/PUBLISHED/WITHDRAWN',
  current_release_no INT NOT NULL DEFAULT 0 COMMENT '最近发布序号，不回退',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '草稿及发布并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (exam_class_id),
  UNIQUE uk_exam_class (
    exam_id,
    class_id
  ),
  INDEX idx_exam_class_scope (class_id, status, exam_id),
  CONSTRAINT ck_ec_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'WITHDRAWN')),
  CONSTRAINT ck_ec_version CHECK (version >= 0 AND current_release_no >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='发布粒度及版本锁根'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_exam_roster (
  roster_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试冻结学生项',
  exam_class_id BIGINT NOT NULL COMMENT '考试时班级根',
  student_id BIGINT NOT NULL COMMENT '正式学生',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '冻结学号',
  student_name VARCHAR(64) NOT NULL COMMENT '冻结姓名',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  PRIMARY KEY (roster_id),
  UNIQUE uk_roster_student (
    exam_class_id,
    student_id
  ),
  UNIQUE uk_roster_no (
    exam_class_id,
    student_no
  ),
  INDEX idx_exam_student (student_id, exam_class_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='转班不改考试名册'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_exam_score (
  score_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '草稿成绩格',
  roster_id BIGINT NOT NULL COMMENT '冻结学生',
  subject_id BIGINT NOT NULL COMMENT '考试科目',
  score_status VARCHAR(16) NOT NULL COMMENT 'SCORE/ABSENT/EXEMPT/UNRECORDED',
  score DECIMAL(8, 2) NULL COMMENT 'SCORE才有值，含0',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '记录版本，整班根控制写并发',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (score_id),
  UNIQUE uk_score_cell (
    roster_id,
    subject_id
  ),
  INDEX idx_score_subject (subject_id, score_status),
  CONSTRAINT ck_score_state CHECK ((
    score_status = 'SCORE' AND NOT score IS NULL AND score >= 0
  )
  OR (
    score_status IN ('ABSENT', 'EXEMPT', 'UNRECORDED') AND score IS NULL
  )),
  CONSTRAINT ck_score_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='待发布草稿，跨考试科目及满分由同事务业务校验'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_exam_subject (
  subject_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试科目',
  exam_id BIGINT NOT NULL COMMENT '考试',
  subject_code VARCHAR(20) COLLATE utf8mb4_bin NOT NULL COMMENT '精确科目代码',
  subject_name VARCHAR(64) NOT NULL COMMENT '科目名快照',
  full_score DECIMAL(8, 2) NOT NULL COMMENT '显式满分，不默认100',
  counts_total TINYINT NOT NULL COMMENT '是否计总分，必须显式',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  PRIMARY KEY (subject_id),
  UNIQUE uk_exam_subject (
    exam_id,
    subject_code
  ),
  CONSTRAINT ck_subject_full CHECK (full_score > 0),
  CONSTRAINT ck_subject_count CHECK (counts_total IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增冻结考试规则'
COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT `ck_edu_goods_2` CHECK (remain_sheets >= 0 AND remain_sheets < conversion_rate)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='物品档案表';

CREATE TABLE `edu_goods_kit` (
  `kit_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '套装ID',
  `kit_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套装名称',
  `kit_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套装编码',
  `target_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '适用对象(1教师工作武器 2学生教材 3班级通用)',
  `grade` VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT '通用' COMMENT '适用年级(通用/高一/高二/高三/复读部)',
  `subject` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '通用' COMMENT '适用选科/方向(通用/物理类/历史类/物化生/历政地)',
  `description` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套装说明/适用场景',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `sort_order` INT DEFAULT '0' COMMENT '排序号',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志(0存在 2删除)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`kit_id`),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '套装并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务物资套装模版表';

CREATE TABLE `edu_goods_kit_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `kit_id` BIGINT NOT NULL COMMENT '套装ID',
  `goods_id` BIGINT NOT NULL COMMENT '物资ID',
  `quantity` BIGINT NOT NULL DEFAULT '1' COMMENT '默认配发数量',
  `sort_order` INT DEFAULT '0' COMMENT '排序号',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配发说明',
  PRIMARY KEY (`item_id`),
  INDEX `idx_kit_id` (`kit_id`),
  INDEX `idx_goods_id` (`goods_id`),
  UNIQUE `uk_kit_goods` (
    `kit_id`,
    `goods_id`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务物资套装明细表';

CREATE TABLE edu_guardian (
  guardian_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家长档案',
  guardian_name VARCHAR(64) NOT NULL COMMENT '核实姓名',
  phone_e164 VARCHAR(16) NOT NULL COMMENT '规范手机号，仅学校维护',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/DISABLED',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (guardian_id),
  UNIQUE uk_guardian_phone (
    phone_e164
  ),
  INDEX idx_guardian_status (status, guardian_id),
  CONSTRAINT ck_guardian_phone CHECK (REGEXP_LIKE(phone_e164, '^\\+861[3-9][0-9]{9}$')),
  CONSTRAINT ck_guardian_status CHECK (status IN ('ACTIVE', 'DISABLED')),
  CONSTRAINT ck_guardian_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='学校核实的家长，手机号不作为前端授权输入'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_guardian_identity (
  identity_binding_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '微信家长绑定',
  guardian_id BIGINT NOT NULL COMMENT '家长',
  identity_id BIGINT NOT NULL COMMENT '外部身份',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/REVOKED',
  phone_verified_at DATETIME(3) NOT NULL COMMENT '真实号码核实时间',
  verification_method VARCHAR(16) NOT NULL COMMENT 'WECHAT_PHONE/MANUAL',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  active_guardian BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN guardian_id END) STORED COMMENT '有效家长唯一槽',
  active_identity BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN identity_id END) STORED COMMENT '有效微信唯一槽',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建主体ID，类型见edu_parent_audit.actor_type，禁止用于鉴权',
  updated_by BIGINT NOT NULL COMMENT '更新主体ID，类型见edu_parent_audit.actor_type，禁止用于鉴权',
  PRIMARY KEY (identity_binding_id),
  UNIQUE uk_active_guardian (
    active_guardian
  ),
  UNIQUE uk_active_identity (
    active_identity
  ),
  INDEX idx_binding_history (guardian_id, created_at),
  CONSTRAINT ck_gi_status CHECK (status IN ('ACTIVE', 'REVOKED')),
  CONSTRAINT ck_gi_method CHECK (verification_method IN ('WECHAT_PHONE', 'MANUAL')),
  CONSTRAINT ck_gi_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='不改变JWT kind的家长资格'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_guardian_invitation (
  invitation_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '一次邀请',
  guardian_id BIGINT NOT NULL COMMENT '已核实家长',
  target_identity_id BIGINT NOT NULL COMMENT '定向微信',
  verification_method VARCHAR(16) NOT NULL COMMENT 'WECHAT_PHONE/MANUAL',
  evidence_ref VARCHAR(128) NOT NULL COMMENT '校方核实依据编号，不放正文',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC截止，创建后24小时',
  status VARCHAR(16) NOT NULL COMMENT 'ISSUED/CONSUMED/REVOKED',
  consumed_binding_id BIGINT NULL COMMENT '消费后绑定',
  verified_by BIGINT NOT NULL COMMENT '核实员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新身份',
  PRIMARY KEY (invitation_id),
  INDEX idx_invitation_target (target_identity_id, status, expires_at),
  INDEX idx_invitation_guardian (guardian_id, status),
  CONSTRAINT ck_inv_status CHECK (status IN ('ISSUED', 'CONSUMED', 'REVOKED')),
  CONSTRAINT ck_inv_method CHECK (verification_method IN ('WECHAT_PHONE', 'MANUAL')),
  CONSTRAINT ck_inv_consumed CHECK ((
    status = 'CONSUMED' AND NOT consumed_binding_id IS NULL
  )
  OR (
    status <> 'CONSUMED' AND consumed_binding_id IS NULL
  )),
  CONSTRAINT ck_inv_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='定向单次限时邀请，不存明文token'
COLLATE=utf8mb4_unicode_ci;

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
  INDEX `idx_material_class` (`class_id`, `operate_time`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退记录表';

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
  liability_qty BIGINT NOT NULL DEFAULT 0 COMMENT '原发放行本轮遗失申报量，不作实物归还',
  written_off_qty BIGINT NOT NULL DEFAULT 0 COMMENT '有权核准免追还数量，不增可用库存',
  CONSTRAINT chk_material_disposal CHECK (liability_qty >= 0 AND written_off_qty >= 0 AND written_off_qty <= base_qty)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退明细表';

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
  INDEX `idx_material_request_goods` (`goods_id`, `request_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_material_request_item';

CREATE TABLE edu_parent_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '审计ID',
  actor_type VARCHAR(8) NOT NULL COMMENT 'STAFF/EXTERNAL',
  actor_id BIGINT NOT NULL COMMENT 'user_id或identity_id，由actor_type解释',
  action_code VARCHAR(64) NOT NULL COMMENT '固定动作',
  target_type VARCHAR(32) NOT NULL COMMENT '对象类型',
  target_id BIGINT NOT NULL COMMENT '对象ID，多态故无外键',
  before_version BIGINT NOT NULL COMMENT '操作前版本，新增为0',
  after_version BIGINT NOT NULL COMMENT '操作后版本',
  reason_ref VARCHAR(128) NOT NULL COMMENT '核实依据或原因编号',
  payload_hash CHAR(64) NOT NULL COMMENT '规范正文摘要',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC发生时间',
  PRIMARY KEY (audit_id),
  INDEX idx_parent_audit (target_type, target_id, audit_id),
  INDEX idx_audit_actor (actor_type, actor_id, created_at),
  CONSTRAINT ck_audit_actor CHECK (actor_type IN ('STAFF', 'EXTERNAL') AND actor_id > 0),
  CONSTRAINT ck_audit_versions CHECK (before_version >= 0 AND after_version >= before_version)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增审计，不写手机号分数正文'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `edu_print_delivery` (
  `delivery_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本次交付',
  `request_id` BIGINT NOT NULL COMMENT '根事项',
  `print_id` BIGINT NOT NULL COMMENT '印品子项',
  `delivery_count` BIGINT NOT NULL COMMENT '本次交付份数，大于0',
  `receiver_user_id` BIGINT NULL COMMENT '校内实际领取人',
  `receiver_name` VARCHAR(64) NOT NULL COMMENT '领取快照，代领不冒充申请人',
  `delivered_by` BIGINT NOT NULL COMMENT '实际发出人',
  `delivered_at` DATETIME(3) NOT NULL COMMENT '发出时间',
  `confirmed_by` BIGINT NULL COMMENT '回执确认人',
  `confirmed_at` DATETIME(3) NULL COMMENT '回执时间',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/CONFIRMED/DISPUTED',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '防重复确认',
  `action_id` BIGINT NOT NULL COMMENT '创建交付动作；确认动作另留action_log',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`delivery_id`),
  UNIQUE `uk_delivery_action` (
    `action_id`
  ),
  INDEX `idx_delivery_print` (`print_id`, `delivery_id`),
  INDEX `idx_delivery_request` (`request_id`, `status`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_delivery';

CREATE TABLE `edu_print_paper_issue` (
  `issue_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '实物事件，无独立issue_item表',
  `request_id` BIGINT NOT NULL COMMENT '所属申请',
  `print_id` BIGINT NOT NULL COMMENT '印品子项',
  `paper_goods_id` BIGINT NOT NULL COMMENT '必须与子项纸张一致',
  `kind` VARCHAR(8) NOT NULL COMMENT 'ISSUE领纸/RETURN验收可用余纸',
  `qty` BIGINT NOT NULL COMMENT '本次基础量，大于0',
  `base_unit` VARCHAR(20) NOT NULL DEFAULT '张' COMMENT '计量快照',
  `original_issue_id` BIGINT NULL COMMENT 'RETURN必填原ISSUE，多次退纸累计不得超可退量',
  `stock_movement_id` BIGINT NULL COMMENT '事务内暂空，提交前必须绑定唯一库存流水；历史回填亦需核对',
  `out_id` BIGINT NULL COMMENT 'ISSUE兼容出库头',
  `in_id` BIGINT NULL COMMENT 'RETURN兼容入库头',
  `operator_user_id` BIGINT NOT NULL COMMENT '经办人',
  `receiver_user_id` BIGINT NOT NULL COMMENT '领纸人/交回人',
  `confirmed_by` BIGINT NOT NULL COMMENT '发出/验收确认人',
  `confirmed_at` DATETIME(3) NOT NULL COMMENT '实物时间',
  `reason` VARCHAR(500) NULL COMMENT '补领/退回原因',
  `action_id` BIGINT NOT NULL COMMENT '幂等动作',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`issue_id`),
  UNIQUE `uk_paper_movement` (
    `stock_movement_id`
  ),
  UNIQUE `uk_paper_action` (
    `action_id`
  ),
  INDEX `idx_paper_print` (`print_id`, `issue_id`),
  INDEX `idx_paper_request` (`request_id`, `issue_id`),
  INDEX `idx_paper_original` (`original_issue_id`),
  INDEX `idx_paper_goods` (`paper_goods_id`, `confirmed_at`),
  INDEX `idx_paper_out` (`out_id`),
  INDEX `idx_paper_in` (`in_id`),
  CONSTRAINT `ck_edu_print_paper_issue_0` CHECK (qty > 0),
  CONSTRAINT `ck_edu_print_paper_issue_1` CHECK (kind IN ('ISSUE', 'RETURN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_paper_issue';

CREATE TABLE `edu_print_record` (
  `print_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '印刷ID',
  `print_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '印刷名称',
  `paper_goods_id` BIGINT NOT NULL COMMENT '用纸物品ID',
  `paper_type` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用纸类型：A3/A4/8K/16K',
  `print_count` BIGINT NOT NULL COMMENT '印刷份数',
  `page_count` BIGINT DEFAULT '1' COMMENT '每份页数/张数',
  `print_side` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '印刷方式(1单页印刷 2双页印刷)',
  `color_category` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '黑白' COMMENT '颜色类别(黑白/彩色，必填，默认黑白)',
  `print_purpose` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '文印用途(≤20份必填，>20份选填，300字内)',
  `template_paper_count` BIGINT DEFAULT '0' COMMENT '模板用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)',
  `preview_paper_count` BIGINT DEFAULT '0' COMMENT '印刷预览用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)',
  `total_pages` BIGINT DEFAULT NULL COMMENT '消耗总张数(份数*页数)',
  `teacher_id` BIGINT DEFAULT NULL COMMENT '申请教师ID，关联edu_teacher',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '年级',
  `class_id` BIGINT DEFAULT NULL COMMENT '班级ID',
  `class_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '班级名称',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `print_time` DATETIME NOT NULL COMMENT '印刷时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态 0-待印刷 1-已完成 2-已作废',
  `out_id` BIGINT DEFAULT NULL COMMENT '关联出库单ID',
  `attachment` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原稿附件',
  `result_img` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '印刷效果图',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  `error_count` BIGINT DEFAULT NULL COMMENT '印刷错误张数',
  `error_remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '印刷错误说明',
  `error_out_id` BIGINT DEFAULT NULL COMMENT '错误关联出库单ID',
  `source_conversation_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源微信导出会话ID',
  `source_message_id` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源微信消息标识',
  PRIMARY KEY (`print_id`),
  INDEX `idx_teacher_id` (`teacher_id`),
  INDEX `idx_error_out_id` (`error_out_id`),
  INDEX `idx_print_source_conv_msg` (`source_conversation_id`, `source_message_id`),
  `request_id` BIGINT NULL COMMENT '新增，1:N普通索引，不能加UK',
  `item_no` INT NOT NULL COMMENT '新增，同一申请稳定子项序号，历史回填后收紧',
  `reprint_of_print_id` BIGINT NULL COMMENT '新增，重印对应原印品，不能覆盖原事实',
  `reprint_reason` VARCHAR(500) NULL COMMENT '新增，重印必填原因',
  `planned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，预计基础用纸，不扣库',
  `issued_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，领纸累计投影',
  `returned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，可用退纸累计投影',
  `consumed_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核销实耗投影，不再扣库',
  `delivered_count` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，实际交付累计，包含待确认和争议中的交付',
  `signed_count` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，只累计CONFIRMED交付份数',
  `production_status` VARCHAR(16) NOT NULL DEFAULT 'PLANNED' COMMENT '新增，PLANNED/PRINTING/FINISHED/STOPPED',
  `settlement_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/PENDING_RETURN/CLOSED/EXCEPTION',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，子项版本，动作还锁根版本',
  `legacy_stock_mode` VARCHAR(16) NOT NULL DEFAULT 'NEW_ISSUE' COMMENT '新增，LEGACY_DEDUCTED/NEW_ISSUE，旧已扣纸隔离',
  UNIQUE `uk_print_request_item` (
    `request_id`,
    `item_no`
  ),
  INDEX `idx_print_request` (`request_id`, `print_id`),
  INDEX `idx_print_class` (`class_id`, `print_time`),
  INDEX `idx_print_goods` (`paper_goods_id`),
  INDEX `idx_print_out_id` (`out_id`),
  INDEX `idx_print_reprint` (`reprint_of_print_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='印刷登记表';

CREATE TABLE `edu_print_settlement` (
  `settlement_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '核销',
  `print_id` BIGINT NOT NULL COMMENT '子项，可反查根',
  `paper_goods_id` BIGINT NOT NULL COMMENT '固定纸张',
  `good_copy_count` BIGINT NOT NULL COMMENT '合格印品份数',
  `good_paper_qty` BIGINT NOT NULL COMMENT '合格品耗纸',
  `template_paper_qty` BIGINT NOT NULL COMMENT '实际制版纸',
  `preview_paper_qty` BIGINT NOT NULL COMMENT '实际试印纸',
  `waste_paper_qty` BIGINT NOT NULL COMMENT '错印及其他已损耗纸',
  `consumed_qty` BIGINT NOT NULL COMMENT '四类实际耗用之和',
  `unused_qty` BIGINT NOT NULL COMMENT '当前未用且尚待处置的纸张，退纸后实时核减',
  `status` VARCHAR(16) NOT NULL COMMENT 'PENDING_RETURN/CLOSED；有未解释差异不能确认核销',
  `request_revision` INT NOT NULL COMMENT '批准内容轮次',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '有效核销版本',
  `confirmed_by` BIGINT NOT NULL COMMENT '核销人',
  `confirmed_at` DATETIME(3) NOT NULL COMMENT '时间',
  `action_id` BIGINT NOT NULL COMMENT '最近核销/专门更正动作，历史由action快照保存',
  `exception_reason` VARCHAR(1000) NULL COMMENT '差异/更正说明',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`settlement_id`),
  UNIQUE `uk_settlement_print_goods` (
    `print_id`,
    `paper_goods_id`
  ),
  CONSTRAINT `ck_edu_print_settlement_0` CHECK (consumed_qty = good_paper_qty + template_paper_qty + preview_paper_qty + waste_paper_qty),
  CONSTRAINT `ck_edu_print_settlement_1` CHECK (unused_qty >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_settlement';

CREATE TABLE `edu_print_source_lock` (
  `source_conversation_id` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`source_conversation_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_bin
COMMENT='微信来源登记事务锁；由数据库持有到提交或回滚';

CREATE TABLE `edu_repair_batch` (
  `batch_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '修复批次号',
  `db_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '执行的目标数据库名',
  `snapshot_hash` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '快照校验哈希',
  `approved_hash` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '审批确认清单哈希',
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '执行状态: PENDING/SUCCESS/ROLLED_BACK/FAILED',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `finish_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `operator` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '执行者',
  `fact_summary` TEXT COLLATE utf8mb4_unicode_ci COMMENT '事实与变更说明',
  PRIMARY KEY (`batch_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='文印数据修复批次表';

CREATE TABLE `edu_repair_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `batch_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '修复批次号',
  `table_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '被修改的数据表名',
  `record_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '数据行主键标识',
  `action_type` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型: UPDATE/DELETE/INSERT',
  `before_json` LONGTEXT COLLATE utf8mb4_unicode_ci COMMENT '修改前数据镜像(JSON)',
  `after_json` LONGTEXT COLLATE utf8mb4_unicode_ci COMMENT '修改后数据镜像(JSON)',
  `reason` TEXT COLLATE utf8mb4_unicode_ci COMMENT '修改原因与证据',
  `is_estimated` TINYINT(1) DEFAULT '0' COMMENT '是否属于估算修正: 0-否, 1-是',
  `create_time` DATETIME NOT NULL COMMENT '记录时间',
  PRIMARY KEY (`id`),
  INDEX `idx_batch_id` (`batch_id`),
  INDEX `idx_table_record` (`table_name`, `record_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='文印数据修复行级变更日志表';

CREATE TABLE `edu_repair_stock_baseline` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `batch_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '修复批次号',
  `goods_id` BIGINT NOT NULL COMMENT '物资ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物资名称',
  `conversion_rate` INT NOT NULL COMMENT '每箱张数换算率',
  `physical_estimate` INT NOT NULL COMMENT '估计实盘张数',
  `physical_min` INT DEFAULT NULL COMMENT '估计实盘区间下限',
  `physical_max` INT DEFAULT NULL COMMENT '估计实盘区间上限',
  `reserved_sheets` INT NOT NULL DEFAULT '0' COMMENT '待打印预占张数',
  `available_sheets` INT NOT NULL COMMENT '系统可用张数',
  `stock_num` INT NOT NULL COMMENT '折合整箱数',
  `remain_sheets` INT NOT NULL COMMENT '散张零头数',
  `count_date` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '盘点估算日期',
  `count_time_precision` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '时间精度说明',
  `remark` TEXT COLLATE utf8mb4_unicode_ci COMMENT '基准建立说明与历史差异声明',
  `create_time` DATETIME NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_batch_goods` (`batch_id`, `goods_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='文印纸张库存基准表';

CREATE TABLE edu_roster_import (
  batch_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '名册预览批次',
  status VARCHAR(16) NOT NULL COMMENT 'PREVIEW/COMMITTED',
  payload_json JSON NOT NULL COMMENT '服务端解析的规范名册，30日清理后空数组',
  errors_json JSON NOT NULL COMMENT '行级固定错误码',
  confirmation_hash CHAR(64) NOT NULL COMMENT '完整名册摘要',
  row_count INT NOT NULL COMMENT '数据行数',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC提交截止',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '仅创建员工能读正文',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (batch_id),
  INDEX idx_roster_owner (created_by, created_at, batch_id),
  INDEX idx_roster_expiry (status, expires_at),
  CONSTRAINT ck_roster_status CHECK (status IN ('PREVIEW', 'COMMITTED')),
  CONSTRAINT ck_roster_count CHECK (row_count BETWEEN 1 AND 5000),
  CONSTRAINT ck_roster_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='名册上传后预览确认，不接受前端替换暂存行'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_score_import (
  batch_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '成绩预览批次',
  exam_class_id BIGINT NOT NULL COMMENT '班级根',
  source_version BIGINT NOT NULL COMMENT '预览时班级版本',
  status VARCHAR(16) NOT NULL COMMENT 'PREVIEW/COMMITTED',
  payload_json JSON NOT NULL COMMENT '服务端解析行，30日后清空',
  errors_json JSON NOT NULL COMMENT '行错误码',
  confirmation_hash CHAR(64) NOT NULL COMMENT '全部规范行摘要',
  row_count INT NOT NULL COMMENT '行数',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC24小时截止',
  committed_class_version BIGINT NULL COMMENT '成功提交的班级版本',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '批次版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (batch_id),
  INDEX idx_score_batch_owner (created_by, created_at),
  INDEX idx_score_batch_root (exam_class_id, status),
  CONSTRAINT ck_si_status CHECK (status IN ('PREVIEW', 'COMMITTED')),
  CONSTRAINT ck_si_count CHECK (row_count BETWEEN 1 AND 5000),
  CONSTRAINT ck_si_versions CHECK (version >= 0
  AND source_version >= 0
  AND (
    committed_class_version IS NULL OR committed_class_version > source_version
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='成绩上传预览确认'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_score_release (
  release_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '不可变发布版本标识',
  exam_class_id BIGINT NOT NULL COMMENT '考试班级',
  release_no INT NOT NULL COMMENT '递增发布号',
  status VARCHAR(16) NOT NULL COMMENT 'PUBLISHED/WITHDRAWN',
  reason_ref VARCHAR(128) NOT NULL COMMENT '发布依据编号',
  withdrawn_reason_ref VARCHAR(128) NULL COMMENT '撤回依据编号',
  published_at DATETIME(3) NOT NULL COMMENT 'UTC发布时间',
  withdrawn_at DATETIME(3) NULL COMMENT 'UTC撤回时间',
  withdrawn_by BIGINT NULL COMMENT '撤回员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '仅撤回状态版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC状态更新',
  created_by BIGINT NOT NULL COMMENT '发布员工',
  updated_by BIGINT NOT NULL COMMENT '最后状态员工',
  PRIMARY KEY (release_id),
  UNIQUE uk_release_no (
    exam_class_id,
    release_no
  ),
  INDEX idx_release_visible (exam_class_id, status, release_no),
  CONSTRAINT ck_release_status CHECK (status IN ('PUBLISHED', 'WITHDRAWN')),
  CONSTRAINT ck_release_withdraw CHECK ((
    status = 'PUBLISHED'
    AND withdrawn_at IS NULL
    AND withdrawn_by IS NULL
    AND withdrawn_reason_ref IS NULL
  )
  OR (
    status = 'WITHDRAWN'
    AND NOT withdrawn_at IS NULL
    AND NOT withdrawn_by IS NULL
    AND NOT withdrawn_reason_ref IS NULL
  )),
  CONSTRAINT ck_release_version CHECK (release_no > 0 AND version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='发布正文只增，状态可撤回'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_score_snapshot (
  snapshot_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '学生成绩不可变快照',
  release_id BIGINT NOT NULL COMMENT '发布版本',
  student_id BIGINT NOT NULL COMMENT '学生',
  class_id BIGINT NOT NULL COMMENT '考试当时班级',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '当时学号',
  student_name VARCHAR(64) NOT NULL COMMENT '当时姓名',
  subjects_json JSON NOT NULL COMMENT '本人各科代码名称分数满分状态和应计标志，不含排名等级评语',
  total_score DECIMAL(12, 2) NULL COMMENT '应计科全SCORE才有值',
  total_full_score DECIMAL(12, 2) NULL COMMENT '总分分母，同步NULL',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '发布员工',
  PRIMARY KEY (snapshot_id),
  UNIQUE uk_snapshot_student (
    release_id,
    student_id
  ),
  INDEX idx_snapshot_history (student_id, release_id),
  CONSTRAINT ck_snapshot_total CHECK ((
    total_score IS NULL AND total_full_score IS NULL
  )
  OR (
    total_score >= 0 AND total_full_score > 0 AND total_score <= total_full_score
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增不可更新成绩正文'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `edu_stock_check` (
  `check_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '盘点单ID',
  `check_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '盘点单号',
  `check_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '盘点范围 1-全量 2-按分类',
  `category` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '盘点分类',
  `check_time` DATETIME NOT NULL COMMENT '盘点时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '盘点人',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态 1-待审核 2-已审核 3-已作废',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`check_id`),
  UNIQUE `uk_check_no` (
    `check_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，单次盘点事项，历史可空',
  `baseline_at` DATETIME(3) NULL COMMENT '新增，基准时点；边界不能仅靠时间戳',
  `counted_by` BIGINT NULL COMMENT '新增，实际盘点人身份',
  `reviewer_user_id` BIGINT NULL COMMENT '新增，独立复核人，不能等于counted_by',
  `review_status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '新增，DRAFT/COUNTING/PENDING_REVIEW/RETURNED/APPROVED/CANCELLED',
  `review_round` INT NOT NULL DEFAULT 1 COMMENT '新增，复盘轮次',
  `reviewed_at` DATETIME(3) NULL COMMENT '新增',
  `review_comment` VARCHAR(1000) NULL COMMENT '新增，差异处置和退回原因',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，防重复批准',
  UNIQUE `uk_check_request` (
    `request_id`
  ),
  INDEX `idx_check_review` (`review_status`, `reviewer_user_id`, `baseline_at`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='库存盘点单表';

CREATE TABLE `edu_stock_check_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `check_id` BIGINT NOT NULL COMMENT '盘点单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `book_num` BIGINT NOT NULL COMMENT '账面库存',
  `real_num` BIGINT NOT NULL COMMENT '实盘库存',
  `diff_num` BIGINT NOT NULL COMMENT '差异数量(实盘-账面)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_check_id` (`check_id`),
  `baseline_goods_version` BIGINT NOT NULL COMMENT '新增，逐物品基准版本',
  `baseline_movement_id` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，该物品基准已包含的最后流水',
  `reconciled_movement_id` BIGINT NULL COMMENT '新增，复核核清到的该物品流水',
  `period_in_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核对后的期间收进',
  `period_out_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核对后的期间发出',
  counted_at DATETIME(3) NULL,
  `diff_reason` VARCHAR(1000) NULL COMMENT '新增，差异原因',
  `adjustment_movement_id` BIGINT NULL COMMENT '新增，批准产生的调整流水',
  UNIQUE `uk_check_goods` (
    `check_id`,
    `goods_id`
  ),
  UNIQUE `uk_check_adjustment` (
    `adjustment_movement_id`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='库存盘点单明细表';

CREATE TABLE `edu_stock_in` (
  `in_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '入库ID',
  `in_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库单号',
  `in_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库类型：1-采购 2-调拨 3-其他',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '供应商ID',
  `in_time` DATETIME NOT NULL COMMENT '入库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  `declared_package_count` INT DEFAULT NULL COMMENT '历史进货确认的总箱数，纸型可待核实',
  `declared_amount` DECIMAL(12, 2) DEFAULT NULL COMMENT '历史进货确认的总金额',
  PRIMARY KEY (`in_id`),
  UNIQUE `uk_in_no` (
    `in_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，归还/余纸退回/验收事项',
  `acceptance_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/PARTIAL/ACCEPTED/EXCEPTION',
  `source_type` VARCHAR(32) NULL COMMENT '新增，PRINT_RETURN/MATERIAL_RETURN/ARRIVAL等',
  `source_id` BIGINT NULL COMMENT '新增，来源记录',
  `action_id` BIGINT NULL COMMENT '新增，确认动作，历史可空',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_in_action` (
    `action_id`
  ),
  INDEX `idx_in_request` (`request_id`, `in_time`),
  INDEX `idx_in_supplier` (`supplier_id`, `in_time`),
  INDEX `idx_in_status_time` (`status`, `in_time`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单主表';

CREATE TABLE `edu_stock_in_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `in_id` BIGINT NOT NULL COMMENT '入库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `price` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '单价',
  `amount` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '小计',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_in_id` (`in_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，验收可用基础量',
  `arrived_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，实到基础量',
  `rejected_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，破损拒收基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，唯一统一流水',
  INDEX `idx_in_item_goods` (`goods_id`, `in_id`),
  UNIQUE `uk_in_item_movement` (
    `movement_id`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单明细表';

CREATE TABLE `edu_stock_out` (
  `out_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '出库ID',
  `out_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库单号',
  `out_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库类型：1-教师领用 2-学生领书 3-耗材出库',
  `receiver` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '领用人/班级',
  `class_id` BIGINT DEFAULT NULL COMMENT '关联班级ID',
  `out_time` DATETIME NOT NULL COMMENT '出库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`out_id`),
  UNIQUE `uk_out_no` (
    `out_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，同事项可多次发放',
  `receiver_user_id` BIGINT NULL COMMENT '新增，校内领取身份；非账号不虚构ID',
  `class_name` VARCHAR(50) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `grade` VARCHAR(20) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `receipt_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/CONFIRMED/DISPUTED',
  `action_id` BIGINT NULL COMMENT '新增',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_out_action` (
    `action_id`
  ),
  INDEX `idx_out_request` (`request_id`, `out_time`),
  INDEX `idx_out_class` (`class_id`, `out_time`),
  INDEX `idx_out_status_time` (`status`, `out_time`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单主表';

CREATE TABLE `edu_stock_out_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `out_id` BIGINT NOT NULL COMMENT '出库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_out_id` (`out_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，实际发出基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，复用同一流水，不再生成一次',
  INDEX `idx_out_item_goods` (`goods_id`, `out_id`),
  UNIQUE `uk_out_item_movement` (
    `movement_id`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单明细表';

CREATE TABLE edu_student (
  student_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '正式学生ID',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '全校唯一学号，禁止改名匹配',
  student_name VARCHAR(64) NOT NULL COMMENT '学校核实的学生姓名',
  campus_id VARCHAR(32) NOT NULL COMMENT '复用现校区标识',
  class_id BIGINT NOT NULL COMMENT '当前班级',
  entry_year SMALLINT NOT NULL COMMENT '入学年度',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/GRADUATED/LEFT/DISABLED',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工ID',
  updated_by BIGINT NOT NULL COMMENT '更新员工ID',
  PRIMARY KEY (student_id),
  UNIQUE uk_student_no (
    student_no
  ),
  INDEX idx_student_class (class_id, status, student_id),
  INDEX idx_student_campus (campus_id, status),
  CONSTRAINT ck_student_status CHECK (status IN ('ACTIVE', 'GRADUATED', 'LEFT', 'DISABLED')),
  CONSTRAINT ck_student_year CHECK (entry_year BETWEEN 1900 AND 2200),
  CONSTRAINT ck_student_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='正式学籍，不从招生预约推导'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_student_class_history (
  history_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '转班历史ID',
  student_id BIGINT NOT NULL COMMENT '学生',
  from_class_id BIGINT NOT NULL COMMENT '旧班',
  to_class_id BIGINT NOT NULL COMMENT '新班',
  from_campus_id VARCHAR(32) NOT NULL COMMENT '旧校区',
  to_campus_id VARCHAR(32) NOT NULL COMMENT '新校区',
  reason_ref VARCHAR(128) NOT NULL COMMENT '核实依据编号',
  effective_at DATETIME(3) NOT NULL COMMENT 'UTC生效时间',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '操作员工',
  PRIMARY KEY (history_id),
  INDEX idx_student_history (student_id, effective_at, history_id),
  CONSTRAINT ck_history_change CHECK (from_class_id <> to_class_id OR from_campus_id <> to_campus_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增转班历史'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edu_student_guardian (
  link_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '监护关系',
  student_id BIGINT NOT NULL COMMENT '正式学生',
  guardian_id BIGINT NOT NULL COMMENT '家长',
  relation VARCHAR(8) NOT NULL COMMENT 'FATHER/MOTHER/OTHER',
  status VARCHAR(16) NOT NULL COMMENT 'VERIFIED/REVOKED',
  verified_by BIGINT NOT NULL COMMENT '学校核实员工',
  verified_at DATETIME(3) NOT NULL COMMENT 'UTC核实时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (link_id),
  UNIQUE uk_student_guardian (
    student_id,
    guardian_id
  ),
  INDEX idx_link_guardian (guardian_id, status, student_id),
  CONSTRAINT ck_link_relation CHECK (relation IN ('FATHER', 'MOTHER', 'OTHER')),
  CONSTRAINT ck_link_status CHECK (status IN ('VERIFIED', 'REVOKED')),
  CONSTRAINT ck_link_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='核实关系独立于微信和员工资格'
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `edu_supplier` (
  `supplier_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `supplier_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商名称',
  `contact` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系人',
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系电话',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`supplier_id`),
  UNIQUE `uk_supplier_name` (
    `supplier_name`
  ),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '供应商并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='供应商表';

CREATE TABLE `edu_teacher` (
  `teacher_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '教师ID',
  `teacher_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教年级',
  `class_ids` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教班级ID，多个用逗号分隔',
  `subject` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`teacher_id`),
  INDEX `idx_grade` (`grade`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教职工档案表';

CREATE TABLE family_notice (
  notice_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家校通知ID',
  title VARCHAR(100) NOT NULL COMMENT '通知标题',
  content TEXT NOT NULL COMMENT '纯文本正文，不含可执行HTML',
  audience_type VARCHAR(16) NOT NULL COMMENT 'SCHOOL/GRADE/CLASS/STUDENT',
  audience_json JSON NOT NULL COMMENT '发布前范围配置，发布后不变',
  ack_required TINYINT NOT NULL DEFAULT 0 COMMENT '是否要求明确确认',
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/WITHDRAWN',
  correction_of_notice_id BIGINT NULL COMMENT '新通知更正的原通知',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_by_user_id BIGINT NOT NULL COMMENT '真实创建职工',
  created_at DATETIME(3) NOT NULL COMMENT '创建UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '更新UTC时间',
  published_by_user_id BIGINT NULL COMMENT '发布职工',
  published_at DATETIME(3) NULL COMMENT '正式发布UTC时间',
  withdrawn_at DATETIME(3) NULL COMMENT '撤回UTC时间',
  PRIMARY KEY (notice_id),
  INDEX idx_family_notice_state (status, notice_id),
  CONSTRAINT ck_fn_state CHECK (status IN ('DRAFT', 'PUBLISHED', 'WITHDRAWN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='家校通知，与员工内部通知分域';

CREATE TABLE family_notice_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '不可变业务动作',
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  actor_type VARCHAR(16) NOT NULL COMMENT 'STAFF/EXTERNAL',
  actor_id BIGINT NOT NULL COMMENT 'STAFF为user_id，EXTERNAL为identity_id',
  action_code VARCHAR(32) NOT NULL COMMENT 'CREATE/UPDATE/PUBLISH/WITHDRAW/READ/ACK',
  student_id BIGINT NULL COMMENT '家长动作的孩子，后台动作可空',
  reason VARCHAR(500) NULL COMMENT '撤回等说明，不存正文或手机号',
  created_at DATETIME(3) NOT NULL COMMENT '动作UTC时间',
  PRIMARY KEY (audit_id),
  INDEX idx_fna_notice (notice_id, audit_id),
  CONSTRAINT ck_fna_actor CHECK (actor_type IN ('STAFF', 'EXTERNAL'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='不以actor_id冒充混合外键，按actor_type校验来源';

CREATE TABLE family_notice_file (
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  file_id BIGINT NOT NULL COMMENT '私有附件ID',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  PRIMARY KEY (notice_id, file_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知授权下载边界，不产生公共URL';

CREATE TABLE family_notice_receipt (
  receipt_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家长回执ID',
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  student_id BIGINT NOT NULL COMMENT '当前所查看的孩子',
  guardian_id BIGINT NOT NULL COMMENT '真实家长档案',
  read_at DATETIME(3) NULL COMMENT '首次阅读UTC时间',
  acknowledged_at DATETIME(3) NULL COMMENT '首次明确确认UTC时间',
  created_at DATETIME(3) NOT NULL COMMENT '建立UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '最后动作UTC时间',
  PRIMARY KEY (receipt_id),
  UNIQUE uk_fnr (
    notice_id,
    student_id,
    guardian_id
  ),
  INDEX idx_fnr_summary (notice_id, student_id, acknowledged_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐家长逐孩子独立阅读与确认';

CREATE TABLE family_notice_student (
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  student_id BIGINT NOT NULL COMMENT '正式接收学生快照',
  class_id BIGINT NOT NULL COMMENT '发布时班级快照',
  campus_id VARCHAR(32) NOT NULL COMMENT '发布时校区快照',
  created_at DATETIME(3) NOT NULL COMMENT '发布UTC时间',
  PRIMARY KEY (notice_id, student_id),
  INDEX idx_fns_student (student_id, notice_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='学生收件范围不可随转班重算';

CREATE TABLE `gen_table` (
  `table_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '编号',
  `table_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '表名称',
  `table_comment` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '表描述',
  `sub_table_name` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联子表的表名',
  `sub_table_fk_name` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '子表关联的外键名',
  `class_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实体类名称',
  `tpl_category` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'crud' COMMENT '使用的模板（crud单表操作 tree树表操作）',
  `tpl_web_type` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '前端模板类型（element-ui模版 element-plus模版）',
  `package_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成包路径',
  `module_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成模块名',
  `business_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成业务名',
  `function_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成功能名',
  `function_author` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成功能作者',
  `gen_type` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '生成代码方式（0zip压缩包 1自定义路径）',
  `gen_path` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '/' COMMENT '生成路径（不填默认项目路径）',
  `options` VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '其它生成选项',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`table_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='代码生成业务表';

CREATE TABLE `gen_table_column` (
  `column_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '编号',
  `table_id` BIGINT DEFAULT NULL COMMENT '归属表编号',
  `column_name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列名称',
  `column_comment` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列描述',
  `column_type` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列类型',
  `java_type` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JAVA类型',
  `java_field` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JAVA字段名',
  `is_pk` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否主键（1是）',
  `is_increment` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否自增（1是）',
  `is_required` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否必填（1是）',
  `is_insert` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否为插入字段（1是）',
  `is_edit` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否编辑字段（1是）',
  `is_list` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否列表字段（1是）',
  `is_query` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否查询字段（1是）',
  `query_type` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'EQ' COMMENT '查询方式（等于、不等于、大于、小于、范围）',
  `html_type` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '显示类型（文本框、文本域、下拉框、复选框、单选框、日期控件）',
  `dict_type` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `sort` INT DEFAULT NULL COMMENT '排序',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`column_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='代码生成业务表字段';

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
  CONSTRAINT chk_mrii_qty CHECK (qty > 0),
  CONSTRAINT chk_mrii_condition CHECK (condition_code IN ('GOOD', 'REUSABLE', 'DAMAGED')),
  CONSTRAINT chk_mrii_active CHECK (active_source_item_id IS NULL OR active_source_item_id = original_issue_item_id),
  INDEX idx_mrii_original (original_issue_item_id, intent_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1归还意向原单明细，未验收不记实物归还和库存';

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
  INDEX `idx_action_task` (`task_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_action_log';

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
  INDEX `idx_request_dept` (`applicant_dept_id`, `biz_type`, `status`, `created_at`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request';

CREATE TABLE `office_request_file` (
  `link_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '绑定',
  `request_id` BIGINT NOT NULL COMMENT '授权边界',
  `file_id` BIGINT NOT NULL COMMENT 'sys_file',
  `purpose` VARCHAR(24) NOT NULL COMMENT 'ORIGINAL/RESULT/RECEIPT/CHECK_EVIDENCE等',
  `record_scope_id` BIGINT NOT NULL DEFAULT 0 COMMENT '0整事项，非0为biz_type下print_id等子项，强制校验归属',
  `revision` INT NOT NULL COMMENT '内容/证据修订',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  `linked_by` BIGINT NOT NULL COMMENT '绑定人',
  `linked_at` DATETIME(3) NOT NULL COMMENT '时间',
  PRIMARY KEY (`link_id`),
  UNIQUE `uk_request_file` (
    `request_id`,
    `file_id`,
    `purpose`,
    `record_scope_id`
  ),
  INDEX `idx_file_bindings` (`file_id`),
  INDEX `idx_request_file_scope` (`request_id`, `purpose`, `record_scope_id`, `revision`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request_file';

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
  INDEX `idx_task_target` (`target_type`, `target_id`, `status`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_task';

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
  CHECK (total_cents >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1采购办理，不代表付款';

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
  CHECK (ordered_qty > 0
  AND accepted_qty >= 0
  AND accepted_qty <= ordered_qty
  AND unit_price_cents >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='按基础单位计量及分批验收';

CREATE TABLE procurement_receipt (
  receipt_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '验收事实ID',
  order_item_id BIGINT NOT NULL COMMENT '采购明细ID',
  qty BIGINT NOT NULL COMMENT '本次基础数量',
  movement_id BIGINT NULL UNIQUE COMMENT '同事务库存流水，提交前回填',
  action_id BIGINT NOT NULL UNIQUE COMMENT '真实业务动作',
  accepted_by BIGINT NOT NULL COMMENT '验收员工',
  accepted_at DATETIME(3) NOT NULL COMMENT '验收UTC时间',
  CHECK (qty > 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='实收合格量才入库，流水事务内回填';

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
  CONSTRAINT ck_recruit_action_actor CHECK (NOT actor_user_id IS NULL OR NOT actor_identity_id IS NULL),
  CONSTRAINT ck_recruit_action_code CHECK (action_code IN ('CREATE', 'CANCEL', 'CONFIRM', 'VERIFY', 'REMARK'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='预约状态和接待备注审计，与预约及通知同事务';

CREATE TABLE recruit_assignment (
  request_id BIGINT NOT NULL UNIQUE COMMENT '独立分派及改期事项根',
  assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '预约分派ID',
  appointment_id BIGINT NOT NULL UNIQUE COMMENT '既有真实预约',
  shift_id BIGINT NOT NULL COMMENT '接待班次ID',
  assigned_by BIGINT NOT NULL COMMENT '真实分派员工',
  assigned_at DATETIME(3) NOT NULL COMMENT '分派UTC时间'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='一次预约的当前班次，改期保留动作轨迹';

CREATE TABLE recruit_campus_scope (
  campus_id VARCHAR(32) NOT NULL COMMENT '既有校区字符串ID，不等于dept_id',
  dept_id BIGINT NOT NULL COMMENT '可办理该校区的学校部门；还须动作权限及数据范围',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC授权配置时间',
  PRIMARY KEY (campus_id, dept_id),
  INDEX idx_recruit_scope_dept (dept_id, campus_id)   COMMENT '按有效员工部门范围查询校区预约'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生校区与学校部门授权映射，不将校区ID强转数字';

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
  INDEX idx_followup_due (assignee_user_id, status, due_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='回访任务和到校事实分开';

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
  CONSTRAINT ck_recruit_notice_read CHECK (is_read IN (0, 1)),
  CONSTRAINT ck_recruit_notice_provider CHECK (provider_status IN ('NOT_REQUESTED', 'PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生访客站内通知；未接真实微信发送不记录已发送';

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

CREATE TABLE recruit_subscription_consent (
  consent_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '微信订阅选择回执ID',
  identity_id BIGINT NOT NULL COMMENT '真实微信外部身份',
  template_id VARCHAR(128) NOT NULL COMMENT '服务端允许的微信模板ID',
  decision VARCHAR(8) NOT NULL COMMENT 'accept、reject、ban客户端本次选择',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC接收时间',
  PRIMARY KEY (consent_id),
  INDEX idx_recruit_consent_identity (identity_id, template_id, consent_id)   COMMENT '本人模板选择历史，不视为无限发送授权',
  CONSTRAINT ck_recruit_consent_decision CHECK (decision IN ('accept', 'reject', 'ban'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='只保存本次订阅弹窗结果，授权不等于发送或送达';

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
  INDEX idx_repair_assignee (assignee_user_id, status)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='受理、维修、本人验收分开';

CREATE TABLE resource_booking (
  booking_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '预约ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  resource_id BIGINT NOT NULL COMMENT '公共资源ID',
  starts_at DATETIME(3) NOT NULL COMMENT '开始UTC时间，含边界',
  ends_at DATETIME(3) NOT NULL COMMENT '结束UTC时间，不含边界',
  purpose VARCHAR(500) NOT NULL COMMENT '真实预约用途',
  attendee_count INT NOT NULL COMMENT '预计到场人数',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  CHECK (ends_at > starts_at AND attendee_count > 0),
  INDEX idx_booking_overlap (resource_id, status, starts_at, ends_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='资源行锁下校验半开区间重叠';

CREATE TABLE school_open_day (
  event_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '独立开放日活动ID',
  campus_id VARCHAR(32) NOT NULL COMMENT '校区ID，类型与既有校区一致',
  title VARCHAR(128) NOT NULL COMMENT '活动标题',
  visit_date DATE NOT NULL COMMENT '上海日历日期',
  registration_start DATETIME(3) NOT NULL COMMENT '报名开始UTC',
  registration_end DATETIME(3) NOT NULL COMMENT '报名结束UTC',
  cancel_deadline DATETIME(3) NOT NULL COMMENT '家长取消截止UTC',
  handover_area VARCHAR(255) NOT NULL COMMENT '指定交接区域；发布后不可静默修改',
  instructions VARCHAR(4000) NOT NULL COMMENT '入校须知，不存身份证号',
  scope_type VARCHAR(16) NOT NULL COMMENT 'ALL_ACTIVE全校区在校/CLASS指定班/STUDENT指定孩子',
  scope_ids_json JSON NOT NULL COMMENT '指定班级或学生ID数组；发布时解析冻结，非任意SQL',
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/STOPPED/CANCELLED/ENDED',
  scope_frozen_at DATETIME(3) NULL COMMENT '发布时适用学生名单冻结时间',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '配置与状态乐观版本',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后修改时间',
  PRIMARY KEY (event_id),
  UNIQUE uk_open_day_campus (
    event_id,
    campus_id
  ),
  INDEX idx_open_day_catalog (campus_id, status, visit_date),
  CONSTRAINT ck_open_day_state CHECK (status IN ('DRAFT', 'PUBLISHED', 'STOPPED', 'CANCELLED', 'ENDED')),
  CONSTRAINT ck_open_day_scope_type CHECK (scope_type IN ('ALL_ACTIVE', 'CLASS', 'STUDENT')
  AND JSON_TYPE(scope_ids_json) = 'ARRAY'),
  CONSTRAINT ck_open_day_windows CHECK (registration_start < registration_end AND registration_start <= cancel_deadline),
  CONSTRAINT ck_open_day_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='在校家长开放日；独立招生域';

CREATE TABLE school_open_day_notice (
  notice_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '可靠站内通知ID',
  event_id BIGINT NOT NULL COMMENT '变更活动',
  guardian_id BIGINT NOT NULL COMMENT '预约创建监护人；其他监护人不收订单隐私',
  event_version BIGINT NOT NULL COMMENT '触发变更的活动版本',
  notice_kind VARCHAR(24) NOT NULL COMMENT 'CREATED/CANCELLED/STOPPED/ENDED/ANNOUNCED',
  title VARCHAR(128) NOT NULL COMMENT '通知标题',
  content VARCHAR(8000) NOT NULL COMMENT '变更内容与操作说明；不含同行联系方式',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '业务事务内持久化时间即站内可见时间',
  PRIMARY KEY (notice_id),
  UNIQUE uk_open_day_notice (
    event_id,
    guardian_id,
    event_version,
    notice_kind
  ),
  INDEX idx_open_day_notice_inbox (guardian_id, notice_id),
  CONSTRAINT ck_open_day_notice_kind CHECK (notice_kind IN ('CREATED', 'CANCELLED', 'STOPPED', 'ENDED', 'ANNOUNCED'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='无需外部推送成功的可靠家长站内通知';

CREATE TABLE school_open_day_scope_student (
  event_id BIGINT NOT NULL COMMENT '开放日活动',
  student_id BIGINT NOT NULL COMMENT '适用学生快照，不因升班自动扩展',
  campus_id VARCHAR(32) NOT NULL COMMENT '冻结时校区',
  frozen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '快照时间',
  PRIMARY KEY (event_id, student_id),
  INDEX idx_open_day_scope_student (student_id, event_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日适用在校学生范围快照';

CREATE TABLE school_open_day_slot (
  slot_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '活动时段ID',
  event_id BIGINT NOT NULL COMMENT '所属开放日活动',
  starts_at DATETIME(3) NOT NULL COMMENT '到访时段开始UTC',
  ends_at DATETIME(3) NOT NULL COMMENT '到访时段结束UTC',
  quota INT NOT NULL COMMENT '总预约实名访客容量，不是实时在场容量',
  reserved_visitors INT NOT NULL DEFAULT 0 COMMENT '当前有效预约占用的实名访客数量',
  max_visitors_per_booking INT NOT NULL COMMENT '每单实名访客上限',
  PRIMARY KEY (slot_id),
  UNIQUE uk_open_day_slot_event (
    event_id,
    slot_id
  ),
  INDEX idx_open_day_slot_time (event_id, starts_at),
  CONSTRAINT ck_open_day_slot_time CHECK (starts_at < ends_at),
  CONSTRAINT ck_open_day_slot_capacity CHECK (quota > 0
  AND reserved_visitors >= 0
  AND reserved_visitors <= quota
  AND max_visitors_per_booking BETWEEN 1 AND 20)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日多时段预约容量';

CREATE TABLE school_open_day_staff_scope (
  user_id BIGINT NOT NULL COMMENT '获开放日校区范围的员工',
  campus_id VARCHAR(32) NOT NULL COMMENT '授权校区',
  active TINYINT NOT NULL DEFAULT 1 COMMENT '1有效0撤销；不授予业务权限',
  PRIMARY KEY (user_id, campus_id),
  CONSTRAINT ck_open_day_scope_active CHECK (active IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日员工校区范围';

CREATE TABLE school_visit_action (
  action_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '事务幂等命令ID',
  action_code VARCHAR(40) NOT NULL COMMENT '服务端固定动作',
  actor_key VARCHAR(96) NOT NULL COMMENT 'STAFF:userId或IDENTITY:identityId，服务端派生',
  actor_identity_id BIGINT NULL COMMENT '外部身份审计；后台原生员工可空',
  actor_user_id BIGINT NULL COMMENT '员工账号审计；家长可空',
  idempotency_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '调用方随机重试键',
  payload_hash CHAR(64) NOT NULL COMMENT '规范目标加正文摘要，永不返回',
  result_json JSON NULL COMMENT '最终脱敏业务响应，用于同键重放，不含token或内部摘要',
  result_http INT NULL COMMENT '最终HTTP码',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '命令写入时间',
  PRIMARY KEY (action_id),
  UNIQUE uk_visit_action (
    action_code,
    actor_key,
    idempotency_key
  ),
  CONSTRAINT ck_visit_action_actor CHECK (NOT actor_identity_id IS NULL OR NOT actor_user_id IS NULL),
  CONSTRAINT ck_visit_action_http CHECK (result_http IS NULL OR result_http IN (200, 201))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日独立命令幂等；不借用办公申请根';

CREATE TABLE school_visit_booking (
  booking_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '开放日预约ID',
  event_id BIGINT NOT NULL COMMENT '开放日活动',
  slot_id BIGINT NOT NULL COMMENT '时段',
  creator_guardian_id BIGINT NOT NULL COMMENT '唯一订单管理人；不把另一个监护人视作订单所有人',
  creator_identity_id BIGINT NOT NULL COMMENT '创建时身份审计',
  status VARCHAR(16) NOT NULL DEFAULT 'BOOKED' COMMENT 'BOOKED有效/CANCELLED家长取消/VOID活动停办未入校作废',
  active_guardian_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'BOOKED' THEN creator_guardian_id ELSE NULL END) STORED COMMENT '有效预约唯一占位；无效历史允许重复',
  visitor_count INT NOT NULL COMMENT '实名到访人员数；不是孩子数',
  visitors_hash CHAR(64) NOT NULL COMMENT '服务端规范实名访客列表摘要，仅内部使用',
  version BIGINT NOT NULL DEFAULT 1 COMMENT '整单版本；添加孩子、取消更新',
  cancelled_at DATETIME(3) NULL COMMENT '取消或作废时间',
  cancel_reason VARCHAR(500) NULL COMMENT '取消原因',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '预约时间',
  PRIMARY KEY (booking_id),
  UNIQUE uk_visit_booking_event (
    event_id,
    booking_id
  ),
  UNIQUE uk_visit_guardian_active (
    event_id,
    active_guardian_id
  ),
  INDEX idx_visit_booking_slot (slot_id, status, booking_id),
  INDEX idx_visit_booking_creator (creator_guardian_id, booking_id),
  CONSTRAINT ck_visit_booking_status CHECK (status IN ('BOOKED', 'CANCELLED', 'VOID')),
  CONSTRAINT ck_visit_booking_numbers CHECK (visitor_count BETWEEN 1 AND 20 AND version >= 1)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日一位预约人一有效单';

CREATE TABLE school_visit_booking_student (
  booking_student_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '预约孩子关联ID',
  event_id BIGINT NOT NULL COMMENT '冗余活动用于物理唯一约束',
  booking_id BIGINT NOT NULL COMMENT '所属预约',
  student_id BIGINT NOT NULL COMMENT '本人有效关联学生',
  active TINYINT NOT NULL DEFAULT 1 COMMENT '1有效占位0随整单撤销释放',
  active_student_id BIGINT GENERATED ALWAYS AS (CASE WHEN active = 1 THEN student_id ELSE NULL END) STORED COMMENT '同活动同孩子有效唯一占位',
  student_name_snapshot VARCHAR(64) NOT NULL COMMENT '登记时学生姓名；只向订单所有人及授权员工展示',
  PRIMARY KEY (booking_student_id),
  UNIQUE uk_visit_student_history (
    booking_id,
    student_id
  ),
  UNIQUE uk_visit_student_active (
    event_id,
    active_student_id
  ),
  INDEX idx_visit_student_booking (booking_id, student_id),
  CONSTRAINT ck_visit_student_active CHECK (active IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='预约一对多孩子及唯一有效占位';

CREATE TABLE school_visit_movement (
  movement_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '入离校不可覆盖审计事件',
  visitor_id BIGINT NOT NULL COMMENT '具体实名到访人',
  action_id BIGINT NOT NULL COMMENT '产生此事件的幂等动作',
  movement_kind VARCHAR(24) NOT NULL COMMENT 'ENTER/EXIT/EXIT_VERIFIED',
  source VARCHAR(24) NOT NULL COMMENT 'STAFF/PARENT_SELF/MANUAL_VERIFIED',
  actor_identity_id BIGINT NULL COMMENT '操作外部身份，后台原生员工可空',
  actor_user_id BIGINT NULL COMMENT '操作员工；家长自报可空',
  actual_at DATETIME(3) NULL COMMENT '明确获知的事实时间；自报或未知NULL',
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录时间',
  reason VARCHAR(500) NULL COMMENT '补录或核实原因，不填证件原文',
  PRIMARY KEY (movement_id),
  UNIQUE uk_visit_movement_once (
    visitor_id,
    movement_kind
  ),
  INDEX idx_visit_movement_recorded (recorded_at, movement_id),
  CONSTRAINT ck_visit_movement_actor CHECK (NOT actor_identity_id IS NULL OR NOT actor_user_id IS NULL),
  CONSTRAINT ck_visit_movement_kind CHECK (movement_kind IN ('ENTER', 'EXIT', 'EXIT_VERIFIED')),
  CONSTRAINT ck_visit_movement_source CHECK (source IN ('STAFF', 'PARENT_SELF', 'MANUAL_VERIFIED')),
  CONSTRAINT ck_visit_movement_self CHECK (source <> 'PARENT_SELF' OR actual_at IS NULL),
  CONSTRAINT ck_visit_movement_time CHECK (actual_at IS NULL OR actual_at <= recorded_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐人入离校与核实补录日志';

CREATE TABLE school_visit_visitor (
  visitor_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '一位实名到访人；独立核验',
  booking_id BIGINT NOT NULL COMMENT '所属预约',
  visitor_name VARCHAR(64) NOT NULL COMMENT '实名到访姓名；不收身份证号',
  phone_e164 VARCHAR(16) NOT NULL COMMENT '联系手机号+及8至15位数字；仅必要岗位可读',
  ticket_nonce BINARY(32) NOT NULL COMMENT '凭证随机种子；永不返回或记录日志',
  ticket_hash CHAR(64) NOT NULL COMMENT '完整凭证SHA256；仅内部匹配',
  ticket_key_version VARCHAR(16) NOT NULL COMMENT '服务端签名密钥版本，密钥不落业务库',
  ticket_expires_at DATETIME(3) NOT NULL COMMENT '有效到时段结束，UTC',
  entered_at DATETIME(3) NULL COMMENT '员工真实登记入校时间；一人一份事实',
  exit_source VARCHAR(24) NULL COMMENT 'STAFF/PARENT_SELF/MANUAL_VERIFIED；无记录NULL',
  actual_exit_at DATETIME(3) NULL COMMENT '明确获知的真实离校时间；未知必须NULL',
  exit_recorded_at DATETIME(3) NULL COMMENT '登记离校记录时间，不能冒充真实离校时间',
  version BIGINT NOT NULL DEFAULT 1 COMMENT '访客并发版本',
  PRIMARY KEY (visitor_id),
  UNIQUE uk_visit_ticket_hash (
    ticket_hash
  ),
  INDEX idx_visit_visitor_booking (booking_id, visitor_id),
  CONSTRAINT ck_visit_visitor_version CHECK (version >= 1),
  CONSTRAINT ck_visit_exit_source CHECK (exit_source IS NULL OR exit_source IN ('STAFF', 'PARENT_SELF', 'MANUAL_VERIFIED')),
  CONSTRAINT ck_visit_exit_fact CHECK ((
    exit_source IS NULL AND exit_recorded_at IS NULL AND actual_exit_at IS NULL
  )
  OR (
    NOT exit_source IS NULL
    AND NOT exit_recorded_at IS NULL
    AND NOT entered_at IS NULL
  )),
  CONSTRAINT ck_visit_exit_time CHECK (actual_exit_at IS NULL
  OR (
    actual_exit_at >= entered_at AND actual_exit_at <= exit_recorded_at
  )),
  CONSTRAINT ck_visit_exit_self CHECK (exit_source <> 'PARENT_SELF' OR actual_exit_at IS NULL)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐个实名访客凭证与入离校登记';

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
  CONSTRAINT `ck_stock_movement_1` CHECK (after_qty >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='stock_movement';

CREATE TABLE `sys_config` (
  `config_id` INT NOT NULL AUTO_INCREMENT COMMENT '参数主键',
  `config_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数名称',
  `config_key` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数键名',
  `config_value` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数键值',
  `config_type` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'N' COMMENT '系统内置（Y是 N否）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`config_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='参数配置表';

CREATE TABLE `sys_dept` (
  `dept_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '部门id',
  `parent_id` BIGINT DEFAULT '0' COMMENT '父部门id',
  `ancestors` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '祖级列表',
  `dept_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门名称',
  `order_num` INT DEFAULT '0' COMMENT '显示顺序',
  `leader` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人',
  `phone` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '部门状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`dept_id`),
  `leader_user_id` BIGINT NULL COMMENT '新增，负责人真实身份',
  INDEX `idx_dept_parent` (`parent_id`, `status`, `del_flag`),
  INDEX `idx_dept_leader` (`leader_user_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='部门表';

CREATE TABLE `sys_dict_data` (
  `dict_code` BIGINT NOT NULL AUTO_INCREMENT COMMENT '字典编码',
  `dict_sort` INT DEFAULT '0' COMMENT '字典排序',
  `dict_label` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典标签',
  `dict_value` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典键值',
  `dict_type` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `css_class` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '样式属性（其他样式扩展）',
  `list_class` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表格回显样式',
  `is_default` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'N' COMMENT '是否默认（Y是 N否）',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`dict_code`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='字典数据表';

CREATE TABLE `sys_dict_type` (
  `dict_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '字典主键',
  `dict_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典名称',
  `dict_type` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`dict_id`),
  UNIQUE `dict_type` (
    `dict_type`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='字典类型表';

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
  INDEX `idx_external_user` (`user_id`, `link_status`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_external_identity';

CREATE TABLE `sys_file` (
  `file_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '文件身份，不等于公开地址',
  `storage_provider` VARCHAR(16) NOT NULL COMMENT '受控存储方式',
  `bucket` VARCHAR(64) NOT NULL COMMENT '容器',
  `object_key` VARCHAR(512) NOT NULL COMMENT '私有定位，不允许访客直读',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原文件名',
  `mime_type` VARCHAR(127) NOT NULL COMMENT '核验后的内容类型',
  `byte_size` BIGINT NOT NULL COMMENT '字节数',
  `sha256` CHAR(64) NOT NULL COMMENT '完整性摘要，不允许凭hash跨用户取文件',
  `owner_user_id` BIGINT NOT NULL COMMENT '上传者',
  `upload_key` VARCHAR(64) NOT NULL COMMENT '上传幂等键，上传可发生在尚无request时',
  `upload_payload_hash` CHAR(64) NOT NULL COMMENT '文件内容摘要及规范上传参数的摘要，同键异载荷冲突',
  `owner_dept_id` BIGINT NULL COMMENT '部门快照',
  `visibility` VARCHAR(16) NOT NULL DEFAULT 'PRIVATE' COMMENT 'P0办公附件固定私有',
  `status` VARCHAR(16) NOT NULL COMMENT 'UPLOADING/READY/QUARANTINED/DELETED',
  `scan_status` VARCHAR(16) NOT NULL COMMENT 'PENDING/PASSED/REJECTED',
  `expires_at` DATETIME(3) NULL COMMENT '未绑定文件清理期限，非授权期限',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`file_id`),
  UNIQUE `uk_file_object` (
    `storage_provider`,
    `bucket`,
    `object_key`
  ),
  UNIQUE `uk_file_upload` (
    `owner_user_id`,
    `upload_key`
  ),
  INDEX `idx_file_owner` (`owner_user_id`, `status`, `created_at`),
  INDEX `idx_file_expiry` (`status`, `expires_at`),
  INDEX `idx_file_hash` (`sha256`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_file';

CREATE TABLE `sys_job` (
  `job_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `job_name` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '任务名称',
  `job_group` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT' COMMENT '任务组名',
  `invoke_target` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调用目标字符串',
  `cron_expression` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'cron执行表达式',
  `misfire_policy` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '3' COMMENT '计划执行错误策略（1立即执行 2执行一次 3放弃执行）',
  `concurrent` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '是否并发执行（0允许 1禁止）',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1暂停）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注信息',
  PRIMARY KEY (`job_id`, `job_name`, `job_group`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='定时任务调度表';

CREATE TABLE `sys_job_log` (
  `job_log_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '任务日志ID',
  `job_name` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `job_group` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务组名',
  `invoke_target` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调用目标字符串',
  `job_message` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日志信息',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '执行状态（0正常 1失败）',
  `exception_info` VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '异常信息',
  `start_time` DATETIME DEFAULT NULL COMMENT '执行开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '执行结束时间',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`job_log_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='定时任务调度日志表';

CREATE TABLE `sys_logininfor` (
  `info_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '访问ID',
  `user_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户账号',
  `ipaddr` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '登录IP地址',
  `login_location` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '登录地点',
  `browser` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '浏览器类型',
  `os` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作系统',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '登录状态（0成功 1失败）',
  `msg` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '提示消息',
  `login_time` DATETIME DEFAULT NULL COMMENT '访问时间',
  PRIMARY KEY (`info_id`),
  INDEX `idx_sys_logininfor_s` (`status`),
  INDEX `idx_sys_logininfor_lt` (`login_time`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='系统访问记录';

CREATE TABLE `sys_menu` (
  `menu_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `menu_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单名称',
  `parent_id` BIGINT DEFAULT '0' COMMENT '父菜单ID',
  `order_num` INT DEFAULT '0' COMMENT '显示顺序',
  `path` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由地址',
  `component` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '组件路径',
  `query` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '路由参数',
  `route_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由名称',
  `is_frame` INT DEFAULT '1' COMMENT '是否为外链（0是 1否）',
  `is_cache` INT DEFAULT '0' COMMENT '是否缓存（0缓存 1不缓存）',
  `menu_type` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '菜单类型（M目录 C菜单 F按钮）',
  `visible` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0显示 1隐藏）',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0正常 1停用）',
  `perms` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '权限标识',
  `icon` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '#' COMMENT '菜单图标',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`menu_id`),
  INDEX `idx_menu_parent` (`parent_id`, `status`),
  INDEX `idx_menu_perms` (`perms`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='菜单权限表';

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
  INDEX `idx_notice_request` (`source_request_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知公告表';

CREATE TABLE `sys_notice_read` (
  `read_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '已读主键',
  `notice_id` INT NOT NULL COMMENT '公告id',
  `user_id` BIGINT NOT NULL COMMENT '用户id',
  `read_time` DATETIME NOT NULL COMMENT '阅读时间',
  PRIMARY KEY (`read_id`),
  UNIQUE `uk_user_notice` (
    `user_id`,
    `notice_id`
  ) COMMENT '同一用户同一公告只记录一次'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='公告已读记录表';

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
  INDEX `idx_recipient_event` (`source_event_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_notice_recipient';

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
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知阅读回执独立幂等，不制造办公根';

CREATE TABLE `sys_oper_log` (
  `oper_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志主键',
  `title` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '模块标题',
  `business_type` INT DEFAULT '0' COMMENT '业务类型（0其它 1新增 2修改 3删除）',
  `method` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '方法名称',
  `request_method` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求方式',
  `operator_type` INT DEFAULT '0' COMMENT '操作类别（0其它 1后台用户 2手机端用户）',
  `oper_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人员',
  `dept_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门名称',
  `oper_url` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求URL',
  `oper_ip` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '主机地址',
  `oper_location` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作地点',
  `oper_param` VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求参数',
  `json_result` VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '返回参数',
  `status` INT DEFAULT '0' COMMENT '操作状态（0正常 1异常）',
  `error_msg` VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '错误消息',
  `oper_time` DATETIME DEFAULT NULL COMMENT '操作时间',
  `cost_time` BIGINT DEFAULT '0' COMMENT '消耗时间',
  PRIMARY KEY (`oper_id`),
  INDEX `idx_sys_oper_log_bt` (`business_type`),
  INDEX `idx_sys_oper_log_s` (`status`),
  INDEX `idx_sys_oper_log_ot` (`oper_time`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='操作日志记录';

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
  INDEX `idx_outbox_request` (`request_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_outbox_event';

CREATE TABLE `sys_post` (
  `post_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '岗位ID',
  `post_code` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位编码',
  `post_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位名称',
  `post_sort` INT NOT NULL COMMENT '显示顺序',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态（0正常 1停用）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`post_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='岗位信息表';

CREATE TABLE `sys_role` (
  `role_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `role_key` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色权限字符串',
  `role_sort` INT NOT NULL COMMENT '显示顺序',
  `data_scope` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '数据范围（1：全部数据权限 2：自定数据权限 3：本部门数据权限 4：本部门及以下数据权限）',
  `menu_check_strictly` TINYINT(1) DEFAULT '1' COMMENT '菜单树选择项是否关联显示',
  `dept_check_strictly` TINYINT(1) DEFAULT '1' COMMENT '部门树选择项是否关联显示',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`role_id`),
  UNIQUE `uk_role_key` (
    `role_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色信息表';

CREATE TABLE `sys_role_dept` (
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `dept_id` BIGINT NOT NULL COMMENT '部门ID',
  PRIMARY KEY (`role_id`, `dept_id`),
  INDEX `idx_dept_role` (`dept_id`, `role_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色和部门关联表';

CREATE TABLE `sys_role_menu` (
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (`role_id`, `menu_id`),
  INDEX `idx_role_menu_menu` (`menu_id`, `role_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色和菜单关联表';

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
  INDEX `idx_user_dept_status` (`dept_id`, `status`, `del_flag`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户信息表';

CREATE TABLE `sys_user_post` (
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `post_id` BIGINT NOT NULL COMMENT '岗位ID',
  PRIMARY KEY (`user_id`, `post_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户与岗位关联表';

CREATE TABLE `sys_user_role` (
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`user_id`, `role_id`),
  INDEX `idx_user_role_role` (`role_id`, `user_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户和角色关联表';

-- 全部建表完成后建立外键
ALTER TABLE `QRTZ_BLOB_TRIGGERS` ADD CONSTRAINT `QRTZ_BLOB_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`);
ALTER TABLE `QRTZ_CRON_TRIGGERS` ADD CONSTRAINT `QRTZ_CRON_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`);
ALTER TABLE `QRTZ_SIMPLE_TRIGGERS` ADD CONSTRAINT `QRTZ_SIMPLE_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`);
ALTER TABLE `QRTZ_SIMPROP_TRIGGERS` ADD CONSTRAINT `QRTZ_SIMPROP_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`);
ALTER TABLE `QRTZ_TRIGGERS` ADD CONSTRAINT `QRTZ_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `job_name`, `job_group`) REFERENCES `QRTZ_JOB_DETAILS` (`sched_name`, `job_name`, `job_group`);
ALTER TABLE `auth_binding_request` ADD CONSTRAINT fk_binding_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `auth_binding_request` ADD CONSTRAINT fk_binding_staff FOREIGN KEY (staff_user_id) REFERENCES sys_user (user_id) ON DELETE RESTRICT;
ALTER TABLE `auth_binding_request` ADD CONSTRAINT fk_binding_reviewer FOREIGN KEY (reviewed_by) REFERENCES sys_user (user_id) ON DELETE RESTRICT;
ALTER TABLE `cms_article_revision` ADD CONSTRAINT fk_revision_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `cms_article_revision` ADD CONSTRAINT fk_revision_article FOREIGN KEY (article_id) REFERENCES doupi_cms_article (article_id);
ALTER TABLE `cms_content_review` ADD CONSTRAINT fk_review_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `cms_content_review` ADD CONSTRAINT fk_review_revision FOREIGN KEY (revision_id) REFERENCES cms_article_revision (revision_id);
ALTER TABLE `directory_change_log` ADD CONSTRAINT fk_directory_actor FOREIGN KEY (actor_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `doupi_cms_article` ADD CONSTRAINT `fk_ref_085` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `doupi_cms_page` ADD CONSTRAINT `fk_ref_086` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `doupi_cms_section` ADD CONSTRAINT `fk_ref_115` FOREIGN KEY (`page_id`) REFERENCES `doupi_cms_page` (`page_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `doupi_recruit_appointment` ADD CONSTRAINT `fk_ref_083` FOREIGN KEY (`assigned_teacher_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `doupi_recruit_appointment` ADD CONSTRAINT `fk_ref_084` FOREIGN KEY (`verifier_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `doupi_recruit_appointment` ADD CONSTRAINT `fk_ref_100` FOREIGN KEY (`visitor_identity_id`) REFERENCES `sys_external_identity` (`identity_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_class` ADD CONSTRAINT `fk_ref_020` FOREIGN KEY (`head_teacher_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_class` ADD CONSTRAINT `fk_ref_021` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_exam_class` ADD CONSTRAINT fk_ec_exam FOREIGN KEY (exam_id) REFERENCES edu_exam (exam_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_class` ADD CONSTRAINT fk_ec_class FOREIGN KEY (class_id) REFERENCES edu_class (class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_roster` ADD CONSTRAINT fk_er_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (exam_class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_roster` ADD CONSTRAINT fk_er_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_score` ADD CONSTRAINT fk_score_roster FOREIGN KEY (roster_id) REFERENCES edu_exam_roster (roster_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_score` ADD CONSTRAINT fk_score_subject FOREIGN KEY (subject_id) REFERENCES edu_exam_subject (subject_id) ON DELETE RESTRICT;
ALTER TABLE `edu_exam_subject` ADD CONSTRAINT fk_subject_exam FOREIGN KEY (exam_id) REFERENCES edu_exam (exam_id) ON DELETE RESTRICT;
ALTER TABLE `edu_goods` ADD CONSTRAINT `fk_ref_022` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_goods` ADD CONSTRAINT `fk_ref_023` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (`supplier_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_goods_kit_item` ADD CONSTRAINT `fk_ref_090` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (`kit_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_goods_kit_item` ADD CONSTRAINT `fk_ref_091` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_guardian_identity` ADD CONSTRAINT fk_gi_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (guardian_id) ON DELETE RESTRICT;
ALTER TABLE `edu_guardian_identity` ADD CONSTRAINT fk_gi_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `edu_guardian_invitation` ADD CONSTRAINT fk_inv_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (guardian_id) ON DELETE RESTRICT;
ALTER TABLE `edu_guardian_invitation` ADD CONSTRAINT fk_inv_identity FOREIGN KEY (target_identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `edu_guardian_invitation` ADD CONSTRAINT fk_inv_binding FOREIGN KEY (consumed_binding_id) REFERENCES edu_guardian_identity (identity_binding_id) ON DELETE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_060` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_061` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (`class_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_062` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (`kit_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_063` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_064` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record` ADD CONSTRAINT `fk_ref_065` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record_item` ADD CONSTRAINT `fk_ref_066` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record_item` ADD CONSTRAINT `fk_ref_067` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record_item` ADD CONSTRAINT `fk_ref_112` FOREIGN KEY (`record_id`) REFERENCES `edu_material_record` (`record_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record_item` ADD CONSTRAINT `fk_ref_113` FOREIGN KEY (`request_item_id`) REFERENCES `edu_material_request_item` (`request_item_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_record_item` ADD CONSTRAINT `fk_ref_114` FOREIGN KEY (`original_issue_item_id`) REFERENCES `edu_material_record_item` (`item_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_request_item` ADD CONSTRAINT `fk_ref_068` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_request_item` ADD CONSTRAINT `fk_ref_069` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_request_item` ADD CONSTRAINT `fk_ref_070` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (`kit_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_request_item` ADD CONSTRAINT `fk_ref_071` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (`class_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_material_request_item` ADD CONSTRAINT `fk_ref_072` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_054` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_055` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_056` FOREIGN KEY (`delivered_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_057` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_058` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_059` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_delivery` ADD CONSTRAINT `fk_ref_108` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (`print_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_043` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_044` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_045` FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_046` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_047` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_048` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_049` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_105` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (`print_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_paper_issue` ADD CONSTRAINT `fk_ref_106` FOREIGN KEY (`original_issue_id`) REFERENCES `edu_print_paper_issue` (`issue_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_record` ADD CONSTRAINT `fk_ref_040` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_record` ADD CONSTRAINT `fk_ref_041` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_record` ADD CONSTRAINT `fk_ref_042` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (`class_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_record` ADD CONSTRAINT `fk_ref_103` FOREIGN KEY (`reprint_of_print_id`) REFERENCES `edu_print_record` (`print_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_record` ADD CONSTRAINT `fk_ref_104` FOREIGN KEY (`teacher_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_settlement` ADD CONSTRAINT `fk_ref_050` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_settlement` ADD CONSTRAINT `fk_ref_051` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_settlement` ADD CONSTRAINT `fk_ref_052` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_settlement` ADD CONSTRAINT `fk_ref_053` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_print_settlement` ADD CONSTRAINT `fk_ref_107` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (`print_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_score_import` ADD CONSTRAINT fk_si_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (exam_class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_score_release` ADD CONSTRAINT fk_release_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (exam_class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_score_snapshot` ADD CONSTRAINT fk_snapshot_release FOREIGN KEY (release_id) REFERENCES edu_score_release (release_id) ON DELETE RESTRICT;
ALTER TABLE `edu_score_snapshot` ADD CONSTRAINT fk_snapshot_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id) ON DELETE RESTRICT;
ALTER TABLE `edu_score_snapshot` ADD CONSTRAINT fk_snapshot_class FOREIGN KEY (class_id) REFERENCES edu_class (class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_stock_check` ADD CONSTRAINT `fk_ref_035` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_check` ADD CONSTRAINT `fk_ref_036` FOREIGN KEY (`counted_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_check` ADD CONSTRAINT `fk_ref_037` FOREIGN KEY (`reviewer_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_check_item` ADD CONSTRAINT `fk_ref_038` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_check_item` ADD CONSTRAINT `fk_ref_039` FOREIGN KEY (`adjustment_movement_id`) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_check_item` ADD CONSTRAINT `fk_ref_111` FOREIGN KEY (`check_id`) REFERENCES `edu_stock_check` (`check_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in` ADD CONSTRAINT `fk_ref_024` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in` ADD CONSTRAINT `fk_ref_025` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (`supplier_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in` ADD CONSTRAINT `fk_ref_026` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in_item` ADD CONSTRAINT `fk_ref_027` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in_item` ADD CONSTRAINT `fk_ref_028` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_in_item` ADD CONSTRAINT `fk_ref_109` FOREIGN KEY (`in_id`) REFERENCES `edu_stock_in` (`in_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out` ADD CONSTRAINT `fk_ref_029` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out` ADD CONSTRAINT `fk_ref_030` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out` ADD CONSTRAINT `fk_ref_031` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (`class_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out` ADD CONSTRAINT `fk_ref_032` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out_item` ADD CONSTRAINT `fk_ref_033` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out_item` ADD CONSTRAINT `fk_ref_034` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_stock_out_item` ADD CONSTRAINT `fk_ref_110` FOREIGN KEY (`out_id`) REFERENCES `edu_stock_out` (`out_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `edu_student` ADD CONSTRAINT fk_student_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student` ADD CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES edu_class (class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_class_history` ADD CONSTRAINT fk_hist_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_class_history` ADD CONSTRAINT fk_hist_old_class FOREIGN KEY (from_class_id) REFERENCES edu_class (class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_class_history` ADD CONSTRAINT fk_hist_new_class FOREIGN KEY (to_class_id) REFERENCES edu_class (class_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_class_history` ADD CONSTRAINT fk_hist_old_campus FOREIGN KEY (from_campus_id) REFERENCES doupi_recruit_campus (campus_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_class_history` ADD CONSTRAINT fk_hist_new_campus FOREIGN KEY (to_campus_id) REFERENCES doupi_recruit_campus (campus_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_guardian` ADD CONSTRAINT fk_link_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id) ON DELETE RESTRICT;
ALTER TABLE `edu_student_guardian` ADD CONSTRAINT fk_link_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (guardian_id) ON DELETE RESTRICT;
ALTER TABLE `family_notice` ADD CONSTRAINT fk_fn_author FOREIGN KEY (created_by_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `family_notice` ADD CONSTRAINT fk_fn_publisher FOREIGN KEY (published_by_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `family_notice` ADD CONSTRAINT fk_fn_correction FOREIGN KEY (correction_of_notice_id) REFERENCES family_notice (notice_id);
ALTER TABLE `family_notice_audit` ADD CONSTRAINT fk_fna_notice FOREIGN KEY (notice_id) REFERENCES family_notice (notice_id);
ALTER TABLE `family_notice_audit` ADD CONSTRAINT fk_fna_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id);
ALTER TABLE `family_notice_file` ADD CONSTRAINT fk_fnf_notice FOREIGN KEY (notice_id) REFERENCES family_notice (notice_id);
ALTER TABLE `family_notice_file` ADD CONSTRAINT fk_fnf_file FOREIGN KEY (file_id) REFERENCES sys_file (file_id);
ALTER TABLE `family_notice_receipt` ADD CONSTRAINT fk_fnr_target FOREIGN KEY (notice_id, student_id) REFERENCES family_notice_student (notice_id, student_id);
ALTER TABLE `family_notice_receipt` ADD CONSTRAINT fk_fnr_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (guardian_id);
ALTER TABLE `family_notice_student` ADD CONSTRAINT fk_fns_notice FOREIGN KEY (notice_id) REFERENCES family_notice (notice_id);
ALTER TABLE `family_notice_student` ADD CONSTRAINT fk_fns_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id);
ALTER TABLE `family_notice_student` ADD CONSTRAINT fk_fns_class FOREIGN KEY (class_id) REFERENCES edu_class (class_id);
ALTER TABLE `family_notice_student` ADD CONSTRAINT fk_fns_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_record FOREIGN KEY (return_record_id) REFERENCES edu_material_record (record_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_creator FOREIGN KEY (created_by_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_create_action FOREIGN KEY (created_action_id) REFERENCES office_action_log (action_id);
ALTER TABLE `material_return_intent` ADD CONSTRAINT fk_mri_resolve_action FOREIGN KEY (resolved_action_id) REFERENCES office_action_log (action_id);
ALTER TABLE `material_return_intent_item` ADD CONSTRAINT fk_mrii_intent FOREIGN KEY (intent_id) REFERENCES material_return_intent (intent_id);
ALTER TABLE `material_return_intent_item` ADD CONSTRAINT fk_mrii_original FOREIGN KEY (original_issue_item_id) REFERENCES edu_material_record_item (item_id);
ALTER TABLE `material_return_intent_item` ADD CONSTRAINT fk_mrii_active FOREIGN KEY (active_source_item_id) REFERENCES edu_material_record_item (item_id);
ALTER TABLE `office_action_log` ADD CONSTRAINT `fk_ref_011` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_action_log` ADD CONSTRAINT `fk_ref_012` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_action_log` ADD CONSTRAINT `fk_ref_013` FOREIGN KEY (`actor_dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_action_log` ADD CONSTRAINT `fk_ref_102` FOREIGN KEY (`task_id`) REFERENCES `office_task` (`task_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request` ADD CONSTRAINT `fk_ref_002` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request` ADD CONSTRAINT `fk_ref_003` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request` ADD CONSTRAINT `fk_ref_004` FOREIGN KEY (`applicant_dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request` ADD CONSTRAINT `fk_ref_005` FOREIGN KEY (`handler_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request_file` ADD CONSTRAINT `fk_ref_017` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request_file` ADD CONSTRAINT `fk_ref_018` FOREIGN KEY (`file_id`) REFERENCES `sys_file` (`file_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_request_file` ADD CONSTRAINT `fk_ref_019` FOREIGN KEY (`linked_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_006` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_007` FOREIGN KEY (`assignee_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_008` FOREIGN KEY (`excluded_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_009` FOREIGN KEY (`acted_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_010` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `office_task` ADD CONSTRAINT `fk_ref_101` FOREIGN KEY (`assignee_role_id`) REFERENCES `sys_role` (`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `procurement_order` ADD CONSTRAINT fk_po_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `procurement_order` ADD CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES edu_supplier (supplier_id);
ALTER TABLE `procurement_order_item` ADD CONSTRAINT fk_poi_order FOREIGN KEY (order_id) REFERENCES procurement_order (order_id);
ALTER TABLE `procurement_order_item` ADD CONSTRAINT fk_poi_goods FOREIGN KEY (goods_id) REFERENCES edu_goods (goods_id);
ALTER TABLE `procurement_receipt` ADD CONSTRAINT fk_pr_item FOREIGN KEY (order_item_id) REFERENCES procurement_order_item (order_item_id);
ALTER TABLE `procurement_receipt` ADD CONSTRAINT fk_pr_movement FOREIGN KEY (movement_id) REFERENCES stock_movement (movement_id);
ALTER TABLE `procurement_receipt` ADD CONSTRAINT fk_pr_action FOREIGN KEY (action_id) REFERENCES office_action_log (action_id);
ALTER TABLE `recruit_appointment_action` ADD CONSTRAINT fk_recruit_action_root FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (appointment_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_appointment_action` ADD CONSTRAINT fk_recruit_action_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (user_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_appointment_action` ADD CONSTRAINT fk_recruit_action_identity FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_assignment` ADD CONSTRAINT fk_assignment_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `recruit_assignment` ADD CONSTRAINT fk_assignment_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (appointment_id);
ALTER TABLE `recruit_assignment` ADD CONSTRAINT fk_assignment_shift FOREIGN KEY (shift_id) REFERENCES recruit_shift (shift_id);
ALTER TABLE `recruit_campus_scope` ADD CONSTRAINT fk_recruit_scope_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_campus_scope` ADD CONSTRAINT fk_recruit_scope_dept FOREIGN KEY (dept_id) REFERENCES sys_dept (dept_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_followup` ADD CONSTRAINT fk_followup_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `recruit_followup` ADD CONSTRAINT fk_followup_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (appointment_id);
ALTER TABLE `recruit_followup` ADD CONSTRAINT fk_followup_user FOREIGN KEY (assignee_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `recruit_notification` ADD CONSTRAINT fk_recruit_notice_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (appointment_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_notification` ADD CONSTRAINT fk_recruit_notice_identity FOREIGN KEY (recipient_identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `recruit_shift` ADD CONSTRAINT fk_shift_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `recruit_shift` ADD CONSTRAINT fk_shift_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id);
ALTER TABLE `recruit_shift` ADD CONSTRAINT fk_shift_teacher FOREIGN KEY (teacher_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `recruit_subscription_consent` ADD CONSTRAINT fk_recruit_consent_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (identity_id) ON DELETE RESTRICT;
ALTER TABLE `repair_ticket` ADD CONSTRAINT fk_repair_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `repair_ticket` ADD CONSTRAINT fk_repair_user FOREIGN KEY (assignee_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `resource_booking` ADD CONSTRAINT fk_booking_request FOREIGN KEY (request_id) REFERENCES office_request (request_id);
ALTER TABLE `resource_booking` ADD CONSTRAINT fk_booking_resource FOREIGN KEY (resource_id) REFERENCES campus_resource (resource_id);
ALTER TABLE `school_open_day` ADD CONSTRAINT fk_open_day_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id);
ALTER TABLE `school_open_day` ADD CONSTRAINT fk_open_day_creator FOREIGN KEY (created_by) REFERENCES sys_user (user_id);
ALTER TABLE `school_open_day_notice` ADD CONSTRAINT fk_open_day_notice_event FOREIGN KEY (event_id) REFERENCES school_open_day (event_id);
ALTER TABLE `school_open_day_notice` ADD CONSTRAINT fk_open_day_notice_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (guardian_id);
ALTER TABLE `school_open_day_scope_student` ADD CONSTRAINT fk_open_day_student_event FOREIGN KEY (event_id, campus_id) REFERENCES school_open_day (event_id, campus_id);
ALTER TABLE `school_open_day_scope_student` ADD CONSTRAINT fk_open_day_scope_student FOREIGN KEY (student_id) REFERENCES edu_student (student_id);
ALTER TABLE `school_open_day_slot` ADD CONSTRAINT fk_open_day_slot_event FOREIGN KEY (event_id) REFERENCES school_open_day (event_id);
ALTER TABLE `school_open_day_staff_scope` ADD CONSTRAINT fk_open_day_scope_user FOREIGN KEY (user_id) REFERENCES sys_user (user_id);
ALTER TABLE `school_open_day_staff_scope` ADD CONSTRAINT fk_open_day_scope_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (campus_id);
ALTER TABLE `school_visit_action` ADD CONSTRAINT fk_visit_action_identity FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (identity_id);
ALTER TABLE `school_visit_action` ADD CONSTRAINT fk_visit_action_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `school_visit_booking` ADD CONSTRAINT fk_visit_booking_slot FOREIGN KEY (event_id, slot_id) REFERENCES school_open_day_slot (event_id, slot_id);
ALTER TABLE `school_visit_booking` ADD CONSTRAINT fk_visit_booking_guardian FOREIGN KEY (creator_guardian_id) REFERENCES edu_guardian (guardian_id);
ALTER TABLE `school_visit_booking` ADD CONSTRAINT fk_visit_booking_identity FOREIGN KEY (creator_identity_id) REFERENCES sys_external_identity (identity_id);
ALTER TABLE `school_visit_booking_student` ADD CONSTRAINT fk_visit_student_booking FOREIGN KEY (event_id, booking_id) REFERENCES school_visit_booking (event_id, booking_id);
ALTER TABLE `school_visit_booking_student` ADD CONSTRAINT fk_visit_student_scope FOREIGN KEY (event_id, student_id) REFERENCES school_open_day_scope_student (event_id, student_id);
ALTER TABLE `school_visit_movement` ADD CONSTRAINT fk_visit_movement_visitor FOREIGN KEY (visitor_id) REFERENCES school_visit_visitor (visitor_id);
ALTER TABLE `school_visit_movement` ADD CONSTRAINT fk_visit_movement_action FOREIGN KEY (action_id) REFERENCES school_visit_action (action_id);
ALTER TABLE `school_visit_movement` ADD CONSTRAINT fk_visit_movement_actor FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (identity_id);
ALTER TABLE `school_visit_movement` ADD CONSTRAINT fk_visit_movement_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (user_id);
ALTER TABLE `school_visit_visitor` ADD CONSTRAINT fk_visit_visitor_booking FOREIGN KEY (booking_id) REFERENCES school_visit_booking (booking_id);
ALTER TABLE `stock_movement` ADD CONSTRAINT `fk_ref_073` FOREIGN KEY (reversal_of_movement_id) REFERENCES `stock_movement` (`movement_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stock_movement` ADD CONSTRAINT `fk_ref_074` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (`goods_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stock_movement` ADD CONSTRAINT `fk_ref_075` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stock_movement` ADD CONSTRAINT `fk_ref_076` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (`action_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stock_movement` ADD CONSTRAINT `fk_ref_077` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_dept` ADD CONSTRAINT `fk_ref_001` FOREIGN KEY (`leader_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_external_identity` ADD CONSTRAINT `fk_ref_087` FOREIGN KEY (`verified_by`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_external_identity` ADD CONSTRAINT `fk_ref_099` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_file` ADD CONSTRAINT `fk_ref_014` FOREIGN KEY (`owner_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_file` ADD CONSTRAINT `fk_ref_015` FOREIGN KEY (`owner_dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_file` ADD CONSTRAINT `fk_ref_016` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice` ADD CONSTRAINT `fk_ref_078` FOREIGN KEY (`publisher_user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice` ADD CONSTRAINT `fk_ref_079` FOREIGN KEY (`source_event_id`) REFERENCES `sys_outbox_event` (`event_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice_read` ADD CONSTRAINT `fk_ref_089` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice` (`notice_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice_recipient` ADD CONSTRAINT `fk_ref_080` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice` (`notice_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice_recipient` ADD CONSTRAINT `fk_ref_081` FOREIGN KEY (`source_event_id`) REFERENCES `sys_outbox_event` (`event_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_notice_user_action` ADD CONSTRAINT fk_notice_action_user FOREIGN KEY (user_id) REFERENCES sys_user (user_id);
ALTER TABLE `sys_notice_user_action` ADD CONSTRAINT fk_notice_action_notice FOREIGN KEY (notice_id) REFERENCES sys_notice (notice_id);
ALTER TABLE `sys_outbox_event` ADD CONSTRAINT `fk_ref_082` FOREIGN KEY (`request_id`) REFERENCES `office_request` (`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `fk_ref_088` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `fk_ref_096` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_ref_094` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_ref_095` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`menu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_user` ADD CONSTRAINT `fk_ref_000` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (`dept_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_ref_097` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_ref_098` FOREIGN KEY (`post_id`) REFERENCES `sys_post` (`post_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_ref_092` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_ref_093` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
