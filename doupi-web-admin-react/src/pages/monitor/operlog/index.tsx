import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Space } from 'antd';
import { DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import { listOperlog, delOperlog, cleanOperlog } from '@/api/monitor/operlog';

const OperlogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const handleClean = async () => {
    try {
      await cleanOperlog();
      message.success('清空操作日志成功');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '清空失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '日志编号',
      dataIndex: 'operId',
      hideInSearch: true,
      width: 90,
    },
    {
      title: '系统模块',
      dataIndex: 'title',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'businessType',
      valueEnum: {
        '1': { text: '新增' },
        '2': { text: '修改' },
        '3': { text: '删除' },
        '4': { text: '授权' },
        '5': { text: '导出' },
      },
      width: 90,
    },
    {
      title: '操作人员',
      dataIndex: 'operName',
      width: 110,
    },
    {
      title: '主机IP',
      dataIndex: 'operIp',
      width: 130,
    },
    {
      title: '操作地点',
      dataIndex: 'operLocation',
      hideInSearch: true,
      width: 130,
    },
    {
      title: '操作状态',
      dataIndex: 'status',
      valueEnum: {
        0: { text: '成功', status: 'Success' },
        1: { text: '失败', status: 'Error' },
      },
      width: 90,
    },
    {
      title: '操作时间',
      dataIndex: 'operTime',
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="del" permission="monitor:operlog:remove">
            <Popconfirm
              title="确认删除该条日志？"
              onConfirm={async () => {
                await delOperlog(record.operId);
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
    <PageContainer header={{ title: '系统操作审计日志' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="operId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listOperlog({
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
          <Authorized key="clean" permission="monitor:operlog:remove">
            <Popconfirm title="确认清空全部操作日志吗？此操作不可逆！" onConfirm={handleClean}>
              <Button danger icon={<ClearOutlined />}>
                清空日志
              </Button>
            </Popconfirm>
          </Authorized>,
        ]}
      />
    </PageContainer>
  );
};

export default OperlogPage;
