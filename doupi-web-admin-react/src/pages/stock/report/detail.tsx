import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { getStockDetailReport } from '@/api/stock/report';

const StockReportDetailPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const columns: ProColumns[] = [
    {
      title: '变动单号',
      dataIndex: 'orderNo',
      width: 140,
    },
    {
      title: '物品名称',
      dataIndex: 'goodsName',
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueEnum: {
        IN: { text: '采购入库' },
        OUT: { text: '领用出库' },
      },
      render: (_, r) => (
        <Tag color={r.type === 'IN' ? 'green' : 'orange'}>
          {r.type === 'IN' ? '+ 入库' : '- 出库'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: '变动数量',
      dataIndex: 'changeCount',
      width: 100,
      render: (_, r) => (
        <span style={{ fontWeight: 'bold', color: r.type === 'IN' ? '#52c41a' : '#fa8c16' }}>
          {r.type === 'IN' ? `+${r.changeCount}` : `-${r.changeCount}`}
        </span>
      ),
    },
    {
      title: '结存库存',
      dataIndex: 'remainingStock',
      width: 100,
    },
    {
      title: '关联人员/部门',
      dataIndex: 'targetName',
    },
    {
      title: '发生时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
    },
  ];

  return (
    <PageContainer header={{ title: '出入库流水明细台账' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await getStockDetailReport({
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

export default StockReportDetailPage;
