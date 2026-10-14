@echo off
chcp 65001 >nul
echo ========================================
echo Debug Script for New Location
echo ========================================
echo.

echo Please copy this script to the NEW location
echo (the folder where you extracted the ZIP)
echo.
echo Current directory: %CD%
echo.

if not exist "角色卡设计器.exe" (
    echo [ERROR] 角色卡设计器.exe not found in current directory!
    echo Please make sure you are in the extracted folder
    pause
    exit /b 1
)

echo [OK] Found 角色卡设计器.exe
echo.

echo Starting with detailed logs...
echo.

set ELECTRON_ENABLE_LOGGING=1

"角色卡设计器.exe"

echo.
echo Application closed
echo.
echo Please send me the logs above!
pause











