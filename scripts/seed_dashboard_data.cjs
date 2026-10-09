const { spawn } = require('child_process');

const sql = `
SET NAMES utf8mb4;

-- 插入系统公告
DELETE FROM sys_notice;
INSERT INTO sys_notice (notice_id, notice_title, notice_type, notice_content, status, create_by, create_time, remark) VALUES
(1, '关于开展2026年秋季学期教学资料印制规范的通知', '1', '各教研室、各位老师：为保障期中备考文印效率，请各学科提前24小时通过数字化系统发起文印登记，规范用纸规格...', '0', 'admin', NOW(), '教务处发文'),
(2, '汉外华襄校园开放日接待与迎新核销工作排班安排', '2', '招生咨询处：本周六将迎来大规模初三升高中意向家长访校，请接待老师佩戴工牌、打开工作台核销端实时扫码接待...', '0', 'admin', NOW(), '招生办发文'),
(3, '关于教学实验耗材及期末文印纸张集中采购入库的提示', '1', '综合保障处：新一批得力A4双胶复印纸及8K月考试卷纸已验收完成，各年级领用人凭出库领用单至文印库领取...', '0', 'admin', NOW(), '资产管理中心'),
(4, '校园数字化大屏与提分喜报系统正式升级上线通知', '2', '全校各部门：全新校园全景数字化运营沙盘与高考卓越提分榜已同步部署，欢迎各级管理人员查阅实时运营指标...', '0', 'admin', NOW(), '信息技术中心');

-- 插入班级档案
TRUNCATE TABLE edu_class;
INSERT INTO edu_class (class_id, grade, class_name, student_num, head_teacher, create_time) VALUES
(1, '高三', '高三(1)班·卓越拔尖班', 45, '张建华', NOW()),
(2, '高三', '高三(2)班·清北冲刺班', 48, '李秀英', NOW()),
(3, '复读部', '高三复读(1)班·提分班', 52, '陈德明', NOW()),
(4, '高二', '高二(1)班·重点实验班', 46, '王强', NOW()),
(5, '高二', '高二(2)班·理科特色班', 47, '赵红梅', NOW()),
(6, '高一', '高一(1)班·名校火箭班', 50, '刘芳', NOW()),
(7, '高一', '高一(2)班·综合实验班', 49, '张老师', NOW()),
(8, '初三', '初三(1)班·直升实验班', 42, '李老师', NOW());

-- 插入真实文印流水
DELETE FROM edu_print_record;
INSERT INTO edu_print_record (print_id, print_name, paper_goods_id, paper_type, print_count, page_count, print_side, total_pages, teacher_id, grade, class_id, class_name, operator, print_time, status, remark, create_time) VALUES
(1, '高三数学十月八校联考诊断卷', 2, '8K', 95, 4, '2', 380, 1, '高三', 1, '高三(1)班·卓越拔尖班', 'admin', DATE_SUB(NOW(), INTERVAL 2 HOUR), '1', '年级全真模拟联考卷', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, '高三英语高考核心词汇专项训练', 1, 'A4', 100, 8, '2', 800, 2, '高三', 2, '高三(2)班·清北冲刺班', 'admin', DATE_SUB(NOW(), INTERVAL 5 HOUR), '1', '高考阅读提分突破', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(3, '高二物理电磁感应典型例题讲义', 1, 'A4', 93, 6, '2', 558, 3, '高二', 4, '高二(1)班·重点实验班', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), '1', '培优拓展训练讲义', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, '高一语文古诗文群文阅读精编', 1, 'A4', 99, 5, '1', 495, 4, '高一', 6, '高一(1)班·名校火箭班', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), '1', '必修一重点文言文导学', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, '高三复读部化学方程式配平专题卷', 3, '16K', 52, 3, '1', 156, 5, '复读部', 3, '高三复读(1)班·提分班', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '1', '基础过关天天清', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, '高二生物遗传系谱图解密演练', 1, 'A4', 93, 4, '2', 372, 6, '高二', 5, '高二(2)班·理科特色班', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '1', '微专题突破集训', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(7, '汉外华襄2026秋季招生说明会资料', 1, 'A4', 200, 2, '2', 400, 1, '高中部', NULL, '招生办', 'admin', DATE_SUB(NOW(), INTERVAL 3 DAY), '1', '家长开放日发放物料', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, '高一数学函数概念与单调性检测题', 2, '8K', 99, 2, '1', 198, 1, '高一', 7, '高一(2)班·综合实验班', 'admin', DATE_SUB(NOW(), INTERVAL 3 DAY), '1', '周考周周清过关检测', DATE_SUB(NOW(), INTERVAL 3 DAY));

`;

const proc = spawn('docker', ['exec', '-i', 'mysql8', 'mysql', '-uroot', '-p123456', '--default-character-set=utf8mb4', 'stuck-mg'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

proc.stdin.write(sql, 'utf8');
proc.stdin.end();

proc.on('close', (code) => {
  console.log('Seeding finished with exit code:', code);
  process.exit(code);
});
