import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Alert, Button, Form, Input, message, Modal, Popconfirm, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listTeacher,
  getTeacher,
  addTeacher,
  updateTeacher,
  delTeacher,
} from '@/api/edu/teacher';
import { listClass } from '@/api/edu/class';

const TeacherPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const [classList, setClassList] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  const triggerSaveTeacherDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('edu_teacher', targetId, current);
    const d = FormDraftUtil.getDraft('edu_teacher', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  useEffect(() => {
    listClass({ pageSize: 200 }).then((res: any) => {
      if (res && res.rows) {
        setClassList(res.rows);
      }
    }).catch(() => {});
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setSelectedGrade('');

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('edu_teacher', 'create');
    if (draft && draft.formValues && draft.formValues.teacherName) {
      form.setFieldsValue(draft.formValues);
      if (draft.formValues.grade) {
        setSelectedGrade(draft.formValues.grade);
      }
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新增教职工草稿，已为您自动恢复！');
    } else {
      form.setFieldsValue({ status: '0', subject: '语文', grade: '高一' });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.teacherId);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('edu_teacher', record.teacherId);
    if (draft && draft.formValues) {
      form.setFieldsValue(draft.formValues);
      if (draft.formValues.grade) {
        setSelectedGrade(draft.formValues.grade);
      }
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该教职工未保存的草稿数据！');
    } else {
      try {
        const res: any = await getTeacher(record.teacherId);
        if (res && res.data) {
          const d = res.data;
          let selectedClassIds: any[] = [];
          if (d.classIds) {
            if (Array.isArray(d.classIds)) {
              selectedClassIds = d.classIds;
            } else if (typeof d.classIds === 'string') {
              selectedClassIds = d.classIds.split(',').map((id: string) => Number(id.trim())).filter(Boolean);
            }
          }
          form.setFieldsValue({
            ...d,
            selectedClassIds,
          });
          if (d.grade) {
            setSelectedGrade(d.grade);
          }
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
      FormDraftUtil.clearDraft('edu_teacher', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getTeacher(editingId);
        if (res && res.data) {
          const d = res.data;
          let selectedClassIds: any[] = [];
          if (d.classIds) {
            if (Array.isArray(d.classIds)) {
              selectedClassIds = d.classIds;
            } else if (typeof d.classIds === 'string') {
              selectedClassIds = d.classIds.split(',').map((id: string) => Number(id.trim())).filter(Boolean);
            }
          }
          form.setFieldsValue({
            ...d,
            selectedClassIds,
          });
          if (d.grade) {
            setSelectedGrade(d.grade);
          }
        }
      } else {
        form.resetFields();
        setSelectedGrade('');
        form.setFieldsValue({ status: '0', subject: '语文', grade: '高一' });
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
      const payload = {
        ...values,
        classIds: Array.isArray(values.selectedClassIds) ? values.selectedClassIds.join(',') : '',
      };

      if (editingId) {
        await updateTeacher({ ...payload, teacherId: editingId });
        message.success('教师档案修改成功！');
        FormDraftUtil.clearDraft('edu_teacher', editingId);
      } else {
        await addTeacher(payload);
        message.success('教师档案新增成功！');
        FormDraftUtil.clearDraft('edu_teacher', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    await delTeacher(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const filteredClassList = selectedGrade
    ? classList.filter((c) => !c.grade || c.grade === selectedGrade)
    : classList;

  // 将班级 ID 列表渲染为可读的班级名称
  const renderClassNames = (classIdsStr: any) => {
    if (!classIdsStr) return '-';
    const ids = String(classIdsStr).split(',').map((id) => Number(id.trim())).filter(Boolean);
    if (ids.length === 0) return '-';
    return (
      <Space wrap size={[0, 4]}>
        {ids.map((id) => {
          const c = classList.find((item) => item.classId === id);
          return (
            <Tag key={id} color="geekblue" style={{ fontSize: 11 }}>
              {c ? c.className : `班级ID:${id}`}
            </Tag>
          );
        })}
      </Space>
    );
  };

  const columns: ProColumns[] = [
    {
      title: '教师ID',
      dataIndex: 'teacherId',
      width: 75,
      align: 'center',
    },
    {
      title: '教师工号',
      dataIndex: 'teacherCode',
      width: 100,
    },
    {
      title: '教师姓名',
      dataIndex: 'teacherName',
      width: 110,
    },
    {
      title: '所属部门',
      dataIndex: 'dept',
      width: 120,
    },
    {
      title: '任教年级',
      dataIndex: 'grade',
      width: 90,
      align: 'center',
      valueEnum: {
        高一: { text: '高一' },
        高二: { text: '高二' },
        高三: { text: '高三' },
        复读部: { text: '复读部' },
        初中部: { text: '初中部' },
      },
    },
    {
      title: '任教班级',
      dataIndex: 'classIds',
      ellipsis: true,
      width: 180,
      render: (_, record) => renderClassNames(record.classIds),
    },
    {
      title: '任教学科',
      dataIndex: 'subject',
      width: 100,
      align: 'center',
      render: (_, record) => <Tag color="blue">{record.subject || '通用'}</Tag>,
    },
    {
      title: '职称',
      dataIndex: 'title',
      width: 110,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '在职', status: 'Success' },
        '1': { text: '离职', status: 'Error' },
      },
      width: 80,
      align: 'center',
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
            修改
          </Button>
          <Authorized key="del" permission="edu:teacher:remove">
            <Popconfirm
              key="del"
              title="确认删除该教师档案？"
              onConfirm={() => handleDelete(record.teacherId)}
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
    <PageContainer header={{ title: '教职工档案管理' }}>
      <Alert
        message="教职工人事与权限一体化联动"
        description="教职工档案已支持与系统用户权限角色互联。在此维护的教师任教年级、主修学科与任教班级，将在文印智能登记与文印统计报表中自动级联匹配。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" type="primary" ghost icon={<UserOutlined />} onClick={() => navigate('/system/user')}>
            系统用户中心
          </Button>
        }
      />
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="teacherId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listTeacher({
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
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增教职工
          </Button>,
        ]}
      />

      <Modal
        title={editingId ? '修改教职工档案' : '新增教职工档案'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnHidden={false}
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
          onValuesChange={(_ch, all) => triggerSaveTeacherDraft(all)}
        >
          <Form.Item
            name="teacherName"
            label="教师姓名"
            rules={[{ required: true, message: '请输入教师姓名' }]}
          >
            <Input placeholder="如：张老师" />
          </Form.Item>

          <Form.Item name="dept" label="所属部门">
            <Input placeholder="如：高中部数学教研组、教务处" />
          </Form.Item>

          <Form.Item name="grade" label="任教年级">
            <Select
              placeholder="请选择任教年级"
              allowClear
              onChange={(val) => {
                setSelectedGrade(val);
                form.setFieldsValue({ selectedClassIds: [] });
              }}
            >
              <Select.Option value="高一">高一年级</Select.Option>
              <Select.Option value="高二">高二年级</Select.Option>
              <Select.Option value="高三">高三年级</Select.Option>
              <Select.Option value="复读部">高三复读部</Select.Option>
              <Select.Option value="初中部">初中部</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="selectedClassIds" label="任教班级 (支持跨班多选)">
            <Select
              mode="multiple"
              placeholder="请选择班级（可选择多个）"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {filteredClassList.map((c) => (
                <Select.Option key={c.classId} value={c.classId}>
                  {(c.grade ? c.grade + ' ' : '') + c.className}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="subject" label="任教学科" rules={[{ required: true }]}>
            <Input placeholder="如：数学、语文、英语、物理" />
          </Form.Item>

          <Form.Item name="title" label="教师职称">
            <Input placeholder="如：特级教师、高级教师、骨干教师" />
          </Form.Item>

          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入手机或办公电话" />
          </Form.Item>

          <Form.Item name="status" label="在职状态">
            <Select>
              <Select.Option value="0">在职</Select.Option>
              <Select.Option value="1">离职</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TeacherPage;
