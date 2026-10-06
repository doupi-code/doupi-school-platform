import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Descriptions, Row, Skeleton, Statistic, Empty } from 'antd';
import { DatabaseOutlined, FireOutlined, ClockCircleOutlined, HddOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getCache } from '@/api/monitor/cache';

const CachePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cacheData, setCacheData] = useState<{
    info?: Record<string, any>;
    dbSize?: number;
    commandStats?: Array<{ name: string; value: string | number }>;
  }>({});

  const loadData = async () => {
    try {
      const res: any = await getCache();
      if (res && res.data) {
        setCacheData({
          info: res.data.info || {},
          dbSize: res.data.dbSize ?? 0,
          commandStats: res.data.commandStats || [],
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

  const info = cacheData.info || {};
  const dbSize = cacheData.dbSize ?? 0;
  const commandStats = cacheData.commandStats || [];

  // 命令统计饼图配置
  const getPieOption = () => {
    if (!commandStats || commandStats.length === 0) {
      return {
        title: { text: '暂无命令统计数据', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 14 } },
      };
    }
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)',
      },
      series: [
        {
          name: '命令统计',
          type: 'pie',
          radius: [15, 95],
          center: ['50%', '50%'],
          roseType: 'radius',
          data: commandStats.map((item) => ({
            name: item.name,
            value: Number(item.value) || 0,
          })),
          animationEasing: 'cubicInOut',
          animationDuration: 1000,
        },
      ],
    };
  };

  // 内存仪表盘配置
  const getGaugeOption = () => {
    const usedMemoryMb = info.used_memory ? (Number(info.used_memory) / (1024 * 1024)).toFixed(2) : '0';
    return {
      tooltip: {
        formatter: '{b} : {c} MB',
      },
      series: [
        {
          name: '峰值内存',
          type: 'gauge',
          min: 0,
          max: 100,
          detail: {
            formatter: `${usedMemoryMb} MB`,
            fontSize: 18,
          },
          data: [
            {
              value: parseFloat(usedMemoryMb),
              name: '内存消耗',
            },
          ],
        },
      ],
    };
  };

  return (
    <PageContainer header={{ title: 'Redis 缓存性能监控' }}>
      <Skeleton loading={loading} active>
        {/* 顶部四大 KPI 指标 */}
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Statistic
                title="Redis 服务版本"
                value={info.redis_version || '-'}
                prefix={<DatabaseOutlined style={{ color: '#1677FF' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Statistic
                title="已分配内存占用"
                value={info.used_memory_human || '-'}
                prefix={<FireOutlined style={{ color: '#FF4D4F' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Statistic
                title="当前连接客户端数"
                value={info.connected_clients ?? 0}
                suffix="个"
                prefix={<DatabaseOutlined style={{ color: '#52C41A' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Statistic
                title="缓存键总数 (Key)"
                value={dbSize}
                suffix="个"
                prefix={<HddOutlined style={{ color: '#722ED1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* 基本信息表格 (12项属性对齐原版 Vue) */}
        <Card title="Redis 运行基本信息" bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
          <Descriptions bordered size="small" column={{ xxl: 4, xl: 4, lg: 3, md: 2, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Redis版本">{info.redis_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="运行模式">{info.redis_mode === 'standalone' ? '单机' : (info.redis_mode || '单机')}</Descriptions.Item>
            <Descriptions.Item label="TCP 端口">{info.tcp_port || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户端数">{info.connected_clients ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="运行时间(天)">{info.uptime_in_days ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="使用内存">{info.used_memory_human || '-'}</Descriptions.Item>
            <Descriptions.Item label="使用CPU">
              {info.used_cpu_user_children !== undefined ? `${parseFloat(info.used_cpu_user_children).toFixed(2)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="内存配置">{info.maxmemory_human || '无限制'}</Descriptions.Item>
            <Descriptions.Item label="AOF是否开启">{info.aof_enabled === '0' ? '否' : (info.aof_enabled === '1' ? '是' : '-')}</Descriptions.Item>
            <Descriptions.Item label="RDB是否成功">{info.rdb_last_bgsave_status || '-'}</Descriptions.Item>
            <Descriptions.Item label="Key 数量">{dbSize}</Descriptions.Item>
            <Descriptions.Item label="网络入口/出口">
              {info.instantaneous_input_kbps !== undefined
                ? `${info.instantaneous_input_kbps} kbps / ${info.instantaneous_output_kbps} kbps`
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 下方图表区 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="命令统计分布" bordered={false} style={{ borderRadius: 12 }}>
              <ReactECharts option={getPieOption()} style={{ height: 360 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="内存消耗仪表盘" bordered={false} style={{ borderRadius: 12 }}>
              <ReactECharts option={getGaugeOption()} style={{ height: 360 }} />
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </PageContainer>
  );
};

export default CachePage;
