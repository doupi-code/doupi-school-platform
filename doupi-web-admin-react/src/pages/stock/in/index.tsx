import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
  SaveOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { useUserStore } from '@/store/useUserStore';
import { listIn, getIn, addIn, delIn, cancelIn } from '@/api/stock/in';
import { listSupplier } from '@/api/stock/supplier';
import { listGoods } from '@/api/stock/goods';
import { FormDraftUtil } from '@/utils/formDraft';
import dayjs from 'dayjs';

const { Text } = Typography;

const StockInPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const { name: currentUserName, nickName: currentNickName } = useUserStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  // 基础数据
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [goodsList, setGoodsList] = useState<any[]>([]);

  // 动态明细子表行数据
  const [items, setItems] = useState<any[]>([]);

  // 触发保存草稿
  const triggerSaveInDraft = (fields?: any, curItems?: any[]) => {
    const currentValues = fields || form.getFieldsValue();
    const targetItems = curItems !== undefined ? curItems : items;
    FormDraftUtil.saveDraft('stock_in', 'create', currentValues, targetItems);
    const d = FormDraftUtil.getDraft('stock_in', 'create');
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  useEffect(() => {
    listSupplier({ pageSize: 100 }).then((res: any) => {
      if (res && res.rows) setSupplierList(res.rows);
    }).catch(() => {});
    listGoods({ pageSize: 200 }).then((res: any) => {
      if (res && res.rows) setGoodsList(res.rows);
    }).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    form.resetFields();
    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_in', 'create');
    if (draft && (draft.formValues?.supplierId || (draft.extraData && draft.extraData.length > 0))) {
      form.setFieldsValue(draft.formValues);
      setItems(draft.extraData || []);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的采购入库单草稿，已为您自动恢复！');
    } else {
      setItems([]);
      form.setFieldsValue({
        inType: '1',
        inTime: dayjs().format('YYYY-MM-DD'),
        operator: currentNickName || currentUserName || '管理员',
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      FormDraftUtil.clearDraft('stock_in', 'create');
      setDraftNotice(null);
      form.resetFields();
      setItems([]);
      form.setFieldsValue({
        inType: '1',
        inTime: dayjs().format('YYYY-MM-DD'),
        operator: currentNickName || currentUserName || '管理员',
      });
      message.success('已丢弃本地草稿，已刷新到未填写状态！');
    } catch (e: any) {
      message.error(e.message || '刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleAddItem = () => {
    const next = [
      ...items,
      {
        key: Date.now() + Math.random(),
        goodsId: undefined,
        goodsName: '',
        spec: '',
        unit: '包',
        stockNum: 0,
        quantity: 1,
        price: 0,
        amount: 0,
      },
    ];
    setItems(next);
    triggerSaveInDraft(form.getFieldsValue(), next);
  };

  const handleRemoveItem = (key: any) => {
    const next = items.filter((i) => i.key !== key);
    setItems(next);
    triggerSaveInDraft(form.getFieldsValue(), next);
  };

  // 选择物品时自动带出规格、单位和当前库存
  const handleItemGoodsChange = (key: any, goodsId: any) => {
    const targetGoods = goodsList.find((g) => g.goodsId === goodsId);
    const next = items.map((item) => {
      if (item.key === key) {
        const spec = targetGoods?.spec || '-';
        const unit = targetGoods?.unit || '件';
        const stockNum = targetGoods?.stockNum ?? targetGoods?.stock ?? 0;
        const goodsName = targetGoods?.goodsName || '';
        const conversionRate = Number(targetGoods?.conversionRate) > 0 ? Number(targetGoods.conversionRate) : 1;
        const baseUnit = targetGoods?.baseUnit || unit;
        const amount = Number((item.quantity * item.price).toFixed(2));
        return {
          ...item,
          goodsId,
          goodsName,
          spec,
          unit,
          stockNum,
          conversionRate,
          baseUnit,
          amount,
        };
      }
      return item;
    });
    setItems(next);
    triggerSaveInDraft(form.getFieldsValue(), next);
  };

  const handleItemQuantityChange = (key: any, quantity: number | null) => {
    const q = quantity || 0;
    const next = items.map((item) => {
      if (item.key === key) {
        const amount = Number((q * item.price).toFixed(2));
        return { ...item, quantity: q, amount };
      }
      return item;
    });
    setItems(next);
    triggerSaveInDraft(form.getFieldsValue(), next);
  };

  const handleItemPriceChange = (key: any, price: number | null) => {
    const p = price || 0;
    const next = items.map((item) => {
      if (item.key === key) {
        const amount = Number((item.quantity * p).toFixed(2));
        return { ...item, price: p, amount };
      }
      return item;
    });
    setItems(next);
    triggerSaveInDraft(form.getFieldsValue(), next);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSaveIn = async () => {
    try {
      const values = await form.validateFields();
      if (items.length === 0) {
        message.warning('请至少添加一行入库物品明细！');
        return;
      }
      for (const it of items) {
        if (!it.goodsId) {
          message.warning('请为所有明细选择物品！');
          return;
        }
      }

      const supplier = supplierList.find((s) => s.supplierId === values.supplierId);

      await addIn({
        ...values,
        supplierName: supplier ? supplier.supplierName : values.supplierName,
        totalAmount: Number(totalAmount.toFixed(2)),
        itemList: items.map((i) => ({
          goodsId: i.goodsId,
          goodsName: i.goodsName,
          spec: i.spec,
          unit: i.unit,
          quantity: i.quantity,
          price: i.price,
          amount: i.amount,
        })),
      });

      message.success('入库单创建成功！已自动更新物资库存');
      FormDraftUtil.clearDraft('stock_in', 'create');
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存入库单失败');
    }
  };

  const handleCancelIn = async (record: any) => {
    try {
      await cancelIn(record.inId);
      message.success('入库单已作废！对应入库数量已自动扣减回退');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '作废失败');
    }
  };

  const handleViewDetail = async (record: any) => {
    try {
      const res: any = await getIn(record.inId);
      if (res && res.data) {
        setCurrentRecord(res.data);
      } else {
        setCurrentRecord(record);
      }
      setDetailOpen(true);
    } catch (e) {
      setCurrentRecord(record);
      setDetailOpen(true);
    }
  };

  const columns: ProColumns[] = [
    {
      title: '入库单号',
      dataIndex: 'inNo',
      width: 150,
      render: (_, record) => (
        <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500 }}>
          {record.inNo}
        </a>
      ),
    },
    {
      title: '入库类型',
      dataIndex: 'inType',
      width: 100,
      align: 'center',
      valueEnum: {
        '1': { text: '采购入库' },
        '2': { text: '调拨入库' },
        '3': { text: '捐赠入库' },
        '4': { text: '盘盈入库' },
      },
      render: (_, record) => {
        const typeMap: Record<string, string> = {
          '1': '采购入库',
          '2': '调拨入库',
          '3': '捐赠入库',
          '4': '盘盈入库',
        };
        return <Tag color="blue">{typeMap[record.inType] || record.inType || '采购入库'}</Tag>;
      },
    },
    {
      title: '供货厂商/供应商',
      dataIndex: 'supplierName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 95,
      align: 'center',
      render: (_, record) => record.operatorNickName || record.operator || '-',
    },
    {
      title: '入库日期',
      dataIndex: 'inTime',
      valueType: 'date',
      width: 110,
      align: 'center',
    },
    {
      title: '总金额 (元)',
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ color: '#1890FF' }}>
          ¥{Number(record.totalAmount || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '单据状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      valueEnum: {
        '0': { text: '正常入库', status: 'Success' },
        '2': { text: '已作废', status: 'Default' },
      },
      render: (_, record) =>
        record.status === '2' ? (
          <Tag color="default">已作废</Tag>
        ) : (
          <Tag color="success">正常入库</Tag>
        ),
    },
    {
      title: '单据备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            key="detail"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            明细
          </Button>
          {record.status !== '2' && (
            <Popconfirm
              key="cancel"
              title="确认作废该入库单？对应物品库存将联动回退扣减！"
              onConfirm={() => handleCancelIn(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                作废
              </Button>
            </Popconfirm>
          )}
          <Authorized key="del" permission="stock:in:remove">
            <Popconfirm
              key="del"
              title="确认彻底删除该入库单？"
              onConfirm={async () => {
                await delIn(record.inId);
                message.success('删除成功');
                actionRef.current?.reload();
              }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Authorized>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '采购入库管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="inId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listIn({
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
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            新建采购入库单
          </Button>,
        ]}
      />

      {/* 新增入库单居中大弹窗 */}
      <Modal
        title={
          <Space>
            <SaveOutlined style={{ color: '#1677ff' }} />
            <span style={{ fontWeight: 600 }}>新建采购入库单（自动联动递增库存）</span>
          </Space>
        }
        width={960}
        centered
        open={modalOpen}
        destroyOnHidden={false}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleSaveIn}>
            确认入库并记账
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto', paddingRight: 8 }}>
          <DraftNoticeAlert
            visible={!!draftNotice?.visible}
            timeText={draftNotice?.timeText}
            onDiscard={handleDiscardDraft}
            loading={discardLoading}
            isEdit={false}
          />
          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_ch, all) => triggerSaveInDraft(all, items)}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="inType" label="入库类型" rules={[{ required: true }]}>
                  <Select placeholder="选择入库类型">
                    <Select.Option value="1">采购入库</Select.Option>
                    <Select.Option value="2">调拨入库</Select.Option>
                    <Select.Option value="3">捐赠入库</Select.Option>
                    <Select.Option value="4">盘盈入库</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="supplierId" label="供货供应商" rules={[{ required: true, message: '请选择供应商' }]}>
                  <Select
                    placeholder="选择供应商"
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
              <Col span={8}>
                <Form.Item name="operator" label="验收经办人" rules={[{ required: true }]}>
                  <Input placeholder="经办人姓名" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="inTime" label="入库日期" rules={[{ required: true }]}>
                  <Input placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="remark" label="单据备注说明">
                  <Input placeholder="如：发票号、采购批次号等" />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Card
            title="入库物品明细清单"
            size="small"
            extra={
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddItem}>
                添加物品行
              </Button>
            }
            style={{ marginTop: 12 }}
          >
            <Table
              dataSource={items}
              rowKey="key"
              pagination={false}
              scroll={{ x: 750 }}
              columns={[
                {
                  title: '选择入库物品',
                  dataIndex: 'goodsId',
                  width: 240,
                  render: (_, r) => (
                    <Select
                      placeholder="选择物资物品"
                      value={r.goodsId}
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                      onChange={(val) => handleItemGoodsChange(r.key, val)}
                    >
                      {goodsList.map((g) => (
                        <Select.Option key={g.goodsId} value={g.goodsId}>
                          {g.goodsName} {g.spec ? `(${g.spec})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  ),
                },
                {
                  title: '单位',
                  dataIndex: 'unit',
                  width: 120,
                  align: 'center',
                  render: (_, r) => {
                    const rate = Number(r.conversionRate) > 0 ? Number(r.conversionRate) : 1;
                    const baseUnit = r.baseUnit || r.unit || '件';
                    return (
                      <Tooltip
                        title={
                          rate > 1
                            ? `整装物品：每${r.unit || '包'}含 ${rate} ${baseUnit}，入库数量按「${r.unit || '包'}」计`
                            : `散装物品：换算率 1:1，入库数量按「${r.unit || '件'}」直接计`
                        }
                      >
                        <span style={{ cursor: 'help', borderBottom: '1px dashed #bbb' }}>
                          {r.unit || '件'}
                          {rate > 1 && <span style={{ fontSize: 11, color: '#888' }}>/{rate}{baseUnit}</span>}
                        </span>
                      </Tooltip>
                    );
                  },
                },
                {
                  title: '现库存',
                  dataIndex: 'stockNum',
                  width: 80,
                  align: 'center',
                  render: (val) => <span style={{ color: '#888' }}>{val || 0}</span>,
                },
                {
                  title: '入库数量',
                  dataIndex: 'quantity',
                  width: 110,
                  render: (_, r) => (
                    <InputNumber
                      min={1}
                      style={{ width: '100%' }}
                      value={r.quantity}
                      onChange={(val) => handleItemQuantityChange(r.key, val)}
                    />
                  ),
                },
                {
                  title: '单价 (元)',
                  dataIndex: 'price',
                  width: 110,
                  render: (_, r) => (
                    <InputNumber
                      min={0}
                      step={0.1}
                      style={{ width: '100%' }}
                      value={r.price}
                      onChange={(val) => handleItemPriceChange(r.key, val)}
                    />
                  ),
                },
                {
                  title: '小计 (元)',
                  dataIndex: 'amount',
                  width: 95,
                  align: 'right',
                  render: (val) => (
                    <Text strong style={{ color: '#52C41A' }}>
                      ¥{Number(val || 0).toFixed(2)}
                    </Text>
                  ),
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 60,
                  align: 'center',
                  render: (_, r) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveItem(r.key)}
                    />
                  ),
                },
              ]}
            />

            <div
              style={{
                marginTop: 16,
                padding: '10px 16px',
                backgroundColor: '#FAFAFA',
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                已添加品种：<Text strong>{items.length}</Text> 种 ｜ 总入库件数：
                <Text strong style={{ color: '#1890FF' }}>{totalQuantity}</Text> 件
              </span>
              <span>
                入库单折合总金额：
                <Text strong style={{ fontSize: 18, color: '#F5222D', marginLeft: 6 }}>
                  ¥{totalAmount.toFixed(2)}
                </Text>
              </span>
            </div>
          </Card>
        </div>
      </Modal>

      {/* 入库单详细弹窗 */}
      <Modal
        title={`采购入库单详情 - ${currentRecord?.inNo || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="入库单号">{currentRecord.inNo}</Descriptions.Item>
              <Descriptions.Item label="入库类型">
                <Tag color="blue">
                  {{ '1': '采购入库', '2': '调拨入库', '3': '捐赠入库', '4': '盘盈入库' }[currentRecord.inType] || currentRecord.inType || '采购入库'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="供应商">{currentRecord.supplierName || '-'}</Descriptions.Item>
              <Descriptions.Item label="经办人">{currentRecord.operatorNickName || currentRecord.operator || '-'}</Descriptions.Item>
              <Descriptions.Item label="入库日期">{currentRecord.inTime}</Descriptions.Item>
              <Descriptions.Item label="单据状态">
                {currentRecord.status === '2' ? (
                  <Tag color="default">已作废</Tag>
                ) : (
                  <Tag color="success">正常入库</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="总金额" span={2}>
                <Text strong style={{ fontSize: 16, color: '#F5222D' }}>
                  ¥{Number(currentRecord.totalAmount || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="单据备注" span={2}>
                {currentRecord.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📦 入库物资明细：</div>
              <Table
                dataSource={currentRecord.itemList || []}
                rowKey={(r: any, idx) => r.itemId || String(idx)}
                pagination={false}

                size="small"
                columns={[
                  { title: '物品名称', dataIndex: 'goodsName' },
                  { title: '规格', dataIndex: 'spec' },
                  { title: '单位', dataIndex: 'unit', align: 'center' },
                  { title: '入库数量', dataIndex: 'quantity', align: 'center' },
                  {
                    title: '采购单价',
                    dataIndex: 'price',
                    align: 'right',
                    render: (v) => `¥${Number(v || 0).toFixed(2)}`,
                  },
                  {
                    title: '小计金额',
                    dataIndex: 'amount',
                    align: 'right',
                    render: (v) => `¥${Number(v || 0).toFixed(2)}`,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default StockInPage;
