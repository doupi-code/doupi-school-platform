-- ====================================================
-- 高复部 2026.9.23 执行 班级任课教师与账号录入脚本
-- ====================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 确保系统部门中有高复教学部 (dept_id = 110)
INSERT INTO sys_dept (dept_id, parent_id, ancestors, dept_name, order_num, leader, phone, email, status, del_flag, create_by, create_time)
VALUES (110, 100, '0,100', '高复教学部', 1, '周珲', '13800010002', 'gaofu@doupi.edu', '0', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name), leader = VALUES(leader), del_flag = '0';

-- 2. 录入高复部班级档案 (edu_class: 101 ~ 109)
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (101, '复读部', '高三（1）班·精英C班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (102, '复读部', '高三（2）班A班·提升班A', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (103, '复读部', '高三（2）班B班·提升班B', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (104, '复读部', '高三（3）班·精英A班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (105, '复读部', '高三（4）班·精英B班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (106, '复读部', '高三（5）班·清北A班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (107, '复读部', '高三（6）班·清北B班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (108, '复读部', '高三（7）班·文科A班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';
INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (109, '复读部', '高三（8）班·文科B班', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';

-- 3. 录入高复部教师档案 (edu_teacher: 101 ~ 132)
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (101, '王贤武', '高复教学部', '复读部', '101,108', '语文', '13800010001', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (102, '周珲', '高复教学部', '复读部', '101,103', '数学', '13800010002', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (103, '涂瑞志', '高复教学部', '复读部', '101', '英语', '13800010003', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (104, '吴显品', '高复教学部', '复读部', '101', '物理', '13800010004', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (105, '金传汉', '高复教学部', '复读部', '101', '化学', '13800010005', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (106, '许雪玲', '高复教学部', '复读部', '101,102', '生物', '13800010006', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (107, '石松', '高复教学部', '复读部', '101,104,105,106,107,108,109', '政治', '13800010007', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (108, '邢鹏飞', '高复教学部', '复读部', '101,104,105,106,107,108,109', '地理', '13800010008', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (109, '王嘉兴', '高复教学部', '复读部', '101,102,103,104,105,106,107,108,109', '体育', '13800010009', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (110, '赵前利', '高复教学部', '复读部', '102,103', '语文', '13800010010', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (111, '陈新佳', '高复教学部', '复读部', '102,105', '数学', '13800010011', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (112, '李寄宁', '高复教学部', '复读部', '102,103', '英语', '13800010012', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (113, '孙仁杰', '高复教学部', '复读部', '102,103', '物理', '13800010013', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (114, '雷小平', '高复教学部', '复读部', '102,103', '化学', '13800010014', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (115, '杨俊堂', '高复教学部', '复读部', '103', '生物', '13800010015', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (116, '祝呈巧', '高复教学部', '复读部', '104', '语文', '18879805597', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (117, '郭强', '高复教学部', '复读部', '104', '数学', '13800010017', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (118, '徐冰芳', '高复教学部', '复读部', '104,106', '英语', '13800010018', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (119, '高振元', '高复教学部', '复读部', '104,106', '物理', '13800010019', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (120, '马承宪', '高复教学部', '复读部', '104,106', '化学', '13800010020', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (121, '李炜', '高复教学部', '复读部', '104,106', '生物', '13800010021', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (122, '李心雨', '高复教学部', '复读部', '105,107', '语文', '13800010022', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (123, '刘珉', '高复教学部', '复读部', '105,107', '英语', '13800010023', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (124, '吴新民', '高复教学部', '复读部', '105,107', '物理', '13800010024', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (125, '李锋', '高复教学部', '复读部', '105,107', '化学', '13800010025', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (126, '赵爱景', '高复教学部', '复读部', '105,107', '生物', '13800010026', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (127, '付令军', '高复教学部', '复读部', '106,109', '语文', '13800010027', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (128, '周继兴', '高复教学部', '复读部', '106', '数学', '13800010028', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (129, '苑运霞', '高复教学部', '复读部', '107', '数学', '13800010029', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (130, '田飞', '高复教学部', '复读部', '108,109', '数学', '13800010030', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (131, '黄紫琦', '高复教学部', '复读部', '108,109', '英语', '13800010031', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (132, '谭伟生', '高复教学部', '复读部', '108,109', '历史', '13800010032', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';

-- 4. 录入系统用户账号 (sys_user: 101 ~ 132)
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (101, 110, 'wangxianwu', '王贤武', '00', 'wangxianwu@doupi.edu', '13800010001', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '语文', '101,108', '高复部班主任（高三（7）班·文科A班），任教班级：高三（1）班·精英C班；高三（7）班·文科A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (102, 110, 'zhouhui', '周珲', '00', 'zhouhui@doupi.edu', '13800010002', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '101,103', '高复部班主任（高三（1）班·精英C班），任教班级：高三（1）班·精英C班；高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (103, 110, 'turuizhi', '涂瑞志', '00', 'turuizhi@doupi.edu', '13800010003', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '英语', '101', '任教班级：高三（1）班·精英C班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (104, 110, 'wuxianpin', '吴显品', '00', 'wuxianpin@doupi.edu', '13800010004', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '物理', '101', '任教班级：高三（1）班·精英C班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (105, 110, 'jinchuanhan', '金传汉', '00', 'jinchuanhan@doupi.edu', '13800010005', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '化学', '101', '任教班级：高三（1）班·精英C班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (106, 110, 'xuxueling', '许雪玲', '00', 'xuxueling@doupi.edu', '13800010006', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '生物', '101,102', '任教班级：高三（1）班·精英C班；高三（2）班A班·提升班A', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (107, 110, 'shisong', '石松', '00', 'shisong@doupi.edu', '13800010007', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '政治', '101,104,105,106,107,108,109', '任教班级：高三（1）班·精英C班；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (108, 110, 'xingpengfei', '邢鹏飞', '00', 'xingpengfei@doupi.edu', '13800010008', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '地理', '101,104,105,106,107,108,109', '任教班级：高三（1）班·精英C班；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (109, 110, 'wangjiaxing', '王嘉兴', '00', 'wangjiaxing@doupi.edu', '13800010009', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '体育', '101,102,103,104,105,106,107,108,109', '任教班级：高三（1）班·精英C班；高三（2）班A班·提升班A；高三（2）班B班·提升班B；高三（3）班·精英A班；高三（4）班·精英B班；高三（5）班·清北A班；高三（6）班·清北B班；高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (110, 110, 'zhaoqianli', '赵前利', '00', 'zhaoqianli@doupi.edu', '13800010010', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '语文', '102,103', '高复部班主任（高三（2）班B班·提升班B），任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (111, 110, 'chenxinjia', '陈新佳', '00', 'chenxinjia@doupi.edu', '13800010011', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '102,105', '高复部班主任（高三（4）班·精英B班），任教班级：高三（2）班A班·提升班A；高三（4）班·精英B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (112, 110, 'lijining', '李寄宁', '00', 'lijining@doupi.edu', '13800010012', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '英语', '102,103', '高复部班主任（高三（2）班A班·提升班A），任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (113, 110, 'sunrenjie', '孙仁杰', '00', 'sunrenjie@doupi.edu', '13800010013', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '物理', '102,103', '任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (114, 110, 'leixiaoping', '雷小平', '00', 'leixiaoping@doupi.edu', '13800010014', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '化学', '102,103', '任教班级：高三（2）班A班·提升班A；高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (115, 110, 'yangjuntang', '杨俊堂', '00', 'yangjuntang@doupi.edu', '13800010015', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '生物', '103', '任教班级：高三（2）班B班·提升班B', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (116, 110, 'zhuchengqiao', '祝呈巧', '00', 'zhuchengqiao@doupi.edu', '18879805597', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '语文', '104', '高复部语文教师、教务老师，任教班级：高三（3）班·精英A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (117, 110, 'guoqiang', '郭强', '00', 'guoqiang@doupi.edu', '13800010017', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '104', '高复部班主任（高三（3）班·精英A班），任教班级：高三（3）班·精英A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (118, 110, 'xubingfang', '徐冰芳', '00', 'xubingfang@doupi.edu', '13800010018', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '英语', '104,106', '任教班级：高三（3）班·精英A班；高三（5）班·清北A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (119, 110, 'gaozhenyuan', '高振元', '00', 'gaozhenyuan@doupi.edu', '13800010019', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '物理', '104,106', '任教班级：高三（3）班·精英A班；高三（5）班·清北A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (120, 110, 'machengxian', '马承宪', '00', 'machengxian@doupi.edu', '13800010020', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '化学', '104,106', '任教班级：高三（3）班·精英A班；高三（5）班·清北A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (121, 110, 'liwei', '李炜', '00', 'liwei@doupi.edu', '13800010021', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '生物', '104,106', '高复部班主任（高三（5）班·清北A班），任教班级：高三（3）班·精英A班；高三（5）班·清北A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (122, 110, 'lixinyu', '李心雨', '00', 'lixinyu@doupi.edu', '13800010022', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '语文', '105,107', '任教班级：高三（4）班·精英B班；高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (123, 110, 'liumin', '刘珉', '00', 'liumin@doupi.edu', '13800010023', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '英语', '105,107', '任教班级：高三（4）班·精英B班；高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (124, 110, 'wuxinmin', '吴新民', '00', 'wuxinmin@doupi.edu', '13800010024', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '物理', '105,107', '任教班级：高三（4）班·精英B班；高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (125, 110, 'lifeng', '李锋', '00', 'lifeng@doupi.edu', '13800010025', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '化学', '105,107', '任教班级：高三（4）班·精英B班；高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (126, 110, 'zhaoaijing', '赵爱景', '00', 'zhaoaijing@doupi.edu', '13800010026', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '生物', '105,107', '任教班级：高三（4）班·精英B班；高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (127, 110, 'fulingjun', '付令军', '00', 'fulingjun@doupi.edu', '13800010027', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '语文', '106,109', '任教班级：高三（5）班·清北A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (128, 110, 'zhoujixing', '周继兴', '00', 'zhoujixing@doupi.edu', '13800010028', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '106', '任教班级：高三（5）班·清北A班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (129, 110, 'yuanyunxia', '苑运霞', '00', 'yuanyunxia@doupi.edu', '13800010029', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '107', '高复部班主任（高三（6）班·清北B班），任教班级：高三（6）班·清北B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (130, 110, 'tianfei', '田飞', '00', 'tianfei@doupi.edu', '13800010030', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '数学', '108,109', '任教班级：高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (131, 110, 'huangziqi', '黄紫琦', '00', 'huangziqi@doupi.edu', '13800010031', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '英语', '108,109', '任教班级：高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (132, 110, 'tanweisheng', '谭伟生', '00', 'tanweisheng@doupi.edu', '13800010032', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '历史', '108,109', '高复部班主任（高三（8）班·文科B班），任教班级：高三（7）班·文科A班；高三（8）班·文科B班', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';

-- 5. 分配角色权限 (role_id = 4: 任课老师)
DELETE FROM sys_user_role WHERE user_id = 101;
INSERT INTO sys_user_role (user_id, role_id) VALUES (101, 4);
DELETE FROM sys_user_role WHERE user_id = 102;
INSERT INTO sys_user_role (user_id, role_id) VALUES (102, 4);
DELETE FROM sys_user_role WHERE user_id = 103;
INSERT INTO sys_user_role (user_id, role_id) VALUES (103, 4);
DELETE FROM sys_user_role WHERE user_id = 104;
INSERT INTO sys_user_role (user_id, role_id) VALUES (104, 4);
DELETE FROM sys_user_role WHERE user_id = 105;
INSERT INTO sys_user_role (user_id, role_id) VALUES (105, 4);
DELETE FROM sys_user_role WHERE user_id = 106;
INSERT INTO sys_user_role (user_id, role_id) VALUES (106, 4);
DELETE FROM sys_user_role WHERE user_id = 107;
INSERT INTO sys_user_role (user_id, role_id) VALUES (107, 4);
DELETE FROM sys_user_role WHERE user_id = 108;
INSERT INTO sys_user_role (user_id, role_id) VALUES (108, 4);
DELETE FROM sys_user_role WHERE user_id = 109;
INSERT INTO sys_user_role (user_id, role_id) VALUES (109, 4);
DELETE FROM sys_user_role WHERE user_id = 110;
INSERT INTO sys_user_role (user_id, role_id) VALUES (110, 4);
DELETE FROM sys_user_role WHERE user_id = 111;
INSERT INTO sys_user_role (user_id, role_id) VALUES (111, 4);
DELETE FROM sys_user_role WHERE user_id = 112;
INSERT INTO sys_user_role (user_id, role_id) VALUES (112, 4);
DELETE FROM sys_user_role WHERE user_id = 113;
INSERT INTO sys_user_role (user_id, role_id) VALUES (113, 4);
DELETE FROM sys_user_role WHERE user_id = 114;
INSERT INTO sys_user_role (user_id, role_id) VALUES (114, 4);
DELETE FROM sys_user_role WHERE user_id = 115;
INSERT INTO sys_user_role (user_id, role_id) VALUES (115, 4);
DELETE FROM sys_user_role WHERE user_id = 116;
INSERT INTO sys_user_role (user_id, role_id) VALUES (116, 3); -- 教务干事/教务老师
INSERT INTO sys_user_role (user_id, role_id) VALUES (116, 4); -- 任课老师
DELETE FROM sys_user_role WHERE user_id = 117;
INSERT INTO sys_user_role (user_id, role_id) VALUES (117, 4);
DELETE FROM sys_user_role WHERE user_id = 118;
INSERT INTO sys_user_role (user_id, role_id) VALUES (118, 4);
DELETE FROM sys_user_role WHERE user_id = 119;
INSERT INTO sys_user_role (user_id, role_id) VALUES (119, 4);
DELETE FROM sys_user_role WHERE user_id = 120;
INSERT INTO sys_user_role (user_id, role_id) VALUES (120, 4);
DELETE FROM sys_user_role WHERE user_id = 121;
INSERT INTO sys_user_role (user_id, role_id) VALUES (121, 4);
DELETE FROM sys_user_role WHERE user_id = 122;
INSERT INTO sys_user_role (user_id, role_id) VALUES (122, 4);
DELETE FROM sys_user_role WHERE user_id = 123;
INSERT INTO sys_user_role (user_id, role_id) VALUES (123, 4);
DELETE FROM sys_user_role WHERE user_id = 124;
INSERT INTO sys_user_role (user_id, role_id) VALUES (124, 4);
DELETE FROM sys_user_role WHERE user_id = 125;
INSERT INTO sys_user_role (user_id, role_id) VALUES (125, 4);
DELETE FROM sys_user_role WHERE user_id = 126;
INSERT INTO sys_user_role (user_id, role_id) VALUES (126, 4);
DELETE FROM sys_user_role WHERE user_id = 127;
INSERT INTO sys_user_role (user_id, role_id) VALUES (127, 4);
DELETE FROM sys_user_role WHERE user_id = 128;
INSERT INTO sys_user_role (user_id, role_id) VALUES (128, 4);
DELETE FROM sys_user_role WHERE user_id = 129;
INSERT INTO sys_user_role (user_id, role_id) VALUES (129, 4);
DELETE FROM sys_user_role WHERE user_id = 130;
INSERT INTO sys_user_role (user_id, role_id) VALUES (130, 4);
DELETE FROM sys_user_role WHERE user_id = 131;
INSERT INTO sys_user_role (user_id, role_id) VALUES (131, 4);
DELETE FROM sys_user_role WHERE user_id = 132;
INSERT INTO sys_user_role (user_id, role_id) VALUES (132, 4);

-- 6. 字典配置更新：确保 grade 字典中包含 复读部
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT 10, '高三复读部', '复读部', 'grade', '', 'primary', 'N', '0', 'admin', NOW(), '高三高考复读部'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'grade' AND dict_value = '复读部');

SET FOREIGN_KEY_CHECKS = 1;
