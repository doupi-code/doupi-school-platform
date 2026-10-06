-- ====================================================
-- 生产环境数据库清洗脚本
-- 保留：系统基础数据、班级数据、教师数据、物品档案及基础配置
-- 清空：所有测试业务流水、出入库、文印、预约单据及操作日志
-- ====================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 文印业务流水清理
TRUNCATE TABLE edu_print_record;

-- 2. 仓储进出库与盘点业务流水清理
TRUNCATE TABLE edu_stock_out_item;
TRUNCATE TABLE edu_stock_out;
TRUNCATE TABLE edu_stock_in_item;
TRUNCATE TABLE edu_stock_in;
TRUNCATE TABLE edu_stock_check_item;
TRUNCATE TABLE edu_stock_check;

-- 3. 领料业务流水清理
TRUNCATE TABLE edu_material_record_item;
TRUNCATE TABLE edu_material_record;

-- 4. 招生业务流水清理
TRUNCATE TABLE doupi_recruit_appointment;
TRUNCATE TABLE doupi_recruit_message;
TRUNCATE TABLE doupi_recruit_teacher_binding;

-- 5. 操作审计与调度日志清理
TRUNCATE TABLE sys_oper_log;
TRUNCATE TABLE sys_logininfor;
TRUNCATE TABLE sys_job_log;
TRUNCATE TABLE sys_notice_read;

-- 6. 物品档案库存数量重置为 0
UPDATE edu_goods SET stock_num = 0;

-- 7. 用户数据校验：只保留 admin (user_id=1) 和 教师账号 (user_id >= 101)
DELETE FROM sys_user_role WHERE user_id > 1 AND user_id < 101;
DELETE FROM sys_user_post WHERE user_id > 1 AND user_id < 101;
DELETE FROM sys_user WHERE user_id > 1 AND user_id < 101;

SET FOREIGN_KEY_CHECKS = 1;
