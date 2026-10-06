const fs = require('fs');
const data = require('./parsed_schedule_data.json');

console.log('================ 32位教师账号及基本信息 ================');
data.teacherList.forEach((t, i) => {
  const headStr = t.isHead ? `[班主任: ${t.headClasses}]` : '[任课教师]';
  console.log(`${String(i + 1).padStart(2, ' ')}. 姓名: ${t.name.padEnd(4, '　')} | 登录账号: ${t.userName.padEnd(12, ' ')} | 学科: ${t.subjects.padEnd(3, '　')} | 班级: ${t.classIds} | ${headStr}`);
});

// 生成完整的 SQL
const sql = [];
sql.push('-- ====================================================');
sql.push('-- 高复部 2026.9.23 执行 班级任课教师与账号录入脚本');
sql.push('-- ====================================================');
sql.push('SET NAMES utf8mb4;');
sql.push('SET FOREIGN_KEY_CHECKS = 0;\n');

// 1. 确保组织架构中有高复教学部
sql.push('-- 1. 确保系统部门中有高复教学部 (dept_id = 110)');
sql.push(`INSERT INTO sys_dept (dept_id, parent_id, ancestors, dept_name, order_num, leader, phone, email, status, del_flag, create_by, create_time)
VALUES (110, 100, '0,100', '高复教学部', 1, '周珲', '13800010002', 'gaofu@doupi.edu', '0', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name), leader = VALUES(leader), del_flag = '0';\n`);

// 2. 班级档案录入 (edu_class)
sql.push('-- 2. 录入高复部班级档案 (edu_class: 101 ~ 109)');
data.classList.forEach(c => {
  sql.push(`INSERT INTO edu_class (class_id, grade, class_name, student_num, del_flag, create_by, create_time)
VALUES (${c.classId}, '复读部', '${c.className}', 45, '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE grade = VALUES(grade), class_name = VALUES(class_name), student_num = VALUES(student_num), del_flag = '0';`);
});
sql.push('');

// 3. 教师档案录入 (edu_teacher)
sql.push('-- 3. 录入高复部教师档案 (edu_teacher: 101 ~ 132)');
data.teacherList.forEach(t => {
  sql.push(`INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, del_flag, create_by, create_time)
VALUES (${t.teacherId}, '${t.name}', '高复教学部', '复读部', '${t.classIds}', '${t.subjects}', '${t.phone}', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name), dept = VALUES(dept), grade = VALUES(grade), class_ids = VALUES(class_ids), subject = VALUES(subject), phone = VALUES(phone), del_flag = '0';`);
});
sql.push('');

// 4. 系统用户录入 (sys_user)
// 统一默认密码 admin123: $2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2
sql.push('-- 4. 录入系统用户账号 (sys_user: 101 ~ 132)');
data.teacherList.forEach(t => {
  sql.push(`INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_by, create_time)
VALUES (${t.userId}, 110, '${t.userName}', '${t.name}', '00', '${t.email}', '${t.phone}', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '复读部', '${t.subjects}', '${t.classIds}', '${t.remark}', 'admin', NOW())
ON DUPLICATE KEY UPDATE dept_id = VALUES(dept_id), nick_name = VALUES(nick_name), phonenumber = VALUES(phonenumber), grade = VALUES(grade), subject = VALUES(subject), class_ids = VALUES(class_ids), remark = VALUES(remark), status = '0', del_flag = '0';`);
});
sql.push('');

// 5. 分配教师角色 (role_id = 4: 任课老师)
sql.push('-- 5. 分配角色权限 (role_id = 4: 任课老师)');
data.teacherList.forEach(t => {
  sql.push(`DELETE FROM sys_user_role WHERE user_id = ${t.userId};`);
  sql.push(`INSERT INTO sys_user_role (user_id, role_id) VALUES (${t.userId}, 4);`);
});
sql.push('');

// 6. 字典配置补充（确保 grade 字典包含 复读部）
sql.push('-- 6. 字典配置更新：确保 grade 字典中包含 复读部');
sql.push(`INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT 10, '高三复读部', '复读部', 'grade', '', 'primary', 'N', '0', 'admin', NOW(), '高三高考复读部'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'grade' AND dict_value = '复读部');\n`);

sql.push('SET FOREIGN_KEY_CHECKS = 1;\n');

fs.writeFileSync('scripts/insert_gaofu_teachers.sql', sql.join('\n'), 'utf8');
console.log('\nSQL 脚本已生成完毕: scripts/insert_gaofu_teachers.sql');
