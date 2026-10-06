const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    loading: false,
    list: []
  },

  async onLoad() {
    if (!auth.requireRoles([1, 2])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'banners');
    if (!granted) return;
    await this.loadList();
  },

  async onPullDownRefresh() {
    await this.loadList();
    wx.stopPullDownRefresh();
  },

  async onRefreshTap() {
    await this.loadList();
  },

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await request('config.listBanner', {}, { showLoading: false, showError: false });
      const raw = (res && res.list) || [];
      const sorted = Array.isArray(raw)
        ? raw.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        : [];

      const list = sorted.map((item, idx) => ({
        id: String(item._id || item.id || ''),
        title: String(item.title || ''),
        image_url: String(item.image_url || ''),
        imageUrl: String(item.imageUrl || item.image_url || ''),
        link_url: String(item.link_url || ''),
        status: String(item.status || 'active') === 'disabled' ? 'disabled' : 'active',
        sort_order: Number(item.sort_order || idx),
        previewUrl: String(item.imageUrl || item.image_url || '')
      })).filter((item) => item.id && item.image_url);

      this.setData({ list });
    } catch (err) {
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onAddTap() {
    if (this._adding) return;
    this._adding = true;

    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });
      const tempFile = chooseRes.tempFiles && chooseRes.tempFiles[0];
      if (!tempFile || !tempFile.tempFilePath) return;

      wx.showLoading({ title: displayDict.text('UPLOADING'), mask: true });
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `banners/banner_${Date.now()}.jpg`,
        filePath: tempFile.tempFilePath
      });
      const fileID = uploadRes && uploadRes.fileID;
      if (!fileID) throw new Error('上传失败');

      await request('config.createBanner', {
        image_url: fileID,
        title: '',
        link_url: '',
        status: 'active'
      }, { showLoading: false, showError: false });

      wx.hideLoading();
      feedback.showToast({ title: displayDict.text('ADD_SUCCESS'), icon: 'success' });
      await this.loadList();
    } catch (err) {
      try { wx.hideLoading(); } catch (_) {}
      feedback.showToast({ title: errorDict.text('UPLOAD_FAILED'), icon: 'none' });
    } finally {
      this._adding = false;
    }
  },

  onPreviewTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    const urls = (this.data.list || []).map((item) => item.previewUrl).filter(Boolean);
    if (!urls.length) return;
    const current = urls[index] || urls[0];
    wx.previewImage({ current, urls });
  },

  onFieldInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = String(e.currentTarget.dataset.field || '').trim();
    const value = (e.detail && e.detail.value) || '';
    if (!field) return;
    this.setData({
      [`list[${index}].${field}`]: value
    });
  },

  async onFieldBlur(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = String(e.currentTarget.dataset.field || '').trim();
    if (!field) return;
    const item = this.data.list[index];
    if (!item || !item.id) return;
    const payload = { id: item.id };
    payload[field] = item[field];
    try {
      await request('config.updateBanner', payload, { showLoading: false, showError: false });
    } catch (err) {
      feedback.showToast({ title: errorDict.text('SAVE_FAILED'), icon: 'none' });
    }
  },

  async onStatusChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const checked = !!(e.detail && e.detail.value);
    const item = this.data.list[index];
    if (!item || !item.id) return;
    const nextStatus = checked ? 'active' : 'disabled';
    this.setData({ [`list[${index}].status`]: nextStatus });
    try {
      await request('config.updateBanner', { id: item.id, status: nextStatus }, { showLoading: false, showError: false });
    } catch (err) {
      feedback.showToast({ title: errorDict.text('SAVE_FAILED'), icon: 'none' });
    }
  },

  async onDeleteTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.list[index];
    if (!item || !item.id) return;
    await new Promise((resolve) => {
      wx.showModal({
        title: displayDict.text('MODAL_CONFIRM_DELETE_TITLE'),
        content: '确定删除该轮播图吗？',
        success: async (res) => {
          if (!res.confirm) return resolve();
          try {
            wx.showLoading({ title: '删除中...', mask: true });
            await request('config.deleteBanner', { id: item.id }, { showLoading: false, showError: false });
            wx.hideLoading();
            feedback.showToast({ title: displayDict.text('DELETE_SUCCESS'), icon: 'success' });
            await this.loadList();
          } catch (err) {
            try { wx.hideLoading(); } catch (_) {}
            feedback.showToast({ title: errorDict.text('DELETE_FAILED'), icon: 'none' });
          }
          resolve();
        },
        fail: () => resolve()
      });
    });
  },

  async onMoveUpTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index <= 0) return;
    const next = this.data.list.slice();
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    this.setData({ list: next });
    await this.persistOrder();
  },

  async onMoveDownTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.list.length - 1) return;
    const next = this.data.list.slice();
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    this.setData({ list: next });
    await this.persistOrder();
  },

  async persistOrder() {
    if (this._savingOrder) return;
    this._savingOrder = true;
    try {
      const banners = (this.data.list || []).map((item, idx) => ({
        id: item.id,
        sort_order: idx
      }));
      await request('config.updateBannerOrder', { banners }, { showLoading: false, showError: false });
    } catch (err) {
      feedback.showToast({ title: errorDict.text('SAVE_FAILED'), icon: 'none' });
    } finally {
      this._savingOrder = false;
    }
  }
});
