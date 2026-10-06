import { useState } from 'react';
import { Form, Input, Select, DatePicker, Button, message, Result } from 'antd';
import SectionTitle from '@/components/SectionTitle';
import { createAppointment } from '@/api/appointment';
import dayjs from 'dayjs';

const { Option } = Select;

export default function Appointment() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        parentName: values.parentName,
        parentPhone: values.phone,
        studentName: values.studentName,
        studentGender: values.gender === 'female' ? '女' : '男',
        studentGrade: values.grade,
        currentSchool: values.currentSchool,
        campusId: values.campus,
        campusName: values.campus === 'east' ? '东校区' : '主校区',
        visitDate: values.date.format('YYYY-MM-DD'),
        timeSlot: values.timeSlot === 'afternoon' ? '下午 14:00 - 17:00' : '上午 09:00 - 11:30',
        remark: values.remark || '',
      };
      
      const res: any = await createAppointment(data);
      const code = res?.checkInCode || res?.verificationCode || res?.appointmentNo || ('DP' + Math.floor(100000 + Math.random() * 900000));
      setSuccessCode(code);
      message.success('预约申请提交成功！');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (successCode) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Result
          status="success"
          title="预约申请提交成功！"
          subTitle={
            <div className="mt-4">
              <p className="text-lg text-gray-600">您的核销码是：</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{successCode}</p>
              <p className="mt-4 text-sm text-gray-500">请妥善保存此核销码，到校参观时出示。</p>
            </div>
          }
          extra={[
            <Button type="primary" key="query" href="/query">去查询</Button>,
            <Button key="home" href="/">返回首页</Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SectionTitle title="在线预约" subtitle="填写信息，预约来校参观" />
      
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ gender: 'male' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Form.Item name="parentName" label="家长姓名" rules={[{ required: true, message: '请输入家长姓名' }]}>
              <Input placeholder="请输入家长姓名" />
            </Form.Item>
            
            <Form.Item name="phone" label="手机号" rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}>
              <Input placeholder="请输入手机号" />
            </Form.Item>

            <Form.Item name="studentName" label="学生姓名" rules={[{ required: true, message: '请输入学生姓名' }]}>
              <Input placeholder="请输入学生姓名" />
            </Form.Item>

            <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
              <Select>
                <Option value="male">男</Option>
                <Option value="female">女</Option>
              </Select>
            </Form.Item>

            <Form.Item name="grade" label="意向年级" rules={[{ required: true, message: '请选择意向年级' }]}>
              <Select placeholder="请选择意向年级">
                <Option value="高一">高一</Option>
                <Option value="高二">高二</Option>
                <Option value="高三">高三</Option>
              </Select>
            </Form.Item>

            <Form.Item name="currentSchool" label="现就读学校" rules={[{ required: true, message: '请输入现就读学校' }]}>
              <Input placeholder="请输入现就读学校" />
            </Form.Item>

            <Form.Item name="campus" label="选择校区" rules={[{ required: true, message: '请选择校区' }]}>
              <Select placeholder="请选择校区">
                <Option value="main">主校区</Option>
                <Option value="east">东校区</Option>
              </Select>
            </Form.Item>

            <Form.Item name="date" label="预约日期" rules={[{ required: true, message: '请选择预约日期' }]}>
              <DatePicker className="w-full" disabledDate={(current) => current && current < dayjs().startOf('day')} />
            </Form.Item>

            <Form.Item name="timeSlot" label="预约时段" rules={[{ required: true, message: '请选择预约时段' }]}>
              <Select placeholder="请选择时段">
                <Option value="morning">上午 (09:00 - 11:30)</Option>
                <Option value="afternoon">下午 (14:00 - 17:00)</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="remark" label="备注留言">
            <Input.TextArea rows={4} placeholder="如有其他需求或疑问，请在此留言" />
          </Form.Item>

          <Form.Item className="mt-8 text-center">
            <Button type="primary" htmlType="submit" size="large" loading={loading} className="w-full md:w-64">
              提交预约
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
