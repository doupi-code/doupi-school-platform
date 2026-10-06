const { execSync } = require('child_process');

async function main() {
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const uuid = cap.uuid;
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();
  console.log('UUID:', uuid, 'Captcha code:', code);

  // 1. admin 登录
  const loginRes = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid })
  }).then(r => r.json());
  console.log('Admin login code:', loginRes.code, loginRes.msg || 'OK');
  const token = loginRes.token;
  const headers = { 'Authorization': 'Bearer ' + token };

  // 2. 查询高复部班级
  const classRes = await fetch('http://localhost:8080/edu/class/list?pageSize=50', { headers }).then(r => r.json());
  const gaofuClasses = classRes.rows.filter(c => c.grade === '复读部');
  console.log('Class count in API:', classRes.total, 'Gaofu classes found:', gaofuClasses.length);
  gaofuClasses.slice(0, 3).forEach(c => console.log('  -> 班级:', c.classId, c.className, c.grade));

  // 3. 查询高复部教师
  const teacherRes = await fetch('http://localhost:8080/edu/teacher/list?pageSize=50', { headers }).then(r => r.json());
  const gaofuTeachers = teacherRes.rows.filter(t => t.grade === '复读部');
  console.log('Teacher count in API:', teacherRes.total, 'Gaofu teachers found:', gaofuTeachers.length);
  gaofuTeachers.slice(0, 3).forEach(t => console.log('  -> 教师:', t.teacherId, t.teacherName, t.subject, '任教班级ID:', t.classIds));

  // 4. 查询高复部系统用户
  const userRes = await fetch('http://localhost:8080/system/user/list?pageSize=50', { headers }).then(r => r.json());
  const gaofuUsers = userRes.rows.filter(u => u.grade === '复读部');
  console.log('User count in API:', userRes.total, 'Gaofu users found:', gaofuUsers.length);
  gaofuUsers.slice(0, 3).forEach(u => console.log('  -> 用户:', u.userId, '账号:' + u.userName, '姓名:' + u.nickName, '学科:' + u.subject));

  // 5. 测试用周珲的账号 zhouhui 登录
  const cap2 = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const rawCode2 = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + cap2.uuid).toString().trim();
  const code2 = rawCode2.replace(/\"/g, '').split('\n').pop().trim();
  const teaLogin = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'zhouhui', password: 'admin123', code: code2, uuid: cap2.uuid })
  }).then(r => r.json());
  console.log('Teacher zhouhui login:', teaLogin.code === 200 ? 'SUCCESS' : 'FAIL', teaLogin.msg || '');

  // 6. 验证周珲获取个人信息 /getInfo
  if (teaLogin.token) {
    const teaInfo = await fetch('http://localhost:8080/getInfo', {
      headers: { 'Authorization': 'Bearer ' + teaLogin.token }
    }).then(r => r.json());
    console.log('zhouhui user info: 姓名:', teaInfo.user.nickName, '角色:', teaInfo.roles, '学科:', teaInfo.user.subject);
  }
}

main().catch(console.error);
