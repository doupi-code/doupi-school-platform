import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadWechatExportManifest,
  applyRegisteredStatusToManifest,
  loadSavedContactSelection,
  saveContactSelection,
  filterManifestConversations,
  extractJsonFromMessagesJs,
  readSelectedConversationsMessages,
  type FileLike,
} from '../src/pages/edu/record/wechatExportImport.ts';
import { messagesForDay } from '../src/pages/edu/record/chatPrefill.ts';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

function makeMockFile(relativePath: string, content: string): FileLike {
  const name = relativePath.split('/').pop() || relativePath;
  return {
    name,
    webkitRelativePath: relativePath,
    size: Buffer.byteLength(content, 'utf8'),
    text: async () => content,
  };
}

test('contact selection memory: first time all unselected, saved selection restored, new contact default unselected, isolated by user', () => {
  const storage = createMemoryStorage();
  const initialIds = ['conv_1', 'conv_2', 'conv_3'];

  // 首次全部未选
  assert.deepEqual(loadSavedContactSelection('admin', initialIds, storage), []);

  // 保存勾选 conv_1, conv_3
  saveContactSelection('admin', ['conv_1', 'conv_3'], storage);
  assert.deepEqual(loadSavedContactSelection('admin', initialIds, storage), ['conv_1', 'conv_3']);

  // 下次导入新增了新联系人 conv_4，新联系人仍默认未选
  const nextIds = ['conv_1', 'conv_2', 'conv_3', 'conv_4'];
  assert.deepEqual(loadSavedContactSelection('admin', nextIds, storage), ['conv_1', 'conv_3']);

  // 不同系统用户之间互不干扰
  assert.deepEqual(loadSavedContactSelection('teacher_user', nextIds, storage), []);
});

test('manifest loading only reads 导出清单.json and does not read messages.js until requested', async () => {
  let messagesJsReadCount = 0;
  const manifestContent = JSON.stringify({
    exportTime: '2026-09-29 15:40:28',
    totalSelected: 3,
    conversations: [
      { id: 'c_1', name: '张老师', folder: '001_张老师', messageCount: 2, status: '成功' },
      { id: 'c_2', name: '张老师', folder: '002_张老师_同名', messageCount: 1, status: '成功' },
      { id: 'c_3', name: '空会话老师', folder: '003_空会话老师', messageCount: 0, status: '成功' },
    ],
  });

  const files: FileLike[] = [
    makeMockFile('全部聊天记录/导出清单.json', manifestContent),
    {
      name: 'messages.js',
      webkitRelativePath: '全部聊天记录/001_张老师/data/messages.js',
      text: async () => {
        messagesJsReadCount++;
        return `window.__WECHAT_EXPORT__ = ${JSON.stringify({
          conversation: { id: 'c_1', name: '张老师' },
          messages: [
            {
              id: 10,
              serverId: '1001',
              type: '文件',
              senderName: '张老师',
              isSender: 0,
              createTime: 1758000000,
              datetime: '2026-09-16 09:00:00',
              contentData: { type: 'file', title: '期中测试卷.docx' },
              exportMediaUrl: 'files/期中测试卷_a1.docx',
            },
            {
              id: 11,
              serverId: '1002',
              type: '普通文本',
              senderName: '张老师',
              isSender: 0,
              createTime: 1758000060,
              datetime: '2026-09-16 09:01:00',
              content: '印40份',
            },
          ],
        })};`;
      },
    },
    makeMockFile('全部聊天记录/001_张老师/files/期中测试卷_a1.docx', 'FILE_CONTENT_C1'),
    {
      name: 'messages.js',
      webkitRelativePath: '全部聊天记录/002_张老师_同名/data/messages.js',
      text: async () => {
        messagesJsReadCount++;
        return `window.__WECHAT_EXPORT__ = ${JSON.stringify({
          conversation: { id: 'c_2', name: '张老师' },
          messages: [
            {
              id: 10,
              serverId: '2001',
              type: '文件',
              senderName: '张老师',
              isSender: 0,
              createTime: 1758086400,
              datetime: '2026-09-17 10:00:00',
              contentData: { type: 'file', title: '期中测试卷.docx' },
              exportMediaUrl: 'files/期中测试卷_b2.docx',
            },
          ],
        })};`;
      },
    },
    makeMockFile('全部聊天记录/002_张老师_同名/files/期中测试卷_b2.docx', 'FILE_CONTENT_C2'),
  ];

  // 第一步：仅读取导出清单
  let session = await loadWechatExportManifest(files);
  assert.equal(session.conversations.length, 3);
  assert.equal(messagesJsReadCount, 0);

  // 合并已登记状态并筛选
  session = applyRegisteredStatusToManifest(session, { c_1: 2 });
  assert.equal(session.conversations[0].hasRegistered, true);
  assert.equal(session.conversations[0].registeredCount, 2);
  assert.equal(session.conversations[1].hasRegistered, false);

  const regFiltered = filterManifestConversations(session.conversations, { registeredFilter: 'registered' });
  assert.equal(regFiltered.length, 1);
  assert.equal(regFiltered[0].id, 'c_1');

  const nonEmptyFiltered = filterManifestConversations(session.conversations, { hideEmpty: true });
  assert.equal(nonEmptyFiltered.length, 2);

  // 第二步：仅读取选中会话 c_1 与 c_2，验证同名联系人、同名附件通过各自的 folder + exportMediaUrl 精确隔离
  const readRes = await readSelectedConversationsMessages(session, ['c_1', 'c_2']);
  assert.equal(messagesJsReadCount, 2);
  assert.equal(readRes.conversations.length, 2);

  const path1 = readRes.conversations[0].messages[0].attachmentRelativePath!;
  const path2 = readRes.conversations[1].messages[0].attachmentRelativePath!;
  assert.equal(path1, '001_张老师/files/期中测试卷_a1.docx');
  assert.equal(path2, '002_张老师_同名/files/期中测试卷_b2.docx');
  assert.notEqual(path1, path2);
  assert.equal(await readRes.attachmentFilesByPath.get(path1)!.text(), 'FILE_CONTENT_C1');
  assert.equal(await readRes.attachmentFilesByPath.get(path2)!.text(), 'FILE_CONTENT_C2');
});

