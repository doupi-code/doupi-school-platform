import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Result, Button } from 'antd';
import { FormOutlined, BuildOutlined } from '@ant-design/icons';

const FormBuildPage: React.FC = () => {
  return (
    <PageContainer header={{ title: '表单构建器' }}>
      <Card bordered={false}>
        <Result
          icon={<BuildOutlined style={{ color: '#1677FF' }} />}
          title="Ant Design 可视化表单与组件构建中心"
          subTitle="系统已集成 Ant Design ProSchema 与 ProForm 动态表单体系，可通过 JSON Schema 快速定义与生成前端业务表单。"
          extra={[
            <Button type="primary" key="docs" icon={<FormOutlined />} onClick={() => window.open('https://procomponents.ant.design/components/form', '_blank')}>
              查看 Ant Design ProForm 表单构建文档
            </Button>,
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default FormBuildPage;
