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
  Typography,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  AppstoreOutlined,
  BookOutlined,
  ToolOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { listKit, getKit, addKit, updateKit, delKit } from '@/api/edu/kit';
import { listGoods } from '@/api/stock/goods';
import { FormDraftUtil } from '@/utils/formDraft';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface KitItemRow {
  key: string | number;
  goodsId?: number;
  goodsName?: string;
  spec?: string;
  unit?: string;
  stockNum?: number;
  quantity: number;
  remark?: string;
}

const EduKitPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentKitId, setCurrentKitId] = useState<number | null>(null);

  // 草稿提示状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  // 全量物资列表，用于下拉选择
  const [goodsList, setGoodsList] = useState<any[]>([]);
  // 动态明细行
  const [itemList, setItemList] = useState<KitItemRow[]>([]);

  useEffect(() => {
    listGoods({ pageSize: 500 }).then((res: any) => {
      if (res && res.rows) {
        setGoodsList(res.rows);
      }
    }).catch(() => {});
  }, []);

  // 触发保存草稿
  const triggerSaveDraft = (fields?: any, items?: KitItemRow[]) => {
    const currentValues = fields || form.getFieldsValue();
    const currentItems = items !== undefined ? items : itemList;
    const targetId = isEdit ? currentKitId : 'create';
    FormDraftUtil.saveDraft('edu_kit', targetId, currentValues, currentItems);
    const d = FormDraftUtil.getDraft('edu_kit', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentKitId(null);
    form.resetFields();

    // 优先检测是否有未保存的本地草稿
    const draft = FormDraftUtil.getDraft('edu_kit', 'create');
    if (draft && (draft.formValues?.kitName || (draft.extraData && draft.extraData.length > 0))) {
      form.setFieldsValue(draft.formValues);
      setItemList(draft.extraData || []);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新建草稿，已为您自动恢复！');
    } else {
      setItemList([
        {
          key: Date.now(),
          goodsId: undefined,
          quantity: 1,
          remark: '',
        },
      ]);
      form.setFieldsValue({
        targetType: '1',
        grade: '通用',
        subject: '通用',
        status: '0',
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleOpenEdit = async (record: any) => {
    setIsEdit(true);
    setCurrentKitId(record.kitId);
    form.resetFields();
    try {
      const res: any = await getKit(record.kitId);
      const data = res?.data || record;

      // 优先检测该记录是否有未保存的本地草稿
      const draft = FormDraftUtil.getDraft('edu_kit', record.kitId);
      if (draft) {
        form.setFieldsValue(draft.formValues);
        setItemList(draft.extraData || []);
        setDraftNotice({ visible: true, timeText: draft.timeText });
        message.info('已恢复该套装上次未保存的草稿数据！');
      } else {
        form.setFieldsValue({
          kitName: data.kitName,
          kitCode: data.kitCode,
          targetType: data.targetType,
          grade: data.grade || '通用',
          subject: data.subject || '通用',
          description: data.description,
          status: data.status || '0',
          remark: data.remark,
        });

        if (data.itemList && data.itemList.length > 0) {
          setItemList(
            data.itemList.map((it: any) => ({
              key: it.itemId || `${it.goodsId}_${Math.random()}`,
              goodsId: it.goodsId,
              goodsName: it.goodsName,
              spec: it.spec,
              unit: it.unit,
              stockNum: it.stockNum,
              quantity: it.quantity || 1,
              remark: it.remark || '',
            }))
          );
        } else {
          setItemList([]);
        }
        setDraftNotice(null);
      }
      setModalOpen(true);
    } catch (e: any) {
      message.error(e.message || '获取套装详情失败');
    }
  };

  // 丢弃草稿并刷新为数据库最新数据
  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = isEdit ? currentKitId : 'create';
      FormDraftUtil.clearDraft('edu_kit', targetId);
      setDraftNotice(null);

      if (isEdit && currentKitId) {
        const res: any = await getKit(currentKitId);
        const data = res?.data;
        if (data) {
          form.setFieldsValue({
            kitName: data.kitName,
            kitCode: data.kitCode,
            targetType: data.targetType,
            grade: data.grade || '通用',
            subject: data.subject || '通用',
            description: data.description,
            status: data.status || '0',
            remark: data.remark,
          });
          if (data.itemList && data.itemList.length > 0) {
            setItemList(
              data.itemList.map((it: any) => ({
                key: it.itemId || `${it.goodsId}_${Math.random()}`,
                goodsId: it.goodsId,
                goodsName: it.goodsName,
                spec: it.spec,
                unit: it.unit,
                stockNum: it.stockNum,
                quantity: it.quantity || 1,
                remark: it.remark || '',
              }))
            );
          } else {
            setItemList([]);
          }
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          targetType: '1',
          grade: '通用',
          subject: '通用',
          status: '0',
        });
        setItemList([
          {
            key: Date.now(),
            goodsId: undefined,
            quantity: 1,
            remark: '',
          },
        ]);
      }
      if (isEdit) {
        message.success('已丢弃本地草稿，已恢复为数据库数据！');
      } else {
        message.success('已丢弃本地草稿，已刷新到未填写状态！');
      }
    } catch (e: any) {
      message.error(e.message || '刷新数据库数据失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleViewDetail = async (record: any) => {
    try {
      const res: any = await getKit(record.kitId);
      setDetailRecord(res?.data || record);
    } catch {
      setDetailRecord(record);
    }
    setDetailOpen(true);
  };

  const handleAddItem = () => {
    const newItem: KitItemRow = {
      key: Date.now() + Math.random(),
      goodsId: undefined,
      quantity: 1,
      remark: '',
    };
    const next = [...itemList, newItem];
    setItemList(next);
    triggerSaveDraft(form.getFieldsValue(), next);
  };

  const handleRemoveItem = (key: string | number) => {
    const next = itemList.filter((i) => i.key !== key);
    setItemList(next);
    triggerSaveDraft(form.getFieldsValue(), next);
  };

  const handleItemGoodsChange = (key: string | number, goodsId: number) => {
    const targetGoods = goodsList.find((g) => g.goodsId === goodsId);
    const next = itemList.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          goodsId,
          goodsName: targetGoods?.goodsName || '',
          spec: targetGoods?.spec || '-',
          unit: targetGoods?.unit || '件',
          stockNum: targetGoods?.stockNum ?? 0,
        };
      }
      return item;
    });
    setItemList(next);
    triggerSaveDraft(form.getFieldsValue(), next);
  };

  const handleItemQuantityChange = (key: string | number, quantity: number | null) => {
    const q = quantity && quantity > 0 ? quantity : 1;
    const next = itemList.map((item) => (item.key === key ? { ...item, quantity: q } : item));
    setItemList(next);
    triggerSaveDraft(form.getFieldsValue(), next);
  };

  const handleItemRemarkChange = (key: string | number, remark: string) => {
    const next = itemList.map((item) => (item.key === key ? { ...item, remark } : item));
    setItemList(next);
    triggerSaveDraft(form.getFieldsValue(), next);
  };

  const handleSaveKit = async () => {
    try {
      const values = await form.validateFields();
      if (itemList.length === 0) {
        message.warning('套装中必须至少包含一种物品！');
        return;
      }
      for (const it of itemList) {
        if (!it.goodsId) {
          message.warning('请为所有物品行选择对应的物资档案！');
          return;
        }
      }

      const payload = {
        ...values,
        itemList: itemList.map((it, idx) => ({
          goodsId: it.goodsId,
          quantity: it.quantity,
          sortOrder: idx + 1,
          remark: it.remark,
        })),
      };

      if (isEdit && currentKitId) {
        await updateKit({ ...payload, kitId: currentKitId });
        message.success('物资套装模版修改成功！');
        FormDraftUtil.clearDraft('edu_kit', currentKitId);
      } else {
        await addKit(payload);
        message.success('物资套装模版创建成功！');
        FormDraftUtil.clearDraft('edu_kit', 'create');
      }

      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存套装模版失败');
    }
  };

  const handleDeleteKit = async (kitId: number) => {
    try {
      await delKit(kitId);
      message.success('套装模版已删除！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '套装名称',
      dataIndex: 'kitName',
      width: 240,
      render: (_, record) => (
        <Space orientation="vertical" size={2}>
          <Space>
            <Text strong style={{ color: '#1677ff', fontSize: 14 }}>
              {record.kitName}
            </Text>
            {record.kitCode && <Tag color="blue">{record.kitCode}</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || '无补充说明'}
          </Text>
        </Space>
      ),
    },
    {
      title: '适用对象',
      dataIndex: 'targetType',
      width: 140,
      valueType: 'select',
      valueEnum: {
        '1': { text: '教师教学办公套件', status: 'Processing' },
        '2': { text: '学生选科教材', status: 'Success' },
        '3': { text: '班级公共物资', status: 'Default' },
      },
      render: (_, record) => {
        if (record.targetType === '1') {
          return (
            <Tag icon={<ToolOutlined />} color="processing" style={{ borderRadius: 12 }}>
              教师教学办公套件
            </Tag>
          );
        }
        if (record.targetType === '2') {
          return (
            <Tag icon={<BookOutlined />} color="success" style={{ borderRadius: 12 }}>
              学生教材教辅
            </Tag>
          );
        }
        return (
          <Tag icon={<TeamOutlined />} color="purple" style={{ borderRadius: 12 }}>
            班级/通用物资
          </Tag>
        );
      },
    },
    {
      title: '适用年级/方向',
      dataIndex: 'grade',
      width: 130,
      render: (_, record) => (
        <Tag color="cyan">
          {record.grade || '通用'}
          {record.subject && record.subject !== '通用' ? ` · ${record.subject}` : ''}
        </Tag>
      ),
    },
    {
      title: '包含物品',
      dataIndex: 'itemCount',
      width: 130,
      search: false,
      render: (_, record) => (
        <Space size={4}>
          <Tag color="blue">{record.itemCount || 0} 种物资</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {record.totalQuantity || 0} 件
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.status === '0' ? 'success' : 'error'}>
          {record.status === '0' ? '正常启用' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 160,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Authorized permission="edu:kit:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              编辑
            </Button>
          </Authorized>
          <Authorized permission="edu:kit:remove">
            <Popconfirm
              title="确定要删除该物资套装模版吗？"
              description="删除后不影响历史已发放的领退记录"
              onConfirm={() => handleDeleteKit(record.kitId)}
              okText="确定"
              cancelText="取消"
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
    <PageContainer
      header={{
        title: '教务物资套装配置',
        subTitle:
          '预先定义成套发放的标准物资套餐（如新入职教师办公套件、学生选科全套课本教材），日常领物时一键套用带出全套清单，极大提升教务发货效率',
      }}
    >
      <ProTable
        actionRef={actionRef}
        rowKey="kitId"
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listKit({
            ...params,
            pageNum: params.current,
            pageSize: params.pageSize,
          });
          return {
            data: res.rows || [],
            success: true,
            total: res.total || 0,
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
          <Authorized permission="edu:kit:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              新建物资套装
            </Button>
          </Authorized>,
        ]}
      />

      {/* 新建/编辑 居中大弹框 */}
      <Modal
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {isEdit ? '编辑物资套装模版' : '新建物资套装模版'}
            </span>
          </Space>
        }
        open={modalOpen}
        width={980}
        centered
        destroyOnHidden={false}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSaveKit}>
            保存套装模版
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 'calc(82vh - 130px)', overflowY: 'auto', paddingRight: 8 }}>
          {/* 草稿明确提示条 */}
          <DraftNoticeAlert
            visible={!!draftNotice?.visible}
            timeText={draftNotice?.timeText}
            onDiscard={handleDiscardDraft}
            loading={discardLoading}
            isEdit={isEdit}
          />

          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_ch, all) => triggerSaveDraft(all, itemList)}
          >
            <Row gutter={16}>
              <Col span={14}>
                <Form.Item
                  label="套装名称"
                  name="kitName"
                  rules={[{ required: true, message: '请输入套装名称' }]}
                >
                  <Input placeholder="如：新入职教师标准教学办公套件、高三物理选科教材全套" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item label="套装编码" name="kitCode">
                  <Input placeholder="如：KIT_TEA_DEFAULT（选填）" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="适用对象"
                  name="targetType"
                  rules={[{ required: true, message: '请选择适用对象' }]}
                >
                  <Select>
                    <Option value="1">教师教学办公套件</Option>
                    <Option value="2">学生选科教材</Option>
                    <Option value="3">班级/通用物资</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="适用年级" name="grade">
                  <Select>
                    <Option value="通用">通用</Option>
                    <Option value="高三">高三</Option>
                    <Option value="复读部">高三复读部</Option>
                    <Option value="高一">高一</Option>
                    <Option value="高二">高二</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="适用选科/方向" name="subject">
                  <Input placeholder="如：物化生、历政地、班主任等" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={18}>
                <Form.Item label="套装说明 / 适用场景" name="description">
                  <Input.TextArea
                    rows={2}
                    placeholder="如：新教师入职报到时一次性领取全套备课与教学用具；或者学生开学报到领书"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="状态" name="status">
                  <Select>
                    <Option value="0">正常启用</Option>
                    <Option value="1">停用</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="start" style={{ margin: '16px 0 12px 0' }}>
              <Space>
                <AppstoreOutlined style={{ color: '#1677ff' }} />
                <Text strong>套餐内物品清单明细</Text>
                <Tag color="blue">{itemList.length} 样物资</Tag>
              </Space>
            </Divider>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                配置该套装包含的物资档案以及默认发放数量。领用时系统会自动带出整套清单，教务也可临时针对性增减。
              </Text>
            </div>

            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={itemList}
              scroll={{ x: 880 }}
              columns={[
                {
                  title: '物资名称',
                  dataIndex: 'goodsId',
                  width: 270,
                  render: (_, item) => (
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择物品..."
                      style={{ width: '100%' }}
                      value={item.goodsId}
                      onChange={(val) => handleItemGoodsChange(item.key, val)}
                      options={goodsList.map((g) => ({
                        label: `${g.goodsName} (${g.spec || '-'}) [库存:${g.stockNum ?? 0}${g.unit || ''}]`,
                        value: g.goodsId,
                      }))}
                    />
                  ),
                },
                {
                  title: '规格型号',
                  width: 120,
                  render: (_, item) => (
                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {item.spec || '-'} / {item.unit || '-'}
                    </Text>
                  ),
                },
                {
                  title: '当前库存',
                  width: 95,
                  align: 'center',
                  render: (_, item) => {
                    const num = item.stockNum ?? 0;
                    return (
                      <Text style={{ color: num > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {num} {item.unit || ''}
                      </Text>
                    );
                  },
                },
                {
                  title: '默认配发数量',
                  width: 140,
                  render: (_, item) => (
                    <InputNumber
                      min={1}
                      max={9999}
                      value={item.quantity}
                      onChange={(val) => handleItemQuantityChange(item.key, val)}
                      addonAfter={item.unit || '件'}
                      style={{ width: '100%' }}
                    />
                  ),
                },
                {
                  title: '配发/领用说明',
                  dataIndex: 'remark',
                  width: 180,
                  render: (_, item) => (
                    <Input
                      placeholder="如：红黑笔各1支"
                      value={item.remark}
                      onChange={(e) => handleItemRemarkChange(item.key, e.target.value)}
                    />
                  ),
                },
                {
                  title: '操作',
                  width: 60,
                  align: 'center',
                  render: (_, item) => (
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveItem(item.key)}
                    />
                  ),
                },
              ]}
            />

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={handleAddItem}
                style={{ borderColor: '#1677ff', color: '#1677ff' }}
              >
                + 添加一行物资
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* 查看详情 Modal */}
      <Modal
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#1677ff' }} />
            <span>套装模版详细信息</span>
          </Space>
        }
        open={detailOpen}
        width={760}
        centered
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => {
              setDetailOpen(false);
              if (detailRecord) {
                handleOpenEdit(detailRecord);
              }
            }}
          >
            编辑此套装
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {detailRecord && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="套装名称" span={2}>
                <Text strong style={{ fontSize: 15, color: '#1677ff' }}>
                  {detailRecord.kitName}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="套装编码">
                {detailRecord.kitCode || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="适用对象">
                <Tag color={detailRecord.targetType === '1' ? 'processing' : 'success'}>
                  {detailRecord.targetType === '1'
                    ? '教师教学办公套件'
                    : detailRecord.targetType === '2'
                    ? '学生选科教材'
                    : '班级通用物资'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="适用年级">
                {detailRecord.grade || '通用'}
              </Descriptions.Item>
              <Descriptions.Item label="适用选科/方向">
                {detailRecord.subject || '通用'}
              </Descriptions.Item>
              <Descriptions.Item label="套装说明" span={2}>
                {detailRecord.description || '无'}
              </Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="start" style={{ margin: '12px 0' }}>
              <Space>
                <Text strong>包含物品明细清单</Text>
                <Tag color="cyan">
                  共 {detailRecord.itemList?.length || 0} 种物资，合计{' '}
                  {detailRecord.itemList?.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0) || 0}{' '}
                  件
                </Tag>
              </Space>
            </Divider>

            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={detailRecord.itemList || []}
              rowKey={(r: any) => r.itemId || r.goodsId}
              columns={[
                {
                  title: '序号',
                  width: 55,
                  render: (_: any, __: any, idx: number) => idx + 1,
                },
                {
                  title: '物资名称',
                  dataIndex: 'goodsName',
                  render: (text: string) => <Text strong>{text}</Text>,
                },
                {
                  title: '规格型号',
                  dataIndex: 'spec',
                  render: (text: string) => text || '-',
                },
                {
                  title: '计量单位',
                  dataIndex: 'unit',
                  width: 80,
                  render: (text: string) => text || '件',
                },
                {
                  title: '默认配发数量',
                  dataIndex: 'quantity',
                  width: 110,
                  render: (val: number, row: any) => (
                    <Text strong style={{ color: '#1677ff' }}>
                      {val} {row.unit || ''}
                    </Text>
                  ),
                },
                {
                  title: '当前库存',
                  dataIndex: 'stockNum',
                  width: 110,
                  render: (val: number, row: any) => {
                    const num = val ?? 0;
                    return (
                      <Text style={{ color: num > 0 ? '#52c41a' : '#ff4d4f' }}>
                        {num} {row.unit || ''}
                      </Text>
                    );
                  },
                },
                {
                  title: '配发/领用说明',
                  dataIndex: 'remark',
                  width: 180,
                  ellipsis: true,
                  render: (text: string) => text || '-',
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default EduKitPage;
