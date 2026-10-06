#!/bin/bash
# ==============================================================================
# 豆皮教育系统生产环境一键编译与启动脚本 (Linux/macOS)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo ">>> [1/5] 项目根路径: ${PROJECT_ROOT}"

# 1. 编译后端
echo ">>> [2/5] 开始编译后端 doupi-server..."
cd "${PROJECT_ROOT}/doupi-server"
mvn clean package -DskipTests
echo ">>> 后端打包完成: doupi-admin.jar 已就绪"

# 2. 编译 React 管理端
echo ">>> [3/5] 开始构建 React 管理端 (doupi-web-admin-react)..."
cd "${PROJECT_ROOT}/doupi-web-admin-react"
npm run build
echo ">>> React 管理端构建完成: dist/ 已就绪"

# 3. 编译 React 用户端
echo ">>> [4/5] 开始构建 React 用户端 (doupi-web-client-react)..."
cd "${PROJECT_ROOT}/doupi-web-client-react"
npm run build
echo ">>> React 用户端构建完成: dist/ 已就绪"

# 4. 同步小程序共享依赖
echo ">>> [5/5] 同步小程序双端公共资源..."
cd "${PROJECT_ROOT}"
node scripts/sync-shared.js

# 5. 启动 Docker Compose 集群
echo ">>> 启动 Docker 容器编排服务..."
cd "${PROJECT_ROOT}/deploy"
if [ ! -f .env ]; then
    echo "未检测到 .env 文件，已从 .env.example 复制..."
    cp .env.example .env
fi

docker-compose up -d --build

echo "=============================================================================="
echo ">>> 部署启动成功！"
echo ">>> Web 用户门户: http://localhost (生产域名: https://doupi.example.com)"
echo ">>> React 管理端: http://localhost/admin"
echo ">>> 后端服务网关: http://localhost/prod-api/"
echo ">>> 小程序API网关: http://localhost/api/wx/dispatcher"
echo "=============================================================================="