test('date filtering, missing attachments, empty conversations, and damaged messages.js are handled safely', async () => {
  const manifestContent = JSON.stringify({
    conversations: [
      { id: 'c_date', name: '李老师', folder: '001_李老师', messageCount: 2, status: '成功' },
      { id: 'c_empty', name: '王老师', folder: '002_王老师', messageCount: 0, status: '成功' },
      { id: 'c_damaged', name: '损坏会话', folder: '003_损坏会话', messageCount: 5, status: '成功' },
    ],
  });

  const files: FileLike[] = [
    makeMockFile('export/导出清单.json', manifestContent),
    makeMockFile(
      'export/001_李老师/data/messages.js',
      `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          {
            id: 1,
            type: '文件',
            senderName: '李老师',
            datetime: '2026-09-10 08:00:00',
            contentData: { title: '旧练习.pdf' },
            exportMediaUrl: 'files/旧练习.pdf',
          },
          {
            id: 2,
            type: '文件',
            senderName: '李老师',
            datetime: '2026-09-20 08:00:00',
            contentData: { title: '缺失附件的试卷.docx' },
            exportMediaUrl: 'files/不存在的附件.docx',
          },
        ],
      })};`
    ),
    makeMockFile('export/001_李老师/files/旧练习.pdf', 'PDF_DATA'),
    makeMockFile('export/003_损坏会话/data/messages.js', 'window.__WECHAT_EXPORT__ = { broken json ;'),
  ];

  const session = await loadWechatExportManifest(files);
  const res = await readSelectedConversationsMessages(session, ['c_date', 'c_empty', 'c_damaged'], {
    startDate: '2026-09-15',
    endDate: '2026-09-25',
  });

  // 日期过滤后仅保留 2026-09-20 的消息，且标记缺失附件
  assert.equal(res.conversations.length, 1);
  assert.equal(res.conversations[0].messages.length, 1);
  assert.equal(res.conversations[0].messages[0].fileTitle, '缺失附件的试卷.docx');
  assert.equal(res.conversations[0].messages[0].attachmentMissing, true);

  // 空会话与损坏消息文件均被安全收集而不抛未捕获异常
  assert.equal(res.emptyConversations.length, 1);
  assert.equal(res.emptyConversations[0].conversationId, 'c_empty');
  assert.equal(res.damagedConversations.length, 1);
  assert.equal(res.damagedConversations[0].conversationId, 'c_damaged');
});

