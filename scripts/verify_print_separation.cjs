const { execSync } = require('child_process');

async function verify() {
  console.log('================ 1. 验证后端 /getRouters 接口响应 ================');
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const uuid = cap.uuid;
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();

  const login = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid })
  }).then(r => r.json());

  if (!login.token) {
    throw new Error('登录失败：' + JSON.stringify(login));
  }

  const res = await fetch('http://localhost:8080/getRouters', {
    headers: { 'Authorization': 'Bearer ' + login.token }
  }).then(r => r.json());

  console.log('顶层路由总数:', res.data.length);

  // 1. 检查文印管理
  const printMenu = res.data.find(m => m.path === '/print' || m.path === 'print');
  if (!printMenu) {
    console.error('❌ 未找到「文印管理」一级菜单！');
    process.exit(1);
  }
  console.log('✅ 成功找到「文印管理」一级菜单:', printMenu.meta?.title, 'path=' + printMenu.path);
  console.log('   子菜单列表:');
  printMenu.children?.forEach(c => {
    console.log(`     - [${c.meta?.title}] path=${c.path} component=${c.component} icon=${c.meta?.icon}`);
  });

  // 2. 检查教务管理
  const eduMenu = res.data.find(m => m.path === '/edu' || m.path === 'edu');
  if (!eduMenu) {
    console.error('❌ 未找到「教务管理」一级菜单！');
    process.exit(1);
  }
  console.log('✅ 成功找到「教务管理」一级菜单:', eduMenu.meta?.title, 'path=' + eduMenu.path);
  console.log('   子菜单列表:');
  eduMenu.children?.forEach(c => {
    console.log(`     - [${c.meta?.title}] path=${c.path} component=${c.component} icon=${c.meta?.icon}`);
  });

  // 3. 校验教务管理是否已不包含文印相关菜单
  const hasPrintInEdu = eduMenu.children?.some(c => c.path === 'record' || c.path === 'printReport' || c.meta?.title?.includes('文印'));
  if (hasPrintInEdu) {
    console.error('❌ 教务管理中仍包含文印功能！');
    process.exit(1);
  }
  console.log('✅ 校验通过：教务管理中已完全剔除文印功能，文印与教务完全分离！');

  console.log('\n================ 2. 验证数据库状态 ================');
  const sql = `
    SELECT menu_id, menu_name, parent_id, order_num, path, component, icon 
    FROM sys_menu 
    WHERE menu_id IN (2000, 2400) 
       OR parent_id IN (2000, 2400) 
    ORDER BY parent_id, order_num;
  `;
  const dbResult = execSync(`docker exec -i mysql8 mysql -uroot -p123456 --default-character-set=utf8mb4 stuck-mg -e "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
  console.log(dbResult);

  console.log('================ 全部验证成功！ ================');
}

verify().catch(err => {
  console.error('验证过程发生异常:', err);
  process.exit(1);
});
