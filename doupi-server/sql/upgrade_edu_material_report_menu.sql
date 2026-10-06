-- ======================================================================
-- 数据库升级脚本：新增「教务物资领退统计报表」菜单与权限
-- 适用数据库：MySQL 5.7+ / 8.0+ (stuck-mg)
-- 说明：
--   1. 在「教务管理」(menu_id: 2000) 下新增「物资领退统计报表」(menu_id: 2090, path: 'materialReport', component: 'edu/material/report/index')
--   2. 自动为管理员及拥有教务权限的角色配置该菜单权限 (sys_role_menu)
-- ======================================================================

-- 1. 插入「物资领退统计报表」页面菜单 (menu_id: 2090)
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
SELECT 2090, '物资领退统计报表', 2000, 6, 'materialReport', 'edu/material/report/index', 1, 0, 'C', '0', '0', 'edu:material:report', 'chart', 'admin', SYSDATE(), '', NULL, '教务物资领退多维穿透统计报表'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2090);

-- 如果已存在则更新为标准配置
UPDATE sys_menu 
SET menu_name = '物资领退统计报表',
    parent_id = 2000,
    order_num = 6,
    path = 'materialReport',
    component = 'edu/material/report/index',
    is_frame = 1,
    is_cache = 0,
    menu_type = 'C',
    visible = '0',
    status = '0',
    perms = 'edu:material:report',
    icon = 'chart',
    remark = '教务物资领退多维穿透统计报表'
WHERE menu_id = 2090;

-- 2. 权限角色关联：将拥有教务管理(2000)或日常领退登记(2080)权限的角色自动赋予 2090 菜单权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT DISTINCT role_id, 2090 
FROM sys_role_menu 
WHERE menu_id IN (2000, 2080);

-- 3. 提交事务
COMMIT;

SELECT '教务物资领退统计报表菜单与权限升级成功！' AS result;
