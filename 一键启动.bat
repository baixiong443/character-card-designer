@echo off
chcp 65001 >nul
title 角色卡设计器 - 一键启动

echo.
echo ====================================
echo    角色卡设计器 - 一键启动工具
echo ====================================
echo.

REM 检查Node.js是否已安装
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js！
    echo.
    echo 📥 请先安装 Node.js：
    echo    1. 打开浏览器访问：https://nodejs.org/
    echo    2. 下载并安装 LTS 版本
    echo    3. 安装完成后，重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
node -v
echo.

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    echo ⏳ 这可能需要 2-3 分钟，请耐心等待...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败！
        echo 💡 请检查网络连接，或尝试切换 npm 镜像源
        echo.
        pause
        exit /b 1
    )
    echo.
    echo ✅ 依赖安装完成！
    echo.
) else (
    echo ✅ 依赖已安装
    echo.
)

REM 获取本机IP地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
set IP=%IP:~1%

echo ====================================
echo    🚀 正在启动服务器...
echo ====================================
echo.
echo 📱 访问地址：
echo    💻 本机访问: http://localhost:3000
echo    📱 手机访问: http://%IP%:3000
echo.
echo 💡 提示：
echo    - 确保手机和电脑在同一WiFi下
echo    - 按 Ctrl+C 可停止服务器
echo    - 关闭此窗口会停止服务
echo.
echo ====================================
echo.

REM 启动开发服务器
call npm run dev

pause


