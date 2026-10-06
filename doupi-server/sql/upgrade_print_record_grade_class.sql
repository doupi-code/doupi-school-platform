-- ----------------------------------------------------------------------
-- 印刷登记表增加年级与班级字段升级脚本
-- 执行方式：在 MySQL 的 stuck-mg 数据库中执行以下 ALTER 语句即可
-- ----------------------------------------------------------------------

ALTER TABLE `edu_print_record` 
  ADD COLUMN `grade` varchar(20) DEFAULT '' COMMENT '年级' AFTER `teacher_id`,
  ADD COLUMN `class_id` bigint DEFAULT NULL COMMENT '班级ID' AFTER `grade`,
  ADD COLUMN `class_name` varchar(50) DEFAULT '' COMMENT '班级名称' AFTER `class_id`;
