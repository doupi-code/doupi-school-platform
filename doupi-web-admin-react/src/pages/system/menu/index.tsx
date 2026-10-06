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
  Tag,
  TreeSelect,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listMenu,
  getMenu,
  addMenu,
  updateMenu,
  delMenu,
  treeselect,
} from '@/api/system/menu';
import { handleTree, getExpandableKeys } from '@/utils/tree';

const MenuPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增菜单');
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuType, setMenuType] = useState('M');
  const [form] = Form.useForm();
  const [menuTreeData, setMenuTreeData] = useState<any[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [allExpandKeys, setAllExpandKeys] = useState<React.Key[]>([]);
  const [isExpandAll, setIsExpandAll] = useState(false);

  const loadMenuTree = async () => {
    try {
      const res: any = await treeselect();
      if (res && res.data) {
        setMenuTreeData([
          {
            id: 0,
            label: '主类目',
            children: res.data,
          },
        ]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadMenuTree();
  }, []);

  const handleAdd = (parentId = 0) => {
    form.resetFields();
    setEditingMenuId(null);
    setMenuType('M');
    setModalTitle('新增菜单');
    form.setFieldsValue({
      parentId,
      menuType: 'M',
      orderNum: 1,
      status: '0',
      visible: '0',
      isFrame: '1',
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingMenuId(record.menuId);
    setModalTitle('修改菜单');
    try {
      const res: any = await getMenu(record.menuId);
      if (res && res.data) {
        setMenuType(res.data.menuType);
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingMenuId) {
        await updateMenu({ ...values, menuId: editingMenuId });
        message.success('修改成功');
      } else {
        await addMenu(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
      loadMenuTree();
    } catch (e) {}
  };

  const handleDelete = async (menuId: number) => {
    await delMenu(menuId);
    message.success('删除成功');
    actionRef.current?.reload();
    loadMenuTree();
  };

  const columns: ProColumns[] = [
    {
      title: '菜单名称',
      dataIndex: 'menuName',
      width: 220,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '排序',
      dataIndex: 'orderNum',
      hideInSearch: true,
      width: 70,
    },
    {
      title: '权限标识',
      dataIndex: 'perms',
    },
    {
      title: '组件路径',
      dataIndex: 'component',
      hideInSearch: true,
    },
    {
      title: '类型',
      dataIndex: 'menuType',
      hideInSearch: true,
      width: 80,
      render: (_, record) => {
        if (record.menuType === 'M') return <Tag color="blue">目录</Tag>;
        if (record.menuType === 'C') return <Tag color="green">菜单</Tag>;
        return <Tag color="orange">按钮</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
      width: 80,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:menu:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="add" permission="system:menu:add">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAdd(record.menuId)}
            >
              新增
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:menu:remove">
            <Popconfirm
              title="确认删除该菜单项吗？"
              onConfirm={() => handleDelete(record.menuId)}
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
    <PageContainer header={{ title: '菜单管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="menuId"
        scroll={{ x: 'max-content' }}
        pagination={false}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => {
            setExpandedRowKeys([...keys]);
            setIsExpandAll(keys.length > 0 && keys.length >= allExpandKeys.length);
          },
        }}
        request={async (params) => {
          try {
            const res: any = await listMenu(params);
          const treeData = handleTree(res.data || [], 'menuId');
          const expandKeys = getExpandableKeys(treeData, 'menuId');
          setAllExpandKeys(expandKeys);
          if (isExpandAll) {
            setExpandedRowKeys(expandKeys);
          }
          return {
            data: treeData,
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
          <Button
            key="expand"
            icon={<SwapOutlined rotate={90} />}
            onClick={() => {
              if (expandedRowKeys.length > 0) {
                setExpandedRowKeys([]);
                setIsExpandAll(false);
              } else {
                setExpandedRowKeys(allExpandKeys);
                setIsExpandAll(true);
              }
            }}
          >
            {expandedRowKeys.length > 0 ? '折叠全部' : '展开全部'}
          </Button>,
          <Authorized key="add" permission="system:menu:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(0)}>
              新增菜单
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="上级菜单" rules={[{ required: true }]}>
            <TreeSelect
              treeData={menuTreeData}
              fieldNames={{ label: 'label', value: 'id', children: 'children' }}
              placeholder="选择上级菜单"
              treeDefaultExpandAll
            />
          </Form.Item>

          <Form.Item name="menuType" label="菜单类型" rules={[{ required: true }]}>
            <Radio.Group onChange={(e) => setMenuType(e.target.value)}>
              <Radio value="M">目录</Radio>
              <Radio value="C">菜单</Radio>
              <Radio value="F">按钮</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="menuName"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="请输入菜单名称" />
          </Form.Item>

          <Form.Item name="orderNum" label="显示排序" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {menuType !== 'F' && (
            <>
              <Form.Item name="icon" label="菜单图标">
                <Input placeholder="请输入图标名称" />
              </Form.Item>
              <Form.Item
                name="path"
                label="路由地址"
                rules={[{ required: true, message: '请输入路由地址' }]}
              >
                <Input placeholder="请输入路由地址，如: user" />
              </Form.Item>
            </>
          )}

          {menuType === 'C' && (
            <Form.Item
              name="component"
              label="组件路径"
              rules={[{ required: true, message: '请输入组件路径' }]}
            >
              <Input placeholder="例如: system/user/index" />
            </Form.Item>
          )}

          {menuType !== 'M' && (
            <Form.Item name="perms" label="权限字符">
              <Input placeholder="例如: system:user:list" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MenuPage;
