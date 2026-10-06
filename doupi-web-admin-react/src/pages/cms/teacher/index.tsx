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
  Avatar,
  Segmented,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  AppstoreOutlined,
  BarsOutlined,
  EyeOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import {
  listTeacher,
  getTeacher,
  addTeacher,
  updateTeacher,
  delTeacher,
} from '@/api/cms/teacher';

const { Text, Paragraph } = Typography;

const COMMON_HONORS = [
  '正高级教师',
  '特级教师',
  '国务院特殊津贴专家',
  '全国优质课一等奖',
  '国际奥赛金牌教练',
  '学科首席名师',
  '高考命题研究专家',
  '武汉市学科带头人',
  '功勋高三班主任',
];

const CmsTeacherPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [rawList, setRawList] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('录入官网名师');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 实时预览名师卡片状态 (绑定当前输入)
  const [previewName, setPreviewName] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewRole, setPreviewRole] = useState('');
  const [previewQuote, setPreviewQuote] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [previewCategory, setPreviewCategory] = useState('special');

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('录入官网名师');
    const initial = {
      category: 'special',
      groupName: 'faculty',
      status: '0',
    };
    form.setFieldsValue(initial);
    setPreviewName('');
    setPreviewSubject('');
    setPreviewRole('');
    setPreviewQuote('');
    setPreviewAvatar('');
    setPreviewTags([]);
    setPreviewCategory('special');
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.teacherId);
    setModalTitle('修改名师档案');
    try {
      const res: any = await getTeacher(record.teacherId);
      const data = res?.data || record;
      const tagsArr = Array.isArray(data.tags)
        ? data.tags
        : typeof data.tags === 'string'
        ? data.tags.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      form.setFieldsValue({
        ...data,
        tags: tagsArr,
      });

      setPreviewName(data.name || '');
      setPreviewSubject(data.subject || '通识');
      setPreviewRole(data.title || data.roleTitle || '名师');
      setPreviewQuote(data.quote || data.motto || '');
      setPreviewAvatar(data.avatarUrl || '');
      setPreviewTags(tagsArr);
      setPreviewCategory(data.category || 'special');
    } catch {
      form.setFieldsValue(record);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const tagsStr = Array.isArray(values.tags) ? values.tags.join(',') : values.tags;
      const payload = {
        ...values,
        tags: tagsStr,
      };

      if (editingId) {
        await updateTeacher({ ...payload, teacherId: editingId });
        message.success('名师档案修改成功！');
      } else {
        await addTeacher(payload);
        message.success('录入名师成功！已即刻在官网展示。');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await delTeacher(id);
      message.success('删除成功！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '序号',
      dataIndex: 'teacherId',
      valueType: 'indexBorder',
      width: 50,
    },
    {
      title: '头像',
      dataIndex: 'avatarUrl',
      width: 60,
      search: false,
      render: (_, r) =>
        r.avatarUrl ? (
          <Avatar src={r.avatarUrl} size={40} />
        ) : (
          <Avatar style={{ backgroundColor: '#0284c7' }} size={40}>
            {r.name?.slice(0, 1) || '师'}
          </Avatar>
        ),
    },
    {
      title: '名师姓名',
      dataIndex: 'name',
      copyable: true,
      width: 90,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '学科',
      dataIndex: 'subject',
      width: 80,
      valueEnum: {
        语文: { text: '语文' },
        数学: { text: '数学' },
        英语: { text: '英语' },
        物理: { text: '物理' },
        化学: { text: '化学' },
        生物: { text: '生物' },
        历史: { text: '历史' },
        政治: { text: '政治' },
        地理: { text: '地理' },
      },
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '梯队分级',
      dataIndex: 'category',
      width: 110,
      valueEnum: {
        principal: { text: '校级领航', status: 'Error' },
        special: { text: '特级首席', status: 'Warning' },
        backbone: { text: '骨干名师', status: 'Processing' },
      },
      render: (_, r) => {
        const color = r.category === 'principal' ? 'magenta' : r.category === 'special' ? 'gold' : 'cyan';
        const label = r.category === 'principal' ? '校级领航' : r.category === 'special' ? '特级首席' : '骨干名师';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '职级头衔',
      dataIndex: 'title',
      width: 140,
      ellipsis: true,
    },
    {
      title: '荣誉标签',
      dataIndex: 'tags',
      ellipsis: true,
      render: (_, r) => {
        const tags = Array.isArray(r.tags)
          ? r.tags
          : typeof r.tags === 'string'
          ? r.tags.split(/[,，、]/).filter(Boolean)
          : [];
        return (
          <Space wrap size={[0, 4]}>
            {tags.map((t: string) => (
              <Tag key={t} style={{ fontSize: 11 }}>
                {t}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '教龄',
      dataIndex: 'years',
      width: 80,
      search: false,
      render: (text) => <span>{text ? `${text} 年` : '20+年'}</span>,
    },
    {
      title: '治学格言',
      dataIndex: 'quote',
      ellipsis: true,
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
          title="确定从官网移除该教师展示吗？"
          onConfirm={() => handleDelete(record.teacherId)}
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
        title: '官网名师天团管理中心',
        subTitle: '全校特级名师、学科首席与功勋班主任展示配置',
      }}
    >
      <ProTable
        actionRef={actionRef}
        rowKey="teacherId"
        columns={columns}
        request={async (params) => {
          try {
            const res: any = await listTeacher(params);
            const list = res.rows || res.data || [];
            setRawList(list);
            return {
              data: list,
              success: true,
              total: res.total || list.length,
            };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Segmented
            key="view-toggle"
            value={viewMode}
            onChange={(v) => setViewMode(v as any)}
            options={[
              { value: 'table', icon: <BarsOutlined />, label: '表格视图' },
              { value: 'card', icon: <AppstoreOutlined />, label: '卡片画廊' },
            ]}
          />,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            录入新名师
          </Button>,
        ]}
        tableRender={(_, dom) => {
          if (viewMode === 'card') {
            return (
              <div style={{ padding: '16px 0' }}>
                <Row gutter={[16, 16]}>
                  {rawList.map((t) => {
                    const tagList = Array.isArray(t.tags)
                      ? t.tags
                      : typeof t.tags === 'string'
                      ? t.tags.split(/[,，、]/).filter(Boolean)
                      : [];
                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={t.teacherId}>
                        <Card
                          hoverable
                          style={{ borderRadius: 10, overflow: 'hidden' }}
                          actions={[
                            <Button
                              key="edit"
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEdit(t)}
                            >
                              编辑档案
                            </Button>,
                            <Popconfirm
                              key="del"
                              title="确定删除此名师？"
                              onConfirm={() => handleDelete(t.teacherId)}
                            >
                              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                移除
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            {t.avatarUrl ? (
                              <Avatar src={t.avatarUrl} size={64} style={{ border: '2px solid #38bdf8' }} />
                            ) : (
                              <Avatar style={{ backgroundColor: '#0284c7', fontSize: 24 }} size={64}>
                                {t.name?.slice(0, 1)}
                              </Avatar>
                            )}
                            <h3 style={{ margin: '8px 0 2px', fontSize: 16 }}>{t.name}</h3>
                            <Space size={4}>
                              <Tag color="blue">{t.subject}</Tag>
                              <Tag color={t.category === 'principal' ? 'magenta' : 'gold'}>
                                {t.category === 'principal' ? '校级领航' : '特级首席'}
                              </Tag>
                            </Space>
                          </div>
                          <Paragraph
                            type="secondary"
                            ellipsis={{ rows: 2 }}
                            style={{ fontSize: 12, minHeight: 36, textAlign: 'center' }}
                          >
                            “{t.quote || '把每一分都落到实处。'}”
                          </Paragraph>
                          <div style={{ minHeight: 24, textAlign: 'center' }}>
                            {tagList.slice(0, 2).map((x: string) => (
                              <Tag key={x} style={{ fontSize: 10 }}>
                                {x}
                              </Tag>
                            ))}
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            );
          }
          return dom;
        }}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={960}
        destroyOnHidden
        okText="保存档案"
        cancelText="取消"
      >
        <Row gutter={24}>
          <Col xs={24} lg={15}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => {
                setPreviewName(all.name || '名师姓名');
                setPreviewSubject(all.subject || '语文');
                setPreviewRole(all.title || '学科首席');
                setPreviewQuote(all.quote || '');
                setPreviewAvatar(all.avatarUrl || '');
                setPreviewTags(Array.isArray(all.tags) ? all.tags : []);
                setPreviewCategory(all.category || 'special');
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="name"
                    label="名师姓名"
                    rules={[{ required: true, message: '请输入姓名' }]}
                  >
                    <Input placeholder="例如: 王忠" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="subject"
                    label="任教学科"
                    rules={[{ required: true, message: '请选择学科' }]}
                  >
                    <Select>
                      <Select.Option value="语文">语文</Select.Option>
                      <Select.Option value="数学">数学</Select.Option>
                      <Select.Option value="英语">英语</Select.Option>
                      <Select.Option value="物理">物理</Select.Option>
                      <Select.Option value="化学">化学</Select.Option>
                      <Select.Option value="生物">生物</Select.Option>
                      <Select.Option value="历史">历史</Select.Option>
                      <Select.Option value="政治">政治</Select.Option>
                      <Select.Option value="地理">地理</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="category"
                    label="梯队分级"
                    rules={[{ required: true, message: '请选择梯队' }]}
                  >
                    <Select>
                      <Select.Option value="principal">校级领航专家</Select.Option>
                      <Select.Option value="special">特级 / 正高级首席</Select.Option>
                      <Select.Option value="backbone">名校骨干 / 功勋班主任</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="title"
                    label="职衔头衔"
                    rules={[{ required: true, message: '请输入职衔头衔' }]}
                  >
                    <Input placeholder="例如: 中学正高级教师、化学特级教师、全国金牌奥赛教练" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="years" label="教龄 (年)">
                    <InputNumber min={1} max={60} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="tags"
                label="荣誉头衔 (支持直接输入回车添加或从下拉选择)"
              >
                <Select
                  mode="tags"
                  placeholder="选择或输入荣誉标签，按回车添加"
                  options={COMMON_HONORS.map((h) => ({ label: h, value: h }))}
                />
              </Form.Item>

              <Form.Item name="avatarUrl" label="名师正面肖像图 URL">
                <Input placeholder="https://..." prefix={<IdcardOutlined />} />
              </Form.Item>

              <Form.Item name="quote" label="治学理念 / 名师金句">
                <Input placeholder="例如: 把方程式当成故事来讲，解题即是探索规律。" />
              </Form.Item>

              <Form.Item name="bio" label="生平履历与提分战绩">
                <Input.TextArea rows={3} placeholder="详述任教履历、历届带考提分成果与教研论文..." />
              </Form.Item>

              <Form.Item name="status" label="官网展示状态">
                <Radio.Group>
                  <Radio value="0">正常在官网展示</Radio>
                  <Radio value="1">隐藏不展示</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Col>

          {/* 右侧实时名师卡片预览 */}
          <Col xs={24} lg={9}>
            <Card
              size="small"
              title={
                <span>
                  <EyeOutlined /> 官网前台名师卡片即时效果
                </span>
              }
              style={{
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                minHeight: 450,
                textAlign: 'center',
                padding: '16px 8px',
              }}
            >
              {previewAvatar ? (
                <Avatar
                  src={previewAvatar}
                  size={84}
                  style={{ border: '3px solid #38bdf8', marginBottom: 12 }}
                />
              ) : (
                <Avatar
                  style={{ backgroundColor: '#0284c7', fontSize: 32, marginBottom: 12 }}
                  size={84}
                >
                  {previewName.slice(0, 1)}
                </Avatar>
              )}
              <h3 style={{ fontSize: 18, margin: '0 0 6px' }}>{previewName}</h3>
              <Space style={{ marginBottom: 12 }}>
                <Tag color="blue">{previewSubject}</Tag>
                <Tag color={previewCategory === 'principal' ? 'magenta' : 'gold'}>
                  {previewRole}
                </Tag>
              </Space>

              <div
                style={{
                  background: '#fff',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px dashed #cbd5e1',
                  margin: '12px 0',
                }}
              >
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, fontStyle: 'italic', margin: 0 }}
                >
                  “{previewQuote || '把每一分都落到实处。'}”
                </Paragraph>
              </div>

              <div style={{ textAlign: 'left', marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  获得荣誉标签：
                </Text>
                <Space wrap size={[0, 6]}>
                  {previewTags.map((tag) => (
                    <Tag key={tag} color="geekblue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </Modal>
    </PageContainer>
  );
};

export default CmsTeacherPage;
