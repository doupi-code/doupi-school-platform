-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案', '2000', '1', 'goods', 'stock/goods/index', 1, 0, 'C', '0', '0', 'stock:goods:list', '#', 'admin', sysdate(), '', null, '物资档案菜单');

-- 按钮父菜单ID
SELECT @parentId := LAST_INSERT_ID();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案查询', @parentId, '1',  '#', '', 1, 0, 'F', '0', '0', 'stock:goods:query',        '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案新增', @parentId, '2',  '#', '', 1, 0, 'F', '0', '0', 'stock:goods:add',          '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案修改', @parentId, '3',  '#', '', 1, 0, 'F', '0', '0', 'stock:goods:edit',         '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案删除', @parentId, '4',  '#', '', 1, 0, 'F', '0', '0', 'stock:goods:remove',       '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('物资档案导出', @parentId, '5',  '#', '', 1, 0, 'F', '0', '0', 'stock:goods:export',       '#', 'admin', sysdate(), '', null, '');