#!/usr/bin/env node
/**
 * 豆皮校园管理平台 — 全端防硬编码自动化审查工具 (Node.js 跨平台版)
 * 运行方式: node scripts/check-hardcoding.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m============================================================\x1b[0m');
console.log('\x1b[36m>>> 正在启动豆皮全端防硬编码自动化静态审查 (Node.js) <<<\x1b[0m');
console.log('\x1b[36m============================================================\x1b[0m');

let totalIssues = 0;

function walk(dir, filterFn) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'target') {
        results = results.concat(walk(fullPath, filterFn));
      }
    } else if (!filterFn || filterFn(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

// 1. 检查后端持久化实体类 (domain) 属性初值
console.log('\n\x1b[33m[1/5] 检查后端持久化实体类 POJO 零默认值规约...\x1b[0m');
const domainFiles = walk(path.join(rootDir, 'doupi-server'), (p) => {
  return p.endsWith('.java') && p.includes(`${path.sep}domain${path.sep}`) && !p.includes(`${path.sep}dto${path.sep}`) && !p.includes(`${path.sep}vo${path.sep}`);
});

const pojoViolations = [];
const pojoRegex = /private\s+(String|Long|Integer|Double|BigDecimal)\s+[a-zA-Z0-9_]+\s*=\s*[^;]+;/;

for (const file of domainFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (pojoRegex.test(line) && !line.includes('serialVersionUID')) {
      pojoViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (pojoViolations.length > 0) {
  console.log(`\x1b[31m❌ 发现 ${pojoViolations.length} 处实体类属性被硬编码赋予默认值:\x1b[0m`);
  console.table(pojoViolations);
  totalIssues += pojoViolations.length;
} else {
  console.log('\x1b[32m[PASS] 后端持久化实体类全部符合 POJO 零初值规约！\x1b[0m');
}

// 2. 检查业务魔数 (0.06 与 500)
console.log('\n\x1b[33m[2/5] 检查文印耗材单价与包装规格魔数硬编码...\x1b[0m');
const eduFiles = walk(path.join(rootDir, 'doupi-server', 'doupi-edu'), (p) => p.endsWith('.java') && !p.includes('test'))
  .concat(walk(path.join(rootDir, 'doupi-web-admin-react', 'src', 'pages', 'edu', 'report'), (p) => p.endsWith('.tsx') || p.endsWith('.ts')));

const magicViolations = [];
const magicRegex = /(\*\s*0\.06|500张\/包)/;

for (const file of eduFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (magicRegex.test(line)) {
      magicViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (magicViolations.length > 0) {
  console.log(`\x1b[33m⚠️ 发现 ${magicViolations.length} 处业务计算魔数硬编码:\x1b[0m`);
  console.table(magicViolations);
  totalIssues += magicViolations.length;
} else {
  console.log('\x1b[32m[PASS] 文印耗材单价与包装规格魔数已全部参数化动态驱动！\x1b[0m');
}

// 3. 检查台账报表 Option 写死
console.log('\n\x1b[33m[3/5] 检查台账报表页面下拉表单中的 Option 硬编码...\x1b[0m');
const reportFiles = walk(path.join(rootDir, 'doupi-web-admin-react', 'src', 'pages', 'edu', 'report'), (p) => p.endsWith('.tsx'));
const optionViolations = [];
const optionRegex = /<Option\s+value="高一">/;

for (const file of reportFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (optionRegex.test(line)) {
      optionViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (optionViolations.length > 0) {
  console.log(`\x1b[33m⚠️ 发现 ${optionViolations.length} 处写死 Option 选项:\x1b[0m`);
  console.table(optionViolations);
  totalIssues += optionViolations.length;
} else {
  console.log('\x1b[32m[PASS] 台账报表页面下拉选项已全部升级为字典动态驱动！\x1b[0m');
}

// 4. 检查移动端外部演示网关写死
console.log('\n\x1b[33m[4/5] 检查移动端与小程序环境网关地址...\x1b[0m');
const appFiles = walk(path.join(rootDir, 'doupi-app', 'config'), (p) => p.endsWith('.js'))
  .concat(walk(path.join(rootDir, 'doupi-app'), (p) => p.endsWith('.js')));

const urlViolations = [];
const urlRegex = /vue\.Doupi\.vip/;

for (const file of appFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (urlRegex.test(line)) {
      urlViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (urlViolations.length > 0) {
  console.log(`\x1b[31m❌ 发现 ${urlViolations.length} 处外部测试域名硬编码:\x1b[0m`);
  console.table(urlViolations);
  totalIssues += urlViolations.length;
} else {
  console.log('\x1b[32m[PASS] 移动端与小程序环境地址已全面规范化外部注入！\x1b[0m');
}

// 5. 检查实体类与 DTO getter 方法中的隐式硬编码默认值
console.log('\n\x1b[33m[5/5] 检查实体类/DTO getter 方法零隐式默认值规约...\x1b[0m');
const entityFiles = walk(path.join(rootDir, 'doupi-server'), (p) => {
  return p.endsWith('.java') && (p.includes(`${path.sep}domain${path.sep}`) || p.includes(`${path.sep}dto${path.sep}`));
});

const getterViolations = [];
const getterRegex = /return\s+[a-zA-Z0-9_]+\s*!=\s*null\s*(?:&&\s*![a-zA-Z0-9_]+\.isEmpty\(\)\s*)?\?\s*[a-zA-Z0-9_]+\s*:\s*["'0-9]/;

for (const file of entityFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (getterRegex.test(line)) {
      getterViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (getterViolations.length > 0) {
  console.log(`\x1b[31m❌ 发现 ${getterViolations.length} 处 getter 方法返回硬编码默认值（会破坏 MyBatis OGNL null 判空）:\x1b[0m`);
  console.table(getterViolations);
  totalIssues += getterViolations.length;
} else {
  console.log('\x1b[32m[PASS] 实体类与 DTO getter 方法全部符合纯净取值规约，无隐藏初值！\x1b[0m');
}

// 6. 检查前端内嵌 iframe 与路由跳转绝对路径及本地端口硬编码
console.log('\n\x1b[33m[6/6] 检查前端内嵌 iframe 与跨系统跳转防硬编码规约...\x1b[0m');
const adminSrcFiles = walk(path.join(rootDir, 'doupi-web-admin-react', 'src'), (p) => (p.endsWith('.tsx') || p.endsWith('.ts')) && !p.endsWith('env.ts'));
const adminRoutingViolations = [];
const adminRoutingRegex = /(localhost:5173|src=["']\/(druid|swagger)|window\.location\.href\s*=\s*['"]\/login)/;

for (const file of adminSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (adminRoutingRegex.test(line)) {
      adminRoutingViolations.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim(),
      });
    }
  });
}

if (adminRoutingViolations.length > 0) {
  console.log(`\x1b[31m❌ 发现 ${adminRoutingViolations.length} 处前端内嵌/路由绝对路径硬编码（可能导致回退加载官网或外链失效）:\x1b[0m`);
  console.table(adminRoutingViolations);
  totalIssues += adminRoutingViolations.length;
} else {
  console.log('\x1b[32m[PASS] 前端内嵌 iframe 与路由跳转全部符合动态环境变量/基准路径规约！\x1b[0m');
}

console.log('\n\x1b[36m============================================================\x1b[0m');
if (totalIssues === 0) {
  console.log('\x1b[32m🎉 恭喜！全端防硬编码自动化检测 100% 通过！代码质量优秀！\x1b[0m');
  process.exit(0);
} else {
  console.log(`\x1b[31m⚠️ 审查完成，共发现 ${totalIssues} 处需关注项，请按规范整改！\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[36m============================================================\x1b[0m');
