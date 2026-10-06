/**
 * @fileoverview 统一管理后台入口页
 */

const feedback = require('../../../utils/feedback');
const { request, requestWithCheck } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { getAllowedMenuIdsAsync } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');
const validationDict = require('../../../utils/validationDict');

const RECRUITMENT_ITEMS = [
  { id: 'stats', title: '数据统计', icon: 'chart', color: '#722ED1' },
  { id: 'export-data', title: '数据导出', icon: 'download', color: '#722ED1' },
  { id: 'global-appointments', title: '预约管理', icon: 'calendar', color: '#FF8C00' },
  { id: 'verify-appointment', title: '核销预约', icon: 'scan', color: '#3088F4' },
  { id: 'teacher-qrcode', title: '招生二维码', icon: 'scan', color: '#FA8C16' },
];

const BINDING_ITEMS = [
  { id: 'bound-teachers', title: '已绑定老师', icon: 'usergroup', color: '#13C2C2' },
  { id: 'binding-audit', title: '绑定审核', icon: 'check-circle', color: '#13C2C2' },
];

const SYSTEM_ITEMS = [
  { id: 'campus', title: '校园管理', icon: 'home', color: '#FAAD14' },
  { id: 'banners', title: '轮播图管理', icon: 'image', color: '#3088F4' },
  { id: 'media-assets', title: '媒体台账', icon: 'image', color: '#3088F4' },
  { id: 'logs', title: '操作日志', icon: 'chart-bar', color: '#3088F4' },
  { id: 'system-logs', title: '系统日志', icon: 'file-1', color: '#2F54EB' },
  { id: 'users', title: '用户管理', icon: 'usergroup', color: '#52C41A' },
  { id: 'global-config', title: '综合配置', icon: 'setting', color: '#36CFC9' },
  { id: 'content-config', title: '内容配置', icon: 'edit', color: '#36CFC9' },
  { id: 'about-config', title: '关于我们', icon: 'home', color: '#13C2C2' },
  { id: 'role-management', title: '角色权限', icon: 'secured', color: '#722ED1' },
  { id: 'permission', title: '权限控制', icon: 'lock-on', color: '#EB2F96' },
];

