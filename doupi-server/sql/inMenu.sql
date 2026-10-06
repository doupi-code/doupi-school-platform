-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单', '2000', '1', 'in', 'edu/in/index', 1, 0, 'C', '0', '0', 'edu:in:list', '#', 'admin', sysdate(), '', null, '入库单菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'edu:in:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'edu:in:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'edu:in:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'edu:in:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('入库单导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'edu:in:export',       '#', 'admin', sysdate(), '', null, '');