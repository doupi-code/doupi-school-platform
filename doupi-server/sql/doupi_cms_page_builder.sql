/*
 * 豆皮校园管理系统 - 全站可视化区块化 CMS (Page Builder) 数据表与初始种子数据
 * 适用数据库: stuck-mg / MySQL 8.0+
 */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. 官网全局布局与公共组件配置表 (单例: header, footer, seo, floating)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_global`;
CREATE TABLE `doupi_cms_global` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` varchar(50) NOT NULL COMMENT '布局类别: header, footer, seo, floating',
  `config_content` json NOT NULL COMMENT '具体配置结构化JSON',
  `remark` varchar(255) DEFAULT '' COMMENT '说明',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网全局布局与公共组件配置表';

-- 初始全局数据: header
INSERT INTO `doupi_cms_global` (`category`, `config_content`, `remark`) VALUES
('header', '{
  "brand": {
    "name": "汉外华襄复读中心",
    "nameEn": "HUAXIANG SENIOR YEAR CENTER",
    "mark": "华"
  },
  "nav": [
    { "title": "首页", "slug": "", "path": "/" },
    {
      "title": "关于华襄",
      "slug": "about",
      "path": "/about",
      "children": [
        { "title": "中心概况", "slug": "introduction", "path": "/about/introduction", "desc": "办学历程与核心优势" },
        { "title": "办学理念", "slug": "philosophy", "path": "/about/philosophy", "desc": "教育初心与育人主张" },
        { "title": "校园环境", "slug": "campuses", "path": "/about/campuses", "desc": "独立校区与生活硬件" }
      ]
    },
    {
      "title": "高三学年",
      "slug": "senior-year",
      "path": "/senior-year",
      "children": [
        { "title": "课程体系", "slug": "curriculum", "path": "/senior-year/curriculum", "desc": "新高考科学备考方案" },
        { "title": "特色课程", "slug": "features", "path": "/senior-year/features", "desc": "清北领航与个性化培优" },
        { "title": "教学管理", "slug": "teaching", "path": "/senior-year/teaching", "desc": "精细化时间与作息规范" },
        { "title": "学年规划", "slug": "planning", "path": "/senior-year/planning", "desc": "三轮备考关键节点" }
      ]
    },
    {
      "title": "名师天团",
      "slug": "faculty",
      "path": "/faculty",
      "children": [
        { "title": "师资概览", "slug": "", "path": "/faculty", "desc": "名师阵容与学科梯队" },
        { "title": "教师名录", "slug": "teachers", "path": "/faculty/teachers", "desc": "特级教师与教研首席" },
        { "title": "教研成果", "slug": "research", "path": "/faculty/research", "desc": "高考命题与校本题库" }
      ]
    },
    {
      "title": "校园生活",
      "slug": "campus-life",
      "path": "/campus-life",
      "children": [
        { "title": "日常生活", "slug": "daily", "path": "/campus-life/daily", "desc": "寄宿作息与餐饮保障" },
        { "title": "心身护航", "slug": "wellbeing", "path": "/campus-life/wellbeing", "desc": "心理疏导与体育锻炼" }
      ]
    },
    {
      "title": "招生录取",
      "slug": "admissions",
      "path": "/admissions",
      "children": [
        { "title": "招生总览", "slug": "", "path": "/admissions", "desc": "招生政策与流程" },
        { "title": "班型设置", "slug": "plans", "path": "/admissions/plans", "desc": "分层教学与班额标准" },
        { "title": "招生简章", "slug": "guide", "path": "/admissions/guide", "desc": "报名条件与收费明细" },
        { "title": "常见问题", "slug": "faq", "path": "/admissions/faq", "desc": "招生咨询热点答疑" },
        { "title": "预约咨询", "slug": "consultation", "path": "/admissions/consultation", "desc": "在线预约与到校访谈" }
      ]
    },
    {
      "title": "高考资讯",
      "slug": "news",
      "path": "/news",
      "children": [
        { "title": "新闻资讯", "slug": "", "path": "/news", "desc": "中心动态与官方发文" },
        { "title": "高考动态", "slug": "gaokao", "path": "/news/gaokao", "desc": "招考政策与分数分析" }
      ]
    }
  ],
  "quickActions": [
    { "title": "预约游园 / 诊断", "href": "/admissions/consultation", "type": "primary" }
  ]
}', '官网顶部导航栏与全站菜单配置')
ON DUPLICATE KEY UPDATE `config_content`=VALUES(`config_content`);

