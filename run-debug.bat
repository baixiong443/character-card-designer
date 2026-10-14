@echo off
chcp 65001 >nul
echo ========================================
echo Running Debug Version (with console)
echo ========================================
echo.

cd /d "%~dp0dist-new\win-unpacked"

echo Starting application with console output...
echo Press Ctrl+C to stop
echo.
echo ----------------------------------------
echo.

"角色卡设计器.exe"

pause

