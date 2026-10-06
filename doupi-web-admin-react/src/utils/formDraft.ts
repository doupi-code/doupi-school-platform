/**
 * 表单草稿缓存管理工具
 * 支持以页面Key与记录ID为维度的本地表单草稿持久化
 */
export interface DraftData<T = any> {
  formValues: T;
  extraData?: any;
  savedAt: number;
  timeText: string;
}

const DRAFT_PREFIX = 'DP_FORM_DRAFT_';

const formatDateTime = (date: Date): string => {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const FormDraftUtil = {
  /**
   * 生成缓存键
   */
  getKey: (pageKey: string, recordId?: string | number | null): string => {
    return `${DRAFT_PREFIX}${pageKey}_${recordId !== null && recordId !== undefined && recordId !== '' ? recordId : 'create'}`;
  },

  /**
   * 获取本地草稿
   */
  getDraft: <T = any>(pageKey: string, recordId?: string | number | null): DraftData<T> | null => {
    try {
      const key = FormDraftUtil.getKey(pageKey, recordId);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as DraftData<T>;
    } catch (e) {
      console.warn('[FormDraft] 获取草稿异常:', e);
      return null;
    }
  },

  /**
   * 保存本地草稿
   */
  saveDraft: (
    pageKey: string,
    recordId: string | number | null | undefined,
    formValues: any,
    extraData?: any
  ): void => {
    try {
      const key = FormDraftUtil.getKey(pageKey, recordId);
      const now = new Date();
      const draft: DraftData = {
        formValues,
        extraData,
        savedAt: now.getTime(),
        timeText: formatDateTime(now),
      };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) {
      console.warn('[FormDraft] 保存草稿失败:', e);
    }
  },

  /**
   * 清除本地草稿
   */
  clearDraft: (pageKey: string, recordId?: string | number | null): void => {
    try {
      const key = FormDraftUtil.getKey(pageKey, recordId);
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[FormDraft] 清除草稿失败:', e);
    }
  },
};
