const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');

const TAB_KEYS = ['appointmentNotice', 'privacyPolicy', 'userAgreement'];

Page({
  data: {
    configTabs: [
      { key: 'appointmentNotice', label: '预约须知', icon: 'edit' },
      { key: 'privacyPolicy', label: '隐私政策', icon: 'lock-on' },
      { key: 'userAgreement', label: '用户协议', icon: 'file' }
    ],
    activeTab: 'appointmentNotice',
    richTextMap: {
      appointmentNotice: '',
      privacyPolicy: '',
      userAgreement: ''
    },
    saving: false,
    initialSnapshot: null
  },

  editorCtxMap: {},

  async onLoad(options) {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'content-config');
    if (!granted) return;
    if (options && TAB_KEYS.includes(options.tab)) {
      this.setData({ activeTab: options.tab });
    }
    this.loadConfig();
  },

  async loadConfig() {
    try {
      const result = await request('config.detail', {}, { showLoading: true, loadingText: '加载中...' });
      const config = result && result.config ? result.config : (result || {});
      const content = config.content_config || {};
      this.setData({
        richTextMap: {
          appointmentNotice: this.normalizeRichHtml(content.appointmentNotice),
          privacyPolicy: this.normalizeRichHtml(content.privacyPolicy),
          userAgreement: this.normalizeRichHtml(content.userAgreement)
        },
        initialSnapshot: JSON.stringify({
          appointmentNotice: this.normalizeRichHtml(content.appointmentNotice),
          privacyPolicy: this.normalizeRichHtml(content.privacyPolicy),
          userAgreement: this.normalizeRichHtml(content.userAgreement)
        })
      }, () => this.syncActiveEditorContent());
    } catch (err) {
      console.error('加载内容配置失败', err);
    }
  },

  normalizeRichHtml(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text[0] === '<' ? text : `<p>${text}</p>`;
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (!TAB_KEYS.includes(key) || key === this.data.activeTab) return;
    this.setData({ activeTab: key }, () => this.syncActiveEditorContent());
  },

  onEditorReady(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    wx.createSelectorQuery()
      .select(`#editor-${key}`)
      .context((res) => {
        if (!res || !res.context) return;
        this.editorCtxMap[key] = res.context;
        const html = this.data.richTextMap[key] || '';
        if (html) {
          res.context.setContents({ html });
        }
      })
      .exec();
  },

  onEditorInput(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({
      [`richTextMap.${key}`]: (e.detail && e.detail.html) || ''
    });
  },

  formatRichText(e) {
    const type = e.currentTarget.dataset.type;
    const editorCtx = this.editorCtxMap[this.data.activeTab];
    if (!editorCtx || !type) return;
    editorCtx.format(type);
  },

  syncActiveEditorContent() {
    const key = this.data.activeTab;
    const editorCtx = this.editorCtxMap[key];
    if (!editorCtx) return;
    editorCtx.setContents({ html: this.data.richTextMap[key] || '' });
  },

  async saveConfig() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      await request('config.update', {
        content_config: Object.assign({}, this.data.richTextMap, {
          policyUpdatedAt: Date.now()
        }),
        policyUpdatedAt: Date.now()
      }, { showLoading: true, loadingText: '保存中...' });
      feedback.showToast({ title: '保存成功', icon: 'success' });
      this.setData({
        initialSnapshot: JSON.stringify(this.data.richTextMap)
      });
    } catch (err) {
      console.error('保存内容配置失败', err);
    } finally {
      this.setData({ saving: false });
    }
  }
});
