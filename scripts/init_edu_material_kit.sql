-- ========================================================
-- 教务日常领退与物资套装配置 数据库初始化脚本
-- ========================================================

-- 1. 创建物资套装模版表
CREATE TABLE IF NOT EXISTS `edu_goods_kit` (
  `kit_id` bigint NOT NULL AUTO_INCREMENT COMMENT '套装ID',
  `kit_name` varchar(100) NOT NULL COMMENT '套装名称',
  `kit_code` varchar(50) DEFAULT NULL COMMENT '套装编码',
  `target_type` char(1) NOT NULL DEFAULT '1' COMMENT '适用对象(1教师工作武器 2学生教材 3班级通用)',
  `grade` varchar(30) DEFAULT '通用' COMMENT '适用年级(通用/高一/高二/高三/复读部)',
  `subject` varchar(50) DEFAULT '通用' COMMENT '适用选科/方向(通用/物理类/历史类/物化生/历政地)',
  `description` varchar(500) DEFAULT NULL COMMENT '套装说明/适用场景',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `sort_order` int DEFAULT 0 COMMENT '排序号',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志(0存在 2删除)',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`kit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务物资套装模版表';

-- 2. 创建物资套装明细表
CREATE TABLE IF NOT EXISTS `edu_goods_kit_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `kit_id` bigint NOT NULL COMMENT '套装ID',
  `goods_id` bigint NOT NULL COMMENT '物资ID',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '默认配发数量',
  `sort_order` int DEFAULT 0 COMMENT '排序号',
  `remark` varchar(255) DEFAULT NULL COMMENT '配发说明',
  PRIMARY KEY (`item_id`),
  KEY `idx_kit_id` (`kit_id`),
  KEY `idx_goods_id` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务物资套装明细表';

-- 3. 创建教务日常领退业务记录表
CREATE TABLE IF NOT EXISTS `edu_material_record` (
  `record_id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` varchar(32) NOT NULL COMMENT '业务流水单号',
  `record_type` char(1) NOT NULL COMMENT '业务类型(1发放领取 2退还回收)',
  `business_category` varchar(50) NOT NULL COMMENT '业务场景(教师工作武器/学生选科领书/班级领用/教师离职交接/学生退学退书/其他)',
  `target_type` char(1) NOT NULL DEFAULT '1' COMMENT '对象类型(1教师 2学生 3班级)',
  `target_id` bigint DEFAULT NULL COMMENT '关联对象ID(如教师ID/班级ID)',
  `target_name` varchar(64) NOT NULL COMMENT '领用/归还人姓名(教师姓名/学生姓名)',
  `class_id` bigint DEFAULT NULL COMMENT '关联班级ID',
  `class_name` varchar(64) DEFAULT NULL COMMENT '关联班级名称',
  `grade` varchar(30) DEFAULT NULL COMMENT '所属年级',
  `subject` varchar(50) DEFAULT NULL COMMENT '所属选科/学科',
  `kit_id` bigint DEFAULT NULL COMMENT '引用的物资套装ID',
  `kit_name` varchar(100) DEFAULT NULL COMMENT '引用的物资套装名称',
  `total_quantity` int NOT NULL DEFAULT 0 COMMENT '总件数',
  `image_url` varchar(1000) DEFAULT NULL COMMENT '实物/签领拍照留存图片URL(非必填)',
  `operator` varchar(64) NOT NULL COMMENT '经办教务人员',
  `operate_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '经办时间',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态(0正常 1已撤销)',
  `del_flag` char(1) DEFAULT '0' COMMENT '删除标志(0正常 2删除)',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注说明',
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `idx_record_no` (`record_no`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_operate_time` (`operate_time`),
  KEY `idx_target_name` (`target_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务日常物资领退记录表';

-- 4. 创建教务日常领退明细表
CREATE TABLE IF NOT EXISTS `edu_material_record_item` (
  `item_id` bigint NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `record_id` bigint NOT NULL COMMENT '主记录ID',
  `goods_id` bigint NOT NULL COMMENT '物资ID',
  `goods_name` varchar(100) NOT NULL COMMENT '物资名称',
  `spec` varchar(100) DEFAULT NULL COMMENT '规格型号',
  `unit` varchar(20) DEFAULT NULL COMMENT '计量单位',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '数量',
  `item_status` varchar(20) DEFAULT '完好' COMMENT '物品状态(完好/轻微磨损/损坏报损)',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`item_id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_goods_id` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务日常物资领退明细表';

-- 5. 补充常用的教务办公物资与学生教材档案 (如果不存在则插入)
INSERT INTO `edu_goods` (`goods_id`, `goods_name`, `category`, `grade`, `spec`, `unit`, `stock_num`, `warn_low`, `location`, `create_by`, `create_time`, `del_flag`)
VALUES
  (101, '晨光按动红色中性笔', '1', '通用', '0.5mm/红色', '支', 500, 50, '教务文具柜A-01', 'admin', NOW(), '0'),
  (102, '晨光按动黑色中性笔', '1', '通用', '0.5mm/黑色', '支', 800, 50, '教务文具柜A-02', 'admin', NOW(), '0'),
  (103, '晨光高品质速干红色笔芯', '1', '通用', '0.5mm/红色(盒装20支)', '支', 2000, 200, '教务文具柜A-03', 'admin', NOW(), '0'),
  (104, '晨光高品质速干黑色笔芯', '1', '通用', '0.5mm/黑色(盒装20支)', '支', 3000, 200, '教务文具柜A-04', 'admin', NOW(), '0'),
  (105, '得力多功能金属伸缩书立', '1', '通用', '加厚防滑/可调节', '个', 150, 20, '教务文具柜B-01', 'admin', NOW(), '0'),
  (106, '教师教学备课本', '1', '通用', '16K/精装软皮/80页', '本', 400, 50, '教务档案柜C-01', 'admin', NOW(), '0'),
  (107, '教师日常听课评课记录本', '1', '通用', '16K/胶装/60页', '本', 350, 50, '教务档案柜C-02', 'admin', NOW(), '0'),
  (108, '高考班学生学情诊断记录本', '1', '高三', 'A4/加厚封面/100页', '本', 300, 30, '教务档案柜C-03', 'admin', NOW(), '0'),
  (109, '班主任主题班会工作记录本', '1', '通用', '16K/皮面/80页', '本', 200, 20, '教务档案柜C-04', 'admin', NOW(), '0'),
  (110, 'A4多层透明加厚文件夹', '1', '通用', 'A4/10个装/带标签', '个', 800, 100, '教务文具柜B-02', 'admin', NOW(), '0'),
  (111, '得力高粘度固体胶棒', '1', '通用', '21g/强力大号', '支', 300, 30, '教务文具柜A-05', 'admin', NOW(), '0'),
  (112, '晨光强粘彩色多格便利贴', '1', '通用', '4色组合/每本100张', '包', 450, 50, '教务文具柜A-06', 'admin', NOW(), '0'),
  (201, '高三语文一轮总复习教材及导学案', '2', '高三', '人教统编版/含答题卡', '套', 500, 50, '教材库房J-01', 'admin', NOW(), '0'),
  (202, '高三数学一轮核心考点与典题精析', '2', '高三', '高中数学全套/含活页', '套', 500, 50, '教材库房J-02', 'admin', NOW(), '0'),
  (203, '高三英语考点精析与高考听力套装', '2', '高三', '附音频光盘/二维码听力', '套', 500, 50, '教材库房J-03', 'admin', NOW(), '0'),
  (204, '高三物理一轮复习教程与题型突破', '2', '高三', '选科物理/人教版', '套', 350, 30, '教材库房J-04', 'admin', NOW(), '0'),
  (205, '高三化学精编考点清单与实验专练', '2', '高三', '选科化学/鲁科版', '套', 350, 30, '教材库房J-05', 'admin', NOW(), '0'),
  (206, '高三生物一轮基础强化与核心归纳', '2', '高三', '选科生物/中图版', '套', 350, 30, '教材库房J-06', 'admin', NOW(), '0'),
  (207, '高三历史时空坐标与高考真题汇编', '2', '高三', '选科历史/部编版', '套', 250, 30, '教材库房J-07', 'admin', NOW(), '0'),
  (208, '高三政治核心素养与时政热点精讲', '2', '高三', '选科政治/人教统编版', '套', 250, 30, '教材库房J-08', 'admin', NOW(), '0'),
  (209, '高三地理区域认知与图表专项精练', '2', '高三', '选科地理/中图版', '套', 250, 30, '教材库房J-09', 'admin', NOW(), '0')
ON DUPLICATE KEY UPDATE `goods_name` = VALUES(`goods_name`), `stock_num` = VALUES(`stock_num`);

-- 6. 预置经典物资套装模版
INSERT INTO `edu_goods_kit` (`kit_id`, `kit_name`, `kit_code`, `target_type`, `grade`, `subject`, `description`, `status`, `sort_order`, `create_by`)
VALUES
  (1, '新入职教师标准办公包（工作武器）', 'KIT_TEA_DEFAULT', '1', '通用', '通用', '老师入职/开学标配办公物资：红黑笔各1支、红黑笔芯各10支、书立1个、备课本、听课本、学情本、班会本、透明文件夹、胶棒、便利贴等全套武器', '0', 1, 'admin'),
  (2, '高三物理类选科全套教材（物化生）', 'KIT_STU_PHY', '2', '高三', '物理类(物化生)', '高三物理方向学生开学全套教材与辅导用书（语+数+英+物+化+生）', '0', 2, 'admin'),
  (3, '高三历史类选科全套教材（历政地）', 'KIT_STU_HIS', '2', '高三', '历史类(历政地)', '高三历史方向学生开学全套教材与辅导用书（语+数+英+历+政+地）', '0', 3, 'admin'),
  (4, '班主任开学带班专享办公包', 'KIT_HEAD_TEACHER', '1', '通用', '班主任', '班主任专享工作武器：班会本2本、学情记录本2本、红黑笔、透明文件夹10个、便利贴3包等', '0', 4, 'admin')
ON DUPLICATE KEY UPDATE `kit_name` = VALUES(`kit_name`), `description` = VALUES(`description`);

-- 7. 预置物资套装明细
DELETE FROM `edu_goods_kit_item` WHERE `kit_id` IN (1, 2, 3, 4);

-- 1号套装：新教师标准工作武器 (红笔1, 黑笔1, 两种颜色笔芯各10支, 书立1, 备课本2, 听课本2, 学情本1, 班会本1, 文件夹5, 胶棒1, 便利贴2)
INSERT INTO `edu_goods_kit_item` (`kit_id`, `goods_id`, `quantity`, `sort_order`, `remark`)
VALUES
  (1, 101, 1, 1, '晨光红色中性笔各1支'),
  (1, 102, 1, 2, '晨光黑色中性笔各1支'),
  (1, 103, 10, 3, '红色笔芯各10支'),
  (1, 104, 10, 4, '黑色笔芯各10支'),
  (1, 105, 1, 5, '加厚伸缩书立1个'),
  (1, 106, 2, 6, '备课本2本'),
  (1, 107, 2, 7, '听课本2本'),
  (1, 108, 1, 8, '学情本1本'),
  (1, 109, 1, 9, '班会本1本'),
  (1, 110, 5, 10, '透明文件夹5个'),
  (1, 111, 1, 11, '强力胶棒1支'),
  (1, 112, 2, 12, '彩色便利贴2包');

-- 2号套装：高三物理类学生教材 (语数英 + 物化生)
INSERT INTO `edu_goods_kit_item` (`kit_id`, `goods_id`, `quantity`, `sort_order`, `remark`)
VALUES
  (2, 201, 1, 1, '语文总复习全套'),
  (2, 202, 1, 2, '数学总复习全套'),
  (2, 203, 1, 3, '英语总复习全套'),
  (2, 204, 1, 4, '物理一轮教程'),
  (2, 205, 1, 5, '化学考点精编'),
  (2, 206, 1, 6, '生物强化归纳');

-- 3号套装：高三历史类学生教材 (语数英 + 历政地)
INSERT INTO `edu_goods_kit_item` (`kit_id`, `goods_id`, `quantity`, `sort_order`, `remark`)
VALUES
  (3, 201, 1, 1, '语文总复习全套'),
  (3, 202, 1, 2, '数学总复习全套'),
  (3, 203, 1, 3, '英语总复习全套'),
  (3, 207, 1, 4, '历史时空坐标'),
  (3, 208, 1, 5, '政治时政精讲'),
  (3, 209, 1, 6, '地理图表专项');

-- 4号套装：班主任工作包
INSERT INTO `edu_goods_kit_item` (`kit_id`, `goods_id`, `quantity`, `sort_order`, `remark`)
VALUES
  (4, 109, 2, 1, '主题班会本2本'),
  (4, 108, 2, 2, '学情诊断本2本'),
  (4, 101, 2, 3, '红笔2支'),
  (4, 102, 2, 4, '黑笔2支'),
  (4, 110, 10, 5, 'A4透明文件夹10个'),
  (4, 112, 3, 6, '便签便利贴3包');

-- 8. 插入教务管理菜单与权限
-- 检查是否已有 material 菜单 (menu_id=2080)
DELETE FROM `sys_menu` WHERE `menu_id` IN (2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087, 2088);

-- 日常领退登记 (menu_id: 2080, parent_id: 2000)
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
  (2080, '日常领退登记', 2000, 6, 'material', 'edu/material/index', 1, 0, 'C', '0', '0', 'edu:material:list', 'shopping', 'admin', NOW(), '教务日常物资领取发书发武器与回收退书');

-- 日常领退按钮权限
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
  (2081, '领退登记查询', 2080, 1, '#', '', 1, 0, 'F', '0', '0', 'edu:material:query', '#', 'admin', NOW(), ''),
  (2082, '物资领取发放', 2080, 2, '#', '', 1, 0, 'F', '0', '0', 'edu:material:grant', '#', 'admin', NOW(), ''),
  (2083, '物资退还回收', 2080, 3, '#', '', 1, 0, 'F', '0', '0', 'edu:material:recovery', '#', 'admin', NOW(), ''),
  (2084, '领退台账导出', 2080, 4, '#', '', 1, 0, 'F', '0', '0', 'edu:material:export', '#', 'admin', NOW(), '');

-- 物资套装配置 (menu_id: 2085, parent_id: 2000)
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
  (2085, '物资套装配置', 2000, 7, 'kit', 'edu/kit/index', 1, 0, 'C', '0', '0', 'edu:kit:list', 'nested', 'admin', NOW(), '教务一键成套领取模板配置');

-- 套装配置按钮权限
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
  (2086, '套装配置查询', 2085, 1, '#', '', 1, 0, 'F', '0', '0', 'edu:kit:query', '#', 'admin', NOW(), ''),
  (2087, '套装配置新增', 2085, 2, '#', '', 1, 0, 'F', '0', '0', 'edu:kit:add', '#', 'admin', NOW(), ''),
  (2088, '套装配置修改', 2085, 3, '#', '', 1, 0, 'F', '0', '0', 'edu:kit:edit', '#', 'admin', NOW(), '');

-- 为管理员角色授权（admin 用户拥有全部权限，默认 sys_role_menu 中角色ID=1）
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`) VALUES
  (1, 2080), (1, 2081), (1, 2082), (1, 2083), (1, 2084),
  (1, 2085), (1, 2086), (1, 2087), (1, 2088);
