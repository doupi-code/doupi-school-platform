#!/bin/bash
# ==============================================================================
# 豆皮教育 - 用户端前端（doupi-web-client-react）服务器本地构建部署脚本
# 流程: 同步最新代码 -> npm 构建 -> 原子替换 /var/www/doupi-web-client/dist -> reload nginx
# 由 GitHub Action 通过 SSH 触发，也可手动运行: bash deploy-client.sh
# ==============================================================================
set -euo pipefail

# ---------------- 配置区 ----------------
REPO_URL="git@github.com:doupi-code/doupi-school-platform.git"
BRANCH="main"
WORKSPACE="/data/deploy-workspace/doupi-school-platform"
FRONTEND_DIR="$WORKSPACE/doupi-web-client-react"
TARGET_DIR="/var/www/doupi-web-client"
# ----------------------------------------

# SSH 非交互环境 PATH 兜底（nvm 安装的 Node 场景）
set +u
[ -r /etc/profile ] && . /etc/profile
[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc"
set -u

command -v npm >/dev/null 2>&1 || { echo "[x] 未找到 npm/node，请确认 CI 用户环境下 Node 可用"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "[x] 未找到 git，请先安装"; exit 1; }

echo "[1/4] 同步最新代码..."
if [ -d "$WORKSPACE/.git" ]; then
  cd "$WORKSPACE"
  git fetch origin "$BRANCH" --depth 1
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$WORKSPACE"
  cd "$WORKSPACE"
fi
echo "    当前版本: $(git log -1 --format='%h %s')"

echo "[2/4] 构建用户端前端..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
npm run build

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  echo "[x] 构建产物未找到: $FRONTEND_DIR/dist/index.html"
  exit 1
fi

echo "[3/4] 原子替换静态资源..."
mkdir -p "$TARGET_DIR/dist_new"
cp -r "$FRONTEND_DIR"/dist/. "$TARGET_DIR/dist_new/"

# 统一静态资源权限
find "$TARGET_DIR/dist_new" -type d -exec chmod 755 {} +
find "$TARGET_DIR/dist_new" -type f -exec chmod 644 {} +

# 零停机原子替换
if [ -d "$TARGET_DIR/dist" ]; then
  rm -rf "$TARGET_DIR/dist_old"
  mv "$TARGET_DIR/dist" "$TARGET_DIR/dist_old"
fi
mv "$TARGET_DIR/dist_new" "$TARGET_DIR/dist"
rm -rf "$TARGET_DIR/dist_old"

echo "[4/4] 重载 Nginx..."
sudo systemctl reload nginx

echo "======================================"
echo "[√] Client 前端部署成功: $(git -C "$WORKSPACE" log -1 --format='%h %s')"
echo "======================================"
