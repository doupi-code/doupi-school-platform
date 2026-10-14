-- -------------------------------------------------------------
-- 生产文印数据修复与台账导出 DDL 脚本
-- 执行库：stuck-mg
-- -------------------------------------------------------------

-- 1. 扩展入库单主表，支持“历史进货已发生，纸型分配待核实”
ALTER TABLE edu_stock_in
    ADD COLUMN declared_package_count INT NULL COMMENT '历史进货确认的总箱数，纸型可待核实',
    ADD COLUMN declared_amount DECIMAL(12,2) NULL COMMENT '历史进货确认的总金额';

-- 2. 新增独立审计批次表
CREATE TABLE IF NOT EXISTS edu_repair_batch (
    batch_id VARCHAR(64) NOT NULL COMMENT '修复批次号',
    db_name VARCHAR(64) NOT NULL COMMENT '执行的目标数据库名',
    snapshot_hash VARCHAR(64) NOT NULL COMMENT '快照校验哈希',
    approved_hash VARCHAR(64) NOT NULL COMMENT '审批确认清单哈希',
    status VARCHAR(20) NOT NULL COMMENT '执行状态: PENDING/SUCCESS/ROLLED_BACK/FAILED',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    finish_time DATETIME NULL COMMENT '结束时间',
    operator VARCHAR(64) NOT NULL COMMENT '执行者',
    fact_summary TEXT NULL COMMENT '事实与变更说明',
    PRIMARY KEY (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文印数据修复批次表';

-- 3. 新增独立审计行级变更日志表
CREATE TABLE IF NOT EXISTS edu_repair_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    batch_id VARCHAR(64) NOT NULL COMMENT '修复批次号',
    table_name VARCHAR(64) NOT NULL COMMENT '被修改的数据表名',
    record_id VARCHAR(64) NOT NULL COMMENT '数据行主键标识',
    action_type VARCHAR(20) NOT NULL COMMENT '操作类型: UPDATE/DELETE/INSERT',
    before_json LONGTEXT NULL COMMENT '修改前数据镜像(JSON)',
    after_json LONGTEXT NULL COMMENT '修改后数据镜像(JSON)',
    reason TEXT NULL COMMENT '修改原因与证据',
    is_estimated TINYINT(1) DEFAULT 0 COMMENT '是否属于估算修正: 0-否, 1-是',
    create_time DATETIME NOT NULL COMMENT '记录时间',
    PRIMARY KEY (id),
    KEY idx_batch_id (batch_id),
    KEY idx_table_record (table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文印数据修复行级变更日志表';

-- 4. 新增库存基准审计表
CREATE TABLE IF NOT EXISTS edu_repair_stock_baseline (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    batch_id VARCHAR(64) NOT NULL COMMENT '修复批次号',
    goods_id BIGINT NOT NULL COMMENT '物资ID',
    goods_name VARCHAR(100) NOT NULL COMMENT '物资名称',
    conversion_rate INT NOT NULL COMMENT '每箱张数换算率',
    physical_estimate INT NOT NULL COMMENT '估计实盘张数',
    physical_min INT NULL COMMENT '估计实盘区间下限',
    physical_max INT NULL COMMENT '估计实盘区间上限',
    reserved_sheets INT NOT NULL DEFAULT 0 COMMENT '待打印预占张数',
    available_sheets INT NOT NULL COMMENT '系统可用张数',
    stock_num INT NOT NULL COMMENT '折合整箱数',
    remain_sheets INT NOT NULL COMMENT '散张零头数',
    count_date VARCHAR(30) NOT NULL COMMENT '盘点估算日期',
    count_time_precision VARCHAR(30) NOT NULL COMMENT '时间精度说明',
    remark TEXT NULL COMMENT '基准建立说明与历史差异声明',
    create_time DATETIME NOT NULL COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_batch_goods (batch_id, goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文印纸张库存基准表';
