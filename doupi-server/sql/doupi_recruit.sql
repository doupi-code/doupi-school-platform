-- ----------------------------------------------------------------------------
-- 豆皮系统 - 招生预约模块数据表与初始数据 DDL
-- 适用数据库: stuck-mg
-- ----------------------------------------------------------------------------

-- 1. 访校预约表
DROP TABLE IF EXISTS `doupi_recruit_appointment`;
CREATE TABLE `doupi_recruit_appointment` (
  `appointment_id` bigint NOT NULL AUTO_INCREMENT COMMENT '预约ID',
  `appointment_no` varchar(32) NOT NULL COMMENT '预约单号',
  `openid` varchar(64) DEFAULT '' COMMENT '家长微信OpenID',
  `status` varchar(20) DEFAULT 'PENDING' COMMENT '状态: PENDING-待审核 APPROVED-已通过 CANCELLED-已取消 VERIFIED-已核销/已到校',
  `parent_name` varchar(64) NOT NULL COMMENT '家长姓名',
  `parent_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `student_name` varchar(64) NOT NULL COMMENT '学生姓名',
  `student_gender` varchar(10) DEFAULT '男' COMMENT '学生性别',
  `student_grade` varchar(32) NOT NULL COMMENT '意向/在读年级',
  `current_school` varchar(128) DEFAULT '' COMMENT '原就读学校',
  `campus_id` varchar(32) DEFAULT 'default' COMMENT '校区ID',
  `campus_name` varchar(64) DEFAULT '汉阳校区' COMMENT '校区名称',
  `visit_date` varchar(20) NOT NULL COMMENT '预约访校日期(YYYY-MM-DD)',
  `time_slot` varchar(64) NOT NULL COMMENT '预约时间段',
  `check_in_code` varchar(32) DEFAULT '' COMMENT '核销凭证码(6位或UUID)',
  `teacher_id` varchar(32) DEFAULT '' COMMENT '接待/对接教师ID',
  `teacher_name` varchar(64) DEFAULT '' COMMENT '对接教师姓名',
  `verify_time` datetime DEFAULT NULL COMMENT '核销到校时间',
  `verifier` varchar(64) DEFAULT '' COMMENT '核销人姓名',
  `remark` varchar(500) DEFAULT '' COMMENT '家长备注/诉求',
  `audit_remark` varchar(500) DEFAULT '' COMMENT '审核/接待备注',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`appointment_id`),
  UNIQUE KEY `uk_appointment_no` (`appointment_no`),
  KEY `idx_phone` (`parent_phone`),
  KEY `idx_visit_date` (`visit_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COMMENT='访校预约表';

-- 2. 校区信息表
DROP TABLE IF EXISTS `doupi_recruit_campus`;
CREATE TABLE `doupi_recruit_campus` (
  `campus_id` varchar(32) NOT NULL COMMENT '校区ID',
  `campus_name` varchar(64) NOT NULL COMMENT '校区名称',
  `title` varchar(128) DEFAULT '华襄校园介绍' COMMENT '展示标题',
  `summary` text COMMENT '简介概览',
  `intro` text COMMENT '详细图文/介绍',
  `address` varchar(255) DEFAULT '' COMMENT '校区地址',
  `latitude` decimal(10,6) DEFAULT '30.550000' COMMENT '纬度',
  `longitude` decimal(10,6) DEFAULT '114.280000' COMMENT '经度',
  `contact_phone` varchar(32) DEFAULT '027-88888888' COMMENT '联系电话',
  `nature` varchar(64) DEFAULT '全日制寄宿' COMMENT '办学性质',
  `section` varchar(64) DEFAULT '小初高一贯制' COMMENT '开设学段',
  `cover_image` varchar(512) DEFAULT '' COMMENT '封面图片URL',
  `published` tinyint(1) DEFAULT '1' COMMENT '是否发布(1-是 0-否)',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`campus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校区信息表';

-- 3. 轮播图表
DROP TABLE IF EXISTS `doupi_recruit_banner`;
CREATE TABLE `doupi_recruit_banner` (
  `banner_id` bigint NOT NULL AUTO_INCREMENT COMMENT '轮播图ID',
  `title` varchar(128) NOT NULL COMMENT '标题',
  `image_url` varchar(512) NOT NULL COMMENT '图片URL',
  `link_url` varchar(512) DEFAULT '' COMMENT '跳转链接',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态: active-启用 inactive-禁用',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='招生轮播图表';

-- 4. 教师与招生主管绑定表
DROP TABLE IF EXISTS `doupi_recruit_teacher_binding`;
CREATE TABLE `doupi_recruit_teacher_binding` (
  `binding_id` bigint NOT NULL AUTO_INCREMENT COMMENT '绑定ID',
  `teacher_id` varchar(32) NOT NULL COMMENT '教师用户标识/ID',
  `teacher_name` varchar(64) NOT NULL COMMENT '教师姓名',
  `teacher_phone` varchar(20) NOT NULL COMMENT '教师手机号',
  `director_id` varchar(32) NOT NULL COMMENT '招生主管ID',
  `director_name` varchar(64) NOT NULL COMMENT '招生主管姓名',
  `status` varchar(20) DEFAULT 'APPROVED' COMMENT '状态: PENDING-待审核 APPROVED-已通过 REJECTED-已驳回',
  `audit_remark` varchar(255) DEFAULT '' COMMENT '审批意见',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `audit_time` datetime DEFAULT NULL COMMENT '审批时间',
  PRIMARY KEY (`binding_id`),
  KEY `idx_teacher` (`teacher_id`),
  KEY `idx_director` (`director_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='教师招生绑定表';

-- 5. 系统通知消息表
DROP TABLE IF EXISTS `doupi_recruit_message`;
CREATE TABLE `doupi_recruit_message` (
  `message_id` bigint NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `user_id` varchar(64) NOT NULL COMMENT '接收人OpenID或用户ID',
  `title` varchar(128) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息正文',
  `type` varchar(32) DEFAULT 'APPOINTMENT' COMMENT '消息类型: APPOINTMENT-预约 BINDING-绑定 SYSTEM-系统',
  `is_read` char(1) DEFAULT '0' COMMENT '是否已读(0-未读 1-已读)',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  PRIMARY KEY (`message_id`),
  KEY `idx_user_msg` (`user_id`, `is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='招生与系统通知消息表';

-- 6. 招生与系统全局配置表
DROP TABLE IF EXISTS `doupi_recruit_config`;
CREATE TABLE `doupi_recruit_config` (
  `config_id` bigint NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(64) NOT NULL COMMENT '配置键',
  `config_value` text NOT NULL COMMENT '配置值(JSON或字符串)',
  `remark` varchar(255) DEFAULT '' COMMENT '说明',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='招生与系统配置表';

-- ----------------------------------------------------------------------------
-- 插入初始数据
-- ----------------------------------------------------------------------------

-- 初始校区
INSERT INTO `doupi_recruit_campus` (`campus_id`, `campus_name`, `title`, `summary`, `intro`, `address`, `latitude`, `longitude`, `contact_phone`, `nature`, `section`, `cover_image`, `published`, `sort_order`)
VALUES ('default', '汉外华襄主校区', '汉外华襄高级中学', '武汉汉阳区卓越寄宿制名校，师资雄厚，学风纯正，升学率卓越。', '武汉汉阳外国语学校华襄校区，融合现代创新理念与传统治学严谨，拥有数字化实验室、标准国际田径场、高标准学生公寓与现代化餐厅，致力于为广大学子提供一流的高品质教育。', '湖北省武汉市汉阳区教育路88号', 30.552100, 114.281200, '027-87654321', '民办高品质寄宿', '高中部/初中部', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800', 1, 1);

-- 初始轮播图
INSERT INTO `doupi_recruit_banner` (`title`, `image_url`, `link_url`, `status`, `sort_order`)
VALUES 
('汉外华襄2026招生访校预约开启', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', '/pages/appointment/index', 'active', 1),
('走近华襄：名师领航 逐梦启程', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', '/pages/campus-detail/index', 'active', 2);

-- 初始系统配置 (时间段与开放规则)
INSERT INTO `doupi_recruit_config` (`config_key`, `config_value`, `remark`)
VALUES 
('time_slots', '[{"slotId":"1","name":"上午 09:00 - 11:30","maxQuota":30,"startTime":"09:00","endTime":"11:30"},{"slotId":"2","name":"下午 14:00 - 16:30","maxQuota":30,"startTime":"14:00","endTime":"16:30"}]', '每日可预约时间段及名额'),
('campus_list', '["高中部","初中部","国际部"]', '学部校区列表'),
('basic_config', '{"appName":"华襄预约","contactPhone":"027-87654321","openDaysAhead":14,"enableSms":false,"needAudit":false}', '基础配置');

-- 初始示例预约记录 (方便看板展示和核销测试)
INSERT INTO `doupi_recruit_appointment` (`appointment_no`, `openid`, `status`, `parent_name`, `parent_phone`, `student_name`, `student_gender`, `student_grade`, `current_school`, `campus_id`, `campus_name`, `visit_date`, `time_slot`, `check_in_code`, `teacher_id`, `teacher_name`, `remark`)
VALUES 
('AP202609260001', 'mock_openid_01', 'APPROVED', '周先生', '13800138001', '周小明', '男', '九年级', '汉阳某中学', 'default', '汉外华襄主校区', '2026-09-27', '上午 09:00 - 11:30', '892101', '5', '周珲', '希望了解高一实验班办学特色与师资'),
('AP202609260002', 'mock_openid_02', 'VERIFIED', '李女士', '13900139002', '李思思', '女', '初三', '武汉实验初中', 'default', '汉外华襄主校区', '2026-09-26', '上午 09:00 - 11:30', '773204', '5', '周珲', '已到校完成参观咨询'),
('AP202609260003', 'mock_openid_03', 'PENDING', '张先生', '13700137003', '张浩宇', '男', '高一', '外地转学', 'default', '汉外华襄主校区', '2026-09-28', '下午 14:00 - 16:30', '336512', '', '', '询问高二理科借读政策');

-- ----------------------------------------------------------------------------
-- Web管理后台菜单权限配置 (招生管理: 2200)
-- ----------------------------------------------------------------------------
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES 
(2200, '招生管理', 0, 3, 'recruit', NULL, 1, 0, 'M', '0', '0', '', 'peoples', 'admin', sysdate(), '', NULL, '招生预约管理目录')
ON DUPLICATE KEY UPDATE `menu_name`=VALUES(`menu_name`);

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES 
(2201, '招生看板', 2200, 1, 'dashboard', 'recruit/dashboard/index', 1, 0, 'C', '0', '0', 'recruit:dashboard:view', 'chart', 'admin', sysdate(), '', NULL, '招生统计看板'),
(2202, '预约记录', 2200, 2, 'appointment', 'recruit/appointment/index', 1, 0, 'C', '0', '0', 'recruit:appointment:list', 'documentation', 'admin', sysdate(), '', NULL, '访校预约记录'),
(2203, '现场核销', 2200, 3, 'verify', 'recruit/verify/index', 1, 0, 'C', '0', '0', 'recruit:verify:edit', 'checkbox', 'admin', sysdate(), '', NULL, '现场核销登记'),
(2204, '教师绑定', 2200, 4, 'binding', 'recruit/binding/index', 1, 0, 'C', '0', '0', 'recruit:binding:list', 'user', 'admin', sysdate(), '', NULL, '招生教师绑定审核'),
(2206, '排班配置', 2200, 6, 'config', 'recruit/config/index', 1, 0, 'C', '0', '0', 'recruit:config:edit', 'component', 'admin', sysdate(), '', NULL, '招生时间段与配置')
ON DUPLICATE KEY UPDATE `menu_name`=VALUES(`menu_name`);
