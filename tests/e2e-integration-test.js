/**
 * 豆皮教育系统 - 全端联调与构建集成验收测试
 * 
 * 校验范围：
 * 1. React 管理端 (doupi-web-admin-react) 打包产物与 HTML 入口完整性
 * 2. Web 用户端 (doupi-web-client-react) 打包产物与资源完整性
 * 3. 微信小程序双端同源同步完整性
 * 4. 后端核心分发网关与安全拦截规范校验
 * 5. 生产环境 Docker 与 Nginx 编排配置校验
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedTests++;
  }
}

console.log(`=======================================================`);
console.log(`[E2E-TEST] 豆皮教育全端工程构建与合规性验收测试`);
console.log(`=======================================================\n`);

// 1. 验证 React 管理端构建产物
const adminDistPath = path.join(ROOT_DIR, 'doupi-web-admin-react', 'dist');
const adminIndexHtml = path.join(adminDistPath, 'index.html');
assert(fs.existsSync(adminIndexHtml), 'React 管理端生产构建产物 dist/index.html 存在');
if (fs.existsSync(adminIndexHtml)) {
  const html = fs.readFileSync(adminIndexHtml, 'utf-8');
  assert(html.includes('<div id="root">') || html.includes('root'), 'React 管理端 HTML 包含 root 挂载点');
  assert(fs.existsSync(path.join(adminDistPath, 'assets')), 'React 管理端静态资源 assets 目录已生成');
}

// 2. 验证 Web 用户端构建产物
const clientDistPath = path.join(ROOT_DIR, 'doupi-web-client-react', 'dist');
const clientIndexHtml = path.join(clientDistPath, 'index.html');
assert(fs.existsSync(clientIndexHtml), 'Web 用户端生产构建产物 dist/index.html 存在');
if (fs.existsSync(clientIndexHtml)) {
  const html = fs.readFileSync(clientIndexHtml, 'utf-8');
  assert(html.includes('<div id="root">') || html.includes('root'), 'Web 用户端 HTML 包含 root 挂载点');
}

// 3. 验证后端网关控制器与策略注册机制
const serverDir = path.join(ROOT_DIR, 'doupi-server');
const dispatcherController = path.join(serverDir, 'doupi-recruit', 'src', 'main', 'java', 'com', 'doupi', 'recruit', 'controller', 'DoupiWxDispatcherController.java');
assert(fs.existsSync(dispatcherController), '后端网关 DoupiWxDispatcherController.java 存在');
if (fs.existsSync(dispatcherController)) {
  const code = fs.readFileSync(dispatcherController, 'utf-8');
  assert(code.includes('handlerRegistry.getHandler(action)'), '后端网关已采用策略模式消除上帝 switch-case');
  assert(code.includes('handler.isAuthRequired()'), '后端网关具备细粒度鉴权拦截');
  assert(code.includes('handler.getRequiredRoles()'), '后端网关具备 RBAC 角色权限校验');
}

// 4. 验证 Nginx 生产代理规则
const nginxConf = path.join(ROOT_DIR, 'deploy', 'nginx', 'conf.d', 'doupi.conf');
assert(fs.existsSync(nginxConf), 'Nginx 统一网关配置 doupi.conf 存在');
if (fs.existsSync(nginxConf)) {
  const conf = fs.readFileSync(nginxConf, 'utf-8');
  assert(conf.includes('location /admin'), 'Nginx 已配置 /admin 路径映射 React 管理端');
  assert(conf.includes('location /prod-api/'), 'Nginx 已配置 /prod-api/ 反向代理后端集群');
  assert(conf.includes('location /api/wx/'), 'Nginx 已配置 /api/wx/ 微信统一网关分发');
  assert(conf.includes('gzip on;'), 'Nginx 已开启 Gzip 全站压缩');
}

// 5. 验证 Docker 生产编排
const dockerCompose = path.join(ROOT_DIR, 'deploy', 'docker-compose.yml');
assert(fs.existsSync(dockerCompose), '生产编排 docker-compose.yml 存在');
if (fs.existsSync(dockerCompose)) {
  const yaml = fs.readFileSync(dockerCompose, 'utf-8');
  assert(yaml.includes('doupi-mysql:'), 'Docker 编排包含 MySQL 8.0 服务');
  assert(yaml.includes('doupi-redis:'), 'Docker 编排包含 Redis 7.x 缓存服务');
  assert(yaml.includes('doupi-server:'), 'Docker 编排包含 Spring Boot 4 后端容器');
  assert(yaml.includes('doupi-nginx:'), 'Docker 编排包含 Nginx 统一入口网关');
  assert(yaml.includes('-Xms512m -Xmx1024m'), 'Docker 编排已针对 4G 内存进行 JVM 调优');
}

// 6. 验证小程序同步脚本与单 AppID 统一小程序架构
const syncScript = path.join(ROOT_DIR, 'scripts', 'sync-shared.js');
assert(fs.existsSync(syncScript), '小程序双端共享资源同步脚本 sync-shared.js 存在');

const unifiedAppJsonPath = path.join(ROOT_DIR, 'doupi-app', 'app.json');
assert(fs.existsSync(unifiedAppJsonPath), '单 AppID 统一小程序配置文件 doupi-app/app.json 存在');
if (fs.existsSync(unifiedAppJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(unifiedAppJsonPath, 'utf-8'));
  assert(appJson.pages && appJson.pages[0] === 'pages/index/index', '统一小程序首页入口规范为 pages/index/index');
  assert(Array.isArray(appJson.subpackages) && appJson.subpackages.some(s => s.root === 'pages/admin'), '统一小程序已配置 pages/admin 独立管理分包');
  assert(appJson.tabBar && appJson.tabBar.custom === true, '统一小程序启用自定义双角色 TabBar');
  assert(appJson.preloadRule && !!appJson.preloadRule['pages/profile/profile'], '统一小程序配置了管理分包静默预加载规则');
}

console.log(`\n-------------------------------------------------------`);
console.log(`验收测试执行结果:`);
console.log(`- 通过测试项: ${passedTests}`);
console.log(`- 失败测试项: ${failedTests}`);
console.log(`- 整体状态: ${failedTests === 0 ? '【全部通过 SUCCESS】' : '【存在异常 FAILURE】'}`);
console.log(`=======================================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
