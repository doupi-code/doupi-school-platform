const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal, getDataExportPaneCaps } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');
const validationDict = require('../../../utils/validationDict');

const EXPORT_TYPE_CATALOG = [
  {
    id: 'appointment',
    name: '预约数据',
    desc: '保留预约基础字段，并补充当前在读学校、老师、备注、关键时间',
    icon: 'calendar',
    color: '#3088F4',
    bgColor: '#E8F2FE',
    fields: ['\u9884\u7ea6\u53f7', '\u5b66\u751f\u59d3\u540d', '\u8eab\u4efd\u8bc1\u53f7', '\u5bb6\u957f\u59d3\u540d', '\u624b\u673a\u53f7', '\u9884\u7ea6\u65e5\u671f', '\u9884\u7ea6\u65f6\u6bb5', '\u72b6\u6001', '\u6821\u56ed\u540d\u79f0', '\u5f53\u524d\u5728\u8bfb\u5b66\u6821', '\u9884\u7ea6\u8001\u5e08', '\u62db\u751f\u4e3b\u4efb\u6635\u79f0', '\u5b9e\u9645\u63a5\u5f85\u8001\u5e08', '\u5907\u6ce8', '\u521b\u5efa\u65f6\u95f4', '\u66f4\u65b0\u65f6\u95f4', '\u53d6\u6d88\u65f6\u95f4', '\u6838\u9500\u65f6\u95f4']
  },
  {
    id: 'user',
    name: '用户数据',
    desc: '导出用户ID、昵称、手机号、角色、状态',
    icon: 'usergroup',
    color: '#36CFC9',
    bgColor: '#E6FFFB',
    fields: ['\u7528\u6237ID', '\u6635\u79f0', '\u624b\u673a\u53f7', '\u89d2\u8272', '\u72b6\u6001']
  },
  {
    id: 'log',
    name: '操作日志',
    desc: '导出日志ID、操作人ID与昵称、角色、类型、内容、相关老师、备注、时间',
    icon: 'edit-1',
    color: '#FFA940',
    bgColor: '#FFF7E6',
    fields: ['\u65e5\u5fd7ID', '\u9884\u7ea6\u53f7', '\u64cd\u4f5c\u4ebaID', '\u64cd\u4f5c\u4eba\u6635\u79f0', '\u64cd\u4f5c\u4eba\u89d2\u8272', '\u64cd\u4f5c\u7c7b\u578b', '\u64cd\u4f5c\u5185\u5bb9', '\u76f8\u5173\u8001\u5e08ID', '\u76f8\u5173\u8001\u5e08\u6635\u79f0', '\u5907\u6ce8', '\u64cd\u4f5c\u65f6\u95f4']
  },
  {
    id: 'stats',
    name: '统计报表',
    desc: '导出总览、来源分析、日志类型分布、按日期/老师/操作人的详细统计',
    icon: 'chart-bar',
    color: '#722ED1',
    bgColor: '#F9F0FF',
    fields: ['\u5206\u7c7b', '\u6307\u6807', '\u7ef4\u5ea6', '\u6570\u503c', '\u8bf4\u660e']
  }
];

