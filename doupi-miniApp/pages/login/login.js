const auth = require('../../utils/auth');
const feedback = require('../../utils/feedback');

Page({
  data: {
    step: 'phone',
    phone: '',
    code: '',
    countdown: 0,
    agreed: false,
    sendingCode: false,
    loggingIn: false,
    wechatLoggingIn: false,
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

  handlePhoneInput(event) {
    this.setData({ phone: event.detail.value.replace(/\D/g, '').slice(0, 11), error: '' });
  },

  handleCodeInput(event) {
    this.setData({ code: event.detail.value.replace(/\D/g, '').slice(0, 6), error: '' });
  },

  requireAgreement() {
    if (!this.data.agreed) {
      this.setData({ error: '请先阅读并同意隐私政策和用户协议' });
    }
    return this.data.agreed;
  },

  busy() {
    return this.data.sendingCode || this.data.loggingIn || this.data.wechatLoggingIn;
  },

  async getWechatCode() {
    const result = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
    if (!result.code) throw new Error('微信未返回登录凭证，请重试');
    return result.code;
  },

  async handleSendCode() {
    if (this.busy() || this.data.countdown > 0 || !this.requireAgreement()) return;
    const { phone } = this.data;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    this.setData({ sendingCode: true, error: '' });
    try {
      const result = await auth.sendLoginCode(phone, await this.getWechatCode());
      this.setData({ step: 'code', code: '' });
      this.startCountdown(result.resendAfter);
    } catch (error) {
      this.setData({ error: error.message || error.errMsg || '验证码发送失败，请重试' });
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  startCountdown(seconds) {
    clearTimeout(this.timer);
    const deadline = Date.now() + seconds * 1000;
    const tick = () => {
      const countdown = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.setData({ countdown });
      if (countdown > 0) this.timer = setTimeout(tick, 1000);
    };
    tick();
  },

  onUnload() {
    clearTimeout(this.timer);
  },

  handleChangePhone() {
    if (this.busy()) return;
    clearTimeout(this.timer);
    this.setData({ step: 'phone', code: '', countdown: 0, error: '' });
  },

  handleLogin() {
    const { phone, code } = this.data;
    if (!/^\d{6}$/.test(code)) return;
    return this.signIn('loggingIn', async () => auth.loginWithSms(phone, code, await this.getWechatCode()));
  },

  handleWechatQuickLogin(event) {
    if (this.busy() || !this.requireAgreement()) return;
    const phoneCode = event.detail && event.detail.code;
    if (!phoneCode) {
      this.setData({ error: '未获得手机号授权，可使用验证码登录' });
      return;
    }
    return this.signIn('wechatLoggingIn', async () => auth.loginWithWechatPhone(await this.getWechatCode(), phoneCode));
  },

  async signIn(busyField, authenticate) {
    if (this.busy() || !this.requireAgreement()) return;
    this.setData({ [busyField]: true, error: '' });
    try {
      await authenticate();
      const target = auth.resolvePostLoginRedirect(this.data.redirect);
      if (target.blocked) feedback.showWarning('招生端账号不能发起预约');
      this.openPage(target.url);
    } catch (error) {
      this.setData({ error: error.message || error.errMsg || '登录失败，请重试' });
    } finally {
      this.setData({ [busyField]: false });
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
    if (this.busy()) return;
    if (getCurrentPages().length > 1) wx.navigateBack();
    else this.openPage('/pages/index/index');
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/user-agreement/user-agreement' });
  }
});
