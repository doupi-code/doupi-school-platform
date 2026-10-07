-- ====================================================
-- 升级脚本：业务单据操作人规范化（存储用户ID + 展示昵称）
-- 为出入库单据增加 operator_id 字段，经办人展示昵称而非账号名
-- ====================================================

-- 1. 入库单主表：增加经办人用户ID字段
ALTER TABLE edu_stock_in
  ADD COLUMN operator_id bigint DEFAULT NULL COMMENT '经办人用户ID' AFTER operator;

-- 2. 出库单主表：增加经办人用户ID字段
ALTER TABLE edu_stock_out
  ADD COLUMN operator_id bigint DEFAULT NULL COMMENT '经办人用户ID' AFTER operator;

-- 3. 回填历史单据的 operator_id（按 operator 字段匹配 sys_user 账号或昵称）
UPDATE edu_stock_in i
LEFT JOIN sys_user u ON u.user_name = i.operator OR u.nick_name = i.operator
SET i.operator_id = u.user_id
WHERE i.operator_id IS NULL AND i.operator IS NOT NULL AND i.operator != '';

UPDATE edu_stock_out o
LEFT JOIN sys_user u ON u.user_name = o.operator OR u.nick_name = o.operator
SET o.operator_id = u.user_id
WHERE o.operator_id IS NULL AND o.operator IS NOT NULL AND o.operator != '';
