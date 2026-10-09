import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tree,
  TreeSelect,
  Table,
} from 'antd';

import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listUser,
  getUser,
  addUser,
  updateUser,
  delUser,
  resetUserPwd,
  changeUserStatus,
  deptTreeSelect,
  getAuthRole,
  updateAuthRole,
} from '@/api/system/user';
import { download } from '@/api/request';
import { listClass } from '@/api/edu/class';

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [deptTreeData, setDeptTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState<any>();
  const [deptSearchVal, setDeptSearchVal] = useState('');
  const [classList, setClassList] = useState<any[]>([]);

  // 递归获取所有部门 key
  const getAllDeptKeys = (data: any[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach((item) => {
      if (item.id !== undefined && item.id !== null) {
        keys.push(item.id);
      }
      if (item.children && item.children.length > 0) {
        keys = keys.concat(getAllDeptKeys(item.children));
      }
    });
    return keys;
  };

  // 根据搜索关键字获取需要展开的节点 keys
  const getSearchExpandedKeys = (data: any[], searchValue: string): React.Key[] => {
    const keys: React.Key[] = [];
    const traverse = (nodes: any[]): boolean => {
      let anyMatch = false;
      for (const node of nodes) {
        const title = String(node.label || '');
        const isMatch = title.toLowerCase().includes(searchValue.toLowerCase());
        let childMatch = false;
        if (node.children && node.children.length > 0) {
          childMatch = traverse(node.children);
        }
        if (isMatch || childMatch) {
          keys.push(node.id);
          anyMatch = true;
        }
      }
      return anyMatch;
    };
    traverse(data);
    return keys;
  };

  // 部门搜索
  const handleDeptSearch = (val: string) => {
    setDeptSearchVal(val);
    if (!val || !val.trim()) {
      setExpandedKeys(getAllDeptKeys(deptTreeData));
      setAutoExpandParent(false);
    } else {
      const matchedKeys = getSearchExpandedKeys(deptTreeData, val.trim());
      setExpandedKeys(matchedKeys);
      setAutoExpandParent(true);
    }
  };

  // 部门树节点标题渲染（支持搜索关键字高亮）
  const renderTreeTitle = (nodeData: any) => {
    const title = String(nodeData.label || '');
    if (!deptSearchVal || !deptSearchVal.trim()) {
      return <span>{title}</span>;
    }
    const searchLower = deptSearchVal.trim().toLowerCase();
    const titleLower = title.toLowerCase();
    const index = titleLower.indexOf(searchLower);
    if (index === -1) {
      return <span>{title}</span>;
    }
    const beforeStr = title.substring(0, index);
    const matchStr = title.substring(index, index + deptSearchVal.trim().length);
    const afterStr = title.substring(index + deptSearchVal.trim().length);
    return (
      <span>
        {beforeStr}
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{matchStr}</span>
        {afterStr}
      </span>
    );
  };

  // 弹窗表单状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增用户');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [roleOptions, setRoleOptions] = useState<any[]>([]);
  const [postOptions, setPostOptions] = useState<any[]>([]);

  // 重置密码弹窗状态
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [pwdForm] = Form.useForm();

  // 分配角色弹窗状态
  const [authRoleOpen, setAuthRoleOpen] = useState(false);
  const [authRoleLoading, setAuthRoleLoading] = useState(false);
  const [authRoleUser, setAuthRoleUser] = useState<any>(null);
  const [authRoleList, setAuthRoleList] = useState<any[]>([]);
  const [selectedRoleKeys, setSelectedRoleKeys] = useState<React.Key[]>([]);

  // 打开分配角色
  const handleOpenAuthRole = async (record: any) => {
    setAuthRoleUser(record);
    setAuthRoleOpen(true);
    setAuthRoleLoading(true);
    try {
      const res: any = await getAuthRole(record.userId);
      if (res && res.roles) {
        setAuthRoleList(res.roles);
        const checked = res.roles.filter((r: any) => r.flag).map((r: any) => r.roleId);
        setSelectedRoleKeys(checked);
      }
    } catch (e) {
      message.error('获取用户角色信息失败');
    } finally {
      setAuthRoleLoading(false);
    }
  };

  // 提交分配角色
  const handleSaveAuthRole = async () => {
    if (!authRoleUser) return;
    try {
      await updateAuthRole({
        userId: authRoleUser.userId,
        roleIds: selectedRoleKeys.join(','),
      });
      message.success('角色分配成功');
      setAuthRoleOpen(false);
      actionRef.current?.reload();
    } catch (e) {
      message.error('角色分配失败');
    }
  };

  // 导出用户数据
  const handleExport = () => {
    message.loading({ content: '正在导出用户数据...', key: 'exportUser' });
    download('/system/user/export', { deptId: selectedDeptId })
      .then(() => {
        message.success({ content: '导出成功', key: 'exportUser' });
      })
      .catch(() => {
        message.error({ content: '导出失败', key: 'exportUser' });
      });
  };

  // 加载左侧部门树
  const loadDeptTree = async () => {
    try {
      const res: any = await deptTreeSelect();
      if (res && res.data) {
        setDeptTreeData(res.data);
        setExpandedKeys(getAllDeptKeys(res.data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDeptTree();
    listClass({ pageSize: 100 })
      .then((res: any) => {
        if (res && res.rows) {
          setClassList(res.rows);
        }
      })
      .catch(() => {});
  }, []);

  // 新增
  const handleAdd = async () => {
    form.resetFields();
    setEditingUserId(null);
    setModalTitle('新增用户');
    form.setFieldsValue({ status: '0', sex: '0' });
    try {
      const res: any = await getUser();
      if (res && res.roles) {
        setRoleOptions(res.roles.map((r: any) => ({ label: r.roleName, value: r.roleId })));
      }
      if (res && res.posts) {
        setPostOptions(res.posts.map((p: any) => ({ label: p.postName, value: p.postId })));
      }
    } catch (e) {}
    setModalOpen(true);
  };

  // 编辑
  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingUserId(record.userId);
    setModalTitle('修改用户');
    try {
      const res: any = await getUser(record.userId);
      if (res && res.roles) {
        setRoleOptions(res.roles.map((r: any) => ({ label: r.roleName, value: r.roleId })));
      }
      if (res && res.posts) {
        setPostOptions(res.posts.map((p: any) => ({ label: p.postName, value: p.postId })));
      }
      if (res && res.data) {
        form.setFieldsValue({
          ...res.data,
          roleIds: res.roleIds || [],
          postIds: res.postIds || [],
          classIds: res.data.classIds || [],
        });
      }
    } catch (e) {}
    setModalOpen(true);
  };


  // 提交新增/修改
  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      if (editingUserId) {
        await updateUser({ ...values, userId: editingUserId });
        message.success('修改成功');
      } else {
        await addUser(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e) {}
  };

  // 重置密码
  const handleResetPwd = (record: any) => {
    pwdForm.resetFields();
    setPwdUserId(record.userId);
    setPwdModalOpen(true);
  };

  const handleSavePwd = async () => {
    try {
      const values = await pwdForm.validateFields();
      if (pwdUserId) {
        await resetUserPwd(pwdUserId, values.password);
        message.success('重置密码成功');
        setPwdModalOpen(false);
      }
    } catch (e) {}
  };

  // 删除
  const handleDelete = async (userId: number) => {
    await delUser(userId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  // 状态变更
  const handleStatusChange = async (checked: boolean, record: any) => {
    const status = checked ? '0' : '1';
    await changeUserStatus(record.userId, status);
    message.success('状态更新成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns[] = [
    {
      title: '用户编号',
      dataIndex: 'userId',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '登录名称',
      dataIndex: 'userName',
      copyable: true,
    },
    {
      title: '用户昵称',
      dataIndex: 'nickName',
    },
    {
      title: '部门',
      dataIndex: ['dept', 'deptName'],
      hideInSearch: true,
      render: (_, record) => record.dept?.deptName || '-',
    },
    {
      title: '角色身份',
      dataIndex: 'roles',
      hideInSearch: true,
      render: (_, record) => {
        const roles = record.roles || [];
        if (!roles || roles.length === 0) return '-';
        return (
          <Space size={4} wrap>
            {roles.map((r: any) => (
              <Tag key={r.roleId || r.roleName} color="blue">{r.roleName}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '任教/业务信息',
      hideInSearch: true,
      render: (_, record) => {
        if (!record.grade && !record.subject) return '-';
        return (
          <Space size={4}>
            {record.grade && <Tag color="green">{record.grade}</Tag>}
            {record.subject && <Tag color="orange">{record.subject}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '手机号码',
      dataIndex: 'phonenumber',
    },
    {
      title: '状态',
      dataIndex: 'status',

      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          onChange={(checked) => handleStatusChange(checked, record)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:user:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="auth" permission="system:user:edit">
            <Button
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleOpenAuthRole(record)}
            >
              分配角色
            </Button>
          </Authorized>
          <Authorized key="reset" permission="system:user:resetPwd">
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => handleResetPwd(record)}
            >
              重置密码
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:user:remove">
            <Popconfirm
              title="确认删除该用户吗？"
              onConfirm={() => handleDelete(record.userId)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Authorized>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '用户管理' }}>
      <Row gutter={16}>
        {/* 左侧部门树 */}
        <Col xs={24} sm={24} md={6} lg={5} xl={5}>
          <Card
            title="组织机构"
            size="small"
            extra={
              <Input.Search
                placeholder="搜索部门"
                allowClear
                size="small"
                value={deptSearchVal}
                onChange={(e) => handleDeptSearch(e.target.value)}
                onSearch={handleDeptSearch}
                style={{ width: 120 }}
              />
            }
          >
            <Tree
              treeData={deptTreeData}
              fieldNames={{ title: 'label', key: 'id', children: 'children' }}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={(keys) => {
                setExpandedKeys(keys);
                setAutoExpandParent(false);
              }}
              titleRender={renderTreeTitle}
              onSelect={(selectedKeys) => {
                setSelectedDeptId(selectedKeys[0]);
                actionRef.current?.reload();
              }}
            />
          </Card>
        </Col>

        {/* 右侧用户表格 */}
        <Col xs={24} sm={24} md={18} lg={19} xl={19}>
          <ProTable
            actionRef={actionRef}
            columns={columns}
            rowKey="userId"
            scroll={{ x: 'max-content' }}
            request={async (params) => {
          try {
            const res: any = await listUser({
                ...params,
                deptId: selectedDeptId,
                pageNum: params.current,
                pageSize: params.pageSize,
              });
              return {
                data: res.rows || [],
                total: res.total || 0,
                success: true,
              };
          } catch (error) {
            console.error('加载表格数据失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
            toolBarRender={() => [
              <Authorized key="add" permission="system:user:add">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  新增用户
                </Button>
              </Authorized>,
              <Authorized key="export" permission="system:user:export">
                <Button icon={<ExportOutlined />} onClick={handleExport}>
                  导出
                </Button>
              </Authorized>,
            ]}
          />
        </Col>
      </Row>

      {/* 新增/编辑用户弹窗 */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSaveUser}
        onCancel={() => setModalOpen(false)}
        width={650}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nickName"
                label="用户昵称"
                rules={[{ required: true, message: '请输入用户昵称' }]}
              >
                <Input placeholder="请输入用户昵称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deptId" label="归属部门">
                <TreeSelect
                  treeData={deptTreeData}
                  fieldNames={{ label: 'label', value: 'id', children: 'children' }}
                  placeholder="请选择归属部门"
                  allowClear
                  treeDefaultExpandAll
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userName"
                label="登录账号"
                rules={[{ required: true, message: '请输入登录账号' }]}
              >
                <Input
                  placeholder="请输入登录账号"
                  disabled={!!editingUserId}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {!editingUserId && (
                <Form.Item
                  name="password"
                  label="用户密码"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password placeholder="请输入初始密码" />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phonenumber" label="手机号码">
                <Input placeholder="请输入手机号码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleIds" label="角色">
                <Select
                  mode="multiple"
                  options={roleOptions}
                  placeholder="请选择角色"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="postIds" label="岗位">
                <Select
                  mode="multiple"
                  options={postOptions}
                  placeholder="请选择岗位"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sex" label="用户性别" initialValue="0">
                <Select
                  options={[
                    { label: '男', value: '0' },
                    { label: '女', value: '1' },
                    { label: '未知', value: '2' },
                  ]}
                  placeholder="请选择性别"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="用户状态" initialValue="0">
                <Radio.Group>
                  <Radio value="0">正常</Radio>
                  <Radio value="1">停用</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ fontWeight: 600, margin: '16px 0 12px', color: '#1677ff', borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
            <BookOutlined style={{ marginRight: 6 }} />教职员工教学信息（任课老师选填）
          </div>



          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="grade" label="任教年级">
                <Select
                  allowClear
                  placeholder="请选择任教年级"
                  options={[
                    { label: '高一', value: '高一' },
                    { label: '高二', value: '高二' },
                    { label: '高三', value: '高三' },
                    { label: '高三复读部', value: '复读部' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subject" label="任教科目">
                <Input placeholder="例如: 高中数学、高中物理" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="classIds" label="任教班级（支持跨班多选）">
                <Select
                  mode="multiple"
                  placeholder="请选择任教班级"
                  options={classList.map((c) => ({
                    label: `${c.className} ${c.grade ? `(${c.grade})` : ''}`,
                    value: c.classId,
                  }))}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="remark" label="备注说明">
                <Input.TextArea rows={2} placeholder="请输入备注信息" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>


      {/* 重置密码弹窗 */}
      <Modal
        title="重置密码"
        open={pwdModalOpen}
        onOk={handleSavePwd}
        onCancel={() => setPwdModalOpen(false)}
        destroyOnHidden
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配角色弹窗 */}
      <Modal
        title={authRoleUser ? `分配角色 - ${authRoleUser.nickName || ''} (${authRoleUser.userName})` : '分配角色'}
        open={authRoleOpen}
        onOk={handleSaveAuthRole}
        onCancel={() => setAuthRoleOpen(false)}
        width={650}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
          请勾选需要赋予该用户的角色权限（支持多选）：
        </div>
        <Table
          loading={authRoleLoading}
          dataSource={authRoleList}
          rowKey="roleId"
          size="small"
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedRoleKeys,
            onChange: (keys) => setSelectedRoleKeys(keys),
            getCheckboxProps: (record: any) => ({
              disabled: record.status !== '0',
            }),
          }}
          columns={[
            { title: '角色编号', dataIndex: 'roleId', width: 90 },
            { title: '角色名称', dataIndex: 'roleName' },
            { title: '权限字符', dataIndex: 'roleKey' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (val: string) => (val === '0' ? <Tag color="success">正常</Tag> : <Tag color="error">停用</Tag>),
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
};

export default UserPage;
