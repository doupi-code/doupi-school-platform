import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Space } from 'antd';
import { DeleteOutlined, ClearOutlined, UnlockOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listLogininfor,
  delLogininfor,
  cleanLogininfor,
  unlockLogininfor,
} from '@/api/monitor/logininfor';

const LogininforPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const handleClean = async () => {
    try {
      await cleanLogininfor();
      message.success('清空登录日志成功');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '清空失败');
    }
  };

  const handleUnlock = async (userName: string) => {
    try {
      await unlockLogininfor(userName);
      message.success(`已解锁用户 [${userName}] 的登录锁定`);
    } catch (e: any) {
      message.error(e.message || '解锁失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '访问编号',
      dataIndex: 'infoId',
      hideInSearch: true,
      width: 90,
    },
    {
      title: '用户账号',
      dataIndex: 'userName',
      width: 120,
    },
    {
      title: '登录IP',
      dataIndex: 'ipaddr',
      width: 130,
    },
    {
      title: '登录地点',
      dataIndex: 'loginLocation',
      hideInSearch: true,
      width: 140,
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      hideInSearch: true,
      width: 120,
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      hideInSearch: true,
      width: 120,
    },
    {
      title: '登录状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '成功', status: 'Success' },
        '1': { text: '失败', status: 'Error' },
      },
      width: 90,
    },
    {
      title: '提示信息',
      dataIndex: 'msg',
      hideInSearch: true,
    },
    {
      title: '访问时间',
      dataIndex: 'loginTime',
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            key="unlock"
            type="link"
            size="small"
            icon={<UnlockOutlined />}
            onClick={() => handleUnlock(record.userName)}
          >
            解锁
          </Button>
          <Authorized key="del" permission="monitor:logininfor:remove">
            <Popconfirm
              title="确认删除该条日志？"
              onConfirm={async () => {
                await delLogininfor(record.infoId);
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
    <PageContainer header={{ title: '系统登录审计日志' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="infoId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listLogininfor({
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
          <Authorized key="clean" permission="monitor:logininfor:remove">
            <Popconfirm title="确认清空全部登录日志吗？此操作不可逆！" onConfirm={handleClean}>
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

export default LogininforPage;
