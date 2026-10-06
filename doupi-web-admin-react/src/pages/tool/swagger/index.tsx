import React from 'react';
import { PageContainer } from '@ant-design/pro-components';

const SwaggerDocPage: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const swaggerUrl = `${apiBase}/swagger-ui/index.html`;

  return (
    <PageContainer header={{ title: '系统接口文档 (Swagger)' }}>
      <div style={{ width: '100%', height: 'calc(100vh - 180px)', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <iframe
          src={swaggerUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Swagger UI"
        />
      </div>
    </PageContainer>
  );
};

export default SwaggerDocPage;
