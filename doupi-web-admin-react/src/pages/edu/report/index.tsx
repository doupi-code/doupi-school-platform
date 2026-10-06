import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Button,
  Empty,
  Spin,
  Tag,
  Typography,
  Tabs,
  DatePicker,
  Select,
  Radio,
  Tooltip,
  Badge,
  Progress,
  Divider,
  Descriptions,
  Image,
  Modal,
  Form,
  Input,
  Alert,
} from 'antd';
import {
  PrinterOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  ReloadOutlined,
  PlusOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  SearchOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  UserOutlined,
  PaperClipOutlined,
  CameraOutlined,
  BookOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { getPrintReport } from '@/api/edu/report';
import { listRecord } from '@/api/edu/record';
import { listTeacher } from '@/api/edu/teacher';
import { getDicts } from '@/api/system/dict';
import { downloadExcel } from '@/utils/download';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PrintLedgerReportPage: React.FC = () => {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(undefined);
  const [filterForm] = Form.useForm();

  // 活跃选项卡
  const [activeTab, setActiveTab] = useState<string>('ledger');

  // 全局加载状态
  const [reportLoading, setReportLoading] = useState(false);
  const [teacherList, setTeacherList] = useState<any[]>([]);

  // 快捷日期范围
  const [quickDate, setQuickDate] = useState<string>('all');

  // 当前筛选条件缓存（用于图表与明细联动）
  const [queryParams, setQueryParams] = useState<any>({
    status: '', // 空表示全部有效（排除作废）
    grade: undefined,
    paperType: undefined,
    teacherId: undefined,
    printName: undefined,
    params: {
      excludeCancelled: 'true',
    },
  });

  // 汇总大屏指标
  const [summary, setSummary] = useState({
    totalJobs: 0,
    totalPrintCount: 0,
    totalPages: 0,
    completedJobs: 0,
    completedPrintCount: 0,
    completedPages: 0,
    pendingJobs: 0,
    pendingPrintCount: 0,
    pendingPages: 0,
    cancelledJobs: 0,
    cancelledPages: 0,
    totalReams: 0,
    totalCost: 0,
    unitPrice: 0.06,
    sheetsPerReam: 500,
  });

  // 动态数据字典（消除下拉 Option 硬编码）
  const [gradeOptions, setGradeOptions] = useState<any[]>([]);
  const [paperTypeOptions, setPaperTypeOptions] = useState<any[]>([]);

  // 维度报表数据
  const [gradeStats, setGradeStats] = useState<any[]>([]);
  const [paperStats, setPaperStats] = useState<any[]>([]);
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  // 凭证明细弹窗
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // 初始化加载教师列表及数据字典
  useEffect(() => {
    listTeacher({ pageSize: 200 }).then((res: any) => {
      if (res && res.code === 200) {
        setTeacherList(res.rows || []);
      }
    }).catch(() => {});

    getDicts('grade').then((res: any) => {
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setGradeOptions(res.data);
      }
    }).catch(() => {});

    getDicts('paper_type').then((res: any) => {
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setPaperTypeOptions(res.data);
      }
    }).catch(() => {});
  }, []);

  // 数字转中文大写金额函数（财会凭证专用）
  const digitUppercase = (n: number) => {
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [
      ['元', '万', '亿'],
      ['', '拾', '佰', '仟'],
    ];
    let num = Math.abs(n);
    let s = '';
    for (let i = 0; i < fraction.length; i++) {
      s += (digit[Math.floor(num * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    num = Math.floor(num);
    for (let i = 0; i < unit[0].length && num > 0; i++) {
      let p = '';
      for (let j = 0; j < unit[1].length && num > 0; j++) {
        p = digit[num % 10] + unit[1][j] + p;
        num = Math.floor(num / 10);
      }
      s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  };

  // 打印记账凭证
  const handlePrintVoucher = () => {
    const printArea = document.getElementById('voucher-print-area');
    if (!printArea) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>文印耗材领用记账凭证</title>
          <style>
            body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; padding: 20px; color: #222; }
            .voucher-card { border: 2px solid #333; padding: 20px 24px; max-width: 720px; margin: 0 auto; background: #fff; }
            .voucher-title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 2px; }
            .voucher-sub { text-align: center; font-size: 13px; color: #666; margin-bottom: 16px; border-bottom: 1px dashed #999; padding-bottom: 8px; }
            .meta-bar { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; color: #555; }
            table.voucher-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            table.voucher-table th, table.voucher-table td { border: 1px solid #333; padding: 6px 10px; font-size: 12px; }
            table.voucher-table th { background: #f4f4f4; text-align: center; font-weight: 600; }
            .sign-bar { display: flex; justify-content: space-between; margin-top: 24px; font-size: 12px; padding-top: 10px; border-top: 1px solid #ddd; }
            @media print {
              body { padding: 0; }
              .voucher-card { border: 2px solid #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // 加载报表汇总统计与维度分布
  const loadReportData = async (params: any = queryParams) => {
    setReportLoading(true);
    try {
      // 组装查询参数
      const reqQuery: any = {};
      if (params.status) reqQuery.status = params.status;
      if (params.grade) reqQuery.grade = params.grade;
      if (params.paperType) reqQuery.paperType = params.paperType;
      if (params.teacherId) reqQuery.teacherId = params.teacherId;
      if (params.printName) reqQuery.printName = params.printName;
      if (params.params?.excludeCancelled) reqQuery['params[excludeCancelled]'] = params.params.excludeCancelled;
      if (params.params?.beginTime) reqQuery['params[beginTime]'] = params.params.beginTime;
      if (params.params?.endTime) reqQuery['params[endTime]'] = params.params.endTime;

      const res: any = await getPrintReport(reqQuery);
      if (res && res.code === 200 && res.data) {
        const sum = res.data.summary || {};
        const cJobs = Number(sum.completedJobs ?? sum.totalJobs ?? 0);
        const cPrints = Number(sum.completedPrintCount ?? sum.totalPrintCount ?? 0);
        const cPages = Number(sum.completedPages ?? sum.totalPages ?? 0);
        const pJobs = Number(sum.pendingJobs ?? 0);
        const pPrints = Number(sum.pendingPrintCount ?? 0);
        const pPages = Number(sum.pendingPages ?? 0);
        const canJobs = Number(sum.cancelledJobs ?? 0);
        const canPages = Number(sum.cancelledPages ?? 0);

        // 如果用户主动按“作废”筛选，则消耗量对齐作废，否则展示实际已完成印刷的消耗量
        const isQueryCancelled = params.status === '2';
        const isQueryPending = params.status === '0';
        const displayPages = isQueryCancelled ? canPages : (isQueryPending ? pPages : (params.status === '1' ? cPages : cPages));
        const displayPrints = isQueryCancelled ? 0 : (isQueryPending ? pPrints : (params.status === '1' ? cPrints : cPrints));
        const displayJobs = isQueryCancelled ? canJobs : (isQueryPending ? pJobs : (params.status === '1' ? cJobs : cJobs));
        const unitPrice = Number(sum.unitPrice ?? 0.06);
        const sheetsPerReam = Number(sum.sheetsPerReam ?? 500);
        const reams = Number((displayPages / sheetsPerReam).toFixed(1));
        const cost = Number((displayPages * unitPrice).toFixed(2));

        setSummary({
          totalJobs: displayJobs,
          totalPrintCount: displayPrints,
          totalPages: displayPages,
          completedJobs: cJobs,
          completedPrintCount: cPrints,
          completedPages: cPages,
          pendingJobs: pJobs,
          pendingPrintCount: pPrints,
          pendingPages: pPages,
          cancelledJobs: canJobs,
          cancelledPages: canPages,
          totalReams: reams,
          totalCost: cost,
          unitPrice,
          sheetsPerReam,
        });

        setGradeStats(Array.isArray(res.data.gradeStats) ? res.data.gradeStats : []);
        setPaperStats(Array.isArray(res.data.paperTypeStats) ? res.data.paperTypeStats : []);
        setTeacherStats(Array.isArray(res.data.teacherStats) ? res.data.teacherStats : []);
        setMonthlyTrends(Array.isArray(res.data.monthlyTrends) ? res.data.monthlyTrends : []);
      }
    } catch (e) {
      console.error('获取文印统计报表异常:', e);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(queryParams);
  }, []);

  // 快捷时间切换
  const handleQuickDateChange = (val: string) => {
    setQuickDate(val);
    const now = dayjs();
    let beginTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;

    if (val === 'today') {
      beginTime = now.format('YYYY-MM-DD');
      endTime = now.format('YYYY-MM-DD');
    } else if (val === 'week') {
      beginTime = now.startOf('week').format('YYYY-MM-DD');
      endTime = now.endOf('week').format('YYYY-MM-DD');
    } else if (val === 'month') {
      beginTime = now.startOf('month').format('YYYY-MM-DD');
      endTime = now.endOf('month').format('YYYY-MM-DD');
    } else if (val === 'term') {
      // 当前学期：秋季学期为9月1日到次年1月31日，春季学期为2月1日到8月31日
      const m = now.month() + 1;
      if (m >= 9 || m === 1) {
        const year = m === 1 ? now.year() - 1 : now.year();
        beginTime = `${year}-09-01`;
        endTime = `${year + 1}-01-31`;
      } else {
        beginTime = `${now.year()}-02-01`;
        endTime = `${now.year()}-08-31`;
      }
    }

    if (beginTime && endTime) {
      filterForm.setFieldsValue({ dateRange: [dayjs(beginTime), dayjs(endTime)] });
    } else {
      filterForm.setFieldsValue({ dateRange: undefined });
    }

    const nextParams = {
      ...queryParams,
      params: {
        ...queryParams.params,
        beginTime,
        endTime,
      },
    };
    setQueryParams(nextParams);
    loadReportData(nextParams);
    actionRef.current?.reload();
  };

  // 表单查询
  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    const dateRange = values.dateRange;
    let beginTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;
    if (dateRange && dateRange[0] && dateRange[1]) {
      beginTime = dateRange[0].format('YYYY-MM-DD');
      endTime = dateRange[1].format('YYYY-MM-DD');
    }

    // 状态处理
    let statusVal = values.status;
    let excludeCancelled = 'true';
    if (statusVal === 'ALL') {
      statusVal = '';
      excludeCancelled = 'false'; // 查看全部包含作废
    } else if (statusVal === '2') {
      excludeCancelled = 'false'; // 专门查作废
    } else if (!statusVal) {
      excludeCancelled = 'true'; // 默认全部有效（排除作废）
    }

    const nextParams = {
      printName: values.printName || undefined,
      grade: values.grade || undefined,
      paperType: values.paperType || undefined,
      teacherId: values.teacherId || undefined,
      status: statusVal || undefined,
      params: {
        excludeCancelled,
        beginTime,
        endTime,
      },
    };

    setQueryParams(nextParams);
    loadReportData(nextParams);
    actionRef.current?.reload();
  };

  // 重置筛选
  const handleReset = () => {
    filterForm.resetFields();
    setQuickDate('all');
    const defaultParams = {
      status: '',
      grade: undefined,
      paperType: undefined,
      teacherId: undefined,
      printName: undefined,
      params: {
        excludeCancelled: 'true',
      },
    };
    setQueryParams(defaultParams);
    loadReportData(defaultParams);
    actionRef.current?.reload();
  };

  // 导出台账 Excel
  const handleExport = () => {
    const exportQuery: any = {};
    if (queryParams.printName) exportQuery.printName = queryParams.printName;
    if (queryParams.grade) exportQuery.grade = queryParams.grade;
    if (queryParams.paperType) exportQuery.paperType = queryParams.paperType;
    if (queryParams.teacherId) exportQuery.teacherId = queryParams.teacherId;
    if (queryParams.status) exportQuery.status = queryParams.status;
    if (queryParams.params?.excludeCancelled) exportQuery['params[excludeCancelled]'] = queryParams.params.excludeCancelled;
    if (queryParams.params?.beginTime) exportQuery['params[beginTime]'] = queryParams.params.beginTime;
    if (queryParams.params?.endTime) exportQuery['params[endTime]'] = queryParams.params.endTime;

    downloadExcel('/edu/record/export', exportQuery, `文印耗材用量流水明细台账_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  };

  // 年级耗纸量柱状图配置
  const getGradeBarOption = () => {
    const dataList = gradeStats && gradeStats.length > 0 ? gradeStats : [];
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          const p = params[0];
          const item = dataList[p.dataIndex] || {};
          return `<div style="font-weight:bold;margin-bottom:4px;">${p.name}</div>
                  <div>实际耗纸量: <strong>${Number(p.value).toLocaleString()}</strong> 张</div>
                  <div>印制总份数: <strong>${item.totalPrintCount || 0}</strong> 份</div>
                  <div>文印批次: <strong>${item.jobCount || 0}</strong> 次</div>
                  <div>折合成本: <strong>¥ ${(Number(p.value) * summary.unitPrice).toFixed(2)}</strong> 元</div>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dataList.map((d) => d.grade || '全校通用'),
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value',
        name: '耗纸量 (张)',
      },
      series: [
        {
          name: '耗纸量',
          type: 'bar',
          barWidth: '35%',
          data: dataList.map((d) => Number(d.totalPages || 0)),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1677FF' },
                { offset: 1, color: '#69B1FF' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c} 张',
            color: '#1677FF',
            fontWeight: 'bold',
          },
        },
      ],
    };
  };

  // 纸张规格环形占比图配置
  const getPaperPieOption = () => {
    const dataList = paperStats && paperStats.length > 0 ? paperStats : [];
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: <strong>{c} 张</strong> ({d}%)',
      },
      legend: {
        bottom: '0%',
        left: 'center',
      },
      series: [
        {
          name: '规格耗量',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
          },
          data: dataList.map((item, index) => {
            const colors = ['#1677FF', '#52C41A', '#FA8C16', '#722ED1', '#13C2C2', '#F5222D'];
            return {
              value: Number(item.totalPages || 0),
              name: item.paperType || '通用规格',
              itemStyle: { color: colors[index % colors.length] },
            };
          }),
        },
      ],
    };
  };

  // 近6个月文印趋势图配置
  const getMonthlyTrendOption = () => {
    const dataList = monthlyTrends && monthlyTrends.length > 0 ? monthlyTrends : [];
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dataList.map((d) => d.month),
      },
      yAxis: {
        type: 'value',
        name: '耗纸量 (张)',
      },
      series: [
        {
          name: '文印耗纸量',
          type: 'line',
          smooth: true,
          data: dataList.map((d) => Number(d.totalPages || 0)),
          itemStyle: { color: '#52C41A' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(82, 196, 26, 0.4)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  };

  // 台账明细流水表格列定义
  const ledgerColumns: ProColumns[] = [
    {
      title: '台账单号',
      dataIndex: 'printId',
      width: 90,
      render: (_, r) => <Text copyable={{ text: String(r.printId) }}>#{r.printId}</Text>,
    },
    {
      title: '文印资料名称',
      dataIndex: 'printName',
      ellipsis: true,
      minWidth: 190,
      render: (_, r) => {
        const name: string = r.printName || '-';
        let prefixTag = null;
        let displayName = name;
        if (name.startsWith('[试卷]')) {
          prefixTag = (
            <Tag color="processing" style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
              试卷
            </Tag>
          );
          displayName = name.replace(/^\[试卷\]\s*/, '');
        } else if (name.startsWith('[答案]')) {
          prefixTag = (
            <Tag color="success" style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
              答案
            </Tag>
          );
          displayName = name.replace(/^\[答案\]\s*/, '');
        }
        return (
          <Space direction="vertical" size={2}>
            <Space size={4}>
              {prefixTag}
              <Text strong style={{ color: r.status === '2' ? '#999' : '#1677FF' }}>
                {displayName}
              </Text>
            </Space>
            {r.remark && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                备注: {r.remark}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '关联出库单',
      dataIndex: 'outNo',
      width: 130,
      render: (_, r) => {
        if (!r.outNo) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }
        return (
          <Tag color="cyan" style={{ fontFamily: 'monospace' }}>
            {r.outNo}
          </Tag>
        );
      },
    },
    {
      title: '领用年级/班级',
      dataIndex: 'grade',
      width: 120,
      render: (_, r) => (
        <span>
          <Tag color="cyan">{r.grade || '全校'}</Tag>
          {r.className && <Tag color="blue">{r.className}</Tag>}
        </span>
      ),
    },
    {
      title: '申请教师',
      dataIndex: 'teacherName',
      width: 110,
      render: (_, r) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#1677FF' }} />
          <span>{r.teacherName || '系统经办'}</span>
        </Space>
      ),
    },
    {
      title: '纸张规格',
      dataIndex: 'paperType',
      width: 90,
      render: (_, r) => <Tag color="purple">{r.paperType || 'A4'}</Tag>,
    },
    {
      title: '排版',
      dataIndex: 'printSide',
      width: 90,
      render: (_, r) => (
        <Tag color={r.printSide === '2' ? 'orange' : 'default'}>
          {r.printSide === '2' ? '双面' : '单面'}
        </Tag>
      ),
    },
    {
      title: '每份页数',
      dataIndex: 'pageCount',
      width: 80,
      align: 'right',
      render: (_, r) => `${r.pageCount || 1} 页`,
    },
    {
      title: '印制份数',
      dataIndex: 'printCount',
      width: 90,
      align: 'right',
      render: (_, r) => <strong>{r.printCount} 份</strong>,
    },
    {
      title: '总耗纸量',
      dataIndex: 'totalPages',
      width: 110,
      align: 'right',
      render: (_, r) => {
        if (r.status === '2') {
          return (
            <Tooltip title="该登记已作废，纸张已自动回退库存，不计入有效耗用">
              <Text delete type="danger">
                {r.totalPages} 张
              </Text>
            </Tooltip>
          );
        }
        return (
          <Text strong style={{ color: '#52C41A', fontSize: 15 }}>
            {r.totalPages} 张
          </Text>
        );
      },
    },
    {
      title: '折合成本',
      dataIndex: 'cost',
      width: 100,
      align: 'right',
      render: (_, r) => {
        const cost = (Number(r.totalPages || 0) * summary.unitPrice).toFixed(2);
        if (r.status === '2') {
          return <Text delete type="secondary">¥ {cost}</Text>;
        }
        return <Text style={{ color: '#FA8C16', fontWeight: 500 }}>¥ {cost}</Text>;
      },
    },
    {
      title: '印刷时间',
      dataIndex: 'printTime',
      valueType: 'date',
      width: 110,
    },
    {
      title: '台账状态',
      dataIndex: 'status',
      width: 100,
      render: (_, r) => {
        if (r.status === '1') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
        }
        if (r.status === '2') {
          return <Tag color="error" icon={<StopOutlined />}>已作废</Tag>;
        }
        return <Tag color="processing" icon={<ClockCircleOutlined />}>待印刷</Tag>;
      },
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 100,
      ellipsis: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedRecord(record);
            setDetailModalOpen(true);
          }}
        >
          凭证
        </Button>,
      ],
    },
  ];

  // 全校总耗纸（用于计算各年级占比）
  const totalSchoolPages = useMemo(() => {
    return gradeStats.reduce((acc, cur) => acc + Number(cur.totalPages || 0), 0);
  }, [gradeStats]);

  return (
    <PageContainer
      header={{
        title: '文印耗材用量统计台账',
        subTitle: '全校教学试卷、复习讲义及行政文印耗材消耗核算、流水明细与多维审计台账',
        extra: [
          <Space key="actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadReportData(queryParams);
                actionRef.current?.reload();
              }}
              loading={reportLoading}
            >
              刷新台账
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出台账 Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/print/record')}
            >
              录入文印登记
            </Button>
          </Space>,
        ],
      }}
    >
      {/* 顶部高级检索与时间跨度选择栏 */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={filterForm} layout="inline" style={{ rowGap: 12 }}>
          <Form.Item label="快捷时间">
            <Radio.Group
              value={quickDate}
              onChange={(e) => handleQuickDateChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">全部时间</Radio.Button>
              <Radio.Button value="today">今日</Radio.Button>
              <Radio.Button value="week">本周</Radio.Button>
              <Radio.Button value="month">本月</Radio.Button>
              <Radio.Button value="term">本学期</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="dateRange" label="印刷日期范围">
            <RangePicker style={{ width: 240 }} />
          </Form.Item>

          <Form.Item name="grade" label="所属年级">
            <Select placeholder="全部年级" allowClear style={{ width: 120 }}>
              {gradeOptions && gradeOptions.length > 0
                ? gradeOptions.map((item) => (
                    <Option key={item.dictValue} value={item.dictValue}>
                      {item.dictLabel}
                    </Option>
                  ))
                : ['高一', '高二', '高三', '高中部', '复读部', '初中部', '全校通用'].map((g) => (
                    <Option key={g} value={g}>{g}</Option>
                  ))}
            </Select>
          </Form.Item>

          <Form.Item name="paperType" label="纸张规格">
            <Select placeholder="全部规格" allowClear style={{ width: 110 }}>
              {paperTypeOptions && paperTypeOptions.length > 0
                ? paperTypeOptions.map((item) => (
                    <Option key={item.dictValue} value={item.dictValue}>
                      {item.dictLabel}
                    </Option>
                  ))
                : ['A4', 'A3', '8K', '16K', 'B5'].map((p) => (
                    <Option key={p} value={p}>{p}</Option>
                  ))}
            </Select>
          </Form.Item>

          <Form.Item name="teacherId" label="申请教师">
            <Select
              placeholder="搜索申请教师"
              allowClear
              showSearch
              filterOption={(input, option: any) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: 140 }}
            >
              {teacherList.map((t) => (
                <Option key={t.teacherId} value={t.teacherId}>
                  {t.teacherName} ({t.subject || '通用'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="台账状态" initialValue="">
            <Select style={{ width: 150 }}>
              <Option value="">有效台账 (排除作废)</Option>
              <Option value="1">仅已完成 (实际消耗)</Option>
              <Option value="0">待印刷 (预约排队)</Option>
              <Option value="2">已作废 (冲销回退)</Option>
              <Option value="ALL">全部流水 (含作废)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="printName" label="资料名称">
            <Input placeholder="输入试卷/资料名称关键字" allowClear style={{ width: 180 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询台账
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 核心财务与资产级指标卡片 */}
      <Spin spinning={reportLoading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={4} style={{ flex: '1 1 20%' }}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #F0F5FF 0%, #FFFFFF 100%)' }}>
              <Statistic
                title="实际印刷总耗纸"
                value={summary.totalPages}
                suffix="张"
                prefix={<FileTextOutlined style={{ color: '#1677FF' }} />}
                valueStyle={{ color: '#1677FF', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                折合标准用纸: <strong>{summary.totalReams}</strong> 包 ({summary.sheetsPerReam}张/包)
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4} style={{ flex: '1 1 20%' }}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #F6FFED 0%, #FFFFFF 100%)' }}>
              <Statistic
                title="累计印制试卷总份数"
                value={summary.totalPrintCount}
                suffix="份"
                prefix={<PrinterOutlined style={{ color: '#52C41A' }} />}
                valueStyle={{ color: '#52C41A', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                平均每份耗纸: <strong>{summary.totalPrintCount > 0 ? (summary.totalPages / summary.totalPrintCount).toFixed(1) : 0}</strong> 张
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4} style={{ flex: '1 1 20%' }}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #FFF7E6 0%, #FFFFFF 100%)' }}>
              <Statistic
                title="折合耗材总成本"
                value={summary.totalCost}
                precision={2}
                prefix={<AccountBookOutlined style={{ color: '#FA8C16' }} />}
                suffix="元"
                valueStyle={{ color: '#FA8C16', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                按文印耗材 {summary.unitPrice} 元/张成本折算
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4} style={{ flex: '1 1 20%' }}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #F9F0FF 0%, #FFFFFF 100%)' }}>
              <Statistic
                title="有效印刷批次"
                value={summary.totalJobs}
                suffix="批"
                prefix={<AppstoreOutlined style={{ color: '#722ED1' }} />}
                valueStyle={{ color: '#722ED1', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                待印刷排队: <strong>{summary.pendingJobs}</strong> 批
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={4} style={{ flex: '1 1 20%' }}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #FFF1F0 0%, #FFFFFF 100%)' }}>
              <Statistic
                title="已作废冲销记录"
                value={summary.cancelledJobs}
                suffix="批"
                prefix={<StopOutlined style={{ color: '#FF4D4F' }} />}
                valueStyle={{ color: '#FF4D4F', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                已释放回退: <strong>{summary.cancelledPages}</strong> 张 (库存已还原)
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 作废冲销状态提醒 */}
      {summary.cancelledJobs > 0 && queryParams.status !== '2' && (
        <Alert
          message={
            <span>
              审计提示：系统已严格执行台账规范，累计 <strong>{summary.cancelledJobs}</strong> 笔已作废文印登记及 <strong>{summary.cancelledPages}</strong> 张纸张已从有效消耗中彻底剔除，对应出库单已同步冲销回退库存。
            </span>
          }
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* 多维台账 Tabs 核心展示区 */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: 'ledger',
              label: (
                <span>
                  <FileTextOutlined /> 文印耗材流水明细台账
                </span>
              ),
              children: (
                <div>
                  <ProTable
                    actionRef={actionRef}
                    columns={ledgerColumns}
                    rowKey="printId"
                    search={false}
                    headerTitle={
                      <Space size={12}>
                        <FileTextOutlined style={{ color: '#1677FF' }} />
                        <span style={{ fontWeight: 600 }}>文印耗材流水明细台账</span>
                        <Tag color="blue">
                          当前筛选已完成耗用: {summary.totalPages.toLocaleString()} 张 / {summary.completedPrintCount.toLocaleString()} 份
                        </Tag>
                        {summary.pendingPages > 0 && (
                          <Tag color="orange">排队待印: {summary.pendingPages.toLocaleString()} 张</Tag>
                        )}
                      </Space>
                    }
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1300 }}
                    summary={(pageData) => {
                      let pagePrintCount = 0;
                      let pageTotalPages = 0;
                      let pageCost = 0;
                      let completedCount = 0;
                      pageData.forEach((row: any) => {
                        if (row.status === '1') {
                          pagePrintCount += Number(row.printCount || 0);
                          pageTotalPages += Number(row.totalPages || 0);
                          pageCost += Number(row.totalPages || 0) * summary.unitPrice;
                          completedCount++;
                        }
                      });
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0} colSpan={7} align="center">
                              <span>本页已完成小计 ({completedCount} 笔已完成印刷批次)</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <span style={{ color: '#1677FF' }}>{pagePrintCount.toLocaleString()} 份</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <span style={{ color: '#52C41A' }}>{pageTotalPages.toLocaleString()} 张</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <span style={{ color: '#FA8C16' }}>¥ {pageCost.toFixed(2)}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} colSpan={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                    request={async (params) => {
                      try {
                        const reqQuery: any = {
                          pageNum: params.current,
                          pageSize: params.pageSize,
                        };
                        if (queryParams.printName) reqQuery.printName = queryParams.printName;
                        if (queryParams.grade) reqQuery.grade = queryParams.grade;
                        if (queryParams.paperType) reqQuery.paperType = queryParams.paperType;
                        if (queryParams.teacherId) reqQuery.teacherId = queryParams.teacherId;
                        if (queryParams.status) reqQuery.status = queryParams.status;
                        if (queryParams.params?.excludeCancelled) reqQuery['params[excludeCancelled]'] = queryParams.params.excludeCancelled;
                        if (queryParams.params?.beginTime) reqQuery['params[beginTime]'] = queryParams.params.beginTime;
                        if (queryParams.params?.endTime) reqQuery['params[endTime]'] = queryParams.params.endTime;

                        const res: any = await listRecord(reqQuery);
                        return {
                          data: res.rows || [],
                          total: res.total || 0,
                          success: true,
                        };
                      } catch (e) {
                        return { data: [], total: 0, success: false };
                      }
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'grade',
              label: (
                <span>
                  <AppstoreOutlined /> 各年级文印汇总台账
                </span>
              ),
              children: (
                <Table
                  dataSource={gradeStats}
                  rowKey="grade"
                  pagination={false}
                  bordered
                  columns={[
                    {
                      title: '序号',
                      width: 70,
                      align: 'center',
                      render: (_, __, index) => index + 1,
                    },
                    {
                      title: '年级名称',
                      dataIndex: 'grade',
                      render: (val) => <strong style={{ color: '#1677FF' }}>{val || '全校通用'}</strong>,
                    },
                    {
                      title: '文印批次',
                      dataIndex: 'jobCount',
                      align: 'right',
                      render: (val) => `${val || 0} 次`,
                    },
                    {
                      title: '印制总份数',
                      dataIndex: 'totalPrintCount',
                      align: 'right',
                      render: (val) => <strong>{val || 0} 份</strong>,
                    },
                    {
                      title: '总耗纸量',
                      dataIndex: 'totalPages',
                      align: 'right',
                      render: (val) => (
                        <strong style={{ color: '#52C41A', fontSize: 15 }}>
                          {Number(val || 0).toLocaleString()} 张
                        </strong>
                      ),
                    },
                    {
                      title: '折合标准包数',
                      align: 'right',
                      render: (_, r) => `${(Number(r.totalPages || 0) / summary.sheetsPerReam).toFixed(1)} 包`,
                    },
                    {
                      title: '折合成本',
                      align: 'right',
                      render: (_, r) => (
                        <span style={{ color: '#FA8C16', fontWeight: 'bold' }}>
                          ¥ {(Number(r.totalPages || 0) * summary.unitPrice).toFixed(2)}
                        </span>
                      ),
                    },
                    {
                      title: '占全校总用量比例',
                      width: 240,
                      render: (_, r) => {
                        const pages = Number(r.totalPages || 0);
                        const pct = totalSchoolPages > 0 ? Number(((pages / totalSchoolPages) * 100).toFixed(1)) : 0;
                        return (
                          <Progress
                            percent={pct}
                            size="small"
                            status="active"
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                          />
                        );
                      },
                    },
                  ]}
                />
              ),
            },
            {
              key: 'teacher',
              label: (
                <span>
                  <UserOutlined /> 教师文印消耗排行台账
                </span>
              ),
              children: (
                <Table
                  dataSource={teacherStats}
                  rowKey={(r, i) => `${r.teacherName}_${i}`}
                  pagination={false}
                  bordered
                  columns={[
                    {
                      title: '消耗排名',
                      width: 90,
                      align: 'center',
                      render: (_, __, index) => {
                        if (index === 0) return <Tag color="gold" style={{ fontWeight: 'bold' }}>TOP 1</Tag>;
                        if (index === 1) return <Tag color="silver" style={{ fontWeight: 'bold' }}>TOP 2</Tag>;
                        if (index === 2) return <Tag color="orange" style={{ fontWeight: 'bold' }}>TOP 3</Tag>;
                        return <span>{index + 1}</span>;
                      },
                    },
                    {
                      title: '教师姓名',
                      dataIndex: 'teacherName',
                      render: (val) => (
                        <Space>
                          <UserOutlined style={{ color: '#1677FF' }} />
                          <strong>{val || '未登记教师'}</strong>
                        </Space>
                      ),
                    },
                    {
                      title: '任教学科',
                      dataIndex: 'subject',
                      render: (val) => <Tag color="blue">{val || '学科通用'}</Tag>,
                    },
                    {
                      title: '申请印刷批次',
                      dataIndex: 'jobCount',
                      align: 'right',
                      render: (val) => `${val || 0} 次`,
                    },
                    {
                      title: '印制总份数',
                      dataIndex: 'totalPrintCount',
                      align: 'right',
                      render: (val) => <strong>{val || 0} 份</strong>,
                    },
                    {
                      title: '总耗纸张数',
                      dataIndex: 'totalPages',
                      align: 'right',
                      render: (val) => (
                        <strong style={{ color: '#52C41A', fontSize: 15 }}>
                          {Number(val || 0).toLocaleString()} 张
                        </strong>
                      ),
                    },
                    {
                      title: '折合成本',
                      align: 'right',
                      render: (_, r) => (
                        <span style={{ color: '#FA8C16', fontWeight: 'bold' }}>
                          ¥ {(Number(r.totalPages || 0) * summary.unitPrice).toFixed(2)}
                        </span>
                      ),
                    },
                    {
                      title: '单次平均印量',
                      align: 'right',
                      render: (_, r) => {
                        const j = Number(r.jobCount || 1);
                        const p = Number(r.totalPages || 0);
                        return `${Math.round(p / j)} 张/次`;
                      },
                    },
                  ]}
                />
              ),
            },
            {
              key: 'charts',
              label: (
                <span>
                  <BarChartOutlined /> 耗材用量可视化分析
                </span>
              ),
              children: (
                <div>
                  <Row gutter={16}>
                    <Col xs={24} lg={14}>
                      <Card
                        title="各年级文印耗纸量对比 (张)"
                        bordered
                        style={{ borderRadius: 8, marginBottom: 16 }}
                      >
                        {gradeStats.length > 0 ? (
                          <ReactECharts option={getGradeBarOption()} style={{ height: 360 }} />
                        ) : (
                          <Empty description="暂无年级耗用统计数据" />
                        )}
                      </Card>
                    </Col>
                    <Col xs={24} lg={10}>
                      <Card
                        title="纸张规格消耗占比"
                        bordered
                        style={{ borderRadius: 8, marginBottom: 16 }}
                      >
                        {paperStats.length > 0 ? (
                          <ReactECharts option={getPaperPieOption()} style={{ height: 360 }} />
                        ) : (
                          <Empty description="暂无纸张规格数据" />
                        )}
                      </Card>
                    </Col>
                  </Row>

                  <Card
                    title="近6个月文印耗纸量趋势走势 (张)"
                    bordered
                    style={{ borderRadius: 8 }}
                  >
                    {monthlyTrends.length > 0 ? (
                      <ReactECharts option={getMonthlyTrendOption()} style={{ height: 280 }} />
                    ) : (
                      <Empty description="暂无近6个月文印趋势数据" />
                    )}
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 台账明细与核算凭证弹窗 */}
      <Modal
        title={
          <Space>
            <AccountBookOutlined style={{ color: '#1677FF' }} />
            <span>文印耗材领用记账凭证【#WZ-PRINT-{selectedRecord?.printId || ''}】</span>
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedRecord(null);
        }}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintVoucher}>
            打印记账凭证
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            关闭凭证
          </Button>,
        ]}
        width={780}
      >
        {selectedRecord && (
          <div>
            {/* 可打印凭证卡片 */}
            <div id="voucher-print-area">
              <div className="voucher-card" style={{ border: '2px solid #1677FF', borderRadius: 8, padding: '20px 24px', background: '#FAFCFF', marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2, color: '#1677FF' }}>
                    湖北汉江实验学校 · 教学文印中心
                  </span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 16, borderBottom: '1px dashed #BBD3FB', paddingBottom: 8 }}>
                  文印耗材领用与消耗记账凭证 (财务审计存根)
                </div>

                <Row justify="space-between" style={{ marginBottom: 10, fontSize: 13, color: '#666' }}>
                  <Col><strong>台账流水号：</strong>#WZ-PRINT-{selectedRecord.printId}</Col>
                  <Col><strong>关联出库单：</strong>{selectedRecord.outNo || 'CK-AUTO-SYS'}</Col>
                  <Col><strong>登记日期：</strong>{selectedRecord.printTime ? dayjs(selectedRecord.printTime).format('YYYY-MM-DD') : '-'}</Col>
                  <Col>
                    {selectedRecord.status === '1' && <Tag color="success">已出库核销</Tag>}
                    {selectedRecord.status === '0' && <Tag color="processing">待印刷排队</Tag>}
                    {selectedRecord.status === '2' && <Tag color="error">已作废冲销 (库存已回退)</Tag>}
                  </Col>
                </Row>

                <Descriptions bordered size="small" column={2} style={{ marginBottom: 12, background: '#fff' }}>
                  <Descriptions.Item label="文印资料名称" span={2}>
                    <strong style={{ fontSize: 14, color: '#1677FF' }}>{selectedRecord.printName}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="申请领料教师">
                    <strong>{selectedRecord.teacherName || '系统经办'}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="领用年级/班级">
                    {selectedRecord.grade || '全校'} {selectedRecord.className || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="耗材规格型号">
                    <Tag color="purple">{selectedRecord.paperType || 'A4'}</Tag>
                    {selectedRecord.paperGoodsName && <span>({selectedRecord.paperGoodsName})</span>}
                  </Descriptions.Item>
                  <Descriptions.Item label="印刷排版版面">
                    <Tag color={selectedRecord.printSide === '2' ? 'orange' : 'default'}>
                      {selectedRecord.printSide === '2' ? '双面印刷 (耗纸折半)' : '单面印刷'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="印制总份数">
                    <strong style={{ fontSize: 14 }}>{selectedRecord.printCount}</strong> 份
                  </Descriptions.Item>
                  <Descriptions.Item label="单份资料页数">
                    {selectedRecord.pageCount || 1} 页/份
                  </Descriptions.Item>
                  <Descriptions.Item label="实际耗纸张数">
                    <strong style={{ color: selectedRecord.status === '2' ? '#999' : '#52C41A', fontSize: 16 }}>
                      {selectedRecord.totalPages} 张
                    </strong>
                    {selectedRecord.status === '2' && <Tag color="error" style={{ marginLeft: 6 }}>已冲销</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="折合标准规格包数">
                    <strong>{(Number(selectedRecord.totalPages || 0) / summary.sheetsPerReam).toFixed(2)}</strong> 包
                    <span style={{ fontSize: 12, color: '#888' }}> ({summary.sheetsPerReam}张/包)</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="耗材核算单价">
                    ¥ {summary.unitPrice} 元/张
                  </Descriptions.Item>
                  <Descriptions.Item label="本次折合总金额">
                    <strong style={{ color: '#FA8C16', fontSize: 15 }}>
                      ¥ {(Number(selectedRecord.totalPages || 0) * summary.unitPrice).toFixed(2)} 元
                    </strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="金额大写 (人民币)" span={2}>
                    <strong style={{ color: '#FA8C16' }}>
                      {digitUppercase(Number(selectedRecord.totalPages || 0) * summary.unitPrice)}
                    </strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="业务备注说明" span={2}>
                    {selectedRecord.remark || '常规教学试卷与课后讲义印制'}
                  </Descriptions.Item>
                </Descriptions>

                {/* 签章与责任人栏 */}
                <Row justify="space-between" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E6F0FF', fontSize: 12, color: '#444' }}>
                  <Col span={6}>申请教师签字：<u>&nbsp;&nbsp;{selectedRecord.teacherName || '________'}&nbsp;&nbsp;</u></Col>
                  <Col span={6}>文印经办人：<u>&nbsp;&nbsp;{selectedRecord.operator || 'admin'}&nbsp;&nbsp;</u></Col>
                  <Col span={6}>仓库保管人：<u>&nbsp;&nbsp;系统自动过账&nbsp;&nbsp;</u></Col>
                  <Col span={6}>教务/财务审核：<u>&nbsp;&nbsp;已核准&nbsp;&nbsp;</u></Col>
                </Row>
              </div>
            </div>

            {/* 实物拍照与附件凭证 */}
            {(selectedRecord.resultImg || selectedRecord.attachment) && (
              <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
                {selectedRecord.resultImg && (
                  <Descriptions.Item label="印刷实物抽检照片">
                    <Image
                      src={selectedRecord.resultImg}
                      alt="实物效果图"
                      style={{ maxHeight: 180, objectFit: 'contain', borderRadius: 6 }}
                    />
                  </Descriptions.Item>
                )}
                {selectedRecord.attachment && (
                  <Descriptions.Item label="原稿电子附件">
                    <Button
                      type="link"
                      icon={<PaperClipOutlined />}
                      href={selectedRecord.attachment}
                      target="_blank"
                    >
                      下载/预览原稿电子档案
                    </Button>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default PrintLedgerReportPage;
