# 豆皮服务端 (doupi-server)

> 汉外华襄复读学校综合教育管理平台核心业务后端引擎，基于 **Spring Boot 4 / JDK 17** 模块化架构。

## 1. 模块组织架构
```
doupi-server/
├── doupi-admin/       # Web API、控制器 Controller、Swagger、全局拦截与启动类
├── doupi-framework/   # 安全框架 Security、Redis 连接池、Druid 监控配置
├── doupi-system/      # RBAC 权限体系（用户、角色、部门、岗位、字典）
├── doupi-stock/       # 学校业务中台（教务班级、名师档案、文印排版、物资进出库）
└── doupi-common/      # 通用核心基类、异常拦截、常量与数据工具
```

## 2. 核心特性
- **纯原生高效运行**：编译后为轻量单体 JAR（`doupi-admin.jar`），由 Linux `systemd` 守护进程原生拉起，支持平滑热重启与自动探活。
- **物理环境隔离**：
  - 生产环境：端口 `8088`，连接 `stuck-mg` 生产库，Redis DB 0。
  - 测试环境：端口 `8089`，连接 `stuck-mg-test` 测试库，Redis DB 1。
- **全库统一字符集**：遵循 `utf8mb4_unicode_ci` 规范，彻底杜绝跨表字符集混合错误。

## 3. 本地编译与运行
```bash
# 1. 编译打包 (跳过单元测试快速构建)
mvn clean package -DskipTests

# 2. 本地直接运行 (默认加载 application-druid.yml 配置)
java -jar doupi-admin/target/doupi-admin.jar
```
*(注：本地开发可直接连接云端测试库 `stuck-mg-test`，无需在本地启动 Docker)*
