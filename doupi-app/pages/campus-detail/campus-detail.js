/**
 * @fileoverview 校园详情展示页
 */

const common = require('../../utils/common');
const { request } = require('../../utils/request');
const displayDict = require('../../utils/displayDict');
const auth = require('../../utils/auth');

Page({
  data: {
    campusInfo: {},
    formattedContent: '',
    hasContent: false,
    loading: false,
    coverImageFileId: '',
    canBookAppointment: true
  },

  onLoad() {
    this.syncAppointmentPermission();
    this.applyPrefetchedCampusSnapshot();
    this.loadCampusInfo();
  },

  onShow() {
    this.syncAppointmentPermission();
  },

  syncAppointmentPermission() {
    this.setData({
      canBookAppointment: !auth.isAppointmentRestrictedRole()
    });
  },

  async loadCampusInfo() {
    const shouldShowLoading = !this.hasPrefetchedContent();
    if (shouldShowLoading) {
      this.setData({ loading: true });
    }

    try {
      const result = await request('campus.detail', {});
      const campusInfo = result.campus || {};
      const coverImageFileId = String(campusInfo.coverImage || '').trim();
      const coverImage = this.resolveCoverImage(campusInfo, coverImageFileId);
      const formattedContent = this.prepareContent(campusInfo.contentDisplayHtml || '');
      const hasContent = this.checkHasContent(formattedContent);

      this.setData({
        campusInfo: {
          title: campusInfo.title || campusInfo.name || '校园介绍',
          summary: campusInfo.summary || campusInfo.intro || displayDict.text('NO_CAMPUS_INTRO'),
          coverImage
        },
        coverImageFileId,
        formattedContent,
        hasContent,
        loading: false
      });
    } catch (err) {
      console.error('加载校园信息失败:', err);
      if (this.hasPrefetchedContent()) {
        this.setData({ loading: false });
        return;
      }
      this.setData({
        campusInfo: {
          title: '校园介绍',
          summary: displayDict.text('NO_CAMPUS_INTRO'),
          coverImage: ''
        },
        coverImageFileId: '',
        formattedContent: '',
        hasContent: false,
        loading: false
      });
    }
  },

  handleAppointment() {
    wx.showModal({
      title: '请扫码预约',
      content: '预约只能通过招生老师二维码进入，请扫码后再填写预约信息。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  previewCover() {
    const url = this.data.campusInfo && this.data.campusInfo.coverImage;
    if (!url) return;
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  prepareContent(content) {
    const normalized = common.formatRichText(content || '', {
      unescape: true,
      sanitize: false
    });
    return this.normalizeMediaNodes(normalized);
  },

  normalizeMediaNodes(html) {
    const source = String(html || '');

    return source
      .replace(/<img\b([^>]*)>/gi, (match, attrs) => {
        const cleanedAttrs = String(attrs || '')
          .replace(/\swidth=["'][^"']*["']/gi, '')
          .replace(/\sheight=["'][^"']*["']/gi, '')
          .replace(/\sstyle=["'][^"']*["']/gi, '');
        return `<img${cleanedAttrs} style="width: 100%; max-width: 100%; height: auto; display: block; margin: 24rpx 0; box-sizing: border-box;" />`;
      })
      .replace(/<video\b([^>]*)>/gi, (match, attrs) => {
        const cleanedAttrs = String(attrs || '')
          .replace(/\swidth=["'][^"']*["']/gi, '')
          .replace(/\sheight=["'][^"']*["']/gi, '')
          .replace(/\sstyle=["'][^"']*["']/gi, '');
        return `<video${cleanedAttrs} style="width: 100%; max-width: 100%; display: block; margin: 24rpx 0; box-sizing: border-box;" controls>`;
      });
  },

  checkHasContent(html) {
    const source = String(html || '').trim();
    if (!source) return false;
    const plainText = common.stripHtmlTags(source).replace(/&nbsp;/g, '').trim();
    return Boolean(plainText || /<(img|video)\b/i.test(source));
  },

  applyPrefetchedCampusSnapshot() {
    let snapshot = null;
    try {
      const eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
      if (eventChannel && eventChannel.on) {
        eventChannel.on('campusSnapshot', (payload) => {
          snapshot = payload && payload.campus ? payload.campus : null;
          if (snapshot) {
            this.applyCampusSnapshot(snapshot);
          }
        });
      }
    } catch (_) {}
  },

  applyCampusSnapshot(snapshot) {
    const campus = snapshot || {};
    const title = String(campus.title || '').trim() || '校园介绍';
    const summary = String(campus.summary || '').trim() || displayDict.text('NO_CAMPUS_INTRO');
    const coverImage = String(campus.coverImage || '').trim();
    const coverImageFileId = String(campus.coverImageFileId || '').trim();

    this.setData({
      campusInfo: {
        title,
        summary,
        coverImage
      },
      coverImageFileId,
      loading: false
    });
  },

  hasPrefetchedContent() {
    const campusInfo = this.data.campusInfo || {};
    return Boolean(
      String(campusInfo.title || '').trim() ||
      String(campusInfo.summary || '').trim() ||
      String(campusInfo.coverImage || '').trim()
    );
  },

  resolveCoverImage(campusInfo, coverImageFileId) {
    const nextCoverImage = String((campusInfo && campusInfo.coverImageUrl) || '').trim();
    const currentCampusInfo = this.data.campusInfo || {};
    const currentCoverImage = String(currentCampusInfo.coverImage || '').trim();
    const currentCoverImageFileId = String(this.data.coverImageFileId || '').trim();

    if (
      currentCoverImage &&
      currentCoverImageFileId &&
      coverImageFileId &&
      currentCoverImageFileId === coverImageFileId
    ) {
      return currentCoverImage;
    }

    return nextCoverImage;
  }
});
