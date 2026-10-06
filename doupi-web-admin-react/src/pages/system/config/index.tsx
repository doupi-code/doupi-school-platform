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
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listConfig,
  getConfig,
  addConfig,
  updateConfig,
  delConfig,
  refreshCache,
} from '@/api/system/config';

const ConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增参数');
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingConfigId(null);
    setModalTitle('新增参数');
    form.setFieldsValue({ configType: 'Y' });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingConfigId(record.configId);
    setModalTitle('修改参数');
    try {
      const res: any = await getConfig(record.configId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingConfigId) {
        await updateConfig({ ...values, configId: editingConfigId });
        message.success('修改成功');
      } else {
        await addConfig(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (configId: number) => {
    await delConfig(configId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const handleRefreshCache = async () => {
    await refreshCache();
    message.success('刷新缓存成功');
  };

  const columns: ProColumns[] = [
    {
      title: '参数编号',
      dataIndex: 'configId',
      hideInSearch: true,
      width: 90,
    },
    {
      title: '参数名称',
      dataIndex: 'configName',
    },
    {
      title: '参数键名',
      dataIndex: 'configKey',
    },
    {
      title: '参数键值',
      dataIndex: 'configValue',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '系统内置',
      dataIndex: 'configType',
      valueEnum: {
        Y: { text: '是', status: 'Success' },
        N: { text: '否', status: 'Default' },
      },
      width: 90,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      width: 160,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:config:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:config:remove">
            <Popconfirm
              title="确认删除该参数配置吗？"
              onConfirm={() => handleDelete(record.configId)}
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
    <PageContainer header={{ title: '参数设置' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="configId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listConfig({
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
          <Authorized key="add" permission="system:config:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增参数
            </Button>
          </Authorized>,
          <Button key="refresh" onClick={handleRefreshCache}>
            刷新缓存
          </Button>,
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
            name="configName"
            label="参数名称"
            rules={[{ required: true, message: '请输入参数名称' }]}
          >
            <Input placeholder="请输入参数名称" />
          </Form.Item>

          <Form.Item
            name="configKey"
            label="参数键名"
            rules={[{ required: true, message: '请输入参数键名' }]}
          >
            <Input placeholder="例如: sys.account.captchaEnabled" />
          </Form.Item>

          <Form.Item
            name="configValue"
            label="参数键值"
            rules={[{ required: true, message: '请输入参数键值' }]}
          >
            <Input.TextArea placeholder="请输入参数键值" />
          </Form.Item>

          <Form.Item name="configType" label="系统内置" initialValue="Y">
            <Radio.Group>
              <Radio value="Y">是</Radio>
              <Radio value="N">否</Radio>
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

export default ConfigPage;
