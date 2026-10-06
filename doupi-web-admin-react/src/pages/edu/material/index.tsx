import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Form,
  Image,
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
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  SendOutlined,
  InboxOutlined,
  FileImageOutlined,
  ToolOutlined,
  BookOutlined,
  UserOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  AppstoreAddOutlined,
  FireOutlined,
  ShoppingOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Authorized from '@/components/Authorized';
import ImageUpload from '@/components/ImageUpload';
import { useUserStore } from '@/store/useUserStore';
import {
  listMaterialRecord,
  getMaterialRecord,
  grantMaterial,
  returnMaterial,
  cancelMaterialRecord,
  getMaterialStats,
} from '@/api/edu/material';
import { listKit, getKit } from '@/api/edu/kit';
import { listGoods } from '@/api/stock/goods';
import { listTeacher } from '@/api/edu/teacher';
import { listClass } from '@/api/edu/class';
import dayjs from 'dayjs';

const { Text, Paragraph, Title } = Typography;
const { Option } = Select;

interface FrequentItem {
  goodsId?: number;
  name: string;
  icon?: string;
}

const FREQUENT_STORAGE_KEY = 'doupi_material_frequent_goods';

// 系统推荐的高频常用物资默认列表（白粉笔、彩色粉笔、板擦、笔、笔芯等）
const DEFAULT_FREQUENT_ITEMS: FrequentItem[] = [
  { goodsId: 301, name: '无尘白粉笔', icon: '📦' },
  { goodsId: 302, name: '无尘彩色粉笔', icon: '🎨' },
  { goodsId: 303, name: '磁性黑板擦', icon: '🧽' },
  { goodsId: 101, name: '按动红色中性笔', icon: '🖊️' },
  { goodsId: 102, name: '按动黑色中性笔', icon: '🖊️' },
  { goodsId: 103, name: '红色速干笔芯', icon: '🖋️' },
  { goodsId: 104, name: '黑色速干笔芯', icon: '🖋️' },
  { goodsId: 304, name: '可加墨黑白板笔', icon: '🖍️' },
  { goodsId: 1, name: '得力A4双胶复印纸', icon: '📄' },
  { goodsId: 306, name: '省力订书机', icon: '📎' },
  { goodsId: 307, name: '订书针(1000枚)', icon: '📌' },
  { goodsId: 111, name: '高粘度固体胶棒', icon: '🧴' },
  { goodsId: 112, name: '彩色多格便利贴', icon: '📑' },
  { goodsId: 110, name: '透明加厚文件夹', icon: '🗂️' },
];

interface MaterialItemRow {
  key: string | number;
  goodsId?: number;
  goodsName?: string;
  spec?: string;
  unit?: string;
  stockNum?: number;
  quantity: number;
  selected?: boolean;
  itemStatus?: string;
  remark?: string;
}

