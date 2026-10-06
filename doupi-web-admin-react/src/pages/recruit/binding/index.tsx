import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Popconfirm, Radio, Tag, Space } from 'antd';

import { PlusOutlined, DeleteOutlined, EditOutlined, QrcodeOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listTeacherBinding,
  getTeacherBinding,
  addTeacherBinding,
  updateTeacherBinding,
  delTeacherBinding,
} from '@/api/recruit/binding';

const BindingPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    form.setFieldsValue({ status: 'APPROVED' });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.bindingId);
    try {
      const res: any = await getTeacherBinding(record.bindingId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateTeacherBinding({ ...values, bindingId: editingId });
        message.success('修改成功');
      } else {
        await addTeacherBinding(values);
        message.success('绑定成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (id: number) => {
    await delTeacherBinding(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '绑定编号',
      dataIndex: 'bindingId',
      hideInSearch: true,
      width: 90,
    },
    {
      title: '教师姓名',
      dataIndex: 'teacherName',
    },
    {
      title: '教师手机号',
      dataIndex: 'teacherPhone',
    },
    {
      title: '专属招生码',
      dataIndex: 'inviteCode',
      render: (_, record) => (record.inviteCode ? <Tag color="blue">{record.inviteCode}</Tag> : '-'),
    },
    {
      title: '对接主管',
      dataIndex: 'directorName',
    },
    {
      title: '绑定状态',
      dataIndex: 'status',
      valueEnum: {
        APPROVED: { text: '已生效', status: 'Success' },
        PENDING: { text: '待审核', status: 'Processing' },
        REJECTED: { text: '已拒绝', status: 'Error' },
      },
    },
    {
      title: '审批意见',
      dataIndex: 'auditRemark',
      ellipsis: true,
      hideInSearch: true,
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
          <Authorized key="edit" permission="recruit:binding:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="recruit:binding:remove">
            <Popconfirm
              title="确认解除该教师微信绑定吗？"
              onConfirm={() => handleDelete(record.bindingId)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                解绑
              </Button>
            </Popconfirm>
          </Authorized>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '教师微信绑定与招生码' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="bindingId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listTeacherBinding({
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
          <Authorized key="add" permission="recruit:binding:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              绑定新教师
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={editingId ? '修改绑定关系' : '绑定新教师'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="teacherName"
            label="教师姓名"
            rules={[{ required: true, message: '请输入教师姓名' }]}
          >
            <Input placeholder="请输入教师姓名" />
          </Form.Item>

          <Form.Item
            name="teacherPhone"
            label="教师手机号"
            rules={[{ required: true, message: '请输入手机号码' }]}
          >
            <Input placeholder="请输入手机号码" />
          </Form.Item>

          <Form.Item name="directorName" label="招生主管">
            <Input placeholder="请输入招生主管名称" />
          </Form.Item>

          <Form.Item name="inviteCode" label="专属招生码（选填）">
            <Input placeholder="例如: HB-8888" prefix={<QrcodeOutlined />} />
          </Form.Item>

          <Form.Item name="status" label="审核/绑定状态" initialValue="APPROVED">
            <Radio.Group>
              <Radio value="APPROVED">已生效</Radio>
              <Radio value="PENDING">待审核</Radio>
              <Radio value="REJECTED">已拒绝</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="auditRemark" label="审批意见/备注说明">
            <Input.TextArea rows={2} placeholder="请输入审批意见或备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};


export default BindingPage;
