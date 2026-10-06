import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Tag,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listNotice,
  getNotice,
  addNotice,
  updateNotice,
  delNotice,
} from '@/api/system/notice';

const NoticePage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增公告');
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingNoticeId(null);
    setModalTitle('新增公告');
    form.setFieldsValue({
      noticeType: '1',
      status: '0',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingNoticeId(record.noticeId);
    setModalTitle('修改公告');
    try {
      const res: any = await getNotice(record.noticeId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingNoticeId) {
        await updateNotice({ ...values, noticeId: editingNoticeId });
        message.success('修改成功');
      } else {
        await addNotice(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (noticeId: number) => {
    await delNotice(noticeId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '序号',
      dataIndex: 'noticeId',
      hideInSearch: true,
      width: 70,
    },
    {
      title: '公告标题',
      dataIndex: 'noticeTitle',
    },
    {
      title: '公告类型',
      dataIndex: 'noticeType',
      valueEnum: {
        '1': { text: '通知' },
        '2': { text: '公告' },
      },
      render: (_, record) => (
        <Tag color={record.noticeType === '1' ? 'blue' : 'orange'}>
          {record.noticeType === '1' ? '通知' : '公告'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '关闭', status: 'Error' },
      },
      width: 90,
    },
    {
      title: '创建者',
      dataIndex: 'createBy',
      hideInSearch: true,
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:notice:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:notice:remove">
            <Popconfirm
              title="确认删除该公告吗？"
              onConfirm={() => handleDelete(record.noticeId)}
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
    <PageContainer header={{ title: '通知公告' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="noticeId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listNotice({
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
          <Authorized key="add" permission="system:notice:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增公告
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={650}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="noticeTitle"
            label="公告标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="请输入公告标题" />
          </Form.Item>

          <Form.Item name="noticeType" label="公告类型" initialValue="1">
            <Select>
              <Select.Option value="1">通知</Select.Option>
              <Select.Option value="2">公告</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">关闭</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="noticeContent"
            label="内容"
            rules={[{ required: true, message: '请输入公告内容' }]}
          >
            <Input.TextArea rows={6} placeholder="请输入公告详细内容" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default NoticePage;
