import React, { useState, useCallback, useMemo } from 'react';
import { Tag, Button, Space, Tooltip, message } from 'antd';
import {
  CaretUpOutlined,
  CaretDownOutlined,
  ClearOutlined,
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  type SortOrderType,
  type SortFieldItem,
  CIRCLED_NUMBERS,
  createDefaultSortItem,
  toggleSortState,
  removeSortState,
  buildOrderByClause,
} from '@/utils/tableMultiSortCore';

export type { SortOrderType, SortFieldItem };
export { CIRCLED_NUMBERS };

export interface UseTableMultiSortOptions {
  defaultField?: string;
  defaultOrder?: SortOrderType;
  defaultLabel?: string;
  defaultDbColumn?: string;
  onSortChange?: () => void;
}

export function useTableMultiSort(options?: UseTableMultiSortOptions) {
  const defaultField = options?.defaultField || 'printTime';
  const defaultOrder = options?.defaultOrder || 'descend';
  const defaultLabel = options?.defaultLabel || '印刷时间';
  const defaultDbColumn = options?.defaultDbColumn || 'r.print_time';

  const defaultSortItem: SortFieldItem = useMemo(
    () => createDefaultSortItem(defaultField, defaultOrder, defaultLabel, defaultDbColumn),
    [defaultField, defaultOrder, defaultLabel, defaultDbColumn]
  );

  // sortList 保存当前生效的排序字段列表（按选择的先后顺序排列）
  const [sortList, setSortList] = useState<SortFieldItem[]>([defaultSortItem]);
  // isCustom 标识用户是否进行过主动排序定制（false 表示处于系统默认状态）
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // 切换某一字段的排序
  const toggleSort = useCallback(
    (field: string, label: string, dbColumn: string, initialDirection: SortOrderType = 'ascend') => {
      const { nextList, nextIsCustom } = toggleSortState(
        sortList,
        isCustom,
        field,
        label,
        dbColumn,
        initialDirection,
        defaultSortItem
      );
      setSortList(nextList);
      setIsCustom(nextIsCustom);
    },
    [sortList, isCustom, defaultSortItem]
  );

  // 单独移除某一字段排序
  const removeSort = useCallback(
    (field: string) => {
      const { nextList, nextIsCustom } = removeSortState(sortList, field, defaultSortItem);
      setSortList(nextList);
      setIsCustom(nextIsCustom);
    },
    [sortList, defaultSortItem]
  );

  // 一键重置/清除排序，恢复默认排序
  const resetSort = useCallback(() => {
    setSortList([defaultSortItem]);
    setIsCustom(false);
    message.success('已恢复默认排序（印刷时间倒序）');
  }, [defaultSortItem]);

  // 生成传递给后端的排序查询参数
  const getSortParams = useCallback(() => {
    const orderClause = buildOrderByClause(sortList, defaultSortItem);
    return {
      orderByColumn: orderClause,
      orderBy: orderClause,
      isAsc: '',
    };
  }, [sortList, defaultSortItem]);

  // 渲染排序列标题，包含列名、序号徽标、升降序箭头、提示以及点击事件
  const renderSortHeader = useCallback(
    (
      title: React.ReactNode,
      field: string,
      label: string,
      dbColumn: string,
      initialDirection: SortOrderType = 'ascend',
      align: 'left' | 'center' | 'right' = 'center'
    ) => {
      const idx = sortList.findIndex((item) => item.field === field);
      const isSorted = idx >= 0;
      const currentItem = isSorted ? sortList[idx] : null;
      const isAsc = currentItem?.order === 'ascend';
      const isDesc = currentItem?.order === 'descend';
      const priorityNum = idx + 1;
      const priorityBadge = priorityNum <= 10 ? CIRCLED_NUMBERS[priorityNum - 1] : `[${priorityNum}]`;

      const tooltipText = isSorted
        ? `当前排序：第 ${priorityNum} 优先级【${currentItem?.order === 'ascend' ? '升序' : '降序'}】，点击切换${currentItem?.order === 'ascend' ? '降序' : '取消'}`
        : `点击按【${label}】排序（支持多字段先后组合排序）`;

      return (
        <Tooltip title={tooltipText} placement="top">
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleSort(field, label, dbColumn, initialDirection);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
              cursor: 'pointer',
              userSelect: 'none',
              width: '100%',
              gap: 4,
            }}
            className="custom-sortable-header"
          >
            <span style={{ fontWeight: isSorted ? 600 : 'normal', color: isSorted ? '#1677FF' : 'inherit' }}>
              {title}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {isSorted && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#1677FF',
                    lineHeight: 1,
                  }}
                >
                  {priorityBadge}
                </span>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  fontSize: 10,
                  lineHeight: '9px',
                }}
              >
                <CaretUpOutlined
                  style={{
                    color: isAsc ? '#1677FF' : '#bfbfbf',
                    transition: 'color 0.2s',
                  }}
                />
                <CaretDownOutlined
                  style={{
                    color: isDesc ? '#1677FF' : '#bfbfbf',
                    transition: 'color 0.2s',
                  }}
                />
              </span>
            </span>
          </div>
        </Tooltip>
      );
    },
    [sortList, toggleSort]
  );

  // 渲染多字段排序状态栏与一键清除按钮
  const renderSortBar = useCallback(
    (extraAction?: React.ReactNode) => {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '6px 12px',
            marginBottom: 10,
            background: isCustom ? '#e6f4ff' : '#fafafa',
            border: isCustom ? '1px solid #91caff' : '1px solid #f0f0f0',
            borderRadius: 6,
            transition: 'all 0.3s',
          }}
        >
          <Space size={8} wrap style={{ alignItems: 'center' }}>
            <span
              style={{
                fontSize: 13,
                color: isCustom ? '#0958d9' : '#595959',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <SwapOutlined style={{ color: isCustom ? '#1677FF' : '#8c8c8c' }} />
              <strong>组合排序状态：</strong>
            </span>
            {!isCustom ? (
              <Tag color="cyan" style={{ margin: 0, fontSize: 12 }}>
                默认排序：{defaultLabel} 倒序 ↓
              </Tag>
            ) : (
              sortList.map((item, idx) => (
                <React.Fragment key={item.field}>
                  {idx > 0 && <span style={{ color: '#8c8c8c', fontSize: 12 }}>→</span>}
                  <Tag
                    color="blue"
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      removeSort(item.field);
                    }}
                    style={{ margin: 0, fontSize: 12, padding: '1px 8px' }}
                  >
                    <span style={{ fontWeight: 600, marginRight: 2 }}>{CIRCLED_NUMBERS[idx] || `[${idx + 1}]`}</span>
                    {item.label} {item.order === 'ascend' ? '升序 ↑' : '降序 ↓'}
                  </Tag>
                </React.Fragment>
              ))
            )}
            <Tooltip title="点击表头标题可快速升序/降序切换，多个表头点击将按照先后顺序进行多级组合排序，点击清除按钮即可恢复默认。">
              <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 13 }} />
            </Tooltip>
          </Space>

          <Space size={8}>
            {extraAction}
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={resetSort}
              disabled={!isCustom}
              style={{
                borderColor: isCustom ? '#1677FF' : undefined,
                color: isCustom ? '#1677FF' : undefined,
              }}
            >
              一键清除排序
            </Button>
          </Space>
        </div>
      );
    },
    [isCustom, sortList, defaultLabel, removeSort, resetSort]
  );

  return {
    sortList,
    isCustom,
    toggleSort,
    removeSort,
    resetSort,
    getSortParams,
    renderSortHeader,
    renderSortBar,
  };
}
