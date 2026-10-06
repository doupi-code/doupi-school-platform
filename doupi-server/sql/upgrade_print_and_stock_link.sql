-- ======================================================================
-- 数据库升级与历史数据关联修复脚本：印刷登记与出库单双向穿透与高效索引
-- 适用数据库：MySQL 5.7+ / 8.0+ (stuck-mg)
-- 说明：
--   1. 为 edu_print_record 表的 out_id 字段添加索引，加速关联出库单查询与双向联表
--   2. 若历史数据存在出库单备注包含印刷名称但 out_id 未关联的情况，自动执行数据回填绑定
-- ======================================================================

-- 1. 添加 out_id 索引（若不存在）
SET @dbname = DATABASE();
SET @tablename = 'edu_print_record';
SET @indexname = 'idx_print_out_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_name = @tablename
      AND table_schema = @dbname
      AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  'CREATE INDEX idx_print_out_id ON edu_print_record(out_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. 对历史因备注关联但 out_id 为空的数据进行回填
UPDATE edu_print_record r
JOIN edu_stock_out o ON o.del_flag = '0' 
  AND o.out_type = '3' 
  AND (o.remark LIKE CONCAT('%【', r.print_name, '】%') OR o.remark LIKE CONCAT('%', r.print_name, '%'))
SET r.out_id = o.out_id
WHERE r.out_id IS NULL AND r.del_flag = '0';

COMMIT;

SELECT '印刷登记与出库单双向穿透优化脚本执行成功！' AS result;
