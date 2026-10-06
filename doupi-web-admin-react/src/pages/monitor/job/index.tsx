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
  Switch,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CaretRightOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listJob,
  getJob,
  addJob,
  updateJob,
  delJob,
  changeJobStatus,
  runJob,
} from '@/api/monitor/job';
import { JobLogComponent } from './log';

const JobPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增定时任务');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 调度日志抽屉状态
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedJobForLog, setSelectedJobForLog] = useState<any>(null);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalTitle('新增定时任务');
    form.setFieldsValue({
      jobGroup: 'DEFAULT',
      misfirePolicy: '3',
      concurrent: '1',
      status: '0',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.jobId);
    setModalTitle('修改定时任务');
    try {
      const res: any = await getJob(record.jobId);
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
        await updateJob({ ...values, jobId: editingId });
        message.success('修改成功');
      } else {
        await addJob(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleRunOnce = async (record: any) => {
    try {
      await runJob(record.jobId, record.jobGroup);
      message.success('已触发立即执行一次任务');
    } catch (e: any) {
      message.error(e.message || '执行失败');
    }
  };

  const handleStatusChange = async (checked: boolean, record: any) => {
    const status = checked ? '0' : '1';
    await changeJobStatus(record.jobId, status);
    message.success('任务状态已变更');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '任务名称',
      dataIndex: 'jobName',
    },
    {
      title: '任务组名',
      dataIndex: 'jobGroup',
      width: 100,
    },
    {
      title: '调用目标字符串',
      dataIndex: 'invokeTarget',
      ellipsis: true,
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cronExpression',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常运行', status: 'Success' },
        '1': { text: '暂停', status: 'Error' },
      },
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          onChange={(checked) => handleStatusChange(checked, record)}
        />
      ),
      width: 110,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 290,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Popconfirm
            key="run"
            title="确认立即执行一次该任务？"
            onConfirm={() => handleRunOnce(record)}
          >
            <Button type="link" size="small" icon={<CaretRightOutlined />}>
              执行一次
            </Button>
          </Popconfirm>
          <Authorized key="edit" permission="monitor:job:edit">
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
            key="log"
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => {
              setSelectedJobForLog(record);
              setLogDrawerOpen(true);
            }}
          >
            日志
          </Button>
          <Authorized key="del" permission="monitor:job:remove">
            <Popconfirm
              title="确认删除该定时任务吗？"
              onConfirm={async () => {
                await delJob(record.jobId);
                message.success('删除成功');
                actionRef.current?.reload();
              }}
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
    <PageContainer header={{ title: '定时任务调度' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="jobId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listJob({
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
          <Authorized key="add" permission="monitor:job:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增任务
            </Button>
          </Authorized>,
          <Button
            key="log-center"
            icon={<FileTextOutlined />}
            onClick={() => {
              setSelectedJobForLog(null);
              setLogDrawerOpen(true);
            }}
          >
            调度日志
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
            name="jobName"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如: 每日凌晨重置预约名额" />
          </Form.Item>

          <Form.Item name="jobGroup" label="任务组名" initialValue="DEFAULT">
            <Input placeholder="分组名称" />
          </Form.Item>

          <Form.Item
            name="invokeTarget"
            label="调用目标字符串"
            rules={[{ required: true, message: '请输入调用目标' }]}
            tooltip="Bean名称或全类名.方法名()，例如: recruitTask.refreshQuota()"
          >
            <Input placeholder="recruitTask.refreshQuota()" />
          </Form.Item>

          <Form.Item
            name="cronExpression"
            label="Cron 表达式"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            tooltip="例如: 0 0 0 * * ? (每日零点执行)"
          >
            <Input placeholder="0 0 0 * * ?" />
          </Form.Item>

          <Form.Item name="status" label="初始状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">暂停</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 调度日志抽屉 */}
      <Drawer
        title={selectedJobForLog ? `调度日志 - 【${selectedJobForLog.jobName}】` : '定时任务调度日志中心'}
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        width={1000}
        destroyOnHidden
      >
        <JobLogComponent
          key={selectedJobForLog?.jobId || 'all'}
          jobId={selectedJobForLog?.jobId}
          jobName={selectedJobForLog?.jobName}
          isDrawer={true}
        />
      </Drawer>
    </PageContainer>
  );
};

export default JobPage;
