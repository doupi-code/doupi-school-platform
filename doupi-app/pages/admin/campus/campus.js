const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    formData: {
      title: '',
      summary: '',
      content: ''
    },
    coverImage: '',
    coverPreviewUrl: '',
    loading: false,
    saving: false,
    uploadingType: '',
    editorReady: false,
    displayText: {
      titleBasicInfo: displayDict.text('TITLE_BASIC_INFO'),
      labelCampusTitle: '标题',
      placeholderCampusTitle: '请输入校园介绍标题',
      labelCampusSummary: '简介',
      placeholderCampusSummary: '请输入首页展示简介',
      titleCampusCover: '封面',
      coverHint: '首页校园介绍卡片和详情页头图使用该封面',
      titleCampusContent: '正文',
      contentHint: '支持文字、图片和视频，建议优先上传压缩后的媒体文件',
      placeholderCampusContent: '请输入校园正文内容',
      uploading: displayDict.text('UPLOADING'),
      saving: displayDict.text('SAVING'),
      btnAddCover: '上传封面',
      btnReplaceCover: '更换封面',
      btnDeleteCover: '删除封面',
      btnInsertImage: '插入图片',
      btnInsertVideo: '插入视频',
      btnBold: '加粗',
      btnItalic: '斜体',
      btnUnderline: '下划线',
      btnList: '列表',
      btnDivider: '分割线',
      btnReset: displayDict.text('BTN_RESET'),
      btnSaveInfo: displayDict.text('BTN_SAVE_INFO'),
      noCover: '暂无封面',
    }
  },

  editorCtx: null,
  mediaUrlMap: {},
  cloudFileCache: {},

  async onLoad() {
    if (!auth.requireRoles([1, 2])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'campus');
    if (!granted) return;
    await this.loadCampusInfo();
  },

  async loadCampusInfo() {
    this.setData({ loading: true });

    try {
      const result = await request('campus.adminDetail', {}, { showLoading: false, showError: false });
      const info = (result && result.campus) || {};
      const title = info.title || info.name || info.campusName || '';
      const summary = info.summary || info.intro || '';
      const content = info.content || info.contentHtml || '';
      const coverImage = info.coverImage || info.cover || '';
      const coverPreviewUrl = String(info.coverImageUrl || '').trim();
      const editorHtml = String(info.contentDisplayHtml || content || '');
      this.setServerMediaUrlMap((info && info.fileUrlMap) || {});

      this.setData({
        formData: {
          title,
          summary,
          content: editorHtml
        },
        coverImage,
        coverPreviewUrl
      }, () => {
        this.syncEditorContent();
      });
    } catch (error) {
      console.error('加载校园信息失败:', error);
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onEditorReady() {
    wx.createSelectorQuery()
      .select('#campus-editor')
      .context((res) => {
        if (!res || !res.context) return;
        this.editorCtx = res.context;
        this.setData({ editorReady: true }, () => {
          this.syncEditorContent();
        });
      })
      .exec();
  },

  onEditorInput(e) {
    const html = (e.detail && e.detail.html) || '';
    this.setData({
      'formData.content': html
    });
  },

  syncEditorContent() {
    if (!this.editorCtx || !this.data.editorReady) return;
    this.editorCtx.setContents({
      html: this.data.formData.content || ''
    });
  },

  async persistEditorContent() {
    if (!this.editorCtx) return;
    await new Promise((resolve) => {
      this.editorCtx.getContents({
        success: (res) => {
          this.setData({
            'formData.content': (res && res.html) || ''
          }, resolve);
        },
        fail: () => resolve()
      });
    });
  },

  async chooseCover() {
    if (this.data.uploadingType) return;
    this.setData({ uploadingType: 'cover' });

    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });
      const tempFile = chooseRes.tempFiles && chooseRes.tempFiles[0];
      if (!tempFile) return;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `campus/cover_${Date.now()}.jpg`,
        filePath: tempFile.tempFilePath
      });
      await this.registerUploadedMedia(uploadRes.fileID, 'campus_cover', 'image');
      this.setData({
        coverImage: uploadRes.fileID,
        coverPreviewUrl: tempFile.tempFilePath
      });
      feedback.showToast({ title: displayDict.text('UPLOAD_SUCCESS'), icon: 'success' });
    } catch (error) {
      console.error('上传封面失败:', error);
      feedback.showToast({ title: errorDict.text('UPLOAD_FAILED'), icon: 'none' });
    } finally {
      this.setData({ uploadingType: '' });
    }
  },

  deleteCover() {
    wx.showModal({
      title: '删除封面',
      content: '确定删除当前封面吗？',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          coverImage: '',
          coverPreviewUrl: ''
        });
      }
    });
  },

  async previewCover() {
    const current = this.data.coverPreviewUrl
      || this.cloudFileCache[String(this.data.coverImage || '').trim()]
      || (String(this.data.coverImage || '').indexOf('cloud://') === 0 ? '' : String(this.data.coverImage || '').trim());
    if (!current) return;
    wx.previewImage({
      current,
      urls: [current]
    });
  },

  formatRichText(e) {
    const type = e.currentTarget.dataset.type;
    if (!this.editorCtx || !type) return;
    if (type === 'insertDivider') {
      this.editorCtx.insertDivider();
      return;
    }
    this.editorCtx.format(type);
  },

  async insertImage() {
    if (!this.editorCtx || this.data.uploadingType) return;
    this.setData({ uploadingType: 'content-image' });

    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });
      const tempFile = chooseRes.tempFiles && chooseRes.tempFiles[0];
      if (!tempFile) return;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `campus/content_image_${Date.now()}.jpg`,
        filePath: tempFile.tempFilePath
      });
      await this.registerUploadedMedia(uploadRes.fileID, 'campus_content_image', 'image');
      this.mediaUrlMap[tempFile.tempFilePath] = uploadRes.fileID;
      await this.appendHtmlToEditor(
        `<p><br></p><img src="${tempFile.tempFilePath}" style="max-width: 100%; height: auto; display: block;" /><p><br></p>`
      );
      feedback.showToast({ title: displayDict.text('UPLOAD_SUCCESS'), icon: 'success' });
    } catch (error) {
      console.error('正文图片上传失败:', error);
      feedback.showToast({ title: errorDict.text('UPLOAD_FAILED'), icon: 'none' });
    } finally {
      this.setData({ uploadingType: '' });
    }
  },

  async insertVideo() {
    if (!this.editorCtx || this.data.uploadingType) return;
    this.setData({ uploadingType: 'content-video' });

    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
        maxDuration: 120
      });
      const tempFile = chooseRes.tempFiles && chooseRes.tempFiles[0];
      if (!tempFile) return;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `campus/content_video_${Date.now()}.mp4`,
        filePath: tempFile.tempFilePath
      });
      await this.registerUploadedMedia(uploadRes.fileID, 'campus_content_video', 'video');
      this.mediaUrlMap[tempFile.tempFilePath] = uploadRes.fileID;
      await this.appendHtmlToEditor(
        `<p><br></p><video src="${tempFile.tempFilePath}" controls></video><p><br></p>`
      );
      feedback.showToast({ title: displayDict.text('UPLOAD_SUCCESS'), icon: 'success' });
    } catch (error) {
      console.error('正文视频上传失败:', error);
      feedback.showToast({ title: errorDict.text('UPLOAD_FAILED'), icon: 'none' });
    } finally {
      this.setData({ uploadingType: '' });
    }
  },

  async appendHtmlToEditor(fragment) {
    if (!this.editorCtx || !fragment) return;
    const currentHtml = await new Promise((resolve) => {
      this.editorCtx.getContents({
        success: (res) => resolve((res && res.html) || ''),
        fail: () => resolve(this.data.formData.content || '')
      });
    });
    const nextHtml = `${currentHtml || ''}${fragment}`;
    this.setData({
      'formData.content': nextHtml
    }, () => {
      this.editorCtx.setContents({ html: nextHtml });
    });
  },

  async registerUploadedMedia(fileID, category, fileType) {
    if (!fileID) return;
    try {
      await request('campus.registerMediaUpload', {
        fileID,
        category,
        fileType
      }, {
        showLoading: false,
        showError: false
      });
    } catch (err) {
      console.warn('登记媒体台账失败:', err);
      feedback.showToast({ title: errorDict.text('ACTION_FAILED'), icon: 'none' });
    }
  },

  validateForm() {
    const formData = this.data.formData || {};
    const contentHtml = String(formData.content || '');
    const plainText = contentHtml.replace(/<[^>]+>/g, '').trim();
    const hasMedia = /<(img|video)\b/i.test(contentHtml);

    if (!String(formData.title || '').trim()) {
      feedback.showToast({ title: '请输入标题', icon: 'none' });
      return false;
    }
    if (!String(formData.summary || '').trim()) {
      feedback.showToast({ title: '请输入简介', icon: 'none' });
      return false;
    }
    if (!String(this.data.coverImage || '').trim()) {
      feedback.showToast({ title: '请上传封面', icon: 'none' });
      return false;
    }
    if (!plainText && !hasMedia) {
      feedback.showToast({ title: '请输入正文', icon: 'none' });
      return false;
    }
    return true;
  },

  async saveCampusInfo() {
    await this.persistEditorContent();
    if (!this.validateForm()) return;
    if (this.data.saving) return;

    this.setData({ saving: true });

    try {
      const content = this.convertEditorHtmlToStorage(this.data.formData.content);
      await request('campus.update', {
        title: this.data.formData.title.trim(),
        summary: this.data.formData.summary.trim(),
        coverImage: this.data.coverImage,
        content,
        contentHtml: content
      });

      feedback.showToast({
        title: displayDict.text('SAVE_SUCCESS'),
        icon: 'success'
      });
    } catch (error) {
      console.error('保存失败:', error);
      // request 已 toast
    } finally {
      this.setData({ saving: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  resetForm() {
    wx.showModal({
      title: displayDict.text('MODAL_RESET_CONFIRM_TITLE'),
      content: displayDict.text('MODAL_RESET_CAMPUS_CONTENT'),
      success: (res) => {
        if (res.confirm) {
          this.loadCampusInfo();
        }
      }
    });
  },

  setServerMediaUrlMap(fileUrlMap) {
    const map = fileUrlMap && typeof fileUrlMap === 'object' ? fileUrlMap : {};
    Object.keys(map).forEach((fileId) => {
      const url = String(map[fileId] || '').trim();
      if (!fileId || !url) return;
      this.mediaUrlMap[url] = fileId;
      this.cloudFileCache[fileId] = url;
    });
  },

  convertEditorHtmlToStorage(html) {
    let output = String(html || '');
    Object.keys(this.mediaUrlMap).forEach((tempUrl) => {
      const fileId = this.mediaUrlMap[tempUrl];
      if (!fileId) return;
      const escapedTempUrl = tempUrl
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      output = output.replace(new RegExp(this.escapeRegExp(tempUrl), 'g'), fileId);
      output = output.replace(new RegExp(this.escapeRegExp(escapedTempUrl), 'g'), fileId);
    });
    return output;
  },

  escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});
