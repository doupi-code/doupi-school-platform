import type {PrintCandidate} from './chatPrefill';
const area:Record<string,number>={A4:210*297,A3:297*420,'8K':260*370,'16K':195*270};

/** 新登记固定增加：模板用纸 1 张、印刷预览用纸 1 张 */
export const DEFAULT_TEMPLATE_PAPER_COUNT = 1;
export const DEFAULT_PREVIEW_PAPER_COUNT = 1;
export const DEFAULT_EXTRA_PAPER_COUNT = DEFAULT_TEMPLATE_PAPER_COUNT + DEFAULT_PREVIEW_PAPER_COUNT;

export function convertPages(pages:number|undefined,source:string|undefined,target:string) {
  if(!pages || !source || !area[source] || !area[target]) return pages;
  if(area[target]>=area[source]*1.5) return Math.ceil(pages/2);
  if(area[source]>=area[target]*1.5) return pages*2;
  return pages;
}

export function derivePrintFields(task:PrintCandidate,current:Record<string,unknown>={},manual:ReadonlySet<string>=new Set()) {
  const original=task.sourcePageCount ?? task.pageCount ?? undefined;
  const paperType=manual.has('paperType') ? current.paperType as string : task.paperType || (task.sourcePaperType==='A4' && original===1?'16K':'8K');
  const pageCount=manual.has('pageCount') ? current.pageCount as number|undefined : convertPages(task.pageCount ?? original,task.sourcePaperType,paperType);
  const printSide=manual.has('printSide') ? current.printSide as string|undefined : task.printSide || (pageCount && pageCount>0 ? pageCount===1?'1':'2' : undefined);
  return {paperType,pageCount,printSide};
}

/** 计算正式印刷耗纸张数（不含模板和预览额外用纸） */
export function calculateFormalSheets(count: number, pages: number, side: string): number {
  const p = Math.max(1, Number(pages) || 1);
  const c = Math.max(0, Number(count) || 0);
  if (side === '2') {
    return c * Math.ceil(p / 2);
  }
  return c * p;
}

/** 计算含额外用纸（模板+预览）的单条记录总耗纸张数 */
export function calculateTotalSheetsWithExtra(
  count: number,
  pages: number,
  side: string,
  templatePaperCount: number = DEFAULT_TEMPLATE_PAPER_COUNT,
  previewPaperCount: number = DEFAULT_PREVIEW_PAPER_COUNT
): number {
  const c = Number(count) || 0;
  if (c <= 0) return 0;
  const formal = calculateFormalSheets(c, pages, side);
  const extra = Math.max(0, Number(templatePaperCount) || 0) + Math.max(0, Number(previewPaperCount) || 0);
  return formal + extra;
}

