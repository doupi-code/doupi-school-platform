# 豆皮综合管理后台 (doupi-web-admin-react)

> 汉外华襄复读学校后台管理端，基于 **React 19 + TypeScript + Vite 8 + Ant Design / ProComponents** 现代前端工程。

## 1. 核心特性
- **基准子路径适配**：支持子目录 `/admin` 原生发布，与 Nginx 规则无缝贴合。
- **动态菜单与权限鉴权**：根据后端用户角色动态拉取菜单树，支持按钮级鉴权指令。
- **现代化组件封装**：采用 ProTable / ProForm 高级组件，标准化查询、分页与表单交互。

## 2. 快速上手
```bash
# 安装依赖
npm install

# 本地启动开发环境 (默认监听 5174 端口，自动代理 API)
npm run dev

# 生产环境编译构建
npm run build
```

## 3. 部署架构
- **生产环境**：由 Nginx 在 `/admin` 路径托管 `/var/www/doupi-web-admin/dist`。
- **测试环境**：由 Nginx 在 `8081` 独立端口托管 `/var/www/doupi-web-admin-test/dist`。
- **CI/CD**：由 GitHub Actions 流水线 `.github/workflows/deploy-admin.yml` 自动编译并分发。
