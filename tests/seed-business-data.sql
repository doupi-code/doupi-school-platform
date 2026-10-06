-- ----------------------------------------------------
-- 豆皮教育系统 - 汉外华襄高级中学 真实业务全景种子数据
-- ----------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 班级档案 (edu_class)
TRUNCATE TABLE edu_class;
INSERT INTO edu_class (class_id, grade, class_name, student_num, create_time) VALUES
(1, '高三', '高三(1)班·卓越拔尖班', 45, NOW()),
(2, '高三', '高三(2)班·清北冲刺班', 48, NOW()),
(3, '高三复读', '高三复读(1)班·提分班', 52, NOW()),
(4, '高二', '高二(1)班·重点实验班', 46, NOW()),
(5, '高二', '高二(2)班·理科特色班', 47, NOW()),
(6, '高一', '高一(1)班·名校火箭班', 50, NOW()),
(7, '高一', '高一(2)班·综合实验班', 49, NOW()),
(8, '初三', '初三(1)班·直升实验班', 42, NOW());

-- 2. 教师档案 (edu_teacher) 与系统用户 (sys_user)
TRUNCATE TABLE edu_teacher;
INSERT INTO edu_teacher (teacher_id, teacher_name, dept, grade, class_ids, subject, phone, create_time) VALUES
(1, '张建华', '高中教学部', '高三', '1,2', '高中数学', '13800138001', NOW()),
(2, '李秀英', '高中教学部', '高三', '1,3', '高中英语', '13800138002', NOW()),
(3, '王强', '高中教学部', '高二', '4,5', '高中物理', '13800138003', NOW()),
(4, '刘芳', '高中教学部', '高一', '6,7', '高中语文', '13800138004', NOW()),
(5, '陈德明', '复读部教研室', '高三复读', '3', '高中化学', '13800138005', NOW()),
(6, '赵红梅', '艺体教研组', '高二', '4,5', '高中生物', '13800138006', NOW());

