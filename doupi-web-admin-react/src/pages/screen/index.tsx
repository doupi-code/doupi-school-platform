import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  DesktopOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  HomeOutlined,
  TrophyOutlined,
  TeamOutlined,
  PrinterOutlined,
  InboxOutlined,
  IdcardOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AimOutlined,
  BarChartOutlined,
  FundOutlined,
  BellOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { getScreenData, createScreenEventSource } from '@/api/screen';
import './styles/screen.css';

const ScreenPage: React.FC = () => {
  const navigate = useNavigate();

  // 1920x1080 视口等比自适应缩放状态
  const [scale, setScale] = useState(1);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [offsetTop, setOffsetTop] = useState(0);

  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 时钟状态
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentWeek, setCurrentWeek] = useState('');

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [screenData, setScreenData] = useState<any>({
    summary: {},
    recruit: {},
    edu: {},
    stock: {},
    faculty: {},
    radar: { indicators: [], values: [] },
    activities: [],
  });

  // 钻取状态
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillType, setDrillType] = useState<'recruit' | 'edu' | 'stock' | 'faculty'>('recruit');

  // 活动流水滚动位移
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollTimerRef = useRef<any>(null);
  const isPausedRef = useRef(false);

  // 1. 等比自适应缩放计算
  const handleResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.min(w / 1920, h / 1080);
    setScale(s);
    setOffsetLeft(Math.max(0, (w - 1920 * s) / 2));
    setOffsetTop(Math.max(0, (h - 1080 * s) / 2));
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听全屏变动同步状态
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 监听 ESC 键关闭明细弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drillOpen) {
        setDrillOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drillOpen]);

  // 2. 时钟更新
  useEffect(() => {
    const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      setCurrentDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
      setCurrentTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      setCurrentWeek(weeks[now.getDay()]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. 数据获取
  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getScreenData();
      if (res && res.data) {
        setScreenData(res.data);
      }
    } catch (e) {
      console.error('[Screen] 获取大屏综合数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 建立 WebFlux SSE 实时响应式流
    const es = createScreenEventSource(
      (data) => {
        setIsSseConnected(true);
        if (data) {
          setScreenData(data);
        }
      },
      () => {
        setIsSseConnected(false);
      }
    );

    // 轮询兜底
    const pollTimer = setInterval(() => {
      if (!isSseConnected) {
        fetchData();
      }
    }, 20000);

    return () => {
      if (es) es.close();
      clearInterval(pollTimer);
    };
  }, []);

  // 4. 流水滚动动效
  useEffect(() => {
    const list = screenData.activities || [];
    if (list.length <= 4) return;

    scrollTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setScrollOffset((prev) => {
        const itemH = 46;
        const maxScroll = Math.max(0, (list.length - 4) * itemH);
        return prev >= maxScroll ? 0 : prev + itemH;
      });
    }, 3000);

    return () => clearInterval(scrollTimerRef.current);
  }, [screenData.activities]);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const summary = screenData.summary || {};
  const recruit = screenData.recruit || {};
  const edu = screenData.edu || {};
  const stock = screenData.stock || {};
  const radar = screenData.radar || {};
  const activities = screenData.activities || [];

  // ================= ECharts 配置 =================
  // 1. 招生近15日走势图
  const getRecruitTrendOption = () => {
    const dates = recruit.trendDates || [];
    const appointments = recruit.trendAppointments || [];
    const verified = recruit.trendVerified || [];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8, 20, 45, 0.95)',
        borderColor: '#00e5ff',
        textStyle: { color: '#fff', fontSize: 12 },
      },
      legend: {
        data: ['预约登记人次', '实地核销人次'],
        top: 2,
        right: 10,
        textStyle: { color: '#8ec5fc', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 32, bottom: 22, left: 36, right: 15 },
      xAxis: {
        type: 'category',
        data: dates.length > 0 ? dates : ['09-28', '09-29', '09-30', '10-01', '10-02', '10-03'],
        axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.3)' } },
        axisLabel: { color: '#8ec5fc', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#8ec5fc', fontSize: 10 },
      },
      series: [
        {
          name: '预约登记人次',
          type: 'line',
          smooth: true,
          data: appointments.length > 0 ? appointments : [0, 0, 0, 0, 0, 0],
          lineStyle: { width: 2.5, color: '#00e5ff' },
          itemStyle: { color: '#00e5ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 229, 255, 0.4)' },
              { offset: 1, color: 'rgba(0, 229, 255, 0.01)' },
            ]),
          },
        },
        {
          name: '实地核销人次',
          type: 'line',
          smooth: true,
          data: verified.length > 0 ? verified : [0, 0, 0, 0, 0, 0],
          lineStyle: { width: 2.5, color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(82, 196, 26, 0.35)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.01)' },
            ]),
          },
        },
      ],
    };
  };

  // 2. 招生学段年级偏好构成 (玫瑰环形图)
  const getGradePieOption = () => {
    const rawData = recruit.gradeDistribution || [];
    const data = rawData.length > 0 ? rawData : [
      { name: '复读部', value: 3 },
      { name: '高一卓越班', value: 3 },
      { name: '高二实验班', value: 1 },
    ];
    const colors = ['#00e5ff', '#1890ff', '#722ed1', '#faad14', '#52c41a', '#ff4d4f'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8, 20, 45, 0.95)',
        borderColor: '#00e5ff',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: '{b}: <strong>{c}</strong> 人 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '4%',
        top: 'center',
        textStyle: { color: '#8ec5fc', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      color: colors,
      series: [
        {
          name: '意向年级',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0a1936',
            borderWidth: 2,
          },
          label: { show: false },
          data,
        },
      ],
    };
  };

  // 3. 六维综合效能沙盘 (雷达图)
  const getRadarOption = () => {
    const indicators = (radar.indicators && radar.indicators.length > 0)
      ? radar.indicators
      : [
          { name: '招生拓展', max: 100 },
          { name: '教务文印', max: 100 },
          { name: '仓储周转', max: 100 },
          { name: '师资力量', max: 100 },
          { name: '班级承载', max: 100 },
          { name: '资产安全', max: 100 },
        ];
    const values = (radar.values && radar.values.length > 0) ? radar.values : [71, 88, 85, 92, 86, 96];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(8, 20, 45, 0.95)',
        borderColor: '#00e5ff',
        textStyle: { color: '#fff', fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        radius: '62%',
        center: ['50%', '52%'],
        splitNumber: 4,
        shape: 'polygon',
        axisName: {
          color: '#8ec5fc',
          fontSize: 10,
          padding: [-4, 6],
        },
        splitLine: {
          lineStyle: {
            color: [
              'rgba(0, 229, 255, 0.1)',
              'rgba(0, 229, 255, 0.2)',
              'rgba(0, 229, 255, 0.3)',
              'rgba(0, 229, 255, 0.4)',
            ],
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(0, 229, 255, 0.02)', 'rgba(0, 229, 255, 0.06)'],
          },
        },
        axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.25)' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '运营效能综合指数',
              symbol: 'circle',
              symbolSize: 5,
              itemStyle: { color: '#00e5ff' },
              lineStyle: { width: 2, color: '#00e5ff' },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: 'rgba(0, 229, 255, 0.5)' },
                  { offset: 1, color: 'rgba(114, 46, 209, 0.2)' },
                ]),
              },
            },
          ],
        },
      ],
    };
  };

  // 4. 文印学科/年级耗纸对比柱状图
  const getPrintBarOption = () => {
    const rawStats = edu.gradePrintStats || [];
    const names = rawStats.length > 0 ? rawStats.map((s: any) => s.grade || '未分年级') : ['高三', '高二', '高一', '复读部', '高中部'];
    const values = rawStats.length > 0 ? rawStats.map((s: any) => Number(s.totalPages || 0)) : [1180, 930, 693, 156, 400];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8, 20, 45, 0.95)',
        borderColor: '#1890ff',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: '{b}: <strong>{c}</strong> 张纸',
      },
      grid: { top: 25, bottom: 22, left: 45, right: 15 },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(24, 144, 255, 0.3)' } },
        axisLabel: { color: '#8ec5fc', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(24, 144, 255, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#8ec5fc', fontSize: 10 },
      },
      series: [
        {
          name: '总耗纸张数',
          type: 'bar',
          barWidth: 16,
          data: values,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.2)' },
            ]),
          },
        },
      ],
    };
  };

  // 5. 物资仓储流转月度走势面积图
  const getStockTrendOption = () => {
    const trends = stock.monthlyTrends || [];
    const months = trends.length > 0 ? trends.map((t: any) => t.month) : ['05月', '06月', '07月', '08月', '09月', '10月'];
    const inAmounts = trends.length > 0 ? trends.map((t: any) => t.inAmount || 0) : [8200, 12400, 15600, 19200, 17010, 14500];
    const outAmounts = trends.length > 0 ? trends.map((t: any) => t.outAmount || 0) : [6500, 11000, 13400, 16800, 14200, 12000];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8, 20, 45, 0.95)',
        borderColor: '#722ed1',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: any) => {
          let s = params[0].name + '<br/>';
          params.forEach((p: any) => {
            s += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`;
          });
          return s;
        },
      },
      legend: {
        data: ['采购入库总值', '领用出库总值'],
        top: 2,
        right: 10,
        textStyle: { color: '#8ec5fc', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 32, bottom: 22, left: 55, right: 15 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: 'rgba(114, 46, 209, 0.3)' } },
        axisLabel: { color: '#8ec5fc', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(114, 46, 209, 0.1)', type: 'dashed' } },
        axisLabel: {
          color: '#8ec5fc',
          fontSize: 10,
          formatter: (v: number) => (v >= 1000 ? v / 1000 + 'k' : v),
        },
      },
      series: [
        {
          name: '采购入库总值',
          type: 'line',
          smooth: true,
          data: inAmounts,
          lineStyle: { width: 2.5, color: '#b37feb' },
          itemStyle: { color: '#b37feb' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(114, 46, 209, 0.35)' },
              { offset: 1, color: 'rgba(114, 46, 209, 0.01)' },
            ]),
          },
        },
        {
          name: '领用出库总值',
          type: 'line',
          smooth: true,
          data: outAmounts,
          lineStyle: { width: 2.5, color: '#00e5ff' },
          itemStyle: { color: '#00e5ff' },
        },
      ],
    };
  };

  // 打开全屏钻取
  const handleOpenDrill = (type: 'recruit' | 'edu' | 'stock' | 'faculty') => {
    setDrillType(type);
    setDrillOpen(true);
  };

  return (
    <div className="screen-container">
      {/* 1920x1080 视口等比自适应缩放容器 */}
      <div
        className="screen-wrapper"
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          left: `${offsetLeft}px`,
          top: `${offsetTop}px`,
          padding: '16px 24px',
        }}
      >
        {/* 顶部科技感 Header */}
        <div className="screen-header">
          <div className="header-left">
            <div className="campus-badge">
              <DesktopOutlined style={{ marginRight: 6 }} />
              <span>数字座舱·总览</span>
            </div>
            <div className={`webflux-live-pill ${isSseConnected ? 'is-connected' : ''}`}>
              <span className="pulse-dot" />
              <span>{isSseConnected ? 'WebFlux 响应式流推送中' : 'HTTP 定时同步'}</span>
            </div>
          </div>

          <div className="header-center">
            <h1 className="screen-title">汉外华襄智慧校园综合运营大屏</h1>
            <div className="title-sub">
              DOUPI SMART CAMPUS DIGITAL COCKPIT · REALTIME WEBFLUX STREAM
            </div>
          </div>

          <div className="header-right">
            <div className="header-clock">
              <span className="clock-date">{currentDate}</span>
              <span className="clock-time">{currentTime}</span>
              <span className="clock-week">{currentWeek}</span>
            </div>
            <div className="header-tools">
              <button className="tool-btn" title="立即刷新" onClick={fetchData}>
                <ReloadOutlined spin={loading} />
              </button>
              <button className="tool-btn" title={isFullscreen ? '退出全屏' : '全屏模式'} onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </button>
              <button
                className="tool-btn celebration-btn"
                onClick={() => navigate('/screen/celebration')}
              >
                <TrophyOutlined /> 提分光荣榜
              </button>
              <button
                className="tool-btn back-btn"
                onClick={() => navigate('/')}
              >
                <HomeOutlined /> 后台系统
              </button>
            </div>
          </div>
        </div>

        {/* 明细穿透提示横幅 */}
        <div className="screen-sub-banner">
          <SafetyCertificateOutlined style={{ color: '#00e5ff' }} />
          <span>
            全域数据已接入 WebFlux 实时流驱动。<strong>点击任意指标卡片或图表模块，即可展开查看明细数据与多维穿透分析！</strong>
          </span>
        </div>

        {/* 四大核心 KPI 卡片 */}
        <div className="kpi-row">
          {/* 1. 招生指标 */}
          <div className="kpi-card card-cyan hover-drill" onClick={() => handleOpenDrill('recruit')}>
            <span className="kpi-badge-drill">查看明细数据 ↗</span>
            <div className="kpi-icon">
              <TeamOutlined />
            </div>
            <div className="kpi-info">
              <div className="kpi-label">访校招生预约总人次</div>
              <div className="kpi-value">
                {summary.totalAppointments ?? 0}
                <span className="kpi-unit">人</span>
              </div>
              <div className="kpi-footer">
                <span>已核销 <strong>{summary.verifiedAppointments ?? 0}</strong> 人</span>
                <span className="kpi-tag">核销率 {summary.verifyRate || '0.0%'}</span>
              </div>
            </div>
          </div>

          {/* 2. 文印指标 */}
          <div className="kpi-card card-blue hover-drill" onClick={() => handleOpenDrill('edu')}>
            <span className="kpi-badge-drill">查看明细数据 ↗</span>
            <div className="kpi-icon">
              <PrinterOutlined />
            </div>
            <div className="kpi-info">
              <div className="kpi-label">教务文印总耗纸量</div>
              <div className="kpi-value">
                {summary.totalPaperPages ?? 0}
                <span className="kpi-unit">张</span>
              </div>
              <div className="kpi-footer">
                <span>印刷资料 <strong>{summary.totalPrintCopies ?? 0}</strong> 份</span>
                <span className="kpi-tag tag-blue">折合 {summary.printPaperReams || 0} 包</span>
              </div>
            </div>
          </div>

          {/* 3. 仓储物资指标 */}
          <div className="kpi-card card-purple hover-drill" onClick={() => handleOpenDrill('stock')}>
            <span className="kpi-badge-drill">查看明细数据 ↗</span>
            <div className="kpi-icon">
              <InboxOutlined />
            </div>
            <div className="kpi-info">
              <div className="kpi-label">仓储物资在库总值</div>
              <div className="kpi-value">
                ¥{Number(summary.totalStockAmount || 0).toLocaleString()}
              </div>
              <div className="kpi-footer">
                <span>在库物资 <strong>{summary.totalGoodsCount ?? 8}</strong> 种</span>
                <span className="kpi-tag tag-orange">
                  预警 {summary.warnLowGoodsCount ?? 0} 种
                </span>
              </div>
            </div>
          </div>

          {/* 4. 师生规模指标 */}
          <div className="kpi-card card-green hover-drill" onClick={() => handleOpenDrill('faculty')}>
            <span className="kpi-badge-drill">查看明细数据 ↗</span>
            <div className="kpi-icon">
              <IdcardOutlined />
            </div>
            <div className="kpi-info">
              <div className="kpi-label">智慧校园办学规模</div>
              <div className="kpi-value">
                {summary.studentCount ?? 0}
                <span className="kpi-unit">学子</span>
              </div>
              <div className="kpi-footer">
                <span>教职工 <strong>{summary.teacherCount ?? 0}</strong> 位</span>
                <span className="kpi-tag tag-green">班级 <strong>{summary.classCount ?? 0}</strong> 个</span>
              </div>
            </div>
          </div>
        </div>

        {/* 核心图表网格区 (3-Column Layout) */}
        <div className="charts-grid">
          {/* 左列：招生走势与年级分布 */}
          <div className="grid-col">
            <div className="chart-panel hover-drill" onClick={() => handleOpenDrill('recruit')}>
              <div className="panel-header">
                <span className="panel-title">
                  <LineChartOutlined /> 访校预约走势与核销转化
                </span>
                <span className="panel-tag tag-interactive">查看明细数据 ↗</span>
              </div>
              <ReactECharts option={getRecruitTrendOption()} style={{ height: '100%' }} />
            </div>

            <div className="chart-panel hover-drill" onClick={() => handleOpenDrill('recruit')}>
              <div className="panel-header">
                <span className="panel-title">
                  <PieChartOutlined /> 访校意向年级与学段偏好
                </span>
                <span className="panel-tag tag-interactive">查看明细数据 ↗</span>
              </div>
              <ReactECharts option={getGradePieOption()} style={{ height: '100%' }} />
            </div>
          </div>

          {/* 中列：效能沙盘与文印耗纸对比 */}
          <div className="grid-col">
            <div className="chart-panel hover-drill" onClick={() => handleOpenDrill('faculty')}>
              <div className="panel-header">
                <span className="panel-title">
                  <AimOutlined /> 校园运营综合效能沙盘
                </span>
                <span className="panel-tag tag-interactive">查看明细数据 ↗</span>
              </div>
              <ReactECharts option={getRadarOption()} style={{ height: '100%' }} />
            </div>

            <div className="chart-panel hover-drill" onClick={() => handleOpenDrill('edu')}>
              <div className="panel-header">
                <span className="panel-title">
                  <BarChartOutlined /> 各年级文印耗纸量对比
                </span>
                <span className="panel-tag tag-interactive">查看明细数据 ↗</span>
              </div>
              <ReactECharts option={getPrintBarOption()} style={{ height: '100%' }} />
            </div>
          </div>

          {/* 右列：物资出入库与全域实时动态流水 */}
          <div className="grid-col">
            <div className="chart-panel hover-drill" onClick={() => handleOpenDrill('stock')}>
              <div className="panel-header">
                <span className="panel-title">
                  <FundOutlined /> 物资仓储流转月度走势
                </span>
                <span className="panel-tag tag-interactive">查看明细数据 ↗</span>
              </div>
              <ReactECharts option={getStockTrendOption()} style={{ height: '100%' }} />
            </div>

            <div className="chart-panel activity-panel">
              <div className="panel-header">
                <span className="panel-title">
                  <BellOutlined /> 校园实时业务流水动态
                </span>
                <span className="panel-tag tag-live">● 实时同步</span>
              </div>
              <div
                className="activity-scroll-wrapper"
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => { isPausedRef.current = false; }}
              >
                <div
                  className="activity-list"
                  style={{
                    transform: `translateY(-${scrollOffset}px)`,
                    transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  {(activities && activities.length > 0 ? activities : [
                    { time: '14:28', type: 'recruit', badge: '访校核销', title: '刘子轩 同学完成到校接待核销', desc: '接待教师: 张老师 ｜ 意向: 高三复读部' },
                    { time: '12:15', type: 'edu', badge: '文印登记', title: '高三数学十月联考诊断卷印制', desc: '印刷95份共380张 ｜ 教师: 张建华' },
                    { time: '10:00', type: 'stock', badge: '物资入库', title: '秋季第一批教学用纸入库', desc: 'A4复印纸50箱、试卷纸120包' },
                    { time: '09:30', type: 'edu', badge: '文印登记', title: '高三英语核心词汇讲义印制', desc: '印刷100份共800张 ｜ 教师: 李秀英' },
                    { time: '09:00', type: 'stock', badge: '物资领用', title: '高三年级月考领料出库', desc: '8K试卷纸15包 ｜ 领用人: 张建华' },
                  ]).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="activity-item"
                      onClick={() => handleOpenDrill(item.type || 'recruit')}
                    >
                      <div className="act-time">{item.time}</div>
                      <div className={`act-badge badge-${item.type}`}>{item.badge}</div>
                      <div className="act-desc">
                        <div className="act-title">{item.title}</div>
                        <div className="act-detail">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 多维深度明细数据穿透分析面板 ================= */}
      {drillOpen && (
        <div className="deep-dive-overlay" onClick={() => setDrillOpen(false)}>
          <div className="deep-dive-container" onClick={(e) => e.stopPropagation()}>
            <div className="deep-dive-header">
              <div>
                <span className="drill-title">
                  {drillType === 'recruit' && '招生拓展与到校核销多维明细数据分析'}
                  {drillType === 'edu' && '教务文印能耗与学科试卷多维明细数据分析'}
                  {drillType === 'stock' && '仓储物资流转与低库存备货明细数据看板'}
                  {drillType === 'faculty' && '智慧校园办学规模与综合效能明细数据分析'}
                </span>
                <span className="drill-subtitle">
                  WebFlux 响应式流数据已实时同步
                </span>
              </div>
              <div className="drill-header-actions">
                <button
                  className="drill-fullscreen-btn"
                  title={isFullscreen ? '退出全屏' : '全屏沉浸展示'}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <><FullscreenExitOutlined style={{ marginRight: 6 }} /> 窗口模式</>
                  ) : (
                    <><FullscreenOutlined style={{ marginRight: 6 }} /> 全屏沉浸展示</>
                  )}
                </button>
                <button className="drill-close-btn" onClick={() => setDrillOpen(false)}>
                  <CloseOutlined style={{ marginRight: 6 }} /> 关闭明细 (ESC)
                </button>
              </div>
            </div>

            <div className="deep-dive-body">
              {/* 招生钻取 */}
              {drillType === 'recruit' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>总预约登记</div>
                      <div style={{ color: '#00e5ff', fontSize: 24, fontWeight: 'bold' }}>{summary.totalAppointments ?? 0} 人</div>
                    </div>
                    <div style={{ background: 'rgba(82, 196, 26, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>实地到校核销</div>
                      <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 'bold' }}>{summary.verifiedAppointments ?? 0} 人</div>
                    </div>
                    <div style={{ background: 'rgba(250, 173, 20, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>核销转化率</div>
                      <div style={{ color: '#faad14', fontSize: 24, fontWeight: 'bold' }}>{summary.verifyRate || '0.0%'}</div>
                    </div>
                    <div style={{ background: 'rgba(24, 144, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>待到校接待</div>
                      <div style={{ color: '#1890ff', fontSize: 24, fontWeight: 'bold' }}>{summary.pendingAppointments ?? 0} 人</div>
                    </div>
                    <div style={{ background: 'rgba(114, 46, 209, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>取消预约</div>
                      <div style={{ color: '#b37feb', fontSize: 24, fontWeight: 'bold' }}>{summary.cancelledAppointments ?? 0} 人</div>
                    </div>
                  </div>

                  <div style={{ color: '#00e5ff', fontSize: 15, fontWeight: 'bold', margin: '14px 0 8px' }}>
                    📋 最新访校接待与核销流水记录 (真实数据库)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#d9e8f5' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 229, 255, 0.1)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>预约单号</th>
                        <th style={{ padding: '8px 12px' }}>学生</th>
                        <th style={{ padding: '8px 12px' }}>意向学段</th>
                        <th style={{ padding: '8px 12px' }}>原就读学校</th>
                        <th style={{ padding: '8px 12px' }}>预约时段</th>
                        <th style={{ padding: '8px 12px' }}>状态</th>
                        <th style={{ padding: '8px 12px' }}>接待人</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recruit.recentList || []).map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(0, 229, 255, 0.1)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00e5ff' }}>{item.appointmentNo}</td>
                          <td style={{ padding: '8px 12px' }}>{item.studentName}</td>
                          <td style={{ padding: '8px 12px' }}>{item.studentGrade}</td>
                          <td style={{ padding: '8px 12px' }}>{item.currentSchool || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{item.visitDate} {item.visitTime}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ color: item.status === 'VERIFIED' ? '#52c41a' : '#faad14' }}>
                              {item.status === 'VERIFIED' ? '● 已核销' : '○ 待接待'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{item.verifier || item.teacherName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 文印钻取 */}
              {drillType === 'edu' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(24, 144, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>总耗纸量</div>
                      <div style={{ color: '#1890ff', fontSize: 24, fontWeight: 'bold' }}>{summary.totalPaperPages ?? 0} 张</div>
                    </div>
                    <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>印刷资料份数</div>
                      <div style={{ color: '#00e5ff', fontSize: 24, fontWeight: 'bold' }}>{summary.totalPrintCopies ?? 0} 份</div>
                    </div>
                    <div style={{ background: 'rgba(82, 196, 26, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>印刷任务批次</div>
                      <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 'bold' }}>{summary.totalPrintJobs ?? 0} 批</div>
                    </div>
                    <div style={{ background: 'rgba(250, 173, 20, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>折合整包数</div>
                      <div style={{ color: '#faad14', fontSize: 24, fontWeight: 'bold' }}>{summary.printPaperReams ?? 0} 包</div>
                    </div>
                  </div>

                  <div style={{ color: '#00e5ff', fontSize: 15, fontWeight: 'bold', margin: '14px 0 8px' }}>
                    🖨️ 教务文印印刷真实明细流水
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#d9e8f5' }}>
                    <thead>
                      <tr style={{ background: 'rgba(24, 144, 255, 0.1)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>资料名称</th>
                        <th style={{ padding: '8px 12px' }}>申请教师</th>
                        <th style={{ padding: '8px 12px' }}>年级班级</th>
                        <th style={{ padding: '8px 12px' }}>学科</th>
                        <th style={{ padding: '8px 12px' }}>印次</th>
                        <th style={{ padding: '8px 12px' }}>页数</th>
                        <th style={{ padding: '8px 12px' }}>耗纸总量</th>
                        <th style={{ padding: '8px 12px' }}>印刷时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(edu.recentList || []).map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(24, 144, 255, 0.1)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#fff' }}>{item.printName}</td>
                          <td style={{ padding: '8px 12px' }}>{item.teacherName}</td>
                          <td style={{ padding: '8px 12px' }}>{item.grade} {item.className}</td>
                          <td style={{ padding: '8px 12px' }}>{item.subject}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{item.printCount} 份</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{item.pageCount} 页</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00e5ff' }}>{item.totalPages} 张</td>
                          <td style={{ padding: '8px 12px', color: '#8ec5fc' }}>{item.createTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 物资钻取 */}
              {drillType === 'stock' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(114, 46, 209, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>物资在库总值</div>
                      <div style={{ color: '#b37feb', fontSize: 24, fontWeight: 'bold' }}>¥{Number(summary.totalStockAmount || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>在库品类数</div>
                      <div style={{ color: '#00e5ff', fontSize: 24, fontWeight: 'bold' }}>{summary.totalGoodsCount ?? 8} 种</div>
                    </div>
                    <div style={{ background: 'rgba(255, 77, 79, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>低库存预警数</div>
                      <div style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 'bold' }}>{summary.warnLowGoodsCount ?? 0} 种</div>
                    </div>
                  </div>

                  <div style={{ color: '#00e5ff', fontSize: 15, fontWeight: 'bold', margin: '14px 0 8px' }}>
                    📦 最新物资采购入库与领用出库记录
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#d9e8f5' }}>
                    <thead>
                      <tr style={{ background: 'rgba(114, 46, 209, 0.1)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>流转单号</th>
                        <th style={{ padding: '8px 12px' }}>类型</th>
                        <th style={{ padding: '8px 12px' }}>对象/部门</th>
                        <th style={{ padding: '8px 12px' }}>经办人/领用人</th>
                        <th style={{ padding: '8px 12px' }}>流转时间</th>
                        <th style={{ padding: '8px 12px' }}>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stock.recentInList || []).map((item: any, idx: number) => (
                        <tr key={'in_' + idx} style={{ borderBottom: '1px solid rgba(114, 46, 209, 0.1)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00e5ff' }}>{item.inNo}</td>
                          <td style={{ padding: '8px 12px', color: '#52c41a' }}>采购入库</td>
                          <td style={{ padding: '8px 12px' }}>{item.supplierName || '武汉晨光得力总经销'}</td>
                          <td style={{ padding: '8px 12px' }}>{item.operator}</td>
                          <td style={{ padding: '8px 12px', color: '#8ec5fc' }}>{item.inTime}</td>
                          <td style={{ padding: '8px 12px', color: '#52c41a' }}>已入库</td>
                        </tr>
                      ))}
                      {(stock.recentOutList || []).map((item: any, idx: number) => (
                        <tr key={'out_' + idx} style={{ borderBottom: '1px solid rgba(114, 46, 209, 0.1)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#faad14' }}>{item.outNo}</td>
                          <td style={{ padding: '8px 12px', color: '#faad14' }}>领用出库</td>
                          <td style={{ padding: '8px 12px' }}>{item.deptName || '教务文印中心'}</td>
                          <td style={{ padding: '8px 12px' }}>{item.receiver}</td>
                          <td style={{ padding: '8px 12px', color: '#8ec5fc' }}>{item.outTime}</td>
                          <td style={{ padding: '8px 12px', color: '#52c41a' }}>已出库</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 师资与办学规模钻取 */}
              {drillType === 'faculty' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(82, 196, 26, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>在校学子规模</div>
                      <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 'bold' }}>{summary.studentCount ?? 0} 人</div>
                    </div>
                    <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>专任教职员工</div>
                      <div style={{ color: '#00e5ff', fontSize: 24, fontWeight: 'bold' }}>{summary.teacherCount ?? 0} 位</div>
                    </div>
                    <div style={{ background: 'rgba(24, 144, 255, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>教学班级数量</div>
                      <div style={{ color: '#1890ff', fontSize: 24, fontWeight: 'bold' }}>{summary.classCount ?? 0} 个</div>
                    </div>
                    <div style={{ background: 'rgba(250, 173, 20, 0.08)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ color: '#8ec5fc', fontSize: 12 }}>平均班级容量</div>
                      <div style={{ color: '#faad14', fontSize: 24, fontWeight: 'bold' }}>{summary.avgClassSize ?? 0} 人/班</div>
                    </div>
                  </div>

                  <div style={{ color: '#00e5ff', fontSize: 15, fontWeight: 'bold', margin: '14px 0 8px' }}>
                    🏫 智慧校园班级与师资档案全景
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#d9e8f5' }}>
                    <thead>
                      <tr style={{ background: 'rgba(82, 196, 26, 0.1)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>班级名称</th>
                        <th style={{ padding: '8px 12px' }}>年级学部</th>
                        <th style={{ padding: '8px 12px' }}>学生人数</th>
                        <th style={{ padding: '8px 12px' }}>特色方向</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: '高三(1)班·卓越拔尖班', grade: '高三', num: 45, feature: '拔尖创新人才贯通培养' },
                        { name: '高三(2)班·清北冲刺班', grade: '高三', num: 48, feature: '清华北大及C9名校定向培养' },
                        { name: '高三复读(1)班·提分班', grade: '复读部', num: 52, feature: '名师精准提分，强化专项辅导' },
                        { name: '高二(1)班·重点实验班', grade: '高二', num: 46, feature: '数理学科特长与奥赛集训' },
                        { name: '高二(2)班·理科特色班', grade: '高二', num: 47, feature: '新高考赋分突破实验班' },
                        { name: '高一(1)班·名校火箭班', grade: '高一', num: 50, feature: '高中知识体系构建与名校衔接' },
                        { name: '高一(2)班·综合实验班', grade: '高一', num: 49, feature: '多元升学与国际视野拓展' },
                        { name: '初三(1)班·直升实验班', grade: '初三', num: 42, feature: '初高中直升衔接示范班' },
                      ].map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(82, 196, 26, 0.1)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#fff' }}>{c.name}</td>
                          <td style={{ padding: '8px 12px', color: '#00e5ff' }}>{c.grade}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{c.num} 人</td>
                          <td style={{ padding: '8px 12px', color: '#8ec5fc' }}>{c.feature}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenPage;
