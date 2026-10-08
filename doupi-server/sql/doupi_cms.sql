/*
 * 豆皮校园管理系统 - 官网CMS独立模块 (doupi-cms) 数据表与初始数据 DDL
 * 适用数据库: stuck-mg / MySQL 8.0+
 */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. 官网门户基础参数表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_config`;
CREATE TABLE `doupi_cms_config` (
  `config_id` bigint NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `config_key` varchar(64) NOT NULL COMMENT '参数键名',
  `config_value` text NOT NULL COMMENT '参数键值(JSON或字符串)',
  `config_name` varchar(128) NOT NULL COMMENT '参数中文名称',
  `remark` varchar(255) DEFAULT '' COMMENT '备注说明',
  `create_by` varchar(64) DEFAULT 'admin' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网门户参数表';

-- 初始门户参数数据
INSERT INTO `doupi_cms_config` (`config_key`, `config_value`, `config_name`, `remark`) VALUES
('site_name', '汉外华襄复读中心', '学校站点名称', '官网显示主名称'),
('site_name_en', 'HUAXIANG SENIOR YEAR CENTER', '站点英文名称', '官网英文字头'),
('slogan', '不是复读，是再出发', '办学主标语', '首页巨幕Slogan'),
('subtitle', '只专注高三。让每一份不甘，都拥有重新抵达的路径。', '办学副标题', '首页巨幕副标题'),
('kicker', 'ONE YEAR. A NEW POSSIBILITY.', '英文副标', '大标题前导标语'),
('address', '武汉市江夏区武汉海淀外国语实验学校（北门）', '校区详细地址', '页脚与联系栏目'),
('hotlines', '["027-81777887", "027-81777838"]', '官方咨询热线', '全站悬浮与页脚'),
('admissions_line', '400-0000-000', '全国招生专线', '简章与咨询页'),
('office_hours', '周一至周日 8:30–17:30', '咨询接待时间', '访校接待时段'),
('icp', '鄂ICP备2026055716号-1', 'ICP备案号', '页脚备案'),
('stat_results', '[{"n":"92.6%","label":"2026 届本科上线率"},{"n":"+86","label":"平均提分（分）"},{"n":"318","label":"600 分以上人数"},{"n":"146","label":"双一流院校录取"}]', '核心办学成效战报', '首页数据看板'),
('stat_campus', '[{"n":"130","label":"亩校园面积"},{"n":"12","label":"万㎡建筑面积"},{"n":"1100","label":"人千人礼堂"},{"n":"10","label":"万册图书馆藏"}]', '校园硬核硬件指标', '走进校园')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`), `config_name`=VALUES(`config_name`);

