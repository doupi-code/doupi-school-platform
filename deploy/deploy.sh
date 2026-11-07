#!/bin/bash
# GitHub Actions 通过 SSH 将本脚本传给 bash -s，不依赖服务器检出中已有的发布脚本。

case "${1:-}" in
  server|admin|client) targets=("$1") ;;
  all) targets=(server admin client) ;;
  *) echo "用法: bash deploy/deploy.sh {server|admin|client|all}" >&2; exit 2 ;;
esac

WORKSPACE="${DEPLOY_WORKSPACE:-/data/deploy-workspace/doupi-school-platform}"
REPO_URL="git@github.com:doupi-code/doupi-school-platform.git"
BRANCH="main"
PROXY_PORT="${PROXY_PORT:-20170}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/deploy_key}"
FETCH_TIMEOUT="${FETCH_TIMEOUT:-60}"
FETCH_RETRY="${FETCH_RETRY:-3}"

# 保留 CI 用户的非交互式构建环境和 GitHub SSH 代理配置。
[ -r /etc/profile ] && . /etc/profile
[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc"
set -euo pipefail

if [ -f "$DEPLOY_KEY" ]; then
  export DEPLOY_KEY
  export GIT_SSH_COMMAND='ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=no'
  if command -v nc >/dev/null 2>&1 && nc -X 2>&1 | grep -qi connect; then
    GIT_SSH_COMMAND+=" -o ProxyCommand='nc -X connect -x 127.0.0.1:${PROXY_PORT} %h %p'"
  elif command -v connect >/dev/null 2>&1; then
    GIT_SSH_COMMAND+=" -o ProxyCommand='connect -H 127.0.0.1:${PROXY_PORT} %h %p'"
  fi
fi

# 各入口共用工作区，锁覆盖同步、构建和发布，防止其他入口在构建期间切换版本。
mkdir -p "$(dirname "$WORKSPACE")"
echo "[部署] 等待工作区发布锁..."
exec 9>"$WORKSPACE.lock"
flock -x 9

if [ ! -d "$WORKSPACE/.git" ]; then
  echo "[部署] 首次检出 $BRANCH ..."
  timeout 300 git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$WORKSPACE" </dev/null
else
  echo "[部署] 同步 $BRANCH ..."
  for ((attempt = 1; attempt <= FETCH_RETRY; attempt++)); do
    if timeout "$FETCH_TIMEOUT" git -C "$WORKSPACE" fetch --depth 1 origin "refs/heads/$BRANCH" </dev/null; then
      break
    fi
    if ((attempt < FETCH_RETRY)); then
      sleep 2
    fi
  done
  if ((attempt > FETCH_RETRY)); then
    echo "[部署] 同步 $BRANCH 失败，停止发布。" >&2
    exit 1
  fi
  git -C "$WORKSPACE" reset --hard FETCH_HEAD
fi

cd "$WORKSPACE"
echo "[部署] 当前版本: $(git log -1 --format='%h %s')"
for target in "${targets[@]}"; do
  script="deploy/deploy-$target.sh"
  if ! git ls-files --error-unmatch -- "$script" >/dev/null 2>&1 || [ ! -f "$script" ]; then
    echo "[部署] 当前版本缺少发布脚本: $script" >&2
    exit 1
  fi
done
for target in "${targets[@]}"; do
  # 子脚本使用独立标准输入，且不继承锁描述符。
  bash "deploy/deploy-$target.sh" </dev/null 9>&-
done
