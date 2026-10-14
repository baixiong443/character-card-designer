@echo off
chcp 65001 >nul
echo ========================================
echo Running Electron in Development Mode
echo ========================================
echo.
echo This will show all console logs in English!
echo.

cd /d "%~dp0"

echo Starting...
echo.

npm run electron

pause











