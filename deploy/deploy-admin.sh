#!/bin/bash
# ==============================================================================
# 豆皮教育 - 管理后台前端（doupi-web-admin-react）服务器本地构建部署脚本
# 流程: npm 构建 -> 原子替换 /var/www/doupi-web-admin/dist -> reload nginx
# 通过 bash deploy/deploy.sh admin 同步代码并启动本脚本
# ==============================================================================
set -euo pipefail

# ---------------- 配置区 ----------------
WORKSPACE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$WORKSPACE/doupi-web-admin-react"
TARGET_DIR="/var/www/doupi-web-admin"
# ----------------------------------------

command -v npm >/dev/null 2>&1 || { echo "[x] 未找到 npm/node，请确认 CI 用户环境下 Node 可用"; exit 1; }

echo "[1/3] 构建管理后台前端..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
npm run build

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  echo "[x] 构建产物未找到: $FRONTEND_DIR/dist/index.html"
  exit 1
fi

echo "[2/3] 原子替换静态资源..."
mkdir -p "$TARGET_DIR/dist_new"
cp -r "$FRONTEND_DIR"/dist/. "$TARGET_DIR/dist_new/"

find "$TARGET_DIR/dist_new" -type d -exec chmod 755 {} +
find "$TARGET_DIR/dist_new" -type f -exec chmod 644 {} +

if [ -d "$TARGET_DIR/dist" ]; then
  rm -rf "$TARGET_DIR/dist_old"
  mv "$TARGET_DIR/dist" "$TARGET_DIR/dist_old"
fi
mv "$TARGET_DIR/dist_new" "$TARGET_DIR/dist"
rm -rf "$TARGET_DIR/dist_old"

echo "[3/3] 重载 Nginx..."
sudo systemctl reload nginx

echo "======================================"
echo "[√] Admin 前端部署成功: $(git -C "$WORKSPACE" log -1 --format='%h %s')"
echo "======================================"
