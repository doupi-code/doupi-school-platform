-- ======================================================================
-- 数据库升级脚本：教务管理与库存管理菜单完全解耦与独立维护
-- 适用数据库：MySQL 5.7+ / 8.0+ (stuck-mg)
-- 说明：
--   1. 将原有混杂在 2000 下的教务与库存菜单拆分为两个独立的一级导航目录：
--      - 🎓 教务管理 (edu): 包含 印刷登记、教师档案、班级档案
--      - 📦 库存管理 (stock): 包含 物资档案、供应商管理、入库单、出库单、库存盘点、统计报表
--   2. 将库存各子菜单 component 路由组件由 edu/* 更新为 stock/*
--   3. 将库存各子菜单及按钮 perms 权限标识由 edu:* 更新为 stock:*
--   4. 自动为已有权限的角色配置「库存管理」一级目录权限，保证平滑升级无感知
-- ======================================================================

-- 1. 更新原一级目录 2000 为「教务管理」
UPDATE sys_menu 
SET menu_name = '教务管理', 
    order_num = 1, 
    icon = 'education', 
    remark = '教务管理目录' 
WHERE menu_id = 2000;

-- 2. 插入新的一级目录「库存管理」(ID 为 2100，若已存在则忽略)
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
SELECT 2100, '库存管理', 0, 2, 'stock', NULL, 1, 0, 'M', '0', '0', NULL, 'shopping', 'admin', SYSDATE(), '', NULL, '库存管理顶级目录'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2100);

-- 如果 2100 已存在但属性不同，同步更新为标准属性
UPDATE sys_menu 
SET menu_name = '库存管理', 
    parent_id = 0, 
    order_num = 2, 
    path = 'stock', 
    component = NULL, 
    menu_type = 'M', 
    icon = 'shopping' 
WHERE menu_id = 2100;

-- 3. 整理「教务管理」下的各子菜单显示顺序与图标
-- 印刷登记
UPDATE sys_menu SET parent_id = 2000, order_num = 1, icon = 'printer', component = 'edu/record/index' WHERE path = 'record' AND menu_type = 'C';
-- 教师档案
UPDATE sys_menu SET parent_id = 2000, order_num = 2, icon = 'peoples', component = 'edu/teacher/index' WHERE path = 'teacher' AND menu_type = 'C';
-- 班级档案
UPDATE sys_menu SET parent_id = 2000, order_num = 3, icon = 'tree-table', component = 'edu/class/index' WHERE path = 'class' AND menu_type = 'C';

-- 4. 将库存相关菜单迁移到新一级目录 2100 (库存管理)，并更新前端组件路径
-- 物资档案
UPDATE sys_menu SET menu_name = '物资档案', parent_id = 2100, order_num = 1, component = 'stock/goods/index' WHERE path = 'goods' AND menu_type = 'C';
-- 供应商管理
UPDATE sys_menu SET parent_id = 2100, order_num = 2, component = 'stock/supplier/index' WHERE path = 'supplier' AND menu_type = 'C';
-- 入库单
UPDATE sys_menu SET parent_id = 2100, order_num = 3, component = 'stock/in/index' WHERE path = 'in' AND menu_type = 'C';
-- 入库单明细
UPDATE sys_menu SET parent_id = 2100, order_num = 4, component = 'stock/inItem/index' WHERE path = 'inItem' AND menu_type = 'C';
-- 出库单
UPDATE sys_menu SET parent_id = 2100, order_num = 5, component = 'stock/out/index' WHERE path = 'out' AND menu_type = 'C';
-- 出库单明细
UPDATE sys_menu SET parent_id = 2100, order_num = 6, component = 'stock/outItem/index' WHERE path = 'outItem' AND menu_type = 'C';
-- 库存盘点
UPDATE sys_menu SET parent_id = 2100, order_num = 7, component = 'stock/check/index' WHERE path = 'check' AND menu_type = 'C';
-- 统计报表 (目录)
UPDATE sys_menu SET parent_id = 2100, order_num = 8 WHERE path = 'report' AND menu_type = 'M';
-- 出入库明细报表
UPDATE sys_menu SET component = 'stock/report/detail' WHERE path = 'detail' AND component LIKE '%report/detail%';
-- 月度统计报表
UPDATE sys_menu SET component = 'stock/report/monthly' WHERE path = 'monthly' AND component LIKE '%report/monthly%';

-- 5. 将库存相关权限标识 perms 由 edu:* 平滑迁移为 stock:*
-- 物品档案权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:goods:', 'stock:goods:') WHERE perms LIKE 'edu:goods:%';
-- 供应商权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:supplier:', 'stock:supplier:') WHERE perms LIKE 'edu:supplier:%';
-- 入库单权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:in:', 'stock:in:') WHERE perms LIKE 'edu:in:%';
-- 入库单明细权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:inItem:', 'stock:inItem:') WHERE perms LIKE 'edu:inItem:%';
-- 出库单权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:out:', 'stock:out:') WHERE perms LIKE 'edu:out:%';
-- 出库单明细权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:outItem:', 'stock:outItem:') WHERE perms LIKE 'edu:outItem:%';
-- 盘点权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:check:', 'stock:check:') WHERE perms LIKE 'edu:check:%';
-- 报表权限
UPDATE sys_menu SET perms = REPLACE(perms, 'edu:report:', 'stock:report:') WHERE perms LIKE 'edu:report:%';

-- 6. 权限角色关联：将拥有原教务目录 2000 权限的角色自动授予新库存目录 2100 权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT DISTINCT role_id, 2100 
FROM sys_role_menu 
WHERE menu_id = 2000;

-- 7. 提交事务
COMMIT;

SELECT '教务管理与库存管理菜单分离脚本执行完成！' AS result;
