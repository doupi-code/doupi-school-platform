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
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  listBanner,
  getBanner,
  addBanner,
  updateBanner,
  delBanner,
} from '@/api/cms/banner';

const CmsBannerPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增轮播海报');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增轮播海报');
    form.setFieldsValue({
      platform: 'all',
      status: '0',
      sortOrder: 1,
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.bannerId);
    setModalTitle('修改海报横幅');
    try {
      const res: any = await getBanner(record.bannerId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      } else {
        form.setFieldsValue(record);
      }
    } catch (e) {
      form.setFieldsValue(record);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateBanner({ ...values, bannerId: editingId });
        message.success('修改成功！');
      } else {
        await addBanner(values);
        message.success('新增海报成功！');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await delBanner(id);
      message.success('删除成功！');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '序号',
      dataIndex: 'bannerId',
      width: 60,
      valueType: 'indexBorder',
    },
    {
      title: '海报标题',
      dataIndex: 'title',
      render: (text) => <b>{text}</b>,
    },
    {
      title: '海报图片路径',
      dataIndex: 'imageUrl',
      ellipsis: true,
    },
    {
      title: '点击跳转链接',
      dataIndex: 'linkUrl',
      ellipsis: true,
    },
    {
      title: '展示端',
      dataIndex: 'platform',
      width: 100,
      render: (text) => (
        <Tag color={text === 'pc' ? 'blue' : text === 'mobile' ? 'green' : 'purple'}>
          {text === 'pc' ? '电脑端' : text === 'mobile' ? '手机端' : '全端适配'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (text) => (
        <Tag color={text === '0' ? 'success' : 'default'}>
          {text === '0' ? '启用中' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '排序权重',
      dataIndex: 'sortOrder',
      width: 90,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
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
          title="确定下线并删除该海报吗？"
          onConfirm={() => handleDelete(record.bannerId)}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer header={{ title: '官网轮播海报管理', subTitle: '配置官网首屏及焦点海报大图' }}>
      <ProTable
        actionRef={actionRef}
        rowKey="bannerId"
        columns={columns}
        request={async (params) => {
          try {
          const res: any = await listBanner(params);
          return {
            data: res.rows || res.data || [],
            success: true,
            total: res.total || (res.rows || res.data || []).length,
          };
        
          } catch (error) {
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增轮播海报
          </Button>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="海报标题"
            rules={[{ required: true, message: '请输入海报标题' }]}
          >
            <Input placeholder="如: 2026届高三复读秋季火热预约中" />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label="海报图片路径 / URL"
            rules={[{ required: true, message: '请输入或上传海报图片' }]}
          >
            <Input placeholder="如: /assets/campus-environment.jpg 或 /profile/upload/banner1.jpg" />
          </Form.Item>

          <Form.Item name="linkUrl" label="点击跳转链接">
            <Input placeholder="如: /admissions/consultation 或外部完整链接" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex', width: '100%' }}>
            <Form.Item name="platform" label="适配显示端" style={{ minWidth: 160 }}>
              <Select>
                <Select.Option value="all">全端通用</Select.Option>
                <Select.Option value="pc">仅电脑端显示</Select.Option>
                <Select.Option value="mobile">仅手机端显示</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="sortOrder" label="排序权重 (越大越靠前)" style={{ minWidth: 160 }}>
              <InputNumber min={0} max={999} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="status" label="启用状态">
            <Radio.Group>
              <Radio value="0">启用上线</Radio>
              <Radio value="1">下线停用</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CmsBannerPage;