const EduMaterialPage: React.FC = () => {
  const navigate = useNavigate();
  const { name: currentUserName } = useUserStore();
  const [activeTab, setActiveTab] = useState('grant'); // grant, recovery, ledger
  const actionRef = useRef<ActionType>(undefined);

  // 基础数据
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [goodsList, setGoodsList] = useState<any[]>([]);
  const [kitList, setKitList] = useState<any[]>([]);

  // 看板统计数据
  const [stats, setStats] = useState<any>({
    todayGrantCount: 0,
    todayGrantQuantity: 0,
    todayReturnCount: 0,
    todayReturnQuantity: 0,
    totalTeacherCount: 0,
    totalStudentCount: 0,
  });

  // ==================== 发放表单状态 ====================
  const [grantForm] = Form.useForm();
  // 领用模式: 'quick' (日常零星散件领用), 'kit' (成套批量领用)
  const [claimMode, setClaimMode] = useState<'quick' | 'kit'>('quick');
  // 领用人对象类型: '1'教师, '2'学生, '3'班级公用, '4'教研组/部门
  const [grantTargetType, setGrantTargetType] = useState('1');
  const [grantItems, setGrantItems] = useState<MaterialItemRow[]>([]);
  const [grantImageUrl, setGrantImageUrl] = useState('');
  const [selectedKitId, setSelectedKitId] = useState<number | undefined>(undefined);
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  // ==================== 回收表单状态 ====================
  const [returnForm] = Form.useForm();
  const [returnTargetType, setReturnTargetType] = useState('1'); // 1教师离职, 2学生退书, 3班级闲置
  const [returnItems, setReturnItems] = useState<MaterialItemRow[]>([]);
  const [returnImageUrl, setReturnImageUrl] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // ==================== 详情弹窗 ====================
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  // ==================== 常用高频物资自定义状态 ====================
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>(() => {
    try {
      const saved = localStorage.getItem(FREQUENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_FREQUENT_ITEMS;
  });
  const [configFrequentOpen, setConfigFrequentOpen] = useState(false);
  const [selectedFrequentGoodsIds, setSelectedFrequentGoodsIds] = useState<number[]>([]);

  // 加载全量数据
  const loadBaseData = async () => {
    try {
      const [teaRes, clsRes, gdsRes, kitRes, statRes]: any = await Promise.all([
        listTeacher({ pageSize: 500 }),
        listClass({ pageSize: 500 }),
        listGoods({ pageSize: 500 }),
        listKit({ pageSize: 100, status: '0' }),
        getMaterialStats().catch(() => ({ data: {} })),
      ]);

      if (teaRes?.rows) setTeacherList(teaRes.rows);
      if (clsRes?.rows) setClassList(clsRes.rows);
      if (gdsRes?.rows) setGoodsList(gdsRes.rows);
      if (kitRes?.rows) setKitList(kitRes.rows);
      if (statRes?.data) setStats(statRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBaseData();
    resetGrantForm();
    resetReturnForm();
  }, []);

  const refreshStats = async () => {
    try {
      const res: any = await getMaterialStats();
      if (res?.data) setStats(res.data);
    } catch {}
  };

  // 快捷点选常用零星物资（支持 ID 精确匹配 + 物品名称智能容错匹配）
  const handleQuickAddGoods = (item: FrequentItem) => {
    let target = item.goodsId ? goodsList.find((g) => g.goodsId === item.goodsId) : undefined;
    if (!target && item.name) {
      // 容错按名称精确或包含匹配
      target = goodsList.find(
        (g) => g.goodsName === item.name || g.goodsName.includes(item.name) || item.name.includes(g.goodsName)
      );
    }
    if (!target) {
      message.warning(`未在当前可用库存档案中匹配到【${item.name}】，请在物资档案中确认该物资是否存在`);
      return;
    }

    const matchedGoodsId = target.goodsId;

    setGrantItems((prev) => {
      // 检查清单中是否已有该物品，有则数量 +1
      const existing = prev.find((it) => it.goodsId === matchedGoodsId);
      if (existing) {
        message.info(`物品【${target.goodsName}】已在清单中，数量累加为 ${existing.quantity + 1} ${target.unit || '件'}`);
        return prev.map((it) =>
          it.goodsId === matchedGoodsId
            ? { ...it, quantity: it.quantity + 1, selected: true }
            : it
        );
      }

      // 如果当前仅有一行空的未选择物资，则直接替换该空行
      if (prev.length === 1 && !prev[0].goodsId) {
        message.success(`已添加【${target.goodsName}】`);
        return [
          {
            key: prev[0].key,
            goodsId: target.goodsId,
            goodsName: target.goodsName,
            spec: target.spec || '-',
            unit: target.unit || '件',
            stockNum: target.stockNum ?? 0,
            quantity: 1,
            selected: true,
            remark: '',
          },
        ];
      }

      message.success(`已添加【${target.goodsName}】`);
      return [
        ...prev,
        {
          key: Date.now() + Math.random(),
          goodsId: target.goodsId,
          goodsName: target.goodsName,
          spec: target.spec || '-',
          unit: target.unit || '件',
          stockNum: target.stockNum ?? 0,
          quantity: 1,
          selected: true,
          remark: '',
        },
      ];
    });
  };

  // 打开常用物资自定义弹窗
  const handleOpenConfigFrequent = () => {
    const currentIds: number[] = [];
    frequentItems.forEach((f) => {
      let g = f.goodsId ? goodsList.find((item) => item.goodsId === f.goodsId) : undefined;
      if (!g && f.name) {
        g = goodsList.find(
          (item) => item.goodsName === f.name || item.goodsName.includes(f.name) || f.name.includes(item.goodsName)
        );
      }
      if (g && !currentIds.includes(g.goodsId)) {
        currentIds.push(g.goodsId);
      }
    });
    setSelectedFrequentGoodsIds(currentIds);
    setConfigFrequentOpen(true);
  };

  // 保存常用物资配置
  const handleSaveFrequentConfig = () => {
    const newItems: FrequentItem[] = selectedFrequentGoodsIds.map((id) => {
      const g = goodsList.find((item) => item.goodsId === id);
      const matchedDefault = DEFAULT_FREQUENT_ITEMS.find((d) => d.name === g?.goodsName);
      return {
        goodsId: id,
        name: g?.goodsName || `物资#${id}`,
        icon: matchedDefault?.icon || '📌',
      };
    });
    setFrequentItems(newItems);
    localStorage.setItem(FREQUENT_STORAGE_KEY, JSON.stringify(newItems));
    message.success(`常用快捷物资已更新，共配置 ${newItems.length} 项！`);
    setConfigFrequentOpen(false);
  };

  // 恢复默认常用物资配置
  const handleResetDefaultFrequent = () => {
    setFrequentItems(DEFAULT_FREQUENT_ITEMS);
    localStorage.removeItem(FREQUENT_STORAGE_KEY);
    message.success('已恢复为系统推荐的默认高频常用物资！');
    setConfigFrequentOpen(false);
  };

  // ----------------------------------------------------
  // 发放业务逻辑
  // ----------------------------------------------------
  const resetGrantForm = () => {
    grantForm.resetFields();
    grantForm.setFieldsValue({
      claimMode: 'quick',
      businessCategory: '日常教学办公用品领用',
      targetType: '1',
      operateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      operator: currentUserName || '教务处',
    });
    setClaimMode('quick');
    setGrantTargetType('1');
    setSelectedKitId(undefined);
    setGrantImageUrl('');
    setGrantItems([
      {
        key: Date.now(),
        goodsId: undefined,
        quantity: 1,
        selected: true,
      },
    ]);
  };

  // 切换领用对象（教师/学生/班级/部门）
  const handleGrantTargetTypeChange = (type: string) => {
    setGrantTargetType(type);
    grantForm.setFieldsValue({
      targetType: type,
      targetId: undefined,
      targetName: undefined,
      classId: undefined,
      className: undefined,
      grade: undefined,
      subject: undefined,
    });

    if (claimMode === 'kit') {
      // 切换对象时，联动套用新对象的预设套装
      const matchingKits = kitList.filter((k) =>
        type === '2' ? k.targetType === '2' : type === '1' ? k.targetType === '1' : k.targetType === '3' || k.targetType === '1'
      );
      if (matchingKits.length > 0) {
        handleApplyKit(matchingKits[0].kitId);
      } else {
        setSelectedKitId(undefined);
        grantForm.setFieldsValue({
          kitId: undefined,
          kitName: undefined,
          businessCategory: type === '3' ? '班级日常教学耗材申领' : '教研组/部门公用物资领用',
        });
        setGrantItems([]);
        message.info('当前领用对象暂无预设套装，请先在【物资套装配置】中定义或选择散件申领');
      }
    } else {
      if (type === '1') {
        grantForm.setFieldsValue({ businessCategory: '教师日常教学用品领用' });
      } else if (type === '2') {
        grantForm.setFieldsValue({ businessCategory: '学生散件教材领用' });
      } else if (type === '3') {
        grantForm.setFieldsValue({ businessCategory: '班级日常教学耗材申领(粉笔/纸张等)' });
      } else {
        grantForm.setFieldsValue({ businessCategory: '教研组/部门公用物资领用' });
      }
    }
  };

  // 切换领取模式（日常零星 vs 成套批量）
  const handleClaimModeChange = (mode: 'quick' | 'kit') => {
    setClaimMode(mode);
    if (mode === 'kit') {
      // 默认推荐并联动载入第一个符合当前对象的套装
      const matchingKits = kitList.filter((k) =>
        grantTargetType === '2' ? k.targetType === '2' : k.targetType === '1'
      );
      const defKit = matchingKits[0] || kitList[0];
      if (defKit) {
        handleApplyKit(defKit.kitId);
      } else {
        setSelectedKitId(undefined);
        setGrantItems([]);
      }
    } else {
      setSelectedKitId(undefined);
      grantForm.setFieldsValue({
        businessCategory:
          grantTargetType === '3'
            ? '班级日常教学耗材申领(粉笔/纸张等)'
            : grantTargetType === '2'
            ? '学生散件教材领用'
            : '教师日常教学用品领用',
        kitId: undefined,
        kitName: undefined,
      });
      setGrantItems([
        {
          key: Date.now(),
          goodsId: undefined,
          quantity: 1,
          selected: true,
        },
      ]);
    }
  };

  const handleTeacherSelect = (teacherId: number) => {
    const tea = teacherList.find((t) => t.teacherId === teacherId);
    if (tea) {
      grantForm.setFieldsValue({
        targetName: tea.teacherName,
        grade: tea.grade || '通用',
        subject: tea.subject || tea.dept || '通用',
      });
    }
  };

  const handleClassSelect = (classId: number) => {
    const cl = classList.find((c) => c.classId === classId);
    if (cl) {
      grantForm.setFieldsValue({
        className: cl.className,
        grade: cl.grade || '通用',
      });
    }
  };

  // 一键套用预设物资套装
  const handleApplyKit = async (kitId?: number) => {
    if (!kitId) {
      setSelectedKitId(undefined);
      grantForm.setFieldsValue({
        kitId: undefined,
        kitName: undefined,
      });
      setGrantItems([]);
      message.info('已清除已选套装');
      return;
    }

    const numKitId = Number(kitId);
    setSelectedKitId(numKitId);
    const targetKit = kitList.find((k) => Number(k.kitId) === numKitId);
    if (!targetKit) return;

    grantForm.setFieldsValue({
      kitId: targetKit.kitId,
      kitName: targetKit.kitName,
      businessCategory: targetKit.kitName,
      subject:
        targetKit.subject && targetKit.subject !== '通用'
          ? targetKit.subject
          : grantForm.getFieldValue('subject'),
      grade:
        targetKit.grade && targetKit.grade !== '通用'
          ? targetKit.grade
          : grantForm.getFieldValue('grade'),
    });

    try {
      const res: any = await getKit(numKitId);
      const detail = res?.data || targetKit;
      if (detail.itemList && detail.itemList.length > 0) {
        setGrantItems(
          detail.itemList.map((it: any) => ({
            key: it.itemId || `${it.goodsId}_${Math.random()}`,
            goodsId: it.goodsId,
            goodsName: it.goodsName,
            spec: it.spec,
            unit: it.unit,
            stockNum: it.stockNum,
            quantity: it.quantity || 1,
            selected: true,
            remark: it.remark || '',
          }))
        );
        message.success(
          `已成套导入【${targetKit.kitName}】，共 ${detail.itemList.length} 样物资清单！若手头已有部分物资，可取消勾选`
        );
      } else {
        setGrantItems([]);
        message.warning(`该物资套装【${targetKit.kitName}】中尚未配置物品清单`);
      }
    } catch {
      message.error('加载套装物品明细失败');
    }
  };

  const handleAddGrantItem = () => {
    setGrantItems((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        goodsId: undefined,
        quantity: 1,
        selected: true,
      },
    ]);
  };

  const handleRemoveGrantItem = (key: string | number) => {
    setGrantItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleGrantGoodsChange = (key: string | number, goodsId: number) => {
    const targetGoods = goodsList.find((g) => g.goodsId === goodsId);
    setGrantItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return {
            ...item,
            goodsId,
            goodsName: targetGoods?.goodsName || '',
            spec: targetGoods?.spec || '-',
            unit: targetGoods?.unit || '件',
            stockNum: targetGoods?.stockNum ?? 0,
          };
        }
        return item;
      })
    );
  };

  const handleGrantQuantityChange = (key: string | number, quantity: number | null) => {
    const q = quantity && quantity > 0 ? quantity : 1;
    setGrantItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: q } : item))
    );
  };

  const handleGrantItemToggle = (key: string | number, checked: boolean) => {
    setGrantItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: checked } : item))
    );
  };

  const handleSubmitGrant = async () => {
    try {
      const values = await grantForm.validateFields();
      const activeItems = grantItems.filter((i) => i.selected && i.goodsId);
      if (activeItems.length === 0) {
        message.warning('请至少选择并勾选一种要发放的物资！');
        return;
      }

      for (const it of activeItems) {
        const stock = it.stockNum ?? 0;
        if (it.quantity > stock) {
          message.error(
            `物品【${it.goodsName}】当前可用库存为 ${stock}，小于发放数量 ${it.quantity}，无法完成发放！`
          );
          return;
        }
      }

      const currentKit = selectedKitId ? kitList.find((k) => Number(k.kitId) === Number(selectedKitId)) : null;

      setGrantSubmitting(true);
      await grantMaterial({
        ...values,
        kitId: claimMode === 'kit' ? (selectedKitId || values.kitId) : undefined,
        kitName: claimMode === 'kit' ? (currentKit?.kitName || values.kitName) : undefined,
        businessCategory: values.businessCategory || (currentKit ? currentKit.kitName : '日常教学用品领用'),
        imageUrl: grantImageUrl,
        itemList: activeItems.map((i) => ({
          goodsId: i.goodsId,
          goodsName: i.goodsName,
          spec: i.spec,
          unit: i.unit,
          quantity: i.quantity,
          remark: i.remark,
        })),
      });

      message.success('物资领用发放登记成功！已自动扣减库存并归档流水');
      resetGrantForm();
      refreshStats();
      actionRef.current?.reload();
      setActiveTab('ledger');
    } catch (e: any) {
      message.error(e.message || '物资领用登记失败');
    } finally {
      setGrantSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // 回收业务逻辑
  // ----------------------------------------------------
  const resetReturnForm = () => {
    returnForm.resetFields();
    returnForm.setFieldsValue({
      businessCategory: '教师离职交接物资回收',
      targetType: '1',
      operateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      operator: currentUserName || '教务处',
    });
    setReturnTargetType('1');
    setReturnImageUrl('');
    setReturnItems([
      {
        key: Date.now(),
        goodsId: undefined,
        quantity: 1,
        itemStatus: '完好',
        remark: '',
      },
    ]);
  };

  const handleReturnTargetTypeChange = (type: string) => {
    setReturnTargetType(type);
    if (type === '1') {
      returnForm.setFieldsValue({
        businessCategory: '教师离职交接物资回收',
        targetId: undefined,
        targetName: undefined,
      });
    } else if (type === '2') {
      returnForm.setFieldsValue({
        businessCategory: '学生退学/转学退书回收',
        targetId: undefined,
        targetName: undefined,
      });
    } else {
      returnForm.setFieldsValue({
        businessCategory: '班级/学期末闲置物资回收',
        targetId: undefined,
        targetName: undefined,
      });
    }
  };

  const handleAddReturnItem = () => {
    setReturnItems((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        goodsId: undefined,
        quantity: 1,
        itemStatus: '完好',
        remark: '',
      },
    ]);
  };

  const handleRemoveReturnItem = (key: string | number) => {
    setReturnItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleReturnGoodsChange = (key: string | number, goodsId: number) => {
    const targetGoods = goodsList.find((g) => g.goodsId === goodsId);
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return {
            ...item,
            goodsId,
            goodsName: targetGoods?.goodsName || '',
            spec: targetGoods?.spec || '-',
            unit: targetGoods?.unit || '件',
            stockNum: targetGoods?.stockNum ?? 0,
          };
        }
        return item;
      })
    );
  };

  const handleReturnQuantityChange = (key: string | number, quantity: number | null) => {
    const q = quantity && quantity > 0 ? quantity : 1;
    setReturnItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: q } : item))
    );
  };

  const handleReturnStatusChange = (key: string | number, itemStatus: string) => {
    setReturnItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, itemStatus } : item))
    );
  };

  const handleSubmitReturn = async () => {
    try {
      const values = await returnForm.validateFields();
      const validItems = returnItems.filter((i) => i.goodsId);
      if (validItems.length === 0) {
        message.warning('请至少添加一种回收物资！');
        return;
      }

      setReturnSubmitting(true);
      await returnMaterial({
        ...values,
        imageUrl: returnImageUrl,
        itemList: validItems.map((i) => ({
          goodsId: i.goodsId,
          goodsName: i.goodsName,
          spec: i.spec,
          unit: i.unit,
          quantity: i.quantity,
          itemStatus: i.itemStatus || '完好',
          remark: i.remark,
        })),
      });

      message.success('物资回收登记成功！完好物资已自动累加回库存');
      resetReturnForm();
      refreshStats();
      actionRef.current?.reload();
      setActiveTab('ledger');
    } catch (e: any) {
      message.error(e.message || '物资回收登记失败');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // 台账与撤销
  // ----------------------------------------------------
  const handleViewDetail = async (record: any) => {
    try {
      const res: any = await getMaterialRecord(record.recordId);
      setCurrentRecord(res?.data || record);
    } catch {
      setCurrentRecord(record);
    }
    setDetailOpen(true);
  };

  const handleCancelRecord = async (record: any) => {
    try {
      await cancelMaterialRecord(record.recordId);
      message.success('领退单撤销成功！对应物品库存已全额自动回滚返还');
      refreshStats();
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '撤销失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '流水单号',
      dataIndex: 'recordNo',
      width: 140,
      render: (text: any, record: any) => (
        <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: '业务类型',
      dataIndex: 'recordType',
      width: 110,
      valueType: 'select',
      valueEnum: {
        '1': { text: '发放领取', status: 'Processing' },
        '2': { text: '退还回收', status: 'Success' },
      },
      render: (_, record) => (
        <Tag
          color={record.recordType === '1' ? 'blue' : 'green'}
          icon={record.recordType === '1' ? <SendOutlined /> : <InboxOutlined />}
          style={{ borderRadius: 10, fontWeight: 500 }}
        >
          {record.recordType === '1' ? '物资发放' : '物资回收'}
        </Tag>
      ),
    },
    {
      title: '业务场景',
      dataIndex: 'businessCategory',
      width: 170,
      render: (text) => <Tag color="default">{text || '-'}</Tag>,
    },
    {
      title: '领退对象',
      dataIndex: 'targetName',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Text strong>{record.targetName}</Text>
          <Tag color={record.targetType === '1' ? 'cyan' : record.targetType === '2' ? 'orange' : 'purple'}>
            {record.targetType === '1'
              ? '教师'
              : record.targetType === '2'
              ? '学生'
              : record.targetType === '3'
              ? '班级'
              : '部门'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '所属班级/年级',
      width: 140,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {record.className || record.grade || '-'}
          {record.subject && record.subject !== '通用' ? ` · ${record.subject}` : ''}
        </Text>
      ),
    },
    {
      title: '申领物资套装',
      dataIndex: 'kitName',
      width: 180,
      ellipsis: true,
      render: (text) =>
        text ? (
          <Tag color="geekblue" icon={<ThunderboltOutlined />}>
            {text}
          </Tag>
        ) : (
          <Text type="secondary">散件/零星领用</Text>
        ),
    },
    {
      title: '总数量',
      dataIndex: 'totalQuantity',
      width: 90,
      search: false,
      render: (val, record) => (
        <Text
          strong
          style={{
            color: record.recordType === '1' ? '#1677ff' : '#52c41a',
            fontSize: 14,
          }}
        >
          {record.recordType === '1' ? `-${val}` : `+${val}`}
        </Text>
      ),
    },
    {
      title: '实物凭证',
      dataIndex: 'imageUrl',
      width: 90,
      search: false,
      render: (url: any) =>
        url ? (
          <Image
            src={url}
            width={38}
            height={38}
            style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
            preview={{ mask: <EyeOutlined style={{ fontSize: 12 }} /> }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            无照片
          </Text>
        ),
    },
    {
      title: '经办教务人员',
      dataIndex: 'operator',
      width: 110,
    },
    {
      title: '经办时间',
      dataIndex: 'operateTime',
      width: 150,
      valueType: 'dateTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        '0': { text: '正常', status: 'Success' },
        '1': { text: '已撤销', status: 'Error' },
      },
      render: (_, record) => (
        <Badge
          status={record.status === '0' ? 'success' : 'default'}
          text={record.status === '0' ? '正常' : '已撤销'}
        />
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === '0' && (
            <Authorized permission="edu:material:edit">
              <Popconfirm
                title="确定要撤销作废该领退单吗？"
                description="撤销后将自动把对应扣减/增加的物品库存原路全额回滚！"
                onConfirm={() => handleCancelRecord(record)}
                okText="确定撤销"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<RollbackOutlined />}>
                  撤销
                </Button>
              </Popconfirm>
            </Authorized>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '教务日常物资领退工作台',
        subTitle:
          '教务日常物资服务中心：既支持老师随到随领一盒粉笔、笔芯、板擦等零碎物资快速出库；也支持新教师入职领全套办公用品、学生选科领全套课本教材成套发放；并支持离职物资交接与退书回收，账实全链打通',
        extra: [
          <Button
            key="report"
            type="primary"
            icon={<BarChartOutlined />}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            onClick={() => navigate('/edu/material/report')}
          >
            📊 物资领退统计报表
          </Button>,
        ],
      }}
    >
      {/* 顶部教务统计看板 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: '#f0f5ff', borderRadius: 8 }}>
            <Statistic
              title={<Text strong style={{ color: '#1677ff' }}>今日发放出库</Text>}
              value={stats.todayGrantCount || 0}
              suffix={`单 (${stats.todayGrantQuantity || 0} 件)`}
              prefix={<SendOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: '#f6ffed', borderRadius: 8 }}>
            <Statistic
              title={<Text strong style={{ color: '#52c41a' }}>今日退还回收</Text>}
              value={stats.todayReturnCount || 0}
              suffix={`单 (${stats.todayReturnQuantity || 0} 件)`}
              prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: '#e6fffb', borderRadius: 8 }}>
            <Statistic
              title={<Text strong style={{ color: '#13c2c2' }}>累计领用教师</Text>}
              value={stats.totalTeacherCount || 0}
              suffix="位老师"
              prefix={<ToolOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bordered={false} style={{ background: '#fff7e6', borderRadius: 8 }}>
            <Statistic
              title={<Text strong style={{ color: '#fa8c16' }}>累计领书学生</Text>}
              value={stats.totalStudentCount || 0}
              suffix="人次"
              prefix={<BookOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 核心工作台 Tabs */}
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: 'grant',
              label: (
                <Space>
                  <SendOutlined style={{ color: '#1677ff' }} />
                  <span>物资领取发放（日常零星 / 成套申领）</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  {/* 模式切换卡片 */}
                  <Card
                    size="small"
                    style={{
                      marginBottom: 16,
                      background: claimMode === 'quick' ? '#f0f5ff' : '#fff7e6',
                      borderColor: claimMode === 'quick' ? '#91caff' : '#ffd591',
                    }}
                  >
                    <Row align="middle" justify="space-between">
                      <Col>
                        <Space size={16} align="center">
                          <Text strong style={{ fontSize: 15 }}>
                            选择申领模式：
                          </Text>
                          <Radio.Group
                            value={claimMode}
                            onChange={(e) => handleClaimModeChange(e.target.value)}
                            buttonStyle="solid"
                            size="middle"
                          >
                            <Radio.Button value="quick">
                              <Space>
                                <ShoppingOutlined />
                                <span>日常零星物资申领（领粉笔、板擦、笔芯等散件）</span>
                              </Space>
                            </Radio.Button>
                            <Radio.Button value="kit">
                              <Space>
                                <ThunderboltOutlined />
                                <span>成套物资批量申领（新入职办公套件、选科全套教材）</span>
                              </Space>
                            </Radio.Button>
                          </Radio.Group>
                        </Space>
                      </Col>
                      <Col>
                        {claimMode === 'quick' ? (
                          <Tag color="processing">⚡ 极速出库模式：点选常用物资一秒加入，秒级发放</Tag>
                        ) : (
                          <Tag color="warning">📦 套装模式：一键带出预设整套物资清单，支持增减微调</Tag>
                        )}
                      </Col>
                    </Row>
                  </Card>

                  {/* 针对日常零星散件模式的高频物资快捷点选栏 */}
                  {claimMode === 'quick' && (
                    <Card
                      size="small"
                      title={
                        <Space>
                          <FireOutlined style={{ color: '#ff4d4f' }} />
                          <Text strong>教务高频常用物资 · 快捷点选加单</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            （点击下方标签直接加入领用清单，再次点击数量累加）
                          </Text>
                        </Space>
                      }
                      extra={
                        <Button
                          type="link"
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={handleOpenConfigFrequent}
                        >
                          自定义常用物资
                        </Button>
                      }
                      style={{ marginBottom: 16, background: '#fafafa' }}
                    >
                      <Space wrap size={[8, 8]}>
                        {frequentItems.map((item, idx) => (
                          <Button
                            key={item.goodsId || `${item.name}_${idx}`}
                            size="middle"
                            onClick={() => handleQuickAddGoods(item)}
                            style={{
                              borderRadius: 16,
                              borderColor: '#d9d9d9',
                              padding: '0 12px',
                            }}
                          >
                            <span>{item.icon || '📌'}</span>
                            <span style={{ fontWeight: 500, marginLeft: 4 }}>{item.name}</span>
                          </Button>
                        ))}
                      </Space>
                    </Card>
                  )}

                  <Form form={grantForm} layout="vertical">
                    {/* 隐藏表单项，确保提交时完整包含套装ID、套装名称、年级与班级 */}
                    <Form.Item name="kitId" hidden><Input /></Form.Item>
                    <Form.Item name="kitName" hidden><Input /></Form.Item>
                    <Form.Item name="className" hidden><Input /></Form.Item>
                    <Form.Item name="grade" hidden><Input /></Form.Item>

                    {/* 第一部分：领用人与场景 */}
                    <Card
                      title={
                        <Space>
                          <UserOutlined style={{ color: '#1677ff' }} />
                          <Text strong>1. 领用人员与业务场景</Text>
                        </Space>
                      }
                      size="small"
                      style={{ marginBottom: 16, background: '#fafafa' }}
                    >
                      <Row gutter={16}>
                        <Col span={7}>
                          <Form.Item
                            label="领用对象类型"
                            name="targetType"
                            rules={[{ required: true }]}
                          >
                            <Radio.Group
                              buttonStyle="solid"
                              onChange={(e) => handleGrantTargetTypeChange(e.target.value)}
                            >
                              <Radio.Button value="1">教师个人</Radio.Button>
                              <Radio.Button value="3">班级公用</Radio.Button>
                              <Radio.Button value="2">学生个人</Radio.Button>
                              <Radio.Button value="4">教研组/部门</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>

                        {/* 教师场景 */}
                        {grantTargetType === '1' && (
                          <>
                            <Col span={6}>
                              <Form.Item
                                label="选择领用教师"
                                name="targetId"
                                rules={[{ required: true, message: '请选择领用教师' }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="搜索教师姓名或学科..."
                                  optionFilterProp="label"
                                  onChange={handleTeacherSelect}
                                  options={teacherList.map((t) => ({
                                    label: `${t.teacherName} (${t.subject || '教师'} · ${t.grade || '高中'})`,
                                    value: t.teacherId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="教师姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入教师姓名' }]}
                              >
                                <Input placeholder="教师姓名" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item label="学科 / 教研组" name="subject">
                                <Input placeholder="如：数学组、物理组" />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {/* 班级公用场景（最常领粉笔、黑板擦、扫除用具等） */}
                        {grantTargetType === '3' && (
                          <>
                            <Col span={6}>
                              <Form.Item
                                label="选择领用班级"
                                name="classId"
                                rules={[{ required: true, message: '请选择班级' }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="选择班级..."
                                  optionFilterProp="label"
                                  onChange={handleClassSelect}
                                  options={classList.map((c) => ({
                                    label: `${c.className} (${c.grade || ''})`,
                                    value: c.classId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="经办代表姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入经办代表姓名' }]}
                              >
                                <Input placeholder="如：班长李华、值日班长" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item label="所属年级" name="grade">
                                <Input placeholder="如：高三年级" />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {/* 学生场景 */}
                        {grantTargetType === '2' && (
                          <>
                            <Col span={6}>
                              <Form.Item
                                label="选择所属班级"
                                name="classId"
                                rules={[{ required: true, message: '请选择班级' }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="选择班级..."
                                  optionFilterProp="label"
                                  onChange={handleClassSelect}
                                  options={classList.map((c) => ({
                                    label: `${c.className} (${c.grade || ''})`,
                                    value: c.classId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="学生姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入学生姓名' }]}
                              >
                                <Input placeholder="如：张三、李四" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item label="选科/培养方向" name="subject">
                                <Select placeholder="选科方向" allowClear>
                                  <Option value="物理类(物化生)">物理类 (物化生)</Option>
                                  <Option value="历史类(历政地)">历史类 (历政地)</Option>
                                  <Option value="全科通用">全科通用</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {/* 部门/教研组场景 */}
                        {grantTargetType === '4' && (
                          <>
                            <Col span={6}>
                              <Form.Item
                                label="领用部门/教研组"
                                name="targetName"
                                rules={[{ required: true, message: '请输入部门名称' }]}
                              >
                                <Input placeholder="如：语文教研组、高复部年级组" />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item label="经办代表姓名" name="subject">
                                <Input placeholder="经办代表" />
                              </Form.Item>
                            </Col>
                          </>
                        )}
                      </Row>

                      <Row gutter={16}>
                        {claimMode === 'kit' ? (
                          <>
                            <Col span={7}>
                              <Form.Item
                                label="申领物资套装"
                                required
                                tooltip="成套模式下选择指定套装，系统将自动加载该套装预设的全套物资清单与发放数量"
                              >
                                <Select
                                  placeholder="请选择申领物资套装..."
                                  value={selectedKitId}
                                  onChange={(val) => handleApplyKit(val)}
                                  allowClear
                                  style={{ width: '100%' }}
                                >
                                  {kitList
                                    .filter((k) =>
                                      grantTargetType === '2'
                                        ? k.targetType === '2'
                                        : k.targetType === '1' || k.targetType === '3'
                                    )
                                    .map((k) => (
                                      <Option key={k.kitId} value={k.kitId}>
                                        <Space>
                                          <Tag color={k.targetType === '1' ? 'blue' : k.targetType === '2' ? 'green' : 'purple'}>
                                            {k.targetType === '1' ? '教师套件' : k.targetType === '2' ? '学生教材' : '班级通用'}
                                          </Tag>
                                          <span>{k.kitName}</span>
                                        </Space>
                                      </Option>
                                    ))}
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="业务场景说明"
                                name="businessCategory"
                                rules={[{ required: true, message: '请输入业务场景' }]}
                              >
                                <Input placeholder="自动同步套装名称，如：教师入职教学办公套件" />
                              </Form.Item>
                            </Col>
                          </>
                        ) : (
                          <Col span={7}>
                            <Form.Item
                              label="业务场景"
                              name="businessCategory"
                              rules={[{ required: true, message: '请选择业务场景' }]}
                            >
                              <Select>
                                <Option value="日常教学办公用品领用">日常教学办公用品领用</Option>
                                <Option value="班级日常教学耗材申领(粉笔/纸张等)">班级日常教学耗材申领(粉笔/纸张等)</Option>
                                <Option value="学期初教研耗材集中申领">学期初教研耗材集中申领</Option>
                                <Option value="教研组/部门公用物资领用">教研组/部门公用物资领用</Option>
                                <Option value="其他临时领用">其他临时领用</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        )}
                        <Col span={claimMode === 'kit' ? 4 : 5}>
                          <Form.Item label="经办教务人员" name="operator">
                            <Input placeholder="经办教务" />
                          </Form.Item>
                        </Col>
                        <Col span={claimMode === 'kit' ? 4 : 6}>
                          <Form.Item label="经办时间" name="operateTime">
                            <Input placeholder="经办时间" />
                          </Form.Item>
                        </Col>
                        <Col span={claimMode === 'kit' ? 4 : 6}>
                          <Form.Item label="备注说明" name="remark">
                            <Input placeholder="选填，如：开学统一配发、备用" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    {/* 第二部分：领用物资清单 */}
                    <Card
                      title={
                        <Space>
                          <ThunderboltOutlined style={{ color: '#1677ff' }} />
                          <Text strong>
                            {claimMode === 'quick' ? '2. 申领物资清单' : '2. 配发物资清单（随所选套装自动联动）'}
                          </Text>
                        </Space>
                      }
                      extra={
                        claimMode === 'kit' ? (
                          <Space>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              切换物资套装：
                            </Text>
                            <Select
                              placeholder="选择套装一键套用..."
                              style={{ width: 280 }}
                              value={selectedKitId}
                              onChange={(val) => handleApplyKit(val)}
                              allowClear
                            >
                              {kitList
                                .filter((k) =>
                                  grantTargetType === '2'
                                    ? k.targetType === '2'
                                    : k.targetType === '1' || k.targetType === '3'
                                )
                                .map((k) => (
                                  <Option key={k.kitId} value={k.kitId}>
                                    <Space>
                                      <Tag color={k.targetType === '1' ? 'blue' : k.targetType === '2' ? 'green' : 'purple'}>
                                        {k.targetType === '1' ? '教师套件' : k.targetType === '2' ? '学生教材' : '班级通用'}
                                      </Tag>
                                      <span>{k.kitName}</span>
                                    </Space>
                                  </Option>
                                ))}
                            </Select>
                          </Space>
                        ) : (
                          <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={handleAddGrantItem}
                          >
                            + 自选添加一行物资
                          </Button>
                        )
                      }
                      size="small"
                      style={{ marginBottom: 16 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Space>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            已选择发放{' '}
                            <Text strong style={{ color: '#1677ff' }}>
                              {grantItems.filter((i) => i.selected && i.goodsId).length}
                            </Text>{' '}
                            种物资，合计总数量：{' '}
                            <Text strong style={{ color: '#1677ff', fontSize: 16 }}>
                              {grantItems
                                .filter((i) => i.selected && i.goodsId)
                                .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)}{' '}
                              件/盒/本
                            </Text>
                          </Text>
                        </Space>
                        {claimMode === 'kit' && (
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={handleAddGrantItem}
                          >
                            在套装外追加其他单品
                          </Button>
                        )}
                      </div>

                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        dataSource={grantItems}
                        columns={[
                          {
                            title: '勾选发放',
                            dataIndex: 'selected',
                            width: 80,
                            align: 'center',
                            render: (checked: boolean, item: MaterialItemRow) => (
                              <Checkbox
                                checked={checked}
                                onChange={(e) => handleGrantItemToggle(item.key, e.target.checked)}
                              />
                            ),
                          },
                          {
                            title: '物资名称',
                            dataIndex: 'goodsId',
                            width: 320,
                            render: (_, item) => (
                              <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="搜索/选择物资名称或规格..."
                                style={{ width: '100%' }}
                                value={item.goodsId}
                                onChange={(val) => handleGrantGoodsChange(item.key, val)}
                                options={goodsList.map((g) => ({
                                  label: `${g.goodsName} (${g.spec || '-'}) [库存:${g.stockNum ?? 0}${g.unit || ''}]`,
                                  value: g.goodsId,
                                }))}
                              />
                            ),
                          },
                          {
                            title: '规格型号',
                            dataIndex: 'spec',
                            width: 140,
                            render: (_, item) => item.spec || '-',
                          },
                          {
                            title: '当前库存',
                            dataIndex: 'stockNum',
                            width: 100,
                            render: (_, item) => {
                              const num = item.stockNum ?? 0;
                              return (
                                <Text
                                  style={{
                                    color: num > 0 ? '#52c41a' : '#ff4d4f',
                                    fontWeight: 500,
                                  }}
                                >
                                  {num} {item.unit || ''}
                                </Text>
                              );
                            },
                          },
                          {
                            title: '发放数量',
                            dataIndex: 'quantity',
                            width: 140,
                            render: (_, item) => (
                              <InputNumber
                                min={1}
                                max={item.stockNum || 9999}
                                value={item.quantity}
                                onChange={(val) => handleGrantQuantityChange(item.key, val)}
                                addonAfter={item.unit || '件'}
                                style={{ width: '100%' }}
                                disabled={!item.selected}
                              />
                            ),
                          },
                          {
                            title: '配发/领用说明',
                            dataIndex: 'remark',
                            render: (_, item) => (
                              <Input
                                placeholder="选填，如：课堂急用/两周用量/标配"
                                value={item.remark}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGrantItems((prev) =>
                                    prev.map((i) => (i.key === item.key ? { ...i, remark: val } : i))
                                  );
                                }}
                                disabled={!item.selected}
                              />
                            ),
                          },
                          {
                            title: '操作',
                            width: 60,
                            align: 'center',
                            render: (_, item) => (
                              <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveGrantItem(item.key)}
                              />
                            ),
                          },
                        ]}
                      />
                    </Card>

                    {/* 第三部分：实物拍照凭证 */}
                    <Card
                      title={
                        <Space>
                          <FileImageOutlined style={{ color: '#1677ff' }} />
                          <Text strong>3. 现场拍照 / 领用凭证照片留底 (非必填)</Text>
                          <Tag color="cyan">支持拍照上传、拖拽与剪贴板粘贴</Tag>
                        </Space>
                      }
                      size="small"
                      style={{ marginBottom: 16 }}
                    >
                      <Row gutter={16} align="middle">
                        <Col span={10}>
                          <ImageUpload
                            value={grantImageUrl}
                            onChange={(url) => setGrantImageUrl(url)}
                            placeholder="点击上传物资实物照片或签字单据"
                            maxSizeMB={10}
                          />
                        </Col>
                        <Col span={14}>
                          <div style={{ paddingLeft: 12 }}>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>
                              📸 <strong>日常领用拍照建议</strong>：
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>
                              • 成套领取时，可拍摄摆放在桌面的办公套件或教材全套；
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>
                              • 零星领用时（如领粉笔、白板笔），如无需纸质单据可直接留空，此项为<strong>非必填</strong>；
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                              • 照片存档后可在历史台账中随时放大核查。
                            </Paragraph>
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <Space size={16}>
                        <Button size="large" onClick={resetGrantForm}>
                          清空重置
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          icon={<CheckCircleOutlined />}
                          loading={grantSubmitting}
                          onClick={handleSubmitGrant}
                          style={{ minWidth: 180 }}
                        >
                          确认发放出库并归档
                        </Button>
                      </Space>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'recovery',
              label: (
                <Space>
                  <InboxOutlined style={{ color: '#52c41a' }} />
                  <span>物资退还回收（老师离职交接 / 学生退书）</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Alert
                    type="success"
                    showIcon
                    message="教务物资回收说明"
                    description="适用于教师离职收回教学用具（书立、未拆封办公品）、学生退学退书、转学退书，或学期末各班多余闲置物资退还教务处。标记为“完好”的物品将自动累加回物资库存！"
                    style={{ marginBottom: 16 }}
                  />

                  <Form form={returnForm} layout="vertical">
                    {/* 隐藏表单项，确保提交时完整包含年级与班级 */}
                    <Form.Item name="className" hidden><Input /></Form.Item>
                    <Form.Item name="grade" hidden><Input /></Form.Item>

                    {/* 归还人员与业务场景 */}
                    <Card
                      title={
                        <Space>
                          <UserOutlined style={{ color: '#52c41a' }} />
                          <Text strong>1. 归还人员与业务场景</Text>
                        </Space>
                      }
                      size="small"
                      style={{ marginBottom: 16, background: '#fafafa' }}
                    >
                      <Row gutter={16}>
                        <Col span={7}>
                          <Form.Item
                            label="归还对象类型"
                            name="targetType"
                            rules={[{ required: true }]}
                          >
                            <Radio.Group
                              buttonStyle="solid"
                              onChange={(e) => handleReturnTargetTypeChange(e.target.value)}
                            >
                              <Radio.Button value="1">教师离职交接</Radio.Button>
                              <Radio.Button value="2">学生退书回收</Radio.Button>
                              <Radio.Button value="3">班级闲置退库</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>

                        {/* 教师场景 */}
                        {returnTargetType === '1' && (
                          <>
                            <Col span={6}>
                              <Form.Item label="选择归还教师" name="targetId">
                                <Select
                                  showSearch
                                  placeholder="搜索教师姓名..."
                                  optionFilterProp="label"
                                  onChange={(val) => {
                                    const tea = teacherList.find((t) => t.teacherId === val);
                                    if (tea) {
                                      returnForm.setFieldsValue({
                                        targetName: tea.teacherName,
                                        grade: tea.grade || '通用',
                                        subject: tea.subject || '通用',
                                      });
                                    }
                                  }}
                                  options={teacherList.map((t) => ({
                                    label: `${t.teacherName} (${t.subject || '教师'})`,
                                    value: t.teacherId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="教师姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入教师姓名' }]}
                              >
                                <Input placeholder="教师姓名" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item label="学科 / 教研组" name="subject">
                                <Input placeholder="如：高中语文教研组" />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {/* 学生退书场景 */}
                        {returnTargetType === '2' && (
                          <>
                            <Col span={6}>
                              <Form.Item label="选择所属班级" name="classId">
                                <Select
                                  showSearch
                                  placeholder="选择班级..."
                                  optionFilterProp="label"
                                  onChange={(val) => {
                                    const cl = classList.find((c) => c.classId === val);
                                    if (cl) {
                                      returnForm.setFieldsValue({
                                        className: cl.className,
                                        grade: cl.grade,
                                      });
                                    }
                                  }}
                                  options={classList.map((c) => ({
                                    label: `${c.className} (${c.grade || ''})`,
                                    value: c.classId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="学生姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入学生姓名' }]}
                              >
                                <Input placeholder="如：李明" />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {/* 班级闲置退库 */}
                        {returnTargetType === '3' && (
                          <>
                            <Col span={6}>
                              <Form.Item
                                label="选择归还班级"
                                name="classId"
                                rules={[{ required: true, message: '请选择归还班级' }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="选择班级..."
                                  optionFilterProp="label"
                                  onChange={(val) => {
                                    const cl = classList.find((c) => c.classId === val);
                                    if (cl) {
                                      returnForm.setFieldsValue({
                                        className: cl.className,
                                        grade: cl.grade,
                                        targetName: cl.className,
                                      });
                                    }
                                  }}
                                  options={classList.map((c) => ({
                                    label: `${c.className} (${c.grade || ''})`,
                                    value: c.classId,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                label="经办代表姓名"
                                name="targetName"
                                rules={[{ required: true, message: '请输入经手人/班级代表姓名' }]}
                              >
                                <Input placeholder="经手人/班级代表" />
                              </Form.Item>
                            </Col>
                          </>
                        )}
                      </Row>

                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item
                            label="业务场景"
                            name="businessCategory"
                            rules={[{ required: true, message: '请选择业务场景' }]}
                          >
                            <Select>
                              <Option value="教师离职交接物资收回">教师离职交接物资收回</Option>
                              <Option value="学生退学/转学退书回收">学生退学/转学退书回收</Option>
                              <Option value="高三毕业教材交接">高三毕业教材交接</Option>
                              <Option value="学期末闲置物资收回">学期末闲置物资收回</Option>
                              <Option value="其他物资回收入库">其他物资回收入库</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="经办教务人员" name="operator">
                            <Input placeholder="经办教务" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="经办时间" name="operateTime">
                            <Input placeholder="经办时间" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="备注说明" name="remark">
                            <Input placeholder="如：教师离职交接退回书立、多余文具" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    {/* 回收物资清单 */}
                    <Card
                      title={
                        <Space>
                          <InboxOutlined style={{ color: '#52c41a' }} />
                          <Text strong>2. 回收物资清单与品相核对</Text>
                        </Space>
                      }
                      extra={
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleAddReturnItem}
                        >
                          + 添加一行物资
                        </Button>
                      }
                      size="small"
                      style={{ marginBottom: 16 }}
                    >
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        dataSource={returnItems}
                        columns={[
                          {
                            title: '物资名称',
                            dataIndex: 'goodsId',
                            width: 320,
                            render: (_, item) => (
                              <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="搜索/选择物资名称或规格..."
                                style={{ width: '100%' }}
                                value={item.goodsId}
                                onChange={(val) => handleReturnGoodsChange(item.key, val)}
                                options={goodsList.map((g) => ({
                                  label: `${g.goodsName} (${g.spec || '-'}) [当前库存:${g.stockNum ?? 0}${g.unit || ''}]`,
                                  value: g.goodsId,
                                }))}
                              />
                            ),
                          },
                          {
                            title: '规格型号',
                            dataIndex: 'spec',
                            width: 140,
                            render: (_, item) => item.spec || '-',
                          },
                          {
                            title: '当前库存',
                            dataIndex: 'stockNum',
                            width: 100,
                            render: (_, item) => {
                              const num = item.stockNum ?? 0;
                              return (
                                <Text
                                  style={{
                                    color: num > 0 ? '#52c41a' : '#ff4d4f',
                                    fontWeight: 500,
                                  }}
                                >
                                  {num} {item.unit || ''}
                                </Text>
                              );
                            },
                          },
                          {
                            title: '回收数量',
                            dataIndex: 'quantity',
                            width: 140,
                            render: (_, item) => (
                              <InputNumber
                                min={1}
                                max={9999}
                                value={item.quantity}
                                onChange={(val) => handleReturnQuantityChange(item.key, val)}
                                addonAfter={item.unit || '件'}
                                style={{ width: '100%' }}
                              />
                            ),
                          },
                          {
                            title: '物品品相状态',
                            dataIndex: 'itemStatus',
                            width: 180,
                            render: (_, item) => (
                              <Select
                                value={item.itemStatus || '完好'}
                                onChange={(val) => handleReturnStatusChange(item.key, val)}
                                style={{ width: '100%' }}
                              >
                                <Option value="完好">
                                  <Tag color="success">完好可二次使用 (入库)</Tag>
                                </Option>
                                <Option value="轻微磨损">
                                  <Tag color="cyan">轻微磨损可备用 (入库)</Tag>
                                </Option>
                                <Option value="损坏报损">
                                  <Tag color="error">损坏报废 (不加可用库存)</Tag>
                                </Option>
                              </Select>
                            ),
                          },
                          {
                            title: '配发/领用说明',
                            dataIndex: 'remark',
                            render: (_, item) => (
                              <Input
                                placeholder="品相说明/归还备注"
                                value={item.remark}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReturnItems((prev) =>
                                    prev.map((i) => (i.key === item.key ? { ...i, remark: val } : i))
                                  );
                                }}
                              />
                            ),
                          },
                          {
                            title: '操作',
                            width: 60,
                            align: 'center',
                            render: (_, item) => (
                              <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveReturnItem(item.key)}
                              />
                            ),
                          },
                        ]}
                      />
                    </Card>

                    {/* 回收现场照片留存 */}
                    <Card
                      title={
                        <Space>
                          <FileImageOutlined style={{ color: '#52c41a' }} />
                          <Text strong>3. 现场拍照 / 验货交接照片留底 (非必填)</Text>
                        </Space>
                      }
                      size="small"
                      style={{ marginBottom: 16 }}
                    >
                      <Row gutter={16} align="middle">
                        <Col span={10}>
                          <ImageUpload
                            value={returnImageUrl}
                            onChange={(url) => setReturnImageUrl(url)}
                            placeholder="点击上传退还物资验货照片或交接单"
                            maxSizeMB={10}
                          />
                        </Col>
                        <Col span={14}>
                          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>
                            • 教师离职时，可将交接的书立、工卡等摆放拍照存档；
                          </Paragraph>
                          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                            • 学生退书时，可拍照核验教材有无破损涂画；完好物品将自动计入可用库存。
                          </Paragraph>
                        </Col>
                      </Row>
                    </Card>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <Space size={16}>
                        <Button size="large" onClick={resetReturnForm}>
                          重置表单
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          icon={<CheckCircleOutlined />}
                          loading={returnSubmitting}
                          onClick={handleSubmitReturn}
                          style={{ minWidth: 180, background: '#52c41a', borderColor: '#52c41a' }}
                        >
                          确认回收入库并归档
                        </Button>
                      </Space>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'ledger',
              label: (
                <Space>
                  <HistoryOutlined style={{ color: '#722ed1' }} />
                  <span>领退综合台账与记录流水</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <ProTable
                    actionRef={actionRef}
                    rowKey="recordId"
                    columns={columns}
                    scroll={{ x: 'max-content' }}
                    request={async (params) => {
          try {
            const res: any = await listMaterialRecord({
                        ...params,
                        pageNum: params.current,
                        pageSize: params.pageSize,
                      });
                      return {
                        data: res.rows || [],
                        success: true,
                        total: res.total || 0,
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
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          actionRef.current?.reload();
                          refreshStats();
                        }}
                      >
                        刷新数据
                      </Button>,
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 领退详情 Modal */}
      <Modal
        title={
          <Space>
            {currentRecord?.recordType === '1' ? (
              <SendOutlined style={{ color: '#1677ff' }} />
            ) : (
              <InboxOutlined style={{ color: '#52c41a' }} />
            )}
            <span>
              {currentRecord?.recordType === '1' ? '物资发放流水详情' : '物资退还回收详情'} -{' '}
              {currentRecord?.recordNo}
            </span>
          </Space>
        }
        open={detailOpen}
        width={720}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="流水单号">
                <Text strong>{currentRecord.recordNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                <Tag color={currentRecord.recordType === '1' ? 'blue' : 'green'}>
                  {currentRecord.recordType === '1' ? '物资发放领取' : '物资退还回收'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="领退对象">
                <Space>
                  <Text strong>{currentRecord.targetName}</Text>
                  <Tag color="cyan">
                    {currentRecord.targetType === '1'
                      ? '教师'
                      : currentRecord.targetType === '2'
                      ? '学生'
                      : currentRecord.targetType === '3'
                      ? '班级'
                      : '部门'}
                  </Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="关联班级/年级">
                {currentRecord.className || currentRecord.grade || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="业务场景">
                {currentRecord.businessCategory || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="申领物资套装">
                {currentRecord.kitName || '散件/零星领用'}
              </Descriptions.Item>
              <Descriptions.Item label="总数量">
                <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                  {currentRecord.totalQuantity} 件/盒/本
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={currentRecord.status === '0' ? 'success' : 'default'}
                  text={currentRecord.status === '0' ? '正常有效' : '已撤销作废'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="经办教务人员">
                {currentRecord.operator || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="经办时间">
                {currentRecord.operateTime || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注说明" span={2}>
                {currentRecord.remark || '无'}
              </Descriptions.Item>
            </Descriptions>

            {/* 实物拍照凭证 */}
            {currentRecord.imageUrl && (
              <Card size="small" title="现场拍照凭证" style={{ marginBottom: 16 }}>
                <Image
                  src={currentRecord.imageUrl}
                  width={140}
                  height={140}
                  style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                />
              </Card>
            )}

            <Divider titlePlacement="start" style={{ margin: '12px 0' }}>
              <Space>
                <Text strong>物资明细清单</Text>
                <Tag color="blue">{currentRecord.itemList?.length || 0} 样物品</Tag>
              </Space>
            </Divider>

            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={currentRecord.itemList || []}
              rowKey={(r: any) => r.itemId || r.goodsId}
              columns={[
                {
                  title: '序号',
                  width: 55,
                  render: (_: any, __: any, idx: number) => idx + 1,
                },
                {
                  title: '物资名称',
                  dataIndex: 'goodsName',
                  render: (text: string) => <Text strong>{text}</Text>,
                },
                {
                  title: '规格型号',
                  dataIndex: 'spec',
                  render: (text: string) => text || '-',
                },
                {
                  title: '数量',
                  dataIndex: 'quantity',
                  width: 90,
                  render: (val: number, row: any) => (
                    <Text strong style={{ color: '#1677ff' }}>
                      {val} {row.unit || '件'}
                    </Text>
                  ),
                },
                {
                  title: '物品品相状态',
                  dataIndex: 'itemStatus',
                  width: 120,
                  render: (status: string) => (
                    <Tag color={status === '损坏报损' ? 'error' : 'success'}>
                      {status || '完好'}
                    </Tag>
                  ),
                },
                {
                  title: '配发/领用说明',
                  dataIndex: 'remark',
                  render: (text: string) => text || '-',
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 自定义教务高频常用物资 Modal */}
      <Modal
        title={
          <Space>
            <SettingOutlined style={{ color: '#1677ff' }} />
            <span>自定义教务高频常用物资标签</span>
          </Space>
        }
        open={configFrequentOpen}
        onCancel={() => setConfigFrequentOpen(false)}
        width={620}
        footer={[
          <Button key="reset" onClick={handleResetDefaultFrequent}>
            恢复默认推荐
          </Button>,
          <Button key="cancel" onClick={() => setConfigFrequentOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveFrequentConfig}>
            保存常用配置
          </Button>,
        ]}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          在此处挑选您所在学校或教务处最常领用的物资耗材。保存后将自动呈现在“快捷点选加单”区域，方便日常一键点选！
        </Paragraph>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          placeholder="请搜索并选择高频常用物资（支持多选）..."
          style={{ width: '100%' }}
          value={selectedFrequentGoodsIds}
          onChange={(vals) => setSelectedFrequentGoodsIds(vals)}
          options={goodsList.map((g) => ({
            label: `${g.goodsName} (${g.spec || '-'}) [库存:${g.stockNum ?? 0}${g.unit || ''}]`,
            value: g.goodsId,
          }))}
        />
      </Modal>
    </PageContainer>
  );
};

export default EduMaterialPage;
