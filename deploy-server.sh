#!/bin/bash
# ==============================================================================
# 豆皮教育 - 后端服务器本地构建部署脚本（在服务器上执行）
# 流程: 同步最新代码 -> Maven 构建 -> 备份 -> 原子替换 -> 重启 -> 健康检查 -> 失败自动回滚
# 由 GitHub Action 通过 SSH 触发，也可手动运行: bash deploy-server.sh
# ==============================================================================
set -euo pipefail

# ---------------- 配置区（与服务器现有环境对齐） ----------------
REPO_URL="git@github.com:doupi-code/doupi-school-platform.git"
BRANCH="main"
WORKSPACE="/data/deploy-workspace/doupi-school-platform"
TARGET_DIR="/data/doupi"
SERVICE_NAME="doupi-server"
HEALTH_PORT=8088
JAR_REL_PATH="doupi-server/doupi-admin/target/doupi-admin.jar"
BACKUP_KEEP=5
# ----------------------------------------------------------------

# SSH 非交互环境 PATH 兜底（nvm / 自定义 JDK 安装场景）
set +u
[ -r /etc/profile ] && . /etc/profile
[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc"
set -u

command -v mvn >/dev/null 2>&1 || { echo "[x] 未找到 mvn，请确认 CI 用户环境下 JDK17/Maven 可用"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "[x] 未找到 git，请先安装"; exit 1; }

echo "[1/5] 同步最新代码..."
if [ -d "$WORKSPACE/.git" ]; then
  cd "$WORKSPACE"
  git fetch origin "$BRANCH" --depth 1
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$WORKSPACE"
  cd "$WORKSPACE"
fi
echo "    当前版本: $(git log -1 --format='%h %s')"

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
