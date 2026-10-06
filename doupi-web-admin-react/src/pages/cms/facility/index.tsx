import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Card,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  listFacility,
  getFacility,
  addFacility,
  updateFacility,
  delFacility,
} from '@/api/cms/facility';

const { Text, Paragraph } = Typography;

const COMMON_SPECS = [
  '全天候恒温空调',
  '双层真空静音隔音窗',
  '新风循环杀菌系统',
  '希沃交互智慧教学大屏',
  '独立卫浴与24H恒温热水',
  '全实木环保自习书桌',
  '标准化塑胶跑道',
  '千兆专属WiFi无死角',
];

const CmsFacilityPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增校园建筑设施');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 实时预览状态
  const [previewName, setPreviewName] = useState('');
  const [previewZone, setPreviewZone] = useState('教学');
  const [previewDesc, setPreviewDesc] = useState('');
  const [previewCover, setPreviewCover] = useState('');
  const [previewSpecs, setPreviewSpecs] = useState<string[]>([]);
  const [previewTag, setPreviewTag] = useState('核心教学区');

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增校园建筑设施');
    const initial = {
      facilityCode: `F${Date.now().toString().slice(-4)}`,
      zone: '教学',
      status: '0',
    };
    form.setFieldsValue(initial);
    setPreviewName('');
    setPreviewZone('教学');
    setPreviewTag('');
    setPreviewDesc('');
    setPreviewCover('');
    setPreviewSpecs([]);
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.facilityId);
    setModalTitle('修改设施参数与环境配置');
    try {
      const res: any = await getFacility(record.facilityId);
      const data = res?.data || record;
      let specsArr: string[] = [];
      if (data.specsJson) {
        try {
          specsArr = JSON.parse(data.specsJson);
        } catch {}
      } else if (Array.isArray(data.specs)) {
        specsArr = data.specs;
      }

      form.setFieldsValue({
        ...data,
        specs: specsArr,
      });

      setPreviewName(data.name || '');
      setPreviewZone(data.zone || '教学');
      setPreviewTag(data.featureTag || '核心建筑');
      setPreviewDesc(data.description || '');
      setPreviewCover(data.coverUrl || '');
      setPreviewSpecs(specsArr);
    } catch {
      form.setFieldsValue(record);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        specsJson: JSON.stringify(values.specs || []),
      };

      if (editingId) {
        await updateFacility({ ...payload, facilityId: editingId });
        message.success('设施参数修改成功！');
      } else {
        await addFacility(payload);
        message.success('校园设施新增成功！已同步在官网走进校园展示。');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await delFacility(id);
      message.success('删除成功！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '编号',
      dataIndex: 'facilityCode',
      width: 80,
    },
    {
      title: '实景封面',
      dataIndex: 'coverUrl',
      width: 80,
      search: false,
      render: (_, r) =>
        r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt=""
            style={{ width: 56, height: 38, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 38,
              background: '#f1f5f9',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#94a3b8',
            }}
          >
            无图
          </div>
        ),
    },
    {
      title: '建筑 / 设施名称',
      dataIndex: 'name',
      copyable: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '所属空间分区',
      dataIndex: 'zone',
      width: 100,
      valueEnum: {
        教学: { text: '教学空间' },
        运动: { text: '运动场馆' },
        生活: { text: '宿舍生活' },
        餐饮: { text: '餐饮营养' },
        研学: { text: '研学礼堂' },
      },
      render: (text) => {
        const color = text === '教学' ? 'blue' : text === '运动' ? 'green' : text === '生活' ? 'orange' : 'purple';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '建筑特色标签',
      dataIndex: 'featureTag',
      width: 120,
      render: (text) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: '开放时段',
      dataIndex: 'openHours',
      width: 130,
      search: false,
    },
    {
      title: '配置规格清单',
      dataIndex: 'specsJson',
      ellipsis: true,
      search: false,
      render: (_, r) => {
        let list: string[] = [];
        try {
          list = JSON.parse(r.specsJson);
        } catch {}
        return (
          <Space wrap size={[0, 4]}>
            {list.slice(0, 3).map((s) => (
              <Tag key={s} style={{ fontSize: 11 }}>
                {s}
              </Tag>
            ))}
            {list.length > 3 && <Tag style={{ fontSize: 11 }}>+{list.length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueEnum: {
        '0': { text: '正常展示', status: 'Success' },
        '1': { text: '隐藏', status: 'Default' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除此设施建筑吗？"
          onConfirm={() => handleDelete(record.facilityId)}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '官网校园设施与环境管理',
        subTitle: '展示 130 亩生态园林校园、高标准教学楼与千人礼堂',
      }}
    >
      <ProTable
        actionRef={actionRef}
        rowKey="facilityId"
        columns={columns}
        request={async (params) => {
          try {
            const res: any = await listFacility(params);
            return {
              data: res.rows || res.data || [],
              success: true,
              total: res.total || (res.rows || res.data || []).length,
            };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增建筑设施
          </Button>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={960}
        destroyOnHidden
        okText="保存设施"
        cancelText="取消"
      >
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => {
                setPreviewName(all.name || '设施名称');
                setPreviewZone(all.zone || '教学');
                setPreviewTag(all.featureTag || '核心建筑');
                setPreviewDesc(all.description || '');
                setPreviewCover(all.coverUrl || '');
                setPreviewSpecs(Array.isArray(all.specs) ? all.specs : []);
              }}
            >
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    name="facilityCode"
                    label="建筑编号"
                    rules={[{ required: true, message: '请输入编号' }]}
                  >
                    <Input placeholder="例如: F01" />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="建筑 / 设施名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                  >
                    <Input placeholder="例如: 崇德楼高三教学区" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="zone"
                    label="所属空间分区"
                    rules={[{ required: true, message: '请选择空间' }]}
                  >
                    <Select>
                      <Select.Option value="教学">教学空间 (教室/自习室)</Select.Option>
                      <Select.Option value="运动">运动场馆 (田径场/球馆)</Select.Option>
                      <Select.Option value="生活">生活住宿 (学生公寓)</Select.Option>
                      <Select.Option value="餐饮">营养餐饮 (学生膳食中心)</Select.Option>
                      <Select.Option value="研学">研学礼堂 (千人剧院/图书馆)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="featureTag" label="特色标签">
                    <Input placeholder="例如: 沉浸式静音自习区" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="openHours" label="开放时段">
                    <Input placeholder="例如: 06:30 — 22:30" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="mapCoordX" label="平面图 X 坐标 (0-100)">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="mapCoordY" label="平面图 Y 坐标 (0-100)">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="coverUrl" label="实景图片 URL">
                <Input placeholder="https://..." prefix={<PictureOutlined />} />
              </Form.Item>

              <Form.Item
                name="specs"
                label="硬件配套清单 (支持选择或手动输入添加)"
              >
                <Select
                  mode="tags"
                  placeholder="选择或输入硬件规格，按回车添加"
                  options={COMMON_SPECS.map((s) => ({ label: s, value: s }))}
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="设施环境简介"
                rules={[{ required: true, message: '请输入环境简介' }]}
              >
                <Input.TextArea rows={3} placeholder="详述该建筑的环境规格、设计标准及学生使用体验..." />
              </Form.Item>

              <Form.Item name="status" label="官网展示状态">
                <Radio.Group>
                  <Radio value="0">正常在官网展示</Radio>
                  <Radio value="1">隐藏不展示</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Col>

          {/* 右侧实时设施卡片预览 */}
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title={
                <span>
                  <EyeOutlined /> 官网前台卡片即时效果
                </span>
              }
              style={{
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                minHeight: 460,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                {previewCover ? (
                  <img
                    src={previewCover}
                    alt=""
                    style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      height: 140,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  >
                    实景渲染占位图
                  </div>
                )}
                <div style={{ padding: 14 }}>
                  <Space style={{ marginBottom: 6 }}>
                    <Tag color="blue">{previewZone}空间</Tag>
                    <Tag color="cyan">{previewTag}</Tag>
                  </Space>
                  <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{previewName || '设施名称'}</h4>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: '0 0 10px' }}>
                    {previewDesc || '环境配置简介...'}
                  </p>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                    硬核硬件规格：
                  </Text>
                  <Space wrap size={[0, 4]}>
                    {previewSpecs.map((sp) => (
                      <Tag key={sp} color="geekblue" style={{ fontSize: 10 }}>
                        {sp}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Modal>
    </PageContainer>
  );
};

export default CmsFacilityPage;
