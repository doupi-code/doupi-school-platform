/**
 * @fileoverview 自定义 TabBar 与当前 Tab 页路由对齐（补充 pageLifetimes 边界情况）。
 */

/**
 * @returns {void}
 */
function syncCustomTabBarSelected() {
  try {
    const pages = getCurrentPages();
    if (!pages.length) return;
    const page = pages[pages.length - 1];
    if (page && typeof page.getTabBar === "function") {
      const bar = page.getTabBar();
      if (bar && typeof bar.syncSelected === "function") {
        bar.syncSelected();
      }
    }
  } catch (_) {
    /* ignore */
  }
}

module.exports = { syncCustomTabBarSelected };
