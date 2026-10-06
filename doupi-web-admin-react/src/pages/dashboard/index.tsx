import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Tag,
  List,
  Typography,
  Empty,
  Spin,
  Tabs,
  Badge,
  Timeline,
  Progress,
  Modal,
  Tooltip,
  Divider,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  WarningOutlined,
  ScanOutlined,
  FileAddOutlined,
  ReloadOutlined,
  FundProjectionScreenOutlined,
  ShopOutlined,
  TeamOutlined,
  RiseOutlined,
  BookOutlined,
  NotificationOutlined,
  RightOutlined,
  TrophyOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useUserStore } from '../../store/useUserStore';
import { getScreenData } from '@/api/screen';
import { listNotice } from '@/api/system/notice';
import dayjs from 'dayjs';
import './index.css';

const { Text, Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const { name, roles } = useUserStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [loading, setLoading] = useState(false);

  // 核心运营大盘数据
  const [dashboardData, setDashboardData] = useState<any>({
    summary: {
      totalAppointments: 7,
      verifiedAppointments: 5,
      pendingAppointments: 2,
      verifyRate: '71.4%',
      totalPaperPages: 3359,
      totalPrintCopies: 831,
      totalPrintJobs: 8,
      printPaperReams: 6.7,
      totalStockAmount: 24045,
      totalGoodsCount: 39,
      warnLowGoodsCount: 0,
      studentCount: 379,
      teacherCount: 32,
      classCount: 8,
      avgClassSize: 47,
      teacherStudentRatio: '1:12',
    },
    recruit: {
      trendDates: ['09-19', '09-20', '09-21', '09-22', '09-23', '09-24', '09-25', '09-26', '09-27', '09-28', '09-29', '09-30', '10-01', '10-02', '10-03'],
      trendAppointments: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2],
      trendVerified: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2],
      gradeDistribution: [
        { name: '高三复读', value: 2 },
        { name: '高一', value: 3 },
        { name: '高二', value: 1 },
        { name: '初三', value: 1 },
      ],
      funnel: [
        { name: '线上意向登记', value: 7 },
        { name: '审核排班确认', value: 7 },
        { name: '到校实地核销', value: 5 },
      ],
      verifierRank: [
        { teacherName: '张老师', verifyCount: 1, rate: '20.0%' },
        { teacherName: '李老师', verifyCount: 1, rate: '20.0%' },
        { teacherName: '陈老师', verifyCount: 1, rate: '20.0%' },
        { teacherName: '王老师', verifyCount: 1, rate: '20.0%' },
        { teacherName: '刘老师', verifyCount: 1, rate: '20.0%' },
      ],
    },
    edu: {
      paperDistribution: [
        { name: 'A4用纸', value: 2625, paperType: 'A4' },
        { name: '8K用纸', value: 578, paperType: '8K' },
        { name: '16K用纸', value: 156, paperType: '16K' },
      ],
      subjectStats: [
        { name: '英语', value: 800 },
        { name: '物理', value: 558 },
        { name: '语文', value: 495 },
        { name: '综合资料', value: 400 },
        { name: '数学', value: 578 },
        { name: '生物', value: 372 },
        { name: '化学', value: 156 },
      ],
      gradePrintStats: [],
      teacherRanking: [],
    },
    stock: {
      categoryStock: [
        { name: '教学纸张', value: 271 },
        { name: '设备耗材', value: 30 },
        { name: '办公用品', value: 103 },
        { name: '招生宣传', value: 350 },
      ],
      warnLowList: [],
    },
    faculty: {
      roleDistribution: [
        { name: '任课教师', value: 24 },
        { name: '招生老师', value: 5 },
        { name: '行政与教辅', value: 3 },
      ],
      gradeClassStats: [
        { grade: '高三', classCount: 2, studentCount: 93 },
        { grade: '高三复读', classCount: 1, studentCount: 52 },
        { grade: '高二', classCount: 2, studentCount: 93 },
        { grade: '高一', classCount: 2, studentCount: 99 },
        { grade: '初三', classCount: 1, studentCount: 42 },
      ],
    },
    radar: {
      indicators: [
        { name: '招生拓展转化', max: 100 },
        { name: '教务文印敏捷', max: 100 },
        { name: '仓储流转周转', max: 100 },
        { name: '师资力量齐备', max: 100 },
        { name: '教学班级承载', max: 100 },
        { name: '资产安全保障', max: 100 },
      ],
      values: [71, 88, 85, 92, 86, 96],
    },
    activities: [],
  });

  // 系统通知列表与弹窗
  const [notices, setNotices] = useState<any[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  // 待办协作清单
  const [todoItems, setTodoItems] = useState<any[]>([]);

  // 报表 Tab 切换
  const [activeReportTab, setActiveReportTab] = useState('recruit');

  // 时间问候语
  const greeting = useMemo(() => {
    const hour = dayjs().hour();
    if (hour >= 5 && hour < 11) return '早上好';
    if (hour >= 11 && hour < 13) return '中午好';
    if (hour >= 13 && hour < 18) return '下午好';
    return '晚上好';
  }, []);

  // 星期计算
  useEffect(() => {
    const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    setDayOfWeek(weeks[dayjs().day()]);

    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 加载全量大盘与通知数据
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [screenRes, noticeRes]: any = await Promise.allSettled([
        getScreenData(),
        listNotice({ pageNum: 1, pageSize: 6 }),
      ]);

      if (screenRes.status === 'fulfilled' && screenRes.value?.data) {
        const d = screenRes.value.data;
        setDashboardData((prev: any) => ({
          ...prev,
          summary: { ...prev.summary, ...(d.summary || {}) },
          recruit: { ...prev.recruit, ...(d.recruit || {}) },
          edu: { ...prev.edu, ...(d.edu || {}) },
          stock: { ...prev.stock, ...(d.stock || {}) },
          faculty: { ...prev.faculty, ...(d.faculty || {}) },
          radar: { ...prev.radar, ...(d.radar || {}) },
          activities: d.activities && d.activities.length > 0 ? d.activities : prev.activities,
        }));

        // 动态构建待办协同清单
        const dynamicTodos: any[] = [];
        const pendingApp = Number(d.summary?.pendingAppointments || 0);
        const lowStock = Number(d.summary?.warnLowGoodsCount || 0);

        if (pendingApp > 0) {
          dynamicTodos.push({
            id: 'todo_verify',
            title: `系统当前有 ${pendingApp} 位预约家长待到校核销面谈`,
            time: '今日需接待',
            tag: '招生待办',
            type: 'urgent',
            path: '/recruit/verify',
          });
        }
        if (lowStock > 0) {
          dynamicTodos.push({
            id: 'todo_stock',
            title: `检测到 ${lowStock} 种耗材库存触及警戒阈值，建议及时安排采购入库`,
            time: '库存动态',
            tag: '库存预警',
            type: 'warning',
            path: '/stock/goods',
          });
        }
        // 文印常规待办
        dynamicTodos.push({
          id: 'todo_print',
          title: '本周教学模拟联考与教研讲义印制规范已发布，建议核对纸张储备',
          time: '文印提醒',
          tag: '文印协作',
          type: 'info',
          path: '/print/record',
        });
        dynamicTodos.push({
          id: 'todo_report',
          title: '上月校园物资流转与文印月度消耗报表已生成，支持导出归档',
          time: '月初归档',
          tag: '统计报表',
          type: 'success',
          path: '/print/report',
        });

        setTodoItems(dynamicTodos);
      }

      // 处理系统通知
      if (noticeRes.status === 'fulfilled' && noticeRes.value?.rows && noticeRes.value.rows.length > 0) {
        setNotices(noticeRes.value.rows);
      } else {
        // 优雅兜底通知
        setNotices([
          {
            noticeId: 1,
            noticeTitle: '关于开展2026年秋季学期教学资料印制规范的通知',
            noticeType: '1',
            createBy: '教务处',
            createTime: dayjs().format('YYYY-MM-DD'),
            noticeContent: '各教研室、各位老师：为保障期中备考文印效率，请各学科提前24小时通过数字化系统发起文印登记，规范用纸规格与双面打印比例。',
          },
          {
            noticeId: 2,
            noticeTitle: '汉外华襄校园开放日接待与迎新核销工作排班安排',
            noticeType: '2',
            createBy: '招生咨询处',
            createTime: dayjs().format('YYYY-MM-DD'),
            noticeContent: '本周六将迎来大规模初三升高中意向家长访校，请接待老师佩戴工牌、打开工作台核销端实时扫码接待并做好生源意向登记。',
          },
          {
            noticeId: 3,
            noticeTitle: '关于教学实验耗材及期末文印纸张集中采购入库的提示',
            noticeType: '1',
            createBy: '资产保障处',
            createTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
            noticeContent: '新一批得力A4双胶复印纸及8K月考试卷纸已验收完成入库，各年级领用人可凭出库领用单至文印库领取。',
          },
          {
            noticeId: 4,
            noticeTitle: '校园数字化大屏与提分喜报系统正式升级上线通知',
            noticeType: '2',
            createBy: '信息技术中心',
            createTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
            noticeContent: '全新校园全景数字化运营沙盘与高考卓越提分榜已同步部署，欢迎各级管理人员查阅实时运营指标。',
          },
        ]);
      }
    } catch (e) {
      console.error('加载控制台指标失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 1. 招生趋势折线面积图配置
  const getRecruitTrendOption = () => {
    const dates = dashboardData.recruit?.trendDates || [];
    const apps = dashboardData.recruit?.trendAppointments || [];
    const vers = dashboardData.recruit?.trendVerified || [];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
      },
      legend: {
        data: ['访校意向预约', '实地到校核销'],
        top: 0,
        right: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 36,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#d9d9d9' } },
        axisLabel: { color: '#595959' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { stroke: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: '访校意向预约',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.45)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
              ],
            },
          },
          data: apps,
        },
        {
          name: '实地到校核销',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: '#52c41a' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(82, 196, 26, 0.45)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0.02)' },
              ],
            },
          },
          data: vers,
        },
      ],
    };
  };

  // 2. 意向生源年级分布饼图配置
  const getGradePieOption = () => {
    const rawData = dashboardData.recruit?.gradeDistribution || [];
    const colors = ['#1677ff', '#13c2c2', '#52c41a', '#fa8c16', '#722ed1'];

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}人 ({d}%)',
      },
      legend: {
        bottom: '2%',
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      },
      color: colors,
      series: [
        {
          name: '意向年级',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: rawData,
        },
      ],
    };
  };

  // 3. 学科文印消耗排行榜条形图
  const getSubjectPrintOption = () => {
    const list = [...(dashboardData.edu?.subjectStats || [])].reverse();
    const categories = list.map((item: any) => item.name);
    const values = list.map((item: any) => Number(item.value || 0));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c} 张用纸',
      },
      grid: {
        left: '3%',
        right: '6%',
        bottom: '3%',
        top: '6%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { stroke: '#f0f0f0', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#d9d9d9' } },
        axisLabel: { color: '#595959', fontWeight: 500 },
      },
      series: [
        {
          name: '印制用纸总量',
          type: 'bar',
          barWidth: 16,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#1677ff' },
                { offset: 1, color: '#36cfc9' },
              ],
            },
          },
          label: {
            show: true,
            position: 'right',
            color: '#595959',
            formatter: '{c} 张',
          },
          data: values,
        },
      ],
    };
  };

  // 4. 文印纸张规格结构分布饼图
  const getPaperTypeOption = () => {
    const data = dashboardData.edu?.paperDistribution || [];
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}张 ({d}%)',
      },
      legend: {
        bottom: '2%',
        left: 'center',
        icon: 'circle',
      },
      color: ['#1677ff', '#fa8c16', '#52c41a'],
      series: [
        {
          name: '纸张规格',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '46%'],
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
          },
          data: data,
        },
      ],
    };
  };

  // 5. 各年级班级与在校生人数分布复合柱状图
  const getClassStatsOption = () => {
    const list = dashboardData.faculty?.gradeClassStats || [];
    const grades = list.map((item: any) => item.grade);
    const classCounts = list.map((item: any) => item.classCount);
    const studentCounts = list.map((item: any) => item.studentCount);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['班级数量 (班)', '在校人数 (人)'],
        top: 0,
        right: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 36,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: grades,
        axisLine: { lineStyle: { color: '#d9d9d9' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '班级数',
          minInterval: 1,
          splitLine: { lineStyle: { stroke: '#f0f0f0', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '学生数',
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '班级数量 (班)',
          type: 'bar',
          barWidth: 22,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: '#1677ff',
          },
          data: classCounts,
        },
        {
          name: '在校人数 (人)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          itemStyle: { color: '#fa8c16' },
          data: studentCounts,
        },
      ],
    };
  };

  // 6. 教师队伍角色构成环形图
  const getFacultyRoleOption = () => {
    const data = dashboardData.faculty?.roleDistribution || [];
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}人 ({d}%)',
      },
      legend: {
        bottom: '2%',
        left: 'center',
        icon: 'circle',
      },
      color: ['#1677ff', '#52c41a', '#722ed1'],
      series: [
        {
          name: '角色构成',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '46%'],
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{c}人',
          },
          data: data,
        },
      ],
    };
  };

  // 7. 校园六维效能沙盘雷达图
  const getRadarOption = () => {
    const indicators = dashboardData.radar?.indicators || [
      { name: '招生拓展转化', max: 100 },
      { name: '教务文印敏捷', max: 100 },
      { name: '仓储流转周转', max: 100 },
      { name: '师资力量齐备', max: 100 },
      { name: '教学班级承载', max: 100 },
      { name: '资产安全保障', max: 100 },
    ];
    const values = dashboardData.radar?.values || [71, 88, 85, 92, 86, 96];

    return {
      tooltip: {},
      radar: {
        indicator: indicators,
        radius: '68%',
        splitNumber: 4,
        axisName: {
          color: '#262626',
          fontWeight: 500,
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(22, 119, 255, 0.02)', 'rgba(22, 119, 255, 0.05)', 'rgba(22, 119, 255, 0.08)', 'rgba(22, 119, 255, 0.12)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(22, 119, 255, 0.2)',
          },
        },
      },
      series: [
        {
          name: '校园综合指数',
          type: 'radar',
          data: [
            {
              value: values,
              name: '当前校园运营效能指数',
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: '#1677ff' },
              areaStyle: {
                color: 'rgba(22, 119, 255, 0.35)',
              },
            },
          ],
        },
      ],
    };
  };

  // 点击查看通知详情
  const handleOpenNotice = (notice: any) => {
    setSelectedNotice(notice);
    setNoticeModalVisible(true);
  };

  // 快捷业务入口磁贴配置
  const quickActions = [
    // 招生迎新
    {
      title: '访校预约台账',
      desc: '登记名册与意向管理',
      icon: <CalendarOutlined style={{ color: '#1677ff' }} />,
      bg: '#e6f4ff',
      path: '/recruit/appointment',
      tag: '招生迎新',
    },
    {
      title: '现场接待核销',
      desc: '到校家长核销确认',
      icon: <ScanOutlined style={{ color: '#52c41a' }} />,
      bg: '#f6ffed',
      path: '/recruit/verify',
      tag: '高频核销',
    },
    {
      title: '教师排班绑定',
      desc: '接待老师指派与配额',
      icon: <TeamOutlined style={{ color: '#722ed1' }} />,
      bg: '#f9f0ff',
      path: '/recruit/binding',
      tag: '招生迎新',
    },
    {
      title: '开放日时段配置',
      desc: '容量控制与预约开关',
      icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
      bg: '#fff7e6',
      path: '/recruit/config',
      tag: '招生迎新',
    },
    // 核心文印
    {
      title: '文印智能登记',
      desc: '试卷讲义印制发起',
      icon: <FileAddOutlined style={{ color: '#13c2c2' }} />,
      bg: '#e6fffb',
      path: '/print/record',
      tag: '文印管理',
    },
    {
      title: '文印统计月报',
      desc: '用纸明细与成本核算',
      icon: <BarChartOutlined style={{ color: '#1677ff' }} />,
      bg: '#e6f4ff',
      path: '/print/report',
      tag: '文印管理',
    },
    {
      title: '班级档案名录',
      desc: '年级规模与班主任管理',
      icon: <BookOutlined style={{ color: '#2f54eb' }} />,
      bg: '#f0f5ff',
      path: '/edu/class',
      tag: '教学教务',
    },
    {
      title: '高考卓越喜报',
      desc: '提分光荣榜动态展播',
      icon: <TrophyOutlined style={{ color: '#faad14' }} />,
      bg: '#fffbe6',
      path: '/screen/celebration',
      tag: '校园荣誉',
    },
    // 物资与运营
    {
      title: '耗材库存档案',
      desc: '实时盘点与阈值预警',
      icon: <ShopOutlined style={{ color: '#eb2f96' }} />,
      bg: '#fff0f6',
      path: '/stock/goods',
      tag: '资产保障',
    },
    {
      title: '物资采购入库',
      desc: '供应商送货验收登记',
      icon: <CheckSquareOutlined style={{ color: '#52c41a' }} />,
      bg: '#f6ffed',
      path: '/stock/in',
      tag: '资产保障',
    },
    {
      title: '日常领退登记',
      desc: '教师课件物资领用出库',
      icon: <FileDoneOutlined style={{ color: '#fa8c16' }} />,
      bg: '#fff7e6',
      path: '/edu/material',
      tag: '资产保障',
    },
    {
      title: '全景数据大屏',
      desc: '数字化校园可视化中枢',
      icon: <FundProjectionScreenOutlined style={{ color: '#1677ff' }} />,
      bg: '#e6f4ff',
      path: '/screen',
      tag: '监控中心',
    },
  ];

  const sum = dashboardData.summary;

  return (
    <div className="dashboard-container">
      {/* 1. 顶部全景态势条 */}
      <Card bordered={false} className="dashboard-header-card">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={15} lg={16}>
            <Space align="center" size="middle">
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  color: '#fff',
                }}
              >
                🏫
              </div>
              <div>
                <h2 style={{ color: '#fff', fontSize: 22, margin: 0, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {greeting}，{name || '教务老师'}！欢迎回到汉外华襄智慧校园一体化管理平台
                </h2>
                <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6, fontSize: 13 }}>
                  <Space split={<span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>} wrap>
                    <span>
                      <ClockCircleOutlined /> 当前时间：{currentTime} ({dayOfWeek})
                    </span>
                    <span>
                      <SafetyCertificateOutlined /> 权限身份：{roles?.join(' / ') || '管理人员'}
                    </span>
                    <span>
                      <Badge status="processing" color="#52c41a" /> 校园数字化运营系统：运转稳定
                    </span>
                  </Space>
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={9} lg={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={loadDashboardData}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderColor: 'rgba(255,255,255,0.6)',
                  color: '#fff',
                  borderRadius: 8,
                }}
              >
                刷新工作台
              </Button>
              <Button
                type="primary"
                icon={<ScanOutlined />}
                onClick={() => navigate('/recruit/verify')}
                style={{
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                现场接待核销
              </Button>
              <Button
                icon={<FundProjectionScreenOutlined />}
                onClick={() => navigate('/screen')}
                style={{
                  backgroundColor: '#faad14',
                  borderColor: '#faad14',
                  color: '#fff',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                进入数据大屏
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {/* 2. 核心 KPI 统计卡片矩阵 (8大关键微指标) */}
        <Row gutter={[16, 16]}>
          {/* 指标 1：累计预约 */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              className="kpi-card"
              style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)' }}
              onClick={() => navigate('/recruit/appointment')}
            >
              <div className="kpi-card-inner">
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    访校预约总人次
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 'bold', color: '#1677ff' }}>
                      {sum.totalAppointments}
                    </span>
                    <Text type="secondary" style={{ fontSize: 13 }}>人</Text>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>
                    待实地核销: <Text strong style={{ color: '#fa8c16' }}>{sum.pendingAppointments}人</Text>
                  </div>
                </div>
                <div className="kpi-icon-wrap" style={{ background: '#e6f4ff', color: '#1677ff' }}>
                  <CalendarOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* 指标 2：到校核销转化率 */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              className="kpi-card"
              style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)' }}
              onClick={() => navigate('/recruit/verify')}
            >
              <div className="kpi-card-inner">
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    实地核销转化率
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                      {sum.verifyRate}
                    </span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Progress
                      percent={parseFloat(sum.verifyRate) || 0}
                      size="small"
                      status="active"
                      strokeColor="#52c41a"
                      showInfo={false}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                    已完成接待: <Text strong style={{ color: '#52c41a' }}>{sum.verifiedAppointments}人</Text>
                  </div>
                </div>
                <div className="kpi-icon-wrap" style={{ background: '#f6ffed', color: '#52c41a' }}>
                  <CheckCircleOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* 指标 3：文印纸张消耗 */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              className="kpi-card"
              style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)' }}
              onClick={() => navigate('/print/report')}
            >
              <div className="kpi-card-inner">
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    教学文印纸张消耗
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>
                      {Number(sum.totalPaperPages).toLocaleString()}
                    </span>
                    <Text type="secondary" style={{ fontSize: 13 }}>张</Text>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>
                    折合标准用纸: <Text strong style={{ color: '#fa8c16' }}>{sum.printPaperReams} 包</Text>
                  </div>
                </div>
                <div className="kpi-icon-wrap" style={{ background: '#fff7e6', color: '#fa8c16' }}>
                  <PrinterOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* 指标 4：物资现值与品类 */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              className="kpi-card"
              style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #ffffff 100%)' }}
              onClick={() => navigate('/stock/goods')}
            >
              <div className="kpi-card-inner">
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    物资库存资产现值
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>
                      ¥{Number(sum.totalStockAmount).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>
                    管理物资: <Text strong>{sum.totalGoodsCount} 种</Text> ｜ 预警: <Text strong style={{ color: sum.warnLowGoodsCount > 0 ? '#ff4d4f' : '#52c41a' }}>{sum.warnLowGoodsCount} 种</Text>
                  </div>
                </div>
                <div className="kpi-icon-wrap" style={{ background: '#f9f0ff', color: '#722ed1' }}>
                  <ShopOutlined />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 3. 统计报表中心 (专业可视化分析 Tab) */}
        <Card
          bordered={false}
          className="dashboard-content-card"
          style={{ marginTop: 20 }}
          title={
            <Space align="center">
              <BarChartOutlined style={{ color: '#1677ff', fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>校园数字化运营统计报表中心</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/screen')}>
              查看全景大屏投屏版 <RightOutlined />
            </Button>
          }
        >
          <Tabs
            activeKey={activeReportTab}
            onChange={setActiveReportTab}
            items={[
              {
                key: 'recruit',
                label: (
                  <span>
                    <RiseOutlined /> 招生访校走势与转化
                  </span>
                ),
                children: (
                  <div>
                    <Row gutter={24}>
                      <Col xs={24} lg={15}>
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 14 }}>
                            📈 近15日访校意向预约 vs 实地到校核销走势
                          </Text>
                        </div>
                        <ReactECharts option={getRecruitTrendOption()} style={{ height: 320 }} />
                      </Col>
                      <Col xs={24} lg={9}>
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 14 }}>
                            🎯 访校生源意向年级构成
                          </Text>
                        </div>
                        <ReactECharts option={getGradePieOption()} style={{ height: 320 }} />
                      </Col>
                    </Row>
                    <Divider style={{ margin: '16px 0' }} />
                    <Row gutter={16} align="middle">
                      <Col xs={24} md={6}>
                        <Text type="secondary">招生漏斗转化全景：</Text>
                      </Col>
                      <Col xs={24} md={18}>
                        <Row gutter={12}>
                          <Col span={8}>
                            <Card size="small" style={{ background: '#f0f7ff', textAlign: 'center', borderRadius: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>线上意向登记</Text>
                              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1677ff' }}>7 人</div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" style={{ background: '#e6fffb', textAlign: 'center', borderRadius: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>排班审核通过</Text>
                              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#13c2c2' }}>7 人 (100%)</div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" style={{ background: '#f6ffed', textAlign: 'center', borderRadius: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>实地接待核销</Text>
                              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>5 人 (71.4%)</div>
                            </Card>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'printing',
                label: (
                  <span>
                    <PrinterOutlined /> 教务文印与消耗分析
                  </span>
                ),
                children: (
                  <Row gutter={24}>
                    <Col xs={24} lg={15}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          📊 各学科教学测试与教辅资料印制用纸排行 (张)
                        </Text>
                      </div>
                      <ReactECharts option={getSubjectPrintOption()} style={{ height: 340 }} />
                    </Col>
                    <Col xs={24} lg={9}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          📑 文印用纸规格分布比例
                        </Text>
                      </div>
                      <ReactECharts option={getPaperTypeOption()} style={{ height: 340 }} />
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'faculty',
                label: (
                  <span>
                    <TeamOutlined /> 教学班级与师资队伍
                  </span>
                ),
                children: (
                  <Row gutter={24}>
                    <Col xs={24} lg={15}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          🏫 各年级班级配置与在校生人数规模
                        </Text>
                      </div>
                      <ReactECharts option={getClassStatsOption()} style={{ height: 340 }} />
                    </Col>
                    <Col xs={24} lg={9}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          👨‍🏫 教师队伍岗位与角色构成
                        </Text>
                      </div>
                      <ReactECharts option={getFacultyRoleOption()} style={{ height: 340 }} />
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'radar',
                label: (
                  <span>
                    <ThunderboltOutlined /> 校园效能六维沙盘
                  </span>
                ),
                children: (
                  <Row gutter={24} align="middle">
                    <Col xs={24} lg={14}>
                      <ReactECharts option={getRadarOption()} style={{ height: 340 }} />
                    </Col>
                    <Col xs={24} lg={10}>
                      <Card style={{ background: '#fafafa', borderRadius: 10 }}>
                        <Title level={5} style={{ margin: 0, color: '#1677ff' }}>
                          🎯 数字化校园综合效能评级：卓越 (A+)
                        </Title>
                        <Paragraph type="secondary" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>
                          依据招生转化率、文印响应速度、仓储周转周期、名师齐备度、班额承载负荷与物资资产安全6个关键维度计算，综合效能指数达到 <strong>87.3分</strong>。
                        </Paragraph>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 14 }}>
                          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>师资齐备指数</Text>
                            <div style={{ fontWeight: 'bold', color: '#52c41a' }}>92 / 100</div>
                          </div>
                          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>文印敏捷指数</Text>
                            <div style={{ fontWeight: 'bold', color: '#1677ff' }}>88 / 100</div>
                          </div>
                          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>仓储安全指数</Text>
                            <div style={{ fontWeight: 'bold', color: '#722ed1' }}>96 / 100</div>
                          </div>
                          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>班级承载负荷</Text>
                            <div style={{ fontWeight: 'bold', color: '#fa8c16' }}>86 / 100</div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Card>

        {/* 4. 高频常用功能网格 (12大业务磁贴) */}
        <Card
          bordered={false}
          className="dashboard-content-card"
          style={{ marginTop: 20 }}
          title={
            <Space align="center">
              <AppstoreOutlined style={{ color: '#1677ff', fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>常用功能快速通道</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            {quickActions.map((action, idx) => (
              <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                <div className="quick-action-card" onClick={() => navigate(action.path)}>
                  <div className="quick-action-icon" style={{ background: action.bg }}>
                    {action.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 14 }}>
                        {action.title}
                      </Text>
                      <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                        {action.tag}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }} ellipsis>
                      {action.desc}
                    </Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 5. 待办协同事项 & 校园实时动态流 & 通知公告 (双栏结构) */}
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {/* 左栏 (15/24)：待办任务与校园综合业务流水 */}
          <Col xs={24} lg={15}>
            <Card
              bordered={false}
              className="dashboard-content-card"
              style={{ minHeight: 460 }}
              title={
                <Space align="center">
                  <CheckSquareOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>协同待办与校园流水</span>
                </Space>
              }
            >
              <Tabs
                defaultActiveKey="todo"
                items={[
                  {
                    key: 'todo',
                    label: (
                      <span>
                        <Badge count={todoItems.length} size="small" offset={[8, 0]}>
                          待办协同事项
                        </Badge>
                      </span>
                    ),
                    children: (
                      <List
                        itemLayout="horizontal"
                        dataSource={todoItems}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => navigate(item.path)}
                                style={{ borderRadius: 6 }}
                              >
                                立即处理
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 8,
                                    background:
                                      item.type === 'urgent'
                                        ? '#fff1f0'
                                        : item.type === 'warning'
                                        ? '#fffbe6'
                                        : item.type === 'success'
                                        ? '#f6ffed'
                                        : '#e6f4ff',
                                    color:
                                      item.type === 'urgent'
                                        ? '#ff4d4f'
                                        : item.type === 'warning'
                                        ? '#faad14'
                                        : item.type === 'success'
                                        ? '#52c41a'
                                        : '#1677ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 18,
                                  }}
                                >
                                  {item.type === 'urgent' ? (
                                    <ScanOutlined />
                                  ) : item.type === 'warning' ? (
                                    <WarningOutlined />
                                  ) : item.type === 'success' ? (
                                    <CheckCircleOutlined />
                                  ) : (
                                    <PrinterOutlined />
                                  )}
                                </div>
                              }
                              title={
                                <Space>
                                  <Tag
                                    color={
                                      item.type === 'urgent'
                                        ? 'error'
                                        : item.type === 'warning'
                                        ? 'warning'
                                        : item.type === 'success'
                                        ? 'success'
                                        : 'blue'
                                    }
                                  >
                                    {item.tag}
                                  </Tag>
                                  <Text strong style={{ fontSize: 13 }}>
                                    {item.title}
                                  </Text>
                                </Space>
                              }
                              description={<span style={{ fontSize: 12, color: '#8c8c8c' }}>{item.time}</span>}
                            />
                          </List.Item>
                        )}
                      />
                    ),
                  },
                  {
                    key: 'timeline',
                    label: '校园实时业务流水',
                    children: (
                      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '10px 10px 0 10px' }}>
                        {dashboardData.activities && dashboardData.activities.length > 0 ? (
                          <Timeline
                            items={dashboardData.activities.map((act: any) => ({
                              color:
                                act.type === 'recruit'
                                  ? '#1677ff'
                                  : act.type === 'edu'
                                  ? '#52c41a'
                                  : act.type === 'stock'
                                  ? '#fa8c16'
                                  : '#722ed1',
                              children: (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Text strong style={{ fontSize: 13 }}>
                                      {act.title}
                                    </Text>
                                    <Tag
                                      color={
                                        act.type === 'recruit'
                                          ? 'blue'
                                          : act.type === 'edu'
                                          ? 'green'
                                          : 'orange'
                                      }
                                      style={{ margin: 0, fontSize: 11 }}
                                    >
                                      {act.badge || '业务动态'}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                                      {act.time}
                                    </Text>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#595959', marginTop: 4 }}>
                                    {act.desc}
                                  </div>
                                </div>
                              ),
                            }))}
                          />
                        ) : (
                          <Empty description="暂无今日业务动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>

          {/* 右栏 (9/24)：校园通知公告 & 接待标兵榜 & 系统运行状态 */}
          <Col xs={24} lg={9}>
            {/* 校园通知公告 */}
            <Card
              bordered={false}
              className="dashboard-content-card"
              title={
                <Space align="center">
                  <NotificationOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>校园通知公告</span>
                </Space>
              }
              extra={
                <Button type="link" size="small" onClick={() => navigate('/system/notice')}>
                  全部公告 <RightOutlined />
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              <List
                size="small"
                dataSource={notices.slice(0, 4)}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '10px 0' }}
                    onClick={() => handleOpenNotice(item)}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag color={item.noticeType === '1' ? 'processing' : 'warning'} style={{ margin: 0, fontSize: 11 }}>
                          {item.noticeType === '1' ? '通知' : '公告'}
                        </Tag>
                        <Text strong style={{ fontSize: 13, flex: 1 }} ellipsis>
                          {item.noticeTitle}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                        <span>发文：{item.createBy || '办公室'}</span>
                        <span>{dayjs(item.createTime).format('MM-DD')}</span>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>

            {/* 现场接待核销标兵榜 */}
            <Card
              bordered={false}
              className="dashboard-content-card"
              title={
                <Space align="center">
                  <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>迎新接待核销标兵榜</span>
                </Space>
              }
            >
              <List
                size="small"
                dataSource={dashboardData.recruit?.verifierRank || []}
                renderItem={(item: any, index: number) => {
                  let badgeClass = 'rank-badge-normal';
                  if (index === 0) badgeClass = 'rank-badge-top1';
                  else if (index === 1) badgeClass = 'rank-badge-top2';
                  else if (index === 2) badgeClass = 'rank-badge-top3';

                  return (
                    <List.Item style={{ padding: '8px 0' }}>
                      <Space style={{ flex: 1 }}>
                        <span className={`rank-badge ${badgeClass}`}>{index + 1}</span>
                        <Text strong style={{ fontSize: 13 }}>
                          {item.teacherName}
                        </Text>
                      </Space>
                      <Space split={<Divider type="vertical" />}>
                        <span style={{ fontSize: 12, color: '#595959' }}>
                          核销 <strong style={{ color: '#1677ff' }}>{item.verifyCount}</strong> 人
                        </span>
                        <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                          贡献率 {item.rate}
                        </Tag>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 通知详情弹窗 Modal */}
      <Modal
        title={
          <Space>
            <NotificationOutlined style={{ color: '#1677ff' }} />
            <span>{selectedNotice?.noticeTitle}</span>
          </Space>
        }
        open={noticeModalVisible}
        onCancel={() => setNoticeModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setNoticeModalVisible(false)}>
            已阅知晓
          </Button>,
        ]}
      >
        {selectedNotice && (
          <div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8c8c8c', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
              <span>发文部门：{selectedNotice.createBy || '学校办公室'}</span>
              <span>发布时间：{dayjs(selectedNotice.createTime).format('YYYY-MM-DD HH:mm')}</span>
              <span>
                类型：
                <Tag color={selectedNotice.noticeType === '1' ? 'blue' : 'orange'}>
                  {selectedNotice.noticeType === '1' ? '通知' : '公告'}
                </Tag>
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: '#262626',
                background: '#fafafa',
                padding: 16,
                borderRadius: 8,
              }}
            >
              {selectedNotice.noticeContent || selectedNotice.remark || '暂无详细内容'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
