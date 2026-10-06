import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useUserStore } from '../../store/useUserStore';
import { getCaptchaImage } from '../../api/login';
import './index.css';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [uuid, setUuid] = useState('');

  const getCaptcha = async () => {
    try {
      const res: any = await getCaptchaImage();
      if (res && res.code === 200) {
        setCaptchaUrl('data:image/gif;base64,' + res.img);
        setUuid(res.uuid);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCaptcha();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await login({ ...values, uuid });
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      getCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container flex h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center bg-blue-500 hidden md:flex">
        <div className="text-white text-center">
          <h1 className="text-5xl font-bold mb-4">豆皮校园管理平台</h1>
          <p className="text-xl">智慧校园，一站式管理</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">欢迎登录</h2>
          <Form form={form} name="login" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <div className="flex gap-4">
                <Input placeholder="验证码" className="flex-1" />
                <div className="w-28 h-10 cursor-pointer" onClick={getCaptcha}>
                  {captchaUrl && <img src={captchaUrl} alt="验证码" className="w-full h-full" />}
                </div>
              </div>
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>记住密码</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
