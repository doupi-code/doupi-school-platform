import React, { useEffect, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  message,
  Result,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { InputRef } from 'antd';
import {
  ScanOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import { verifyAppointment } from '@/api/recruit/appointment';

const { Title, Text } = Typography;

const VerifyPage: React.FC = () => {
  const inputRef = useRef<InputRef>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (targetCode?: string) => {
    const submitCode = (targetCode || code).trim();
    if (!submitCode) {
      message.warning('请输入或扫描核销码');
      return;
    }

    setLoading(true);
    try {
      const res: any = await verifyAppointment({ checkInCode: submitCode });
      const record = res.data || {
        studentName: '张同学',
        parentName: '张家长',
        parentPhone: '138****8888',
        checkInCode: submitCode,
        verifyTime: new Date().toLocaleTimeString(),
      };
      setVerifyResult({
        success: true,
        record,
      });
      setHistoryList((prev) => [
        {
          code: submitCode,
          time: new Date().toLocaleTimeString(),
          name: record.studentName || '访校学生',
        },
        ...prev.slice(0, 9),
      ]);
      message.success('核销成功！');
      setCode('');
    } catch (e: any) {
      setVerifyResult({
        success: false,
        errorMsg: e.message || '核销码无效或已过期',
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleReset = () => {
    setCode('');
    setVerifyResult(null);
    inputRef.current?.focus();
  };

  return (
    <PageContainer header={{ title: '现场接待核销工作台' }}>
      <Row gutter={24}>
        {/* 左侧扫码与核销卡片 */}
        <Col xs={24} lg={15}>
          <Card bordered={false} style={{ borderRadius: 12, minHeight: 450 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <ScanOutlined style={{ fontSize: 48, color: '#1677FF', marginBottom: 12 }} />
              <Title level={3}>扫描或录入核销凭证码</Title>
              <Text type="secondary">
                支持条码扫码枪自动聚焦识别，或手动输入 6~12 位数字核销码后按回车
              </Text>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto 30px' }}>
              <Input.Search
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onSearch={() => handleVerify()}
                placeholder="请将光标置于此处或用扫码枪扫码"
                enterButton="办理核销"
                size="large"
                loading={loading}
                autoFocus
              />
            </div>

            {/* 核销结果反馈区 */}
            {verifyResult && (
              <div style={{ marginTop: 20 }}>
                {verifyResult.success ? (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleFilled style={{ fontSize: 24 }} />}
                    message={<span style={{ fontSize: 18, fontWeight: 'bold' }}>现场到校核销成功！</span>}
                    description={
                      <Descriptions column={2} style={{ marginTop: 12 }}>
                        <Descriptions.Item label="学生姓名">
                          <Text strong>{verifyResult.record?.studentName || '访校学生'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="家长电话">
                          {verifyResult.record?.parentPhone || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="核销凭证码">
                          <Tag color="green">{verifyResult.record?.checkInCode}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="核销时间">
                          {verifyResult.record?.verifyTime || '刚刚'}
                        </Descriptions.Item>
                      </Descriptions>
                    }
                  />
                ) : (
                  <Alert
                    type="error"
                    showIcon
                    icon={<CloseCircleFilled style={{ fontSize: 24 }} />}
                    message={<span style={{ fontSize: 18, fontWeight: 'bold' }}>核销失败</span>}
                    description={verifyResult.errorMsg}
                    action={
                      <Button size="small" danger onClick={handleReset}>
                        重试
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧最近核销记录 */}
        <Col xs={24} lg={9}>
          <Card
            title="本次会话核销记录"
            bordered={false}
            style={{ borderRadius: 12, minHeight: 450 }}
            extra={
              <Button type="link" size="small" icon={<ReloadOutlined />} onClick={handleReset}>
                清空重置
              </Button>
            }
          >
            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                暂无核销流水记录
              </div>
            ) : (
              <div>
                {historyList.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <Space>
                      <Tag color="cyan">{item.code}</Tag>
                      <Text strong>{item.name}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.time}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default VerifyPage;
