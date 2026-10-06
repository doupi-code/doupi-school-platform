import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listSupplier,
  getSupplier,
  addSupplier,
  updateSupplier,
  delSupplier,
} from '@/api/stock/supplier';

const SupplierPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  const triggerSaveSupplierDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('stock_supplier', targetId, current);
    const d = FormDraftUtil.getDraft('stock_supplier', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_supplier', 'create');
    if (draft && draft.formValues && draft.formValues.supplierName) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的供应商草稿，已为您自动恢复！');
    } else {
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.supplierId);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_supplier', record.supplierId);
    if (draft && draft.formValues) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该供应商未保存的草稿数据！');
    } else {
      try {
        const res: any = await getSupplier(record.supplierId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        }
      } catch (e) {}
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = editingId ? editingId : 'create';
      FormDraftUtil.clearDraft('stock_supplier', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getSupplier(editingId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        }
      } else {
        form.resetFields();
      }
      if (editingId) {
        message.success('已丢弃本地草稿，已恢复为数据库数据！');
      } else {
        message.success('已丢弃本地草稿，已刷新到未填写状态！');
      }
    } catch (e) {
      message.error('刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateSupplier({ ...values, supplierId: editingId });
        message.success('修改成功');
        FormDraftUtil.clearDraft('stock_supplier', editingId);
      } else {
        await addSupplier(values);
        message.success('新增成功');
        FormDraftUtil.clearDraft('stock_supplier', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleDelete = async (id: number) => {
    await delSupplier(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '供应商名称',
      dataIndex: 'supplierName',
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      width: 120,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '供应商地址',
      dataIndex: 'address',
      ellipsis: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="stock:supplier:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="stock:supplier:remove">
            <Popconfirm
              title="确认删除该供应商信息吗？"
              onConfirm={() => handleDelete(record.supplierId)}
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
    <PageContainer header={{ title: '供应商信息' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="supplierId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listSupplier({
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
          <Authorized key="add" permission="stock:supplier:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增供应商
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={editingId ? '修改供应商' : '新增供应商'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden={false}
        width={560}
      >
        <DraftNoticeAlert
          visible={!!draftNotice?.visible}
          timeText={draftNotice?.timeText}
          onDiscard={handleDiscardDraft}
          loading={discardLoading}
          isEdit={!!editingId}
        />
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_ch, all) => triggerSaveSupplierDraft(all)}
        >
          <Form.Item
            name="supplierName"
            label="供应商名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="例如: 武汉楚天办公文具实业有限公司" />
          </Form.Item>

          <Form.Item name="contact" label="联系人">
            <Input placeholder="联系人姓名" />
          </Form.Item>

          <Form.Item name="phone" label="联系电话">
            <Input placeholder="联系电话 / 手机号" />
          </Form.Item>

          <Form.Item name="address" label="经营地址">
            <Input placeholder="详细地址" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SupplierPage;
