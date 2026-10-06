/**
 * 微信登录未完成时的中间页：绑定手机号（短信或微信授权）并完善头像、昵称；保存后才写入登录态。
 * 退出本页（未完成保存）视为未登录，清理 pending 草稿。
 */

const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');
const auth = require('../../../utils/auth');
const { DEFAULT_AVATAR, normalizeAvatarForSave, resolveAvatarDisplay } = require('../../../utils/avatar');

Page({
  data: {
    nickname: '',
    avatar: '',
    avatarFileID: '',
    avatarDisplay: DEFAULT_AVATAR,
    phone: '',
    maskedPhone: '',
    phoneFromWx: false,
    code: '',
    agreed: false,
    countdown: 0,
    sendingCode: false,
    saving: false,
    wxPhoneLoading: false,
    redirect: '',
    role: 4,
    draftUserId: '',
    errors: {},
    codeSource: 'sms',
    showCodeHint: false,
    codeHintText: ''
  },

  _completed: false,
  timer: null,

  onLoad() {
    const draft = auth.getPendingLoginDraft();
    if (!draft || !draft.userInfo || !draft.userInfo.userId) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    const u = draft.userInfo;
    const avatarRaw = String(u.avatar || '').trim();
    const nickname = String(u.nickname || '').trim();
    const displayAv = resolveAvatarDisplay(avatarRaw);
    this.setData({
      draftUserId: String(u.userId || ''),
      redirect: draft.redirect || '',
      role: draft.role != null ? draft.role : 4,
      nickname,
      avatar: displayAv,
      avatarFileID: String(u.avatarFileID || '').trim(),
      avatarDisplay: displayAv,
      phone: String(u.phone || '').trim(),
      phoneFromWx: false,
      maskedPhone: ''
    });
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this._completed) {
      auth.clearAuth();
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = String((e && e.detail && e.detail.avatarUrl) || '').trim();
    if (!avatarUrl) return;
    this.setData({
      avatar: avatarUrl,
      avatarFileID: '',
      avatarDisplay: avatarUrl,
      'errors.avatar': ''
    });
  },

  onNicknameInput(e) {
    this.setData({
      nickname: (e.detail && e.detail.value) || '',
      'errors.nickname': ''
    });
  },

  onPhoneInput(e) {
    this.setData({
      phone: (e.detail && e.detail.value) || '',
      'errors.phone': '',
      showCodeHint: false,
      codeHintText: '',
      code: '',
      codeSource: 'sms'
    });
  },

  onCodeInput(e) {
    const value = String((e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ code: value, 'errors.code': '' });
  },

  onAgreedTap(e) {
    const tap = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.checked : undefined;
    const next = typeof tap !== 'undefined' ? !!tap : !this.data.agreed;
    this.setData({ agreed: !!next, 'errors.agreed': '' });
  },

  async onWxGetPhone(e) {
    const detail = (e && e.detail) || {};
    if (!detail.code) {
      feedback.showToast({ title: '未拿到授权，可改用短信验证码', icon: 'none' });
      return;
    }
    this.setData({ wxPhoneLoading: true });
    try {
      const res = await request('auth.getPhoneNumber', { code: detail.code }, {
        showLoading: true,
        loadingText: '绑定手机号...'
      });
      const phoneNumber = res && res.phoneNumber;
      if (!phoneNumber) {
        throw new Error('empty phone');
      }
      const masked = phoneNumber.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
      this.setData({
        phoneFromWx: true,
        phone: phoneNumber,
        maskedPhone: masked,
        code: '',
        'errors.phone': '',
        'errors.code': ''
      });
      feedback.showToast({ title: '手机号已绑定', icon: 'success' });
    } catch (err) {
      feedback.showToast({
        title: (err && err.errMsg) || '微信绑定失败，请用短信验证码',
        icon: 'none'
      });
    } finally {
      this.setData({ wxPhoneLoading: false });
    }
  },

  async handleSendCode() {
    const { phone, agreed } = this.data;
    const errors = {};
    if (!phone.trim()) errors.phone = '请输入手机号';
    else if (!/^1[3-9]\d{9}$/.test(phone)) errors.phone = '请输入正确的手机号';
    if (!agreed) errors.agreed = '请阅读并同意隐私政策和用户协议';
    if (Object.keys(errors).length) {
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

      this.setData({
        code: '',
        codeSource,
        codeHintText: codeSource === 'experience' && debugCode
          ? `体验环境验证码：${debugCode}`
          : `验证码已发送至 ${phone}`,
        showCodeHint: true,
        countdown: 60,
        errors: {}
      });
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (this.data.countdown <= 1) {
          clearInterval(this.timer);
          this.timer = null;
          this.setData({ countdown: 0 });
        } else {
          this.setData({ countdown: this.data.countdown - 1 });
        }
      }, 1000);
    } catch (err) {
      if (err.errCode === 'RATE_LIMIT') {
        this.setData({ errors: { phone: err.errMsg } });
      } else if (err.errCode === 'FORBIDDEN') {
        feedback.showToast({
          title: (err && err.errMsg) || '后台未开启验证码功能，请联系管理员',
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

  _maskPhone(p) {
    const s = String(p || '').trim();
    if (!/^1\d{10}$/.test(s)) return s;
    return s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  },

  async onSave() {
    if (this.data.saving) return;

    let { nickname, avatar, phone, code, agreed, phoneFromWx } = this.data;
    const avatarFileID = String(this.data.avatarFileID || '').trim();
    nickname = String(nickname || '').trim();
    avatar = String(avatar || '').trim();
    const errors = {};

    if (!nickname) errors.nickname = '请填写昵称';
    if (!avatar.trim()) errors.avatar = '请选择头像';
    if (!agreed) errors.agreed = '请阅读并同意隐私政策和用户协议';

    if (!phoneFromWx) {
      if (!phone.trim()) errors.phone = '请输入手机号';
      else if (!/^1[3-9]\d{9}$/.test(phone)) errors.phone = '请输入正确的手机号';
      if (!code.trim()) errors.code = '请输入验证码';
      else if (code.length !== 6) errors.code = '请输入6位验证码';
    }

    if (Object.keys(errors).length) {
      this.setData({ errors });
      return;
    }

    const userId = this.data.draftUserId || 'anonymous';

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const avatarFinal = await normalizeAvatarForSave({
        avatar,
        avatarFileID,
        userId,
      });

      if (!phoneFromWx) {
        await request('auth.loginByPhone', {
          phone,
          code,
          agreePrivacy: true
        }, { showLoading: false, showError: false });
      }

      await request('user.updateProfile', {
        nickname,
        avatar: avatarFinal
      }, { showLoading: false, showError: false });

      const profileRes = await request('user.getProfile', {}, { showLoading: false, showError: false });
      const fresh = profileRes && profileRes.userInfo;
      if (!fresh || !fresh.userId) {
        throw new Error('获取用户信息失败');
      }

      auth.clearPendingLoginDraft();

      const parsedRole = parseInt(fresh.role, 10);
      const finalRole = Number.isNaN(parsedRole) ? Number(this.data.role) || 4 : parsedRole;
      const finalUserInfo = Object.assign({}, fresh, { role: finalRole });

      wx.hideLoading();
      this._completed = true;

      auth.setUserInfo(finalUserInfo);
      auth.markProfileJustUpdated();

      feedback.showToast({
        title: displayDict.text('LOGIN_SUCCESS'),
        icon: 'success'
      });

      const redirect = this.data.redirect || '';
      setTimeout(() => {
        this._navigateAfterLogin(finalUserInfo, redirect);
      }, 1200);
    } catch (err) {
      wx.hideLoading();
      console.error('profile-complete save', err);
      if (err.errCode === 'INVALID_PARAM') {
        this.setData({ errors: { code: '验证码错误或已过期' } });
      } else if (err && err.message === 'AVATAR_TEMP_URL_EXPIRED') {
        feedback.showToast({
          title: '当前头像链接已过期，请重新选择头像后再保存',
          icon: 'none'
        });
      } else if (err.errCode === 'AUTH_PHONE_WECHAT_CONFLICT') {
        feedback.showToast({
          title: err.errMsg || errorDict.text('AUTH_PHONE_WECHAT_CONFLICT'),
          icon: 'none',
          duration: 4000
        });
      } else {
        feedback.showToast({
          title: (err && err.errMsg) || '保存失败，请稍后重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ saving: false });
    }
  },

  _navigateAfterLogin(finalUserInfo, redirect) {
    const nn = String(finalUserInfo.nickname || '').trim();
    const av = String(finalUserInfo.avatar || '').trim();
    if (!nn || !av) {
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }
    if (redirect) {
      const resolved = auth.resolvePostLoginRedirect(redirect);
      if (resolved.blocked) {
        feedback.showWarning('招生端账号不能发起预约');
      }
      const url = resolved.url;
      const tabPages = ['/pages/index/index', '/pages/profile/profile'];
      const purePath = String(url).split('?')[0];
      if (tabPages.includes(purePath)) {
        wx.switchTab({ url: purePath });
      } else {
        wx.reLaunch({ url });
      }
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  goAgreement() {
    wx.navigateTo({ url: '/pages/user-agreement/user-agreement' });
  }
});
