const { execSync } = require('child_process');

async function fix() {
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + cap.uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();
  const loginRes = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid: cap.uuid })
  }).then(r => r.json());

  const data = [
    { classId: 1, headTeacherId: 1001, headTeacher: '张文博' },
    { classId: 2, headTeacherId: 1002, headTeacher: '李美玲' },
    { classId: 4, headTeacherId: 1003, headTeacher: '王海峰' },
    { classId: 101, headTeacherId: 102, headTeacher: '周珲' },
    { classId: 102, headTeacherId: 112, headTeacher: '李寄宁' },
    { classId: 103, headTeacherId: 110, headTeacher: '赵前利' },
    { classId: 104, headTeacherId: 117, headTeacher: '郭强' },
    { classId: 105, headTeacherId: 111, headTeacher: '陈新佳' },
    { classId: 106, headTeacherId: 121, headTeacher: '李炜' },
    { classId: 107, headTeacherId: 129, headTeacher: '苑运霞' },
    { classId: 108, headTeacherId: 101, headTeacher: '王贤武' },
    { classId: 109, headTeacherId: 132, headTeacher: '谭伟生' }
  ];

  for (const item of data) {
    const res = await fetch('http://localhost:8080/edu/class', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + loginRes.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    }).then(r => r.json());
    console.log('Update', item.classId, item.headTeacher, res.msg);
  }
}

fix().catch(console.error);
