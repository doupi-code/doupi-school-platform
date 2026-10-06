import React, { useRef, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
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
  Tag,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listData,
  getData,
  addData,
  updateData,
  delData,
} from '@/api/system/dict';

interface DictDataDrawerProps {
  dictType: string;
}

const DictDataDrawer: React.FC<DictDataDrawerProps> = ({ dictType }) => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingCode(null);
    form.setFieldsValue({
      dictType,
      dictSort: 1,
      status: '0',
      listClass: 'default',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingCode(record.dictCode);
    try {
      const res: any = await getData(record.dictCode);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingCode) {
        await updateData({ ...values, dictCode: editingCode });
        message.success('修改成功');
      } else {
        await addData(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (dictCode: number) => {
    await delData(dictCode);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '字典标签',
      dataIndex: 'dictLabel',
      render: (_, record) => {
        const color = record.listClass === 'danger' ? 'red' : record.listClass === 'success' ? 'green' : 'blue';
        return <Tag color={color}>{record.dictLabel}</Tag>;
      },
    },
    {
      title: '字典键值',
      dataIndex: 'dictValue',
    },
    {
      title: '排序',
      dataIndex: 'dictSort',
      hideInSearch: true,
      width: 70,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
      width: 80,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
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
          <Authorized key="del" permission="system:dict:remove">
            <Popconfirm
              title="确认删除该数据项吗？"
              onConfirm={() => handleDelete(record.dictCode)}
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
    <div>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="dictCode"
        scroll={{ x: 'max-content' }}
        search={false}
        request={async (params) => {
          try {
            const res: any = await listData({
            ...params,
            dictType,
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
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
              新增数据
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={editingCode ? '修改数据项' : '新增数据项'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="dictType" label="字典类型">
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="dictLabel"
            label="数据标签"
            rules={[{ required: true, message: '请输入数据标签' }]}
          >
            <Input placeholder="请输入数据标签，例如: 男" />
          </Form.Item>

          <Form.Item
            name="dictValue"
            label="数据键值"
            rules={[{ required: true, message: '请输入数据键值' }]}
          >
            <Input placeholder="请输入数据键值，例如: 0" />
          </Form.Item>

          <Form.Item name="dictSort" label="显示排序" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">停用</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictDataDrawer;
