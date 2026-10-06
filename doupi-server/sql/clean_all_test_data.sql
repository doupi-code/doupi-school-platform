-- --------------------------------------------------
-- 数据库初始化脚本：清空所有测试业务数据
-- 日期：2026-09-28
-- 说明：
-- 1. 清空文印登记测试数据 (edu_print_record)
-- 2. 清空出库、入库、盘点单据与明细 (edu_stock_out, edu_stock_in, edu_stock_check)
-- 3. 清空物品档案、供应商、班级档案等基础档案 (edu_goods, edu_supplier, edu_class)
-- 4. 清空旧教职工档案 (edu_teacher) 与系统用户中的测试人员，保留超级管理员 (admin, user_id=1)
-- 5. 清空招生预约、微信绑定、消息通知等业务测试记录 (doupi_recruit_appointment, etc.)
-- 6. 清空操作日志与登录日志 (sys_oper_log, sys_logininfor)
-- --------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- 1. 文印管理业务数据
TRUNCATE TABLE edu_print_record;

-- 2. 库存管理业务数据
TRUNCATE TABLE edu_stock_out_item;
TRUNCATE TABLE edu_stock_out;
TRUNCATE TABLE edu_stock_in_item;
TRUNCATE TABLE edu_stock_in;
TRUNCATE TABLE edu_stock_check_item;
TRUNCATE TABLE edu_stock_check;

-- 3. 基础业务档案数据（物品、供应商、班级、旧教职工）
TRUNCATE TABLE edu_goods;
TRUNCATE TABLE edu_supplier;
TRUNCATE TABLE edu_class;
TRUNCATE TABLE edu_teacher;

-- 4. 系统用户与角色清理（仅保留管理员 admin，user_id = 1）
DELETE FROM sys_user_role WHERE user_id > 1;
DELETE FROM sys_user_post WHERE user_id > 1;
DELETE FROM sys_user WHERE user_id > 1;
UPDATE sys_user SET grade = '', subject = '', class_ids = '', remark = '超级管理员' WHERE user_id = 1;
ALTER TABLE sys_user AUTO_INCREMENT = 2;

-- 5. 招生模块业务记录
TRUNCATE TABLE doupi_recruit_appointment;
TRUNCATE TABLE doupi_recruit_teacher_binding;
TRUNCATE TABLE doupi_recruit_message;

-- 6. 审计与监控日志清理
TRUNCATE TABLE sys_oper_log;
TRUNCATE TABLE sys_logininfor;
TRUNCATE TABLE sys_job_log;

-- 7. 去除校区功能菜单（已废弃）
DELETE FROM sys_role_menu WHERE menu_id = 2205;
DELETE FROM sys_menu WHERE menu_id = 2205;

SET FOREIGN_KEY_CHECKS = 1;
