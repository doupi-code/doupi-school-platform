const { request } = require('../../utils/request');
const feedback = require('../../utils/feedback');
const displayDict = require('../../utils/displayDict');

Page({
  data: {
    appName: '汉外华襄预约小程序',
    version: '1.0.0',
    intro: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    officeHours: [
      { label: '周一至周五', value: '' },
      { label: '周六', value: '' },
      { label: '周日及法定节假日', value: '' }
    ],
    campusImage: '/images/shared-hero-bg.png'
  },

  onLoad() {
    this.loadContent();
  },

  async loadContent() {
    try {
      const result = await request('about.summary', {}, { showLoading: false, showError: false });
      const campusData = (result && result.campus) || {};
      const intro = campusData.intro || campusData.summary || '';
      const contactPhone = campusData.contactPhone || '';
      const address = campusData.address || '';
      const appName = result.appName || this.data.appName;
      const aboutConfig = result.aboutConfig || {};
      this.setData({
        intro,
        contactPhone: aboutConfig.contactPhone || contactPhone,
        contactEmail: aboutConfig.contactEmail || '',
        address: aboutConfig.address || address,
        officeHours: Array.isArray(aboutConfig.officeHours) && aboutConfig.officeHours.length
          ? aboutConfig.officeHours
          : this.data.officeHours,
        appName
      });
    } catch (err) {
      // keep default values
    }
  },

  goBack() {
    wx.navigateBack();
  },

  makeCall() {
    const rawStr = String(this.data.contactPhone || '');
    const hadMask = rawStr.includes('*');
    const digits = rawStr.replace(/[^\d]/g, '');

    if (hadMask || !digits || digits.length < 7) {
      feedback.showError(displayDict.text('NO_PHONE_CONTACT'));
      return;
    }

    wx.makePhoneCall({ phoneNumber: digits });
  }
});
