/**
 * @fileoverview 首页
 * 功能：
 * 1. 从 campus.summary 获取首页校园摘要数据
 * 2. 使用小程序原生组件 + TDesign icon/loading
 * 3. 展示学校信息和快速入口
 * 4. 扫码功能（预留）
 */

const { request } = require('../../utils/request');
const feedback = require('../../utils/feedback');
const { syncCustomTabBarSelected } = require('../../utils/tabBarSync');
const auth = require('../../utils/auth');
const displayDict = require('../../utils/displayDict');
const errorDict = require('../../utils/errorDict');
const validationDict = require('../../utils/validationDict');
const common = require('../../utils/common');

Page({
  data: {
    loading: true,
    currentSlide: 0,
    banners: [],
    campusCard: {
      name: '华襄复读中心',
      description: '专业师资团队，卓越教学成果，全日制寄宿管理，全封闭式管理，全方位的教学服务',
      image: ''
    },
    campusInfo: null,
    userRole: 0
  },

  onLoad() {},

  onShow() {
    syncCustomTabBarSelected();
    this.setData({ userRole: auth.getUserRole() || 0 });
    this.loadPageData();
  },

  /**
   * 加载页面数据 - 调用 campus.summary
   */
  async loadPageData() {
    this.setData({ loading: true });

    try {
      const [campusRes, bannerRes] = await Promise.all([
        request('campus.summary', {}, { showLoading: false, showError: false }),
        request('config.listBanner', {}, { showLoading: false, showError: false }).catch(() => ({ list: [] }))
      ]);

      const { campus } = campusRes || {};
      const bannerList = (bannerRes && bannerRes.list) || [];
      const banners = Array.isArray(bannerList)
        ? bannerList.map((item) => (item && item.imageUrl) || '').filter(Boolean)
        : [];
      const title = (campus.title || campus.name || '').trim();
      const summary = (campus.summary || campus.intro || '').trim();
      const description = common.stripHtmlTags(summary).trim();
      const campusCard = {
        name: title || '华襄中学',
        description: description || '专业师资团队，卓越教学成果',
        image: String(campus.coverImageUrl || '').trim()
      };

      this.setData({
        banners,
        campusCard,
        campusInfo: campus,
        loading: false
      });

      console.log('[Index] 数据加载成功:', {
        rawBannerCount: bannerList.length,
        rawBannerUrlCount: banners.length,
        bannersCount: banners.length
      });

    } catch (err) {
      console.error('[Index] 加载校园信息失败:', err);
      this.setData({ loading: false });

      // 使用默认数据兜底（避免白屏）
      this.setData({
        banners: [],
        campusCard: {
          name: '华襄中学',
          description: '专业师资团队，卓越教学成果',
          image: ''
        },
        loading: false
      });

      feedback.showError(errorDict.text('LOAD_FAILED_RETRY'));
      throw err;
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadPageData().then(() => {
      wx.stopPullDownRefresh();
      feedback.showSuccess('刷新成功');
    }).catch((err) => {
      wx.stopPullDownRefresh();
      const msg = (err && err.errMsg) || errorDict.text('LOAD_FAILED_RETRY');
      feedback.showError(msg);
    });
  },

  handleSwiperChange(e) {
    this.setData({
      currentSlide: e.detail.current
    });
  },

  goToBooking() {
    wx.showModal({
      title: '请扫码预约',
      content: '预约只能通过招生老师二维码进入，请扫码后再填写预约信息。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 跳转校园详情页 - 携带校园信息
   */
  goToCampusDetail() {
    if (!this.data.campusInfo) {
      feedback.showError(displayDict.text('NO_CAMPUS_INFO'));
      return;
    }

    feedback.showLoading('加载中...', false);

    wx.navigateTo({
      url: `/pages/campus-detail/campus-detail`,
      success: (res) => {
        if (res && res.eventChannel) {
          res.eventChannel.emit('campusSnapshot', {
            campus: this.buildCampusDetailSnapshot()
          });
        }
        feedback.hideLoading();
      },
      fail: () => {
        feedback.hideLoading();
        feedback.showError(errorDict.text('ACTION_FAILED'));
      }
    });
  },

  buildCampusDetailSnapshot() {
    const campus = this.data.campusInfo || {};
    return {
      title: String(campus.title || campus.name || '').trim(),
      summary: String(campus.summary || campus.intro || '').trim(),
      coverImage: String(campus.coverImageUrl || '').trim(),
      coverImageFileId: String(campus.coverImage || '').trim()
    };
  },

  goToBookingList() {
    auth.navigateIfLoggedIn('/pages/appointment-list/appointment-list');
  },

  goToTeacherQrcode() {
    // 非家长入口：招生二维码
    auth.navigateIfLoggedIn('/pages/admin/teacher-qrcode/teacher-qrcode');
  },

  onVerifyBookingScan() {
    // 非家长入口：核销预约（复用我的页扫码核销逻辑）
    if (this._verifying) return;
    this._verifying = true;

    auth.requireLoginWithPrompt('/pages/index/index').then((ok) => {
      if (!ok) {
        this._verifying = false;
        return;
      }

      feedback.showToast({ title: displayDict.text('SCAN_PREPARING'), icon: 'none', duration: 800 });
      wx.scanCode({
        onlyFromCamera: false,
        success: async (res) => {
          const verifyCodePayload = String(res && res.result ? res.result : '').trim();
          if (!verifyCodePayload) {
            feedback.showToast({ title: validationDict.text('QRCODE_EMPTY'), icon: 'none' });
            return;
          }
          try {
            wx.showLoading({ title: '核销中...', mask: true });
            const { requestWithCheck } = require('../../utils/request');
            await requestWithCheck('teacher.verifyAppointment', { verifyCodePayload }, { showLoading: false });
            wx.hideLoading();
            feedback.showToast({ title: displayDict.text('VERIFY_SUCCESS'), icon: 'success' });
            if (wx.vibrateShort) {
              wx.vibrateShort({ type: 'medium' });
            }
          } catch (err) {
            wx.hideLoading();
            // requestWithCheck 已 toast
          }
        },
        fail: (err) => {
          if (!err || String(err.errMsg || '').indexOf('cancel') === -1) {
            feedback.showToast({ title: errorDict.text('SCAN_FAILED_RETRY'), icon: 'none' });
          }
        },
        complete: () => {
          setTimeout(() => {
            this._verifying = false;
          }, 800);
        }
      });
    });
  },

  goToNotification() {
    wx.navigateTo({
      url: '/pages/message/message'
    });
  },

  handleScanCode() {
    if (this._scanning) return;
    this._scanning = true;

    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        console.log('[Index] 扫码结果：', res);
        feedback.showSuccess('扫码成功');

        this.handleScanResult(res);
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          feedback.showError(errorDict.text('SCAN_FAILED_RETRY'));
        }
      },
      complete: () => {
        setTimeout(() => {
          this._scanning = false;
        }, 1000);
      }
    });
  },

  /**
   * 处理扫码结果
   * 根据业务需求处理不同类型的二维码：
   * - 老师邀请码 → 跳转预约页并携带inviteKey
   * - 绑定会话ID → 跳转绑定确认页
   * - 预约核销码 → 调用核销接口
   */
  handleScanResult(scanRes) {
    const parsed = this._parseInviteKeyFromScan(scanRes);
    const inviteKey = parsed.inviteKey || '';
    const sourceHint = parsed.sourceHint || '';

    console.log('[Index] Scan parsed:', { inviteKey, sourceHint });

    // 判断是否为老师邀请码格式（8位字符）
    if (inviteKey && inviteKey.length === 8 && /^[A-Za-z0-9]+$/.test(inviteKey)) {
      if (auth.isAppointmentRestrictedRole()) {
        feedback.showWarning('招生端账号不能发起预约');
        return;
      }
      wx.showModal({
        title: displayDict.text('MODAL_SCAN_INVITE_TITLE'),
        content: displayDict.text('MODAL_SCAN_INVITE_CONTENT'),
        success: (res) => {
          if (res.confirm) {
            try { wx.setStorageSync('pendingInviteKey', inviteKey); } catch (_) {}
            wx.navigateTo({
              url: `/pages/appointment/appointment?inviteKey=${encodeURIComponent(inviteKey)}`
            });
          }
        }
      });
      return;
    }

    // 其他类型的二维码可在此扩展处理逻辑
    feedback.showToast({
      title: errorDict.text('UNRECOGNIZED_QRCODE'),
      icon: 'none'
    });
  },

  _parseInviteKeyFromScan(scanRes) {
    // 兼容：旧逻辑传入 string
    if (typeof scanRes === 'string') {
      const raw = String(scanRes || '').trim();
      const inviteKey = this._extractInviteKeyFromText(raw);
      return { inviteKey, sourceHint: inviteKey ? 'string' : '' };
    }

    const scanType = String((scanRes && scanRes.scanType) || '').trim();
    const resultText = String((scanRes && scanRes.result) || '').trim();
    const path = String((scanRes && scanRes.path) || '').trim();

    // 1) 普通二维码：直接返回 8 位邀请码
    const inviteKeyFromResult = this._extractInviteKeyFromText(resultText);
    if (inviteKeyFromResult) return { inviteKey: inviteKeyFromResult, sourceHint: 'result' };

    // 2) 小程序码：scanType=WX_CODE，优先从 path 的 query/scene 取
    if (scanType === 'WX_CODE' && path) {
      const inviteKeyFromPath = this._extractInviteKeyFromPath(path);
      if (inviteKeyFromPath) return { inviteKey: inviteKeyFromPath, sourceHint: 'wx_code_path' };
    }

    // 3) 兜底：某些机型仍会把 path 填在 path 字段，但 scanType 不固定
    if (path) {
      const inviteKeyFromPath2 = this._extractInviteKeyFromPath(path);
      if (inviteKeyFromPath2) return { inviteKey: inviteKeyFromPath2, sourceHint: 'path' };
    }

    return { inviteKey: '', sourceHint: '' };
  },

  _extractInviteKeyFromText(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    // 8 位字母数字邀请码
    if (raw.length === 8 && /^[A-Za-z0-9]+$/.test(raw)) return raw;
    // 如果扫到的是分享链接/路径，尝试解析 inviteKey/scene/teacher
    const inviteFromPath = this._extractInviteKeyFromPath(raw);
    if (inviteFromPath) return inviteFromPath;
    return '';
  },

  _extractInviteKeyFromPath(inputPath) {
    const p = String(inputPath || '').trim();
    if (!p) return '';

    // 统一截取 query 部分
    const qIndex = p.indexOf('?');
    const query = qIndex >= 0 ? p.slice(qIndex + 1) : '';
    if (!query) return '';

    const params = {};
    query.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (!k) return;
      try {
        params[decodeURIComponent(k)] = decodeURIComponent(String(v || ''));
      } catch (_) {
        params[k] = String(v || '');
      }
    });

    const candidates = [
      params.inviteKey,
      params.scene,
      params.teacher,
    ].filter(Boolean);

    const first = String(candidates[0] || '').trim();
    if (first.length === 8 && /^[A-Za-z0-9]+$/.test(first)) return first;
    return '';
  },

  onUnload() {
    this._scanning = false;
  }
});
