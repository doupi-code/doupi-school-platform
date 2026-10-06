const { requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');

Page({
  data: {
    searchKeyword: '',
    showFilter: false,
    selectedStatus: 'all',
    sortMode: 'totalCountDesc',
    timeRange: 'week',
    sortOptions: [
      { value: 'totalCountDesc', label: '总数' },
      { value: 'appointmentCountDesc', label: '预约数' },
      { value: 'receptionCountDesc', label: '接待数' }
    ],
    statusOptions: [
      { value: 'all', label: '全部状态' },
      { value: 'active', label: '正常' },
      { value: 'inactive', label: '停用' }
    ],
    teacherList: [],
    filteredList: []
  },

  async onLoad(options = {}) {
    const role = auth.getUserRole();
    if (!auth.requireRoles([1, 2, 3, 5])) return;
    if ([1, 2].includes(Number(role))) {
      const granted = await ensureMenuAccessWithModal(role, 'recruitment', 'stats');
      if (!granted) return;
    }

    const timeRange = options.timeRange ? String(options.timeRange).trim() : 'week';
    this.setData({ timeRange });
    this.loadTeacherRanking();
  },

  handleSearch(e) {
    const clear = !!(e.currentTarget.dataset && e.currentTarget.dataset.clear);
    const value = clear ? '' : String((e.detail && e.detail.value) || '');
    this.setData({ searchKeyword: value });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.filterList(), 200);
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  selectStatus(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedStatus: value, showFilter: false }, () => this.filterList());
  },

  handleSortChange(e) {
    const value = String((e.currentTarget.dataset && e.currentTarget.dataset.value) || '').trim();
    if (!value || value === this.data.sortMode) return;
    this.setData({ sortMode: value }, () => this.filterList());
  },

  async loadTeacherRanking() {
    try {
      wx.showLoading({ title: '加载中' });
      const result = await requestWithCheck('stats.teacherRanking', {
        timeRange: this.data.timeRange
      }, { showLoading: false });

      const list = (result && result.list ? result.list : []).map((item) => ({
        id: item.teacherId || '',
        teacherId: item.teacherId || '',
        name: item.teacherName || '未命名老师',
        phone: item.phoneMask || '未绑定手机号',
        avatar: item.avatar || '',
        status: Number(item.status) === 0 ? 'inactive' : 'active',
        statusText: Number(item.status) === 0 ? '停用' : '正常',
        directorName: Number(item.role) === 3 && item.directorName ? String(item.directorName).trim() : '',
        appointmentCount: typeof item.appointmentCount === 'number' ? item.appointmentCount : 0,
        receptionCount: typeof item.receptionCount === 'number' ? item.receptionCount : 0,
        totalCount: typeof item.totalCount === 'number' ? item.totalCount : 0,
      }));

      this.setData({ teacherList: list }, () => this.filterList());
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载老师排行失败:', err);
    }
  },

  filterList() {
    const { teacherList, searchKeyword, selectedStatus, sortMode } = this.data;
    let filtered = [...teacherList];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.name || '').toLowerCase().includes(keyword) ||
        String(item.phone || '').includes(keyword) ||
        String(item.directorName || '').toLowerCase().includes(keyword)
      );
    }

    filtered.sort((a, b) => {
      if (sortMode === 'appointmentCountDesc') {
        if (b.appointmentCount !== a.appointmentCount) return b.appointmentCount - a.appointmentCount;
        if (b.receptionCount !== a.receptionCount) return b.receptionCount - a.receptionCount;
      } else if (sortMode === 'receptionCountDesc') {
        if (b.receptionCount !== a.receptionCount) return b.receptionCount - a.receptionCount;
        if (b.appointmentCount !== a.appointmentCount) return b.appointmentCount - a.appointmentCount;
      } else {
        if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
        if (b.appointmentCount !== a.appointmentCount) return b.appointmentCount - a.appointmentCount;
        if (b.receptionCount !== a.receptionCount) return b.receptionCount - a.receptionCount;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    });

    this.setData({
      filteredList: filtered.map((item, index) => Object.assign({}, item, { rank: index + 1 }))
    });
  },

  goToTeacherDetail(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.filteredList.find((row) => row.id === id) || this.data.teacherList.find((row) => row.id === id);
    const name = item && item.name ? encodeURIComponent(item.name) : '';
    wx.navigateTo({ url: `/pages/admin/global-appointments/global-appointments?teacherId=${id}&teacherName=${name}&timeRange=${this.data.timeRange}` });
  }
});
