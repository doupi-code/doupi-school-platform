-- ====================================================
-- 升级脚本：物资档案 (edu_goods) 关联默认供应商
-- ====================================================

-- 1. 为 edu_goods 增加 supplier_id 字段（默认供应商，可为空）
ALTER TABLE edu_goods
  ADD COLUMN supplier_id bigint DEFAULT NULL COMMENT '默认供应商ID' AFTER category;

-- 2. 添加外键索引，便于关联查询
ALTER TABLE edu_goods
  ADD KEY idx_supplier_id (supplier_id);
