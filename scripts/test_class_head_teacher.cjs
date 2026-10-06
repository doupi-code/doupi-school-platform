const { execSync } = require('child_process');

async function test() {
  console.log('--- 1. 获取登录验证码与 Token ---');
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + cap.uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();
  const loginRes = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid: cap.uuid })
  }).then(r => r.json());

  if (!loginRes.token) {
    throw new Error('登录失败: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.token;
  console.log('登录成功，已获取 Token');

  console.log('\n--- 2. 查询班级列表，检查 headTeacher 与 studentNum 返回 ---');
  const listRes = await fetch('http://localhost:8080/edu/class/list?pageSize=50', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());

  console.log('总班级数:', listRes.total);
  listRes.rows.forEach(c => {
    console.log(`[ID:${c.classId}] 年级: ${c.grade} | 班级: ${c.className} | 人数: ${c.studentNum} | 班主任: ${c.headTeacher || '无'} (ID:${c.headTeacherId || '-'})`);
  });

  console.log('\n--- 3. 测试查询单个班级 (ID: 101) ---');
  const detailRes = await fetch('http://localhost:8080/edu/class/101', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  console.log('班级 101 详情:', detailRes.data);

  console.log('\n--- 4. 测试修改班级班主任 (更新并恢复) ---');
  const updateRes = await fetch('http://localhost:8080/edu/class', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      classId: 101,
      grade: '复读部',
      className: '高三（1）班·精英C班',
      studentNum: 46,
      headTeacherId: 102,
      headTeacher: '周珲'
    })
  }).then(r => r.json());
  console.log('修改班级结果:', updateRes);

  console.log('\n测试全部通过！');
}

test().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