test('messagesForDay isolates same-day messages across different conversations', () => {
  const messages = [
    { id: 'm1', conversationId: 'conv_A', time: '2026-09-20 09:00:00', text: '[文件] 数学卷.docx' },
    { id: 'm2', conversationId: 'conv_A', time: '2026-09-20 09:01:00', text: '印40份' },
    { id: 'm3', conversationId: 'conv_B', time: '2026-09-20 09:02:00', text: '另一位老师同日聊天不应混入' },
  ];
  const dayMsgs = messagesForDay(messages, {
    sourceConversationId: 'conv_A',
    timeSnippet: '2026-09-20 09:00:00',
    sourceMessageIds: ['m1', 'm2'],
  });
  assert.deepEqual(
    dayMsgs.map((m) => m.id),
    ['m1', 'm2']
  );
});

test('real WeChat export directory read-only verification (790 conversations manifest + sample messages.js)', async (t) => {
  const realDir = 'C:\\Users\\javal\\Desktop\\weixin\\全部聊天记录';
  if (!fs.existsSync(realDir)) {
    t.skip('真实导出目录不存在，跳过只读验收测试');
    return;
  }
  const manifestPath = path.join(realDir, '导出清单.json');
  const rawManifest = fs.readFileSync(manifestPath, 'utf8');
  const parsedManifest = JSON.parse(rawManifest);
  assert.equal(parsedManifest.conversations.length, 790);

  // 构造只读 FileLike 列表验证 loadWechatExportManifest 与 readSelectedConversationsMessages
  const virtualFiles: FileLike[] = [
    {
      name: '导出清单.json',
      webkitRelativePath: '全部聊天记录/导出清单.json',
      text: async () => rawManifest,
    },
  ];

  // 采样一个有消息的真实会话（如“文件传输助手”）挂载到虚拟文件索引进行只读解析验证
  const sampleConv =
    parsedManifest.conversations.find((c: any) => c.name === '文件传输助手' && c.messageCount > 0) ||
    parsedManifest.conversations.find((c: any) => c.messageCount > 0);
  assert.ok(sampleConv, '应至少存在一个非空会话');
  const sampleMsgJsPath = path.join(realDir, sampleConv.folder, 'data', 'messages.js');
  assert.ok(fs.existsSync(sampleMsgJsPath), `消息文件应存在: ${sampleMsgJsPath}`);
  virtualFiles.push({
    name: 'messages.js',
    webkitRelativePath: `全部聊天记录/${sampleConv.folder}/data/messages.js`,
    text: async () => fs.readFileSync(sampleMsgJsPath, 'utf8'),
  });

  const session = await loadWechatExportManifest(virtualFiles);
  assert.equal(session.conversations.length, 790);

  const readSample = await readSelectedConversationsMessages(session, [sampleConv.id]);
  assert.equal(readSample.damagedConversations.length, 0);
  assert.ok(readSample.totalMessagesRead > 0);
  // 验证安全提取 JSON 正常运作
  const sampleJs = extractJsonFromMessagesJs(fs.readFileSync(sampleMsgJsPath, 'utf8'));
  assert.ok(sampleJs.startsWith('{') && sampleJs.endsWith('}'));
});

