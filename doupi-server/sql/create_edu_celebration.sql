-- 提分光荣榜表
CREATE TABLE IF NOT EXISTS `edu_celebration` (
  `celebration_id` bigint NOT NULL AUTO_INCREMENT COMMENT '光荣榜记录ID',
  `student_name` varchar(64) NOT NULL COMMENT '学生姓名',
  `masked_name` varchar(64) DEFAULT '' COMMENT '脱敏姓名',
  `subject` varchar(64) DEFAULT '' COMMENT '选科组合',
  `before_score` decimal(6,1) DEFAULT NULL COMMENT '原始/前次分数',
  `after_score` decimal(6,1) DEFAULT NULL COMMENT '现考/提升后分数',
  `upgrade_score` decimal(6,1) DEFAULT NULL COMMENT '提升分值',
  `batch_title` varchar(128) DEFAULT '2026年高考提分光荣榜' COMMENT '光荣榜批次/届别',
  `tag` varchar(64) DEFAULT '' COMMENT '去向/荣誉标签',
  `status` char(1) DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `order_num` int DEFAULT 0 COMMENT '排序权重',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`celebration_id`),
  KEY `idx_batch` (`batch_title`),
  KEY `idx_upgrade` (`upgrade_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学子提分光荣榜';

-- 菜单权限插入 (2056 提分光荣榜，父菜单 2000 教务管理)
DELETE FROM `sys_role_menu` WHERE `menu_id` = 2056;
DELETE FROM `sys_menu` WHERE `menu_id` = 2056;

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES (2056, '提分光荣榜', 2000, 5, 'celebration', 'edu/celebration/index', 1, 0, 'C', '0', '0', 'edu:celebration:list', 'chart', 'admin', sysdate(), '', NULL, '高考学子提分光荣榜与大屏展播');

-- 为超级管理员与教职工角色分配权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`) VALUES (1, 2056), (2, 2056), (4, 2056), (6, 2056);
