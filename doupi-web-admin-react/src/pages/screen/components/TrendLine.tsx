import React from 'react';
import ReactECharts from 'echarts-for-react';

interface TrendLineProps {
  dates?: string[];
  appointments?: number[];
  verified?: number[];
}

export const TrendLine: React.FC<TrendLineProps> = ({
  dates = [],
  appointments = [],
  verified = [],
}) => {

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 26, 54, 0.9)',
      borderColor: '#00F0FF',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['新增预约', '现场核销'],
      textStyle: { color: '#88A0B9' },
      top: 5,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '18%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: 'rgba(0, 240, 255, 0.3)' } },
      axisLabel: { color: '#88A0B9' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(0, 240, 255, 0.1)', type: 'dashed' } },
      axisLabel: { color: '#88A0B9' },
    },
    series: [
      {
        name: '新增预约',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#00F0FF' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 240, 255, 0.4)' },
              { offset: 1, color: 'rgba(0, 240, 255, 0.01)' },
            ],
          },
        },
        data: appointments,
      },
      {
        name: '现场核销',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#52C41A' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.4)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.01)' },
            ],
          },
        },
        data: verified,
      },
    ],
  };

  return (
    <div className="screen-card" style={{ height: 280, padding: 12 }}>
      <div className="screen-card-title">近7日预约访校与到校核销趋势</div>
      <ReactECharts option={option} style={{ height: 220 }} />
    </div>
  );
};
