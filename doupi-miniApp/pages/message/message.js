/**
 * @fileoverview 消息中心 - 简化版（v2.0 对接真实API）
 */

const feedback = require('../../utils/feedback');
const { request } = require('../../utils/request');
const auth = require('../../utils/auth');
const displayDict = require('../../utils/displayDict');

Page({
  data: {
    notifications: [],
    todayNotifications: [],
    earlierNotifications: [],
    hasUnread: false,
    hasMore: false,
    loading: false,
    loadingMore: false,
    isEmpty: false,
    page: 1,
    pageSize: 20,
    total: 0,
    displayText: {
      noMessages: displayDict.text('NO_MESSAGES'),
      emptyNoNotificationDesc: displayDict.text('EMPTY_NO_NOTIFICATION_DESC'),
      loadMorePullUp: displayDict.text('LOAD_MORE_PULL_UP'),
      noMoreReached: displayDict.text('NO_MORE_REACHED'),
      labelToday: displayDict.text('LABEL_TODAY'),
      labelEarlier: displayDict.text('LABEL_EARLIER'),
      btnMarkAllRead: displayDict.text('BTN_MARK_ALL_READ'),
      labelSystemNotice: displayDict.text('LABEL_SYSTEM_NOTICE')
    }
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      auth.requireLoginWithPrompt('/pages/message/message');
      return;
    }
    this.loadNotifications();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.reloadNotifications();
  },

  _formatTime(input) {
    if (!input) return '';
    const d = (input instanceof Date) ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },

  _isToday(dateInput) {
    if (!dateInput) return false;
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  },

  _getRelatedModule(msg) {
    return String(
      (msg && (msg.relatedModule || msg.related_module || msg.module || msg.related_module_name)) || ''
    ).trim();
  },

  _getCurrentUserId() {
    try {
      const user = auth.getUserInfo && auth.getUserInfo();
      // 统一以数据库 users._id 映射到前端缓存字段 userInfo.userId 为准
      const userId = user && user.userId ? String(user.userId).trim() : '';
      return userId;
    } catch (_) {
      return '';
    }
  },

  _rebuildGroups(notifications) {
    const todayNotifications = [];
    const earlierNotifications = [];
    let hasUnread = false;

    (notifications || []).forEach((n, idx) => {
      const item = Object.assign({ index: idx }, n);
      if (!item.read) hasUnread = true;
      if (this._isToday(item._sendTimeRaw)) {
        todayNotifications.push(item);
      } else {
        earlierNotifications.push(item);
      }
    });

    return { todayNotifications, earlierNotifications, hasUnread };
  },

  async _tryNavigateByMessage(item) {
    const relatedModule = this._getRelatedModule(item);
    if (relatedModule === 'binding_audit') {
      wx.navigateTo({ url: '/pages/admin/binding-audit/binding-audit' });
      return true;
    }
    if (relatedModule === 'binding_apply') {
      wx.navigateTo({ url: '/pages/admin/bind-director/bind-director' });
      return true;
    }
    const appointmentId = item && item.relatedAppointmentId ? String(item.relatedAppointmentId).trim() : '';
    const currentUserId = this._getCurrentUserId();
    const relatedAppointmentUserId = item && item.relatedAppointmentUserId ? String(item.relatedAppointmentUserId).trim() : '';
    if (appointmentId) {
      // 严格模式：后端必须返回 relatedAppointmentUserId，用于分流家长端/管理端详情
      if (!appointmentId || !currentUserId || !relatedAppointmentUserId) return false;
      const isSelf = String(currentUserId) === String(relatedAppointmentUserId);
      const useAdminDetail = !isSelf;
      wx.navigateTo({
        url: useAdminDetail
          ? `/pages/admin/appointment-detail/appointment-detail?id=${encodeURIComponent(appointmentId)}`
          : `/pages/appointment-detail/appointment-detail?id=${encodeURIComponent(appointmentId)}`
      });
      return true;
    }
    return false;
  },

  normalizeNotification(msg) {
    const messageId = msg.messageId || msg._id || msg.id || '';
    const messageType = Number(msg.messageType || 1);
    const sendTime = msg.sendTime || msg.send_time || msg.createdAt || msg.createTime || '';
    const readStatus = Number(msg.readStatus);
    return {
      id: messageId,
      type: messageType === 2 ? 'appointment' : 'system',
      tag: messageType === 2 ? '预约提醒' : '',
      title: msg.title || displayDict.text('LABEL_SYSTEM_NOTICE'),
      content: msg.contentPreview || msg.content || '',
      time: this._formatTime(sendTime) || this._formatTime(new Date()),
      read: readStatus === 1,
      messageType,
      relatedModule: this._getRelatedModule(msg),
      relatedAppointmentId: msg.relatedAppointmentId || '',
      relatedAppointmentUserId: msg.relatedAppointmentUserId || '',
      _sendTimeRaw: sendTime
    };
  },

  async reloadNotifications() {
    return this.loadNotifications(true);
  },

  async loadNotifications(reset) {
    const shouldReset = reset !== false;
    if ((shouldReset && this.data.loading) || (!shouldReset && (this.data.loading || this.data.loadingMore || !this.data.hasMore))) return;

    const nextPage = shouldReset ? 1 : this.data.page + 1;
    this.setData(shouldReset ? { loading: true } : { loadingMore: true });

    try {
      const result = await request('message.list', { page: nextPage, pageSize: this.data.pageSize }, { showLoading: shouldReset, cache: false });
      const pageNotifications = (result.list || []).map((msg) => this.normalizeNotification(msg));
      const notifications = shouldReset ? pageNotifications : this.data.notifications.concat(pageNotifications);

      const groups = this._rebuildGroups(notifications);

      this.setData({
        notifications,
        todayNotifications: groups.todayNotifications,
        earlierNotifications: groups.earlierNotifications,
        hasUnread: groups.hasUnread,
        hasMore: !!result.hasMore,
        isEmpty: notifications.length === 0,
        loading: false,
        loadingMore: false,
        page: nextPage,
        total: Number(result.total || notifications.length || 0)
      });

    } catch (err) {
      console.error('加载通知列表失败:', err);
      this.setData(shouldReset ? {
        loading: false,
        loadingMore: false,
        notifications: [],
        todayNotifications: [],
        earlierNotifications: [],
        hasUnread: false,
        hasMore: false,
        total: 0
      } : {
        loading: false,
        loadingMore: false
      });
    }
  },

  async handleTapNotification(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    // 标记为已读
    try {
      await request('message.read', { messageId: id });
      
      // 更新本地状态
      const notifications = this.data.notifications.map(item => (item.id === id ? { ...item, read: true } : item));
      const groups = this._rebuildGroups(notifications);
      this.setData({
        notifications,
        todayNotifications: groups.todayNotifications,
        earlierNotifications: groups.earlierNotifications,
        hasUnread: groups.hasUnread
      });
    } catch (err) {
      console.error('标记已读失败:', err);
    }

    const clicked = this.data.notifications.find((n) => n.id === id);
    if (clicked) {
      const jumped = await this._tryNavigateByMessage(clicked);
      if (!jumped) {
        feedback.showToast({ title: '暂无对应详情', icon: 'none' });
      }
    }
  },

  async markAllRead() {
    if (this.data.loading) return;
    if (!this.data.hasUnread) {
      feedback.showToast({ title: '暂无未读消息', icon: 'none' });
      return;
    }
    try {
      await request('message.markAllRead', {}, { showLoading: true });
      const notifications = this.data.notifications.map((item) => ({ ...item, read: true }));
      const groups = this._rebuildGroups(notifications);
      this.setData({
        notifications,
        todayNotifications: groups.todayNotifications,
        earlierNotifications: groups.earlierNotifications,
        hasUnread: false
      });
      feedback.showToast({ title: '已全部标记为已读', icon: 'success' });
    } catch (err) {
      console.error('全部标记已读失败:', err);
      // request 已 toast
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading || this.data.loadingMore) return;
    this.loadNotifications(false);
  },

  onReachBottom() {
    this.loadMore();
  }
});
