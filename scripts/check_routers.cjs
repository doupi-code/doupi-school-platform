const { execSync } = require('child_process');

async function test() {
  const cap = await fetch('http://localhost:8080/captchaImage').then(r => r.json());
  const uuid = cap.uuid;
  const rawCode = execSync('docker exec -i redis7 redis-cli -a 123456 get captcha_codes:' + uuid).toString().trim();
  const code = rawCode.replace(/\"/g, '').split('\n').pop().trim();

  const login = await fetch('http://localhost:8080/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', code, uuid })
  }).then(r => r.json());

  const r = await fetch('http://localhost:8080/getRouters', {
    headers: { 'Authorization': 'Bearer ' + login.token }
  }).then(r => r.json());

  console.log('Top-level routers count:', r.data.length);
  r.data.forEach(m => {
    console.log(`[Top] ${m.name} path=${m.path} title=${m.meta?.title}`);
    m.children?.forEach(c => {
      console.log(`   └─ ${c.name} path=${c.path} title=${c.meta?.title} comp=${c.component}`);
    });
  });
}

test().catch(console.error);
