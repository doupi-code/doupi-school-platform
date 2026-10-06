# 豆皮系统（Doupi）全栈架构重构与小程序拆分实施方案

> **文件位置**：项目根目录 `/重构与实施步骤计划.md` 与 `/DOUPI_REFACTOR_PLAN.md`  
> **文档版本**：v1.0  
> **生成时间**：2026-09-26  
> **状态**：待用户审核确认（审核通过后严格按步骤执行）

---

## 一、 整体重构目标与范围

根据需求，本项目将现有的 RuoYi-Vue 后台管理系统与新引入的华襄微信小程序（原基于微信云函数）进行全面体系化整合与工程化重构，主要目标包括：

1. **项目重命名**：全局所有项目名、目录名、Maven 配置、包名、前端标识等，由 `ruoyi` 统一更名为 **`doupi`（豆皮）**。
2. **顶层目录规整**：拆分划定清晰的 5 大核心工程目录：
   - 💻 `doupi-web-admin`：管理后台 Web 前端（原 ruoyi-ui，功能扩充）
   - 🌐 `doupi-web-client`：Web 用户端（新增骨架，功能点待定）
   - ☕ `doupi-server`：Java 后端微核心/多模块单体服务（聚合所有后端子模块）
   - 📱 `doupi-app-client`：小程序用户端（纯家长/访客端）
   - 🛠️ `doupi-app-admin`：小程序管理后台端（招生老师/主任/管理员专用）
3. **小程序一分为二**：把原单一的 `HuaXiang` 小程序彻底剥离拆分为**用户端小程序**与**管理后台小程序**两个独立工程，各自独立配置 `app.json`、页面与 TabBar。
4. **云函数平迁 Java 服务**：摒弃微信云函数，底层持久化切换至 MySQL 数据库，后端新建 `doupi-recruit` 模块，通过统一接口网关与标准 REST API 接管所有小程序端业务调用。
5. **管理后台功能双端全同步**：将现有的**教务管理**、**库存管理**、**系统管理**与小程序的**招生预约管理**进行双向打通，实现「Web 管理端」与「小程序管理端」所有管理功能点 100% 对齐。
6. **彻底清理冗余垃圾**：清理无用的 27+ 脚本、云开发冗余配置、历史缓存与无用文件。

---

## 二、 顶层项目目录架构规划

### 1. 改造前 vs 改造后结构对比

