import React, { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Popconfirm, Space } from 'antd';
import { CloudDownloadOutlined, DeleteOutlined, ImportOutlined } from '@ant-design/icons';
import { listTable, listDbTable, importTable, delTable, genCode } from '@/api/tool/gen';

const GenCodePage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedDbTables, setSelectedDbTables] = useState<string[]>([]);

  const handleGenCode = async (tableName: string) => {
    try {
      await genCode(tableName);
      message.success(`成功为表 [${tableName}] 执行代码生成！`);
    } catch (e) {
      message.error('生成代码失败');
    }
  };

  const handleDelete = async (tableId: number) => {
    try {
      await delTable(tableId);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (e) {}
  };

  const handleImportSubmit = async () => {
    if (selectedDbTables.length === 0) {
      message.warning('请选择需要导入的数据表');
      return;
    }
    try {
      await importTable({ tables: selectedDbTables.join(',') });
      message.success('导入数据表成功');
      setImportModalOpen(false);
      setSelectedDbTables([]);
      actionRef.current?.reload();
    } catch (e) {}
  };

  const columns: ProColumns[] = [
    {
      title: '序号',
      dataIndex: 'tableId',
      width: 70,
      hideInSearch: true,
    },
    {
      title: '表名称',
      dataIndex: 'tableName',
    },
    {
      title: '表描述',
      dataIndex: 'tableComment',
    },
    {
      title: '实体类名称',
      dataIndex: 'className',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            key="gen"
            icon={<CloudDownloadOutlined />}
            onClick={() => handleGenCode(record.tableName)}
          >
            生成代码
          </Button>
          <Popconfirm
            title="确认删除该代码生成配置吗？"
            key="del"
            onConfirm={() => handleDelete(record.tableId)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '代码生成管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="tableId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listTable({
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
          <Button
            type="primary"
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            导入数据表
          </Button>,
        ]}
      />

      <Modal
        title="导入数据库表"
        open={importModalOpen}
        onOk={handleImportSubmit}
        onCancel={() => setImportModalOpen(false)}
        width={800}
        destroyOnHidden
      >
        <ProTable
          columns={[
            { title: '表名称', dataIndex: 'tableName' },
            { title: '表描述', dataIndex: 'tableComment' },
          ]}
          rowKey="tableName"
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys) => setSelectedDbTables(selectedRowKeys as string[]),
          }}
          request={async (params) => {
          try {
            const res: any = await listDbTable({
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
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </PageContainer>
  );
};

export default GenCodePage;
