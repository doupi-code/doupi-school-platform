/**
 * @fileoverview 预约列表页面 - 我的预约（v2.0 对接真实API）
 */
const feedback = require('../../utils/feedback');
const { request } = require('../../utils/request');
const auth = require('../../utils/auth');
const displayDict = require('../../utils/displayDict');
const errorDict = require('../../utils/errorDict');

const DRAFT_KEY = 'draft:pages/appointment-list/appointment-list';

function safeSetDraft(data) {
  try {
    wx.setStorageSync(DRAFT_KEY, Object.assign({}, data, { _savedAt: Date.now() }));
  } catch (_) {}
}

function safeGetDraft() {
  try {
    return wx.getStorageSync(DRAFT_KEY) || null;
  } catch (_) {
    return null;
  }
}

Page({
  data: {
    selectedDate: '',
    searchKeyword: '',
    selectedStatus: 'all',
    showDatePicker: false,
    showSortPicker: false,
    showCancelModal: false,
    cancelAppointmentId: null,
    appointments: [],
    filteredAppointments: [],
    dateOptions: [],
    dateDropdownOptions: [
      { value: '', label: '📅 参观日期' }
    ],
    loading: false,
    loadingMore: false,
    isEmpty: false,
    hasMore: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sortOrder: 'default',
    sortLabel: '状态优先',
    sortOptions: [
      { value: 'default', label: '⇅ 状态优先' },
      { value: 'date_asc', label: '⇅ 日期升序' },
      { value: 'date_desc', label: '⇅ 日期降序' }
    ],
    currentTab: 'all',
    tabs: [
      { value: 'all', label: '全部' },
      { value: 'pending', label: '待核销' },
      { value: 'verified', label: '已核销' },
      { value: 'cancelled', label: '已取消' }
    ],
    stats: { pending: 0, verified: 0, cancelled: 0 },
    displayText: {
      noBookings: displayDict.text('NO_BOOKINGS'),
      noRecordInTab: displayDict.text('NO_RECORD'),
      emptyNoBookingsDesc: displayDict.text('EMPTY_NO_BOOKINGS_DESC'),
      emptyNoBookingsInStatusPrefix: displayDict.text('EMPTY_NO_BOOKINGS_IN_STATUS_PREFIX'),
      btnBookNow: displayDict.text('BTN_BOOK_NOW'),
      btnCancelBooking: displayDict.text('BTN_CANCEL_BOOKING'),
      btnViewDetail: displayDict.text('BTN_VIEW_DETAIL'),
      loadingText: displayDict.text('LOADING_TEXT'),
      loadMoreText: displayDict.text('LOAD_MORE_TEXT'),
      noMoreText: displayDict.text('NO_MORE_TEXT'),
      modalCancelBookingTitle: displayDict.text('MODAL_CANCEL_BOOKING_TITLE'),
      modalCancelBookingContent: displayDict.text('MODAL_CANCEL_BOOKING_CONTENT'),
      btnConfirmCancel: displayDict.text('BTN_CONFIRM_CANCEL'),
      btnRethink: displayDict.text('BTN_RETHINK'),
      statPending: displayDict.text('APPOINTMENT_STAT_PENDING'),
      statVerified: displayDict.text('APPOINTMENT_STAT_VERIFIED'),
      statCancelled: displayDict.text('APPOINTMENT_STAT_CANCELLED'),
      labelVisitDate: displayDict.text('APPOINTMENT_LABEL_VISIT_DATE'),
      labelVisitTime: displayDict.text('APPOINTMENT_LABEL_VISIT_TIME'),
      labelVisitorName: displayDict.text('APPOINTMENT_LABEL_VISITOR_NAME'),
      labelContactPhone: displayDict.text('APPOINTMENT_LABEL_CONTACT_PHONE'),
      labelVisitorCount: displayDict.text('APPOINTMENT_LABEL_VISITOR_COUNT')
    }
  },

  onLoad() {
    // 恢复筛选草稿（登录前后的筛选/搜索不丢）
    const draft = safeGetDraft();
    if (draft) {
      this.setData({
        selectedDate: draft.selectedDate || '',
        searchKeyword: draft.searchKeyword || '',
        sortOrder: draft.sortOrder || 'default',
        sortLabel: draft.sortLabel || '状态优先',
        currentTab: draft.currentTab || 'all'
      });
    }

    // 进入“我的预约”必须登录（按你最新规则）
    if (!auth.isLoggedIn()) {
      auth.requireLoginWithPrompt('/pages/appointment-list/appointment-list');
      return;
    }
    this.loadAppointments();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.reloadAppointments();
  },

  normalizeAppointment(appointment) {
    const phoneRaw = (() => {
      const phone = appointment.parentPhone || appointment.phone || appointment.mobile || '';
      const s = String(phone || '').replace(/\s+/g, '');
      return s;
    })();

    return {
      id: appointment._id || appointment.id,
      appointmentNo: appointment.appointmentNo || appointment.bookingNo || '',
      visitDate: appointment.visitDate || appointment.appointmentDate || appointment.date || displayDict.text('PENDING'),
      visitTime: appointment.visitTime || appointment.appointmentTimeRange || appointment.timeRange || appointment.time || displayDict.text('PENDING'),
      visitorName: appointment.parentName || appointment.userName || appointment.nickname || appointment.name || displayDict.text('USER_DEFAULT'),
      // 仅用于“拨打电话”事件：这里尽量保留原始值（可能包含 * 脱敏符号）
      visitorPhoneRaw: phoneRaw,
      // 列表展示：脱敏手机号
      visitorPhone: (() => {
        const s = phoneRaw;
        if (!s || s.length < 7) return displayDict.text('NO_PHONE_LEFT');
        return `${s.replace(/[^\d]/g, '').slice(0, 3)}****${s.replace(/[^\d]/g, '').slice(-4)}`;
      })(),
      visitorCount: appointment.visitorCount || appointment.peopleCount || appointment.visitors || appointment.visitor_count || null,
      status: this.mapStatus(appointment.status),
      submitTime: (() => {
        const ts = appointment.createTime || appointment.createdAt || appointment.create_time || '';
        if (!ts) return displayDict.text('NO_RECORD');
        const d = new Date(ts);
        return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
      })()
    };
  },

  rebuildDateOptions(appointments) {
    const dateOptions = [...new Set((appointments || []).map((item) => item.visitDate).filter(Boolean))].sort();
    const dateDropdownOptions = [
      { value: '', label: '📅 参观日期' },
      ...dateOptions.map((date) => ({ value: date, label: `📅 ${date}` }))
    ];
    this.setData({ dateOptions, dateDropdownOptions });
  },

  async reloadAppointments() {
    return this.loadAppointments(true);
  },

  async loadAppointments(reset) {
    const shouldReset = reset !== false;
    if ((shouldReset && this.data.loading) || (!shouldReset && (this.data.loading || this.data.loadingMore || !this.data.hasMore))) {
      return;
    }

    const nextPage = shouldReset ? 1 : this.data.page + 1;
    this.setData(shouldReset ? { loading: true } : { loadingMore: true });
    try {
      const result = await request('appointment.list', {
        page: nextPage,
        size: this.data.pageSize,
        includeStats: shouldReset,
        responseMode: 'summary'
      }, { showLoading: shouldReset, showError: false });
      const rawList = result.appointments || result.list || [];
      const normalizedAppointments = rawList.map((appointment) => this.normalizeAppointment(appointment));
      const appointments = shouldReset ? normalizedAppointments : this.data.appointments.concat(normalizedAppointments);
      this.setData({
        appointments,
        page: nextPage,
        total: Number(result.total || appointments.length || 0),
        hasMore: !!result.hasMore,
        stats: result.stats || this.data.stats,
        loading: false,
        loadingMore: false
      });
      this.rebuildDateOptions(appointments);
      if (!result.stats) {
        this.calcStats();
      }
      this.applyFilter();
    } catch (err) {
      console.error('加载预约列表失败:', err);
      this.setData(shouldReset ? {
        loading: false,
        loadingMore: false,
        appointments: [],
        filteredAppointments: [],
        hasMore: false,
        total: 0
      } : {
        loading: false,
        loadingMore: false
      });
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    }
  },

  mapStatus(status) {
    if (status === 0 || status === 'pending' || status === 'approved') return 'pending';
    if (status === 1 || status === 'verified' || status === 'completed') return 'verified';
    if (status === 2 || status === 'cancelled' || status === 'rejected') return 'cancelled';
    return 'pending';
  },

  calcStats() {
    const { appointments } = this.data;
    this.setData({
      stats: {
        pending: appointments.filter((a) => a.status === 'pending').length,
        verified: appointments.filter((a) => a.status === 'verified').length,
        cancelled: appointments.filter((a) => a.status === 'cancelled').length
      }
    });
  },

  applyFilter() {
    const { appointments, selectedDate, currentTab, sortOrder, searchKeyword } = this.data;
    let filtered = appointments.filter((appointment) => {
      if (selectedDate && appointment.visitDate !== selectedDate) return false;
      if (currentTab !== 'all' && appointment.status !== currentTab) return false;
      if (searchKeyword) {
        const kw = String(searchKeyword).toLowerCase().trim();
        if (kw) {
          const haystack = [
            appointment.visitorName,
            appointment.visitorPhone,
            appointment.visitDate,
            appointment.visitTime
          ].join(' ').toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
      }
      return true;
    });
    if (sortOrder === 'date_asc') {
      filtered.sort((a, b) => `${a.visitDate} ${a.visitTime}`.localeCompare(`${b.visitDate} ${b.visitTime}`));
    } else if (sortOrder === 'date_desc') {
      filtered.sort((a, b) => `${b.visitDate} ${b.visitTime}`.localeCompare(`${a.visitDate} ${a.visitTime}`));
    } else {
      // 默认排序：先按状态（待核销->已核销->已取消），再按时间倒序
      const statusRank = {
        pending: 0,
        verified: 1,
        cancelled: 2
      };
      filtered.sort((a, b) => {
        const rankDiff = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        return `${b.visitDate} ${b.visitTime}`.localeCompare(`${a.visitDate} ${a.visitTime}`);
      });
    }
    this.setData({
      filteredAppointments: filtered,
      isEmpty: filtered.length === 0
    });

    safeSetDraft({
      selectedDate: this.data.selectedDate,
      searchKeyword: this.data.searchKeyword,
      sortOrder: this.data.sortOrder,
      sortLabel: this.data.sortLabel,
      currentTab: this.data.currentTab
    });
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status || 'all';
    this.setData({ currentTab: status });
    this.applyFilter();
  },

  onTabChange(e) {
    const status = e.currentTarget.dataset.value || 'all';
    this.setData({ currentTab: status });
    this.applyFilter();
  },

  onToggleDatePicker() {
    this.setData({ showDatePicker: !this.data.showDatePicker, showSortPicker: false });
  },

  onToggleSortPicker() {
    this.setData({ showSortPicker: !this.data.showSortPicker, showDatePicker: false });
  },

  onSelectDate(e) {
    const { date } = e.currentTarget.dataset;
    this.setData({ selectedDate: date || '', showDatePicker: false });
    this.applyFilter();
  },

  onDateFilterChange(e) {
    const selectedDate = (e && e.detail && e.detail.value) || '';
    this.setData({ selectedDate, showDatePicker: false });
    this.applyFilter();
  },

  onSelectSort(e) {
    const sort = e.currentTarget.dataset.sort || 'default';
    const hit = this.data.sortOptions.find((opt) => opt.value === sort);
    this.setData({
      sortOrder: sort,
      sortLabel: hit ? hit.label : '状态优先',
      showSortPicker: false
    });
    this.applyFilter();
  },

  onSortFilterChange(e) {
    const sort = (e && e.detail && e.detail.value) || 'default';
    const hit = this.data.sortOptions.find((opt) => opt.value === sort);
    this.setData({
      sortOrder: sort,
      sortLabel: hit ? hit.label : '状态优先',
      showSortPicker: false
    });
    this.applyFilter();
  },

  onSearchChange(e) {
    const value = (e && e.detail && e.detail.value) || '';
    this.setData({ searchKeyword: value });
    this.applyFilter();
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.applyFilter();
  },

  goToAppointment() {
    wx.showModal({
      title: '请扫码预约',
      content: '预约只能通过招生老师二维码进入，请扫码后再填写预约信息。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  onMaskTap() {
    this.setData({ showDatePicker: false, showSortPicker: false });
  },

  onNavigateBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    });
  },

  onNavigateToDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/appointment-detail/appointment-detail?id=${id}` });
  },

  onCancelBooking(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ showCancelModal: true, cancelAppointmentId: id });
  },

  onCancelModalClose() {
    this.setData({ showCancelModal: false, cancelAppointmentId: null });
  },

  makeCallFromList(e) {
    const phoneRaw =
      (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.phoneRaw) || '';

    // 兼容后端可能返回的脱敏字符串（带 *）
    const rawStr = String(phoneRaw || '');
    const hadMask = rawStr.includes('*');
    const digits = rawStr.replace(/[^\d]/g, '');

    if (!digits || digits.length < 7 || hadMask) {
      feedback.showToast({ title: displayDict.text('NO_PHONE_LEFT'), icon: 'none' });
      return;
    }

    wx.makePhoneCall({ phoneNumber: digits });
  },

  async onConfirmCancel() {
    const appointmentId = this.data.cancelAppointmentId;
    if (!appointmentId) return this.onCancelModalClose();
    wx.showLoading({ title: displayDict.text('CANCELLING') });
    try {
      await request('appointment.cancel', { appointmentId }, { showError: true });
      wx.hideLoading();
      const updatedAppointments = this.data.appointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: 'cancelled' } : appointment
      );
      this.setData({
        appointments: updatedAppointments,
        showCancelModal: false,
        cancelAppointmentId: null,
        stats: Object.assign({}, this.data.stats, {
          pending: Math.max(0, Number(this.data.stats.pending || 0) - 1),
          cancelled: Number(this.data.stats.cancelled || 0) + 1
        })
      });
      this.calcStats();
      this.applyFilter();
      feedback.showToast({ title: displayDict.text('BOOKING_CANCELLED'), icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      console.error('取消预约失败:', err);
      // request 已 toast
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading || this.data.loadingMore) return;
    this.loadAppointments(false);
  },

  onPullDownRefresh() {
    this.reloadAppointments().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  preventMove() {
    return false;
  }
});
