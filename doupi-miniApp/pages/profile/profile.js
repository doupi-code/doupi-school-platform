const feedback = require('../../utils/feedback');
const { requestWithCheck } = require('../../utils/request');
const auth = require('../../utils/auth');
const { getAdminHomeUrl } = require('../../utils/adminEntry');
const { syncCustomTabBarSelected } = require('../../utils/tabBarSync');
const displayDict = require('../../utils/displayDict');
const errorDict = require('../../utils/errorDict');
const validationDict = require('../../utils/validationDict');
const { DEFAULT_AVATAR, resolveAvatarDisplay, hasCompletedBasicProfile } = require('../../utils/avatar');
const { hasAnyWorkbenchMenu } = require('../../utils/adminMenuConfig');

Page({
  data: {
    iconMap: {
      avatar: DEFAULT_AVATAR,
      phone: '/images/icons/mine-phone.svg',
      settings: '/images/icons/mine-settings.svg',
      more: '/images/icons/mine-arrow-right.svg',
      admin: '/images/icons/mine-admin.svg',
      qrcode: '/images/icons/mine-qrcode.svg',
      empty: '/images/icons/empty-default.svg'
    },
    userInfo: {
      name: '',
      phone: '',
      role: 4,
      avatar: ''
    },
    appointments: [],
    uncheckedAppointments: [],
    uncheckedAppointmentsPreview: [],
    recentAdminAppointmentsPreview: [],
    showCancelModal: false,
    selectedAppointmentId: null,
    hasAppointments: true,
    loading: true,
    adminEntryTitle: '进入管理后台',
    adminEntryDesc: '统一入口，按权限展示可用功能',
    showProfileEditModal: false,
    forceProfileEditModal: false,
    unreadMessageCount: 0,
    showAppointmentScrollHint: false,
    impersonating: false,
    impersonateHint: '',
    showAdminEntryCard: false,
    phoneBound: false,
    displayText: {
      noUncheckedBookings: displayDict.text('NO_UNCHECKED_BOOKINGS'),
      noRecentBookings: displayDict.text('NO_RECENT_BOOKINGS')
    }
  },

  _resolveRole(user) {
    const app = getApp();
    const candidate = user && (user.role ?? user.roleId ?? user.roleCode);
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && [1, 2, 3, 4, 5].includes(parsed)) {
      return parsed;
    }
    const globalRole = Number(app && app.globalData && app.globalData.role);
    if (Number.isInteger(globalRole) && [1, 2, 3, 4, 5].includes(globalRole)) {
      return globalRole;
    }
    return 4;
  },

  _getStatusTagType(status) {
    const map = {
      0: 'info', 1: 'success', 2: 'default', 3: 'success',
      pending: 'info', approved: 'info', verified: 'success', completed: 'success', cancelled: 'default'
    };
    return map[status] || 'default';
  },

  _getStatusText(status) {
    const map = {
      0: '待核销', 1: '已核销', 2: '已取消', 3: '已完成',
      pending: '待核销', approved: '待核销', verified: '已核销', completed: '已完成', cancelled: '已取消'
    };
    return map[status] || displayDict.text('UNKNOWN');
  },

  _formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = this._parseDate(dateStr);
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const date = this._parseDate(dateStr);
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('zh-CN');
  },

  _parseDate(input) {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    const str = String(input).trim();
    if (!str) return null;

    // iOS 兼容：将 "YYYY-MM-DD HH:mm" / "YYYY-MM-DD HH:mm:ss"
    // 以及 "YYYY-MM-DD HH:mm-HH:mm" 统一标准化
    if (str.includes(' ') && str.includes('-') && !str.includes('T')) {
      const parts = str.split(' ');
      if (parts.length >= 2) {
        const datePart = (parts[0] || '').replace(/-/g, '/');
        const timePart = parts[1] || '';
        // 时段格式只取开始时间：09:00-10:00 -> 09:00
        const startTime = timePart.includes('-') ? timePart.split('-')[0] : timePart;
        const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
        const normalized = `${datePart} ${normalizedTime}`.trim();
        return new Date(normalized);
      }
    }

    return new Date(str);
  },

  _maskPhone(phone) {
    if (!phone) return displayDict.text('NO_PHONE_BOUND');
    const str = String(phone);
    if (str.length < 7) return str;
    return `${str.slice(0, 3)}****${str.slice(-4)}`;
  },

  _filterUncheckedAppointments(appointments) {
    if (!appointments || !appointments.length) return [];
    return appointments
      .filter((appointment) => appointment.status === '待核销')
      .sort((a, b) => this._parseDate(b.appointmentTime).getTime() - this._parseDate(a.appointmentTime).getTime())
      .slice(0, 3);
  },

  _isParentRole() {
    return Number(this.data.userInfo.role) === 4;
  },

  _getAdminEntryMeta(role) {
    if (Number(role) === 1) {
      return { title: '进入超级管理员工作台', desc: '统一入口，查看全局业务、配置与权限能力' };
    }
    if (Number(role) === 5) {
      return { title: '进入管理员工作台', desc: '统一入口，查看全局招生业务与操作日志能力' };
    }
    if (Number(role) === 2) {
      return { title: '进入主任工作台', desc: '统一入口，查看团队预约、绑定、校园与日志能力' };
    }
    if (Number(role) === 3) {
      return { title: '进入老师工作台', desc: '统一入口，查看个人预约、二维码与核销能力' };
    }
    return { title: '进入管理后台', desc: '统一入口，按权限展示可用功能' };
  },

  _buildPreviewAppointments(appointments) {
    if (!appointments || appointments.length === 0) return [];
    const statusRank = { '待核销': 0, '已核销': 1, '已完成': 2, '已取消': 3 };
    const list = appointments.slice().sort((a, b) => {
      const r1 = statusRank[a.status] ?? 99;
      const r2 = statusRank[b.status] ?? 99;
      if (r1 !== r2) return r1 - r2;
      return this._parseDate(b.appointmentTime).getTime() - this._parseDate(a.appointmentTime).getTime();
    });
    return list.slice(0, 3);
  },

  _normalizeAppointmentItem(item) {
    const statusText = this._getStatusText(item.status);
    const appointmentTime = item.appointmentTime || `${item.visitDate || ''} ${item.visitTime || ''}`.trim();
    return {
      id: item._id || item.id || '',
      appointmentNumber: displayDict.valueOr(item.appointmentNo, 'NO_APPOINTMENT_NO'),
      studentName: displayDict.valueOr(item.studentName, 'UNFILLED'),
      visitDate: item.visitDate || this._formatDate(appointmentTime),
      visitTime: item.visitTime || this._extractTimeSlot(appointmentTime),
      appointmentTime: appointmentTime,
      status: statusText,
      createTime: this._formatDateTime(item.createdAt || item.createTime),
      _statusTagType: this._getStatusTagType(item.status)
    };
  },

  onLoad() {
    this.refreshProfileData();
  },

  onShow() {
    syncCustomTabBarSelected();
    const impersonating = auth.isImpersonating();
    this.setData({
      impersonating,
      impersonateHint: impersonating ? '当前为代维模式；退出将登出并需重新登录。' : ''
    });
    if (!auth.isLoggedIn()) {
      auth.requireLoginWithPrompt('/pages/profile/profile');
      return;
    }
    this.refreshProfileData();
  },

  async refreshProfileData() {
    if (!auth.isLoggedIn()) {
      await this._loadUserInfo();
      this.setData({
        appointments: [],
        uncheckedAppointments: [],
        uncheckedAppointmentsPreview: [],
        recentAdminAppointmentsPreview: [],
        unreadMessageCount: 0,
        showAppointmentScrollHint: false,
        hasAppointments: false
      });
      this._checkProfileEditModalFromDb();
      return;
    }
    if (!auth.isImpersonating() && auth.consumeProfileJustUpdated()) {
      this._applyUserInfoFromCache();
      await Promise.all([
        this._loadAppointments(),
        this._loadUnreadMessageCount()
      ]);
      this._checkProfileEditModalFromDb();
      return;
    }
    try {
      await this._loadUserInfo();
      await Promise.all([
        this._loadAppointments(),
        this._loadUnreadMessageCount()
      ]);
      this._checkProfileEditModalFromDb();
    } catch (err) {
      console.error('加载个人中心数据失败:', err);
      await this._loadUserInfo();
      await Promise.all([
        this._loadAppointments(),
        this._loadUnreadMessageCount()
      ]);
      this._checkProfileEditModalFromDb();
    }
  },

  onExitImpersonation() {
    auth.clearAuth();
    wx.reLaunch({ url: '/pages/login/login' });
  },

  _checkProfileEditModalFromDb() {
    if (auth.isImpersonating()) {
      return;
    }
    const raw = this._rawUserInfo || wx.getStorageSync('userInfo') || {};
    const needCompleteProfile = !!raw.needCompleteProfile && !hasCompletedBasicProfile(raw);
    if (needCompleteProfile) {
      this.openProfileEditModal(true);
    }
  },

  _getCachedUserInfo() {
    return wx.getStorageSync('userInfo') || {};
  },

  _applyUserInfoFromCache() {
    if (auth.isImpersonating()) {
      return;
    }
    const cachedUser = this._getCachedUserInfo();
    this._rawUserInfo = cachedUser;
    const r = this._resolveRole(cachedUser);
    this.setData({
      userInfo: {
        name: cachedUser.nickname || displayDict.text('USER_DEFAULT'),
        phone: this._maskPhone(cachedUser.phone),
        role: r,
        avatar: resolveAvatarDisplay(cachedUser.avatar)
      },
      phoneBound: !!cachedUser.phone,
      adminEntryTitle: this._getAdminEntryMeta(r).title,
      adminEntryDesc: this._getAdminEntryMeta(r).desc
    });
    this._syncAdminEntryVisibility(r).catch(() => {});
  },

  async _syncAdminEntryVisibility(role) {
    const r = Number(role || 0);
    if (![1, 2, 3, 5].includes(r)) {
      this.setData({ showAdminEntryCard: false });
      return;
    }
    if (r === 1) {
      this.setData({ showAdminEntryCard: true });
      return;
    }
    try {
      const has = await hasAnyWorkbenchMenu(r);
      this.setData({ showAdminEntryCard: !!has });
    } catch (e) {
      this.setData({ showAdminEntryCard: true });
    }
  },

  openProfileEditModal(force) {
    if (auth.isImpersonating()) {
      return;
    }
    this.setData({
      showProfileEditModal: true,
      forceProfileEditModal: !!force
    });
  },

  onProfileEditModalClose() {
    if (this.data.forceProfileEditModal) return;
    this.setData({ showProfileEditModal: false });
  },

  onProfileEditModalSaved(e) {
    const userInfo = (e && e.detail && e.detail.userInfo) || this._getCachedUserInfo();
    this.setData({
      showProfileEditModal: false,
      forceProfileEditModal: false,
      userInfo: {
        name: userInfo.nickname || displayDict.text('USER_DEFAULT'),
        phone: this._maskPhone(userInfo.phone),
        role: this._resolveRole(userInfo),
        avatar: resolveAvatarDisplay(userInfo.avatar)
      },
      phoneBound: !!userInfo.phone
    });
  },

  onRepairPhoneLogin() {
    auth.clearAuth();
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent('/pages/profile/profile')}`
    });
  },

  async _loadUserInfo() {
    try {
      if (!auth.isLoggedIn()) {
        const cachedUser = this._getCachedUserInfo();
        if (cachedUser) {
          this._rawUserInfo = cachedUser;
          this.setData({
            userInfo: {
              name: cachedUser.nickname || displayDict.text('USER_DEFAULT'),
              phone: this._maskPhone(cachedUser.phone),
              role: this._resolveRole(cachedUser),
              avatar: resolveAvatarDisplay(cachedUser.avatar)
            },
            phoneBound: !!cachedUser.phone
          });
        }
        return;
      }
      const result = await requestWithCheck('user.getProfile');
      const user = result && result.userInfo;
      if (!user) {
        throw new Error('INVALID_PROFILE_RESPONSE');
      }
      if (!user.phone) {
        feedback.showToast({
          title: '当前账号未返回手机号，请重新用手机号登录',
          icon: 'none'
        });
      }

      this._rawUserInfo = user;
      const pr = this._resolveRole(user);
      this.setData({
        userInfo: {
          name: user.nickname || displayDict.text('USER_DEFAULT'),
          phone: this._maskPhone(user.phone),
          role: pr,
          avatar: resolveAvatarDisplay(user.avatar)
        },
        phoneBound: !!user.phone,
        adminEntryTitle: this._getAdminEntryMeta(pr).title,
        adminEntryDesc: this._getAdminEntryMeta(pr).desc
      });
      await this._syncAdminEntryVisibility(pr);

      if (!auth.isImpersonating()) {
        wx.setStorageSync('userInfo', user);
      } else {
        auth.setUserInfo(user, { allowDuringImpersonation: true });
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      const cachedUser = this._getCachedUserInfo();
      if (cachedUser) {
        this._rawUserInfo = cachedUser;
        this.setData({
          userInfo: {
            name: cachedUser.nickname || displayDict.text('USER_DEFAULT'),
            phone: this._maskPhone(cachedUser.phone),
            role: this._resolveRole(cachedUser),
            avatar: resolveAvatarDisplay(cachedUser.avatar)
          },
          phoneBound: !!cachedUser.phone
        });
      }
    }
  },

  async _loadAppointments() {
    this.setData({ loading: true });

    try {
      if (!auth.isLoggedIn()) {
        this.setData({
          appointments: [],
          uncheckedAppointments: [],
          uncheckedAppointmentsPreview: [],
          hasAppointments: false,
          loading: false
        });
        return;
      }
      let appointments = [];
      let unchecked = [];
      let uncheckedPreview = [];
      let recentAdminAppointmentsPreview = [];

      if (this._isParentRole()) {
        const result = await requestWithCheck('appointment.list', {
          page: 1,
          pageSize: 50,
          includeStats: false,
          responseMode: 'summary'
        });
        const rawList = result.list || result.appointments || [];
        appointments = rawList.map((item) => this._normalizeAppointmentItem(item));
        unchecked = this._filterUncheckedAppointments(appointments);
        uncheckedPreview = this._buildPreviewAppointments(appointments);
      } else {
        // 与「预约管理」入口同一权限：无权限时静默，避免在「我的」误打扰（工作台入口已隐藏）
        const result = await requestWithCheck(
          'appointment.adminList',
          {
            page: 1,
            pageSize: 50,
            includeStats: false,
            responseMode: 'summary',
          },
          { showLoading: false, showError: false }
        );

        const rawList = result.list || result.appointments || [];
        appointments = rawList.map((item) => this._normalizeAppointmentItem(item));
        const recentAndReviewable = appointments
          .filter((item) => item.status === '待核销' || item.status === '已核销')
          .sort((a, b) => {
            const timeA = this._parseDate(a.appointmentTime || `${a.visitDate} ${a.visitTime}`);
            const timeB = this._parseDate(b.appointmentTime || `${b.visitDate} ${b.visitTime}`);
            const tsA = timeA && !Number.isNaN(timeA.getTime()) ? timeA.getTime() : 0;
            const tsB = timeB && !Number.isNaN(timeB.getTime()) ? timeB.getTime() : 0;
            return tsB - tsA;
          });
        recentAdminAppointmentsPreview = recentAndReviewable.slice(0, 3);
      }

      this.setData({
        appointments,
        uncheckedAppointments: unchecked,
        uncheckedAppointmentsPreview: uncheckedPreview,
        recentAdminAppointmentsPreview,
        showAppointmentScrollHint: (this._isParentRole() ? uncheckedPreview.length : recentAdminAppointmentsPreview.length) > 1,
        hasAppointments: appointments.length > 0,
        loading: false
      });
    } catch (err) {
      console.error('加载预约列表失败:', err);
      this.setData({
        loading: false,
        hasAppointments: false,
        appointments: [],
        uncheckedAppointments: [],
        uncheckedAppointmentsPreview: [],
        recentAdminAppointmentsPreview: [],
      });
    }
  },

  async _loadUnreadMessageCount() {
    try {
      if (!auth.isLoggedIn()) {
        this.setData({ unreadMessageCount: 0 });
        return;
      }
      const result = await requestWithCheck('message.count', {}, { showLoading: false, showError: false, cache: false });
      const unreadMessageCount = Number(result && result.unreadCount) || 0;
      this.setData({ unreadMessageCount });
    } catch (err) {
      // 未读数不影响主流程，静默失败
      this.setData({ unreadMessageCount: 0 });
    }
  },

  _extractTimeSlot(appointmentTime) {
    if (!appointmentTime) return '';
    const date = new Date(appointmentTime);
    const hours = date.getHours();
    if (hours < 12) return '09:00-11:00';
    if (hours < 14) return '14:00-16:00';
    return '15:00-17:00';
  },

  onNavigateToSettings() {
    auth.navigateIfLoggedIn('/pages/settings/settings');
  },

  onNavigateToBookingList() {
    auth.navigateIfLoggedIn('/pages/appointment-list/appointment-list');
  },

  onNavigateToAppointmentList() {
    this.onNavigateToBookingList();
  },

  onNavigateToRecentBookingList() {
    auth.navigateIfLoggedIn('/pages/admin/global-appointments/global-appointments?recentDays=7&source=profile');
  },

  onNavigateToRecentAppointmentList() {
    this.onNavigateToRecentBookingList();
  },

  onNavigateToBookingDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    if (this._isParentRole()) {
      wx.navigateTo({ url: `/pages/appointment-detail/appointment-detail?id=${id}` });
    } else {
      wx.navigateTo({ url: `/pages/admin/appointment-detail/appointment-detail?id=${id}` });
    }
  },

  onNavigateToAppointmentDetail(e) {
    this.onNavigateToBookingDetail(e);
  },

  onNavigateToNotification() {
    auth.navigateIfLoggedIn('/pages/message/message');
  },

  async onNavigateToAdmin() {
    const role = auth.getUserRole();
    if (!(await hasAnyWorkbenchMenu(role))) {
      feedback.showToast({ title: '当前权限配置不允许执行此操作', icon: 'none' });
      return;
    }
    const url = getAdminHomeUrl();
    auth.navigateIfLoggedIn(url);
  },

  onNavigateToTeacherQrcode() {
    auth.navigateIfLoggedIn('/pages/admin/teacher-qrcode/teacher-qrcode');
  },

  onVerifyBookingScan() {
    if (this._verifying) return;
    this._verifying = true;

    feedback.showToast({ title: displayDict.text('SCAN_PREPARING'), icon: 'none', duration: 800 });

    wx.scanCode({
      onlyFromCamera: true,
      success: async (res) => {
        console.log('[Profile] verify scan success:', res);
        const verifyCodePayload = String(res && res.result ? res.result : '').trim();
        if (!verifyCodePayload) {
          feedback.showToast({ title: validationDict.text('QRCODE_EMPTY'), icon: 'none' });
          return;
        }
        try {
          wx.showLoading({ title: '核销中...', mask: true });
          await requestWithCheck('teacher.verifyAppointment', { verifyCodePayload }, { showLoading: false });
          wx.hideLoading();
          feedback.showToast({ title: displayDict.text('VERIFY_SUCCESS'), icon: 'success' });
          // 让“我的预约”等数据及时刷新
          setTimeout(() => this.refreshProfileData(), 600);
        } catch (err) {
          wx.hideLoading();
          console.error('[Profile] verify failed:', err);
          // requestWithCheck 已 toast
        }
      },
      fail: (err) => {
        console.error('[Profile] scanCode fail:', err);
        if (!err || String(err.errMsg || '').indexOf('cancel') === -1) {
          feedback.showToast({ title: errorDict.text('SCAN_FAILED_RETRY'), icon: 'none' });
        }
      },
      complete: () => {
        setTimeout(() => {
          this._verifying = false;
        }, 800);
      }
    });
  },

  onCancelAppointment(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const appointment = this.data.appointments.find((a) => a.id === id);
    if (!appointment) return;
    if (appointment.status !== '待核销') {
      feedback.showToast({ title: displayDict.text('STATUS_CANNOT_CANCEL'), icon: 'none' });
      return;
    }
    this.setData({ showCancelModal: true, selectedAppointmentId: id });
  },

  onCancelModalClose() {
    this.setData({ showCancelModal: false, selectedAppointmentId: null });
  },

  async onConfirmCancel() {
    const appointmentId = this.data.selectedAppointmentId;
    if (!appointmentId) {
      this.setData({ showCancelModal: false, selectedAppointmentId: null });
      return;
    }

    try {
      wx.showLoading({ title: displayDict.text('CANCELLING') });
      await requestWithCheck(
        'appointment.cancel',
        { appointmentId },
        { showLoading: false, showError: true }
      );
      wx.hideLoading();

      const updatedAppointments = this.data.appointments.map((item) =>
        item.id === appointmentId ? { ...item, status: '已取消', _statusTagType: 'default' } : item
      );
      this.setData({
        appointments: updatedAppointments,
        uncheckedAppointments: this._filterUncheckedAppointments(updatedAppointments),
        uncheckedAppointmentsPreview: this._filterUncheckedAppointments(updatedAppointments).slice(0, 2),
        showAppointmentScrollHint: this._filterUncheckedAppointments(updatedAppointments).length > 1,
        showCancelModal: false,
        selectedAppointmentId: null
      });
      feedback.showToast({ title: displayDict.text('APPOINTMENT_CANCELLED'), icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      console.error('取消预约失败:', err);
      // requestWithCheck 已 toast
    }
  },

  onPullDownRefresh() {
    this.refreshProfileData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  preventMove() {
    return false;
  }
});
