import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Popover,
  Typography,
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
  PieChartOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
  BankOutlined,
  AppstoreOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import {
  getMaterialReportSummary,
  listMaterialReportDetail,
  listMaterialReportByClass,
  listMaterialReportByPerson,
} from '@/api/edu/material';
import { listClass } from '@/api/edu/class';
import { listTeacher } from '@/api/edu/teacher';
import { downloadExcel } from '@/utils/download';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EduMaterialReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'class' | 'person' | 'detail'>('class');

  // 表格引用
  const classActionRef = useRef<ActionType>(undefined);
  const personActionRef = useRef<ActionType>(undefined);
  const detailActionRef = useRef<ActionType>(undefined);

  // 基础数据
  const [classList, setClassList] = useState<any[]>([]);
  const [teacherList, setTeacherList] = useState<any[]>([]);

  // 汇总大屏指标与图表
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>({
    totalGrantQty: 0,
    totalReturnQty: 0,
    netGrantQty: 0,
    totalPersonCount: 0,
    totalClassCount: 0,
    totalOrderCount: 0,
    totalAmount: 0,
    categoryPieData: [],
    classRankData: [],
    monthlyTrendData: [],
    topGoodsList: [],
  });

  // 当前激活的筛选参数缓存
  const [queryParams, setQueryParams] = useState<any>({});

  // 快捷时间范围
  const [quickDate, setQuickDate] = useState<string>('all');

  // 初始化加载基础数据与汇总
  useEffect(() => {
    listClass({ pageSize: 200 }).then((res: any) => {
      if (res && res.rows) setClassList(res.rows);
    }).catch(() => {});

    listTeacher({ pageSize: 500 }).then((res: any) => {
      if (res && res.rows) setTeacherList(res.rows);
    }).catch(() => {});

    loadSummary({});
  }, []);

  // 加载报表指标与图表
  const loadSummary = async (params: any) => {
    setSummaryLoading(true);
    try {
      const res: any = await getMaterialReportSummary(params);
      if (res && res.code === 200 && res.data) {
        setSummaryData(res.data);
      }
    } catch (e) {
      console.error('加载物资报表概览异常:', e);
    } finally {
      setSummaryLoading(false);
    }
  };

  // 教师下拉选项
  const teacherOptions = teacherList.map((t) => ({
    value: t.teacherName,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <Text strong>{t.teacherName}</Text>
          {t.subject && <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{t.subject}</Tag>}
        </span>
        <Text type="secondary" style={{ fontSize: 12 }}>{t.teacherNo || ''}</Text>
      </div>
    ),
  }));

  const hasActiveFilter = Boolean(
    queryParams.targetName ||
    queryParams.grade ||
    queryParams.classId ||
    queryParams.targetType ||
    queryParams.category ||
    queryParams.recordType ||
    queryParams.beginTime
  );
  const handleQuickDateChange = (val: string) => {
    setQuickDate(val);
    let beginTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;

    const today = dayjs().format('YYYY-MM-DD');
    if (val === 'today') {
      beginTime = today + ' 00:00:00';
      endTime = today + ' 23:59:59';
    } else if (val === 'week') {
      beginTime = dayjs().subtract(7, 'day').format('YYYY-MM-DD 00:00:00');
      endTime = today + ' 23:59:59';
    } else if (val === 'month') {
      beginTime = dayjs().startOf('month').format('YYYY-MM-DD 00:00:00');
      endTime = today + ' 23:59:59';
    } else if (val === 'semester') {
      // 2026秋季学期一般从2026-09-01开始
      beginTime = '2026-09-01 00:00:00';
      endTime = today + ' 23:59:59';
    } else if (val === 'year') {
      beginTime = dayjs().startOf('year').format('YYYY-MM-DD 00:00:00');
      endTime = today + ' 23:59:59';
    }

    if (beginTime && endTime) {
      filterForm.setFieldsValue({
        dateRange: [dayjs(beginTime), dayjs(endTime)],
      });
    } else {
      filterForm.setFieldsValue({ dateRange: undefined });
    }

    triggerSearch({ beginTime, endTime });
  };

  // 触发搜索
  const triggerSearch = (overrideTime?: { beginTime?: string; endTime?: string }) => {
    const values = filterForm.getFieldsValue();
    let beginTime = overrideTime ? overrideTime.beginTime : undefined;
    let endTime = overrideTime ? overrideTime.endTime : undefined;

    if (!overrideTime && values.dateRange && values.dateRange.length === 2) {
      beginTime = values.dateRange[0].format('YYYY-MM-DD 00:00:00');
      endTime = values.dateRange[1].format('YYYY-MM-DD 23:59:59');
    }

    const newParams: any = {
      grade: values.grade,
      classId: values.classId,
      targetType: values.targetType,
      targetName: values.targetName,
      category: values.category,
      goodsName: values.goodsName,
      recordType: values.recordType,
      beginTime,
      endTime,
    };

    setQueryParams(newParams);
    loadSummary(newParams);

    // 重新刷新各表格
    if (activeTab === 'class') {
      classActionRef.current?.reload();
    } else if (activeTab === 'person') {
      personActionRef.current?.reload();
    } else {
      detailActionRef.current?.reload();
    }
  };

  // 重置
  const handleReset = () => {
    filterForm.resetFields();
    setQuickDate('all');
    setQueryParams({});
    loadSummary({});
    classActionRef.current?.reload();
    personActionRef.current?.reload();
    detailActionRef.current?.reload();
  };

  // 导出单维度或全量
  const handleExport = (type: 'detail' | 'class' | 'person' | 'comprehensive') => {
    if (type === 'detail') {
      downloadExcel('/edu/material/report/export/detail', queryParams, '物资领用最细化穿透台账.xlsx');
    } else if (type === 'class') {
      downloadExcel('/edu/material/report/export/by-class', queryParams, '各班级物资领用汇总透视表.xlsx');
    } else if (type === 'person') {
      downloadExcel('/edu/material/report/export/by-person', queryParams, '个人(教师学生)物资领用汇总表.xlsx');
    } else if (type === 'comprehensive') {
      downloadExcel('/edu/material/report/export/comprehensive', queryParams, '教务物资领退全维度综合审计报表.xlsx');
    }
  };

  // ====================== ECharts 图表配置 ======================
  // 1. 各班领用件数排行柱状图
  const getClassRankOption = () => {
    const list = summaryData.classRankData || [];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: list.map((item: any) => item.className || '公用'),
        axisLabel: { interval: 0, rotate: 25, fontSize: 11 },
      },
      yAxis: { type: 'value', name: '件数' },
      series: [
        {
          name: '领用总件数',
          type: 'bar',
          barWidth: '40%',
          data: list.map((item: any) => item.quantity),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#69c0ff' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  };

  // 2. 物资分类领用分布环形图
  const getCategoryPieOption = () => {
    const list = summaryData.categoryPieData || [];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}件 ({d}%)' },
      legend: { bottom: '0', left: 'center' },
      series: [
        {
          name: '物资品类领用占比',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
          },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold' },
          },
          data: list.length > 0 ? list : [{ name: '暂无领用数据', value: 0 }],
        },
      ],
    };
  };

  // 优雅渲染领用物资清单摘要（彩色Tag标签 + Popover白底悬浮卡片，彻底避免黑色Tooltip遮挡）
  const renderGoodsSummary = (text: string) => {
    if (!text || text === 'null') return <Text type="secondary">-</Text>;
    const items = text.split('；').map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return <Text type="secondary">-</Text>;

    const displayItems = items.slice(0, 3);
    const remainingCount = items.length - 3;

    const content = (
      <div style={{ maxWidth: 360, maxHeight: 260, overflowY: 'auto' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1677ff' }}>
          📦 领用物资明细清单（共 {items.length} 种）：
        </div>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ fontSize: 13, color: '#262626', borderBottom: '1px dashed #f0f0f0', paddingBottom: 3 }}>
              • {item}
            </div>
          ))}
        </Space>
      </div>
    );

    return (
      <Space wrap size={[4, 4]}>
        {displayItems.map((item, index) => (
          <Tag key={index} color="blue" style={{ borderRadius: 4, marginRight: 0 }}>
            {item}
          </Tag>
        ))}
        {remainingCount > 0 && (
          <Popover content={content} title={null} trigger="hover" placement="topLeft">
            <Tag color="cyan" style={{ cursor: 'pointer', borderRadius: 4, marginRight: 0, fontWeight: 500 }}>
              +{remainingCount} 种物资...
            </Tag>
          </Popover>
        )}
      </Space>
    );
  };

  // ====================== 表格列定义 ======================

  // Tab 1: 各班级物资领用透视表
  const classColumns: ProColumns[] = [
    {
      title: '所属年级',
      dataIndex: 'grade',
      width: 110,
      align: 'center',
      render: (v) => <Tag color="blue">{v || '通用年级'}</Tag>,
    },
    {
      title: '班级名称',
      dataIndex: 'className',
      width: 140,
      render: (v) => <Text strong style={{ color: '#1d39c4' }}>{v || '教研/公用'}</Text>,
    },
    {
      title: '领用业务笔数',
      dataIndex: 'orderCount',
      width: 110,
      align: 'center',
      render: (v) => <Tag color="cyan">{v} 单</Tag>,
    },
    {
      title: '领用物资总件数',
      dataIndex: 'totalQuantity',
      width: 130,
      align: 'center',
      render: (v) => (
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fa8c16' }}>
          {v} 件
        </span>
      ),
    },
    {
      title: '涉及品类数',
      dataIndex: 'goodsTypesCount',
      width: 110,
      align: 'center',
      render: (v) => <Tag color="purple">{v} 种物资</Tag>,
    },
    {
      title: '领用总人次',
      dataIndex: 'personCount',
      width: 110,
      align: 'center',
      render: (v) => <Tag color="geekblue">{v} 人次</Tag>,
    },
    {
      title: '物资折合总估值',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right',
      render: (v) => (
        <Text strong style={{ color: '#52c41a' }}>
          ￥ {Number(v || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '主要领用物资清单摘要',
      dataIndex: 'goodsSummary',
      width: 320,
      render: (v) => renderGoodsSummary(String(v || '')),
    },
  ];

  // Tab 2: 个人(教师/学生)领用对账表
  const personColumns: ProColumns[] = [
    {
      title: '人员类型',
      dataIndex: 'targetTypeName',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <Tag color={r.targetType === '1' ? 'processing' : 'orange'}>
          {r.targetTypeName || '个人'}
        </Tag>
      ),
    },
    {
      title: '领用人姓名',
      dataIndex: 'targetName',
      width: 120,
      render: (v) => <Text strong style={{ color: '#1677ff' }}>{v || '-'}</Text>,
    },
    {
      title: '所属年级',
      dataIndex: 'grade',
      width: 100,
      align: 'center',
      render: (v) => v ? <Tag>{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: '所在班级/部门',
      dataIndex: 'className',
      width: 130,
      render: (v) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '学科/选科',
      dataIndex: 'subject',
      width: 110,
      align: 'center',
      render: (v) => v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: '领用次数',
      dataIndex: 'orderCount',
      width: 100,
      align: 'center',
      render: (v) => `${v} 次`,
    },
    {
      title: '累计领用件数',
      dataIndex: 'totalQuantity',
      width: 120,
      align: 'center',
      render: (v) => (
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fa8c16' }}>
          {v} 件
        </span>
      ),
    },
    {
      title: '领用品类数',
      dataIndex: 'goodsTypesCount',
      width: 100,
      align: 'center',
      render: (v) => `${v} 种`,
    },
    {
      title: '物资总估值',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (v) => (
        <Text strong style={{ color: '#52c41a' }}>
          ￥ {Number(v || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '主要领用物品摘要',
      dataIndex: 'goodsSummary',
      width: 320,
      render: (v) => renderGoodsSummary(String(v || '')),
    },
  ];

  // Tab 3: 最细化单品穿透流水台账（各班、个人、各个物资）
  const detailColumns: ProColumns[] = [
    {
      title: '流水单号',
      dataIndex: 'recordNo',
      width: 150,
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: '业务类型',
      dataIndex: 'recordTypeName',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <Tag color={r.recordType === '1' ? 'green' : 'orange'}>
          {r.recordTypeName}
        </Tag>
      ),
    },
    {
      title: '业务场景',
      dataIndex: 'businessCategory',
      width: 130,
      ellipsis: true,
      render: (v) => <Tag color="blue">{v || '日常零星'}</Tag>,
    },
    {
      title: '经办时间',
      dataIndex: 'operateTime',
      valueType: 'dateTime',
      width: 150,
      align: 'center',
    },
    {
      title: '所属班级',
      dataIndex: 'className',
      width: 120,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Text strong>{r.className || '通用公用'}</Text>
          {r.grade && <Text type="secondary" style={{ fontSize: 12 }}>{r.grade}</Text>}
        </Space>
      ),
    },
    {
      title: '领退对象',
      dataIndex: 'targetName',
      width: 110,
      render: (_, r) => (
        <Space>
          <Text strong style={{ color: '#1677ff' }}>{r.targetName || '-'}</Text>
          <Tag color="default">{r.targetTypeName || '个人'}</Tag>
        </Space>
      ),
    },
    {
      title: '物资分类',
      dataIndex: 'categoryName',
      width: 100,
      align: 'center',
      render: (v) => <Tag color="magenta">{v || '物资'}</Tag>,
    },
    {
      title: '物资名称',
      dataIndex: 'goodsName',
      width: 160,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: '规格型号',
      dataIndex: 'spec',
      width: 110,
      render: (v) => v || '-',
    },
    {
      title: '领退数量',
      dataIndex: 'quantity',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: r.recordType === '1' ? '#fa8c16' : '#52c41a',
          }}
        >
          {r.recordType === '1' ? `+${r.quantity}` : `-${r.quantity}`} {r.unit}
        </span>
      ),
    },
    {
      title: '参考单价',
      dataIndex: 'price',
      width: 90,
      align: 'right',
      render: (v) => `￥${Number(v || 0).toFixed(2)}`,
    },
    {
      title: '金额估算',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (v) => (
        <Text strong style={{ color: '#cf1322' }}>
          ￥{Number(v || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '经办教务人员',
      dataIndex: 'operator',
      width: 110,
      align: 'center',
    },
    {
      title: '实物凭证',
      dataIndex: 'imageUrl',
      width: 80,
      align: 'center',
      render: (_, record: any) =>
        record.imageUrl ? (
          <Image
            src={record.imageUrl}
            width={32}
            height={32}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '配发/领用说明',
      dataIndex: 'remark',
      width: 140,
      ellipsis: true,
      render: (v) => v || '-',
    },
  ];

  return (
    <PageContainer
      header={{
        title: '教务物资领退统计与全维穿透报表',
        subTitle: '最细化穿透至各班、个人、各个单品物资，支持多Sheet综合审计导出与精准对账',
        extra: [
          <Button
            key="back"
            icon={<RollbackOutlined />}
            onClick={() => navigate('/edu/material')}
          >
            返回日常领退登记
          </Button>,
          <Button
            key="export-detail"
            type="primary"
            icon={<FileExcelOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => handleExport('detail')}
          >
            导出最细化台账 Excel
          </Button>,
          <Button
            key="export-comp"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleExport('comprehensive')}
          >
            导出全维度综合审计大表(多Sheet)
          </Button>,
        ],
      }}
    >
      {/* 复合筛选卡片 */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={filterForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="grade" label="所属年级">
                <Select placeholder="全校所有年级" allowClear onChange={() => triggerSearch()}>
                  <Option value="高一年级">高一年级</Option>
                  <Option value="高二年级">高二年级</Option>
                  <Option value="高三年级">高三年级</Option>
                  <Option value="初中年级">初中年级</Option>
                  <Option value="行政教研">行政/教研组</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={5}>
              <Form.Item name="classId" label="关联班级">
                <Select
                  placeholder="选择指定班级"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={() => triggerSearch()}
                >
                  {classList.map((c) => (
                    <Option key={c.classId} value={c.classId}>
                      {(c.grade ? c.grade + ' ' : '') + c.className}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="targetType" label="领退对象身份">
                <Select placeholder="全部身份" allowClear onChange={() => triggerSearch()}>
                  <Option value="1">教师领用/退还</Option>
                  <Option value="2">学生领书/退书</Option>
                  <Option value="3">班级公用/退库</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="targetName" label="领退对象 (可搜/可选教师)">
                <AutoComplete
                  options={teacherOptions}
                  placeholder="可自由输入或选择教师"
                  allowClear
                  filterOption={(inputValue, option) =>
                    (option?.value || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                  onSelect={() => triggerSearch()}
                >
                  <Input.Search
                    placeholder="输入姓名或选教师"
                    allowClear
                    onSearch={() => triggerSearch()}
                    onPressEnter={() => triggerSearch()}
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="category" label="物资分类">
                <Select placeholder="全部分类" allowClear onChange={() => triggerSearch()}>
                  <Option value="1">教师办公品</Option>
                  <Option value="2">学生教材</Option>
                  <Option value="3">文印耗材</Option>
                  <Option value="4">其他物资</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={3}>
              <Form.Item name="recordType" label="业务类型">
                <Select placeholder="领/退" allowClear onChange={() => triggerSearch()}>
                  <Option value="1">发放领取</Option>
                  <Option value="2">退还回收</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16} align="middle">
            <Col xs={24} md={12} lg={10}>
              <Form.Item label="统计时间范围" style={{ marginBottom: 0 }}>
                <Space wrap>
                  <Radio.Group
                    value={quickDate}
                    onChange={(e) => handleQuickDateChange(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="all">全部</Radio.Button>
                    <Radio.Button value="today">今日</Radio.Button>
                    <Radio.Button value="week">近7天</Radio.Button>
                    <Radio.Button value="month">本月</Radio.Button>
                    <Radio.Button value="semester">本学期</Radio.Button>
                    <Radio.Button value="year">本年</Radio.Button>
                  </Radio.Group>
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="dateRange" label="自定义起止时间" style={{ marginBottom: 0 }}>
                <RangePicker style={{ width: '100%' }} onChange={() => triggerSearch()} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={6} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置筛选
                </Button>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => triggerSearch()}>
                  立即查询
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 检索状态与数据反馈横幅：让用户清晰感知到底有没有搜到数据 */}
      <div style={{ marginBottom: 16 }}>
        {(summaryData.totalOrderCount || 0) > 0 ? (
          <Alert
            type="info"
            showIcon
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  检索命中反馈：共检索到 <Text strong style={{ color: '#1677ff', fontSize: 15 }}>{summaryData.totalOrderCount}</Text> 笔领退单据，
                  涵盖 <Text strong style={{ color: '#52c41a' }}>{summaryData.totalClassCount}</Text> 个班级、
                  <Text strong style={{ color: '#722ed1' }}>{summaryData.totalPersonCount}</Text> 位领退人，
                  流转物资总量 <Text strong style={{ color: '#fa8c16', fontSize: 15 }}>{summaryData.totalGrantQty}</Text> 件，
                  折合总估值 <Text strong style={{ color: '#cf1322', fontSize: 15 }}>￥{Number(summaryData.totalAmount || 0).toFixed(2)}</Text>
                </span>
                {hasActiveFilter && (
                  <Space size={6} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>当前生效筛选:</Text>
                    {queryParams.targetName && <Tag color="blue">对象: {queryParams.targetName}</Tag>}
                    {queryParams.grade && <Tag color="cyan">年级: {queryParams.grade}</Tag>}
                    {queryParams.classId && <Tag color="purple">指定班级</Tag>}
                    {queryParams.category && <Tag color="magenta">指定品类</Tag>}
                    {queryParams.recordType && <Tag color="orange">{queryParams.recordType === '1' ? '仅发放' : '仅回收'}</Tag>}
                    <Button type="link" size="small" onClick={handleReset} style={{ padding: 0 }}>
                      清空条件
                    </Button>
                  </Space>
                )}
              </div>
            }
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  未检索到任何符合条件的物资领退数据（共 0 笔）。请核对输入的领用人姓名或放宽筛选条件。
                </span>
                <Button type="link" size="small" onClick={handleReset} style={{ padding: 0 }}>
                  恢复全校数据
                </Button>
              </div>
            }
          />
        )}
      </div>

      {/* 核心指标看板卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)' }}>
            <Statistic
              title="累计发放物资总数"
              value={summaryData.totalGrantQty || 0}
              suffix="件/套/本"
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              净流出消耗: <Text strong style={{ color: '#fa8c16' }}>{summaryData.netGrantQty || 0} 件</Text> (已回收: {summaryData.totalReturnQty || 0})
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #fcffe6 0%, #ffffff 100%)' }}>
            <Statistic
              title="覆盖班级总数"
              value={summaryData.totalClassCount || 0}
              suffix="个班级"
              prefix={<BankOutlined style={{ color: '#7cb305' }} />}
              valueStyle={{ color: '#7cb305', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              年级跨度: 高一 / 高二 / 高三 / 初中
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)' }}>
            <Statistic
              title="领用总人次"
              value={summaryData.totalPersonCount || 0}
              suffix="人次"
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              领退业务流水单: <Text strong>{summaryData.totalOrderCount || 0} 笔</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)' }}>
            <Statistic
              title="消耗物资折合总估值"
              value={summaryData.totalAmount || 0}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              核算口径: 最近采购批次加权进价折算
            </div>
          </Card>
        </Col>
      </Row>

      {/* 深度可视化分析图表 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={15}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#1890ff' }} />
                <span>各班级物资领用总件数排行 TOP 10</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <ReactECharts option={getClassRankOption()} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: '#eb2f96' }} />
                <span>物资分类领用占比分布</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <ReactECharts option={getCategoryPieOption()} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      {/* 三大多维透视报表 Tabs */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k: any) => setActiveTab(k)}
          tabBarExtraContent={
            <Space>
              {activeTab === 'class' && (
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('class')}
                >
                  导出各班级透视表 Excel
                </Button>
              )}
              {activeTab === 'person' && (
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('person')}
                >
                  导出个人对账单 Excel
                </Button>
              )}
              {activeTab === 'detail' && (
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleExport('detail')}
                >
                  导出最细化台账 Excel
                </Button>
              )}
            </Space>
          }
          items={[
            {
              key: 'class',
              label: (
                <span>
                  <BankOutlined /> 各班级物资领用透视表
                  <Badge
                    count={summaryData.totalClassCount || 0}
                    overflowCount={999}
                    style={{ backgroundColor: '#1890ff', marginLeft: 8 }}
                  />
                </span>
              ),
              children: (
                <ProTable
                  actionRef={classActionRef}
                  columns={classColumns}
                  rowKey="classId"
                  search={false}
                  scroll={{ x: 'max-content' }}
                  options={{ reload: true, density: true }}
                  request={async (params) => {
          try {
            const res: any = await listMaterialReportByClass({
                      ...queryParams,
                      pageNum: params.current,
                      pageSize: params.pageSize,
                    });
                    return {
                      data: res.rows || [],
                      total: res.total || 0,
                      success: true,
                    };
          } catch (error) {
            console.error('加载表格数据失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
                  pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'person',
              label: (
                <span>
                  <UserOutlined /> 个人(教师/学生)领用责任单
                  <Badge
                    count={summaryData.totalPersonCount || 0}
                    overflowCount={999}
                    style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                  />
                </span>
              ),
              children: (
                <ProTable
                  actionRef={personActionRef}
                  columns={personColumns}
                  rowKey={(r) => `${r.targetType}_${r.targetName}`}
                  search={false}
                  scroll={{ x: 'max-content' }}
                  options={{ reload: true, density: true }}
                  request={async (params) => {
          try {
            const res: any = await listMaterialReportByPerson({
                      ...queryParams,
                      pageNum: params.current,
                      pageSize: params.pageSize,
                    });
                    return {
                      data: res.rows || [],
                      total: res.total || 0,
                      success: true,
                    };
          } catch (error) {
            console.error('加载表格数据失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
                  pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'detail',
              label: (
                <span>
                  <AppstoreOutlined /> 最细化单品穿透流水台账（各班·个人·单品）
                  <Badge
                    count={summaryData.totalOrderCount || 0}
                    overflowCount={9999}
                    style={{ backgroundColor: '#fa8c16', marginLeft: 8 }}
                  />
                </span>
              ),
              children: (
                <ProTable
                  actionRef={detailActionRef}
                  columns={detailColumns}
                  rowKey="itemId"
                  search={false}
                  scroll={{ x: 'max-content' }}
                  options={{ reload: true, density: true }}
                  request={async (params) => {
          try {
            const res: any = await listMaterialReportDetail({
                      ...queryParams,
                      pageNum: params.current,
                      pageSize: params.pageSize,
                    });
                    return {
                      data: res.rows || [],
                      total: res.total || 0,
                      success: true,
                    };
          } catch (error) {
            console.error('加载表格数据失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
                  pagination={{ defaultPageSize: 15, showSizeChanger: true }}
                />
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default EduMaterialReportPage;
