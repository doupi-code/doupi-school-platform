const feedback = require('../../utils/feedback');
const common = require('../../utils/common');
const { request } = require('../../utils/request');
const displayDict = require('../../utils/displayDict');

const AGREEMENT_READ_STORAGE_KEY = 'appointmentAgreementReadFlags';

Page({
  data: {
    formattedContent: '',
    updateTime: '',
    fromAppointment: false,
    displayText: {
      btnReadAndAgree: displayDict.text('BTN_READ_AND_AGREE')
    }
  },

  onLoad(options) {
    this.setData({
      fromAppointment: !!(options && options.from === 'appointment')
    });
    this.loadContent();
  },

  async loadContent() {
    try {
      const config = await request('config.summary', {}, { showLoading: false, showError: false });
      const rawContent = config.appointmentNotice || displayDict.text('NO_APPOINTMENT_NOTICE');
      const formatted = common.formatRichText(rawContent, { unescape: true, sanitize: false });
      const updateTime = config.policyUpdatedAt
        ? new Date(config.policyUpdatedAt).toLocaleDateString()
        : '';

      this.setData({
        formattedContent: formatted,
        updateTime
      });
    } catch (err) {
      const formatted = common.formatRichText(displayDict.text('NO_APPOINTMENT_NOTICE'), { unescape: true, sanitize: false });
      this.setData({ formattedContent: formatted });
    }
  },

  handleAgree() {
    const flags = wx.getStorageSync(AGREEMENT_READ_STORAGE_KEY) || {};
    flags.notice = true;
    wx.setStorageSync(AGREEMENT_READ_STORAGE_KEY, flags);
    feedback.showToast({ title: displayDict.text('APPOINTMENT_NOTICE_READ_DONE'), icon: 'success' });
    if (this.data.fromAppointment) {
      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
