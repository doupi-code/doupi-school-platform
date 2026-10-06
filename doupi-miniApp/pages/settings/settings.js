const { requestWithCheck } = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    version: 'v1.0.0',
    showProfileEditModal: false,
    userInfo: {
      nickname: '用户',
      phone: ''
    }
  },

  _getCachedUserInfo() {
    return wx.getStorageSync('userInfo') || {};
  },

  applyUserInfo(userInfo) {
    const next = userInfo || {};
    this.setData({
      userInfo: {
        nickname: next.nickname || '用户',
        phone: this.maskPhone(next.phone)
      }
    });
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      if (!auth.isLoggedIn()) {
        const cached = this._getCachedUserInfo();
        this.applyUserInfo(cached);
        return;
      }
      if (auth.consumeProfileJustUpdated()) {
        const cached = this._getCachedUserInfo();
        this.applyUserInfo(cached);
        return;
      }
      const result = await requestWithCheck('user.getProfile', {}, { showLoading: false, showError: false });
      if (!result || !result.userInfo) return;
      this.applyUserInfo(result.userInfo);
    } catch (err) {
      const userInfo = this._getCachedUserInfo();
      this.applyUserInfo(userInfo);
    }
  },

  maskPhone(phone) {
    const value = String(phone || '');
    if (value.length < 11) return '';
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
  },

  goToEdit() {
    if (!auth.isLoggedIn()) return;
    this.setData({ showProfileEditModal: true });
  },

  onProfileEditModalClose() {
    this.setData({ showProfileEditModal: false });
  },

  onProfileEditModalSaved(e) {
    this.setData({ showProfileEditModal: false });
    const userInfo = e && e.detail && e.detail.userInfo;
    if (userInfo) {
      this.applyUserInfo(userInfo);
    }
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/user-agreement/user-agreement' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出登录',
      content: '退出后需要重新登录才能使用',
      confirmText: '确认退出',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (!res.confirm) return;
        auth.clearAuth();
        wx.reLaunch({ url: '/pages/index/index' });
      }
    });
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/profile/profile' });
      }
    });
  }
});
