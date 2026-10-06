-- ----------------------------------------------------------------------
-- 印刷登记表增加「单页印刷/双页印刷」方式字段及数据字典升级脚本
-- 执行方式：在 MySQL 的 stuck-mg 数据库中执行以下 SQL
-- ----------------------------------------------------------------------

-- 1. 为 edu_print_record 表增加 print_side 字段（1-单页印刷，2-双页印刷）
ALTER TABLE `edu_print_record` 
  ADD COLUMN `print_side` char(1) DEFAULT '1' COMMENT '印刷方式(1单页印刷 2双页印刷)' AFTER `page_count`;

UPDATE `edu_print_record` SET `print_side` = '1' WHERE `print_side` IS NULL;

-- 2. 插入「印刷方式」数据字典
INSERT INTO `sys_dict_type` (`dict_name`, `dict_type`, `status`, `create_by`, `create_time`, `remark`) 
VALUES ('印刷方式', 'print_side', '0', 'admin', NOW(), '印刷单双页方式(1单页印刷 2双页印刷)')
ON DUPLICATE KEY UPDATE `dict_name` = VALUES(`dict_name`);

INSERT INTO `sys_dict_data` (`dict_sort`, `dict_label`, `dict_value`, `dict_type`, `css_class`, `list_class`, `is_default`, `status`, `create_by`, `create_time`, `remark`)
VALUES 
(1, '单页印刷', '1', 'print_side', '', 'primary', 'Y', '0', 'admin', NOW(), '单面'),
(2, '双页印刷', '2', 'print_side', '', 'success', 'N', '0', 'admin', NOW(), '双面')
ON DUPLICATE KEY UPDATE `dict_label` = VALUES(`dict_label`);
