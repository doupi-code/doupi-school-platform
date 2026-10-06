import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  TrophyOutlined,
  RocketOutlined,
  UploadOutlined,
  DownloadOutlined,
  ClearOutlined,
  TeamOutlined,
  RiseOutlined,
  StarOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listCelebration,
  getCelebration,
  addCelebration,
  updateCelebration,
  delCelebration,
  cleanCelebration,
  getCelebrationSummary,
  getCelebrationBatches,
} from '@/api/edu/celebration';
import { getToken } from '@/utils/auth';

interface SummaryData {
  totalCount?: number;
  maxUpgrade?: number;
  avgUpgrade?: number;
  countAbove600?: number;
  countAbove500?: number;
  maxAfterScore?: number;
}

const CelebrationPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [summary, setSummary] = useState<SummaryData>({});
  const [form] = Form.useForm();
  const [importBatchTitle, setImportBatchTitle] = useState('2026湖北高考卓越提分榜');
  const [importing, setImporting] = useState(false);

  // 考试批次切换状态
  const [selectedBatch, setSelectedBatch] = useState<string>('__ALL__');
  const [batchList, setBatchList] = useState<any[]>([]);

  // 加载考试批次列表
  const loadBatches = async () => {
    try {
      const res: any = await getCelebrationBatches();
      if (res && res.code === 200) {
        setBatchList(res.data || []);
      }
    } catch (e) {
      // 忽略批次加载异常
    }
  };

  // 加载统计指标 (支持按具体考试批次过滤)
  const loadSummary = async (batch?: string) => {
    try {
      const current = batch !== undefined ? batch : selectedBatch;
      const isAll = !current || current === '__ALL__';
      const res: any = await getCelebrationSummary(isAll ? undefined : current);
      if (res && res.code === 200 && res.data) {
        setSummary(res.data);
      }
    } catch (e) {
      // 忽略统计加载失败
    }
  };

  // 切换考试批次
  const handleBatchSwitch = (batchVal: string) => {
    setSelectedBatch(batchVal);
    loadSummary(batchVal);
    actionRef.current?.reload();
    if (batchVal && batchVal !== '__ALL__') {
      setImportBatchTitle(batchVal);
      message.success(`已切换至【${batchVal}】`);
    } else {
      message.success('已切换至【全部考试总览】');
    }
  };

  useEffect(() => {
    loadBatches();
    loadSummary('__ALL__');
  }, []);

  // 姓名脱敏算法
  const autoMaskName = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.length <= 1) return trimmed;
    if (trimmed.length === 2) return trimmed[0] + '*';
    return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
  };

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  const triggerSaveCelebrationDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = editingId ? editingId : 'create';
    FormDraftUtil.saveDraft('edu_celebration', targetId, current);
    const d = FormDraftUtil.getDraft('edu_celebration', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);

    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('edu_celebration', 'create');
    if (draft && draft.formValues && draft.formValues.studentName) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新增草稿，已为您自动恢复！');
    } else {
      const defaultBatch = (selectedBatch && selectedBatch !== '__ALL__')
        ? selectedBatch
        : (batchList[0]?.batchTitle || '2026湖北高考卓越提分榜');
      form.setFieldsValue({
        status: '0',
        subject: '物化生',
        batchTitle: defaultBatch,
        orderNum: 0,
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleEdit = async (record: any) => {
    form.resetFields();
    setEditingId(record.celebrationId);

    // 检查是否有该记录的未保存草稿
    const draft = FormDraftUtil.getDraft('edu_celebration', record.celebrationId);
    if (draft && draft.formValues) {
      form.setFieldsValue(draft.formValues);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该学子记录未保存的草稿数据！');
    } else {
      try {
        const res: any = await getCelebration(record.celebrationId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        }
      } catch (e) {
        message.error('获取学子成绩详情失败');
      }
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = editingId ? editingId : 'create';
      FormDraftUtil.clearDraft('edu_celebration', targetId);
      setDraftNotice(null);

      if (editingId) {
        const res: any = await getCelebration(editingId);
        if (res && res.data) {
          form.setFieldsValue(res.data);
        }
      } else {
        form.resetFields();
        const defaultBatch = (selectedBatch && selectedBatch !== '__ALL__')
          ? selectedBatch
          : (batchList[0]?.batchTitle || '2026湖北高考卓越提分榜');
        form.setFieldsValue({
          status: '0',
          subject: '物化生',
          batchTitle: defaultBatch,
          orderNum: 0,
        });
      }
      if (editingId) {
        message.success('已丢弃本地草稿，已恢复为数据库数据！');
      } else {
        message.success('已丢弃本地草稿，已刷新到未填写状态！');
      }
    } catch (e) {
      message.error('刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateCelebration({ ...values, celebrationId: editingId });
        message.success('学子成绩信息修改成功');
        FormDraftUtil.clearDraft('edu_celebration', editingId);
      } else {
        await addCelebration(values);
        message.success('学子登榜成功');
        FormDraftUtil.clearDraft('edu_celebration', 'create');
      }
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
      loadSummary();
      loadBatches();
    } catch (e) {
      // 校验失败或接口报错
    }
  };

  const handleDelete = async (celebrationId: number) => {
    try {
      await delCelebration(celebrationId);
      message.success('删除成功');
      actionRef.current?.reload();
      loadSummary();
      loadBatches();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await delCelebration(selectedRowKeys.map(String));
      message.success(`已成功批量删除 ${selectedRowKeys.length} 条记录`);
      setSelectedRowKeys([]);
      actionRef.current?.reload();
      loadSummary();
      loadBatches();
    } catch (e) {
      message.error('批量删除失败');
    }
  };

  const handleClean = async () => {
    try {
      await cleanCelebration();
      message.success('提分光荣榜数据已全部清空');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
      loadSummary();
      loadBatches();
      setSelectedBatch('__ALL__');
    } catch (e) {
      message.error('清空操作失败');
    }
  };

  // 监听学生姓名输入，自动补充脱敏姓名
  const handleStudentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const currentMasked = form.getFieldValue('maskedName');
    if (!currentMasked || currentMasked.length <= name.length) {
      form.setFieldsValue({ maskedName: autoMaskName(name) });
    }
  };

  // 自动计算提升分值
  const handleScoreChange = () => {
    const before = form.getFieldValue('beforeScore');
    const after = form.getFieldValue('afterScore');
    if (after != null && before != null) {
      const diff = Math.round((Number(after) - Number(before)) * 10) / 10;
      form.setFieldsValue({ upgradeScore: diff });
    }
  };

  // 导出 Excel
  const handleExport = () => {
    const token = getToken();
    const exportUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/edu/celebration/export`;
    const formEl = document.createElement('form');
    formEl.action = exportUrl;
    formEl.method = 'POST';
    formEl.target = '_blank';
    if (token) {
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'Authorization';
      tokenInput.value = `Bearer ${token}`;
      formEl.appendChild(tokenInput);
    }
    if (selectedBatch && selectedBatch !== '__ALL__') {
      const batchInput = document.createElement('input');
      batchInput.type = 'hidden';
      batchInput.name = 'batchTitle';
      batchInput.value = selectedBatch;
      formEl.appendChild(batchInput);
    }
    document.body.appendChild(formEl);
    formEl.submit();
    document.body.removeChild(formEl);
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/edu/celebration/importTemplate`, '_blank');
  };

  const columns: ProColumns[] = [
    {
      title: '序号',
      dataIndex: 'index',
      valueType: 'indexBorder',
      width: 55,
      align: 'center',
    },
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      width: 100,
      align: 'center',
      render: (_, record) => <span style={{ fontWeight: 600 }}>{record.studentName}</span>,
    },
    {
      title: '脱敏姓名',
      dataIndex: 'maskedName',
      width: 95,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => <Tag color="default">{record.maskedName || '-'}</Tag>,
    },
    {
      title: '选科方向',
      dataIndex: 'subject',
      width: 100,
      align: 'center',
      render: (_, record) => record.subject ? <Tag color="blue">{record.subject}</Tag> : '-',
    },
    {
      title: '进校成绩',
      dataIndex: 'beforeScore',
      width: 105,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => (
        record.beforeScore != null ? (
          <span>{record.beforeScore} 分</span>
        ) : (
          <span style={{ color: '#999' }}>应届</span>
        )
      ),
    },
    {
      title: '提升后成绩',
      dataIndex: 'afterScore',
      width: 110,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 14 }}>
          {record.afterScore} 分
        </span>
      ),
    },
    {
      title: '提升分值',
      dataIndex: 'upgradeScore',
      width: 115,
      align: 'center',
      hideInSearch: true,
      sorter: (a, b) => (Number(a.upgradeScore) || 0) - (Number(b.upgradeScore) || 0),
      render: (_, record) => (
        <span style={{ fontWeight: 800, color: '#f5222d', fontSize: 15 }}>
          +{record.upgradeScore} 分
        </span>
      ),
    },
    {
      title: '荣誉/去向标签',
      dataIndex: 'tag',
      width: 125,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => record.tag ? <Tag color="gold">{record.tag}</Tag> : '-',
    },
    {
      title: '届别批次',
      dataIndex: 'batchTitle',
      minWidth: 160,
      ellipsis: true,
    },
    {
      title: '展播状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      valueEnum: {
        '0': { text: '正常展播', status: 'Success' },
        '1': { text: '停用隐藏', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === '0' ? 'success' : 'default'}>
          {record.status === '0' ? '展播中' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '录取详情/提分亮点',
      dataIndex: 'remark',
      minWidth: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Authorized key="edit" permission="edu:celebration:edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              修改
            </Button>
          </Authorized>
          <Authorized key="del" permission="edu:celebration:remove">
            <Popconfirm
              title="确认删除该学子光荣榜记录吗？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => handleDelete(record.celebrationId)}
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
    <PageContainer
      header={{
        title: '提分光荣榜',
        subTitle: '高考学子提分风采与荣誉展播档案',
      }}
    >
      {/* 考试批次快捷切换与当前考试核心操作面板 */}
      <Card
        bordered={false}
        style={{
          marginBottom: 16,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #f6faff 0%, #ffffff 100%)',
          border: '1px solid #d6e4ff',
          boxShadow: '0 2px 8px rgba(22, 119, 255, 0.06)'
        }}
        bodyStyle={{ padding: '14px 20px' }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 12]}>
          <Col xs={24} md={15} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#1d39c4', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrophyOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
              考试批次切换：
            </span>
            <Select
              value={selectedBatch}
              onChange={handleBatchSwitch}
              style={{ minWidth: 260, flex: 1, maxWidth: 360 }}
              placeholder="请选择查看的考试批次"
              options={[
                { label: '🌟 全部考试批次 (汇总总览)', value: '__ALL__' },
                ...batchList.map((b) => ({
                  label: `🏆 ${b.batchTitle} (${b.totalCount || 0}人 / 最高提分: +${b.maxUpgrade || 0}分)`,
                  value: b.batchTitle,
                }))
              ]}
            />
            {selectedBatch !== '__ALL__' ? (
              <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }} closable onClose={() => handleBatchSwitch('__ALL__')}>
                当前聚焦：{selectedBatch}
              </Tag>
            ) : (
              <Tag color="cyan" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}>
                当前显示全校总榜
              </Tag>
            )}
          </Col>
          <Col xs={24} md={9} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Button
              type="primary"
              style={{ background: 'linear-gradient(90deg, #ff4d4f, #fa8c16)', borderColor: 'transparent' }}
              icon={<RocketOutlined />}
              onClick={() => {
                const url = selectedBatch && selectedBatch !== '__ALL__'
                  ? `/screen/celebration?batchTitle=${encodeURIComponent(selectedBatch)}`
                  : '/screen/celebration';
                window.open(url, '_blank');
              }}
            >
              {selectedBatch !== '__ALL__' ? `投屏当前考试大屏` : '全屏展播综合大屏'}
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                handleAdd();
              }}
            >
              登记学子
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                if (selectedBatch && selectedBatch !== '__ALL__') {
                  setImportBatchTitle(selectedBatch);
                }
                setImportModalOpen(true);
              }}
            >
              导入成绩
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 顶部核心指标统计面板 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable style={{ borderRadius: 8, background: '#fff' }}>
            <Statistic
              title={<span style={{ color: '#666', fontSize: 13 }}>榜单收录学子</span>}
              value={summary.totalCount || 0}
              suffix="人"
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
              prefix={<TeamOutlined style={{ marginRight: 6, color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable style={{ borderRadius: 8, background: '#fff' }}>
            <Statistic
              title={<span style={{ color: '#666', fontSize: 13 }}>全校最高提分</span>}
              value={summary.maxUpgrade || 0}
              precision={1}
              prefix={<RiseOutlined style={{ marginRight: 6, color: '#ff4d4f' }} />}
              suffix="分"
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable style={{ borderRadius: 8, background: '#fff' }}>
            <Statistic
              title={<span style={{ color: '#666', fontSize: 13 }}>全员平均提分</span>}
              value={summary.avgUpgrade || 0}
              precision={1}
              prefix={<TrophyOutlined style={{ marginRight: 6, color: '#fa8c16' }} />}
              suffix="分"
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable style={{ borderRadius: 8, background: '#fff' }}>
            <Statistic
              title={<span style={{ color: '#666', fontSize: 13 }}>600分以上特控学子</span>}
              value={summary.countAbove600 || 0}
              suffix="人"
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              prefix={<StarOutlined style={{ marginRight: 6, color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="celebrationId"
        scroll={{ x: 'max-content' }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={({ selectedRowKeys: keys }) => (
          <Space size={16}>
            <span>已选择 {keys.length} 项</span>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </Space>
        )}
        tableAlertOptionRender={() => (
          <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>
            取消选择
          </Button>
        )}
        request={async (params) => {
          try {
            const isAll = !selectedBatch || selectedBatch === '__ALL__';
          const res: any = await listCelebration({
            ...params,
            batchTitle: params.batchTitle || (isAll ? undefined : selectedBatch),
            pageNum: params.current,
            pageSize: params.pageSize,
          });
          loadSummary();
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
            key="screen"
            type="primary"
            style={{ background: 'linear-gradient(90deg, #ff4d4f, #fa8c16)', borderColor: 'transparent' }}
            icon={<RocketOutlined />}
            onClick={() => {
              const url = selectedBatch && selectedBatch !== '__ALL__'
                ? `/screen/celebration?batchTitle=${encodeURIComponent(selectedBatch)}`
                : '/screen/celebration';
              window.open(url, '_blank');
            }}
          >
            {selectedBatch !== '__ALL__' ? `投屏当前考试大屏` : '全屏光荣榜展播'}
          </Button>,
          <Authorized key="add" permission="edu:celebration:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              登记上榜学子
            </Button>
          </Authorized>,
          <Authorized key="import" permission="edu:celebration:add">
            <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
              导入成绩
            </Button>
          </Authorized>,
          <Authorized key="export" permission="edu:celebration:list">
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出榜单
            </Button>
          </Authorized>,
          <Authorized key="clean" permission="edu:celebration:remove">
            <Popconfirm
              title="确定要一键清空提分光荣榜的所有数据吗？此操作不可逆！"
              okText="确认清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={handleClean}
            >
              <Button danger icon={<ClearOutlined />}>
                一键清空
              </Button>
            </Popconfirm>
          </Authorized>,
        ]}
      />

      {/* 新增或修改学子弹窗 */}
      <Modal
        title={editingId ? '修改学子成绩信息' : '登记上榜学子'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden={false}
        width={600}
      >
        <DraftNoticeAlert
          visible={!!draftNotice?.visible}
          timeText={draftNotice?.timeText}
          onDiscard={handleDiscardDraft}
          loading={discardLoading}
          isEdit={!!editingId}
        />
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_ch, all) => triggerSaveCelebrationDraft(all)}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="studentName"
                label="学生姓名"
                rules={[{ required: true, message: '请输入学生真实姓名' }]}
              >
                <Input placeholder="例如：刘宇宸" onChange={handleStudentNameChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maskedName"
                label="脱敏姓名"
                tooltip="大屏展播隐私保护，自动生成，如：刘*宸"
              >
                <Input placeholder="大屏展示脱敏姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="subject" label="选科方向">
                <Select
                  options={[
                    { label: '物化生 (理科卓越)', value: '物化生' },
                    { label: '历政地 (文科卓越)', value: '历政地' },
                    { label: '物化地', value: '物化地' },
                    { label: '物化政', value: '物化政' },
                    { label: '物理方向', value: '物理方向' },
                    { label: '历史方向', value: '历史方向' },
                    { label: '理科综合', value: '理科综合' },
                    { label: '文科综合', value: '文科综合' },
                  ]}
                  placeholder="请选择选科方向"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tag" label="荣誉/去向标签">
                <Select
                  options={[
                    { label: '清北强基', value: '清北强基' },
                    { label: '华科冲刺', value: '华科冲刺' },
                    { label: 'C9联盟名校', value: 'C9联盟名校' },
                    { label: '双一流重点', value: '双一流重点' },
                    { label: '特控高分', value: '特控高分' },
                    { label: '名校提分', value: '名校提分' },
                    { label: '一本逆袭', value: '一本逆袭' },
                  ]}
                  placeholder="选择或输入荣誉标签"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="beforeScore" label="进校/原始分">
                <InputNumber
                  min={0}
                  max={750}
                  precision={1}
                  style={{ width: '100%' }}
                  placeholder="如：480.0"
                  onChange={handleScoreChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="afterScore"
                label="提升后成绩"
                rules={[{ required: true, message: '请输入提升后成绩' }]}
              >
                <InputNumber
                  min={0}
                  max={750}
                  precision={1}
                  style={{ width: '100%' }}
                  placeholder="如：616.5"
                  onChange={handleScoreChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="upgradeScore"
                label="提升分值"
                tooltip="自动根据现考分与原始分差值计算，也可手动修正"
              >
                <InputNumber
                  min={-200}
                  max={500}
                  precision={1}
                  style={{ width: '100%' }}
                  placeholder="如：136.5"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="batchTitle" label="届别批次" tooltip="可直接输入新考试批次，或点击下方快捷选择">
            <Input placeholder="例如：2026湖北高考卓越提分榜" />
          </Form.Item>
          {batchList.length > 0 && (
            <div style={{ marginTop: -16, marginBottom: 16, marginLeft: 90, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#888' }}>已有批次：</span>
              {batchList.map((b) => (
                <Tag
                  key={b.batchTitle}
                  style={{ cursor: 'pointer' }}
                  onClick={() => form.setFieldsValue({ batchTitle: b.batchTitle })}
                >
                  {b.batchTitle}
                </Tag>
              ))}
            </div>
          )}

          <Form.Item name="status" label="展播状态" initialValue="0">
            <Radio.Group>
              <Radio value="0">正常展播</Radio>
              <Radio value="1">停用隐藏</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="remark" label="录取去向/提分亮点">
            <Input.TextArea
              rows={3}
              placeholder="例如：考入武汉大学 (物理卓越计划)，理综单科突破276分，数学提升42分"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入成绩 Excel 弹窗 */}
      <Modal
        title="导入学子成绩 Excel"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666', fontSize: 13 }}>
            请先下载提分成绩标准模板，按照模板规范格式录入后上传导入。
          </p>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载成绩导入模板
          </Button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            本次导入的届别批次（考试名称）：
          </label>
          <Input
            value={importBatchTitle}
            onChange={(e) => setImportBatchTitle(e.target.value)}
            placeholder="例如：2026湖北高考卓越提分榜"
          />
          {batchList.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#999' }}>快捷选择已有批次：</span>
              {batchList.map((b) => (
                <Tag
                  key={b.batchTitle}
                  style={{ cursor: 'pointer' }}
                  color={importBatchTitle === b.batchTitle ? 'blue' : 'default'}
                  onClick={() => setImportBatchTitle(b.batchTitle)}
                >
                  {b.batchTitle}
                </Tag>
              ))}
            </div>
          )}
        </div>
        <Upload.Dragger
          name="file"
          accept=".xlsx, .xls"
          action={`${import.meta.env.VITE_API_BASE_URL || ''}/edu/celebration/importData?batchTitle=${encodeURIComponent(importBatchTitle)}`}
          headers={{
            Authorization: `Bearer ${getToken()}`,
          }}
          showUploadList={false}
          beforeUpload={() => {
            setImporting(true);
            return true;
          }}
          onChange={(info) => {
            if (info.file.status === 'uploading') {
              setImporting(true);
            }
            if (info.file.status === 'done') {
              setImporting(false);
              const res = info.file.response;
              if (res && res.code === 200) {
                message.success(res.msg || '导入成功！');
                setImportModalOpen(false);
                actionRef.current?.reload();
                loadSummary(importBatchTitle);
                loadBatches();
                setSelectedBatch(importBatchTitle);
              } else {
                message.error((res && res.msg) || '导入失败，请检查文件格式');
              }
            } else if (info.file.status === 'error') {
              setImporting(false);
              message.error('网络或服务器异常，导入失败');
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 36, color: '#1677ff' }} />
          </p>
          <p className="ant-upload-text">点击或将成绩 Excel 文件拖拽到此区域上传</p>
          <p className="ant-upload-hint">支持 .xls、.xlsx 格式，单次建议不超过 500 条</p>
        </Upload.Dragger>
      </Modal>
    </PageContainer>
  );
};

export default CelebrationPage;
