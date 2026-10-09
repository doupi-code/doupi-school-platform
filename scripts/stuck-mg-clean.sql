-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: stuck-mg
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `QRTZ_BLOB_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_BLOB_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_BLOB_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `blob_data` blob COMMENT '存放持久化Trigger对象',
  PRIMARY KEY (`sched_name`,`trigger_name`,`trigger_group`),
  CONSTRAINT `QRTZ_BLOB_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blob类型的触发器表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_BLOB_TRIGGERS`
--

LOCK TABLES `QRTZ_BLOB_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_BLOB_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_BLOB_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_CALENDARS`
--

DROP TABLE IF EXISTS `QRTZ_CALENDARS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_CALENDARS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `calendar_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日历名称',
  `calendar` blob NOT NULL COMMENT '存放持久化calendar对象',
  PRIMARY KEY (`sched_name`,`calendar_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日历信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_CALENDARS`
--

LOCK TABLES `QRTZ_CALENDARS` WRITE;
/*!40000 ALTER TABLE `QRTZ_CALENDARS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_CALENDARS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_CRON_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_CRON_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_CRON_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `cron_expression` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'cron表达式',
  `time_zone_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '时区',
  PRIMARY KEY (`sched_name`,`trigger_name`,`trigger_group`),
  CONSTRAINT `QRTZ_CRON_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cron类型的触发器表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_CRON_TRIGGERS`
--

LOCK TABLES `QRTZ_CRON_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_CRON_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_CRON_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_FIRED_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_FIRED_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_FIRED_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `entry_id` varchar(95) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度器实例id',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `instance_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度器实例名',
  `fired_time` bigint NOT NULL COMMENT '触发的时间',
  `sched_time` bigint NOT NULL COMMENT '定时器制定的时间',
  `priority` int NOT NULL COMMENT '优先级',
  `state` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态',
  `job_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务名称',
  `job_group` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务组名',
  `is_nonconcurrent` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否并发',
  `requests_recovery` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否接受恢复执行',
  PRIMARY KEY (`sched_name`,`entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='已触发的触发器表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_FIRED_TRIGGERS`
--

LOCK TABLES `QRTZ_FIRED_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_FIRED_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_FIRED_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_JOB_DETAILS`
--

