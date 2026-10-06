const fs = require('fs');
const path = require('path');

const vueViewsDir = path.resolve('back/doupi-full-backup-20260930/doupi-web-admin/src/views');
const reactPagesDir = path.resolve('doupi-web-admin-react/src/pages');

// 重点对比的业务模块
const modules = [
  { name: '印刷登记 (edu/record)', vue: 'edu/record/index.vue', react: 'edu/record/index.tsx' },
  { name: '教职工档案 (edu/teacher)', vue: 'edu/teacher/index.vue', react: 'edu/teacher/index.tsx' },
  { name: '班级管理 (edu/class)', vue: 'edu/class/index.vue', react: 'edu/class/index.tsx' },
  { name: '文印统计报表 (edu/report)', vue: 'edu/report/index.vue', react: 'edu/report/index.tsx' },
  { name: '耗材物品管理 (stock/goods)', vue: 'stock/goods/index.vue', react: 'stock/goods/index.tsx' },
  { name: '采购入库管理 (stock/in)', vue: 'stock/in/index.vue', react: 'stock/in/index.tsx' },
  { name: '入库单明细 (stock/inItem)', vue: 'stock/inItem/index.vue', react: 'stock/inItem/index.tsx' },
  { name: '领用出库管理 (stock/out)', vue: 'stock/out/index.vue', react: 'stock/out/index.tsx' },
  { name: '出库单明细 (stock/outItem)', vue: 'stock/outItem/index.vue', react: 'stock/outItem/index.tsx' },
  { name: '库存盘点管理 (stock/check)', vue: 'stock/check/index.vue', react: 'stock/check/index.tsx' },
  { name: '供应商档案 (stock/supplier)', vue: 'stock/supplier/index.vue', react: 'stock/supplier/index.tsx' },
  { name: '出入库明细报表 (stock/report/detail)', vue: 'stock/report/detail/index.vue', react: 'stock/report/detail.tsx' },
  { name: '月度统计报表 (stock/report/monthly)', vue: 'stock/report/monthly/index.vue', react: 'stock/report/monthly.tsx' },
  { name: '访校预约管理 (recruit/appointment)', vue: 'recruit/appointment/index.vue', react: 'recruit/appointment/index.tsx' },
  { name: '现场接待核销 (recruit/verify)', vue: 'recruit/verify/index.vue', react: 'recruit/verify/index.tsx' },
  { name: '招生教师绑定 (recruit/binding)', vue: 'recruit/binding/index.vue', react: 'recruit/binding/index.tsx' },
  { name: '校区信息管理 (recruit/campus)', vue: 'recruit/campus/index.vue', react: 'recruit/campus/index.tsx' },
  { name: '分班招生配置 (recruit/config)', vue: 'recruit/config/index.vue', react: 'recruit/config/index.tsx' },
  { name: '招生数据看板 (recruit/dashboard)', vue: 'recruit/dashboard/index.vue', react: 'recruit/dashboard/index.tsx' },
  { name: '用户管理 (system/user)', vue: 'system/user/index.vue', react: 'system/user/index.tsx' },
  { name: '角色管理 (system/role)', vue: 'system/role/index.vue', react: 'system/role/index.tsx' },
  { name: '部门管理 (system/dept)', vue: 'system/dept/index.vue', react: 'system/dept/index.tsx' },
  { name: '岗位管理 (system/post)', vue: 'system/post/index.vue', react: 'system/post/index.tsx' },
  { name: '参数配置 (system/config)', vue: 'system/config/index.vue', react: 'system/config/index.tsx' },
  { name: '字典管理 (system/dict)', vue: 'system/dict/index.vue', react: 'system/dict/index.tsx' },
  { name: '通知公告 (system/notice)', vue: 'system/notice/index.vue', react: 'system/notice/index.tsx' },
];

function extractVueFields(content) {
  const tableColumns = [];
  const colMatches = content.matchAll(/<el-table-column[^>]*label=["']([^"']+)["'][^>]*prop=["']([^"']+)["']/g);
  for (const m of colMatches) {
    tableColumns.push({ label: m[1], prop: m[2] });
  }
  // 也有可能是 prop 在 label 前面
  const colMatches2 = content.matchAll(/<el-table-column[^>]*prop=["']([^"']+)["'][^>]*label=["']([^"']+)["']/g);
  for (const m of colMatches2) {
    if (!tableColumns.find(c => c.prop === m[1])) {
      tableColumns.push({ label: m[2], prop: m[1] });
    }
  }

  // 弹窗表单字段
  const formItems = [];
  const formMatches = content.matchAll(/<el-form-item[^>]*label=["']([^"']+)["'][^>]*prop=["']([^"']+)["']/g);
  for (const m of formMatches) {
    formItems.push({ label: m[1], prop: m[2] });
  }
  return { tableColumns, formItems };
}

