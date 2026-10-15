import { createClientId } from '@/utils/clientId';
import ChatSourcePanel from './ChatSourcePanel';
import {
  derivePrintFields,
  calculateFormalSheets,
  calculateTotalSheetsWithExtra,
  calculateSplitSheetsWithExtra,
  DEFAULT_TEMPLATE_PAPER_COUNT,
  DEFAULT_PREVIEW_PAPER_COUNT,
  isLegacyExtraPaperRecord,
  formatExtraPaperLabel,
} from './printRules';
import ChatCandidateList from './ChatCandidateList';
import ChatDebugPanel from './ChatDebugPanel';
import type { ChatDebugEntry } from './ChatDebugPanel';
import { readChatClipboard, recoverChatClipboard, attachmentNameMatches, isDocument, fileCandidates, attachFiles, namespaceResult, mergeSessions, dayKey } from './chatPrefill';
import type { PrefillResult, PrintCandidate, UploadedAttachment } from './chatPrefill';
import {
  loadWechatExportManifest,
  applyRegisteredStatusToManifest,
  loadSavedContactSelection,
  saveContactSelection,
  filterManifestConversations,
  readSelectedConversationsMessages,
  type WechatExportDirectorySession,
  type FileLike,
} from './wechatExportImport';
import { fastAnalyzeFile } from './documentAnalyzer';
import { useTableMultiSort } from '@/hooks/useTableMultiSort';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Alert,
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
  Table,
  Tag,
  Tooltip,
  Typography,
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
  MessageOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  EditOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  QuestionCircleOutlined,
  WarningOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
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
  addRecordBatch,
  updateRecord,
  delRecord,
  cancelRecord,
  completeRecord,
  completeRecords,
  cancelRecords,
  recordPrintError,
  textParse,
  structuredParse,
  getWechatExportRegisteredStatus,
  ocrParse,
  uploadFile,
  uploadFileSmart,
  analyzeDocument,
} from '@/api/edu/record';
import { listTeacher, addTeacher } from '@/api/edu/teacher';
import { listClass } from '@/api/edu/class';
import { listGoods } from '@/api/stock/goods';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 从附件 URL 提取文件名（用于详情展示，避免整条 URL 裸露）
const getFileName = (url?: string): string => {
  if (!url) return '附件';
  const seg = url.split('/').pop() || url;
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
};

// 纸张面积（mm²），用于源纸张规格 → 目标纸张规格的面积比换算页数
const PAPER_AREA: Record<string, number> = {
  A4: 210 * 297,
  A3: 297 * 420,
  '8K': 260 * 370,
  '16K': 195 * 270,
};

// 根据源纸张规格与目标纸张规格，按面积比换算页数（一页多张打印）
// 目标纸张更大（面积≥1.5倍）：一页多张 → 页数减半；目标纸张更小：拆分放大 → 页数加倍；
// 面积接近或源纸张未知则保持不变
const convertPageCount = (
  sourcePages: number | null,
  sourcePaper: string | null,
  targetPaper: string
): number | null => {
  if (!sourcePages || sourcePages <= 0) return sourcePages;
  if (!sourcePaper || sourcePaper === targetPaper) return sourcePages;
  const srcArea = PAPER_AREA[sourcePaper];
  const dstArea = PAPER_AREA[targetPaper];
  if (!srcArea || !dstArea) return sourcePages;
  if (dstArea >= srcArea * 1.5) {
    return Math.ceil(sourcePages / 2);
  }
  if (srcArea >= dstArea * 1.5) {
    return sourcePages * 2;
  }
  return sourcePages;
};

// 常用纸张为 8K；仅当原稿为 A4 且仅 1 页时改用 16K（8K 印单张 A4 会浪费半张纸）
const inferPaperType = (sourcePaper: string | null, sourcePages: number | null | undefined): string => {
  if (sourcePaper === 'A4' && sourcePages !== null && sourcePages !== undefined && sourcePages <= 1) {
    return '16K';
  }
  return '8K';
};

// 单页默认单面印刷（1 页双面与单面耗纸一致，且单页双面无意义）
const inferPrintSide = (pageCount: number | null | undefined): string => {
  const p = Number(pageCount) || 1;
  return p <= 1 ? '1' : '2';
};

