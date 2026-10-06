const feedback = require('../../../utils/feedback');
const { requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const errorDict = require('../../../utils/errorDict');
const { requestSubscribeAuthorization } = require('../../../utils/subscribe');

Page({
  data: {
    list: [],
    keyword: '',
    loading: false,
    checkedMap: {},
    rejectReasonMap: {},
    batchRejectReason: '',
  },

  async onLoad() {
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'binding-audit');
    if (!granted) return;
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await requestWithCheck('binding.listPendingRequests', { keyword: this.data.keyword }, { showLoading: false, showError: false });
      this.setData({ list: (res && res.list) || [], checkedMap: {}, rejectReasonMap: {} });
    } catch (err) {
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: (e.detail && e.detail.value) || '' });
  },

  onSearchConfirm() {
    this.loadList();
  },

  onToggleCheck(e) {
    const id = e.currentTarget.dataset.id;
    const checkedMap = Object.assign({}, this.data.checkedMap);
    checkedMap[id] = !checkedMap[id];
    this.setData({ checkedMap });
  },

  onRejectReasonInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = (e.detail && e.detail.value) || '';
    const rejectReasonMap = Object.assign({}, this.data.rejectReasonMap, { [id]: value });
    this.setData({ rejectReasonMap });
  },

  async onApproveOne(e) {
    const id = e.currentTarget.dataset.id;
    await this.approveIds([id]);
  },

  async onApproveBatch() {
    const ids = Object.keys(this.data.checkedMap).filter((k) => this.data.checkedMap[k]);
    if (!ids.length) {
      feedback.showToast({ title: '请先选择待审核老师', icon: 'none' });
      return;
    }
    await this.approveIds(ids);
  },

  onBatchRejectReasonInput(e) {
    this.setData({ batchRejectReason: (e.detail && e.detail.value) || '' });
  },

  onRejectBatch() {
    const ids = Object.keys(this.data.checkedMap).filter((k) => this.data.checkedMap[k]);
    if (!ids.length) {
      feedback.showToast({ title: '请先选择待审核老师', icon: 'none' });
      return;
    }
    const reason = String(this.data.batchRejectReason || '').trim() || '批量审核驳回';
    wx.showModal({
      title: '批量驳回绑定申请',
      content: `将驳回 ${ids.length} 条申请，老师二维码会失效。确定继续吗？`,
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.requestBindingSubscribeAuth();
          const result = await requestWithCheck(
            'binding.rejectRequests',
            { requestIds: ids, reason },
            { showLoading: true, loadingText: '处理中...' }
          );
          const successCount = Number((result && result.successCount) || 0);
          const skippedCount = Number((result && result.skippedCount) || 0);
          feedback.showToast({
            title: `驳回${successCount}条，跳过${skippedCount}条`,
            icon: 'none',
          });
          this.loadList();
        } catch (err) {
          console.error('批量驳回失败:', err);
          // requestWithCheck 已 toast
        }
      },
    });
  },

  async approveIds(ids) {
    try {
      await this.requestBindingSubscribeAuth();
      await requestWithCheck('binding.approveRequests', { requestIds: ids }, { showLoading: true, loadingText: '审核中...' });
      feedback.showToast({ title: '审核通过', icon: 'success' });
      this.loadList();
    } catch (err) {
      console.error('审核失败:', err);
      // requestWithCheck 已 toast
    }
  },

  onRejectOne(e) {
    const id = e.currentTarget.dataset.id;
    const reason = String((this.data.rejectReasonMap && this.data.rejectReasonMap[id]) || '').trim() || '审核驳回';
    wx.showModal({
      title: '驳回绑定申请',
      content: '驳回后老师二维码将失效，需要重新绑定主任。确定驳回吗？',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.requestBindingSubscribeAuth();
          await requestWithCheck('binding.rejectRequest', { requestId: id, reason }, { showLoading: true, loadingText: '处理中...' });
          feedback.showToast({ title: '已驳回', icon: 'success' });
          this.loadList();
        } catch (err) {
          console.error('驳回失败:', err);
          // requestWithCheck 已 toast
        }
      },
    });
  },

  async requestBindingSubscribeAuth() {
    try {
      await requestSubscribeAuthorization({ scenes: 'binding_audit' });
    } catch (_) {}
  },
});
