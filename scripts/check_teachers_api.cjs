const { execSync } = require('child_process');

async function check() {
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + cap.uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();
  const loginRes = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid: cap.uuid })
  }).then(r => r.json());

  const res = await fetch('http://localhost:8080/edu/teacher/list?pageSize=50', {
    headers: { 'Authorization': 'Bearer ' + loginRes.token }
  }).then(r => r.json());

  console.log('Returned rows length:', res.rows.length);
  res.rows.forEach(r => {
    console.log(r.teacherId, JSON.stringify(r.teacherName), JSON.stringify(r.subject));
  });
}
check().catch(console.error);
