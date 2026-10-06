import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Switch,
  Tree,
  Space,
  Drawer,
  Select,
  Tag,
  Checkbox,
  Table,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listRole,
  getRole,
  addRole,
  updateRole,
  delRole,
  changeRoleStatus,
  dataScope,
  deptTreeSelect,
  allocatedUserList,
  unallocatedUserList,
  authUserCancel,
  authUserCancelAll,
  authUserSelectAll,
} from '@/api/system/role';
import { treeselect, roleMenuTreeselect } from '@/api/system/menu';

const RolePage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增角色');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 菜单树数据与选中的菜单节点
  const [menuTreeData, setMenuTreeData] = useState<any[]>([]);
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<React.Key[]>([]);
  const [halfCheckedMenuKeys, setHalfCheckedMenuKeys] = useState<React.Key[]>([]);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 递归提取所有叶子节点（没有子节点的节点）
  const getLeafKeys = (nodes: any[]): React.Key[] => {
    let leaves: React.Key[] = [];
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node.id);
      } else {
        leaves = leaves.concat(getLeafKeys(node.children));
      }
    });
    return leaves;
  };

  // 递归提取所有节点 key
  const getAllKeys = (nodes: any[]): React.Key[] => {
    let keys: React.Key[] = [];
    nodes.forEach((node) => {
      keys.push(node.id);
      if (node.children && node.children.length > 0) {
        keys = keys.concat(getAllKeys(node.children));
      }
    });
    return keys;
  };

  const loadMenuTree = async () => {
    try {
      const res: any = await treeselect();
      if (res && res.data) {
        setMenuTreeData(res.data);
        return res.data;
      }
    } catch (e) {}
    return [];
  };

  useEffect(() => {
    loadMenuTree();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingRoleId(null);
    setCheckedMenuKeys([]);
    setHalfCheckedMenuKeys([]);
    setExpandedMenuKeys(getAllKeys(menuTreeData));
    setModalTitle('新增角色');
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingRoleId(record.roleId);
    setModalTitle(`修改角色 [${record.roleName}]`);
    try {
      const roleRes: any = await getRole(record.roleId);
      const menuRes: any = await roleMenuTreeselect(record.roleId);
      if (roleRes && roleRes.data) {
        form.setFieldsValue(roleRes.data);
      }
      const currentTree = menuTreeData.length > 0 ? menuTreeData : (menuRes?.menus || []);
      if (menuTreeData.length === 0 && menuRes?.menus) {
        setMenuTreeData(menuRes.menus);
      }
      if (menuRes && menuRes.checkedKeys) {
        // 关键：回显时只设置选中的叶子节点，AntD Tree 在父子联动下会自动计算父级的半选与全选状态，避免未分配兄弟节点被误全选
        const leafKeys = new Set(getLeafKeys(currentTree));
        const onlyLeafKeys = menuRes.checkedKeys.filter((k: any) => leafKeys.has(k));
        setCheckedMenuKeys(onlyLeafKeys);
        // 暂存原有的半选父节点
        const halfKeys = menuRes.checkedKeys.filter((k: any) => !leafKeys.has(k));
        setHalfCheckedMenuKeys(halfKeys);
      }
      setExpandedMenuKeys(getAllKeys(currentTree));
    } catch (e) {}
    setModalOpen(true);
  };

  const handleCheck = (checkedKeysValue: any, info: any) => {
    const keys = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked;
    setCheckedMenuKeys(keys);
    setHalfCheckedMenuKeys(info.halfCheckedKeys || []);
  };

  const handleToggleExpandAll = () => {
    if (expandedMenuKeys.length > 0) {
      setExpandedMenuKeys([]);
    } else {
      setExpandedMenuKeys(getAllKeys(menuTreeData));
    }
  };

  const handleToggleSelectAll = () => {
    const allKeys = getAllKeys(menuTreeData);
    if (checkedMenuKeys.length > 0) {
      setCheckedMenuKeys([]);
      setHalfCheckedMenuKeys([]);
    } else {
      setCheckedMenuKeys(allKeys);
      setHalfCheckedMenuKeys([]);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 关键：将全选节点与半选父节点合并提交，保证目录与菜单结构在数据库中完整保留
      const allMenuIds = Array.from(new Set([...checkedMenuKeys, ...halfCheckedMenuKeys]));
      const payload = {
        ...values,
        menuIds: allMenuIds,
      };
      if (editingRoleId) {
        await updateRole({ ...payload, roleId: editingRoleId });
        message.success('角色权限修改成功');
      } else {
        await addRole(payload);
        message.success('新增角色成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  const handleDelete = async (roleId: number) => {
    await delRole(roleId);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const handleStatusChange = async (checked: boolean, record: any) => {
    const status = checked ? '0' : '1';
    await changeRoleStatus(record.roleId, status);
    message.success('状态更新成功');
    actionRef.current?.reload();
  };

  // 数据权限状态
  const [dataScopeOpen, setDataScopeOpen] = useState(false);
  const [dataScopeLoading, setDataScopeLoading] = useState(false);
  const [dataScopeRecord, setDataScopeRecord] = useState<any>(null);
  const [dataScopeForm] = Form.useForm();
  const [deptTreeData, setDeptTreeData] = useState<any[]>([]);
  const [checkedDeptKeys, setCheckedDeptKeys] = useState<React.Key[]>([]);
  const [halfCheckedDeptKeys, setHalfCheckedDeptKeys] = useState<React.Key[]>([]);
  const [deptExpandKeys, setDeptExpandKeys] = useState<React.Key[]>([]);
  const [selectedDataScope, setSelectedDataScope] = useState<string>('1');

  // 分配用户抽屉状态
  const [authUserDrawerOpen, setAuthUserDrawerOpen] = useState(false);
  const [currentAuthRole, setCurrentAuthRole] = useState<any>(null);
  const authUserTableRef = useRef<ActionType>(undefined);
  const [selectedAuthUserKeys, setSelectedAuthUserKeys] = useState<React.Key[]>([]);

  // 授权用户选择弹窗状态
  const [selectUserModalOpen, setSelectUserModalOpen] = useState(false);
  const selectUserTableRef = useRef<ActionType>(undefined);
  const [selectedSelectUserKeys, setSelectedSelectUserKeys] = useState<React.Key[]>([]);

  // 打开数据权限
  const handleOpenDataScope = async (record: any) => {
    setDataScopeRecord(record);
    setDataScopeOpen(true);
    setDataScopeLoading(true);
    setSelectedDataScope(record.dataScope || '1');
    dataScopeForm.setFieldsValue({
      roleName: record.roleName,
      roleKey: record.roleKey,
      dataScope: record.dataScope || '1',
    });
    try {
      const [deptRes, roleRes]: any = await Promise.all([
        deptTreeSelect(record.roleId),
        getRole(record.roleId),
      ]);
      if (deptRes) {
        setDeptTreeData(deptRes.depts || []);
        setCheckedDeptKeys(deptRes.checkedKeys || []);
        setDeptExpandKeys(getAllKeys(deptRes.depts || []));
      }
      if (roleRes && roleRes.data) {
        const ds = roleRes.data.dataScope || '1';
        setSelectedDataScope(ds);
        dataScopeForm.setFieldsValue({ dataScope: ds });
      }
    } catch (e) {
      message.error('加载部门数据权限失败');
    } finally {
      setDataScopeLoading(false);
    }
  };

  // 提交数据权限
  const handleSaveDataScope = async () => {
    try {
      const values = await dataScopeForm.validateFields();
      const allDeptIds = Array.from(new Set([...checkedDeptKeys, ...halfCheckedDeptKeys]));
      await dataScope({
        roleId: dataScopeRecord.roleId,
        roleName: dataScopeRecord.roleName,
        roleKey: dataScopeRecord.roleKey,
        dataScope: values.dataScope,
        deptIds: values.dataScope === '2' ? allDeptIds : [],
      });
      message.success('数据权限配置成功');
      setDataScopeOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  // 打开分配用户抽屉
  const handleOpenAuthUser = (record: any) => {
    setCurrentAuthRole(record);
    setSelectedAuthUserKeys([]);
    setAuthUserDrawerOpen(true);
  };

  // 单个取消授权用户
  const handleCancelAuthUser = async (record: any) => {
    try {
      await authUserCancel({
        roleId: currentAuthRole.roleId,
        userId: record.userId,
      });
      message.success('取消授权成功');
      authUserTableRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '取消授权失败');
    }
  };

  // 批量取消授权用户
  const handleBatchCancelAuthUser = async () => {
    if (selectedAuthUserKeys.length === 0) {
      message.warning('请勾选需要取消授权的用户');
      return;
    }
    try {
      await authUserCancelAll({
        roleId: currentAuthRole.roleId,
        userIds: selectedAuthUserKeys.join(','),
      });
      message.success('批量取消授权成功');
      setSelectedAuthUserKeys([]);
      authUserTableRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '批量取消授权失败');
    }
  };

  // 批量提交添加授权用户
  const handleSaveSelectUser = async () => {
    if (selectedSelectUserKeys.length === 0) {
      message.warning('请选择需要授权的用户');
      return;
    }
    try {
      await authUserSelectAll({
        roleId: currentAuthRole.roleId,
        userIds: selectedSelectUserKeys.join(','),
      });
      message.success('授权用户成功');
      setSelectUserModalOpen(false);
      setSelectedSelectUserKeys([]);
      authUserTableRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '授权失败');
    }
  };

  const columns: ProColumns[] = [
    {
      title: '角色编号',
      dataIndex: 'roleId',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '角色名称',
      dataIndex: 'roleName',
    },
    {
      title: '权限字符',
      dataIndex: 'roleKey',
    },
    {
      title: '显示顺序',
      dataIndex: 'roleSort',
      hideInSearch: true,
      width: 100,
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
      width: 290,
      fixed: 'right',
      render: (_, record) => {
        if (record.roleId === 1) {
          return <span style={{ color: '#999', fontSize: 13 }}>系统默认超级管理员</span>;
        }
        return (
          <Space size={4}>
            <Authorized key="edit" permission="system:role:edit">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                修改
              </Button>
            </Authorized>
            <Authorized key="dataScope" permission="system:role:edit">
              <Button
                type="link"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => handleOpenDataScope(record)}
              >
                数据权限
              </Button>
            </Authorized>
            <Authorized key="authUser" permission="system:role:edit">
              <Button
                type="link"
                size="small"
                icon={<UsergroupAddOutlined />}
                onClick={() => handleOpenAuthUser(record)}
              >
                分配用户
              </Button>
            </Authorized>
            <Authorized key="del" permission="system:role:remove">
              <Popconfirm
                title="确认删除该角色吗？"
                onConfirm={() => handleDelete(record.roleId)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Authorized>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer header={{ title: '角色管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="roleId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listRole({
            ...params,
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
          <Authorized key="add" permission="system:role:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增角色
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={580}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="roleName"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            name="roleKey"
            label="权限字符"
            rules={[{ required: true, message: '请输入权限字符' }]}
            tooltip="控制器中定义的权限字符，如：@PreAuthorize(`@ss.hasRole('admin')`)"
          >
            <Input placeholder="请输入权限字符" />
          </Form.Item>

          <Form.Item name="roleSort" label="角色顺序" initialValue={1}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">停用</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="菜单权限">
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={8}>
                <Button size="small" onClick={handleToggleExpandAll}>
                  {expandedMenuKeys.length > 0 ? '折叠全部' : '展开全部'}
                </Button>
                <Button size="small" onClick={handleToggleSelectAll}>
                  {checkedMenuKeys.length > 0 ? '清空全选' : '全选全部'}
                </Button>
              </Space>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                已选中 {checkedMenuKeys.length} 项功能
              </span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
              <Tree
                checkable
                treeData={menuTreeData}
                fieldNames={{ title: 'label', key: 'id', children: 'children' }}
                checkedKeys={checkedMenuKeys}
                expandedKeys={expandedMenuKeys}
                autoExpandParent={autoExpandParent}
                onExpand={(keys) => {
                  setExpandedMenuKeys(keys);
                  setAutoExpandParent(false);
                }}
                onCheck={handleCheck}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配角色数据权限对话框 */}
      <Modal
        title={`分配数据权限 - [${dataScopeRecord?.roleName || ''}]`}
        open={dataScopeOpen}
        onOk={handleSaveDataScope}
        onCancel={() => setDataScopeOpen(false)}
        width={560}
        destroyOnHidden
      >
        <Form form={dataScopeForm} layout="vertical">
          <Form.Item name="roleName" label="角色名称">
            <Input disabled />
          </Form.Item>
          <Form.Item name="roleKey" label="权限字符">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="dataScope"
            label="数据范围"
            rules={[{ required: true, message: '请选择数据范围' }]}
          >
            <Select
              onChange={(val) => setSelectedDataScope(val)}
              options={[
                { label: '全部数据权限', value: '1' },
                { label: '自定数据权限', value: '2' },
                { label: '本部门数据权限', value: '3' },
                { label: '本部门及以下数据权限', value: '4' },
                { label: '仅本人数据权限', value: '5' },
              ]}
            />
          </Form.Item>

          {selectedDataScope === '2' && (
            <Form.Item label="数据权限部门分配">
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <Button
                    size="small"
                    onClick={() => {
                      if (deptExpandKeys.length > 0) setDeptExpandKeys([]);
                      else setDeptExpandKeys(getAllKeys(deptTreeData));
                    }}
                  >
                    {deptExpandKeys.length > 0 ? '折叠全部' : '展开全部'}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      if (checkedDeptKeys.length > 0) {
                        setCheckedDeptKeys([]);
                        setHalfCheckedDeptKeys([]);
                      } else {
                        setCheckedDeptKeys(getAllKeys(deptTreeData));
                        setHalfCheckedDeptKeys([]);
                      }
                    }}
                  >
                    {checkedDeptKeys.length > 0 ? '清空勾选' : '全选部门'}
                  </Button>
                </Space>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                  已选 {checkedDeptKeys.length} 个部门
                </span>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
                <Tree
                  checkable
                  treeData={deptTreeData}
                  fieldNames={{ title: 'label', key: 'id', children: 'children' }}
                  checkedKeys={checkedDeptKeys}
                  expandedKeys={deptExpandKeys}
                  onExpand={(keys) => setDeptExpandKeys(keys)}
                  onCheck={(checkedValue: any, info: any) => {
                    const keys = Array.isArray(checkedValue) ? checkedValue : checkedValue.checked;
                    setCheckedDeptKeys(keys);
                    setHalfCheckedDeptKeys(info.halfCheckedKeys || []);
                  }}
                />
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 分配用户抽屉 */}
      <Drawer
        title={`分配用户 - 角色：${currentAuthRole?.roleName || ''} (${currentAuthRole?.roleKey || ''})`}
        open={authUserDrawerOpen}
        onClose={() => setAuthUserDrawerOpen(false)}
        width={850}
        destroyOnHidden
      >
        <ProTable
          actionRef={authUserTableRef}
          rowKey="userId"
          search={{
            labelWidth: 'auto',
          }}
          rowSelection={{
            selectedRowKeys: selectedAuthUserKeys,
            onChange: (keys) => setSelectedAuthUserKeys(keys),
          }}
          toolBarRender={() => [
            <Button
              key="add-user"
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                setSelectedSelectUserKeys([]);
                setSelectUserModalOpen(true);
              }}
            >
              添加用户
            </Button>,
            <Button
              key="batch-cancel"
              danger
              disabled={selectedAuthUserKeys.length === 0}
              onClick={handleBatchCancelAuthUser}
            >
              批量取消授权
            </Button>,
          ]}
          request={async (params) => {
            if (!currentAuthRole?.roleId) return { data: [], total: 0, success: true };
            try {
              const res: any = await allocatedUserList({
                roleId: currentAuthRole.roleId,
                userName: params.userName,
                phonenumber: params.phonenumber,
                pageNum: params.current,
                pageSize: params.pageSize,
              });
              return {
                data: res.rows || [],
                total: res.total || 0,
                success: true,
              };
            } catch (e) {
              return { data: [], total: 0, success: false };
            }
          }}
          columns={[
            { title: '用户名称', dataIndex: 'userName' },
            { title: '用户昵称', dataIndex: 'nickName', hideInSearch: true },
            { title: '部门', dataIndex: ['dept', 'deptName'], hideInSearch: true, render: (_, r) => r.dept?.deptName || '-' },
            { title: '手机', dataIndex: 'phonenumber' },
            {
              title: '状态',
              dataIndex: 'status',
              hideInSearch: true,
              render: (val: string) => (val === '0' ? <Tag color="success">正常</Tag> : <Tag color="error">停用</Tag>),
            },
            {
              title: '操作',
              valueType: 'option',
              width: 120,
              render: (_, record) => (
                <Popconfirm
                  title={`确认要取消授权用户【${record.userName}】吗？`}
                  onConfirm={() => handleCancelAuthUser(record)}
                >
                  <Button type="link" size="small" danger>
                    取消授权
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Drawer>

      {/* 添加授权用户选择弹窗 */}
      <Modal
        title={`选择用户 - 赋予【${currentAuthRole?.roleName || ''}】角色`}
        open={selectUserModalOpen}
        onOk={handleSaveSelectUser}
        onCancel={() => setSelectUserModalOpen(false)}
        width={750}
        destroyOnHidden
      >
        <ProTable
          actionRef={selectUserTableRef}
          rowKey="userId"
          search={{
            labelWidth: 'auto',
          }}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            selectedRowKeys: selectedSelectUserKeys,
            onChange: (keys) => setSelectedSelectUserKeys(keys),
          }}
          request={async (params) => {
            if (!currentAuthRole?.roleId) return { data: [], total: 0, success: true };
            try {
              const res: any = await unallocatedUserList({
                roleId: currentAuthRole.roleId,
                userName: params.userName,
                phonenumber: params.phonenumber,
                pageNum: params.current,
                pageSize: params.pageSize,
              });
              return {
                data: res.rows || [],
                total: res.total || 0,
                success: true,
              };
            } catch (e) {
              return { data: [], total: 0, success: false };
            }
          }}
          columns={[
            { title: '用户名称', dataIndex: 'userName' },
            { title: '用户昵称', dataIndex: 'nickName', hideInSearch: true },
            { title: '部门', dataIndex: ['dept', 'deptName'], hideInSearch: true, render: (_, r) => r.dept?.deptName || '-' },
            { title: '手机', dataIndex: 'phonenumber' },
            {
              title: '状态',
              dataIndex: 'status',
              hideInSearch: true,
              render: (val: string) => (val === '0' ? <Tag color="success">正常</Tag> : <Tag color="error">停用</Tag>),
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
};

export default RolePage;
