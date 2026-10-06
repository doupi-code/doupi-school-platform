const feedback = require('./feedback');
const auth = require('./auth');

/**
 * 获取统一管理后台首页地址
 * role: 1=管理员 2=招生主任 3=招生老师
 */
function getAdminHomeUrl(role) {
  const r = Number(role || auth.getUserRole());
  if (r >= 1 && r <= 3) return '/pages/admin/dashboard/dashboard';
  return '/pages/admin/dashboard/dashboard';
}

/**
 * 在允许后台访问时跳转到统一管理后台
 */
function navigateToAdminHome() {
  if (!auth.hasAdminAccess()) {
    feedback.showToast({ title: '无权限访问', icon: 'none' });
    return;
  }
  const url = getAdminHomeUrl();
  wx.navigateTo({ url });
}

module.exports = {
  getAdminHomeUrl,
  navigateToAdminHome,
};

