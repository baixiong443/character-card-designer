@echo off
chcp 65001 >nul
echo ========================================
echo Testing Next.js Server
echo ========================================
echo.

cd /d "%~dp0dist-new\win-unpacked\resources\app.asar.unpacked"

echo Checking paths...
echo Current directory: %CD%
echo.

if not exist ".next" (
    echo ERROR: .next directory not found!
    pause
    exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
    echo ERROR: Next.js binary not found!
    pause
    exit /b 1
)

echo All files found!
echo.
echo Starting Next.js server...
echo.

set PORT=3000
set NODE_ENV=production

node "node_modules\next\dist\bin\next" start

pause











