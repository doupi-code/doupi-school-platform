const { request } = require('../../utils/request');
const feedback = require('../../utils/feedback');
const { requestSubscribeAuthorization } = require('../../utils/subscribe');
const AGREEMENT_READ_STORAGE_KEY = 'appointmentAgreementReadFlags';
const auth = require('../../utils/auth');
const displayDict = require('../../utils/displayDict');

const DRAFT_KEY = 'draft:pages/appointment/appointment';
const PENDING_INVITE_KEY = 'pendingInviteKey';

function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sortTimeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.slice().sort((a, b) => {
    const startDiff = timeToMinutes(a && a.startTime) - timeToMinutes(b && b.startTime);
    if (startDiff !== 0) return startDiff;
    return timeToMinutes(a && a.endTime) - timeToMinutes(b && b.endTime);
  });
}

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
    pageLoading: true,
    advanceDays: 7,
    formData: {
      studentName: '',
      idCard: '',
      currentSchool: '',
      parentName: '',
      parentPhone: '',
      visitDate: '',
      visitTime: '',
      remark: '',
      agreed: false
    },
    visitDateLabel: '',
    errors: {},
    showSuccess: false,
    appointmentNumber: '',
    submitting: false,

    timeOptions: [],
    timeIndex: [],
    showTimePicker: false,
    showDatePicker: false,
    dateCalendarValue: null,
    minDate: '',
    maxDate: '',
    minDateTs: null,
    maxDateTs: null,
    inviteKey: null,
    agreementRead: {
      privacy: false,
      notice: false
    },
    /** 全局配置的完整时段列表（选「今天」时会在前端过滤已过时段） */
    allTimeSlotOptions: []
  },

  onLoad(options) {
    if (!this.ensureAppointmentAllowed()) return;

    const inviteKey = this.resolveInviteKey(options);
    if (inviteKey) {
      this.setData({ inviteKey });
    } else {
      // 兼容：从 switchTab 无法携带 query 的扫码入口透传 inviteKey
      const pending = this._consumePendingInviteKey();
      if (pending) {
        this.setData({ inviteKey: pending });
      }
    }

    if (!this.ensureScanInviteKey()) return;

    const today = new Date();
    const minDate = this.formatDate(today);
    const max = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
    const maxDate = this.formatDate(max);

    this.setData({ minDate, maxDate });

    // 恢复草稿（登录前填写内容不丢失）
    const draft = safeGetDraft();
    if (draft && draft.formData) {
      this.setData({
        formData: Object.assign({}, this.data.formData, draft.formData),
        timeIndex: draft.timeIndex || this.data.timeIndex
      });
    }

    this.loadPageMeta();
  },

  resolveInviteKey(options) {
    if (!options) return '';
    const sceneValue = decodeURIComponent(String(options.scene || '')).trim();
    if (sceneValue) return sceneValue;
    const inviteKey = String(options.inviteKey || '').trim();
    if (inviteKey) return inviteKey;
    const teacherValue = String(options.teacher || '').trim();
    if (teacherValue) return teacherValue;
    return '';
  },

  onShow() {
    if (!this.ensureAppointmentAllowed()) return;

    // 兼容旧版扫码入口：每次 show 都尝试消费一次 pendingInviteKey
    const pending = this._consumePendingInviteKey();
    if (pending && pending !== this.data.inviteKey) {
      this.setData({ inviteKey: pending });
    }

    if (!this.ensureScanInviteKey()) return;

    this.syncAgreementReadFlags();
    this.syncTabBarSelected();

    if (!this.data.pageLoading && Array.isArray(this.data.allTimeSlotOptions) && this.data.allTimeSlotOptions.length) {
      const ymd = String(this.data.formData.visitDate || '').trim();
      const merged = this.computeTimePickerState(
        this.data.allTimeSlotOptions,
        ymd,
        String(this.data.formData.visitTime || '').trim()
      );
      this.setData({
        timeOptions: merged.timeOptions,
        timeIndex: merged.timeIndex,
        'formData.visitTime': merged.visitTime
      });
    }
  },

  ensureAppointmentAllowed() {
    if (!auth.isAppointmentRestrictedRole()) return true;
    feedback.showWarning('招生端账号不能发起预约');
    wx.switchTab({ url: '/pages/profile/profile' });
    return false;
  },

  ensureScanInviteKey() {
    const inviteKey = String(this.data.inviteKey || '').trim();
    if (inviteKey && inviteKey.length === 8 && /^[A-Za-z0-9]+$/.test(inviteKey)) {
      this._scanInviteBlocked = false;
      return true;
    }

    if (this._scanInviteBlocked) return false;
    this._scanInviteBlocked = true;

    wx.showModal({
      title: '请扫码预约',
      content: '预约只能通过招生老师二维码进入，请扫码后再填写预约信息。',
      showCancel: false,
      confirmText: '我知道了',
      complete: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
    return false;
  },

  _consumePendingInviteKey() {
    try {
      const pending = String(wx.getStorageSync(PENDING_INVITE_KEY) || '').trim();
      if (!pending) return '';
      wx.removeStorageSync(PENDING_INVITE_KEY);
      return pending;
    } catch (_) {
      return '';
    }
  },

  syncTabBarSelected() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && typeof tabBar.setData === 'function') {
      tabBar.setData({ selected: 0 });
    }
  },

  async loadPageMeta() {
    this.setData({ pageLoading: true });
    try {
      const config = await request('appointment.meta', {}, {
        showLoading: false,
        showError: false
      });

      const globalTimeSlots = this.normalizeTimeSlots(config.timeSlots);
      const timeSlotRaw = globalTimeSlots.length > 0 ? globalTimeSlots : [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '14:00', endTime: '15:00' },
        { startTime: '15:00', endTime: '16:00' }
      ];

      const allTimeSlotOptions = timeSlotRaw.map((slot) => ({
        label: `${slot.startTime}-${slot.endTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime
      }));

      const today = new Date();
      const safeAdvanceDays = Math.max(1, Number(config.advanceDays) || 7);
      const max = new Date(today.getTime() + (safeAdvanceDays - 1) * 24 * 60 * 60 * 1000);
      const minDate = this.formatDate(today);
      const maxDate = this.formatDate(max);
      const minDateTs = this.parseDateToTimestamp(minDate);
      const maxDateTs = this.parseDateToTimestamp(maxDate);
      const firstAvailableDate = this.findFirstAvailableDate(allTimeSlotOptions, minDate, maxDate);
      const effectiveMinDate = firstAvailableDate || minDate;
      const effectiveMinDateTs = this.parseDateToTimestamp(effectiveMinDate);
      const selectedDate = String(this.data.formData.visitDate || '').trim();
      const selectedIsAvailable = selectedDate && this.isDateSelectable(selectedDate, allTimeSlotOptions, minDateTs, maxDateTs);
      const effectiveSelectedDate = selectedIsAvailable ? selectedDate : '';
      const selectedTs = this.parseDateToTimestamp(effectiveSelectedDate);
      const merged = this.computeTimePickerState(
        allTimeSlotOptions,
        effectiveSelectedDate,
        String(this.data.formData.visitTime || '').trim()
      );

      this.setData({
        allTimeSlotOptions,
        timeOptions: merged.timeOptions,
        timeIndex: merged.timeIndex,
        'formData.visitDate': effectiveSelectedDate,
        'formData.visitTime': merged.visitTime,
        dateCalendarValue: selectedTs || effectiveMinDateTs || minDateTs,
        advanceDays: safeAdvanceDays,
        configRules: config.rules || {},
        minDate: effectiveMinDate,
        maxDate,
        minDateTs: effectiveMinDateTs || minDateTs,
        maxDateTs,
        visitDateLabel: effectiveSelectedDate ? this.buildFriendlyDateLabel(effectiveSelectedDate) : '',
        pageLoading: false
      });
    } catch (err) {
      // 请求失败时也要兜底时段，否则 picker 没有任何可选项
      const fallbackSlots = [
        { label: '09:00-10:00', startTime: '09:00', endTime: '10:00' },
        { label: '10:00-11:00', startTime: '10:00', endTime: '11:00' },
        { label: '14:00-15:00', startTime: '14:00', endTime: '15:00' },
        { label: '15:00-16:00', startTime: '15:00', endTime: '16:00' }
      ];
      const selectedDate = String(this.data.formData.visitDate || '').trim();
      const merged = this.computeTimePickerState(
        fallbackSlots,
        selectedDate,
        String(this.data.formData.visitTime || '').trim()
      );
      const today = new Date();
      const minDate = this.formatDate(today);
      const maxDate = this.data.maxDate || this.formatDate(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));
      const firstAvailableDate = this.findFirstAvailableDate(fallbackSlots, minDate, maxDate);
      const effectiveMinDate = firstAvailableDate || minDate;
      const effectiveMinDateTs = this.parseDateToTimestamp(effectiveMinDate);
      this.setData({
        pageLoading: false,
        allTimeSlotOptions: fallbackSlots,
        timeOptions: merged.timeOptions,
        timeIndex: merged.timeIndex,
        'formData.visitTime': merged.visitTime,
        minDate: effectiveMinDate,
        minDateTs: effectiveMinDateTs,
        dateCalendarValue: this.parseDateToTimestamp(selectedDate) || effectiveMinDateTs,
        configRules: {}
      });
    }
  },

  normalizeTimeSlots(rawTimeSlots) {
    if (!Array.isArray(rawTimeSlots)) return [];

    return sortTimeSlots(rawTimeSlots.map((slot) => {
      if (!slot) return null;

      if (typeof slot === 'string') {
        const [start, end] = slot.split('-');
        const startTime = (start || '').trim();
        const endTime = (end || '').trim();
        if (!startTime || !endTime) return null;
        return { startTime, endTime };
      }

      const startTime = (slot.startTime || slot.start || '').trim();
      const endTime = (slot.endTime || slot.end || '').trim();
      if (!startTime || !endTime || slot.enabled === false) return null;
      return { startTime, endTime };
    }).filter(Boolean));
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  formatMonthDay(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
  },

  buildFriendlyDateLabel(ymd) {
    const ts = this.parseDateToTimestamp(ymd);
    if (!ts) return String(ymd || '').trim();
    const d = new Date(ts);
    const today = new Date();
    const todayYmd = this.formatDate(today);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowYmd = this.formatDate(tomorrow);
    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekText = weekNames[d.getDay()] || '';
    const md = this.formatMonthDay(d);
    // 显示文案：日期在前，不要括号
    // - 今天/明天：`MM月DD日 今天`
    // - 其他日期：`MM月DD日 周X`
    const tail = ymd === todayYmd ? '今天' : (ymd === tomorrowYmd ? '明天' : weekText);
    return `${md} ${tail}`.trim();
  },

  parseDateToTimestamp(ymd) {
    const v = String(ymd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const ts = new Date(`${v}T00:00:00`).getTime();
    return Number.isFinite(ts) ? ts : null;
  },

  computeSlotStartMs(ymd, startTime) {
    const v = String(ymd || '').trim();
    const st = String(startTime || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return NaN;
    const m = st.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return NaN;
    const y = parseInt(v.slice(0, 4), 10);
    const mo = parseInt(v.slice(5, 7), 10) - 1;
    const d = parseInt(v.slice(8, 10), 10);
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const t = new Date(y, mo, d, hh, mm, 0, 0).getTime();
    return Number.isFinite(t) ? t : NaN;
  },

  isSlotStartAfterNow(ymd, startTime) {
    const t = this.computeSlotStartMs(ymd, startTime);
    return Number.isFinite(t) && t > Date.now();
  },

  hasAvailableSlotsOnDate(allSlots, visitDateYmd) {
    return this.computeTimePickerState(allSlots, visitDateYmd, '').timeOptions.length > 0;
  },

  isDateSelectable(ymd, allSlots, minTs, maxTs) {
    const date = String(ymd || '').trim();
    const ts = this.parseDateToTimestamp(date);
    const min = minTs || this.data.minDateTs;
    const max = maxTs || this.data.maxDateTs;
    if (!ts) return false;
    if (min && ts < min) return false;
    if (max && ts > max) return false;
    return this.hasAvailableSlotsOnDate(allSlots || this.data.allTimeSlotOptions || [], date);
  },

  findFirstAvailableDate(allSlots, startYmd, endYmd) {
    const startTs = this.parseDateToTimestamp(startYmd);
    const endTs = this.parseDateToTimestamp(endYmd);
    if (!startTs || !endTs || startTs > endTs) return '';

    for (let ts = startTs; ts <= endTs; ts += 24 * 60 * 60 * 1000) {
      const ymd = this.formatDate(new Date(ts));
      if (this.hasAvailableSlotsOnDate(allSlots, ymd)) return ymd;
    }

    return '';
  },

  /**
   * 根据已选日期生成时段 picker；选「今天」时去掉已开始时段。
   */
  computeTimePickerState(allSlots, visitDateYmd, currentVisitTimeLabel) {
    const slots = Array.isArray(allSlots) ? allSlots : [];
    const sortedSlots = sortTimeSlots(slots);
    const todayYmd = this.formatDate(new Date());
    const dateTrim = String(visitDateYmd || '').trim();
    const list = !dateTrim || dateTrim !== todayYmd
      ? sortedSlots
      : sortedSlots.filter((s) => this.isSlotStartAfterNow(dateTrim, s.startTime));
    const timeOptions = list.map((s, i) => ({ label: s.label, value: i }));
    const label = String(currentVisitTimeLabel || '').trim();
    let visitTime = label;
    let timeIndex = [];
    if (label) {
      const idx = timeOptions.findIndex((o) => o.label === label);
      if (idx >= 0) {
        timeIndex = [idx];
      } else {
        visitTime = '';
      }
    }
    return { timeOptions, timeIndex, visitTime };
  },

  handleInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: ''
    });

    safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
  },

  handleInputBlur(e) {
    const field = e.currentTarget.dataset.field;
    this.validateField(field);
  },

  validateField(field) {
    const { formData } = this.data;
    let error = '';

    switch (field) {
      case 'studentName':
        if (!formData.studentName.trim()) {
          error = '请输入学生姓名';
        }
        break;
      case 'idCard':
        if (!formData.idCard.trim()) {
          error = '请输入身份证号';
        } else if (!/^\d{17}[\dXx]$/.test(formData.idCard)) {
          error = '请输入正确的身份证号';
        }
        break;
      case 'parentName':
        if (!formData.parentName.trim()) {
          error = '请输入家长姓名';
        }
        break;
      case 'parentPhone':
        if (!formData.parentPhone.trim()) {
          error = '请输入联系电话';
        } else if (!/^1[3-9]\d{9}$/.test(formData.parentPhone)) {
          error = '请输入正确的手机号';
        }
        break;
      default:
        break;
    }

    if (error) {
      this.setData({ [`errors.${field}`]: error });
      return false;
    }

    return true;
  },

  openTimePicker() {
    if (!this.data.timeOptions || this.data.timeOptions.length === 0) {
      feedback.showWarning(displayDict.text('NO_AVAILABLE_TIME_SLOTS'));
      return;
    }
    this.setData({ showTimePicker: true });
  },

  closeTimePicker() {
    this.setData({ showTimePicker: false });
  },

  handleTimeConfirm(e) {
    const value = e && e.detail ? e.detail.value : [];
    const idx = Array.isArray(value) ? Number(value[0]) : Number(value);
    const selectedTime = this.data.timeOptions[idx];
    if (!selectedTime) return;

    this.setData({
      'formData.visitTime': selectedTime.label,
      timeIndex: Array.isArray(value) ? value : [idx],
      'errors.visitTime': '',
      showTimePicker: false
    });

    safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
  },

  handleDateChange(e) {
    this.setData({
      'formData.visitDate': e.detail.value,
      'errors.visitDate': ''
    });

    safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
  },

  openDatePicker() {
    if (!this.data.minDateTs || !this.data.maxDateTs) {
      feedback.showWarning('暂无可选日期');
      return;
    }
    this.setData({
      showDatePicker: true,
      dateCalendarValue: this.parseDateToTimestamp(this.data.formData.visitDate) || this.data.minDateTs
    });
  },

  closeDatePicker() {
    this.setData({ showDatePicker: false });
  },

  handleDateConfirm(e) {
    const value = e && e.detail ? e.detail.value : null;
    const ts = Array.isArray(value) ? value[0] : value;
    if (!ts) return;
    const selected = this.formatDate(new Date(ts));
    if (!this.isDateSelectable(selected, this.data.allTimeSlotOptions || [])) {
      feedback.showWarning('当天暂无可预约时段');
      this.setData({
        'formData.visitDate': '',
        'formData.visitTime': '',
        visitDateLabel: '当天暂无可预约时段',
        timeOptions: [],
        timeIndex: [],
        dateCalendarValue: this.data.minDateTs || null,
        'errors.visitDate': '当天暂无可预约时段',
        showDatePicker: false
      });
      safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
      return;
    }
    const merged = this.computeTimePickerState(
      this.data.allTimeSlotOptions || [],
      selected,
      String(this.data.formData.visitTime || '').trim()
    );
    this.setData({
      'formData.visitDate': selected,
      dateCalendarValue: ts,
      visitDateLabel: this.buildFriendlyDateLabel(selected),
      'errors.visitDate': '',
      timeOptions: merged.timeOptions,
      timeIndex: merged.timeIndex,
      'formData.visitTime': merged.visitTime,
      'errors.visitTime': '',
      showDatePicker: false
    });
    safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
  },

  syncAgreementReadFlags() {
    const readFlags = wx.getStorageSync(AGREEMENT_READ_STORAGE_KEY) || {};
    this.setData({
      agreementRead: {
        privacy: !!readFlags.privacy,
        notice: !!readFlags.notice
      }
    });
  },

  handleAgreedChange(e) {
    const nextValue = !!(e && e.detail && e.detail.checked);
    this.setData({
      'formData.agreed': nextValue,
      'errors.agreed': ''
    });
  },

  onCheckboxTap() {},

  toggleAgreement() {
    this.setData({
      'formData.agreed': !this.data.formData.agreed,
      'errors.agreed': ''
    });
    safeSetDraft({ formData: this.data.formData, timeIndex: this.data.timeIndex });
  },

  validateForm() {
    const { formData, configRules } = this.data;
    const errors = {};
    const requirePhone = !(configRules && configRules.requirePhone === false);
    const requireIdCard = !(configRules && configRules.requireIdCard === false);

    if (!formData.studentName.trim()) errors.studentName = '请输入学生姓名';
    if (requireIdCard) {
      if (!formData.idCard.trim()) {
        errors.idCard = '请输入身份证号';
      } else if (!/^\d{17}[\dXx]$/.test(formData.idCard)) {
        errors.idCard = '请输入正确的身份证号';
      }
    } else if (formData.idCard.trim() && !/^\d{17}[\dXx]$/.test(formData.idCard)) {
      errors.idCard = '请输入正确的身份证号';
    }

    if (!formData.parentName.trim()) errors.parentName = '请输入家长姓名';
    if (requirePhone) {
      if (!formData.parentPhone.trim()) {
        errors.parentPhone = '请输入联系电话';
      } else if (!/^1[3-9]\d{9}$/.test(formData.parentPhone)) {
        errors.parentPhone = '请输入正确的手机号';
      }
    } else if (formData.parentPhone.trim() && !/^1[3-9]\d{9}$/.test(formData.parentPhone)) {
      errors.parentPhone = '请输入正确的手机号';
    }

    if (!formData.visitDate) errors.visitDate = '请选择预约日期';
    if (!formData.visitTime) errors.visitTime = '请选择预约时段';
    if (formData.visitDate && formData.visitTime) {
      const start = (formData.visitTime.split('-')[0] || '').trim();
      const slotStart = this.computeSlotStartMs(formData.visitDate, start);
      if (!Number.isFinite(slotStart) || slotStart <= Date.now()) {
        errors.visitTime = '所选时段已开始或已结束，请重新选择';
      }
    }

    if (!formData.agreed) errors.agreed = '请阅读并同意协议';

    this.setData({ errors });

    return Object.keys(errors).length === 0;
  },

  async handleSubmit() {
    if (this.data.submitting) return;

    if (!this.ensureScanInviteKey()) return;

    if (!this.validateForm()) {
      wx.vibrateShort({ type: 'medium' });
      feedback.showWarning('请完善表单信息');
      return;
    }

    this.setData({ submitting: true });

    try {
      await this.requestSubscribeForAppointment();
      const { formData, inviteKey } = this.data;
      const startTime = (formData.visitTime.split('-')[0] || '').trim();
      const visitDateTime = `${formData.visitDate} ${startTime}:00`;

      const payload = {
        studentName: formData.studentName.trim(),
        idCard: formData.idCard.trim(),
        currentSchool: (formData.currentSchool || '').trim(),
        remark: (formData.remark || '').trim(),
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        appointmentTime: visitDateTime,
        agreePrivacy: true
      };

      if (inviteKey) {
        payload.inviteKey = inviteKey;
      }

      const result = await request('appointment.create', payload, {
        showLoading: true,
        loadingText: '正在提交...',
        showError: false,
        retry: 1
      });

      const appointmentNumber = result.appointmentNo || '';

      this.setData({
        showSuccess: true,
        appointmentNumber: appointmentNumber,
        submitting: false
      });
      this.syncTabBarSelected();

      feedback.showSuccess('预约提交成功！');

      // 成功后清草稿
      try { wx.removeStorageSync(DRAFT_KEY); } catch (_) {}

    } catch (err) {
      this.setData({ submitting: false });

      if (err.errCode === 'DUPLICATE_APPOINTMENT') {
        feedback.showError('您当天已有预约记录');
      } else if (err.errCode === 'FORBIDDEN') {
        feedback.showError(err.errMsg || '请扫码后再预约');
      } else if (err.errCode === 'INVALID_PARAM') {
        feedback.showError(err.errMsg || '参数错误，请检查填写内容');
      } else if (err.errCode === 'QUOTA_EXCEEDED') {
        feedback.showError('该时段预约已满');
      } else if (err.errCode === 'DUPLICATE_SUBMIT') {
        feedback.showError('请勿重复提交，请稍后重试');
      } else if (err.errCode === 'DB_ERROR' || err.errCode === 'INTERNAL_ERROR') {
        feedback.showError('预约创建失败，请稍后重试');
      } else {
        // 避免后端抛出技术堆栈/数据库细节时直接透传到用户
        feedback.showError('提交失败，请稍后重试');
      }

      wx.vibrateShort({ type: 'medium' });
    }
  },

  async requestSubscribeForAppointment() {
    try {
      await requestSubscribeAuthorization({ scenes: 'appointment_create' });
    } catch (_) {}
  },

  handleComplete() {
    this.setData({
      showSuccess: false,
      appointmentNumber: '',
      formData: {
        studentName: '',
        idCard: '',
        currentSchool: '',
        parentName: '',
        parentPhone: '',
        visitDate: '',
        visitTime: '',
        remark: '',
        agreed: false
      },
      errors: {},
      timeIndex: []
    });
    this.syncTabBarSelected();
  },

  goToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy?from=appointment'
    });
  },

  goToBookingNotice() {
    wx.navigateTo({
      url: '/pages/appointment-notice/appointment-notice?from=appointment'
    });
  }
});