function extractReactFields(content) {
  const columns = [];
  const colMatches = content.matchAll(/title:\s*['"]([^'"]+)['"][,\s\n\r]*dataIndex:\s*['"]([^'"]+)['"]/g);
  for (const m of colMatches) {
    columns.push({ title: m[1], dataIndex: m[2] });
  }
  const colMatches2 = content.matchAll(/dataIndex:\s*['"]([^'"]+)['"][,\s\n\r]*title:\s*['"]([^'"]+)['"]/g);
  for (const m of colMatches2) {
    if (!columns.find(c => c.dataIndex === m[1])) {
      columns.push({ title: m[2], dataIndex: m[1] });
    }
  }

  const formFields = [];
  const formMatches = content.matchAll(/<Form\.Item[^>]*name=["']([^"']+)["'][^>]*label=["']([^"']+)["']/g);
  for (const m of formMatches) {
    formFields.push({ label: m[2], name: m[1] });
  }
  const formMatches2 = content.matchAll(/<Form\.Item[^>]*label=["']([^"']+)["'][^>]*name=["']([^"']+)["']/g);
  for (const m of formMatches2) {
    if (!formFields.find(f => f.name === m[2])) {
      formFields.push({ label: m[1], name: m[2] });
    }
  }
  const proFormMatches = content.matchAll(/<ProForm\w+[^>]*name=["']([^"']+)["'][^>]*label=["']([^"']+)["']/g);
  for (const m of proFormMatches) {
    if (!formFields.find(f => f.name === m[1])) {
      formFields.push({ label: m[2], name: m[1] });
    }
  }

  return { columns, formFields };
}

console.log('=== FIELD COMPARISON REPORT ===\n');

for (const mod of modules) {
  const vuePath = path.join(vueViewsDir, mod.vue);
  const reactPath = path.join(reactPagesDir, mod.react);

  const vueExists = fs.existsSync(vuePath);
  const reactExists = fs.existsSync(reactPath);

  if (!vueExists || !reactExists) {
    console.log(`[SKIPPED] ${mod.name}: vueExists=${vueExists}, reactExists=${reactExists}`);
    continue;
  }

  const vueContent = fs.readFileSync(vuePath, 'utf-8');
  const reactContent = fs.readFileSync(reactPath, 'utf-8');

  const vueData = extractVueFields(vueContent);
  const reactData = extractReactFields(reactContent);

  console.log(`------------------------------------------------------------------`);
  console.log(`MODULE: ${mod.name}`);
  console.log(`Vue Table Columns (${vueData.tableColumns.length}):`, vueData.tableColumns.map(c => `${c.label}(${c.prop})`).join(', '));
  console.log(`React Columns (${reactData.columns.length}):`, reactData.columns.map(c => `${c.title}(${c.dataIndex})`).join(', '));
  
  // 找出 React 缺失的表格列
  const missingCols = vueData.tableColumns.filter(vc => !reactData.columns.some(rc => rc.dataIndex === vc.prop || rc.title === vc.label));
  if (missingCols.length > 0) {
    console.log(`>>> MISSING IN REACT TABLE (${missingCols.length}):`, missingCols.map(c => `${c.label}(${c.prop})`).join(', '));
  }

  console.log(`Vue Dialog Form Items (${vueData.formItems.length}):`, vueData.formItems.map(f => `${f.label}(${f.prop})`).join(', '));
  console.log(`React Form Items (${reactData.formFields.length}):`, reactData.formFields.map(f => `${f.label}(${f.name})`).join(', '));
  
  // 找出 React 缺失的表单项
  const missingForms = vueData.formItems.filter(vf => !reactData.formFields.some(rf => rf.name === vf.prop || rf.label === vf.label));
  if (missingForms.length > 0) {
    console.log(`>>> MISSING IN REACT FORM (${missingForms.length}):`, missingForms.map(f => `${f.label}(${f.prop})`).join(', '));
  }
}
