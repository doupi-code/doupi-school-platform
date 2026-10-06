-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单', '2000', '1', 'out', 'edu/out/index', 1, 0, 'C', '0', '0', 'edu:out:list', '#', 'admin', sysdate(), '', null, '出库单菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'edu:out:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'edu:out:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'edu:out:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'edu:out:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('出库单导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'edu:out:export',       '#', 'admin', sysdate(), '', null, '');