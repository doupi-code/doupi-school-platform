import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Popconfirm, Tag, Image, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listCampus,
  getCampus,
  addCampus,
  updateCampus,
  delCampus,
} from '@/api/recruit/campus';

const CampusPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    form.setFieldsValue({
      nature: '民办优质寄宿制高中',
      section: '高中部 / 复读部',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.campusId);
    try {
      const res: any = await getCampus(record.campusId);
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
        await updateCampus({ ...values, campusId: editingId });
        message.success('校区信息修改成功！');
      } else {
        await addCampus(values);
        message.success('校区信息新增成功！');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    await delCampus(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 80,
      align: 'center',
      hideInSearch: true,
      render: (_, r) =>
        r.coverImage ? (
          <Image src={r.coverImage} width={48} height={36} style={{ borderRadius: 4 }} />
        ) : (
          <Tag icon={<PictureOutlined />}>暂无</Tag>
        ),
    },
    {
      title: '校区名称',
      dataIndex: 'campusName',
      width: 140,
    },
    {
      title: '校区标题',
      dataIndex: 'title',
      width: 160,
      ellipsis: true,
    },
    {
      title: '办学性质',
      dataIndex: 'nature',
      width: 140,
      render: (_, r) => <Tag color="blue">{r.nature || '民办高中'}</Tag>,
    },
    {
      title: '开设学段',
      dataIndex: 'section',
      width: 130,
      render: (_, r) => <Tag color="cyan">{r.section || '高中部'}</Tag>,
    },
    {
      title: '咨询电话',
      dataIndex: 'contactPhone',
      width: 130,
    },
    {
      title: '校区地址',
      dataIndex: 'address',
      width: 180,
      ellipsis: true,
    },
    {
      title: '一句话特色',
      dataIndex: 'summary',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Authorized key="del" permission={['recruit:campus:remove', 'recruit:campus:edit']}>
            <Popconfirm
              key="del"
              title="确认删除该校区信息？"
              onConfirm={() => handleDelete(record.campusId)}
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
    <PageContainer header={{ title: '校区图文信息维护' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="campusId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listCampus({
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
          <Authorized key="add" permission={['recruit:campus:add', 'recruit:campus:edit']}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增校区
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={editingId ? '编辑校区信息' : '新增校区信息'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="campusName"
            label="校区名称"
            rules={[{ required: true, message: '请输入校区名称' }]}
          >
            <Input placeholder="例如: 汉外华襄主校区" />
          </Form.Item>

          <Form.Item
            name="title"
            label="小程序顶部大标题"
            rules={[{ required: true, message: '请输入校区大标题' }]}
          >
            <Input placeholder="例如: 武汉汉外华襄高级中学（寄宿制卓越班）" />
          </Form.Item>

          <Form.Item name="nature" label="办学性质">
            <Input placeholder="例如: 优质民办寄宿制高中 / 国际特色部" />
          </Form.Item>

          <Form.Item name="section" label="开设学段">
            <Input placeholder="例如: 高中部 / 初中部 / 高三复读部" />
          </Form.Item>

          <Form.Item
            name="contactPhone"
            label="招生咨询接待热线"
            rules={[{ required: true, message: '请输入咨询电话' }]}
          >
            <Input placeholder="例如: 027-87654321 / 13800000000" />
          </Form.Item>

          <Form.Item
            name="address"
            label="校区详细地理位置"
            rules={[{ required: true, message: '请输入详细地址' }]}
          >
            <Input placeholder="详细地址（支持小程序一键导航）" />
          </Form.Item>

          <Form.Item name="coverImage" label="校区封面大图URL">
            <Input placeholder="请输入图片链接或在图床上传后的URL" prefix={<PictureOutlined />} />
          </Form.Item>

          <Form.Item name="summary" label="一句话亮点特色">
            <Input.TextArea rows={2} placeholder="用于小程序和官网卡片展示的简要介绍" />
          </Form.Item>

          <Form.Item name="intro" label="校区图文详细介绍">
            <Input.TextArea rows={5} placeholder="校区硬件环境、名师团队、升学光荣榜等详细图文内容" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CampusPage;
