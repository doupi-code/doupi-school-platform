import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Table } from 'antd';
import { ShoppingCartOutlined, ExportOutlined, InboxOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { getStockMonthlyReport } from '@/api/stock/report';

const StockMonthlyReportPage: React.FC = () => {
  // 后端返回的真实月度汇总数据（字段：month / inQuantity / outQuantity / inAmount / outAmount 等）
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await getStockMonthlyReport({ year: dayjs().format('YYYY') });
      if (res && Array.isArray(res.data)) {
        setData(res.data);
      } else if (res && Array.isArray(res.rows)) {
        setData(res.rows);
      } else {
        setData([]);
      }
    } catch (e) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const safeData = Array.isArray(data) ? data : [];

  // 当前月份（用于顶部卡片展示本月数据）
  const currentMonth = dayjs().format('YYYY-MM');
  const currentMonthData = safeData.find((d) => d.month === currentMonth);

  const currentInQty = Number(currentMonthData?.inQuantity ?? 0);
  const currentOutQty = Number(currentMonthData?.outQuantity ?? 0);

  // 当前仓库总结存：以「本年累计入库 - 本年累计出库」近似期末结存（台账口径）
  const totalInQty = safeData.reduce((sum, d) => sum + (Number(d.inQuantity) || 0), 0);
  const totalOutQty = safeData.reduce((sum, d) => sum + (Number(d.outQuantity) || 0), 0);
  const totalBalance = Math.max(0, totalInQty - totalOutQty);

  const getOption = () => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['采购入库量', '领用出库量'] },
    xAxis: {
      type: 'category',
      data: safeData.map((d) => d.month),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '采购入库量',
        type: 'bar',
        itemStyle: { color: '#1677FF' },
        data: safeData.map((d) => Number(d.inQuantity) || 0),
      },
      {
        name: '领用出库量',
        type: 'bar',
        itemStyle: { color: '#FA8C16' },
        data: safeData.map((d) => Number(d.outQuantity) || 0),
      },
    ],
  });

  const tableData = useMemo(() => {
    let acc = 0;
    return safeData.map((d) => {
      acc += (Number(d.inQuantity) || 0) - (Number(d.outQuantity) || 0);
      return {
        ...d,
        inQuantity: Number(d.inQuantity) || 0,
        outQuantity: Number(d.outQuantity) || 0,
        balance: acc,
      };
    });
  }, [safeData]);

  return (
    <PageContainer header={{ title: '耗材库存月度变动台账' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={loading}>
            <Statistic
              title="本月累计采购入库"
              value={currentInQty}
              suffix="件/包"
              prefix={<ShoppingCartOutlined style={{ color: '#1677FF' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={loading}>
            <Statistic
              title="本月累计领用出库"
              value={currentOutQty}
              suffix="件/包"
              prefix={<ExportOutlined style={{ color: '#FA8C16' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={loading}>
            <Statistic
              title="本年期末结存（入库-出库）"
              value={totalBalance}
              suffix="件/包"
              prefix={<InboxOutlined style={{ color: '#52C41A' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="月度耗材出入库对比柱状图" bordered={false} style={{ borderRadius: 12 }}>
            {safeData.length > 0 ? (
              <ReactECharts option={getOption()} style={{ height: 350 }} />
            ) : (
              <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无月度出入库数据，请先创建出入库单
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="月度台账汇总数据" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              dataSource={tableData}
              rowKey="month"
              loading={loading}
              pagination={false}
              size="small"
              columns={[
                { title: '月份', dataIndex: 'month', width: 90 },
                { title: '入库总数', dataIndex: 'inQuantity', align: 'right' },
                { title: '出库总数', dataIndex: 'outQuantity', align: 'right' },
                { title: '月末结存', dataIndex: 'balance', align: 'right' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default StockMonthlyReportPage;
