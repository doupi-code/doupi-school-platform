import {test} from 'node:test';
import assert from 'node:assert/strict';
import {derivePrintFields} from '../src/pages/edu/record/printRules.ts';
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
