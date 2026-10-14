export type SortOrderType = 'ascend' | 'descend';

export interface SortFieldItem {
  field: string;
  order: SortOrderType;
  label: string;
  dbColumn: string;
}

export const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export function createDefaultSortItem(
  defaultField = 'printTime',
  defaultOrder: SortOrderType = 'descend',
  defaultLabel = '印刷时间',
  defaultDbColumn = 'r.print_time'
): SortFieldItem {
  return {
    field: defaultField,
    order: defaultOrder,
    label: defaultLabel,
    dbColumn: defaultDbColumn,
  };
}

export interface ToggleResult {
  nextList: SortFieldItem[];
  nextIsCustom: boolean;
}

/**
 * 计算点击表头后的排序状态流转
 * 支持升序、降序以及移除三种循环状态；多字段按点击先后顺序组合排列
 */
export function toggleSortState(
  prevList: SortFieldItem[],
  isCustom: boolean,
  field: string,
  label: string,
  dbColumn: string,
  initialDirection: SortOrderType = 'ascend',
  defaultSortItem: SortFieldItem = createDefaultSortItem()
): ToggleResult {
  // 如果当前是未定制的默认状态
  if (!isCustom) {
    if (field === defaultSortItem.field) {
      const nextOrder: SortOrderType = defaultSortItem.order === 'descend' ? 'ascend' : 'descend';
      return {
        nextList: [{ field, order: nextOrder, label, dbColumn }],
        nextIsCustom: true,
      };
    } else {
      return {
        nextList: [{ field, order: initialDirection, label, dbColumn }],
        nextIsCustom: true,
      };
    }
  }

  // 已处于定制排序状态
  const idx = prevList.findIndex((item) => item.field === field);
  if (idx >= 0) {
    const current = prevList[idx];
    if (current.order === 'ascend') {
      const next = [...prevList];
      next[idx] = { ...current, order: 'descend' };
      return { nextList: next, nextIsCustom: true };
    } else {
      const next = prevList.filter((_, i) => i !== idx);
      if (next.length === 0) {
        return { nextList: [defaultSortItem], nextIsCustom: false };
      }
      return { nextList: next, nextIsCustom: true };
    }
  } else {
    // 按选择的先后顺序追加到末尾，形成多字段组合排序优先级
    return {
      nextList: [...prevList, { field, order: initialDirection, label, dbColumn }],
      nextIsCustom: true,
    };
  }
}

/**
 * 移除指定字段排序
 */
export function removeSortState(
  prevList: SortFieldItem[],
  field: string,
  defaultSortItem: SortFieldItem = createDefaultSortItem()
): ToggleResult {
  const next = prevList.filter((item) => item.field !== field);
  if (next.length === 0) {
    return { nextList: [defaultSortItem], nextIsCustom: false };
  }
  return { nextList: next, nextIsCustom: true };
}

/**
 * 生成数据库排序参数（支持多字段组合排序及 print_id 兜底）
 */
export function buildOrderByClause(
  sortList: SortFieldItem[],
  defaultSortItem: SortFieldItem = createDefaultSortItem()
): string {
  const activeList = sortList.length > 0 ? sortList : [defaultSortItem];
  const orderParts = activeList.map((item) => {
    const col = item.dbColumn || item.field;
    const dir = item.order === 'ascend' ? 'asc' : 'desc';
    return `${col} ${dir}`;
  });
  if (!orderParts.some((p) => p.includes('print_id'))) {
    orderParts.push('r.print_id desc');
  }
  return orderParts.join(', ');
}
