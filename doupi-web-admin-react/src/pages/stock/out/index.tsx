import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  AutoComplete,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
  SaveOutlined,
  EyeOutlined,
  BookOutlined,
  PrinterOutlined,
  LinkOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import { useUserStore } from '@/store/useUserStore';
import { listOut, getOut, addOut, delOut, cancelOut } from '@/api/stock/out';
import { listGoods } from '@/api/stock/goods';
import { listClass } from '@/api/edu/class';
import { listTeacher } from '@/api/edu/teacher';
import { getRecord, getRecordByOutId } from '@/api/edu/record';
import { FormDraftUtil } from '@/utils/formDraft';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const StockOutPage: React.FC = () => {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(undefined);
  const { name: currentUserName } = useUserStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // 快捷班级领书状态
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickGrade, setQuickGrade] = useState<string>('');
  const [quickClassId, setQuickClassId] = useState<number | undefined>(undefined);
  const [quickStudentNum, setQuickStudentNum] = useState<number>(0);
  const [quickOperator, setQuickOperator] = useState<string>('');
  const [quickRemark, setQuickRemark] = useState<string>('班级教材集中发放');
  const [quickBookList, setQuickBookList] = useState<any[]>([]);
  const [selectedBookKeys, setSelectedBookKeys] = useState<React.Key[]>([]);
  const [bookQuantities, setBookQuantities] = useState<Record<number, number>>({});
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // 关联文印登记详情弹窗状态
  const [printDetailOpen, setPrintDetailOpen] = useState(false);
  const [printDetailData, setPrintDetailData] = useState<any>(null);
  const [printDetailLoading, setPrintDetailLoading] = useState(false);

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);

  // 基础数据
  const [goodsList, setGoodsList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [teacherList, setTeacherList] = useState<any[]>([]);

  // 教师与所属部门/班级映射
  const teacherMap = React.useMemo(() => {
    const map = new Map<string, any>();
    (teacherList || []).forEach((t: any) => {
      if (t.teacherName) {
        map.set(String(t.teacherName).trim(), t);
      }
    });
    return map;
  }, [teacherList]);

  // 班级 ID 与班级名称映射
  const classMap = React.useMemo(() => {
    const map = new Map<number, string>();
    (classList || []).forEach((c: any) => {
      if (c.classId) {
        const full = (c.grade ? `${c.grade} ` : '') + (c.className || '');
        map.set(Number(c.classId), c.className || full);
      }
    });
    return map;
  }, [classList]);

  // 解析部门名称
  const resolveDeptName = (record: any): string => {
    if (!record) return '';
    if (record.dept) return record.dept;
    if (record.deptName) return record.deptName;
    if (record.receiver) {
      const trimmed = String(record.receiver).trim();
      const teacher = teacherMap.get(trimmed);
      if (teacher?.dept) return teacher.dept;
      // 若 receiver 本身是部门名称（例如以 处/室/组/部/中心 结尾）
      if (/[处室组部中心]/.test(trimmed) && trimmed.length >= 3) {
        return trimmed;
      }
    }
    return '';
  };

  // 解析班级名称
  const resolveClassName = (record: any): string => {
    if (!record) return '';
    if (record.className) return record.className;
    if (record.classId && classMap.has(Number(record.classId))) {
      return classMap.get(Number(record.classId)) || '';
    }
    return '';
  };

  // 动态出库明细行
  const [items, setItems] = useState<any[]>([]);

  // 触发保存草稿
  const triggerSaveOutDraft = (fields?: any, curItems?: any[]) => {
    const currentValues = fields || form.getFieldsValue();
    const targetItems = curItems !== undefined ? curItems : items;
    FormDraftUtil.saveDraft('stock_out', 'create', currentValues, targetItems);
    const d = FormDraftUtil.getDraft('stock_out', 'create');
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  useEffect(() => {
    listGoods({ pageSize: 500 }).then((res: any) => {
      if (res && res.rows) setGoodsList(res.rows);
    }).catch(() => {});
    listClass({ pageSize: 500 }).then((res: any) => {
      if (res && res.rows) setClassList(res.rows);
    }).catch(() => {});
    listTeacher({ pageSize: 1000 }).then((res: any) => {
      if (res && res.rows) setTeacherList(res.rows);
    }).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    form.resetFields();
    // 检查是否有未保存草稿
    const draft = FormDraftUtil.getDraft('stock_out', 'create');
    if (draft && (draft.formValues?.receiver || (draft.extraData && draft.extraData.length > 0))) {
      form.setFieldsValue(draft.formValues);
      setItems(draft.extraData || []);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的领用出库单草稿，已为您自动恢复！');
    } else {
      setItems([]);
      form.setFieldsValue({
        outType: '部门领用',
        outTime: dayjs().format('YYYY-MM-DD'),
        operator: currentUserName || '管理员',
      });
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      FormDraftUtil.clearDraft('stock_out', 'create');
      setDraftNotice(null);
      form.resetFields();
      setItems([]);
      form.setFieldsValue({
        outType: '部门领用',
        outTime: dayjs().format('YYYY-MM-DD'),
        operator: currentUserName || '管理员',
      });
      message.success('已丢弃本地草稿，已刷新到未填写状态！');
    } catch (e: any) {
      message.error(e.message || '刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  const handleAddItem = () => {
    const next = [
      ...items,
      {
        key: Date.now() + Math.random(),
        goodsId: undefined,
        goodsName: '',
        spec: '',
        unit: '包',
        stockNum: 0,
        quantity: 1,
      },
    ];
    setItems(next);
    triggerSaveOutDraft(form.getFieldsValue(), next);
  };

  const handleRemoveItem = (key: any) => {
    const next = items.filter((i) => i.key !== key);
    setItems(next);
    triggerSaveOutDraft(form.getFieldsValue(), next);
  };

  const handleItemGoodsChange = (key: any, goodsId: any) => {
    const targetGoods = goodsList.find((g) => g.goodsId === goodsId);
    const next = items.map((item) => {
      if (item.key === key) {
        const spec = targetGoods?.spec || '-';
        const unit = targetGoods?.unit || '件';
        const stockNum = targetGoods?.stockNum ?? targetGoods?.stock ?? 0;
        const goodsName = targetGoods?.goodsName || '';
        return {
          ...item,
          goodsId,
          goodsName,
          spec,
          unit,
          stockNum,
        };
      }
      return item;
    });
    setItems(next);
    triggerSaveOutDraft(form.getFieldsValue(), next);
  };

  const handleItemQuantityChange = (key: any, quantity: number | null) => {
    const q = quantity || 0;
    const next = items.map((item) => {
      if (item.key === key) {
        return { ...item, quantity: q };
      }
      return item;
    });
    setItems(next);
    triggerSaveOutDraft(form.getFieldsValue(), next);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSaveOut = async () => {
    try {
      const values = await form.validateFields();
      if (items.length === 0) {
        message.warning('请至少添加一行出库物品明细！');
        return;
      }

      for (const it of items) {
        if (!it.goodsId) {
          message.warning('请为所有明细选择出库物品！');
          return;
        }
        if (it.quantity > it.stockNum) {
          message.error(`物品【${it.goodsName}】出库数量(${it.quantity})超过当前可用库存(${it.stockNum})，无法出库！`);
          return;
        }
      }

      const cl = classList.find((c) => c.classId === values.classId);

      await addOut({
        ...values,
        className: cl ? cl.className : undefined,
        grade: cl ? cl.grade : undefined,
        totalQuantity,
        itemList: items.map((i) => ({
          goodsId: i.goodsId,
          goodsName: i.goodsName,
          spec: i.spec,
          unit: i.unit,
          quantity: i.quantity,
        })),
      });

      message.success('领用出库单创建成功！已自动扣减对应物资库存');
      FormDraftUtil.clearDraft('stock_out', 'create');
      setDraftNotice(null);
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '出库单保存失败');
    }
  };

  // 打开班级领书快捷出库弹窗
  const handleOpenQuickBook = () => {
    setQuickGrade('');
    setQuickClassId(undefined);
    setQuickStudentNum(0);
    setQuickOperator(currentUserName || '管理员');
    setQuickRemark('班级教材集中发放');
    setQuickBookList([]);
    setSelectedBookKeys([]);
    setBookQuantities({});
    setQuickBookOpen(true);
  };

  // 年级切换，动态加载该年级教材
  const handleQuickGradeChange = async (val: string) => {
    setQuickGrade(val);
    setQuickClassId(undefined);
    setQuickStudentNum(0);
    setSelectedBookKeys([]);
    setBookQuantities({});
    if (!val) {
      setQuickBookList([]);
      return;
    }
    setQuickLoading(true);
    try {
      // 查询分类为 '2' (学生教材) 或指定年级的书籍
      const res: any = await listGoods({ category: '2', grade: val, pageSize: 1000 });
      const books = res.rows || [];
      setQuickBookList(books);
      // 默认全选该年级教材
      setSelectedBookKeys(books.map((b: any) => b.goodsId));
    } catch (e: any) {
      message.error('加载年级教材失败：' + (e.message || e));
    } finally {
      setQuickLoading(false);
    }
  };

  // 班级切换，自动带出班级实际人数并更新各教材领用数量
  const handleQuickClassChange = (classId: number) => {
    setQuickClassId(classId);
    const cls = classList.find((c) => c.classId === classId);
    if (cls) {
      const num = Number(cls.studentNum) || 45;
      setQuickStudentNum(num);
      const nextQ: Record<number, number> = {};
      quickBookList.forEach((b: any) => {
        nextQ[b.goodsId] = num;
      });
      setBookQuantities(nextQ);
    }
  };

  // 修改单本教材发放数量
  const handleBookQtyChange = (goodsId: number, val: number | null) => {
    setBookQuantities((prev) => ({
      ...prev,
      [goodsId]: val || 0,
    }));
  };

  // 提交班级快捷领书出库
  const submitQuickBook = async () => {
    if (!quickClassId) {
      message.error('请选择领书班级！');
      return;
    }
    if (selectedBookKeys.length === 0) {
      message.error('请至少勾选一种领用教材！');
      return;
    }

    const cls = classList.find((c) => c.classId === quickClassId);
    const receiverName = cls ? `${cls.grade}${cls.className}` : '班级领书';

    const selectedBooks = quickBookList.filter((b) => selectedBookKeys.includes(b.goodsId));

    // 校验库存
    for (const b of selectedBooks) {
      const qty = bookQuantities[b.goodsId] ?? quickStudentNum ?? 45;
      const curStock = b.stockNum ?? b.stock ?? 0;
      if (curStock < qty) {
        message.error(`教材【${b.goodsName}】当前库存仅剩 ${curStock} 本，不足以领用 ${qty} 本！请调整数量或先行采购入库。`);
        return;
      }
    }

    const items = selectedBooks.map((b) => ({
      goodsId: b.goodsId,
      goodsName: b.goodsName,
      spec: b.spec,
      unit: b.unit,
      quantity: bookQuantities[b.goodsId] ?? quickStudentNum ?? 45,
    }));

    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    setQuickSubmitting(true);
    try {
      await addOut({
        outType: '学生领书',
        classId: quickClassId,
        className: cls?.className,
        grade: cls?.grade,
        receiver: receiverName,
        operator: quickOperator || currentUserName || '管理员',
        outTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        remark: `${receiverName} 班级领书(${quickStudentNum}人) - ${quickRemark}`,
        totalQuantity: totalQty,
        itemList: items,
      });

      message.success(`【${receiverName}】班级领书出库单生成成功！已自动扣减 ${selectedBooks.length} 种教材库存`);
      setQuickBookOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '生成出库单失败');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // 查看关联印刷登记详情
  const handleViewPrintDetail = async (record: any) => {
    setPrintDetailLoading(true);
    setPrintDetailOpen(true);
    try {
      let res: any = null;
      if (record.printId) {
        res = await getRecord(record.printId);
      } else {
        res = await getRecordByOutId(record.outId);
      }
      if (res && res.data) {
        setPrintDetailData(res.data);
      } else {
        setPrintDetailData(null);
      }
    } catch (e: any) {
      message.error('加载文印登记详情失败：' + (e.message || e));
    } finally {
      setPrintDetailLoading(false);
    }
  };

  // 跳转至文印登记页面并高亮定位
  const handleJumpToPrint = (_printId?: number) => {
    setPrintDetailOpen(false);
    navigate('/print/record');
  };

  const handleCancelOut = async (record: any) => {
    try {
      await cancelOut(record.outId);
      message.success('出库单已作废！对应耗材库存已自动回退返还');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '作废失败');
    }
  };

  const handleViewDetail = async (record: any) => {
    try {
      const res: any = await getOut(record.outId);
      if (res && res.data) {
        setCurrentRecord(res.data);
      } else {
        setCurrentRecord(record);
      }
      setDetailOpen(true);
    } catch (e) {
      setCurrentRecord(record);
      setDetailOpen(true);
    }
  };

  const columns: ProColumns[] = [
    {
      title: '出库单号',
      dataIndex: 'outNo',
      width: 150,
      render: (_, record) => (
        <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500 }}>
          {record.outNo}
        </a>
      ),
    },
    {
      title: '出库类型',
      dataIndex: 'outType',
      width: 100,
      align: 'center',
      valueEnum: {
        教学文印: { text: '教学文印' },
        部门领用: { text: '部门领用' },
        办公消耗: { text: '办公消耗' },
        日常教研: { text: '日常教研' },
        设备报损: { text: '设备报损' },
      },
      render: (_, record) => (
        <Tag color={record.outType === '教学文印' ? 'cyan' : 'blue'}>
          {record.outType || '部门领用'}
        </Tag>
      ),
    },
    {
      title: '领用人',
      dataIndex: 'receiver',
      width: 110,
      align: 'center',
      fieldProps: {
        placeholder: '请输入领用人',
      },
      render: (_, record) => (
        record.receiver ? (
          <Text strong style={{ color: '#262626' }}>
            {record.receiver}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '班级',
      dataIndex: 'classId',
      width: 140,
      align: 'center',
      valueType: 'select',
      fieldProps: {
        showSearch: true,
        placeholder: '请选择班级',
        options: classList.map((c: any) => ({
          label: (c.grade ? `${c.grade} ` : '') + c.className,
          value: c.classId,
        })),
      },
      render: (_, record) => {
        const clsName = resolveClassName(record);
        if (!clsName) return <Text type="secondary">-</Text>;
        return <Tag color="geekblue">{clsName}</Tag>;
      },
    },
    {
      title: '部门',
      dataIndex: 'dept',
      width: 130,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => {
        const dept = resolveDeptName(record);
        if (!dept) return <Text type="secondary">-</Text>;
        return <Tag color="blue">{dept}</Tag>;
      },
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 95,
      align: 'center',
    },
    {
      title: '出库日期',
      dataIndex: 'outTime',
      valueType: 'date',
      width: 110,
      align: 'center',
    },
    {
      title: '出库总件数',
      dataIndex: 'totalQuantity',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Text strong style={{ color: '#FA8C16' }}>
          {record.totalQuantity || '-'}
        </Text>
      ),
    },
    {
      title: '关联文印记录',
      dataIndex: 'printName',
      width: 170,
      ellipsis: true,
      render: (_, record) => {
        const hasPrint = !!(record.printName || record.printId || record.outType === '教学文印');
        if (!hasPrint) return <Text type="secondary">-</Text>;
        return (
          <Tag
            color="purple"
            style={{ cursor: 'pointer' }}
            onClick={() => handleViewPrintDetail(record)}
          >
            <PrinterOutlined style={{ marginRight: 4 }} />
            {record.printName || `文印单 #${record.printId || record.outId}`}
          </Tag>
        );
      },
    },
    {
      title: '单据状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      valueEnum: {
        '0': { text: '正常出库', status: 'Success' },
        '2': { text: '已作废', status: 'Default' },
      },
      render: (_, record) =>
        record.status === '2' ? (
          <Tag color="default">已作废</Tag>
        ) : (
          <Tag color="success">正常出库</Tag>
        ),
    },
    {
      title: '用途说明',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            key="detail"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            明细
          </Button>
          {(record.printId || record.outType === '教学文印' || record.printName) && (
            <Button
              key="print-detail"
              type="link"
              size="small"
              icon={<PrinterOutlined style={{ color: '#722ED1' }} />}
              onClick={() => handleViewPrintDetail(record)}
            >
              关联文印
            </Button>
          )}
          {record.status !== '2' && (
            <Popconfirm
              key="cancel"
              title="确认作废该出库单？领出物资将自动归还回退至仓库库存！"
              onConfirm={() => handleCancelOut(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                作废
              </Button>
            </Popconfirm>
          )}
          <Authorized key="del" permission="stock:out:remove">
            <Popconfirm
              key="del"
              title="确认彻底删除该出库单？"
              onConfirm={async () => {
                await delOut(record.outId);
                message.success('删除成功');
                actionRef.current?.reload();
              }}
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
    <PageContainer header={{ title: '领用出库管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="outId"
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          try {
            const res: any = await listOut({
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
            key="quick-book"
            type="dashed"
            style={{ borderColor: '#52c41a', color: '#52c41a' }}
            icon={<BookOutlined />}
            onClick={handleOpenQuickBook}
          >
            ⚡ 班级领书快捷出库
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            新建领用出库单
          </Button>,
        ]}
      />

      {/* 新建出库单居中大弹窗 */}
      <Modal
        title={
          <Space>
            <SaveOutlined style={{ color: '#fa8c16' }} />
            <span style={{ fontWeight: 600 }}>新建物资领用出库单（实时校验并扣减库存）</span>
          </Space>
        }
        width={960}
        centered
        open={modalOpen}
        destroyOnHidden={false}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleSaveOut}>
            确认出库并扣库
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto', paddingRight: 8 }}>
          <DraftNoticeAlert
            visible={!!draftNotice?.visible}
            timeText={draftNotice?.timeText}
            onDiscard={handleDiscardDraft}
            loading={discardLoading}
            isEdit={false}
          />
          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_ch, all) => triggerSaveOutDraft(all, items)}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="outType" label="出库类型" rules={[{ required: true }]}>
                  <Select placeholder="选择出库类型">
                    <Select.Option value="部门领用">部门领用</Select.Option>
                    <Select.Option value="办公消耗">办公消耗</Select.Option>
                    <Select.Option value="教学文印">教学文印</Select.Option>
                    <Select.Option value="日常教研">日常教研</Select.Option>
                    <Select.Option value="设备报损">设备报损</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="receiver"
                  label="领用人"
                  rules={[{ required: true, message: '请输入或选择领用人' }]}
                >
                  <AutoComplete
                    placeholder="请输入或选择领用人 (支持搜索教师)"
                    allowClear
                    options={teacherList.map((t: any) => ({
                      value: t.teacherName,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t.teacherName}</span>
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {[t.dept, t.grade].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      ),
                      teacher: t,
                    }))}
                    filterOption={(input, option) =>
                      String(option?.value ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onSelect={(_val, option: any) => {
                      const t = option?.teacher;
                      if (t && t.classIds) {
                        const firstClassId = Number(String(t.classIds).split(',')[0].trim());
                        if (firstClassId && !form.getFieldValue('classId')) {
                          form.setFieldsValue({ classId: firstClassId });
                        }
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="operator" label="出库经办保管员" rules={[{ required: true }]}>
                  <Input placeholder="经办人姓名" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="classId" label="关联使用班级 (选填)">
                  <Select placeholder="可选择指定班级" allowClear showSearch optionFilterProp="children">
                    {classList.map((c) => (
                      <Select.Option key={c.classId} value={c.classId}>
                        {(c.grade ? c.grade + ' ' : '') + c.className}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="outTime" label="出库日期" rules={[{ required: true }]}>
                  <Input placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="remark" label="出库用途说明">
                  <Input placeholder="如：高一年级月考办公消耗" />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Card
            title="出库物品明细清单"
            size="small"
            extra={
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddItem}>
                添加出库物品
              </Button>
            }
            style={{ marginTop: 12 }}
          >
            <Table
              dataSource={items}
              rowKey="key"
              pagination={false}
              scroll={{ x: 750 }}
              columns={[
                {
                  title: '领用物品',
                  dataIndex: 'goodsId',
                  width: 260,
                  render: (_, r) => (
                    <Select
                      placeholder="选择出库物资"
                      value={r.goodsId}
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                      onChange={(val) => handleItemGoodsChange(r.key, val)}
                    >
                      {goodsList.map((g) => {
                        const stock = Number(g.stockNum ?? g.stock ?? 0);
                        return (
                          <Select.Option key={g.goodsId} value={g.goodsId} disabled={stock <= 0}>
                            {g.goodsName} {g.spec ? `(${g.spec})` : ''} - 现存: {stock}
                            {g.unit}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  ),
                },
                {
                  title: '规格型号',
                  dataIndex: 'spec',
                  width: 120,
                },
                {
                  title: '单位',
                  dataIndex: 'unit',
                  width: 65,
                  align: 'center',
                },
                {
                  title: '可用库存',
                  dataIndex: 'stockNum',
                  width: 90,
                  align: 'center',
                  render: (val) => (
                    <span style={{ fontWeight: 'bold', color: val > 0 ? '#52C41A' : '#FF4D4F' }}>
                      {val || 0}
                    </span>
                  ),
                },
                {
                  title: '出库数量',
                  dataIndex: 'quantity',
                  width: 120,
                  render: (_, r) => (
                    <InputNumber
                      min={1}
                      max={r.stockNum > 0 ? r.stockNum : 9999}
                      value={r.quantity}
                      style={{ width: '100%' }}
                      status={r.quantity > r.stockNum ? 'error' : ''}
                      onChange={(val) => handleItemQuantityChange(r.key, val)}
                    />
                  ),
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 60,
                  align: 'center',
                  render: (_, r) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveItem(r.key)}
                    />
                  ),
                },
              ]}
            />

            <div
              style={{
                marginTop: 16,
                padding: '10px 16px',
                backgroundColor: '#FAFAFA',
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                已选物资品种：<Text strong>{items.length}</Text> 种
              </span>
              <span>
                本次出库合计总件数：
                <Text strong style={{ fontSize: 18, color: '#FA8C16', marginLeft: 6 }}>
                  {totalQuantity} 件
                </Text>
              </span>
            </div>
          </Card>
        </div>
      </Modal>

      {/* 出库单详细档案弹窗 */}
      <Modal
        title={`领用出库单详情 - ${currentRecord?.outNo || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="出库单号">{currentRecord.outNo}</Descriptions.Item>
              <Descriptions.Item label="出库类型">
                <Tag color="cyan">{currentRecord.outType || '部门领用'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="领用人">{currentRecord.receiver || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属部门">
                {(() => {
                  const dept = resolveDeptName(currentRecord);
                  return dept ? <Tag color="blue">{dept}</Tag> : <Text type="secondary">-</Text>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="关联班级">
                {(() => {
                  const cls = resolveClassName(currentRecord);
                  return cls ? <Tag color="geekblue">{cls}</Tag> : <Text type="secondary">-</Text>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="出库日期">{currentRecord.outTime}</Descriptions.Item>
              <Descriptions.Item label="经办人">{currentRecord.operator}</Descriptions.Item>
              <Descriptions.Item label="单据状态">
                {currentRecord.status === '2' ? (
                  <Tag color="default">已作废</Tag>
                ) : (
                  <Tag color="success">正常出库</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="出库总数量">
                <Text strong style={{ color: '#FA8C16' }}>{currentRecord.totalQuantity} 件</Text>
              </Descriptions.Item>
              <Descriptions.Item label="关联文印单" span={2}>
                {currentRecord.printName ? (
                  <Tag color="purple">{currentRecord.printName}</Tag>
                ) : (
                  '非文印直接出库'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="用途备注说明" span={2}>
                {currentRecord.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📦 出库领用物资明细：</div>
              <Table
                dataSource={currentRecord.itemList || []}
                rowKey={(r: any, idx) => r.itemId || String(idx)}
                pagination={false}

                size="small"
                columns={[
                  { title: '物品名称', dataIndex: 'goodsName' },
                  { title: '规格型号', dataIndex: 'spec' },
                  { title: '单位', dataIndex: 'unit', align: 'center' },
                  { title: '出库数量', dataIndex: 'quantity', align: 'center' },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ⚡ 班级领书快捷出库弹窗 */}
      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontWeight: 600 }}>⚡ 班级领书快捷出库（一键带出年级教材与人数）</span>
          </Space>
        }
        open={quickBookOpen}
        onCancel={() => setQuickBookOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuickBookOpen(false)}>
            取 消
          </Button>,
          <Button
            key="submit"
            type="primary"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            loading={quickSubmitting}
            disabled={!quickClassId || selectedBookKeys.length === 0}
            onClick={submitQuickBook}
          >
            一键生成班级领书出库单 (已选 {selectedBookKeys.length} 种)
          </Button>,
        ]}
        width={850}
      >
        <Card size="small" style={{ marginBottom: 16, background: '#FAFAFA' }}>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>
                <span style={{ color: 'red' }}>* </span>所属年级：
              </div>
              <Select
                placeholder="请选择年级"
                style={{ width: '100%' }}
                value={quickGrade || undefined}
                onChange={handleQuickGradeChange}
                options={[
                  { label: '高一年级', value: '高一' },
                  { label: '高二年级', value: '高二' },
                  { label: '高三年级', value: '高三' },
                  { label: '高三复读部', value: '复读部' },
                  { label: '初中部', value: '初中部' },
                ]}
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>
                <span style={{ color: 'red' }}>* </span>领书班级：
              </div>
              <Select
                placeholder="请选择班级"
                style={{ width: '100%' }}
                value={quickClassId}
                disabled={!quickGrade}
                onChange={handleQuickClassChange}
                options={classList
                  .filter((c) => !quickGrade || c.grade === quickGrade)
                  .map((c) => ({
                    label: `${c.className} (${c.studentNum || 0}人)`,
                    value: c.classId,
                  }))}
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>班级学生人数：</div>
              <div style={{ paddingTop: 4 }}>
                <Tag color={quickStudentNum > 0 ? 'green' : 'default'} style={{ fontSize: 13, fontWeight: 'bold' }}>
                  {quickStudentNum > 0 ? `${quickStudentNum} 人` : '请先选班级'}
                </Tag>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>经办人：</div>
              <Input
                value={quickOperator}
                onChange={(e) => setQuickOperator(e.target.value)}
                placeholder="经办人姓名"
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>领书备注：</div>
              <Input
                value={quickRemark}
                onChange={(e) => setQuickRemark(e.target.value)}
                placeholder="如：高一秋季教材集中发放"
              />
            </Col>
          </Row>
        </Card>

        <Divider titlePlacement="start" style={{ margin: '12px 0', fontSize: 13, color: '#1677FF' }}>
          勾选领用教材（自动匹配【{quickGrade || '对应年级'}】学生教材）
        </Divider>

        <Spin spinning={quickLoading}>
          <Table
            dataSource={quickBookList}
            rowKey="goodsId"
            size="small"
            pagination={false}
            scroll={{ y: 280 }}
            rowSelection={{
              selectedRowKeys: selectedBookKeys,
              onChange: (keys) => setSelectedBookKeys(keys),
            }}
            columns={[
              {
                title: '教材名称',
                dataIndex: 'goodsName',
                render: (val, r) => (
                  <div>
                    <span style={{ fontWeight: 500 }}>{val}</span>
                    {r.grade && <Tag color="blue" style={{ marginLeft: 6 }}>{r.grade}</Tag>}
                  </div>
                ),
              },
              { title: '规格', dataIndex: 'spec', width: 90, align: 'center' },
              { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
              {
                title: '当前库存',
                dataIndex: 'stockNum',
                width: 95,
                align: 'center',
                render: (_, r) => {
                  const stock = r.stockNum ?? r.stock ?? 0;
                  const targetQty = bookQuantities[r.goodsId] ?? quickStudentNum ?? 45;
                  const isShortage = stock < targetQty;
                  return (
                    <span style={{ color: isShortage ? '#FF4D4F' : '#52C41A', fontWeight: 'bold' }}>
                      {stock}
                    </span>
                  );
                },
              },
              {
                title: '领用数量（默认班级人数）',
                width: 180,
                align: 'center',
                render: (_, r) => {
                  const val = bookQuantities[r.goodsId] ?? quickStudentNum ?? 45;
                  const maxStock = (r.stockNum ?? r.stock ?? 0) > 0 ? (r.stockNum ?? r.stock ?? 0) : 9999;
                  return (
                    <InputNumber
                      min={1}
                      max={maxStock}
                      size="small"
                      style={{ width: '100%' }}
                      value={val}
                      onChange={(v) => handleBookQtyChange(r.goodsId, v)}
                    />
                  );
                },
              },
            ]}
          />
        </Spin>
        <div style={{ marginTop: 10, fontSize: 12, color: '#8c8c8c' }}>
          💡 提示：系统已自动匹配该年级全部教材。勾选并发放，将按填写的领用数量一键生成出库单并联动扣减教材库存。
        </div>
      </Modal>

      {/* 🖨️ 关联印刷登记详情弹窗 */}
      <Modal
        title={
          <Space>
            <PrinterOutlined style={{ color: '#722ED1' }} />
            <span style={{ fontWeight: 600 }}>关联印刷登记详情</span>
          </Space>
        }
        open={printDetailOpen}
        onCancel={() => setPrintDetailOpen(false)}
        footer={[
          printDetailData?.printId && (
            <Button
              key="jump"
              type="primary"
              style={{ backgroundColor: '#722ED1', borderColor: '#722ED1' }}
              icon={<ArrowRightOutlined />}
              onClick={() => handleJumpToPrint(printDetailData.printId)}
            >
              前往印刷登记页面
            </Button>
          ),
          <Button key="close" onClick={() => setPrintDetailOpen(false)}>
            关 闭
          </Button>,
        ]}
        width={720}
      >
        <Spin spinning={printDetailLoading}>
          {printDetailData && printDetailData.printId ? (
            <div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="登记编号">{printDetailData.printId}</Descriptions.Item>
                <Descriptions.Item label="单据状态">
                  {printDetailData.status === '0' && <Tag color="warning">待印刷</Tag>}
                  {printDetailData.status === '1' && <Tag color="success">已完成</Tag>}
                  {printDetailData.status === '2' && <Tag color="default">已作废</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="印刷名称" span={2}>
                  <Text strong>{printDetailData.printName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="纸张规格">{printDetailData.paperType || 'A4'}</Descriptions.Item>
                <Descriptions.Item label="关联用纸物品">{printDetailData.paperGoodsName || '-'}</Descriptions.Item>
                <Descriptions.Item label="印刷份数">{printDetailData.printCount} 份</Descriptions.Item>
                <Descriptions.Item label="每份页数">{printDetailData.pageCount || 1} 页/张</Descriptions.Item>
                <Descriptions.Item label="总消耗纸张量" span={2}>
                  <span style={{ fontSize: 15, fontWeight: 'bold', color: '#1677FF' }}>
                    {printDetailData.totalPages || (printDetailData.printCount * (printDetailData.pageCount || 1))} 张纸
                  </span>
                  <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
                    ({printDetailData.printCount} 份 × {printDetailData.pageCount || 1} 页)
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="申请教师">{printDetailData.teacherName || '-'}</Descriptions.Item>
                <Descriptions.Item label="年级/班级">
                  {printDetailData.grade || ''} {printDetailData.className || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="文印经办人">{printDetailData.operator || '-'}</Descriptions.Item>
                <Descriptions.Item label="印刷时间">{printDetailData.printTime || '-'}</Descriptions.Item>
                <Descriptions.Item label="原稿电子文件" span={2}>
                  {printDetailData.attachment ? (
                    <a href={printDetailData.attachment} target="_blank" rel="noreferrer">
                      <LinkOutlined /> 点击查看/下载原稿文件
                    </a>
                  ) : (
                    <span style={{ color: '#8c8c8c' }}>未上传原稿</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="印刷实物效果图" span={2}>
                  {printDetailData.resultImg ? (
                    <Image src={printDetailData.resultImg} width={120} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: '#8c8c8c' }}>未留样拍照</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="补充备注" span={2}>
                  {printDetailData.remark || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8c8c8c' }}>
              <InfoCircleOutlined style={{ fontSize: 28, marginBottom: 8, display: 'block', color: '#1677FF' }} />
              未查询到关联的印刷登记单据
            </div>
          )}
        </Spin>
      </Modal>
    </PageContainer>
  );
};

export default StockOutPage;
