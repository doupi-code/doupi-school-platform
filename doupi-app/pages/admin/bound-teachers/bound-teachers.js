const feedback = require('../../../utils/feedback');
const { requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    searchKeyword: '',
    showFilter: false,
    selectedStatus: 'all',
    statusOptions: [
      { value: 'all', label: '全部状态' },
      { value: 'active', label: '正常' },
      { value: 'inactive', label: '已解绑' }
    ],

    teacherList: [],
    filteredList: [],
    displayText: {
      unknown: displayDict.text('UNKNOWN'),
      noRecord: displayDict.text('NO_RECORD'),
      emptyTeachers: displayDict.text('EMPTY_MATCHED_TEACHERS'),
      resultTeacherCountSuffix: displayDict.text('RESULT_TEACHER_COUNT_SUFFIX'),
      btnViewDetail: displayDict.text('BTN_VIEW_DETAIL'),
      btnUnbind: displayDict.text('BTN_UNBIND'),
      btnUnbound: displayDict.text('BTN_UNBOUND'),
      emptyTryAdjustSearchFilter: displayDict.text('EMPTY_TRY_ADJUST_SEARCH_FILTER')
    }
  },

  async onShow() {
    if (!auth.requireRoles([1, 2, 5])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'bound-teachers');
    if (!granted) return;
    this.loadTeacherList();
  },

  /** 搜索 */
  handleSearch(e) {
    this.setData({ searchKeyword: e.detail.value });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadTeacherList(), 300);
  },

  /** 切换筛选面板 */
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  /** 选择筛选条件 */
  selectStatus(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedStatus: value, showFilter: false });
    this.filterList();
  },

  async loadTeacherList() {
    try {
      wx.showLoading({ title: displayDict.text('LOADING_TEXT') });
      const result = await requestWithCheck('binding.list', {
        keyword: this.data.searchKeyword || '',
        page: 1,
        pageSize: 50,
        withStats: true
      }, { showLoading: false });

      const list = (result && result.list ? result.list : []).map((item) => ({
        id: item.teacherId || '',
        bindingId: item.bindingId || '',
        name: displayDict.valueOr(item.teacherName, 'UNKNOWN'),
        phone: displayDict.valueOr(item.phoneMask, 'NO_PHONE_BOUND'),
        avatar: item.avatar || '',
        directorId: item.directorId || '',
        directorName: displayDict.valueOr(item.directorName, 'UNKNOWN'),
        directorPhone: displayDict.valueOr(item.directorPhoneMask, 'NO_PHONE_BOUND'),
        bindTime: displayDict.valueOr(this.formatDate(item.bindingTime), 'NO_RECORD'),
        status: item.status === 1 ? 'active' : 'inactive',
        statusText: item.status === 1 ? '正常' : '已解绑',
        appointmentCount: typeof item.appointmentCount === 'number' ? item.appointmentCount : 0,
        verifyCount: typeof item.verifyCount === 'number' ? item.verifyCount : 0,
        verifyRate: typeof item.verifyRate === 'number' ? item.verifyRate : 0
      }));

      this.setData({ teacherList: list }, () => this.filterList());
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载老师列表失败:', err);
      // requestWithCheck 已 toast
    }
  },

  /** 筛选列表 */
  filterList() {
    const { teacherList, searchKeyword, selectedStatus } = this.data;
    let filtered = [...teacherList];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === selectedStatus);
    }

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(kw) ||
        t.phone.includes(kw) ||
        String(t.directorName || '').toLowerCase().includes(kw) ||
        String(t.directorPhone || '').includes(kw)
      );
    }

    this.setData({ filteredList: filtered });
  },

  /** 查看老师详情/预约 */
  goToTeacherDetail(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.filteredList.find((t) => t.id === id) || this.data.teacherList.find((t) => t.id === id);
    const name = item && item.name ? encodeURIComponent(item.name) : '';
    wx.navigateTo({ url: `/pages/admin/global-appointments/global-appointments?teacherId=${id}&teacherName=${name}` });
  },

  /** 解除绑定 */
  handleUnbind(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: displayDict.text('MODAL_UNBIND_TITLE'),
      content: `确定要解除「${item.name}」与「${item.directorName}」的绑定关系吗？`,
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.doUnbind(item.id);
        }
      }
    });
  },

  /** 执行解绑操作 */
  async doUnbind(teacherId) {
    try {
      const target = this.data.teacherList.find((item) => item.id === teacherId);
      if (!target || !target.bindingId) {
        feedback.showToast({ title: errorDict.text('BINDING_NOT_FOUND'), icon: 'none' });
        return;
      }
      wx.showLoading({ title: displayDict.text('PROCESSING') });
      await requestWithCheck('binding.unbind', { bindingId: target.bindingId }, { showLoading: false });
      wx.hideLoading();
      feedback.showToast({ title: displayDict.text('UNBIND_DONE'), icon: 'success' });
      this.loadTeacherList();
    } catch (err) {
      wx.hideLoading();
      console.error('解绑失败:', err);
      // requestWithCheck 已 toast
    }
  },

  formatDate(input) {
    if (!input) return '';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  goBack() {
    wx.navigateBack();
  }
});
