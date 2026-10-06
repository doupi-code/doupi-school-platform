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
  Divider,
  Card,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  listArticle,
  getArticle,
  addArticle,
  updateArticle,
  delArticle,
} from '@/api/cms/article';

const { Text, Paragraph } = Typography;

const CmsArticlePage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增公文资讯');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 实时预览状态
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [previewCover, setPreviewCover] = useState('');
  const [previewCategory, setPreviewCategory] = useState('校园动态');
  const [previewAuthor, setPreviewAuthor] = useState('汉外华襄校办');
  const [previewKind, setPreviewKind] = useState('updates');

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增公文资讯');
    const initial = {
      kind: 'updates',
      category: '校园动态',
      status: '0',
      author: '汉外华襄校办',
      sortOrder: 10,
    };
    form.setFieldsValue(initial);
    setPreviewTitle('');
    setPreviewContent('');
    setPreviewCover('');
    setPreviewCategory('校园动态');
    setPreviewAuthor('汉外华襄校办');
    setPreviewKind('updates');
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.articleId);
    setModalTitle('修改公文资讯');
    try {
      const res: any = await getArticle(record.articleId);
      const data = res?.data || record;
      form.setFieldsValue(data);
      setPreviewTitle(data.title || '');
      setPreviewContent(data.content || '');
      setPreviewCover(data.coverUrl || '');
      setPreviewCategory(data.category || '校园动态');
      setPreviewAuthor(data.author || '汉外华襄校办');
      setPreviewKind(data.kind || 'updates');
    } catch {
      form.setFieldsValue(record);
      setPreviewTitle(record.title || '');
      setPreviewContent(record.content || '');
      setPreviewCover(record.coverUrl || '');
      setPreviewCategory(record.category || '校园动态');
      setPreviewAuthor(record.author || '汉外华襄校办');
      setPreviewKind(record.kind || 'updates');
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateArticle({ ...values, articleId: editingId });
        message.success('修改公文资讯成功！');
      } else {
        await addArticle(values);
        message.success('发布公文资讯成功！已即刻在官网展示。');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await delArticle(id);
      message.success('删除成功！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '序号',
      dataIndex: 'articleId',
      valueType: 'indexBorder',
      width: 50,
    },
    {
      title: '封面',
      dataIndex: 'coverUrl',
      width: 70,
      search: false,
      render: (_, r) =>
        r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt=""
            style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 32,
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
      title: '公文/资讯标题',
      dataIndex: 'title',
      copyable: true,
      ellipsis: true,
      render: (dom, record) => (
        <Space orientation="vertical" size={2}>
          <Text strong>{dom}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.summary || '无摘要'}
          </Text>
        </Space>
      ),
    },
    {
      title: '展示板块',
      dataIndex: 'kind',
      width: 110,
      valueEnum: {
        updates: { text: '高招资讯', status: 'Processing' },
        notices: { text: '校务公告', status: 'Warning' },
      },
      render: (_, r) => (
        <Tag color={r.kind === 'notices' ? 'volcano' : 'blue'}>
          {r.kind === 'notices' ? '校务公告 (红头)' : '高招资讯'}
        </Tag>
      ),
    },
    {
      title: '分类标签',
      dataIndex: 'category',
      width: 100,
      render: (text) => <Tag color="cyan">{text || '校园动态'}</Tag>,
    },
    {
      title: '发布人/机构',
      dataIndex: 'author',
      width: 110,
    },
    {
      title: '权重',
      dataIndex: 'sortOrder',
      width: 70,
      search: false,
      render: (v) => <Tag color={Number(v) > 20 ? 'red' : 'default'}>{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        '0': { text: '正常发布', status: 'Success' },
        '1': { text: '草稿箱', status: 'Default' },
      },
    },
    {
      title: '发布日期',
      dataIndex: 'publishedDate',
      valueType: 'date',
      width: 105,
      search: false,
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
          title="确定从官网下架并删除该文章吗？"
          onConfirm={() => handleDelete(record.articleId)}
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
        title: '官网公文与资讯内容中心',
        subTitle: '集中发布招生政策、备考干货与权威红头校务通告',
      }}
    >
      <ProTable
        actionRef={actionRef}
        rowKey="articleId"
        columns={columns}
        request={async (params) => {
          try {
            const res: any = await listArticle(params);
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
            撰写新公文 / 资讯
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
        okText="保存并发布"
        cancelText="取消"
      >
        <Row gutter={24}>
          {/* 左侧编辑区域 */}
          <Col xs={24} lg={14}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => {
                setPreviewTitle(all.title || '');
                setPreviewContent(all.content || '');
                setPreviewCover(all.coverUrl || '');
                setPreviewCategory(all.category || '校园动态');
                setPreviewAuthor(all.author || '汉外华襄校办');
                setPreviewKind(all.kind || 'updates');
              }}
            >
              <Form.Item
                name="title"
                label="公文 / 资讯标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="例如: 2026年秋季武汉汉外华襄高三复读招生简章与收费标准公示" />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="kind"
                    label="归属板块"
                    rules={[{ required: true, message: '请选择板块' }]}
                  >
                    <Select>
                      <Select.Option value="updates">高招资讯（门户图文流）</Select.Option>
                      <Select.Option value="notices">校务公告（红头文件）</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="category" label="分类标签">
                    <Input placeholder="如: 招生动态 / 考务通报" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="author" label="发布作者 / 部门署名">
                    <Input placeholder="例如: 汉外华襄校办" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="sortOrder" label="置顶权重 (越大越靠前)">
                    <InputNumber min={0} max={999} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="coverUrl"
                label="封面图片 URL"
                tooltip="支持输入外链或图床图片地址，留空则使用默认封面"
              >
                <Input placeholder="https://..." prefix={<PictureOutlined />} />
              </Form.Item>

              <Form.Item name="summary" label="文摘提炼 (用于列表卡片摘要展示)">
                <Input.TextArea rows={2} placeholder="简短摘要提要，吸引家长点击阅读..." />
              </Form.Item>

              <Form.Item
                name="content"
                label="正文内容"
                rules={[{ required: true, message: '请输入正文' }]}
              >
                <Input.TextArea rows={7} placeholder="输入公文或资讯正文，支持换行与段落..." />
              </Form.Item>

              <Form.Item name="status" label="发布状态">
                <Radio.Group>
                  <Radio value="0">立即正式发布</Radio>
                  <Radio value="1">存为草稿</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Col>

          {/* 右侧实时效果渲染区 */}
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title={
                <span>
                  <EyeOutlined /> 官网前台即时渲染效果
                </span>
              }
              style={{
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                minHeight: 480,
                maxHeight: 560,
                overflowY: 'auto',
              }}
            >
              {previewKind === 'notices' ? (
                // 红头公文阅读器预览
                <div
                  style={{
                    background: '#fff',
                    padding: 16,
                    border: '1px solid #fee2e2',
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      borderBottom: '2px solid #ef4444',
                      paddingBottom: 8,
                      marginBottom: 12,
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: '#dc2626',
                        fontSize: 16,
                        fontWeight: 'bold',
                        letterSpacing: 2,
                      }}
                    >
                      武汉汉外华襄复读中心文件
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>{previewTitle || '（未输入公文标题）'}</h4>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                    <span>发文：{previewAuthor}</span> · <span>分类：{previewCategory}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: '#334155',
                      whiteSpace: 'pre-wrap',
                      background: '#fafafa',
                      padding: 10,
                      borderRadius: 4,
                    }}
                  >
                    {previewContent || '暂无公文正文内容...'}
                  </div>
                </div>
              ) : (
                // 高招资讯卡片预览
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  {previewCover && (
                    <img
                      src={previewCover}
                      alt=""
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: 14 }}>
                    <Tag color="blue" style={{ marginBottom: 6 }}>
                      {previewCategory}
                    </Tag>
                    <h4 style={{ margin: '0 0 6px', fontSize: 14 }}>{previewTitle || '（未输入文章标题）'}</h4>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: '0 0 10px' }}>
                      {form.getFieldValue('summary') || '文章摘要...'}
                    </p>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {previewAuthor} · 刚刚
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Modal>
    </PageContainer>
  );
};

export default CmsArticlePage;
