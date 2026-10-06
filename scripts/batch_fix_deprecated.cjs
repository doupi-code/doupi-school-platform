const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../doupi-web-admin-react/src');

function walk(current) {
  const files = fs.readdirSync(current);
  for (const f of files) {
    const full = path.join(current, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      if (content.includes('destroyOnClose={false}')) {
        content = content.replace(/destroyOnClose=\{false\}/g, 'destroyOnHidden={false}');
        changed = true;
      }
      if (content.includes('destroyOnClose')) {
        content = content.replace(/\bdestroyOnClose\b/g, 'destroyOnHidden');
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(full, content, 'utf8');
        console.log('Updated:', path.relative(path.resolve(__dirname, '..'), full));
      }
    }
  }
}

walk(srcDir);
console.log('所有弃用 destroyOnClose 属性已批量规范为 destroyOnHidden。');
