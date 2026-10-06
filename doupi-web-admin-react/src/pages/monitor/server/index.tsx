import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Descriptions, Progress, Row, Spin, Table, Tag } from 'antd';
import { getServerInfo } from '@/api/monitor/server';

const ServerMonitorPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [server, setServer] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await getServerInfo();
      if (res && res.data) {
        setServer(res.data);
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

  return (
    <PageContainer header={{ title: '服务监控' }}>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="CPU 监控" bordered={false}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="核心数">{server?.cpu?.cpuNum || 4} 核</Descriptions.Item>
                <Descriptions.Item label="用户使用率">{server?.cpu?.used || 0}%</Descriptions.Item>
                <Descriptions.Item label="系统使用率">{server?.cpu?.sys || 0}%</Descriptions.Item>
                <Descriptions.Item label="当前空闲率">{server?.cpu?.free || 100}%</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="内存监控" bordered={false}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="总内存">{server?.mem?.total || 0} GB</Descriptions.Item>
                <Descriptions.Item label="已用内存">{server?.mem?.used || 0} GB</Descriptions.Item>
                <Descriptions.Item label="剩余内存">{server?.mem?.free || 0} GB</Descriptions.Item>
                <Descriptions.Item label="使用率">
                  <Progress percent={server?.mem?.usage || 0} size="small" status={(server?.mem?.usage || 0) > 85 ? 'exception' : 'active'} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="服务器与运行环境信息" bordered={false}>
              <Descriptions column={{ xs: 1, sm: 2, md: 4 }} bordered size="small">
                <Descriptions.Item label="服务器名称">{server?.sys?.computerName || 'localhost'}</Descriptions.Item>
                <Descriptions.Item label="操作系统">{server?.sys?.osName || 'Linux'}</Descriptions.Item>
                <Descriptions.Item label="服务器 IP">{server?.sys?.computerIp || '127.0.0.1'}</Descriptions.Item>
                <Descriptions.Item label="系统架构">{server?.sys?.osArch || 'amd64'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="Java 虚拟机 (JVM) 信息" bordered={false}>
              <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
                <Descriptions.Item label="Java 名称">{server?.jvm?.name || 'OpenJDK 64-Bit Server VM'}</Descriptions.Item>
                <Descriptions.Item label="Java 版本">{server?.jvm?.version || '17.0.x'}</Descriptions.Item>
                <Descriptions.Item label="启动时间">{server?.jvm?.startTime || '-'}</Descriptions.Item>
                <Descriptions.Item label="JVM 总内存">{server?.jvm?.total || 0} MB</Descriptions.Item>
                <Descriptions.Item label="JVM 最大内存">{server?.jvm?.max || 0} MB</Descriptions.Item>
                <Descriptions.Item label="JVM 空闲内存">{server?.jvm?.free || 0} MB</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="磁盘状态监控" bordered={false}>
              <Table
                dataSource={server?.sysFiles || []}
                rowKey="dirName"
                pagination={false}
                size="small"
                columns={[
                  { title: '盘符路径', dataIndex: 'dirName' },
                  { title: '文件系统', dataIndex: 'sysTypeName' },
                  { title: '总大小', dataIndex: 'total' },
                  { title: '可用大小', dataIndex: 'free' },
                  { title: '已用大小', dataIndex: 'used' },
                  {
                    title: '资源使用率',
                    dataIndex: 'usage',
                    render: (val: number) => (
                      <Tag color={val > 80 ? 'error' : 'success'}>{val}%</Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default ServerMonitorPage;