```text
==================== 改造前结构 ====================
RuoYi-Vue-v3.9.2/
├── HuaXiang/               <-- 混杂了用户端、管理端及云函数的复杂工程
├── ruoyi-admin/            <-- Web服务入口
├── ruoyi-common/           <-- 通用模块
├── ruoyi-framework/        <-- 框架安全与配置
├── ruoyi-generator/        <-- 代码生成
├── ruoyi-quartz/           <-- 定时任务
├── ruoyi-system/           <-- 系统模块
├── ruoyi-ui/               <-- 管理后台前端
├── stuck-edu/              <-- 教务模块
├── stuck-stock/            <-- 库存模块
├── sql/                    <-- 脚本
└── pom.xml

==================== 改造后标准结构 ====================
doupi/                      <-- 项目主根目录（由 RuoYi-Vue-v3.9.2 更名）
├── doupi-web-admin/        <-- 【1. 管理后台 Web 前端】(原 ruoyi-ui，Vue2+Element-UI)
│   ├── src/views/edu/      <-- 教务管理 (印刷登记/教师/班级)
│   ├── src/views/stock/    <-- 库存管理 (物品/供应商/出入库/盘点/报表)
│   ├── src/views/recruit/  <-- 招生预约管理 (看板/预约列表/核销/绑定/校区/配置)
│   └── src/views/system/   <-- 平台系统管理 (用户/角色/部门/日志等)
│
├── doupi-web-client/       <-- 【2. 新增 Web 用户端】(预留现代化骨架，功能待定)
│   ├── src/views/          <-- 待定制用户端页面
│   ├── package.json        <-- 独立轻量前端工程 (Vue3/Vite 或 Vue2 轻量骨架)
│   └── README.md           <-- 用户端扩展指引
│
├── doupi-server/           <-- 【3. 统一 Java 后端服务工程】
│   ├── doupi-admin/        <-- 控制器与启动入口 (原 ruoyi-admin)
│   ├── doupi-common/       <-- 基础通用工具包 (原 ruoyi-common)
│   ├── doupi-framework/    <-- 权限控制与配置 (原 ruoyi-framework)
│   ├── doupi-system/       <-- 系统基础业务模块 (原 ruoyi-system)
│   ├── doupi-edu/          <-- 教务业务模块 (印刷登记/OCR识别，原 stuck-edu)
│   ├── doupi-stock/        <-- 库存业务模块 (耗材管理/出入库，原 stuck-stock)
│   ├── doupi-recruit/      <-- 【新增】招生预约业务模块 (承接云函数转化的全部业务)
│   ├── doupi-quartz/       <-- 定时任务调度 (原 ruoyi-quartz)
│   ├── doupi-generator/    <-- 代码自动生成 (原 ruoyi-generator)
│   └── pom.xml             <-- 后端多模块聚合 POM
│
├── doupi-app-client/       <-- 【4. 小程序用户端】(家长/访客端，纯生原生小程序)
│   ├── miniprogram/
│   │   ├── pages/index/            <-- 首页 (轮播图/校园简介/预约入口)
│   │   ├── pages/appointment/      <-- 在线预约页面
│   │   ├── pages/appointment-list/ <-- 家长预约记录与状态
│   │   ├── pages/appointment-detail/<-- 预约二维码与核销码凭单
│   │   ├── pages/campus-detail/    <-- 校园详情与风采展示
│   │   ├── pages/message/          <-- 个人消息通知中心
│   │   ├── pages/profile/          <-- 个人中心
│   │   └── utils/apiClient.js      <-- HTTP 网络请求层（直连 doupi-server）
│   └── project.config.json
│
├── doupi-app-admin/        <-- 【5. 小程序管理后台端】(老师/主任/管理员专用移动工作台)
│   ├── miniprogram/
│   │   ├── pages/dashboard/        <-- 移动端工作台概览 (数据看板/待办事项)
│   │   ├── pages/verify/           <-- 快速核销入口 (扫码核销/输入券码)
│   │   ├── pages/appointments/     <-- 全局预约记录查看与改期/取消
│   │   ├── pages/binding/          <-- 招生老师-主任绑定申请与审核
│   │   ├── pages/teacher-qrcode/   <-- 老师专属招生推广二维码生成与分享
│   │   ├── pages/teacher-ranking/  <-- 招生老师业绩排行榜
│   │   ├── pages/edu-quick/        <-- 【对齐新增】移动端教务快捷入口 (文印登记/查验)
│   │   ├── pages/stock-quick/      <-- 【对齐新增】移动端库存快捷入口 (快速出库/盘点/预警)
│   │   ├── pages/config/           <-- 校园配置/预约时段/短信通知设置
│   │   └── utils/apiClient.js      <-- HTTP 网络请求层（带管理权限鉴权）
│   └── project.config.json
│
├── sql/                    <-- 【6. 数据库脚本收敛中心】
│   ├── doupi_init.sql      <-- 豆皮系统全套基础表结构与初始数据
│   ├── doupi_recruit.sql   <-- 招生预约模块核心数据表
│   └── doupi_menu_sync.sql <-- 菜单与双端权限配置脚本
└── README.md
```

### 2. 冗余及无效文件深度清理清单

经对工作区深度扫描，以下文件夹与冗余脚本将进行彻底清理：
1. **HuaXiang 下的无用环境修复脚本**（共 27 个）：
   - `scripts/disable-hyperv-switch-for-hotspot.ps1`
   - `scripts/fix-hotspot-*.ps1`（共 8 个不同版本的热点脚本）
   - `scripts/hotspot-*.ps1`（共 9 个热点驱动脚本）
   - `scripts/windows-repair-upgrade-C.ps1`
   - `scripts/一键修复热点*.bat`
2. **多余的 IDE 缓存与无用配置**：
   - `HuaXiang/.agents`, `HuaXiang/.codegraph`, `HuaXiang/.codex`, `HuaXiang/.cursor`, `HuaXiang/.trae`, `HuaXiang/.cloudbase`
   - `HuaXiang/cloudfunctions/`（逻辑迁入 Java 后，整包废弃，减少空间占用与混淆）
3. **旧脚手架过渡脚本**：
   - 根目录下旧的 `ry.bat`、`ry.sh`（替换为规范的 `doupi.bat`、`doupi.sh`）
   - 根目录下测试用临时图片与临时 scratch 脚本

---

## 三、 小程序双端拆解实施方案

