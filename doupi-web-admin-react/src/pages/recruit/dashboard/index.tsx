import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getRecruitDashboardStats } from '@/api/recruit/dashboard';

const RecruitDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    todayAppointment: 0,
    todayVerified: 0,
    totalAppointment: 0,
    conversionRate: '0.0%',
    dailyTrend: {
      dates: [],
      appointments: [],
      verified: [],
    },
    gradeDistribution: [],
  });

  const loadData = async () => {
    try {
      const res: any = await getRecruitDashboardStats();
      if (res && res.data) {
        const d = res.data;
        const totalAppointment = Number(d.totalCount || 0);
        const verifiedCount = Number(d.verifiedCount || 0);
        const pendingCount = Number(d.pendingCount || 0);

        // 意向年级分布
        const gradeDistribution = (d.gradeStats || []).map((item: any) => ({
          name: item.grade || item.name || '其他',
          value: Number(item.total || item.value || 0),
        }));

        // 日期趋势
        const rawDateStats = d.dateStats || [];
        const dates = rawDateStats.map((item: any) => item.visit_date || item.visitDate || item.date || '');
        const appointments = rawDateStats.map((item: any) => Number(item.total || 0));
        const verified = rawDateStats.map((item: any) => Number(item.verifiedTotal || 0));

        // 今日统计
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayStat = rawDateStats.find((item: any) => (item.visit_date || item.visitDate) === todayStr);
        const todayAppointment = todayStat ? Number(todayStat.total || 0) : pendingCount;
        const todayVerified = todayStat && todayStat.verifiedTotal !== undefined ? Number(todayStat.verifiedTotal) : verifiedCount;
        const conversionRate = totalAppointment > 0 ? ((verifiedCount / totalAppointment) * 100).toFixed(1) + '%' : '0.0%';

        setStats({
          todayAppointment,
          todayVerified,
          totalAppointment,
          conversionRate,
          dailyTrend: {
            dates,
            appointments,
            verified,
          },
          gradeDistribution: gradeDistribution.length > 0 ? gradeDistribution : [{ name: '暂无数据', value: 0 }],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  // 趋势折线图配置
  const getTrendOption = () => ({
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['新增预约', '现场核销'],
      top: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: stats.dailyTrend?.dates || [],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '新增预约',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#3088F4' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(48, 136, 244, 0.4)' },
              { offset: 1, color: 'rgba(48, 136, 244, 0.02)' },
            ],
          },
        },
        data: stats.dailyTrend?.appointments || [],
      },
      {
        name: '现场核销',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#2DC84D' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(45, 200, 77, 0.4)' },
              { offset: 1, color: 'rgba(45, 200, 77, 0.02)' },
            ],
          },
        },
        data: stats.dailyTrend?.verified || [],
      },
    ],
  });

  // 年级分布饼图配置
  const getPieOption = () => ({
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        name: '意向年级',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: stats.gradeDistribution || [],
      },
    ],
  });

  return (
    <PageContainer header={{ title: '招生运营全景看板' }}>
      <Skeleton loading={loading} active>
        {/* KPI 核心指标卡 */}
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(135deg, #E6F4FF 0%, #BAE0FF 100%)',
                borderRadius: 12,
              }}
            >
              <Statistic
                title={<span style={{ color: '#0958D9', fontWeight: 500 }}>今日预约 (人)</span>}
                value={stats.todayAppointment}
                prefix={<CalendarOutlined style={{ color: '#1677FF' }} />}
                valueStyle={{ color: '#003EB3', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(135deg, #F6FFED 0%, #D9F7BE 100%)',
                borderRadius: 12,
              }}
            >
              <Statistic
                title={<span style={{ color: '#237804', fontWeight: 500 }}>今日现场核销</span>}
                value={stats.todayVerified}
                prefix={<CheckCircleOutlined style={{ color: '#52C41A' }} />}
                valueStyle={{ color: '#135200', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%)',
                borderRadius: 12,
              }}
            >
              <Statistic
                title={<span style={{ color: '#D46B08', fontWeight: 500 }}>累计预约总数</span>}
                value={stats.totalAppointment}
                prefix={<TeamOutlined style={{ color: '#FA8C16' }} />}
                valueStyle={{ color: '#873800', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(135deg, #F9F0FF 0%, #EFDBFF 100%)',
                borderRadius: 12,
              }}
            >
              <Statistic
                title={<span style={{ color: '#531DAB', fontWeight: 500 }}>到校核销转化率</span>}
                value={stats.conversionRate}
                prefix={<RiseOutlined style={{ color: '#722ED1' }} />}
                valueStyle={{ color: '#391085', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表展示区 */}
        <Row gutter={16} style={{ marginTop: 20 }}>
          <Col xs={24} lg={15}>
            <Card title="近7日预约与现场到校核销趋势" bordered={false} style={{ borderRadius: 12 }}>
              <ReactECharts option={getTrendOption()} style={{ height: 350 }} />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card title="访校生源意向年级分布" bordered={false} style={{ borderRadius: 12 }}>
              <ReactECharts option={getPieOption()} style={{ height: 350 }} />
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </PageContainer>
  );
};

export default RecruitDashboard;
