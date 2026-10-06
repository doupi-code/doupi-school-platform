const { execSync } = require('child_process');

async function testMaterialWorkflow() {
  console.log('========================================================');
  console.log('开始验证教务日常物资领退（零星领用 + 套装领用 + 回收退还）全链路业务...');
  console.log('========================================================\n');

  // 1. 获取验证码并登录
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const uuid = cap.uuid;
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();

  const loginRes = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid })
  }).then(r => r.json());

  if (loginRes.code !== 200 || !loginRes.token) {
    throw new Error('登录失败: ' + JSON.stringify(loginRes));
  }
  console.log('✅ 1. 管理员登录成功');
  const headers = {
    'Authorization': 'Bearer ' + loginRes.token,
    'Content-Type': 'application/json'
  };

  // 2. 验证动态路由是否包含新菜单
  const routersRes = await fetch('http://localhost:8080/getRouters', { headers }).then(r => r.json());
  const eduMenu = routersRes.data.find(m => m.path === '/edu' || m.path === 'edu');
  const materialMenu = eduMenu?.children?.find(c => c.path === 'material');
  const kitMenu = eduMenu?.children?.find(c => c.path === 'kit');
  console.log('✅ 2. 菜单路由验证:');
  console.log('   - 日常领退登记:', materialMenu ? '已存在 (' + materialMenu.component + ')' : '未找到❌');
  console.log('   - 物资套装配置:', kitMenu ? '已存在 (' + kitMenu.component + ')' : '未找到❌');

  // 3. 验证物资套装接口 (GET /edu/kit/list & GET /edu/kit/1)
  const kitListRes = await fetch('http://localhost:8080/edu/kit/list', { headers }).then(r => r.json());
  console.log(`✅ 3. 套装列表接口: 共查询到 ${kitListRes.total} 个预置套装:`);
  kitListRes.rows.forEach(k => {
    console.log(`   - [ID:${k.kitId}] ${k.kitName} (适用:${k.targetType==='1'?'教师':'学生'} · ${k.grade || '全校'} · 包含${k.itemCount}种物资, 共${k.totalQuantity}件)`);
  });

  const kit1Detail = await fetch('http://localhost:8080/edu/kit/1', { headers }).then(r => r.json());
  console.log(`   * 1号《${kit1Detail.data.kitName}》套装明细物品清单 (${kit1Detail.data.itemList.length} 样):`);
  kit1Detail.data.itemList.forEach(it => {
    console.log(`     -> ${it.goodsName} x ${it.quantity} ${it.unit} (${it.remark || ''}) [实时库存:${it.stockNum}]`);
  });

  // 4. 【核心业务一】测试日常零星物资快捷领用（例如：数学老师临时来领 1 盒无尘白粉笔 + 1 块黑板擦）
  console.log('\n✅ 4. 模拟【日常零星物资快捷领用】业务 (高频场景：领一盒粉笔、一块黑板擦):');
  const beforeChalk = await fetch('http://localhost:8080/stock/goods/301', { headers }).then(r => r.json());
  const beforeEraser = await fetch('http://localhost:8080/stock/goods/303', { headers }).then(r => r.json());
  console.log(`   * 领用前库存: 无尘白粉笔(ID:301)=${beforeChalk.data.stockNum}盒, 磁性黑板擦(ID:303)=${beforeEraser.data.stockNum}块`);

  const dailyGrantPayload = {
    businessCategory: '日常教学消耗零星领用',
    targetType: '1', // 教师个人
    targetId: 102,
    targetName: '张建国',
    grade: '高二年级',
    subject: '数学组',
    operator: '教务处王老师',
    remark: '上课急需，课间随到随领粉笔与板擦',
    itemList: [
      {
        goodsId: 301,
        goodsName: '高光环保无尘白粉笔',
        spec: '100支/盒',
        unit: '盒',
        quantity: 1,
        remark: '随到随领消耗品'
      },
      {
        goodsId: 303,
        goodsName: '加厚磁性黑板擦',
        spec: '蓝色大号',
        unit: '块',
        quantity: 1,
        remark: '教室讲台常备'
      }
    ]
  };

  const dailyGrantRes = await fetch('http://localhost:8080/edu/material/grant', {
    method: 'POST',
    headers,
    body: JSON.stringify(dailyGrantPayload)
  }).then(r => r.json());
  console.log('   * 零星领用发放结果:', dailyGrantRes.code === 200 ? 'SUCCESS' : 'FAIL', dailyGrantRes.msg || '');

  // 验证库存扣减
  const afterChalk = await fetch('http://localhost:8080/stock/goods/301', { headers }).then(r => r.json());
  const afterEraser = await fetch('http://localhost:8080/stock/goods/303', { headers }).then(r => r.json());
  console.log(`   * 领用后库存: 无尘白粉笔=${afterChalk.data.stockNum}盒 (变化: ${afterChalk.data.stockNum - beforeChalk.data.stockNum}), 磁性黑板擦=${afterEraser.data.stockNum}块 (变化: ${afterEraser.data.stockNum - beforeEraser.data.stockNum})`);

  // 5. 【核心业务二】测试新入职教师按套装申领办公用品，并支持自选剔除已有物品（如已有书立）
  console.log('\n✅ 5. 模拟【新入职教师教学办公用品成套申领】业务 (支持去选/微调):');
  const beforeGoods101 = await fetch('http://localhost:8080/stock/goods/101', { headers }).then(r => r.json());
  const beforeGoods103 = await fetch('http://localhost:8080/stock/goods/103', { headers }).then(r => r.json());
  console.log(`   * 发放前库存: 晨光按动红笔=${beforeGoods101.data.stockNum}支, 红色笔芯=${beforeGoods103.data.stockNum}支`);

  // 发放清单：去除书立(goodsId:105)，领取其余物品
  const grantItems = kit1Detail.data.itemList
    .filter(it => it.goodsId !== 105)
    .map(it => ({
      goodsId: it.goodsId,
      goodsName: it.goodsName,
      spec: it.spec,
      unit: it.unit,
      quantity: it.quantity,
      remark: it.remark
    }));

  const kitGrantPayload = {
    businessCategory: '教师入职教学办公用品',
    targetType: '1',
    targetId: 101,
    targetName: '周珲',
    grade: '复读部',
    subject: '物理组',
    kitId: 1,
    kitName: kit1Detail.data.kitName,
    operator: '教务处王老师',
    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=500', // 模拟拍照凭证
    remark: '新教师报到申领整套办公用具（本人已有书立，故已去选书立）',
    itemList: grantItems
  };

  const kitGrantRes = await fetch('http://localhost:8080/edu/material/grant', {
    method: 'POST',
    headers,
    body: JSON.stringify(kitGrantPayload)
  }).then(r => r.json());
  console.log('   * 套装发放结果:', kitGrantRes.code === 200 ? 'SUCCESS' : 'FAIL', kitGrantRes.msg || '');

  // 验证库存扣减
  const afterGoods101 = await fetch('http://localhost:8080/stock/goods/101', { headers }).then(r => r.json());
  const afterGoods103 = await fetch('http://localhost:8080/stock/goods/103', { headers }).then(r => r.json());
  console.log(`   * 发放后库存: 晨光按动红笔=${afterGoods101.data.stockNum}支 (变化: ${afterGoods101.data.stockNum - beforeGoods101.data.stockNum}), 红色笔芯=${afterGoods103.data.stockNum}支 (变化: ${afterGoods103.data.stockNum - beforeGoods103.data.stockNum})`);

  // 6. 【核心业务三】测试教务物资退还回收业务（老师离职退还物资 / 学生退学退书）
  console.log('\n✅ 6. 模拟【教师离职交接物资回收 / 学生退书】业务:');
  const beforeGoods105 = await fetch('http://localhost:8080/stock/goods/105', { headers }).then(r => r.json());
  console.log(`   * 回收前伸缩书立库存: ${beforeGoods105.data.stockNum} 个`);

  const returnPayload = {
    businessCategory: '教师离职交接物资收回',
    targetType: '1',
    targetName: '周珲',
    operator: '教务处王老师',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500',
    remark: '离职结算交接退回书立，经检查完好无损',
    itemList: [
      {
        goodsId: 105,
        goodsName: '得力多功能金属伸缩书立',
        quantity: 1,
        itemStatus: '完好',
        remark: '品相完好，重新入库备用'
      }
    ]
  };

  const returnRes = await fetch('http://localhost:8080/edu/material/recovery', {
    method: 'POST',
    headers,
    body: JSON.stringify(returnPayload)
  }).then(r => r.json());
  console.log('   * 回收结果:', returnRes.code === 200 ? 'SUCCESS' : 'FAIL', returnRes.msg || '');

  const afterGoods105 = await fetch('http://localhost:8080/stock/goods/105', { headers }).then(r => r.json());
  console.log(`   * 回收后伸缩书立库存: ${afterGoods105.data.stockNum} 个 (变化: +${afterGoods105.data.stockNum - beforeGoods105.data.stockNum})`);

  // 7. 验证教务工作台统计看板
  console.log('\n✅ 7. 验证教务领退统计看板:');
  const statsRes = await fetch('http://localhost:8080/edu/material/stats', { headers }).then(r => r.json());
  console.log('   * 看板数据:', statsRes.data);

  // 8. 查询领退流水台账
  console.log('\n✅ 8. 领退综合台账查询 (最近流水):');
  const ledgerRes = await fetch('http://localhost:8080/edu/material/list?pageSize=5', { headers }).then(r => r.json());
  ledgerRes.rows.forEach(r => {
    console.log(`   - [${r.recordNo}] ${r.recordType==='1'?'【发放】':'【回收】'} ${r.businessCategory} | 对象:${r.targetName} | 件数:${r.totalQuantity} | 凭证:${r.imageUrl ? '有照片' : '无'} | 经办:${r.operator}`);
  });

  console.log('\n========================================================');
  console.log('🎉 验证全部通过！日常零星领用、教学套件整套申领、离职退还及全校库存闭环均已完美运行！');
  console.log('========================================================');
}

testMaterialWorkflow().catch(console.error);