Page({
  data: {
    moduleSections: [],
    bindStatusLoaded: false,
    isTeacherBound: true,
    bindingStats: {
      teacherCount: '0',
      pendingCount: '0',
    },
    systemStats: {
      total: '0',
      todayCount: '0',
    },
    recruitmentStats: {
      monthAppointmentCount: '0',
      verifyRate: '0%',
    },
  },

  async onLoad() {
    if (!auth.hasAdminAccess()) {
      feedback.showToast({ title: displayDict.text('NO_PERMISSION_ACCESS'), icon: 'none' });
      return;
    }
    await this.refreshDashboard();
  },

  handleBackToPortal() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: () => {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    });
  },

  async onShow() {
    this.showPermissionRefreshTipIfNeeded();
    if (!auth.hasAdminAccess()) return;
    await this.refreshDashboard();
  },

  async refreshDashboard() {
    const dashboardData = await this.loadDashboardHome();
    const role = auth.getUserRole();
    const [recruitmentIds, systemIds] = await Promise.all([
      getAllowedMenuIdsAsync(role, 'recruitment'),
      getAllowedMenuIdsAsync(role, 'systemConfig'),
    ]);
    const menuState = {
      recruitmentSet: new Set(recruitmentIds || []),
      systemSet: new Set(systemIds || []),
      teacherNeedsBinding: role === 3 && this.data.bindStatusLoaded && !this.data.isTeacherBound,
    };

    this.setData({
      moduleSections: this.buildModuleSections(menuState),
    });
    if (!dashboardData) {
      await this.loadModuleStats(menuState);
    }
  },

  async loadDashboardHome() {
    try {
      const [bindPayload, recruitPayload, logPayload] = await Promise.all([
        request('dashboard.snapshotBindings', {}, { showLoading: false, showError: false, cache: false }).catch(() => ({})),
        request('dashboard.snapshotRecruitment', {}, { showLoading: false, showError: false, cache: false }).catch(() => ({})),
        request('dashboard.snapshotLogs', {}, { showLoading: false, showError: false, cache: false }).catch(() => ({})),
      ]);
      const data = {
        bindStatus: bindPayload.bindStatus,
        bindingStats: bindPayload.bindingStats || { teacherCount: 0, pendingCount: 0 },
        recruitmentStats: recruitPayload.recruitmentStats || { monthAppointmentCount: 0, verifyRate: 0 },
        systemStats: logPayload.systemStats || { total: 0, todayCount: 0, createCount: 0, verifyCount: 0 },
      };
      this.setData({
        bindStatusLoaded: true,
        isTeacherBound: !!(data.bindStatus ? data.bindStatus.isBound : true),
        bindingStats: {
          teacherCount: String(Number(data.bindingStats.teacherCount || 0)),
          pendingCount: String(Number(data.bindingStats.pendingCount || 0)),
        },
        systemStats: {
          total: String(Number(data.systemStats.total || 0)),
          todayCount: String(Number(data.systemStats.todayCount || 0)),
        },
        recruitmentStats: {
          monthAppointmentCount: String(Number(data.recruitmentStats.monthAppointmentCount || 0)),
          verifyRate: `${(Number(data.recruitmentStats.verifyRate || 0) * 100).toFixed(0)}%`,
        },
      });
      return data;
    } catch (err) {
      this.setData({ bindStatusLoaded: true, isTeacherBound: true });
      return null;
    }
  },

  buildModuleSections(menuState) {
    const sections = [];
    const role = auth.getUserRole();
    const { recruitmentSet, systemSet, teacherNeedsBinding } = menuState;

    const recruitmentItems = teacherNeedsBinding
      ? []
      : RECRUITMENT_ITEMS.filter((item) => recruitmentSet.has(item.id));
    if (recruitmentItems.length > 0) {
      sections.push({
        id: 'recruitment-module',
        title: '招生管理',
        desc: '预约、核销、二维码、统计与导出能力按角色显示',
        stats: [
          { label: '本月预约', value: this.data.recruitmentStats.monthAppointmentCount || '0' },
          { label: '核销率', value: this.data.recruitmentStats.verifyRate || '0%' },
        ],
        items: recruitmentItems,
      });
    }

    const bindingItems = [];
    if (role === 3 && teacherNeedsBinding) {
      bindingItems.push({
        id: 'bind-director',
        title: '去绑定招生主任',
        icon: 'user-add',
        color: '#3088F4',
      });
    }
    BINDING_ITEMS.forEach((item) => {
      if (recruitmentSet.has(item.id)) {
        bindingItems.push(item);
      }
    });
    if (bindingItems.length > 0) {
      sections.push({
        id: 'binding-module',
        title: '绑定管理',
        desc: teacherNeedsBinding
          ? '先绑定招生主任，绑定审核通过后再使用预约与核销功能'
          : '查看已绑定老师与绑定相关状态',
        stats: role === 3 && teacherNeedsBinding
          ? []
          : [
              { label: '已绑定', value: this.data.bindingStats.teacherCount || '0' },
              { label: '待处理', value: this.data.bindingStats.pendingCount || '0', isAlert: Number(this.data.bindingStats.pendingCount || 0) > 0 },
            ],
        items: bindingItems,
      });
    }

    const systemItems = SYSTEM_ITEMS.filter((item) => systemSet.has(item.id));
    if (systemItems.length > 0) {
      sections.push({
        id: 'system-module',
        title: '系统配置',
        desc: '校园内容、日志与系统配置能力按角色显示',
        stats: [
          { label: '总日志', value: this.data.systemStats.total || '0' },
          { label: '今日新增', value: this.data.systemStats.todayCount || '0' },
        ],
        items: systemItems,
      });
    }

    return sections;
  },

  async loadModuleStats(menuState) {
    const tasks = [];
    if (menuState.recruitmentSet.has('bound-teachers')) {
      tasks.push(this.fetchBindingStats());
    }
    if (!menuState.teacherNeedsBinding && menuState.recruitmentSet.size > 0) {
      tasks.push(this.fetchRecruitmentStats());
    }
    if (menuState.systemSet.size > 0) {
      tasks.push(this.fetchSystemStats());
    }
    if (tasks.length === 0) return;
    await Promise.all(tasks);
    this.setData({
      moduleSections: this.buildModuleSections(menuState),
    });
  },

  async fetchBindingStats() {
    try {
      const data = await request('binding.summary', {}, { showLoading: false, showError: false });
      if (data && typeof data === 'object') {
        this.setData({
          bindingStats: {
            teacherCount: String(Number(data.teacherCount || 0)),
            pendingCount: String(Number(data.pendingCount || 0)),
          },
        });
      }
    } catch (err) {}
  },

  async fetchSystemStats() {
    try {
      const data = await request('log.summary', {}, { showLoading: false, showError: false });
      if (data && typeof data === 'object') {
        this.setData({
          systemStats: {
            total: String(Number(data.total || 0)),
            todayCount: String(Number(data.todayCount || 0)),
          },
        });
      }
    } catch (err) {}
  },

  async fetchRecruitmentStats() {
    try {
      const data = await request('appointment.getDirectorSummary', {}, { showLoading: false, showError: false });
      if (data && typeof data === 'object') {
        this.setData({
          recruitmentStats: {
            monthAppointmentCount: String(Number(data.monthAppointmentCount || data.monthBookingCount || 0)),
            verifyRate: `${(Number(data.verifyRate || 0) * 100).toFixed(0)}%`,
          },
        });
      }
    } catch (err) {}
  },

  handleModuleTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (id === 'verify-appointment') {
      this.onVerifyBookingScan();
      return;
    }

    const routeMap = {
      'bind-director': '/pages/admin/bind-director/bind-director',
      'bound-teachers': '/pages/admin/bound-teachers/bound-teachers',
      'global-appointments': '/pages/admin/global-appointments/global-appointments',
      stats: '/pages/admin/stats/stats',
      'export-data': '/pages/admin/data-audit/data-audit',
      campus: '/pages/admin/campus/campus',
      banners: '/pages/admin/banners/banners',
      'media-assets': '/pages/admin/media-assets/media-assets',
      'teacher-qrcode': '/pages/admin/teacher-qrcode/teacher-qrcode',
      'global-config': '/pages/admin/global-config/global-config',
      'content-config': '/pages/admin/content-config/content-config',
      'about-config': '/pages/admin/about-config/about-config',
      users: '/pages/admin/users/users',
      'role-management': '/pages/admin/role-management/role-management',
      permission: '/pages/admin/permission/permission',
      logs: '/pages/admin/logs/logs',
      'system-logs': '/pages/admin/logs/logs?type=system',
      'binding-audit': '/pages/admin/binding-audit/binding-audit',
    };
    const url = routeMap[id];
    if (!url) {
      feedback.showToast({ title: displayDict.text('FEATURE_IN_DEVELOPMENT'), icon: 'none' });
      return;
    }
    wx.navigateTo({ url });
  },

  showPermissionRefreshTipIfNeeded() {
    const ts = wx.getStorageSync('adminPermissionUpdatedAt');
    if (!ts) return;
    wx.removeStorageSync('adminPermissionUpdatedAt');
    feedback.showToast({
      title: displayDict.text('PERMISSION_UPDATED_MENU_REFRESHED'),
      icon: 'none',
    });
  },

  onVerifyBookingScan() {
    if (this._verifying) return;
    this._verifying = true;

    auth.requireLoginWithPrompt('/pages/admin/dashboard/dashboard').then((ok) => {
      if (!ok) {
        this._verifying = false;
        return;
      }

      feedback.showToast({ title: displayDict.text('SCAN_PREPARING'), icon: 'none', duration: 800 });
      wx.scanCode({
        onlyFromCamera: true,
        success: async (res) => {
          const verifyCodePayload = String(res && res.result ? res.result : '').trim();
          if (!verifyCodePayload) {
            feedback.showToast({ title: validationDict.text('QRCODE_EMPTY'), icon: 'none' });
            return;
          }
          try {
            wx.showLoading({ title: '核销中...', mask: true });
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
        },
      });
    });
  },
});
