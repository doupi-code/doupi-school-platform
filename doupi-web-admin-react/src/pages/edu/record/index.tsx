import React, { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
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
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  CameraOutlined,
  MessageOutlined,
  DownloadOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  EditOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import Authorized from '@/components/Authorized';
import DraftNoticeAlert from '@/components/DraftNoticeAlert';
import ImageUpload from '@/components/ImageUpload';
import FileUpload from '@/components/FileUpload';
import { useUserStore } from '@/store/useUserStore';
import { FormDraftUtil } from '@/utils/formDraft';
import {
  listRecord,
  getRecord,
  addRecord,
  updateRecord,
  delRecord,
  cancelRecord,
  completeRecord,
  textParse,
  ocrParse,
  uploadFile,
} from '@/api/edu/record';
import { listTeacher } from '@/api/edu/teacher';
import { listClass } from '@/api/edu/class';
import { listGoods } from '@/api/stock/goods';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const PrintRecordPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const { name: currentUserName, nickName: currentNickName } = useUserStore();
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增印刷登记');
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 详情与出库单弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<any>(null);

  // 微信文本解析与OCR弹窗
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsingText, setParsingText] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // 微信智能识别 / OCR 解析与跨天多任务队列
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);

  // 当前选中的队列任务
  const currentQueueTask = React.useMemo(() => {
    if (ocrResult?.taskList && ocrResult.taskList.length > 0) {
      return ocrResult.taskList[currentTaskIndex] || ocrResult.taskList[0];
    }
    return null;
  }, [ocrResult, currentTaskIndex]);

  // 是否还有后续未登记任务
  const hasNextUnregisteredTask = React.useMemo(() => {
    if (!ocrResult?.taskList || ocrResult.taskList.length <= 1) return false;
    for (let i = currentTaskIndex + 1; i < ocrResult.taskList.length; i++) {
      if (!ocrResult.taskList[i].alreadyRegistered) return true;
    }
    for (let i = 0; i < currentTaskIndex; i++) {
      if (!ocrResult.taskList[i].alreadyRegistered) return true;
    }
    return false;
  }, [ocrResult, currentTaskIndex]);

  // 是否所有任务都已登记
  const allTasksRegistered = React.useMemo(() => {
    if (!ocrResult?.taskList || ocrResult.taskList.length === 0) return false;
    return ocrResult.taskList.every((t: any) => t.alreadyRegistered);
  }, [ocrResult]);

  // 基础数据下拉选项
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [paperGoodsList, setPaperGoodsList] = useState<any[]>([]);

  // 动态联动状态
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [previewTotalSheets, setPreviewTotalSheets] = useState(50);

  // 追踪当前选中的关联用纸物品，用于动态换算库存与耗纸量
  const watchedPaperGoodsId = Form.useWatch('paperGoodsId', form);
  const currentPaperGoods = React.useMemo(() => {
    if (watchedPaperGoodsId == null) return undefined;
    return paperGoodsList.find((g) => String(g.goodsId) === String(watchedPaperGoodsId));
  }, [watchedPaperGoodsId, paperGoodsList]);
  // 当前纸张的包装换算率（1 包装 = rate 张），默认 500 兜底
  const currentPaperRate = React.useMemo(() => {
    const rate = Number(currentPaperGoods?.conversionRate);
    return rate > 0 ? rate : 500;
  }, [currentPaperGoods]);
  // 当前纸张折合可用基本单位（张）总量
  const currentPaperStockSheets = React.useMemo(() => {
    const stock = Number(currentPaperGoods?.stockNum ?? 0);
    const remain = Number(currentPaperGoods?.remainSheets ?? 0);
    return currentPaperGoods ? stock * currentPaperRate + remain : 0;
  }, [currentPaperGoods, currentPaperRate]);

  // 文印经办人下拉选项（优先当前登录人，整合教师花名册）
  const operatorOptions = React.useMemo(() => {
    const options: { label: string; value: string }[] = [];
    const currentName = currentNickName || currentUserName || '文印经办人';
    options.push({ label: `${currentName} (当前经办)`, value: currentName });

    (teacherList || []).forEach((t: any) => {
      const name = t.teacherName || t.name;
      if (name && !options.some((o) => o.value === name)) {
        options.push({
          label: t.deptName ? `${name} (${t.deptName})` : name,
          value: name,
        });
      }
    });

    return options;
  }, [teacherList, currentUserName, currentNickName]);

  // 智能根据纸张规格寻找匹配的库存耗材物品
  const findGoodsByPaperType = (type: string, list: any[]) => {
    const paperList = list && list.length > 0 ? list : paperGoodsList;
    if (!paperList || paperList.length === 0) return undefined;
    const cleanType = (type || 'A4').trim().toUpperCase();
    const matched = paperList.find((g) => {
      const name = (g.goodsName || '').toUpperCase();
      const spec = (g.spec || '').toUpperCase();
      return name.includes(cleanType) || spec.includes(cleanType);
    });
    return matched ? matched.goodsId : paperList[0]?.goodsId;
  };

  // 加载教师、班级与纸张耗材列表
  const loadBaseData = async () => {
    try {
      const [tRes, cRes, gRes]: any = await Promise.allSettled([
        listTeacher({ pageSize: 200 }),
        listClass({ pageSize: 200 }),
        listGoods({ pageSize: 200 }),
      ]);
      if (tRes.status === 'fulfilled' && tRes.value?.rows) {
        setTeacherList(tRes.value.rows);
      }
      if (cRes.status === 'fulfilled' && cRes.value?.rows) {
        setClassList(cRes.value.rows);
      }
      if (gRes.status === 'fulfilled' && gRes.value?.rows) {
        const allGoods = gRes.value.rows || [];
        const paperItems = allGoods.filter((g: any) => {
          const name = g.goodsName || '';
          const spec = g.spec || '';
          const isPaperNameOrSpec = /A4|A3|8K|16K|复印纸|试卷纸|练习纸|用纸|印刷纸|版纸/i.test(name) || /A4|A3|8K|16K/i.test(spec);
          const isStationery = /笔|墨|尺|橡皮|胶/i.test(name);
          return isPaperNameOrSpec && !isStationery;
        });
        const finalList = paperItems.length > 0 ? paperItems : allGoods;
        setPaperGoodsList(finalList);
        return { teacherList: tRes.value?.rows || [], classList: cRes.value?.rows || [], paperGoodsList: finalList };
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 监听纸张规格切换，联动自动选择匹配的用纸耗材
  const handlePaperTypeChange = (paperType: string) => {
    const matchedId = findGoodsByPaperType(paperType, paperGoodsList);
    if (matchedId) {
      form.setFieldsValue({ paperGoodsId: matchedId });
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // 计算预计耗纸张数
  const calculateTotalSheets = (count: number, pages: number, side: string) => {
    const p = Number(pages) || 1;
    const c = Number(count) || 0;
    if (side === '2') {
      return c * Math.ceil(p / 2);
    }
    return c * p;
  };

  // 试卷与答案合并拆分模式状态
  const [splitAnswer, setSplitAnswer] = useState<boolean>(false);
  const [answerPageCount, setAnswerPageCount] = useState<number>(1);
  const [answerPrintCount, setAnswerPrintCount] = useState<number>(2);
  const [answerPrintSide, setAnswerPrintSide] = useState<string>('1');

  // 统一动态计算总耗纸张数（支持普通单份录入与试卷答案合并拆分录入）
  const computePreviewSheets = (values: any, isSplit: boolean) => {
    if (isSplit) {
      const totalPageCount = Number(values?.pageCount) || 1;
      const ansPage = Math.min(Math.max(1, Number(values?.answerPageCount) || 1), Math.max(1, totalPageCount - 1));
      const examPage = Math.max(1, totalPageCount - ansPage);
      const examSheets = calculateTotalSheets(
        values?.printCount || 0,
        examPage,
        values?.printSide || '1'
      );
      const ansSheets = calculateTotalSheets(
        values?.answerPrintCount || 0,
        ansPage,
        values?.answerPrintSide || '1'
      );
      return examSheets + ansSheets;
    }
    return calculateTotalSheets(
      values?.printCount || 0,
      values?.pageCount || 1,
      values?.printSide || '1'
    );
  };

  // 智能识别文本中是否包含试卷与答案合并的信息
  const detectSplitAnswerInfo = (text: string, totalPages: number) => {
    if (!text) return null;
    const ansPageMatch = text.match(/(?:其中|含|包含)?(?:参考)?答案\s*([0-9]{1,2}|[一两二三四五])\s*页/);
    const lastPageMatch = text.match(/(?:最后一页|末页)(?:是|为)?(?:参考)?答案/);

    let detectedAnsPage = 1;
    let isDetected = false;

    if (lastPageMatch) {
      detectedAnsPage = 1;
      isDetected = true;
    } else if (ansPageMatch) {
      const numMap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5 };
      detectedAnsPage = numMap[ansPageMatch[1]] || parseInt(ansPageMatch[1], 10) || 1;
      isDetected = true;
    }

    const ansCountMatch = text.match(/(?:参考)?答案\s*(?:打|印|需要|共)?\s*([0-9]{1,4}|[一两二三四五])\s*(?:份|分)/);
    let detectedAnsCount = 2; // 默认教师备课2份
    if (ansCountMatch) {
      const numMap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5 };
      detectedAnsCount = numMap[ansCountMatch[1]] || parseInt(ansCountMatch[1], 10) || 2;
    }

    let detectedAnsSide = '1';
    if (text.includes('答案双面') || text.includes('答案两面')) {
      detectedAnsSide = '2';
    }

    if (isDetected && totalPages > detectedAnsPage) {
      return {
        splitAnswer: true,
        answerPageCount: detectedAnsPage,
        answerPrintCount: detectedAnsCount,
        answerPrintSide: detectedAnsSide,
      };
    }
    return null;
  };

  // 草稿状态
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);
  const [currentEditRecord, setCurrentEditRecord] = useState<any>(null);

  // 触发草稿保存
  const triggerSaveRecordDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    const targetId = isEdit ? editId : 'create';
    FormDraftUtil.saveDraft('edu_record', targetId, current);
    const d = FormDraftUtil.getDraft('edu_record', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  // 切换试卷与答案拆分模式
  const handleSplitAnswerToggle = (checked: boolean) => {
    setSplitAnswer(checked);
    form.setFieldsValue({ splitAnswer: checked });

    const currentPageCount = form.getFieldValue('pageCount') || 1;
    let safePageCount = currentPageCount;
    let safeAnsPage = form.getFieldValue('answerPageCount') || 1;

    if (checked && currentPageCount < 2) {
      safePageCount = 2;
      safeAnsPage = 1;
      form.setFieldsValue({ pageCount: 2, answerPageCount: 1 });
      message.info('💡 已自动将文件总页数设为 2 页（试卷 1 页 + 答案 1 页）');
    } else if (checked && safeAnsPage >= safePageCount) {
      safeAnsPage = Math.max(1, safePageCount - 1);
      form.setFieldsValue({ answerPageCount: safeAnsPage });
    }

    const currentValues = form.getFieldsValue();
    const sheets = computePreviewSheets(
      {
        ...currentValues,
        pageCount: safePageCount,
        answerPageCount: safeAnsPage,
        splitAnswer: checked,
      },
      checked
    );
    setPreviewTotalSheets(sheets);
    triggerSaveRecordDraft({ ...currentValues, splitAnswer: checked });
  };

  // 监听表单数字变化以联动计算耗纸并保存草稿
  const handleFormValuesChange = (_: any, allValues: any) => {
    const isSplit = allValues.splitAnswer !== undefined ? allValues.splitAnswer : splitAnswer;
    const sheets = computePreviewSheets(allValues, isSplit);
    setPreviewTotalSheets(sheets);
    triggerSaveRecordDraft(allValues);
  };

  // 选择教师时自动联动其任教年级
  const handleTeacherChange = (teacherId: any) => {
    const t = teacherList.find((item) => item.teacherId === teacherId);
    if (t) {
      form.setFieldsValue({
        teacherName: t.teacherName,
        grade: t.grade || form.getFieldValue('grade'),
      });
      if (t.grade) {
        setSelectedGrade(t.grade);
      }
      triggerSaveRecordDraft(form.getFieldsValue());
    }
  };

  // 打开新增弹窗
  const handleOpenAdd = async () => {
    const loaded = await loadBaseData();
    const currentPaperList = loaded?.paperGoodsList || paperGoodsList;
    form.resetFields();
    setIsEdit(false);
    setEditId(null);
    setCurrentEditRecord(null);
    setOcrResult(null);
    setModalTitle('新增印刷登记（自动生成耗材出库单联动扣库存）');

    // 检查是否有未保存的新增草稿
    const draft = FormDraftUtil.getDraft('edu_record', 'create');
    if (draft && draft.formValues && (draft.formValues.printName || draft.formValues.teacherId)) {
      const isDraftSplit = !!draft.formValues.splitAnswer;
      setSplitAnswer(isDraftSplit);
      setAnswerPageCount(draft.formValues.answerPageCount || 1);
      setAnswerPrintCount(draft.formValues.answerPrintCount || 2);
      setAnswerPrintSide(draft.formValues.answerPrintSide || '1');
      form.setFieldsValue({
        ...draft.formValues,
        printTime: draft.formValues.printTime ? dayjs(draft.formValues.printTime) : dayjs(),
      });
      const sheets = computePreviewSheets(draft.formValues, isDraftSplit);
      setPreviewTotalSheets(sheets);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新增草稿，已为您自动恢复！');
    } else {
      setSplitAnswer(false);
      setAnswerPageCount(1);
      setAnswerPrintCount(2);
      setAnswerPrintSide('1');
      const defaultPaperType = 'A4';
      const defaultGoodsId = findGoodsByPaperType(defaultPaperType, currentPaperList);
      form.setFieldsValue({
        printSide: '1',
        paperType: defaultPaperType,
        paperGoodsId: defaultGoodsId,
        printCount: 50,
        pageCount: 1,
        splitAnswer: false,
        answerPageCount: 1,
        answerPrintCount: 2,
        answerPrintSide: '1',
        operator: currentNickName || currentUserName || '文印管理员',
        printTime: dayjs(),
        status: '0',
      });
      setPreviewTotalSheets(50);
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEdit = async (record: any) => {
    setIsEdit(true);
    setEditId(record.printId);
    setCurrentEditRecord(record);
    setOcrResult(null);
    setSplitAnswer(false);
    setModalTitle(`修改印刷登记信息 (ID: ${record.printId})`);

    // 检查是否有该记录的未保存草稿
    const draft = FormDraftUtil.getDraft('edu_record', record.printId);
    if (draft && draft.formValues) {
      form.setFieldsValue({
        ...draft.formValues,
        splitAnswer: false,
        printTime: draft.formValues.printTime ? dayjs(draft.formValues.printTime) : dayjs(),
      });
      setPreviewTotalSheets(
        calculateTotalSheets(
          draft.formValues.printCount || record.printCount,
          draft.formValues.pageCount || record.pageCount,
          draft.formValues.printSide || record.printSide
        )
      );
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('已恢复该登记记录未保存的草稿数据！');
    } else {
      const defaultGoodsId = record.paperGoodsId || findGoodsByPaperType(record.paperType || 'A4', paperGoodsList);
      form.setFieldsValue({
        ...record,
        splitAnswer: false,
        operator: record.operator || currentNickName || currentUserName || 'admin',
        paperGoodsId: defaultGoodsId,
        printTime: record.printTime ? dayjs(record.printTime) : dayjs(),
      });
      setPreviewTotalSheets(
        calculateTotalSheets(record.printCount, record.pageCount, record.printSide)
      );
      setDraftNotice(null);
    }
    setModalOpen(true);
  };

  // 丢弃草稿并刷新为数据库最新数据
  const handleDiscardDraft = async () => {
    setDiscardLoading(true);
    try {
      const targetId = isEdit ? editId : 'create';
      FormDraftUtil.clearDraft('edu_record', targetId);
      setDraftNotice(null);

      if (isEdit && currentEditRecord) {
        setSplitAnswer(false);
        const defaultGoodsId = currentEditRecord.paperGoodsId || findGoodsByPaperType(currentEditRecord.paperType || 'A4', paperGoodsList);
        form.setFieldsValue({
          ...currentEditRecord,
          splitAnswer: false,
          operator: currentEditRecord.operator || currentNickName || currentUserName || 'admin',
          paperGoodsId: defaultGoodsId,
          printTime: currentEditRecord.printTime ? dayjs(currentEditRecord.printTime) : dayjs(),
        });
        setPreviewTotalSheets(
          calculateTotalSheets(currentEditRecord.printCount, currentEditRecord.pageCount, currentEditRecord.printSide)
        );
      } else {
        setSplitAnswer(false);
        setAnswerPageCount(1);
        setAnswerPrintCount(2);
        setAnswerPrintSide('1');
        const defaultPaperType = 'A4';
        const defaultGoodsId = findGoodsByPaperType(defaultPaperType, paperGoodsList);
        form.resetFields();
        form.setFieldsValue({
          printSide: '1',
          paperType: defaultPaperType,
          paperGoodsId: defaultGoodsId,
          printCount: 50,
          pageCount: 1,
          splitAnswer: false,
          answerPageCount: 1,
          answerPrintCount: 2,
          answerPrintSide: '1',
          operator: currentNickName || currentUserName || 'admin',
          printTime: dayjs(),
          status: '0',
        });
        setPreviewTotalSheets(50);
      }
      if (isEdit) {
        message.success('已丢弃本地草稿，已恢复为数据库数据！');
      } else {
        message.success('已丢弃本地草稿，已刷新到未填写状态！');
      }
    } catch (e: any) {
      message.error(e.message || '刷新失败');
    } finally {
      setDiscardLoading(false);
    }
  };

  // 解析微信聊天中的原对话时间片段，尽可能还原为具体印刷时间
  // 支持：绝对时间「2026年08月12日 17:01」「2026-08-12 17:01」、相对时间「昨天/前天 HH:mm」
  const parseChatTime = (snippet?: string) => {
    if (!snippet) return null;
    const s = String(snippet).trim();
    if (!s) return null;

    // 1. 绝对时间：2026年08月12日 17:01 / 2026-08-12 17:01 / 2026/8/12 17:01
    const absMatch = s.match(/(\d{4})[年\/\-\.](\d{1,2})[月\/\-\.](\d{1,2})[日]?(?:[ ]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (absMatch) {
      const year = Number(absMatch[1]);
      const month = Number(absMatch[2]);
      const day = Number(absMatch[3]);
      const hour = absMatch[4] ? Number(absMatch[4]) : 0;
      const minute = absMatch[5] ? Number(absMatch[5]) : 0;
      const second = absMatch[6] ? Number(absMatch[6]) : 0;
      const parsed = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
      if (parsed.isValid()) return parsed;
    }

    // 2. 相对时间：昨天/前天 HH:mm
    const relMatch = s.match(/(昨天|前天|今天)[\s]*(\d{1,2}):(\d{1,2})/);
    if (relMatch) {
      let base = dayjs();
      if (relMatch[1] === '昨天') base = dayjs().subtract(1, 'day');
      else if (relMatch[1] === '前天') base = dayjs().subtract(2, 'day');
      const hour = Number(relMatch[2]);
      const minute = Number(relMatch[3]);
      return base.hour(hour).minute(minute).second(0);
    }

    return null;
  };

  // 将识别任务数据统一回填并唤起新增表单弹窗（支持单任务与多任务/跨天队列任务）
  const applyTaskToForm = (
    task: any,
    index: number = 0,
    totalTasks: number = 1,
    taskListContext?: any[]
  ) => {
    if (!task) return;

    setCurrentTaskIndex(index);

    // 1. 年级确定
    let targetGrade = task.grade || '';

    // 2. 教师智能匹配（优先按 teacherId 匹配，其次按姓名精准/模糊匹配）
    let matchedTeacher: any = null;
    if (task.teacherId) {
      matchedTeacher = teacherList.find((t) => String(t.teacherId) === String(task.teacherId));
    }
    if (!matchedTeacher && task.teacherName) {
      matchedTeacher = teacherList.find(
        (t) =>
          t.teacherName === task.teacherName ||
          (t.teacherName &&
            task.teacherName &&
            (t.teacherName.includes(task.teacherName) || task.teacherName.includes(t.teacherName)))
      );
    }

    let finalTeacherId = matchedTeacher?.teacherId || (task.teacherId ? Number(task.teacherId) : undefined);
    let finalTeacherName = matchedTeacher?.teacherName || task.teacherName || undefined;

    // 若档案库中未录入该教师（例如新进教师“李心雨”），在下拉框中智能新增并自动选中
    if (!matchedTeacher && task.teacherName) {
      finalTeacherId = -999;
      finalTeacherName = task.teacherName;
      setTeacherList((prev) => {
        if (
          prev.some(
            (t) =>
              t.teacherId === -999 ||
              t.teacherName === task.teacherName ||
              t.rawName === task.teacherName
          )
        ) {
          return prev;
        }
        return [
          {
            teacherId: -999,
            teacherName: `${task.teacherName} (截图识别)`,
            rawName: task.teacherName,
            grade: targetGrade || '高三',
            subject: task.subject || '语文',
          },
          ...prev,
        ];
      });
    }

    // 若未识别出年级但匹配的教师有所属年级，则继承该教师年级
    if (!targetGrade && matchedTeacher?.grade) {
      targetGrade = matchedTeacher.grade;
    }
    if (targetGrade) {
      setSelectedGrade(targetGrade);
    }

    // 3. 班级智能匹配（优先按 classId，其次按班级名称匹配）
    let matchedClass: any = null;
    if (task.classId) {
      matchedClass = classList.find((c) => String(c.classId) === String(task.classId));
    }
    if (!matchedClass && task.className) {
      matchedClass = classList.find(
        (c) =>
          c.className === task.className ||
          (c.className &&
            task.className &&
            (c.className.includes(task.className) || task.className.includes(c.className)))
      );
    }
    const finalClassId = matchedClass?.classId || (task.classId ? Number(task.classId) : undefined);
    const finalClassName = matchedClass?.className || task.className || undefined;

    // 4. 纸张规格与耗材匹配
    const paperType = task.paperType || 'A4';
    let paperGoodsId = task.paperGoodsId;
    if (!paperGoodsId) {
      paperGoodsId = findGoodsByPaperType(paperType, paperGoodsList);
    }

    // 5. 印刷份数、页数与单双面
    const printCount = task.printCount ? Number(task.printCount) : 50;
    const pageCount = task.pageCount ? Number(task.pageCount) : 1;
    const printSide = task.printSide ? String(task.printSide) : '1';

    // 6. 耗纸量折算联动与试卷答案合并拆分智能检测
    const combinedText = `${task.printName || ''} ${task.originalDocName || ''} ${task.remark || ''} ${ocrResult?.rawText || ''}`;
    const splitInfo = detectSplitAnswerInfo(combinedText, pageCount);
    const isSplit = !!splitInfo;
    const ansPage = splitInfo ? splitInfo.answerPageCount : 1;
    const ansCount = splitInfo ? splitInfo.answerPrintCount : 2;
    const ansSide = splitInfo ? splitInfo.answerPrintSide : '1';

    setSplitAnswer(isSplit);
    setAnswerPageCount(ansPage);
    setAnswerPrintCount(ansCount);
    setAnswerPrintSide(ansSide);

    const sheets = isSplit
      ? computePreviewSheets(
          {
            printCount,
            pageCount,
            printSide,
            answerPageCount: ansPage,
            answerPrintCount: ansCount,
            answerPrintSide: ansSide,
          },
          true
        )
      : calculateTotalSheets(printCount, pageCount, printSide);
    setPreviewTotalSheets(sheets);

    // 7. 拼接智能备注（包含跨天原对话时间戳）
    let remarkText = task.remark || '';
    if (!remarkText || remarkText === '由微信智能识别自动预填') {
      remarkText = '由微信智能识别自动预填';
      if (task.timeSnippet) {
        remarkText += ` [原对话时间: ${task.timeSnippet}]`;
      }
    }

    // 8. 设置弹窗为新增模式
    setIsEdit(false);
    setEditId(null);
    if (totalTasks > 1) {
      setModalTitle(`新增印刷登记（第 ${index + 1}/${totalTasks} 条：${task.printName || '待录入'}）`);
    } else {
      setModalTitle('新增印刷登记（已智能识别预填，请核对保存）');
    }

    // 9. 关闭解析与队列弹窗，开启主登记弹窗
    setTextModalOpen(false);
    setQueueModalOpen(false);
    setModalOpen(true);
    if (isSplit) {
      message.info('💡 检测到试卷与答案合并说明，已自动为您开启并配置拆分录入！');
    }

    const valuesToSet = {
      printName: task.printName || '',
      paperType: paperType,
      paperGoodsId: paperGoodsId,
      printCount: printCount,
      pageCount: pageCount,
      printSide: printSide,
      splitAnswer: isSplit,
      answerPageCount: ansPage,
      answerPrintCount: ansCount,
      answerPrintSide: ansSide,
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      grade: targetGrade || undefined,
      classId: finalClassId,
      className: finalClassName,
      operator: currentNickName || currentUserName || 'admin',
      printTime: parseChatTime(task.timeSnippet) || dayjs(),
      status: '0',
      remark: remarkText,
      attachment: task.attachment || '',
      resultImg: task.resultImg || '',
    };

    form.resetFields();
    form.setFieldsValue(valuesToSet);
    setTimeout(() => {
      form.setFieldsValue(valuesToSet);
    }, 80);
  };

  // 提交保存
  const handleSaveRecord = async () => {
    try {
      const values = await form.validateFields();

      // 智能补齐 teacherName、className 与 paperGoodsId，确保数据库数据完整
      let teacherId = values.teacherId === -999 ? undefined : values.teacherId;
      let teacherName = values.teacherName;
      if (values.teacherId === -999) {
        const found = teacherList.find((t) => t.teacherId === -999);
        teacherName = found?.rawName || found?.teacherName?.replace(/\s*\(截图识别\)/, '') || teacherName;
      } else if (!teacherName && values.teacherId) {
        const t = teacherList.find((item) => String(item.teacherId) === String(values.teacherId));
        if (t) teacherName = t.teacherName;
      }

      let className = values.className;
      if (!className && values.classId) {
        const c = classList.find((item) => String(item.classId) === String(values.classId));
        if (c) className = c.className;
      }

      let paperGoodsId = values.paperGoodsId;
      if (!paperGoodsId && values.paperType) {
        paperGoodsId = findGoodsByPaperType(values.paperType, paperGoodsList);
      }
      if (!paperGoodsId && paperGoodsList.length > 0) {
        paperGoodsId = paperGoodsList[0].goodsId;
      }

      const formattedPrintTime = values.printTime
        ? (dayjs.isDayjs(values.printTime) ? values.printTime.format('YYYY-MM-DD HH:mm:ss') : values.printTime)
        : dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 1. 如果是新增模式且启用了试卷与答案拆分
      if (!isEdit && splitAnswer) {
        const pageCount = Number(values.pageCount || 1);
        const ansPageCount = Number(values.answerPageCount || 1);
        const ansPrintCount = Number(values.answerPrintCount || 2);
        const ansPrintSide = String(values.answerPrintSide || '1');

        if (pageCount < 2) {
          message.error('文件总页数至少需为 2 页，方可拆分试卷与答案！');
          return;
        }
        if (ansPageCount >= pageCount) {
          message.error(`答案页数（${ansPageCount}页）必须小于文件总页数（${pageCount}页）！`);
          return;
        }
        if (ansPageCount < 1) {
          message.error('答案页数至少为 1 页！');
          return;
        }
        if (ansPrintCount < 1) {
          message.error('答案印制份数至少为 1 份！');
          return;
        }

        const examPageCount = pageCount - ansPageCount;
        const examPrintCount = Number(values.printCount || 1);
        const examPrintSide = String(values.printSide || '1');

        const examSheets = calculateTotalSheets(examPrintCount, examPageCount, examPrintSide);
        const ansSheets = calculateTotalSheets(ansPrintCount, ansPageCount, ansPrintSide);

        const rawPrintName = (values.printName || '印刷资料').trim();
        const cleanName = rawPrintName.replace(/^\[(试卷|答案)\]\s*/, '');

        const examRemark = values.remark
          ? `${values.remark}（试卷答案合并文件拆分 - 试卷正文部分）`
          : '试卷答案合并文件拆分 - 试卷正文部分';
        const ansRemark = values.remark
          ? `${values.remark}（试卷答案合并文件拆分 - 参考答案部分）`
          : '试卷答案合并文件拆分 - 参考答案部分';

        const examPayload = {
          ...values,
          printName: `[试卷] ${cleanName}`,
          pageCount: examPageCount,
          printCount: examPrintCount,
          printSide: examPrintSide,
          totalPages: examSheets,
          printTime: formattedPrintTime,
          teacherId,
          teacherName,
          className,
          paperGoodsId,
          remark: examRemark,
        };

        const ansPayload = {
          ...values,
          printName: `[答案] ${cleanName}`,
          pageCount: ansPageCount,
          printCount: ansPrintCount,
          printSide: ansPrintSide,
          totalPages: ansSheets,
          printTime: formattedPrintTime,
          teacherId,
          teacherName,
          className,
          paperGoodsId,
          remark: ansRemark,
        };

        // 依次提交试卷与答案，分别核算并生成独立出库单
        await addRecord(examPayload);
        await addRecord(ansPayload);

        FormDraftUtil.clearDraft('edu_record', 'create');
        setDraftNotice(null);
        setSplitAnswer(false);
        actionRef.current?.reload();

        // 检查是否处于跨天/多任务连续登记队列模式
        const isQueueMode = ocrResult?.taskList && ocrResult.taskList.length > 1;
        if (isQueueMode) {
          const updatedTaskList = ocrResult.taskList.map((item: any, i: number) => {
            if (i === currentTaskIndex) {
              return { ...item, alreadyRegistered: true };
            }
            return item;
          });

          setOcrResult({
            ...ocrResult,
            taskList: updatedTaskList,
          });

          let nextIdx = -1;
          for (let i = currentTaskIndex + 1; i < updatedTaskList.length; i++) {
            if (!updatedTaskList[i].alreadyRegistered) {
              nextIdx = i;
              break;
            }
          }
          if (nextIdx === -1) {
            for (let i = 0; i < currentTaskIndex; i++) {
              if (!updatedTaskList[i].alreadyRegistered) {
                nextIdx = i;
                break;
              }
            }
          }

          if (nextIdx !== -1) {
            const nextTask = updatedTaskList[nextIdx];
            message.success(
              `【${cleanName}】试卷与答案已成功拆分为 2 条登记！已自动载入下一条任务【${nextTask.printName}】`
            );
            applyTaskToForm(nextTask, nextIdx, updatedTaskList.length, updatedTaskList);
            return;
          } else {
            message.success(
              `【${cleanName}】试卷与答案已成功拆分登记！队列中任务已全部完成！`
            );
            setModalOpen(false);
            setOcrResult(null);
            return;
          }
        } else {
          message.success(
            `🎉 试卷与答案已成功拆分为 2 条文印登记记录！\n【试卷】${examPageCount}页/${examPrintCount}份(耗纸${examSheets}张)，【答案】${ansPageCount}页/${ansPrintCount}份(耗纸${ansSheets}张)，合计联动出库扣减 ${examSheets + ansSheets} 张纸。`
          );
          setModalOpen(false);
          setOcrResult(null);
        }
        return;
      }

      // 2. 普通单条记录处理（或编辑已有记录）
      const totalPages = calculateTotalSheets(
        values.printCount,
        values.pageCount,
        values.printSide
      );

      const payload = {
        ...values,
        printTime: formattedPrintTime,
        teacherId,
        teacherName,
        className,
        paperGoodsId,
        totalPages,
      };

      if (isEdit && editId) {
        await updateRecord({ printId: editId, ...payload });
        message.success('印刷登记修改成功！');
        FormDraftUtil.clearDraft('edu_record', editId);
        setDraftNotice(null);
        setModalOpen(false);
        actionRef.current?.reload();
      } else {
        await addRecord(payload);
        FormDraftUtil.clearDraft('edu_record', 'create');
        setDraftNotice(null);
        actionRef.current?.reload();

        // 检查是否处于跨天/多任务连续登记队列模式
        const isQueueMode = ocrResult?.taskList && ocrResult.taskList.length > 1;
        if (isQueueMode) {
          // 标记当前任务在前端队列中已登记
          const updatedTaskList = ocrResult.taskList.map((item: any, i: number) => {
            if (i === currentTaskIndex) {
              return { ...item, alreadyRegistered: true };
            }
            return item;
          });

          setOcrResult({
            ...ocrResult,
            taskList: updatedTaskList,
          });

          // 寻找下一个未登记的任务
          let nextIdx = -1;
          for (let i = currentTaskIndex + 1; i < updatedTaskList.length; i++) {
            if (!updatedTaskList[i].alreadyRegistered) {
              nextIdx = i;
              break;
            }
          }
          if (nextIdx === -1) {
            for (let i = 0; i < currentTaskIndex; i++) {
              if (!updatedTaskList[i].alreadyRegistered) {
                nextIdx = i;
                break;
              }
            }
          }

          if (nextIdx !== -1) {
            const currentTaskName = values.printName;
            const nextTask = updatedTaskList[nextIdx];
            message.success(
              `【${currentTaskName}】登记成功！已自动为您载入下一条未登记任务【${nextTask.printName}】`
            );
            // 自动准备并载入下一条任务，保持弹窗开启！
            applyTaskToForm(nextTask, nextIdx, updatedTaskList.length, updatedTaskList);
            return;
          } else {
            message.success(
              `【${values.printName}】登记成功！队列中所有识别出的任务均已全部登记完成！`
            );
            setModalOpen(false);
            setOcrResult(null);
            return;
          }
        } else {
          message.success('印刷登记成功！已自动关联生成耗材出库单扣减纸张库存');
          setModalOpen(false);
          setOcrResult(null);
        }
      }
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  // 作废
  const handleCancel = async (record: any) => {
    try {
      await cancelRecord(record.printId);
      message.success('印刷登记已作废！关联耗材库存已自动回退');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '作废失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认彻底删除选中的 ${selectedRowKeys.length} 项印刷记录？`,
      content: '关联出库单将同步删除，扣减的耗材纸张库存将自动回退。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await delRecord(selectedRowKeys.join(','));
          message.success('批量删除成功，关联耗材库存已自动回退');
          setSelectedRowKeys([]);
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '批量删除失败');
        }
      },
    });
  };

  // 打开完成并上传成品效果图
  const handleOpenComplete = (record: any) => {
    setCompleteTarget(record);
    completeForm.resetFields();
    completeForm.setFieldsValue({
      resultImg: record.resultImg || '',
    });
    setCompleteModalOpen(true);
  };

  // 保存完成状态
  const handleSaveComplete = async () => {
    try {
      const values = await completeForm.validateFields();
      await completeRecord({
        printId: completeTarget.printId,
        resultImg: values.resultImg,
      });
      message.success('已标记印刷完成！');
      setCompleteModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  // 智能解析数据统一入口（处理 OCR 与纯文本解析，支持跨天与多次任务队列）
  const handleParsedResult = (data: any) => {
    if (!data) return;
    setOcrResult(data);

    const hasMultiTasks = data.taskList && data.taskList.length > 1;
    let initialIdx = 0;
    if (data.firstUnregisteredIndex != null && data.firstUnregisteredIndex >= 0) {
      initialIdx = data.firstUnregisteredIndex;
    }
    setCurrentTaskIndex(initialIdx);

    if (hasMultiTasks) {
      // 检查是否全部已在库登记
      const allDone = data.taskList.every((t: any) => t.alreadyRegistered);
      if (allDone) {
        message.warning('检测到截图/文本内识别出的所有印刷任务在系统中均已登记！无需重复登记。');
      } else {
        const unregCount = data.taskList.filter((t: any) => !t.alreadyRegistered).length;
        message.success(
          `识别成功！检测到包含 ${data.taskList.length} 条印刷任务（含跨天记录，其中 ${unregCount} 条待登记），已为您排队！`
        );
      }
      // 保持 textModalOpen 打开，让文印员预览任务卡片队列与原对话时间，自主选择或点击主按钮开始登记
    } else {
      // 单任务场景，保持原先无缝快速填入体验
      const singleTask = (data.taskList && data.taskList[0]) || data;
      applyTaskToForm(singleTask, 0, 1);
      message.success('微信信息识别提取完成！已自动打开并预填表单，请核对后保存');
    }
  };

  // 兼容老调用
  const applyParsedData = (d: any) => {
    handleParsedResult(d);
  };

  // 微信文本智能一键提取
  const handleParseText = async () => {
    if (!rawText.trim()) {
      message.warning('请先粘贴微信聊天文字');
      return;
    }
    setParsingText(true);
    try {
      const res: any = await textParse({ text: rawText });
      if (res && res.data) {
        handleParsedResult(res.data);
      } else {
        message.warning(res?.msg || '未提取到有效信息，请手动录入');
      }
    } catch (e: any) {
      message.error(e.message || '文本提取失败，请手动录入');
    } finally {
      setParsingText(false);
    }
  };

  // 本地离线 OCR 截图上传识别
  const handleOcrUpload = async (file: File) => {
    setOcrLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res: any = await ocrParse(formData);
      if (res && res.data) {
        handleParsedResult(res.data);
      } else {
        message.warning(res?.msg || '未识别到有效印刷信息，请手动录入');
      }
    } catch (e: any) {
      message.error(e.message || 'OCR 识别失败');
    } finally {
      setOcrLoading(false);
    }
    return false;
  };

  // 弹窗内快捷按 Ctrl+V 粘贴截图自动识别
  const handleModalPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          message.info('检测到剪贴板截图，正在进行离线 OCR 识别...');
          handleOcrUpload(file);
          return;
        }
      }
    }
  };

  // 登记弹窗全局快捷粘贴：根据文件后缀自动分流并处理
  const handleSmartRegisterModalPaste = async (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    let pastedFile: File | null = null;
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      pastedFile = e.clipboardData.files[0];
    } else if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.kind === 'file') {
          pastedFile = item.getAsFile();
          if (pastedFile) break;
        }
      }
    }

    if (!pastedFile) return;

    // 如果焦点已经在具体的文件/图片上传内部，交给各自的 onPaste 处理
    if (target && target.closest('.ant-upload, input[type="file"]')) {
      return;
    }

    const ext = pastedFile.name.split('.').pop()?.toLowerCase() || '';
    const isDoc = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z'].includes(ext);
    const isImg = pastedFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);

    if (isDoc) {
      e.preventDefault();
      message.loading({ content: `智能识别：检测到粘贴【.${ext}】原稿文档（${pastedFile.name}），正在上传...`, key: 'smart-paste' });
      try {
        const formData = new FormData();
        formData.append('file', pastedFile);
        const res: any = await uploadFile(formData);
        const url = res.url || res.fileName || '';
        const uploadedName = res.originalFilename || pastedFile.name;
        form.setFieldsValue({ attachment: url });
        const curPrintName = form.getFieldValue('printName');
        if (!curPrintName && uploadedName) {
          form.setFieldsValue({ printName: uploadedName.replace(/\.[^/.]+$/, '') });
        }
        message.success({ content: `已自动根据后缀识别为【原稿文档】并上传成功！`, key: 'smart-paste' });
      } catch (err: any) {
        message.error({ content: err.message || '文档上传失败', key: 'smart-paste' });
      }
    } else if (isImg && !isTextInput) {
      e.preventDefault();
      // 如果原稿已有，则填入留样图；如果原稿为空，优先填入原稿电子文件（试卷原件截图常见场景）
      const curAttachment = form.getFieldValue('attachment');
      const targetField = curAttachment ? 'resultImg' : 'attachment';
      const targetDesc = targetField === 'resultImg' ? '印刷效果图 / 拍照留样' : '原稿电子文件';

      message.loading({ content: `智能识别：检测到粘贴图片（.${ext}），正在上传至【${targetDesc}】...`, key: 'smart-paste' });
      try {
        const formData = new FormData();
        formData.append('file', pastedFile);
        const res: any = await uploadFile(formData);
        const url = res.url || res.fileName || '';
        form.setFieldsValue({ [targetField]: url });
        message.success({ content: `图片已自动上传至【${targetDesc}】！`, key: 'smart-paste' });
      } catch (err: any) {
        message.error({ content: err.message || '图片上传失败', key: 'smart-paste' });
      }
    }
  };

  // 表格列定义 (16列完整还原)
  const columns: ProColumns[] = [
    {
      title: '登记ID',
      dataIndex: 'printId',
      width: 75,
      align: 'center',
    },
    {
      title: '印刷名称',
      dataIndex: 'printName',
      ellipsis: true,
      width: 180,
      render: (_, record) => {
        const fullName: string = record.printName || '-';
        const isExam = fullName.startsWith('[试卷]');
        const isAns = fullName.startsWith('[答案]');
        const cleanName = isExam
          ? fullName.replace(/^\[试卷\]\s*/, '')
          : isAns
          ? fullName.replace(/^\[答案\]\s*/, '')
          : fullName;

        return (
          <Tooltip title={fullName} placement="topLeft">
            <div
              style={{
                maxWidth: 170,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              {isExam && (
                <Tag color="processing" style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}>
                  试卷
                </Tag>
              )}
              {isAns && (
                <Tag color="success" style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}>
                  答案
                </Tag>
              )}
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cleanName}
              </span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '印刷用纸',
      dataIndex: 'paperType',
      width: 140,
      align: 'center',
      ellipsis: true,
      render: (_, record) => {
        const pType = record.paperType || 'A4';
        const goodsName = record.paperGoodsName || '';
        const fullTooltip = goodsName ? `【${pType}】${goodsName}` : pType;

        return (
          <Tooltip title={fullTooltip} placement="topLeft">
            <div
              style={{
                maxWidth: 130,
                margin: '0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <Tag color="cyan" style={{ margin: 0, flexShrink: 0 }}>
                {pType}
              </Tag>
              {goodsName && (
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(0, 0, 0, 0.75)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {goodsName}
                </span>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '印刷份数',
      dataIndex: 'printCount',
      width: 90,
      align: 'center',
      render: (_, record) => <Text strong style={{ color: '#1890FF' }}>{record.printCount} 份</Text>,
    },
    {
      title: '每份页数',
      dataIndex: 'pageCount',
      width: 85,
      align: 'center',
      render: (_, record) => <span>{record.pageCount || 1} 页</span>,
    },
    {
      title: '印刷方式',
      dataIndex: 'printSide',
      width: 90,
      align: 'center',
      valueEnum: {
        '1': { text: '单面印' },
        '2': { text: '双面印' },
      },
      render: (_, record) => (
        <Tag color={record.printSide === '2' ? 'purple' : 'default'}>
          {record.printSide === '2' ? '双面印' : '单面印'}
        </Tag>
      ),
    },
    {
      title: '总耗纸量',
      dataIndex: 'totalPages',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Tag color="geekblue" style={{ fontWeight: 600 }}>
          {record.totalPages ||
            calculateTotalSheets(record.printCount, record.pageCount, record.printSide)}{' '}
          张
        </Tag>
      ),
    },
    {
      title: '原稿附件',
      dataIndex: 'attachment',
      width: 90,
      align: 'center',
      hideInSearch: true,
      render: (_, record) =>
        record.attachment ? (
          <Button
            type="link"
            size="small"
            icon={<PaperClipOutlined />}
            onClick={() => window.open(record.attachment, '_blank')}
          >
            下载
          </Button>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '成品照片',
      dataIndex: 'resultImg',
      width: 90,
      align: 'center',
      hideInSearch: true,
      render: (_, record) =>
        record.resultImg ? (
          <Image src={record.resultImg} width={36} height={36} style={{ borderRadius: 4 }} />
        ) : record.status === '0' ? (
          <Tag color="orange" style={{ cursor: 'pointer' }} onClick={() => handleOpenComplete(record)}>
            待拍上传
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '申请教师',
      dataIndex: 'teacherName',
      width: 100,
      align: 'center',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      width: 85,
      align: 'center',
      valueEnum: {
        高一: { text: '高一' },
        高二: { text: '高二' },
        高三: { text: '高三' },
        复读部: { text: '复读部' },
        初中部: { text: '初中部' },
      },
    },
    {
      title: '班级',
      dataIndex: 'className',
      width: 100,
      align: 'center',
      render: (_, record) => record.className || '-',
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 90,
      align: 'center',
    },
    {
      title: '印刷时间',
      dataIndex: 'printTime',
      width: 160,
      align: 'center',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '关联出库单',
      dataIndex: 'outNo',
      width: 150,
      align: 'center',
      render: (_, record) =>
        record.outNo ? (
          <Tag
            color="processing"
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => {
              setCurrentRecord(record);
              setDetailOpen(true);
            }}
          >
            {record.outNo}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 95,
      align: 'center',
      valueEnum: {
        '0': { text: '待印刷', status: 'Warning' },
        '1': { text: '已完成', status: 'Success' },
        '2': { text: '已作废', status: 'Default' },
      },
      render: (_, record) => {
        if (record.status === '0') return <Tag color="warning">待印刷</Tag>;
        if (record.status === '1') return <Tag color="success">已完成</Tag>;
        if (record.status === '2') return <Tag color="default">已作废</Tag>;
        return <Tag>{record.status}</Tag>;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.status === '0' && (
            <Button
              key="complete"
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52C41A' }}
              onClick={() => handleOpenComplete(record)}
            >
              完成
            </Button>
          )}
          <Button
            key="detail"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setCurrentRecord(record);
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          {record.status !== '2' && (
            <Popconfirm
              key="cancel"
              title="确认作废该文印登记？关联出库单将同步作废并自动回退库存纸张！"
              onConfirm={() => handleCancel(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                作废
              </Button>
            </Popconfirm>
          )}
          <Authorized key="del" permission="edu:record:remove">
            <Popconfirm
              key="del"
              title="确认彻底删除该印刷记录？关联出库单将同步删除并回退库存！"
              onConfirm={async () => {
                await delRecord(record.printId);
                message.success('删除成功，关联出库单已同步删除并回退库存');
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

  const filteredClassList = selectedGrade
    ? classList.filter((c) => !c.grade || c.grade === selectedGrade)
    : classList;

  return (
    <PageContainer header={{ title: '文印智能登记管理' }}>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="printId"
        scroll={{ x: 'max-content' }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <Space size={16}>
            <span>已选 {selectedRowKeys.length} 项</span>
            <Button
              type="primary"
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
            const res: any = await listRecord({
              ...params,
              pageNum: params.current,
              pageSize: params.pageSize,
            });
            return {
              data: res?.rows || [],
              total: res?.total || 0,
              success: true,
            };
          } catch (error) {
            console.error('获取印刷登记列表失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        toolBarRender={() => [
          <Button
            key="smart-btn"
            type="dashed"
            icon={<MessageOutlined style={{ color: '#52C41A' }} />}
            onClick={() => {
              setRawText('');
              setOcrResult(null);
              setTextModalOpen(true);
            }}
          >
            💬 粘贴微信聊天记录智能预填
          </Button>,
          <Button key="add-btn" type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            新增印刷登记
          </Button>,
        ]}
      />

      {/* 新增 / 修改登记弹窗 */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSaveRecord}
        onCancel={() => setModalOpen(false)}
        width={760}
        destroyOnHidden={false}
      >
        <DraftNoticeAlert
          visible={!!draftNotice?.visible}
          timeText={draftNotice?.timeText}
          onDiscard={handleDiscardDraft}
          loading={discardLoading}
          isEdit={isEdit}
        />
        <div onPaste={handleSmartRegisterModalPaste}>
          {/* 多任务/多天连续登记排队提示横幅 */}
          {ocrResult?.taskList && ocrResult.taskList.length > 1 && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                backgroundColor: '#E6F4FF',
                border: '1px solid #91CAFF',
                borderLeft: '4px solid #1677FF',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 'bold', color: '#1677FF', fontSize: 13 }}>
                    <UnorderedListOutlined /> 批量识别连续登记队列
                  </span>
                  <span style={{ fontSize: 12, color: '#595959' }}>
                    当前登记第 <b>{currentTaskIndex + 1}</b> / {ocrResult.taskList.length} 条：
                    <b style={{ color: '#1677FF', marginLeft: 4 }}>
                      {form.getFieldValue('printName') || currentQueueTask?.printName}
                    </b>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 3 }}>
                  系统已查库自动跳过已登记项；本条提交成功后将自动载入下一条未登记材料
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  size="small"
                  type="link"
                  icon={<UnorderedListOutlined />}
                  onClick={() => setQueueModalOpen(true)}
                >
                  查看/切换任务
                </Button>
                {hasNextUnregisteredTask ? (
                  <Tag color="warning" style={{ margin: 0 }}>
                    提交后自动进入下一条 ➔
                  </Tag>
                ) : (
                  <Tag color="success" style={{ margin: 0 }}>
                    ✓ 本条为队列最后一条
                  </Tag>
                )}
              </div>
            </div>
          )}

          {/* 兼容单纯多附件但未分任务的场景 */}
          {ocrResult?.documentList &&
            ocrResult.documentList.length > 1 &&
            (!ocrResult.taskList || ocrResult.taskList.length <= 1) && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '8px 12px',
                  background: '#F0F5FF',
                  border: '1px dashed #1677FF',
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 12, color: '#1677FF', fontWeight: 'bold', marginBottom: 6 }}>
                  <PaperClipOutlined /> 检测到发送了多份文件附件，点击切换本次印刷哪份（自动同步印刷名称）：
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ocrResult.documentList.map((doc: string, idx: number) => {
                    const cleanName = doc.replace(/\.[^/.]+$/, '');
                    const isSelected = form.getFieldValue('printName') === cleanName;
                    return (
                      <Tag
                        key={idx}
                        color={isSelected ? 'blue' : 'default'}
                        style={{ cursor: 'pointer', fontSize: 12 }}
                        onClick={() => form.setFieldsValue({ printName: cleanName })}
                      >
                        <PaperClipOutlined /> {doc} {isSelected && <CheckOutlined />}
                      </Tag>
                    );
                  })}
                </div>
              </div>
            )}

          <div
            style={{
            marginBottom: 16,
            padding: '10px 14px',
            backgroundColor: '#F6FFED',
            border: '1px solid #B7EB8F',
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#389E0D' }}>
            💡 支持直接粘贴微信群消息或上传微信聊天截图快速识别预填！
          </span>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<MessageOutlined />}
            onClick={() => {
              setRawText('');
              setOcrResult(null);
              setTextModalOpen(true);
            }}
          >
            智能解析填入
          </Button>
        </div>

        <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange}>
          <Form.Item name="teacherName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="className" hidden>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="printName"
                label="印刷材料名称"
                rules={[{ required: true, message: '请输入印刷名称' }]}
              >
                <Input placeholder="例：高三年级期中冲刺数学模拟测试卷" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="paperType" label="纸张规格" rules={[{ required: true, message: '请选择纸张规格' }]}>
                <Select placeholder="请选择纸张规格" onChange={handlePaperTypeChange}>
                  <Select.Option value="A4">A4 经典规格</Select.Option>
                  <Select.Option value="A3">A3 大试卷纸</Select.Option>
                  <Select.Option value="8K">8K 统考用纸</Select.Option>
                  <Select.Option value="16K">16K 作业本用纸</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="paperGoodsId"
                label={
                  <Space>
                    <span>关联扣减用纸物品</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 'normal' }}>
                      (随纸张规格自动智能匹配，系统联动出库扣减库存)
                    </span>
                  </Space>
                }
                rules={[{ required: true, message: '请选择用纸物品！' }]}
              >
                <Select
                  placeholder="选择关联扣减用纸物品"
                  showSearch
                  optionFilterProp="children"
                >
                  {paperGoodsList.map((g) => {
                    const rate = Number(g.conversionRate) > 0 ? Number(g.conversionRate) : 1;
                    const stock = Number(g.stockNum ?? 0);
                    const remain = Number(g.remainSheets ?? 0);
                    const totalSheets = stock * rate + remain;
                    return (
                      <Select.Option key={g.goodsId} value={g.goodsId}>
                        {g.goodsName} {g.spec ? `[${g.spec}]` : ''} —— 当前库存: {stock} {g.unit || '包'}
                        {remain > 0 ? `又${remain}${g.baseUnit || '张'}` : ''}
                        {rate > 1 ? ` (折合 ${totalSheets.toLocaleString()} ${g.baseUnit || '张'})` : ''}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="printCount"
                label="印刷份数"
                rules={[{ required: true, message: '请输入份数' }]}
              >
                <InputNumber min={1} max={50000} style={{ width: '100%' }} addonAfter="份" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="pageCount"
                label="每份页数"
                rules={[{ required: true, message: '请输入页数' }]}
              >
                <InputNumber
                  min={1}
                  max={200}
                  style={{ width: '100%' }}
                  addonAfter="页"
                  onChange={(val) => {
                    const newPage = Number(val) || 1;
                    if (splitAnswer && newPage > 1) {
                      const curAnsPage = form.getFieldValue('answerPageCount') || 1;
                      if (curAnsPage >= newPage) {
                        const safeAnsPage = Math.max(1, newPage - 1);
                        form.setFieldsValue({ answerPageCount: safeAnsPage });
                        setAnswerPageCount(safeAnsPage);
                      }
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="printSide" label="印刷方式" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="1">单面印</Radio.Button>
                  <Radio.Button value="2">双面印</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {/* 试卷与答案合并文件拆分设置面板（仅新增模式支持智能拆分录入） */}
          {!isEdit && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: splitAnswer ? '#F6FFED' : '#FAFAFA',
                border: splitAnswer ? '1.5px solid #73D13D' : '1px solid #F0F0F0',
                borderRadius: 8,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Checkbox
                    checked={splitAnswer}
                    onChange={(e) => handleSplitAnswerToggle(e.target.checked)}
                  >
                    <span style={{ fontWeight: 600, color: splitAnswer ? '#237804' : '#262626', fontSize: 13 }}>
                      📄 包含试卷与答案合并文件（自动拆分为【试卷】与【答案】两条独立记录）
                    </span>
                  </Checkbox>
                  {splitAnswer && (
                    <Tag color="success" style={{ margin: 0, fontWeight: 'bold' }}>
                      ✓ 智能拆分已开启
                    </Tag>
                  )}
                </Space>
                <Tooltip title="适用于教师将试卷正文与参考答案放在同一个文件的场景（如总共4页，其中3页试卷、1页答案）。开启后可独立设定答案页数与印制份数，录入后系统将自动生成两条独立的文印登记，分别计算耗纸量并生成出库台账。">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }} />
                </Tooltip>
              </div>

              {splitAnswer && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #B7EB8F' }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="answerPageCount"
                        label="答案所占页数"
                        rules={[{ required: true, message: '请输入答案页数' }]}
                        style={{ marginBottom: 6 }}
                        extra={
                          <span style={{ fontSize: 12, color: '#389E0D' }}>
                            试卷正文折合：<b>{Math.max(1, (form.getFieldValue('pageCount') || 1) - (form.getFieldValue('answerPageCount') || 1))}</b> 页
                          </span>
                        }
                      >
                        <InputNumber
                          min={1}
                          max={Math.max(1, (form.getFieldValue('pageCount') || 2) - 1)}
                          style={{ width: '100%' }}
                          addonAfter="页"
                          onChange={(val) => {
                            const newAnsPage = Number(val) || 1;
                            setAnswerPageCount(newAnsPage);
                            const current = form.getFieldsValue();
                            const sheets = computePreviewSheets({ ...current, answerPageCount: newAnsPage }, true);
                            setPreviewTotalSheets(sheets);
                            triggerSaveRecordDraft({ ...current, answerPageCount: newAnsPage });
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={9}>
                      <Form.Item
                        name="answerPrintCount"
                        label="答案印制份数"
                        rules={[{ required: true, message: '请输入答案印制份数' }]}
                        style={{ marginBottom: 6 }}
                        extra={
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            <Tag
                              color="blue"
                              style={{ cursor: 'pointer', fontSize: 11, padding: '0 4px', margin: 0 }}
                              onClick={() => {
                                form.setFieldsValue({ answerPrintCount: 2 });
                                setAnswerPrintCount(2);
                                const current = form.getFieldsValue();
                                const sheets = computePreviewSheets({ ...current, answerPrintCount: 2 }, true);
                                setPreviewTotalSheets(sheets);
                                triggerSaveRecordDraft({ ...current, answerPrintCount: 2 });
                              }}
                            >
                              教师备课 2份
                            </Tag>
                            <Tag
                              color="blue"
                              style={{ cursor: 'pointer', fontSize: 11, padding: '0 4px', margin: 0 }}
                              onClick={() => {
                                form.setFieldsValue({ answerPrintCount: 1 });
                                setAnswerPrintCount(1);
                                const current = form.getFieldsValue();
                                const sheets = computePreviewSheets({ ...current, answerPrintCount: 1 }, true);
                                setPreviewTotalSheets(sheets);
                                triggerSaveRecordDraft({ ...current, answerPrintCount: 1 });
                              }}
                            >
                              留存 1份
                            </Tag>
                            <Tag
                              color="cyan"
                              style={{ cursor: 'pointer', fontSize: 11, padding: '0 4px', margin: 0 }}
                              onClick={() => {
                                const mainCount = form.getFieldValue('printCount') || 50;
                                form.setFieldsValue({ answerPrintCount: mainCount });
                                setAnswerPrintCount(mainCount);
                                const current = form.getFieldsValue();
                                const sheets = computePreviewSheets({ ...current, answerPrintCount: mainCount }, true);
                                setPreviewTotalSheets(sheets);
                                triggerSaveRecordDraft({ ...current, answerPrintCount: mainCount });
                              }}
                            >
                              同试卷份数
                            </Tag>
                          </div>
                        }
                      >
                        <InputNumber
                          min={1}
                          max={50000}
                          style={{ width: '100%' }}
                          addonAfter="份"
                          onChange={(val) => {
                            const newCount = Number(val) || 1;
                            setAnswerPrintCount(newCount);
                            const current = form.getFieldsValue();
                            const sheets = computePreviewSheets({ ...current, answerPrintCount: newCount }, true);
                            setPreviewTotalSheets(sheets);
                            triggerSaveRecordDraft({ ...current, answerPrintCount: newCount });
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item
                        name="answerPrintSide"
                        label="答案印刷方式"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 6 }}
                      >
                        <Radio.Group
                          buttonStyle="solid"
                          onChange={(e) => {
                            setAnswerPrintSide(e.target.value);
                            const current = form.getFieldsValue();
                            const sheets = computePreviewSheets({ ...current, answerPrintSide: e.target.value }, true);
                            setPreviewTotalSheets(sheets);
                            triggerSaveRecordDraft({ ...current, answerPrintSide: e.target.value });
                          }}
                        >
                          <Radio.Button value="1">单面印</Radio.Button>
                          <Radio.Button value="2">双面印</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          )}

          {/* 实时折合耗纸量提醒卡 */}
          <div
            style={{
              padding: '10px 16px',
              background: splitAnswer ? '#F6FFED' : '#E6F4FF',
              border: splitAnswer ? '1px solid #B7EB8F' : '1px solid #91CAFF',
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            {splitAnswer ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: '#237804', fontSize: 13, fontWeight: 600 }}>
                    📊 试卷与答案拆分耗纸核算明细：
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 'bold', color: '#389E0D' }}>
                    合计耗纸 {previewTotalSheets} 张 (约折合 {(previewTotalSheets / currentPaperRate).toFixed(2)} 包)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 12,
                    color: '#595959',
                    background: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #D9F7BE',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    📝 <b>[试卷]</b> {Math.max(1, (form.getFieldValue('pageCount') || 1) - (form.getFieldValue('answerPageCount') || 1))}页 × {form.getFieldValue('printCount') || 0}份 ({form.getFieldValue('printSide') === '2' ? '双面' : '单面'}) ➔ 耗纸 <b>{calculateTotalSheets(form.getFieldValue('printCount') || 0, Math.max(1, (form.getFieldValue('pageCount') || 1) - (form.getFieldValue('answerPageCount') || 1)), form.getFieldValue('printSide') || '1')}</b> 张
                  </span>
                  <Divider type="vertical" style={{ height: 'auto' }} />
                  <span>
                    📖 <b>[答案]</b> {form.getFieldValue('answerPageCount') || 1}页 × {form.getFieldValue('answerPrintCount') || 2}份 ({form.getFieldValue('answerPrintSide') === '2' ? '双面' : '单面'}) ➔ 耗纸 <b>{calculateTotalSheets(form.getFieldValue('answerPrintCount') || 2, form.getFieldValue('answerPageCount') || 1, form.getFieldValue('answerPrintSide') || '1')}</b> 张
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#0958D9', fontSize: 13 }}>
                  📊 自动换算实际纸张消耗总量：
                </span>
                <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1677FF' }}>
                  {previewTotalSheets} 张纸 (约折合 {(previewTotalSheets / currentPaperRate).toFixed(2)} 包)
                </span>
              </div>
            )}
          </div>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="teacherId" label="申请教师" rules={[{ required: true, message: '请选择教师' }]}>
                <Select
                  placeholder="选择教师"
                  showSearch
                  style={{ width: '100%', cursor: 'pointer' }}
                  onChange={handleTeacherChange}
                  filterOption={(input, option) =>
                    ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                  }
                  options={teacherList.map((t) => ({
                    label: `${t.teacherName} ${t.subject ? `(${t.subject})` : ''}`,
                    value: t.teacherId,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="grade" label="年级">
                <Select
                  placeholder="选择年级"
                  allowClear
                  style={{ width: '100%', cursor: 'pointer' }}
                  onChange={(v) => {
                    setSelectedGrade(v);
                    form.setFieldsValue({ classId: undefined });
                  }}
                  options={[
                    { label: '高一年级', value: '高一' },
                    { label: '高二年级', value: '高二' },
                    { label: '高三年级', value: '高三' },
                    { label: '高三复读部', value: '复读部' },
                    { label: '初中部', value: '初中部' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="classId" label="关联班级">
                <Select
                  placeholder="选择班级"
                  allowClear
                  showSearch
                  style={{ width: '100%', cursor: 'pointer' }}
                  filterOption={(input, option) =>
                    ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                  }
                  options={filteredClassList.map((c) => ({
                    label: c.className,
                    value: c.classId,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="operator" label="文印经办人" rules={[{ required: true, message: '请选择经办人' }]}>
                <Select
                  placeholder="请选择文印经办人"
                  showSearch
                  allowClear
                  style={{ width: '100%', cursor: 'pointer' }}
                  filterOption={(input, option) =>
                    ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                  }
                  options={operatorOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="printTime" label="印刷时间" rules={[{ required: true, message: '请选择印刷时间' }]}>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择印刷时间"
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="attachment"
                label="原稿电子文件 / 附件"
                extra="支持直接上传Word/PDF/Excel等，或输入网盘链接"
              >
                <FileUpload
                  placeholder="点击上传或拖拽原稿文件"
                  onUploadSuccess={(_url, uploadedName) => {
                    const currentPrintName = form.getFieldValue('printName');
                    if (!currentPrintName && uploadedName) {
                      const baseName = uploadedName.replace(/\.[^/.]+$/, '');
                      form.setFieldsValue({ printName: baseName });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="resultImg"
                label="印刷效果图 / 拍照留样"
                extra="支持本地图片上传、拖拽或 Ctrl+V 粘贴截图"
              >
                <ImageUpload placeholder="点击上传或拖拽留样图片" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="补充备注">
            <TextArea rows={2} placeholder="可填写装订要求（骑马钉/角钉）、考试时间等补充说明" />
          </Form.Item>
        </Form>
        </div>
      </Modal>

      {/* 微信记录文本智能提取与OCR截图识别弹窗 */}
      <Modal
        title="💬 微信群消息与截图智能解析预填"
        open={textModalOpen}
        onCancel={() => {
          setTextModalOpen(false);
        }}
        footer={
          ocrResult?.taskList && ocrResult.taskList.length > 1 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                onClick={() => {
                  setOcrResult(null);
                  setRawText('');
                }}
              >
                重新粘贴/识别
              </Button>
              <Space>
                <Button onClick={() => setTextModalOpen(false)}>取 消</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    applyTaskToForm(
                      currentQueueTask,
                      currentTaskIndex,
                      ocrResult.taskList.length,
                      ocrResult.taskList
                    );
                  }}
                >
                  {currentQueueTask?.alreadyRegistered
                    ? `当前任务已在库登记（强制重新预填 #${currentTaskIndex + 1}）`
                    : `确认并开始登记任务 #${currentTaskIndex + 1}`}
                </Button>
              </Space>
            </div>
          ) : null
        }
        width={720}
      >
        <div onPaste={handleModalPaste}>
          {ocrResult?.taskList && ocrResult.taskList.length > 1 ? (
            <div>
              {/* 识别成功与任务统计横幅 */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F6FFED',
                  border: '1px solid #B7EB8F',
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#52C41A', fontSize: 14 }}>
                    <CheckCircleFilled style={{ marginRight: 6 }} />
                    识别提取成功！检测到包含多条印刷任务（共 {ocrResult.taskList.length} 条，已查库自动跳过重复项）：
                  </span>
                  <Tag color={ocrResult.teacherMatched ? 'success' : 'warning'}>
                    {ocrResult.teacherMatched ? '✓ 教师已精准匹配' : '⚠️ 教师需核对/自选'}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                  点击下方对应任务项可切换核对，未登记项将依次顺序连续处理。原对话时间已自动识别并标注。
                </div>
              </div>

              {/* 任务卡片队列列表 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 280,
                  overflowY: 'auto',
                  marginBottom: 16,
                  padding: 2,
                }}
              >
                {ocrResult.taskList.map((task: any, idx: number) => {
                  const isCur = currentTaskIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentTaskIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: isCur ? '1.5px solid #1677FF' : '1px solid #d9d9d9',
                        backgroundColor: isCur
                          ? '#E6F4FF'
                          : task.alreadyRegistered
                          ? '#F5F5F5'
                          : '#FAFAFA',
                        opacity: task.alreadyRegistered ? 0.8 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, color: '#595959' }}>
                          #{idx + 1}
                        </span>
                        {task.alreadyRegistered ? (
                          <Tag color="default">
                            <CheckOutlined /> 已在库登记 (跳过)
                          </Tag>
                        ) : isCur ? (
                          <Tag color="processing">
                            <EditOutlined /> 待登记 (当前准备预填)
                          </Tag>
                        ) : (
                          <Tag color="warning">待登记 (排队中)</Tag>
                        )}
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: 13,
                            color: '#262626',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.printName}
                        </span>
                        {task.originalDocName && task.originalDocName !== task.printName && (
                          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                            ({task.originalDocName})
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: 12,
                          color: '#595959',
                          flexShrink: 0,
                        }}
                      >
                        {task.timeSnippet && (
                          <span style={{ color: '#8c8c8c' }}>
                            <ClockCircleOutlined /> {task.timeSnippet}
                          </span>
                        )}
                        <span style={{ fontWeight: 500, color: '#1677FF' }}>
                          {task.printCount} 份
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allTasksRegistered && (
                <div style={{ fontSize: 12, color: '#52C41A', marginBottom: 12 }}>
                  <CheckCircleFilled style={{ marginRight: 4 }} />
                  提示：截图/文本内识别出的所有印刷任务在系统中均已登记，无需重复登记！
                </div>
              )}
            </div>
          ) : (
            <>
              <Card title="方式一：直接粘贴微信聊天文字" size="small" style={{ marginBottom: 16 }}>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  支持直接复制老师在群里发的微信原话（包含跨天记录或多次连续发文）：
                </Paragraph>
                <TextArea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="在此处直接 Ctrl+V 粘贴微信群聊天文字（支持跨天多段记录）..."
                />
                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    loading={parsingText}
                    onClick={handleParseText}
                  >
                    一键智能提取并排队
                  </Button>
                </div>
              </Card>

              <Card title="方式二：本地离线 OCR 微信截图识别" size="small">
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  无需手工复制，直接把微信聊天截图拖拽上传、点击上传，或在此弹窗中直接 <strong>Ctrl+V</strong> 粘贴图片：
                </Paragraph>
                <Spin spinning={ocrLoading} tip="正在进行离线 OCR 智能识别与拓扑建模中...">
                  <Upload.Dragger
                    name="file"
                    multiple={false}
                    beforeUpload={handleOcrUpload}
                    showUploadList={false}
                    accept="image/*"
                    style={{ padding: '16px 0' }}
                    disabled={ocrLoading}
                  >
                    <p className="ant-upload-drag-icon">
                      <CameraOutlined style={{ fontSize: 32, color: '#1677FF' }} />
                    </p>
                    <p className="ant-upload-text">点击上传、拖拽截图，或直接按 Ctrl+V 粘贴</p>
                    <p className="ant-upload-hint">
                      支持跨天长截图、多任务多文件自动识别分流并排队连续登记
                    </p>
                  </Upload.Dragger>
                </Spin>
              </Card>
            </>
          )}
        </div>
      </Modal>

      {/* 独立队列清单弹窗（在表单登记中随时查看/切换） */}
      <Modal
        title="📋 批量识别连续登记队列任务清单"
        open={queueModalOpen}
        onCancel={() => setQueueModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setQueueModalOpen(false)}>
            关 闭
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              applyTaskToForm(
                currentQueueTask,
                currentTaskIndex,
                ocrResult?.taskList?.length || 1,
                ocrResult?.taskList
              );
            }}
          >
            载入选中的第 {currentTaskIndex + 1} 条材料
          </Button>,
        ]}
        width={650}
      >
        <div style={{ marginBottom: 12, fontSize: 12, color: '#8c8c8c' }}>
          点击下方任意任务可切换当前正在填写的材料；已登记任务自动跳过，也可强制重新载入。
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 360,
            overflowY: 'auto',
          }}
        >
          {ocrResult?.taskList?.map((task: any, idx: number) => {
            const isCur = currentTaskIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => setCurrentTaskIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: isCur ? '1.5px solid #1677FF' : '1px solid #d9d9d9',
                  backgroundColor: isCur
                    ? '#E6F4FF'
                    : task.alreadyRegistered
                    ? '#F5F5F5'
                    : '#FAFAFA',
                  opacity: task.alreadyRegistered ? 0.8 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 13, color: '#595959' }}>
                    #{idx + 1}
                  </span>
                  {task.alreadyRegistered ? (
                    <Tag color="default">
                      <CheckOutlined /> 已在库登记 (跳过)
                    </Tag>
                  ) : isCur ? (
                    <Tag color="processing">
                      <EditOutlined /> 当前登记中
                    </Tag>
                  ) : (
                    <Tag color="warning">待登记 (排队中)</Tag>
                  )}
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: 13,
                      color: '#262626',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.printName}
                  </span>
                  {task.originalDocName && task.originalDocName !== task.printName && (
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      ({task.originalDocName})
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                    color: '#595959',
                    flexShrink: 0,
                  }}
                >
                  {task.timeSnippet && (
                    <span style={{ color: '#8c8c8c' }}>
                      <ClockCircleOutlined /> {task.timeSnippet}
                    </span>
                  )}
                  <span style={{ fontWeight: 500, color: '#1677FF' }}>{task.printCount} 份</span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* 标记完成与成品留样弹窗 */}
      <Modal
        title="标记印刷完成 & 上传成品留样"
        open={completeModalOpen}
        onOk={handleSaveComplete}
        onCancel={() => setCompleteModalOpen(false)}
        destroyOnHidden
      >
        {completeTarget && (
          <div
            style={{
              background: '#F0F5FF',
              border: '1px solid #D6E4FF',
              borderRadius: 6,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 14, color: '#1D39C4', marginBottom: 4 }}>
              🖨️ {completeTarget.printName}
            </div>
            <div style={{ fontSize: 12, color: '#595959', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>申请教师: <b>{completeTarget.teacherName || '-'}</b></span>
              <span>印刷份数: <b style={{ color: '#1677FF' }}>{completeTarget.printCount} 份</b></span>
              <span>纸张规格: <b>{completeTarget.paperGoodsName || completeTarget.paperType || 'A4'}</b></span>
            </div>
          </div>
        )}
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="resultImg"
            label="印刷成品效果图 / 拍照留样"
            extra="印完后拍照留样归档，支持本地选择、拖拽或按 Ctrl+V 粘贴截图"
          >
            <ImageUpload placeholder="点击上传或拖拽成品留样图片" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 印刷登记详细信息弹窗 */}
      <Modal
        title="印刷登记详细档案"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
        width={680}
      >
        {currentRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="登记编号">{currentRecord.printId}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {currentRecord.status === '0' && <Tag color="warning">待印刷</Tag>}
              {currentRecord.status === '1' && <Tag color="success">已完成</Tag>}
              {currentRecord.status === '2' && <Tag color="default">已作废</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="印刷名称" span={2}>
              <Text strong>{currentRecord.printName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="申请教师">{currentRecord.teacherName || '-'}</Descriptions.Item>
            <Descriptions.Item label="年级/班级">
              {currentRecord.grade || ''} {currentRecord.className || ''}
            </Descriptions.Item>
            <Descriptions.Item label="印刷用纸">{currentRecord.paperType || 'A4'}</Descriptions.Item>
            <Descriptions.Item label="单双面">
              {currentRecord.printSide === '2' ? '双面' : '单面'}
            </Descriptions.Item>
            <Descriptions.Item label="印刷份数">{currentRecord.printCount} 份</Descriptions.Item>
            <Descriptions.Item label="每份页数">{currentRecord.pageCount || 1} 页</Descriptions.Item>
            <Descriptions.Item label="纸张总消耗量" span={2}>
              <Text strong style={{ color: '#1677FF' }}>
                {currentRecord.totalPages} 张纸
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="经办人">{currentRecord.operator}</Descriptions.Item>
            <Descriptions.Item label="印刷时间">{currentRecord.printTime}</Descriptions.Item>
            <Descriptions.Item label="关联出库单号" span={2}>
              {currentRecord.outNo ? (
                <Tag color="cyan">{currentRecord.outNo}</Tag>
              ) : (
                <Text type="secondary">未生成出库单</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="原稿附件" span={2}>
              {currentRecord.attachment ? (
                <a href={currentRecord.attachment} target="_blank" rel="noreferrer">
                  {currentRecord.attachment}
                </a>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="成品拍照留样" span={2}>
              {currentRecord.resultImg ? (
                <Image src={currentRecord.resultImg} width={120} />
              ) : (
                '暂无成品图片'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="备注说明" span={2}>
              {currentRecord.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
};

export default PrintRecordPage;
