import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listClass,
  getClass,
  addClass,
  updateClass,
  delClass,
} from '@/api/edu/class';
import { listTeacher } from '@/api/edu/teacher';

const ClassPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [form] = Form.useForm();

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  const triggerSaveClassDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('edu_class', targetId, current);
    const d = FormDraftUtil.getDraft('edu_class', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  // 加载系统教师列表，用于班主任下拉选择
  const fetchTeachers = async () => {
    try {
      const res: any = await listTeacher({ pageSize: 500 });
      if (res && (res.rows || res.data)) {
        setTeacherList(res.rows || res.data || []);
      }
    } catch (e) {
      console.error('加载教师列表失败:', e);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('edu_class', 'create');
    if (draft && draft.formValues && draft.formValues.className) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新增班级草稿，已为您自动恢复！');
    } else {
      form.setFieldsValue({ grade: '高一', studentNum: 45 });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.classId);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('edu_class', record.classId);
    if (draft && draft.formValues) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该班级未保存的草稿数据！');
    } else {
      try {
        const res: any = await getClass(record.classId);
        if (res && res.data) {
          form.setFieldsValue({
            ...res.data,
            studentNum: res.data.studentNum ?? res.data.studentCount ?? 45,
            headTeacherId: res.data.headTeacherId || undefined,
          });
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
      FormDraftUtil.clearDraft('edu_class', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getClass(editingId);
        if (res && res.data) {
          form.setFieldsValue({
            ...res.data,
            studentNum: res.data.studentNum ?? res.data.studentCount ?? 45,
            headTeacherId: res.data.headTeacherId || undefined,
          });
        }
      } else {
        form.resetFields();
        form.setFieldsValue({ grade: '高一', studentNum: 45 });
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
      // 根据选中的 headTeacherId 自动匹配班主任姓名
      let headTeacherName = '';
      if (values.headTeacherId) {
        const found = teacherList.find((t) => t.teacherId === values.headTeacherId);
        headTeacherName = found ? found.teacherName : '';
      }

      const payload = {
        ...values,
        headTeacher: headTeacherName,
        headTeacherId: values.headTeacherId || null,
      };

      if (editingId) {
        await updateClass({ ...payload, classId: editingId });
        message.success('修改班级成功');
        FormDraftUtil.clearDraft('edu_class', editingId);
      } else {
        await addClass(payload);
        message.success('新增班级成功');
        FormDraftUtil.clearDraft('edu_class', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {
      console.error('保存班级失败:', e);
    }
  };

  const handleDelete = async (id: number) => {
    await delClass(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '班级名称',
      dataIndex: 'className',
      render: (_, record) => (
        <span style={{ fontWeight: 500, color: '#1677ff' }}>
          {record.className}
        </span>
      ),
    },
    {
      title: '学段年级',
      dataIndex: 'grade',
      valueEnum: {
        '初一': { text: '初一' },
        '初二': { text: '初二' },
        '初三': { text: '初三' },
        '高一': { text: '高一' },
        '高二': { text: '高二' },
        '高三': { text: '高三' },
        '复读部': { text: '复读部' },
      },
      render: (_, record) => {
        const color = record.grade === '复读部' ? 'purple' : 'blue';
        return <Tag color={color}>{record.grade || '-'}</Tag>;
      },
      width: 110,
    },
    {
      title: '班主任',
      dataIndex: 'headTeacher',
      width: 140,
      render: (_, record) => {
        if (record.headTeacher) {
          return (
            <Space size={4}>
              <UserOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontWeight: 500 }}>{record.headTeacher}</span>
            </Space>
          );
        }
        return <span style={{ color: '#bfbfbf' }}>未分配</span>;
      },
    },
    {
      title: '班级人数',
      dataIndex: 'studentNum',
      hideInSearch: true,
      width: 110,
      render: (_, record) => <span>{record.studentNum ?? record.studentCount ?? 0} 人</span>,
    },
    {
      title: '所属校区',
      dataIndex: 'campusName',
      render: (_, record) => record.campusName || '本部校区',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="edu:class:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="edu:class:remove">
            <Popconfirm
              title="确认删除该班级吗？"
              onConfirm={() => handleDelete(record.classId)}
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
    <PageContainer header={{ title: '班级档案管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="classId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listClass({
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
          <Authorized key="add" permission="edu:class:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增班级
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={editingId ? '修改班级档案' : '新增班级档案'}
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
          onValuesChange={(_ch, all) => triggerSaveClassDraft(all)}
        >
          <Form.Item
            name="className"
            label="班级全称"
            rules={[{ required: true, message: '请输入班级名称' }]}
          >
            <Input placeholder="例如: 高三（1）班·精英C班" />
          </Form.Item>

          <Form.Item name="grade" label="学段年级" initialValue="高一" rules={[{ required: true, message: '请选择年级' }]}>
            <Select placeholder="请选择学段年级">
              <Select.Option value="高一">高一</Select.Option>
              <Select.Option value="高二">高二</Select.Option>
              <Select.Option value="高三">高三</Select.Option>
              <Select.Option value="复读部">高三复读部</Select.Option>
              <Select.Option value="初一">初一</Select.Option>
              <Select.Option value="初二">初二</Select.Option>
              <Select.Option value="初三">初三</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="headTeacherId" label="班主任老师">
            <Select
              showSearch
              allowClear
              placeholder="请选择班主任（可直接输入姓名/科目检索）"
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              options={teacherList.map((t) => ({
                value: t.teacherId,
                label: `${t.teacherName}${t.subject ? `（${t.subject}）` : ''}${t.dept ? ` - ${t.dept}` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="studentNum" label="班级人数" initialValue={45} rules={[{ required: true, message: '请输入班级人数' }]}>
            <InputNumber min={1} max={150} style={{ width: '100%' }} addonAfter="人" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ClassPage;
