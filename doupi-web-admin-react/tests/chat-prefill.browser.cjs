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
    else if(path==='/edu/teacher/list') body={code:200,rows:[{teacherId:5,teacherName:'测试教师',grade:'高三'}]};
    else if(path==='/edu/class/list') body={code:200,rows:[]};
    else if(path.endsWith('/goods/list')) body={code:200,rows:[{goodsId:7,goodsName:'A4纸',spec:'A4',stockNum:1000,conversionRate:500,remainSheets:0}]};
    else if(path==='/edu/record' && route.request().method()==='POST') {
      saves++; await new Promise(resolve=>setTimeout(resolve,250));
      body=saves===1?{code:500,msg:'测试保存失败'}:{code:200};
    } else if(path.startsWith('/edu/') || path.startsWith('/stock/') || path.startsWith('/system/')) body={code:200,rows:[],total:0,data:[]};
    if(body) return route.fulfill({json:body});
    return route.continue();
  });
  try {
    await page.goto((process.env.TEST_URL || 'http://127.0.0.1:5186')+'/admin/tests/chat-prefill.html');
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
    await dialog.locator('#pageCount').fill('1');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'1');
    await page.getByRole('dialog',{name:/新增印刷登记/}).locator('#pageCount').fill('4');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'2');
    await page.getByText('单面印',{exact:true}).click();
    await dialog.locator('#pageCount').fill('7');
    assert.equal(await dialog.locator('#printSide input:checked').inputValue(),'1');
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
    assert.deepEqual(errors,[]);
    console.log('PASS: HTML paste, full-day chat, unknown fields, per-task drafts, teacher propagation, failed-save retention, next-task save, preview cancel, delayed image isolation, failed file upload retention');
  } catch(error) { await page.screenshot({path:'../browser-failure.png',fullPage:true}); throw error; } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
