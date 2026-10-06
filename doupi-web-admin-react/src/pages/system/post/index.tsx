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
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listPost,
  getPost,
  addPost,
  updatePost,
  delPost,
} from '@/api/system/post';

const PostPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增岗位');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingPostId(null);
    setModalTitle('新增岗位');
    form.setFieldsValue({
      postSort: 1,
      status: '0',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingPostId(record.postId);
    setModalTitle('修改岗位');
    try {
      const res: any = await getPost(record.postId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingPostId) {
        await updatePost({ ...values, postId: editingPostId });
        message.success('修改成功');
      } else {
        await addPost(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (postId: number) => {
    await delPost(postId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '岗位编号',
      dataIndex: 'postId',
      hideInSearch: true,
      width: 100,
    },
    {
      title: '岗位编码',
      dataIndex: 'postCode',
    },
    {
      title: '岗位名称',
      dataIndex: 'postName',
    },
    {
      title: '显示顺序',
      dataIndex: 'postSort',
      hideInSearch: true,
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
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
          <Authorized key="edit" permission="system:post:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:post:remove">
            <Popconfirm
              title="确认删除该岗位吗？"
              onConfirm={() => handleDelete(record.postId)}
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
    <PageContainer header={{ title: '岗位管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="postId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listPost({
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
          <Authorized key="add" permission="system:post:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增岗位
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="postName"
            label="岗位名称"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>

          <Form.Item
            name="postCode"
            label="岗位编码"
            rules={[{ required: true, message: '请输入岗位编码' }]}
          >
            <Input placeholder="请输入岗位编码" />
          </Form.Item>

          <Form.Item name="postSort" label="岗位顺序" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="岗位状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">停用</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入内容" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PostPage;
