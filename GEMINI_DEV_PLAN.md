# 豆皮校园管理平台 — Gemini 开发执行计划

> **本文档是给 AI 编码助手（Gemini / Antigravity）的结构化开发指令。**
> 按照阶段顺序逐步执行，每完成一个阶段需要确认后再进入下一阶段。

---

## 项目背景

这是一个私立高中（高三 + 高考复读）的校园管理平台，包含 5 个子项目：
- `doupi-server/` — Java 后端（Spring Boot 4 + JDK 17 + MyBatis + MySQL 8 + Redis）**已完成，需安全加固**
- `doupi-web-admin-react/` — Web 管理后台 **🆕 需从零用 React 19 构建**
- `doupi-web-client-react/` — Web 用户端/官网 **🆕 需从零用 React 19 构建**
- `doupi-app-client/` — 微信小程序家长端 **已完成，需优化**
- `doupi-app-admin/` — 微信小程序管理端 **已完成，需优化**

原有的 Vue 前端代码已备份到 `back/doupi-full-backup-20260930/` 中，其中的业务逻辑和 API 调用可作为参考。

## 服务器约束

- 4 核 4G 内存，SSD 40-60GB，带宽 3-5 Mbps
- 必须精细化资源分配

---

## 阶段一：后端安全加固（最高优先级）

### 任务 1.1：微信网关鉴权改造

**目标**：消除 `/api/wx/**` 的 `permitAll()` 裸奔状态

**操作步骤**：
1. 读取 `doupi-server/doupi-framework/src/main/java/com/doupi/framework/config/SecurityConfig.java`
2. 将 `/api/wx/**` 从 `permitAll()` 中移除（仅保留 `/api/wx/auth/login` 为公开接口）
3. 创建 `WxJwtAuthFilter.java`：
   - 拦截 `/api/wx/**`（除 login 外）
   - 从 Header `Authorization: Bearer wx_xxx` 中提取 Token
   - 使用现有的 `TokenService` 验证 JWT 签名和有效期
   - 解析出 openid + role，设置到 SecurityContext
4. 在 SecurityConfig 中注册此 Filter

**参考文件**：
- `doupi-server/doupi-framework/src/main/java/com/doupi/framework/security/filter/JwtAuthenticationTokenFilter.java`（Web 端的 JWT 过滤器，可参考）
- `doupi-server/doupi-framework/src/main/java/com/doupi/framework/web/service/TokenService.java`

### 任务 1.2：微信网关重构（策略模式）

**目标**：将 500+ 行的 switch-case 上帝类拆分为独立 Handler

**操作步骤**：
1. 读取 `doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/DoupiWxDispatcherController.java`
2. 定义接口 `WxActionHandler`：
   ```java
   public interface WxActionHandler {
       String getAction();
       Object handle(Map<String, Object> payload, String openid);
   }
   ```
3. 为每个 action 创建独立 Handler 类（如 `AppointmentCreateHandler`, `AppointmentListHandler` 等）
4. 重构 Dispatcher 使用 `Map<String, WxActionHandler>` 自动路由
5. 移除所有硬编码角色判定（手机尾号 `8888`/`0000`）

### 任务 1.3：Druid 安全加固

**操作步骤**：
1. 读取 `doupi-server/doupi-admin/src/main/resources/application-druid.yml`
2. 修改 Druid 监控配置：设置强密码 + IP 白名单（或生产环境关闭）
3. 修改 `application.yml` 中 Tomcat `max-threads` 从 800 降为 200-300

### 任务 1.4：Redis 配置优化

**操作步骤**：
1. 在 `application.yml` 中将 Redis `max-active` 从 8 提升到 32
2. 设置 `max-idle: 16`, `min-idle: 4`

---

## 阶段二：React 管理端脚手架搭建

### 任务 2.1：初始化项目

**在 `doupi-web-admin-react/` 目录下执行**：

```bash
npm create vite@latest . -- --template react-ts
npm install react@19 react-dom@19
npm install antd@6 @ant-design/icons @ant-design/pro-components
npm install react-router-dom@6 zustand axios js-cookie
npm install echarts echarts-for-react
npm install -D @types/js-cookie tailwindcss @tailwindcss/vite
```

