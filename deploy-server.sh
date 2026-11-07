#!/bin/bash
# ==============================================================================
# 豆皮教育 - 后端服务器本地构建部署脚本（在服务器上执行）
# 流程: 同步最新代码 -> Maven 构建 -> 备份 -> 原子替换 -> 重启 -> 健康检查 -> 失败自动回滚
# 由 GitHub Action 通过 SSH 触发，也可手动运行: bash deploy-server.sh
# ==============================================================================
set -euo pipefail

# ---------------- 配置区 ----------------
REPO_URL="git@github.com:doupi-code/doupi-school-platform.git"
BRANCH="main"
WORKSPACE="/data/deploy-workspace/doupi-school-platform"
TARGET_DIR="/data/doupi"
SERVICE_NAME="doupi-server"
HEALTH_PORT=8088
JAR_REL_PATH="doupi-server/doupi-admin/target/doupi-admin.jar"
BACKUP_KEEP=5

# 代理配置（v2rayA HTTP 代理端口，可通过环境变量覆盖）
PROXY_PORT="${PROXY_PORT:-20170}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/deploy_key}"
FETCH_TIMEOUT="${FETCH_TIMEOUT:-60}"       # git fetch 超时（秒）
FETCH_RETRY="${FETCH_RETRY:-3}"           # fetch 失败重试次数
# ----------------------------------------

# SSH 非交互环境 PATH 兜底（nvm / 自定义 JDK 安装场景）
set +u
[ -r /etc/profile ] && . /etc/profile
[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc"
set -u

# 显式注入 git SSH 配置：deploy_key + HTTP 代理
# 不依赖 ~/.ssh/config，确保 GitHub Action 非交互 SSH 也生效
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

command -v mvn >/dev/null 2>&1 || { echo "[x] 未找到 mvn，请确认 CI 用户环境下 JDK17/Maven 可用"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "[x] 未找到 git，请先安装"; exit 1; }

echo "[1/5] 同步最新代码..."
sync_code() {
  local retries="$1"
  # 检查仓库完整性：.git 存在且 HEAD 可解析
  if [ -d "$WORKSPACE/.git" ] && git -C "$WORKSPACE" rev-parse HEAD >/dev/null 2>&1; then
    cd "$WORKSPACE"
    local attempt=0
    while [ "$attempt" -lt "$retries" ]; do
      attempt=$((attempt + 1))
      echo "    fetch 尝试 $attempt/$retries ..."
      if timeout "$FETCH_TIMEOUT" git fetch origin "$BRANCH" --depth 1 2>/dev/null; then
        git reset --hard "origin/$BRANCH" 2>/dev/null
        echo "    fetch 成功"
        return 0
      fi
      echo "    fetch 超时/失败，重试..."
      sleep 2
    done
    # fetch 反复失败 → 仓库可能损坏，删掉重 clone
    echo "    fetch 重试 $retries 次均失败，仓库可能损坏，重 clone..."
    sudo rm -rf "$WORKSPACE" || rm -rf "$WORKSPACE"
  fi

  # clone（首次或重 clone）
  echo "    执行 git clone ..."
  timeout 300 git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$WORKSPACE"
}

sync_code "$FETCH_RETRY"
echo "    当前版本: $(git -C "$WORKSPACE" log -1 --format='%h %s')"

echo "[2/5] Maven 构建后端 Jar..."
cd "$WORKSPACE/doupi-server"
mvn -B -q clean package -DskipTests

BUILD_JAR="$WORKSPACE/$JAR_REL_PATH"
TARGET_JAR="$TARGET_DIR/doupi-admin.jar"
if [ ! -f "$BUILD_JAR" ]; then
  echo "[x] 构建产物未找到: $BUILD_JAR"
  exit 1
fi

echo "[3/5] 备份当前版本并原子替换..."
mkdir -p "$TARGET_DIR/backups"
if [ -f "$TARGET_JAR" ]; then
  cp "$TARGET_JAR" "$TARGET_DIR/backups/doupi-admin-$(date +%Y%m%d_%H%M%S).jar"
fi
cp "$BUILD_JAR" "$TARGET_JAR.new"
mv "$TARGET_JAR.new" "$TARGET_JAR"

# 仅保留最近 BACKUP_KEEP 份备份
cd "$TARGET_DIR/backups"
ls -t 2>/dev/null | grep '^doupi-admin-' | sed -e "1,${BACKUP_KEEP}d" | xargs -r rm -f || true

echo "[4/5] 重启服务 $SERVICE_NAME ..."
sudo systemctl restart "$SERVICE_NAME"

echo "[5/5] 健康检查（端口 $HEALTH_PORT）..."
sleep 8
HEALTHY=0
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}/login" || true)
  if [[ "$HTTP_CODE" =~ ^(200|401|404)$ ]]; then
    echo "[OK] 服务启动成功（HTTP $HTTP_CODE）"
    HEALTHY=1
    break
  fi
  echo "    等待服务就绪... ($i/10)"
  sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "[!] 健康检查失败，自动回滚..."
  LATEST_BAK=$(ls -t "$TARGET_DIR"/backups/doupi-admin-*.jar 2>/dev/null | head -n1 || true)
  if [ -n "$LATEST_BAK" ] && [ -f "$LATEST_BAK" ]; then
    cp "$LATEST_BAK" "$TARGET_JAR"
    sudo systemctl restart "$SERVICE_NAME"
    echo "[√] 已回滚到: $LATEST_BAK"
  fi
  exit 1
fi

echo "======================================"
echo "[√] 后端部署成功: $(git -C "$WORKSPACE" log -1 --format='%h %s')"
echo "======================================"
