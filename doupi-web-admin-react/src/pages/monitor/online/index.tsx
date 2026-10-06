import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import { listOnline, forceLogout } from '@/api/monitor/online';

const OnlineUserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const handleForceLogout = async (tokenId: string) => {
    try {
      await forceLogout(tokenId);
      message.success('已成功强退该会话');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '强退失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '会话编号',
      dataIndex: 'tokenId',
      copyable: true,
      width: 200,
    },
    {
      title: '登录账号',
      dataIndex: 'userName',
      width: 120,
    },
    {
      title: '部门名称',
      dataIndex: 'deptName',
      width: 140,
    },
    {
      title: '主机IP',
      dataIndex: 'ipaddr',
      width: 130,
    },
    {
      title: '登录地点',
      dataIndex: 'loginLocation',
      width: 140,
    },
    {
      title: '浏览器类型',
      dataIndex: 'browser',
      hideInSearch: true,
      width: 120,
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="force" permission="monitor:online:forceLogout">
            <Popconfirm
              title="确认强制该用户退出系统吗？"
              onConfirm={() => handleForceLogout(record.tokenId)}
            >
              <Button type="link" size="small" danger icon={<LogoutOutlined />}>
                强退
              </Button>
            </Popconfirm>
          </Authorized>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '在线用户监控' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="tokenId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listOnline({
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
      />
    </PageContainer>
  );
};

export default OnlineUserPage;
