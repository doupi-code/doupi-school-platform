const auth = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    role: 4,
    session: null
  },

  onLaunch() {
    this.checkForAppUpdate();

    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true });
      } catch (e) {
        console.warn('wx.cloud.init skipped:', e);
      }
    }
  },

  onShow() {
    auth.refreshToken().catch(error => {
      if (error.status !== 401) console.warn('[session] refresh failed', error.status, error.traceId);
    });
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