DELETE FROM sys_user_role WHERE user_id > 1;
DELETE FROM sys_user WHERE user_id > 1;
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, password, status, del_flag, grade, subject, class_ids, remark, create_time) VALUES
(2, 103, 'zhangjh', '张建华', '00', 'zhangjh@doupi.edu', '13800138001', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高三', '高中数学', '1,2', '特级骨干教师', NOW()),
(3, 103, 'lixy', '李秀英', '00', 'lixy@doupi.edu', '13800138002', '1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高三', '高中英语', '1,3', '英语学科带头人', NOW()),
(4, 103, 'wangq', '王强', '00', 'wangq@doupi.edu', '13800138003', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高二', '高中物理', '4,5', '物理奥赛金牌教练', NOW()),
(5, 103, 'liuf', '刘芳', '00', 'liuf@doupi.edu', '13800138004', '1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高一', '高中语文', '6,7', '语文学科名师', NOW()),
(6, 103, 'chendm', '陈德明', '00', 'chendm@doupi.edu', '13800138005', '0', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高三复读', '高中化学', '3', '高三复读部班主任', NOW()),
(7, 103, 'zhaohm', '赵红梅', '00', 'zhaohm@doupi.edu', '13800138006', '1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '高二', '高中生物', '4,5', '理科综合教研组长', NOW());

INSERT INTO sys_user_role (user_id, role_id) VALUES
(2, 4), (3, 4), (4, 4), (5, 4), (6, 4), (7, 4);


-- 3. 仓储物资与耗材档案 (edu_goods)
TRUNCATE TABLE edu_goods;
INSERT INTO edu_goods (goods_id, goods_name, category, grade, spec, unit, stock_num, warn_low, location, create_time) VALUES
(1, '得力A4双胶复印纸(70g)', '1', '通用', 'A4/箱(8包共4000张)', '箱', 86, 20, '主校区文印库A区-01', NOW()),
(2, '旗舰8K精装月考试卷纸', '1', '高中部', '8K/包(500张特厚)', '包', 120, 30, '主校区文印库A区-02', NOW()),
(3, '得力16K标准课堂练习纸', '1', '初中部', '16K/包(500张)', '包', 65, 25, '主校区文印库A区-03', NOW()),
(4, '京瓷高速一体数码复合机油墨', '2', '通用', '黑色墨盒(1000ml)', '支', 18, 5, '文印设备耗材柜B-01', NOW()),
(5, '全自动速印机一体化热敏版纸', '2', '通用', 'B4高速专用版纸', '卷', 12, 4, '文印设备耗材柜B-02', NOW()),
(6, '晨光考试专用2B涂卡铅笔', '3', '通用', '2B木杆/盒(12支)', '盒', 45, 10, '综合仓库C区-01', NOW()),
(7, '晨光大容量速干黑色中性笔', '3', '通用', '0.5mm/盒(12支)', '盒', 58, 15, '综合仓库C区-02', NOW()),
(8, '校园开放日招生全景宣传画册', '4', '高中部', '16开铜版纸精装/本', '本', 350, 100, '行政招生处物料库D-01', NOW());

-- 4. 教务文印登记真实流水 (edu_print_record)
TRUNCATE TABLE edu_print_record;
INSERT INTO edu_print_record (print_name, paper_goods_id, paper_type, print_count, page_count, print_side, total_pages, teacher_id, grade, class_id, class_name, operator, print_time, status, remark, create_time) VALUES
('高三数学十月八校联考诊断卷', 2, '8K', 95, 4, '2', 380, 1, '高三', 1, '高三(1)班·卓越拔尖班', 'admin', DATE_SUB(NOW(), INTERVAL 2 HOUR), '1', '年级全真模拟联考卷', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('高三英语高考核心词汇专项训练', 1, 'A4', 100, 8, '2', 800, 2, '高三', 2, '高三(2)班·清北冲刺班', 'admin', DATE_SUB(NOW(), INTERVAL 5 HOUR), '1', '高考阅读提分突破', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('高二物理电磁感应典型例题讲义', 1, 'A4', 93, 6, '2', 558, 3, '高二', 4, '高二(1)班·重点实验班', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), '1', '培优拓展训练讲义', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('高一语文古诗文群文阅读精编', 1, 'A4', 99, 5, '1', 495, 4, '高一', 6, '高一(1)班·名校火箭班', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), '1', '必修一重点文言文导学', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('高三复读部化学方程式配平专题卷', 3, '16K', 52, 3, '1', 156, 5, '高三复读', 3, '高三复读(1)班·提分班', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '1', '基础过关天天清', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('高二生物遗传系谱图解密演练', 1, 'A4', 93, 4, '2', 372, 6, '高二', 5, '高二(2)班·理科特色班', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '1', '微专题突破集训', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('汉外华襄2026秋季招生说明会资料', 1, 'A4', 200, 2, '2', 400, 1, '高中部', NULL, '招生办', 'admin', DATE_SUB(NOW(), INTERVAL 3 DAY), '1', '家长开放日发放物料', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('高一数学函数概念与单调性检测题', 2, '8K', 99, 2, '1', 198, 1, '高一', 7, '高一(2)班·综合实验班', 'admin', DATE_SUB(NOW(), INTERVAL 3 DAY), '1', '周考周周清过关检测', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- 5. 招生访校预约真实流水 (doupi_recruit_appointment)
TRUNCATE TABLE doupi_recruit_appointment;
INSERT INTO doupi_recruit_appointment (appointment_no, parent_name, parent_phone, student_name, student_gender, student_grade, current_school, campus_id, campus_name, visit_date, time_slot, status, check_in_code, teacher_name, verifier, verify_time, remark, audit_remark, create_time) VALUES
('AP202610011001', '刘先生', '13971234567', '刘子轩', '男', '高三复读', '武汉三中', 'default', '汉外华襄高级中学', DATE_FORMAT(NOW(), '%Y-%m-%d'), '14:00-15:30', 'VERIFIED', '849201', '张建华', '张老师', DATE_SUB(NOW(), INTERVAL 1 HOUR), '高考成绩568分，意向冲刺华中科技大学', '家长带成绩单到校现场面谈，已登记进入卓越复读1班意向库', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('AP202610011002', '王女士', '13886123456', '王语嫣', '女', '高一', '汉铁初中', 'default', '汉外华襄高级中学', DATE_FORMAT(NOW(), '%Y-%m-%d'), '10:00-11:30', 'VERIFIED', '310492', '李秀英', '李老师', DATE_SUB(NOW(), INTERVAL 4 HOUR), '中考估分优良，咨询卓越班寄宿管理与师资', '已实地参观宿舍、智慧食堂和文印创客空间，意向强烈', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('AP202610011003', '陈先生', '13657123890', '陈泽宇', '男', '高三复读', '武钢三中', 'default', '汉外华襄高级中学', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:30-11:00', 'VERIFIED', '758103', '陈德明', '陈老师', DATE_SUB(NOW(), INTERVAL 1 DAY), '理综偏弱，希望由特级骨干教师精准提分指导', '已由化学教研组长陈老师深度复盘试卷', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('AP202610011004', '赵女士', '15927123001', '赵俊铭', '男', '高二', '华师一附中分校', 'default', '汉外华襄高级中学', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '14:30-16:00', 'VERIFIED', '492015', '王强', '王老师', DATE_SUB(NOW(), INTERVAL 1 DAY), '转学意向，咨询选科物理+化学+生物组合走班', '已完成学科测试评估', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('AP202610011005', '周先生', '18971123456', '周静萱', '女', '高一', '七一华源中学', 'default', '汉外华襄高级中学', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00-16:30', 'VERIFIED', '901247', '刘芳', '刘老师', DATE_SUB(NOW(), INTERVAL 2 DAY), '了解新高考选课改革与学校拔尖生培养方案', '接待完成，预约参加10月15日开放日深度体验', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('AP202610011006', '孙女士', '13307123999', '孙晨曦', '男', '高一', '武汉二中广雅', 'default', '汉外华襄高级中学', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00-11:30', 'APPROVED', '618294', '张建华', NULL, NULL, '初三成绩优秀，咨询卓越寄宿保障', '已短信确认到校接待', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('AP202610011007', '吴先生', '13545123888', '吴嘉睿', '男', '初三', '粮道街中学', 'default', '汉外华襄高级中学', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00-15:30', 'APPROVED', '527419', '李秀英', NULL, NULL, '直升部衔接课程咨询', '审核通过，已排班指派接待老师', DATE_SUB(NOW(), INTERVAL 8 HOUR));

-- 6. 提分喜报表 (edu_celebration)
TRUNCATE TABLE edu_celebration;
INSERT INTO edu_celebration (student_name, masked_name, subject, before_score, after_score, upgrade_score, batch_title, tag, status, order_num, remark, create_time) VALUES
('张晓峰', '张*峰', '理科综合', 492.0, 638.0, 146.0, '2026湖北高考卓越提分榜', '清北强基', '0', 1, '考入武汉大学 (物理卓越计划)，数学单科提升42分', NOW()),
('李梦琪', '李*琪', '物理方向', 510.0, 642.0, 132.0, '2026湖北高考卓越提分榜', '华科冲刺', '0', 2, '考入华中科技大学 (计算机英才班)，理综逆袭突破276分', NOW()),
('陈思宇', '陈*宇', '历史方向', 465.0, 598.0, 133.0, '2026湖北高考卓越提分榜', '双一流重点', '0', 3, '考入华中师范大学 (国家公费师范生)，英语突破138分', NOW()),
('王浩宇', '王*宇', '历史方向', 438.0, 582.0, 144.0, '2026湖北高考卓越提分榜', '名校提分', '0', 4, '考入中南财经政法大学，数学单科由68分提升至124分', NOW()),
('刘雨欣', '刘*欣', '物理方向', 525.0, 655.0, 130.0, '2026湖北高考卓越提分榜', 'C9联盟名校', '0', 5, '考入北京航空航天大学，理科卓越部应届生标杆', NOW()),
('赵子墨', '赵*墨', '综合提分', 480.0, 615.0, 135.0, '2026湖北高考卓越提分榜', '一本逆袭', '0', 6, '考入中国地质大学(武汉)，全面扫除学科盲区', NOW());

-- 7. 供应商与物资出入库流水 (edu_supplier, edu_stock_in, edu_stock_out)
TRUNCATE TABLE edu_supplier;
INSERT INTO edu_supplier (supplier_id, supplier_name, contact, phone, create_time) VALUES
(1, '武汉晨光得力教育物资总经销', '王经理', '13988886666', NOW()),
(2, '湖北楚风文化印刷纸业有限公司', '李经理', '13799995555', NOW());

TRUNCATE TABLE edu_stock_in_item;
TRUNCATE TABLE edu_stock_in;
INSERT INTO edu_stock_in (in_id, in_no, in_type, supplier_id, in_time, operator, status, remark, create_time) VALUES
(1, 'RK20260925001', '1', 1, '2026-09-25 10:00:00', 'admin', '2', '2026秋季学期第一批教学用纸与耗材统一备货', NOW()),
(2, 'RK20260928002', '1', 2, '2026-09-28 15:30:00', 'admin', '2', '八校联考诊断专用8K特厚试卷纸紧急入库', NOW());

INSERT INTO edu_stock_in_item (item_id, in_id, goods_id, quantity, price, amount, create_time) VALUES
(1, 1, 1, 50, 135.00, 6750.00, NOW()),
(2, 1, 4, 15, 180.00, 2700.00, NOW()),
(3, 1, 5, 8, 260.00, 2080.00, NOW()),
(4, 1, 6, 30, 15.00, 450.00, NOW()),
(5, 2, 2, 120, 45.00, 5400.00, NOW());

TRUNCATE TABLE edu_stock_out_item;
TRUNCATE TABLE edu_stock_out;
INSERT INTO edu_stock_out (out_id, out_no, out_type, receiver, class_id, out_time, operator, status, remark, create_time) VALUES
(1, 'CK20260929001', '1', '张建华', 1, '2026-09-29 09:00:00', 'admin', '2', '高三年级月考诊断考试试卷印刷领料出库', NOW()),
(2, 'CK20260930002', '2', '李秀英', NULL, '2026-09-30 14:00:00', 'admin', '2', '校园开放日宣传画册领用', NOW());

INSERT INTO edu_stock_out_item (item_id, out_id, goods_id, quantity, create_time) VALUES
(1, 1, 2, 15, NOW()),
(2, 1, 4, 2, NOW()),
(3, 2, 8, 150, NOW());

SET FOREIGN_KEY_CHECKS = 1;
