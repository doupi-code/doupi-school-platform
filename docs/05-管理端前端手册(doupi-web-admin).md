# 05 - 管理端前端手册 (doupi-web-admin)

## 1. 技术架构选型
- **底层库**：React 19 + TypeScript
- **构建工程**：Vite 8 (秒级冷启动与极速 HMR)
- **UI 组件库**：Ant Design 5 + `@ant-design/pro-components` (ProTable / ProForm / ProLayout)
- **网络层**：Axios + 全局响应拦截与 Token 自动续期
- **路由系统**：React Router 6 (配置 Base 路径 `/admin`)

---

## 2. 工程目录结构
```
doupi-web-admin-react/
├── src/
│   ├── api/            # 模块化后端 API 接口封装 (login, user, stock, edu, cms)
│   ├── assets/         # 平台静态图标、徽标与占位图
│   ├── components/     # 全局业务公共组件 (字典选择器、导入导出、图片上传)
│   ├── layouts/        # 主框架布局 (BasicLayout, UserLayout)
│   ├── pages/          # 业务功能页面
│   │   ├── dashboard/  # 数字化看板大屏
│   │   ├── edu/        # 教务班级、名师排课
│   │   ├── stock/      # 物资库存、文印试卷审批流、领料记录
│   │   ├── recruit/    # 招生预约单、访校线索管理
│   │   ├── cms/        # 官网内容发布与审核
│   │   └── system/     # 用户、角色、菜单权限与字典维护
│   ├── utils/          # Token 存取、请求封装、日期格式化
│   └── App.tsx         # 根应用组件与路由挂载
├── package.json
└── vite.config.ts      # Vite 编译配置与本地代理转发
```

---

## 3. 核心机制设计

### 3.1 子路径路由适配 (`/admin`)
由于生产环境 Nginx 配置将根路径 `/` 分配给了对外门户官网，管理端统一运行于 `/admin` 前缀下。在 `vite.config.ts` 中声明 `base: '/admin/'`，并在前端路由中设置 `basename: '/admin'`：
```typescript
// vite.config.ts
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  // ...
});
```

### 3.2 动态权限菜单生成
用户登录成功后，前端从后端 `/prod-api/getRouters` 异步获取菜单权限树，经过 `formatRoutes` 规范化为 ProLayout 可识别的菜单结构，并动态渲染路由。

### 3.3 本地开发代理 (Proxy)
本地运行 `npm run dev` 时，可通过 Vite Proxy 直接将请求代理到生产/测试服务器，本地完全不需要安装和启动后端与数据库：
```typescript
// vite.config.ts
server: {
  port: 5174,
  proxy: {
    '/prod-api': {
      target: 'http://101.43.58.160:8081', // 指向云端测试环境
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/prod-api/, ''),
    },
  },
}
```
