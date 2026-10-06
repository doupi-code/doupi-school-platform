-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细', '2000', '1', 'inItem', 'edu/inItem/index', 1, 0, 'C', '0', '0', 'edu:inItem:list', '#', 'admin', sysdate(), '', null, '入库单明细菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'edu:inItem:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'edu:inItem:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'edu:inItem:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'edu:inItem:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单明细导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'edu:inItem:export',       '#', 'admin', sysdate(), '', null, '');