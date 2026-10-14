@echo off
chcp 65001 >nul
echo ========================================
echo 创建分发包
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: 关闭所有相关进程...
taskkill /F /IM "角色卡设计器.exe" 2>nul
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
echo [OK] 进程已清理
echo.

echo Step 2: 等待文件句柄释放...
timeout /t 3 /nobreak >nul
echo [OK] 准备就绪
echo.

echo Step 3: 压缩文件...
echo 这可能需要 2-3 分钟，请耐心等待...
echo.

cd dist-new

if exist "角色卡设计器-v1.0.0.zip" (
    del /f /q "角色卡设计器-v1.0.0.zip"
)

powershell -Command "Compress-Archive -Path 'win-unpacked\*' -DestinationPath '角色卡设计器-v1.0.0.zip' -CompressionLevel Optimal -Force"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo [OK] 压缩完成！
    echo ========================================
    echo.
    
    for %%A in ("角色卡设计器-v1.0.0.zip") do (
        set size=%%~zA
        set /a sizeMB=!size! / 1048576
        echo 文件名: %%~nxA
        echo 大小: !sizeMB! MB
        echo 位置: %CD%\%%~nxA
    )
    
    echo.
    echo 可以分发此文件了！
    echo.
    explorer .
) else (
    echo.
    echo [ERROR] 压缩失败！
    echo 请确保没有程序在使用 win-unpacked 文件夹中的文件
    echo.
)

pause











