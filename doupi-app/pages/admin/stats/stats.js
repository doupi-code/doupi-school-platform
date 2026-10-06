/**
 * @fileoverview 数据统计页（v2.0 对接真实API）
 */

const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

const OVERVIEW_CARD_META = [
  { icon: 'calendar', color: '#3088F4', bgColor: '#E8F2FE' },
  { icon: 'time', color: '#FF8C00', bgColor: '#FFF7E6' },
  { icon: 'check-circle', color: '#52C41A', bgColor: '#F6FFED' },
  { icon: 'chart', color: '#722ED1', bgColor: '#F9F0FF' }
];

function decorateOverviewCards(cards) {
  return (cards || []).map((item, index) => Object.assign({}, OVERVIEW_CARD_META[index] || OVERVIEW_CARD_META[0], item || {}));
}

Page({
  data: {
    timeTabs: ['本周', '本月', '本季度', '本年'],
    currentTab: 0,
    overviewCards: decorateOverviewCards([
      { title: '总预约量', value: '0', change: '', trend: '', color: '#3088F4', bgColor: '#E8F2FE' },
      { title: '待核销', value: '0', change: '', trend: '', color: '#FF8C00', bgColor: '#FFF7E6' },
      { title: '已核销', value: '0', change: '', trend: '', color: '#52C41A', bgColor: '#F6FFED' },
      { title: '核销率', value: '0%', change: '', trend: '', color: '#722ED1', bgColor: '#F9F0FF' }
    ]),

    teacherStats: [],

    sourceData: [],
    statusData: [],
    rankingList: [],
    bookingRankingList: [],
    receptionRankingList: [],

    loading: false
  },

  async onLoad() {
    if (!auth.requireRoles([1, 2, 5])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'recruitment', 'stats');
    if (!granted) return;
    this.loadStatsData();
  },

  onPullDownRefresh() {
    this.loadStatsData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onTimeTab(e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    this.loadStatsData();
  },

  async loadStatsData() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    const timeRangeMap = ['week', 'month', 'quarter', 'year'];
    const timeRange = timeRangeMap[this.data.currentTab] || 'week';

    try {
      const [result, rankingResult] = await Promise.all([
        request('stats.dashboard', { timeRange }),
        request('stats.teacherRanking', { timeRange })
      ]);

      // 更新概览卡片
      if (result.overviewCards) {
        this.setData({ overviewCards: decorateOverviewCards(result.overviewCards) });
      }
      // 更新老师统计
      if (result.teacherStats) {
        this.setData({ teacherStats: result.teacherStats });
      }

      // 更新来源分布
      if (result.sourceData) {
        this.setData({
          sourceData: (result.sourceData || []).map((item) => {
            const percentValue = Number(item.percent || 0);
            return {
              ...item,
              percentText: `${percentValue.toFixed(1)}%`,
              percentWidth: `${Math.max(0, Math.min(percentValue, 100))}%`
            };
          })
        });
      }

      // 更新状态分布
      if (result.statusData) {
        this.setData({ statusData: result.statusData });
      }

      this.setData({
        rankingList: (rankingResult && rankingResult.list ? rankingResult.list : []).slice(0, 5),
        bookingRankingList: [],
        receptionRankingList: []
      });
    } catch (err) {
      console.error('获取统计数据失败:', err);
      // request 已 toast

      // 网络失败时回落为数值型默认值，不使用占位符
      this.setData({
        overviewCards: decorateOverviewCards([
          { title: '总预约量', value: '0', change: '', trend: '', color: '#3088F4', bgColor: '#E8F2FE' },
          { title: '待核销', value: '0', change: '', trend: '', color: '#FF8C00', bgColor: '#FFF7E6' },
          { title: '已核销', value: '0', change: '', trend: '', color: '#52C41A', bgColor: '#F6FFED' },
          { title: '核销率', value: '0%', change: '', trend: '', color: '#722ED1', bgColor: '#F9F0FF' }
        ]),
        teacherStats: [],
        sourceData: [],
        statusData: [],
        rankingList: [],
        bookingRankingList: [],
        receptionRankingList: []
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goToTeacherOverview() {
    wx.navigateTo({
      url: '/pages/admin/bound-teachers/bound-teachers'
    });
  },

  getCurrentTimeRangeKey() {
    const timeRangeMap = ['week', 'month', 'quarter', 'year'];
    return timeRangeMap[this.data.currentTab] || 'week';
  },

  goToSourceDetail(e) {
    const source = e.currentTarget.dataset.source;
    if (!source) return;
    wx.navigateTo({
      url: `/pages/admin/global-appointments/global-appointments?source=${encodeURIComponent(source)}&timeRange=${this.getCurrentTimeRangeKey()}`
    });
  },

  goToStatusDetail(e) {
    const status = e.currentTarget.dataset.status;
    if (!status) return;
    wx.navigateTo({
      url: `/pages/admin/global-appointments/global-appointments?status=${encodeURIComponent(status)}&timeRange=${this.getCurrentTimeRangeKey()}`
    });
  },

  goToSourceDetailMenu() {
    wx.showActionSheet({
      itemList: ['扫码预约', '手动预约'],
      success: ({ tapIndex }) => {
        const source = tapIndex === 0 ? 'scan' : 'manual';
        wx.navigateTo({
          url: `/pages/admin/global-appointments/global-appointments?source=${source}&timeRange=${this.getCurrentTimeRangeKey()}`
        });
      }
    });
  },

  goToStatusDetailMenu() {
    wx.showActionSheet({
      itemList: ['待核销', '已核销', '已取消'],
      success: ({ tapIndex }) => {
        const statusList = ['pending', 'verified', 'cancelled'];
        wx.navigateTo({
          url: `/pages/admin/global-appointments/global-appointments?status=${statusList[tapIndex]}&timeRange=${this.getCurrentTimeRangeKey()}`
        });
      }
    });
  },

  goToRankingDetail() {
    wx.navigateTo({
      url: `/pages/admin/teacher-ranking/teacher-ranking?timeRange=${this.getCurrentTimeRangeKey()}`
    });
  },

  goToTeacherRankItem(e) {
    wx.navigateTo({
      url: `/pages/admin/teacher-ranking/teacher-ranking?timeRange=${this.getCurrentTimeRangeKey()}`
    });
  }
});
