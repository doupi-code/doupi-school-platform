import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePrintFields,
  calculateFormalSheets,
  calculateTotalSheetsWithExtra,
  calculateSplitSheetsWithExtra,
  isLegacyExtraPaperRecord,
  formatExtraPaperLabel,
} from '../src/pages/edu/record/printRules.ts';

test('original paper defaults and conversion drive sides',()=>{
  assert.deepEqual(derivePrintFields({sourcePageCount:1,sourcePaperType:'A4'}),{paperType:'16K',pageCount:1,printSide:'1'});
  assert.deepEqual(derivePrintFields({sourcePageCount:6,sourcePaperType:'A4'}),{paperType:'8K',pageCount:3,printSide:'2'});
  assert.equal(derivePrintFields({}).pageCount,undefined);
  assert.equal(derivePrintFields({}).printSide,undefined);
});

test('paper toggles always start from original; chat range overrides full document',()=>{
  const t={sourcePageCount:10,sourcePaperType:'A4',pageCount:4};
  assert.equal(derivePrintFields(t,{paperType:'8K'},new Set(['paperType'])).pageCount,2);
  assert.equal(derivePrintFields(t,{paperType:'A4',pageCount:2},new Set(['paperType'])).pageCount,4);
});

test('explicit sides and manual fields survive automatic changes',()=>{
  assert.equal(derivePrintFields({sourcePageCount:6,printSide:'1'}).printSide,'1');
  assert.equal(derivePrintFields({sourcePageCount:1,printSide:'2'}).printSide,'2');
  const r=derivePrintFields({sourcePageCount:20,sourcePaperType:'A4'},{pageCount:7,printSide:'1',paperType:'A3'},new Set(['pageCount','printSide','paperType']));
  assert.deepEqual(r,{paperType:'A3',pageCount:7,printSide:'1'});
});

test('extra paper acceptance examples: 40 copies x 3 pages = 122 single-sided, 82 double-sided', () => {
  assert.equal(calculateFormalSheets(40, 3, '1'), 120);
  assert.equal(calculateTotalSheetsWithExtra(40, 3, '1'), 122);
  assert.equal(calculateFormalSheets(40, 3, '2'), 80);
  assert.equal(calculateTotalSheetsWithExtra(40, 3, '2'), 82);
});

test('exam and answer split adds 2 sheets to each record (total +4 sheets)', () => {
  const split = calculateSplitSheetsWithExtra(40, 3, '2', 2, 1, '1');
  assert.equal(split.examFormalSheets, 80);
  assert.equal(split.examSheets, 82);
  assert.equal(split.answerFormalSheets, 2);
  assert.equal(split.answerSheets, 4);
  assert.equal(split.totalSheets, 86);
});

test('legacy record 0+0 keeps old rule without retroactive deduction', () => {
  const legacyRecord = { templatePaperCount: 0, previewPaperCount: 0 };
  assert.equal(isLegacyExtraPaperRecord(legacyRecord), true);
  assert.equal(formatExtraPaperLabel(legacyRecord, false), '旧规则，未计入');
  assert.equal(calculateTotalSheetsWithExtra(40, 3, '1', 0, 0), 120);

  const newRecord = { templatePaperCount: 1, previewPaperCount: 1 };
  assert.equal(isLegacyExtraPaperRecord(newRecord), false);
  assert.equal(formatExtraPaperLabel(newRecord, false), '模板 1 张 + 预览 1 张');
});

