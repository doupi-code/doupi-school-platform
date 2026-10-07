import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  WarningOutlined,
  HistoryOutlined,
  ShopOutlined,
  PhoneOutlined,
  UserOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listGoods,
  getGoods,
  addGoods,
  updateGoods,
  delGoods,
} from '@/api/stock/goods';
import { getStockDetailReport } from '@/api/stock/report';
import { listSupplier } from '@/api/stock/supplier';
import { getDicts } from '@/api/system/dict';

const { Text } = Typography;

const GoodsPage: React.FC = () => {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 动态数据字典（消除下拉 Option 硬编码，支持标准字典与首帧即时回显）
  const [goodsClassOptions, setGoodsClassOptions] = useState<any[]>([
    { dictValue: '1', dictLabel: '教师办公用品' },
    { dictValue: '2', dictLabel: '学生教材' },
    { dictValue: '3', dictLabel: '文印耗材' },
    { dictValue: '4', dictLabel: '招生宣传物料' },
  ]);
  const [gradeOptions, setGradeOptions] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);

  useEffect(() => {
    getDicts('goods_class')
      .then((res: any) => {
        if (res && res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
          setGoodsClassOptions(res.data);
        }
      })
      .catch(() => {});

    getDicts('grade')
      .then((res: any) => {
        if (res && res.code === 200 && Array.isArray(res.data)) {
          setGradeOptions(res.data);
        }
      })
      .catch(() => {});

    getDicts('stock_local')
      .then((res: any) => {
        if (res && res.code === 200 && Array.isArray(res.data)) {
          setLocationOptions(res.data);
        }
      })
      .catch(() => {});

    // 加载供应商列表，用于物资档案默认供应商下拉
    listSupplier({ pageSize: 100 })
      .then((res: any) => {
        if (res && res.rows) setSupplierList(res.rows);
      })
      .catch(() => {});
  }, []);

  // 规范化物资分类：兼容旧版中文字符与真实字典编码
  const normalizeCategory = (cat: any) => {
    if (!cat && cat !== 0) return '1';
    const s = String(cat).trim();
    if (s === '纸张耗材' || s === '办公文具') return '1';
    if (s === '学生教材') return '2';
    if (s === '油墨耗材' || s === '文印耗材') return '3';
    if (s === '招生宣传物料' || s === '消杀物资' || s === '教学仪器') return '4';
    return s;
  };

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  // 包装规格换算率变更与重算模式状态（用户可选两种模式，默认模式 A）
  const [recalcMode, setRecalcMode] = useState<'A' | 'B'>('A');
  const [initialRate, setInitialRate] = useState<number>(500);
  const [currentRate, setCurrentRate] = useState<number>(500);
  const [initialStockNum, setInitialStockNum] = useState<number>(0);
  const [initialRemainSheets, setInitialRemainSheets] = useState<number>(0);
  const [isRateChanged, setIsRateChanged] = useState<boolean>(false);

  const handleRateChange = (newRate: number) => {
    const val = Number(newRate) || 1;
    setCurrentRate(val);
    form.setFieldsValue({ conversionRate: val });
    if (editingId) {
      setIsRateChanged(val !== initialRate);
    }
  };

  const triggerSaveGoodsDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('stock_goods', targetId, current);
    const d = FormDraftUtil.getDraft('stock_goods', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  // 方案1：入库记录抽屉相关状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentGoods, setCurrentGoods] = useState<any>(null);
  const [inRecords, setInRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [supplierList, setSupplierList] = useState<any[]>([]);

  // 获取指定物资的历史入库记录及供应商详情
  const fetchInHistory = async (goods: any) => {
    setCurrentGoods(goods);
    setDrawerOpen(true);
    setLoadingRecords(true);
    try {
      const [reportRes, supRes]: any = await Promise.all([
        getStockDetailReport({
          goodsName: goods.goodsName,
          docType: '入库',
          pageSize: 100,
        }),
        supplierList.length > 0 ? Promise.resolve({ rows: supplierList }) : listSupplier({ pageSize: 100 }),
      ]);

      if (supRes && supRes.rows) {
        setSupplierList(supRes.rows);
      }

      const records = (reportRes && reportRes.rows) ? reportRes.rows : [];
      setInRecords(records);
    } catch (e: any) {
      message.error(e.message || '获取入库记录失败');
    } finally {
      setLoadingRecords(false);
    }
  };

  // 根据供应商名称匹配供应商联系人及联系电话
  const findSupplierInfo = (supplierName: string) => {
    if (!supplierName) return null;
    return supplierList.find(
      (s) => s.supplierName === supplierName || s.supplierName?.includes(supplierName) || supplierName?.includes(s.supplierName)
    );
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setRecalcMode('A');
    setInitialRate(500);
    setCurrentRate(500);
    setInitialStockNum(0);
    setInitialRemainSheets(0);
    setIsRateChanged(false);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_goods', 'create');
    if (draft && draft.formValues && draft.formValues.goodsName) {
      form.setFieldsValue({
        ...draft.formValues,
        category: normalizeCategory(draft.formValues.category),
      });
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的物资档案草稿，已为您自动恢复！');
    } else {
      form.setFieldsValue({
        category: '1',
        unit: '包',
        baseUnit: '张',
        conversionRate: 500,
        stockNum: 0,
        remainSheets: 0,
        warnLow: 10,
        grade: '全校通用',
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.goodsId);

    const normCat = normalizeCategory(record.category);
    const rawRate = Number(record.conversionRate) || (normCat === '1' || normCat === '3' ? 500 : 1);
    const rawStock = Number(record.stockNum) || 0;
    const rawRemain = Number(record.remainSheets) || 0;
    setInitialRate(rawRate);
    setCurrentRate(rawRate);
    setInitialStockNum(rawStock);
    setInitialRemainSheets(rawRemain);
    setRecalcMode('A');
    setIsRateChanged(false);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_goods', record.goodsId);
    if (draft && draft.formValues) {
      form.setFieldsValue({
        ...draft.formValues,
        category: normalizeCategory(draft.formValues.category),
      });
      if (draft.formValues.conversionRate) {
        const dRate = Number(draft.formValues.conversionRate);
        setCurrentRate(dRate);
        setIsRateChanged(dRate !== rawRate);
      }
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该物资档案未保存的草稿数据！');
    } else {
      try {
        const res: any = await getGoods(record.goodsId);
        if (res && res.data) {
          const data = res.data;
          const curCat = normalizeCategory(data.category);
          const rate = Number(data.conversionRate) || (curCat === '1' || curCat === '3' ? 500 : 1);
          setInitialRate(rate);
          setCurrentRate(rate);
          setInitialStockNum(Number(data.stockNum) || 0);
          setInitialRemainSheets(Number(data.remainSheets) || 0);
          setIsRateChanged(false);
          form.setFieldsValue({
            ...data,
            category: curCat,
            conversionRate: rate,
            baseUnit: data.baseUnit || '张',
            remainSheets: data.remainSheets ?? 0,
          });
        }
      } catch (e) {}
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = editingId ? editingId : 'create';
      FormDraftUtil.clearDraft('stock_goods', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getGoods(editingId);
        if (res && res.data) {
          const data = res.data;
          const curCat = normalizeCategory(data.category);
          const rate = Number(data.conversionRate) || (curCat === '1' || curCat === '3' ? 500 : 1);
          setInitialRate(rate);
          setCurrentRate(rate);
          setInitialStockNum(Number(data.stockNum) || 0);
          setInitialRemainSheets(Number(data.remainSheets) || 0);
          setRecalcMode('A');
          setIsRateChanged(false);
          form.setFieldsValue({
            ...data,
            category: curCat,
            conversionRate: rate,
            baseUnit: data.baseUnit || '张',
            remainSheets: data.remainSheets ?? 0,
          });
        }
      } else {
        form.resetFields();
        setRecalcMode('A');
        setInitialRate(500);
        setCurrentRate(500);
        setIsRateChanged(false);
        form.setFieldsValue({
          category: '1',
          unit: '包',
          baseUnit: '张',
          conversionRate: 500,
          stockNum: 0,
          remainSheets: 0,
          warnLow: 10,
          grade: '全校通用',
        });
      }
      if (editingId) {
        message.success('已丢弃本地草稿，已恢复为数据库数据！');
      } else {
        message.success('已丢弃本地草稿，已刷新到未填写状态！');
      }
    } catch (e) {
      message.error('刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateGoods({ ...values, goodsId: editingId, recalcMode });
        if (isRateChanged) {
          message.success(`物资档案修改成功！已按【模式 ${recalcMode}】自动重算库存数据！`);
        } else {
          message.success('物资档案修改成功！');
        }
        FormDraftUtil.clearDraft('stock_goods', editingId);
      } else {
        await addGoods(values);
        message.success('物资档案新增成功！');
        FormDraftUtil.clearDraft('stock_goods', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    await delGoods(id);
    message.success('物资档案删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '物资ID',
      dataIndex: 'goodsId',
      width: 75,
      align: 'center',
    },
    {
      title: '物资名称',
      dataIndex: 'goodsName',
      width: 160,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.goodsName} placement="topLeft">
          <span style={{ display: 'inline-block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.goodsName || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '物资分类',
      dataIndex: 'category',
      width: 125,
      align: 'center',
      valueType: 'select',
      fieldProps: {
        placeholder: '请选择物资分类',
        options: goodsClassOptions.map((d) => ({
          label: d.dictLabel,
          value: d.dictValue,
        })),
      },
      render: (_, record) => {
        const catStr = normalizeCategory(record.category);
        const match = goodsClassOptions.find((d) => String(d.dictValue) === catStr);
        const label = match ? match.dictLabel : (record.category || '未分类');
        const colorMap: Record<string, string> = {
          '1': 'blue',
          '2': 'geekblue',
          '3': 'purple',
          '4': 'cyan',
        };
        return (
          <Tag color={colorMap[catStr] || 'default'}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: '适用年级',
      dataIndex: 'grade',
      width: 110,
      align: 'center',
      valueType: 'select',
      fieldProps: {
        placeholder: '请选择适用年级',
        options: [
          { label: '全校通用', value: '全校通用' },
          ...gradeOptions.map((d) => ({
            label: d.dictLabel,
            value: d.dictValue,
          })),
        ],
      },
      render: (_, record) => record.grade || '全校通用',
    },
    {
      title: '默认供应商',
      dataIndex: 'supplierName',
      width: 180,
      ellipsis: true,
      render: (_, record) =>
        record.supplierName ? (
          <Tooltip title={record.supplierName} placement="topLeft">
            <span style={{ display: 'inline-block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <ShopOutlined style={{ marginRight: 4, color: '#1677ff' }} />
              {record.supplierName}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: '#bbb' }}>未关联</span>
        ),
    },
    {
      title: '规格型号与换算',
      dataIndex: 'spec',
      width: 160,
      render: (_, record) => {
        const rate = Number(record.conversionRate) || 1;
        const unit = record.unit || '件';
        const baseUnit = record.baseUnit || '张';
        return (
          <div>
            <Tooltip title={record.spec || '-'} placement="topLeft">
              <div style={{ fontWeight: 500, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.spec || '-'}</div>
            </Tooltip>
            {rate > 1 && (
              <Tag color="blue" style={{ marginTop: 2, fontSize: 11, padding: '0 4px' }}>
                1{unit} = {rate}{baseUnit}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 70,
      align: 'center',
      render: (_, record) => record.unit || '件',
    },
    {
      title: '当前库存',
      dataIndex: 'stockNum',
      width: 170,
      align: 'left',
      render: (_, record) => {
        const stock = Number(record.stockNum ?? record.stock ?? 0);
        const remain = Number(record.remainSheets ?? 0);
        const rate = Number(record.conversionRate) || 1;
        const unit = record.unit || '件';
        const baseUnit = record.baseUnit || '张';
        const low = Number(record.warnLow ?? record.warnStock ?? 0);
        const isLow = low > 0 && stock <= low;
        const totalBase = rate > 1 ? stock * rate + remain : stock;

        return (
          <div>
            <Space size={4} wrap>
              <span style={{ fontWeight: 'bold', fontSize: 14, color: isLow ? '#ff4d4f' : '#1f1f1f' }}>
                {stock} {unit}
              </span>
              {remain > 0 && (
                <Tag color="orange" style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
                  +{remain}{baseUnit}
                </Tag>
              )}
              {isLow && (
                <Tag color="error" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
                  预警
                </Tag>
              )}
            </Space>
            {rate > 1 && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                折合: <span style={{ color: '#0958d9', fontWeight: 500 }}>{totalBase.toLocaleString()}</span> {baseUnit}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '库存下限',
      dataIndex: 'warnLow',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <span style={{ color: '#888' }}>{record.warnLow ?? record.warnStock ?? 10}</span>
      ),
    },
    {
      title: '存放位置',
      dataIndex: 'location',
      width: 140,
      render: (_, record) => record.location || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            key="inHistory"
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            style={{ color: '#1677ff' }}
            onClick={() => fetchInHistory(record)}
          >
            入库明细
          </Button>
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            修改
          </Button>
          <Authorized key="del" permission="stock:goods:remove">
            <Popconfirm
              key="del"
              title="确认彻底删除该物资档案？"
              onConfirm={() => handleDelete(record.goodsId)}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Authorized>
        </Space>
      ),
    },
  ];

  // 历史入库抽屉的表格列配置
  const inRecordColumns = [
    {
      title: '入库单号',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 140,
      render: (text: string) => <Tag color="blue">{text || '-'}</Tag>,
    },
    {
      title: '入库时间',
      dataIndex: 'docTime',
      key: 'docTime',
      width: 155,
      render: (text: string) => text ? text.replace('T', ' ').substring(0, 19) : '-',
    },
    {
      title: '供应商信息',
      dataIndex: 'target',
      key: 'target',
      width: 220,
      render: (supplierName: string) => {
        if (!supplierName) {
          return <span style={{ color: '#999' }}>未关联供应商</span>;
        }
        const info = findSupplierInfo(supplierName);
        return (
          <div>
            <Space direction="vertical" size={2}>
              <Space orientation="horizontal" size={4}>
                <ShopOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 500 }}>{supplierName}</span>
              </Space>
              {info && (info.contact || info.phone) && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  {info.contact && (
                    <span style={{ marginRight: 8 }}>
                      <UserOutlined style={{ marginRight: 2, color: '#888' }} />
                      {info.contact}
                    </span>
                  )}
                  {info.phone && (
                    <span>
                      <PhoneOutlined style={{ marginRight: 2, color: '#888' }} />
                      {info.phone}
                    </span>
                  )}
                </div>
              )}
            </Space>
          </div>
        );
      },
    },
    {
      title: '入库数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 95,
      align: 'right' as const,
      render: (qty: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          +{qty} {currentGoods?.unit || ''}
        </span>
      ),
    },
    {
      title: '采购单价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right' as const,
      render: (price: any) => (
        <span>¥{Number(price || 0).toFixed(2)}</span>
      ),
    },
    {
      title: '金额小计',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right' as const,
      render: (amt: any) => (
        <span style={{ fontWeight: 600, color: '#cf1322' }}>
          ¥{Number(amt || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      key: 'operator',
      width: 90,
      render: (val: string) => val || '-',
    },
    {
      title: '业务类型',
      dataIndex: 'bizType',
      key: 'bizType',
      width: 95,
      render: (val: string) => <Tag color="green">{val || '采购入库'}</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
  ];

  // 计算入库统计数据
  const totalInQty = inRecords.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalInAmount = inRecords.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const latestRecord = inRecords.length > 0 ? inRecords[0] : null;

  return (
    <PageContainer header={{ title: '物资档案' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="goodsId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listGoods({
            ...params,
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
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增物资档案
          </Button>,
        ]}
      />

      {/* 新增/修改物资档案弹窗 */}
      <Modal
        title={editingId ? '修改物资档案' : '新增物资档案'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={680}
        destroyOnHidden={false}
      >
        <DraftNoticeAlert
          visible={!!draftNotice?.visible}
          timeText={draftNotice?.timeText}
          onDiscard={handleDiscardDraft}
          loading={discardLoading}
          isEdit={!!editingId}
        />
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed, all) => {
            if ('conversionRate' in changed) {
              const val = Number(changed.conversionRate) || 1;
              setCurrentRate(val);
              if (editingId) {
                setIsRateChanged(val !== initialRate);
              }
            }
            triggerSaveGoodsDraft(all);
          }}
        >
          <Form.Item
            name="goodsName"
            label="物资名称"
            rules={[{ required: true, message: '请输入物资名称' }]}
          >
            <Input placeholder="如：8K双胶统考试卷纸、A4 80g 复印纸" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="物资分类"
                rules={[{ required: true, message: '请选择物资分类' }]}
              >
                <Select placeholder="请选择物资分类" allowClear>
                  {goodsClassOptions.map((dict) => (
                    <Select.Option key={dict.dictValue} value={dict.dictValue}>
                      {dict.dictLabel}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="grade"
                label="适用年级"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('category') === '2' && (!value || !value.trim())) {
                        return Promise.reject(new Error('学生教材类物资必须选择适用年级！'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Select placeholder="全校通用或指定年级" allowClear>
                  <Select.Option value="全校通用">全校通用</Select.Option>
                  {gradeOptions.map((dict) => (
                    <Select.Option key={dict.dictValue} value={dict.dictValue}>
                      {dict.dictLabel}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="默认供应商"
                extra="关联该物资的默认供货厂商，入库单可自动带出"
              >
                <Select
                  placeholder="选择默认供应商（可选）"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {supplierList.map((s) => (
                    <Select.Option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Card
            size="small"
            title="包装规格与基础单位换算设计"
            style={{ backgroundColor: '#fafafa', marginBottom: 16, border: '1px solid #d9d9d9' }}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="spec"
                  label="规格型号描述"
                  rules={[{ required: true, message: '请输入规格型号' }]}
                  extra="纸张如：8K/包(500张特厚)、A4 80g金旗舰"
                >
                  <Input placeholder="如：8K/包(500张特厚)" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="unit"
                  label="包装计量单位"
                  rules={[{ required: true, message: '请输入包装单位' }]}
                  extra="入库包装单位"
                >
                  <Input placeholder="包/箱/盒" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="baseUnit"
                  label="最小基础单位"
                  rules={[{ required: true, message: '请输入基础单位' }]}
                  extra="文印扣减单位"
                >
                  <Input placeholder="张/支/本" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="conversionRate"
              label="每包装换算含量（换算率）"
              rules={[{ required: true, message: '请输入换算率' }]}
              extra={
                <div style={{ marginTop: 4 }}>
                  <span>快捷设为：</span>
                  <Space size={6} wrap style={{ marginTop: 4 }}>
                    <Button size="small" onClick={() => handleRateChange(500)}>
                      500 张/包 (常用)
                    </Button>
                    <Button size="small" onClick={() => handleRateChange(1000)}>
                      1000 张/包 (统考大包装)
                    </Button>
                    <Button size="small" onClick={() => handleRateChange(4000)}>
                      4000 张/箱 (整箱装)
                    </Button>
                    <Button size="small" onClick={() => handleRateChange(1)}>
                      1 (单件/非拆零物资)
                    </Button>
                  </Space>
                </div>
              }
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                addonAfter={
                  <Form.Item noStyle shouldUpdate>
                    {() => `${form.getFieldValue('baseUnit') || '张'} / ${form.getFieldValue('unit') || '包'}`}
                  </Form.Item>
                }
                onChange={(val) => handleRateChange(Number(val) || 1)}
              />
            </Form.Item>

            {/* 换算率变更提示及模式选择向导 */}
            {editingId && isRateChanged && (
              <div
                style={{
                  background: '#f0f5ff',
                  border: '1px solid #adc6ff',
                  borderRadius: 8,
                  padding: 14,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: '#1d39c4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <InfoCircleOutlined />
                  <span>
                    检测到包装规格换算率发生变化（原：{initialRate} ➔ 现：{currentRate}）
                  </span>
                </div>
                <div style={{ color: '#434343', fontSize: 13, marginBottom: 10 }}>
                  系统检测到您修改了每包含量，请选择库存重算模式（默认为模式 A）：
                </div>

                <Radio.Group
                  value={recalcMode}
                  onChange={(e) => setRecalcMode(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <Card
                      size="small"
                      style={{
                        borderColor: recalcMode === 'A' ? '#1677ff' : '#d9d9d9',
                        background: recalcMode === 'A' ? '#e6f4ff' : '#fff',
                        cursor: 'pointer',
                      }}
                      onClick={() => setRecalcMode('A')}
                    >
                      <Radio value="A">
                        <span style={{ fontWeight: 600 }}>模式 A：实物包装数保持不变，重算折合总基础量</span>
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          默认推荐
                        </Tag>
                      </Radio>
                      <div style={{ paddingLeft: 24, fontSize: 12, color: '#595959', marginTop: 4 }}>
                        <div>
                          • 货架包装数保持不变（仍为 <b>{initialStockNum}</b> {form.getFieldValue('unit') || '包'}），散张余量（<b>{initialRemainSheets}</b> {form.getFieldValue('baseUnit') || '张'}）不变。
                        </div>
                        <div>
                          • 全库可用总张数重算为：
                          <span style={{ color: '#1677ff', fontWeight: 600 }}>
                            {(initialStockNum * currentRate + initialRemainSheets).toLocaleString()}
                          </span>{' '}
                          {form.getFieldValue('baseUnit') || '张'}
                          （原折合为 {(initialStockNum * initialRate + initialRemainSheets).toLocaleString()}{' '}
                          {form.getFieldValue('baseUnit') || '张'}）。
                        </div>
                        <div style={{ color: '#8c8c8c' }}>
                          • 适用：仓库货架就是这几包，更换了新进货包装规格（新进每包装规格不同）。
                        </div>
                      </div>
                    </Card>

                    <Card
                      size="small"
                      style={{
                        borderColor: recalcMode === 'B' ? '#1677ff' : '#d9d9d9',
                        background: recalcMode === 'B' ? '#e6f4ff' : '#fff',
                        cursor: 'pointer',
                      }}
                      onClick={() => setRecalcMode('B')}
                    >
                      <Radio value="B">
                        <span style={{ fontWeight: 600 }}>模式 B：实际总基础数量不变，重算折合包装数（包数按比例折算）</span>
                      </Radio>
                      <div style={{ paddingLeft: 24, fontSize: 12, color: '#595959', marginTop: 4 }}>
                        <div>
                          • 仓库现存总张数严格保持不变（共 <b>{(initialStockNum * initialRate + initialRemainSheets).toLocaleString()}</b> {form.getFieldValue('baseUnit') || '张'}）。
                        </div>
                        <div>
                          • 按新包装规格折算后：
                          库存包装数重算为{' '}
                          <span style={{ color: '#1677ff', fontWeight: 600 }}>
                            {Math.floor((initialStockNum * initialRate + initialRemainSheets) / currentRate)}
                          </span>{' '}
                          {form.getFieldValue('unit') || '包'}
                          {(initialStockNum * initialRate + initialRemainSheets) % currentRate > 0 ? (
                            <span>
                              ，散张余量重算为{' '}
                              <span style={{ color: '#fa8c16', fontWeight: 600 }}>
                                {(initialStockNum * initialRate + initialRemainSheets) % currentRate}
                              </span>{' '}
                              {form.getFieldValue('baseUnit') || '张'}
                            </span>
                          ) : (
                            '，散张余量为 0 张'
                          )}。
                        </div>
                        <div style={{ color: '#8c8c8c' }}>
                          • 适用：原规格建账误填，需将原存总纸张数折算回真实大包装包数。
                        </div>
                      </div>
                    </Card>
                  </Space>
                </Radio.Group>
              </div>
            )}
          </Card>

          {editingId ? (
            <Card
              size="small"
              title="当前库存结存（只读，库存变更请走出入库单）"
              style={{ backgroundColor: '#fffbe6', marginBottom: 16, border: '1px solid #ffe58f' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    整包/件库存数
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1f1f1f', marginTop: 2 }}>
                      {initialStockNum} {form.getFieldValue('unit') || '包'}
                      {initialRemainSheets > 0 ? ` 又 ${initialRemainSheets} ${form.getFieldValue('baseUnit') || '张'}` : ''}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    折合基础单位总量
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#0958d9', marginTop: 2 }}>
                      {Number(initialStockNum * currentRate + initialRemainSheets).toLocaleString()} {form.getFieldValue('baseUnit') || '张'}
                    </div>
                  </div>
                </Col>
              </Row>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                <InfoCircleOutlined style={{ marginRight: 4, color: '#faad14' }} />
                物资库存由采购入库单、领用出库单、文印耗材出库联动自动变更，档案编辑无法直接修改库存数。
              </div>
            </Card>
          ) : null}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="warnLow"
                label="最低安全库存预警线"
                rules={[{ required: true, message: '请输入安全库存预警线' }]}
                extra="当库存少于该数值时，仪表盘与列表触发预警"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="仓库存放库位 / 货架区">
                <Input placeholder="如：1号楼文印室货架A区第2层" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 方案1：入库记录与供货商来源抽屉 */}
      <Drawer
        title={
          <Space>
            <span>入库明细与供货来源</span>
            {currentGoods && (
              <Tag color="blue">{currentGoods.goodsName}</Tag>
            )}
          </Space>
        }
        width={850}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              loading={loadingRecords}
              onClick={() => fetchInHistory(currentGoods)}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => {
                setDrawerOpen(false);
                navigate('/stock/in');
              }}
            >
              去入库单管理
            </Button>
          </Space>
        }
      >
        {currentGoods && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 物资基本信息与库存状态 */}
            <Card size="small" title="物资基础属性与当前结存" style={{ backgroundColor: '#fafafa' }}>
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="物资名称">
                  <Text strong>{currentGoods.goodsName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="物资分类">
                  {(() => {
                    const catStr = normalizeCategory(currentGoods.category);
                    const match = goodsClassOptions.find((d) => String(d.dictValue) === catStr);
                    const label = match ? match.dictLabel : (currentGoods.category || '未分类');
                    return <Tag color="cyan">{label}</Tag>;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="规格型号">
                  {currentGoods.spec || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="包装换算率">
                  {Number(currentGoods.conversionRate) > 1
                    ? `1 ${currentGoods.unit || '包'} = ${currentGoods.conversionRate} ${currentGoods.baseUnit || '张'}`
                    : '1:1 (单件)'}
                </Descriptions.Item>
                <Descriptions.Item label="计量单位">
                  {currentGoods.unit || '件'}（基础单位: {currentGoods.baseUnit || '张'}）
                </Descriptions.Item>
                <Descriptions.Item label="存放库位">
                  {currentGoods.location || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="当前在库状态" span={2}>
                  <Space wrap>
                    <Text
                      strong
                      style={{
                        fontSize: 16,
                        color:
                          Number(currentGoods.stockNum || 0) <= Number(currentGoods.warnLow || 0)
                            ? '#ff4d4f'
                            : '#52c41a',
                      }}
                    >
                      {currentGoods.stockNum ?? 0} {currentGoods.unit || ''}
                      {Number(currentGoods.remainSheets || 0) > 0 && ` 又 ${currentGoods.remainSheets} ${currentGoods.baseUnit || '张'}`}
                    </Text>
                    {Number(currentGoods.conversionRate || 1) > 1 && (
                      <Tag color="blue">
                        折合共 {(Number(currentGoods.stockNum || 0) * Number(currentGoods.conversionRate || 1) + Number(currentGoods.remainSheets || 0)).toLocaleString()} {currentGoods.baseUnit || '张'}
                      </Tag>
                    )}
                    {Number(currentGoods.stockNum || 0) <= Number(currentGoods.warnLow || 0) && (
                      <Tag color="error" icon={<WarningOutlined />}>
                        缺货预警 (下限:{currentGoods.warnLow})
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 累计入库汇总看板 */}
            <Row gutter={12}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="累计入库批次"
                    value={inRecords.length}
                    suffix="批"
                    valueStyle={{ color: '#1677ff', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="累计入库数量"
                    value={totalInQty}
                    suffix={currentGoods?.unit || ''}
                    valueStyle={{ color: '#52c41a', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="累计采购支出"
                    value={totalInAmount}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14, marginBottom: 4 }}>
                    最近供货商
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: latestRecord?.target ? '#1677ff' : '#999',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={latestRecord?.target || '暂无供货记录'}
                  >
                    {latestRecord?.target || '暂无供货记录'}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 历史入库流水表格 */}
            <Card
              size="small"
              title={
                <Space>
                  <span>历史采购入库流水明细</span>
                  <Tag color="blue">{inRecords.length} 条记录</Tag>
                </Space>
              }
            >
              <Table
                columns={inRecordColumns}
                dataSource={inRecords}
                rowKey={(r, idx) => `${r.docNo}-${idx}`}
                loading={loadingRecords}
                size="small"
                scroll={{ x: 980 }}
                pagination={{
                  defaultPageSize: 5,
                  pageSizeOptions: ['5', '10', '20'],
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条明细`,
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="该物资暂无历史入库单据记录（可能为系统初始化直接录入库存）"
                    />
                  ),
                }}
              />
            </Card>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default GoodsPage;
