/**
 * 豆皮教育系统 - 全模块功能完整性与交付物核验脚本
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const checkResults = {
  backend: [],
  adminWeb: [],
  clientWeb: [],
  miniPrograms: [],
  deployment: [],
};

function checkFile(category, name, relativePath, requirementDesc) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const exists = fs.existsSync(fullPath);
  let detail = '';
  if (exists) {
    const stats = fs.statSync(fullPath);
    detail = stats.isDirectory() ? '目录存在' : `${(stats.size / 1024).toFixed(1)} KB`;
  }
  checkResults[category].push({
    name,
    path: relativePath,
    exists,
    detail,
    requirement: requirementDesc
  });
}

console.log('正在执行全项目功能完整性核验...\n');

// 1. 后端功能模块 (doupi-server)
const backendItems = [
  ['系统基础 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/system/SysUserController.java', '系统用户增删改查、分配角色'],
  ['系统角色 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/system/SysRoleController.java', '系统角色权限与数据权限维护'],
  ['系统菜单 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/system/SysMenuController.java', '动态路由菜单树结构提供'],
  ['教务文印 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/edu/EduPrintRecordController.java', '教务文印审批与登记'],
  ['教务教师 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/edu/EduTeacherController.java', '教师花名册档案管理'],
  ['教务班级 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/edu/EduClassController.java', '班级列表与学员归属'],
  ['教务庆典 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/edu/EduCelebrationController.java', '校园庆典活动与排期'],
  ['库存物资 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/stock/StockGoodsController.java', '库存物资基本档案'],
  ['库存出入库 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/stock/StockInController.java', '物资入库单与审核'],
  ['库存出库 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/stock/StockOutController.java', '物资出库领用单'],
  ['库存盘点 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/stock/StockCheckController.java', '库存盘点与损益台账'],
  ['大屏监控 Controller', 'doupi-server/doupi-admin/src/main/java/com/doupi/web/controller/screen/DoupiScreenController.java', '招生全景大屏与实时推送'],
  ['招生预约 Controller', 'doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/DoupiRecruitAppointmentController.java', '访校预约管理与状态变更'],
  ['招生微信网关分发器', 'doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/DoupiWxDispatcherController.java', '策略模式轻量网关分发器'],
  ['网关 Action 处理器集', 'doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/handler/impl', '14个独立拆分的安全处理器'],
  ['后端打包产物 JAR', 'doupi-server/doupi-admin/target/doupi-admin.jar', 'Spring Boot 4 生产可执行 JAR']
];

backendItems.forEach(([name, p, desc]) => checkFile('backend', name, p, desc));

// 2. React 管理端 (doupi-web-admin-react)
const adminItems = [
  ['仪表盘工作台', 'doupi-web-admin-react/src/pages/dashboard/index.tsx', '角色自适应工作台与 KPI 汇总'],
  ['全景数据大屏', 'doupi-web-admin-react/src/pages/screen/index.tsx', '1920x1080 数字化招生监控大屏'],
  ['用户管理页面', 'doupi-web-admin-react/src/pages/system/user/index.tsx', '用户列表、状态开关、重置密码'],
  ['角色管理页面', 'doupi-web-admin-react/src/pages/system/role/index.tsx', '角色赋权、菜单授权树'],
  ['菜单管理页面', 'doupi-web-admin-react/src/pages/system/menu/index.tsx', '动态路由菜单增删改'],
  ['部门管理页面', 'doupi-web-admin-react/src/pages/system/dept/index.tsx', '组织架构树形维护'],
  ['字典管理页面', 'doupi-web-admin-react/src/pages/system/dict/index.tsx', '数据字典类型与键值维护'],
  ['参数设置页面', 'doupi-web-admin-react/src/pages/system/config/index.tsx', '全局业务与系统参数键值'],
  ['通知公告页面', 'doupi-web-admin-react/src/pages/system/notice/index.tsx', '全校通知公告发布与展示'],
  ['招生看板页面', 'doupi-web-admin-react/src/pages/recruit/dashboard/index.tsx', '招生转化漏斗与统计图表'],
  ['预约记录页面', 'doupi-web-admin-react/src/pages/recruit/appointment/index.tsx', '访校预约审核、改期与导出'],
  ['现场核销页面', 'doupi-web-admin-react/src/pages/recruit/verify/index.tsx', '入校核销码/扫码核销登记'],
  ['教师绑定页面', 'doupi-web-admin-react/src/pages/recruit/binding/index.tsx', '招生老师与专属二维码绑定审核'],
  ['校区信息页面', 'doupi-web-admin-react/src/pages/recruit/campus/index.tsx', '校区图文风采与基本信息维护'],
  ['招生配置页面', 'doupi-web-admin-react/src/pages/recruit/config/index.tsx', '访校预约时段与规则配置'],
  ['文印登记页面', 'doupi-web-admin-react/src/pages/edu/record/index.tsx', '文印打印分步审批与台账'],
  ['极速上传组件', 'doupi-web-admin-react/src/components/FileDropUpload/index.tsx', '拖拽及剪贴板粘贴直接上传附件'],
  ['教师档案页面', 'doupi-web-admin-react/src/pages/edu/teacher/index.tsx', '教职工档案花名册'],
  ['班级管理页面', 'doupi-web-admin-react/src/pages/edu/class/index.tsx', '班级年级列表管理'],
  ['校园庆典页面', 'doupi-web-admin-react/src/pages/edu/celebration/index.tsx', '大型活动与庆典排期管理'],
  ['教务报表页面', 'doupi-web-admin-react/src/pages/edu/report/index.tsx', '教务文印汇总与月度趋势报表'],
  ['物资品类页面', 'doupi-web-admin-react/src/pages/stock/goods/index.tsx', '库存物资基本信息与阈值预警'],
  ['供应商页面', 'doupi-web-admin-react/src/pages/stock/supplier/index.tsx', '供应商档案管理'],
  ['入库单管理', 'doupi-web-admin-react/src/pages/stock/in/index.tsx', '物资入库单创建与审批'],
  ['出库单管理', 'doupi-web-admin-react/src/pages/stock/out/index.tsx', '物资出库申请与领用审批'],
  ['物资盘点页面', 'doupi-web-admin-react/src/pages/stock/check/index.tsx', '库存盘点录入与盈亏计算'],
  ['库存明细报表', 'doupi-web-admin-react/src/pages/stock/report/detail.tsx', '物资出入库流水明细台账'],
  ['库存月度报表', 'doupi-web-admin-react/src/pages/stock/report/monthly.tsx', '按月度维度统计物资进销存总账'],
  ['在线用户监控', 'doupi-web-admin-react/src/pages/monitor/online/index.tsx', '当前在线 Session 强退与查询'],
  ['操作日志监控', 'doupi-web-admin-react/src/pages/monitor/operlog/index.tsx', '管理员业务操作留痕审计'],
  ['登录日志监控', 'doupi-web-admin-react/src/pages/monitor/logininfor/index.tsx', '登录日志与异常 IP 拦截审计'],
  ['定时任务监控', 'doupi-web-admin-react/src/pages/monitor/job/index.tsx', 'Quartz 任务增删改查与即时执行'],
  ['缓存监控页面', 'doupi-web-admin-react/src/pages/monitor/cache/index.tsx', 'Redis 内存占用/命令统计图表'],
  ['管理端构建产物', 'doupi-web-admin-react/dist/index.html', 'Vite 生产打包静态资源文件']
];

adminItems.forEach(([name, p, desc]) => checkFile('adminWeb', name, p, desc));

// 3. Web 用户端 (doupi-web-client-react)
const clientItems = [
  ['门户首页', 'doupi-web-client-react/src/pages/home/index.tsx', '校园品牌宣传与特色展示首页'],
  ['关于学校', 'doupi-web-client-react/src/pages/about/index.tsx', '办学理念、历史沿革与校园环境'],
  ['名师风采', 'doupi-web-client-react/src/pages/teachers/index.tsx', '特级教师与骨干名师团队介绍'],
  ['校园风采', 'doupi-web-client-react/src/pages/gallery/index.tsx', '校区相册与校园环境画廊'],
  ['在线访校预约', 'doupi-web-client-react/src/pages/appointment/index.tsx', '家长在线预约提交并生成核销码'],
  ['预约记录查询', 'doupi-web-client-react/src/pages/query/index.tsx', '手机号一键查询名下预约状态与核销凭证'],
  ['客户端网关通信', 'doupi-web-client-react/src/api/dispatcher.ts', '统一微信/Web网关调用封装'],
  ['用户端构建产物', 'doupi-web-client-react/dist/index.html', 'Vite 生产打包静态资源文件']
];

clientItems.forEach(([name, p, desc]) => checkFile('clientWeb', name, p, desc));

// 4. 微信小程序 (统一单 AppID 架构 doupi-app 及独立端)
const miniItems = [
  ['单AppID统一小程序配置', 'doupi-app/app.json', '包含主包14个页面与pages/admin独立分包23个页面'],
  ['统一小程序网络层', 'doupi-app/utils/cloudClient.js', '真实 Bearer Token 注入与 401 自动清理'],
  ['统一小程序管理大盘', 'doupi-app/pages/admin/dashboard/dashboard.js', '教师工作台主入口与返回门户首页联动'],
  ['统一小程序自定义TabBar', 'doupi-app/custom-tab-bar/index.js', '动态两项主底栏导航'],
  ['客户端小程序配置', 'doupi-app-client/app.json', '包含14个用户端页面定义与TabBar'],
  ['管理端小程序配置', 'doupi-app-admin/app.json', '包含26个移动工作台管理页面定义'],
  ['双端公共文件同步', 'scripts/sync-shared.js', '保障小程序双端公共工具与样式的一致性']
];

miniItems.forEach(([name, p, desc]) => checkFile('miniPrograms', name, p, desc));

// 5. 生产部署与基础设施 (deploy)
const deployItems = [
  ['Docker 生产编排', 'deploy/docker-compose.yml', 'MySQL 8.0 + Redis 7.2 + Spring Boot + Nginx 集群'],
  ['Nginx 统一网关配置', 'deploy/nginx/conf.d/doupi.conf', '反代、Gzip全站加速、静态缓存与SSE透传'],
  ['后端生产 Dockerfile', 'deploy/docker/Dockerfile.server', 'Java 17 JRE 镜像构建、字体与OCR依赖'],
  ['环境变量模板文件', 'deploy/.env.example', '生产环境安全密钥与配置项模板'],
  ['一键编译启动(Linux)', 'deploy/deploy.sh', '生产云服务器自动化全链路打包与启动脚本'],
  ['一键编译启动(Win)', 'deploy/deploy.bat', 'Windows 本地与测试服务器一键批处理启动脚本'],
  ['数据库自动备份脚本', 'deploy/backup-db.sh', '每日定时热备份与过期归档删除']
];

deployItems.forEach(([name, p, desc]) => checkFile('deployment', name, p, desc));

// 输出统计报告
let totalCount = 0;
let successCount = 0;

for (const [key, list] of Object.entries(checkResults)) {
  totalCount += list.length;
  successCount += list.filter(item => item.exists).length;
}

console.log('=======================================================');
console.log(`[核验汇总] 检查项总数: ${totalCount} | 已交付完成: ${successCount} | 缺失: ${totalCount - successCount}`);
console.log(`[完整度] ${((successCount / totalCount) * 100).toFixed(1)}%`);
console.log('=======================================================\n');

fs.writeFileSync(path.join(ROOT_DIR, 'COMPLETENESS_AUDIT_REPORT.json'), JSON.stringify(checkResults, null, 2), 'utf-8');