Page({
  data: {
    startDate: '',
    endDate: '',
    showStartDatePicker: false,
    showEndDatePicker: false,

    visibleExportTypes: [],
    exportCaps: null,

    exportHistory: [],
    exporting: false,
    exportingType: '',

    overviewData: {
      totalAppointments: null,
      totalUsers: null,
      totalLogs: null,
      todayNewAppointments: null
    },
    overviewShow: {
      appointments: false,
      users: false,
      logs: false,
      today: false
    }
  },

  async onLoad() {
    if (!auth.requireRoles([1, 2, 3, 5])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'export-data');
    if (!granted) return;
    this.initDateRange();
    await this.applyExportCaps();
    this.loadOverview();
    this.loadExportHistory();
  },

  onPullDownRefresh() {
    this.applyExportCaps()
      .then(() => {
        this.loadOverview();
        this.loadExportHistory();
      })
      .catch(() => {})
      .then(() => {
        wx.stopPullDownRefresh();
      });
  },

  async applyExportCaps() {
    const caps = await getDataExportPaneCaps();
    const visible = EXPORT_TYPE_CATALOG.filter((item) => caps[item.id]);
    this.setData({
      exportCaps: caps,
      visibleExportTypes: visible,
      overviewShow: {
        appointments: !!caps.overviewAppointments,
        users: !!caps.overviewUsers,
        logs: !!caps.overviewLogs,
        today: !!caps.overviewToday
      }
    });
  },

  initDateRange() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    this.setData({
      startDate: formatDate(thirtyDaysAgo),
      endDate: formatDate(nextMonthEnd)
    });
  },

  async loadOverview() {
    try {
      const data = await request('config.getOverview', {
        start_time: this.data.startDate ? `${this.data.startDate} 00:00:00` : undefined,
        end_time: this.data.endDate ? `${this.data.endDate} 23:59:59` : undefined
      });
      if (data) {
        this.setData({ overviewData: data || {} });
      }
    } catch (err) {
      console.error('加载概览失败:', err);
    }
  },

  historyTypeAllowed(type) {
    const caps = this.data.exportCaps;
    if (!caps || !type) return true;
    return caps[type] === true;
  },

  async loadExportHistory() {
    try {
      const data = await request('config.getExportHistory');
      if (data) {
        const filtered = (data || []).filter((row) => this.historyTypeAllowed(row.type));
        this.setData({ exportHistory: filtered });
      }
    } catch (err) {
      console.error('加载导出历史失败:', err);
    }
  },

  onStartDateChange(e) {
    this.setData(
      {
        startDate: e.detail.value
      },
      () => {
        this.loadOverview();
      }
    );
  },

  onEndDateChange(e) {
    this.setData(
      {
        endDate: e.detail.value
      },
      () => {
        this.loadOverview();
      }
    );
  },

  canActOnExportType(type) {
    const caps = this.data.exportCaps;
    return caps && caps[type] === true;
  },

  onPreviewFields(e) {
    const type = e.currentTarget.dataset.type;
    if (!this.canActOnExportType(type)) return;
    const typeInfo = EXPORT_TYPE_CATALOG.find((item) => item.id === type);
    if (!typeInfo) return;

    wx.showModal({
      title: `${typeInfo.name}导出字段`,
      content: (typeInfo.fields || []).join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onExport(e) {
    const type = e.currentTarget.dataset.type;
    if (!this.canActOnExportType(type)) return;
    const typeInfo = EXPORT_TYPE_CATALOG.find((item) => item.id === type);

    if (!typeInfo) return;

    if (!this.data.startDate || !this.data.endDate) {
      feedback.showToast({ title: validationDict.text('DATE_RANGE_REQUIRED'), icon: 'none' });
      return;
    }

    if (new Date(this.data.startDate) > new Date(this.data.endDate)) {
      feedback.showToast({ title: validationDict.text('DATE_RANGE_START_AFTER_END'), icon: 'none' });
      return;
    }

    const dayDiff = Math.ceil(
      (new Date(this.data.endDate) - new Date(this.data.startDate)) / (24 * 60 * 60 * 1000)
    );

    if (dayDiff > 365) {
      feedback.showToast({ title: validationDict.text('DATE_RANGE_EXCEED_YEAR'), icon: 'none' });
      return;
    }

    wx.showModal({
      title: `导出${typeInfo.name}`,
      content: `确定要导出 ${this.data.startDate} 至 ${this.data.endDate} 的${typeInfo.name}吗？`,
      confirmText: '开始导出',
      success: (res) => {
        if (res.confirm) {
          this.doExport(type);
        }
      }
    });
  },

  _openExportedFile(fileUrl, fileID) {
    const openUrl = (url) => {
      wx.showModal({
        title: '导出成功',
        content: '文件已生成，是否立即查看？',
        confirmText: '查看文件',
        success: (modalRes) => {
          if (!modalRes.confirm) return;
          wx.downloadFile({
            url: url,
            success: (downloadRes) => {
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                fail: () => {
                  feedback.showToast({ title: errorDict.text('OPEN_FILE_FAILED'), icon: 'none' });
                }
              });
            },
            fail: () => {
              feedback.showToast({ title: errorDict.text('DOWNLOAD_FAILED'), icon: 'none' });
            }
          });
        }
      });
    };
    if (fileUrl) {
      openUrl(fileUrl);
      return;
    }
    const fid = fileID && String(fileID).trim();
    if (fid && wx.cloud && typeof wx.cloud.getTempFileURL === 'function') {
      wx.cloud.getTempFileURL({
        fileList: [fid],
        success: (r) => {
          const u = r.fileList && r.fileList[0] && r.fileList[0].tempFileURL;
          if (u) openUrl(u);
          else {
            feedback.showToast({
              title: '已生成文件但未拿到下载地址，请在小程序后台配置云存储 downloadFile 合法域名',
              icon: 'none'
            });
          }
        },
        fail: () => {
          feedback.showToast({
            title: '已生成文件但未拿到下载地址，请在小程序后台配置云存储 downloadFile 合法域名',
            icon: 'none'
          });
        }
      });
      return;
    }
    feedback.showToast({ title: displayDict.text('EXPORT_SUCCESS'), icon: 'success' });
  },

  async doExport(type) {
    if (!this.canActOnExportType(type)) return;
    if (this.data.exporting) return;

    this.setData({
      exporting: true,
      exportingType: type
    });

    try {
      let action = '';

      switch (type) {
        case 'appointment':
          action = 'appointment.exportGlobal';
          break;
        case 'user':
          action = 'user.export';
          break;
        case 'log':
          action = 'log.export';
          break;
        case 'stats':
          action = 'log.exportStats';
          break;
      }

      const res = await request(action, {
        start_time: `${this.data.startDate} 00:00:00`,
        end_time: `${this.data.endDate} 23:59:59`
      });

      if (res) {
        this._openExportedFile(res.file_url, res.fileID);
        this.loadExportHistory();
      }
    } catch (err) {
      console.error('导出失败:', err);
      // request 已 toast
    } finally {
      this.setData({
        exporting: false,
        exportingType: ''
      });
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  goBack() {
    wx.navigateBack();
  }
});
