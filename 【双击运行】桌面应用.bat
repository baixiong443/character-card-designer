@echo off
chcp 65001 >nul

echo 正在启动 Psyche 角色卡设计器...

if exist "dist-new\win-unpacked\角色卡设计器.exe" (
    start "" "dist-new\win-unpacked\角色卡设计器.exe"
    echo.
    echo ✓ 应用已启动
    echo.
    echo 如果应用没有显示，请等待几秒钟...
    echo 首次启动可能需要 10-20 秒
    timeout /t 5 /nobreak >nul
) else (
    echo.
    echo ✗ 未找到已打包的应用
    echo.
    echo 请先运行 "一键生成桌面应用.bat" 来打包应用
    echo.
    pause
)
