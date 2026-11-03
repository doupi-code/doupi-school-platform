-- 网站备案配置增量升级（MySQL 8.0+）。仅补缺失字段，保留已有页脚及管理员配置，可重复执行。
-- 执行后在后台“全局导航与页脚 → 底部 Footer 页脚”保存一次，
-- 由既有 CMS 保存接口清除 cms:global:footer 与 cms:page:render:* 缓存。
-- 不保存时，旧 CMS 缓存最多保留 30 分钟；前端仍兼容缺失的新字段。
SET NAMES utf8mb4;

INSERT INTO doupi_cms_global (category, config_content, remark)
VALUES ('footer', JSON_OBJECT(
    'icp', '鄂ICP备2026055716号-1',
    'icpUrl', 'https://beian.miit.gov.cn/',
    'policeBeian', '鄂公网安备42011102006651号',
    'policeBeianUrl', 'https://beian.mps.gov.cn/#/query/webSearch?code=42011102006651'
), '官网全站底部页脚配置')
ON DUPLICATE KEY UPDATE config_content = JSON_INSERT(config_content,
    '$.icp', '鄂ICP备2026055716号-1',
    '$.icpUrl', 'https://beian.miit.gov.cn/',
    '$.policeBeian', '鄂公网安备42011102006651号',
    '$.policeBeianUrl', 'https://beian.mps.gov.cn/#/query/webSearch?code=42011102006651'
);
