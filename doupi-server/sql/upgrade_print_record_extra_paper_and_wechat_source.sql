-- ----------------------------------------------------------------------
-- 文印登记额外用纸（模板用纸/印刷预览用纸）及微信导出记录来源标识升级脚本
-- 规则说明：
--   1. 新增 template_paper_count（模板用纸张数）与 preview_paper_count（印刷预览用纸张数）字段。
--   2. 历史已保存记录两字段置为 0，展示“旧规则，未计入”，后续编辑仍保留旧规则，不暗中补扣。
--   3. 新登记记录由后端强制设置 template_paper_count = 1、preview_paper_count = 1。
--   4. 新增 source_conversation_id 与 source_message_id 字段，用于保存微信导出会话及消息标识，实现重复导入提示与防自动重复提交。
-- ----------------------------------------------------------------------

ALTER TABLE `edu_print_record`
  ADD COLUMN `template_paper_count` bigint DEFAULT 0 COMMENT '模板用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)' AFTER `print_side`,
  ADD COLUMN `preview_paper_count` bigint DEFAULT 0 COMMENT '印刷预览用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)' AFTER `template_paper_count`,
  ADD COLUMN `source_conversation_id` varchar(64) DEFAULT NULL COMMENT '来源微信导出会话ID' AFTER `error_out_id`,
  ADD COLUMN `source_message_id` varchar(255) DEFAULT NULL COMMENT '来源微信消息标识' AFTER `source_conversation_id`;

-- 历史记录两字段置为 0（旧规则，未计入）
UPDATE `edu_print_record`
SET `template_paper_count` = COALESCE(`template_paper_count`, 0),
    `preview_paper_count` = COALESCE(`preview_paper_count`, 0)
WHERE `template_paper_count` IS NULL OR `preview_paper_count` IS NULL;

-- 创建来源会话与消息联合索引，加速重复导入查重与联系人登记状态汇总
CREATE INDEX `idx_print_source_conv_msg` ON `edu_print_record` (`source_conversation_id`, `source_message_id`);