### 1. 用户端小程序 (`doupi-app-client`)
- **目标人群**：学生家长、潜在生源、社会访客。
- **页面收敛**：
  - `pages/index/index`：校区门面、招生宣传、轮播公告、快捷预约
  - `pages/campus-detail/campus-detail`：校区风采、地理位置与相册
  - `pages/appointment/appointment`：预约表单（支持带入专属推荐老师）
  - `pages/appointment-list/appointment-list`：我的预约列表
  - `pages/appointment-detail/appointment-detail`：预约凭证展示、核销动态码
  - `pages/message/message`：预约成功/核销提醒/系统消息
  - `pages/profile/profile`：个人中心、绑定手机号、关于我们
  - `pages/login/login`：微信一键授权 / 手机验证码登录
- **TabBar 配置（4 个纯净标签）**：
  1. 首页 (`pages/index/index`)
  2. 预约探校 (`pages/appointment/appointment`)
  3. 消息 (`pages/message/message`)
  4. 我的 (`pages/profile/profile`)

### 2. 管理后台小程序 (`doupi-app-admin`)
- **目标人群**：招生老师、招生主任、文印教师、教务管理员、系统管理员。
- **独立工程机制**：独立的 AppID 或同一小程序关联不同体验版，免去在用户端携带庞大 admin 分包。
- **页面收敛**：
  - `pages/dashboard/dashboard`：管理仪表盘（今日预约数、核销率、新增意向、库存预警）
  - `pages/verify/verify`：现场核销（支持微信扫一扫相机扫描家长凭单二维码、或手动输入 8 位券号核销）
  - `pages/appointments/list`：预约管理（支持按校区、日期段、老师、状态筛选及驳回）
  - `pages/teacher-qrcode/qrcode`：我的招生二维码（老师个人获客海报、带参数小程序码）
  - `pages/teacher-ranking/ranking`：招生成果龙虎榜（团队激励）
  - `pages/binding/binding`：招生团队管理（老师绑定主任、审批流）
  - `pages/edu-quick/`：教务文印快查与扫码领料
  - `pages/stock-quick/`：库存低值预警、快速出库确认
  - `pages/config/`：预约规则设定（可预约日期、每日名额上限、短信通知测试）
- **TabBar 配置（4 个专业管理标签）**：
  1. 工作台 (`pages/dashboard/dashboard`)
  2. 预约管理 (`pages/appointments/list`)
  3. 业务协同 (`pages/cooperate/index` 聚合核销、招生码、文印)
  4. 我的设置 (`pages/profile/profile`)

---

## 四、 云函数转 Java 服务技术方案

### 1. 架构平迁原理与网络适配层

原小程序采用云函数 `callApi(action, payload)`。为确保**小程序原有前端业务代码 0 侵入、0 崩溃**：
- 在小程序两端统一将底层 `utils/cloudClient.js` 改造为标准网络客户端 `utils/apiClient.js`：
  ```javascript
  // 改造后：底层走 wx.request 直连 doupi-server
  wx.request({
    url: `${config.baseUrl}/api/wx/dispatcher`,
    method: 'POST',
    data: { action, payload, requestId },
    header: {
      'Authorization': 'Bearer ' + wx.getStorageSync('token'),
      'X-Client-Type': 'client' // 或 'admin'
    }
  })
  ```
- **Java 后端网关调度设计**：在 `doupi-recruit` 模块中实现 `WxActionDispatcherController`，内部维护 `Map<String, WxActionHandler>` 策略映射，根据 `action` 自动路由至对应 Spring Bean 业务方法，返回统一格式：
  ```json
  {
    "ok": true,
    "data": { ... },
    "errCode": "0",
    "errMsg": "success",
    "requestId": "req_xxx"
  }
  ```

### 2. 数据库表结构建设 (MySQL 5.7+ / 8.0+)

原 CloudBase 集合全部转化为高质量、带索引的 MySQL 规范数据表：
1. **`doupi_recruit_appointment`（预约核心表）**：
   - 字段：`appointment_id`, `appointment_no` (唯一预约编号), `student_name`, `id_card`, `parent_name`, `phone`, `campus_id`, `visit_date`, `time_slot`, `teacher_id`, `teacher_name`, `director_id`, `status` (0-待确认 1-已确认 2-已核销 3-已取消 4-已爽约), `verify_time`, `verify_user_id`, `remark`, 审计字段。