DROP TABLE IF EXISTS `QRTZ_JOB_DETAILS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_JOB_DETAILS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `job_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `job_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务组名',
  `description` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相关介绍',
  `job_class_name` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '执行任务类名称',
  `is_durable` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否持久化',
  `is_nonconcurrent` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否并发',
  `is_update_data` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否更新数据',
  `requests_recovery` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '是否接受恢复执行',
  `job_data` blob COMMENT '存放持久化job对象',
  PRIMARY KEY (`sched_name`,`job_name`,`job_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务详细信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_JOB_DETAILS`
--

LOCK TABLES `QRTZ_JOB_DETAILS` WRITE;
/*!40000 ALTER TABLE `QRTZ_JOB_DETAILS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_JOB_DETAILS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_LOCKS`
--

DROP TABLE IF EXISTS `QRTZ_LOCKS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_LOCKS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `lock_name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '悲观锁名称',
  PRIMARY KEY (`sched_name`,`lock_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存储的悲观锁信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_LOCKS`
--

LOCK TABLES `QRTZ_LOCKS` WRITE;
/*!40000 ALTER TABLE `QRTZ_LOCKS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_LOCKS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_PAUSED_TRIGGER_GRPS`
--

DROP TABLE IF EXISTS `QRTZ_PAUSED_TRIGGER_GRPS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_PAUSED_TRIGGER_GRPS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  PRIMARY KEY (`sched_name`,`trigger_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='暂停的触发器表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_PAUSED_TRIGGER_GRPS`
--

LOCK TABLES `QRTZ_PAUSED_TRIGGER_GRPS` WRITE;
/*!40000 ALTER TABLE `QRTZ_PAUSED_TRIGGER_GRPS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_PAUSED_TRIGGER_GRPS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_SCHEDULER_STATE`
--

DROP TABLE IF EXISTS `QRTZ_SCHEDULER_STATE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_SCHEDULER_STATE` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `instance_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '实例名称',
  `last_checkin_time` bigint NOT NULL COMMENT '上次检查时间',
  `checkin_interval` bigint NOT NULL COMMENT '检查间隔时间',
  PRIMARY KEY (`sched_name`,`instance_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调度器状态表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_SCHEDULER_STATE`
--

LOCK TABLES `QRTZ_SCHEDULER_STATE` WRITE;
/*!40000 ALTER TABLE `QRTZ_SCHEDULER_STATE` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_SCHEDULER_STATE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_SIMPLE_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_SIMPLE_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_SIMPLE_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `repeat_count` bigint NOT NULL COMMENT '重复的次数统计',
  `repeat_interval` bigint NOT NULL COMMENT '重复的间隔时间',
  `times_triggered` bigint NOT NULL COMMENT '已经触发的次数',
  PRIMARY KEY (`sched_name`,`trigger_name`,`trigger_group`),
  CONSTRAINT `QRTZ_SIMPLE_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简单触发器的信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_SIMPLE_TRIGGERS`
--

LOCK TABLES `QRTZ_SIMPLE_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_SIMPLE_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_SIMPLE_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_SIMPROP_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_SIMPROP_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_SIMPROP_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_name的外键',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_triggers表trigger_group的外键',
  `str_prop_1` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第一个参数',
  `str_prop_2` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第二个参数',
  `str_prop_3` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'String类型的trigger的第三个参数',
  `int_prop_1` int DEFAULT NULL COMMENT 'int类型的trigger的第一个参数',
  `int_prop_2` int DEFAULT NULL COMMENT 'int类型的trigger的第二个参数',
  `long_prop_1` bigint DEFAULT NULL COMMENT 'long类型的trigger的第一个参数',
  `long_prop_2` bigint DEFAULT NULL COMMENT 'long类型的trigger的第二个参数',
  `dec_prop_1` decimal(13,4) DEFAULT NULL COMMENT 'decimal类型的trigger的第一个参数',
  `dec_prop_2` decimal(13,4) DEFAULT NULL COMMENT 'decimal类型的trigger的第二个参数',
  `bool_prop_1` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Boolean类型的trigger的第一个参数',
  `bool_prop_2` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Boolean类型的trigger的第二个参数',
  PRIMARY KEY (`sched_name`,`trigger_name`,`trigger_group`),
  CONSTRAINT `QRTZ_SIMPROP_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `trigger_name`, `trigger_group`) REFERENCES `QRTZ_TRIGGERS` (`sched_name`, `trigger_name`, `trigger_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步机制的行锁表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_SIMPROP_TRIGGERS`
--

LOCK TABLES `QRTZ_SIMPROP_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_SIMPROP_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_SIMPROP_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QRTZ_TRIGGERS`
--

DROP TABLE IF EXISTS `QRTZ_TRIGGERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `QRTZ_TRIGGERS` (
  `sched_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度名称',
  `trigger_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器的名字',
  `trigger_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器所属组的名字',
  `job_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_job_details表job_name的外键',
  `job_group` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'qrtz_job_details表job_group的外键',
  `description` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相关介绍',
  `next_fire_time` bigint DEFAULT NULL COMMENT '上一次触发时间（毫秒）',
  `prev_fire_time` bigint DEFAULT NULL COMMENT '下一次触发时间（默认为-1表示不触发）',
  `priority` int DEFAULT NULL COMMENT '优先级',
  `trigger_state` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器状态',
  `trigger_type` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发器的类型',
  `start_time` bigint NOT NULL COMMENT '开始时间',
  `end_time` bigint DEFAULT NULL COMMENT '结束时间',
  `calendar_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日程表名称',
  `misfire_instr` smallint DEFAULT NULL COMMENT '补偿执行的策略',
  `job_data` blob COMMENT '存放持久化job对象',
  PRIMARY KEY (`sched_name`,`trigger_name`,`trigger_group`),
  KEY `sched_name` (`sched_name`,`job_name`,`job_group`),
  CONSTRAINT `QRTZ_TRIGGERS_ibfk_1` FOREIGN KEY (`sched_name`, `job_name`, `job_group`) REFERENCES `QRTZ_JOB_DETAILS` (`sched_name`, `job_name`, `job_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='触发器详细信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QRTZ_TRIGGERS`
--

LOCK TABLES `QRTZ_TRIGGERS` WRITE;
/*!40000 ALTER TABLE `QRTZ_TRIGGERS` DISABLE KEYS */;
/*!40000 ALTER TABLE `QRTZ_TRIGGERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_article`
--

DROP TABLE IF EXISTS `doupi_cms_article`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `sort_order` int DEFAULT '0' COMMENT '排序权重',
  `create_by` varchar(64) DEFAULT 'admin' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`article_id`),
  KEY `idx_kind` (`kind`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网公文与资讯表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_article`
--

LOCK TABLES `doupi_cms_article` WRITE;
/*!40000 ALTER TABLE `doupi_cms_article` DISABLE KEYS */;
INSERT INTO `doupi_cms_article` VALUES (1,'2026 年秋季高三复读招生简章与收费标准公示','updates','招生动态','面向湖北及周边省份招收应往届高三毕业生，按高考成绩分层编班，即日起开放到校咨询与学位预定。设立领军班、卓越班、实验班三类班型。','2026年秋季高三复读招生正式全面启动。学校秉承「只做高三，办有尊严的提分教育」宗旨，汇聚特级名师与原华师一附中功勋团队，实行全封闭寄宿制、日清周结小班分层管理。即日起面向全省应往届学子开放学位预约。','','2026-03-15','汉外华襄招生办','0',1,'admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(2,'一模考后分层学情分析会暨二轮复习动员大会举行','updates','教学教研','学科首席教师分别就各学科暴露出的典型失分点展开专题剖析，明确下阶段讲练重点与个性化答疑安排。','全体高三教师就武汉市三月调考各学科数据展开大数据精细复盘，聚焦关键分数段学生的易错点和增长空间，量身定制二轮冲刺方案。','','2026-03-08','教务教研处','0',2,'admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(3,'高三成人礼暨百日冲刺誓师大会隆重举行','updates','学生活动','全体师生与家长齐聚千人礼堂，以责任与梦想为名，共同走过成人门，吹响决战六月的号角。','冠笄之礼，十八立志。全体高三学子在家长与名师团队的见证下跨越得胜门，铮铮誓言响彻礼堂。','','2026-02-28','学生发展处','0',3,'admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(4,'关于 2026 届高考体检安排及注意事项的通知','notices','重要通知','请各班主任按照时间表组织学生有序乘车前往指定医院体检，注意空腹及作息调整。','根据招考办统一安排，复读中心全体学子将于3月15日上午统一进行高考体检。请全体考生前一日保持规律饮食与睡眠，体检当天早晨禁食禁水。','','2026-03-12','汉外华襄校办','0',1,'admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(5,'三月八省联考考场编排与监考工作要求','notices','考务通知','严格对标新高考全真考场环境，全程视频监控，考后即刻启动全卷精细化网评与讲评复盘。','本次联考完全按照高考标准化考场组织，配备无线信号屏蔽仪与人脸识别验证设备，切实帮助复读学子全真演练临场心态。','','2026-03-01','考务中心','0',2,'admin','2026-10-05 07:18:35','','2026-10-05 07:18:35');
/*!40000 ALTER TABLE `doupi_cms_article` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_banner`
--

DROP TABLE IF EXISTS `doupi_cms_banner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_cms_banner` (
  `banner_id` bigint NOT NULL AUTO_INCREMENT COMMENT '轮播图ID',
  `title` varchar(128) NOT NULL COMMENT '海报标题',
  `image_url` varchar(512) NOT NULL COMMENT '海报图片URL',
  `link_url` varchar(512) DEFAULT '' COMMENT '点击跳转链接',
  `platform` varchar(32) DEFAULT 'all' COMMENT '展示端: all-全端 pc-电脑端 mobile-手机端',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-启用 1-停用',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网轮播横幅表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_banner`
--

LOCK TABLES `doupi_cms_banner` WRITE;
/*!40000 ALTER TABLE `doupi_cms_banner` DISABLE KEYS */;
INSERT INTO `doupi_cms_banner` VALUES (1,'2026届高三复读秋季火热预约中','/assets/campus-environment.jpg','/admissions/consultation','all','0',1,'2026-10-05 07:18:36','2026-10-05 07:18:36');
/*!40000 ALTER TABLE `doupi_cms_banner` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_config`
--

DROP TABLE IF EXISTS `doupi_cms_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网门户参数表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_config`
--

LOCK TABLES `doupi_cms_config` WRITE;
/*!40000 ALTER TABLE `doupi_cms_config` DISABLE KEYS */;
INSERT INTO `doupi_cms_config` VALUES (1,'site_name','汉外华襄复读中心','学校站点名称','官网显示主名称','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(2,'site_name_en','HUAXIANG SENIOR YEAR CENTER','站点英文名称','官网英文字头','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(3,'slogan','不是复读，是再出发','办学主标语','首页巨幕Slogan','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(4,'subtitle','只专注高三。让每一份不甘，都拥有重新抵达的路径。','办学副标题','首页巨幕副标题','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(5,'kicker','ONE YEAR. A NEW POSSIBILITY.','英文副标','大标题前导标语','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(6,'address','武汉市江夏区武汉海淀外国语实验学校（北门）','校区详细地址','页脚与联系栏目','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(7,'hotlines','[\"027-81777887\", \"027-81777838\"]','官方咨询热线','全站悬浮与页脚','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(8,'admissions_line','400-0000-000','全国招生专线','简章与咨询页','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(9,'office_hours','周一至周日 8:30–17:30','咨询接待时间','访校接待时段','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(10,'icp','鄂ICP备20260930号-1','ICP备案号','页脚备案','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(11,'stat_results','[{\"n\":\"92.6%\",\"label\":\"2026 届本科上线率\"},{\"n\":\"+86\",\"label\":\"平均提分（分）\"},{\"n\":\"318\",\"label\":\"600 分以上人数\"},{\"n\":\"146\",\"label\":\"双一流院校录取\"}]','核心办学成效战报','首页数据看板','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35'),(12,'stat_campus','[{\"n\":\"130\",\"label\":\"亩校园面积\"},{\"n\":\"12\",\"label\":\"万㎡建筑面积\"},{\"n\":\"1100\",\"label\":\"人千人礼堂\"},{\"n\":\"10\",\"label\":\"万册图书馆藏\"}]','校园硬核硬件指标','走进校园','admin','2026-10-05 07:18:35','','2026-10-05 07:18:35');
/*!40000 ALTER TABLE `doupi_cms_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_facility`
--

DROP TABLE IF EXISTS `doupi_cms_facility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`facility_id`),
  UNIQUE KEY `uk_facility_code` (`facility_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网校园设施表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_facility`
--

LOCK TABLES `doupi_cms_facility` WRITE;
/*!40000 ALTER TABLE `doupi_cms_facility` DISABLE KEYS */;
INSERT INTO `doupi_cms_facility` VALUES (1,'c1','高复部独立教学楼','静音新风 · 智慧黑板 · 专属自习位','教学','28,000 ㎡','专为高三备考设计的独立教学综合楼，全楼配备静音新风系统与护眼光源，单人专属固定宽桌自习位，每层配备名师集中答疑辅导室。','/assets/campus-environment.jpg','0',1,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(2,'c2','学子公寓','4人间 · 独立双卫 · 24h中央热水','生活','32,000 ㎡','标准4人间公寓，实木家具，干湿分离双卫，全天候生活老师驻守与星级宿管体系，作息严格规范，安静舒心。','','0',2,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(3,'c3','千人学术报告厅','1100座 · 专业声学 · 高清大屏','生活','4,500 ㎡','举办百日誓师、名师大讲堂、高考志愿填报讲座的核心主场，配备专业线阵音响与剧院级阶梯软座。','','0',3,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(4,'c4','棒球运动场','专业草坪 · 击球笼 · 夜间照明','运动','12,000 ㎡','华中区标杆级标准棒球训练场，每周定期组织释放备考压力，阳光奔跑，强健体魄。','/assets/baseball-activity.gif','0',4,'2026-10-05 07:18:35','2026-10-05 07:18:35');
/*!40000 ALTER TABLE `doupi_cms_facility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_faq`
--

DROP TABLE IF EXISTS `doupi_cms_faq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_cms_faq` (
  `faq_id` bigint NOT NULL AUTO_INCREMENT COMMENT '问答ID',
  `category` varchar(32) NOT NULL COMMENT '分类: 报名/费用/课程/管理/住宿/心理',
  `question` varchar(255) NOT NULL COMMENT '咨询问题',
  `answer` text NOT NULL COMMENT '官方规范答复',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`faq_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网常见问答表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_faq`
--

LOCK TABLES `doupi_cms_faq` WRITE;
/*!40000 ALTER TABLE `doupi_cms_faq` DISABLE KEYS */;
INSERT INTO `doupi_cms_faq` VALUES (1,'报名','复读需要满足什么条件？','面向参加过高考、希望再拼一年的应往届高三学生。我们会通过入学测评了解学生基础，据此提供科学的分层编班建议。','0',1,'2026-10-05 07:18:36','2026-10-05 07:18:36'),(2,'报名','如何报名或预约到校参观？','可通过网站「预约游园」或「预约咨询」提交联系方式，招生老师会在24小时内电话确认到校时间，并提供一对一学情规划。','0',2,'2026-10-05 07:18:36','2026-10-05 07:18:36'),(3,'费用','学费包含哪些项目？有奖学金政策吗？','学费包含全部高中备考课程、校本教辅资料与各阶段联考测评费用。针对优异高考成绩设立四档学费全免或半免奖学金，详见招生简章。','0',3,'2026-10-05 07:18:36','2026-10-05 07:18:36'),(4,'课程','班级规模有多大？如何做到分层提分？','严格控制班级人数，实行不超过40人的精品小班分层教学，拔尖冲刺班不超过30人，每日限时练，日清周结，不留疑问过夜。','0',4,'2026-10-05 07:18:36','2026-10-05 07:18:36'),(5,'管理','是否封闭管理？学生手机如何管理？','实行全日制封闭式准军事化管理，周一至周六手机统一放入防磁密码保管柜封存，由生活老师全天候值守，保障静心专注。','0',5,'2026-10-05 07:18:36','2026-10-05 07:18:36');
/*!40000 ALTER TABLE `doupi_cms_faq` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_global`
--

DROP TABLE IF EXISTS `doupi_cms_global`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_cms_global` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` varchar(50) NOT NULL COMMENT '布局类别: header, footer, seo, floating',
  `config_content` json NOT NULL COMMENT '具体配置结构化JSON',
  `remark` varchar(255) DEFAULT '' COMMENT '说明',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网全局布局与公共组件配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_global`
--

LOCK TABLES `doupi_cms_global` WRITE;
/*!40000 ALTER TABLE `doupi_cms_global` DISABLE KEYS */;
INSERT INTO `doupi_cms_global` VALUES (1,'header','{\"nav\": [{\"path\": \"/\", \"slug\": \"\", \"title\": \"首页\"}, {\"path\": \"/about\", \"slug\": \"about\", \"title\": \"关于华襄\", \"children\": [{\"desc\": \"办学历程与核心优势\", \"path\": \"/about/introduction\", \"slug\": \"introduction\", \"title\": \"中心概况\"}, {\"desc\": \"教育初心与育人主张\", \"path\": \"/about/philosophy\", \"slug\": \"philosophy\", \"title\": \"办学理念\"}, {\"desc\": \"独立校区与生活硬件\", \"path\": \"/about/campuses\", \"slug\": \"campuses\", \"title\": \"校园环境\"}]}, {\"path\": \"/senior-year\", \"slug\": \"senior-year\", \"title\": \"高三学年\", \"children\": [{\"desc\": \"新高考科学备考方案\", \"path\": \"/senior-year/curriculum\", \"slug\": \"curriculum\", \"title\": \"课程体系\"}, {\"desc\": \"清北领航与个性化培优\", \"path\": \"/senior-year/features\", \"slug\": \"features\", \"title\": \"特色课程\"}, {\"desc\": \"精细化时间与作息规范\", \"path\": \"/senior-year/teaching\", \"slug\": \"teaching\", \"title\": \"教学管理\"}, {\"desc\": \"三轮备考关键节点\", \"path\": \"/senior-year/planning\", \"slug\": \"planning\", \"title\": \"学年规划\"}]}, {\"path\": \"/faculty\", \"slug\": \"faculty\", \"title\": \"名师天团\", \"children\": [{\"desc\": \"名师阵容与学科梯队\", \"path\": \"/faculty\", \"slug\": \"\", \"title\": \"师资概览\"}, {\"desc\": \"特级教师与教研首席\", \"path\": \"/faculty/teachers\", \"slug\": \"teachers\", \"title\": \"教师名录\"}, {\"desc\": \"高考命题与校本题库\", \"path\": \"/faculty/research\", \"slug\": \"research\", \"title\": \"教研成果\"}]}, {\"path\": \"/campus-life\", \"slug\": \"campus-life\", \"title\": \"校园生活\", \"children\": [{\"desc\": \"寄宿作息与餐饮保障\", \"path\": \"/campus-life/daily\", \"slug\": \"daily\", \"title\": \"日常生活\"}, {\"desc\": \"心理疏导与体育锻炼\", \"path\": \"/campus-life/wellbeing\", \"slug\": \"wellbeing\", \"title\": \"心身护航\"}]}, {\"path\": \"/admissions\", \"slug\": \"admissions\", \"title\": \"招生录取\", \"children\": [{\"desc\": \"招生政策与流程\", \"path\": \"/admissions\", \"slug\": \"\", \"title\": \"招生总览\"}, {\"desc\": \"分层教学与班额标准\", \"path\": \"/admissions/plans\", \"slug\": \"plans\", \"title\": \"班型设置\"}, {\"desc\": \"报名条件与收费明细\", \"path\": \"/admissions/guide\", \"slug\": \"guide\", \"title\": \"招生简章\"}, {\"desc\": \"招生咨询热点答疑\", \"path\": \"/admissions/faq\", \"slug\": \"faq\", \"title\": \"常见问题\"}, {\"desc\": \"在线预约与到校访谈\", \"path\": \"/admissions/consultation\", \"slug\": \"consultation\", \"title\": \"预约咨询\"}]}, {\"path\": \"/news\", \"slug\": \"news\", \"title\": \"高考资讯\", \"children\": [{\"desc\": \"中心动态与官方发文\", \"path\": \"/news\", \"slug\": \"\", \"title\": \"新闻资讯\"}, {\"desc\": \"招考政策与分数分析\", \"path\": \"/news/gaokao\", \"slug\": \"gaokao\", \"title\": \"高考动态\"}]}], \"brand\": {\"mark\": \"华\", \"name\": \"汉外华襄复读中心\", \"nameEn\": \"HUAXIANG SENIOR YEAR CENTER\"}, \"quickActions\": [{\"href\": \"/admissions/consultation\", \"type\": \"primary\", \"title\": \"预约游园 / 诊断\"}]}','官网顶部导航栏与全站菜单配置','2026-10-06 02:14:09','2026-10-06 02:14:09'),(2,'footer','{\"cta\": {\"title\": \"重新出发，\\n从一次到访开始。\", \"kicker\": \"VISIT US / 来校园走一走\", \"buttonText\": \"预约游园 / 诊断\"}, \"icp\": \"鄂ICP备20260930号-1\", \"brand\": {\"name\": \"汉外华襄复读中心\", \"nameEn\": \"HUAXIANG SENIOR YEAR CENTER\", \"slogan\": \"只为高三，再出发的这一年。\\n全封闭管理 · 小班分层 · 名师执教\", \"address\": \"武汉市江夏区武汉海淀外国语实验学校（北门）\", \"hotlines\": [\"027-81777887\", \"027-81777838\"], \"officeHours\": \"周一至周日 8:30–17:30\", \"admissionsLine\": \"400-0000-000\"}, \"copyright\": \"© 2026 汉外华襄复读中心 · 版权所有\"}','官网全站底部页脚配置','2026-10-06 02:14:09','2026-10-06 02:14:09');
/*!40000 ALTER TABLE `doupi_cms_global` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_page`
--

DROP TABLE IF EXISTS `doupi_cms_page`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_cms_page` (
  `page_id` bigint NOT NULL AUTO_INCREMENT COMMENT '页面ID',
  `page_slug` varchar(100) NOT NULL COMMENT '页面访问路由 (如 / 或 about/campuses)',
  `page_name` varchar(100) NOT NULL COMMENT '页面中文名称',
  `seo_title` varchar(200) DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` varchar(200) DEFAULT NULL COMMENT 'SEO关键字',
  `seo_description` varchar(500) DEFAULT NULL COMMENT 'SEO描述',
  `status` char(1) DEFAULT '0' COMMENT '发布状态: 0=已发布, 1=草稿',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`page_id`),
  UNIQUE KEY `uk_slug` (`page_slug`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网页面定义表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_page`
--

LOCK TABLES `doupi_cms_page` WRITE;
/*!40000 ALTER TABLE `doupi_cms_page` DISABLE KEYS */;
INSERT INTO `doupi_cms_page` VALUES (1,'/','官网首页','汉外华襄复读中心 - 只专注高三 重新出发','武汉高考复读,湖北高三复读,华襄复读,高考提分','汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(2,'/about/introduction','中心概况','办学历程与优势 - 汉外华襄','复读优势,办学历程,华襄概况','汉外华襄复读中心办学历程与核心优势介绍。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(3,'/about/philosophy','办学理念','育人主张与初心 - 汉外华襄','办学理念,育人主张,高考提分','汉外华襄复读中心教育初心与育人主张。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(4,'/about/campuses','校园实景','校园环境与硬件设施 - 汉外华襄复读中心','校园面积,独立校区,寄宿环境,千人礼堂','在足够好的环境里安心向上，汉外华襄配备130亩独立红砖校园与现代化教学生活设施。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(5,'/senior-year/curriculum','课程体系','高三科学备考体系 - 汉外华襄','课程体系,科学备考,分层教学','新高考科学备考方案与课程体系。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(6,'/senior-year/features','特色课程','清北领航培优课程 - 汉外华襄','特色课程,拔尖培优,清北班','清北领航与个性化培优特色课程体系。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(7,'/senior-year/teaching','教学管理','精细化作息与日清周结 - 汉外华襄','教学管理,日清周结,全封闭管理','精细化时间管理与作息作风规范。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(8,'/senior-year/planning','学年规划','三轮冲刺备考规划 - 汉外华襄','学年规划,三轮复习,备考节点','高三全学年三轮备考关键规划与冲刺。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(9,'/faculty/teachers','名师天团','师资队伍与特级名师名录 - 汉外华襄复读中心','高考特级名师,高三功勋班主任,高考教研首席','特级教师与资深高三功勋团队，小班分层执教，专属学情诊断与答疑。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(10,'/faculty/research','教研成果','高考命题与校本教研 - 汉外华襄','教研成果,高考命题,校本题库','高考命题专家领衔的高考校本教研与题库。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(11,'/campus-life/daily','日常生活','寄宿与餐饮作息 - 汉外华襄','校园生活,寄宿管理,餐饮保障','寄宿作息与星级餐饮后勤保障。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(12,'/campus-life/wellbeing','心身护航','心理辅导与体能 - 汉外华襄','心理疏导,体能锻炼,心身护航','全程学情导师与专业心理疏导护航。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(13,'/admissions/plans','班型设置','分层编班与班额 - 汉外华襄','班型设置,分层教学,班额标准','针对不同基础学生的分层小班设置方案。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(14,'/admissions/guide','招生简章','招生简章与收费标准 - 汉外华襄','招生简章,报名条件,收费标准','权威公布招生政策、录取条件与费用标准。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(15,'/admissions/faq','常见问题','高三复读招生答疑与热点指南 - 汉外华襄复读中心','复读收费,招收条件,分层编班,作息管理','为考生及家长提供全面透明的高三复读就读指南与权威热点解答。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(16,'/admissions/consultation','预约咨询','在线预约到校诊断 - 汉外华襄','预约游园,学情诊断,到校咨询','在线预约参观游园及名师面对面学情诊断。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(17,'/news','新闻资讯','中心动态官方发文 - 汉外华襄','新闻资讯,官方通知,中心动态','官方资讯、动态活动与重要通知发文。','0','2026-10-06 02:14:32','2026-10-06 02:14:32'),(18,'/news/gaokao','高考动态','招考政策与分数复盘 - 汉外华襄','高考动态,招考政策,分数线分析','全省高招资讯、志愿填报政策与分数复盘。','0','2026-10-06 02:14:32','2026-10-06 02:14:32');
/*!40000 ALTER TABLE `doupi_cms_page` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_section`
--

DROP TABLE IF EXISTS `doupi_cms_section`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_cms_section` (
  `section_id` bigint NOT NULL AUTO_INCREMENT COMMENT '区块ID',
  `page_id` bigint NOT NULL COMMENT '所属页面ID',
  `section_type` varchar(50) NOT NULL COMMENT '区块类型: hero, results, intro, reasons, stories, faculty, campus, news, rich_text, faq',
  `section_name` varchar(100) NOT NULL COMMENT '区块别名',
  `sort_order` int DEFAULT '0' COMMENT '排序权重(越小越靠前)',
  `is_visible` tinyint(1) DEFAULT '1' COMMENT '是否可见: 1=可见, 0=隐藏',
  `content_data` json NOT NULL COMMENT '区块专属详细配置JSON',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`section_id`),
  KEY `idx_page_order` (`page_id`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网页面动态区块表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_section`
--

LOCK TABLES `doupi_cms_section` WRITE;
/*!40000 ALTER TABLE `doupi_cms_section` DISABLE KEYS */;
INSERT INTO `doupi_cms_section` VALUES (1,1,'hero','首屏品牌巨幕',1,1,'{\"kicker\": \"ONE YEAR. A NEW POSSIBILITY.\", \"slogan\": \"不是复读，是再出发\", \"ctaText\": \"预约游园 / 诊断 →\", \"noteText\": \"秋季班招生进行中 · 余位 115\\n红砖校园 · 专注高三\", \"noteYear\": \"2026\", \"subtitle\": \"只专注高三。让每一份不甘，都拥有重新抵达的路径。\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(2,1,'results','核心办学成效战报看板',2,1,'{\"items\": [{\"n\": \"92.6%\", \"label\": \"2026 届本科上线率\"}, {\"n\": \"+86\", \"label\": \"平均提分（分）\"}, {\"n\": \"318\", \"label\": \"600 分以上人数\"}, {\"n\": \"146\", \"label\": \"双一流院校录取\"}], \"kicker\": \"2026 RESULTS\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(3,1,'intro','办学理念引言',3,1,'{\"desc\": \"汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。\", \"title\": \"用更精准的一年，再攀一程\", \"kicker\": \"A FOCUSED YEAR\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(4,1,'reasons','四大办学优势与特色',4,1,'{\"items\": [{\"d\": \"纯高三沉浸式备考场域，排除一切外界干扰，作息规律精细到分，培养持久专注力。\", \"t\": \"专注高三，全封闭管理\", \"to\": \"/senior-year/teaching\"}, {\"d\": \"根据入学学情深度诊断，精准编入契合层级，针对性突破薄弱板块，告别大班水土不服。\", \"t\": \"分层教学，小班精准提分\", \"to\": \"/senior-year/curriculum\"}, {\"d\": \"特级教师领衔把关，平均教龄15年以上，深谙新高考命题规律与提分踩分点。\", \"t\": \"名师执教，功勋高考天团\", \"to\": \"/faculty/teachers\"}, {\"d\": \"专属学情导师每周复盘，专业心理疏导缓解焦虑，强健体魄与阳光心态并重。\", \"t\": \"心身护航，全程导师陪伴\", \"to\": \"/campus-life/wellbeing\"}], \"title\": \"为什么选择华襄四大理由\", \"kicker\": \"WHY HUAXIANG\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(5,1,'stories','学子提分逆袭故事',5,1,'{\"title\": \"他们，重新抵达\", \"kicker\": \"STUDENT STORIES\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(6,1,'faculty','名师天团聚光灯',6,1,'{\"title\": \"特级名师与资深高三功勋团队\", \"kicker\": \"FACULTY SPOTLIGHT\", \"subtitle\": \"源于省级重点示范中学教学底蕴，用专业与耐心点亮每个少年的高考逆袭之路。\"}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(7,1,'campus','走进校园与环境指标',7,1,'{\"title\": \"在足够好的环境里，安心向上\", \"kicker\": \"OUR CAMPUS\", \"statCampus\": [{\"n\": \"130\", \"label\": \"亩校园面积\"}, {\"n\": \"12\", \"label\": \"万㎡建筑面积\"}, {\"n\": \"1100\", \"label\": \"人千人礼堂\"}, {\"n\": \"10\", \"label\": \"万册图书馆藏\"}]}','2026-10-06 02:14:10','2026-10-06 02:14:10'),(8,1,'news','此刻，正在发生（公文与高招）',8,1,'{\"title\": \"此刻，正在发生\", \"kicker\": \"FROM HUAXIANG\"}','2026-10-06 02:14:10','2026-10-06 02:14:10');
/*!40000 ALTER TABLE `doupi_cms_section` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_cms_teacher`
--

DROP TABLE IF EXISTS `doupi_cms_teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `years` int DEFAULT '10' COMMENT '深耕高中备考教龄',
  `achievement` varchar(255) DEFAULT '' COMMENT '标杆荣誉/突出战绩',
  `avatar_url` varchar(512) DEFAULT '' COMMENT '名师正面肖像图URL',
  `status` char(1) DEFAULT '0' COMMENT '状态: 0-显示 1-隐藏',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`teacher_id`),
  UNIQUE KEY `uk_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='官网名师天团表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_cms_teacher`
--

LOCK TABLES `doupi_cms_teacher` WRITE;
/*!40000 ALTER TABLE `doupi_cms_teacher` DISABLE KEYS */;
INSERT INTO `doupi_cms_teacher` VALUES (1,'wang-zhong','王忠','化学','校长','principal','management','中学正高级教师,化学特级教师,国际奥赛金牌教练','原华中师大一附中党委书记兼副校长，湖北省督学、华中师大硕士研究生导师。深耕高三备考与拔尖创新人才培养三十余载。','把方程式当成故事来讲。',32,'享受国务院特殊津贴专家','','0',1,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(2,'meng-zhaokui','孟昭奎','数学','副校长','principal','management','中学高级教师,高考状元教师,功勋班主任','原华中师大附属武当中学副校长、督学，拥有极其丰富的高考命题与数学备考抓分经验。','每一道压轴题，都是几道基础题的组合。',28,'湖北省骨干教师','','0',2,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(3,'xie-zhenxiang','谢贞祥','语文','副校长','principal','management','中学高级教师,湖北省优秀语文教师,国家二级心理咨询师','原华师一附中副校长，曾任华师一附中初中部校长。善于化繁为简，点拨高三学子作文与阅读核心得分技巧。','读懂题目，就赢了一半。',29,'武汉市优秀教育工作者','','0',3,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(4,'tan-weisheng','谭伟生','历史','华襄复读中心主任','principal','management','中学正高级教师,历史特级教师,高考状元教师','长期深耕高中历史教学与高考备考顶层设计，所带班级多人考入清华北大及双一流高校。','历史题考的是逻辑，不是记忆。',27,'湖北省优秀历史教师','','0',4,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(5,'zhao-yuliang','赵育亮','语文','语文学科首席教师','special','faculty','中学正高级教师,语文特级教师,全国优秀语文教师','享受武汉市人民政府专项津贴专家，国家级观摩课一等奖获得者。主讲高考现代文阅读与高分写作模型。','阅读是知识的输入，写作是逻辑的绽放。',30,'国家级优质课一等奖','','0',5,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(6,'zhang-zhuhua','张祝华','数学','数学学科首席教师','backbone','faculty','中学高级教师,湖北省骨干教师,省级优质课一等奖','原华师一附中卓越班主任，武汉市高考状元班主任。精通高考数学题型归纳与思维导图拆解。','用清晰的思维模型替代盲目的题海冲刺。',24,'武汉市高考状元班主任','','0',6,'2026-10-05 07:18:35','2026-10-05 07:18:35'),(7,'li-dexian','李德贤','英语','英语学科首席教师','special','faculty','中学高级教师,英语特级教师,全国优秀外语教师','湖北省“名师档案”入选者，精研新高考读后续写与听力突破，培养百余位高考英语140分以上高分学员。','语言是练出来的，不是背出来的。',26,'湖北省特级教师','','0',7,'2026-10-05 07:18:35','2026-10-05 07:18:35');
/*!40000 ALTER TABLE `doupi_cms_teacher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_appointment`
--

DROP TABLE IF EXISTS `doupi_recruit_appointment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_recruit_appointment` (
  `appointment_id` bigint NOT NULL AUTO_INCREMENT COMMENT '预约ID',
  `appointment_no` varchar(32) NOT NULL COMMENT '预约单号',
  `openid` varchar(128) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'PENDING' COMMENT '状态: PENDING-待审核 APPROVED-已通过 CANCELLED-已取消 VERIFIED-已核销/已到校',
  `parent_name` varchar(64) NOT NULL COMMENT '家长姓名',
  `parent_phone` varchar(32) DEFAULT NULL,
  `student_name` varchar(64) NOT NULL COMMENT '学生姓名',
  `student_gender` varchar(10) DEFAULT '男' COMMENT '学生性别',
  `student_grade` varchar(64) DEFAULT NULL,
  `current_school` varchar(128) DEFAULT '' COMMENT '原就读学校',
  `campus_id` varchar(32) DEFAULT 'default' COMMENT '校区ID',
  `campus_name` varchar(64) DEFAULT '汉阳校区' COMMENT '校区名称',
  `visit_date` varchar(20) NOT NULL COMMENT '预约访校日期(YYYY-MM-DD)',
  `time_slot` varchar(64) NOT NULL COMMENT '预约时间段',
  `check_in_code` varchar(64) DEFAULT NULL,
  `teacher_id` varchar(64) DEFAULT NULL,
  `teacher_name` varchar(64) DEFAULT '' COMMENT '对接教师姓名',
  `verify_time` datetime DEFAULT NULL COMMENT '核销到校时间',
  `verifier` varchar(64) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='访校预约表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_appointment`
--

LOCK TABLES `doupi_recruit_appointment` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_appointment` DISABLE KEYS */;
/*!40000 ALTER TABLE `doupi_recruit_appointment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_banner`
--

DROP TABLE IF EXISTS `doupi_recruit_banner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='招生轮播图表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_banner`
--

LOCK TABLES `doupi_recruit_banner` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_banner` DISABLE KEYS */;
INSERT INTO `doupi_recruit_banner` VALUES (1,'汉外华襄探校招生宣传海报 01','cloud://cloud1-d4g4qc04b76a4e96e.636c-cloud1-d4g4qc04b76a4e96e-1429184690/banners/banner_1778571666463.jpg','','active',0,'2026-05-12 15:41:08','2026-05-12 15:41:08'),(2,'汉外华襄探校招生宣传海报 02','cloud://cloud1-d4g4qc04b76a4e96e.636c-cloud1-d4g4qc04b76a4e96e-1429184690/banners/banner_1778571671761.jpg','','active',1,'2026-05-12 15:41:13','2026-05-12 15:41:13'),(3,'汉外华襄探校招生宣传海报 03','cloud://cloud1-d4g4qc04b76a4e96e.636c-cloud1-d4g4qc04b76a4e96e-1429184690/banners/banner_1778571687092.jpg','','active',2,'2026-05-12 15:41:30','2026-05-12 15:41:30');
/*!40000 ALTER TABLE `doupi_recruit_banner` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_campus`
--

DROP TABLE IF EXISTS `doupi_recruit_campus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='校区信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_campus`
--

LOCK TABLES `doupi_recruit_campus` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_campus` DISABLE KEYS */;
INSERT INTO `doupi_recruit_campus` VALUES ('default','汉阳外校华襄高复','汉阳外校华襄高复','汉阳外校华襄高复欢迎您','汉阳外校华襄高复欢迎您','湖北省武汉市汉阳区汉阳外校华襄校区',30.550000,114.280000,'027-88888888','全日制高考复读示范基地','高考复读/高三特训','cloud://cloud1-d4g4qc04b76a4e96e.636c-cloud1-d4g4qc04b76a4e96e-1429184690/campus/cover_1778575614163.jpg',1,1,'2026-05-20 11:32:33','2026-05-20 11:32:33');
/*!40000 ALTER TABLE `doupi_recruit_campus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_config`
--

DROP TABLE IF EXISTS `doupi_recruit_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_recruit_config` (
  `config_id` bigint NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(64) NOT NULL COMMENT '配置键',
  `config_value` text NOT NULL COMMENT '配置值(JSON或字符串)',
  `remark` varchar(255) DEFAULT '' COMMENT '说明',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='招生与系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_config`
--

LOCK TABLES `doupi_recruit_config` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_config` DISABLE KEYS */;
INSERT INTO `doupi_recruit_config` VALUES (1,'campuses','[{\"id\":\"default\",\"name\":\"华襄小学\"},{\"id\":\"middle\",\"name\":\"华襄中学\"}]','可用校区列表','2026-09-26 08:48:20'),(2,'time_slots','[{\"enabled\":true,\"endTime\":\"09:00\",\"id\":1782555642224,\"startTime\":\"08:00\"},{\"enabled\":true,\"endTime\":\"10:00\",\"id\":1,\"startTime\":\"09:00\"},{\"enabled\":true,\"endTime\":\"11:00\",\"id\":2,\"startTime\":\"10:00\"},{\"enabled\":true,\"endTime\":\"12:00\",\"id\":1782561075718,\"startTime\":\"11:00\"},{\"enabled\":true,\"endTime\":\"15:00\",\"id\":3,\"startTime\":\"14:00\"},{\"enabled\":true,\"endTime\":\"16:00\",\"id\":4,\"startTime\":\"15:00\"},{\"enabled\":true,\"endTime\":\"18:00\",\"id\":1782555660735,\"startTime\":\"17:00\"},{\"enabled\":true,\"endTime\":\"19:00\",\"id\":1782555676921,\"startTime\":\"18:00\"}]','访校时间段划分','2026-09-26 08:48:20'),(3,'appointment_notice','<p>&lt;h2&gt;汉外华襄探校预约须知&lt;/h2&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;p&gt;尊敬的家长朋友：&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;p&gt;您好！欢迎您使用汉外华襄探校预约服务。为保障校园接待工作安全、有序开展，维护良好的来访秩序，请您在提交预约前仔细阅读并知悉以下内容。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;一、预约适用范围&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;本预约服务适用于家长到校参观、咨询及相关接待事项。来访人员须通过小程序提前完成预约登记，并按预约时间到校。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;二、预约信息填写要求&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;请如实填写学生姓名、家长姓名、联系方式、身份证号及其他相关信息。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;所填信息应真实、准确、完整。因信息填写错误、不实或不完整导致无法正常接待的，相关后果由预约人自行承担。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;3.&nbsp;同一预约主体在同一日期内仅可保留一条有效预约记录，请勿重复提交。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;三、预约确认与到校安排&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;预约提交成功后，系统将生成对应预约记录，请妥善保存。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;如您通过招生老师专属邀请入口进行预约，系统将自动关联相应接待老师。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;3.&nbsp;请按照预约时间准时到校，建议提前到达，以便完成来访登记及信息核验。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;4.&nbsp;到校后，请主动配合工作人员完成签到、核销及现场指引。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;四、来访管理要求&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;来访人员入校时应遵守校园安全管理规定，服从学校统一安排。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;来访期间请保持文明有序，不得影响学校正常教育教学秩序。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;3.&nbsp;未经允许，请勿进入非开放区域；如涉及拍摄、录音、录像等行为，请遵守学校相关管理要求。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;4.&nbsp;如遇校内活动调整、临时管控或其他特殊情况，学校有权根据实际需要调整接待安排。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;五、变更、取消与失效说明&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;因个人原因无法按预约时间到校的，请及时在系统内取消或调整预约。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;超过规定时限或临近预约时间时，系统可能不再支持在线取消或修改，具体以页面提示及系统规则为准。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;3.&nbsp;预约信息一经核销，即视为已完成到访；已取消、已失效或已完成的预约记录不可重复使用。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;4.&nbsp;对于恶意重复预约、占用名额、提供虚假信息等行为，学校有权取消相关预约，并保留进一步处理的权利。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;六、信息保护说明&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;您在预约过程中提交的个人信息，仅用于预约登记、到访核验、接待安排、服务通知及相关管理工作。学校将依法依规妥善管理和保护相关信息，不作与本次预约无关之用途。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;七、温馨提醒&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;请确保您填写的联系电话真实有效，并保持通讯畅通。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;如遇特殊天气、校园活动安排调整或其他临时情况，请以学校通知及现场安排为准。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;3.&nbsp;建议来访当天携带本人有效证件，并预留充足出行时间。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;h3&gt;八、其他说明&lt;/h3&gt;</p><p><br></p><p>&lt;p&gt;1.&nbsp;本预约须知作为到校预约服务的管理依据之一，自您提交预约申请时起视为已阅读并同意遵守。&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2.&nbsp;未尽事宜，由学校根据实际情况负责解释与处理。&lt;/p&gt;</p><p><br></p><p><br></p><p><br></p><p>&lt;p&gt;汉外华襄探校预约&lt;/p&gt;</p><p><br></p><p>&lt;p&gt;2026年4月&lt;/p&gt;</p>','探校预约须知与安全提示','2026-09-26 08:48:20'),(4,'advance_days','60','最大提前预约天数','2026-09-26 08:48:20'),(5,'cancel_hours','24','允许取消预约最短提前小时数','2026-09-26 08:48:20'),(6,'max_bookings_per_day','500','单日最大预约数','2026-09-26 08:48:20'),(7,'directors_list','[{\"directorId\":\"148caf506a014f1101db990a739d5e02\",\"directorName\":\"华襄招办陈主任\",\"phone\":\"180****6985\"},{\"directorId\":\"eb8783266a014f2101dacc4752b97adf\",\"directorName\":\"汉阳外校华襄高复招办汪老师\",\"phone\":\"180****0018\"},{\"directorId\":\"a7ff0e996a052675001c63483e369422\",\"directorName\":\"运营3组 李冬冬\",\"phone\":\"189****2103\"},{\"directorId\":\"5dea6e196a080deb006b7570745dbc24\",\"directorName\":\"华襄运营2组胡校长\",\"phone\":\"153****6879\"},{\"directorId\":\"81704b8e6a0a897300aa48b1749cb9aa\",\"directorName\":\"张一方\",\"phone\":\"133****1113\"},{\"directorId\":\"9e779e646a12f9eb007495aa18b6f934\",\"directorName\":\"华襄一组王格格-w\",\"phone\":\"181****6268\"},{\"directorId\":\"9e779e646a13c6ad0089656616a04945\",\"directorName\":\"华襄运营-刘丹老师\",\"phone\":\"__nophone__:oGLV03dOJimiMG87MVu0SkQDKPwI\"},{\"directorId\":\"8d4183e26a18262101138e9472bd59f3\",\"directorName\":\"武汉华襄招生办\",\"phone\":\"150****1007\"},{\"directorId\":\"d0222e176a1e3afe00452fe7004fa7ed\",\"directorName\":\"华襄运营7组叶老师\",\"phone\":\"150****5786\"},{\"directorId\":\"5caf1a7c6a3decb4051e895a4e047d2d\",\"directorName\":\"华襄运营六组杨先政\",\"phone\":\"186****8308\"}]','招生主管花名册','2026-09-26 08:48:20');
/*!40000 ALTER TABLE `doupi_recruit_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_message`
--

DROP TABLE IF EXISTS `doupi_recruit_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_recruit_message` (
  `message_id` bigint NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `user_id` varchar(64) NOT NULL COMMENT '接收人OpenID或用户ID',
  `title` varchar(128) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息正文',
  `type` varchar(32) DEFAULT 'APPOINTMENT' COMMENT '消息类型: APPOINTMENT-预约 BINDING-绑定 SYSTEM-系统',
  `is_read` char(1) DEFAULT '0' COMMENT '是否已读(0-未读 1-已读)',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  PRIMARY KEY (`message_id`),
  KEY `idx_user_msg` (`user_id`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='招生与系统通知消息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_message`
--

LOCK TABLES `doupi_recruit_message` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_message` DISABLE KEYS */;
/*!40000 ALTER TABLE `doupi_recruit_message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doupi_recruit_teacher_binding`
--

DROP TABLE IF EXISTS `doupi_recruit_teacher_binding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doupi_recruit_teacher_binding` (
  `binding_id` bigint NOT NULL AUTO_INCREMENT COMMENT '绑定ID',
  `teacher_id` varchar(64) DEFAULT NULL,
  `teacher_name` varchar(64) NOT NULL COMMENT '教师姓名',
  `teacher_phone` varchar(32) DEFAULT NULL,
  `director_id` varchar(64) DEFAULT NULL,
  `director_name` varchar(64) NOT NULL COMMENT '招生主管姓名',
  `status` varchar(20) DEFAULT 'APPROVED' COMMENT '状态: PENDING-待审核 APPROVED-已通过 REJECTED-已驳回',
  `audit_remark` varchar(255) DEFAULT '' COMMENT '审批意见',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `audit_time` datetime DEFAULT NULL COMMENT '审批时间',
  PRIMARY KEY (`binding_id`),
  KEY `idx_teacher` (`teacher_id`),
  KEY `idx_director` (`director_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教师招生绑定表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doupi_recruit_teacher_binding`
--

LOCK TABLES `doupi_recruit_teacher_binding` WRITE;
/*!40000 ALTER TABLE `doupi_recruit_teacher_binding` DISABLE KEYS */;
/*!40000 ALTER TABLE `doupi_recruit_teacher_binding` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_celebration`
--

DROP TABLE IF EXISTS `edu_celebration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_celebration` (
  `celebration_id` bigint NOT NULL AUTO_INCREMENT COMMENT '喜报记录ID',
  `student_name` varchar(64) NOT NULL COMMENT '学生姓名',
  `masked_name` varchar(64) DEFAULT '' COMMENT '脱敏姓名',
  `subject` varchar(64) DEFAULT '' COMMENT '选科组合',
  `before_score` decimal(6,1) DEFAULT NULL COMMENT '原始/前次分数',
  `after_score` decimal(6,1) DEFAULT NULL COMMENT '现考/提升后分数',
  `upgrade_score` decimal(6,1) DEFAULT NULL COMMENT '提升分值',
  `batch_title` varchar(128) DEFAULT '2026年高考提分喜报' COMMENT '喜报批次/届别',
  `tag` varchar(64) DEFAULT '' COMMENT '去向/荣誉标签',
  `status` char(1) DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `order_num` int DEFAULT '0' COMMENT '排序权重',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`celebration_id`),
  KEY `idx_batch` (`batch_title`),
  KEY `idx_upgrade` (`upgrade_score`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提分喜报光荣榜';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_celebration`
--

LOCK TABLES `edu_celebration` WRITE;
/*!40000 ALTER TABLE `edu_celebration` DISABLE KEYS */;
INSERT INTO `edu_celebration` VALUES (1,'张晓峰','张*峰','理科综合',492.0,638.0,146.0,'2026湖北高考卓越提分榜','清北强基','0',1,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入武汉大学 (物理卓越计划)，数学单科提升42分'),(2,'李梦琪','李*琪','物理方向',510.0,642.0,132.0,'2026湖北高考卓越提分榜','华科冲刺','0',2,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入华中科技大学 (计算机英才班)，理综逆袭突破276分'),(3,'陈思宇','陈*宇','历史方向',465.0,598.0,133.0,'2026湖北高考卓越提分榜','双一流重点','0',3,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入华中师范大学 (国家公费师范生)，英语突破138分'),(4,'王浩宇','王*宇','历史方向',438.0,582.0,144.0,'2026湖北高考卓越提分榜','名校提分','0',4,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入中南财经政法大学，数学单科由68分提升至124分'),(5,'刘雨欣','刘*欣','物理方向',525.0,655.0,130.0,'2026湖北高考卓越提分榜','C9联盟名校','0',5,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入北京航空航天大学，理科卓越部应届生标杆'),(6,'赵子墨','赵*墨','综合提分',480.0,615.0,135.0,'2026湖北高考卓越提分榜','一本逆袭','0',6,'','2026-10-03 10:16:43','','2026-10-03 10:16:43','考入中国地质大学(武汉)，全面扫除学科盲区'),(8,'韩立阳','韩*阳','物化生',380.0,532.5,152.5,'2026届高三八月摸底诊断考提分榜','逆袭标兵','0',1,'admin','2026-10-03 12:26:45','','2026-10-03 12:26:45','数学与物理单科突破，八月摸底考位次上升1200名'),(9,'孙楚晴','孙*晴','物化地',412.0,556.0,144.0,'2026届高三八月摸底诊断考提分榜','特控冲刺','0',2,'admin','2026-10-03 12:26:45','','2026-10-03 12:26:45','英语由72分跃升至125分，总分强势突破特控线'),(10,'林俊豪','林*豪','历政地',365.0,489.0,124.0,'2026届高三八月摸底诊断考提分榜','大幅跃升','0',3,'admin','2026-10-03 12:26:45','','2026-10-03 12:26:45','文综三科均衡提分，历史由54分提升至82分'),(11,'郑书意','郑*意','物化生',495.0,612.0,117.0,'2026届高三八月摸底诊断考提分榜','600分特控','0',4,'admin','2026-10-03 12:26:45','','2026-10-03 12:26:45','理综单科突破260分，进入年级第一梯队'),(12,'郭梓恒','郭*恒','物生地',420.0,528.5,108.5,'2026届高三八月摸底诊断考提分榜','稳步提升','0',5,'admin','2026-10-03 12:26:45','','2026-10-03 12:26:45','各科基础知识点全面过关，提分势头强劲');
/*!40000 ALTER TABLE `edu_celebration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_class`
--

DROP TABLE IF EXISTS `edu_class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_class` (
  `class_id` bigint NOT NULL AUTO_INCREMENT COMMENT '班级ID',
  `grade` varchar(20) NOT NULL COMMENT '年级',
  `class_name` varchar(50) NOT NULL COMMENT '班级名称',
  `student_num` int NOT NULL DEFAULT '0' COMMENT '班级人数',
  `head_teacher_id` bigint DEFAULT NULL COMMENT '????????D',
  `head_teacher` varchar(50) DEFAULT '' COMMENT 'ç­ä¸»ä»»å§“å',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`class_id`),
  UNIQUE KEY `uk_grade_class` (`grade`,`class_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='班级档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_class`
--

LOCK TABLES `edu_class` WRITE;
/*!40000 ALTER TABLE `edu_class` DISABLE KEYS */;
INSERT INTO `edu_class` VALUES (1,'高三','高三(1)班·卓越拔尖班',45,NULL,'张建华','','2026-10-03 11:55:33','',NULL,'0'),(2,'高三','高三(2)班·清北冲刺班',48,NULL,'李秀英','','2026-10-03 11:55:33','',NULL,'0'),(3,'复读部','高三复读(1)班·提分班',52,NULL,'陈德明','','2026-10-03 11:55:33','',NULL,'0'),(4,'高二','高二(1)班·重点实验班',46,NULL,'王强','','2026-10-03 11:55:33','',NULL,'0'),(5,'高二','高二(2)班·理科特色班',47,NULL,'赵红梅','','2026-10-03 11:55:33','',NULL,'0'),(6,'高一','高一(1)班·名校火箭班',50,NULL,'刘芳','','2026-10-03 11:55:33','',NULL,'0'),(7,'高一','高一(2)班·综合实验班',49,NULL,'张老师','','2026-10-03 11:55:33','',NULL,'0'),(8,'初三','初三(1)班·直升实验班',42,NULL,'李老师','','2026-10-03 11:55:33','',NULL,'0');
/*!40000 ALTER TABLE `edu_class` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_goods`
--

DROP TABLE IF EXISTS `edu_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_goods` (
  `goods_id` bigint NOT NULL AUTO_INCREMENT COMMENT '物品ID',
  `goods_name` varchar(100) NOT NULL COMMENT '物品名称',
  `category` char(1) NOT NULL COMMENT '分类：1-教师办公品 2-学生教材 3-文印耗材',
  `grade` varchar(20) DEFAULT '' COMMENT '适用年级（如高一、初一，非教材类为空）',
  `spec` varchar(50) DEFAULT '' COMMENT '规格',
  `unit` varchar(10) NOT NULL COMMENT '单位',
  `stock_num` int NOT NULL DEFAULT '0' COMMENT '当前库存',
  `warn_low` int NOT NULL DEFAULT '0' COMMENT '库存下限',
  `location` varchar(100) DEFAULT '' COMMENT '存放位置',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志 0存在 2删除',
  `conversion_rate` int DEFAULT '500' COMMENT '每包装基础数量换算率(如1000张/包)',
  `base_unit` varchar(20) DEFAULT '张' COMMENT '最小基础消耗单位(如张/支/本)',
  `remain_sheets` int DEFAULT '0' COMMENT '散张/零头余量(如整包拆开后剩余散张数)',
  PRIMARY KEY (`goods_id`),
  KEY `idx_category` (`category`),
  KEY `idx_grade` (`grade`)
) ENGINE=InnoDB AUTO_INCREMENT=311 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物品档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_goods`
--

LOCK TABLES `edu_goods` WRITE;
/*!40000 ALTER TABLE `edu_goods` DISABLE KEYS */;
INSERT INTO `edu_goods` VALUES (1,'得力A4双胶复印纸(70g)','1','通用','A4/箱(8包共4000张)','箱',0,20,'主校区文印库A区-01','','2026-10-03 10:16:43','',NULL,'0',4000,'张',0),(2,'8K纸','1','高中部','8K/包(500张特厚)','箱',0,3,'教务室','','2026-10-03 10:16:43','','2026-10-06 11:44:17','0',1000,'张',0),(3,'16K纸','1','全校通用','16K/包(500张)','包',0,1,'教务室','','2026-10-03 10:16:43','','2026-10-06 11:45:20','0',2000,'张',0),(4,'京瓷高速一体数码复合机油墨','2','通用','黑色墨盒(1000ml)','支',0,5,'文印设备耗材柜B-01','','2026-10-03 10:16:43','',NULL,'0',1,'支',0),(5,'全自动速印机一体化热敏版纸','2','通用','B4高速专用版纸','卷',0,4,'文印设备耗材柜B-02','','2026-10-03 10:16:43','',NULL,'0',1,'卷',0),(6,'晨光考试专用2B涂卡铅笔','3','通用','2B木杆/盒(12支)','盒',0,10,'综合仓库C区-01','','2026-10-03 10:16:43','',NULL,'0',1,'盒',0),(7,'晨光大容量速干黑色中性笔','3','通用','0.5mm/盒(12支)','盒',0,15,'综合仓库C区-02','','2026-10-03 10:16:43','',NULL,'0',1,'盒',0),(8,'校园开放日招生全景宣传画册','4','高中部','16开铜版纸精装/本','本',0,100,'行政招生处物料库D-01','','2026-10-03 10:16:43','',NULL,'0',1,'本',0),(101,'晨光按动红色中性笔','1','通用','0.5mm/红色','支',0,50,'教务文具柜A-01','admin','2026-10-03 11:31:40','',NULL,'0',1,'支',0),(102,'晨光按动黑色中性笔','1','通用','0.5mm/黑色','支',0,50,'教务文具柜A-02','admin','2026-10-03 11:31:40','',NULL,'0',1,'支',0),(103,'晨光高品质速干红色笔芯','1','通用','0.5mm/红色(盒装20支)','支',0,200,'教务文具柜A-03','admin','2026-10-03 11:31:40','',NULL,'0',1,'支',0),(104,'晨光高品质速干黑色笔芯','1','通用','0.5mm/黑色(盒装20支)','支',0,200,'教务文具柜A-04','admin','2026-10-03 11:31:40','',NULL,'0',1,'支',0),(105,'得力多功能金属伸缩书立','1','通用','加厚防滑/可调节','个',0,20,'教务文具柜B-01','admin','2026-10-03 11:31:40','',NULL,'0',1,'个',0),(106,'教师教学备课本','1','通用','16K/精装软皮/80页','本',0,50,'教务档案柜C-01','admin','2026-10-03 11:31:40','',NULL,'0',1,'本',0),(107,'教师日常听课评课记录本','1','通用','16K/胶装/60页','本',0,50,'教务档案柜C-02','admin','2026-10-03 11:31:40','',NULL,'0',1,'本',0),(108,'高考班学生学情诊断记录本','1','高三','A4/加厚封面/100页','本',0,30,'教务档案柜C-03','admin','2026-10-03 11:31:40','',NULL,'0',1,'本',0),(109,'班主任主题班会工作记录本','1','通用','16K/皮面/80页','本',0,20,'教务档案柜C-04','admin','2026-10-03 11:31:40','',NULL,'0',1,'本',0),(110,'A4多层透明加厚文件夹','1','通用','A4/10个装/带标签','个',0,100,'教务文具柜B-02','admin','2026-10-03 11:31:40','',NULL,'0',1,'个',0),(111,'得力高粘度固体胶棒','1','通用','21g/强力大号','支',0,30,'教务文具柜A-05','admin','2026-10-03 11:31:40','',NULL,'0',1,'支',0),(112,'晨光强粘彩色多格便利贴','1','通用','4色组合/每本100张','包',0,50,'教务文具柜A-06','admin','2026-10-03 11:31:40','',NULL,'0',1,'包',0),(201,'高三语文一轮总复习教材及导学案','2','高三','人教统编版/含答题卡','套',0,50,'教材库房J-01','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(202,'高三数学一轮核心考点与典题精析','2','高三','高中数学全套/含活页','套',0,50,'教材库房J-02','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(203,'高三英语考点精析与高考听力套装','2','高三','附音频光盘/二维码听力','套',0,50,'教材库房J-03','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(204,'高三物理一轮复习教程与题型突破','2','高三','选科物理/人教版','套',0,30,'教材库房J-04','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(205,'高三化学精编考点清单与实验专练','2','高三','选科化学/鲁科版','套',0,30,'教材库房J-05','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(206,'高三生物一轮基础强化与核心归纳','2','高三','选科生物/中图版','套',0,30,'教材库房J-06','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(207,'高三历史时空坐标与高考真题汇编','2','高三','选科历史/部编版','套',0,30,'教材库房J-07','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(208,'高三政治核心素养与时政热点精讲','2','高三','选科政治/人教统编版','套',0,30,'教材库房J-08','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(209,'高三地理区域认知与图表专项精练','2','高三','选科地理/中图版','套',0,30,'教材库房J-09','admin','2026-10-03 11:31:40','',NULL,'0',1,'套',0),(301,'晨光教学专用无尘白粉笔','1','通用','白粉笔/盒(100支装/低粉尘)','盒',0,30,'教务耗材柜D-01','admin','2026-10-03 11:51:13','',NULL,'0',1,'盒',0),(302,'晨光教学专用无尘彩色粉笔','1','通用','彩色粉笔/盒(100支装/6色混合)','盒',0,20,'教务耗材柜D-02','admin','2026-10-03 11:51:13','',NULL,'0',1,'盒',0),(303,'教学高密度磁性黑板擦','1','通用','强磁吸附/可水洗绒布面','个',0,15,'教务耗材柜D-03','admin','2026-10-03 11:51:13','',NULL,'0',1,'个',0),(304,'得力大容量可加墨黑色白板笔','1','通用','圆头2.0mm/易擦快干','支',0,20,'教务文具柜A-07','admin','2026-10-03 11:51:13','',NULL,'0',1,'支',0),(305,'得力大容量可加墨红色白板笔','1','通用','圆头2.0mm/易擦快干','支',0,20,'教务文具柜A-08','admin','2026-10-03 11:51:13','',NULL,'0',1,'支',0),(306,'得力中号省力金属订书机','1','通用','配24/6钉/20页厚装订','台',0,10,'教务办公柜E-01','admin','2026-10-03 11:51:13','',NULL,'0',1,'台',0),(307,'得力24/6标准镀镍订书针','1','通用','1000枚/盒(适用通用订书机)','盒',0,50,'教务办公柜E-02','admin','2026-10-03 11:51:13','',NULL,'0',1,'盒',0),(308,'晨光金属重型防滑美工裁纸刀','1','通用','18mm加宽刀片/自锁式','把',0,15,'教务办公柜E-03','admin','2026-10-03 11:51:13','',NULL,'0',1,'把',0),(309,'得力加厚高粘封箱透明胶带','1','通用','48mm*50m/加厚抗拉','卷',0,20,'教务耗材柜D-04','admin','2026-10-03 11:51:13','',NULL,'0',1,'卷',0),(310,'晨光彩色多功能金属回形针','1','通用','29mm/盒装(100枚入)','盒',0,30,'教务文具柜A-09','admin','2026-10-03 11:51:13','',NULL,'0',1,'盒',0);
/*!40000 ALTER TABLE `edu_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_goods_kit`
--

DROP TABLE IF EXISTS `edu_goods_kit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_goods_kit` (
  `kit_id` bigint NOT NULL AUTO_INCREMENT COMMENT '套装ID',
  `kit_name` varchar(100) NOT NULL COMMENT '套装名称',
  `kit_code` varchar(50) DEFAULT NULL COMMENT '套装编码',
  `target_type` char(1) NOT NULL DEFAULT '1' COMMENT '适用对象(1教师工作武器 2学生教材 3班级通用)',
  `grade` varchar(30) DEFAULT '通用' COMMENT '适用年级(通用/高一/高二/高三/复读部)',
  `subject` varchar(50) DEFAULT '通用' COMMENT '适用选科/方向(通用/物理类/历史类/物化生/历政地)',
  `description` varchar(500) DEFAULT NULL COMMENT '套装说明/适用场景',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `sort_order` int DEFAULT '0' COMMENT '排序号',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志(0存在 2删除)',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`kit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教务物资套装模版表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_goods_kit`
--

LOCK TABLES `edu_goods_kit` WRITE;
/*!40000 ALTER TABLE `edu_goods_kit` DISABLE KEYS */;
INSERT INTO `edu_goods_kit` VALUES (1,'新入职教师标准教学办公套件','KIT_TEA_DEFAULT','1','通用','通用','新教师入职报到时标配教学办公用品：红黑中性笔各1支、红黑速干笔芯各10支、伸缩书立1个、备课本2本、听课本2本、学情记录本、班会本、透明文件夹5个、强力胶棒、便利贴等全套教学用品','0',1,'0','admin','2026-10-03 11:31:40','','2026-10-03 11:51:13',NULL),(2,'高三物理类选科全套教材（物化生）','KIT_STU_PHY','2','高三','物理类(物化生)','高三物理方向学生开学全套教材与辅导用书（语+数+英+物+化+生）','0',2,'0','admin','2026-10-03 11:31:40','',NULL,NULL),(3,'高三历史类选科全套教材（历政地）','KIT_STU_HIS','2','高三','历史类(历政地)','高三历史方向学生开学全套教材与辅导用书（语+数+英+历+政+地）','0',3,'0','admin','2026-10-03 11:31:40','',NULL,NULL),(4,'班主任开学带班管理套件','KIT_HEAD_TEACHER','1','通用','班主任','班主任专享工作用品：班会记录本2本、学情诊断记录本2本、红黑中性笔、A4透明文件夹10个、便签便利贴3包等','0',4,'0','admin','2026-10-03 11:31:40','','2026-10-03 11:51:13',NULL);
/*!40000 ALTER TABLE `edu_goods_kit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_goods_kit_item`
--

DROP TABLE IF EXISTS `edu_goods_kit_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_goods_kit_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `kit_id` bigint NOT NULL COMMENT '套装ID',
  `goods_id` bigint NOT NULL COMMENT '物资ID',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '默认配发数量',
  `sort_order` int DEFAULT '0' COMMENT '排序号',
  `remark` varchar(255) DEFAULT NULL COMMENT '配发说明',
  PRIMARY KEY (`item_id`),
  KEY `idx_kit_id` (`kit_id`),
  KEY `idx_goods_id` (`goods_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教务物资套装明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_goods_kit_item`
--

LOCK TABLES `edu_goods_kit_item` WRITE;
/*!40000 ALTER TABLE `edu_goods_kit_item` DISABLE KEYS */;
INSERT INTO `edu_goods_kit_item` VALUES (1,1,101,1,1,'晨光红色中性笔各1支'),(2,1,102,1,2,'晨光黑色中性笔各1支'),(3,1,103,10,3,'红色笔芯各10支'),(4,1,104,10,4,'黑色笔芯各10支'),(5,1,105,1,5,'加厚伸缩书立1个'),(6,1,106,2,6,'备课本2本'),(7,1,107,2,7,'听课本2本'),(8,1,108,1,8,'学情本1本'),(9,1,109,1,9,'班会本1本'),(10,1,110,5,10,'透明文件夹5个'),(11,1,111,1,11,'强力胶棒1支'),(12,1,112,2,12,'彩色便利贴2包'),(13,2,201,1,1,'语文总复习全套'),(14,2,202,1,2,'数学总复习全套'),(15,2,203,1,3,'英语总复习全套'),(16,2,204,1,4,'物理一轮教程'),(17,2,205,1,5,'化学考点精编'),(18,2,206,1,6,'生物强化归纳'),(19,3,201,1,1,'语文总复习全套'),(20,3,202,1,2,'数学总复习全套'),(21,3,203,1,3,'英语总复习全套'),(22,3,207,1,4,'历史时空坐标'),(23,3,208,1,5,'政治时政精讲'),(24,3,209,1,6,'地理图表专项'),(25,4,109,2,1,'主题班会本2本'),(26,4,108,2,2,'学情诊断本2本'),(27,4,101,2,3,'红笔2支'),(28,4,102,2,4,'黑笔2支'),(29,4,110,10,5,'A4透明文件夹10个'),(30,4,112,3,6,'便签便利贴3包');
/*!40000 ALTER TABLE `edu_goods_kit_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_material_record`
--

DROP TABLE IF EXISTS `edu_material_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_material_record` (
  `record_id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` varchar(32) NOT NULL COMMENT '业务流水单号',
  `record_type` char(1) NOT NULL COMMENT '业务类型(1发放领取 2退还回收)',
  `business_category` varchar(50) NOT NULL COMMENT '业务场景(教师工作武器/学生选科领书/班级领用/教师离职交接/学生退学退书/其他)',
  `target_type` char(1) NOT NULL DEFAULT '1' COMMENT '对象类型(1教师 2学生 3班级)',
  `target_id` bigint DEFAULT NULL COMMENT '关联对象ID(如教师ID/班级ID)',
  `target_name` varchar(64) NOT NULL COMMENT '领用/归还人姓名(教师姓名/学生姓名)',
  `class_id` bigint DEFAULT NULL COMMENT '关联班级ID',
  `class_name` varchar(64) DEFAULT NULL COMMENT '关联班级名称',
  `grade` varchar(30) DEFAULT NULL COMMENT '所属年级',
  `subject` varchar(50) DEFAULT NULL COMMENT '所属选科/学科',
  `kit_id` bigint DEFAULT NULL COMMENT '引用的物资套装ID',
  `kit_name` varchar(100) DEFAULT NULL COMMENT '引用的物资套装名称',
  `total_quantity` int NOT NULL DEFAULT '0' COMMENT '总件数',
  `image_url` varchar(1000) DEFAULT NULL COMMENT '实物/签领拍照留存图片URL(非必填)',
  `operator` varchar(64) NOT NULL COMMENT '经办教务人员',
  `operate_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '经办时间',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态(0正常 1已撤销)',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志(0正常 2删除)',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注说明',
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `idx_record_no` (`record_no`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_operate_time` (`operate_time`),
  KEY `idx_target_name` (`target_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教务日常物资领退记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_material_record`
--

LOCK TABLES `edu_material_record` WRITE;
/*!40000 ALTER TABLE `edu_material_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_material_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_material_record_item`
--

DROP TABLE IF EXISTS `edu_material_record_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_material_record_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `record_id` bigint NOT NULL COMMENT '主记录ID',
  `goods_id` bigint NOT NULL COMMENT '物资ID',
  `goods_name` varchar(100) NOT NULL COMMENT '物资名称',
  `spec` varchar(100) DEFAULT NULL COMMENT '规格型号',
  `unit` varchar(20) DEFAULT NULL COMMENT '计量单位',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '数量',
  `item_status` varchar(20) DEFAULT '完好' COMMENT '物品状态(完好/轻微磨损/损坏报损)',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`item_id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_goods_id` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教务日常物资领退明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_material_record_item`
--

LOCK TABLES `edu_material_record_item` WRITE;
/*!40000 ALTER TABLE `edu_material_record_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_material_record_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_print_record`
--

DROP TABLE IF EXISTS `edu_print_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_print_record` (
  `print_id` bigint NOT NULL AUTO_INCREMENT COMMENT '印刷ID',
  `print_name` varchar(100) NOT NULL COMMENT '印刷名称',
  `paper_goods_id` bigint NOT NULL COMMENT '用纸物品ID',
  `paper_type` varchar(10) DEFAULT '' COMMENT '用纸类型：A3/A4/8K/16K',
  `print_count` int NOT NULL COMMENT '印刷份数',
  `page_count` int DEFAULT '1' COMMENT '每份页数/张数',
  `print_side` char(1) DEFAULT '1' COMMENT '印刷方式(1单页印刷 2双页印刷)',
  `total_pages` int DEFAULT NULL COMMENT '消耗总张数(份数*页数)',
  `teacher_id` bigint DEFAULT NULL COMMENT '申请教师ID，关联edu_teacher',
  `grade` varchar(20) DEFAULT '' COMMENT '年级',
  `class_id` bigint DEFAULT NULL COMMENT '班级ID',
  `class_name` varchar(50) DEFAULT '' COMMENT '班级名称',
  `operator` varchar(50) NOT NULL COMMENT '经办人',
  `print_time` datetime NOT NULL COMMENT '印刷时间',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态 0-待印刷 1-已完成 2-已作废',
  `out_id` bigint DEFAULT NULL COMMENT '关联出库单ID',
  `attachment` varchar(500) DEFAULT NULL COMMENT '原稿附件',
  `result_img` varchar(500) DEFAULT NULL COMMENT '印刷效果图',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`print_id`),
  KEY `idx_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='印刷登记表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_print_record`
--

LOCK TABLES `edu_print_record` WRITE;
/*!40000 ALTER TABLE `edu_print_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_print_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_check`
--

DROP TABLE IF EXISTS `edu_stock_check`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_check` (
  `check_id` bigint NOT NULL AUTO_INCREMENT COMMENT '盘点单ID',
  `check_no` varchar(30) NOT NULL COMMENT '盘点单号',
  `check_type` char(1) NOT NULL DEFAULT '1' COMMENT '盘点范围 1-全量 2-按分类',
  `category` char(1) DEFAULT NULL COMMENT '盘点分类',
  `check_time` datetime NOT NULL COMMENT '盘点时间',
  `operator` varchar(50) NOT NULL COMMENT '盘点人',
  `status` char(1) NOT NULL DEFAULT '1' COMMENT '状态 1-待审核 2-已审核 3-已作废',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`check_id`),
  UNIQUE KEY `uk_check_no` (`check_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存盘点单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_check`
--

LOCK TABLES `edu_stock_check` WRITE;
/*!40000 ALTER TABLE `edu_stock_check` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_check` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_check_item`
--

DROP TABLE IF EXISTS `edu_stock_check_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_check_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `check_id` bigint NOT NULL COMMENT '盘点单ID',
  `goods_id` bigint NOT NULL COMMENT '物品ID',
  `book_num` int NOT NULL COMMENT '账面库存',
  `real_num` int NOT NULL COMMENT '实盘库存',
  `diff_num` int NOT NULL COMMENT '差异数量(实盘-账面)',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_check_id` (`check_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存盘点单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_check_item`
--

LOCK TABLES `edu_stock_check_item` WRITE;
/*!40000 ALTER TABLE `edu_stock_check_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_check_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_in`
--

DROP TABLE IF EXISTS `edu_stock_in`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_in` (
  `in_id` bigint NOT NULL AUTO_INCREMENT COMMENT '入库ID',
  `in_no` varchar(30) NOT NULL COMMENT '入库单号',
  `in_type` char(1) NOT NULL COMMENT '入库类型：1-采购 2-调拨 3-其他',
  `supplier_id` bigint DEFAULT NULL COMMENT '供应商ID',
  `in_time` datetime NOT NULL COMMENT '入库时间',
  `operator` varchar(50) NOT NULL COMMENT '经办人',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `status` char(1) NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`in_id`),
  UNIQUE KEY `uk_in_no` (`in_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_in`
--

LOCK TABLES `edu_stock_in` WRITE;
/*!40000 ALTER TABLE `edu_stock_in` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_in` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_in_item`
--

DROP TABLE IF EXISTS `edu_stock_in_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_in_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `in_id` bigint NOT NULL COMMENT '入库单ID',
  `goods_id` bigint NOT NULL COMMENT '物品ID',
  `quantity` int NOT NULL COMMENT '数量',
  `price` decimal(10,2) DEFAULT '0.00' COMMENT '单价',
  `amount` decimal(10,2) DEFAULT '0.00' COMMENT '小计',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_in_id` (`in_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_in_item`
--

LOCK TABLES `edu_stock_in_item` WRITE;
/*!40000 ALTER TABLE `edu_stock_in_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_in_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_out`
--

DROP TABLE IF EXISTS `edu_stock_out`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_out` (
  `out_id` bigint NOT NULL AUTO_INCREMENT COMMENT '出库ID',
  `out_no` varchar(30) NOT NULL COMMENT '出库单号',
  `out_type` char(1) NOT NULL COMMENT '出库类型：1-教师领用 2-学生领书 3-耗材出库',
  `receiver` varchar(50) DEFAULT '' COMMENT '领用人/班级',
  `class_id` bigint DEFAULT NULL COMMENT '关联班级ID',
  `out_time` datetime NOT NULL COMMENT '出库时间',
  `operator` varchar(50) NOT NULL COMMENT '经办人',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `status` char(1) NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`out_id`),
  UNIQUE KEY `uk_out_no` (`out_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_out`
--

LOCK TABLES `edu_stock_out` WRITE;
/*!40000 ALTER TABLE `edu_stock_out` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_out` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_stock_out_item`
--

DROP TABLE IF EXISTS `edu_stock_out_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_stock_out_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `out_id` bigint NOT NULL COMMENT '出库单ID',
  `goods_id` bigint NOT NULL COMMENT '物品ID',
  `quantity` int NOT NULL COMMENT '数量',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_out_id` (`out_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_stock_out_item`
--

LOCK TABLES `edu_stock_out_item` WRITE;
/*!40000 ALTER TABLE `edu_stock_out_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `edu_stock_out_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_supplier`
--

DROP TABLE IF EXISTS `edu_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_supplier` (
  `supplier_id` bigint NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商名称',
  `contact` varchar(50) DEFAULT '' COMMENT '联系人',
  `phone` varchar(20) DEFAULT '' COMMENT '联系电话',
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `uk_supplier_name` (`supplier_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_supplier`
--

LOCK TABLES `edu_supplier` WRITE;
/*!40000 ALTER TABLE `edu_supplier` DISABLE KEYS */;
INSERT INTO `edu_supplier` VALUES (1,'武汉晨光得力教育物资总经销','王经理','13988886666','','2026-10-03 10:16:44','',NULL,'0'),(2,'湖北楚风文化印刷纸业有限公司','李经理','13799995555','','2026-10-03 10:16:44','',NULL,'0');
/*!40000 ALTER TABLE `edu_supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `edu_teacher`
--

DROP TABLE IF EXISTS `edu_teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `edu_teacher` (
  `teacher_id` bigint NOT NULL AUTO_INCREMENT COMMENT '教师ID',
  `teacher_name` varchar(64) DEFAULT NULL,
  `dept` varchar(64) DEFAULT NULL,
  `grade` varchar(20) DEFAULT '' COMMENT '任教年级',
  `class_ids` varchar(200) DEFAULT '' COMMENT '任教班级ID，多个用逗号分隔',
  `subject` varchar(64) DEFAULT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `create_by` varchar(64) DEFAULT '',
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(64) DEFAULT '',
  `update_time` datetime DEFAULT NULL,
  `del_flag` char(1) DEFAULT '0',
  PRIMARY KEY (`teacher_id`),
  KEY `idx_grade` (`grade`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教职工档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edu_teacher`
--

LOCK TABLES `edu_teacher` WRITE;
/*!40000 ALTER TABLE `edu_teacher` DISABLE KEYS */;
INSERT INTO `edu_teacher` VALUES (101,'王贤武','高复教学部','复读部','101,108','语文','13800010001','admin','2026-10-03 10:24:37','',NULL,'0'),(102,'周珲','高复教学部','复读部','101,103','数学','13800010002','admin','2026-10-03 10:24:37','',NULL,'0'),(103,'涂瑞志','高复教学部','复读部','101','英语','13800010003','admin','2026-10-03 10:24:37','',NULL,'0'),(104,'吴显品','高复教学部','复读部','101','物理','13800010004','admin','2026-10-03 10:24:37','',NULL,'0'),(105,'金传汉','高复教学部','复读部','101','化学','13800010005','admin','2026-10-03 10:24:37','',NULL,'0'),(106,'许雪玲','高复教学部','复读部','101,102','生物','13800010006','admin','2026-10-03 10:24:37','',NULL,'0'),(107,'石松','高复教学部','复读部','101,104,105,106,107,108,109','政治','13800010007','admin','2026-10-03 10:24:37','',NULL,'0'),(108,'邢鹏飞','高复教学部','复读部','101,104,105,106,107,108,109','地理','13800010008','admin','2026-10-03 10:24:37','',NULL,'0'),(109,'王嘉兴','高复教学部','复读部','101,102,103,104,105,106,107,108,109','体育','13800010009','admin','2026-10-03 10:24:37','',NULL,'0'),(110,'赵前利','高复教学部','复读部','102,103','语文','13800010010','admin','2026-10-03 10:24:37','',NULL,'0'),(111,'陈新佳','高复教学部','复读部','102,105','数学','13800010011','admin','2026-10-03 10:24:37','',NULL,'0'),(112,'李寄宁','高复教学部','复读部','102,103','英语','13800010012','admin','2026-10-03 10:24:37','',NULL,'0'),(113,'孙仁杰','高复教学部','复读部','102,103','物理','13800010013','admin','2026-10-03 10:24:37','',NULL,'0'),(114,'雷小平','高复教学部','复读部','102,103','化学','13800010014','admin','2026-10-03 10:24:37','',NULL,'0'),(115,'杨俊堂','高复教学部','复读部','103','生物','13800010015','admin','2026-10-03 10:24:37','',NULL,'0'),(116,'祝呈巧','高复教学部','复读部','104','语文','18879805597','admin','2026-10-03 10:24:37','',NULL,'0'),(117,'郭强','高复教学部','复读部','104','数学','13800010017','admin','2026-10-03 10:24:37','',NULL,'0'),(118,'徐冰芳','高复教学部','复读部','104,106','英语','13800010018','admin','2026-10-03 10:24:37','',NULL,'0'),(119,'高振元','高复教学部','复读部','104,106','物理','13800010019','admin','2026-10-03 10:24:37','',NULL,'0'),(120,'马承宪','高复教学部','复读部','104,106','化学','13800010020','admin','2026-10-03 10:24:37','',NULL,'0'),(121,'李炜','高复教学部','复读部','104,106','生物','13800010021','admin','2026-10-03 10:24:37','',NULL,'0'),(122,'李心雨','高复教学部','复读部','105,107','语文','13800010022','admin','2026-10-03 10:24:37','',NULL,'0'),(123,'刘珉','高复教学部','复读部','105,107','英语','13800010023','admin','2026-10-03 10:24:37','',NULL,'0'),(124,'吴新民','高复教学部','复读部','105,107','物理','13800010024','admin','2026-10-03 10:24:37','',NULL,'0'),(125,'李锋','高复教学部','复读部','105,107','化学','13800010025','admin','2026-10-03 10:24:37','',NULL,'0'),(126,'赵爱景','高复教学部','复读部','105,107','生物','13800010026','admin','2026-10-03 10:24:37','',NULL,'0'),(127,'付令军','高复教学部','复读部','106,109','语文','13800010027','admin','2026-10-03 10:24:37','',NULL,'0'),(128,'周继兴','高复教学部','复读部','106','数学','13800010028','admin','2026-10-03 10:24:37','',NULL,'0'),(129,'苑运霞','高复教学部','复读部','107','数学','13800010029','admin','2026-10-03 10:24:37','',NULL,'0'),(130,'田飞','高复教学部','复读部','108,109','数学','13800010030','admin','2026-10-03 10:24:37','',NULL,'0'),(131,'黄紫琦','高复教学部','复读部','108,109','英语','13800010031','admin','2026-10-03 10:24:37','',NULL,'0'),(132,'谭伟生','高复教学部','复读部','108,109','历史','13800010032','admin','2026-10-03 10:24:37','',NULL,'0');
/*!40000 ALTER TABLE `edu_teacher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gen_table`
--

DROP TABLE IF EXISTS `gen_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gen_table` (
  `table_id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `table_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '表名称',
  `table_comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '表描述',
  `sub_table_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联子表的表名',
  `sub_table_fk_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '子表关联的外键名',
  `class_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实体类名称',
  `tpl_category` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT 'crud' COMMENT '使用的模板（crud单表操作 tree树表操作）',
  `tpl_web_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '前端模板类型（element-ui模版 element-plus模版）',
  `package_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成包路径',
  `module_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成模块名',
  `business_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成业务名',
  `function_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成功能名',
  `function_author` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成功能作者',
  `gen_type` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '生成代码方式（0zip压缩包 1自定义路径）',
  `gen_path` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '/' COMMENT '生成路径（不填默认项目路径）',
  `options` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '其它生成选项',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码生成业务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gen_table`
--

LOCK TABLES `gen_table` WRITE;
/*!40000 ALTER TABLE `gen_table` DISABLE KEYS */;
INSERT INTO `gen_table` VALUES (1,'edu_class','班级档案表',NULL,NULL,'EduClass','crud','element-ui','com.ruoyi.edu','edu','class','班级档案','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 06:38:18',NULL),(3,'edu_print_record','印刷登记表',NULL,NULL,'EduPrintRecord','crud','element-ui','com.ruoyi.edu','edu','record','印刷登记','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 07:05:28',NULL),(4,'edu_stock_in','入库单主表',NULL,NULL,'EduStockIn','crud','element-ui','com.ruoyi.edu','edu','in','入库单','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 07:06:14',NULL),(5,'edu_stock_in_item','入库单明细表',NULL,NULL,'EduStockInItem','crud','element-ui','com.ruoyi.edu','edu','inItem','入库单明细','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 06:27:43',NULL),(6,'edu_stock_out','出库单主表',NULL,NULL,'EduStockOut','crud','element-ui','com.ruoyi.edu','edu','out','出库单','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 06:58:54',NULL),(7,'edu_stock_out_item','出库单明细表',NULL,NULL,'EduStockOutItem','crud','element-ui','com.ruoyi.edu','edu','outItem','出库单明细','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 06:27:57',NULL),(8,'edu_supplier','供应商表',NULL,NULL,'EduSupplier','crud','element-ui','com.ruoyi.edu','edu','supplier','供应商','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 06:28:03',NULL),(9,'edu_teacher','教职工档案表',NULL,NULL,'EduTeacher','crud','element-ui','com.ruoyi.edu','edu','teacher','教职工档案','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 02:15:05','','2026-09-22 07:06:41',NULL),(10,'edu_goods','物品档案表',NULL,NULL,'EduGoods','crud','element-ui','com.ruoyi.edu','edu','goods','物品档案','ruoyi','0','/','{\"parentMenuId\":2000}','admin','2026-09-22 06:53:52','','2026-09-22 07:00:17',NULL);
/*!40000 ALTER TABLE `gen_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gen_table_column`
--

DROP TABLE IF EXISTS `gen_table_column`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gen_table_column` (
  `column_id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `table_id` bigint DEFAULT NULL COMMENT '归属表编号',
  `column_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列名称',
  `column_comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列描述',
  `column_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列类型',
  `java_type` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JAVA类型',
  `java_field` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JAVA字段名',
  `is_pk` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否主键（1是）',
  `is_increment` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否自增（1是）',
  `is_required` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否必填（1是）',
  `is_insert` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否为插入字段（1是）',
  `is_edit` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否编辑字段（1是）',
  `is_list` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否列表字段（1是）',
  `is_query` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '是否查询字段（1是）',
  `query_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT 'EQ' COMMENT '查询方式（等于、不等于、大于、小于、范围）',
  `html_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '显示类型（文本框、文本域、下拉框、复选框、单选框、日期控件）',
  `dict_type` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `sort` int DEFAULT NULL COMMENT '排序',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`column_id`)
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码生成业务表字段';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gen_table_column`
--

LOCK TABLES `gen_table_column` WRITE;
/*!40000 ALTER TABLE `gen_table_column` DISABLE KEYS */;
INSERT INTO `gen_table_column` VALUES (1,1,'class_id','班级ID','bigint','Long','classId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(2,1,'grade','年级','varchar(20)','String','grade','0','0','1','1','1','1','1','EQ','input','grade',2,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(3,1,'class_name','班级名称','varchar(50)','String','className','0','0','1','1','1','1','1','LIKE','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(4,1,'student_num','班级人数','int','Long','studentNum','0','0','1','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(5,1,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(6,1,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',6,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(7,1,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(8,1,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',8,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(9,1,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',9,'admin','2026-09-22 02:15:05','','2026-09-22 06:38:18'),(24,3,'print_id','印刷ID','bigint','Long','printId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(25,3,'print_name','印刷名称','varchar(100)','String','printName','0','0','1','1','1','1','1','LIKE','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(26,3,'paper_goods_id','用纸物品ID','bigint','Long','paperGoodsId','0','0','1','1','1','1','1','EQ','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(27,3,'paper_type','纸张类型','char(2)','String','paperType','0','0','0','1','1','1','1','EQ','select','paper_type',4,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(28,3,'print_count','印刷份数','int','Long','printCount','0','0','1','1','1','1','1','EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(29,3,'teacher_id','申请教师','bigint','Long','teacherId','0','0','0','1','1','1','1','EQ','input','',6,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(30,3,'operator','经办人','varchar(50)','String','operator','0','0','1','1','1','1','1','EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(31,3,'print_time','印刷时间','datetime','Date','printTime','0','0','1','1','1','1','1','EQ','datetime','',8,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(32,3,'remark','备注','varchar(500)','String','remark','0','0','0','1','1','1',NULL,'EQ','textarea','',9,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(33,3,'status','状态','char(1)','String','status','0','0','1','1','1','1','1','EQ','radio','print_status',10,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(34,3,'out_id','关联出库单ID','bigint','Long','outId','0','0','0','1','1','1','1','EQ','input','',11,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(35,3,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',12,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(36,3,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',13,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(37,3,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',14,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(38,3,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',15,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(39,3,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',16,'admin','2026-09-22 02:15:05','','2026-09-22 07:05:28'),(40,4,'in_id','入库ID','bigint','Long','inId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(41,4,'in_no','入库单号','varchar(30)','String','inNo','0','0','1','1','1','1','1','EQ','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(42,4,'in_type','入库类型','char(1)','String','inType','0','0','1','1','1','1','1','EQ','select','in_type',3,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(43,4,'supplier_id','供应商ID','bigint','Long','supplierId','0','0','0','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(44,4,'in_time','入库时间','datetime','Date','inTime','0','0','1','1','1','1','1','EQ','datetime','',5,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(45,4,'operator','经办人','varchar(50)','String','operator','0','0','1','1','1','1','1','EQ','input','',6,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(46,4,'remark','备注','varchar(500)','String','remark','0','0','0','1','1','1',NULL,'EQ','textarea','',7,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:14'),(47,4,'status','状态','char(1)','String','status','0','0','1','1','1','1','1','EQ','radio','in_status',8,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(48,4,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',9,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(49,4,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',10,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(50,4,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',11,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(51,4,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',12,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(52,4,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',13,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:15'),(53,5,'item_id','明细ID','bigint','Long','itemId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(54,5,'in_id','入库单ID','bigint','Long','inId','0','0','1','1','1','1','1','EQ','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(55,5,'goods_id','物品ID','bigint','Long','goodsId','0','0','1','1','1','1','1','EQ','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(56,5,'quantity','数量','int','Long','quantity','0','0','1','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(57,5,'price','单价','decimal(10,2)','BigDecimal','price','0','0','0','1','1','1','1','EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(58,5,'amount','小计','decimal(10,2)','BigDecimal','amount','0','0','0','1','1','1','1','EQ','input','',6,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(59,5,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(60,5,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',8,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(61,5,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',9,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(62,5,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',10,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:43'),(63,6,'out_id','出库ID','bigint','Long','outId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(64,6,'out_no','出库单号','varchar(30)','String','outNo','0','0','1','1','1','1','1','EQ','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(65,6,'out_type','出库类型','char(1)','String','outType','0','0','1','1','1','1','1','EQ','select','out_type',3,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(66,6,'receiver','领用人/班级','varchar(50)','String','receiver','0','0','0','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(67,6,'class_id','关联班级ID','bigint','Long','classId','0','0','0','1','1','1','1','EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(68,6,'out_time','出库时间','datetime','Date','outTime','0','0','1','1','1','1','1','EQ','datetime','',6,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(69,6,'operator','经办人','varchar(50)','String','operator','0','0','1','1','1','1','1','EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(70,6,'remark','备注','varchar(500)','String','remark','0','0','0','1','1','1',NULL,'EQ','textarea','',8,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(71,6,'status','状态','char(1)','String','status','0','0','1','1','1','1','1','EQ','radio','out_status',9,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(72,6,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',10,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(73,6,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',11,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(74,6,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',12,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(75,6,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',13,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(76,6,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',14,'admin','2026-09-22 02:15:05','','2026-09-22 06:58:54'),(77,7,'item_id','明细ID','bigint','Long','itemId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(78,7,'out_id','出库单ID','bigint','Long','outId','0','0','1','1','1','1','1','EQ','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(79,7,'goods_id','物品ID','bigint','Long','goodsId','0','0','1','1','1','1','1','EQ','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(80,7,'quantity','数量','int','Long','quantity','0','0','1','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(81,7,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(82,7,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',6,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(83,7,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(84,7,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',8,'admin','2026-09-22 02:15:05','','2026-09-22 06:27:57'),(85,8,'supplier_id','供应商ID','bigint','Long','supplierId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(86,8,'supplier_name','供应商名称','varchar(100)','String','supplierName','0','0','1','1','1','1','1','LIKE','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(87,8,'contact','联系人','varchar(50)','String','contact','0','0','0','1','1','1','1','EQ','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(88,8,'phone','联系电话','varchar(20)','String','phone','0','0','0','1','1','1','1','EQ','input','',4,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(89,8,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(90,8,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',6,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(91,8,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(92,8,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',8,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(93,8,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',9,'admin','2026-09-22 02:15:05','','2026-09-22 06:28:03'),(94,9,'teacher_id','教师ID','bigint','Long','teacherId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(95,9,'teacher_name','教师姓名','varchar(50)','String','teacherName','0','0','1','1','1','1','1','LIKE','input','',2,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(96,9,'dept','所属部门','varchar(50)','String','dept','0','0','0','1','1','1','1','EQ','input','',3,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(97,9,'grade','任教年级','varchar(20)','String','grade','0','0','0','1','1','1','1','EQ','input','grade',4,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(98,9,'class_ids','任教班级','varchar(200)','String','classIds','0','0','0','1','1','1','1','EQ','input','',5,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(99,9,'subject','任教科目','varchar(30)','String','subject','0','0','0','1','1','1','1','EQ','input','',6,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(100,9,'phone','联系电话','varchar(20)','String','phone','0','0','0','1','1','1','1','EQ','input','',7,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(101,9,'create_by',NULL,'varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',8,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(102,9,'create_time',NULL,'datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',9,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(103,9,'update_by',NULL,'varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',10,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(104,9,'update_time',NULL,'datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',11,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(105,9,'del_flag',NULL,'char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',12,'admin','2026-09-22 02:15:05','','2026-09-22 07:06:41'),(106,10,'goods_id','物品ID','bigint','Long','goodsId','1','1','0','1',NULL,NULL,NULL,'EQ','input','',1,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(107,10,'goods_name','物品名称','varchar(100)','String','goodsName','0','0','1','1','1','1','1','LIKE','input','',2,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(108,10,'category','分类','char(1)','String','category','0','0','1','1','1','1','1','EQ','input','goods_class',3,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(109,10,'grade','适用年级（如高一、初一，非教材类为空）','varchar(20)','String','grade','0','0','0','1','1','1','1','EQ','input','grade',4,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(110,10,'spec','规格','varchar(50)','String','spec','0','0','0','1','1','1','1','EQ','input','',5,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(111,10,'unit','单位','varchar(10)','String','unit','0','0','1','1','1','1','1','EQ','input','',6,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(112,10,'stock_num','当前库存','int','Long','stockNum','0','0','1','1','1','1','1','EQ','input','',7,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(113,10,'warn_low','库存下限','int','Long','warnLow','0','0','1','1','1','1','1','EQ','input','',8,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(114,10,'location','存放位置','varchar(1)','String','location','0','0','0','1','1','1','1','EQ','input','stock_local',9,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(115,10,'create_by','创建者','varchar(64)','String','createBy','0','0','0','1',NULL,NULL,NULL,'EQ','input','',10,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(116,10,'create_time','创建时间','datetime','Date','createTime','0','0','0','1',NULL,NULL,NULL,'EQ','datetime','',11,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(117,10,'update_by','更新者','varchar(64)','String','updateBy','0','0','0','1','1',NULL,NULL,'EQ','input','',12,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(118,10,'update_time','更新时间','datetime','Date','updateTime','0','0','0','1','1',NULL,NULL,'EQ','datetime','',13,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17'),(119,10,'del_flag','删除标志 0存在 2删除','char(1)','String','delFlag','0','0','0','1',NULL,NULL,NULL,'EQ','input','',14,'admin','2026-09-22 06:53:52','','2026-09-22 07:00:17');
/*!40000 ALTER TABLE `gen_table_column` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_config`
--

DROP TABLE IF EXISTS `sys_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_config` (
  `config_id` int NOT NULL AUTO_INCREMENT COMMENT '参数主键',
  `config_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数名称',
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数键名',
  `config_value` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '参数键值',
  `config_type` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'N' COMMENT '系统内置（Y是 N否）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`config_id`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='参数配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_config`
--

LOCK TABLES `sys_config` WRITE;
/*!40000 ALTER TABLE `sys_config` DISABLE KEYS */;
INSERT INTO `sys_config` VALUES (1,'主框架页-默认皮肤样式名称','sys.index.skinName','skin-blue','Y','admin','2026-09-22 02:02:16','',NULL,'蓝色 skin-blue、绿色 skin-green、紫色 skin-purple、红色 skin-red、黄色 skin-yellow'),(2,'用户管理-账号初始密码','sys.user.initPassword','123456','Y','admin','2026-09-22 02:02:16','',NULL,'初始化密码 123456'),(3,'主框架页-侧边栏主题','sys.index.sideTheme','theme-dark','Y','admin','2026-09-22 02:02:16','',NULL,'深色主题theme-dark，浅色主题theme-light'),(4,'账号自助-验证码开关','sys.account.captchaEnabled','true','Y','admin','2026-09-22 02:02:16','',NULL,'是否开启验证码功能（true开启，false关闭）'),(5,'账号自助-是否开启用户注册功能','sys.account.registerUser','false','Y','admin','2026-09-22 02:02:16','',NULL,'是否开启注册用户功能（true开启，false关闭）'),(6,'用户登录-黑名单列表','sys.login.blackIPList','','Y','admin','2026-09-22 02:02:16','',NULL,'设置登录IP黑名单限制，多个匹配项以;分隔，支持匹配（*通配、网段）'),(7,'用户管理-初始密码修改策略','sys.account.initPasswordModify','1','Y','admin','2026-09-22 02:02:16','',NULL,'0：初始密码修改策略关闭，没有任何提示，1：提醒用户，如果未修改初始密码，则在登录时就会提醒修改密码对话框'),(8,'用户管理-账号密码更新周期','sys.account.passwordValidateDays','0','Y','admin','2026-09-22 02:02:16','',NULL,'密码更新周期（填写数字，数据初始化值为0不限制，若修改必须为大于0小于365的正整数），如果超过这个周期登录系统时，则在登录时就会提醒修改密码对话框'),(100,'æ–‡å°è€—æå•å¼ æŠ˜åˆæˆæœ¬(å…ƒ)','edu.print.paperPricePerSheet','0.06','Y','admin','2026-10-05 10:57:03','',NULL,'æ–‡å°æ¯å¼ çº¸æŠ˜åˆè€—ææˆæœ¬å•ä»·(å…ƒ)'),(101,'æ–‡å°æ ‡å‡†åŒ…è£…æ¯åŒ…å¼ æ•°(å¼ )','edu.print.sheetsPerReam','500','Y','admin','2026-10-05 10:57:03','',NULL,'æ¯åŒ…æ ‡å‡†çº¸å¼ å¼ æ•°(é€šå¸¸A4/8Kä¸º500å¼ /åŒ…)');
/*!40000 ALTER TABLE `sys_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_dept`
--

DROP TABLE IF EXISTS `sys_dept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_dept` (
  `dept_id` bigint NOT NULL AUTO_INCREMENT COMMENT '部门id',
  `parent_id` bigint DEFAULT '0' COMMENT '父部门id',
  `ancestors` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '祖级列表',
  `dept_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门名称',
  `order_num` int DEFAULT '0' COMMENT '显示顺序',
  `leader` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人',
  `phone` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `email` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '部门状态（0正常 1停用）',
  `del_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`dept_id`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_dept`
--

LOCK TABLES `sys_dept` WRITE;
/*!40000 ALTER TABLE `sys_dept` DISABLE KEYS */;
INSERT INTO `sys_dept` VALUES (100,0,'0','华襄复读中心',0,'','','','0','0','admin','2026-09-22 02:02:10','admin','2026-09-29 06:49:30'),(110,100,'0,100','高复教学部',1,'','','','0','0','admin','2026-10-03 10:24:37','admin','2026-10-03 10:38:06');
/*!40000 ALTER TABLE `sys_dept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_dict_data`
--

DROP TABLE IF EXISTS `sys_dict_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_dict_data` (
  `dict_code` bigint NOT NULL AUTO_INCREMENT COMMENT '字典编码',
  `dict_sort` int DEFAULT '0' COMMENT '字典排序',
  `dict_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典标签',
  `dict_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典键值',
  `dict_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `css_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '样式属性（其他样式扩展）',
  `list_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表格回显样式',
  `is_default` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'N' COMMENT '是否默认（Y是 N否）',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`dict_code`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_dict_data`
--

LOCK TABLES `sys_dict_data` WRITE;
/*!40000 ALTER TABLE `sys_dict_data` DISABLE KEYS */;
INSERT INTO `sys_dict_data` VALUES (1,1,'男','0','sys_user_sex','','','Y','0','admin','2026-09-22 02:02:15','',NULL,'性别男'),(2,2,'女','1','sys_user_sex','','','N','0','admin','2026-09-22 02:02:15','',NULL,'性别女'),(3,3,'未知','2','sys_user_sex','','','N','0','admin','2026-09-22 02:02:15','',NULL,'性别未知'),(4,1,'显示','0','sys_show_hide','','primary','Y','0','admin','2026-09-22 02:02:15','',NULL,'显示菜单'),(5,2,'隐藏','1','sys_show_hide','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'隐藏菜单'),(6,1,'正常','0','sys_normal_disable','','primary','Y','0','admin','2026-09-22 02:02:15','',NULL,'正常状态'),(7,2,'停用','1','sys_normal_disable','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'停用状态'),(8,1,'正常','0','sys_job_status','','primary','Y','0','admin','2026-09-22 02:02:15','',NULL,'正常状态'),(9,2,'暂停','1','sys_job_status','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'停用状态'),(10,1,'默认','DEFAULT','sys_job_group','','','Y','0','admin','2026-09-22 02:02:15','',NULL,'默认分组'),(11,2,'系统','SYSTEM','sys_job_group','','','N','0','admin','2026-09-22 02:02:15','',NULL,'系统分组'),(12,1,'是','Y','sys_yes_no','','primary','Y','0','admin','2026-09-22 02:02:15','',NULL,'系统默认是'),(13,2,'否','N','sys_yes_no','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'系统默认否'),(14,1,'通知','1','sys_notice_type','','warning','Y','0','admin','2026-09-22 02:02:15','',NULL,'通知'),(15,2,'公告','2','sys_notice_type','','success','N','0','admin','2026-09-22 02:02:15','',NULL,'公告'),(16,1,'正常','0','sys_notice_status','','primary','Y','0','admin','2026-09-22 02:02:15','',NULL,'正常状态'),(17,2,'关闭','1','sys_notice_status','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'关闭状态'),(18,99,'其他','0','sys_oper_type','','info','N','0','admin','2026-09-22 02:02:15','',NULL,'其他操作'),(19,1,'新增','1','sys_oper_type','','info','N','0','admin','2026-09-22 02:02:15','',NULL,'新增操作'),(20,2,'修改','2','sys_oper_type','','info','N','0','admin','2026-09-22 02:02:15','',NULL,'修改操作'),(21,3,'删除','3','sys_oper_type','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'删除操作'),(22,4,'授权','4','sys_oper_type','','primary','N','0','admin','2026-09-22 02:02:15','',NULL,'授权操作'),(23,5,'导出','5','sys_oper_type','','warning','N','0','admin','2026-09-22 02:02:15','',NULL,'导出操作'),(24,6,'导入','6','sys_oper_type','','warning','N','0','admin','2026-09-22 02:02:15','',NULL,'导入操作'),(25,7,'强退','7','sys_oper_type','','danger','N','0','admin','2026-09-22 02:02:15','',NULL,'强退操作'),(26,8,'生成代码','8','sys_oper_type','','warning','N','0','admin','2026-09-22 02:02:15','',NULL,'生成操作'),(27,9,'清空数据','9','sys_oper_type','','danger','N','0','admin','2026-09-22 02:02:16','',NULL,'清空操作'),(28,1,'成功','0','sys_common_status','','primary','N','0','admin','2026-09-22 02:02:16','',NULL,'正常状态'),(29,2,'失败','1','sys_common_status','','danger','N','0','admin','2026-09-22 02:02:16','',NULL,'停用状态'),(103,0,'教师办公用品','1','goods_class',NULL,'default','N','0','admin','2026-09-22 06:41:06','admin','2026-09-22 06:41:15',NULL),(104,1,'学生教材','2','goods_class',NULL,'default','N','0','admin','2026-09-22 06:41:30','',NULL,NULL),(105,2,'文印耗材','3','goods_class',NULL,'default','N','0','admin','2026-09-22 06:41:42','',NULL,NULL),(106,0,'教务室','1','stock_local',NULL,'default','N','0','admin','2026-09-22 06:44:43','',NULL,NULL),(107,1,'四楼办公室（临时仓库）','2','stock_local',NULL,'default','N','0','admin','2026-09-22 06:45:04','',NULL,NULL),(110,0,'采购','1','in_type',NULL,'default','N','0','admin','2026-09-22 06:49:55','',NULL,NULL),(111,1,'调拨','2','in_type',NULL,'default','N','0','admin','2026-09-22 06:50:07','',NULL,NULL),(112,2,'其他','3','in_type',NULL,'default','N','0','admin','2026-09-22 06:50:14','',NULL,NULL),(113,0,'教师领用','1','out_type',NULL,'default','N','0','admin','2026-09-22 06:51:25','',NULL,NULL),(114,1,'学生领书','2','out_type',NULL,'default','N','0','admin','2026-09-22 06:51:36','',NULL,NULL),(115,2,'耗材出库','3','out_type',NULL,'default','N','0','admin','2026-09-22 06:51:51','',NULL,NULL),(116,0,'正常','1','out_status',NULL,'default','N','0','admin','2026-09-22 06:52:29','',NULL,NULL),(117,1,'作废','2','out_status',NULL,'default','N','0','admin','2026-09-22 06:52:35','',NULL,NULL),(118,2,'8K','8K','paper_type',NULL,'default','N','0','admin','2026-09-22 06:56:08','admin','2026-09-22 07:04:40',NULL),(119,3,'16K','16K','paper_type',NULL,'default','N','0','admin','2026-09-22 06:56:16','admin','2026-09-22 07:04:46',NULL),(120,0,'A3','A3','paper_type',NULL,'default','N','0','admin','2026-09-22 06:56:29','admin','2026-09-22 07:04:17',NULL),(121,1,'A4','A4','paper_type',NULL,'default','N','0','admin','2026-09-22 06:56:36','admin','2026-09-22 07:04:25',NULL),(122,0,'正常','1','in_status',NULL,'default','N','0','admin','2026-09-22 06:57:53','',NULL,NULL),(123,1,'作废','2','in_status',NULL,'default','N','0','admin','2026-09-22 06:58:01','',NULL,NULL),(124,1,'初一','初一','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'初一年级'),(125,2,'初二','初二','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'初二年级'),(126,3,'初三','初三','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'初三年级'),(127,4,'高一','高一','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'高一年级'),(128,5,'高二','高二','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'高二年级'),(129,6,'高三','高三','grade','','default','N','0','admin','2026-09-25 08:08:32','',NULL,'高三年级'),(130,1,'待印刷','0','print_status',NULL,'warning','Y','0','admin','2026-09-25 11:07:26','',NULL,'印刷中或待印刷'),(131,2,'已完成','1','print_status',NULL,'success','N','0','admin','2026-09-25 11:07:26','',NULL,'印刷完成'),(132,3,'已作废','2','print_status',NULL,'info','N','0','admin','2026-09-25 11:07:26','',NULL,'已作废'),(133,1,'单页印刷','1','print_side','','primary','Y','0','admin','2026-09-29 09:15:44','',NULL,'单面'),(134,2,'双页印刷','2','print_side','','success','N','0','admin','2026-09-29 09:15:44','',NULL,'双面'),(136,10,'高三复读部','复读部','grade','','primary','N','0','admin','2026-10-03 10:24:58','',NULL,'高三高考复读部'),(137,3,'招生宣传物料','4','goods_class',NULL,NULL,'N','0','','2026-10-06 03:54:14','',NULL,'招生宣传物料');
/*!40000 ALTER TABLE `sys_dict_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_dict_type`
--

DROP TABLE IF EXISTS `sys_dict_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_dict_type` (
  `dict_id` bigint NOT NULL AUTO_INCREMENT COMMENT '字典主键',
  `dict_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典名称',
  `dict_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '字典类型',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `dict_type` (`dict_type`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_dict_type`
--

LOCK TABLES `sys_dict_type` WRITE;
/*!40000 ALTER TABLE `sys_dict_type` DISABLE KEYS */;
INSERT INTO `sys_dict_type` VALUES (1,'用户性别','sys_user_sex','0','admin','2026-09-22 02:02:15','',NULL,'用户性别列表'),(2,'菜单状态','sys_show_hide','0','admin','2026-09-22 02:02:15','',NULL,'菜单状态列表'),(3,'系统开关','sys_normal_disable','0','admin','2026-09-22 02:02:15','',NULL,'系统开关列表'),(4,'任务状态','sys_job_status','0','admin','2026-09-22 02:02:15','',NULL,'任务状态列表'),(5,'任务分组','sys_job_group','0','admin','2026-09-22 02:02:15','',NULL,'任务分组列表'),(6,'系统是否','sys_yes_no','0','admin','2026-09-22 02:02:15','',NULL,'系统是否列表'),(7,'通知类型','sys_notice_type','0','admin','2026-09-22 02:02:15','',NULL,'通知类型列表'),(8,'通知状态','sys_notice_status','0','admin','2026-09-22 02:02:15','',NULL,'通知状态列表'),(9,'操作类型','sys_oper_type','0','admin','2026-09-22 02:02:15','',NULL,'操作类型列表'),(10,'系统状态','sys_common_status','0','admin','2026-09-22 02:02:15','',NULL,'登录状态列表'),(100,'年级','grade','0','admin','2026-09-22 06:36:29','',NULL,NULL),(101,'物品分类','goods_class','0','admin','2026-09-22 06:40:32','',NULL,NULL),(102,'存放位置','stock_local','0','admin','2026-09-22 06:44:14','admin','2026-09-22 06:44:27',NULL),(103,'印刷状态','print_status','0','admin','2026-09-22 06:48:17','',NULL,NULL),(104,'入库类型','in_type','0','admin','2026-09-22 06:49:44','',NULL,NULL),(105,'出库类型','out_type','0','admin','2026-09-22 06:51:01','',NULL,NULL),(106,'出库状态','out_status','0','admin','2026-09-22 06:52:18','',NULL,NULL),(107,'纸张类型','paper_type','0','admin','2026-09-22 06:55:58','',NULL,NULL),(108,'入库状态','in_status','0','admin','2026-09-22 06:57:40','',NULL,NULL),(109,'印刷方式','print_side','0','admin','2026-09-29 09:15:44','',NULL,'印刷单双页方式(1单页印刷 2双页印刷)');
/*!40000 ALTER TABLE `sys_dict_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_job`
--

DROP TABLE IF EXISTS `sys_job`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_job` (
  `job_id` bigint NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `job_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '任务名称',
  `job_group` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT' COMMENT '任务组名',
  `invoke_target` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调用目标字符串',
  `cron_expression` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'cron执行表达式',
  `misfire_policy` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '3' COMMENT '计划执行错误策略（1立即执行 2执行一次 3放弃执行）',
  `concurrent` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '是否并发执行（0允许 1禁止）',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态（0正常 1暂停）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注信息',
  PRIMARY KEY (`job_id`,`job_name`,`job_group`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务调度表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_job`
--

LOCK TABLES `sys_job` WRITE;
/*!40000 ALTER TABLE `sys_job` DISABLE KEYS */;
INSERT INTO `sys_job` VALUES (1,'系统默认（无参）','DEFAULT','ryTask.ryNoParams','0/10 * * * * ?','3','1','1','admin','2026-09-22 02:02:16','',NULL,''),(2,'系统默认（有参）','DEFAULT','ryTask.ryParams(\'ry\')','0/15 * * * * ?','3','1','1','admin','2026-09-22 02:02:16','',NULL,''),(3,'系统默认（多参）','DEFAULT','ryTask.ryMultipleParams(\'ry\', true, 2000L, 316.50D, 100)','0/20 * * * * ?','3','1','1','admin','2026-09-22 02:02:16','',NULL,'');
/*!40000 ALTER TABLE `sys_job` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_job_log`
--

DROP TABLE IF EXISTS `sys_job_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_job_log` (
  `job_log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '任务日志ID',
  `job_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `job_group` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务组名',
  `invoke_target` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调用目标字符串',
  `job_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日志信息',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '执行状态（0正常 1失败）',
  `exception_info` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '异常信息',
  `start_time` datetime DEFAULT NULL COMMENT '执行开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '执行结束时间',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`job_log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务调度日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_job_log`
--

LOCK TABLES `sys_job_log` WRITE;
/*!40000 ALTER TABLE `sys_job_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `sys_job_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_logininfor`
--

DROP TABLE IF EXISTS `sys_logininfor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_logininfor` (
  `info_id` bigint NOT NULL AUTO_INCREMENT COMMENT '访问ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户账号',
  `ipaddr` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '登录IP地址',
  `login_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '登录地点',
  `browser` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '浏览器类型',
  `os` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作系统',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '登录状态（0成功 1失败）',
  `msg` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '提示消息',
  `login_time` datetime DEFAULT NULL COMMENT '访问时间',
  PRIMARY KEY (`info_id`),
  KEY `idx_sys_logininfor_s` (`status`),
  KEY `idx_sys_logininfor_lt` (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统访问记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_logininfor`
--

LOCK TABLES `sys_logininfor` WRITE;
/*!40000 ALTER TABLE `sys_logininfor` DISABLE KEYS */;
/*!40000 ALTER TABLE `sys_logininfor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_menu`
--

DROP TABLE IF EXISTS `sys_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_menu` (
  `menu_id` bigint NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `menu_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单名称',
  `parent_id` bigint DEFAULT '0' COMMENT '父菜单ID',
  `order_num` int DEFAULT '0' COMMENT '显示顺序',
  `path` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由地址',
  `component` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '组件路径',
  `query` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '路由参数',
  `route_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由名称',
  `is_frame` int DEFAULT '1' COMMENT '是否为外链（0是 1否）',
  `is_cache` int DEFAULT '0' COMMENT '是否缓存（0缓存 1不缓存）',
  `menu_type` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '菜单类型（M目录 C菜单 F按钮）',
  `visible` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0显示 1隐藏）',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0正常 1停用）',
  `perms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '权限标识',
  `icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '#' COMMENT '菜单图标',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2507 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_menu`
--

LOCK TABLES `sys_menu` WRITE;
/*!40000 ALTER TABLE `sys_menu` DISABLE KEYS */;
INSERT INTO `sys_menu` VALUES (1,'系统管理',0,99,'system',NULL,'','',1,0,'M','0','0','','system','admin','2026-09-22 02:02:11','',NULL,'系统管理目录'),(2,'系统监控',0,99,'monitor',NULL,'','',1,0,'M','0','0','','monitor','admin','2026-09-22 02:02:11','',NULL,'系统监控目录'),(3,'系统工具',0,99,'tool',NULL,'','',1,0,'M','0','0','','tool','admin','2026-09-22 02:02:11','',NULL,'系统工具目录'),(4,'若依官网',0,99,'http://ruoyi.vip',NULL,'','',0,0,'M','0','1','','guide','admin','2026-09-22 02:02:11','admin','2026-09-27 15:34:52','若依官网地址'),(100,'用户管理',1,1,'user','system/user/index','','',1,0,'C','0','0','system:user:list','user','admin','2026-09-22 02:02:11','',NULL,'用户管理菜单'),(101,'角色管理',1,2,'role','system/role/index','','',1,0,'C','0','0','system:role:list','peoples','admin','2026-09-22 02:02:11','',NULL,'角色管理菜单'),(102,'菜单管理',1,3,'menu','system/menu/index','','',1,0,'C','0','0','system:menu:list','tree-table','admin','2026-09-22 02:02:11','',NULL,'菜单管理菜单'),(103,'部门管理',1,4,'dept','system/dept/index','','',1,0,'C','0','0','system:dept:list','tree','admin','2026-09-22 02:02:11','',NULL,'部门管理菜单'),(104,'岗位管理',1,5,'post','system/post/index','','',1,0,'C','0','0','system:post:list','post','admin','2026-09-22 02:02:11','',NULL,'岗位管理菜单'),(105,'字典管理',1,6,'dict','system/dict/index','','',1,0,'C','0','0','system:dict:list','dict','admin','2026-09-22 02:02:11','',NULL,'字典管理菜单'),(106,'参数设置',1,7,'config','system/config/index','','',1,0,'C','0','0','system:config:list','edit','admin','2026-09-22 02:02:11','',NULL,'参数设置菜单'),(107,'通知公告',1,8,'notice','system/notice/index','','',1,0,'C','0','0','system:notice:list','message','admin','2026-09-22 02:02:11','',NULL,'通知公告菜单'),(108,'日志管理',1,9,'log','','','',1,0,'M','0','0','','log','admin','2026-09-22 02:02:11','',NULL,'日志管理菜单'),(109,'在线用户',2,1,'online','monitor/online/index','','',1,0,'C','0','0','monitor:online:list','online','admin','2026-09-22 02:02:11','',NULL,'在线用户菜单'),(110,'定时任务',2,2,'job','monitor/job/index','','',1,0,'C','0','0','monitor:job:list','job','admin','2026-09-22 02:02:11','',NULL,'定时任务菜单'),(111,'数据监控',2,3,'druid','monitor/druid/index','','',1,0,'C','0','0','monitor:druid:list','druid','admin','2026-09-22 02:02:11','',NULL,'数据监控菜单'),(112,'服务监控',2,4,'server','monitor/server/index','','',1,0,'C','0','0','monitor:server:list','server','admin','2026-09-22 02:02:11','',NULL,'服务监控菜单'),(113,'缓存监控',2,5,'cache','monitor/cache/index','','',1,0,'C','0','0','monitor:cache:list','redis','admin','2026-09-22 02:02:11','',NULL,'缓存监控菜单'),(114,'缓存列表',2,6,'cacheList','monitor/cache/list','','',1,0,'C','0','0','monitor:cache:list','redis-list','admin','2026-09-22 02:02:11','',NULL,'缓存列表菜单'),(115,'表单构建',3,1,'build','tool/build/index','','',1,0,'C','0','0','tool:build:list','build','admin','2026-09-22 02:02:11','',NULL,'表单构建菜单'),(116,'代码生成',3,2,'gen','tool/gen/index','','',1,0,'C','0','0','tool:gen:list','code','admin','2026-09-22 02:02:11','',NULL,'代码生成菜单'),(117,'系统接口',3,3,'swagger','tool/swagger/index','','',1,0,'C','0','0','tool:swagger:list','swagger','admin','2026-09-22 02:02:11','',NULL,'系统接口菜单'),(500,'操作日志',108,1,'operlog','monitor/operlog/index','','',1,0,'C','0','0','monitor:operlog:list','form','admin','2026-09-22 02:02:11','',NULL,'操作日志菜单'),(501,'登录日志',108,2,'logininfor','monitor/logininfor/index','','',1,0,'C','0','0','monitor:logininfor:list','logininfor','admin','2026-09-22 02:02:11','',NULL,'登录日志菜单'),(1000,'用户查询',100,1,'','','','',1,0,'F','0','0','system:user:query','#','admin','2026-09-22 02:02:11','',NULL,''),(1001,'用户新增',100,2,'','','','',1,0,'F','0','0','system:user:add','#','admin','2026-09-22 02:02:11','',NULL,''),(1002,'用户修改',100,3,'','','','',1,0,'F','0','0','system:user:edit','#','admin','2026-09-22 02:02:11','',NULL,''),(1003,'用户删除',100,4,'','','','',1,0,'F','0','0','system:user:remove','#','admin','2026-09-22 02:02:11','',NULL,''),(1004,'用户导出',100,5,'','','','',1,0,'F','0','0','system:user:export','#','admin','2026-09-22 02:02:11','',NULL,''),(1005,'用户导入',100,6,'','','','',1,0,'F','0','0','system:user:import','#','admin','2026-09-22 02:02:11','',NULL,''),(1006,'重置密码',100,7,'','','','',1,0,'F','0','0','system:user:resetPwd','#','admin','2026-09-22 02:02:11','',NULL,''),(1007,'角色查询',101,1,'','','','',1,0,'F','0','0','system:role:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1008,'角色新增',101,2,'','','','',1,0,'F','0','0','system:role:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1009,'角色修改',101,3,'','','','',1,0,'F','0','0','system:role:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1010,'角色删除',101,4,'','','','',1,0,'F','0','0','system:role:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1011,'角色导出',101,5,'','','','',1,0,'F','0','0','system:role:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1012,'菜单查询',102,1,'','','','',1,0,'F','0','0','system:menu:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1013,'菜单新增',102,2,'','','','',1,0,'F','0','0','system:menu:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1014,'菜单修改',102,3,'','','','',1,0,'F','0','0','system:menu:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1015,'菜单删除',102,4,'','','','',1,0,'F','0','0','system:menu:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1016,'部门查询',103,1,'','','','',1,0,'F','0','0','system:dept:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1017,'部门新增',103,2,'','','','',1,0,'F','0','0','system:dept:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1018,'部门修改',103,3,'','','','',1,0,'F','0','0','system:dept:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1019,'部门删除',103,4,'','','','',1,0,'F','0','0','system:dept:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1020,'岗位查询',104,1,'','','','',1,0,'F','0','0','system:post:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1021,'岗位新增',104,2,'','','','',1,0,'F','0','0','system:post:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1022,'岗位修改',104,3,'','','','',1,0,'F','0','0','system:post:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1023,'岗位删除',104,4,'','','','',1,0,'F','0','0','system:post:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1024,'岗位导出',104,5,'','','','',1,0,'F','0','0','system:post:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1025,'字典查询',105,1,'#','','','',1,0,'F','0','0','system:dict:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1026,'字典新增',105,2,'#','','','',1,0,'F','0','0','system:dict:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1027,'字典修改',105,3,'#','','','',1,0,'F','0','0','system:dict:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1028,'字典删除',105,4,'#','','','',1,0,'F','0','0','system:dict:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1029,'字典导出',105,5,'#','','','',1,0,'F','0','0','system:dict:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1030,'参数查询',106,1,'#','','','',1,0,'F','0','0','system:config:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1031,'参数新增',106,2,'#','','','',1,0,'F','0','0','system:config:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1032,'参数修改',106,3,'#','','','',1,0,'F','0','0','system:config:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1033,'参数删除',106,4,'#','','','',1,0,'F','0','0','system:config:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1034,'参数导出',106,5,'#','','','',1,0,'F','0','0','system:config:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1035,'公告查询',107,1,'#','','','',1,0,'F','0','0','system:notice:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1036,'公告新增',107,2,'#','','','',1,0,'F','0','0','system:notice:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1037,'公告修改',107,3,'#','','','',1,0,'F','0','0','system:notice:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1038,'公告删除',107,4,'#','','','',1,0,'F','0','0','system:notice:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1039,'操作查询',500,1,'#','','','',1,0,'F','0','0','monitor:operlog:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1040,'操作删除',500,2,'#','','','',1,0,'F','0','0','monitor:operlog:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1041,'日志导出',500,3,'#','','','',1,0,'F','0','0','monitor:operlog:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1042,'登录查询',501,1,'#','','','',1,0,'F','0','0','monitor:logininfor:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1043,'登录删除',501,2,'#','','','',1,0,'F','0','0','monitor:logininfor:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1044,'日志导出',501,3,'#','','','',1,0,'F','0','0','monitor:logininfor:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1045,'账户解锁',501,4,'#','','','',1,0,'F','0','0','monitor:logininfor:unlock','#','admin','2026-09-22 02:02:12','',NULL,''),(1046,'在线查询',109,1,'#','','','',1,0,'F','0','0','monitor:online:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1047,'批量强退',109,2,'#','','','',1,0,'F','0','0','monitor:online:batchLogout','#','admin','2026-09-22 02:02:12','',NULL,''),(1048,'单条强退',109,3,'#','','','',1,0,'F','0','0','monitor:online:forceLogout','#','admin','2026-09-22 02:02:12','',NULL,''),(1049,'任务查询',110,1,'#','','','',1,0,'F','0','0','monitor:job:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1050,'任务新增',110,2,'#','','','',1,0,'F','0','0','monitor:job:add','#','admin','2026-09-22 02:02:12','',NULL,''),(1051,'任务修改',110,3,'#','','','',1,0,'F','0','0','monitor:job:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1052,'任务删除',110,4,'#','','','',1,0,'F','0','0','monitor:job:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1053,'状态修改',110,5,'#','','','',1,0,'F','0','0','monitor:job:changeStatus','#','admin','2026-09-22 02:02:12','',NULL,''),(1054,'任务导出',110,6,'#','','','',1,0,'F','0','0','monitor:job:export','#','admin','2026-09-22 02:02:12','',NULL,''),(1055,'生成查询',116,1,'#','','','',1,0,'F','0','0','tool:gen:query','#','admin','2026-09-22 02:02:12','',NULL,''),(1056,'生成修改',116,2,'#','','','',1,0,'F','0','0','tool:gen:edit','#','admin','2026-09-22 02:02:12','',NULL,''),(1057,'生成删除',116,3,'#','','','',1,0,'F','0','0','tool:gen:remove','#','admin','2026-09-22 02:02:12','',NULL,''),(1058,'导入代码',116,4,'#','','','',1,0,'F','0','0','tool:gen:import','#','admin','2026-09-22 02:02:12','',NULL,''),(1059,'预览代码',116,5,'#','','','',1,0,'F','0','0','tool:gen:preview','#','admin','2026-09-22 02:02:12','',NULL,''),(1060,'生成代码',116,6,'#','','','',1,0,'F','0','0','tool:gen:code','#','admin','2026-09-22 02:02:12','',NULL,''),(2000,'教务管理',0,1,'edu',NULL,NULL,'',1,0,'M','0','0',NULL,'education','admin','2026-09-22 02:16:04','',NULL,'教务管理目录'),(2001,'班级档案',2000,2,'class','edu/class/index',NULL,'',1,0,'C','0','0','edu:class:list','tree-table','admin','2026-09-22 02:22:18','',NULL,'班级档案菜单'),(2002,'班级档案查询',2001,1,'#','',NULL,'',1,0,'F','0','0','edu:class:query','#','admin','2026-09-22 02:22:19','',NULL,''),(2003,'班级档案新增',2001,2,'#','',NULL,'',1,0,'F','0','0','edu:class:add','#','admin','2026-09-22 02:22:19','',NULL,''),(2004,'班级档案修改',2001,3,'#','',NULL,'',1,0,'F','0','0','edu:class:edit','#','admin','2026-09-22 02:22:19','',NULL,''),(2005,'班级档案删除',2001,4,'#','',NULL,'',1,0,'F','0','0','edu:class:remove','#','admin','2026-09-22 02:22:19','',NULL,''),(2006,'班级档案导出',2001,5,'#','',NULL,'',1,0,'F','0','0','edu:class:export','#','admin','2026-09-22 02:22:19','',NULL,''),(2007,'物资档案',2100,1,'goods','stock/goods/index',NULL,'',1,0,'C','0','0','stock:goods:list','#','admin','2026-09-22 02:22:38','',NULL,'物资档案菜单'),(2008,'物资档案查询',2007,1,'#','',NULL,'',1,0,'F','0','0','stock:goods:query','#','admin','2026-09-22 02:22:39','',NULL,''),(2009,'物资档案新增',2007,2,'#','',NULL,'',1,0,'F','0','0','stock:goods:add','#','admin','2026-09-22 02:22:39','',NULL,''),(2010,'物资档案修改',2007,3,'#','',NULL,'',1,0,'F','0','0','stock:goods:edit','#','admin','2026-09-22 02:22:39','',NULL,''),(2011,'物资档案删除',2007,4,'#','',NULL,'',1,0,'F','0','0','stock:goods:remove','#','admin','2026-09-22 02:22:39','',NULL,''),(2012,'物资档案导出',2007,5,'#','',NULL,'',1,0,'F','0','0','stock:goods:export','#','admin','2026-09-22 02:22:39','',NULL,''),(2013,'入库单明细',2100,4,'inItem','stock/inItem/index',NULL,'',1,0,'C','1','0','stock:inItem:list','#','admin','2026-09-22 02:22:49','',NULL,'入库单明细菜单'),(2014,'入库单明细查询',2013,1,'#','',NULL,'',1,0,'F','0','0','stock:inItem:query','#','admin','2026-09-22 02:22:49','',NULL,''),(2015,'入库单明细新增',2013,2,'#','',NULL,'',1,0,'F','0','0','stock:inItem:add','#','admin','2026-09-22 02:22:49','',NULL,''),(2016,'入库单明细修改',2013,3,'#','',NULL,'',1,0,'F','0','0','stock:inItem:edit','#','admin','2026-09-22 02:22:49','',NULL,''),(2017,'入库单明细删除',2013,4,'#','',NULL,'',1,0,'F','0','0','stock:inItem:remove','#','admin','2026-09-22 02:22:49','',NULL,''),(2018,'入库单明细导出',2013,5,'#','',NULL,'',1,0,'F','0','0','stock:inItem:export','#','admin','2026-09-22 02:22:49','',NULL,''),(2019,'入库单',2100,3,'in','stock/in/index',NULL,'',1,0,'C','0','0','stock:in:list','#','admin','2026-09-22 02:23:02','',NULL,'入库单菜单'),(2020,'入库单查询',2019,1,'#','',NULL,'',1,0,'F','0','0','stock:in:query','#','admin','2026-09-22 02:23:02','',NULL,''),(2021,'入库单新增',2019,2,'#','',NULL,'',1,0,'F','0','0','stock:in:add','#','admin','2026-09-22 02:23:02','',NULL,''),(2022,'入库单修改',2019,3,'#','',NULL,'',1,0,'F','0','0','stock:in:edit','#','admin','2026-09-22 02:23:02','',NULL,''),(2023,'入库单删除',2019,4,'#','',NULL,'',1,0,'F','0','0','stock:in:remove','#','admin','2026-09-22 02:23:02','',NULL,''),(2024,'入库单导出',2019,5,'#','',NULL,'',1,0,'F','0','0','stock:in:export','#','admin','2026-09-22 02:23:02','',NULL,''),(2025,'出库单明细',2100,6,'outItem','stock/outItem/index',NULL,'',1,0,'C','1','0','stock:outItem:list','#','admin','2026-09-22 02:23:12','',NULL,'出库单明细菜单'),(2026,'出库单明细查询',2025,1,'#','',NULL,'',1,0,'F','0','0','stock:outItem:query','#','admin','2026-09-22 02:23:12','',NULL,''),(2027,'出库单明细新增',2025,2,'#','',NULL,'',1,0,'F','0','0','stock:outItem:add','#','admin','2026-09-22 02:23:12','',NULL,''),(2028,'出库单明细修改',2025,3,'#','',NULL,'',1,0,'F','0','0','stock:outItem:edit','#','admin','2026-09-22 02:23:12','',NULL,''),(2029,'出库单明细删除',2025,4,'#','',NULL,'',1,0,'F','0','0','stock:outItem:remove','#','admin','2026-09-22 02:23:12','',NULL,''),(2030,'出库单明细导出',2025,5,'#','',NULL,'',1,0,'F','0','0','stock:outItem:export','#','admin','2026-09-22 02:23:12','',NULL,''),(2031,'出库单',2100,5,'out','stock/out/index',NULL,'',1,0,'C','0','0','stock:out:list','#','admin','2026-09-22 02:23:18','',NULL,'出库单菜单'),(2032,'出库单查询',2031,1,'#','',NULL,'',1,0,'F','0','0','stock:out:query','#','admin','2026-09-22 02:23:19','',NULL,''),(2033,'出库单新增',2031,2,'#','',NULL,'',1,0,'F','0','0','stock:out:add','#','admin','2026-09-22 02:23:19','',NULL,''),(2034,'出库单修改',2031,3,'#','',NULL,'',1,0,'F','0','0','stock:out:edit','#','admin','2026-09-22 02:23:19','',NULL,''),(2035,'出库单删除',2031,4,'#','',NULL,'',1,0,'F','0','0','stock:out:remove','#','admin','2026-09-22 02:23:19','',NULL,''),(2036,'出库单导出',2031,5,'#','',NULL,'',1,0,'F','0','0','stock:out:export','#','admin','2026-09-22 02:23:19','',NULL,''),(2037,'文印登记',2400,1,'record','print/record/index',NULL,'',1,0,'C','0','0','edu:record:list','printer','admin','2026-09-22 02:23:27','',NULL,'印刷登记菜单'),(2038,'印刷登记查询',2037,1,'#','',NULL,'',1,0,'F','0','0','edu:record:query','#','admin','2026-09-22 02:23:27','',NULL,''),(2039,'印刷登记新增',2037,2,'#','',NULL,'',1,0,'F','0','0','edu:record:add','#','admin','2026-09-22 02:23:27','',NULL,''),(2040,'印刷登记修改',2037,3,'#','',NULL,'',1,0,'F','0','0','edu:record:edit','#','admin','2026-09-22 02:23:27','',NULL,''),(2041,'印刷登记删除',2037,4,'#','',NULL,'',1,0,'F','0','0','edu:record:remove','#','admin','2026-09-22 02:23:27','',NULL,''),(2042,'印刷登记导出',2037,5,'#','',NULL,'',1,0,'F','0','0','edu:record:export','#','admin','2026-09-22 02:23:27','',NULL,''),(2043,'供应商',2100,2,'supplier','stock/supplier/index',NULL,'',1,0,'C','0','0','stock:supplier:list','#','admin','2026-09-22 02:23:37','',NULL,'供应商菜单'),(2044,'供应商查询',2043,1,'#','',NULL,'',1,0,'F','0','0','stock:supplier:query','#','admin','2026-09-22 02:23:37','',NULL,''),(2045,'供应商新增',2043,2,'#','',NULL,'',1,0,'F','0','0','stock:supplier:add','#','admin','2026-09-22 02:23:37','',NULL,''),(2046,'供应商修改',2043,3,'#','',NULL,'',1,0,'F','0','0','stock:supplier:edit','#','admin','2026-09-22 02:23:38','',NULL,''),(2047,'供应商删除',2043,4,'#','',NULL,'',1,0,'F','0','0','stock:supplier:remove','#','admin','2026-09-22 02:23:38','',NULL,''),(2048,'供应商导出',2043,5,'#','',NULL,'',1,0,'F','0','0','stock:supplier:export','#','admin','2026-09-22 02:23:38','',NULL,''),(2049,'教职工档案',2000,1,'teacher','edu/teacher/index',NULL,'',1,0,'C','1','0','edu:teacher:list','peoples','admin','2026-09-22 02:23:44','',NULL,'教职工档案菜单'),(2050,'教职工档案查询',2049,1,'#','',NULL,'',1,0,'F','0','0','edu:teacher:query','#','admin','2026-09-22 02:23:45','',NULL,''),(2051,'教职工档案新增',2049,2,'#','',NULL,'',1,0,'F','0','0','edu:teacher:add','#','admin','2026-09-22 02:23:45','',NULL,''),(2052,'教职工档案修改',2049,3,'#','',NULL,'',1,0,'F','0','0','edu:teacher:edit','#','admin','2026-09-22 02:23:45','',NULL,''),(2053,'教职工档案删除',2049,4,'#','',NULL,'',1,0,'F','0','0','edu:teacher:remove','#','admin','2026-09-22 02:23:45','',NULL,''),(2054,'教职工档案导出',2049,5,'#','',NULL,'',1,0,'F','0','0','edu:teacher:export','#','admin','2026-09-22 02:23:45','',NULL,''),(2055,'文印统计报表',2400,2,'report','print/report/index',NULL,'',1,0,'C','0','0','edu:record:list','chart','admin','2026-09-26 06:36:21','',NULL,''),(2056,'提分光荣榜',2000,3,'celebration','edu/celebration/index',NULL,'',1,0,'C','0','0','edu:celebration:list','chart','admin','2026-09-28 09:39:17','',NULL,'高考学子提分光荣榜与大屏展播'),(2060,'库存盘点',2100,7,'check','stock/check/index',NULL,'',1,0,'C','0','0','stock:check:list','checkbox','admin','2026-09-25 09:02:18','',NULL,'åº“å­˜ç›˜ç‚¹èœå•'),(2061,'盘点查询',2060,1,'#','',NULL,'',1,0,'F','0','0','stock:check:query','#','admin','2026-09-25 09:02:18','',NULL,''),(2062,'发起盘点',2060,2,'#','',NULL,'',1,0,'F','0','0','stock:check:add','#','admin','2026-09-25 09:02:18','',NULL,''),(2063,'盘点修改',2060,3,'#','',NULL,'',1,0,'F','0','0','stock:check:edit','#','admin','2026-09-25 09:02:18','',NULL,''),(2064,'盘点审核',2060,4,'#','',NULL,'',1,0,'F','0','0','stock:check:audit','#','admin','2026-09-25 09:02:18','',NULL,''),(2065,'盘点作废',2060,5,'#','',NULL,'',1,0,'F','0','0','stock:check:cancel','#','admin','2026-09-25 09:02:18','',NULL,''),(2066,'盘点删除',2060,6,'#','',NULL,'',1,0,'F','0','0','stock:check:remove','#','admin','2026-09-25 09:02:18','',NULL,''),(2067,'盘点导出',2060,7,'#','',NULL,'',1,0,'F','0','0','stock:check:export','#','admin','2026-09-25 09:02:18','',NULL,''),(2070,'统计报表',2100,8,'report',NULL,NULL,'',1,0,'M','0','0','','chart','admin','2026-09-25 09:02:18','',NULL,'ç»Ÿè®¡æŠ¥è¡¨ç›®å½•'),(2071,'出入库明细报表',2070,1,'detail','stock/report/detail',NULL,'',1,0,'C','0','0','stock:report:detail','table','admin','2026-09-25 09:02:18','',NULL,'å‡ºå…¥åº“æ˜Žç»†æŠ¥è¡¨èœå•'),(2072,'明细报表导出',2071,1,'#','',NULL,'',1,0,'F','0','0','stock:report:detail','#','admin','2026-09-25 09:02:18','',NULL,''),(2073,'月度统计报表',2070,2,'monthly','stock/report/monthly',NULL,'',1,0,'C','0','0','stock:report:monthly','money','admin','2026-09-25 09:02:18','',NULL,'æœˆåº¦ç»Ÿè®¡æŠ¥è¡¨èœå•'),(2074,'月度报表导出',2073,1,'#','',NULL,'',1,0,'F','0','0','stock:report:monthly','#','admin','2026-09-25 09:02:18','',NULL,''),(2080,'日常领退登记',2000,4,'material','edu/material/index',NULL,'',1,0,'C','0','0','edu:material:list','shopping','admin','2026-10-03 11:31:40','',NULL,'教务日常物资领取发书发武器与回收退书'),(2081,'领退登记查询',2080,1,'#','',NULL,'',1,0,'F','0','0','edu:material:query','#','admin','2026-10-03 11:31:40','',NULL,''),(2082,'物资领取发放',2080,2,'#','',NULL,'',1,0,'F','0','0','edu:material:grant','#','admin','2026-10-03 11:31:40','',NULL,''),(2083,'物资退还回收',2080,3,'#','',NULL,'',1,0,'F','0','0','edu:material:recovery','#','admin','2026-10-03 11:31:40','',NULL,''),(2084,'领退台账导出',2080,4,'#','',NULL,'',1,0,'F','0','0','edu:material:export','#','admin','2026-10-03 11:31:40','',NULL,''),(2085,'物资套装配置',2000,5,'kit','edu/kit/index',NULL,'',1,0,'C','0','0','edu:kit:list','nested','admin','2026-10-03 11:31:40','',NULL,'教务一键成套领取模板配置'),(2086,'套装配置查询',2085,1,'#','',NULL,'',1,0,'F','0','0','edu:kit:query','#','admin','2026-10-03 11:31:40','',NULL,''),(2087,'套装配置新增',2085,2,'#','',NULL,'',1,0,'F','0','0','edu:kit:add','#','admin','2026-10-03 11:31:40','',NULL,''),(2088,'套装配置修改',2085,3,'#','',NULL,'',1,0,'F','0','0','edu:kit:edit','#','admin','2026-10-03 11:31:40','',NULL,''),(2090,'物资领退统计报表',2000,6,'materialReport','edu/material/report/index',NULL,'',1,0,'C','0','0','edu:material:report','chart','admin','2026-10-03 12:17:27','',NULL,'教务物资领退多维穿透统计报表'),(2100,'库存管理',0,3,'stock',NULL,NULL,'',1,0,'M','0','0',NULL,'shopping','admin','2026-09-26 05:08:42','',NULL,'库存管理顶级目录'),(2200,'招生管理',0,4,'recruit',NULL,NULL,'',1,0,'M','0','0','','peoples','admin','2026-09-26 05:41:03','',NULL,'招生预约管理目录'),(2201,'招生看板',2200,1,'dashboard','recruit/dashboard/index',NULL,'',1,0,'C','0','0','recruit:dashboard:view','chart','admin','2026-09-26 05:41:03','',NULL,'招生统计看板'),(2202,'预约记录',2200,2,'appointment','recruit/appointment/index',NULL,'',1,0,'C','0','0','recruit:appointment:list','documentation','admin','2026-09-26 05:41:03','',NULL,'访校预约记录'),(2203,'现场核销',2200,3,'verify','recruit/verify/index',NULL,'',1,0,'C','0','0','recruit:verify:edit','checkbox','admin','2026-09-26 05:41:03','',NULL,'现场核销登记'),(2204,'教师绑定',2200,4,'binding','recruit/binding/index',NULL,'',1,0,'C','0','0','recruit:binding:list','user','admin','2026-09-26 05:41:03','',NULL,'招生教师绑定审核'),(2206,'排班配置',2200,6,'config','recruit/config/index',NULL,'',1,0,'C','0','0','recruit:config:edit','component','admin','2026-09-26 05:41:03','',NULL,'招生时间段与配置'),(2300,'数字化大屏',0,5,'screen','screen/index',NULL,'',1,0,'C','0','0','','monitor','admin','2026-09-26 06:36:21','',NULL,''),(2400,'文印管理',0,2,'print',NULL,NULL,'',1,0,'M','0','0',NULL,'printer','admin','2026-10-03 11:57:45','',NULL,'文印管理顶级目录'),(2500,'官网CMS',0,4,'cms',NULL,NULL,'',1,0,'M','0','0','','documentation','admin','2026-10-05 07:16:16','',NULL,'官网内容管理主目录'),(2501,'门户参数',2500,1,'config','cms/config/index',NULL,'',1,0,'C','0','0','cms:config:list','system','admin','2026-10-05 07:16:16','',NULL,'官网核心参数与指标'),(2502,'公文资讯',2500,2,'article','cms/article/index',NULL,'',1,0,'C','0','0','cms:article:list','message','admin','2026-10-05 07:16:16','',NULL,'官网校园公告与高招新闻'),(2503,'名师天团',2500,3,'teacher','cms/teacher/index',NULL,'',1,0,'C','0','0','cms:teacher:list','peoples','admin','2026-10-05 07:16:16','',NULL,'官网清北名师队伍'),(2504,'校园设施',2500,4,'facility','cms/facility/index',NULL,'',1,0,'C','0','0','cms:facility:list','tree','admin','2026-10-05 07:16:16','',NULL,'官网校园建筑与实景导览'),(2505,'轮播横幅',2500,5,'banner','cms/banner/index',NULL,'',1,0,'C','0','0','cms:banner:list','guide','admin','2026-10-05 07:16:16','',NULL,'官网巨幕轮播海报'),(2506,'常见问答',2500,6,'faq','cms/faq/index',NULL,'',1,0,'C','0','0','cms:faq:list','question','admin','2026-10-05 07:16:16','',NULL,'官网高频招生问答释疑');
/*!40000 ALTER TABLE `sys_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_notice`
--

DROP TABLE IF EXISTS `sys_notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_notice` (
  `notice_id` int NOT NULL AUTO_INCREMENT COMMENT '公告ID',
  `notice_title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `notice_type` char(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告类型（1通知 2公告）',
  `notice_content` longblob COMMENT '公告内容',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '公告状态（0正常 1关闭）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`notice_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知公告表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_notice`
--

LOCK TABLES `sys_notice` WRITE;
/*!40000 ALTER TABLE `sys_notice` DISABLE KEYS */;
INSERT INTO `sys_notice` VALUES (1,'关于开展2026年秋季学期教学资料印制规范的通知','1',0xE59084E69599E7A094E5AEA4E38081E59084E4BD8DE88081E5B888EFBC9AE4B8BAE4BF9DE99A9CE69C9FE4B8ADE5A487E88083E69687E58DB0E69588E78E87EFBC8CE8AFB7E59084E5ADA6E7A791E68F90E5898D3234E5B08FE697B6E9809AE8BF87E695B0E5AD97E58C96E7B3BBE7BB9FE58F91E8B5B7E69687E58DB0E799BBE8AEB0EFBC8CE8A784E88C83E794A8E7BAB8E8A784E6A0BC2E2E2E,'0','admin','2026-10-03 11:55:33','',NULL,'教务处发文'),(2,'汉外华襄校园开放日接待与迎新核销工作排班安排','2',0xE68B9BE7949FE592A8E8AFA2E5A484EFBC9AE69CACE591A8E585ADE5B086E8BF8EE69DA5E5A4A7E8A784E6A8A1E5889DE4B889E58D87E9AB98E4B8ADE6848FE59091E5AEB6E995BFE8AEBFE6A0A1EFBC8CE8AFB7E68EA5E5BE85E88081E5B888E4BDA9E688B4E5B7A5E7898CE38081E68993E5BC80E5B7A5E4BD9CE58FB0E6A0B8E99480E7ABAFE5AE9EE697B6E689ABE7A081E68EA5E5BE852E2E2E,'0','admin','2026-10-03 11:55:33','',NULL,'招生办发文'),(3,'关于教学实验耗材及期末文印纸张集中采购入库的提示','1',0xE7BBBCE59088E4BF9DE99A9CE5A484EFBC9AE696B0E4B880E689B9E5BE97E58A9B4134E58F8CE883B6E5A48DE58DB0E7BAB8E58F8A384BE69C88E88083E8AF95E58DB7E7BAB8E5B7B2E9AA8CE694B6E5AE8CE68890EFBC8CE59084E5B9B4E7BAA7E9A286E794A8E4BABAE587ADE587BAE5BA93E9A286E794A8E58D95E887B3E69687E58DB0E5BA93E9A286E58F962E2E2E,'0','admin','2026-10-03 11:55:33','',NULL,'资产管理中心'),(4,'校园数字化大屏与提分喜报系统正式升级上线通知','2',0xE585A8E6A0A1E59084E983A8E997A8EFBC9AE585A8E696B0E6A0A1E59BADE585A8E699AFE695B0E5AD97E58C96E8BF90E890A5E6B299E79B98E4B88EE9AB98E88083E58D93E8B68AE68F90E58886E6A69CE5B7B2E5908CE6ADA5E983A8E7BDB2EFBC8CE6ACA2E8BF8EE59084E7BAA7E7AEA1E79086E4BABAE59198E69FA5E99885E5AE9EE697B6E8BF90E890A5E68C87E6A0872E2E2E,'0','admin','2026-10-03 11:55:33','',NULL,'信息技术中心');
/*!40000 ALTER TABLE `sys_notice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_notice_read`
--

DROP TABLE IF EXISTS `sys_notice_read`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_notice_read` (
  `read_id` bigint NOT NULL AUTO_INCREMENT COMMENT '已读主键',
  `notice_id` int NOT NULL COMMENT '公告id',
  `user_id` bigint NOT NULL COMMENT '用户id',
  `read_time` datetime NOT NULL COMMENT '阅读时间',
  PRIMARY KEY (`read_id`),
  UNIQUE KEY `uk_user_notice` (`user_id`,`notice_id`) COMMENT '同一用户同一公告只记录一次'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告已读记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_notice_read`
--

LOCK TABLES `sys_notice_read` WRITE;
/*!40000 ALTER TABLE `sys_notice_read` DISABLE KEYS */;
/*!40000 ALTER TABLE `sys_notice_read` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_oper_log`
--

DROP TABLE IF EXISTS `sys_oper_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_oper_log` (
  `oper_id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志主键',
  `title` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '模块标题',
  `business_type` int DEFAULT '0' COMMENT '业务类型（0其它 1新增 2修改 3删除）',
  `method` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '方法名称',
  `request_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求方式',
  `operator_type` int DEFAULT '0' COMMENT '操作类别（0其它 1后台用户 2手机端用户）',
  `oper_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人员',
  `dept_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门名称',
  `oper_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求URL',
  `oper_ip` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '主机地址',
  `oper_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作地点',
  `oper_param` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求参数',
  `json_result` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '返回参数',
  `status` int DEFAULT '0' COMMENT '操作状态（0正常 1异常）',
  `error_msg` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '错误消息',
  `oper_time` datetime DEFAULT NULL COMMENT '操作时间',
  `cost_time` bigint DEFAULT '0' COMMENT '消耗时间',
  PRIMARY KEY (`oper_id`),
  KEY `idx_sys_oper_log_bt` (`business_type`),
  KEY `idx_sys_oper_log_s` (`status`),
  KEY `idx_sys_oper_log_ot` (`oper_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_oper_log`
--

LOCK TABLES `sys_oper_log` WRITE;
/*!40000 ALTER TABLE `sys_oper_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `sys_oper_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_post`
--

DROP TABLE IF EXISTS `sys_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_post` (
  `post_id` bigint NOT NULL AUTO_INCREMENT COMMENT '岗位ID',
  `post_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位编码',
  `post_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位名称',
  `post_sort` int NOT NULL COMMENT '显示顺序',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`post_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_post`
--

LOCK TABLES `sys_post` WRITE;
/*!40000 ALTER TABLE `sys_post` DISABLE KEYS */;
INSERT INTO `sys_post` VALUES (1,'ceo','董事长',1,'0','admin','2026-09-22 02:02:11','',NULL,''),(2,'se','项目经理',2,'0','admin','2026-09-22 02:02:11','',NULL,''),(3,'hr','人力资源',3,'0','admin','2026-09-22 02:02:11','',NULL,''),(4,'user','普通员工',4,'0','admin','2026-09-22 02:02:11','',NULL,'');
/*!40000 ALTER TABLE `sys_post` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_role`
--

DROP TABLE IF EXISTS `sys_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role` (
  `role_id` bigint NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `role_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色权限字符串',
  `role_sort` int NOT NULL COMMENT '显示顺序',
  `data_scope` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '数据范围（1：全部数据权限 2：自定数据权限 3：本部门数据权限 4：本部门及以下数据权限）',
  `menu_check_strictly` tinyint(1) DEFAULT '1' COMMENT '菜单树选择项是否关联显示',
  `dept_check_strictly` tinyint(1) DEFAULT '1' COMMENT '部门树选择项是否关联显示',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色状态（0正常 1停用）',
  `del_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_role`
--

LOCK TABLES `sys_role` WRITE;
/*!40000 ALTER TABLE `sys_role` DISABLE KEYS */;
INSERT INTO `sys_role` VALUES (1,'超级管理员','admin',1,'1',1,1,'0','0','admin','2026-09-22 02:02:11','',NULL,'超级管理员'),(2,'普通角色','common',2,'2',1,1,'0','0','admin','2026-09-22 02:02:11','',NULL,'普通角色'),(3,'教务干事','edu_operator',3,'1',0,0,'0','0','admin','2026-09-25 09:02:51','admin','2026-10-03 10:36:51','负责教务物资入库、出库、印刷及盘点操作'),(4,'任课老师','teacher',4,'2',1,1,'0','0','admin','2026-09-25 09:02:51','',NULL,'?????????????????'),(5,'招生老师','teacher_recruit',5,'1',1,1,'0','0','admin','2026-09-28 07:01:26','',NULL,'?????????????????????'),(6,'行政人员','admin_staff',6,'1',1,1,'0','0','admin','2026-09-28 07:01:26','',NULL,'????????????????????????');
/*!40000 ALTER TABLE `sys_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_role_dept`
--

DROP TABLE IF EXISTS `sys_role_dept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role_dept` (
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `dept_id` bigint NOT NULL COMMENT '部门ID',
  PRIMARY KEY (`role_id`,`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色和部门关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_role_dept`
--

LOCK TABLES `sys_role_dept` WRITE;
/*!40000 ALTER TABLE `sys_role_dept` DISABLE KEYS */;
INSERT INTO `sys_role_dept` VALUES (2,100),(2,101),(2,105);
/*!40000 ALTER TABLE `sys_role_dept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_role_menu`
--

DROP TABLE IF EXISTS `sys_role_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role_menu` (
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `menu_id` bigint NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (`role_id`,`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色和菜单关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_role_menu`
--

LOCK TABLES `sys_role_menu` WRITE;
/*!40000 ALTER TABLE `sys_role_menu` DISABLE KEYS */;
INSERT INTO `sys_role_menu` VALUES (1,2055),(1,2056),(1,2080),(1,2081),(1,2082),(1,2083),(1,2084),(1,2085),(1,2086),(1,2087),(1,2088),(1,2090),(1,2300),(1,2500),(1,2501),(1,2502),(1,2503),(1,2504),(1,2505),(1,2506),(2,1),(2,2),(2,3),(2,4),(2,100),(2,101),(2,102),(2,103),(2,104),(2,105),(2,106),(2,107),(2,108),(2,109),(2,110),(2,111),(2,112),(2,113),(2,114),(2,115),(2,116),(2,117),(2,500),(2,501),(2,1000),(2,1001),(2,1002),(2,1003),(2,1004),(2,1005),(2,1006),(2,1007),(2,1008),(2,1009),(2,1010),(2,1011),(2,1012),(2,1013),(2,1014),(2,1015),(2,1016),(2,1017),(2,1018),(2,1019),(2,1020),(2,1021),(2,1022),(2,1023),(2,1024),(2,1025),(2,1026),(2,1027),(2,1028),(2,1029),(2,1030),(2,1031),(2,1032),(2,1033),(2,1034),(2,1035),(2,1036),(2,1037),(2,1038),(2,1039),(2,1040),(2,1041),(2,1042),(2,1043),(2,1044),(2,1045),(2,1046),(2,1047),(2,1048),(2,1049),(2,1050),(2,1051),(2,1052),(2,1053),(2,1054),(2,1055),(2,1056),(2,1057),(2,1058),(2,1059),(2,1060),(2,2055),(2,2056),(2,2200),(2,2201),(2,2202),(2,2203),(2,2204),(2,2206),(2,2300),(3,2002),(3,2003),(3,2004),(3,2006),(3,2008),(3,2009),(3,2010),(3,2012),(3,2020),(3,2021),(3,2024),(3,2032),(3,2033),(3,2036),(3,2038),(3,2039),(3,2042),(3,2044),(3,2045),(3,2046),(3,2048),(3,2050),(3,2051),(3,2052),(3,2054),(3,2061),(3,2062),(3,2063),(3,2064),(3,2067),(3,2072),(3,2074),(4,2000),(4,2007),(4,2008),(4,2031),(4,2032),(4,2037),(4,2038),(4,2056),(4,2090),(4,2100),(4,2400),(5,2200),(5,2201),(5,2202),(5,2203),(5,2204),(5,2206),(6,2000),(6,2010),(6,2011),(6,2015),(6,2016),(6,2020),(6,2021),(6,2025),(6,2026),(6,2040),(6,2041),(6,2056),(6,2090),(6,2400);
/*!40000 ALTER TABLE `sys_role_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user`
--

DROP TABLE IF EXISTS `sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user` (
  `user_id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `dept_id` bigint DEFAULT NULL COMMENT '部门ID',
  `user_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户账号',
  `nick_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户昵称',
  `user_type` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT '00' COMMENT '用户类型（00系统用户）',
  `email` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户邮箱',
  `phonenumber` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '手机号码',
  `sex` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '用户性别（0男 1女 2未知）',
  `avatar` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '头像地址',
  `password` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '密码',
  `status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `del_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `login_ip` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '最后登录IP',
  `login_date` datetime DEFAULT NULL COMMENT '最后登录时间',
  `pwd_update_date` datetime DEFAULT NULL COMMENT '密码最后更新时间',
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `grade` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教年级',
  `subject` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教科目',
  `class_ids` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教班级ID集合，逗号分隔',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user`
--

LOCK TABLES `sys_user` WRITE;
/*!40000 ALTER TABLE `sys_user` DISABLE KEYS */;
INSERT INTO `sys_user` VALUES (1,100,'longtao','龙涛','00','ry@163.com','15888888888','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','127.0.0.1','2026-10-06 11:42:56','2026-09-22 02:02:10','admin','2026-09-22 02:02:10','','2026-10-05 07:40:59','超级管理员','','',''),(101,110,'wangxianwu','王贤武','00','wangxianwu@doupi.edu','13800010001','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（7）班·文科A班），任教班级：高三（1）班·精英C班；高三（7）班·文科A班','复读部','语文','101,108'),(102,110,'zhouhui','周珲','00','zhouhui@doupi.edu','13800010002','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','127.0.0.1','2026-10-03 18:33:53',NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（1）班·精英C班），任教班级：高三（1）班·精英C班；高三（2）班B班·提升班B','复读部','数学','101,103'),(103,110,'turuizhi','涂瑞志','00','turuizhi@doupi.edu','13800010003','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班','复读部','英语','101'),(104,110,'wuxianpin','吴显品','00','wuxianpin@doupi.edu','13800010004','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班','复读部','物理','101'),(105,110,'jinchuanhan','金传汉','00','jinchuanhan@doupi.edu','13800010005','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班','复读部','化学','101'),(106,110,'xuxueling','许雪玲','00','xuxueling@doupi.edu','13800010006','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班；高三（2）班A班·提升班A','复读部','生物','101,102'),(107,110,'shisong','石松','00','shisong@doupi.edu','13800010007','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班','复读部','政治','101,104,105,106,107,108,109'),(108,110,'xingpengfei','邢鹏飞','00','xingpengfei@doupi.edu','13800010008','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班','复读部','地理','101,104,105,106,107,108,109'),(109,110,'wangjiaxing','王嘉兴','00','wangjiaxing@doupi.edu','13800010009','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（1）班·精英C班；高三（2）班A班·提升班A；高三（2）班B班·提升班B；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班','复读部','体育','101,102,103,104,105,106,107,108,109'),(110,110,'zhaoqianli','赵前利','00','zhaoqianli@doupi.edu','13800010010','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（2）班B班·提升班B），任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B','复读部','语文','102,103'),(111,110,'chenxinjia','陈新佳','00','chenxinjia@doupi.edu','13800010011','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（4）班·精英B班），任教班级：高三（2）班A班·提升班A；高三（4）班·精英B班','复读部','数学','102,105'),(112,110,'lijining','李寄宁','00','lijining@doupi.edu','13800010012','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（2）班A班·提升班A），任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B','复读部','英语','102,103'),(113,110,'sunrenjie','孙仁杰','00','sunrenjie@doupi.edu','13800010013','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B','复读部','物理','102,103'),(114,110,'leixiaoping','雷小平','00','leixiaoping@doupi.edu','13800010014','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B','复读部','化学','102,103'),(115,110,'yangjuntang','杨俊堂','00','yangjuntang@doupi.edu','13800010015','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（2）班B班·提升班B','复读部','生物','103'),(116,110,'zhuchengqiao','祝呈巧','00','zhuchengqiao@doupi.edu','18879805597','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部语文教师、教务老师，任教班级：高三（3）班·精英A班','复读部','语文','104'),(117,110,'guoqiang','郭强','00','guoqiang@doupi.edu','13800010017','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（3）班·精英A班），任教班级：高三（3）班·精英A班','复读部','数学','104'),(118,110,'xubingfang','徐冰芳','00','xubingfang@doupi.edu','13800010018','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（3）班·精英A班；高三（5）班·清北A班','复读部','英语','104,106'),(119,110,'gaozhenyuan','高振元','00','gaozhenyuan@doupi.edu','13800010019','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（3）班·精英A班；高三（5）班·清北A班','复读部','物理','104,106'),(120,110,'machengxian','马承宪','00','machengxian@doupi.edu','13800010020','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（3）班·精英A班；高三（5）班·清北A班','复读部','化学','104,106'),(121,110,'liwei','李炜','00','liwei@doupi.edu','13800010021','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（5）班·清北A班），任教班级：高三（3）班·精英A班；高三（5）班·清北A班','复读部','生物','104,106'),(122,110,'lixinyu','李心雨','00','lixinyu@doupi.edu','13800010022','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（4）班·精英B班；高三（6）班·清北B班','复读部','语文','105,107'),(123,110,'liumin','刘珉','00','liumin@doupi.edu','13800010023','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（4）班·精英B班；高三（6）班·清北B班','复读部','英语','105,107'),(124,110,'wuxinmin','吴新民','00','wuxinmin@doupi.edu','13800010024','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（4）班·精英B班；高三（6）班·清北B班','复读部','物理','105,107'),(125,110,'lifeng','李锋','00','lifeng@doupi.edu','13800010025','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（4）班·精英B班；高三（6）班·清北B班','复读部','化学','105,107'),(126,110,'zhaoaijing','赵爱景','00','zhaoaijing@doupi.edu','13800010026','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（4）班·精英B班；高三（6）班·清北B班','复读部','生物','105,107'),(127,110,'fulingjun','付令军','00','fulingjun@doupi.edu','13800010027','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（5）班·清北A班；高三（8）班·文科B班','复读部','语文','106,109'),(128,110,'zhoujixing','周继兴','00','zhoujixing@doupi.edu','13800010028','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（5）班·清北A班','复读部','数学','106'),(129,110,'yuanyunxia','苑运霞','00','yuanyunxia@doupi.edu','13800010029','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'高复部班主任（高三（6）班·清北B班），任教班级：高三（6）班·清北B班','复读部','数学','107'),(130,110,'tianfei','田飞','00','tianfei@doupi.edu','13800010030','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（7）班·文科A班；高三（8）班·文科B班','复读部','数学','108,109'),(131,110,'huangziqi','黄紫琦','00','huangziqi@doupi.edu','13800010031','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:37','',NULL,'任教班级：高三（7）班·文科A班；高三（8）班·文科B班','复读部','英语','108,109'),(132,110,'tanweisheng','谭伟生','00','tanweisheng@doupi.edu','13800010032','0','','$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2','0','0','',NULL,NULL,'admin','2026-10-03 10:24:38','',NULL,'高复部班主任（高三（8）班·文科B班），任教班级：高三（7）班·文科A班；高三（8）班·文科B班','复读部','历史','108,109');
/*!40000 ALTER TABLE `sys_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user_post`
--

DROP TABLE IF EXISTS `sys_user_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_post` (
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `post_id` bigint NOT NULL COMMENT '岗位ID',
  PRIMARY KEY (`user_id`,`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户与岗位关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user_post`
--

LOCK TABLES `sys_user_post` WRITE;
/*!40000 ALTER TABLE `sys_user_post` DISABLE KEYS */;
INSERT INTO `sys_user_post` VALUES (1,1);
/*!40000 ALTER TABLE `sys_user_post` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user_role`
--

DROP TABLE IF EXISTS `sys_user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_role` (
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户和角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user_role`
--

LOCK TABLES `sys_user_role` WRITE;
/*!40000 ALTER TABLE `sys_user_role` DISABLE KEYS */;
INSERT INTO `sys_user_role` VALUES (1,1),(101,4),(102,4),(103,4),(104,4),(105,4),(106,4),(107,4),(108,4),(109,4),(110,4),(111,4),(112,4),(113,4),(114,4),(115,4),(116,3),(116,4),(117,4),(118,4),(119,4),(120,4),(121,4),(122,4),(123,4),(124,4),(125,4),(126,4),(127,4),(128,4),(129,4),(130,4),(131,4),(132,4);
/*!40000 ALTER TABLE `sys_user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'stuck-mg'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-06  6:43:10
