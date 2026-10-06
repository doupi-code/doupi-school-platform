# 汉外华襄学校综合教育管理与门户平台 (Doupi Platform)

> **武汉汉外华襄复读学校官方综合数字化平台**：涵盖现代化官网门户、教务管理中台、招生预约体系、物资与文印进销存，支持多端前后端分离协同，采用**纯原生环境部署（无 Docker）**与物理级环境隔离。

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x%20%2F%204.x-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![JDK](https://img.shields.io/badge/JDK-17-blue.svg)](https://openjdk.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-4479a1.svg)](https://www.mysql.com/)
[![Nginx](https://img.shields.io/badge/Nginx-1.24-009639.svg)](https://nginx.org/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088ff.svg)](https://github.com/features/actions)

---

## 1. 平台架构与工程目录

本项目采用业界主流的 **Monorepo（单仓聚合）** 架构进行代码资产管理，前后端联动改动原子提交，并通过 GitHub Actions 路径过滤实现各端独立构建发布：

```
doupi-school-platform/
├── doupi-server/             # [后端] Spring Boot 4 + JDK 17 (基于若依重构的模块化业务引擎)
│   ├── doupi-admin/          # 后端启动入口、Web API、认证拦截
│   ├── doupi-framework/      # 核心框架、安全拦截、Redis与Druid连接池
│   ├── doupi-system/         # 系统管理、用户、角色、部门、字典
│   ├── doupi-stock/          # 教务班级、文印排版、物资进销存核心业务
│   └── doupi-common/         # 通用工具类、常量定义、数据脱敏
├── doupi-web-client-react/   # [官网门户] React 19 + Vite 8 + Tailwind CSS (PC/移动端全自适应)
├── doupi-web-admin-react/    # [管理后台] React 19 + TypeScript + Ant Design / ProComponents
├── doupi-app/                # [移动端] 微信原生小程序工程 (招生预约、移动端查验)
├── ruoyi-app/                # [移动端] Uni-app / Vue3 移动端工程
├── deploy/                   # [原生部署] Systemd 服务配置、启动脚本、sudoers 最小提权规则
├── scripts/                  # [运维基线] 数据库初始化、字符集修复、防硬编码检测工具
├── .github/workflows/        # [自动化流水线] GitHub Actions 原生云端打包与安全部署
└── docs/                     # [技术文档库] 全平台系统架构、数据库与各端开发手册
```

---

## 2. 生产与测试环境对照表

平台全面实行**物理级数据与网络隔离**，测试环境拥有专属独立数据库与受控权限账号，彻底避免测试数据污染生产。

| 环境维度 | 生产环境 (Production) | 测试环境 (Testing) | 隔离说明 |
| :--- | :--- | :--- | :--- |
| **部署模式** | 纯原生部署 (Linux Systemd + Nginx) | 纯原生部署 (Linux Systemd + Nginx) | **完全不使用 Docker**，原生高吞吐 |
| **Web 门户入口** | `http://101.43.58.160/` | - | Nginx 根路径直接分发 |
| **管理后台入口** | `http://101.43.58.160/admin` | **`http://101.43.58.160:8081/`** | 端口完全隔离 (80 vs 8081) |
| **后端 API 服务** | `http://127.0.0.1:8088` (Systemd) | `http://127.0.0.1:8089` (Systemd) | 守护进程独立多活 |
| **MySQL 数据库** | **`stuck-mg`** | **`stuck-mg-test`** | **物理独立数据库** (共 54 张表) |
| **数据库专属账号**| `root` (受控) | `doupi_test` (密码 `DoupiTest2026!#`) | 测试账号物理上**无权访问生产库** |
| **Redis 缓存分库**| Database `0` | Database `1` | 键空间彻底隔离 |
| **文件附件目录** | `/data/doupi/uploadPath` | `/data/doupi-test/uploadPath` | 磁盘存储空间物理隔离 |
| **代码对应分支** | **`main`** 分支 | **`test`** 分支 | 推送自动触发该环境持续部署 |

---

## 3. 本地开发与快速上手（彻底摆脱本地 Docker）

本地电脑**无需安装或启动笨重的 Docker Desktop**，电脑内存立省数 GB。

### 3.1 模式 A：轻量前端开发（无需起 Java，无需起数据库）
前端工程师可直接启动本地 Vite 服务，接口自动代理至云端测试环境：
```bash
# 1. 官网门户端
cd doupi-web-client-react
npm install
npm run dev     # 访问 http://localhost:5173

# 2. 管理后台端
cd doupi-web-admin-react
npm install
npm run dev     # 访问 http://localhost:5174
```

### 3.2 模式 B：后端全栈开发（直连云端测试库）
后端开发者无需在本地搭建数据库，直接在 `application-druid.yml` 中连接测试专属库：
```yaml
url: jdbc:mysql://101.43.58.160:3306/stuck-mg-test?...
username: doupi_test
password: DoupiTest2026!#
```
*(注：`doupi_test` 账户仅有测试库权限，任何测试增删改均 100% 隔离，安全无虞)*

---

## 4. CI/CD 自动化流水线 (GitHub Actions)

项目在 `.github/workflows/` 下内置了 3 条纯原生自动部署工作流：
1. **`deploy-server.yml`**：推送变更到 `main` 自动发布生产后端（8088），推送到 `test` 自动发布测试后端（8089）。云端打包 JAR，SSH 传输分发，备份旧版本并执行 15 秒自动化探活与失败回滚。
2. **`deploy-admin.yml`**：推送变更到 `main` 自动发布生产管理端，推送到 `test` 自动发布测试管理端（8081 端口）。
3. **`deploy-client.yml`**：推送变更到 `main` 自动构建官网并原子更新 `/var/www/doupi-web-client/dist`。

### GitHub Secrets 配置项
在 GitHub 仓库中配置以下 3 个密钥即可生效：
- `SERVER_HOST`: `101.43.58.160`
- `SERVER_USER`: `cicd` (已配置最小提权与目录 ACL 的专用部署账号)
- `SERVER_SSH_KEY`: CI/CD 专用私钥内容（位于 `D:\Dev\Servers\cicd_deploy_key.pem`）

---

## 5. 详细技术文档导航 (`docs/`)

系统已生成全套标准化最新文档，详情请参阅各专题手册：
- 📘 [01 - 系统架构与业务全景](docs/01-系统架构与业务全景.md)
- 🗄️ [02 - 数据库设计与环境隔离规范](docs/02-数据库设计与环境隔离规范.md)
- 🚀 [03 - 原生部署与 CI/CD 自动化手册](docs/03-原生部署与CI-CD自动化手册.md)
- ☕ [04 - 后端服务开发手册 (doupi-server)](docs/04-后端服务开发手册(doupi-server).md)
- 💻 [05 - 管理端前端开发手册 (doupi-web-admin)](docs/05-管理端前端手册(doupi-web-admin).md)
- 🌐 [06 - 门户官网开发手册 (doupi-web-client)](docs/06-门户官网手册(doupi-web-client).md)
- 📱 [07 - 移动端小程序开发手册](docs/07-移动端小程序开发手册.md)
- 🛡️ [08 - 全栈防硬编码与开发编码规范](docs/08-全栈防硬编码与开发编码规范.md)