2. **`doupi_recruit_campus`（校区档案表）**：
   - 字段：`campus_id`, `campus_name`, `address`, `contact_phone`, `traffic_guide`, `cover_img`, `status`, `sort_num`。
3. **`doupi_recruit_banner`（轮播图表）**：
   - 字段：`banner_id`, `title`, `img_url`, `link_url`, `status`, `sort_num`。
4. **`doupi_recruit_teacher_binding`（师生与团队绑定表）**：
   - 字段：`binding_id`, `teacher_id`, `director_id`, `status` (0-待审核 1-已绑定 2-已驳回 3-已解绑), `apply_time`, `audit_time`, `audit_remark`。
5. **`doupi_recruit_message`（站内消息通知表）**：
   - 字段：`message_id`, `user_id`, `title`, `content`, `msg_type`, `read_status`, `biz_id`。
6. **`doupi_recruit_config`（招生配置与时段限额表）**：
   - 字段：`config_id`, `config_key`, `config_value`, `remark` (涵盖每日限额、开放时段区间、短信通知开关)。

### 3. 核心 Action 与 Java 后端接口映射字典

| 原云函数 Action | 对应 Java Service / Controller 方法 | 归属模块 | 功能说明 |
| :--- | :--- | :--- | :--- |
| `auth.loginByPhone` | `WxAuthService.loginByPhone()` | `doupi-recruit` | 手机验证码登录与用户注册 |
| `auth.login` | `WxAuthService.wxLogin()` | `doupi-recruit` | 微信 OpenID 快速静默登录 |
| `appointment.create` | `AppointmentService.createAppointment()` | `doupi-recruit` | 家长提交探校预约（含防刷校验） |
| `appointment.list` | `AppointmentService.selectUserAppointments()` | `doupi-recruit` | 家长查询自己的预约记录 |
| `appointment.adminList`| `AppointmentService.selectAdminAppointments()` | `doupi-recruit` | 教师/主任多维度分页检索预约 |
| `teacher.verifyAppointment` | `AppointmentService.verifyAppointment()` | `doupi-recruit` | 现场扫描核销预约（扣减状态/记日志） |
| `teacher.getInvitePayload` | `TeacherService.generateInvitePayload()` | `doupi-recruit` | 生成带老师参数的小程序码与海报 |
| `binding.submitBindRequest` | `BindingService.submitBindRequest()` | `doupi-recruit` | 招生老师向主任申请组队绑定 |
| `binding.approveRequests` | `BindingService.approveRequests()` | `doupi-recruit` | 招生主任审批团队绑定请求 |
| `stats.dashboard` | `RecruitStatsService.getDashboardStats()` | `doupi-recruit` | 招生工作台核心指标与趋势计算 |
| `stats.teacherRanking` | `RecruitStatsService.getTeacherRanking()` | `doupi-recruit` | 招生老师带客与核销排行榜 |
| `campus.summary` | `CampusService.selectCampusSummary()` | `doupi-recruit` | 校园风采详情与配套设施 |
| `config.getTimeSlots` | `RecruitConfigService.getTimeSlots()` | `doupi-recruit` | 开放预约时段与实时余量计算 |

---

## 五、 管理后台功能点双端全同步对齐矩阵

为达成“**所有的管理功能，小程序和网页端都需要有**”的目标，双端功能对照同步规划如下：

