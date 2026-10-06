@echo off
chcp 65001 >nul
echo ==============================================================================
echo 豆皮教育系统生产环境一键编译与启动脚本 (Windows)
echo ==============================================================================

set "PROJECT_ROOT=%~dp0.."

echo [1/5] 开始编译后端 doupi-server...
cd /d "%PROJECT_ROOT%\doupi-server"
call mvn clean package -DskipTests
if errorlevel 1 (
    echo [错误] 后端编译失败！
    exit /b 1
)

echo [2/5] 开始构建 React 管理端 (doupi-web-admin-react)...
cd /d "%PROJECT_ROOT%\doupi-web-admin-react"
call npm run build
if errorlevel 1 (
    echo [错误] React 管理端构建失败！
    exit /b 1
)

echo [3/5] 开始构建 React 用户端 (doupi-web-client-react)...
cd /d "%PROJECT_ROOT%\doupi-web-client-react"
call npm run build
if errorlevel 1 (
    echo [错误] React 用户端构建失败！
    exit /b 1
)

echo [4/5] 同步微信小程序公共资源...
cd /d "%PROJECT_ROOT%"
call node scripts/sync-shared.js

echo [5/5] 启动 Docker Compose 编排服务...
cd /d "%PROJECT_ROOT%\deploy"
if not exist .env (
    copy .env.example .env
)
docker-compose up -d --build

echo ==============================================================================
echo 服务部署完成！
echo Web 用户端: http://localhost
echo React管理端: http://localhost/admin
echo 后端API网关: http://localhost/prod-api/
echo ==============================================================================
pause
