const { execSync } = require('child_process');

async function test() {
  try {
    const capRes = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
    const uuid = capRes.uuid;
    const raw = execSync('docker exec redis7 redis-cli -a 123456 get captcha_codes:' + uuid).toString();
    const clean = raw.replace(/Warning[^\n]+\n/g, '').trim().replace(/"/g, '');
    console.log('Captcha code:', clean);
    
    const loginRes = await fetch('http://localhost:8080/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        code: clean,
        uuid: uuid
      })
    }).then(r => r.json());
    console.log('Login result:', loginRes.code, loginRes.msg);
    const token = loginRes.token;
    
    const screenRes = await fetch('http://localhost:8080/screen/data', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json());
    console.log('Screen code:', screenRes.code);
    console.log('Screen root keys:', screenRes.data ? Object.keys(screenRes.data) : null);
    if (screenRes.data) {
      console.log('Summary:', JSON.stringify(screenRes.data.summary, null, 2));
      console.log('Recruit keys:', Object.keys(screenRes.data.recruit || {}));
      console.log('Edu keys:', Object.keys(screenRes.data.edu || {}));
      console.log('Stock keys:', Object.keys(screenRes.data.stock || {}));
      console.log('Radar:', JSON.stringify(screenRes.data.radar, null, 2));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}
test();
