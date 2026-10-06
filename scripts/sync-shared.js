/**
 * 微信小程序双端同源文件同步脚本
 * 用途：一键同步 doupi-app-client 与 doupi-app-admin 之间的公共工具库、基础组件及公共样式
 * 
 * 运行方式:
 *   node scripts/sync-shared.js                     # 默认从 client 同步至 admin
 *   node scripts/sync-shared.js --direction=admin-to-client  # 从 admin 同步至 client
 *   node scripts/sync-shared.js --dry-run           # 仅检查差异，不写入
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 根目录与路径定义
const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'doupi-app-client');
const ADMIN_DIR = path.join(ROOT_DIR, 'doupi-app-admin');

// 需同步的相对目录与文件规则
const SYNC_RULES = [
  {
    folder: 'utils',
    files: [
      'cloudClient.js',
      'common.js',
      'displayDict.js',
      'errorDict.js',
      'validationDict.js',
      'feedback.js',
      'ui.js',
      'avatar.js',
      'runtimeStage.js',
      'subscribe.js'
    ]
  },
  {
    folder: 'styles',
    files: [
      // 样式文件通配或指定
    ]
  }
];

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function syncFiles() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isAdminToClient = args.includes('--direction=admin-to-client');

  const sourceBase = isAdminToClient ? ADMIN_DIR : CLIENT_DIR;
  const targetBase = isAdminToClient ? CLIENT_DIR : ADMIN_DIR;
  const sourceName = isAdminToClient ? 'doupi-app-admin' : 'doupi-app-client';
  const targetName = isAdminToClient ? 'doupi-app-client' : 'doupi-app-admin';

  console.log(`=======================================================`);
  console.log(`[SYNC-SHARED] 开始同步小程序双端公共文件`);
  console.log(`源端: ${sourceName} -> 目标端: ${targetName}`);
  console.log(`模式: ${isDryRun ? 'DRY-RUN (仅比对差异)' : 'EXECUTE (实时覆盖同步)'}`);
  console.log(`=======================================================\n`);

  let checkedCount = 0;
  let copiedCount = 0;
  let identicalCount = 0;
  let missingSourceCount = 0;

  for (const rule of SYNC_RULES) {
    const srcFolder = path.join(sourceBase, rule.folder);
    const dstFolder = path.join(targetBase, rule.folder);

    // 如果指定了具体文件
    let targetFileList = rule.files;
    if (!targetFileList || targetFileList.length === 0) {
      if (fs.existsSync(srcFolder)) {
        targetFileList = fs.readdirSync(srcFolder).filter(f => !fs.statSync(path.join(srcFolder, f)).isDirectory());
      } else {
        targetFileList = [];
      }
    }

    for (const fileName of targetFileList) {
      checkedCount++;
      const srcFile = path.join(srcFolder, fileName);
      const dstFile = path.join(dstFolder, fileName);

      if (!fs.existsSync(srcFile)) {
        console.warn(`[跳过] 源文件不存在: ${rule.folder}/${fileName}`);
        missingSourceCount++;
        continue;
      }

      const srcHash = getFileHash(srcFile);
      const dstHash = getFileHash(dstFile);

      if (srcHash === dstHash) {
        identicalCount++;
        // console.log(`[一致] ${rule.folder}/${fileName}`);
      } else {
        copiedCount++;
        console.log(`[差异] ${rule.folder}/${fileName} -> ${isDryRun ? '需更新' : '已更新'}`);
        if (!isDryRun) {
          ensureDir(dstFolder);
          fs.copyFileSync(srcFile, dstFile);
        }
      }
    }
  }

  console.log(`\n-------------------------------------------------------`);
  console.log(`同步统计结果:`);
  console.log(`- 检查文件总数: ${checkedCount}`);
  console.log(`- 完全一致文件: ${identicalCount}`);
  console.log(`- 更新/差异文件: ${copiedCount}`);
  console.log(`- 源端缺失文件: ${missingSourceCount}`);
  console.log(`=======================================================\n`);
}

syncFiles();
