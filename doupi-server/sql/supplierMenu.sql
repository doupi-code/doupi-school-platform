-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商', '2000', '1', 'supplier', 'edu/supplier/index', 1, 0, 'C', '0', '0', 'edu:supplier:list', '#', 'admin', sysdate(), '', null, '供应商菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'edu:supplier:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'edu:supplier:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'edu:supplier:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'edu:supplier:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('供应商导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'edu:supplier:export',       '#', 'admin', sysdate(), '', null, '');