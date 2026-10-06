const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const errorDict = require('../../../utils/errorDict');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const MEDIA_ASSET_FILTER_STORAGE_KEY = 'mediaAssetsFilterState';
const MEDIA_ASSET_DETAIL_CACHE_PREFIX = 'mediaAssetDetailCache:';

const SCOPE_META = {
  total: {
    title: '全部媒体',
    empty: '暂无媒体记录'
  },
  expired: {
    title: '待清理媒体',
    empty: '暂无待清理媒体'
  },
  permanent: {
    title: '永久保留媒体',
    empty: '暂无永久保留媒体'
  }
};

Page({
  data: {
    scope: 'total',
    titleText: '媒体台账',
    loading: false,
    cleaning: false,
    deletingAssetId: '',
    loadingMore: false,
    hasMore: false,
    page: 1,
    limit: 12,
    total: 0,
    summary: {
      totalCount: 0,
      expiredCount: 0,
      permanentCount: 0,
      expireDays: 30
    },
    keyword: '',
    filterForm: {
      fileType: 'all',
      category: 'all',
      refCollection: 'all'
    },
    filterIndex: {
      fileType: 0,
      category: 0,
      refCollection: 0
    },
    filterLabels: {
      fileType: '全部类型',
      category: '全部分类',
      refCollection: '全部来源'
    },
    showAdvancedFilters: false,
    filterOptions: {
      fileTypes: [
        { value: 'all', label: '全部类型' },
        { value: 'image', label: '图片' },
        { value: 'video', label: '视频' }
      ],
      categories: [
        { value: 'all', label: '全部分类' },
        { value: 'campus_cover', label: '校园封面' },
        { value: 'campus_content_image', label: '正文图片' },
        { value: 'campus_content_video', label: '正文视频' },
        { value: 'campus_image', label: '校园图片' },
        { value: 'campus_video', label: '校园视频' },
        { value: 'teacher_invite_qr', label: '招生二维码' },
        { value: 'user_avatar', label: '用户头像' }
      ],
      refCollections: [
        { value: 'all', label: '全部来源' },
        { value: 'campus', label: '校园内容' },
        { value: 'users', label: '用户资料' },
        { value: 'invite_keys', label: '招生二维码' },
        { value: 'unmarked', label: '未标记来源' }
      ]
    },
    list: []
  },

  async onLoad(options) {
    if (!auth.requireRoles([1, 2])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'media-assets');
    if (!granted) return;
    const restored = this.restoreFilterState();
    const scope = String((options && options.scope) || restored.scope || 'total');
    this.setScope(scope);
    await this.loadList(true);
  },

  onShow() {
    const shouldRefresh = !!wx.getStorageSync('mediaAssetsNeedsRefresh');
    if (!shouldRefresh) return;
    wx.removeStorageSync('mediaAssetsNeedsRefresh');
    this.loadList(true);
  },

  setScope(scope) {
    const nextScope = SCOPE_META[scope] ? scope : 'total';
    this.setData({
      scope: nextScope,
      titleText: SCOPE_META[nextScope].title
    });
    wx.setNavigationBarTitle({
      title: SCOPE_META[nextScope].title
    });
  },

  getDefaultFilterState() {
    return {
      scope: 'total',
      keyword: '',
      showAdvancedFilters: false,
      filterForm: {
        fileType: 'all',
        category: 'all',
        refCollection: 'all'
      },
      filterIndex: {
        fileType: 0,
        category: 0,
        refCollection: 0
      },
      filterLabels: {
        fileType: '全部类型',
        category: '全部分类',
        refCollection: '全部来源'
      }
    };
  },

  syncFilterUiFromForm(filterForm) {
    const nextForm = Object.assign({}, this.getDefaultFilterState().filterForm, filterForm || {});
    const buildField = (field, options) => {
      const list = Array.isArray(options) ? options : [];
      const index = Math.max(0, list.findIndex((item) => item && item.value === nextForm[field]));
      const matched = list[index] || list[0] || { value: 'all', label: '全部' };
      return {
        value: matched.value,
        index,
        label: matched.label
      };
    };

    const fileType = buildField('fileType', this.data.filterOptions.fileTypes);
    const category = buildField('category', this.data.filterOptions.categories);
    const refCollection = buildField('refCollection', this.data.filterOptions.refCollections);

    this.setData({
      filterForm: {
        fileType: fileType.value,
        category: category.value,
        refCollection: refCollection.value
      },
      filterIndex: {
        fileType: fileType.index,
        category: category.index,
        refCollection: refCollection.index
      },
      filterLabels: {
        fileType: fileType.label,
        category: category.label,
        refCollection: refCollection.label
      }
    });
  },

  buildFilterStateSnapshot() {
    return {
      scope: this.data.scope,
      keyword: String(this.data.keyword || ''),
      showAdvancedFilters: !!this.data.showAdvancedFilters,
      filterForm: Object.assign({}, this.data.filterForm)
    };
  },

  persistFilterState() {
    try {
      wx.setStorageSync(MEDIA_ASSET_FILTER_STORAGE_KEY, this.buildFilterStateSnapshot());
    } catch (error) {}
  },

  restoreFilterState() {
    const defaults = this.getDefaultFilterState();
    try {
      const saved = wx.getStorageSync(MEDIA_ASSET_FILTER_STORAGE_KEY);
      if (!saved || typeof saved !== 'object') {
        this.setData(defaults);
        return defaults;
      }
      const nextScope = SCOPE_META[saved.scope] ? saved.scope : defaults.scope;
      const keyword = String(saved.keyword || '');
      const showAdvancedFilters = !!saved.showAdvancedFilters;
      const filterForm = Object.assign({}, defaults.filterForm, saved.filterForm || {});
      this.setData({
        keyword,
        scope: nextScope,
        showAdvancedFilters
      });
      this.syncFilterUiFromForm(filterForm);
      return {
        scope: nextScope,
        keyword,
        showAdvancedFilters,
        filterForm
      };
    } catch (error) {
      this.setData(defaults);
      return defaults;
    }
  },

  async onScopeTap(e) {
    const scope = String((e.currentTarget.dataset.scope) || 'total');
    if (scope === this.data.scope) return;
    this.setScope(scope);
    this.persistFilterState();
    await this.loadList(true);
  },

  formatMediaAsset(item) {
    const fileId = String((item && item.fileID) || '');
    const category = String((item && item.category) || '');
    return Object.assign({}, item, {
      shortFileID: fileId ? `${fileId.slice(0, 28)}...` : '',
      categoryText: this.getCategoryText(category),
      fileTypeText: this.getFileTypeText(item && item.fileType),
      refText: this.getRefText(item),
      lastAccessText: this.formatTimestamp(item && item.lastAccessAt),
      idleText: this.getIdleText(item && item.idleDays),
      statusText: item && item.isPermanent ? '永久保留' : '可清理',
      canDelete: this.canDeleteAsset(item),
      deleting: String(this.data.deletingAssetId || '') === String(item && item.id ? item.id : '')
    });
  },

  getCategoryText(category) {
    const map = {
      campus_cover: '校园封面',
      campus_content_image: '正文图片',
      campus_content_video: '正文视频',
      campus_image: '校园图片',
      campus_video: '校园视频',
      teacher_invite_qr: '招生二维码',
      user_avatar: '用户头像'
    };
    return map[category] || (category || '未知资源');
  },

  getFileTypeText(fileType) {
    if (fileType === 'video') return '视频';
    if (fileType === 'image') return '图片';
    return fileType || '未知';
  },

  getRefText(item) {
    const refCollection = String((item && item.refCollection) || '').trim();
    const refId = String((item && item.refId) || '').trim();
    if (!refCollection && !refId) return '未标记';
    return refId ? `${refCollection}/${refId}` : refCollection;
  },

  formatTimestamp(timestamp) {
    const value = Number(timestamp || 0);
    if (!value) return '未记录';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '未记录';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  getIdleText(idleDays) {
    if (idleDays === null || idleDays === undefined || idleDays === '') return '未知';
    if (Number(idleDays) <= 0) return '今天访问';
    return `${idleDays}天未访问`;
  },

  canDeleteAsset(item) {
    if (!item) return false;
    if (item.isPermanent === true) return false;
    if (String(item.status || '') === 'deleted') return false;
    return !!String(item.fileID || '').trim();
  },

  onKeywordInput(e) {
    this.setData({
      keyword: String((e.detail && e.detail.value) || '')
    });
  },

  onToggleAdvancedFilters() {
    this.setData({
      showAdvancedFilters: !this.data.showAdvancedFilters
    });
    this.persistFilterState();
  },

  onFilterChange(e) {
    const field = String((e.currentTarget.dataset.field) || '').trim();
    const index = Number((e.detail && e.detail.value) || 0);
    if (!field) return;
    const optionMap = {
      fileType: this.data.filterOptions.fileTypes,
      category: this.data.filterOptions.categories,
      refCollection: this.data.filterOptions.refCollections
    };
    const options = optionMap[field] || [];
    const option = options[index] || options[0] || { value: 'all', label: '全部' };
    this.setData({
      [`filterForm.${field}`]: option.value,
      [`filterIndex.${field}`]: index,
      [`filterLabels.${field}`]: option.label
    });
    this.persistFilterState();
    this.loadList(true);
  },

  onSearchTap() {
    this.persistFilterState();
    this.loadList(true);
  },

  onResetFilters() {
    const defaults = this.getDefaultFilterState();
    this.setData({
      keyword: defaults.keyword,
      showAdvancedFilters: defaults.showAdvancedFilters
    });
    this.syncFilterUiFromForm(defaults.filterForm);
    this.persistFilterState();
    this.loadList(true);
  },

  async loadList(reset) {
    if (this.data.loading || this.data.loadingMore) return;
    const nextPage = reset ? 1 : this.data.page + 1;
    this.setData(reset ? { loading: true } : { loadingMore: true });

    try {
      const result = await request('campus.listMediaAssets', {
        scope: this.data.scope,
        page: nextPage,
        limit: this.data.limit,
        keyword: String(this.data.keyword || '').trim(),
        fileType: this.data.filterForm.fileType,
        category: this.data.filterForm.category,
        refCollection: this.data.filterForm.refCollection
      }, { showLoading: false, showError: false });
      const rows = Array.isArray(result && result.list) ? result.list.map((item) => this.formatMediaAsset(item)) : [];
      this.setData({
        summary: Object.assign({}, this.data.summary, (result && result.summary) || {}),
        total: Number((result && result.total) || 0),
        page: nextPage,
        hasMore: !!(result && result.hasMore),
        list: reset ? rows : this.data.list.concat(rows)
      });
      this.persistFilterState();
    } catch (error) {
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    } finally {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  async onRefreshTap() {
    await this.loadList(true);
    feedback.showToast({ title: '媒体台账已刷新', icon: 'none' });
  },

  async onCleanupTap() {
    if (this.data.cleaning) return;
    const expiredCount = Number((this.data.summary && this.data.summary.expiredCount) || 0);
    if (expiredCount <= 0) {
      feedback.showToast({ title: '当前没有可清理的过期图片', icon: 'none' });
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认清理',
        content: `将清理 ${expiredCount} 个超过 ${this.data.summary.expireDays || 30} 天未访问的非头像图片，是否继续？`,
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) return;

    this.setData({ cleaning: true });
    try {
      const result = await request('campus.cleanupMediaAssets', {}, {
        showLoading: true,
        loadingText: '清理中...',
        showError: false
      });
      await this.loadList(true);
      feedback.showToast({
        title: `已清理 ${(result && result.deletedCount) || 0} 个资源`,
        icon: 'success'
      });
    } catch (error) {
      feedback.showToast({ title: errorDict.text('ACTION_FAILED'), icon: 'none' });
    } finally {
      this.setData({ cleaning: false });
    }
  },

  onViewDetail(e) {
    const id = String((e.currentTarget.dataset.id) || '').trim();
    if (!id) {
      feedback.showToast({ title: '媒体标识缺失', icon: 'none' });
      return;
    }
    const current = (this.data.list || []).find((item) => String(item.id || '') === id);
    if (current) {
      try {
        wx.setStorageSync(`${MEDIA_ASSET_DETAIL_CACHE_PREFIX}${id}`, current);
      } catch (error) {}
    }
    wx.navigateTo({
      url: `/pages/admin/media-asset-detail/media-asset-detail?id=${encodeURIComponent(id)}`
    });
  },

  async onDeleteAsset(e) {
    const id = String((e.currentTarget.dataset.id) || '').trim();
    const canDelete = String((e.currentTarget.dataset.candelete) || '') === 'true';
    if (this.data.deletingAssetId) {
      feedback.showToast({ title: '请等待当前删除完成', icon: 'none' });
      return;
    }
    if (!id || !canDelete) {
      feedback.showToast({ title: '当前资源不可删除', icon: 'none' });
      return;
    }

    const current = (this.data.list || []).find((item) => String(item.id || '') === id);
    const title = current && current.categoryText ? current.categoryText : '当前媒体';
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: `将彻底删除“${title}”及其云存储文件，删除后不可恢复，是否继续？`,
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) return;

    try {
      this.setData({ deletingAssetId: id });
      await request('campus.removeMediaAsset', {
        id
      }, {
        showLoading: true,
        loadingText: '删除中...',
        showError: false
      });
      try {
        wx.removeStorageSync(`${MEDIA_ASSET_DETAIL_CACHE_PREFIX}${id}`);
      } catch (error) {}
      feedback.showToast({
        title: '已删除',
        icon: 'success'
      });
      await this.loadList(true);
    } catch (error) {
      feedback.showToast({
        title: errorDict.text('DELETE_FAILED'),
        icon: 'none'
      });
    } finally {
      this.setData({ deletingAssetId: '' });
    }
  },

  onReachBottom() {
    if (!this.data.hasMore) return;
    this.loadList(false);
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onKeywordConfirm() {
    this.persistFilterState();
    this.loadList(true);
  }
});
