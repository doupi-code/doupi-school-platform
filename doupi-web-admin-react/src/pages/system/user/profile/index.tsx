import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Col,
  Row,
  Tabs,
  Form,
  Input,
  Radio,
  Button,
  Upload,
  message,
  Descriptions,
  Tag,
  Space,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ClusterOutlined,
  TeamOutlined,
  CalendarOutlined,
  LockOutlined,
  CameraOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { getUserProfile, updateUserProfile, updateUserPwd, uploadAvatar } from '@/api/system/user';
import useUserStore from '@/store/useUserStore';

const UserProfilePage: React.FC = () => {
  const { setAvatar, setName } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>({});
  const [roleGroup, setRoleGroup] = useState<string>('');
  const [postGroup, setPostGroup] = useState<string>('');

  const [infoForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // 加载个人信息
  const loadProfile = async () => {
    setLoading(true);
    try {
      const res: any = await getUserProfile();
      if (res && res.data) {
        setUser(res.data);
        setRoleGroup(res.roleGroup || '普通用户');
        setPostGroup(res.postGroup || '无');
        infoForm.setFieldsValue({
          nickName: res.data.nickName,
          phonenumber: res.data.phonenumber,
          email: res.data.email,
          sex: res.data.sex || '0',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // 保存基本资料
  const handleSaveInfo = async () => {
    try {
      const values = await infoForm.validateFields();
      setInfoSubmitting(true);
      // 昵称由管理员维护，个人中心不提交昵称字段
      await updateUserProfile({
        phonenumber: values.phonenumber,
        email: values.email,
        sex: values.sex,
      });
      message.success('基本资料修改成功');
      loadProfile();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setInfoSubmitting(false);
    }
  };

  // 修改密码
  const handleSavePwd = async () => {
    try {
      const values = await pwdForm.validateFields();
      setPwdSubmitting(true);
      await updateUserPwd(values.oldPassword, values.newPassword);
      message.success('登录密码修改成功，请妥善保管新密码');
      pwdForm.resetFields();
    } catch (e: any) {
      message.error(e?.message || '修改密码失败');
    } finally {
      setPwdSubmitting(false);
    }
  };

  // 上传头像
  const handleUploadAvatar = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('头像图片大小不能超过 2MB！');
      return false;
    }

    const formData = new FormData();
    formData.append('avatarfile', file);
    try {
      message.loading({ content: '正在上传头像...', key: 'uploadAvatar' });
      const res: any = await uploadAvatar(formData);
      if (res && res.imgUrl) {
        const fullUrl = res.imgUrl.startsWith('http') ? res.imgUrl : `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_BASE_API || ''}${res.imgUrl}`;
        setAvatar(fullUrl);
        setUser((prev: any) => ({ ...prev, avatar: fullUrl }));
        message.success({ content: '头像上传成功', key: 'uploadAvatar' });
      } else {
        message.success({ content: '头像上传成功', key: 'uploadAvatar' });
        loadProfile();
      }
    } catch (e: any) {
      message.error({ content: e?.message || '头像上传失败', key: 'uploadAvatar' });
    }
    return false; // 阻止默认上传动作
  };

  const currentAvatarUrl = user.avatar && user.avatar.trim() !== ''
    ? (user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_BASE_API || ''}${user.avatar}`)
    : '';

  return (
    <PageContainer header={{ title: '个人中心' }}>
      <Row gutter={24}>
        {/* 左侧个人信息概览 */}
        <Col xs={24} sm={24} md={8} lg={8} xl={7}>
          <Card
            title="个人信息"
            loading={loading}
            style={{ borderRadius: 8, marginBottom: 16 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {currentAvatarUrl ? (
                  <Avatar
                    size={100}
                    src={currentAvatarUrl}
                    style={{ border: '3px solid #1677FF', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                ) : (
                  <Avatar
                    size={100}
                    style={{
                      backgroundColor: '#1677FF',
                      fontSize: 36,
                      fontWeight: 600,
                      border: '3px solid #1677FF',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {(user.nickName || user.userName || '用').slice(0, 1)}
                  </Avatar>
                )}
                <Upload
                  showUploadList={false}
                  beforeUpload={handleUploadAvatar}
                  accept="image/*"
                >
                  <Button
                    type="primary"
                    shape="circle"
                    size="small"
                    icon={<CameraOutlined />}
                    title="点击更换头像"
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  />
                </Upload>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12, color: '#1f1f1f' }}>
                {user.nickName || user.userName || '用户'}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                @{user.userName || 'admin'}
              </div>
            </div>

            <Descriptions column={1} size="middle" bordered={false}>
              <Descriptions.Item label={<span><UserOutlined style={{ marginRight: 6 }} />登录账号</span>}>
                {user.userName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<span><PhoneOutlined style={{ marginRight: 6 }} />手机号码</span>}>
                {user.phonenumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<span><MailOutlined style={{ marginRight: 6 }} />用户邮箱</span>}>
                {user.email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<span><ClusterOutlined style={{ marginRight: 6 }} />所属部门</span>}>
                {user.dept?.deptName || '无'} {postGroup ? `(${postGroup})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label={<span><TeamOutlined style={{ marginRight: 6 }} />所属角色</span>}>
                <Space size={4} wrap>
                  {roleGroup ? (
                    roleGroup.split(',').map((r) => (
                      <Tag color="blue" key={r}>
                        {r.trim()}
                      </Tag>
                    ))
                  ) : (
                    '-'
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={<span><CalendarOutlined style={{ marginRight: 6 }} />创建日期</span>}>
                {user.createTime || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧基本资料与密码修改 */}
        <Col xs={24} sm={24} md={16} lg={16} xl={17}>
          <Card style={{ borderRadius: 8 }}>
            <Tabs
              defaultActiveKey="userInfo"
              items={[
                {
                  key: 'userInfo',
                  label: '基本资料',
                  children: (
                    <Form
                      form={infoForm}
                      layout="vertical"
                      style={{ maxWidth: 520, marginTop: 8 }}
                    >
                      <Form.Item
                        name="nickName"
                        label="用户昵称"
                        extra="昵称由系统管理员统一维护，个人中心不可自行修改"
                      >
                        <Input maxLength={30} disabled placeholder="昵称由管理员维护" />
                      </Form.Item>

                      <Form.Item
                        name="phonenumber"
                        label="手机号码"
                        rules={[
                          { required: true, message: '手机号码不能为空' },
                          { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号码' },
                        ]}
                      >
                        <Input maxLength={11} placeholder="请输入手机号码" />
                      </Form.Item>

                      <Form.Item
                        name="email"
                        label="邮箱地址"
                        rules={[
                          { required: true, message: '邮箱地址不能为空' },
                          { type: 'email', message: '请输入有效的邮箱地址' },
                        ]}
                      >
                        <Input maxLength={50} placeholder="请输入邮箱地址" />
                      </Form.Item>

                      <Form.Item name="sex" label="性别">
                        <Radio.Group>
                          <Radio value="0">男</Radio>
                          <Radio value="1">女</Radio>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item style={{ marginTop: 24 }}>
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={infoSubmitting}
                          onClick={handleSaveInfo}
                        >
                          保存更改
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'resetPwd',
                  label: '修改密码',
                  children: (
                    <Form
                      form={pwdForm}
                      layout="vertical"
                      style={{ maxWidth: 520, marginTop: 8 }}
                    >
                      <Form.Item
                        name="oldPassword"
                        label="旧密码"
                        rules={[{ required: true, message: '请输入当前旧密码' }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          placeholder="请输入当前登录密码"
                        />
                      </Form.Item>

                      <Form.Item
                        name="newPassword"
                        label="新密码"
                        rules={[
                          { required: true, message: '请输入新密码' },
                          { min: 6, max: 20, message: '密码长度必须介于 6 和 20 之间' },
                          {
                            pattern: /^[^<>"'|\\]+$/,
                            message: "不能包含非法字符：< > \" ' \\ |",
                          },
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          placeholder="请输入新登录密码"
                        />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
                        label="确认新密码"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: '请确认新密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('两次输入的新密码不一致'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                          placeholder="请再次确认新登录密码"
                        />
                      </Form.Item>

                      <Form.Item style={{ marginTop: 24 }}>
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={pwdSubmitting}
                          onClick={handleSavePwd}
                        >
                          确认修改密码
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default UserProfilePage;
