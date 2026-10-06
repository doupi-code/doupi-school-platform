/**
 * @fileoverview 登录页面 - 对接真实云函数API
 * 功能：
 * 1. 手机号+验证码登录（auth.sendSmsCode + auth.loginByPhone）
 * 2. 微信快捷登录：点击微信图标即触发手机号授权 → wx.login + auth.login → auth.getPhoneNumber
 */

const feedback = require('../../utils/feedback');
const { request } = require('../../utils/request');
const displayDict = require('../../utils/displayDict');
const errorDict = require('../../utils/errorDict');
const auth = require('../../utils/auth');
const { hasCompletedBasicProfile } = require('../../utils/avatar');

Page({
  data: {
    step: 'phone',
    phone: '',
    code: '',
    codeSource: 'sms',
    countdown: 0,
    sendingCode: false,
    loggingIn: false,
    agreed: false,
    wechatLoggingIn: false,
    errors: {},
    modalType: '',
    redirect: '',
    showPhoneAuthModal: false,
    showCodeHint: false,
    codeHintText: ''
  },

  _shouldForceCompleteProfile(userInfo) {
    if (!userInfo || typeof userInfo !== 'object') return false;
    if (hasCompletedBasicProfile(userInfo)) return false;
    const needByServer = !!userInfo.needCompleteProfile;
    // 原生授权仅获取头像和昵称，强制完善只检查这两个字段
    return true;
  },

  timer: null,

  /** 微信登录已创建云端用户但未拿到手机号：跳转完善资料页（不写本地登录态） */
  _goToProfileComplete(userInfo, role) {
    auth.setPendingLoginDraft({
      userInfo: userInfo || {},
      role: role != null ? role : 4,
      redirect: this.data.redirect || '',
      createdAt: Date.now()
    });
    wx.navigateTo({
      url: '/pages/login/profile-complete/profile-complete'
    });
  },

  _fallbackToPhoneCodeLogin(message) {
    wx.hideLoading();
    this.switchToPhoneLogin();
    feedback.showToast({
      title: message || '当前环境无法直接获取微信手机号，请改用验证码登录',
      icon: 'none',
      duration: 3200
    });
  },

  onLoad(options) {
    this.setData({
      redirect: options && options.redirect ? decodeURIComponent(options.redirect) : ''
    });
  },

  handleLoginSuccess(userInfo, role) {
    const parsedRole = parseInt(role, 10);
    const finalRole = Number.isNaN(parsedRole) ? 4 : parsedRole;
    const finalUserInfo = Object.assign({}, userInfo || {}, { role: finalRole });

    wx.setStorageSync('userInfo', finalUserInfo);
    wx.setStorageSync('token', Date.now());

    feedback.showToast({
      title: displayDict.text('LOGIN_SUCCESS'),
      icon: 'success'
    });

    setTimeout(() => {
      if (this._shouldForceCompleteProfile(finalUserInfo)) {
        wx.switchTab({ url: '/pages/profile/profile' });
        return;
      }
      if (this.data.redirect) {
        const resolved = auth.resolvePostLoginRedirect(this.data.redirect);
        if (resolved.blocked) {
          feedback.showWarning('招生端账号不能发起预约');
        }
        const url = resolved.url;
        const tabPages = [
          '/pages/index/index',
          '/pages/profile/profile'
        ];
        const purePath = String(url).split('?')[0];
        if (tabPages.includes(purePath)) {
          wx.switchTab({ url: purePath });
        } else {
          wx.reLaunch({ url });
        }
        return;
      }

      wx.switchTab({ url: '/pages/index/index' });
    }, 1500);
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  handleDeclineLogin() {
    if (this.data.wechatLoggingIn || this.data.loggingIn || this.data.sendingCode) return;

    const fallbackUrl = '/pages/index/index';
    const targetUrl = this.data.redirect || fallbackUrl;
    const tabPages = [
      '/pages/index/index',
      '/pages/profile/profile'
    ];
    const purePath = String(targetUrl).split('?')[0];

    if (tabPages.includes(purePath)) {
      wx.switchTab({
        url: purePath,
        fail: () => {
          wx.reLaunch({ url: purePath });
        }
      });
      return;
    }

    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          wx.reLaunch({ url: targetUrl || fallbackUrl });
        }
      });
      return;
    }

    wx.reLaunch({ url: targetUrl || fallbackUrl });
  },

  handlePhoneInput(e) {
    this.setData({
      phone: e.detail.value,
      'errors.phone': ''
    });
  },

  handleCodeInput(e) {
    let value = e.detail.value.replace(/\D/g, '').slice(0, 6);
    this.setData({
      code: value,
      'errors.code': ''
    });
  },

  handleAgreedChange(e) {
    const detailChecked = e && e.detail && typeof e.detail.checked !== 'undefined' ? e.detail.checked : undefined;
    const tapChecked = e && e.currentTarget && e.currentTarget.dataset
      && typeof e.currentTarget.dataset.checked !== 'undefined'
      ? e.currentTarget.dataset.checked
      : undefined;
    const normalizedTapChecked = typeof tapChecked === 'string'
      ? tapChecked === 'true'
      : tapChecked;
    const nextChecked = typeof detailChecked !== 'undefined'
      ? detailChecked
      : (typeof normalizedTapChecked !== 'undefined' ? normalizedTapChecked : !this.data.agreed);
    this.setData({
      agreed: !!nextChecked,
      'errors.agreed': ''
    });
  },

  /**
   * 发送验证码 - 调用 auth.sendSmsCode
   */
  async handleSendCode() {
    const { phone, agreed } = this.data;
    const errors = {};

    if (!phone.trim()) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.phone = '请输入正确的手机号';
    }

    if (!agreed) {
      errors.agreed = '请阅读并同意隐私政策和用户协议';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    try {
      this.setData({ sendingCode: true });
      const result = await request('auth.sendSmsCode', { phone }, {
        showLoading: true,
        loadingText: '发送中...'
      });
      const codeSource = String((result && result.codeSource) || 'sms').trim();
      const debugCode = String((result && result.debugCode) || '').trim();
      const codeHintText = codeSource === 'experience' && debugCode
        ? `体验环境验证码：${debugCode}`
        : `验证码已发送至 ${phone}`;

      this.setData({
        step: 'code',
        code: '',
        codeSource,
        codeHintText,
        showCodeHint: true,
        countdown: 60,
        errors: {}
      });

      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (this.data.countdown <= 1) {
          clearInterval(this.timer);
          this.setData({ countdown: 0 });
        } else {
          this.setData({ countdown: this.data.countdown - 1 });
        }
      }, 1000);

    } catch (err) {
      console.error('发送验证码失败:', err);

      if (err.errCode === 'RATE_LIMIT') {
        this.setData({ errors: { phone: err.errMsg } });
      } else if (err.errCode === 'FORBIDDEN') {
        feedback.showToast({
          title: err.errMsg || displayDict.text('SMS_LOGIN_CODE_DISABLED'),
          icon: 'none'
        });
      } else {
        feedback.showToast({
          title: (err && err.errMsg) || '验证码发送失败，请稍后重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  /**
   * 手机号+验证码登录 - 调用 auth.loginByPhone
   */
  async handleLogin() {
    const { code } = this.data;
    const errors = {};

    if (!code.trim()) {
      errors.code = '请输入验证码';
    } else if (code.length !== 6) {
      errors.code = '请输入6位验证码';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    try {
      this.setData({ loggingIn: true });
      wx.showLoading({ title: displayDict.text('LOGIN_IN_PROGRESS'), mask: true });

      const result = await request('auth.loginByPhone', {
        phone: this.data.phone,
        code: code,
        agreePrivacy: true
      }, { showLoading: false, showError: false });

      wx.hideLoading();
      const userInfo = result && result.userInfo ? result.userInfo : result;
      const role = userInfo && userInfo.role;
      this.handleLoginSuccess(userInfo, role);

    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);

      if (err.errCode === 'INVALID_PARAM') {
        this.setData({ errors: { code: '验证码错误或已过期' } });
      } else if (err.errCode === 'AUTH_PHONE_WECHAT_CONFLICT') {
        feedback.showToast({
          title: err.errMsg || errorDict.text('AUTH_PHONE_WECHAT_CONFLICT'),
          icon: 'none',
          duration: 4000
        });
      } else {
        feedback.showToast({
          title: (err && err.errMsg) || errorDict.text('LOGIN_FAILED_RETRY'),
          icon: 'none'
        });
      }
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  /**
   * 微信快捷登录：用户点击微信图标即完成授权弹窗，回调内依次 wx.login → auth.login → auth.getPhoneNumber
   */
  async handleWechatQuickLogin(e) {
    if (this.data.wechatLoggingIn) return;
    const detail = (e && e.detail) || {};

    if (!detail.code) {
      console.warn('用户取消手机号授权:', detail);
      this.setData({
        wechatLoggingIn: false,
        showPhoneAuthModal: false
      });
      feedback.showToast({
        title: '已取消手机号授权，可使用验证码登录或暂不登录',
        icon: 'none',
        duration: 2600
      });
      return;
    }

    this.setData({ wechatLoggingIn: true });
    wx.showLoading({ title: displayDict.text('LOGIN_IN_PROGRESS'), mask: true });

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });

      const result = await request('auth.login', {
        code: loginRes.code
      }, { showLoading: false, showError: false });

      const { userInfo, role } = result || {};
      const parsedRole = parseInt(role, 10);
      const finalRole = Number.isNaN(parsedRole) ? 4 : parsedRole;

      wx.hideLoading();

      if (userInfo && userInfo.phone) {
        this.handleLoginSuccess(userInfo, finalRole);
        return;
      }

      wx.showLoading({ title: displayDict.text('GET_PHONE_IN_PROGRESS'), mask: true });

      try {
        const bindResult = await request('auth.getPhoneNumber', { code: detail.code }, { showLoading: false, showError: false });
        wx.hideLoading();

        const phoneNumber = bindResult && bindResult.phoneNumber;
        if (!phoneNumber) {
          this._fallbackToPhoneCodeLogin('当前环境未拿到微信手机号，请改用验证码登录');
          return;
        }

        const mergedUser = Object.assign({}, userInfo || {}, { phone: phoneNumber });
        this.handleLoginSuccess(mergedUser, finalRole);
      } catch (bindErr) {
        wx.hideLoading();
        console.warn('auth.getPhoneNumber:', bindErr);
        this._fallbackToPhoneCodeLogin('当前环境未拿到微信手机号，请改用验证码登录');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('微信快捷登录失败:', err);
      const msg = err && err.errMsg ? String(err.errMsg) : '';
      wx.showModal({
        title: '登录失败',
        content: msg ? `${msg.slice(0, 120)}。可使用手机号验证码登录。` : '请稍后重试或使用手机号验证码登录。',
        confirmText: '去验证码登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.switchToPhoneLogin();
        }
      });
    } finally {
      this.setData({ wechatLoggingIn: false });
    }
  },

  /** 回到手机号验证码登录第一步 */
  switchToPhoneLogin() {
    this.setData({
      step: 'phone',
      code: '',
      countdown: 0,
      codeSource: 'sms',
      errors: {}
    });
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  handleChangePhone() {
    this.switchToPhoneLogin();
  },

  handleResendCode() {
    this.handleSendCode();
  },

  showPrivacyModal() {
    this.setData({ modalType: 'privacy' });
  },

  showTermsModal() {
    this.setData({ modalType: 'terms' });
  },

  closeModal() {
    this.setData({ modalType: '' });
  },

  handlePhoneAuthCancel() {
    this.setData({
      showPhoneAuthModal: false,
      wechatLoggingIn: false
    });
    feedback.showToast({
      title: '已取消授权',
      icon: 'none'
    });
  },

  handlePhoneAuthRetry(e) {
    this.setData({ showPhoneAuthModal: false });
    return this.handleWechatQuickLogin(e);
  },

  noop() {},

  goToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  goToAgreement() {
    wx.navigateTo({
      url: '/pages/user-agreement/user-agreement'
    })
  }
});
