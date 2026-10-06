const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const MEDIA_ASSET_DETAIL_CACHE_PREFIX = 'mediaAssetDetailCache:';

Page({
  data: {
    id: '',
    loading: true,
    deleting: false,
    asset: null,
    previewUrl: '',
    errorText: '',
    fallbackMode: false
  },
  async onLoad(options) {
    if (!auth.requireRoles([1, 2])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'media-assets');
    if (!granted) return;

    const id = String((options && options.id) || '').trim();
    if (!id) {
      this.setData({
        loading: false,
        errorText: '缺少媒体标识'
      });
      return;
    }

    this.setData({ id });
    await this.loadDetail();
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errorText: '',
      fallbackMode: false
    });

    try {
      const result = await request('campus.getMediaAssetDetail', {
        id: this.data.id
      }, { showLoading: false, showError: false });
      const asset = result && result.asset ? this.formatAsset(result.asset) : null;
      if (!asset) {
        this.setData({
          loading: false,
          errorText: '媒体记录不存在'
        });
        return;
      }

      const previewUrl = String(asset.previewUrl || '').trim();
      this.setData({
        asset,
        previewUrl,
        loading: false,
        fallbackMode: false
      });
      wx.setNavigationBarTitle({
        title: asset.categoryText || '媒体详情'
      });
    } catch (error) {
      const snapshot = this.readCachedAssetSnapshot();
      if (snapshot) {
        await this.applyFallbackAsset(snapshot);
        return;
      }
      this.setData({
        loading: false,
        errorText: '加载媒体详情失败'
      });
    }
  },

  readCachedAssetSnapshot() {
    try {
      const cache = wx.getStorageSync(`${MEDIA_ASSET_DETAIL_CACHE_PREFIX}${this.data.id}`);
      if (!cache || typeof cache !== 'object') return null;
      return cache;
    } catch (error) {
      return null;
    }
  },

  async applyFallbackAsset(snapshot) {
    const asset = this.formatAsset(snapshot);
    const previewUrl = String(asset.previewUrl || '').trim();
    this.setData({
      asset,
      previewUrl,
      loading: false,
      fallbackMode: true,
      errorText: ''
    });
    wx.setNavigationBarTitle({
      title: asset.categoryText || '媒体详情'
    });
  },

  formatAsset(item) {
    const fileId = String((item && item.fileID) || '');
    const category = String((item && item.category) || '');
    const sourceMeta = this.getSourceMeta(item);
    return Object.assign({}, item, {
      categoryText: this.getCategoryText(category),
      fileTypeText: this.getFileTypeText(item && item.fileType),
      refText: this.getRefText(item),
      lastAccessText: this.formatTimestamp(item && item.lastAccessAt),
      createdAtText: this.formatTimestamp(item && item.createdAt),
      updatedAtText: this.formatTimestamp(item && item.updatedAt),
      deletedAtText: this.formatTimestamp(item && item.deletedAt),
      idleText: this.getIdleText(item && item.idleDays),
      statusText: this.getStatusText(item),
      shortFileID: fileId ? `${fileId.slice(0, 48)}...` : '',
      sourceMeta,
      canDelete: this.canDeleteAsset(item)
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

  getStatusText(item) {
    if (!item) return '未知';
    if (item.status === 'deleted') return '已删除';
    return item.isPermanent ? '永久保留' : '可清理';
  },

  canDeleteAsset(item) {
    if (!item) return false;
    if (item.status === 'deleted') return false;
    if (item.isPermanent === true) return false;
    return !!String(item.fileID || '').trim();
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

  getSourceMeta(item) {
    const refCollection = String((item && item.refCollection) || '').trim();
    const category = String((item && item.category) || '').trim();
    const role = Number(auth.getUserRole() || 0);

    if (refCollection === 'campus') {
      return {
        available: true,
        text: '查看校园内容',
        hint: '跳转到校园管理页',
        url: '/pages/admin/campus/campus'
      };
    }

    if (refCollection === 'invite_keys' || category === 'teacher_invite_qr') {
      return {
        available: true,
        text: '查看招生二维码',
        hint: '跳转到招生二维码页',
        url: '/pages/admin/teacher-qrcode/teacher-qrcode'
      };
    }

    if (refCollection === 'users' && category === 'user_avatar') {
      if (role === 1) {
        return {
          available: true,
          text: '查看用户管理',
          hint: '跳转到用户管理页',
          url: '/pages/admin/users/users'
        };
      }
      return {
        available: false,
        text: '',
        hint: '当前账号没有用户管理入口'
      };
    }

    return {
      available: false,
      text: '',
      hint: '当前记录没有可跳转的来源页面'
    };
  },

  onPreviewImage() {
    if (!this.data.previewUrl) return;
    wx.previewImage({
      current: this.data.previewUrl,
      urls: [this.data.previewUrl]
    });
  },

  onCopyFileId() {
    const fileId = this.data.asset && this.data.asset.fileID ? String(this.data.asset.fileID) : '';
    if (!fileId) {
      feedback.showToast({ title: '没有可复制的文件标识', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: fileId,
      success: () => {
        feedback.showToast({ title: 'fileID 已复制', icon: 'success' });
      }
    });
  },

  onOpenSource() {
    const sourceMeta = this.data.asset && this.data.asset.sourceMeta ? this.data.asset.sourceMeta : null;
    if (!sourceMeta || !sourceMeta.available || !sourceMeta.url) {
      feedback.showToast({
        title: (sourceMeta && sourceMeta.hint) || '当前没有可跳转来源',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: sourceMeta.url
    });
  },

  async onRemoveAsset() {
    const asset = this.data.asset;
    if (!this.canDeleteAsset(asset) || this.data.deleting) {
      if (asset && asset.isPermanent) {
        feedback.showToast({ title: '永久保留资源不支持删除', icon: 'none' });
      }
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '将删除该媒体记录并清理云存储文件，删除后不可恢复，是否继续？',
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) return;

    this.setData({ deleting: true });
    try {
      await request('campus.removeMediaAsset', {
        id: asset.id
      }, {
        showLoading: true,
        loadingText: '删除中...'
      });
      wx.setStorageSync('mediaAssetsNeedsRefresh', 1);
      try {
        wx.removeStorageSync(`${MEDIA_ASSET_DETAIL_CACHE_PREFIX}${asset.id}`);
      } catch (storageError) {}
      feedback.showToast({
        title: '资源已删除',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    } catch (error) {
      console.error('删除媒体资源失败:', error);
      // request 已 toast
    } finally {
      this.setData({ deleting: false });
    }
  },

  onRetry() {
    if (this.data.loading) return;
    this.loadDetail();
  }
});