-- ----------------------------------------------------------------------------
-- 2. 官网公文与资讯表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_article`;
CREATE TABLE `doupi_cms_article` (
  `article_id` bigint NOT NULL AUTO_INCREMENT COMMENT '资讯ID',
  `title` varchar(255) NOT NULL COMMENT '文章标题',
  `kind` varchar(32) NOT NULL DEFAULT 'updates' COMMENT '类型: updates-高招资讯 notices-校园公告',
  `category` varchar(64) NOT NULL DEFAULT '校园动态' COMMENT '栏目分类',
  `summary` varchar(500) DEFAULT '' COMMENT '摘要提炼',
  `content` longtext COMMENT '富文本正文',
  `cover_url` varchar(512) DEFAULT '' COMMENT '封面图片URL',
  `published_date` varchar(20) DEFAULT '' COMMENT '发布日期(YYYY-MM-DD)',
  `author` varchar(64) DEFAULT '汉外华襄校办' COMMENT '发布作者/署名',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-正常发布 1-草稿箱',
  `sort_order` int DEFAULT 0 COMMENT '排序权重',
  `create_by` varchar(64) DEFAULT 'admin' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`article_id`),
  KEY `idx_kind` (`kind`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网公文与资讯表';

-- 初始公文与资讯数据
INSERT INTO `doupi_cms_article` (`article_id`, `title`, `kind`, `category`, `summary`, `content`, `published_date`, `author`, `status`, `sort_order`) VALUES
(1, '2026 年秋季高三复读招生简章与收费标准公示', 'updates', '招生动态', '面向湖北及周边省份招收应往届高三毕业生，按高考成绩分层编班，即日起开放到校咨询与学位预定。设立领军班、卓越班、实验班三类班型。', '2026年秋季高三复读招生正式全面启动。学校秉承「只做高三，办有尊严的提分教育」宗旨，汇聚特级名师与原华师一附中功勋团队，实行全封闭寄宿制、日清周结小班分层管理。即日起面向全省应往届学子开放学位预约。', '2026-03-15', '汉外华襄招生办', '0', 1),
(2, '一模考后分层学情分析会暨二轮复习动员大会举行', 'updates', '教学教研', '学科首席教师分别就各学科暴露出的典型失分点展开专题剖析，明确下阶段讲练重点与个性化答疑安排。', '全体高三教师就武汉市三月调考各学科数据展开大数据精细复盘，聚焦关键分数段学生的易错点和增长空间，量身定制二轮冲刺方案。', '2026-03-08', '教务教研处', '0', 2),
(3, '高三成人礼暨百日冲刺誓师大会隆重举行', 'updates', '学生活动', '全体师生与家长齐聚千人礼堂，以责任与梦想为名，共同走过成人门，吹响决战六月的号角。', '冠笄之礼，十八立志。全体高三学子在家长与名师团队的见证下跨越得胜门，铮铮誓言响彻礼堂。', '2026-02-28', '学生发展处', '0', 3),
(4, '关于 2026 届高考体检安排及注意事项的通知', 'notices', '重要通知', '请各班主任按照时间表组织学生有序乘车前往指定医院体检，注意空腹及作息调整。', '根据招考办统一安排，复读中心全体学子将于3月15日上午统一进行高考体检。请全体考生前一日保持规律饮食与睡眠，体检当天早晨禁食禁水。', '2026-03-12', '汉外华襄校办', '0', 1),
(5, '三月八省联考考场编排与监考工作要求', 'notices', '考务通知', '严格对标新高考全真考场环境，全程视频监控，考后即刻启动全卷精细化网评与讲评复盘。', '本次联考完全按照高考标准化考场组织，配备无线信号屏蔽仪与人脸识别验证设备，切实帮助复读学子全真演练临场心态。', '2026-03-01', '考务中心', '0', 2)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `content`=VALUES(`content`);

-- ----------------------------------------------------------------------------
-- 3. 官网名师天团表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_teacher`;
CREATE TABLE `doupi_cms_teacher` (
  `teacher_id` bigint NOT NULL AUTO_INCREMENT COMMENT '名师ID',
  `slug` varchar(64) NOT NULL COMMENT 'URL别名/唯一标识',
  `name` varchar(64) NOT NULL COMMENT '教师姓名',
  `subject` varchar(32) NOT NULL COMMENT '任教学科',
  `title` varchar(64) NOT NULL COMMENT '职级头衔(如副校长/语文特级教师)',
  `category` varchar(32) NOT NULL DEFAULT 'faculty' COMMENT '类别: principal-校级领导 special-特级教师 backbone-骨干',
  `group_name` varchar(32) NOT NULL DEFAULT 'faculty' COMMENT '群组: management-管理层 faculty-学科名师',
  `tags` varchar(255) DEFAULT '' COMMENT '荣誉标签(英文逗号分隔)',
  `bio` text COMMENT '生平履历与名校背景介绍',
  `quote` varchar(255) DEFAULT '' COMMENT '治学格言/名言金句',
  `years` int DEFAULT 10 COMMENT '深耕高中备考教龄',
  `achievement` varchar(255) DEFAULT '' COMMENT '标杆荣誉/突出战绩',
  `avatar_url` varchar(512) DEFAULT '' COMMENT '名师正面肖像图URL',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`teacher_id`),
  UNIQUE KEY `uk_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网名师天团表';

-- 初始名师数据
INSERT INTO `doupi_cms_teacher` (`teacher_id`, `slug`, `name`, `subject`, `title`, `category`, `group_name`, `tags`, `bio`, `quote`, `years`, `achievement`, `status`, `sort_order`) VALUES
(1, 'wang-zhong', '王忠', '化学', '校长', 'principal', 'management', '中学正高级教师,化学特级教师,国际奥赛金牌教练', '原华中师大一附中党委书记兼副校长，湖北省督学、华中师大硕士研究生导师。深耕高三备考与拔尖创新人才培养三十余载。', '把方程式当成故事来讲。', 32, '享受国务院特殊津贴专家', '0', 1),
(2, 'meng-zhaokui', '孟昭奎', '数学', '副校长', 'principal', 'management', '中学高级教师,高考状元教师,功勋班主任', '原华中师大附属武当中学副校长、督学，拥有极其丰富的高考命题与数学备考抓分经验。', '每一道压轴题，都是几道基础题的组合。', 28, '湖北省骨干教师', '0', 2),
(3, 'xie-zhenxiang', '谢贞祥', '语文', '副校长', 'principal', 'management', '中学高级教师,湖北省优秀语文教师,国家二级心理咨询师', '原华师一附中副校长，曾任华师一附中初中部校长。善于化繁为简，点拨高三学子作文与阅读核心得分技巧。', '读懂题目，就赢了一半。', 29, '武汉市优秀教育工作者', '0', 3),
(4, 'tan-weisheng', '谭伟生', '历史', '华襄复读中心主任', 'principal', 'management', '中学正高级教师,历史特级教师,高考状元教师', '长期深耕高中历史教学与高考备考顶层设计，所带班级多人考入清华北大及双一流高校。', '历史题考的是逻辑，不是记忆。', 27, '湖北省优秀历史教师', '0', 4),
(5, 'zhao-yuliang', '赵育亮', '语文', '语文学科首席教师', 'special', 'faculty', '中学正高级教师,语文特级教师,全国优秀语文教师', '享受武汉市人民政府专项津贴专家，国家级观摩课一等奖获得者。主讲高考现代文阅读与高分写作模型。', '阅读是知识的输入，写作是逻辑的绽放。', 30, '国家级优质课一等奖', '0', 5),
(6, 'zhang-zhuhua', '张祝华', '数学', '数学学科首席教师', 'backbone', 'faculty', '中学高级教师,湖北省骨干教师,省级优质课一等奖', '原华师一附中卓越班主任，武汉市高考状元班主任。精通高考数学题型归纳与思维导图拆解。', '用清晰的思维模型替代盲目的题海冲刺。', 24, '武汉市高考状元班主任', '0', 6),
(7, 'li-dexian', '李德贤', '英语', '英语学科首席教师', 'special', 'faculty', '中学高级教师,英语特级教师,全国优秀外语教师', '湖北省“名师档案”入选者，精研新高考读后续写与听力突破，培养百余位高考英语140分以上高分学员。', '语言是练出来的，不是背出来的。', 26, '湖北省特级教师', '0', 7)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `title`=VALUES(`title`), `quote`=VALUES(`quote`);

-- ----------------------------------------------------------------------------
-- 4. 官网校园建筑与设施表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_facility`;
CREATE TABLE `doupi_cms_facility` (
  `facility_id` bigint NOT NULL AUTO_INCREMENT COMMENT '设施ID',
  `facility_code` varchar(32) NOT NULL COMMENT '设施编号(如c1,c2)',
  `name` varchar(64) NOT NULL COMMENT '建筑/场馆名称',
  `tag` varchar(64) NOT NULL COMMENT '设施标签(如独立卫浴/4人间)',
  `zone` varchar(32) NOT NULL DEFAULT '教学' COMMENT '所属分区: 教学/运动/生活/生态',
  `area` varchar(64) DEFAULT '' COMMENT '建筑占地面积',
  `detail` text COMMENT '详细硬件与功能介绍',
  `image_url` varchar(512) DEFAULT '' COMMENT '实景高清照片URL',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-正常 1-隐藏',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`facility_id`),
  UNIQUE KEY `uk_facility_code` (`facility_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网校园设施表';

-- 初始设施数据
INSERT INTO `doupi_cms_facility` (`facility_id`, `facility_code`, `name`, `tag`, `zone`, `area`, `detail`, `image_url`, `status`, `sort_order`) VALUES
(1, 'c1', '高复部独立教学楼', '静音新风 · 智慧黑板 · 专属自习位', '教学', '28,000 ㎡', '专为高三备考设计的独立教学综合楼，全楼配备静音新风系统与护眼光源，单人专属固定宽桌自习位，每层配备名师集中答疑辅导室。', '/assets/campus-environment.jpg', '0', 1),
(2, 'c2', '学子公寓', '4人间 · 独立双卫 · 24h中央热水', '生活', '32,000 ㎡', '标准4人间公寓，实木家具，干湿分离双卫，全天候生活老师驻守与星级宿管体系，作息严格规范，安静舒心。', '', '0', 2),
(3, 'c3', '千人学术报告厅', '1100座 · 专业声学 · 高清大屏', '生活', '4,500 ㎡', '举办百日誓师、名师大讲堂、高考志愿填报讲座的核心主场，配备专业线阵音响与剧院级阶梯软座。', '', '0', 3),
(4, 'c4', '棒球运动场', '专业草坪 · 击球笼 · 夜间照明', '运动', '12,000 ㎡', '华中区标杆级标准棒球训练场，每周定期组织释放备考压力，阳光奔跑，强健体魄。', '/assets/baseball-activity.gif', '0', 4)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `tag`=VALUES(`tag`);

-- ----------------------------------------------------------------------------
-- 5. 官网轮播海报横幅表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_banner`;
CREATE TABLE `doupi_cms_banner` (
  `banner_id` bigint NOT NULL AUTO_INCREMENT COMMENT '轮播图ID',
  `title` varchar(128) NOT NULL COMMENT '海报标题',
  `image_url` varchar(512) NOT NULL COMMENT '海报图片URL',
  `link_url` varchar(512) DEFAULT '' COMMENT '点击跳转链接',
  `platform` varchar(32) DEFAULT 'all' COMMENT '展示端: all-全端 pc-电脑端 mobile-手机端',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-启用 1-停用',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网轮播横幅表';

-- 初始轮播图
INSERT INTO `doupi_cms_banner` (`banner_id`, `title`, `image_url`, `link_url`, `platform`, `status`, `sort_order`) VALUES
(1, '2026届高三复读秋季火热预约中', '/assets/campus-environment.jpg', '/admissions/consultation', 'all', '0', 1)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- ----------------------------------------------------------------------------
-- 6. 官网常见问答表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_faq`;
CREATE TABLE `doupi_cms_faq` (
  `faq_id` bigint NOT NULL AUTO_INCREMENT COMMENT '问答ID',
  `category` varchar(32) NOT NULL COMMENT '分类: 报名/费用/课程/管理/住宿/心理',
  `question` varchar(255) NOT NULL COMMENT '咨询问题',
  `answer` text NOT NULL COMMENT '官方规范答复',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`faq_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网常见问答表';

-- 初始问答数据
INSERT INTO `doupi_cms_faq` (`faq_id`, `category`, `question`, `answer`, `status`, `sort_order`) VALUES
(1, '报名', '复读需要满足什么条件？', '面向参加过高考、希望再拼一年的应往届高三学生。我们会通过入学测评了解学生基础，据此提供科学的分层编班建议。', '0', 1),
(2, '报名', '如何报名或预约到校参观？', '可通过网站「预约游园」或「预约咨询」提交联系方式，招生老师会在24小时内电话确认到校时间，并提供一对一学情规划。', '0', 2),
(3, '费用', '学费包含哪些项目？有奖学金政策吗？', '学费包含全部高中备考课程、校本教辅资料与各阶段联考测评费用。针对优异高考成绩设立四档学费全免或半免奖学金，详见招生简章。', '0', 3),
(4, '课程', '班级规模有多大？如何做到分层提分？', '严格控制班级人数，实行不超过40人的精品小班分层教学，拔尖冲刺班不超过30人，每日限时练，日清周结，不留疑问过夜。', '0', 4),
(5, '管理', '是否封闭管理？学生手机如何管理？', '实行全日制封闭式准军事化管理，周一至周六手机统一放入防磁密码保管柜封存，由生活老师全天候值守，保障静心专注。', '0', 5)
ON DUPLICATE KEY UPDATE `question`=VALUES(`question`), `answer`=VALUES(`answer`);

-- ----------------------------------------------------------------------------
-- 7. 后台管理系统独立菜单配置 (官网CMS: 2500)
-- ----------------------------------------------------------------------------
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES 
(2500, '官网CMS', 0, 4, 'cms', NULL, 1, 0, 'M', '0', '0', '', 'documentation', 'admin', sysdate(), '', NULL, '官网内容管理主目录')
ON DUPLICATE KEY UPDATE `menu_name`=VALUES(`menu_name`);

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES 
(2501, '门户参数', 2500, 1, 'config', 'cms/config/index', 1, 0, 'C', '0', '0', 'cms:config:list', 'system', 'admin', sysdate(), '', NULL, '官网核心参数与指标'),
(2502, '公文资讯', 2500, 2, 'article', 'cms/article/index', 1, 0, 'C', '0', '0', 'cms:article:list', 'message', 'admin', sysdate(), '', NULL, '官网校园公告与高招新闻'),
(2503, '名师天团', 2500, 3, 'teacher', 'cms/teacher/index', 1, 0, 'C', '0', '0', 'cms:teacher:list', 'peoples', 'admin', sysdate(), '', NULL, '官网清北名师队伍'),
(2504, '校园设施', 2500, 4, 'facility', 'cms/facility/index', 1, 0, 'C', '0', '0', 'cms:facility:list', 'tree', 'admin', sysdate(), '', NULL, '官网校园建筑与实景导览'),
(2505, '轮播横幅', 2500, 5, 'banner', 'cms/banner/index', 1, 0, 'C', '0', '0', 'cms:banner:list', 'guide', 'admin', sysdate(), '', NULL, '官网巨幕轮播海报'),
(2506, '常见问答', 2500, 6, 'faq', 'cms/faq/index', 1, 0, 'C', '0', '0', 'cms:faq:list', 'question', 'admin', sysdate(), '', NULL, '官网高频招生问答释疑')
ON DUPLICATE KEY UPDATE `menu_name`=VALUES(`menu_name`);

-- ----------------------------------------------------------------------------
-- 8. 为超级管理员(角色ID 1)一键绑定 CMS 菜单权限
-- ----------------------------------------------------------------------------
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`) VALUES
(1, 2500),
(1, 2501),
(1, 2502),
(1, 2503),
(1, 2504),
(1, 2505),
(1, 2506)
ON DUPLICATE KEY UPDATE `menu_id`=VALUES(`menu_id`);

SET FOREIGN_KEY_CHECKS = 1;
