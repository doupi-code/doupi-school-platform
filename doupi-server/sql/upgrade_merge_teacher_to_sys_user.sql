-- --------------------------------------------------
-- 数据库升级脚本：教职工档案整合至系统用户
-- 日期：2026-09-28
-- 说明：
-- 1. 为 sys_user 增加教学相关字段（任教年级、任教科目、任教班级）
-- 2. 补充完善 sys_role 中的教职身份角色：
--    - 任课老师 (teacher, role_id=4)
--    - 招生老师 (teacher_recruit, role_id=5)
--    - 行政人员 (admin_staff, role_id=6)
-- 3. 将原教职工档案数据完整迁移至 sys_user，并配置招生老师角色
-- 4. 补充典型任课老师与行政人员样例数据
-- 5. 将旧教职工档案菜单隐藏（收敛统一至用户管理）
-- 6. 更新 edu_print_record 历史数据引用关联
-- --------------------------------------------------

-- 1. sys_user 扩展字段
SET @col_grade = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'grade');
SET @sql_grade = IF(@col_grade = 0, 'ALTER TABLE sys_user ADD COLUMN grade varchar(30) DEFAULT \'\' COMMENT \'任教年级\';', 'SELECT 1;');
PREPARE stmt1 FROM @sql_grade; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @col_subj = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'subject');
SET @sql_subj = IF(@col_subj = 0, 'ALTER TABLE sys_user ADD COLUMN subject varchar(50) DEFAULT \'\' COMMENT \'任教科目\';', 'SELECT 1;');
PREPARE stmt2 FROM @sql_subj; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @col_classes = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'class_ids');
SET @sql_classes = IF(@col_classes = 0, 'ALTER TABLE sys_user ADD COLUMN class_ids varchar(200) DEFAULT \'\' COMMENT \'任教班级ID集合，逗号分隔\';', 'SELECT 1;');
PREPARE stmt3 FROM @sql_classes; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 2. 完善角色定义
-- 2.1 修改角色4为任课老师
UPDATE sys_role SET role_name = '任课老师', remark = '任课教师，负责教学与印刷登记等业务' WHERE role_id = 4;

-- 2.2 增加角色5：招生老师
INSERT INTO sys_role (role_id, role_name, role_key, role_sort, data_scope, menu_check_strictly, dept_check_strictly, status, del_flag, create_by, create_time, remark)
VALUES (5, '招生老师', 'teacher_recruit', 5, '1', 1, 1, '0', '0', 'admin', sysdate(), '招生老师，负责招生咨询、意向跟进与到校接待')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), role_key = VALUES(role_key);

-- 2.3 增加角色6：行政人员
INSERT INTO sys_role (role_id, role_name, role_key, role_sort, data_scope, menu_check_strictly, dept_check_strictly, status, del_flag, create_by, create_time, remark)
VALUES (6, '行政人员', 'admin_staff', 6, '1', 1, 1, '0', '0', 'admin', sysdate(), '行政管理人员，负责物资入库、出库、耗材与综合事务')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), role_key = VALUES(role_key);

-- 3. 分配角色菜单权限
-- 招生老师菜单权限 (2200-2204, 2206: 招生管理看板、预约记录、现场核销、教师绑定、排班配置)
DELETE FROM sys_role_menu WHERE role_id = 5;
INSERT INTO sys_role_menu (role_id, menu_id) VALUES 
(5, 2200), (5, 2201), (5, 2202), (5, 2203), (5, 2204), (5, 2206);

-- 行政人员菜单权限 (常用管理菜单)
DELETE FROM sys_role_menu WHERE role_id = 6;
INSERT INTO sys_role_menu (role_id, menu_id) VALUES 
(6, 2000), (6, 2010), (6, 2011), (6, 2015), (6, 2016), (6, 2020), (6, 2021), (6, 2025), (6, 2026), (6, 2040), (6, 2041);

-- 4. 隐藏教职工档案菜单（收敛至系统用户管理）
UPDATE sys_menu SET visible = '1' WHERE menu_id = 2049;

-- 5. 将原 edu_teacher 数据平滑迁移至 sys_user（user_id = teacher_id + 100）
-- 密码统一默认为 admin123 ($2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2)
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, grade, subject, class_ids, create_by, create_time, remark)
SELECT 
    teacher_id + 100,
    105,
    CONCAT('tea_', teacher_id),
    teacher_name,
    '00',
    '',
    phone,
    '0',
    '',
    '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2',
    '0',
    '0',
    grade,
    subject,
    class_ids,
    'admin',
    sysdate(),
    '教职工档案合并迁移'
FROM edu_teacher
ON DUPLICATE KEY UPDATE 
    nick_name = VALUES(nick_name),
    phonenumber = VALUES(phonenumber),
    grade = VALUES(grade),
    subject = VALUES(subject),
    class_ids = VALUES(class_ids);

-- 为这批迁移教师绑定为招生老师角色 (role_id = 5)
INSERT IGNORE INTO sys_user_role (user_id, role_id)
SELECT teacher_id + 100, 5 FROM edu_teacher;

-- 6. 补充典型任课老师 (role_id = 4)
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, grade, subject, class_ids, create_by, create_time, remark)
VALUES 
(1001, 105, 'tea_math', '张文博', '00', 'zwb@school.com', '13800138001', '0', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高一', '高中数学', '1,2', 'admin', sysdate(), '高一数学学科带头人'),
(1002, 105, 'tea_chinese', '李美玲', '00', 'lml@school.com', '13800138002', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高一', '高中语文', '1', 'admin', sysdate(), '高一语文骨干教师'),
(1003, 105, 'tea_physics', '王海峰', '00', 'whf@school.com', '13800138003', '0', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高二', '高中物理', '3', 'admin', sysdate(), '高二物理备课组长')
ON DUPLICATE KEY UPDATE nick_name = VALUES(nick_name), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids);

INSERT IGNORE INTO sys_user_role (user_id, role_id) VALUES 
(1001, 4), (1002, 4), (1003, 4);

-- 7. 补充典型行政人员 (role_id = 6)
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, grade, subject, class_ids, create_by, create_time, remark)
VALUES 
(1004, 103, 'staff_zhao', '赵小刚', '00', 'zxg@school.com', '13900139001', '0', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '', '', '', 'admin', sysdate(), '教务文印与耗材管理员'),
(1005, 103, 'staff_sun', '孙主任', '00', 'szr@school.com', '13900139002', '0', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '', '', '', 'admin', sysdate(), '综合行政办公室主任')
ON DUPLICATE KEY UPDATE nick_name = VALUES(nick_name);

INSERT IGNORE INTO sys_user_role (user_id, role_id) VALUES 
(1004, 6), (1005, 6);

-- 8. 更新印刷登记历史引用中的 teacher_id (1..51 对应增加100)
UPDATE edu_print_record SET teacher_id = teacher_id + 100 WHERE teacher_id IS NOT NULL AND teacher_id <= 51;
