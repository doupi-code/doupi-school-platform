# 豆皮招生微信小程序 (doupi-miniApp)

> 汉外华襄复读学校微信原生端小程序工程，专为家长/学生招生咨询、在线预约看校、简章查阅提供极速触达。

## 1. 技术栈与目录
- **架构**：微信原生小程序（Weixin MiniProgram）
- **开发工具**：微信开发者工具（Stable 官方最新版）
- **核心功能**：
  - 在线填写意向年级、联系电话、预约看校时间
  - 招生简章画册快速翻阅
  - 校园全景展与环境导览

## 2. 开发者导入步骤
1. 打开 **微信开发者工具**。
2. 点击 **导入项目**。
3. 项目目录选择当前文件夹：`doupi-miniApp/`。
4. AppID 填入学校申请的正式小程序 AppID（或选择测试号）。
5. 在当前目录运行 `npm ci`，再在微信开发者工具执行「工具 → 构建 npm」。依赖输出到本工程的 `miniprogram_npm/`。
6. 开发版、体验版和正式版统一请求 `https://doupi.cloud/api/v1`，地址由 `utils/http.js` 配置。请在学校小程序后台的 request 合法域名中填写 `https://doupi.cloud`。

公开校区、访校配置和预约提交通过 `POST /api/v1/wx/dispatcher` 接入。受保护的动作使用后端签发的 Bearer 令牌，`GET /api/v1/auth/me` 刷新当前身份，`POST /api/v1/auth/logout` 撤销当前会话。真实微信登录与员工绑定由 MINI-02 接入。
