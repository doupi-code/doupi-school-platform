import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { ShoppingCartOutlined, ExportOutlined, InboxOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getStockMonthlyReport } from '@/api/stock/report';

const StockMonthlyReportPage: React.FC = () => {
  const [data, setData] = useState<any[]>([
    { month: '2026-05', inCount: 320, outCount: 280, balance: 140 },
    { month: '2026-06', inCount: 450, outCount: 410, balance: 180 },
    { month: '2026-07', inCount: 200, outCount: 150, balance: 230 },
    { month: '2026-08', inCount: 600, outCount: 520, balance: 310 },
    { month: '2026-09', inCount: 500, outCount: 460, balance: 350 },
  ]);

  const loadData = async () => {
    try {
      const res: any = await getStockMonthlyReport();
      if (res && res.data && Array.isArray(res.data)) {
        setData(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const safeData = Array.isArray(data) ? data : [];

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
        data: data.map((d) => d.inCount),
      },
      {
        name: '领用出库量',
        type: 'bar',
        itemStyle: { color: '#FA8C16' },
        data: data.map((d) => d.outCount),
      },
    ],
  });

  return (
    <PageContainer header={{ title: '耗材库存月度变动台账' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="本月累计采购入库"
              value={500}
              suffix="件/包"
              prefix={<ShoppingCartOutlined style={{ color: '#1677FF' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="本月累计领用出库"
              value={460}
              suffix="件/包"
              prefix={<ExportOutlined style={{ color: '#FA8C16' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="当前仓库总结存"
              value={350}
              suffix="件/包"
              prefix={<InboxOutlined style={{ color: '#52C41A' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="近5个月耗材出入库对比柱状图" bordered={false} style={{ borderRadius: 12 }}>
            <ReactECharts option={getOption()} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="月度台账汇总数据" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              dataSource={data}
              rowKey="month"
              pagination={false}
              columns={[
                { title: '月份', dataIndex: 'month' },
                { title: '入库总数', dataIndex: 'inCount' },
                { title: '出库总数', dataIndex: 'outCount' },
                { title: '月末结存', dataIndex: 'balance' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default StockMonthlyReportPage;