| 业务领域 | 核心管理功能点 | 💻 Web 管理后台 (`doupi-web-admin`) | 🛠️ 小程序管理后台 (`doupi-app-admin`) | 后端支持 (Java) |
| :--- | :--- | :---: | :---: | :--- |
| **招生预约** | 招生预约监控大屏 | ✅ 完整大屏与走势图表 (`recruit/dashboard`) | ✅ 移动端卡片看板 (`pages/dashboard`) | `IRecruitStatsService` |
| **招生预约** | 预约单据管理 | ✅ 表格检索/详情/改期/导出 (`recruit/appointment`) | ✅ 列表筛选/快速处理 (`pages/appointments`) | `IAppointmentService` |
| **招生预约** | 预约现场核销 | ✅ 电脑端输入券号核销 | ✅ 手机相机扫码核销 + 动态码 | `IAppointmentService` |
| **招生预约** | 招生团队绑定审批 | ✅ 主任审核列表与批量审批 (`recruit/binding`) | ✅ 移动端待办快速审核 (`pages/binding`) | `ITeacherBindingService`|
| **招生预约** | 专属招生二维码 | ✅ 二维码下载与物料打印配置 | ✅ 手机一键生成与微信朋友圈分享海报 | `ITeacherService` |
| **招生预约** | 招生龙虎榜排行 | ✅ 完整统计报表与柱状图 | ✅ 移动端排行榜 | `IRecruitStatsService` |
| **招生预约** | 校区与轮播图配置 | ✅ 富文本与多媒体上传 (`recruit/campus`) | ✅ 移动端基础信息维护 (`pages/config`) | `ICampusService` |
| **招生预约** | 时段与限额规则配置 | ✅ 时段规则可视化排期设置 | ✅ 移动端开关与上限快速调整 | `IRecruitConfigService` |
| **教务管理** | 印刷登记 (含OCR) | ✅ 完整截图粘贴识别/用纸扣减 (`edu/record`) | ✅ 移动端扫码登记/拍照上传成品质检 | `IEduPrintRecordService`|
| **教务管理** | 教师档案管理 | ✅ 完整教师档案与班级绑定 (`edu/teacher`) | ✅ 移动端教师名录与任课查询 | `IEduTeacherService` |
| **教务管理** | 班级档案管理 | ✅ 班级增删改查与年级归类 (`edu/class`) | ✅ 移动端班级列表速览 | `IEduClassService` |
| **库存管理** | 物品档案与实时库存 | ✅ 耗材台账/预警维护 (`stock/goods`) | ✅ 移动端低库存预警提示与明细查询 | `IStockGoodsService` |
| **库存管理** | 物品入库与出库单据 | ✅ 完整单据录入/打印 (`stock/in`, `stock/out`) | ✅ 移动端出入库单快速审核与签字 | `IStockIn/OutService` |
| **库存管理** | 库存盘点业务 | ✅ 盘点任务发起/录入/审核 (`stock/check`) | ✅ 移动端盘库扫码核对 | `IStockCheckService` |
| **库存管理** | 出入库报表统计 | ✅ 明细报表与月度聚合导出 (`stock/report`) | ✅ 移动端月度出入库走势速览 | `IStockReportService` |
| **系统支撑** | 用户与权限管理 | ✅ 完整用户/角色分配 (`system/user`) | ✅ 移动端管理员用户状态启停 | `ISysUserService` |

---

## 六、 全局「ruoyi」向「doupi」更名规范

全局统一更名替换规则如下：

| 对象类型 | 原命名 (ruoyi) | 新命名 (doupi) | 影响范围 |
| :--- | :--- | :--- | :--- |
| **根目录/项目名** | `RuoYi-Vue-v3.9.2` | `doupi` | 项目文件夹、README、文档标题 |
| **Maven GroupId** | `com.ruoyi` | `com.doupi` | 根 pom.xml 及所有子模块 pom.xml |
| **Maven ArtifactId**| `ruoyi-*` | `doupi-*` | `doupi-admin`, `doupi-common` 等全模块 |
| **Java 基础包名** | `com.ruoyi.*` | `com.doupi.*` | 所有 Java 代码 package 与 import |
| **Spring 配置前缀** | `ruoyi:` (如 `ruoyi.name`) | `doupi:` | `application.yml`, `application-druid.yml` |
| **前端项目名称** | `ruoyi-ui` | `doupi-web-admin` | package.json, 页面 Title, 导航栏 Logo |
| **权限字符前缀** | 若依权限管理体系 | 豆皮智慧校园权限体系 | 登录页标语、页脚 Copyright、系统名称 |

---

## 七、 详细实施步骤与阶段计划

整体实施分为 5 个阶段，按顺序稳步推进：

### 阶段一：目录规整与冗余文件清理
1. **创建标准顶层目录**：创建 `doupi-web-admin`, `doupi-web-client`, `doupi-server`, `doupi-app-client`, `doupi-app-admin`。
2. **清理 HuaXiang 冗余垃圾**：
   - 删除 `HuaXiang/scripts/` 中全部 27 个无用 hotspot-fix 与驱动脚本。
   - 删除 `HuaXiang/.agents`, `.codegraph`, `.codex`, `.cursor`, `.trae`, `.cloudbase` 等多余 IDE 配置。
3. **搬迁归位**：
   - 将原 `ruoyi-ui` 移入 `doupi-web-admin/`。
   - 初始化创建空的现代前端工程 `doupi-web-client/`（预留用户端基础骨架）。
   - 将现有 Java 模块集合移入 `doupi-server/`。

