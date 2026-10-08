#!/bin/bash
# ==============================================================================
# 豆皮 - 个人作品展示页（doupi-portfolio）服务器本地部署脚本
# 作品集为纯静态单文件（无构建），直接同步 index.html 到 /var/www/doupi-portfolio/
# 由 GitHub Action 通过 SSH 触发，也可手动运行: bash deploy-portfolio.sh
# ==============================================================================
set -euo pipefail

# ---------------- 配置区 ----------------
REPO_URL="git@github.com:doupi-code/doupi-school-platform.git"
BRANCH="main"
WORKSPACE="/data/deploy-workspace/doupi-school-platform"
SOURCE_DIR="$WORKSPACE/doupi-portfolio"
TARGET_DIR="/var/www/doupi-portfolio"

# 代理配置（v2rayA HTTP 代理端口，可通过环境变量覆盖）
PROXY_PORT="${PROXY_PORT:-20170}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/deploy_key}"
FETCH_TIMEOUT="${FETCH_TIMEOUT:-60}"
FETCH_RETRY="${FETCH_RETRY:-3}"
# ----------------------------------------

# SSH 非交互环境 PATH 兜底（nvm 安装的 Node 场景）
set +u
[ -r /etc/profile ] && . /etc/profile
[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc"
set -u

# 显式注入 git SSH 配置：deploy_key + HTTP 代理
if command -v nc >/dev/null 2>&1 && nc -X 2>&1 | grep -qi connect; then
  SSH_PROXY_CMD="nc -X connect -x 127.0.0.1:${PROXY_PORT} %h %p"
elif command -v connect >/dev/null 2>&1; then
  SSH_PROXY_CMD="connect -H 127.0.0.1:${PROXY_PORT} %h %p"
else
  SSH_PROXY_CMD="none"
fi

if [ -f "$DEPLOY_KEY" ]; then
  if [ "$SSH_PROXY_CMD" != "none" ]; then
    export GIT_SSH_COMMAND="ssh -i ${DEPLOY_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o ProxyCommand='${SSH_PROXY_CMD}'"
  else
    export GIT_SSH_COMMAND="ssh -i ${DEPLOY_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no"
  fi
fi

command -v git >/dev/null 2>&1 || { echo "[x] 未找到 git，请先安装"; exit 1; }

echo "[1/3] 同步最新代码..."
if [ -d "$WORKSPACE/.git" ] && git -C "$WORKSPACE" rev-parse HEAD >/dev/null 2>&1; then
  cd "$WORKSPACE"
  attempt=0
  while [ "$attempt" -lt "$FETCH_RETRY" ]; do
    attempt=$((attempt + 1))
    echo "    fetch 尝试 $attempt/$FETCH_RETRY ..."
    if timeout "$FETCH_TIMEOUT" git fetch origin "$BRANCH" --depth 1 2>/dev/null; then
      git reset --hard "origin/$BRANCH" 2>/dev/null
      echo "    fetch 成功"
      break
    fi
    sleep 2
  done
else
  echo "    首次 clone ..."
  timeout 300 git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$WORKSPACE"
fi
echo "    当前版本: $(git -C "$WORKSPACE" log -1 --format='%h %s')"

echo "[2/3] 校验作品集文件..."
if [ ! -f "$SOURCE_DIR/index.html" ]; then
  echo "[x] 源文件未找到: $SOURCE_DIR/index.html"
  exit 1
fi

echo "[3/3] 原子替换静态文件..."
mkdir -p "$TARGET_DIR"
cp -f "$SOURCE_DIR/index.html" "$TARGET_DIR/.index.html.new"
chmod 644 "$TARGET_DIR/.index.html.new"
mv -f "$TARGET_DIR/.index.html.new" "$TARGET_DIR/index.html"

echo "======================================"
echo "[√] Portfolio 部署成功: $(git -C "$WORKSPACE" log -1 --format='%h %s')"
echo "======================================"