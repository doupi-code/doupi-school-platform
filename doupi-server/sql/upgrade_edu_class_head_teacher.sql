-- ====================================================
-- 升级脚本：班级档案支持绑定班主任 (教师ID与姓名)
-- ====================================================

-- 1. 回填 2026.9.23 高复部班主任
UPDATE edu_class SET head_teacher_id = 102, head_teacher = '周珲' WHERE class_id = 101;
UPDATE edu_class SET head_teacher_id = 112, head_teacher = '李寄宁' WHERE class_id = 102;
UPDATE edu_class SET head_teacher_id = 110, head_teacher = '赵前利' WHERE class_id = 103;
UPDATE edu_class SET head_teacher_id = 117, head_teacher = '郭强' WHERE class_id = 104;
UPDATE edu_class SET head_teacher_id = 111, head_teacher = '陈新佳' WHERE class_id = 105;
UPDATE edu_class SET head_teacher_id = 121, head_teacher = '李炜' WHERE class_id = 106;
UPDATE edu_class SET head_teacher_id = 129, head_teacher = '苑运霞' WHERE class_id = 107;
UPDATE edu_class SET head_teacher_id = 101, head_teacher = '王贤武' WHERE class_id = 108;
UPDATE edu_class SET head_teacher_id = 132, head_teacher = '谭伟生' WHERE class_id = 109;

-- 2. 清理非高复部的其它班级（只保留高复部 9 个班级）
UPDATE edu_class SET del_flag = '2' WHERE class_id NOT IN (101, 102, 103, 104, 105, 106, 107, 108, 109);
