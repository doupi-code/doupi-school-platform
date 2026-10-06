import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
  Row,
  Col,
} from 'antd';

import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listAppointment,
  getAppointment,
  addAppointment,
  updateAppointment,
  delAppointment,
  verifyAppointment,
} from '@/api/recruit/appointment';
import { listTeacher } from '@/api/edu/teacher';

const { Text } = Typography;

const AppointmentPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增预约');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  const triggerSaveAppointmentDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('recruit_appointment', targetId, current);
    const d = FormDraftUtil.getDraft('recruit_appointment', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  // 指派教师弹窗
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [assignForm] = Form.useForm();
  const [teacherList, setTeacherList] = useState<any[]>([]);

  useEffect(() => {
    listTeacher({ pageSize: 100 }).then((res: any) => {
      if (res && res.rows) setTeacherList(res.rows);
    }).catch(() => {});
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增访校预约');

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('recruit_appointment', 'create');
    if (draft && draft.formValues && (draft.formValues.studentName || draft.formValues.parentPhone)) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的访校预约草稿，已为您自动恢复！');
    } else {
      form.setFieldsValue({
        studentGender: '男',
        studentGrade: '高一',
        timeSlot: '上午 09:00 - 11:30',
        status: 'APPROVED',
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.appointmentId);
    setModalTitle(`修改访校预约 (${record.studentName || ''})`);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('recruit_appointment', record.appointmentId);
    if (draft && draft.formValues) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该访校预约未保存的草稿数据！');
    } else {
      try {
        const res: any = await getAppointment(record.appointmentId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        } else {
          form.setFieldsValue(record);
        }
      } catch (e) {
        form.setFieldsValue(record);
      }
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = editingId ? editingId : 'create';
      FormDraftUtil.clearDraft('recruit_appointment', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getAppointment(editingId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          studentGender: '男',
          studentGrade: '高一',
          timeSlot: '上午 09:00 - 11:30',
          status: 'APPROVED',
        });
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
        await updateAppointment({ ...values, appointmentId: editingId });
        message.success('预约信息修改成功！');
        FormDraftUtil.clearDraft('recruit_appointment', editingId);
      } else {
        await addAppointment(values);
        message.success('访校预约新增成功！');
        FormDraftUtil.clearDraft('recruit_appointment', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    await delAppointment(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  // 快捷一键核销
  const handleDirectVerify = async (record: any) => {
    try {
      await verifyAppointment({ checkInCode: record.checkInCode });
      message.success(`核销成功！核销码: ${record.checkInCode}`);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '核销失败');
    }
  };

  // 打开指派教师弹窗
  const handleOpenAssign = (record: any) => {
    setAssignTarget(record);
    assignForm.resetFields();
    assignForm.setFieldsValue({
      teacherName: record.teacherName || '',
    });
    setAssignModalOpen(true);
  };

  // 保存指派教师
  const handleSaveAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await updateAppointment({
        appointmentId: assignTarget.appointmentId,
        teacherName: values.teacherName,
      });
      message.success('接待教师指派成功！');
      setAssignModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '指派失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '预约单号',
      dataIndex: 'appointmentNo',
      copyable: true,
      width: 140,
    },
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      width: 95,
      render: (_, r) => <Text strong>{r.studentName}</Text>,
    },
    {
      title: '性别',
      dataIndex: 'studentGender',
      width: 60,
      align: 'center',
    },
    {
      title: '申请学段年级',
      dataIndex: 'studentGrade',
      width: 105,
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
      title: '原就读学校',
      dataIndex: 'currentSchool',
      ellipsis: true,
      width: 130,
      render: (_, r) => r.currentSchool || '-',
    },
    {
      title: '家长姓名',
      dataIndex: 'parentName',
      width: 95,
    },
    {
      title: '联系手机',
      dataIndex: 'parentPhone',
      width: 120,
    },
    {
      title: '预约访校日期',
      dataIndex: 'visitDate',
      valueType: 'date',
      width: 110,
      align: 'center',
    },
    {
      title: '到校时段',
      dataIndex: 'timeSlot',
      hideInSearch: true,
      width: 140,
    },
    {
      title: '核销凭证码',
      dataIndex: 'checkInCode',
      copyable: true,
      render: (_, record) => <Tag color="blue">{record.checkInCode}</Tag>,
      width: 110,
      align: 'center',
    },
    {
      title: '接待教师',
      dataIndex: 'teacherName',
      width: 120,
      render: (_, r) =>
        r.teacherName ? (
          <Space>
            <span>{r.teacherName}</span>
            <a onClick={() => handleOpenAssign(r)} style={{ fontSize: 12 }}>
              改派
            </a>
          </Space>
        ) : (
          <Button
            type="link"
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleOpenAssign(r)}
          >
            指派教师
          </Button>
        ),
    },
    {
      title: '预约状态',
      dataIndex: 'status',
      width: 95,
      align: 'center',
      valueEnum: {
        PENDING: { text: '待审核', status: 'Warning' },
        APPROVED: { text: '待核销', status: 'Processing' },
        VERIFIED: { text: '已核销', status: 'Success' },
        CANCELLED: { text: '已取消', status: 'Default' },
      },
      render: (_, r) => {
        if (r.status === 'VERIFIED') return <Tag color="success">已核销</Tag>;
        if (r.status === 'APPROVED') return <Tag color="processing">待核销</Tag>;
        if (r.status === 'PENDING') return <Tag color="warning">待审核</Tag>;
        return <Tag color="default">已取消</Tag>;
      },
    },
    {
      title: '家长诉求 / 意向',
      dataIndex: 'remark',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '接待沟通备注',
      dataIndex: 'auditRemark',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'APPROVED' && (
            <Popconfirm
              key="verify"
              title="确认将该预约办理现场核销？"
              onConfirm={() => handleDirectVerify(record)}
            >
              <Button type="link" size="small" icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>
                核销
              </Button>
            </Popconfirm>
          )}
          <Authorized key="edit" permission="recruit:appointment:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="recruit:appointment:remove">
            <Popconfirm
              key="del"
              title="确认删除该预约记录吗？"
              onConfirm={() => handleDelete(record.appointmentId)}
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
    <PageContainer header={{ title: '访校预约管理台账' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="appointmentId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listAppointment({
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
            新增访校预约
          </Button>,
        ]}
      />

      {/* 新增/修改弹窗 */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={720}
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
          onValuesChange={(_ch, all) => triggerSaveAppointmentDraft(all)}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="studentName"
                label="学生姓名"
                rules={[{ required: true, message: '请输入学生姓名' }]}
              >
                <Input placeholder="学生姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="studentGender" label="学生性别" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="男">男</Radio>
                  <Radio value="女">女</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="studentGrade"
                label="意向学段年级"
                rules={[{ required: true, message: '请选择年级' }]}
              >
                <Select placeholder="选择年级">
                  <Select.Option value="高一">高一年级</Select.Option>
                  <Select.Option value="高二">高二年级</Select.Option>
                  <Select.Option value="高三">高三年级</Select.Option>
                  <Select.Option value="复读部">高三复读部</Select.Option>
                  <Select.Option value="初中部">初中部</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currentSchool" label="原就读学校">
                <Input placeholder="例如：武汉市某重点中学" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parentName"
                label="家长姓名"
                rules={[{ required: true, message: '请输入家长姓名' }]}
              >
                <Input placeholder="家长姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentPhone"
                label="家长联系手机"
                rules={[{ required: true, message: '请输入联系手机' }]}
              >
                <Input placeholder="11位手机号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="visitDate"
                label="预约访校日期"
                rules={[{ required: true, message: '请选择访校日期' }]}
              >
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeSlot" label="到校时段" rules={[{ required: true }]}>
                <Input placeholder="例如: 上午 09:00 - 11:30" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="预约状态" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="PENDING">待审核</Select.Option>
                  <Select.Option value="APPROVED">待核销 (已通过)</Select.Option>
                  <Select.Option value="VERIFIED">已核销</Select.Option>
                  <Select.Option value="CANCELLED">已取消</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="teacherName" label="指定接待教师">
                <Select placeholder="选择接待教师" allowClear showSearch optionFilterProp="children">
                  {teacherList.map((t) => (
                    <Select.Option key={t.teacherId} value={t.teacherName}>
                      {t.teacherName} {t.subject ? `(${t.subject})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="家长咨询诉求与意向班型">
            <Input.TextArea rows={2} placeholder="例如：意向高考冲刺重点班、询问食宿及学费标准等" />
          </Form.Item>

          <Form.Item name="auditRemark" label="现场接待与沟通记录">
            <Input.TextArea rows={2} placeholder="招生老师到校沟通记录、跟进意向等" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 指派接待教师弹窗 */}
      <Modal
        title={`指派接待教师 - 学生: ${assignTarget?.studentName || ''}`}
        open={assignModalOpen}
        onOk={handleSaveAssign}
        onCancel={() => setAssignModalOpen(false)}
        destroyOnHidden
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="teacherName"
            label="选择负责接待跟进的教师"
            rules={[{ required: true, message: '请选择教师' }]}
          >
            <Select placeholder="请选择教师" showSearch optionFilterProp="children">
              {teacherList.map((t) => (
                <Select.Option key={t.teacherId} value={t.teacherName}>
                  {t.teacherName} {t.subject ? `(${t.subject})` : ''} - {t.dept || '教师'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AppointmentPage;
