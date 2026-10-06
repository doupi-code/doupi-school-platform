# 豆皮校园管理综合服务平台 (Doupi System)

> 基于 Spring Boot 4 + Vue2/3 + 微信双端小程序的一体化校园综合管理与预约服务平台。

---

## 目录结构规划

```
C:\Users\javal\Desktop\RuoYi-Vue-v3.9.2\
├── doupi-server/         # 后端服务聚合工程 (Spring Boot 4, JDK 17, Maven 10个子模块)
│   ├── doupi-admin/      # 后端主入口与Web控制器 (端口: 8080)
│   ├── doupi-recruit/    # 招生与访校预约业务模块 + 微信云网关接口 (/api/wx/dispatcher)
│   ├── doupi-edu/        # 教务管理模块 (印刷登记、RapidOCR试卷截图识别、教师/班级档案)
│   ├── doupi-stock/      # 库存管理模块 (物品档案、出入库、盘点、台账与报表)
│   ├── doupi-system/     # 系统用户、角色、权限与字典
│   ├── doupi-framework/  # 安全过滤(Spring Security)、Druid连接池、多数据源
│   ├── doupi-common/     # 基础工具类与常量
│   ├── doupi-generator/  # 代码生成器
│   └── doupi-quartz/     # 定时任务调度
│
├── doupi-web-admin/      # 管理后台 Web 端 (Vue2 + Element-UI, 端口: 80)
│   ├── src/views/recruit/# 🎓 招生管理 (数据看板、预约管理、现场核销、教师绑定、校区信息、排班配置)
│   ├── src/views/edu/    # 📚 教务管理 (印刷登记、教职工档案、班级档案)
│   ├── src/views/stock/  # 📦 库存管理 (物品、出入库、盘点、明细与月度报表)
│   ├── src/views/system/ # ⚙️ 系统管理 (用户、角色、权限等)
│   └── src/assets/styles/# 统一小程序的 #3088F4 视觉主题、圆角卡片、柔和投影
│
├── doupi-web-client/     # Web 用户端骨架 (Vue3 + Vite5, 端口: 5173, 功能点规划中)
│
├── doupi-app-client/     # 微信小程序 - 家长/访客端 (校园风貌、在线预约、核销码出示、个人中心)
│
├── doupi-app-admin/      # 微信小程序 - 教师/管理端 (管理工作台、预约列表、扫码/输码核销、招生码)
│
└── back/                 # 历史原始代码完整备份
    └── HuaXiang/         # 原始完整微信小程序及云函数代码 (可用于随时回溯比对)
```

---

## 技术架构与服务端口

| 服务/工程 | 技术栈 | 默认端口/路径 | 核心职责 |
| :--- | :--- | :--- | :--- |
| **doupi-server** | Spring Boot 4, JDK 17, MyBatis, Redis | `8080` | 提供统一 REST API 及 `/api/wx/dispatcher` 小程序网关 |
| **doupi-web-admin** | Vue 2.6, Element-UI, ECharts 5 | `80` (代理到 8080) | 招生管理、教务打印OCR、库存台账管理 |
| **doupi-web-client** | Vue 3, Vite 5, Vue Router 4 | `5173` | Web 用户端独立骨架工程 |
| **doupi-app-client** | 微信原生小程序 | AppID 自行配置 | 家长访校预约、信息展示、个人预约凭单 |
| **doupi-app-admin** | 微信原生小程序 | AppID 自行配置 | 老师扫码核销、主任绑定、移动端数据看板 |
| **MySQL 8.0** | Docker 容器 `mysql8` | `13306` (库名: `stuck-mg`) | 业务数据库 |
| **Redis 7.0** | Docker 容器 `redis7` | `6379` | 缓存、验证码、Session Token |

---

## 快速启动指南

### 1. 启动中间件 (Docker)
```bash
docker start mysql8 redis7
```

### 2. 启动后端服务 (doupi-server)
```bash
cd doupi-server
mvn clean package -DskipTests
java -jar doupi-admin/target/doupi-admin.jar
# 或在 IntelliJ IDEA 中打开 doupi-server 运行 DoupiApplication
```

### 3. 启动管理后台 Web (doupi-web-admin)
```bash
cd doupi-web-admin
npm run dev
# 浏览器访问 http://localhost:80 (用户名: admin / 密码: admin123)
```

### 4. 启动微信小程序端
- **家长/访客端**：使用微信开发者工具打开 `doupi-app-client` 目录。
- **管理后台端**：使用微信开发者工具打开 `doupi-app-admin` 目录。
- 两个小程序均已配置直接请求 `http://localhost:8080/api/wx/dispatcher`，无需额外部署腾讯云云函数！