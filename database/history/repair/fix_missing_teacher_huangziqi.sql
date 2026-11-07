-- ========================================================
-- 豆皮校园 - 文印登记缺失「申请教师」数据修正脚本
-- 背景：2026-10-08 通过「微信智能识别预填」批量登记的文印记录，
--       因未识别出申请教师（黄紫琦），导致 edu_print_record.teacher_id 为空。
-- 修正：将这些记录统一关联到黄紫琦老师（sys_user.nick_name = '黄紫琦'）。
-- 幂等：仅更新 teacher_id 为空的记录，可重复执行。
-- ========================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 核对：待修正记录数量（执行时预期为 52）
SELECT COUNT(*) AS missing_teacher_count
FROM edu_print_record
WHERE teacher_id IS NULL AND del_flag = '0';

-- 2. 核对：黄紫琦老师信息（预期 user_id = 131, subject = 英语）
SELECT u.user_id, u.nick_name, u.subject, u.grade
FROM sys_user u
WHERE u.nick_name = '黄紫琦' AND u.del_flag = '0';

-- 3. 修正：将缺失「申请教师」的记录统一关联到黄紫琦老师
UPDATE edu_print_record r
SET r.teacher_id = (
        SELECT u.user_id
        FROM sys_user u
        WHERE u.nick_name = '黄紫琦' AND u.del_flag = '0'
        ORDER BY u.user_id
        LIMIT 1
    ),
    r.update_time = NOW()
WHERE r.teacher_id IS NULL
  AND r.del_flag = '0';

-- 4. 验证：修正后缺失数应降为 0
SELECT COUNT(*) AS remaining_missing
FROM edu_print_record
WHERE teacher_id IS NULL AND del_flag = '0';

SET FOREIGN_KEY_CHECKS = 1;