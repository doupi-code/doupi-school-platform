import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CampusChartProps {
  data?: Array<{ name: string; value: number }>;
}

export const CampusChart: React.FC<CampusChartProps> = ({ data = [] }) => {
  const chartData = (data && data.length > 0)
    ? data
    : [{ name: '暂无生源分布数据', value: 0 }];

  const colors = ['#00F0FF', '#52C41A', '#FAAD14', '#722ED1', '#1890FF', '#F5222D'];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#88A0B9' },
    },
    series: [
      {
        name: '意向学段分布',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0b132b',
          borderWidth: 2,
        },
        label: { show: false },
        data: chartData.map((item, idx) => ({
          ...item,
          itemStyle: { color: colors[idx % colors.length] },
        })),
      },
    ],
  };

  return (
    <div className="screen-card" style={{ height: 280, padding: 12 }}>
      <div className="screen-card-title">生源学部与年级分布</div>
      <ReactECharts option={option} style={{ height: 220 }} />
    </div>
  );
};