/** 计算试卷与答案拆分时的耗纸明细（拆分为两条登记，每条各加 2 张，合计增加 4 张） */
export function calculateSplitSheetsWithExtra(
  valuesOrExamCount:
    | {
        printCount?: number;
        pageCount?: number;
        printSide?: string;
        answerPageCount?: number;
        answerPrintCount?: number;
        answerPrintSide?: string;
      }
    | number,
  examPageOrTemplateCount: number = DEFAULT_TEMPLATE_PAPER_COUNT,
  examSideOrPreviewCount: string | number = DEFAULT_PREVIEW_PAPER_COUNT,
  ansPrintCountArg?: number,
  ansPageCountArg?: number,
  ansPrintSideArg?: string,
  templatePaperCountArg: number = DEFAULT_TEMPLATE_PAPER_COUNT,
  previewPaperCountArg: number = DEFAULT_PREVIEW_PAPER_COUNT
) {
  let examPage: number;
  let ansPage: number;
  let examCount: number;
  let ansCount: number;
  let examSide: string;
  let ansSide: string;
  let templatePaperCount: number;
  let previewPaperCount: number;

  if (typeof valuesOrExamCount === 'object' && valuesOrExamCount !== null) {
    const totalPageCount = Math.max(2, Number(valuesOrExamCount?.pageCount) || 2);
    ansPage = Math.min(Math.max(1, Number(valuesOrExamCount?.answerPageCount) || 1), Math.max(1, totalPageCount - 1));
    examPage = Math.max(1, totalPageCount - ansPage);
    examCount = Math.max(0, Number(valuesOrExamCount?.printCount) || 0);
    ansCount = Math.max(0, Number(valuesOrExamCount?.answerPrintCount) || 0);
    examSide = String(valuesOrExamCount?.printSide || '1');
    ansSide = String(valuesOrExamCount?.answerPrintSide || '1');
    templatePaperCount = Number(examPageOrTemplateCount ?? DEFAULT_TEMPLATE_PAPER_COUNT);
    previewPaperCount = Number(examSideOrPreviewCount ?? DEFAULT_PREVIEW_PAPER_COUNT);
  } else {
    examCount = Math.max(0, Number(valuesOrExamCount) || 0);
    examPage = Math.max(1, Number(examPageOrTemplateCount) || 1);
    examSide = String(examSideOrPreviewCount || '1');
    ansCount = Math.max(0, Number(ansPrintCountArg) || 0);
    ansPage = Math.max(1, Number(ansPageCountArg) || 1);
    ansSide = String(ansPrintSideArg || '1');
    templatePaperCount = Number(templatePaperCountArg ?? DEFAULT_TEMPLATE_PAPER_COUNT);
    previewPaperCount = Number(previewPaperCountArg ?? DEFAULT_PREVIEW_PAPER_COUNT);
  }

  const singleExtra = Math.max(0, Number(templatePaperCount) || 0) + Math.max(0, Number(previewPaperCount) || 0);

  const examFormalSheets = calculateFormalSheets(examCount, examPage, examSide);
  const examTotalSheets = examCount > 0 ? examFormalSheets + singleExtra : 0;
  const answerFormalSheets = calculateFormalSheets(ansCount, ansPage, ansSide);
  const answerTotalSheets = ansCount > 0 ? answerFormalSheets + singleExtra : 0;

  return {
    examPage,
    ansPage,
    examFormalSheets,
    examTotalSheets,
    examSheets: examTotalSheets,
    answerFormalSheets,
    answerTotalSheets,
    answerSheets: answerTotalSheets,
    extraSheetsPerRecord: singleExtra,
    totalExtraSheets: (examCount > 0 ? singleExtra : 0) + (ansCount > 0 ? singleExtra : 0),
    totalSheets: examTotalSheets + answerTotalSheets,
  };
}

/** 判断记录是否为历史旧规则记录（templatePaperCount=0 且 previewPaperCount=0） */
export function isLegacyExtraPaperRecord(record?: {
  templatePaperCount?: number | null;
  previewPaperCount?: number | null;
} | null): boolean {
  if (!record) return false;
  const t = Number(record.templatePaperCount ?? 0);
  const p = Number(record.previewPaperCount ?? 0);
  return t === 0 && p === 0;
}

/** 格式化模板与预览额外用纸只读展示文案 */
export function formatExtraPaperLabel(
  record?: { templatePaperCount?: number | null; previewPaperCount?: number | null } | null,
  isNewRecord = false
): string {
  if (!isNewRecord && isLegacyExtraPaperRecord(record)) {
    return '旧规则，未计入';
  }
  const t = isNewRecord ? DEFAULT_TEMPLATE_PAPER_COUNT : Number(record?.templatePaperCount ?? DEFAULT_TEMPLATE_PAPER_COUNT);
  const p = isNewRecord ? DEFAULT_PREVIEW_PAPER_COUNT : Number(record?.previewPaperCount ?? DEFAULT_PREVIEW_PAPER_COUNT);
  return `模板 ${t} 张 + 预览 ${p} 张`;
}
