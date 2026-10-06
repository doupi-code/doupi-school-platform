import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listType,
  getType,
  addType,
  updateType,
  delType,
  refreshTableCache,
} from '@/api/system/dict';
import DictDataDrawer from './data';

const DictTypePage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增字典类型');
  const [editingDictId, setEditingDictId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 字典数据抽屉
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDictType, setCurrentDictType] = useState<string>('');

  const handleAdd = () => {
    form.resetFields();
    setEditingDictId(null);
    setModalTitle('新增字典类型');
    form.setFieldsValue({ status: '0' });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingDictId(record.dictId);
    setModalTitle('修改字典类型');
    try {
      const res: any = await getType(record.dictId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingDictId) {
        await updateType({ ...values, dictId: editingDictId });
        message.success('修改成功');
      } else {
        await addType(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (dictId: number) => {
    await delType(dictId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const handleRefreshCache = async () => {
    await refreshTableCache();
    message.success('刷新缓存成功');
  };

  const handleOpenData = (dictType: string) => {
    setCurrentDictType(dictType);
    setDrawerOpen(true);
  };

  const columns: ProColumns[] = [
    {
      title: '字典编号',
      dataIndex: 'dictId',
      hideInSearch: true,
      width: 90,
    },
    {
      title: '字典名称',
      dataIndex: 'dictName',
    },
    {
      title: '字典类型',
      dataIndex: 'dictType',
      render: (_, record) => (
        <a onClick={() => handleOpenData(record.dictType)}>{record.dictType}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
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
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:dict:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Button
            key="data"
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleOpenData(record.dictType)}
          >
            字典数据
          </Button>
          <Authorized key="del" permission="system:dict:remove">
            <Popconfirm
              title="确认删除该字典类型吗？"
              onConfirm={() => handleDelete(record.dictId)}
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
    <PageContainer header={{ title: '字典管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="dictId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listType({
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
          <Authorized key="add" permission="system:dict:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增类型
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
            name="dictName"
            label="字典名称"
            rules={[{ required: true, message: '请输入字典名称' }]}
          >
            <Input placeholder="请输入字典名称" />
          </Form.Item>

          <Form.Item
            name="dictType"
            label="字典类型"
            rules={[{ required: true, message: '请输入字典类型' }]}
          >
            <Input placeholder="例如: sys_user_sex" />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue="0">
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

      {/* 字典数据明细抽屉 */}
      <Drawer
        title={`字典数据 [${currentDictType}]`}
        width={750}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
      >
        {currentDictType && <DictDataDrawer dictType={currentDictType} />}
      </Drawer>
    </PageContainer>
  );
};

export default DictTypePage;
