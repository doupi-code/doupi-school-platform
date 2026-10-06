-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案', '2000', '1', 'class', 'edu/class/index', 1, 0, 'C', '0', '0', 'edu:class:list', '#', 'admin', sysdate(), '', null, '班级档案菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'edu:class:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'edu:class:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'edu:class:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'edu:class:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('班级档案导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'edu:class:export',       '#', 'admin', sysdate(), '', null, '');