# 06 - 门户官网手册 (doupi-web-client)

## 1. 门户架构与定位

对外官方网站是汉外华襄复读学校品牌形象、办学实力展示与招生获客的核心窗口。基于 **React 19 + TypeScript + Vite 8 + Tailwind CSS** 构建，追求极致的加载速度、优雅的书法宋体美学与全设备自适应。

---

## 2. 页面栏目全景

| 栏目路由 | 栏目名称 | 核心内容 | 动态数据来源 |
| :--- | :--- | :--- | :--- |
| `/` | 门户首页 | 办学理念、环境轮播、班型亮点、高考喜报、名师橱窗、在线预约 | `/api/public/v1/cms/` |
| `/about` | 关于华襄 | 办学渊源、全封闭军事化管理、校园三维导览 | 静态与 CMS 混合 |
| `/senior-year` | 高三学年 | 复读冲刺日课表、精准分层培优、心理疏导机制 | 静态配置 |
| `/faculty` | 名师天团 | 32 位骨干特级教师风采展、科目、教龄、名师格言 | 实时穿透 `/cms/teachers` |
| `/campus-life` | 校园生活 | 四分之一屏紧凑 Hero、宿舍餐厅实景、成长日志 | 静态与图库 |
| `/admissions` | 招生录取 | 2026 最新招生简章、收费明细、在线预约试听 | 在线预约 API |
| `/news` | 高考资讯 | 历年高考分数线、复读提分大数据、高考志愿政策 | CMS 文章库 |

---

## 3. 核心视觉与交互设计规范

### 3.1 顶部 Hero 区域规范 (四分之一屏最佳体验)
各栏目顶部 Hero 区域通过 `.p-hero` 统一样式管理，严格遵循**视口高度约四分之一 (~25vh)** 的紧凑设计准则，保证用户打开页面立即看到核心正文内容：
- **容器高度**：`min-height: clamp(180px, 25vh, 240px)`（移动端 `160px`）
- **垂直内边距**：`padding: 36px 0 26px`，避免过度留白
- **主标题字号**：`clamp(26px, 3.2vw, 38px)`，典雅庄重且不侵占垂直空间
- **背景水印英文**：等比缩放至 `clamp(48px, 7vw, 96px)`，半透明衬底不喧宾夺主

### 3.2 路由切换自动置顶机制
为了消除用户浏览到底部切换菜单时页面停留在底部的体验缺陷，在 `src/site.tsx` 中内置双重强制置顶逻辑：
1. 挂载 React Router 官方 `<ScrollRestoration />` 组件。
2. 在路由监听 `useEffect` 中执行多重滚动复位：
   ```typescript
   window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
   document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
   document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
   ```

### 3.3 CMS 动态数据穿透与离线兜底
官网在 `src/cms/hooks.ts` 中封装了数据拉取逻辑：
- 优先从后端 `/api/public/v1/cms/teachers` 拉取实时数据，支持实时同步后台删除与更新。
- 若网络超时或接口异常，自动退回至本地高品质基准数据（`defaultTeachers`），保证官网对外绝对无死角、不白屏。
