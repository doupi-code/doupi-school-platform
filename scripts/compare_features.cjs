const fs = require('fs');

const pairs = [
  ['edu/report', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/edu/report/index.vue', 'doupi-web-admin-react/src/pages/edu/report/index.tsx'],
  ['edu/class', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/edu/class/index.vue', 'doupi-web-admin-react/src/pages/edu/class/index.tsx'],
  ['edu/teacher', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/edu/teacher/index.vue', 'doupi-web-admin-react/src/pages/edu/teacher/index.tsx'],
  ['stock/goods', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/stock/goods/index.vue', 'doupi-web-admin-react/src/pages/stock/goods/index.tsx'],
  ['stock/in', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/stock/in/index.vue', 'doupi-web-admin-react/src/pages/stock/in/index.tsx'],
  ['stock/out', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/stock/out/index.vue', 'doupi-web-admin-react/src/pages/stock/out/index.tsx'],
  ['stock/check', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/stock/check/index.vue', 'doupi-web-admin-react/src/pages/stock/check/index.tsx'],
  ['recruit/appointment', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/recruit/appointment/index.vue', 'doupi-web-admin-react/src/pages/recruit/appointment/index.tsx'],
  ['recruit/verify', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/recruit/verify/index.vue', 'doupi-web-admin-react/src/pages/recruit/verify/index.tsx'],
  ['recruit/binding', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/recruit/binding/index.vue', 'doupi-web-admin-react/src/pages/recruit/binding/index.tsx'],
  ['system/user', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/system/user/index.vue', 'doupi-web-admin-react/src/pages/system/user/index.tsx'],
  ['system/role', 'back/doupi-full-backup-20260930/doupi-web-admin/src/views/system/role/index.vue', 'doupi-web-admin-react/src/pages/system/role/index.tsx']
];

for (const [tag, vPath, tPath] of pairs) {
  if (!fs.existsSync(vPath) || !fs.existsSync(tPath)) continue;
  const v = fs.readFileSync(vPath, 'utf8');
  const t = fs.readFileSync(tPath, 'utf8');

  console.log(`\n=================== ${tag} ===================`);
  // 提取 Vue 中的 methods
  const methodRegex = /([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/g;
  let match;
  const methods = new Set();
  while ((match = methodRegex.exec(v)) !== null) {
    if (match[1].startsWith('handle') || match[1].startsWith('get') || match[1].startsWith('submit') || match[1].startsWith('open')) {
      methods.add(match[1]);
    }
  }

  // 检查在 React 中是否存在对应函数或字符串
  const missingInReact = [];
  const existingInReact = [];
  for (const m of methods) {
    if (t.includes(m)) {
      existingInReact.push(m);
    } else {
      missingInReact.push(m);
    }
  }
  console.log(`总方法数: ${methods.size}, 已存在: ${existingInReact.length}, 疑似缺失: ${missingInReact.length}`);
  if (missingInReact.length > 0) {
    console.log('缺失方法列表:', missingInReact.join(', '));
  }
}
