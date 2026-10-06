const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../doupi-web-admin-react/src/pages');

function protectFile(fullPath) {
  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  let pos = 0;
  while (true) {
    const marker = 'request={async ';
    const idx = content.indexOf(marker, pos);
    if (idx === -1) break;

    // 寻找花括号开始
    const braceStart = content.indexOf('{', idx + marker.length);
    if (braceStart === -1) {
      pos = idx + marker.length;
      continue;
    }

    // 寻找匹配的花括号结束
    let depth = 1;
    let i = braceStart + 1;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }

    if (depth === 0) {
      const body = content.slice(braceStart + 1, i - 1);
      // 如果没有 try-catch
      if (!body.includes('try {') && !body.includes('try{')) {
        const protectedBody = `
          try {
            ${body.trim()}
          } catch (error) {
            console.error('加载表格数据失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        `;
        content = content.slice(0, braceStart + 1) + protectedBody + content.slice(i - 1);
        pos = braceStart + protectedBody.length;
      } else {
        pos = i;
      }
    } else {
      pos = idx + marker.length;
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Protected:', path.relative(path.resolve(__dirname, '..'), fullPath));
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.tsx')) protectFile(full);
  }
}

walk(srcDir);
console.log('深度花括号平衡保护完成。');
