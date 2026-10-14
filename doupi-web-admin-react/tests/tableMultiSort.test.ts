import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultSortItem,
  toggleSortState,
  removeSortState,
  buildOrderByClause,
} from '../src/utils/tableMultiSortCore.ts';

test('默认排序为印刷时间倒序', () => {
  const defaultItem = createDefaultSortItem();
  assert.equal(defaultItem.field, 'printTime');
  assert.equal(defaultItem.order, 'descend');
  assert.equal(defaultItem.dbColumn, 'r.print_time');

  const sql = buildOrderByClause([defaultItem]);
  assert.equal(sql, 'r.print_time desc, r.print_id desc');
});

test('点击默认字段印刷时间，反转为升序', () => {
  const defaultItem = createDefaultSortItem();
  const step1 = toggleSortState(
    [defaultItem],
    false,
    'printTime',
    '印刷时间',
    'r.print_time',
    'ascend',
    defaultItem
  );
  assert.equal(step1.nextIsCustom, true);
  assert.equal(step1.nextList.length, 1);
  assert.equal(step1.nextList[0].field, 'printTime');
  assert.equal(step1.nextList[0].order, 'ascend');

  const sql1 = buildOrderByClause(step1.nextList, defaultItem);
  assert.equal(sql1, 'r.print_time asc, r.print_id desc');

  // 再次点击印刷时间，切换回降序
  const step2 = toggleSortState(
    step1.nextList,
    true,
    'printTime',
    '印刷时间',
    'r.print_time',
    'ascend',
    defaultItem
  );
  assert.equal(step2.nextList[0].order, 'descend');

  // 第三次点击印刷时间，取消并恢复默认
  const step3 = toggleSortState(
    step2.nextList,
    true,
    'printTime',
    '印刷时间',
    'r.print_time',
    'ascend',
    defaultItem
  );
  assert.equal(step3.nextIsCustom, false);
  assert.equal(step3.nextList[0].field, 'printTime');
  assert.equal(step3.nextList[0].order, 'descend');
});

test('多字段组合排序：按用户选择的先后顺序排列优先级', () => {
  const defaultItem = createDefaultSortItem();

  // 1. 用户先点击“年级”升序
  const step1 = toggleSortState(
    [defaultItem],
    false,
    'grade',
    '年级',
    'grade',
    'ascend',
    defaultItem
  );
  assert.equal(step1.nextIsCustom, true);
  assert.equal(step1.nextList.length, 1);
  assert.equal(step1.nextList[0].field, 'grade');
  assert.equal(step1.nextList[0].order, 'ascend');

  // 2. 用户接着点击“总耗纸量”降序（作为第2优先级）
  const step2 = toggleSortState(
    step1.nextList,
    true,
    'totalPages',
    '总耗纸量',
    'r.total_pages',
    'descend',
    defaultItem
  );
  assert.equal(step2.nextList.length, 2);
  assert.equal(step2.nextList[0].field, 'grade');
  assert.equal(step2.nextList[1].field, 'totalPages');
  assert.equal(step2.nextList[1].order, 'descend');

  // 3. 用户接着点击“印刷时间”降序（作为第3优先级）
  const step3 = toggleSortState(
    step2.nextList,
    true,
    'printTime',
    '印刷时间',
    'r.print_time',
    'descend',
    defaultItem
  );
  assert.equal(step3.nextList.length, 3);
  assert.equal(step3.nextList[0].field, 'grade');
  assert.equal(step3.nextList[1].field, 'totalPages');
  assert.equal(step3.nextList[2].field, 'printTime');

  const sql = buildOrderByClause(step3.nextList, defaultItem);
  assert.equal(sql, 'grade asc, r.total_pages desc, r.print_time desc, r.print_id desc');

  // 4. 用户再次点击第1优先级的“年级”，切换为降序，其第1优先级位置保持不变
  const step4 = toggleSortState(
    step3.nextList,
    true,
    'grade',
    '年级',
    'grade',
    'ascend',
    defaultItem
  );
  assert.equal(step4.nextList.length, 3);
  assert.equal(step4.nextList[0].field, 'grade');
  assert.equal(step4.nextList[0].order, 'descend');
  assert.equal(step4.nextList[1].field, 'totalPages');
  assert.equal(step4.nextList[2].field, 'printTime');

  // 5. 移除“年级”后，“总耗纸量”晋升为第1优先级，“印刷时间”为第2优先级
  const step5 = removeSortState(step4.nextList, 'grade', defaultItem);
  assert.equal(step5.nextList.length, 2);
  assert.equal(step5.nextList[0].field, 'totalPages');
  assert.equal(step5.nextList[1].field, 'printTime');

  const sql5 = buildOrderByClause(step5.nextList, defaultItem);
  assert.equal(sql5, 'r.total_pages desc, r.print_time desc, r.print_id desc');

  // 6. 清除全部排序时，恢复默认印刷时间倒序
  const step6 = removeSortState([step5.nextList[0]], step5.nextList[0].field, defaultItem);
  assert.equal(step6.nextIsCustom, false);
  assert.equal(step6.nextList.length, 1);
  assert.equal(step6.nextList[0].field, 'printTime');
  assert.equal(step6.nextList[0].order, 'descend');
});
