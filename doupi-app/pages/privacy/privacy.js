const common = require('../../utils/common');
const { request } = require('../../utils/request');
const displayDict = require('../../utils/displayDict');

Page({
  data: {
    formattedContent: ''
  },

  onLoad() {
    this.loadFromCloud();
  },

  async loadFromCloud() {
    try {
      const config = await request('config.summary', {}, { showLoading: false, showError: false });
      const raw = String(config.privacyPolicy || displayDict.text('NO_PRIVACY_POLICY')).trim();
      const formatted = common.formatRichText(raw, { unescape: true, sanitize: false });
      this.setData({
        formattedContent: formatted
      });
    } catch (err) {
      const formatted = common.formatRichText(displayDict.text('NO_PRIVACY_POLICY'), { unescape: true, sanitize: false });
      this.setData({ formattedContent: formatted });
    }
  }
});
