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
  Collapse,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  listFaq,
  getFaq,
  addFaq,
  updateFaq,
  delFaq,
} from '@/api/cms/faq';

const { Text, Paragraph } = Typography;

const FAQ_CATEGORIES = [
  '复读政策',
  '分层走班',
  '志愿填报',
  '寄宿生活',
  '收费与奖学金',
  '学情诊断',
];

const CmsFaqPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增常见答疑 FAQ');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 实时问答折叠卡片预览 (绑定当前输入)
  const [previewQ, setPreviewQ] = useState('');
  const [previewA, setPreviewA] = useState('');
  const [previewCategory, setPreviewCategory] = useState('复读政策');

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增常见答疑 FAQ');
    const initial = {
      category: '复读政策',
      status: '0',
      sortOrder: 10,
    };
    form.setFieldsValue(initial);
    setPreviewQ('');
    setPreviewA('');
    setPreviewCategory('复读政策');
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.faqId);
    setModalTitle('修改问答内容');
    try {
      const res: any = await getFaq(record.faqId);
      const data = res?.data || record;
      form.setFieldsValue(data);
      setPreviewQ(data.question || '');
      setPreviewA(data.answer || '');
      setPreviewCategory(data.category || '复读政策');
    } catch {
      form.setFieldsValue(record);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateFaq({ ...values, faqId: editingId });
        message.success('修改问答成功！');
      } else {
        await addFaq(values);
        message.success('新增问答成功！已即刻在官网咨询中心展示。');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await delFaq(id);
      message.success('删除成功！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '序号',
      dataIndex: 'faqId',
      width: 50,
      valueType: 'indexBorder',
    },
    {
      title: '咨询问题',
      dataIndex: 'question',
      render: (text) => (
        <Space>
          <QuestionCircleOutlined style={{ color: '#0284c7' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '权威解答摘录',
      dataIndex: 'answer',
      ellipsis: true,
      search: false,
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '所属分类',
      dataIndex: 'category',
      width: 130,
      valueEnum: FAQ_CATEGORIES.reduce((acc: any, cur) => {
        acc[cur] = { text: cur };
        return acc;
      }, {}),
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '排序权重',
      dataIndex: 'sortOrder',
      width: 80,
      search: false,
    },
    {
      title: '展示状态',
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
          title="确定删除此条 FAQ 吗？"
          onConfirm={() => handleDelete(record.faqId)}
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
        title: '官网常见答疑 FAQ 知识库',
        subTitle: '为高三复读家长提供即时、权威的招生政策与寄宿学情解答',
      }}
    >
      <ProTable
        actionRef={actionRef}
        rowKey="faqId"
        columns={columns}
        request={async (params) => {
          try {
            const res: any = await listFaq(params);
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
            新增答疑条目
          </Button>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={920}
        destroyOnHidden
        okText="保存问答"
        cancelText="取消"
      >
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => {
                setPreviewQ(all.question || '');
                setPreviewA(all.answer || '');
                setPreviewCategory(all.category || '复读政策');
              }}
            >
              <Form.Item
                name="question"
                label="咨询高频问题 (Q)"
                rules={[{ required: true, message: '请输入问题' }]}
              >
                <Input placeholder="例如: 复读生如何填报高考志愿与办理学籍？" />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="分类归属"
                    rules={[{ required: true, message: '请选择分类' }]}
                  >
                    <Select>
                      {FAQ_CATEGORIES.map((c) => (
                        <Select.Option key={c} value={c}>
                          {c}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="sortOrder" label="排序权重 (越大越靠前)">
                    <InputNumber min={0} max={999} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="answer"
                label="官方权威解答 (A)"
                rules={[{ required: true, message: '请输入权威解答' }]}
              >
                <Input.TextArea rows={6} placeholder="详尽、温和且专业地解答家长疑惑..." />
              </Form.Item>

              <Form.Item name="status" label="展示状态">
                <Radio.Group>
                  <Radio value="0">正常在官网展示</Radio>
                  <Radio value="1">隐藏不展示</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Col>

          {/* 右侧官网手风琴效果即时预览 */}
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title={
                <span>
                  <EyeOutlined /> 官网前台问答手风琴即时效果
                </span>
              }
              style={{
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                minHeight: 380,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <Tag color="blue">{previewCategory}</Tag>
              </div>
              <Collapse
                defaultActiveKey={['1']}
                items={[
                  {
                    key: '1',
                    label: (
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        Q: {previewQ || '问题标题...'}
                      </span>
                    ),
                    children: (
                      <Paragraph
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          lineHeight: 1.6,
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {previewA || '官方权威解答正文...'}
                      </Paragraph>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Modal>
    </PageContainer>
  );
};

export default CmsFaqPage;
