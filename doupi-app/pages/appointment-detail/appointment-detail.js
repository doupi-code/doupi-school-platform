/**
 * @fileoverview 预约详情页面 - 完全重构版（真实API对接）
 * 功能：展示预约完整信息，支持复制预约号、查看核销二维码、取消预约
 */

const { request } = require('../../utils/request');
const feedback = require('../../utils/feedback');
const auth = require('../../utils/auth');
const displayDict = require('../../utils/displayDict');
const errorDict = require('../../utils/errorDict');
const validationDict = require('../../utils/validationDict');

Page({
  data: {
    detail: {
      _id: '',
      appointmentNo: '',
      currentSchool: '',
      studentName: '',
      idCardMask: '',
      parentName: '',
      parentPhone: '',
      visitDate: '',
      visitTime: '',
      statusText: '',
      createTime: '',
      updateTime: '',
      cancelTime: '',
      verifyTime: '',
      appointmentTeacherName: '',
      actualTeacherName: '',
      teacherName: '',
      remark: '',
      notes: '',
      verifyCodePayload: '',
      cancelReason: ''
    },
    canCallParentPhone: false,
    
    qrSize: 260,
    showQRCode: false,
    renderQRCode: false,
    qrValidUntilText: '',
    formattedNotes: '',
    timelineSteps: [],
    currentStep: 0,
    showCancelModal: false,
    loading: false,
    errorOccurred: false,
    displayText: {
      noAppointmentNo: displayDict.text('NO_APPOINTMENT_NO'),
      noPhoneContact: displayDict.text('NO_PHONE_CONTACT'),
      noRecord: displayDict.text('NO_RECORD'),
      titleAppointmentDetail: displayDict.text('TITLE_APPOINTMENT_DETAIL'),
      subtitlePending: displayDict.text('APPOINTMENT_SUBTITLE_PENDING'),
      subtitleVerified: displayDict.text('APPOINTMENT_SUBTITLE_VERIFIED'),
      subtitleCancelled: displayDict.text('APPOINTMENT_SUBTITLE_CANCELLED'),
      subtitleCompleted: displayDict.text('APPOINTMENT_SUBTITLE_COMPLETED'),
      labelAppointmentNo: displayDict.text('LABEL_APPOINTMENT_NO'),
      btnCopy: displayDict.text('BTN_COPY'),
      titleAppointmentInfo: displayDict.text('TITLE_APPOINTMENT_INFO'),
      labelCurrentSchool: displayDict.text('LABEL_CURRENT_SCHOOL'),
      labelVisitDate: displayDict.text('LABEL_VISIT_DATE'),
      labelVisitTimeSlot: displayDict.text('LABEL_VISIT_TIME_SLOT'),
      titleStudentInfo: displayDict.text('TITLE_STUDENT_INFO'),
      labelStudentName: displayDict.text('LABEL_STUDENT_NAME'),
      labelIdCardNo: displayDict.text('LABEL_ID_CARD_NO'),
      titleParentInfo: displayDict.text('TITLE_PARENT_INFO'),
      labelParentName: displayDict.text('LABEL_PARENT_NAME'),
      labelContactPhone: displayDict.text('LABEL_CONTACT_PHONE'),
      relatedTeacherLabel: displayDict.text('BOOKING_DETAIL_RELATED_TEACHER'),
      receiveTeacherLabel: displayDict.text('BOOKING_DETAIL_RECEIVE_TEACHER'),
      titleAppointmentProgress: displayDict.text('TITLE_APPOINTMENT_PROGRESS'),
      titleWarmTips: displayDict.text('TITLE_WARM_TIPS'),
      descAppointmentPendingTips: displayDict.text('DESC_APPOINTMENT_PENDING_TIPS'),
      btnCancelBooking: displayDict.text('BTN_CANCEL_BOOKING'),
      btnShowVerifyQr: displayDict.text('BTN_SHOW_VERIFY_QR'),
      titleVerifyQrcode: displayDict.text('TITLE_VERIFY_QRCODE'),
      descShowQrcodeToStaff: displayDict.text('DESC_SHOW_QRCODE_TO_STAFF'),
      qrValidUntilPrefix: displayDict.text('LABEL_QR_VALID_UNTIL_PREFIX'),
      qrValidDuringPeriod: displayDict.text('LABEL_QR_VALID_DURING_PERIOD'),
      btnClose: displayDict.text('BTN_CLOSE'),
      modalCancelAppointmentTitle: displayDict.text('MODAL_CANCEL_APPOINTMENT_TITLE'),
      modalCancelAppointmentContent: displayDict.text('MODAL_CANCEL_APPOINTMENT_CONTENT'),
      btnCancelNow: displayDict.text('BTN_CANCEL_NOW'),
      btnThinkAgain: displayDict.text('BTN_THINK_AGAIN'),
      labelCancelReason: displayDict.text('LABEL_CANCEL_REASON'),
      cancelReasonNone: displayDict.text('CANCEL_REASON_NONE')
    }
  },

  onLoad(options) {
    this._initQrSize();
    if (options && options.id) {
      if (!auth.isLoggedIn()) {
        auth.requireLoginWithPrompt(`/pages/appointment-detail/appointment-detail?id=${encodeURIComponent(options.id)}`);
        return;
      }
      this.loadAppointmentDetail(options.id);
    } else {
      this.setData({ errorOccurred: true });
      feedback.showError(validationDict.text('APPOINTMENT_ID_MISSING'));
    }
  },

  _initQrSize() {
    try {
      const { windowWidth } = wx.getSystemInfoSync();
      const size = Math.max(200, Math.min(320, windowWidth - 120));
      this.setData({ qrSize: size });
    } catch (e) {}
  },

  /**
   * 加载预约详情 - 调用真实API
   */
  async loadAppointmentDetail(appointmentId, options = {}) {
    const { silent = false } = options;
    if (this.data.loading) return;
    if (!silent) {
      this.setData({ loading: true, errorOccurred: false });
    } else {
      this.setData({ errorOccurred: false });
    }

    try {
      const result = await request('appointment.detail', {
        appointmentId: appointmentId
      }, { showLoading: !silent, showError: !silent });

      // 后端返回：{ appointment, appointment_info }
      // - appointment.status/statusText 多为字符串（pending/approved/cancelled...）
      // - appointment_info.status 为归一后的数字状态（0-待核销 1-已核销 2-已取消）
      const appointment = result.appointment || result;
      const appt = result.appointment_info || result.appointment || {};
      const appointmentTeacherName = displayDict.valueOr(appointment.teacherName, 'UNASSIGNED');
      const actualTeacherName = displayDict.valueOr(appointment.actualTeacherName, 'UNASSIGNED');

      const normalizedStatus = this._normalizeStatus(appt.status ?? appointment.status ?? null);
      const normalizedStatusText = this._getStatusText(normalizedStatus);
      const cancelReasonRaw =
        appointment.cancelReason ||
        appointment.cancel_reason ||
        appt.cancelReason ||
        appt.cancel_reason ||
        '';
      const cancelReason = String(cancelReasonRaw || '').trim();

      this.setData({
        detail: {
          _id: appointment._id || appointmentId,
          appointmentNo: displayDict.valueOr(appointment.appointmentNo, 'NO_APPOINTMENT_NO'),
          currentSchool: displayDict.valueOr(
            appointment.currentSchool || appointment.current_school || appointment.current_school_name || '',
            ''
          ),
          studentName: displayDict.valueOr(appointment.studentName, 'UNFILLED'),
          idCardMask: displayDict.valueOr(appointment.idCardMask || appointment.idCard, 'UNFILLED'),
          parentName: displayDict.valueOr(appointment.parentName, 'UNFILLED'),
          parentPhone: displayDict.valueOr(appointment.parentPhone, 'NO_PHONE_CONTACT'),
          visitDate: displayDict.valueOr(appointment.visitDate, 'PENDING'),
          visitTime: displayDict.valueOr(appointment.visitTime, 'PENDING'),
          status: normalizedStatus,
          statusText: normalizedStatusText,
          createTime: appointment.createTime || appt.create_time || appt.createTime || '',
          updateTime: appointment.updateTime || appt.update_time || appt.updateTime || '',
          cancelTime: appointment.cancelTime || appointment.cancel_time || appointment.cancelledAt || '',
          verifyTime: appointment.verifyTime || appointment.verify_time || appointment.verifiedAt || '',
          appointmentTeacherName,
          actualTeacherName: actualTeacherName !== displayDict.text('UNASSIGNED')
            ? actualTeacherName
            : (normalizedStatus === 'pending' ? '待核销' : displayDict.text('UNASSIGNED')),
          teacherName: appointmentTeacherName,
          remark: displayDict.valueOr(appointment.remark, 'NONE'),
          notes: normalizedStatus === 'pending'
            ? displayDict.text('DESC_APPOINTMENT_PENDING_TIPS')
            : '',
          verifyCodePayload: appointment.verifyCodePayload || '',
          cancelReason
        },
        canCallParentPhone: this._canCallPhone(appointment.parentPhone),
        loading: false
      });

      this._syncQrValidUntilText();
      this._syncNotes();
      this._syncTimeline();

    } catch (err) {
      console.error('[AppointmentDetail] 加载失败:', err);
      this.setData({
        loading: false,
        errorOccurred: true
      });
      // 非 silent：request 已 toast；silent：showError:false，不打扰用户
    }
  },

  _syncQrValidUntilText() {
    const { visitDate, visitTime } = this.data.detail || {};
    if (visitDate && visitTime) {
      this.setData({ qrValidUntilText: `${visitDate} ${visitTime}` });
      return;
    }
    if (visitDate) {
      this.setData({ qrValidUntilText: `${visitDate}` });
      return;
    }
    this.setData({ qrValidUntilText: '' });
  },

  _syncNotes() {
    const notes = (this.data.detail && this.data.detail.notes) || '';
    if (!notes) {
      this.setData({ formattedNotes: '' });
      return;
    }
    // rich-text nodes: 保留换行
    const safe = String(notes).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = safe.split(/\r?\n/).map((line) => `<div style="margin:0 0 8rpx 0;">${line}</div>`).join('');
    this.setData({ formattedNotes: html });
  },

  _syncTimeline() {
    const d = this.data.detail || {};
    const status = this._normalizeStatus(d.status);
    const visitDateTime = d.visitDate && d.visitTime ? `${d.visitDate} ${d.visitTime}` : '';
    const appointmentTeacherText = d.appointmentTeacherName && d.appointmentTeacherName !== displayDict.text('UNASSIGNED')
      ? `预约老师：${d.appointmentTeacherName}`
      : '请按预约时间到校';

    const submitted = { step: 'submitted', title: '已提交', desc: '预约已提交', time: d.createTime || '' };
    const toVisit = {
      step: 'to_visit',
      title: '待核销',
      desc: appointmentTeacherText,
      time: visitDateTime
    };
    const verified = {
      step: 'verified',
      title: '已核销',
      desc: '已完成核销',
      time: d.verifyTime || d.updateTime || ''
    };
    const cancelled = {
      step: 'cancelled',
      title: '已取消',
      desc: '预约已取消',
      time: d.cancelTime || d.updateTime || ''
    };

    let steps = [submitted, toVisit, verified];
    let currentStep = 0;

    if (status === 'cancelled') {
      steps = [submitted, cancelled];
      currentStep = 1;
    } else if (status === 'verified') {
      currentStep = 2;
    } else {
      // 默认：已提交，待到校（待核销）
      currentStep = 1;
    }

    this.setData({ timelineSteps: steps, currentStep });
  },

  _normalizeStatus(status) {
    if (status === 1 || status === '1' || status === 'verified' || status === 'completed' || status === '已核销' || status === '已完成') {
      return 'verified';
    }
    if (status === 2 || status === '2' || status === 'cancelled' || status === 'rejected' || status === '已取消') {
      return 'cancelled';
    }
    return 'pending';
  },

  _getStatusText(status) {
    const normalizedStatus = this._normalizeStatus(status);
    if (normalizedStatus === 'verified') return '已核销';
    if (normalizedStatus === 'cancelled') return '已取消';
    return '待核销';
  },

  onCopyAppointmentNumber() {
    const appointmentNo = this.data.detail.appointmentNo;
    if (!appointmentNo) {
      feedback.showError(this.data.displayText.noAppointmentNo);
      return;
    }

    wx.setClipboardData({
      data: appointmentNo,
      success: () => {
        feedback.showSuccess(displayDict.text('COPY_SUCCESS'));
      },
      fail: () => {
        feedback.showError(errorDict.text('COPY_FAILED'));
      }
    });
  },

  makeCall(e) {
    const phone = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.phone) || '';
    const rawStr = String(phone || '');
    const hadMask = rawStr.includes('*');
    const digits = rawStr.replace(/[^\d]/g, '');

    // 如果后端对手机号做了脱敏（包含 *），则不允许拨号，避免拨打不完整号码
    if (hadMask || !digits || digits.length < 7) {
      feedback.showError(this.data.displayText.noPhoneContact);
      return;
    }

    wx.makePhoneCall({ phoneNumber: digits });
  },

  _canCallPhone(phone) {
    const rawStr = String(phone || '');
    const hadMask = rawStr.includes('*');
    const digits = rawStr.replace(/[^\d]/g, '');
    return !hadMask && !!digits && digits.length >= 7;
  },

  onShowQRCode() {
    if (!this.data.detail.appointmentNo) {
      feedback.showError(errorDict.text('APPOINTMENT_NO_UNAVAILABLE'));
      return;
    }
    this.setData({ showQRCode: true, renderQRCode: false }, () => {
      wx.nextTick(() => {
        if (!this.data.showQRCode) return;
        this.setData({ renderQRCode: true });
      });
    });
  },

  onCloseQRCode() {
    this.setData({ showQRCode: false, renderQRCode: false });
    const appointmentId = this.data.detail && this.data.detail._id;
    if (appointmentId) {
      this.loadAppointmentDetail(appointmentId, { silent: true });
    }
  },

  preventTouchMove() {},

  onShowCancelModal() {
    if (this.data.errorOccurred) {
      feedback.showError(errorDict.text('DATA_LOAD_ERROR_CANNOT_OPERATE'));
      return;
    }
    this.setData({ showCancelModal: true });
  },

  onCloseCancelModal() {
    this.setData({ showCancelModal: false });
  },

  /**
   * 取消预约 - 调用真实API
   */
  async onConfirmCancel() {
    const appointmentId = this.data.detail._id;
    if (!appointmentId) {
      feedback.showError(validationDict.text('APPOINTMENT_ID_MISSING'));
      return;
    }

    try {
      await request('appointment.cancel', {
        appointmentId: appointmentId,
        reason: '用户主动取消'
      }, { showLoading: true });

      this.setData({ showCancelModal: false });
      feedback.showSuccess(displayDict.text('CANCEL_SUCCESS'));

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('[AppointmentDetail] 取消失败:', err);
      this.setData({ showCancelModal: false });
    }
  }
});
