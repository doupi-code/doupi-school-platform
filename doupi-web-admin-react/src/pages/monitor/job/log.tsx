import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Popconfirm, Tag, Descriptions } from 'antd';
import { DeleteOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { listJobLog, delJobLog, cleanJobLog } from '@/api/monitor/jobLog';
import Authorized from '@/components/Authorized';

interface JobLogPageProps {
  jobId?: number | string;
  jobName?: string;
  isDrawer?: boolean;
}

export const JobLogComponent: React.FC<JobLogPageProps> = ({ jobId, jobName, isDrawer }) => {
  const actionRef = useRef<ActionType>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentLog, setCurrentLog] = useState<any>({});

  // 删除单条日志
  const handleDelete = async (jobLogId: number) => {
    try {
      await delJobLog(jobLogId);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await delJobLog(selectedRowKeys.join(','));
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  // 清空全部日志
  const handleClean = async () => {
    try {
      await cleanJobLog();
      message.success('日志已全部清空');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '清空失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '日志编号',
      dataIndex: 'jobLogId',
      width: 90,
      hideInSearch: true,
    },
    {
      title: '任务名称',
      dataIndex: 'jobName',
      initialValue: jobName,
    },
    {
      title: '任务组名',
      dataIndex: 'jobGroup',
      width: 110,
    },
    {
      title: '调用目标字符串',
      dataIndex: 'invokeTarget',
      ellipsis: true,
    },
    {
      title: '日志信息',
      dataIndex: 'jobMessage',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '失败', status: 'Error' },
      },
      render: (_, record) => (
        record.status === '0' ? <Tag color="success">正常</Tag> : <Tag color="error">失败</Tag>
      ),
    },
    {
      title: '执行时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setCurrentLog(record);
            setDetailOpen(true);
          }}
        >
          详细
        </Button>,
        <Authorized key="del" permission="monitor:job:remove">
          <Popconfirm
            title="确认删除该条日志？"
            onConfirm={() => handleDelete(record.jobLogId)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Authorized>,
      ],
    },
  ];

  const content = (
    <>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="jobLogId"
        scroll={{ x: 'max-content' }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async (params) => {
          try {
            const res: any = await listJobLog({
              ...params,
              jobId: jobId || undefined,
              pageNum: params.current,
              pageSize: params.pageSize,
            });
            return {
              data: res.rows || [],
              total: res.total || 0,
              success: true,
            };
          } catch (e) {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Authorized key="batch-del" permission="monitor:job:remove">
            <Popconfirm
              title={`确认删除选中的 ${selectedRowKeys.length} 项日志？`}
              disabled={selectedRowKeys.length === 0}
              onConfirm={handleBatchDelete}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
            </Popconfirm>
          </Authorized>,
          <Authorized key="clean" permission="monitor:job:remove">
            <Popconfirm
              title="确认清空所有调度日志数据吗？清空后无法找回！"
              onConfirm={handleClean}
            >
              <Button danger icon={<ClearOutlined />}>
                清空日志
              </Button>
            </Popconfirm>
          </Authorized>,
        ]}
      />

      {/* 日志详情弹窗 */}
      <Modal
        title="调度日志详细信息"
        open={detailOpen}
        onOk={() => setDetailOpen(false)}
        onCancel={() => setDetailOpen(false)}
        width={700}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            关 闭
          </Button>,
        ]}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="日志编号">{currentLog.jobLogId}</Descriptions.Item>
          <Descriptions.Item label="任务名称">{currentLog.jobName}</Descriptions.Item>
          <Descriptions.Item label="任务组名">{currentLog.jobGroup}</Descriptions.Item>
          <Descriptions.Item label="执行时间">{currentLog.createTime}</Descriptions.Item>
          <Descriptions.Item label="调用目标" span={2}>
            <code>{currentLog.invokeTarget}</code>
          </Descriptions.Item>
          <Descriptions.Item label="执行状态" span={2}>
            {currentLog.status === '0' ? <Tag color="success">正常执行</Tag> : <Tag color="error">执行失败</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="日志信息" span={2}>
            {currentLog.jobMessage || '-'}
          </Descriptions.Item>
          {currentLog.status === '1' && (
            <Descriptions.Item label="异常堆栈信息" span={2}>
              <pre style={{ maxHeight: 200, overflowY: 'auto', background: '#fff1f0', padding: 8, borderRadius: 4, color: '#cf1322', fontSize: 12 }}>
                {currentLog.exceptionInfo || '无异常堆栈'}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Modal>
    </>
  );

  if (isDrawer) {
    return content;
  }

  return (
    <PageContainer header={{ title: '调度日志' }}>
      {content}
    </PageContainer>
  );
};

export default JobLogComponent;