-- 初始全局数据: footer
INSERT INTO `doupi_cms_global` (`category`, `config_content`, `remark`) VALUES
('footer', '{
  "cta": {
    "kicker": "VISIT US / 来校园走一走",
    "title": "重新出发，\n从一次到访开始。",
    "buttonText": "预约游园 / 诊断"
  },
  "brand": {
    "name": "汉外华襄复读中心",
    "nameEn": "HUAXIANG SENIOR YEAR CENTER",
    "slogan": "只为高三，再出发的这一年。\n全封闭管理 · 小班分层 · 名师执教",
    "address": "武汉市江夏区武汉海淀外国语实验学校（北门）",
    "hotlines": ["027-81777887", "027-81777838"],
    "admissionsLine": "400-0000-000",
    "officeHours": "周一至周日 8:30–17:30"
  },
  "copyright": "© 2026 汉外华襄复读中心 · 版权所有",
  "icp": "鄂ICP备2026055716号-1"
}', '官网全站底部页脚配置')
ON DUPLICATE KEY UPDATE `config_content`=VALUES(`config_content`);

-- ----------------------------------------------------------------------------
-- 2. 官网页面定义表 (doupi_cms_page)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_page`;
CREATE TABLE `doupi_cms_page` (
  `page_id` bigint NOT NULL AUTO_INCREMENT COMMENT '页面ID',
  `page_slug` varchar(100) NOT NULL COMMENT '页面访问路由 (如 / 或 about/campuses)',
  `page_name` varchar(100) NOT NULL COMMENT '页面中文名称',
  `seo_title` varchar(200) DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` varchar(200) DEFAULT NULL COMMENT 'SEO关键字',
  `seo_description` varchar(500) DEFAULT NULL COMMENT 'SEO描述',
  `status` char(1) DEFAULT '0' COMMENT '发布状态: 0=已发布, 1=草稿',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`page_id`),
  UNIQUE KEY `uk_slug` (`page_slug`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网页面定义表';

INSERT INTO `doupi_cms_page` (`page_id`, `page_slug`, `page_name`, `seo_title`, `seo_keywords`, `seo_description`, `status`) VALUES
(1, '/', '官网首页', '汉外华襄复读中心 - 只专注高三 重新出发', '武汉高考复读,湖北高三复读,华襄复读,高考提分', '汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。', '0'),
(2, '/about/introduction', '中心概况', '办学历程与优势 - 汉外华襄', '复读优势,办学历程,华襄概况', '汉外华襄复读中心办学历程与核心优势介绍。', '0'),
(3, '/about/philosophy', '办学理念', '育人主张与初心 - 汉外华襄', '办学理念,育人主张,高考提分', '汉外华襄复读中心教育初心与育人主张。', '0'),
(4, '/about/campuses', '校园实景', '校园环境与硬件设施 - 汉外华襄复读中心', '校园面积,独立校区,寄宿环境,千人礼堂', '在足够好的环境里安心向上，汉外华襄配备130亩独立红砖校园与现代化教学生活设施。', '0'),
(5, '/senior-year/curriculum', '课程体系', '高三科学备考体系 - 汉外华襄', '课程体系,科学备考,分层教学', '新高考科学备考方案与课程体系。', '0'),
(6, '/senior-year/features', '特色课程', '清北领航培优课程 - 汉外华襄', '特色课程,拔尖培优,清北班', '清北领航与个性化培优特色课程体系。', '0'),
(7, '/senior-year/teaching', '教学管理', '精细化作息与日清周结 - 汉外华襄', '教学管理,日清周结,全封闭管理', '精细化时间管理与作息作风规范。', '0'),
(8, '/senior-year/planning', '学年规划', '三轮冲刺备考规划 - 汉外华襄', '学年规划,三轮复习,备考节点', '高三全学年三轮备考关键规划与冲刺。', '0'),
(9, '/faculty/teachers', '名师天团', '师资队伍与特级名师名录 - 汉外华襄复读中心', '高考特级名师,高三功勋班主任,高考教研首席', '特级教师与资深高三功勋团队，小班分层执教，专属学情诊断与答疑。', '0'),
(10, '/faculty/research', '教研成果', '高考命题与校本教研 - 汉外华襄', '教研成果,高考命题,校本题库', '高考命题专家领衔的高考校本教研与题库。', '0'),
(11, '/campus-life/daily', '日常生活', '寄宿与餐饮作息 - 汉外华襄', '校园生活,寄宿管理,餐饮保障', '寄宿作息与星级餐饮后勤保障。', '0'),
(12, '/campus-life/wellbeing', '心身护航', '心理辅导与体能 - 汉外华襄', '心理疏导,体能锻炼,心身护航', '全程学情导师与专业心理疏导护航。', '0'),
(13, '/admissions/plans', '班型设置', '分层编班与班额 - 汉外华襄', '班型设置,分层教学,班额标准', '针对不同基础学生的分层小班设置方案。', '0'),
(14, '/admissions/guide', '招生简章', '招生简章与收费标准 - 汉外华襄', '招生简章,报名条件,收费标准', '权威公布招生政策、录取条件与费用标准。', '0'),
(15, '/admissions/faq', '常见问题', '高三复读招生答疑与热点指南 - 汉外华襄复读中心', '复读收费,招收条件,分层编班,作息管理', '为考生及家长提供全面透明的高三复读就读指南与权威热点解答。', '0'),
(16, '/admissions/consultation', '预约咨询', '在线预约到校诊断 - 汉外华襄', '预约游园,学情诊断,到校咨询', '在线预约参观游园及名师面对面学情诊断。', '0'),
(17, '/news', '新闻资讯', '中心动态官方发文 - 汉外华襄', '新闻资讯,官方通知,中心动态', '官方资讯、动态活动与重要通知发文。', '0'),
(18, '/news/gaokao', '高考动态', '招考政策与分数复盘 - 汉外华襄', '高考动态,招考政策,分数线分析', '全省高招资讯、志愿填报政策与分数复盘。', '0')
ON DUPLICATE KEY UPDATE `page_name`=VALUES(`page_name`), `seo_title`=VALUES(`seo_title`), `seo_keywords`=VALUES(`seo_keywords`), `seo_description`=VALUES(`seo_description`);

-- ----------------------------------------------------------------------------
-- 3. 官网页面动态区块表 (doupi_cms_section)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `doupi_cms_section`;
CREATE TABLE `doupi_cms_section` (
  `section_id` bigint NOT NULL AUTO_INCREMENT COMMENT '区块ID',
  `page_id` bigint NOT NULL COMMENT '所属页面ID',
  `section_type` varchar(50) NOT NULL COMMENT '区块类型: hero, results, intro, reasons, stories, faculty, campus, news, rich_text, faq',
  `section_name` varchar(100) NOT NULL COMMENT '区块别名',
  `sort_order` int DEFAULT 0 COMMENT '排序权重(越小越靠前)',
  `is_visible` tinyint(1) DEFAULT 1 COMMENT '是否可见: 1=可见, 0=隐藏',
  `content_data` json NOT NULL COMMENT '区块专属详细配置JSON',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`section_id`),
  KEY `idx_page_order` (`page_id`, `sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='官网页面动态区块表';

-- 首页 (page_id=1) 初始 8 大核心区块
INSERT INTO `doupi_cms_section` (`section_id`, `page_id`, `section_type`, `section_name`, `sort_order`, `is_visible`, `content_data`) VALUES
(1, 1, 'hero', '首屏品牌巨幕', 1, 1, '{
  "kicker": "ONE YEAR. A NEW POSSIBILITY.",
  "slogan": "不是复读，是再出发",
  "subtitle": "只专注高三。让每一份不甘，都拥有重新抵达的路径。",
  "noteYear": "2026",
  "noteText": "秋季班招生进行中 · 余位 115\n红砖校园 · 专注高三",
  "ctaText": "预约游园 / 诊断 →"
}'),
(2, 1, 'results', '核心办学成效战报看板', 2, 1, '{
  "kicker": "2026 RESULTS",
  "items": [
    { "n": "92.6%", "label": "2026 届本科上线率" },
    { "n": "+86", "label": "平均提分（分）" },
    { "n": "318", "label": "600 分以上人数" },
    { "n": "146", "label": "双一流院校录取" }
  ]
}'),
(3, 1, 'intro', '办学理念引言', 3, 1, '{
  "kicker": "A FOCUSED YEAR",
  "title": "用更精准的一年，再攀一程",
  "desc": "汉外华襄复读中心面向高三阶段学生，围绕成绩诊断、分层教学、学习管理与心理支持，构建专属的高考复读成长方案。"
}'),
(4, 1, 'reasons', '四大办学优势与特色', 4, 1, '{
  "kicker": "WHY HUAXIANG",
  "title": "为什么选择华襄四大理由",
  "items": [
    { "t": "专注高三，全封闭管理", "d": "纯高三沉浸式备考场域，排除一切外界干扰，作息规律精细到分，培养持久专注力。", "to": "/senior-year/teaching" },
    { "t": "分层教学，小班精准提分", "d": "根据入学学情深度诊断，精准编入契合层级，针对性突破薄弱板块，告别大班水土不服。", "to": "/senior-year/curriculum" },
    { "t": "名师执教，功勋高考天团", "d": "特级教师领衔把关，平均教龄15年以上，深谙新高考命题规律与提分踩分点。", "to": "/faculty/teachers" },
    { "t": "心身护航，全程导师陪伴", "d": "专属学情导师每周复盘，专业心理疏导缓解焦虑，强健体魄与阳光心态并重。", "to": "/campus-life/wellbeing" }
  ]
}'),
(5, 1, 'stories', '学子提分逆袭故事', 5, 1, '{
  "kicker": "STUDENT STORIES",
  "title": "他们，重新抵达"
}'),
(6, 1, 'faculty', '名师天团聚光灯', 6, 1, '{
  "kicker": "FACULTY SPOTLIGHT",
  "title": "特级名师与资深高三功勋团队",
  "subtitle": "源于省级重点示范中学教学底蕴，用专业与耐心点亮每个少年的高考逆袭之路。"
}'),
(7, 1, 'campus', '走进校园与环境指标', 7, 1, '{
  "kicker": "OUR CAMPUS",
  "title": "在足够好的环境里，安心向上",
  "statCampus": [
    { "n": "130", "label": "亩校园面积" },
    { "n": "12", "label": "万㎡建筑面积" },
    { "n": "1100", "label": "人千人礼堂" },
    { "n": "10", "label": "万册图书馆藏" }
  ]
}'),
(8, 1, 'news', '此刻，正在发生（公文与高招）', 8, 1, '{
  "kicker": "FROM HUAXIANG",
  "title": "此刻，正在发生"
}')
ON DUPLICATE KEY UPDATE `content_data`=VALUES(`content_data`), `section_name`=VALUES(`section_name`);
