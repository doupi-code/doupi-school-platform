# 任务：Web 用户端功能开发

## 优先级：P2

## 项目位置
- 骨架已搭建: `doupi-web-client-react/`
- 设计参考: `back/doupi-full-backup-20260930/doupi-web-client/figma_make设计文档*/`
- 旧 Vue 代码参考: `back/doupi-full-backup-20260930/doupi-web-client/src/App.vue`

## 页面详细需求

### 1. 首页 (`pages/home/index.tsx`)
**目标**: 学校品牌展示首页，吸引家长了解学校并预约访校。

**内容**:
- Hero 区域：全屏背景图 + 学校名称 + 一句话 Slogan + "立即预约" CTA 按钮
- 学校亮点：3-4 个图标卡片（如"名师团队"、"升学率高"、"小班教学"、"精准辅导"）
- 最新公告/新闻：2-3 条滚动展示
- 底部快速预约入口

**参考素材**: `back/.../doupi-web-client/figma_make*/src/imports/` 下的校园照片

### 2. 学校概况 (`pages/about/index.tsx`)
**内容**: 长滚动页面
- 学校简介（图文混排）
- 办学理念（3 个核心理念卡片）
- 校史时间线
- 荣誉墙（奖牌/证书图片网格）

### 3. 师资团队 (`pages/teachers/index.tsx`)
**内容**:
- 响应式卡片网格（PC 4 列，平板 2 列，手机 1 列）
- 每张卡片：教师照片 + 姓名 + 职称 + 科目 + 一句话简介
- 点击卡片展开详情（或弹窗）
- 数据先硬编码，后续改为 API 获取

### 4. 校园风貌 (`pages/gallery/index.tsx`)
**内容**:
- 图片瀑布流或网格布局
- 点击放大浏览（Lightbox 效果）
- 分类筛选：教学楼/操场/食堂/宿舍/活动
- 支持视频展示（嵌入播放器）

### 5. ⭐ 在线预约 (`pages/appointment/index.tsx`)
**这是核心业务页面，与小程序预约功能复用同一套后端接口。**

**表单字段**:
| 字段 | 类型 | 必填 | 说明 |
|:--|:--|:--|:--|
| 家长姓名 | Input | ✅ | |
| 手机号 | Input | ✅ | 11位手机号验证 |
| 学生姓名 | Input | ✅ | |
| 性别 | Radio | ✅ | 男/女 |
| 年级 | Select | ✅ | 高一/高二/高三/复读 |
| 现就读学校 | Input | ❌ | |
| 选择校区 | Select | ✅ | 从 API 获取校区列表 |
| 预约日期 | DatePicker | ✅ | 仅显示可预约日期 |
| 预约时段 | Select | ✅ | 根据所选日期动态加载 |
| 备注 | TextArea | ❌ | |

**API 调用**: `dispatch('appointment.create', formData)`

**提交成功后**:
- 显示成功页面
- 展示预约编号和核销码
- 提供"复制核销码"按钮
- "查看预约详情"链接

### 6. 预约查询 (`pages/query/index.tsx`)
**功能**:
- 输入手机号查询该手机号下所有预约记录
- 显示预约卡片列表（日期、时段、校区、状态、核销码）
- 状态标签：待核销（蓝色）/ 已核销（绿色）/ 已取消（灰色）

**API 调用**: `dispatch('appointment.queryByPhone', { phone })`

## SEO 要求
- 每个页面设置独立的 `<title>` 和 `<meta description>`
- 首页 title: "汉外华襄高级中学 - 私立高中 | 高三复读 | 在线预约访校"
- 使用语义化 HTML（h1/h2/section/article）

## 响应式要求
- 移动端（< 768px）：单列布局，导航折叠为 Hamburger 菜单
- 平板（768-1200px）：两列布局
- 桌面（> 1200px）：全宽布局

## 验收标准
- [ ] 首页视觉效果专业，品牌感强
- [ ] 预约表单校验完整
- [ ] 预约提交成功显示核销码
- [ ] 手机号查询能正确返回预约记录
- [ ] 移动端响应式正常
