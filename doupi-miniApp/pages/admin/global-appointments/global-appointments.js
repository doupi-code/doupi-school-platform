/**
 * @fileoverview 预约管理列表（统一页，v2.0 对接真实API）
 */

const feedback = require('../../../utils/feedback');
const { request, requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    searchKeyword: '',
    showStatusFilter: false,
    selectedStatus: 'all',
    selectedSource: '',
    statusMap: {
      all: '全部状态',
      pending: '待核销',
      verified: '已核销',
      cancelled: '已取消'
    },
    sourceMap: {
      scan: '扫码预约',
      manual: '手动预约'
    },
    
    appointments: [],
    filteredAppointments: [],
    
    page: 1,
    pageSize: 20,
    total: 0,
    
    stats: { total: 0, pending: 0, verified: 0, cancelled: 0 },
    startDate: '',
    endDate: '',
    startDateText: '',
    endDateText: '',
    limitRecentDays: 0,
    emptyHint: displayDict.text('SCOPE_EMPTY_BOOKINGS'),
    loading: false,
    refreshing: false
    ,
    filterTeacherId: '',
    filterTeacherName: '',

    // 老师工作台：未绑定时给出绑定申请入口
    bindStatusLoaded: false,
    isTeacherBound: true,
    displayText: {
      unbound: displayDict.text('UNBOUND'),
      emptyBookings: displayDict.text('SCOPE_EMPTY_BOOKINGS'),
      btnScanBindDirector: '去绑定招生主任',
      btnClear: displayDict.text('BTN_CLEAR'),
      statAll: displayDict.text('STAT_ALL'),
      statPending: displayDict.text('APPOINTMENT_STAT_PENDING'),
      statVerified: displayDict.text('APPOINTMENT_STAT_VERIFIED'),
      statCancelled: displayDict.text('APPOINTMENT_STAT_CANCELLED'),
      labelParent: displayDict.text('LABEL_PARENT'),
      labelResponsibleTeacher: displayDict.text('LABEL_RESPONSIBLE_TEACHER'),
      labelBookingTime: displayDict.text('LABEL_BOOKING_TIME'),
      labelSubmitTime: displayDict.text('LABEL_SUBMIT_TIME'),
      labelCurrentSchool: displayDict.text('LABEL_CURRENT_SCHOOL'),
      btnViewDetail: displayDict.text('BTN_VIEW_DETAIL'),
      btnExportFilteredResult: displayDict.text('BTN_EXPORT_FILTERED_RESULT')
    }
  },

  onLoad(options = {}) {
    const recentDays = Number(options.recentDays || 0);
    const teacherId = options.teacherId ? String(options.teacherId).trim() : '';
    const teacherName = options.teacherName ? decodeURIComponent(String(options.teacherName)) : '';
    const presetStatus = options.status ? String(options.status).trim() : '';
    const presetSource = options.source ? String(options.source).trim() : '';
    const timeRange = options.timeRange ? String(options.timeRange).trim() : '';
    const nextData = {};

    if (teacherId) {
      nextData.filterTeacherId = teacherId;
      nextData.filterTeacherName = teacherName;
    }
    if (presetStatus && this.data.statusMap[presetStatus]) {
      nextData.selectedStatus = presetStatus;
    }
    if (presetSource && this.data.sourceMap[presetSource]) {
      nextData.selectedSource = presetSource;
    }
    if (recentDays > 0) {
      const range = this.getRecentDateRange(recentDays);
      nextData.limitRecentDays = recentDays;
      nextData.startDate = range.start;
      nextData.endDate = range.end;
      nextData.startDateText = this._toDateInputValue(range.start);
      nextData.endDateText = this._toDateInputValue(range.end);
    } else if (timeRange) {
      const range = this.getRangeByTimeKey(timeRange);
      nextData.startDate = range.start;
      nextData.endDate = range.end;
      nextData.startDateText = this._toDateInputValue(range.start);
      nextData.endDateText = this._toDateInputValue(range.end);
    }
    if (Object.keys(nextData).length > 0) {
      this.setData(nextData);
    }
  },

  clearPresetSource() {
    if (!this.data.selectedSource) return;
    this.setData({
      selectedSource: ''
    }, () => {
      this.loadBookings(true);
    });
  },

  clearPresetStatus() {
    if (this.data.selectedStatus === 'all') return;
    this.setData({
      selectedStatus: 'all'
    }, () => {
      this.loadBookings(true);
    });
  },

  async onShow() {
    // 管理员/主任/老师可见，服务端按角色做数据范围收敛
    if (!auth.requireRoles([1, 2, 3, 5])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'global-appointments');
    if (!granted) return;
    await this.loadTeacherBindStatus();
    if (auth.getUserRole() === 3 && !this.data.isTeacherBound && !this.data.filterTeacherId) {
      this.setData({
        appointments: [],
        filteredAppointments: [],
        total: 0,
        stats: { total: 0, pending: 0, verified: 0, cancelled: 0 },
      });
      return;
    }
    this.loadBookings(true);
  },

  async loadTeacherBindStatus() {
    const role = auth.getUserRole();
    if (role !== 3) return;
    try {
      const s = await requestWithCheck('binding.adminStatus', {}, { showLoading: false, showError: false }).catch(() => null);
      this.setData({
        bindStatusLoaded: true,
        isTeacherBound: !!(s && s.isBound)
      });
    } catch (err) {
      this.setData({ bindStatusLoaded: true, isTeacherBound: true });
    }
  },

  onScanBindQr() {
    if (auth.getUserRole() !== 3) return;
    wx.navigateTo({
      url: '/pages/admin/bind-director/bind-director'
    });
  },

  async loadBookings(refresh = false) {
    if (this.data.loading) return;
    
    if (refresh) {
      this.setData({ 
        page: 1, 
        refreshing: true,
        appointments: [] 
      });
    } else {
      this.setData({ loading: true });
    }

    try {
      const result = await request('appointment.adminList', {
        status: this.data.selectedStatus !== 'all' ? this.data.selectedStatus : undefined,
        source: this.data.selectedSource || undefined,
        keyword: this.data.searchKeyword || undefined,
        teacherId: this.data.filterTeacherId || undefined,
        page: this.data.page,
        pageSize: this.data.pageSize,
        includeStats: !!refresh,
        responseMode: 'summary',
        startDate: this.data.startDate || undefined,
        endDate: this.data.endDate || undefined,
        start_time: this.data.startDate || undefined,
        end_time: this.data.endDate || undefined
      });

      const { list, total } = result;

      const formattedAppointments = (list || []).map(appointment => ({
        id: appointment._id || appointment.id,
        appointmentNo: displayDict.valueOr(appointment.appointmentNo, 'NO_APPOINTMENT_NO'),
        studentName: displayDict.valueOr(appointment.studentName, 'UNFILLED'),
        parentName: displayDict.valueOr(appointment.parentName, 'UNFILLED'),
        phone: displayDict.valueOr(appointment.phone || appointment.appointmentPhone, 'UNFILLED'),
        appointmentPhone: displayDict.valueOr(appointment.appointmentPhone || appointment.phone, 'UNFILLED'),
        accountPhone: appointment.accountPhone || '',
        teacherName: displayDict.valueOr(appointment.teacherName, 'UNASSIGNED'),
        currentSchool: displayDict.valueOr(appointment.currentSchool || appointment.current_school, 'UNFILLED'),
        remark: displayDict.valueOr(appointment.remark, 'NONE'),
        visitDate: displayDict.valueOr(appointment.visitDate, 'PENDING'),
        visitTime: displayDict.valueOr(appointment.visitTime, 'PENDING'),
        appointmentTime: `${appointment.visitDate || ''} ${appointment.visitTime || ''}`.trim(),
        source: appointment.source === 'scan' ? 'scan' : 'manual',
        status: this.mapStatus(appointment.status),
        statusText: this.getStatusText(appointment.status),
        createdAt: this.formatDateTimeSafe(appointment.createdAt),
        createTime: this.formatDateTimeSafe(appointment.createdAt)
      }));

      if (refresh) {
        this.setData({
          appointments: formattedAppointments,
          total: total || 0,
          stats: result.stats || { total: 0, pending: 0, verified: 0, cancelled: 0 }
        });
      } else {
        this.setData({
          appointments: [...this.data.appointments, ...formattedAppointments],
          total: total || 0,
          stats: result.stats || this.data.stats
        });
      }

      this.filterBookings();

    } catch (err) {
      console.error('加载预约列表失败:', err);
      // request 已 toast
    } finally {
      this.setData({ 
        loading: false, 
        refreshing: false 
      });
    }
  },

  mapStatus(status) {
    if (status === 0 || status === '0' || status === 'pending' || status === 'approved') return 'pending';
    if (status === 1 || status === '1' || status === 'verified' || status === 'completed') return 'verified';
    if (status === 2 || status === '2' || status === 'cancelled' || status === 'rejected') return 'cancelled';
    return 'pending';
  },

  getStatusText(status) {
    const mapped = this.mapStatus(status);
    return { pending: '待核销', verified: '已核销', cancelled: '已取消' }[mapped] || '待核销';
  },

  normalizeDateInput(input) {
    if (input === null || input === undefined) return '';
    if (typeof input === 'number') return String(input);

    let str = String(input).trim();
    if (!str) return '';

    // iOS 对 "yyyy-MM-dd HH:mm" 兼容差，统一转为 ISO 风格
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + ':00';
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T');
    } else if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(str)) {
      str = str + ':00';
    }

    return str;
  },

  parseDateSafe(input) {
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    if (typeof input !== 'string' || !input.trim()) return null;

    const normalized = this.normalizeDateInput(input);
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date;

    // 兜底：将连字符日期替换为斜杠再次尝试
    const fallback = normalized.replace(/-/g, '/').replace('T', ' ');
    const fallbackDate = new Date(fallback);
    return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  },

  parseVisitDateTimeSafe(visitDate, visitTime) {
    const d = String(visitDate || '').trim();
    const t = String(visitTime || '').trim();
    if (!d) return null;
    if (!t) return this.parseDateSafe(d);
    const start = t.split('-')[0] || '';
    if (!/^\d{2}:\d{2}$/.test(start)) {
      return this.parseDateSafe(`${d} ${t}`);
    }
    // iOS-safe: yyyy-MM-ddTHH:mm:ss
    return this.parseDateSafe(`${d}T${start}:00`);
  },

  _toDateInputValue(input) {
    const date = this.parseDateSafe(input);
    if (!date) return '';
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  },

  _buildDayStart(dateStr) {
    return this.parseDateSafe(`${dateStr}T00:00:00`);
  },

  _buildDayEnd(dateStr) {
    return this.parseDateSafe(`${dateStr}T23:59:59`);
  },

  onStartDateChange(e) {
    const dateStr = String((e && e.detail && e.detail.value) || '').trim();
    if (!dateStr) return;
    const start = this._buildDayStart(dateStr);
    if (!start) return;
    const currentEnd = this.parseDateSafe(this.data.endDate);
    const nextEnd = (!currentEnd || currentEnd.getTime() < start.getTime())
      ? this._buildDayEnd(dateStr)
      : currentEnd;
    this.setData({
      startDate: this.formatDateTimeSafe(start),
      endDate: this.formatDateTimeSafe(nextEnd),
      startDateText: this._toDateInputValue(start),
      endDateText: this._toDateInputValue(nextEnd)
    }, () => this.loadBookings(true));
  },

  onEndDateChange(e) {
    const dateStr = String((e && e.detail && e.detail.value) || '').trim();
    if (!dateStr) return;
    const end = this._buildDayEnd(dateStr);
    if (!end) return;
    const currentStart = this.parseDateSafe(this.data.startDate);
    const nextStart = (!currentStart || currentStart.getTime() > end.getTime())
      ? this._buildDayStart(dateStr)
      : currentStart;
    this.setData({
      startDate: this.formatDateTimeSafe(nextStart),
      endDate: this.formatDateTimeSafe(end),
      startDateText: this._toDateInputValue(nextStart),
      endDateText: this._toDateInputValue(end)
    }, () => this.loadBookings(true));
  },

  onQuickRecentRange(e) {
    const days = Number(e.currentTarget.dataset.days || 0);
    if (!days) return;
    const range = this.getRecentDateRange(days);
    this.setData({
      limitRecentDays: days,
      startDate: range.start,
      endDate: range.end,
      startDateText: this._toDateInputValue(range.start),
      endDateText: this._toDateInputValue(range.end)
    }, () => this.loadBookings(true));
  },

  onClearDateRange() {
    this.setData({
      startDate: '',
      endDate: '',
      startDateText: '',
      endDateText: '',
      limitRecentDays: 0
    }, () => this.loadBookings(true));
  },

  formatDateTimeSafe(input) {
    const date = this.parseDateSafe(input);
    if (!date) return '';

    const pad2 = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  },

  handleSearch(e) {
    this.setData({ searchKeyword: e.detail.value });
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.loadBookings(true);
    }, 500);
  },

  toggleStatusFilter() {
    this.setData({ showStatusFilter: !this.data.showStatusFilter });
  },

  selectStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ selectedStatus: status, showStatusFilter: false });
    this.loadBookings(true);
  },

  filterBookings() {
    const { appointments, searchKeyword, selectedStatus, selectedSource, startDate, endDate, limitRecentDays } = this.data;
    let filtered = [...appointments];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    if (selectedSource) {
      filtered = filtered.filter((b) => {
        if (selectedSource === 'scan') {
          return b.source === 'scan';
        }
        return b.source !== 'scan';
      });
    }

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter(b =>
        (b.appointmentNo && b.appointmentNo.toLowerCase().includes(kw)) ||
        (b.studentName && b.studentName.toLowerCase().includes(kw)) ||
        (b.parentName && b.parentName.toLowerCase().includes(kw)) ||
        (b.phone && b.phone.includes(kw)) ||
        (b.appointmentPhone && b.appointmentPhone.includes(kw)) ||
        (b.accountPhone && b.accountPhone.includes(kw)) ||
        (b.teacherName && b.teacherName.toLowerCase().includes(kw))
      );
    }

    if (startDate && endDate) {
      const start = this.parseDateSafe(startDate);
      const end = this.parseDateSafe(endDate);
      if (start && end) {
        filtered = filtered.filter((b) => {
          const date = this.parseVisitDateTimeSafe(b.visitDate, b.visitTime) || this.parseDateSafe(b.appointmentTime);
          if (!date) return false;
          return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
        });
      }
    }

    const hasFilter =
      selectedStatus !== 'all' ||
      !!selectedSource ||
      !!searchKeyword ||
      !!startDate ||
      !!endDate;
    this.setData({
      filteredAppointments: filtered,
      emptyHint: hasFilter
        ? displayDict.text('FILTER_EMPTY_BOOKINGS')
        : displayDict.text('SCOPE_EMPTY_BOOKINGS')
    });
    if (limitRecentDays > 0 && this.data.refreshing) {
      feedback.showToast({
        title: `${displayDict.text('FILTERED_RECENT_PREFIX')}${limitRecentDays}${displayDict.text('FILTERED_RECENT_SUFFIX')}`,
        icon: 'none'
      });
    }
  },

  getRecentDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return {
      start: this.formatDateTimeSafe(start),
      end: this.formatDateTimeSafe(end)
    };
  },

  getRangeByTimeKey(timeKey) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(today);
    let end = new Date(today);

    if (timeKey === 'month') {
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (timeKey === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
    } else if (timeKey === 'year') {
      end = new Date(now.getFullYear(), 11, 31);
    } else {
      const day = today.getDay() || 7;
      end = new Date(today);
      end.setDate(today.getDate() + (7 - day));
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return {
      start: this.formatDateTimeSafe(start),
      end: this.formatDateTimeSafe(end)
    };
  },

  clearTeacherFilter() {
    if (!this.data.filterTeacherId) return;
    this.setData({ filterTeacherId: '', filterTeacherName: '' });
    this.loadBookings(true);
  },

  quickFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ selectedStatus: status });
    this.loadBookings(true);
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/appointment-detail/appointment-detail?id=${id}` });
  },

  async onExportData() {
    wx.showModal({
      title: displayDict.text('MODAL_EXPORT_BOOKINGS_TITLE'),
      content: `当前筛选结果共 ${this.data.filteredAppointments.length} 条记录，是否导出Excel文件？`,
      confirmColor: '#3088F4',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '导出中...' });
          
          try {
            const result = await request('export.appointments', {
              type: 'appointments',
              status: this.data.selectedStatus !== 'all' ? this.data.selectedStatus : undefined,
              source: this.data.selectedSource || undefined,
              format: 'excel'
            });
            
            wx.hideLoading();
            if (result && result.file_url) {
              wx.downloadFile({
                url: result.file_url,
                success: (downloadRes) => {
                  wx.openDocument({ filePath: downloadRes.tempFilePath });
                },
                fail: () => feedback.showToast({ title: errorDict.text('DOWNLOAD_FAILED'), icon: 'none' })
              });
            } else {
              feedback.showToast({ title: displayDict.text('EXPORT_SUCCESS'), icon: 'success' });
            }
          } catch (err) {
            wx.hideLoading();
            console.error('导出失败:', err);
            // request 已 toast
          }
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onReachBottom() {
    if (this.data.appointments.length < this.data.total && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadBookings();
    }
  },

  onPullDownRefresh() {
    this.loadBookings(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
