import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Tooltip } from 'antd';
import { listOutItem } from '@/api/stock/outItem';

const OutItemPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const columns: ProColumns[] = [
    {
      title: '出库单号',
      dataIndex: 'outNo',
      width: 140,
    },
    {
      title: '物品名称',
      dataIndex: 'goodsName',
      width: 200,
      ellipsis: true,
      render: (_, r) => (
        <Tooltip title={r.goodsName} placement="topLeft">
          <span style={{ display: 'inline-block', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.goodsName || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '领用数量',
      dataIndex: 'count',
      width: 100,
    },
    {
      title: '领用部门',
      dataIndex: 'deptName',
      width: 150,
      ellipsis: true,
      render: (_, r) => (
        <Tooltip title={r.deptName} placement="topLeft">
          <span style={{ display: 'inline-block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.deptName || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '领用人',
      dataIndex: 'receiver',
      width: 100,
    },
    {
      title: '出库日期',
      dataIndex: 'outDate',
      valueType: 'date',
      width: 120,
    },
  ];

  return (
    <PageContainer header={{ title: '耗材领用明细台账' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="itemId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listOutItem({
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

export default OutItemPage;
