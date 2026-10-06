const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../doupi-web-admin-react/src/pages');
const issues = [];

function checkFile(fullPath) {
  const content = fs.readFileSync(fullPath, 'utf8');
  // 查找 request={async (params) => { ... }}
  const regex = /request=\{async\s*\([^\)]*\)\s*=>\s*\{([\s\S]*?)\}\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const body = match[1];
    if (!body.includes('try') || !body.includes('catch')) {
      issues.push({
        file: path.relative(path.resolve(__dirname, '..'), fullPath),
        snippet: body.trim().slice(0, 150)
      });
    }
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.tsx')) checkFile(full);
  }
}

walk(srcDir);
console.log('未包含 try-catch 保护的 ProTable request 数量:', issues.length);
issues.forEach((it, idx) => {
  console.log(`[${idx + 1}] ${it.file}`);
});
