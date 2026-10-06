const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve(__dirname, 'init_edu_material_kit.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const proc = spawn('docker', ['exec', '-i', 'mysql8', 'mysql', '-uroot', '-p123456', '--default-character-set=utf8mb4', 'stuck-mg'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

proc.stdin.write(sqlContent, 'utf8');
proc.stdin.end();

proc.on('close', (code) => {
  console.log('SQL execution finished with exit code:', code);
  process.exit(code);
});
