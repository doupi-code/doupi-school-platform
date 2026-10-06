import React from 'react';
import { PageContainer } from '@ant-design/pro-components';

const DruidMonitorPage: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const druidUrl = `${apiBase}/druid/index.html`;

  return (
    <PageContainer header={{ title: 'Druid 数据库连接池监控' }}>
      <div style={{ width: '100%', height: 'calc(100vh - 180px)', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <iframe
          src={druidUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Druid Monitor"
        />
      </div>
    </PageContainer>
  );
};

export default DruidMonitorPage;
