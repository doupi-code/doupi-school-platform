const feedback = require('../../../utils/feedback');
const app = getApp();
const common = require('../../../utils/common');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  goBack() {
    wx.navigateBack();
  },
  data: {
    appointmentId: '',
    accessGranted: false,
    loading: true,
    appointmentDetail: null,
    operationRecords: [],
    formattedRemark: '',  // 格式化后的备注信息
    submitting: false,
    showAdminCancelModal: false,
    adminCancelReason: '',
    adminCancelReasonLength: 0,
    displayText: {
      unfilled: displayDict.text('UNFILLED'),
      none: displayDict.text('NONE'),
      unbound: displayDict.text('UNBOUND'),
      loadingText: displayDict.text('LOADING_TEXT'),
      emptyBookingDetailNotFound: errorDict.text('EMPTY_BOOKING_DETAIL_NOT_FOUND'),
      btnBackList: displayDict.text('BTN_BACK_LIST'),
      btnCancelBooking: displayDict.text('BTN_CANCEL_BOOKING'),
      statusLabel: displayDict.text('BOOKING_DETAIL_STATUS'),
      appointmentNoLabel: displayDict.text('BOOKING_DETAIL_NO'),
      copyHint: displayDict.text('BOOKING_DETAIL_COPY_HINT'),
      studentInfoTitle: displayDict.text('BOOKING_DETAIL_STUDENT_INFO'),
      studentNameLabel: displayDict.text('BOOKING_DETAIL_STUDENT_NAME'),
      idCardLabel: displayDict.text('BOOKING_DETAIL_ID_CARD'),
      currentSchoolLabel: displayDict.text('BOOKING_DETAIL_CURRENT_SCHOOL'),
      parentInfoTitle: displayDict.text('BOOKING_DETAIL_PARENT_INFO'),
      parentNameLabel: displayDict.text('BOOKING_DETAIL_PARENT_NAME'),
      contactPhoneLabel: displayDict.text('BOOKING_DETAIL_CONTACT_PHONE'),
      appointmentInfoTitle: displayDict.text('BOOKING_DETAIL_APPOINTMENT_INFO'),
      appointmentTimeLabel: displayDict.text('BOOKING_DETAIL_APPOINTMENT_TIME'),
      relatedTeacherLabel: displayDict.text('BOOKING_DETAIL_RELATED_TEACHER'),
      receiveTeacherLabel: displayDict.text('BOOKING_DETAIL_RECEIVE_TEACHER'),
      remarkLabel: displayDict.text('BOOKING_DETAIL_REMARK'),
      timeRecordTitle: '操作记录',
      createTimeLabel: displayDict.text('BOOKING_DETAIL_CREATE_TIME'),
      updateTimeLabel: displayDict.text('BOOKING_DETAIL_UPDATE_TIME'),
      adminCancelModalTitle: '确认取消预约',
      adminCancelModalHint: '取消原因将通知家长（站内信与订阅消息摘要）。不填则使用「管理人员取消预约」。',
      adminCancelReasonPlaceholder: '选填，建议简要说明，如：名额调整、信息有误等',
      adminCancelBtnLater: '再想想',
      adminCancelBtnConfirm: '确认取消'
    }
  },

  async onLoad(options) {
    if (!auth.requireRoles([1, 2, 3, 5])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'global-appointments');
    if (!granted) return;
    if (options.id) {
      this.setData({ appointmentId: options.id, accessGranted: true });
      this.loadAppointmentDetail(options.id);
      return;
    }
    this.setData({ accessGranted: true });
  },

  onShow() {
    if (this.data.accessGranted && this.data.appointmentId) {
      this.loadAppointmentDetail(this.data.appointmentId);
    }
  },

  async loadAppointmentDetail(id) {
    this.setData({ loading: true });

    try {
      const data = await request('appointment.adminDetail', {
        appointment_id: id
      });

      if (data) {
        const detail = data.appointment_info;
        const remark = displayDict.valueOr(detail.remark, 'NONE');
        const normalizedStatus = this.normalizeStatus(detail.status);
        const statusText = detail.statusText || detail.status_text || this.getStatusText(normalizedStatus);

      this.setData({
          appointmentDetail: {
            id: detail._id,
            appointmentNumber: displayDict.valueOr(detail.appointmentNo, 'NO_APPOINTMENT_NO'),
            status: normalizedStatus,
            statusText: statusText,
            studentName: detail.student_name,
            idCard: detail.id_card,
            parentName: detail.parent_name,
            phone: detail.phone,
            appointmentPhone: detail.appointmentPhone || detail.appointment_phone || detail.phone,
            accountPhone: detail.accountPhone || detail.account_phone || '',
            appointmentTime: this.formatAppointmentTime(detail),
            currentSchool: displayDict.valueOr(detail.current_school, 'UNFILLED'),
            remark: remark,
            teacherName: this._displayRelatedTeacher(detail),
            actualTeacherName: this._displayReceiveTeacher(detail),
            createTime: this.formatDateTime(detail.create_time),
            updateTime: this.formatDateTime(detail.update_time)
          },
          // 格式化备注信息，处理换行符和特殊字符
          formattedRemark: common.formatRichText(remark, {
            unescape: true,
            sanitize: false
          }),
          loading: false
        });
        await this.loadOperationRecords(detail);
      }
    } catch (error) {
      console.error('加载预约详情失败:', error);
      this.setData({ loading: false });
      // request 已 toast
    }
  },

  getStatusKey(status) {
    return this.normalizeStatus(status);
  },

  normalizeStatus(status) {
    if (status === 1 || status === '1' || status === 'verified' || status === 'completed') return 'verified';
    if (status === 2 || status === '2' || status === 'cancelled' || status === 'rejected') return 'cancelled';
    return 'pending';
  },

  getStatusText(status) {
    const normalized = this.normalizeStatus(status);
    const map = { pending: '待核销', verified: '已核销', cancelled: '已取消' };
    return map[normalized] || '未知状态';
  },

  /** 预约老师：展示预约关联的老师昵称 */
  _displayRelatedTeacher(detail) {
    const id = detail.teacher_id_snapshot || detail.teacherIdSnapshot || detail.teacher_id || detail.teacherId;
    const name = String(detail.teacherNameSnapshot || detail.teacher_name_snapshot || detail.teacherName || detail.teacher_name || '').trim();
    if (!id) return displayDict.text('UNBOUND');
    return name || '—';
  },

  /** 接待老师：展示核销老师昵称；尚未核销且无接待人时显示「待核销」 */
  _displayReceiveTeacher(detail) {
    const id = detail.actual_teacher_id || detail.actualTeacherId;
    const name = String(detail.actualTeacherNameSnapshot || detail.actual_teacher_name_snapshot || detail.actual_teacher_name || detail.actualTeacherName || '').trim();
    const normalized = this.normalizeStatus(detail.status);
    if (id) {
      return name || '—';
    }
    if (normalized === 'pending') {
      return '待核销';
    }
    return '—';
  },

  formatDateTime(timestamp) {
    if (!timestamp) return '-';
    if (typeof timestamp === 'string') {
      const raw = timestamp.trim();
      if (!raw) return '-';
      // 预约时间段（如 10:00-11:00）不走 Date 解析，直接展示
      if (raw.includes('-') && raw.includes(':')) {
        return raw.replace('T', ' ');
      }
    }
    const date = this.parseDateValue(timestamp);
    if (Number.isNaN(date.getTime())) {
      return String(timestamp).replace('T', ' ');
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  parseDateValue(input) {
    if (input === null || input === undefined || input === '') {
      return new Date(NaN);
    }
    if (input instanceof Date) {
      return input;
    }
    if (typeof input === 'number') {
      return new Date(input);
    }
    const raw = String(input).trim();
    if (!raw) {
      return new Date(NaN);
    }

    // iOS 对 "yyyy-MM-dd HH:mm:ss(.SSSZ)" 兼容较差，优先转为 ISO 形态
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    let date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }

    // 兜底：去掉毫秒后再尝试一次
    const fallback = normalized.replace(/\.\d{1,3}Z$/, 'Z');
    date = new Date(fallback);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }

    // 最后兜底：转成斜杠格式
    return new Date(raw.replace(/-/g, '/'));
  },

  formatAppointmentTime(detail = {}) {
    const visitDate = detail.visitDate || detail.visit_date || '';
    const visitTime = detail.visitTime || detail.visit_time || '';
    if (visitDate && visitTime) {
      return `${visitDate} ${visitTime}`;
    }
    if (visitDate) {
      return visitDate;
    }
    if (visitTime) {
      return visitTime;
    }
    const raw = detail.appointment_time || detail.appointmentTime || '';
    if (!raw) return '-';
    return this.formatDateTime(raw);
  },

  async loadOperationRecords(detail = {}) {
    const appointmentId = detail._id || this.data.appointmentId;
    const appointmentNo = detail.appointmentNo || '';

    if (!appointmentId && !appointmentNo) {
      this.setData({ operationRecords: [] });
      return;
    }

    try {
      const res = await request('log.adminList', {
        page: 1,
        size: 100,
        appointment_no: appointmentNo || undefined,
        sort_order: 'asc'
      });
      const rawList = res && (res.log_list || res.list) ? (res.log_list || res.list) : [];
      const records = rawList
        .filter((item) => {
          if (!item) return false;
          if (appointmentId && item.appointmentId && String(item.appointmentId) !== String(appointmentId)) return false;
          if (appointmentNo && item.appointmentNo && String(item.appointmentNo) !== String(appointmentNo)) return false;
          return true;
        })
        .map((item, index) => {
          const operatorId = item.operatorId || item.operator_id || '';
          const operatorName = item.operatorName || item.operator_name || '未知操作人';
          const logId = item.logId || item._id || `${index}`;
          const rawTime = item.operationTime || item.operation_time;
          const parsedTime = this.parseDateValue(rawTime);
          return {
          id: logId,
          logId,
          time: this.formatDateTime(rawTime),
          sortTime: Number.isNaN(parsedTime.getTime()) ? 0 : parsedTime.getTime(),
          action: item.operationContent || item.operation_content || '预约操作',
          operatorId,
          operatorName,
          ip: item.ip || '',
          // 兼容历史字段：页面仍可能引用 operator
          operator: operatorName,
          typeText: this.getOperationTypeText(item.operationType || item.operation_type)
        };
        })
        .sort((a, b) => {
          return a.sortTime - b.sortTime;
        })
        .map((item) => {
          const next = Object.assign({}, item);
          delete next.sortTime;
          return next;
        });

      this.setData({
        operationRecords: records
      });
    } catch (err) {
      console.warn('加载操作记录失败:', err);
      this.setData({ operationRecords: [] });
    }
  },

  getOperationTypeText(type) {
    const map = {
      CREATE: '提交预约',
      CANCEL: '取消预约',
      VERIFY: '核销预约',
      UPDATE: '更新预约',
      EXPORT: '导出数据',
      BIND_APPROVE: '通过绑定申请',
      BIND_REJECT: '驳回绑定申请',
      BIND_REJECT_BATCH: '批量驳回绑定申请',
      BIND_TEACHER: '绑定老师',
      UNBIND_TEACHER: '解绑老师'
    };
    return map[String(type || '').toUpperCase()] || '预约操作';
  },

  goLogDetail(e) {
    const logId = e.currentTarget.dataset.id;
    if (!logId) return;
    wx.navigateTo({
      url: `/pages/admin/log-detail/log-detail?id=${encodeURIComponent(logId)}&mode=operation`
    });
  },

  handleCancel() {
    this.setData({
      showAdminCancelModal: true,
      adminCancelReason: '',
      adminCancelReasonLength: 0
    });
  },

  closeAdminCancelModal() {
    if (this.data.submitting) return;
    this.setData({
      showAdminCancelModal: false,
      adminCancelReason: '',
      adminCancelReasonLength: 0
    });
  },

  stopModalBubble() {},

  onAdminCancelReasonInput(e) {
    const v = e.detail && e.detail.value !== undefined ? String(e.detail.value) : '';
    this.setData({ adminCancelReason: v, adminCancelReasonLength: v.length });
  },

  async confirmAdminCancel() {
    if (this.data.submitting) return;
    await this.submitCancel();
  },

  async submitCancel() {
    this.setData({ submitting: true });

    try {
      await request('appointment.adminCancel', {
        appointment_id: this.data.appointmentId,
        reason: (this.data.adminCancelReason || '').trim()
      });

      feedback.showToast({ title: displayDict.text('BOOKING_CANCELLED'), icon: 'success' });
      this.setData({
        showAdminCancelModal: false,
        adminCancelReason: '',
        adminCancelReasonLength: 0
      });
      setTimeout(() => {
        this.loadAppointmentDetail(this.data.appointmentId);
      }, 1500);
    } catch (error) {
      console.error('取消失败:', error);
      // request 已 toast
    } finally {
      this.setData({ submitting: false });
    }
  },

  copyAppointmentNumber() {
    wx.setClipboardData({
      data: this.data.appointmentDetail?.appointmentNumber,
      success: () => {
        feedback.showToast({ title: displayDict.text('LINK_COPIED'), icon: 'success' });
      }
    });
  },

  callPhone() {
    const phone = this.data.appointmentDetail?.appointmentPhone || this.data.appointmentDetail?.phone;
    const rawStr = String(phone || '');
    const hadMask = rawStr.includes('*');
    const digits = rawStr.replace(/[^\d]/g, '');

    if (!digits || digits.length < 7 || hadMask) {
      feedback.showToast({ title: displayDict.text('NO_PHONE_CONTACT'), icon: 'none' });
      return;
    }

    wx.makePhoneCall({ phoneNumber: digits });
  },

  preventTouchMove() {}
});
