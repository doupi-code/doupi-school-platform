const feedback = require('../../../utils/feedback');
const { requestWithCheck } = require('../../../utils/request');
const { requestSubscribeAuthorization } = require('../../../utils/subscribe');
const auth = require('../../../utils/auth');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    keyword: '',
    loading: false,
    submitting: false,
    directorList: [],
    selectedDirectorId: '',
    selectedDirectorName: '',
    currentStatus: '',
    currentStatusText: '',
    currentDirectorName: '',
    canSubmit: true,
  },

  async onLoad() {
    if (!auth.requireRoles([3])) return;
    await this.loadPageData();
  },

  async onShow() {
    if (!auth.isLoggedIn() || !auth.isTeacher()) return;
    await this.loadPageData();
  },

  async loadPageData() {
    const canContinue = await this.loadCurrentStatus();
    if (!canContinue) return;
    await this.loadDirectors();
  },

  async loadCurrentStatus() {
    try {
      const [bindRes, requestRes] = await Promise.all([
        requestWithCheck('binding.adminStatus', {}, { showLoading: false, showError: false, cache: false }).catch(() => null),
        requestWithCheck('binding.getMyBindRequestStatus', {}, { showLoading: false, showError: false, cache: false }).catch(() => null)
      ]);

      const isBound = !!(bindRes && bindRes.isBound);
      const latest = requestRes && requestRes.latest ? requestRes.latest : null;
      const isPending = !isBound && latest && latest.status === 'pending';
      const currentDirectorName = isBound
        ? ((bindRes.directorInfo && bindRes.directorInfo.nickname) || '')
        : ((latest && latest.directorName) || '');

      this.setData({
        currentStatus: isBound ? 'bound' : (isPending ? 'pending' : ''),
        currentStatusText: isBound ? '您已绑定招生主任' : (isPending ? '您的绑定申请正在审核中' : ''),
        currentDirectorName,
        canSubmit: !(isBound || isPending)
      });
      return !(isBound || isPending);
    } catch (err) {
      this.setData({
        currentStatus: '',
        currentStatusText: '',
        currentDirectorName: '',
        canSubmit: true
      });
      return true;
    }
  },

  async loadDirectors() {
    this.setData({ loading: true });
    try {
      const res = await requestWithCheck('binding.listDirectors', { keyword: this.data.keyword }, { showLoading: false, showError: false });
      this.setData({ directorList: (res && res.list) || [] });
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
    this.loadDirectors();
  },

  onSelectDirector(e) {
    const directorId = e.currentTarget.dataset.id;
    const directorName = e.currentTarget.dataset.name || '';
    this.setData({
      selectedDirectorId: directorId,
      selectedDirectorName: directorName,
    });
  },

  async onSubmitBind() {
    if (this.data.submitting) return;
    if (!this.data.canSubmit) {
      feedback.showToast({ title: this.data.currentStatusText || '当前无需重复绑定', icon: 'none' });
      return;
    }
    if (!this.data.selectedDirectorId) {
      feedback.showToast({ title: '请先选择招生主任', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await this.requestBindingSubscribeAuth();
      await requestWithCheck(
        'binding.submitBindRequest',
        { directorId: this.data.selectedDirectorId },
        { showLoading: true, loadingText: '提交中...' }
      );
      feedback.showToast({ title: '绑定申请已提交', icon: 'success' });
      await this.loadCurrentStatus();
    } catch (err) {
      console.error('提交绑定申请失败:', err);
      // requestWithCheck 已 toast
    } finally {
      this.setData({ submitting: false });
    }
  },

  async requestBindingSubscribeAuth() {
    try {
      await requestSubscribeAuthorization({ scenes: 'binding_apply' });
    } catch (_) {}
  },
});
