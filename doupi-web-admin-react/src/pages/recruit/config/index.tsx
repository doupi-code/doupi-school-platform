import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Space,
  Switch,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { getRecruitConfig, saveRecruitConfig } from '@/api/recruit/config';

const RecruitConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const loadConfig = async () => {
    try {
      const res: any = await getRecruitConfig('time_slots');
      if (res && res.data) {
        form.setFieldsValue({
          slots: res.data || [
            { slotId: '1', name: '上午 09:00 - 11:30', maxQuota: 30 },
            { slotId: '2', name: '下午 14:00 - 16:30', maxQuota: 30 },
          ],
          openDaysAhead: 14,
          needAudit: false,
        });
      } else {
        form.setFieldsValue({
          slots: [
            { slotId: '1', name: '上午 09:00 - 11:30', maxQuota: 30 },
            { slotId: '2', name: '下午 14:00 - 16:30', maxQuota: 30 },
          ],
          openDaysAhead: 14,
          needAudit: false,
        });
      }
    } catch (e) {
      form.setFieldsValue({
        slots: [
          { slotId: '1', name: '上午 09:00 - 11:30', maxQuota: 30 },
          { slotId: '2', name: '下午 14:00 - 16:30', maxQuota: 30 },
        ],
        openDaysAhead: 14,
        needAudit: false,
      });
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      await saveRecruitConfig({
        configKey: 'time_slots',
        configValue: JSON.stringify(values.slots),
      });
      message.success('排班配置保存成功！');
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer header={{ title: '访校预约排班与限额设置' }}>
      <Card bordered={false} style={{ borderRadius: 12, maxWidth: 900 }}>
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="openDaysAhead"
                label="提前开放预约天数"
                tooltip="家长可预约未来多少天内的访校日"
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} addonAfter="天" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="needAudit"
                label="预约人工前置审核"
                valuePropName="checked"
                tooltip="开启后，家长提交需招办教师点击通过后才生成核销码"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="每日开放接待时段与限额 (Quota)">
            <Form.List name="slots">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 12 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '请输入时段名称' }]}
                      >
                        <Input placeholder="时段描述，如: 上午 09:00 - 11:30" style={{ width: 260 }} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'maxQuota']}
                        rules={[{ required: true, message: '限额' }]}
                      >
                        <InputNumber min={1} max={500} placeholder="单时段名额" addonAfter="人" />
                      </Form.Item>

                      <MinusCircleOutlined
                        style={{ color: '#ff4d4f', fontSize: 18 }}
                        onClick={() => remove(name)}
                      />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加接待时段
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              size="large"
            >
              保存配置生效
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default RecruitConfigPage;
