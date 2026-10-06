const feedback = require('../../../utils/feedback');
const app = getApp();
const { requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const runtimeStage = require('../../../utils/runtimeStage');

Page({
  data: {
    isBound: false,
    teacherInfo: {
      name: '',
      phone: '',
      roleText: '招生老师',
      code: '',
      bindDate: '',
      directorName: '',
      directorAvatar: ''
    },
    bindRequest: {
      status: '',
      directorName: '',
      rejectReason: '',
    },
    canUseQrFeature: false,
    qrUnavailableText: '审核通过后可生成个人招生二维码',
    qrCodeData: {
      qrImageUrl: '',
      qrFileID: '',
      qrContent: '',
      qrLink: '',
      status: 'none'
    },
    runtimeStage: '',
    qrValidityText: '',
    qrImageLoading: false,
    bindingLoading: false,
    statsLoading: false,
    stats: {
      totalScanCount: 0,
      appointmentByQrCount: 0,
      verifiedCount: 0
    },
    loading: false,
    generating: false,
    resetting: false,
    displayText: {
      unbound: displayDict.text('UNBOUND'),
      noRecord: displayDict.text('NO_RECORD'),
      noQrDownload: displayDict.text('NO_QR_DOWNLOAD'),
      btnScanBindDirector: displayDict.text('BTN_SCAN_BIND_DIRECTOR_SHORT'),
      generatingQr: displayDict.text('GENERATING_QR'),
      clickGenerateQr: displayDict.text('CLICK_GENERATE_QR'),
      btnDownloadQr: displayDict.text('BTN_DOWNLOAD_QR'),
      btnShareQr: displayDict.text('BTN_SHARE_QR'),
      resetting: displayDict.text('RESETTING'),
      btnRegenerateQr: displayDict.text('BTN_REGENERATE_QR')
    }
  },

  _applyQrCodeData(data) {
    if (!data) return;
    const qrLink = data.path || this._getQrPath(data.inviteKey);
    const currentRuntimeStage = runtimeStage.normalizeRuntimeStage(data.runtimeStage) || runtimeStage.getCurrentRuntimeStage();
    this.setData({
      runtimeStage: currentRuntimeStage,
      qrValidityText: String(data.qrValidityText || '').trim(),
      'qrCodeData.qrImageUrl': data.qrImageUrl || data.qrFileID || '',
      'qrCodeData.qrFileID': data.qrFileID || '',
      'qrCodeData.qrContent': data.inviteKey || '',
      'qrCodeData.qrLink': qrLink,
      'qrCodeData.status': (data.qrImageUrl || data.qrFileID) ? 'active' : 'none',
      qrImageLoading: !!(data.qrImageUrl || data.qrFileID)
    });
  },

  async onLoad() {
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'teacher-qrcode');
    if (!granted) {
      return;
    }
    this._pageReady = true;
    this._skipNextShowRefresh = true;
    await this.loadTeacherInfo();
  },

  onShow() {
    if (!this._pageReady) return;
    if (this._skipNextShowRefresh) {
      this._skipNextShowRefresh = false;
      return;
    }
    this.loadTeacherInfo();
  },

  _maskPhone(phone) {
    if (!phone) return displayDict.text('NO_PHONE_BOUND');
    const raw = String(phone);
    return raw.length >= 7 ? `${raw.slice(0, 3)}****${raw.slice(-4)}` : raw;
  },

  _buildTeacherCode(userId) {
    if (!userId) return 'TEACHER_---';
    return `TEACHER_${String(userId).slice(-3).toUpperCase()}`;
  },

  _getRoleText(role) {
    const roleMap = {
      1: '超级管理员',
      2: '招生主任',
      3: '招生老师',
      5: '管理员',
    };
    return roleMap[Number(role) || 0] || '招生老师';
  },

  _isTeacherRole(role) {
    return Number(role) === 3;
  },

  _isPrivilegedRole(role) {
    return [1, 2, 5].includes(Number(role));
  },

  _canUseQrFeature(role, isBound) {
    return this._isTeacherRole(role) ? !!isBound : this._isPrivilegedRole(role);
  },

  _getQrUnavailableText(role, bindRequestStatus) {
    if (!this._isTeacherRole(role)) {
      return '点击生成专属招生二维码';
    }
    if (bindRequestStatus === 'pending') {
      return '绑定审核通过后可生成个人招生二维码';
    }
    if (bindRequestStatus === 'rejected') {
      return '绑定申请已驳回，请重新绑定招生主任';
    }
    return '请先绑定招生主任后再生成二维码';
  },

  _getQrBlockedToast(role, action) {
    if (!this._isTeacherRole(role)) {
      return `${action}失败，请稍后重试`;
    }
    return `请等待绑定审核通过后再${action}`;
  },

  _getQrPath(inviteKey) {
    const key = String(inviteKey || '').trim();
    return key ? `/pages/appointment/appointment?inviteKey=${encodeURIComponent(key)}` : '';
  },

  _formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  _isCurrentLoad(ticket) {
    return !ticket || this._loadTicket === ticket;
  },

  async loadTeacherInfo() {
    try {
      const loadTicket = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this._loadTicket = loadTicket;
      this.setData({ bindingLoading: true });
      const data = await requestWithCheck('user.getProfile', {}, { showLoading: false, showError: false });
      const user = data && data.userInfo;
      if (!user) return;
      const role = Number(user.role || 0);
      const isTeacher = this._isTeacherRole(role);
      const isPrivileged = this._isPrivilegedRole(role);
      this.setData({
        teacherInfo: {
          name: user.nickname || '老师',
          phone: this._maskPhone(user.phone),
          roleText: this._getRoleText(role),
          code: this._buildTeacherCode(user.userId),
          bindDate: '',
          directorName: '',
          directorAvatar: ''
        },
        bindRequest: {
          status: '',
          directorName: '',
          rejectReason: '',
        },
        canUseQrFeature: isPrivileged,
        qrUnavailableText: isPrivileged ? '点击生成专属招生二维码' : '正在检查绑定状态...'
      });

      const qrPromise = (isPrivileged || isTeacher)
        ? this.loadQrCode(true, { silentBlockedError: isTeacher, ticket: loadTicket })
        : Promise.resolve();
      const statsPromise = isTeacher
        ? this.loadTeacherStats(true, role, { ticket: loadTicket })
        : Promise.resolve();

      const [bindRes, bindReqRes] = await Promise.all([
        requestWithCheck('binding.adminStatus', {}, { showLoading: false, showError: false }).catch(() => null),
        requestWithCheck('binding.getMyBindRequestStatus', {}, { showLoading: false, showError: false }).catch(() => null)
      ]);
      if (!this._isCurrentLoad(loadTicket)) return;
      const latestReq = (bindReqRes && bindReqRes.latest) || null;
      const isBound = !!(bindRes && bindRes.isBound);
      const canUseQrFeature = this._canUseQrFeature(role, isBound);

      this.setData({
        isBound,
        teacherInfo: {
          name: user.nickname || '老师',
          phone: this._maskPhone(user.phone),
          roleText: this._getRoleText(role),
          code: this._buildTeacherCode(user.userId),
          bindDate: isTeacher ? this._formatDate(bindRes && bindRes.bindingTime) : '',
          directorName: isTeacher ? ((bindRes && bindRes.directorInfo && bindRes.directorInfo.nickname) || (isBound ? '主任信息待补全' : '')) : '',
          directorAvatar: isTeacher ? ((bindRes && bindRes.directorInfo && bindRes.directorInfo.avatar) || '') : ''
        },
        bindRequest: {
          status: isTeacher ? ((latestReq && latestReq.status) || '') : '',
          directorName: isTeacher ? ((latestReq && latestReq.directorName) || '') : '',
          rejectReason: isTeacher ? ((latestReq && latestReq.rejectReason) || '') : '',
        },
        canUseQrFeature,
        qrUnavailableText: this._getQrUnavailableText(role, latestReq && latestReq.status),
        bindingLoading: false,
      });
      app.globalData.userInfo = Object.assign({}, app.globalData.userInfo || {}, user);
      if (!canUseQrFeature) {
        this.resetQrState();
      }
      await Promise.allSettled([qrPromise, statsPromise]);
    } catch (err) {
      this.setData({ bindingLoading: false });
      console.error('加载老师信息失败:', err);
      feedback.showToast({ title: (err && err.errMsg) || errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    }
  },

  resetQrState() {
    this.setData({
      qrCodeData: {
        qrImageUrl: '',
        qrFileID: '',
        qrContent: '',
        qrLink: '',
        status: 'none'
      },
      runtimeStage: runtimeStage.getCurrentRuntimeStage(),
      qrValidityText: '',
      qrImageLoading: false,
      stats: {
        totalScanCount: 0,
        appointmentByQrCount: 0,
        verifiedCount: 0
      }
    });
  },

  async loadQrCode(forceEnabled = this.data.canUseQrFeature, options = {}) {
    if (!forceEnabled) {
      this.resetQrState();
      return;
    }
    const opts = options || {};
    this.setData({ loading: true, qrImageLoading: true });
    try {
      const data = await requestWithCheck(
        'teacher.getInvitePayload',
        { withImage: true },
        { showLoading: false, showError: false }
      );
      if (!this._isCurrentLoad(opts.ticket)) return;

      if (data && data.inviteKey) {
        this._applyQrCodeData(data);
      } else {
        this.setData({ 'qrCodeData.status': 'none', qrImageLoading: false });
      }
    } catch (err) {
      if (!this._isCurrentLoad(opts.ticket)) return;
      console.error('加载二维码失败:', err);
      const message = String((err && (err.errMsg || err.message)) || '');
      if (message.includes('待审核')) {
        this.setData({ qrImageLoading: false });
        if (opts.silentBlockedError) return;
        feedback.showToast({ title: '绑定申请待审核，审核通过后可生成二维码', icon: 'none' });
        return;
      }
      if (message.includes('驳回')) {
        this.setData({ qrImageLoading: false });
        if (opts.silentBlockedError) return;
        feedback.showToast({ title: '绑定申请已驳回，请重新绑定招生主任', icon: 'none' });
        return;
      }
      if (this._isTeacherRole(auth.getUserRole()) && (message.includes('绑定') || message.includes('主任'))) {
        this.setData({ qrImageLoading: false });
        if (opts.silentBlockedError) return;
        wx.showModal({
          title: '尚未绑定招生主任',
          content: '请先去绑定招生主任，提交申请后即可生成二维码。',
          confirmText: '去绑定',
          success: (res) => {
            if (res.confirm) {
              this.goBindDirector();
            }
          },
        });
        return;
      }
      this.setData({ qrImageLoading: false });
      feedback.showToast({
        title: this._isPrivilegedRole(auth.getUserRole()) ? '二维码加载失败，请稍后重试' : displayDict.text('BIND_REQUIRED_BEFORE_QR'),
        icon: 'none'
      });
    } finally {
      if (this._isCurrentLoad(opts.ticket)) {
        this.setData({ loading: false });
      }
    }
  },

  async loadTeacherStats(forceEnabled = this.data.canUseQrFeature, role = auth.getUserRole(), options = {}) {
    const opts = options || {};
    if (!forceEnabled) {
      this.setData({
        statsLoading: false,
        stats: {
          totalScanCount: 0,
          appointmentByQrCount: 0,
          verifiedCount: 0
        }
      });
      return;
    }
    try {
      this.setData({ statsLoading: true });
      const data = await requestWithCheck('teacher.stats', {}, { showLoading: false, showError: false });
      if (!this._isCurrentLoad(opts.ticket)) return;
      if (!data) return;
      this.setData({
        statsLoading: false,
        stats: {
          totalScanCount: Number(data.totalScanCount || 0),
          appointmentByQrCount: Number(data.appointmentByQrCount || 0),
          verifiedCount: Number(data.verifiedCount || 0)
        }
      });
    } catch (err) {
      if (!this._isCurrentLoad(opts.ticket)) return;
      this.setData({
        statsLoading: false,
        stats: {
          totalScanCount: 0,
          appointmentByQrCount: 0,
          verifiedCount: 0
        }
      });
    }
  },

  goBindDirector() {
    wx.navigateTo({ url: '/pages/admin/bind-director/bind-director' });
  },

  async generateQrCode() {
    if (!this.data.canUseQrFeature) {
      feedback.showToast({ title: this._getQrBlockedToast(auth.getUserRole(), '生成二维码'), icon: 'none' });
      return;
    }
    if (this.data.generating) return;
    this.setData({ generating: true });
    try {
      wx.showLoading({ title: displayDict.text('GENERATING') });
      const data = await requestWithCheck(
        'teacher.getInvitePayload',
        { withImage: true },
        { showLoading: false }
      );
      wx.hideLoading();
      if (data) {
        this._applyQrCodeData(data);
        feedback.showToast({ title: displayDict.text('UPDATE_SUCCESS'), icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('生成二维码失败:', err);
      // requestWithCheck 已 toast
    } finally {
      this.setData({ generating: false });
    }
  },

  async resetQrCode() {
    if (!this.data.canUseQrFeature) {
      feedback.showToast({ title: this._getQrBlockedToast(auth.getUserRole(), '重置二维码'), icon: 'none' });
      return;
    }
    if (this.data.resetting) return;
    this.setData({ resetting: true });

    try {
      wx.showLoading({ title: displayDict.text('RESETTING') });

      await requestWithCheck('teacher.resetInvite', {}, { showLoading: false });
      const data = await requestWithCheck(
        'teacher.getInvitePayload',
        { withImage: true },
        { showLoading: false }
      );

      wx.hideLoading();

      if (data) {
        this._applyQrCodeData(data);
        feedback.showToast({ title: displayDict.text('RESET_SUCCESS_OLD_INVALID'), icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('重置二维码失败:', err);
      // requestWithCheck 已 toast
    } finally {
      this.setData({ resetting: false });
    }
  },

  previewQrCode() {
    if (!this.data.qrCodeData.qrImageUrl) return;
    wx.previewImage({
      current: this.data.qrCodeData.qrImageUrl,
      urls: [this.data.qrCodeData.qrImageUrl]
    });
  },

  downloadQrCode() {
    if (!this.data.qrCodeData.qrFileID) {
      feedback.showToast({ title: this.data.displayText.noQrDownload, icon: 'none' });
      return;
    }

    wx.showLoading({ title: displayDict.text('SAVING') });

    // 先获取图片临时路径
    wx.cloud.downloadFile({
      fileID: this.data.qrCodeData.qrFileID,
      success: (downloadRes) => {
        wx.saveImageToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            wx.hideLoading();
            feedback.showToast({ title: displayDict.text('ALBUM_SAVE_SUCCESS'), icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg.indexOf('auth deny') !== -1 ||
                err.errMsg.indexOf('authorize') !== -1) {
              wx.showModal({
                title: displayDict.text('MODAL_PERMISSION_REQUIRED_TITLE'),
                content: displayDict.text('MODAL_PERMISSION_REQUIRED_CONTENT'),
                confirmText: displayDict.text('BTN_GO_SETTING'),
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              feedback.showToast({ title: errorDict.text('SAVE_FAILED'), icon: 'none' });
            }
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        feedback.showToast({ title: errorDict.text('IMAGE_DOWNLOAD_FAILED'), icon: 'none' });
      }
    });
  },

  copyQrLink() {
    const { qrLink } = this.data.qrCodeData;
    if (!qrLink) return;
    wx.setClipboardData({
      data: qrLink,
      success: () => feedback.showToast({ title: displayDict.text('LINK_COPIED'), icon: 'success' })
    });
  },

  onShareAppMessage() {
    return {
      title: `${this.data.teacherInfo.name}老师邀请您预约探校`,
      path: this.data.qrCodeData.qrLink || '/pages/appointment/appointment',
      imageUrl: this.data.qrCodeData.qrImageUrl || ''
    };
  },

  onQrImageLoad() {
    this.setData({ qrImageLoading: false });
  },

  onQrImageError() {
    this.setData({
      qrImageLoading: false,
      'qrCodeData.qrImageUrl': '',
      'qrCodeData.qrFileID': '',
      'qrCodeData.status': 'none'
    });
    feedback.showToast({ title: '二维码加载失败，请重试', icon: 'none' });
  },

  goBack() {
    wx.navigateBack();
  }
});
