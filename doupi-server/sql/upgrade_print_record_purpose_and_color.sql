-- ----------------------------------------------------------------------
-- 印刷登记表增加「用途」与「颜色类别」字段升级脚本
-- 执行方式：在 MySQL 的 stuck-mg 数据库中执行以下 SQL
-- 业务规则说明：
--   1. color_category（颜色类别）：必填，支持「黑白」和「彩色」两种，默认「黑白」
--   2. print_purpose（用途）：300字内，印刷份数 <= 20 份必填，> 20 份选填
--   3. class_id（班级）：无论份数多少均为必填字段
-- ----------------------------------------------------------------------

ALTER TABLE `edu_print_record`
  ADD COLUMN `color_category` varchar(20) NOT NULL DEFAULT '黑白' COMMENT '颜色类别(黑白/彩色，必填，默认黑白)' AFTER `print_side`,
  ADD COLUMN `print_purpose` varchar(500) DEFAULT '' COMMENT '文印用途(≤20份必填，>20份选填，300字内)' AFTER `color_category`;

-- 初始化历史已有记录的颜色类别默认值为黑白
UPDATE `edu_print_record`
SET `color_category` = '黑白'
WHERE `color_category` IS NULL OR `color_category` = '';
