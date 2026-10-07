import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Descriptions,
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
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import { useUserStore } from '@/store/useUserStore';
import {
  listCheck,
  getCheck,
  prepareCheck,
  addCheck,
  auditCheck,
  cancelCheck,
  delCheck,
} from '@/api/stock/check';
import dayjs from 'dayjs';

const { Text } = Typography;

const StockCheckPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const { name: currentUserName } = useUserStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // 盘点明细列表（账面库存 vs 实盘数量）
  const [checkItems, setCheckItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [checkType, setCheckType] = useState('1');

  // 打开新增盘点对话框
  const handleOpenAdd = () => {
    form.resetFields();
    setCheckItems([]);
    setCheckType('1');
    form.setFieldsValue({
      checkType: '1',
      category: '纸张耗材',
      checkTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      operator: currentUserName || '管理员',
    });
    setModalOpen(true);
    // 默认加载全量物品
    handleLoadPrepareItems('1', undefined);
  };

  // 自动拉取待盘点物资及其账面库存
  const handleLoadPrepareItems = async (type: string, category?: string) => {
    setLoadingItems(true);
    try {
      const res: any = await prepareCheck({
        checkType: type,
        category: type === '2' ? category : undefined,
      });
      if (res && res.data) {
        const list = res.data.map((item: any) => ({
          ...item,
          realNum: item.bookNum ?? 0, // 初始默认等于账面库存
          diffNum: 0,
        }));
        setCheckItems(list);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  // 实盘数量变更
  const handleRealNumChange = (goodsId: any, val: number | null) => {
    const real = val ?? 0;
    setCheckItems((prev) =>
      prev.map((item) => {
        if (item.goodsId === goodsId) {
          const diff = real - (item.bookNum || 0);
          return {
            ...item,
            realNum: real,
            diffNum: diff,
          };
        }
        return item;
      })
    );
  };

  // 保存发起盘点
  const handleSaveCheck = async () => {
    try {
      const values = await form.validateFields();
      if (checkItems.length === 0) {
        message.warning('当前无待盘点物资，请先点击加载待盘点物资！');
        return;
      }

      await addCheck({
        ...values,
        itemList: checkItems.map((i) => ({
          goodsId: i.goodsId,
          goodsName: i.goodsName,
          spec: i.spec,
          unit: i.unit,
          category: i.category,
          bookNum: i.bookNum,
          realNum: i.realNum,
          diffNum: i.diffNum,
        })),
      });

      message.success('盘点单发起成功！请组织仓库核实后进行审核');
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  // 审核盘点
  const handleAudit = async (record: any) => {
    try {
      await auditCheck(record.checkId);
      message.success('盘点单审核通过！系统物资库存已自动根据实盘结果校准');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '审核失败');
    }
  };

  // 作废盘点
  const handleCancel = async (record: any) => {
    try {
      await cancelCheck(record.checkId);
      message.success('盘点单已作废');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '作废失败');
    }
  };

  // 查看详情
  const handleViewDetail = async (record: any) => {
    try {
      const res: any = await getCheck(record.checkId);
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
      title: '盘点单号',
      dataIndex: 'checkNo',
      width: 150,
      render: (_, record) => (
        <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500 }}>
          {record.checkNo}
        </a>
      ),
    },
    {
      title: '盘点类型',
      dataIndex: 'checkType',
      width: 110,
      align: 'center',
      valueEnum: {
        '1': { text: '全量盘点' },
        '2': { text: '按分类盘点' },
      },
      render: (_, record) => (
        <Tag color={record.checkType === '1' ? 'purple' : 'cyan'}>
          {record.checkType === '1' ? '全量盘点' : '分类抽检'}
        </Tag>
      ),
    },
    {
      title: '物资范围/分类',
      dataIndex: 'category',
      width: 120,
      align: 'center',
      render: (_, record) => (record.checkType === '1' ? '全仓物资' : record.category || '-'),
    },
    {
      title: '盘点时间',
      dataIndex: 'checkTime',
      valueType: 'dateTime',
      width: 160,
      align: 'center',
    },
    {
      title: '盘点经办人',
      dataIndex: 'operator',
      width: 100,
      align: 'center',
    },
    {
      title: '单据状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      valueEnum: {
        '1': { text: '待审核', status: 'Warning' },
        '2': { text: '已审核', status: 'Success' },
        '3': { text: '已作废', status: 'Default' },
      },
      render: (_, record) => {
        if (record.status === '1') return <Tag color="warning">待审核确认</Tag>;
        if (record.status === '2') return <Tag color="success">已审核平账</Tag>;
        if (record.status === '3') return <Tag color="default">已作废</Tag>;
        return <Tag>{record.status}</Tag>;
      },
    },
    {
      title: '盘点备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (
        <Tooltip title={record.remark} placement="topLeft">
          <span style={{ display: 'inline-block', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.remark || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
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
          {record.status === '1' && (
            <Popconfirm
              key="audit"
              title="确认审核通过？系统将自动校准差异物品的账面实际库存！"
              onConfirm={() => handleAudit(record)}
            >
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52C41A' }}>
                审核
              </Button>
            </Popconfirm>
          )}
          {record.status === '1' && (
            <Popconfirm
              key="cancel"
              title="确认作废该盘点单？"
              onConfirm={() => handleCancel(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                作废
              </Button>
            </Popconfirm>
          )}
          <Authorized key="del" permission="stock:check:remove">
            <Popconfirm
              key="del"
              title="确认彻底删除该盘点单？"
              onConfirm={async () => {
                await delCheck(record.checkId);
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
    <PageContainer header={{ title: '库存盘点管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="checkId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listCheck({
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
            发起库存盘点
          </Button>,
        ]}
      />

      {/* 发起盘点对话框 */}
      <Modal
        title="发起库存盘点（自动拉取账面库存比对实盘）"
        open={modalOpen}
        onOk={handleSaveCheck}
        onCancel={() => setModalOpen(false)}
        width={850}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="checkType" label="盘点范围类型" rules={[{ required: true }]}>
                <Radio.Group
                  onChange={(e) => {
                    const val = e.target.value;
                    setCheckType(val);
                    handleLoadPrepareItems(val, form.getFieldValue('category'));
                  }}
                >
                  <Radio value="1">全量盘点</Radio>
                  <Radio value="2">按分类盘点</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            {checkType === '2' && (
              <Col span={8}>
                <Form.Item name="category" label="物资分类" rules={[{ required: true }]}>
                  <Select
                    onChange={(val) => handleLoadPrepareItems('2', val)}
                  >
                    <Select.Option value="纸张耗材">纸张耗材</Select.Option>
                    <Select.Option value="油墨耗材">油墨耗材</Select.Option>
                    <Select.Option value="办公文具">办公文具</Select.Option>
                    <Select.Option value="教学仪器">教学仪器</Select.Option>
                    <Select.Option value="消杀物资">消杀物资</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="operator" label="盘点经办人" rules={[{ required: true }]}>
                <Input placeholder="经办人姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="checkTime" label="盘点时间" rules={[{ required: true }]}>
                <Input placeholder="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="盘点备注说明">
                <Input placeholder="如：2026学年秋季学期中度资产大清查" />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Card
          title="盘点物资账面 vs 实盘比对表"
          size="small"
          extra={
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              loading={loadingItems}
              onClick={() => handleLoadPrepareItems(checkType, form.getFieldValue('category'))}
            >
              重新拉取账面库存
            </Button>
          }
        >
          <Table
            dataSource={checkItems}
            rowKey="goodsId"
            loading={loadingItems}
            pagination={false}
            scroll={{ y: 300 }}
            columns={[
              { title: '物品名称', dataIndex: 'goodsName', width: 180 },
              { title: '规格', dataIndex: 'spec', width: 110 },
              { title: '单位', dataIndex: 'unit', width: 60, align: 'center' },
              {
                title: '账面库存',
                dataIndex: 'bookNum',
                width: 90,
                align: 'center',
                render: (val) => <Text strong>{val || 0}</Text>,
              },
              {
                title: '实盘数量',
                dataIndex: 'realNum',
                width: 120,
                align: 'center',
                render: (_, r) => (
                  <InputNumber
                    min={0}
                    value={r.realNum}
                    onChange={(val) => handleRealNumChange(r.goodsId, val)}
                  />
                ),
              },
              {
                title: '差异 (实盘-账面)',
                dataIndex: 'diffNum',
                width: 120,
                align: 'center',
                render: (diff) => {
                  const d = diff || 0;
                  if (d === 0) return <Tag color="green">平账 (0)</Tag>;
                  if (d > 0) return <Tag color="blue">盘盈 (+{d})</Tag>;
                  return <Tag color="error">盘亏 ({d})</Tag>;
                },
              },
            ]}
          />
        </Card>
      </Modal>

      {/* 盘点单明细档案弹窗 */}
      <Modal
        title={`盘点单档案详情 - ${currentRecord?.checkNo || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
        width={780}
      >
        {currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="盘点单号">{currentRecord.checkNo}</Descriptions.Item>
              <Descriptions.Item label="盘点类型">
                {currentRecord.checkType === '1' ? '全量盘点' : '按分类盘点'}
              </Descriptions.Item>
              <Descriptions.Item label="物资分类">
                {currentRecord.checkType === '1' ? '全部物资' : currentRecord.category || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="盘点人">{currentRecord.operator}</Descriptions.Item>
              <Descriptions.Item label="盘点时间">{currentRecord.checkTime}</Descriptions.Item>
              <Descriptions.Item label="单据状态">
                {currentRecord.status === '1' && <Tag color="warning">待审核</Tag>}
                {currentRecord.status === '2' && <Tag color="success">已审核平账</Tag>}
                {currentRecord.status === '3' && <Tag color="default">已作废</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="备注说明" span={2}>
                {currentRecord.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 盘点明细比对结果：</div>
              <Table
                dataSource={currentRecord.itemList || []}
                rowKey={(r: any, idx) => r.itemId || String(idx)}
                pagination={false}

                size="small"
                columns={[
                  { title: '物品名称', dataIndex: 'goodsName' },
                  { title: '规格', dataIndex: 'spec' },
                  { title: '单位', dataIndex: 'unit', align: 'center' },
                  { title: '账面库存', dataIndex: 'bookNum', align: 'center' },
                  { title: '实盘数量', dataIndex: 'realNum', align: 'center' },
                  {
                    title: '盈亏差异',
                    dataIndex: 'diffNum',
                    align: 'center',
                    render: (d) => {
                      if (!d || d === 0) return <Tag color="green">平账 (0)</Tag>;
                      if (d > 0) return <Tag color="blue">盘盈 (+{d})</Tag>;
                      return <Tag color="error">盘亏 ({d})</Tag>;
                    },
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

export default StockCheckPage;