test('date-filtered message reading preserves originalIndex-based fallback IDs and isolates attachment maps across batches', async () => {
  const manifestContent = JSON.stringify({
    conversations: [{ id: 'c_batch', name: '陈老师', folder: '001_陈老师', messageCount: 2, status: '成功' }],
  });

  // 批次1：包含附件 files/卷A.pdf（内容 BATCH_1_PDF）
  const batch1Files: FileLike[] = [
    makeMockFile('export1/导出清单.json', manifestContent),
    makeMockFile(
      'export1/001_陈老师/data/messages.js',
      `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          {
            type: '普通文本',
            senderName: '陈老师',
            datetime: '2026-09-01 09:00:00',
            content: '前一天消息（无显式id）',
          },
          {
            type: '文件',
            senderName: '陈老师',
            datetime: '2026-09-02 09:00:00',
            contentData: { title: '卷A.pdf' },
            exportMediaUrl: 'files/卷A.pdf',
          },
        ],
      })};`
    ),
    makeMockFile('export1/001_陈老师/files/卷A.pdf', 'BATCH_1_PDF'),
  ];

  // 批次2：同名路径但附件缺失，验证不会串用批次1缓存
  const batch2FilesMissingAttachment: FileLike[] = [
    makeMockFile('export2/导出清单.json', manifestContent),
    makeMockFile(
      'export2/001_陈老师/data/messages.js',
      `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          {
            type: '普通文本',
            senderName: '陈老师',
            datetime: '2026-09-01 09:00:00',
            content: '前一天消息（无显式id）',
          },
          {
            type: '文件',
            senderName: '陈老师',
            datetime: '2026-09-02 09:00:00',
            contentData: { title: '卷A.pdf' },
            exportMediaUrl: 'files/卷A.pdf',
          },
        ],
      })};`
    ),
  ];

  const session1 = await loadWechatExportManifest(batch1Files);
  // 单日过滤（仅 2026-09-02）与全量读取生成的 fallback id 应保持一致（idx-2）
  const singleDayRes = await readSelectedConversationsMessages(session1, ['c_batch'], {
    startDate: '2026-09-02',
    endDate: '2026-09-02',
  });
  const fullRes = await readSelectedConversationsMessages(session1, ['c_batch']);
  assert.equal(singleDayRes.conversations[0].messages[0].id, 'idx-2');
  assert.equal(fullRes.conversations[0].messages[1].id, 'idx-2');
  assert.equal(singleDayRes.attachmentFilesByPath.has('001_陈老师/files/卷A.pdf'), true);

  const session2 = await loadWechatExportManifest(batch2FilesMissingAttachment);
  const res2 = await readSelectedConversationsMessages(session2, ['c_batch']);
  assert.equal(res2.conversations[0].messages[1].attachmentMissing, true);
  assert.equal(res2.attachmentFilesByPath.has('001_陈老师/files/卷A.pdf'), false);
});



test('business filters use explicit account types, preserve unknown contacts, and can show all', async () => {
  const session = await loadWechatExportManifest([makeMockFile('root/导出清单.json', JSON.stringify({conversations:[
    {id:'teacher', name:'某企业小学张老师', type:'user', messageCount:10},
    {id:'official', name:'公众号', type:'official', messageCount:10},
    {id:'enterprise', name:'企业号', accountType:'enterprise', messageCount:10},
    {id:'group', name:'教师群', type:'group', messageCount:10},
  ]}))]);
  assert.deepEqual(filterManifestConversations(session.conversations, {hideBusiness:true}).map(c=>c.id), ['teacher','group']);
  assert.equal(filterManifestConversations(session.conversations, {hideBusiness:false}).length, 4);
  assert.deepEqual(filterManifestConversations(session.conversations, {hideBusiness:true, selectedIds:['teacher','official']}).map(c=>c.id), ['teacher']);
});

test('optional contact classification metadata matches IDs, never matching duplicate names', async () => {
  const session = await loadWechatExportManifest([
    makeMockFile('root/导出清单.json', JSON.stringify({conversations:[{id:'a',name:'同名',type:'user'},{id:'b',name:'同名',type:'user'}]})),
    makeMockFile('root/联系人分类.json', JSON.stringify({version:1, accounts:{a:'official'}})),
  ]);
  assert.deepEqual(filterManifestConversations(session.conversations, {hideBusiness:true}).map(c=>c.id), ['b']);
});
