@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Psyche 快速修复和启动脚本
echo ========================================
echo.

echo [1/4] 清理缓存...
rmdir /s /q .next 2>nul
rmdir /s /q .turbo 2>nul
del /q compile_output.txt 2>nul
echo ✓ 缓存已清理

echo.
echo [2/4] 清理 node_modules 缓存...
rmdir /s /q node_modules\.cache 2>nul
echo ✓ node_modules 缓存已清理

echo.
echo [3/4] 安装依赖...
call npm install
if errorlevel 1 (
    echo ✗ 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖已安装

echo.
echo [4/4] 启动开发服务器...
echo.
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 停止服务器
echo.
call npm run dev

pause
