import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readChatClipboard, fileCandidates, attachFiles, messagesForDay, mergeSessions } from '../src/pages/edu/record/chatPrefill.ts';

test('mixed clipboard keeps text and files', () => {
  const file = new File(['a'], '练习.docx');
  const result = readChatClipboard({ files: [file], items: [], getData: (type: string) => type === 'text/plain' ? '洛卡\n打33份' : '' } as unknown as DataTransfer);
  assert.equal(result.text, '洛卡\n打33份'); assert.equal(result.files.length, 1);
});
test('file-only candidates keep missing fields empty even when upload fails', () => {
  const tasks = fileCandidates([new File(['a'], '练习.docx')], 'paste1');
  assert.equal(tasks.length, 1); assert.equal(tasks[0].printCount, undefined);
  assert.equal(tasks[0].pageCount, undefined); assert.equal(tasks[0].printSide, undefined);
});
test('ambiguous same-name attachments cannot overwrite tasks', () => {
  const tasks = [{taskId:'a', originalDocName:'同名.pdf'}, {taskId:'b', originalDocName:'同名.pdf'}];
  const result = attachFiles(tasks, [{name:'同名.pdf', url:'/a', status:'available'}]);
  assert.equal(result[0].attachment, undefined); assert.equal(result[1].attachmentStatus, 'ambiguous');
});
test('day panel includes unrelated messages on the same day', () => {
  const messages = [{id:'1',time:'2026年07月20日 7:49',text:'[文件] a.pdf'}, {id:'2',time:'2026年07月20日 8:00',text:'好的'}, {id:'3',time:'2026年07月21日 7:49',text:'下一天'}];
  assert.deepEqual(messagesForDay(messages, {timeSnippet:'2026年07月20日 7:49'}).map(m=>m.id), ['1','2']);
});
test('new paste appends candidates rather than replacing edits', () => {
  const result = mergeSessions({taskList:[{taskId:'old',printCount:33}], messages:[], rawText:'old'}, {taskList:[{taskId:'new'}],messages:[],rawText:'new'});
  assert.equal(result.taskList.length, 2); assert.equal(result.taskList[0].printCount, 33);
});