### 任务 2.2：基础架构搭建

按照以下目录结构创建项目骨架：

```
src/
├── api/                   # API 接口层
│   ├── request.ts         # Axios 封装（参考旧项目 doupi-web-admin/src/utils/request.js）
│   ├── login.ts
│   ├── recruit/
│   ├── edu/
│   ├── stock/
│   └── system/
├── components/            # 通用组件
│   ├── Authorized.tsx     # 权限组件
│   ├── DictTag.tsx        # 字典标签
│   └── FileDropUpload.tsx # 拖拽上传（参考旧项目 doupi-web-admin/src/components/FileDropPasteUpload/）
├── hooks/
│   ├── useDict.ts
│   ├── usePermission.ts
│   └── useECharts.ts
├── layouts/
│   ├── BasicLayout.tsx    # Ant Design Pro 布局
│   └── ScreenLayout.tsx   # 大屏布局
├── pages/                 # 页面
├── router/
│   ├── index.tsx
│   └── dynamicRoutes.ts
├── store/
│   ├── useUserStore.ts
│   ├── usePermStore.ts
│   └── useDictStore.ts
├── styles/
│   └── theme.ts           # Ant Design 6 主题 Token
├── utils/
└── App.tsx
```

### 任务 2.3：核心基础设施

必须首先实现：
1. **Axios 拦截器** (`api/request.ts`)：JWT Token 自动注入、401 跳转登录、错误提示
2. **登录页** (`pages/login/`)：参考旧项目 `back/doupi-full-backup-20260930/doupi-web-admin/src/views/login.vue`
3. **动态路由** (`router/dynamicRoutes.ts`)：从后端 `/getRouters` 获取菜单树，动态注册路由
4. **权限控制**：`usePermission` Hook + `<Authorized>` 组件
5. **字典数据**：`useDict` Hook，从后端获取字典并缓存

### 任务 2.4：Ant Design 6 主题配置

```typescript
// styles/theme.ts
import type { ThemeConfig } from 'antd';

export const doupiTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3088F4',
    colorSuccess: '#2DC84D',
    colorWarning: '#FF6B35',
    colorError: '#F53F3F',
    borderRadius: 8,
    fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};
```

---

## 阶段三：核心业务页面迁移

### 迁移原则
- **参考旧代码**：所有旧 Vue 页面在 `back/doupi-full-backup-20260930/doupi-web-admin/src/views/` 中
- **API 接口不变**：后端接口保持不变，直接复用旧项目的 API 路径
- **标准 CRUD 页面**：使用 Ant Design ProTable 模板快速生成
- **复杂页面**：逐个重构

### 任务 3.1：系统管理模块（12 个页面）

迁移 `system/` 目录下的所有页面：
- 用户管理、角色管理、菜单管理、部门管理、岗位管理、字典管理、参数设置、通知公告
- 这些全部是标准 CRUD，用 ProTable + ProForm 快速实现
- 参考旧代码：`back/doupi-full-backup-20260930/doupi-web-admin/src/views/system/`
- 参考旧 API：`back/doupi-full-backup-20260930/doupi-web-admin/src/api/system/`

### 任务 3.2：监控模块（6 个页面）

仅迁移：在线用户、操作日志、登录日志、缓存管理、缓存列表、定时任务
- **不迁移**：服务监控、Druid 监控、表单构建、代码生成、Swagger（生产环境砍掉）

### 任务 3.3：招生管理模块（6 个页面）

按优先级迁移：
1. `recruit/appointment/` — 预约列表管理（标准 CRUD + 快捷核销操作）
2. `recruit/dashboard/` — 招生看板（自定义卡片 + ECharts 图表）
3. `recruit/verify/` — 核销页面（大字体核销码输入 + 扫码枪支持）
4. `recruit/binding/` — 教师绑定管理
5. `recruit/campus/` — 校区管理
6. `recruit/config/` — 排班时段配置

### 任务 3.4：教务管理模块（5 个页面）

