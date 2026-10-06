const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const scanDirs = [
  path.join(ROOT_DIR, 'doupi-web-admin-react', 'src'),
  path.join(ROOT_DIR, 'doupi-web-client-react', 'src'),
  path.join(ROOT_DIR, 'doupi-app'),
];

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.vue']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.idea', 'target'].includes(file)) {
        results = results.concat(getAllFiles(filePath, exts));
      }
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const suspiciousPatterns = [
  /mock/i,
  /fake/i,
  /useState\(\s*\[\s*\{[\s\S]*?\}\s*\]\)/,
  /const\s+(mock\w+|testData|demoData|sampleData)\s*=/i,
];

console.log('=== Scanning Frontend files for hardcoded static/mock data ===\n');

for (const dir of scanDirs) {
  const files = getAllFiles(dir);
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const rel = path.relative(ROOT_DIR, f);
    
    // 检查 mock 关键字
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/mock|demoData|fakeData|testData/i.test(line) && !line.includes('eslint') && !line.includes('mockjs')) {
        console.log(`[Keyword Found] ${rel}:${idx + 1} -> ${line.trim()}`);
      }
    });

    // 检查 useState 包含非空数组对象
    const useStateMatches = content.match(/useState\s*(?:<[^>]+>)?\s*\(\s*\[\s*\{[\s\S]*?\}\s*\]\s*\)/g);
    if (useStateMatches) {
      console.log(`[Hardcoded Array State] ${rel}: Found ${useStateMatches.length} occurrences`);
    }

    // 检查 useState 包含具体业务非零初始数字对象 (不包含单纯 0/false/'')
    const objMatches = content.match(/useState\s*(?:<[^>]+>)?\s*\(\s*\{[\s\S]*?\}\s*\)/g);
    if (objMatches) {
      for (const m of objMatches) {
        // 如果对象里面有大于 0 的数字，且不是单纯页码 pageSize: 10, current: 1
        const clean = m.replace(/pageSize\s*:\s*\d+/g, '').replace(/pageNum\s*:\s*\d+/g, '').replace(/page\s*:\s*\d+/g, '');
        if (/:\s*[1-9]\d{1,}/.test(clean)) {
          console.log(`[Hardcoded Object State with Numbers] ${rel}: ${m.substring(0, 100).replace(/\n/g, ' ')}...`);
        }
      }
    }
  }
}

console.log('\n=== Scanning Backend ServiceImpl for fake mock returns ===\n');
const backendFiles = getAllFiles(path.join(ROOT_DIR, 'doupi-server'), ['.java']);
for (const f of backendFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  const rel = path.relative(ROOT_DIR, f);
  if (content.includes('// mock') || content.includes('/* mock') || content.includes('new ArrayList<>()') && content.includes('.add(new ')) {
    // 检查是否在真实查询方法中写死数据
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/(mock|假数据|演示数据)/i.test(line)) {
        console.log(`[Backend Mock Keyword] ${rel}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }
}
