-- ======================================================================
-- 数据库升级脚本：文印管理与教务管理菜单解耦独立为一级菜单
-- 适用数据库：MySQL 5.7+ / 8.0+ (stuck-mg)
-- 说明：
--   1. 新增一级目录「文印管理」(menu_id: 2400, path: 'print', icon: 'printer')
--   2. 将「文印登记」(menu_id: 2037) 和「文印统计报表」(menu_id: 2055) 迁移至「文印管理」下
--   3. 整理「文印管理」与「教务管理」各子菜单的排序及顶级目录顺序
--   4. 自动为已有教务或文印权限的角色配置「文印管理」一级目录权限 (sys_role_menu)
-- ======================================================================

-- 1. 插入新的一级目录「文印管理」(ID 为 2400，若已存在则忽略)
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
SELECT 2400, '文印管理', 0, 2, 'print', NULL, 1, 0, 'M', '0', '0', NULL, 'printer', 'admin', SYSDATE(), '', NULL, '文印管理顶级目录'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2400);

-- 如果 2400 已存在但属性不同，同步更新为标准属性
UPDATE sys_menu 
SET menu_name = '文印管理', 
    parent_id = 0, 
    order_num = 2, 
    path = 'print', 
    component = NULL, 
    menu_type = 'M', 
    visible = '0',
    status = '0',
    icon = 'printer',
    remark = '文印管理顶级目录'
WHERE menu_id = 2400;

-- 2. 调整顶级目录顺序：教务管理(1) -> 文印管理(2) -> 库存管理(3) -> 招生管理(4) -> 数字化大屏(5)
UPDATE sys_menu SET order_num = 1 WHERE menu_id = 2000;
UPDATE sys_menu SET order_num = 2 WHERE menu_id = 2400;
UPDATE sys_menu SET order_num = 3 WHERE menu_id = 2100;
UPDATE sys_menu SET order_num = 4 WHERE menu_id = 2200;
UPDATE sys_menu SET order_num = 5 WHERE menu_id = 2300;

-- 3. 将文印相关子菜单迁移至「文印管理」(2400)
-- 文印登记
UPDATE sys_menu 
SET menu_name = '文印登记',
    parent_id = 2400, 
    order_num = 1, 
    path = 'record', 
    component = 'print/record/index', 
    icon = 'printer' 
WHERE menu_id = 2037 OR (path = 'record' AND menu_type = 'C');

-- 文印统计报表
UPDATE sys_menu 
SET menu_name = '文印统计报表',
    parent_id = 2400, 
    order_num = 2, 
    path = 'report', 
    component = 'print/report/index', 
    icon = 'chart' 
WHERE menu_id = 2055 OR (path = 'printReport' AND menu_type = 'C');

-- 4. 整理「教务管理」(2000) 下的子菜单顺序与归属
-- 教职工档案 (order_num = 1)
UPDATE sys_menu SET parent_id = 2000, order_num = 1 WHERE menu_id = 2049;
-- 班级档案 (order_num = 2)
UPDATE sys_menu SET parent_id = 2000, order_num = 2 WHERE menu_id = 2001;
-- 提分光荣榜 (order_num = 3)
UPDATE sys_menu SET parent_id = 2000, order_num = 3 WHERE menu_id = 2056;
-- 日常领退登记 (order_num = 4)
UPDATE sys_menu SET parent_id = 2000, order_num = 4 WHERE menu_id = 2080;
-- 物资套装配置 (order_num = 5)
UPDATE sys_menu SET parent_id = 2000, order_num = 5 WHERE menu_id = 2085;

-- 5. 权限角色关联：将拥有原教务目录 2000 或文印登记 2037 权限的角色自动授予新「文印管理」目录 2400 权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT DISTINCT role_id, 2400 
FROM sys_role_menu 
WHERE menu_id IN (2000, 2037);

-- 6. 提交事务
COMMIT;

SELECT '文印管理与教务管理菜单拆分升级脚本执行完成！' AS result;
