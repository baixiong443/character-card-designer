@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Psyche 桌面应用打包工具
echo ========================================
echo.
echo 这将生成一个独立的 Windows 桌面应用程序
echo 用户无需安装 Node.js 即可运行
echo.

echo [1/5] 清理旧的构建文件...
rmdir /s /q .next 2>nul
rmdir /s /q dist-new 2>nul
echo ✓ 清理完成

echo.
echo [2/5] 安装依赖...
call npm install
if errorlevel 1 (
    echo ✗ 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖安装完成

echo.
echo [3/5] 构建 Next.js 应用...
echo 这可能需要几分钟，请耐心等待...
call npm run build
if errorlevel 1 (
    echo ✗ Next.js 构建失败
    echo 请检查上面的错误信息
    pause
    exit /b 1
)
echo ✓ Next.js 构建完成

echo.
echo [4/5] 检查 Node.js 便携版...
if not exist "resources\node\node.exe" (
    echo ⚠ 未找到便携版 Node.js
    echo 正在下载 Node.js 便携版...
    
    if not exist "resources\node" mkdir resources\node
    
    echo 请手动下载 Node.js 便携版:
    echo 1. 访问 https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-x64.zip
    echo 2. 解压后将 node.exe 复制到 resources\node\ 目录
    echo.
    echo 或者继续打包（用户需要自己安装 Node.js）
    echo.
    choice /c YN /m "是否继续打包（Y=继续，N=取消）"
    if errorlevel 2 (
        echo 已取消
        pause
        exit /b 1
    )
) else (
    echo ✓ 找到便携版 Node.js
)

echo.
echo [5/5] 打包 Electron 应用...
echo 这可能需要几分钟...
call npm run dist:portable
if errorlevel 1 (
    echo ✗ Electron 打包失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ 打包完成！
echo ========================================
echo.
echo 应用程序位置:
echo   dist-new\角色卡设计器-1.0.0-便携版.exe
echo.
echo 这是一个独立的可执行文件，可以直接运行
echo 无需安装，可以复制到任何地方使用
echo.
pause
