import { Col, Form, Input, Row, Typography } from 'antd';

const urlRules = [
  { required: true, message: '请输入备案查询链接' },
  { type: 'url' as const, message: '请输入有效的完整链接' },
  { pattern: /^https?:\/\//i, message: '链接须以 http:// 或 https:// 开头' },
];

export default function FilingFields() {
  return (
    <>
      <Typography.Title level={5}>网站备案信息</Typography.Title>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="icp" label="工信部 ICP 备案号" rules={[{ required: true, whitespace: true, message: '请输入 ICP 备案号' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="policeBeian" label="公安联网备案号" rules={[{ required: true, whitespace: true, message: '请输入公安联网备案号' }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="icpUrl" label="工信部 ICP 备案查询链接" rules={urlRules}>
        <Input placeholder="https://beian.miit.gov.cn/" />
      </Form.Item>
      <Form.Item name="policeBeianUrl" label="公安联网备案查询链接" rules={urlRules}>
        <Input placeholder="https://beian.mps.gov.cn/#/query/webSearch?code=备案号码" />
      </Form.Item>
    </>
  );
}
