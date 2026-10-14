@echo off
chcp 65001 >nul
echo ========================================
echo Running with Console Output
echo ========================================
echo.

cd /d "%~dp0dist-new\win-unpacked"

echo Starting application...
echo You will see detailed logs below:
echo ----------------------------------------
echo.

set ELECTRON_ENABLE_LOGGING=1

"角色卡设计器.exe"

echo.
echo ----------------------------------------
echo Application closed
pause