1. `edu/class/` — 班级管理（标准 CRUD）
2. `edu/teacher/` — 教师管理（标准 CRUD）
3. `edu/record/` — **文印登记（最复杂，2000+ 行 Vue 代码）**
   - 重构为 3 步骤表单：① 上传截图/粘贴文字 → ② OCR 结果确认 → ③ 提交
   - 必须迁移 `FileDropPasteUpload` 拖拽粘贴上传组件
4. `edu/celebration/` — 庆典管理
5. `edu/report/` — 文印统计报表

### 任务 3.5：库存管理模块（9 个页面）

1. `stock/goods/` — 物品管理
2. `stock/supplier/` — 供应商管理
3. `stock/in/` — 入库单（主子表结构，用 Drawer 替代弹窗）
4. `stock/out/` — 出库单
5. `stock/inItem/` — 入库明细
6. `stock/outItem/` — 出库明细
7. `stock/check/` — 盘点管理
8. `stock/report/detail` — 明细报表
9. `stock/report/monthly` — 月度台账

### 任务 3.6：数据大屏（2 个页面）

- `screen/index` — **招生数据全景大屏（最复杂，3000 行 Vue 代码）**
  - 使用独立的 `ScreenLayout.tsx`（全屏无侧边栏）
  - ECharts 图表组件化拆分（每个区域一个组件）
  - SSE 实时数据通过 `EventSource` 接入
  - 自适应缩放（CSS scale + rem 方案）
- `screen/celebration` — 庆典大屏

### 任务 3.7：首页仪表盘 + 锁屏

- 角色自适应仪表盘：管理员看运营 KPI，教务看待办任务
- 锁屏功能迁移

---

## 阶段四：Web 用户端开发

### 任务 4.1：初始化项目

**在 `doupi-web-client-react/` 目录下**：

```bash
npm create vite@latest . -- --template react-ts
npm install react@19 react-dom@19
npm install react-router-dom@6 axios
npm install -D tailwindcss @tailwindcss/vite
```

### 任务 4.2：页面开发

参考已有的 React 骨架：`back/doupi-full-backup-20260930/doupi-web-client/figma_make设计文档*/`

1. **首页** — Hero Banner + 学校亮点 + 快速预约入口
2. **学校概况** — 办学理念、校史、荣誉
3. **师资团队** — 教师卡片网格
4. **校园风貌** — 图片/视频画廊
5. **在线预约** — 步骤式表单，调用 `/api/wx/dispatcher` 接口
6. **预约查询** — 手机号 + 核销码查询

### 任务 4.3：SEO 优化

- 页面 TDK（Title/Description/Keywords）配置
- 静态预渲染或 SSG

---

## 阶段五：小程序优化

### 任务 5.1：安全加固

1. 将两端的 `app.js` 中 `http://localhost:8080` 替换为环境变量配置
2. 修改 `utils/cloudClient.js` 和 `utils/request.js` 接入后端改造后的真实 JWT Token
3. 移除假 Token (`wx_tk_`) 逻辑

### 任务 5.2：代码复用

1. 创建 `doupi-mp-shared/` 目录，提取两端共享的 144 个相同文件
2. 编写同步脚本 `scripts/sync-shared.js`

### 任务 5.3：包体积优化

1. 管理端移除未使用的 `custom-tab-bar` 目录
2. 图片资源上 CDN
3. 配置微信分包加载

---

## 阶段六：联调测试与部署

### 任务 6.1：Docker 部署

参考 `docs/06-各端部署方案.md` 创建 `docker-compose.production.yml`

### 任务 6.2：Nginx 配置

创建反向代理配置，路由规则：
- `/` → Web 用户端静态文件
- `/admin/` → Web 管理端静态文件
- `/api/` → Java 后端 (:8080)
- SSL 证书 + Gzip 压缩

### 任务 6.3：全端联调测试

参考 `docs/05-各端测试方案.md` 执行核心测试用例

---

## 执行规则

1. **每个任务完成后运行项目确认可用**再进入下一个
2. **不要修改后端 API 接口路径**，前端适配已有接口
3. **旧代码在 `back/doupi-full-backup-20260930/` 中**，随时可以参考
4. **Ant Design 6 主题色统一使用 `#3088F4`**
5. **所有代码使用 TypeScript**，严格模式
6. **遇到不确定的业务逻辑，先读旧代码再实现**