### 阶段二：全局更名（ruoyi -> doupi）与 Maven 体系重塑
1. **Maven 坐标重命名**：
   - 根 POM 与子模块 POM：`groupId: com.doupi`, `artifactId: doupi-*`。
   - 依赖声明全部重定向至 `doupi-*`。
2. **Java 源码包路径全局迁移**：
   - 批量平迁 `src/main/java/com/ruoyi` -> `src/main/java/com/doupi`。
   - 全局批量更新 import 语句与 Spring 注解（`@ComponentScan`, `@MapperScan("com.doupi.**.mapper")`）。
3. **配置文件与前端更名**：
   - `application.yml` 中包扫描 `typeAliasesPackage: com.doupi.**.domain`。
   - 前端 Web 标题、图标、环境变量 `VUE_APP_TITLE = '豆皮智慧校园管理系统'`。
4. **编译基线验证**：
   - 运行 `mvn clean test` 确保更名后整个后端服务编译 100% 成功，单元测试无报错。

### 阶段三：Java 后端招生预约模块开发（替代云函数）
1. **新建 Maven 子模块 `doupi-recruit`**：
   - 依赖 `doupi-common` 与 `doupi-system`。
   - 在 `doupi-server/pom.xml` 中引入。
2. **执行数据库建表脚本**：
   - 创建 `doupi_recruit_appointment`, `doupi_recruit_campus`, `doupi_recruit_banner`, `doupi_recruit_teacher_binding` 等 7 张 MySQL 数据表。
3. **实现核心业务层与持久层**：
   - 实现实体类、MyBatis Mappers、XML 文件及 Service 业务逻辑（实现短信发送、预约创建、状态流转、核销鉴权、排行榜统计）。
4. **实现小程序通用网关 Dispatcher 与 REST 接口**：
   - 暴露 `/api/wx/dispatcher` 兼容小程序 `callApi` 动作。
   - 暴露 `/recruit/**` RESTful 接口供 Web 管理端调用。

### 阶段四：小程序双端拆解与网络层改造
1. **构建 `doupi-app-client`（小程序用户端）**：
   - 从 `HuaXiang/miniprogram` 提取用户端页面（首页、校区详情、预约、消息、个人中心、登录）。
   - 移除所有 admin 分包与管理端逻辑。
   - 替换 `utils/cloudClient.js` 为直连 `doupi-server` 的 HTTP 客户端，配置目标域名。
2. **构建 `doupi-app-admin`（小程序管理后台端）**：
   - 从原 `HuaXiang/miniprogram/pages/admin` 提取全部管理页面，重构为独立小程序的 pages。
   - 配置专属管理工作台 TabBar 与导航样式。
   - 增加教务文印查验与耗材低值预警移动端入口。
   - 替换网络请求为带 Token 鉴权的 `apiClient.js`。
3. **彻底删除旧 `HuaXiang` 目录**。

### 阶段五：Web 管理后台功能同步对齐与整体验收
1. **Web 端新增招生预约菜单与视图 (`doupi-web-admin/src/views/recruit/`)**：
   - 预约总览看板页面 (`recruit/dashboard/index.vue`)
   - 预约单据管理页面 (`recruit/appointment/index.vue`)
   - 团队绑定审批页面 (`recruit/binding/index.vue`)
   - 校区与媒体管理页面 (`recruit/campus/index.vue`)
   - 预约规则与短信配置页面 (`recruit/config/index.vue`)
2. **数据库菜单与权限同步**：
   - 在 `sys_menu` 中新增顶级或并列目录「招生预约」，插入对应子菜单与按钮权限点。
3. **全链路端到端联合测试**：
   - 用户端小程序发起预约 -> 后端落库 -> Web 管理端实时查看 -> 管理端小程序现场核销 -> 报表数据实时同步。
   - 执行全部单元测试与前后端联调。

---

## 八、 风险控制与保障措施

1. **零功能回退保障**：现已稳定的 RapidOCR 微信截图本地推理、自动扣减库存机制在重命名为 `com.doupi` 时保持 100% 兼容测试。
2. **渐进式提交与验证**：每完成一个阶段均运行 Maven 编译与测试，严禁跨阶段堆积错误。
3. **数据安全**：所有新建数据表均增加 `del_flag` 逻辑删除标识与完整时间戳审计。

---

> **请审阅上述计划。若您确认无误，请回复“同意”或提出具体调整建议，我将立即严格按照上述步骤启动执行！**
