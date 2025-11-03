@echo off
chcp 65001 >nul
title 角色卡设计器 - 一键打包工具

echo.
echo ========================================
echo    角色卡设计器 - 一键打包工具
echo ========================================
echo.
echo 本工具将打包应用为便携版 .exe 文件
echo 用户下载后双击即可使用，无需安装！
echo.
echo ========================================
echo.

REM 检查Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js！请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
node -v
echo.

REM 检查依赖
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    call npm install
    echo.
)

echo ========================================
echo 📋 请选择打包方式：
echo ========================================
echo.
echo  [1] 便携版（推荐）
echo      - 解压即用，无需安装
echo      - 适合小白用户
echo      - 文件大小：约 200-300 MB
echo.
echo  [2] 安装版
echo      - 标准安装程序
echo      - 有桌面快捷方式
echo      - 文件大小：约 150-250 MB
echo.
echo  [3] 完整打包（安装版+便携版）
echo.
set /p choice="请输入选项 [1/2/3]："

if "%choice%"=="1" (
    echo.
    echo ========================================
    echo    🚀 开始打包便携版...
    echo ========================================
    echo.
    call npm run dist:portable
    goto :success
)

if "%choice%"=="2" (
    echo.
    echo ========================================
    echo    🚀 开始打包安装版...
    echo ========================================
    echo.
    call npm run dist:win
    goto :success
)

if "%choice%"=="3" (
    echo.
    echo ========================================
    echo    🚀 开始完整打包...
    echo ========================================
    echo.
    call npm run dist:win
    goto :success
)

echo.
echo ❌ 无效选项！
pause
exit /b 1

:success
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo    ❌ 打包失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo  1. 依赖未正确安装
    echo  2. 磁盘空间不足
    echo  3. 防病毒软件阻止
    echo.
    echo 解决方法：
    echo  1. 运行：npm install
    echo  2. 清理缓存：npm cache clean --force
    echo  3. 重新安装依赖：rm -rf node_modules ^&^& npm install
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    🎉 打包成功！
echo ========================================
echo.
echo 📁 打包文件位置：
echo    %cd%\dist\
echo.
echo 📦 生成的文件：
dir /b dist\*.exe 2>nul

echo.
echo ========================================
echo    📤 下一步：
echo ========================================
echo.
echo  1. 打开 dist\ 文件夹
echo  2. 找到生成的 .exe 文件
echo  3. 双击测试运行
echo  4. 上传到 GitHub Releases 或网盘分享
echo.
echo  📖 详细说明请查看：打包说明.md
echo.
echo ========================================

pause

