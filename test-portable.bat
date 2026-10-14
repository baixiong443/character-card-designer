@echo off
chcp 65001 >nul
echo ========================================
echo Testing Portable Version
echo ========================================
echo.

cd /d "%~dp0dist-new"

echo File info:
dir "角色卡设计器-1.0.0-便携版.exe"
echo.

echo Starting portable version with logging...
echo.

set ELECTRON_ENABLE_LOGGING=1

"角色卡设计器-1.0.0-便携版.exe"

echo.
echo ----------------------------------------
echo Portable version closed
echo.
echo Any errors above?
pause











