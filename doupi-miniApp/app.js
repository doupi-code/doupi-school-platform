const { envList } = require('./envList');

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    role: 4
  },

  onLaunch() {
    this.checkForAppUpdate();

    // 默认 API 网关地址配置（优先使用开发者工具调试注入，禁止生产硬编码）
    const defaultApiUrl = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'release')
      ? 'https://api.doupi.vip'
      : 'http://localhost:8080';

    if (!wx.getStorageSync('api_base_url')) {
      wx.setStorageSync('api_base_url', defaultApiUrl);
    }

    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true });
      } catch (e) {
        console.warn('wx.cloud.init skipped:', e);
      }
    }

    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      this.globalData.role = userInfo.role || 4;
    }
  },

  checkForAppUpdate() {
    if (!wx.canIUse || !wx.canIUse('getUpdateManager')) {
      wx.showModal({
        title: '微信版本过低',
        content: '当前微信版本暂不支持小程序在线更新，请升级微信后再使用。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      if (!res.hasUpdate) return;
      console.log('[app-update] found new version');
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '检测到新版本，点击确认更新后将重启小程序并使用最新版本。',
        showCancel: false,
        confirmText: '确认更新',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        }
      });
    });

    updateManager.onUpdateFailed(() => {
      wx.showModal({
        title: '更新失败',
        content: '新版本下载失败，请检查网络后重新打开小程序。',
        showCancel: false,
        confirmText: '我知道了'
      });
    });
  }
});
