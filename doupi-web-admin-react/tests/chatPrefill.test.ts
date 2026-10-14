import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverChatClipboard, attachmentNameMatches } from '../src/pages/edu/record/chatPrefill.ts';
import { readChatClipboard, fileCandidates, attachFiles, messagesForDay, mergeSessions } from '../src/pages/edu/record/chatPrefill.ts';
if (typeof (globalThis as any).File === 'undefined') {
  (globalThis as any).File = class File {
    name: string;
    size: number;
    type: string;
    constructor(parts: any[], name: string, options: any = {}) {
      this.name = name;
      this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? p.length : 0), 0);
      this.type = options.type || '';
    }
  };
}

test('mixed clipboard keeps text and files', () => {
  const file = new File(['a'], '练习.docx');
  const result = readChatClipboard({ files: [file], items: [], getData: (type: string) => type === 'text/plain' ? '洛卡\n打33份' : '' } as unknown as DataTransfer);
  assert.equal(result.text, '洛卡\n打33份'); assert.equal(result.files.length, 1);
});
test('Windows file paste recovers text through Clipboard API when event omits it', async () => {
  const file = new File(['a'], '练习.docx');
  const result = await recoverChatClipboard({text:'', files:[file]}, {readText:async ()=>'洛卡\n2026年09月24日 15:01\n帮我印13份'});
  assert.match(result.text, /印13份/); assert.equal(result.files[0], file);
});
test('clipboard denial preserves files and event text never reads unrelated clipboard', async () => {
  const file = new File(['a'], '练习.docx');
  const denied = await recoverChatClipboard({text:'',files:[file]}, {readText:async()=>{throw new Error('denied');}});
  assert.equal(denied.files.length,1); assert.equal(denied.text,'');
  const existing = await recoverChatClipboard({text:'聊天原文',files:[file]}, {readText:async()=>{throw new Error('must not read');}});
  assert.equal(existing.text,'聊天原文');
});
test('file-only candidates keep missing fields empty even when upload fails', () => {
  const tasks = fileCandidates([new File(['a'], '练习.docx')], 'paste1');
  assert.equal(tasks.length, 1); assert.equal(tasks[0].printCount, undefined);
  assert.equal(tasks[0].pageCount, undefined); assert.equal(tasks[0].printSide, undefined);
});
test('repeating tasks in multi-day batches associate the unique matched attachment', () => {
  const tasks = [{taskId:'a', originalDocName:'比大小学生版.docx'}, {taskId:'b', originalDocName:'比大小学生版.docx'}];
  const result = attachFiles(tasks, [{name:'比大小学生版.docx', url:'/files/1.docx', status:'available'}]);
  assert.equal(result[0].attachment, '/files/1.docx');
  assert.equal(result[0].attachmentStatus, 'available');
  assert.equal(result[1].attachment, '/files/1.docx');
  assert.equal(result[1].attachmentStatus, 'available');
});
test('multiple conflicting attachments without exact match are marked ambiguous', () => {
  const tasks = [{taskId:'a', originalDocName:'2026综合模拟测试卷'}];
  const result = attachFiles(tasks, [
    {name:'2026综合模拟测试卷A.docx', url:'/a', status:'available'},
    {name:'2026综合模拟测试卷B.docx', url:'/b', status:'available'},
  ]);
  assert.equal(result[0].attachment, undefined);
  assert.equal(result[0].attachmentStatus, 'ambiguous');
});
test('day panel includes unrelated messages on the same day', () => {
  const messages = [{id:'1',time:'2026年07月20日 7:49',text:'[文件] a.pdf'}, {id:'2',time:'2026年07月20日 8:00',text:'好的'}, {id:'3',time:'2026年07月21日 7:49',text:'下一天'}];
  assert.deepEqual(messagesForDay(messages, {timeSnippet:'2026年07月20日 7:49'}).map(m=>m.id), ['1','2']);
});
test('new paste appends candidates rather than replacing edits', () => {
  const result = mergeSessions({taskList:[{taskId:'old',printCount:33}], messages:[], rawText:'old'}, {taskList:[{taskId:'new'}],messages:[],rawText:'new'});
  assert.equal(result.taskList.length, 2); assert.equal(result.taskList[0].printCount, 33);
});

test('attachmentNameMatches handles WeChat ellipsis truncation and omitted extensions', () => {
  // 微信长文件名截断为 ... 或 …
  assert.ok(attachmentNameMatches('数学卷-2610高三强基联盟10月月考.docx', '数学卷-2610高三强基联盟...'));
  assert.ok(attachmentNameMatches('杭州二中2027届高三上学期10月月考数学试题.pdf', '杭州二中2027届高三上学期10月月考数学试题…'));
  // 聊天文字中省略扩展名
  assert.ok(attachmentNameMatches('数学试题及参考答案.docx', '数学试题及参考答案'));
  assert.ok(attachmentNameMatches('数学(4).docx', '数学(4)'));
  // attachFiles 成功关联
  const tasks = [{ taskId: 't1', originalDocName: '数学卷-2610高三强基联盟...' }];
  const attached = attachFiles(tasks, [{ name: '数学卷-2610高三强基联盟10月月考.docx', url: '/files/math.docx', status: 'available' }]);
  assert.equal(attached[0].attachment, '/files/math.docx');
  assert.equal(attached[0].attachmentStatus, 'available');
});

