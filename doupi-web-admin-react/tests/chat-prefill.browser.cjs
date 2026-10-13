// Run against a local Vite dev server. All API calls are mocked; never writes business data.
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const requireBrowser = process.env.PLAYWRIGHT_MODULE ? createRequire(process.env.PLAYWRIGHT_MODULE) : require;
const { chromium } = requireBrowser('playwright');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.TEST_BROWSER ? {executablePath:process.env.TEST_BROWSER} : {})});
  const page = await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  let saves=0;
  let releaseImage; const imageReady=new Promise(resolve=>{releaseImage=resolve;});
  const result = {
    messages:[
      {id:'m0',sender:'洛卡',time:'2026年07月20日 7:49',text:'[文件] 限时训练1.docx',type:'file'},
      {id:'m1',sender:'洛卡',time:'2026年07月20日 7:49',text:'帮忙打33份'},
      {id:'m2',sender:'文印员',time:'2026年07月20日 8:00',text:'当天无关聊天也需要展示'},
      {id:'m3',sender:'洛卡',time:'2026年07月20日 8:20',text:'[文件] 课表.xlsx',type:'file'},
      {id:'m4',sender:'洛卡',time:'2026年07月21日 9:00',text:'次日聊天不应混入当天'},
    ],
    taskList:[
      {taskId:'t0',sender:'洛卡',printName:'限时训练1',originalDocName:'限时训练1.docx',timeSnippet:'2026年07月20日 7:49',printCount:33,sourceMessageIds:['m0','m1'],fieldEvidence:{printCount:['m1']},reviewReasons:['页数未知','单双面未知']},
      {taskId:'t1',sender:'洛卡',printName:'课表',originalDocName:'课表.xlsx',timeSnippet:'2026年07月20日 8:20',sourceMessageIds:['m3'],reviewReasons:['份数未知']},
    ],
  };
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='127.0.0.1') return route.abort();
    const path=url.pathname.replace(/^\/api/,'');
    let body;
    if(path==='/edu/record/text-parse') body={code:200,data:{...result,rawText:route.request().postDataJSON().text}};
    else if(path==='/common/check-hash') {
      if(url.searchParams.get('extension')==='png') {await imageReady; body={code:200,found:true,url:'/mock-delayed.png'};}
      else body={code:200,found:false};
    }
    else if(path==='/common/upload') body={code:500,msg:'测试附件上传失败'};
    else if(path==='/edu/teacher/list') body={code:200,rows:[{teacherId:5,teacherName:'测试教师',grade:'高三'},{teacherId:6,teacherName:'二号张老师专任',grade:'高一'}]};
    else if(path==='/edu/class/list') body={code:200,rows:[]};
    else if(path.endsWith('/goods/list')) body={code:200,rows:[{goodsId:7,goodsName:'A4纸',spec:'A4',stockNum:1000,conversionRate:500,remainSheets:0}]};
    else if(path==='/edu/record/wechat-export/status') body={code:200,data:{c_1:1}};
    else if(path==='/edu/record/structured-parse') {
      const reqData = route.request().postDataJSON();
      const convs = reqData.conversations || [];
      const tasks = [];
      const msgs = [];
      for (const c of convs) {
        for (const m of (c.messages || [])) {
          const stableId = `${m.id}:${m.serverId || '1758000000'}`;
          msgs.push({
            id: stableId,
            sender: m.name || c.conversationName,
            time: m.datetime,
            text: m.type === '文件' ? `[文件] ${m.contentData?.title || ''}` : (m.content || ''),
            conversationId: c.conversationId,
          });
          if (m.type === '文件') {
            const relPath = `${c.folder}/${m.exportMediaUrl}`;
            const isMissing = Boolean(m.attachmentMissing);
            const isRegistered = String(m.id) === '20';
            tasks.push({
              taskId: `exp_${c.conversationId}_${m.id}`,
              sender: c.conversationName,
              printName: (m.contentData?.title || '未命名').replace(/\.[^.]+$/, ''),
              originalDocName: m.contentData?.title,
              timeSnippet: m.datetime,
              printCount: c.conversationId === 'c_1' ? 30 : 50,
              pageCount: 2,
              printSide: '1',
              sourceConversationId: c.conversationId,
              sourceMessageId: stableId,
              sourceMessageIds: [stableId],
              attachmentStatus: isMissing ? 'missing' : 'ready',
              attachmentRelativePath: relPath,
              exportMediaError: isMissing ? '本地未找到文件附件' : undefined,
              alreadyRegistered: isRegistered,
              existingPrintId: isRegistered ? 888 : undefined,
              existingRecordDesc: isRegistered ? '已登记（单据 #888）' : undefined,
              reviewReasons: isMissing ? ['附件缺失'] : [],
            });
          }
        }
      }
      body={code:200,data:{success:true,taskList:tasks,messages:msgs,firstUnregisteredIndex:0}};
    }
    else if(path==='/edu/record' && route.request().method()==='POST') {
      const payload = route.request().postDataJSON();
      lastSavedPayload = payload;
      saves++; await new Promise(resolve=>setTimeout(resolve,250));
      body=saves===1?{code:500,msg:'测试保存失败'}:{code:200};
    } else if(path==='/edu/record/batch' && route.request().method()==='POST') {
      const payload = route.request().postDataJSON();
      assert.equal(Array.isArray(payload), true);
      assert.equal(payload.length, 2);
      assert.equal(payload[0].templatePaperCount, 1);
      assert.equal(payload[0].previewPaperCount, 1);
      assert.equal(payload[1].templatePaperCount, 1);
      assert.equal(payload[1].previewPaperCount, 1);
      body={code:200};
    } else if(path.startsWith('/edu/') || path.startsWith('/stock/') || path.startsWith('/system/')) body={code:200,rows:[],total:0,data:[]};
    if(body) return route.fulfill({json:body});
    return route.continue();
  });
  let lastSavedPayload = null;
  try {
    await page.goto((process.env.TEST_URL || 'http://127.0.0.1:5186')+'/admin/tests/chat-prefill.html');
    // Verify WeChat export directory import modal opens and stays unloaded before folder selection
    await page.getByRole('button', { name: /导入微信导出目录/ }).click();
    const exportModal = page.getByRole('dialog', { name: /导入微信导出目录/ });
    await exportModal.waitFor();
    assert.ok((await exportModal.innerText()).includes('选择整个微信导出文件夹后，首先仅读取《导出清单.json》展示联系人'));
    await exportModal.locator('.ant-modal-close').click();

    await page.getByRole('button',{name:/粘贴微信聊天记录智能预填/}).click();
    const area=page.getByPlaceholder('粘贴多天聊天记录；也可粘贴文件，未知信息稍后手动填写');
    await area.evaluate(el=>{
      const cd=new DataTransfer(); cd.setData('text/html','<div>洛卡</div><div>2026年07月20日 7:49</div><div>帮忙打33份</div>');
      el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:cd,bubbles:true,cancelable:true}));
    });
    await page.getByRole('button',{name:'查看解析调试'}).click();
    const debug=page.getByRole('dialog',{name:'智能预填调试',exact:true});
    await debug.getByText('text/plain 原文',{exact:true}).waitFor();
    assert.ok((await debug.innerText()).includes('<div>洛卡</div>'));
    await debug.getByRole('tab',{name:'2. 实际送往后端的文字'}).click();
    assert.ok((await debug.innerText()).includes('帮忙打33份'));
    await debug.getByRole('tab',{name:'3. 后端识别的聊天记录'}).click();
    assert.ok((await debug.innerText()).includes('当天无关聊天也需要展示'));
    await debug.locator('.ant-modal-close').click();
    await page.getByRole('button',{name:'打开当前任务并逐条登记'}).click();
    const dialog=page.getByRole('dialog',{name:/新增印刷登记/}).filter({has:page.getByText('新增印刷登记（第 1/2 条）', {exact:true})});
    await dialog.waitFor();
    await page.setViewportSize({width:1440,height:760});
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="dialog"]')).some(el=>el.textContent.includes('新增印刷登记') && el.getBoundingClientRect().y<20));
    const modalBounds=await dialog.boundingBox();
    assert.ok(modalBounds.y < 20 && modalBounds.y+modalBounds.height<=760,JSON.stringify(modalBounds));
    assert.ok((await page.locator('aside').innerText()).includes('当天无关聊天也需要展示'));
    assert.ok(!(await page.locator('aside').innerText()).includes('次日聊天不应混入当天'));
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'33');
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').inputValue(),'');
    assert.equal(await dialog.locator('input[type=radio]:checked').count(),0);
    assert.equal(await page.locator('aside [data-current-message="true"]').count(),2);
    await page.locator('aside').getByRole('button',{name:'定位当前记录'}).click();
    assert.ok(!(await page.locator('aside').innerText()).includes('份数依据'));
    // Verify extra paper read-only badge
    assert.ok((await dialog.innerText()).includes('固定加: 模板1张+预览1张'));
    await dialog.locator('#pageCount').fill('1');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'1');
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').fill('4');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'2');
    await page.getByText('单面印',{exact:true}).click();
    await dialog.locator('#pageCount').fill('7');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'1');
    // Verify 40 copies × 3 pages calculation (122 single-sided, 82 double-sided)
    await dialog.locator('#printCount').fill('40');
    await dialog.locator('#pageCount').fill('3');
    await page.getByText('单面印',{exact:true}).click();
    assert.ok((await dialog.getByTestId('preview-total-sheets-value').innerText()).includes('122 张'));
    await page.getByText('双面印',{exact:true}).click();
    assert.ok((await dialog.getByTestId('preview-total-sheets-value').innerText()).includes('82 张'));
    await page.getByText('单面印',{exact:true}).click();
    await dialog.locator('#pageCount').fill('4');
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').fill('34');
    const imageRequest=page.waitForRequest(req=>req.url().includes('/common/check-hash') && req.url().includes('extension=png'));
    const imageField=page.locator('.ant-form-item').filter({has:page.getByText('印刷成品效果图留样',{exact:true})});
    await imageField.locator('input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('test')});
    await imageRequest;
    await dialog.getByRole('button',{name:/#2 课表/}).click();
    const imageResponse=page.waitForResponse(res=>res.url().includes('/common/check-hash') && res.url().includes('extension=png'));
    releaseImage(); await imageResponse;
    await page.waitForTimeout(100);
    assert.equal(await page.locator('img[src*="mock-delayed"]').count(),0);

    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'');
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').inputValue(),'');
    await page.getByRole('dialog',{name:/新增印刷登记/}).getByRole('button',{name:/#1 限时训练1/}).click();
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'34');
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').inputValue(),'4');
    // Preview selection must not change the active form when the preview is cancelled.
    await page.getByRole('button',{name:/微信群消息智能解析/}).click();
    const preview=page.getByRole('dialog',{name:'微信聊天记录智能预填',exact:true});
    await preview.getByRole('button',{name:/#2 课表/}).click();
    await preview.locator('.ant-modal-close').click();
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'34');
    assert.ok((await page.getByRole('dialog',{name:/新增印刷登记/}).innerText()).includes('第 1/2 条'));
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#teacherId').fill('测试教师');
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#teacherId').press('ArrowDown');
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#teacherId').press('Enter');
    await page.getByText('单面印',{exact:true}).click();
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#paperType').click(); await page.getByTitle('A4',{exact:true}).click();
    const save=page.getByRole('dialog',{name:/新增印刷登记/}).getByRole('button',{name:/确 定|确定/});
    await save.click();
    await page.getByText('测试保存失败',{exact:true}).first().waitFor();
    assert.equal(saves,1); assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'34');
    await save.click();
    await page.getByText('新增印刷登记（第 2/2 条）',{exact:true}).waitFor();
    assert.equal(saves,2);
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'');
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').inputValue(),'');
    if(process.env.TEST_SCREENSHOT) await page.screenshot({path:process.env.TEST_SCREENSHOT,fullPage:true});
    // File-only clipboard keeps a candidate even when its upload fails.
    await page.getByTestId('chat-register').evaluate(el=>{
      const cd=new DataTransfer(); cd.items.add(new File(['test'],'过期材料.docx',{type:'application/octet-stream'}));
      el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:cd,bubbles:true,cancelable:true}));
    });
    const filesPreview=page.getByRole('dialog',{name:'微信聊天记录智能预填',exact:true});
    await filesPreview.getByRole('button',{name:/#3 过期材料/}).click();
    await filesPreview.getByRole('button',{name:'打开当前任务并逐条登记'}).click();
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#printCount').inputValue(),'');
    assert.equal(await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').inputValue(),'');
    assert.ok((await page.locator('aside').innerText()).includes('日期暂未确定'));
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>'洛卡\n2026年07月20日 7:49\n帮忙打33份'}}));
    await page.getByTestId('chat-register').evaluate(el=>{
      const cd=new DataTransfer(); cd.items.add(new File(['test'],'限时训练1.docx'));
      el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:cd,bubbles:true,cancelable:true}));
    });
    await page.getByRole('dialog',{name:'微信聊天记录智能预填',exact:true}).getByRole('button',{name:/#4 限时训练1/}).waitFor();
    await page.getByRole('dialog',{name:'微信聊天记录智能预填',exact:true}).getByRole('button',{name:'查看解析调试'}).click();
    await debug.getByRole('tab',{name:'1. 粘贴收到的内容'}).click();
    assert.ok((await debug.innerText()).includes('事件文字 0 字符'));
    assert.ok((await debug.innerText()).includes('Clipboard.readText:'));
    await debug.getByRole('tab',{name:'2. 实际送往后端的文字'}).click();
    assert.ok((await debug.innerText()).includes('帮忙打33份'));
    // Reopen a session with source metadata and task-local answer instructions.
    result.taskList[0].sourcePageCount=6; result.taskList[0].sourcePaperType='A4';
    result.messages[1].text='帮忙打33份，最后一页是答案';
    result.taskList[1].sourceMessageIds=[];
    await page.reload();
    await page.getByRole('button',{name:/粘贴微信聊天记录智能预填/}).click();
    await page.getByPlaceholder('粘贴多天聊天记录；也可粘贴文件，未知信息稍后手动填写').fill('聊天规则回归');
    await page.getByRole('button',{name:'解析文字并加入候选'}).click();
    await page.getByRole('button',{name:'打开当前任务并逐条登记'}).click();
    const ruleDialog=page.getByRole('dialog',{name:/新增印刷登记/});
    assert.equal(await ruleDialog.locator('#pageCount').inputValue(),'3');
    assert.equal(await ruleDialog.locator('#printSide input:checked').inputValue(),'2');
    assert.equal(await ruleDialog.getByRole('checkbox',{name:/包含试卷与答案合并文件/}).isChecked(),true);
    // Verify split exam+answer preview adds +2 template +2 preview (+4 total)
    assert.ok((await ruleDialog.innerText()).includes('试卷/答案各加: 模板1+预览1(共+4张)'));
    await ruleDialog.locator('#paperType').click(); await page.getByTitle('A4',{exact:true}).click();
    assert.equal(await ruleDialog.locator('#pageCount').inputValue(),'6');
    await ruleDialog.locator('#paperType').click(); await page.getByTitle('8K',{exact:true}).click();
    assert.equal(await ruleDialog.locator('#pageCount').inputValue(),'3');
    await ruleDialog.locator('#pageCount').fill('7');
    await ruleDialog.locator('#paperType').click(); await page.getByTitle('A4',{exact:true}).click();
    assert.equal(await ruleDialog.locator('#pageCount').inputValue(),'7');
    await ruleDialog.getByRole('button',{name:/#2 课表/}).click();
    assert.ok((await page.locator('aside').innerText()).includes('当天无关聊天也需要展示'));
    assert.equal(await page.locator('aside [data-current-message="true"]').count(),0);
    assert.equal(await ruleDialog.getByRole('checkbox',{name:/包含试卷与答案合并文件/}).isChecked(),false);
    await ruleDialog.getByRole('button',{name:/#1 限时训练1/}).click();
    assert.equal(await ruleDialog.locator('#pageCount').inputValue(),'7');
    assert.equal(await ruleDialog.getByRole('checkbox',{name:/包含试卷与答案合并文件/}).isChecked(),true);

    // ============================================================================
    // E2E 回归验证：微信导出目录导入、跨同名联系人指定教师隔离、附件上传失败阻断保存与显式无附件放行、重印确认、批次隔离缓存
    // ============================================================================
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('open-wechat-export-modal').click();
    const expDialog = page.getByRole('dialog', { name: /导入微信导出目录/ });
    await expDialog.waitFor();

    // 模拟批次1：两个同名联系人“张老师”（c_1 和 c_2），各自包含附件
    await page.evaluate(() => {
      const dt = new DataTransfer();
      const addFile = (relPath, content, type = 'text/plain') => {
        const name = relPath.split('/').pop();
        const f = new File([content], name, { type });
        Object.defineProperty(f, 'webkitRelativePath', { value: relPath });
        dt.items.add(f);
      };
      addFile('全部聊天记录/导出清单.json', JSON.stringify({
        conversations: [
          { id: 'c_1', name: '张老师', folder: '001_张老师', messageCount: 2, status: '成功' },
          { id: 'c_2', name: '张老师', folder: '002_张老师_同名', messageCount: 2, status: '成功' },
        ],
      }), 'application/json');
      addFile('全部聊天记录/001_张老师/data/messages.js', `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          { id: 1, serverId: '1001', type: '文件', senderName: '张老师', datetime: '2026-09-16 09:00:00', contentData: { title: '卷A.pdf' }, exportMediaUrl: 'files/卷A.pdf' },
          { id: 2, serverId: '1002', type: '普通文本', senderName: '张老师', datetime: '2026-09-16 09:00:20', content: '印30份' },
        ],
      })};`);
      addFile('全部聊天记录/001_张老师/files/卷A.pdf', 'BATCH1_PDF_A', 'application/pdf');
      addFile('全部聊天记录/002_张老师_同名/data/messages.js', `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          { id: 10, serverId: '2001', type: '文件', senderName: '张老师', datetime: '2026-09-17 09:00:00', contentData: { title: '卷B.pdf' }, exportMediaUrl: 'files/卷B.pdf' },
          { id: 11, serverId: '2002', type: '普通文本', senderName: '张老师', datetime: '2026-09-17 09:00:20', content: '印50份' },
          { id: 20, serverId: '2003', type: '文件', senderName: '张老师', datetime: '2026-09-18 09:00:00', contentData: { title: '卷C.pdf' }, exportMediaUrl: 'files/卷C.pdf' },
        ],
      })};`);
      addFile('全部聊天记录/002_张老师_同名/files/卷B.pdf', 'BATCH1_PDF_B', 'application/pdf');
      addFile('全部聊天记录/002_张老师_同名/files/卷C.pdf', 'BATCH1_PDF_C', 'application/pdf');

      const input = document.querySelector('[data-testid="wechat-export-dir-input"]');
      Object.defineProperty(input, 'files', { configurable: true, value: dt.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expDialog.getByText('共 2 个会话 | 已勾选 0 个联系人').waitFor();
    await expDialog.getByText('已登记 (1条)', {exact:true}).waitFor();
    await expDialog.getByRole('button', { name: /全选当前筛选/ }).click();
    await expDialog.getByText('共 2 个会话 | 已勾选 2 个联系人').waitFor();
    await expDialog.getByTestId('start-wechat-recognize-btn').click();

    // 验证候选列表生成 3 条：#1 卷A (c_1)、#2 卷B (c_2 未登记) 与 #3 卷C (c_2 已登记 #888)
    await expDialog.getByRole('button', { name: /#1 卷A/ }).waitFor();
    await expDialog.getByRole('button', { name: /#2 卷B/ }).waitFor();
    await expDialog.getByText(/#3 卷C/).waitFor();

    // [P1 回归]：先打开 #1 卷A 使登记表单的 currentTaskIndex=0 (c_1)，再回到导出弹窗选中第二个联系人 c_2 的候选 #2 卷B 并指定教师
    await expDialog.getByRole('button', { name: /#1 卷A/ }).click();
    await expDialog.getByTestId('open-selected-candidate-btn').click();
    const regModal = page.getByRole('dialog', { name: /新增印刷登记/ });
    await regModal.waitFor();
    await regModal.getByRole('button', { name: '导入微信导出目录' }).click();
    await expDialog.waitFor();

    // 在导出弹窗点击第二个联系人的候选 #2 卷B，并指定“二号张老师专任”
    await expDialog.getByRole('button', { name: /#2 卷B/ }).click();
    const batchTeacherSelect = expDialog.locator('.ant-select').filter({ hasText: /为当前选中候选所属联系人统一指定申请教师/ });
    await batchTeacherSelect.click();
    await page.getByTitle('二号张老师专任', { exact: true }).click();

    // 验证：打开 #1 卷A 时，其申请教师绝未被修改为“二号张老师专任”（同名不同会话 ID 严格隔离）
    await expDialog.getByRole('button', { name: /#1 卷A/ }).click();
    await expDialog.getByTestId('open-selected-candidate-btn').click();
    await regModal.waitFor();
    assert.equal(await regModal.getByText('二号张老师专任').count(), 0, '第一个同名联系人(c_1)的候选不应被第二个联系人(c_2)的批量指定教师串改');

    // [P2 回归]：为 #1 卷A 填写必填项并点击确定；此时 /common/upload 返回 500，验证阻断保存、不扣库存、停留当前候选并展示无附件放行勾选项
    const savesBeforeUploadFail = saves;
    await regModal.locator('#teacherId').fill('测试教师');
    await regModal.locator('#teacherId').press('ArrowDown');
    await regModal.locator('#teacherId').press('Enter');
    await regModal.locator('#paperType').click();
    await page.getByTitle('A4', { exact: true }).click();
    await regModal.getByRole('button', { name: /确 定|确定/ }).click();

    await regModal.getByTestId('allow-save-without-attachment-checkbox').waitFor();
    assert.equal(saves, savesBeforeUploadFail, '匹配到本地导出附件但上传失败时，严禁直接调用保存接口或扣减库存');
    assert.ok((await regModal.innerText()).includes('第 1/3 条'), '上传失败后应停留在当前第 1 条候选');

    // 用户显式勾选“允许无附件直接登记此条记录”后再次点击确定，此时应允许保存并推进到第 2 条
    await regModal.getByTestId('allow-save-without-attachment-checkbox').click();
    await regModal.getByRole('button', { name: /确 定|确定/ }).click();
    await page.getByText('新增印刷登记（第 2/3 条）', { exact: true }).waitFor();
    assert.equal(saves, savesBeforeUploadFail + 1, '勾选允许无附件登记后应成功保存');

    // 验证第 2 条候选（c_2）此前在导出弹窗批量指定的教师“二号张老师专任”已准确生效
    assert.ok((await regModal.innerText()).includes('二号张老师专任'), '第二个联系人(c_2)的候选应准确保留其指定的教师');

    // 验证第 3 条已登记候选（#3 卷C，单据 #888）点击“选择重印”后解锁并携带 reprintConfirmed=true
    await regModal.getByRole('button', { name: '选择重印', exact: true }).click();
    await page.getByText('新增印刷登记（第 3/3 条）', { exact: true }).waitFor();
    await regModal.locator('#paperType').click();
    await page.getByTitle('A4', { exact: true }).click();
    await regModal.getByRole('button', { name: /确 定|确定/ }).click();
    await regModal.getByTestId('allow-save-without-attachment-checkbox').waitFor();
    await regModal.getByTestId('allow-save-without-attachment-checkbox').click();
    await regModal.getByRole('button', { name: /确 定|确定/ }).click();
    await page.waitForTimeout(350);
    assert.equal(lastSavedPayload?.reprintConfirmed, true, '点击选择重印后保存必须向后端传递 reprintConfirmed=true');
    // 关闭尚未完成的第2条登记弹窗以便进行第二次导入测试
    if (await regModal.isVisible()) {
      await regModal.locator('.ant-modal-close').click();
    }

    // [P2 回归]：第二次导入新目录，其中 001_张老师/files/卷A.pdf 在新目录中缺失，验证绝不命中第一次导入缓存的旧文件
    await page.getByTestId('open-wechat-export-modal').click();
    await expDialog.waitFor();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      const addFile = (relPath, content, type = 'text/plain') => {
        const name = relPath.split('/').pop();
        const f = new File([content], name, { type });
        Object.defineProperty(f, 'webkitRelativePath', { value: relPath });
        dt.items.add(f);
      };
      addFile('全部聊天记录2/导出清单.json', JSON.stringify({
        conversations: [
          { id: 'c_1', name: '张老师', folder: '001_张老师', messageCount: 2, status: '成功' },
        ],
      }), 'application/json');
      addFile('全部聊天记录2/001_张老师/data/messages.js', `window.__WECHAT_EXPORT__ = ${JSON.stringify({
        messages: [
          { id: 1, serverId: '1001', type: '文件', senderName: '张老师', datetime: '2026-09-16 09:00:00', contentData: { title: '卷A.pdf' }, exportMediaUrl: 'files/卷A.pdf' },
          { id: 2, serverId: '1002', type: '普通文本', senderName: '张老师', datetime: '2026-09-16 09:00:20', content: '印30份' },
        ],
      })};`);
      // 注意：故意不添加 001_张老师/files/卷A.pdf

      const input = document.querySelector('[data-testid="wechat-export-dir-input"]');
      Object.defineProperty(input, 'files', { configurable: true, value: dt.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expDialog.getByText('共 1 个会话 | 已勾选 1 个联系人').waitFor();
    await expDialog.getByTestId('start-wechat-recognize-btn').click();
    await expDialog.getByText('附件缺失').first().waitFor();

    assert.deepEqual(errors,[]);
    console.log('PASS: HTML paste, full-day chat, unknown fields, extra paper 122/82, split +4 paper, per-task drafts, teacher propagation by conversationId, upload-fail block & explicit override, reprintConfirmed, batch-isolated attachment cache');
  } catch(error) { await page.screenshot({path:'../browser-failure.png',fullPage:true}); throw error; } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

