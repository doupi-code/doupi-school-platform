const auth = require('../../utils/auth');
const feedback = require('../../utils/feedback');

Page({
  data: {
    agreed: false,
    loggingIn: false,
    error: '',
    redirect: '/pages/profile/profile'
  },

  onLoad(options) {
    const redirect = options && options.redirect;
    if (!redirect) return;
    try {
      const target = decodeURIComponent(redirect);
      if (/^\/pages\/[a-z0-9/-]+(?:\?.*)?$/i.test(target)) this.setData({ redirect: target });
    } catch (_) {
      // Malformed redirect falls back to the profile tab.
    }
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed, error: '' });
  },

  async signIn() {
    if (this.data.loggingIn) return;
    if (!this.data.agreed) {
      this.setData({ error: '请先阅读并同意隐私政策和用户协议' });
      return;
    }
    this.setData({ loggingIn: true, error: '' });
    try {
      const result = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
      if (!result.code) throw new Error('微信未返回登录凭证，请重试');
      await auth.login(result.code);
      const target = auth.resolvePostLoginRedirect(this.data.redirect);
      if (target.blocked) feedback.showWarning('招生端账号不能发起预约');
      this.openPage(target.url);
    } catch (error) {
      this.setData({ error: error.errMsg || error.message || '微信登录失败，请重试' });
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  openPage(url) {
    const path = url.split('?')[0];
    if (['/pages/index/index', '/pages/profile/profile'].includes(path)) {
      wx.switchTab({ url: path });
    } else {
      wx.reLaunch({ url });
    }
  },

  decline() {
    this.openPage('/pages/index/index');
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/user-agreement/user-agreement' });
  }
});
