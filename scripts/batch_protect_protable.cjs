const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../doupi-web-admin-react/src/pages');

function processFile(fullPath) {
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // 正则匹配没有 try-catch 的 request 属性
  // 形如：request={async (params) => {\n  const res: any = await ...\n  return ...;\n}}
  const regex = /request=\{async\s*\(([^\)]*)\)\s*=>\s*\{([^{}]*?await\s+[^{}]*?return\s+\{[^{}]*?\}\s*;?\s*)\}\}/g;

  content = content.replace(regex, (match, paramName, innerBody) => {
    if (innerBody.includes('try') || innerBody.includes('catch')) {
      return match;
    }
    changed = true;
    return `request={async (${paramName}) => {
          try {${innerBody}
          } catch (error) {
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}`;
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Protected ProTable request in:', path.relative(path.resolve(__dirname, '..'), fullPath));
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.tsx')) processFile(full);
  }
}

walk(srcDir);
console.log('ProTable request 容错与安全增强完成。');
