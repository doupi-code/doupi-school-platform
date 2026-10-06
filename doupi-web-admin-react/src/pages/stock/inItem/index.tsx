import React, { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { listInItem } from '@/api/stock/inItem';

const InItemPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const columns: ProColumns[] = [
    {
      title: '入库单号',
      dataIndex: 'inNo',
      width: 140,
    },
    {
      title: '物品名称',
      dataIndex: 'goodsName',
    },
    {
      title: '入库数量',
      dataIndex: 'count',
      width: 100,
    },
    {
      title: '采购单价 (元)',
      dataIndex: 'price',
      width: 120,
      render: (_, r) => <span>¥{r.price || '0.00'}</span>,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
    },
    {
      title: '入库日期',
      dataIndex: 'inDate',
      valueType: 'date',
      width: 120,
    },
  ];

  return (
    <PageContainer header={{ title: '采购入库明细台账' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="itemId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listInItem({
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

export default InItemPage;