const PrintRecordPage: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);
  const navigate = useNavigate();
  const { name: currentUserName, nickName: currentNickName } = useUserStore();
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  // 表格多字段组合排序（默认按照印刷时间倒序）
  const isFirstSortRender = useRef(true);
  const {
    sortList,
    getSortParams,
    renderSortHeader,
    renderSortBar,
  } = useTableMultiSort({
    defaultField: 'printTime',
    defaultOrder: 'descend',
    defaultLabel: '印刷时间',
    defaultDbColumn: 'r.print_time',
  });

  useEffect(() => {
    if (isFirstSortRender.current) {
      isFirstSortRender.current = false;
      return;
    }
    actionRef.current?.reload();
  }, [sortList]);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增印刷登记');
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isManualReplacingAttachment, setIsManualReplacingAttachment] = useState<boolean>(false);

  // 详情与出库单弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<any>(null);

  // 修改弹窗（待印刷状态专用）
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm] = Form.useForm();

  // 印刷错误登记弹窗
  const [printErrorModalOpen, setPrintErrorModalOpen] = useState(false);
  const [printErrorTarget, setPrintErrorTarget] = useState<any>(null);
  const [printErrorSaving, setPrintErrorSaving] = useState(false);
  const [printErrorForm] = Form.useForm();

  // 微信文本解析弹窗
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsingText, setParsingText] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState<ChatDebugEntry[]>([]);
  const [debugSelected, setDebugSelected] = useState('');
  const updateDebug = (id:string, patch:Partial<ChatDebugEntry>) => setDebugEntries(entries=>entries.map(e=>e.id===id?{...e,...patch}:e));
  const startDebug = (source:string, snapshot:ReturnType<typeof readChatClipboard>) => {
    const id=createClientId();
    setDebugEntries(entries=>[...entries,{id,time:new Date().toLocaleTimeString(),source,status:'读取中',
      types:snapshot.types,items:snapshot.items,plain:snapshot.plain,html:snapshot.html,eventText:snapshot.text,
      files:snapshot.files.map(f=>({name:f.name,type:f.type,size:f.size}))}].slice(-10));
    setDebugSelected(id); return id;
  };

  // 微信智能识别解析与跨天多任务队列
  const [ocrResult, setOcrResult] = useState<PrefillResult | null>(null);
  const sourceMessageById = React.useMemo(() => new Map((ocrResult?.messages || []).map(message => [message.id, message])), [ocrResult?.messages]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [previewTaskIndex, setPreviewTaskIndex] = useState(0);
  const taskDraftsRef = useRef(new Map<string, Record<string, unknown>>());
  const taskRulesRef = useRef(new Map<string,{task:PrintCandidate;manual:Set<string>}>());
  const activeTaskIdRef = useRef<string | undefined>(undefined);
  const pasteChainRef = useRef<Promise<void>>(Promise.resolve());
  const importPendingRef = useRef(0);
  const saveLockRef = useRef(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [sessionAttachments, setSessionAttachments] = useState<UploadedAttachment[]>([]);


  // 当前表单源文档解析信息（源页数 + 源纸张规格），用于纸张规格切换时面积比换算
  // 使用 ref 保证切换纸张规格/程序化填充时始终读取最新值，避免状态闭包导致换算错乱
  const sourcePageInfoRef = useRef<{ pageCount: number; sourcePaperType: string | null } | null>(null);

  // 当前选中的队列任务
  const currentQueueTask = React.useMemo(() => {
    if (ocrResult?.taskList && ocrResult.taskList.length > 0) {
      return ocrResult.taskList[currentTaskIndex] || ocrResult.taskList[0];
    }
    return null;
  }, [ocrResult, currentTaskIndex]);

  // 基础数据下拉选项
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [paperGoodsList, setPaperGoodsList] = useState<any[]>([]);

  // 动态联动状态
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [previewTotalSheets, setPreviewTotalSheets] = useState(1);

  // 快捷新建教师弹窗
  const [teacherForm] = Form.useForm();
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  // 新建教师的触发来源：form（登记表单）或 queue（预填多任务队列）
  const [teacherAddContext, setTeacherAddContext] = useState<'form' | 'queue' | null>(null);

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
    return matched ? matched.goodsId : (ocrResult ? undefined : paperList[0]?.goodsId);
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

  // 解析单个已上传文档（PDF/Word/Excel），自动填充页数并按当前纸张规格换算，缓存源纸张规格
  const analyzeAndFillDocument = async (file: File) => {
    const taskId = activeTaskIdRef.current;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['docx', 'docm', 'pdf', 'xls', 'xlsx', 'xlsm', 'doc'].includes(ext)) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await analyzeDocument(formData);
      const analysis = res?.data;
      if (activeTaskIdRef.current !== taskId) return;
      if (!analysis) {
        message.info('未获取到文档解析结果，请手动填写页数');
        sourcePageInfoRef.current = null;
        return;
      }
      const pageCount = analysis.pageCount ? Number(analysis.pageCount) : 0;
      const sourcePaper = analysis.sourcePaperType || null;
      if (pageCount > 0 && analysis.parseable) {
        if (ocrResult) {
          const state=taskId ? taskRulesRef.current.get(taskId) : undefined;
          if(state && !/^xls/.test(ext)) {
            state.task={...state.task,sourcePageCount:pageCount,sourcePaperType:sourcePaper || undefined};
            const patch=derivePrintFields(state.task,form.getFieldsValue(true),state.manual);
            form.setFieldsValue({...patch,...(!state.manual.has('paperGoodsId')?{paperGoodsId:findGoodsByPaperType(patch.paperType,paperGoodsList)}:{})});
            syncSplitDefaults(state.task,patch.pageCount,state.manual);
          }
          return;
        }
        // 自动推断纸张规格（默认 8K，单页 A4 → 16K）并按面积比换算页数、同步单双面
        const inferredPaperType = inferPaperType(sourcePaper, pageCount);
        const converted = convertPageCount(pageCount, sourcePaper, inferredPaperType);
        const finalPages = converted && converted > 0 ? converted : 1;
        form.setFieldsValue({
          paperType: inferredPaperType,
          paperGoodsId: findGoodsByPaperType(inferredPaperType, paperGoodsList),
          pageCount: finalPages,
          printSide: inferPrintSide(finalPages),
        });
        sourcePageInfoRef.current = { pageCount, sourcePaperType: sourcePaper };
        if (sourcePaper) {
          message.success(`已解析：共 ${pageCount} 页（${sourcePaper}），自动选用 ${inferredPaperType}，按规格换算为 ${finalPages} 页`);
        } else {
          message.success(`已解析：共 ${pageCount} ${/^xls/.test(ext) ? '个工作表' : '页'}`);
        }
      } else if (analysis.msg) {
        message.info(analysis.msg);
        sourcePageInfoRef.current = null;
      }
    } catch (err: any) {
      sourcePageInfoRef.current = null;
    }
  };

  // 解析文档并缓存到 docAnalysisRef（供微信粘贴上传或导出匹配的文档在填充任务时换算页数）
  const analyzeDocumentIntoCache = async (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['docx', 'docm', 'pdf', 'xls', 'xlsx', 'xlsm', 'doc'].includes(ext)) return null;
    try {
      const fastResult = await fastAnalyzeFile(file);
      if (fastResult && fastResult.pageCount && fastResult.pageCount > 0) {
        return fastResult;
      }
    } catch {
      // 本地解析失败回退服务端接口
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await analyzeDocument(formData);
      const analysis = res?.data;
      if (analysis && analysis.parseable && analysis.pageCount) {
        return analysis;
      }
      return analysis || null;
    } catch (e) {
      // 忽略解析失败，页数回退手动填写
      return null;
    }
  };

  // 监听纸张规格切换，联动自动选择匹配的用纸耗材，并按源文档面积比换算页数
  const handlePaperTypeChange = (paperType: string) => {
    const matchedId = findGoodsByPaperType(paperType, paperGoodsList);
    if (matchedId) {
      form.setFieldsValue({ paperGoodsId: matchedId });
    }
    const state=activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
    if(ocrResult && state) {
      state.manual.add('paperType');
      form.setFieldsValue({...derivePrintFields(state.task,{...form.getFieldsValue(true),paperType},state.manual),paperGoodsId:matchedId});
      return;
    }
    if (sourcePageInfoRef.current && sourcePageInfoRef.current.pageCount > 0) {
      const converted = convertPageCount(sourcePageInfoRef.current.pageCount, sourcePageInfoRef.current.sourcePaperType, paperType);
      if (converted && converted > 0) {
        form.setFieldsValue(ocrResult ? { pageCount: converted } : { pageCount: converted, printSide: inferPrintSide(converted) });
      }
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // 计算预计耗纸张数（含模板用纸与印刷预览用纸；编辑历史记录时按该记录保存的两项数量计算）
  const calculateTotalSheets = (
    count: number,
    pages: number,
    side: string,
    templatePaperCount: number = DEFAULT_TEMPLATE_PAPER_COUNT,
    previewPaperCount: number = DEFAULT_PREVIEW_PAPER_COUNT
  ) => {
    return calculateTotalSheetsWithExtra(count, pages, side, templatePaperCount, previewPaperCount);
  };

  // 试卷与答案合并拆分模式状态
  const [splitAnswer, setSplitAnswer] = useState<boolean>(false);
  const [answerPageCount, setAnswerPageCount] = useState<number>(1);
  const [answerPrintCount, setAnswerPrintCount] = useState<number>(2);
  const [answerPrintSide, setAnswerPrintSide] = useState<string>('1');
  const [draftNotice, setDraftNotice] = useState<{ visible: boolean; timeText: string } | null>(null);
  const [discardLoading, setDiscardLoading] = useState(false);
  const [currentEditRecord, setCurrentEditRecord] = useState<any>(null);

  // 获取当前表单适用的模板用纸与预览用纸张数（新增固定 1+1，编辑已有记录沿用记录自身保存的值）
  const getActiveExtraPaperCounts = (recordOverride?: any) => {
    const target = recordOverride ?? (isEdit ? currentEditRecord : null);
    if (target) {
      return {
        templatePaperCount: Number(target.templatePaperCount ?? 0),
        previewPaperCount: Number(target.previewPaperCount ?? 0),
      };
    }
    return {
      templatePaperCount: DEFAULT_TEMPLATE_PAPER_COUNT,
      previewPaperCount: DEFAULT_PREVIEW_PAPER_COUNT,
    };
  };

  // 统一动态计算总耗纸张数（支持普通单份录入与试卷答案合并拆分录入）
  const computePreviewSheets = (values: any, isSplit: boolean, recordOverride?: any) => {
    if (!values?.printCount || !values?.pageCount || !values?.printSide) return 0;
    const { templatePaperCount, previewPaperCount } = getActiveExtraPaperCounts(recordOverride);
    if (isSplit) {
      const totalPageCount = Number(values?.pageCount) || 1;
      const ansPage = Math.min(Math.max(1, Number(values?.answerPageCount) || 1), Math.max(1, totalPageCount - 1));
      const examPage = Math.max(1, totalPageCount - ansPage);
      const splitCalc = calculateSplitSheetsWithExtra(
        values?.printCount || 0,
        examPage,
        values?.printSide || '1',
        values?.answerPrintCount || 0,
        ansPage,
        values?.answerPrintSide || '1',
        templatePaperCount,
        previewPaperCount
      );
      return splitCalc.totalSheets;
    }
    return calculateTotalSheets(
      values?.printCount || 0,
      values?.pageCount || 1,
      values?.printSide || '1',
      templatePaperCount,
      previewPaperCount
    );
  };

  // 统一以受控表单字段为单一数据源计算耗纸预览，避免 setFieldsValue 与 onValuesChange
  // 触发时序错乱导致底部「合计耗纸」与「每份页数」不一致（A4/8K 结果对调的 bug）
  const watchedPrintCount = Form.useWatch('printCount', form);
  const watchedPageCount = Form.useWatch('pageCount', form);
  const watchedPrintSide = Form.useWatch('printSide', form);
  const watchedSplitAnswer = Form.useWatch('splitAnswer', form);
  const watchedAnswerPageCount = Form.useWatch('answerPageCount', form);
  const watchedAnswerPrintCount = Form.useWatch('answerPrintCount', form);
  const watchedAnswerPrintSide = Form.useWatch('answerPrintSide', form);
  const watchedAttachment = Form.useWatch('attachment', form);

  useEffect(() => {
    const values = {
      printCount: watchedPrintCount,
      pageCount: watchedPageCount,
      printSide: watchedPrintSide,
      splitAnswer: watchedSplitAnswer,
      answerPageCount: watchedAnswerPageCount,
      answerPrintCount: watchedAnswerPrintCount,
      answerPrintSide: watchedAnswerPrintSide,
    };
    const isSplit = values.splitAnswer === undefined ? splitAnswer : !!values.splitAnswer;
    setPreviewTotalSheets(computePreviewSheets(values, isSplit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPrintCount, watchedPageCount, watchedPrintSide, watchedSplitAnswer, watchedAnswerPageCount, watchedAnswerPrintCount, watchedAnswerPrintSide, isEdit, currentEditRecord]);

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
  const syncSplitDefaults = (task:PrintCandidate,pages:number|undefined,manual:Set<string>) => {
    if(['splitAnswer','answerPageCount','answerPrintCount','answerPrintSide'].some(key=>manual.has(key))) return;
    const linked=(task.sourceMessageIds || []).map(id=>sourceMessageById.get(id)?.text).filter(Boolean).join('\n');
    const split=detectSplitAnswerInfo(linked,pages || 0);
    if(split) {
      form.setFieldsValue(split); setSplitAnswer(true);
      setAnswerPageCount(split.answerPageCount); setAnswerPrintCount(split.answerPrintCount); setAnswerPrintSide(split.answerPrintSide);
    } else {
      form.setFieldsValue({splitAnswer:false}); setSplitAnswer(false);
    }
  };

  // 触发草稿保存
  const triggerSaveRecordDraft = (values?: any) => {
    const current = values || form.getFieldsValue();
    if (ocrResult) {
      if (activeTaskIdRef.current) taskDraftsRef.current.set(activeTaskIdRef.current,current);
      return;
    }
    const targetId = isEdit ? editId : 'create';
    FormDraftUtil.saveDraft('edu_record', targetId, current);
    const d = FormDraftUtil.getDraft('edu_record', targetId);
    if (d) {
      setDraftNotice({ visible: true, timeText: d.timeText });
    }
  };

  // 切换试卷与答案拆分模式
  const handleSplitAnswerToggle = (checked: boolean) => {
    const state=activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
    if(state) state.manual.add('splitAnswer');
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

  // 快捷设置印刷份数胶囊
  const handleQuickSetPrintCount = (count: number) => {
    const state = activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
    if (state) state.manual.add('printCount');
    form.setFieldsValue({ printCount: count });
    const current = form.getFieldsValue();
    const sheets = computePreviewSheets({ ...current, printCount: count }, splitAnswer);
    setPreviewTotalSheets(sheets);
    triggerSaveRecordDraft({ ...current, printCount: count });
  };

  // 快捷追加装订与加工要求备注标签
  const handleAppendRemarkTag = (tagText: string) => {
    const curRemark = (form.getFieldValue('remark') || '').trim();
    if (tagText === '__CLEAR__') {
      form.setFieldsValue({ remark: '' });
      triggerSaveRecordDraft({ ...form.getFieldsValue(), remark: '' });
      return;
    }
    if (curRemark.includes(tagText)) return;
    const newRemark = curRemark ? `${curRemark}，${tagText}` : tagText;
    form.setFieldsValue({ remark: newRemark });
    triggerSaveRecordDraft({ ...form.getFieldsValue(), remark: newRemark });
  };

  // 监听表单数字变化以联动计算耗纸并保存草稿
  const handleFormValuesChange = (changed: Record<string,unknown>, allValues: any) => {
    const state=activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
    if(ocrResult && state) {
      Object.keys(changed).forEach(key=>state.manual.add(key));
      const fields=derivePrintFields(state.task,allValues,state.manual);
      form.setFieldsValue(fields);
      allValues={...allValues,...fields};
      syncSplitDefaults(state.task,fields.pageCount,state.manual);
      allValues=form.getFieldsValue(true);
    }
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
      if (ocrResult) applyTeacherToQueue(t);
      triggerSaveRecordDraft(form.getFieldsValue());
    }
  };

  // 快捷新建教师：从当前表单预填识别到的教师信息，打开精简新建弹窗
  const handleQuickAddTeacher = () => {
    setTeacherAddContext('form');
    const currentTeacherName = form.getFieldValue('teacherName');
    const currentGrade = form.getFieldValue('grade');
    const tempEntry = teacherList.find((t) => t.teacherId === -999);
    const rawName = tempEntry?.rawName || currentTeacherName || '';

    teacherForm.resetFields();
    teacherForm.setFieldsValue({
      teacherType: '1',
      teacherName: rawName,
      grade: currentGrade || selectedGrade || '',
      subject: tempEntry?.subject || '',
      status: '0',
    });
    setTeacherModalOpen(true);
  };

  // 保存新教师：创建后刷新列表并自动选中
  const handleSaveNewTeacher = async () => {
    try {
      const values = await teacherForm.validateFields();
      setTeacherSaving(true);
      const payload = {
        ...values,
        classIds: '',
      };
      await addTeacher(payload);
      message.success('教师档案创建成功！');

      // 刷新教师列表
      const res: any = await listTeacher({ pageSize: 500 });
      const freshList = res?.rows || [];
      setTeacherList(freshList);

      // 按姓名匹配新创建的教师并自动选中
      const newTeacher = freshList.find(
        (t: any) => t.teacherName === values.teacherName
      );
      if (newTeacher) {
        if (teacherAddContext === 'queue') {
          // 预填多任务队列：将新建教师批量应用到全部待登记任务
          applyTeacherToQueue(newTeacher);
        } else {
          form.setFieldsValue({
            teacherId: newTeacher.teacherId,
            teacherName: newTeacher.teacherName,
            grade: newTeacher.grade || form.getFieldValue('grade'),
          });
          if (newTeacher.grade) {
            setSelectedGrade(newTeacher.grade);
          }
        }
      }
      setTeacherModalOpen(false);
      if (teacherAddContext !== 'queue') {
        triggerSaveRecordDraft(form.getFieldsValue());
      }
      setTeacherAddContext(null);
    } catch (e: any) {
      message.error(e.message || '教师创建失败');
    } finally {
      setTeacherSaving(false);
    }
  };

  // 批量指定申请教师：将所选教师应用到当前候选所属联系人的待登记任务（优先按会话 ID 匹配，避免同名联系人混用）
  const applyTeacherToQueue = (teacher: any, explicitTargetTask?: PrintCandidate) => {
    if (!ocrResult?.taskList) return;
    const targetTask =
      explicitTargetTask ||
      (textModalOpen || exportModalOpen ? ocrResult.taskList[previewTaskIndex] : currentQueueTask);
    if (!targetTask) return;

    const isSameContact = (task: PrintCandidate) => {
      if (targetTask.sourceConversationId) {
        return task.sourceConversationId === targetTask.sourceConversationId;
      }
      return !task.sourceConversationId && task.sender === targetTask.sender;
    };

    const updated = ocrResult.taskList.map((task: any) => {
      if (task.alreadyRegistered || task.skipped || !isSameContact(task)) return task;
      if (task.taskId && taskDraftsRef.current.has(task.taskId)) {
        const draft = taskDraftsRef.current.get(task.taskId)!;
        taskDraftsRef.current.set(task.taskId, {
          ...draft,
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          grade: draft.grade || teacher.grade,
        });
      }
      return {
        ...task,
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        teacherMatched: true,
        grade: task.grade || teacher.grade || undefined,
      };
    });
    setOcrResult({ ...ocrResult, taskList: updated, teacherMatched: true });
    if (currentQueueTask && isSameContact(currentQueueTask) && modalOpen) {
      form.setFieldsValue({
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        grade: form.getFieldValue('grade') || teacher.grade,
      });
    }
    message.success(`已批量指定申请教师：${teacher.teacherName}`);
  };

  const handleBatchAssignTeacher = (teacherId: any, explicitTargetTask?: PrintCandidate) => {
    const t = teacherList.find((item) => String(item.teacherId) === String(teacherId));
    if (t) applyTeacherToQueue(t, explicitTargetTask);
  };

  // 批量指定印刷份数：将设置份数统一应用到多任务队列中所有待登记任务
  const handleQuickAddTeacherForQueue = () => {
    setTeacherAddContext('queue');
    teacherForm.resetFields();
    teacherForm.setFieldsValue({
      teacherType: '1',
      teacherName: '',
      grade: '',
      subject: '',
      status: '0',
    });
    setTeacherModalOpen(true);
  };

  // 微信导出目录导入状态
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSession, setExportSession] = useState<WechatExportDirectorySession | null>(null);
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);
  const [exportSearchKeyword, setExportSearchKeyword] = useState('');
  const [exportRegisteredFilter, setExportRegisteredFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [exportHideEmpty, setExportHideEmpty] = useState(false);
  const [exportHideBusiness, setExportHideBusiness] = useState(true);
  const [exportOnlySelected, setExportOnlySelected] = useState(false);
  const eligibleExportSelectedIds = React.useMemo(() => filterManifestConversations(
    exportSession?.conversations || [], { hideBusiness: exportHideBusiness, selectedIds: exportSelectedIds }
  ).map(c => c.id), [exportSession, exportHideBusiness, exportSelectedIds]);
  const [exportDateRange, setExportDateRange] = useState<[any, any] | null>(null);
  const [exportLoadingManifest, setExportLoadingManifest] = useState(false);
  const [exportRecognizing, setExportRecognizing] = useState(false);
  const [exportDamagedNotices, setExportDamagedNotices] = useState<{ conversationId: string; conversationName: string; reason: string }[]>([]);
  const matchedDocumentAnalysisRef = useRef(new WeakMap<File, Promise<any>>());
  const matchedAnalysisQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [matchedAnalysisStatus, setMatchedAnalysisStatus] = useState<{taskId?:string; loading:boolean; text:string}>({loading:false,text:''});
  const [matchedAnalysisRetry, setMatchedAnalysisRetry] = useState(0);
  const exportFolderInputRef = useRef<HTMLInputElement | null>(null);
  const exportStep2CardRef = useRef<HTMLDivElement | null>(null);
  // 按导入批次隔离缓存微信导出目录中匹配到的本地文件引用（key = `${batchId}:${relPath}`，仅在实际保存登记时才上传）
  const exportAttachmentFilesRef = useRef<Map<string, FileLike>>(new Map());

  const currentStorageUserKey = React.useMemo(
    () => currentUserName || currentNickName || 'anonymous',
    [currentUserName, currentNickName]
  );

  // 更新并持久化微信导出联系人勾选状态（按当前系统用户 + 会话 ID 保存在浏览器）
  const updateExportSelectedIds = (nextIds: string[]) => {
    const unique = Array.from(new Set(nextIds.filter(Boolean)));
    setExportSelectedIds(unique);
    saveContactSelection(currentStorageUserKey, unique);
  };

  // 第一步：选择整个微信导出文件夹，仅读取 导出清单.json，不读取各会话 messages.js
  const handleSelectExportFolder = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setExportLoadingManifest(true);
    setExportDamagedNotices([]);
    try {
      let session = await loadWechatExportManifest(files);
      // 查询后端已登记状态
      try {
        const allConvIds = session.conversations.map((c) => c.id);
        if (allConvIds.length > 0) {
          const statusRes: any = await getWechatExportRegisteredStatus(allConvIds);
          if (statusRes?.data) {
            session = applyRegisteredStatusToManifest(session, statusRes.data);
          }
        }
      } catch {
        // 即使后端状态查询异常也不阻断清单展示
      }
      setExportSession(session);
      // 恢复当前系统用户在当前浏览器保存的联系人会话 ID 选择（首次全部未选，新联系人默认未选）
      const restored = loadSavedContactSelection(
        currentStorageUserKey,
        session.conversations.map((c) => c.id)
      );
      setExportSelectedIds(restored);
      message.success(
        `已读取导出清单：共 ${session.conversations.length} 个会话${restored.length > 0 ? `，已恢复上次勾选的 ${restored.length} 个联系人` : '（首次默认全部未选）'}`
      );
    } catch (err: any) {
      message.error(err?.message || '读取微信导出目录清单失败');
    } finally {
      setExportLoadingManifest(false);
    }
  };

  // 第二步：点击“开始识别”后才按需读取选中会话的 data/messages.js 并调用后端结构化解析接口
  const handleStartExportRecognize = async () => {
    if (!exportSession) {
      message.warning('请先选择微信导出目录文件夹');
      return;
    }
    if (eligibleExportSelectedIds.length === 0) {
      message.warning('请先勾选至少 1 个需要识别的联系人会话');
      return;
    }
    setExportRecognizing(true);
    try {
      const startDate = exportDateRange?.[0] ? dayjs(exportDateRange[0]).format('YYYY-MM-DD') : undefined;
      const endDate = exportDateRange?.[1] ? dayjs(exportDateRange[1]).format('YYYY-MM-DD') : undefined;
      const readRes = await readSelectedConversationsMessages(exportSession, eligibleExportSelectedIds, {
        startDate,
        endDate,
      });
      setExportDamagedNotices(readRes.damagedConversations || []);

      if (readRes.conversations.length === 0) {
        const emptyInfo = readRes.emptyConversations.length > 0
          ? `（所选 ${readRes.emptyConversations.length} 个会话在当前日期范围内无消息）`
          : '';
        message.info(`未读取到可解析的聊天消息${emptyInfo}`);
        return;
      }

      const batchId = createClientId();
      const res: any = await structuredParse({
        conversations: readRes.conversations,
        startDate,
        endDate,
      });
      const parsedData = (res?.data || { taskList: [], messages: [], rawText: '' }) as PrefillResult;

      // 按当前导入批次 (batchId) 隔离缓存本地附件，仅使用本次 readRes.attachmentFilesByPath 中实际存在的文件，避免跨次导入同名覆盖或串用旧缓存
      parsedData.taskList = (parsedData.taskList || []).map((task) => {
        const relPath = task.attachmentRelativePath || task.matchedAttachmentPath;
        if (relPath && !task.exportMediaError && task.attachmentStatus !== 'missing' && readRes.attachmentFilesByPath.has(relPath)) {
          const matchedFile = readRes.attachmentFilesByPath.get(relPath)!;
          const attachmentCacheKey = `${batchId}:${relPath}`;
          exportAttachmentFilesRef.current.set(attachmentCacheKey, matchedFile);
          return {
            ...task,
            matchedAttachmentKey: attachmentCacheKey,
            matchedAttachmentPath: relPath,
            attachmentStatus: 'matched',
            matchedAttachmentName: matchedFile.name,
          };
        }
        return {
          ...task,
          matchedAttachmentKey: undefined,
        };
      });

      if (!parsedData.taskList.length) {
        message.info('选中联系人的聊天记录中未发现打印需求或材料');
        return;
      }

      const incoming = namespaceResult(parsedData, batchId);
      if (activeTaskIdRef.current && modalOpen) {
        taskDraftsRef.current.set(activeTaskIdRef.current, form.getFieldsValue(true));
      }
      setOcrResult((previous) => mergeSessions(previous, incoming));
      setPreviewTaskIndex(0);
      message.success(
        `已完成 ${readRes.conversations.length} 个联系人会话解析，生成 ${incoming.taskList.length} 条登记候选！请逐条核对确认`
      );
      setTimeout(() => {
        exportStep2CardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      message.error(err?.message || '结构化聊天记录识别失败');
    } finally {
      setExportRecognizing(false);
    }
  };

  // 切换候选的“跳过 / 不登记”状态
  const handleToggleSkipCandidate = (index: number) => {
    if (!ocrResult?.taskList) return;
    const target = ocrResult.taskList[index];
    if (!target) return;
    const nextSkipped = !target.skipped;
    const updatedTaskList = ocrResult.taskList.map((item, i) =>
      i === index ? { ...item, skipped: nextSkipped } : item
    );
    setOcrResult({
      ...ocrResult,
      taskList: updatedTaskList,
    });
    message.info(nextSkipped ? `已跳过候选【${target.printName || '未命名材料'}】，不会登记` : `已恢复候选【${target.printName || '未命名材料'}】`);
  };

  // 已登记候选显式点击“选择重印”：解除已登记锁定并标记 reprintConfirmed = true，允许用户重新核对并保存为新登记
  const handleReprintCandidate = (index: number) => {
    if (!ocrResult?.taskList) return;
    const target = ocrResult.taskList[index];
    if (!target) return;
    const sameContactCandidate = ocrResult.taskList.find(
      (item, i) => i !== index && item.teacherId && item.sourceConversationId && item.sourceConversationId === target.sourceConversationId
    );
    const updatedTaskList = ocrResult.taskList.map((item, i) =>
      i === index
        ? {
            ...item,
            alreadyRegistered: false,
            skipped: false,
            reprintConfirmed: true,
            teacherId: item.teacherId || sameContactCandidate?.teacherId,
            teacherName: item.teacherName || sameContactCandidate?.teacherName,
            teacherMatched: item.teacherMatched || Boolean(sameContactCandidate?.teacherId),
            grade: item.grade || sameContactCandidate?.grade,
            existingRecordDesc: item.existingRecordDesc
              ? `${item.existingRecordDesc}（已选择重印）`
              : '历史已登记记录（已选择重印）',
          }
        : item
    );
    const updatedResult = {
      ...ocrResult,
      taskList: updatedTaskList,
    };
    setOcrResult(updatedResult);
    setPreviewTaskIndex(index);
    message.success(`已为【${target.printName || '候选材料'}】开启重印登记，请核对后保存`);
    applyTaskToForm(updatedTaskList[index], index, updatedTaskList.length, updatedTaskList);
  };

  // 在登记表单弹窗中直接点击“跳过此条 / 不登记”，自动跳转下一条待处理候选
  const handleSkipCurrentTaskInModal = () => {
    if (!ocrResult?.taskList || !ocrResult.taskList[currentTaskIndex]) return;
    const currentTask = ocrResult.taskList[currentTaskIndex];
    const updatedTaskList = ocrResult.taskList.map((item, i) =>
      i === currentTaskIndex ? { ...item, skipped: true } : item
    );
    setOcrResult({
      ...ocrResult,
      taskList: updatedTaskList,
    });
    const nextIdx = findNextPendingTaskIndex(updatedTaskList, currentTaskIndex);
    if (nextIdx !== -1) {
      message.info(`已跳过【${currentTask.printName || '当前候选'}】，自动载入下一条候选`, 2.5);
      applyTaskToForm(updatedTaskList[nextIdx], nextIdx, updatedTaskList.length, updatedTaskList);
    } else {
      message.info(`已跳过【${currentTask.printName || '当前候选'}】，队列中已无待登记候选`, 2.5);
      setModalOpen(false);
    }
  };

  const findNextPendingTaskIndex = (taskList: PrintCandidate[], fromIndex: number): number => {
    for (let i = fromIndex + 1; i < taskList.length; i++) {
      if (!taskList[i].alreadyRegistered && !taskList[i].skipped) {
        return i;
      }
    }
    for (let i = 0; i < fromIndex; i++) {
      if (!taskList[i].alreadyRegistered && !taskList[i].skipped) {
        return i;
      }
    }
    return -1;
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
    activeTaskIdRef.current = undefined;
    sourcePageInfoRef.current = null;
    setIsManualReplacingAttachment(false);
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
      const sheets = computePreviewSheets(draft.formValues, isDraftSplit, null);
      setPreviewTotalSheets(sheets);
      setDraftNotice({ visible: true, timeText: draft.timeText });
      message.info('检测到未保存的新增草稿，已为您自动恢复！');
    } else {
      setSplitAnswer(false);
      setAnswerPageCount(1);
      setAnswerPrintCount(2);
      setAnswerPrintSide('1');
      const defaultPaperType = '8K';
      const defaultGoodsId = findGoodsByPaperType(defaultPaperType, currentPaperList);
      form.setFieldsValue({
        printSide: '1',
        colorCategory: '黑白',
        printPurpose: '',
        paperType: defaultPaperType,
        paperGoodsId: defaultGoodsId,
        printCount: 1,
        pageCount: 1,
        splitAnswer: false,
        answerPageCount: 1,
        answerPrintCount: 2,
        answerPrintSide: '1',
        operator: currentNickName || currentUserName || '文印管理员',
        printTime: dayjs(),
        status: '0',
      });
      setPreviewTotalSheets(calculateTotalSheets(1, 1, '1', DEFAULT_TEMPLATE_PAPER_COUNT, DEFAULT_PREVIEW_PAPER_COUNT));
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
    activeTaskIdRef.current = undefined;
    sourcePageInfoRef.current = null;
    setSplitAnswer(false);
    setModalTitle(`修改印刷登记信息 (ID: ${record.printId})`);

    const recTemplate = Number(record.templatePaperCount ?? 0);
    const recPreview = Number(record.previewPaperCount ?? 0);

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
          draft.formValues.printSide || record.printSide,
          recTemplate,
          recPreview
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
        calculateTotalSheets(record.printCount, record.pageCount, record.printSide, recTemplate, recPreview)
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
        sourcePageInfoRef.current = null;
        const defaultGoodsId = currentEditRecord.paperGoodsId || findGoodsByPaperType(currentEditRecord.paperType || 'A4', paperGoodsList);
        form.setFieldsValue({
          ...currentEditRecord,
          splitAnswer: false,
          operator: currentEditRecord.operator || currentNickName || currentUserName || 'admin',
          paperGoodsId: defaultGoodsId,
          printTime: currentEditRecord.printTime ? dayjs(currentEditRecord.printTime) : dayjs(),
        });
        setPreviewTotalSheets(
          calculateTotalSheets(
            currentEditRecord.printCount,
            currentEditRecord.pageCount,
            currentEditRecord.printSide,
            Number(currentEditRecord.templatePaperCount ?? 0),
            Number(currentEditRecord.previewPaperCount ?? 0)
          )
        );
      } else {
        setSplitAnswer(false);
        sourcePageInfoRef.current = null;
        setAnswerPageCount(1);
        setAnswerPrintCount(2);
        setAnswerPrintSide('1');
        const defaultPaperType = '8K';
        const defaultGoodsId = findGoodsByPaperType(defaultPaperType, paperGoodsList);
        form.resetFields();
        form.setFieldsValue({
          printSide: '1',
          colorCategory: '黑白',
          printPurpose: '',
          paperType: defaultPaperType,
          paperGoodsId: defaultGoodsId,
          printCount: 1,
          pageCount: 1,
          splitAnswer: false,
          answerPageCount: 1,
          answerPrintCount: 2,
          answerPrintSide: '1',
          operator: currentNickName || currentUserName || 'admin',
          printTime: dayjs(),
          status: '0',
        });
        setPreviewTotalSheets(calculateTotalSheets(1, 1, '1', DEFAULT_TEMPLATE_PAPER_COUNT, DEFAULT_PREVIEW_PAPER_COUNT));
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
  // 支持：绝对时间「2026年09月15日 16:08」「9月21日  9:28」「2026-08-12 17:01」「16:08」、相对时间「昨天/前天 HH:mm」
  const parseChatTime = (snippet?: string, contextText?: string) => {
    if (!snippet) return null;
    const s = String(snippet).trim();
    if (!s || s === '近期记录' || s === '当前对话') return null;

    // 12 小时制时段标记（上午/下午/中午/凌晨/晚上/傍晚）转 24 小时制小时数
    const applyPeriod = (hour: number, marker?: string) => {
      if (!marker) return hour;
      if (marker === '下午' || marker === '晚上' || marker === '傍晚' || marker === '中午') {
        return hour < 12 ? hour + 12 : hour;
      }
      return hour === 12 ? 0 : hour;
    };

    // 从上下文文本中提取参考基准日期（例如 2026年10月07日）
    const extractContextDate = () => {
      const target = contextText || ocrResult?.timeSnippet || ocrResult?.rawText || rawText || '';
      if (target) {
        const m = target.match(/(?:(\d{4})[年\/\-\.]\s*)?(\d{1,2})[月\/\-\.]\s*(\d{1,2})[日号]?/);
        if (m) {
          const y = m[1] ? Number(m[1]) : dayjs().year();
          const mo = Number(m[2]);
          const d = Number(m[3]);
          return dayjs().year(y).month(mo - 1).date(d);
        }
      }
      return dayjs();
    };

    // 1. 绝对日期匹配：支持带年份（2026年09月15日）或不带年份（09月15日 / 9月21日 / 09-21）
    const dateMatch = s.match(/(?:(\d{4})[年\/\-\.]\s*)?(\d{1,2})[月\/\-\.]\s*(\d{1,2})[日号]?/);
    const timeMatch = s.match(/(上午|下午|中午|凌晨|晚上|傍晚)?[\s]*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

    if (dateMatch) {
      const year = dateMatch[1] ? Number(dateMatch[1]) : dayjs().year();
      const month = Number(dateMatch[2]);
      const day = Number(dateMatch[3]);
      let hour = 9;
      let minute = 0;
      let second = 0;
      if (timeMatch && timeMatch[2]) {
        hour = applyPeriod(Number(timeMatch[2]), timeMatch[1]);
        minute = Number(timeMatch[3]) || 0;
        second = timeMatch[4] ? Number(timeMatch[4]) : 0;
      }
      const parsed = dayjs(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
      );
      if (parsed.isValid()) return parsed;
    }

    // 2. 只有时间无日期（如 "16:08" / "下午 4:08" / "星期三 14:26"）：优先借用上下文中的具体日期！
    if (timeMatch && timeMatch[2]) {
      const baseDate = extractContextDate();
      const hour = applyPeriod(Number(timeMatch[2]), timeMatch[1]);
      const minute = Number(timeMatch[3]) || 0;
      const second = timeMatch[4] ? Number(timeMatch[4]) : 0;
      return baseDate.hour(hour).minute(minute).second(second);
    }

    // 3. 相对时间：昨天/前天/今天 HH:mm
    const relMatch = s.match(/(昨天|前天|今天)[\s]*(上午|下午|中午|凌晨|晚上|傍晚)?[\s]*(\d{1,2}):(\d{1,2})/);
    if (relMatch) {
      let base = dayjs();
      if (relMatch[1] === '昨天') base = dayjs().subtract(1, 'day');
      else if (relMatch[1] === '前天') base = dayjs().subtract(2, 'day');
      const hour = applyPeriod(Number(relMatch[3]), relMatch[2]);
      const minute = Number(relMatch[4]) || 0;
      return base.hour(hour).minute(minute).second(0);
    }

    return null;
  };

  // 根据识别到的原始文档名，匹配粘贴上传的附件 URL（支持精确与去扩展名/括号去噪的模糊匹配）
  const applyTaskToForm = (task: PrintCandidate, index: number, totalTasks: number, _taskList?: PrintCandidate[]) => {
    if (!task || saveLockRef.current) return;
    if (task.alreadyRegistered) {
      message.warning('该条记录已登记，如需再次印刷请点击「选择重印」');
      return;
    }
    if (task.skipped) {
      message.info('该条候选已标记为跳过，如需登记请先点击「取消跳过」');
      return;
    }
    if (activeTaskIdRef.current && modalOpen) taskDraftsRef.current.set(activeTaskIdRef.current, form.getFieldsValue(true));
    activeTaskIdRef.current = task.taskId;
    let ruleState=task.taskId ? taskRulesRef.current.get(task.taskId) : undefined;
    if(!ruleState) {
      ruleState={task:{...task},manual:new Set<string>()};
      if(task.taskId) taskRulesRef.current.set(task.taskId,ruleState);
    }
    const computed=derivePrintFields(ruleState.task);
    setCurrentTaskIndex(index);
    sourcePageInfoRef.current = null;
    setSplitAnswer(false);
    setIsManualReplacingAttachment(false);
    setIsEdit(false); setEditId(null);
    setCurrentEditRecord(null);
    setSelectedGrade(task.grade || '');
    setModalTitle(`新增印刷登记（第 ${index + 1}/${totalTasks} 条）`);
    const values:Record<string,unknown> = task.taskId && taskDraftsRef.current.get(task.taskId) || {
      printName: task.printName, teacherId: task.teacherId, teacherName: task.teacherName,
      grade: task.grade, classId: task.classId, className: task.className,
      colorCategory: task.colorCategory || '黑白',
      printPurpose: task.printPurpose || task.purpose || '',
      printCount: task.printCount ?? undefined, ...computed,
      paperGoodsId: task.paperGoodsId || findGoodsByPaperType(computed.paperType,paperGoodsList), remark: task.remark, attachment: task.attachment,
      resultImg: task.resultImg, splitAnswer: false,
      operator: currentNickName || currentUserName,
      printTime: dayKey(task.timeSnippet) ? parseChatTime(task.timeSnippet, task.timeSnippet) : undefined,
      status: '0',
    };
    if (!values.printSide) {
      values.printSide = (Number(values.pageCount) || 1) <= 1 ? '1' : '2';
    }
    if(!task.taskId || !taskDraftsRef.current.has(task.taskId)) {
      const linkedText=(task.sourceMessageIds || []).map(id=>sourceMessageById.get(id)?.text).filter(Boolean).join('\n');
      const splitInfo=detectSplitAnswerInfo(linkedText,Number(values.pageCount) || 0);
      if(splitInfo) Object.assign(values,splitInfo);
    }
    form.resetFields(); form.setFieldsValue(values);
    setSplitAnswer(Boolean(values.splitAnswer));
    if(values.splitAnswer) {
      setAnswerPageCount(Number(values.answerPageCount)); setAnswerPrintCount(Number(values.answerPrintCount)); setAnswerPrintSide(String(values.answerPrintSide));
    }
    setDraftNotice(null);
    setPreviewTotalSheets(computePreviewSheets(values, Boolean(values.splitAnswer), null));
    setTextModalOpen(false);
    setExportModalOpen(false);
    setModalOpen(true);
  };

  // 快速打开/下载当前匹配的微信导出本地原稿附件，供文印员直接在本地 Office/WPS/浏览器查看页面
  const handleOpenMatchedAttachment = (matchedKey?: string, fallbackName?: string) => {
    if (!matchedKey) {
      message.warning('未找到原稿文件引用');
      return;
    }
    const file = exportAttachmentFilesRef.current.get(matchedKey);
    if (!file) {
      message.warning('本地内存中未找到该附件文件');
      return;
    }
    const fileName = fallbackName || file.name || '原稿附件';
    try {
      let blob: Blob;
      if (file instanceof Blob) {
        blob = file;
      } else if (typeof (file as any).slice === 'function') {
        blob = (file as any).slice();
      } else {
        message.warning('当前文件对象不可直接打开');
        return;
      }
      const url = URL.createObjectURL(blob);
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      // 如果是 PDF 或图片，直接在浏览器新标签页原生无缝预览
      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg'].includes(ext)) {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      // 如果是 doc, docx, xls, xlsx 等办公文档，唤起浏览器下载（直接调起本地 Office/WPS 打开）
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success(`已调起原稿文件「${fileName}」，可在 Office / WPS 中查看页数`);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      message.error(`打开原稿文件失败：${err?.message || '未知错误'}`);
    }
  };

  // Analyze only the active matched document; never upload/analyze the entire candidate queue.
  useEffect(() => {
    const task = currentQueueTask;
    if (!modalOpen || isEdit || !task?.taskId || !task.matchedAttachmentKey) return;
    const file = exportAttachmentFilesRef.current.get(task.matchedAttachmentKey);
    if (!(file instanceof File)) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'docm', 'doc'].includes(ext)) {
      setMatchedAnalysisStatus({taskId:task.taskId,loading:false,text:/^xls/.test(ext) ? 'Excel 工作表数不等于打印页数，请按打印预览填写。' : '该附件格式不能可靠读取页数，请手动填写。'});
      return;
    }
    let cancelled = false;
    setMatchedAnalysisStatus({taskId:task.taskId,loading:true,text:'正在读取附件页数…'});
    let pending = matchedDocumentAnalysisRef.current.get(file);
    if (!pending) {
      pending = matchedAnalysisQueueRef.current.catch(()=>undefined).then(()=>analyzeDocumentIntoCache(file));
      matchedDocumentAnalysisRef.current.set(file,pending);
      matchedAnalysisQueueRef.current = pending;
    }
    pending.then(analysis => {
      if (!analysis) matchedDocumentAnalysisRef.current.delete(file);
      if (cancelled || activeTaskIdRef.current !== task.taskId) return;
      const pages = Number(analysis?.pageCount);
      if (!analysis?.parseable || !Number.isFinite(pages) || pages <= 0) {
        setMatchedAnalysisStatus({taskId:task.taskId,loading:false,text:analysis?.msg || '未取得可靠页数，请重试或手动填写。'});
        return;
      }
      const state = taskRulesRef.current.get(task.taskId!);
      if (!state) return;
      state.task = {...state.task,sourcePageCount:pages,sourcePaperType:analysis.sourcePaperType || undefined};
      const fields = derivePrintFields(state.task,form.getFieldsValue(true),state.manual);
      form.setFieldsValue({...fields,...(!state.manual.has('paperGoodsId') ? {paperGoodsId:findGoodsByPaperType(fields.paperType,paperGoodsList)} : {})});
      syncSplitDefaults(state.task,fields.pageCount,state.manual);
      const currentValues = form.getFieldsValue(true);
      taskDraftsRef.current.set(task.taskId!, currentValues);
      setPreviewTotalSheets(computePreviewSheets(currentValues, Boolean(currentValues.splitAnswer), null));
      setOcrResult(previous => previous ? {...previous,taskList:previous.taskList.map(item=>item.taskId===task.taskId ? {...item,sourcePageCount:pages,sourcePaperType:analysis.sourcePaperType || undefined} : item)} : previous);
      setMatchedAnalysisStatus({taskId:task.taskId,loading:false,text:`原稿 ${pages} 页${ext==='pdf' ? '' : '（Word 保存的页数，请核对打印预览）'}`});
    });
    return () => { cancelled = true; };
  }, [modalOpen,isEdit,currentQueueTask?.taskId,currentQueueTask?.matchedAttachmentKey,matchedAnalysisRetry]);

  // 提交保存（实际保存时才上传导出目录关联附件、写入登记和扣库存；试卷答案拆分使用后端同一事务）
  const handleSaveRecord = async () => {
    if (importPendingRef.current > 0) { message.info('聊天和附件仍在解析，请稍后保存'); return; }
    if (saveLockRef.current) return;
    saveLockRef.current = true; setSavingRecord(true);
    try {
      const values = await form.validateFields();

      // 歧义核对前置检查：若当前任务命中推测/指代等歧义理由，必须勾选确定按钮上方的确认复选框
      if (currentQueueTask?.reviewReasons?.some((r) => /指代|确认|推测|取消|替代/.test(r)) && !values.reviewConfirmed) {
        message.warning('请先勾选确定按钮上方的「已对照当天聊天，确认当前任务的指代及打印要求」后再登记！');
        return;
      }

      // 未匹配或未选择申请教师时，禁止提交并提示用户
      const rawTeacherId = values.teacherId;
      if (rawTeacherId === undefined || rawTeacherId === null || rawTeacherId === '' || Number(rawTeacherId) === -999) {
        message.warning('请先选择「申请教师」：未匹配到教师时请在下拉框手动选择，或点击「新建教师」后再保存');
        return;
      }

      // 智能补齐 teacherName、className 与 paperGoodsId，确保数据库数据完整
      let teacherId = values.teacherId === -999 ? undefined : values.teacherId;
      let teacherName = values.teacherName;
      if (values.teacherId === -999) {
        const found = teacherList.find((t) => t.teacherId === -999);
        teacherName = found?.rawName || found?.teacherName?.replace(/\s*\(自动识别\)/, '') || teacherName;
      } else if (!teacherName && values.teacherId) {
        const t = teacherList.find((item) => String(item.teacherId) === String(values.teacherId));
        if (t) teacherName = t.teacherName;
      }

      let className = values.className;
      if (!className && values.classId) {
        const c = classList.find((item) => String(item.classId) === String(values.classId));
        if (c) className = c.className;
      }

      let grade = values.grade || form.getFieldValue('grade') || selectedGrade || '';
      if (!grade && teacherId) {
        const t = teacherList.find((item) => String(item.teacherId) === String(teacherId));
        if (t && t.grade) grade = t.grade;
      }
      if (!grade && values.classId) {
        const c = classList.find((item) => String(item.classId) === String(values.classId));
        if (c && c.grade) grade = c.grade;
      }

      let paperGoodsId = values.paperGoodsId;
      if (!paperGoodsId && values.paperType) {
        paperGoodsId = findGoodsByPaperType(values.paperType, paperGoodsList);
      }
      if (!ocrResult && !paperGoodsId && paperGoodsList.length > 0) {
        paperGoodsId = paperGoodsList[0].goodsId;
      }

      if (ocrResult && (!values.printCount || !values.pageCount || !values.printSide || !values.printTime || !paperGoodsId)) {
        message.warning('请补齐份数、页数、单双面、登记时间和用纸物品'); return;
      }
      const formattedPrintTime = values.printTime
        ? (dayjs.isDayjs(values.printTime) ? values.printTime.format('YYYY-MM-DD HH:mm:ss') : values.printTime)
        : dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 如果来自微信导出目录且匹配了本地附件，在实际保存时才上传附件
      let finalAttachment = values.attachment;
      const expectedAttachmentKey = currentQueueTask?.matchedAttachmentKey;
      const hasMatchedLocalAttachment =
        !isEdit &&
        Boolean(expectedAttachmentKey || (currentQueueTask?.attachmentStatus === 'matched' && currentQueueTask?.matchedAttachmentPath));
      if (!finalAttachment && hasMatchedLocalAttachment) {
        const matchedLocalFile = expectedAttachmentKey
          ? exportAttachmentFilesRef.current.get(expectedAttachmentKey)
          : undefined;
        let uploadErrorMsg = '';
        if (!matchedLocalFile) {
          uploadErrorMsg = `未找到当前批次关联的本地附件文件（${currentQueueTask?.originalDocName || currentQueueTask?.matchedAttachmentName || '未知文件'}）`;
        } else {
          try {
            const fileToUpload =
              matchedLocalFile instanceof File
                ? matchedLocalFile
                : new File([await matchedLocalFile.text()], matchedLocalFile.name, {
                    type: matchedLocalFile.type || 'application/octet-stream',
                  });
            const uploadRes: any = await uploadFileSmart(fileToUpload);
            finalAttachment = uploadRes?.url || uploadRes?.fileName || '';
            if (finalAttachment) {
              form.setFieldsValue({ attachment: finalAttachment });
            } else {
              uploadErrorMsg = `导出目录附件「${matchedLocalFile.name}」上传未返回有效文件地址`;
            }
          } catch (uploadErr: any) {
            uploadErrorMsg = `导出目录附件「${matchedLocalFile.name}」上传失败：${uploadErr?.message || '网络或服务器异常'}`;
          }
        }

        if (!finalAttachment) {
          if (!currentQueueTask?.allowSaveWithoutAttachment) {
            if (ocrResult?.taskList) {
              const updatedList = ocrResult.taskList.map((item, i) =>
                i === currentTaskIndex ? { ...item, attachmentUploadError: uploadErrorMsg } : item
              );
              setOcrResult({ ...ocrResult, taskList: updatedList });
            }
            message.error(`${uploadErrorMsg}。已暂停保存，请点击「确定」重试上传，或勾选「允许无附件直接登记」后再保存`);
            return;
          }
        } else if (currentQueueTask?.attachmentUploadError && ocrResult?.taskList) {
          const updatedList = ocrResult.taskList.map((item, i) =>
            i === currentTaskIndex ? { ...item, attachmentUploadError: undefined } : item
          );
          setOcrResult({ ...ocrResult, taskList: updatedList });
        }
      }

      const sourceConversationId = !isEdit ? currentQueueTask?.sourceConversationId : undefined;
      const sourceMessageId = !isEdit ? currentQueueTask?.sourceMessageId : undefined;
      const reprintConfirmed = !isEdit ? Boolean(currentQueueTask?.reprintConfirmed) : undefined;

      // 1. 如果是新增模式且启用了试卷与答案拆分（使用后端同一事务批量保存，每条各加模板1+预览1，共+4张）
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

        const splitCalc = calculateSplitSheetsWithExtra(
          examPrintCount,
          examPageCount,
          examPrintSide,
          ansPrintCount,
          ansPageCount,
          ansPrintSide,
          DEFAULT_TEMPLATE_PAPER_COUNT,
          DEFAULT_PREVIEW_PAPER_COUNT
        );
        const examSheets = splitCalc.examSheets;
        const ansSheets = splitCalc.answerSheets;

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
          grade,
          attachment: finalAttachment,
          printName: `[试卷] ${cleanName}`,
          pageCount: examPageCount,
          printCount: examPrintCount,
          printSide: examPrintSide,
          templatePaperCount: DEFAULT_TEMPLATE_PAPER_COUNT,
          previewPaperCount: DEFAULT_PREVIEW_PAPER_COUNT,
          totalPages: examSheets,
          printTime: formattedPrintTime,
          teacherId,
          teacherName,
          className,
          paperGoodsId,
          sourceConversationId,
          sourceMessageId,
          ...(reprintConfirmed ? { reprintConfirmed: true } : {}),
          remark: examRemark,
        };

        const ansPayload = {
          ...values,
          grade,
          attachment: finalAttachment,
          printName: `[答案] ${cleanName}`,
          pageCount: ansPageCount,
          printCount: ansPrintCount,
          printSide: ansPrintSide,
          templatePaperCount: DEFAULT_TEMPLATE_PAPER_COUNT,
          previewPaperCount: DEFAULT_PREVIEW_PAPER_COUNT,
          totalPages: ansSheets,
          printTime: formattedPrintTime,
          teacherId,
          teacherName,
          className,
          paperGoodsId,
          sourceConversationId,
          sourceMessageId: sourceMessageId ? `${sourceMessageId}#answer` : undefined,
          ...(reprintConfirmed ? { reprintConfirmed: true } : {}),
          remark: ansRemark,
        };

        // 后端同一事务提交试卷与答案两条登记，避免库存不足或异常时只保存一半
        await addRecordBatch([examPayload, ansPayload]);

        FormDraftUtil.clearDraft('edu_record', 'create');
        setDraftNotice(null);
        setSplitAnswer(false);
        actionRef.current?.reload();

        // 检查是否处于跨天/多任务连续登记队列模式
        const isQueueMode = ocrResult?.taskList && ocrResult.taskList.length > 1;
        if (isQueueMode) {
          const updatedTaskList = ocrResult.taskList.map((item: any, i: number) => {
            if (i === currentTaskIndex) {
              return { ...item, alreadyRegistered: true, reprintConfirmed: false, attachmentUploadError: undefined, attachment: finalAttachment || item.attachment };
            }
            return item;
          });

          setOcrResult({
            ...ocrResult,
            taskList: updatedTaskList,
          });

          const nextIdx = findNextPendingTaskIndex(updatedTaskList, currentTaskIndex);

          if (nextIdx !== -1) {
            const nextTask = updatedTaskList[nextIdx];
            message.success(
              `【${cleanName}】试卷与答案已成功拆分为 2 条登记！已自动载入下一条任务【${nextTask.printName}】`
            );
            saveLockRef.current = false;
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
            `🎉 试卷与答案已成功拆分为 2 条文印登记记录！\n【试卷】${examPageCount}页/${examPrintCount}份(含模板1+预览1共耗纸${examSheets}张)，【答案】${ansPageCount}页/${ansPrintCount}份(含模板1+预览1共耗纸${ansSheets}张)，合计联动出库扣减 ${examSheets + ansSheets} 张纸。`
          );
          setModalOpen(false);
          setOcrResult(null);
        }
        return;
      }

      // 2. 普通单条记录处理（或编辑已有记录）
      const { templatePaperCount, previewPaperCount } = getActiveExtraPaperCounts();
      const totalPages = calculateTotalSheets(
        values.printCount,
        values.pageCount,
        values.printSide,
        templatePaperCount,
        previewPaperCount
      );

      const payload = {
        ...values,
        grade,
        attachment: finalAttachment,
        printTime: formattedPrintTime,
        teacherId,
        teacherName,
        className,
        paperGoodsId,
        templatePaperCount,
        previewPaperCount,
        totalPages,
        ...(sourceConversationId ? { sourceConversationId } : {}),
        ...(sourceMessageId ? { sourceMessageId } : {}),
        ...(reprintConfirmed ? { reprintConfirmed: true } : {}),
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
              return { ...item, alreadyRegistered: true, reprintConfirmed: false, attachmentUploadError: undefined, attachment: finalAttachment || item.attachment };
            }
            return item;
          });

          setOcrResult({
            ...ocrResult,
            taskList: updatedTaskList,
          });

          // 寻找下一个未登记且未跳过的任务
          const nextIdx = findNextPendingTaskIndex(updatedTaskList, currentTaskIndex);

          if (nextIdx !== -1) {
            const currentTaskName = values.printName;
            const nextTask = updatedTaskList[nextIdx];
            message.success(
              `【${currentTaskName}】登记成功！已自动为您载入下一条未登记任务【${nextTask.printName}】`
            );
            // 自动准备并载入下一条任务，保持弹窗开启！
            saveLockRef.current = false;
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
          message.success('印刷登记成功！已自动关联生成耗材出库单扣减纸张库存（含模板1张+预览1张）');
          setModalOpen(false);
          setOcrResult(null);
        }
      }
    } catch (e: any) {
      const errMsg = e?.message || '操作失败';
      if (errMsg.includes('该微信聊天记录已登记') && ocrResult?.taskList) {
        const updatedTaskList = ocrResult.taskList.map((item: any, i: number) =>
          i === currentTaskIndex
            ? {
                ...item,
                alreadyRegistered: true,
                reprintConfirmed: false,
                existingRecordDesc: errMsg,
              }
            : item
        );
        setOcrResult({ ...ocrResult, taskList: updatedTaskList });
      }
      message.error(errMsg);
    } finally { saveLockRef.current = false; setSavingRecord(false); }
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

  // 批量完成
  const handleBatchComplete = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认将选中的 ${selectedRowKeys.length} 项标记为「已完成」？`,
      content: '仅更新状态，不影响已出库的耗材库存。',
      okText: '确认完成',
      cancelText: '取消',
      onOk: async () => {
        try {
          await completeRecords(selectedRowKeys.map((k) => Number(k)));
          message.success('批量完成成功');
          setSelectedRowKeys([]);
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '批量完成失败');
        }
      },
    });
  };

  // 批量作废
  const handleBatchCancel = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认作废选中的 ${selectedRowKeys.length} 项印刷记录？`,
      content: '关联出库单将同步作废，扣减的耗材纸张库存将自动回退。',
      okText: '确认作废',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await cancelRecords(selectedRowKeys.map((k) => Number(k)));
          message.success('批量作废成功，关联耗材库存已自动回退');
          setSelectedRowKeys([]);
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '批量作废失败');
        }
      },
    });
  };

  // 查看关联出库单：跳转到出库单管理页并自动打开对应出库单详情
  const handleViewOut = (record: any) => {
    if (record?.outId) {
      navigate(`/stock/out?outId=${record.outId}`);
    }
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

  // 打开快速修改弹窗（仅待印刷状态，独立于主表单编辑）
  const handleOpenQuickEdit = (record: any) => {
    setEditTarget(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      printName: record.printName,
      paperGoodsId: record.paperGoodsId,
      paperType: record.paperType,
      printCount: record.printCount,
      pageCount: record.pageCount,
      printSide: record.printSide,
      colorCategory: record.colorCategory || '黑白',
      printPurpose: record.printPurpose || record.purpose || '',
      teacherId: record.teacherId,
      grade: record.grade,
      classId: record.classId,
      className: record.className,
      operator: record.operator,
      printTime: record.printTime ? dayjs(record.printTime) : undefined,
      remark: record.remark,
    });
    setEditModalOpen(true);
  };

  // 关闭修改弹窗
  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditTarget(null);
  };

  // 保存修改（调用 updateRecord，后端会处理库存同步）
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      await updateRecord({
        printId: editTarget.printId,
        ...values,
        operator: values.operator || editTarget.operator,
      });
      message.success('修改成功，库存已同步更新');
      setEditModalOpen(false);
      setEditTarget(null);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setEditSaving(false);
    }
  };

  // 打开印刷错误登记弹窗
  const handleOpenPrintError = (record: any) => {
    setPrintErrorTarget(record);
    printErrorForm.resetFields();
    printErrorForm.setFieldsValue({
      errorCount: record.errorCount || undefined,
      errorRemark: record.errorRemark || '',
    });
    setPrintErrorModalOpen(true);
  };

  // 保存印刷错误登记
  const handleSavePrintError = async () => {
    if (!printErrorTarget) return;
    try {
      const values = await printErrorForm.validateFields();
      setPrintErrorSaving(true);
      await recordPrintError({
        printId: printErrorTarget.printId,
        errorCount: Number(values.errorCount),
        errorRemark: values.errorRemark || '',
        operator: currentUserName,
      });
      message.success(`印刷错误已登记，损耗 ${values.errorCount} 张`);
      setPrintErrorModalOpen(false);
      setPrintErrorTarget(null);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setPrintErrorSaving(false);
    }
  };

  // 智能解析数据统一入口（处理纯文本解析，支持跨天与多次任务队列）
  const handleParsedResult = (data: PrefillResult) => {
    if (!data?.taskList?.length) { message.info('未发现打印需求或材料，请手动填写'); return; }
    const incoming = namespaceResult(data, createClientId());
    if (activeTaskIdRef.current && modalOpen) taskDraftsRef.current.set(activeTaskIdRef.current, form.getFieldsValue(true));
    setOcrResult(previous => mergeSessions(previous, incoming));
    setPreviewTaskIndex(0);
    setTextModalOpen(true);
    message.success(`已保留 ${incoming.taskList.length} 条候选，请对照当天聊天核对`);
  };
  const parseScreenshotFile = async (file: File) => {
    setParsingText(true);
    try {
      const data = new FormData(); data.append('file',file);
      const response = await ocrParse(data);
      handleParsedResult(response.data as unknown as PrefillResult);
    } catch { message.error('截图识别失败，请重试或粘贴文字'); }
    finally { setParsingText(false); }
  };

  const uploadPastedDocs = async (files: File[]): Promise<UploadedAttachment[]> => {
    const uploaded: UploadedAttachment[] = [];
    for (const file of files) {
      const item: UploadedAttachment = {name:file.name, status:'failed'};
      try {
        const response = await uploadFileSmart(file);
        item.url = response.url || response.fileName;
        item.status = item.url ? 'available' : 'failed';
        const analysis = await analyzeDocumentIntoCache(file);
        if (analysis?.parseable && analysis.pageCount && !/\.xlsx?$/i.test(file.name)) item.pageCount = Number(analysis.pageCount);
        if (analysis?.sourcePaperType) item.sourcePaperType = analysis.sourcePaperType;
      } catch { message.warning(`${file.name} 上传失败，候选已保留，可稍后补传`); }
      uploaded.push(item);
    }
    setSessionAttachments(previous => [...previous, ...uploaded]);
    return uploaded;
  };

  const importChat = async (text: string, files: File[], debugId?:string) => {
    setParsingText(true);
    if(debugId) updateDebug(debugId,{submittedText:text,status:text.trim()?'正在请求后端解析':'未读到文字，未请求文字解析，仅保留文件'});
    try {
      let result: PrefillResult = {taskList:[], messages:[], rawText:text};
      if (text.trim()) {
        const response = await textParse({text});
        result = response.data as unknown as PrefillResult;
        if(debugId) updateDebug(debugId,{result:JSON.parse(JSON.stringify(result)) as PrefillResult,status:'后端解析已返回'});
      }
      const docs = files.filter(isDocument);
      if (!text.trim()) {
        if (ocrResult?.taskList && ocrResult.taskList.length > 0) {
          const uploads = await uploadPastedDocs(docs);
          const updatedTaskList = attachFiles(ocrResult.taskList, uploads);
          const unassignedDocs = docs.filter(f => !updatedTaskList.some(t => attachmentNameMatches(f.name, t.originalDocName || t.printName)));
          const extraCandidates = unassignedDocs.length > 0 ? attachFiles(fileCandidates(unassignedDocs, createClientId()), uploads) : [];
          setOcrResult({
            ...ocrResult,
            taskList: [...updatedTaskList, ...extraCandidates],
          });
          message.success(`已为现有候选智能关联附件！${extraCandidates.length > 0 ? `新增 ${extraCandidates.length} 条未匹配文件候选` : ''}`);
          return;
        } else {
          result.taskList = fileCandidates(docs, createClientId());
        }
      } else {
        // Actual documents not mentioned in the text must also remain reviewable.
        result.taskList.push(...fileCandidates(docs.filter(f=>!result.taskList.some(t=>attachmentNameMatches(f.name,t.originalDocName))), createClientId()));
      }
      const uploads = await uploadPastedDocs(docs);
      result.taskList = attachFiles(result.taskList, uploads);
      handleParsedResult(result);
    } catch (error) {
      if(debugId) updateDebug(debugId,{status:'解析失败',error:error instanceof Error?error.message:'请求失败'});
      message.error(error instanceof Error ? error.message : '解析失败，原文已保留，请重试');
      if (files.some(isDocument)) handleParsedResult({taskList:fileCandidates(files,createClientId()),rawText:text,messages:[]});
    } finally { setParsingText(false); }
  };
  const enqueueImport = (work: () => Promise<void>) => {
    if (saveLockRef.current) { message.info('正在保存当前任务，请稍后粘贴'); return Promise.resolve(); }
    importPendingRef.current++;
    setParsingText(true);
    pasteChainRef.current = pasteChainRef.current.then(work).catch(()=>message.error('导入失败，请重试')).then(()=>{
      importPendingRef.current--; setParsingText(importPendingRef.current > 0);
    });
    return pasteChainRef.current;
  };
  const parseAndHandleText = async (text: string) => {
    if (!text.trim()) { message.warning('请先粘贴聊天文字'); return; }
    const id=startDebug('手动解析文字',{text,plain:text,html:'',files:[],types:[],items:[]});
    await enqueueImport(()=>importChat(text, [],id));
  };
  const handleParseText = () => parseAndHandleText(rawText);
  const handleModalPaste = (e: React.ClipboardEvent) => {
    const snapshot = readChatClipboard(e.clipboardData);
    const debugId=startDebug('Ctrl+V 粘贴',snapshot);
    if (!snapshot.text.trim() && !snapshot.files.some(isDocument)) {
      const image = snapshot.files.find(f=>f.type.startsWith('image/'));
      if (image) { e.preventDefault(); e.stopPropagation(); enqueueImport(()=>parseScreenshotFile(image)); }
      updateDebug(debugId,{status:image?'已转交截图识别（非文字解析）':'事件中没有可解析的文字或文件'});
      return;
    }
    e.preventDefault(); e.stopPropagation();
    const recovered = recoverChatClipboard(snapshot, navigator.clipboard);
    enqueueImport(async()=>{
      const content = await recovered;
      updateDebug(debugId,{recoveryNotes:content.recoveryNotes});
      setRawText(content.text);
      await importChat(content.text,content.files,debugId);
    });
  };

  // 登记弹窗全局快捷粘贴：根据文件后缀自动分流并处理，绝不跳出中断逐条登记
  const handleSmartRegisterModalPaste = async (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    if (target.closest('[data-attachment-upload], [data-image-upload], .ant-upload, input[type="file"]')) return;

    let pastedFiles: File[] = [];
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      pastedFiles = Array.from(e.clipboardData.files);
    } else if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }
    }

    const docFiles = pastedFiles.filter(isDocument);
    const imgFiles = pastedFiles.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(f.name));

    const snapshot = readChatClipboard(e.clipboardData);
    const hasChatText = Boolean(snapshot.text.trim()) && !isTextInput;
    // 如果剪贴板中同时包含大量微信聊天文字与文件（整段微信消息复制）：交由聊天解析器处理
    if (hasChatText && docFiles.length > 0) {
      handleModalPaste(e);
      return;
    }

    // 1. 单个文档文件：直接作为当前任务的原稿附件上传，绝不跳回文字预填弹窗！
    if (docFiles.length === 1 && !isTextInput) {
      e.preventDefault();
      e.stopPropagation();
      const file = docFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      message.loading({ content: `智能识别：检测到粘贴【.${ext}】原稿文档（${file.name}），正在上传...`, key: 'smart-paste' });
      const currentTaskId = activeTaskIdRef.current;
      try {
        const res: any = await uploadFileSmart(file);
        if (activeTaskIdRef.current !== currentTaskId) return;
        const url = res.url || res.fileName || '';
        const uploadedName = res.originalFilename || file.name;

        // 设置当前表单字段
        form.setFieldsValue({ attachment: url });
        const curPrintName = form.getFieldValue('printName');
        if (!curPrintName && uploadedName) {
          form.setFieldsValue({ printName: uploadedName.replace(/\.[^/.]+$/, '') });
        }
        analyzeAndFillDocument(file);

        // 同步当前任务状态与草稿
        const updatedValues = { ...form.getFieldsValue(true), attachment: url };
        triggerSaveRecordDraft(updatedValues);
        if (currentTaskId) {
          taskDraftsRef.current.set(currentTaskId, updatedValues);
        }
        if (ocrResult?.taskList && currentTaskIndex >= 0) {
          const updatedList = ocrResult.taskList.map((item, idx) =>
            idx === currentTaskIndex
              ? { ...item, attachment: url, attachmentStatus: 'available', originalDocName: item.originalDocName || uploadedName }
              : item
          );
          setOcrResult({ ...ocrResult, taskList: updatedList });
        }

        if (res.deduplicated) {
          message.success({ content: `⚡ 检测到相同原稿文档，已直接复用（秒传成功）！`, key: 'smart-paste' });
        } else {
          message.success({ content: `已自动根据后缀识别为【原稿文档】并上传成功！`, key: 'smart-paste' });
        }
      } catch (err: any) {
        message.error({ content: err.message || '文档上传失败', key: 'smart-paste' });
      }
      return;
    }

    // 2. 单个图片：上传为留样图或原稿图片
    if (imgFiles.length === 1 && docFiles.length === 0 && !isTextInput) {
      e.preventDefault();
      e.stopPropagation();
      const file = imgFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const curAttachment = form.getFieldValue('attachment');
      const targetField = curAttachment ? 'resultImg' : 'attachment';
      const targetDesc = targetField === 'resultImg' ? '印刷效果图 / 拍照留样' : '原稿电子文件';

      message.loading({ content: `智能识别：检测到粘贴图片（.${ext}），正在上传至【${targetDesc}】...`, key: 'smart-paste' });
      const currentTaskId = activeTaskIdRef.current;
      try {
        const res: any = await uploadFileSmart(file);
        if (activeTaskIdRef.current !== currentTaskId) return;
        const url = res.url || res.fileName || '';
        form.setFieldsValue({ [targetField]: url });
        const updatedValues = { ...form.getFieldsValue(true), [targetField]: url };
        triggerSaveRecordDraft(updatedValues);
        if (currentTaskId) {
          taskDraftsRef.current.set(currentTaskId, updatedValues);
        }
        if (res.deduplicated) {
          message.success({ content: `⚡ 检测到相同图片，已直接复用至【${targetDesc}】（秒传成功）！`, key: 'smart-paste' });
        } else {
          message.success({ content: `图片已自动上传至【${targetDesc}】！`, key: 'smart-paste' });
        }
      } catch (err: any) {
        message.error({ content: err.message || '图片上传失败', key: 'smart-paste' });
      }
      return;
    }

    // 3. 批量多个文件：自动批量上传并智能补齐各候选任务缺失的附件
    if (docFiles.length > 1 && !isTextInput) {
      e.preventDefault();
      e.stopPropagation();
      message.loading({ content: `检测到批量粘贴 ${docFiles.length} 个原稿文档，正在上传并智能关联...`, key: 'smart-paste-batch' });
      try {
        const uploads = await uploadPastedDocs(docFiles);
        if (ocrResult?.taskList && ocrResult.taskList.length > 0) {
          const updatedTaskList = attachFiles(ocrResult.taskList, uploads);
          setOcrResult({ ...ocrResult, taskList: updatedTaskList });
          // 如果当前任务匹配上了新附件，立即同步填入当前表单
          const currentUpdated = updatedTaskList[currentTaskIndex];
          if (currentUpdated?.attachment && !form.getFieldValue('attachment')) {
            form.setFieldsValue({ attachment: currentUpdated.attachment });
            if (currentUpdated.sourcePageCount) {
              form.setFieldsValue({ pageCount: currentUpdated.sourcePageCount });
            }
            const updatedValues = { ...form.getFieldsValue(true), attachment: currentUpdated.attachment };
            triggerSaveRecordDraft(updatedValues);
            if (activeTaskIdRef.current) {
              taskDraftsRef.current.set(activeTaskIdRef.current, updatedValues);
            }
          }
          message.success({ content: `✅ 批量文件上传完成，已智能补齐各任务附件！`, key: 'smart-paste-batch' });
        }
      } catch (err: any) {
        message.error({ content: err.message || '批量文件上传失败', key: 'smart-paste-batch' });
      }
      return;
    }

    // 4. 纯文本（微信聊天记录文本）：仅当非输入框且含有文本时才触发文字解析
    let text = '';
    try { text = e.clipboardData.getData('text/plain') || ''; } catch { text = ''; }
    if (!pastedFiles.length && text.trim() && !isTextInput) {
      e.preventDefault();
      message.loading({ content: '检测到粘贴微信聊天文字，正在智能提取预填...', key: 'smart-paste-text' });
      await parseAndHandleText(text);
      return;
    }
  };

  // 表格列定义 (16列完整还原)
  const columns: ProColumns[] = [
    {
      title: renderSortHeader('登记ID', 'printId', '登记ID', 'r.print_id', 'descend', 'center'),
      dataIndex: 'printId',
      width: 75,
      align: 'center',
    },
    {
      title: renderSortHeader('印刷名称', 'printName', '印刷名称', 'r.print_name', 'ascend', 'left'),
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
      title: renderSortHeader('申请教师', 'teacherName', '申请教师', 'teacher_name', 'ascend', 'center'),
      dataIndex: 'teacherName',
      width: 100,
      align: 'center',
    },
    {
      title: renderSortHeader('经办人', 'operator', '经办人', 'r.operator', 'ascend', 'center'),
      dataIndex: 'operator',
      width: 90,
      align: 'center',
    },
    {
      title: renderSortHeader('印刷用纸', 'paperType', '印刷用纸', 'r.paper_type', 'ascend', 'center'),
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
      title: renderSortHeader('印刷份数', 'printCount', '印刷份数', 'r.print_count', 'descend', 'center'),
      dataIndex: 'printCount',
      width: 100,
      align: 'center',
      render: (_, record) => <Text strong style={{ color: '#1890FF' }}>{record.printCount} 份</Text>,
    },
    {
      title: renderSortHeader('每份页数', 'pageCount', '每份页数', 'r.page_count', 'descend', 'center'),
      dataIndex: 'pageCount',
      width: 105,
      align: 'center',
      render: (_, record) => <span>{record.pageCount || 1} 页</span>,
    },
    {
      title: renderSortHeader('印刷方式', 'printSide', '印刷方式', 'r.print_side', 'ascend', 'center'),
      dataIndex: 'printSide',
      width: 100,
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
      title: renderSortHeader('颜色类别', 'colorCategory', '颜色类别', 'r.color_category', 'ascend', 'center'),
      dataIndex: 'colorCategory',
      width: 95,
      align: 'center',
      valueEnum: {
        黑白: { text: '黑白' },
        彩色: { text: '彩色' },
      },
      render: (_, record) => {
        const isColor = record.colorCategory === '彩色' || record.colorCategory === '2';
        return (
          <Tag color={isColor ? 'magenta' : 'default'} style={{ margin: 0, fontWeight: 500 }}>
            {isColor ? '彩色' : '黑白'}
          </Tag>
        );
      },
    },
    {
      title: renderSortHeader('总耗纸量', 'totalPages', '总耗纸量', 'r.total_pages', 'descend', 'center'),
      dataIndex: 'totalPages',
      width: 125,
      align: 'center',
      render: (_, record) => {
        const extraLabel = formatExtraPaperLabel(record, false);
        const total =
          record.totalPages ||
          calculateTotalSheets(
            record.printCount,
            record.pageCount,
            record.printSide,
            Number(record.templatePaperCount ?? 0),
            Number(record.previewPaperCount ?? 0)
          );
        return (
          <Tooltip title={`总耗纸 ${total} 张（${extraLabel}）`}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
              <Tag color="geekblue" style={{ fontWeight: 600, margin: 0 }}>
                {total} 张
              </Tag>
              <span style={{ fontSize: 10, color: isLegacyExtraPaperRecord(record) ? '#8C8C8C' : '#1677FF', marginTop: 2 }}>
                {isLegacyExtraPaperRecord(record) ? '旧规则，未计入' : '含模板1+预览1'}
              </span>
            </div>
          </Tooltip>
        );
      },
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
      title: renderSortHeader('年级', 'grade', '年级', 'grade', 'ascend', 'center'),
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
      title: renderSortHeader('班级', 'className', '班级', 'class_name', 'ascend', 'center'),
      dataIndex: 'className',
      width: 100,
      align: 'center',
      render: (_, record) => record.className || '-',
    },
    {
      title: '用途',
      dataIndex: 'printPurpose',
      width: 140,
      ellipsis: true,
      render: (_, record) => {
        const p: string = record.printPurpose || record.purpose || '';
        if (!p) return <Text type="secondary">-</Text>;
        return (
          <Tooltip title={p} placement="topLeft">
            <span style={{ cursor: 'pointer' }}>{p}</span>
          </Tooltip>
        );
      },
    },
    {
      title: renderSortHeader('印刷时间', 'printTime', '印刷时间', 'r.print_time', 'descend', 'center'),
      dataIndex: 'printTime',
      width: 160,
      align: 'center',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: renderSortHeader('关联出库单', 'outNo', '关联出库单', 'out_no', 'descend', 'center'),
      dataIndex: 'outNo',
      width: 150,
      align: 'center',
      render: (_, record) =>
        record.outNo ? (
          <Tag
            color="processing"
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => handleViewOut(record)}
          >
            {record.outNo}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: renderSortHeader('状态', 'status', '状态', 'r.status', 'ascend', 'center'),
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
      width: 340,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.status === '0' && (
            <Button
              key="edit"
              type="link"
              size="small"
              icon={<EditOutlined />}
              style={{ color: '#1677FF' }}
              onClick={() => handleOpenQuickEdit(record)}
            >
              修改
            </Button>
          )}
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
          {record.status !== '2' && (
            <Button
              key="error"
              type="link"
              size="small"
              danger
              icon={<WarningOutlined />}
              onClick={() => handleOpenPrintError(record)}
            >
              印刷错误
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

  const filteredExportConversations = React.useMemo(() => {
    if (!exportSession) return [];
    return filterManifestConversations(exportSession.conversations, {
      keyword: exportSearchKeyword,
      registeredFilter: exportRegisteredFilter,
      hideEmpty: exportHideEmpty,
      hideBusiness: exportHideBusiness,
      selectedIds: exportOnlySelected ? exportSelectedIds : undefined,
    });
  }, [exportSession, exportSearchKeyword, exportRegisteredFilter, exportHideEmpty, exportHideBusiness, exportOnlySelected, exportSelectedIds]);

  // 关闭/退出登记弹窗前，自动妥善暂存草稿，多任务队列存在未登记时友好确认防误触
  const handleModalCancel = () => {
    if (saveLockRef.current) return;
    if (activeTaskIdRef.current) {
      taskDraftsRef.current.set(activeTaskIdRef.current, form.getFieldsValue(true));
    }
    const pendingCount = ocrResult?.taskList?.filter((t) => !t.alreadyRegistered && !t.skipped)?.length || 0;
    if (ocrResult && pendingCount > 0) {
      Modal.confirm({
        title: '暂存当前候选并退出？',
        content: `当前微信队列中还有 ${pendingCount} 条未登记候选。退出后登记进度已为您完整暂存，您随时可以在页面顶部点击「继续微信登记」一键恢复。`,
        okText: '暂存退出',
        cancelText: '继续留在本页',
        onOk: () => {
          setModalOpen(false);
        },
      });
    } else {
      setModalOpen(false);
    }
  };

  return (
    <PageContainer header={{ title: '文印智能登记管理' }}>
      {ocrResult && ocrResult.taskList && ocrResult.taskList.length > 0 && !modalOpen && !textModalOpen && !exportModalOpen && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, border: '1px solid #91caff', background: '#e6f4ff' }}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>
                <b style={{ color: '#0958d9' }}>📑 微信智能导入候选队列暂存中：</b>
                共 {ocrResult.taskList.length} 条候选（当前停留在第 {currentTaskIndex + 1} 条
                【{ocrResult.taskList[currentTaskIndex]?.printName || '待登记任务'}】，已登记 {ocrResult.taskList.filter(t=>t.alreadyRegistered).length} 条，跳过 {ocrResult.taskList.filter(t=>t.skipped).length} 条，剩余 {ocrResult.taskList.filter(t=>!t.alreadyRegistered && !t.skipped).length} 条待处理）。
              </span>
              <Space size={8}>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    const task = ocrResult.taskList[currentTaskIndex] || ocrResult.taskList[0];
                    applyTaskToForm(task, currentTaskIndex, ocrResult.taskList.length);
                    setModalOpen(true);
                  }}
                >
                  继续逐条登记（第 {currentTaskIndex + 1} 条）
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTextModalOpen(true);
                  }}
                >
                  查看全部候选列表
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: '清空当前微信候选队列？',
                      content: '清空后已登记的记录不受影响，但未登记的候选进度将被清除。确定要清空吗？',
                      okText: '确认清空',
                      cancelText: '取消',
                      onOk: () => {
                        setOcrResult(null);
                        taskDraftsRef.current.clear();
                        message.info('已清空暂存队列');
                      },
                    });
                  }}
                >
                  清空队列
                </Button>
              </Space>
            </div>
          }
        />
      )}
      {renderSortBar()}
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
              icon={<CheckCircleOutlined />}
              onClick={handleBatchComplete}
            >
              批量完成
            </Button>
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={handleBatchCancel}
            >
              批量作废
            </Button>
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
            const sortParams = getSortParams();
            const res: any = await listRecord({
              ...params,
              ...sortParams,
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
            key="export-dir-btn"
            data-testid="open-wechat-export-modal"
            type="dashed"
            icon={<FolderOpenOutlined style={{ color: '#1677FF' }} />}
            onClick={() => {
              loadBaseData();
              setExportModalOpen(true);
            }}
          >
            📂 导入微信导出目录
          </Button>,
          <Button
            key="smart-btn"
            type="dashed"
            icon={<MessageOutlined style={{ color: '#52C41A' }} />}
            onClick={() => {
              setRawText('');
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

      {/* 新增 / 修改登记弹窗（微信智能预填与文印登记标杆弹窗） */}
      <Modal
        title={
          <Space>
            {modalTitle}
            <Button size="small" onClick={() => setDebugOpen(true)}>
              查看解析调试
            </Button>
          </Space>
        }
        open={modalOpen && !textModalOpen && !exportModalOpen}
        maskClosable={false}
        keyboard={false}
        onOk={handleSaveRecord}
        confirmLoading={savingRecord}
        onCancel={handleModalCancel}
        width={ocrResult ? 'min(1440px, calc(100vw - 32px))' : 'min(980px, calc(100vw - 32px))'}
        style={{ top: 6, paddingBottom: 6 }}
        destroyOnHidden={false}
        styles={{
          header: {
            flexShrink: 0,
            marginBottom: 4,
          },
          body: {
            height: 'calc(100dvh - 90px)',
            maxHeight: 'calc(100dvh - 90px)',
            overflowY: 'auto',
            padding: '2px 0',
          },
          footer: {
            flexShrink: 0,
            marginTop: 'auto',
            paddingTop: 6,
            borderTop: '1px solid #f0f0f0',
          },
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', gap: 12, minHeight: 32 }}>
            <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {currentQueueTask?.reviewReasons?.some((r) => /指代|确认|推测|取消|替代/.test(r)) && (
                <>
                  <span style={{ color: '#d46b08' }}>⚠️ 本条记录包含推测或指代要求，提交前请对照当天聊天核对</span>
                  <Form form={form} component={false}>
                    <Form.Item
                      name="reviewConfirmed"
                      valuePropName="checked"
                      rules={[{ validator: (_, value) => (value ? Promise.resolve() : Promise.reject(new Error('请对照当天聊天确认有歧义的内容'))) }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox data-testid="review-confirm-checkbox" style={{ color: '#0958d9', fontWeight: 500 }}>
                        已对照当天聊天，确认当前任务的指代及打印要求
                      </Checkbox>
                    </Form.Item>
                  </Form>
                </>
              )}
            </div>
            <Space style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
              {ocrResult && currentQueueTask && !isEdit && (
                <Button
                  danger
                  disabled={savingRecord}
                  data-testid="skip-current-task-footer-btn"
                  onClick={handleSkipCurrentTaskInModal}
                >
                  跳过此条 / 不登记
                </Button>
              )}
              <Button
                disabled={savingRecord}
                onClick={handleModalCancel}
              >
                取消
              </Button>
              <Button type="primary" loading={savingRecord} onClick={handleSaveRecord}>
                确定
              </Button>
            </Space>
          </div>
        }
      >
        <DraftNoticeAlert
          visible={!!draftNotice?.visible}
          timeText={draftNotice?.timeText}
          onDiscard={handleDiscardDraft}
          loading={discardLoading}
          isEdit={isEdit}
        />
        {ocrResult && (
          <ChatCandidateList
            compact
            tasks={ocrResult.taskList}
            selectedFields={{pageCount:watchedPageCount,printSide:watchedPrintSide}}
            selected={currentTaskIndex}
            disabled={savingRecord}
            onSelect={(i) => applyTaskToForm(ocrResult.taskList[i], i, ocrResult.taskList.length)}
            onToggleSkip={handleToggleSkipCandidate}
            onReprint={handleReprintCandidate}
          />
        )}
        <div data-testid="chat-register" onPasteCapture={handleSmartRegisterModalPaste} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* 右栏：登记表单（核心紧凑排布：零滚动、多字段横向矩阵组合、内嵌耗纸胶囊预算） */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 兼容单纯多附件但未分任务的场景 */}
            {ocrResult?.documentList &&
              ocrResult.documentList.length > 1 &&
              (!ocrResult.taskList || ocrResult.taskList.length <= 1) && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: '6px 10px',
                    background: '#F0F5FF',
                    border: '1px dashed #1677FF',
                    borderRadius: 6,
                  }}
                >
                  <Space size={6} wrap>
                    <span style={{ fontSize: 12, color: '#1677FF', fontWeight: 'bold' }}>
                      <PaperClipOutlined /> 切换材料:
                    </span>
                    {ocrResult.documentList.map((doc: string, idx: number) => {
                      const cleanName = doc.replace(/\.[^/.]+$/, '');
                      const isSelected = form.getFieldValue('printName') === cleanName;
                      return (
                        <Tag
                          key={idx}
                          color={isSelected ? 'blue' : 'default'}
                          style={{ cursor: 'pointer', fontSize: 11, margin: 0 }}
                          onClick={() => form.setFieldsValue({ printName: cleanName })}
                        >
                          {doc} {isSelected && <CheckOutlined />}
                        </Tag>
                      );
                    })}
                  </Space>
                </div>
              )}

            <Form disabled={savingRecord} form={form} layout="vertical" onValuesChange={handleFormValuesChange}>
              {currentQueueTask?.existingRecordDesc && (
                <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, fontSize: 11 }}>
                  <span style={{ color: '#d46b08', fontWeight: 600 }}>⚠️ 排重预警：</span>
                  <span style={{ color: '#8c6b00' }}>{currentQueueTask.existingRecordDesc}</span>
                </div>
              )}
              {currentQueueTask?.attachmentUploadError && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 4, padding: '2px 8px' }}
                  title={
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11 }}>
                        {currentQueueTask.attachmentUploadError}（未写入登记、未扣库存，可直接点击「确定」重试上传）
                      </span>
                      <Checkbox
                        data-testid="allow-save-without-attachment-checkbox"
                        checked={Boolean(currentQueueTask.allowSaveWithoutAttachment)}
                        style={{ fontSize: 11 }}
                        onChange={(e) => {
                          if (!ocrResult?.taskList) return;
                          const checked = e.target.checked;
                          const updatedList = ocrResult.taskList.map((item, i) =>
                            i === currentTaskIndex ? { ...item, allowSaveWithoutAttachment: checked } : item
                          );
                          setOcrResult({ ...ocrResult, taskList: updatedList });
                        }}
                      >
                        允许无附件直接登记此条记录
                      </Checkbox>
                    </div>
                  }
                />
              )}
              {currentQueueTask?.attachmentStatus === 'missing' && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 4, padding: '2px 8px' }}
                  title={<span style={{ fontSize: 11 }}>{`导出目录缺失对应附件：${currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentPath || '未知附件'}`}</span>}
                />
              )}
              {currentQueueTask?.attachmentStatus==='ambiguous' && (
                <Form.Item label={<span style={{ fontSize: 11, color: '#ad6800' }}>⚠️ 存在同名附件，请指定关联文件</span>} style={{ marginBottom: 4 }}>
                  <Select size="small" placeholder="同名附件需要手动关联" options={sessionAttachments.filter(f=>f.url).map((f,i)=>({value:i,label:`${f.name} (${i+1})`}))}
                    onChange={i=>{
                      const file=sessionAttachments.filter(f=>f.url)[i];
                      const state=activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
                      if(!state) return;
                      state.task={...state.task,sourcePageCount:file.pageCount,sourcePaperType:file.sourcePaperType};
                      const fields=derivePrintFields(state.task,form.getFieldsValue(true),state.manual);
                      form.setFieldsValue({...fields,attachment:file.url,...(!state.manual.has('paperGoodsId')?{paperGoodsId:findGoodsByPaperType(fields.paperType,paperGoodsList)}:{})});
                      syncSplitDefaults(state.task,fields.pageCount,state.manual);
                      triggerSaveRecordDraft(form.getFieldsValue(true));
                    }} />
                </Form.Item>
              )}
              <Form.Item name="reviewConfirmed" hidden valuePropName="checked">
                <Checkbox />
              </Form.Item>

              <Form.Item name="teacherName" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="className" hidden>
                <Input />
              </Form.Item>

              {/* 第 1 行：印刷材料名称 (Col span 24) 独占整行，让长文件名完整呈现 */}
              <Row gutter={10}>
                <Col span={24}>
                  <Form.Item
                    name="printName"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontWeight: 600 }}>印刷材料名称</span>
                        {watchedAttachment && (
                          <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 'normal' }}>
                            （已关联原稿文件）
                          </span>
                        )}
                      </div>
                    }
                    rules={[{ required: true, message: '请输入印刷材料名称' }]}
                    style={{ marginBottom: 6 }}
                  >
                    <Input
                      placeholder="例：高三年级第一学期期中统一模拟考试数学试卷（理科）"
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 2 行：印刷份数 (6) + 每份页数 (6) + 印刷方式 (6) + 颜色类别 (6) */}
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item
                    name="printCount"
                    label={<span style={{ fontWeight: 600 }}>印刷份数</span>}
                    rules={[{ required: true, message: '请输入份数' }]}
                    style={{ marginBottom: 6 }}
                    extra={
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#8c8c8c', lineHeight: '20px' }}>常用:</span>
                        {[
                          { label: '备课 2份', count: 2 },
                          { label: '单班 45份', count: 45 },
                          { label: '两班 90份', count: 90 },
                          { label: '年级 160份', count: 160 },
                          { label: '大年级 320份', count: 320 },
                        ].map((item) => (
                          <Tag
                            key={item.count}
                            color="blue"
                            style={{ cursor: 'pointer', fontSize: 11, margin: 0, padding: '0 5px', lineHeight: '18px' }}
                            onClick={() => handleQuickSetPrintCount(item.count)}
                          >
                            {item.label}
                          </Tag>
                        ))}
                      </div>
                    }
                  >
                    <InputNumber min={1} max={50000} style={{ width: '100%' }} addonAfter="份" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="pageCount"
                    label={<span style={{ fontWeight: 600 }}>每份页数</span>}
                    rules={[{ required: true, message: '请输入页数' }]}
                    style={{ marginBottom: 6 }}
                    extra={
                      <div style={{ marginTop: 4, fontSize: 11, color: '#8c8c8c', lineHeight: '20px' }}>
                        {form.getFieldValue('pageCount') > 1 ? '多页文档默认推荐双面印刷' : '单页文档默认推荐单面印刷'}
                      </div>
                    }
                  >
                    <InputNumber
                      min={1}
                      max={200}
                      style={{ width: '100%' }}
                      addonAfter="页"
                      onChange={(val) => {
                        const newPage = Number(val) || 1;
                        const state = activeTaskIdRef.current ? taskRulesRef.current.get(activeTaskIdRef.current) : undefined;
                        if (!state?.manual.has('printSide')) {
                          form.setFieldsValue({ printSide: newPage <= 1 ? '1' : '2' });
                        }
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
                <Col span={6}>
                  <Form.Item name="printSide" label={<span style={{ fontWeight: 600 }}>印刷方式</span>} rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                    <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                      <Radio.Button value="1" style={{ flex: 1, textAlign: 'center' }}>单面印</Radio.Button>
                      <Radio.Button value="2" style={{ flex: 1, textAlign: 'center' }}>双面印</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="colorCategory"
                    label={<span style={{ fontWeight: 600 }}>颜色类别</span>}
                    rules={[{ required: true, message: '请选择颜色类别' }]}
                    initialValue="黑白"
                    style={{ marginBottom: 6 }}
                  >
                    <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                      <Radio.Button value="黑白" style={{ flex: 1, textAlign: 'center' }}>黑白</Radio.Button>
                      <Radio.Button value="彩色" style={{ flex: 1, textAlign: 'center' }}>彩色</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 3 行：纸张规格 (6) + 关联扣减用纸物品 (10) + 耗纸预算徽标 (8) */}
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="paperType" label={<span style={{ fontWeight: 600 }}>纸张规格</span>} rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                    <Select placeholder="纸张规格" onChange={handlePaperTypeChange}>
                      <Select.Option value="A4">A4 (标准文印)</Select.Option>
                      <Select.Option value="A3">A3 (大考卷/双拼)</Select.Option>
                      <Select.Option value="8K">8K (八开试卷)</Select.Option>
                      <Select.Option value="16K">16K (十六开练习)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    name="paperGoodsId"
                    label={<span style={{ fontWeight: 600 }}>关联扣减用纸物品（出库联动）</span>}
                    rules={[{ required: true, message: '请选择用纸物品！' }]}
                    style={{ marginBottom: 6 }}
                  >
                    <Select placeholder="选择关联扣减用纸物品" showSearch optionFilterProp="children">
                      {paperGoodsList.map((g) => {
                        const rate = Number(g.conversionRate) > 0 ? Number(g.conversionRate) : 1;
                        const stock = Number(g.stockNum ?? 0);
                        const remain = Number(g.remainSheets ?? 0);
                        const totalSheets = stock * rate + remain;
                        return (
                          <Select.Option key={g.goodsId} value={g.goodsId}>
                            {g.goodsName} {g.spec ? `[${g.spec}]` : ''} —— 余: {stock}{g.unit || '包'}{remain > 0 ? `+${remain}张` : ''}
                            {rate > 1 ? ` (折合${totalSheets}张)` : ''}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: 22, lineHeight: '22px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>实际出库耗纸预算</span>
                        <Tag
                          color={isEdit && isLegacyExtraPaperRecord(currentEditRecord) ? 'default' : 'blue'}
                          style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 4px', whiteSpace: 'nowrap' }}
                        >
                          {isEdit
                            ? formatExtraPaperLabel(currentEditRecord, false)
                            : splitAnswer
                            ? '试卷/答案各加: 模板1+预览1'
                            : '固定加: 模板1张+预览1张'}
                        </Tag>
                      </div>
                    }
                    style={{ marginBottom: 6 }}
                  >
                    <div
                      data-testid="preview-total-sheets-box"
                      style={{
                        height: 32,
                        padding: '0 10px',
                        background:
                          currentPaperGoods && previewTotalSheets > currentPaperStockSheets
                            ? '#FFF2F0'
                            : splitAnswer
                            ? '#F6FFED'
                            : '#E6F4FF',
                        border:
                          currentPaperGoods && previewTotalSheets > currentPaperStockSheets
                            ? '1px solid #FFCCC7'
                            : splitAnswer
                            ? '1px solid #B7EB8F'
                            : '1px solid #91CAFF',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 12, color: splitAnswer ? '#237804' : '#0958D9', fontWeight: 500 }}>
                        {splitAnswer ? '试卷+答案合计' : '总耗纸量'}
                      </span>
                      <span
                        data-testid="preview-total-sheets-value"
                        style={{
                          fontSize: 13,
                          fontWeight: 'bold',
                          color:
                            currentPaperGoods && previewTotalSheets > currentPaperStockSheets
                              ? '#CF1322'
                              : splitAnswer
                              ? '#389E0D'
                              : '#1677FF',
                        }}
                      >
                        {previewTotalSheets} 张 (≈ {(previewTotalSheets / currentPaperRate).toFixed(1)} 包)
                        {currentPaperGoods && previewTotalSheets > currentPaperStockSheets ? ' [库存不足]' : ''}
                      </span>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 4 行：申请教师 (6) + 年级班级 (6) + 文印经办人 (6) + 印刷时间 (6) */}
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="teacherId" label={<span style={{ fontWeight: 600 }}>申请教师</span>} rules={[{ required: true, message: '请选择教师' }]} style={{ marginBottom: 6 }}>
                    <Select
                      placeholder="选择申请教师"
                      showSearch
                      allowClear
                      onChange={handleTeacherChange}
                      filterOption={(input, option) =>
                        ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                      }
                      options={teacherList.map((t) => ({
                        label: `${t.teacherName} ${t.subject ? `(${t.subject})` : ''}`,
                        value: t.teacherId,
                      }))}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '4px 0' }} />
                          <div style={{ padding: '2px 8px' }}>
                            <Button
                              type="link"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={handleQuickAddTeacher}
                              style={{ padding: 0 }}
                            >
                              新建教师档案
                            </Button>
                          </div>
                        </>
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="grade" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="classId"
                    label={<span style={{ fontWeight: 600 }}>关联班级</span>}
                    rules={[{ required: true, message: '请选择关联班级' }]}
                    style={{ marginBottom: 6 }}
                  >
                    <Select
                      placeholder="选择班级"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                      }
                      options={filteredClassList.map((c) => ({
                        label: `${c.className}${c.grade ? ` (${c.grade})` : ''}`,
                        value: c.classId,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="operator" label={<span style={{ fontWeight: 600 }}>文印经办人</span>} rules={[{ required: true, message: '请选择经办人' }]} style={{ marginBottom: 6 }}>
                    <Select
                      placeholder="文印经办人"
                      showSearch
                      allowClear
                      options={operatorOptions}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="printTime" label={<span style={{ fontWeight: 600 }}>印刷时间</span>} rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                      style={{ width: '100%' }}
                      placeholder="选择印刷时间"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 5 行：文印用途（根据份数动态必填：<=20份必填，>20份选填，上限300字） */}
              <Row gutter={10}>
                <Col span={24}>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.printCount !== cur.printCount}>
                    {({ getFieldValue }) => {
                      const count = Number(getFieldValue('printCount') || 0);
                      const isPurposeRequired = count <= 20;
                      return (
                        <Form.Item
                          name="printPurpose"
                          label={
                            <Space size={4}>
                              <span style={{ fontWeight: 600 }}>文印用途</span>
                              <Typography.Text type={isPurposeRequired ? "danger" : "secondary"} style={{ fontSize: 12 }}>
                                {isPurposeRequired ? '（20份及以下必填）' : '（20份以上选填）'}
                              </Typography.Text>
                            </Space>
                          }
                          rules={[
                            { required: isPurposeRequired, message: '印刷份数在20份及以下时，文印用途为必填项' },
                            { max: 300, message: '用途描述不能超过300字' },
                          ]}
                          style={{ marginBottom: 6 }}
                        >
                          <Input.TextArea
                            rows={2}
                            maxLength={300}
                            showCount
                            placeholder="请输入文印用途说明（如：教学测试卷、班级周报、课后作业等，不超过300字）"
                            allowClear
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 6 行：原稿电子附件 (12) + 印刷成品留样 (12) 宽敞并排，各占一半 */}
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    key={currentQueueTask?.taskId || 'manual'}
                    name="attachment"
                    label={<span style={{ fontWeight: 600 }}>原稿电子文件 / 附件</span>}
                    style={{ marginBottom: 6 }}
                  >
                    {currentQueueTask?.attachmentStatus === 'matched' && currentQueueTask?.matchedAttachmentPath && !isManualReplacingAttachment ? (
                      <div
                        data-testid="matched-attachment-card"
                        style={{
                          fontSize: 12,
                          background: '#f6ffed',
                          border: '1px solid #b7eb8f',
                          borderRadius: 6,
                          padding: '10px 12px',
                          boxSizing: 'border-box',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <span style={{ color: '#274916', fontWeight: 600, flexShrink: 0 }}>📎 已匹配附件:</span>
                            <Tooltip title={currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName}>
                              <a
                                style={{ color: '#0958d9', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title="点击直接打开或下载此文件查看"
                                onClick={() => handleOpenMatchedAttachment(currentQueueTask.matchedAttachmentKey, currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName)}
                              >
                                {currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName}
                              </a>
                            </Tooltip>
                            <span style={{ color: '#8c8c8c', marginLeft: 4, fontSize: 11, flexShrink: 0 }}>（登记时自动上传）</span>
                          </span>
                          <Space size={4} style={{ flexShrink: 0 }}>
                            <Button
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              data-testid="open-matched-file-btn"
                              onClick={() => handleOpenMatchedAttachment(currentQueueTask.matchedAttachmentKey, currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName)}
                            >
                              快速打开原稿
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<ReloadOutlined />}
                              style={{ padding: '0 4px', fontSize: 11 }}
                              onClick={() => setIsManualReplacingAttachment(true)}
                            >
                              替换
                            </Button>
                          </Space>
                        </div>
                        {matchedAnalysisStatus.taskId === currentQueueTask.taskId && (
                          <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #b7eb8f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ color: matchedAnalysisStatus.loading ? '#1677ff' : '#595959', fontSize: 12 }}>
                              {matchedAnalysisStatus.loading && <ClockCircleOutlined spin style={{ marginRight: 4 }} />}
                              {matchedAnalysisStatus.text}
                            </span>
                            {!matchedAnalysisStatus.loading && (
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, fontSize: 11 }}
                                onClick={() => {
                                  const file = exportAttachmentFilesRef.current.get(currentQueueTask.matchedAttachmentKey!);
                                  if (file instanceof File) matchedDocumentAnalysisRef.current.delete(file);
                                  setMatchedAnalysisRetry((n) => n + 1);
                                }}
                              >
                                重新读取页数
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <FileUpload
                          contextKey={currentQueueTask?.taskId}
                          disabled={savingRecord}
                          accept=".doc,.docx,.docm,.pdf,.xls,.xlsx,.xlsm,.ppt,.pptx,.pptm,.txt,.zip,.rar,.7z,.wps,image/*"
                          placeholder="上传原稿或粘贴文件"
                          value={watchedAttachment || (form.getFieldValue('attachment') as string) || currentQueueTask?.attachment || ''}
                          fileName={currentQueueTask?.originalDocName || form.getFieldValue('printName')}
                          onChange={(url, uploadedName) => {
                            form.setFieldsValue({ attachment: url });
                            if (uploadedName && !form.getFieldValue('printName')) {
                              form.setFieldsValue({ printName: uploadedName.replace(/\.[^/.]+$/, '') });
                            }
                            triggerSaveRecordDraft({ ...form.getFieldsValue(), attachment: url });
                            if (ocrResult?.taskList && currentTaskIndex >= 0) {
                              const updated = ocrResult.taskList.map((item, idx) =>
                                idx === currentTaskIndex
                                  ? { ...item, attachment: url, attachmentStatus: url ? 'available' : 'missing' }
                                  : item
                              );
                              setOcrResult({ ...ocrResult, taskList: updated });
                            }
                          }}
                          onUploadSuccess={(_url, uploadedName, file) => {
                            const currentPrintName = form.getFieldValue('printName');
                            if (!currentPrintName && uploadedName) {
                              form.setFieldsValue({ printName: uploadedName.replace(/\.[^/.]+$/, '') });
                            }
                            form.setFieldsValue({ attachment: _url });
                            if (file) {
                              analyzeAndFillDocument(file);
                            }
                            triggerSaveRecordDraft({ ...form.getFieldsValue(), attachment: _url });
                            if (ocrResult?.taskList && currentTaskIndex >= 0) {
                              const updated = ocrResult.taskList.map((item, idx) =>
                                idx === currentTaskIndex
                                  ? {
                                      ...item,
                                      attachment: _url,
                                      originalDocName: uploadedName || item.originalDocName,
                                      attachmentStatus: 'available',
                                    }
                                  : item
                              );
                              setOcrResult({ ...ocrResult, taskList: updated });
                            }
                          }}
                        />
                        {currentQueueTask?.attachmentStatus === 'matched' && currentQueueTask?.matchedAttachmentPath && (
                          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              type="link"
                              size="small"
                              style={{ fontSize: 11, padding: 0 }}
                              onClick={() => setIsManualReplacingAttachment(false)}
                            >
                              ↩ 恢复使用微信匹配附件（{currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName}）
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item key={`image-${currentQueueTask?.taskId || "manual"}`} name="resultImg" label={<span style={{ fontWeight: 600 }}>印刷成品效果图留样（可截图Ctrl+V）</span>} style={{ marginBottom: 6 }}>
                    <ImageUpload contextKey={currentQueueTask?.taskId} disabled={savingRecord} placeholder="上传留样或按Ctrl+V粘贴" />
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 6 行：补充备注独占整行 + 常用装订与工艺快捷标签 (24) */}
              <Row gutter={10}>
                <Col span={24}>
                  <Form.Item
                    name="remark"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontWeight: 600 }}>补充备注与装订要求</span>
                        <span style={{ fontSize: 11, color: '#8c8c8c' }}>点击下方快捷标签可快速添加装订要求</span>
                      </div>
                    }
                    style={{ marginBottom: 6 }}
                    extra={
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#595959', fontWeight: 500 }}>常用工艺:</span>
                        {[
                          { label: '📌 骑马钉', text: '装订要求：骑马钉' },
                          { label: '📎 左上角钉', text: '装订要求：左上角钉' },
                          { label: '📎 两针角钉', text: '装订要求：两针角钉' },
                          { label: '📘 胶装成册', text: '装订要求：胶装成册' },
                          { label: '📖 加印彩封', text: '加印彩色封面' },
                          { label: '📐 A3折页中缝', text: 'A3折页印中缝' },
                          { label: '↔️ 横向打印', text: '页面需横向打印' },
                          { label: '✂️ 裁切成两份', text: '印刷后裁切对开' },
                          { label: '🔥 紧急先印', text: '急件优先印制' },
                        ].map((item) => (
                          <Tag
                            key={item.label}
                            color="cyan"
                            style={{ cursor: 'pointer', fontSize: 11, margin: 0, padding: '1px 7px', borderRadius: 4 }}
                            onClick={() => handleAppendRemarkTag(item.text)}
                          >
                            {item.label}
                          </Tag>
                        ))}
                        <Tag
                          color="default"
                          style={{ cursor: 'pointer', fontSize: 11, margin: 0, padding: '1px 6px', borderRadius: 4 }}
                          onClick={() => handleAppendRemarkTag('__CLEAR__')}
                        >
                          清空备注
                        </Tag>
                      </div>
                    }
                  >
                    <Input placeholder="输入装订要求（骑马钉/角钉）、考试时间、送达教研组等补充说明" allowClear />
                  </Form.Item>
                </Col>
              </Row>

              {/* 第 7 区：智能文印核对与辅助工作台卡片（Card），彻底盘活下半部分空间 */}
              <div
                style={{
                  marginTop: 4,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {/* 模块 A：智能查重与状态核验 */}
                <div style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px dashed #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      {currentQueueTask?.existingRecordDesc ? (
                        <span style={{ color: '#d46b08', fontWeight: 600 }}>
                          ⚠️ 排重预警：{currentQueueTask.existingRecordDesc}
                        </span>
                      ) : (
                        <span style={{ color: '#389e0d', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircleOutlined /> 智能查重：未检索到近期同名登记记录，可正常印制
                        </span>
                      )}
                      {currentQueueTask?.reviewReasons && currentQueueTask.reviewReasons.length > 0 && (
                        <Space size={4}>
                          {currentQueueTask.reviewReasons.map((r: string, idx: number) => (
                            <Tag key={idx} color="orange" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                              {r}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                    <Space size={8}>
                      <Button
                        size="small"
                        type="link"
                        icon={<FolderOpenOutlined />}
                        onClick={() => setExportModalOpen(true)}
                        style={{ fontSize: 12, padding: 0 }}
                      >
                        导入微信导出目录
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        icon={<MessageOutlined />}
                        onClick={() => {
                          setRawText('');
                          setTextModalOpen(true);
                        }}
                        style={{ fontSize: 12, padding: 0 }}
                      >
                        微信群消息智能解析
                      </Button>
                    </Space>
                  </div>
                </div>

                {/* 模块 B：试卷与答案智能拆分工作区 */}
                {!isEdit && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Checkbox
                        checked={splitAnswer}
                        onChange={(e) => handleSplitAnswerToggle(e.target.checked)}
                        style={{ fontSize: 12 }}
                      >
                        <span style={{ color: splitAnswer ? '#1677ff' : '#262626', fontWeight: 600 }}>
                          📑 试卷与答案合并文件智能拆分（自动拆分为【试卷】与【答案】两条独立台账，分别加纸）
                        </span>
                      </Checkbox>
                      {splitAnswer && (
                        <Tag color="green" style={{ margin: 0, fontSize: 10 }}>
                          拆分模式已激活
                        </Tag>
                      )}
                    </div>

                    {splitAnswer ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '10px 12px',
                          background: '#FFFFFF',
                          border: '1px solid #B7EB8F',
                          borderRadius: 6,
                        }}
                      >
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item
                              name="answerPageCount"
                              label={<span style={{ fontWeight: 500 }}>答案所占页数</span>}
                              rules={[{ required: true, message: '请输入答案页数' }]}
                              style={{ marginBottom: 4 }}
                              extra={
                                <div style={{ fontSize: 11, color: '#389E0D', marginTop: 2 }}>
                                  试卷正文折合: <b>{Math.max(1, (form.getFieldValue('pageCount') || 1) - (form.getFieldValue('answerPageCount') || 1))}</b> 页
                                </div>
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
                              label={<span style={{ fontWeight: 500 }}>答案印制份数</span>}
                              rules={[{ required: true, message: '请输入答案份数' }]}
                              style={{ marginBottom: 4 }}
                              extra={
                                <Space size={4} style={{ marginTop: 2 }}>
                                  <Tag
                                    color="blue"
                                    style={{ cursor: 'pointer', fontSize: 10, padding: '0 4px', margin: 0 }}
                                    onClick={() => {
                                      form.setFieldsValue({ answerPrintCount: 2 });
                                      setAnswerPrintCount(2);
                                      const current = form.getFieldsValue();
                                      const sheets = computePreviewSheets({ ...current, answerPrintCount: 2 }, true);
                                      setPreviewTotalSheets(sheets);
                                      triggerSaveRecordDraft({ ...current, answerPrintCount: 2 });
                                    }}
                                  >
                                    备课 2份
                                  </Tag>
                                  <Tag
                                    color="cyan"
                                    style={{ cursor: 'pointer', fontSize: 10, padding: '0 4px', margin: 0 }}
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
                                </Space>
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
                              label={<span style={{ fontWeight: 500 }}>答案印刷方式</span>}
                              rules={[{ required: true }]}
                              style={{ marginBottom: 4 }}
                            >
                              <Radio.Group
                                buttonStyle="solid"
                                style={{ width: '100%', display: 'flex' }}
                                onChange={(e) => {
                                  setAnswerPrintSide(e.target.value);
                                  const current = form.getFieldsValue();
                                  const sheets = computePreviewSheets({ ...current, answerPrintSide: e.target.value }, true);
                                  setPreviewTotalSheets(sheets);
                                  triggerSaveRecordDraft({ ...current, answerPrintSide: e.target.value });
                                }}
                              >
                                <Radio.Button value="1" style={{ flex: 1, textAlign: 'center' }}>单面印</Radio.Button>
                                <Radio.Button value="2" style={{ flex: 1, textAlign: 'center' }}>双面印</Radio.Button>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ) : (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#8c8c8c' }}>
                        💡 常见于年级试卷印制：如试卷 5 页（前 4 页试卷印 160 份，第 5 页答案仅印 2 份备课）。开启后系统将自动生成两条关联出库单。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Form>
          </div>
          {ocrResult && currentQueueTask && (
            <ChatSourcePanel
              result={ocrResult}
              task={currentQueueTask}
              onOpenFile={() =>
                handleOpenMatchedAttachment(
                  currentQueueTask.matchedAttachmentKey,
                  currentQueueTask.originalDocName || currentQueueTask.matchedAttachmentName
                )
              }
            />
          )}
        </div>
      </Modal>

      <Modal title="微信聊天记录智能预填" open={textModalOpen} maskClosable={false} keyboard={false} width={900} style={{top:12,paddingBottom:0}} styles={{body:{maxHeight:'calc(100dvh - 110px)',overflowY:'auto'}}} onCancel={()=>setTextModalOpen(false)} footer={null}>
        <div data-testid="chat-import" onPasteCapture={handleModalPaste}>
          <TextArea rows={5} value={rawText} onChange={e=>setRawText(e.target.value)} placeholder="粘贴多天聊天记录；也可粘贴文件，未知信息稍后手动填写" />
          <Button loading={parsingText} onClick={handleParseText} style={{margin:'10px 0'}}>解析文字并加入候选</Button>
          <Button onClick={()=>setDebugOpen(true)} style={{marginLeft:8}}>查看解析调试</Button>
          <Button icon={<FolderOpenOutlined />} onClick={() => { setTextModalOpen(false); setExportModalOpen(true); }} style={{marginLeft:8}}>导入微信导出目录</Button>
          <label style={{marginLeft:12}}>识别聊天截图 <input aria-label="识别聊天截图" type="file" accept="image/*" disabled={parsingText} onChange={e=>{
            const file=e.target.files?.[0]; if(file) enqueueImport(()=>parseScreenshotFile(file)); e.target.value='';
          }} /></label>
          {ocrResult && <>
            <div style={{marginBottom:12}}>共 {ocrResult.taskList.length} 条候选。未知信息留空，选择一条后对照当天全部聊天填写。</div>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="为当前联系人的候选统一指定申请教师"
              style={{width:350,marginBottom:12}}
              value={
                ocrResult.taskList[previewTaskIndex]?.teacherId &&
                ocrResult.taskList[previewTaskIndex]?.teacherId !== -999
                  ? ocrResult.taskList[previewTaskIndex]?.teacherId
                  : undefined
              }
              options={teacherList.filter(t=>t.teacherId!==-999).map(t=>({value:t.teacherId,label:t.teacherName}))}
              onChange={(teacherId) => handleBatchAssignTeacher(teacherId, ocrResult.taskList[previewTaskIndex])}
            />
            <ChatCandidateList
              tasks={ocrResult.taskList}
              selected={previewTaskIndex}
              onSelect={setPreviewTaskIndex}
              onToggleSkip={handleToggleSkipCandidate}
              onReprint={handleReprintCandidate}
            />
            <Button type="primary" onClick={()=>applyTaskToForm(ocrResult.taskList[previewTaskIndex],previewTaskIndex,ocrResult.taskList.length)}>打开当前任务并逐条登记</Button>
          </>}
        </div>
      </Modal>

      {/* 导入微信导出目录弹窗（先读导出清单选联系人，点击开始识别后才读取选中会话 messages.js） */}
      <Modal
        title="导入微信导出目录（先选联系人，再生成登记候选）"
        open={exportModalOpen}
        maskClosable={false}
        keyboard={false}
        width="min(1480px, 96vw)"
        style={{ top: 12, paddingBottom: 0 }}
        styles={{ body: { maxHeight: 'calc(100dvh - 170px)', overflowY: 'auto' } }}
        onCancel={() => setExportModalOpen(false)}
        footer={
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <Text type="secondary">{ocrResult?.taskList.length ? `已生成 ${ocrResult.taskList.length} 条候选，核对后逐条保存` : '先选择联系人，再点击“开始识别”'}</Text>
            <Button type="primary" data-testid="open-selected-candidate-btn"
              disabled={!ocrResult?.taskList[previewTaskIndex] || ocrResult.taskList[previewTaskIndex].alreadyRegistered || ocrResult.taskList[previewTaskIndex].skipped || exportRecognizing}
              onClick={() => ocrResult && applyTaskToForm(ocrResult.taskList[previewTaskIndex], previewTaskIndex, ocrResult.taskList.length)}>
              开始登记{ocrResult?.taskList.length ? `（第 ${previewTaskIndex + 1} 条）` : ''}
            </Button>
          </div>
        }
      >
        <div data-testid="wechat-export-import">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="选择整个微信导出文件夹后，首先仅读取《导出清单.json》展示联系人；勾选联系人并点击「开始识别」后才读取选中会话的消息与匹配附件。预览和筛选均不会写入登记或扣减库存。"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input
              ref={exportFolderInputRef}
              data-testid="wechat-export-dir-input"
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                handleSelectExportFolder(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              type="primary"
              icon={<FolderOpenOutlined />}
              loading={exportLoadingManifest}
              onClick={() => exportFolderInputRef.current?.click()}
            >
              选择微信导出文件夹
            </Button>
            {exportSession && (
              <Tag color="blue">
                共 {exportSession.conversations.length} 个会话 | 已勾选 {exportSelectedIds.length} 个联系人
              </Tag>
            )}
            <DatePicker.RangePicker
              value={exportDateRange as any}
              onChange={(dates) => setExportDateRange(dates as any)}
              placeholder={['开始日期（默认全部历史）', '结束日期（默认全部历史）']}
              allowEmpty={[true, true]}
              style={{ width: 290 }}
            />
            <Button
              type="primary"
              data-testid="start-wechat-recognize-btn"
              loading={exportRecognizing}
              disabled={!exportSession || eligibleExportSelectedIds.length === 0}
              onClick={handleStartExportRecognize}
            >
              开始识别选中联系人 ({eligibleExportSelectedIds.length})
            </Button>
          </div>

          {exportSession && (
            <Card size="small" style={{ marginBottom: 12 }} title="第一步：勾选需要识别的联系人会话（按当前登录用户自动记忆勾选）">
              {exportSession.classificationWarning && <Alert type="warning" showIcon title={exportSession.classificationWarning} style={{marginBottom:8}} />}
              <div style={{marginBottom:8}}>
                <Text type="secondary">
                  当前显示 {filteredExportConversations.length} 个会话；已识别公众号 {exportSession.conversations.filter(c=>c.accountType==='official').length} 个、企业号 {exportSession.conversations.filter(c=>c.accountType==='enterprise').length} 个。
                  {exportSession.conversations.some(c=>!c.accountType || c.accountType==='unknown') && '未确认类型的账号保留显示；可在导出目录补充联系人分类文件。'}
                  {eligibleExportSelectedIds.length < exportSelectedIds.length && ` 本次跳过已勾选但被账号类型筛选隐藏的 ${exportSelectedIds.length - eligibleExportSelectedIds.length} 个账号。`}
                </Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Input.Search
                  allowClear
                  placeholder="搜索联系人名称或会话ID"
                  value={exportSearchKeyword}
                  onChange={(e) => setExportSearchKeyword(e.target.value)}
                  style={{ width: 240 }}
                />
                <Radio.Group
                  size="small"
                  value={exportRegisteredFilter}
                  onChange={(e) => setExportRegisteredFilter(e.target.value)}
                >
                  <Radio.Button value="all">全部</Radio.Button>
                  <Radio.Button value="unregistered">未登记</Radio.Button>
                  <Radio.Button value="registered">已登记</Radio.Button>
                </Radio.Group>
                <Checkbox checked={exportHideBusiness} onChange={(e) => setExportHideBusiness(e.target.checked)}>
                  隐藏公众号、企业号
                </Checkbox>
                <Checkbox checked={exportOnlySelected} onChange={(e) => setExportOnlySelected(e.target.checked)}>
                  只看已勾选
                </Checkbox>
                <Checkbox checked={exportHideEmpty} onChange={(e) => setExportHideEmpty(e.target.checked)}>
                  隐藏 0 消息会话
                </Checkbox>
                <Space size={4} style={{ marginLeft: 'auto' }}>
                  <Button
                    size="small"
                    onClick={() => {
                      const merged = new Set(exportSelectedIds);
                      filteredExportConversations.forEach((c) => merged.add(c.id));
                      updateExportSelectedIds(Array.from(merged));
                    }}
                  >
                    全选当前筛选 ({filteredExportConversations.length})
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      const currentSet = new Set(exportSelectedIds);
                      filteredExportConversations.forEach((c) => {
                        if (currentSet.has(c.id)) currentSet.delete(c.id);
                        else currentSet.add(c.id);
                      });
                      updateExportSelectedIds(Array.from(currentSet));
                    }}
                  >
                    反选当前筛选
                  </Button>
                  <Button size="small" danger onClick={() => updateExportSelectedIds([])}>
                    清空选择
                  </Button>
                </Space>
              </div>

              <Table
                size="small"
                rowKey="id"
                dataSource={filteredExportConversations}
                pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (total) => `共 ${total} 个会话` }}
                scroll={{ y: 'max(180px, calc(100dvh - 440px))', x: 780 }}
                rowSelection={{
                  selectedRowKeys: exportSelectedIds,
                  preserveSelectedRowKeys: true,
                  onChange: (keys) => updateExportSelectedIds(keys.map(String)),
                }}
                columns={[
                  {
                    title: '联系人名称',
                    dataIndex: 'name',
                    render: (name: string, record: any) => (
                      <Tooltip title={`${name} · ${record.id}`}>
                        <Text strong ellipsis style={{maxWidth:'100%'}}>{name}</Text>
                      </Tooltip>
                    ),
                  },
                  {
                    title: '账号类型',
                    dataIndex: 'accountType',
                    width: 100,
                    render: (kind: string) => ({official:'公众号',enterprise:'企业号',personal:'联系人',group:'群聊'}[kind] || '未确认'),
                  },
                  {
                    title: '消息数',
                    dataIndex: 'messageCount',
                    width: 100,
                    align: 'center',
                    sorter: (a: any, b: any) => a.messageCount - b.messageCount,
                  },
                  {
                    title: '导出状态',
                    dataIndex: 'status',
                    width: 110,
                    align: 'center',
                    render: (status: string) => (
                      <Tag color={['成功','ok','completed'].includes(status) ? 'success' : 'warning'}>{status === 'completed' ? '已导出' : status}</Tag>
                    ),
                  },
                  {
                    title: '是否登记',
                    dataIndex: 'hasRegistered',
                    width: 130,
                    align: 'center',
                    render: (hasReg: boolean, record: any) =>
                      hasReg ? (
                        <Tag color="processing">已登记 ({record.registeredCount}条)</Tag>
                      ) : (
                        <Tag color="default">未登记</Tag>
                      ),
                  },
                ]}
              />
            </Card>
          )}

          {exportDamagedNotices.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={`有 ${exportDamagedNotices.length} 个会话消息文件读取异常（已安全跳过）：${exportDamagedNotices
                .map((d) => `${d.conversationName}(${d.reason})`)
                .join('；')}`}
            />
          )}

          {ocrResult && ocrResult.taskList.length > 0 && (
            <Card
              ref={exportStep2CardRef}
              size="small"
              title={`第二步：逐条核对登记候选（共 ${ocrResult.taskList.length} 条，普通闲聊已留作上下文）`}
              extra={
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  data-testid="step2-open-selected-candidate-btn"
                  disabled={!ocrResult?.taskList[previewTaskIndex] || ocrResult.taskList[previewTaskIndex].alreadyRegistered || ocrResult.taskList[previewTaskIndex].skipped || exportRecognizing}
                  onClick={() => ocrResult && applyTaskToForm(ocrResult.taskList[previewTaskIndex], previewTaskIndex, ocrResult.taskList.length)}
                >
                  开启登记{ocrResult?.taskList.length ? `（第 ${previewTaskIndex + 1} 条）` : ''}
                </Button>
              }
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="为当前选中候选所属联系人统一指定申请教师"
                  style={{ width: 340 }}
                  value={
                    ocrResult.taskList[previewTaskIndex]?.teacherId &&
                    ocrResult.taskList[previewTaskIndex]?.teacherId !== -999
                      ? ocrResult.taskList[previewTaskIndex]?.teacherId
                      : undefined
                  }
                  options={teacherList.filter((t) => t.teacherId !== -999).map((t) => ({ value: t.teacherId, label: t.teacherName }))}
                  onChange={(teacherId) => handleBatchAssignTeacher(teacherId, ocrResult.taskList[previewTaskIndex])}
                />
                <Button
                  type="primary"
                  data-testid="open-selected-candidate-btn-inline"
                  disabled={!ocrResult?.taskList[previewTaskIndex] || ocrResult.taskList[previewTaskIndex].alreadyRegistered || ocrResult.taskList[previewTaskIndex].skipped || exportRecognizing}
                  onClick={() => ocrResult && applyTaskToForm(ocrResult.taskList[previewTaskIndex], previewTaskIndex, ocrResult.taskList.length)}
                >
                  开启登记选中候选{ocrResult?.taskList.length ? `（第 ${previewTaskIndex + 1} 条）` : ''}
                </Button>
              </div>
              <ChatCandidateList
                tasks={ocrResult.taskList}
                selected={previewTaskIndex}
                onSelect={setPreviewTaskIndex}
                onToggleSkip={handleToggleSkipCandidate}
                onReprint={handleReprintCandidate}
              />
            </Card>
          )}
        </div>
      </Modal>

      {/* 标记完成与成品留样弹窗 */}
      <ChatDebugPanel open={debugOpen} entries={debugEntries} selected={debugSelected} onSelect={setDebugSelected}
        onClose={()=>setDebugOpen(false)} onClear={()=>{setDebugEntries([]);setDebugSelected('');}} />
      <Modal
        title="标记印刷完成 & 上传成品留样"
        open={completeModalOpen}
        onOk={handleSaveComplete}
        onCancel={() => setCompleteModalOpen(false)}
        width={480}
        destroyOnHidden
        styles={{ body: { padding: '14px 18px' } }}
      >
        {completeTarget && (
          <div
            style={{
              background: '#F0F5FF',
              border: '1px solid #D6E4FF',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 13, color: '#1D39C4', marginBottom: 2 }}>
              🖨️ {completeTarget.printName}
            </div>
            <div style={{ fontSize: 11, color: '#595959', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>教师: <b>{completeTarget.teacherName || '-'}</b></span>
              <span>份数: <b style={{ color: '#1677FF' }}>{completeTarget.printCount} 份</b></span>
              <span>纸张: <b>{completeTarget.paperGoodsName || completeTarget.paperType || 'A4'}</b></span>
            </div>
          </div>
        )}
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="resultImg"
            label="印刷成品效果图 / 拍照留样"
            style={{ marginBottom: 0 }}
          >
            <ImageUpload placeholder="点击上传或按 Ctrl+V 粘贴成品留样图片" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改印刷登记弹窗（待印刷状态专用，库存相关字段变化时后端自动同步库存） */}
      <Modal
        title="修改印刷登记"
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={handleCloseEdit}
        confirmLoading={editSaving}
        width={780}
        destroyOnHidden
        styles={{ body: { padding: '14px 18px' } }}
      >
        {editTarget && (
          <div
            style={{
              background: '#FFF7E6',
              border: '1px solid #FFD591',
              borderRadius: 6,
              padding: '6px 12px',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13, color: '#D46B08' }}>
              ✏️ 正在修改：{editTarget.printName}
            </span>
            <Space size={8}>
              <Tag color={isLegacyExtraPaperRecord(editTarget) ? 'default' : 'blue'} style={{ margin: 0 }}>
                额外用纸：{formatExtraPaperLabel(editTarget, false)}
              </Tag>
              <span style={{ fontSize: 11, color: '#874D00' }}>
                修改份数/页数/单双面将按该记录保存的额外用纸规则重算并同步库存
              </span>
            </Space>
          </div>
        )}
        <Form form={editForm} layout="vertical" preserve={false}>
          <Row gutter={10}>
            <Col span={10}>
              <Form.Item
                name="printName"
                label="印刷材料名称"
                rules={[{ required: true, message: '请输入印刷名称' }]}
                style={{ marginBottom: 10 }}
              >
                <Input placeholder="如：高三月考数学试卷" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="printCount"
                label="印刷份数"
                rules={[{ required: true, message: '请输入份数' }]}
                style={{ marginBottom: 10 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="份" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="pageCount"
                label="每份页数"
                rules={[{ required: true, message: '请输入页数' }]}
                style={{ marginBottom: 10 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="页" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="printSide" label="单/双面" style={{ marginBottom: 10 }}>
                <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                  <Radio.Button value="1" style={{ flex: 1, textAlign: 'center' }}>单面印</Radio.Button>
                  <Radio.Button value="2" style={{ flex: 1, textAlign: 'center' }}>双面印</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={10}>
            <Col span={10}>
              <Form.Item
                name="paperGoodsId"
                label="用纸物品（联动出库）"
                rules={[{ required: true, message: '请选择用纸物品' }]}
                style={{ marginBottom: 10 }}
              >
                <Select
                  placeholder="选择用纸"
                  showSearch
                  optionFilterProp="children"
                  options={paperGoodsList.map((g: any) => ({
                    label: `${g.goodsName}（库存 ${g.stockNum || 0} ${g.unitName || '箱'} × ${g.conversionRate || 1}张/箱${g.remainSheets ? ' + ' + g.remainSheets + '张' : ''}）`,
                    value: g.goodsId,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="colorCategory"
                label="颜色类别"
                rules={[{ required: true, message: '请选择颜色类别' }]}
                initialValue="黑白"
                style={{ marginBottom: 10 }}
              >
                <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                  <Radio.Button value="黑白" style={{ flex: 1, textAlign: 'center' }}>黑白</Radio.Button>
                  <Radio.Button value="彩色" style={{ flex: 1, textAlign: 'center' }}>彩色</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="teacherId" label="申请教师" style={{ marginBottom: 10 }}>
                <Select
                  placeholder="选择教师"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  options={teacherList.map((t: any) => ({
                    label: `${t.teacherName}（${t.subject || ''}）`,
                    value: t.teacherId,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={10}>
            <Col span={24}>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.printCount !== cur.printCount}>
                {({ getFieldValue }) => {
                  const count = Number(getFieldValue('printCount') || 0);
                  const isPurposeRequired = count <= 20;
                  return (
                    <Form.Item
                      name="printPurpose"
                      label={
                        <Space size={4}>
                          <span>文印用途</span>
                          <Typography.Text type={isPurposeRequired ? "danger" : "secondary"} style={{ fontSize: 12 }}>
                            {isPurposeRequired ? '（20份及以下必填）' : '（20份以上选填）'}
                          </Typography.Text>
                        </Space>
                      }
                      rules={[
                        { required: isPurposeRequired, message: '印刷份数在20份及以下时，文印用途为必填项' },
                        { max: 300, message: '用途描述不能超过300字' },
                      ]}
                      style={{ marginBottom: 10 }}
                    >
                      <Input.TextArea
                        rows={2}
                        maxLength={300}
                        showCount
                        placeholder="请输入文印用途说明（如：教学测试卷、班级周报等，不超过300字）"
                        allowClear
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={10}>
            <Col span={6}>
              <Form.Item
                name="classId"
                label="班级"
                rules={[{ required: true, message: '请选择班级' }]}
                style={{ marginBottom: 8 }}
              >
                <Select
                  placeholder="选择班级"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  options={classList.map((c: any) => ({
                    label: `${c.className}（${c.grade || ''}）`,
                    value: c.classId,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="operator" label="经办人" style={{ marginBottom: 8 }}>
                <Input placeholder="经办人姓名" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="printTime" label="印刷时间" style={{ marginBottom: 8 }}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} placeholder="选择时间" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="remark" label="备注" style={{ marginBottom: 8 }}>
                <Input placeholder="装订要求或补充说明" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 印刷错误登记弹窗 */}
      <Modal
        title="登记印刷错误损耗"
        open={printErrorModalOpen}
        onOk={handleSavePrintError}
        onCancel={() => {
          setPrintErrorModalOpen(false);
          setPrintErrorTarget(null);
        }}
        confirmLoading={printErrorSaving}
        width={460}
        destroyOnHidden
        styles={{ body: { padding: '14px 18px' } }}
      >
        {printErrorTarget && (
          <div
            style={{
              background: '#FFF1F0',
              border: '1px solid #FFA39E',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 13, color: '#CF1322', marginBottom: 2 }}>
              ⚠️ {printErrorTarget.printName}
            </div>
            <div style={{ fontSize: 11, color: '#5C0011', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>原耗纸: <b>{printErrorTarget.totalPages || 0} 张</b></span>
              <span>用纸: <b>{printErrorTarget.paperGoodsName || printErrorTarget.paperType || 'A4'}</b></span>
              {printErrorTarget.errorCount ? (
                <span>已登记损耗: <b style={{ color: '#CF1322' }}>{printErrorTarget.errorCount} 张</b></span>
              ) : null}
            </div>
          </div>
        )}
        <Form form={printErrorForm} layout="vertical" preserve={false}>
          <Form.Item
            name="errorCount"
            label="印刷错误损耗张数（自动生成独立出库单）"
            rules={[{ required: true, message: '请输入损耗张数' }]}
            style={{ marginBottom: 10 }}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如 50" autoFocus addonAfter="张" />
          </Form.Item>
          <Form.Item
            name="errorRemark"
            label="错误原因说明"
            rules={[{ required: true, message: '请简要说明错误原因' }]}
            style={{ marginBottom: 0 }}
          >
            <TextArea
              placeholder="如：油墨不均导致重印、纸张卡纸损耗、装订错误等"
              rows={2}
              maxLength={200}
              showCount
            />
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
            <Descriptions.Item label="颜色类别">
              <Tag color={currentRecord.colorCategory === '彩色' ? 'magenta' : 'default'}>
                {currentRecord.colorCategory || '黑白'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="单双面">
              {currentRecord.printSide === '2' ? '双面' : '单面'}
            </Descriptions.Item>
            <Descriptions.Item label="印刷用纸">{currentRecord.paperType || 'A4'}</Descriptions.Item>
            <Descriptions.Item label="印刷份数">{currentRecord.printCount} 份</Descriptions.Item>
            <Descriptions.Item label="每份页数">{currentRecord.pageCount || 1} 页</Descriptions.Item>
            <Descriptions.Item label="模板用纸">
              {isLegacyExtraPaperRecord(currentRecord)
                ? '0 张（旧规则，未计入）'
                : `${currentRecord.templatePaperCount ?? 1} 张`}
            </Descriptions.Item>
            <Descriptions.Item label="印刷预览用纸">
              {isLegacyExtraPaperRecord(currentRecord)
                ? '0 张（旧规则，未计入）'
                : `${currentRecord.previewPaperCount ?? 1} 张`}
            </Descriptions.Item>
            <Descriptions.Item label="纸张总消耗量" span={2}>
              <Space size={8}>
                <Text strong style={{ color: '#1677FF' }}>
                  {currentRecord.totalPages} 张纸
                </Text>
                <Tag color={isLegacyExtraPaperRecord(currentRecord) ? 'default' : 'blue'}>
                  {formatExtraPaperLabel(currentRecord, false)}
                </Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="经办人">{currentRecord.operator}</Descriptions.Item>
            <Descriptions.Item label="印刷时间">
              {currentRecord.printTime ? dayjs(currentRecord.printTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="关联出库单号" span={2}>
              {currentRecord.outNo ? (
                <Tag
                  color="cyan"
                  style={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => handleViewOut(currentRecord)}
                >
                  {currentRecord.outNo}
                </Tag>
              ) : (
                <Text type="secondary">未生成出库单</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="文印用途" span={2}>
              {currentRecord.printPurpose || currentRecord.purpose || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="原稿附件" span={2}>
              {currentRecord.attachment ? (
                <a
                  href={currentRecord.attachment}
                  target="_blank"
                  rel="noreferrer"
                  title={currentRecord.attachment}
                  style={{ color: '#1677FF' }}
                >
                  <PaperClipOutlined /> {getFileName(currentRecord.attachment)}
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

      {/* 快捷新建教师弹窗 */}
      <Modal
        title="快捷新建教师"
        open={teacherModalOpen}
        onOk={handleSaveNewTeacher}
        onCancel={() => setTeacherModalOpen(false)}
        confirmLoading={teacherSaving}
        width={500}
        destroyOnHidden
        styles={{ body: { padding: '16px 20px 8px' } }}
      >
        <Form form={teacherForm} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="teacherType"
                label="人员类型"
                rules={[{ required: true, message: '请选择人员类型' }]}
                style={{ marginBottom: 12 }}
              >
                <Radio.Group>
                  <Radio value="1">任课老师</Radio>
                  <Radio value="2">行政人员</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="teacherName"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="如：汪思雅" autoFocus />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.teacherType !== cur.teacherType}
              >
                {({ getFieldValue }) =>
                  getFieldValue('teacherType') === '1' ? (
                    <Form.Item
                      name="subject"
                      label="任教学科"
                      rules={[{ required: true, message: '请输入任教学科' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder="如：语文、数学、英语" />
                    </Form.Item>
                  ) : (
                    <Form.Item label="任教学科" style={{ marginBottom: 12 }}>
                      <Input disabled placeholder="行政人员无需填写" />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="grade" label="任教年级" style={{ marginBottom: 12 }}>
                <Select placeholder="请选择任教年级" allowClear>
                  <Select.Option value="高一">高一年级</Select.Option>
                  <Select.Option value="高二">高二年级</Select.Option>
                  <Select.Option value="高三">高三年级</Select.Option>
                  <Select.Option value="复读部">高三复读部</Select.Option>
                  <Select.Option value="初中部">初中部</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="phone" label="联系电话" style={{ marginBottom: 8 }}>
                <Input placeholder="选填，手机或办公电话" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PrintRecordPage;
