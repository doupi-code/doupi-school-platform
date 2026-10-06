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
  TreeSelect,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import {
  listDept,
  listDeptExcludeChild,
  getDept,
  addDept,
  updateDept,
  delDept,
} from '@/api/system/dept';
import { handleTree, getExpandableKeys } from '@/utils/tree';

const DeptPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增部门');
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [deptTreeData, setDeptTreeData] = useState<any[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [allExpandKeys, setAllExpandKeys] = useState<React.Key[]>([]);
  const [isExpandAll, setIsExpandAll] = useState(true);

  const loadDeptTree = async (excludeDeptId?: number | null) => {
    try {
      const res: any = excludeDeptId
        ? await listDeptExcludeChild(excludeDeptId)
        : await listDept();
      if (res && res.data) {
        const tree = handleTree(res.data, 'deptId');
        setDeptTreeData([
          {
            deptId: 0,
            deptName: '顶级部门',
            children: tree,
          },
        ]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDeptTree();
  }, []);

  const handleAdd = (parentId = 0) => {
    form.resetFields();
    setEditingDeptId(null);
    setModalTitle('新增部门');
    form.setFieldsValue({
      parentId,
      orderNum: 1,
      status: '0',
    });
    loadDeptTree();
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingDeptId(record.deptId);
    setModalTitle('修改部门');
    loadDeptTree(record.deptId);
    try {
      const res: any = await getDept(record.deptId);
      if (res && res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingDeptId) {
        await updateDept({ ...values, deptId: editingDeptId });
        message.success('修改成功');
      } else {
        await addDept(values);
        message.success('新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
      loadDeptTree();
    } catch (e) {}
  };

  const handleDelete = async (deptId: number) => {
    await delDept(deptId);
    message.success('删除成功');
    actionRef.current?.reload();
    loadDeptTree();
  };

  const columns: ProColumns[] = [
    {
      title: '部门名称',
      dataIndex: 'deptName',
      width: 250,
    },
    {
      title: '排序',
      dataIndex: 'orderNum',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '负责人',
      dataIndex: 'leader',
      width: 120,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '停用', status: 'Error' },
      },
      width: 90,
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
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="system:dept:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="add" permission="system:dept:add">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAdd(record.deptId)}
            >
              新增
            </Button>
          </Authorized>
          <Authorized key="del" permission="system:dept:remove">
            <Popconfirm
              title="确认删除该部门吗？"
              onConfirm={() => handleDelete(record.deptId)}
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
    <PageContainer header={{ title: '部门管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="deptId"
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
            const res: any = await listDept(params);
          const treeData = handleTree(res.data || [], 'deptId');
          const expandKeys = getExpandableKeys(treeData, 'deptId');
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
          <Authorized key="add" permission="system:dept:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(0)}>
              新增部门
            </Button>
          </Authorized>,
        ]}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={550}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="上级部门" rules={[{ required: true }]}>
            <TreeSelect
              treeData={deptTreeData}
              fieldNames={{ label: 'deptName', value: 'deptId', children: 'children' }}
              placeholder="选择上级部门"
              treeDefaultExpandAll
            />
          </Form.Item>

          <Form.Item
            name="deptName"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item name="orderNum" label="显示排序" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="leader" label="负责人">
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>

          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>

          <Form.Item name="status" label="部门状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常</Radio>
              <Radio value="1">停用</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DeptPage;
