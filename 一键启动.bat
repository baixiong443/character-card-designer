@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Character Card Designer - Dev Launcher
cd /d "%~dp0"

echo.
echo ====================================
echo    Character Card Designer
echo    Source-mode launcher (dev)
echo ====================================
echo.
REM Chinese text lives in a UTF-8 sidecar: cmd.exe cannot reliably parse
REM inline non-ASCII in a .bat after chcp 65001 (lines get truncated).
if exist "%~dp0启动说明.txt" type "%~dp0启动说明.txt"
echo.

REM ---------- Node.js ----------
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js not found.
    echo.
    echo     Install Node.js first: https://nodejs.org/
    echo     Then run this script again.
    echo.
    pause
    exit /b 1
)
set "NODEV="
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo [OK] Node.js !NODEV!

REM ---------- dependencies ----------
if not exist "node_modules" (
    echo.
    echo [..] First run: installing dependencies, about 2-3 minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [X] npm install failed. Check network or switch npm registry.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] dependencies installed
) else (
    echo [OK] node_modules present
)

REM A directory can exist yet be incomplete, so verify the key package.
if not exist "node_modules\next" (
    echo.
    echo [^^!] dependencies incomplete ^(next missing^). Repairing...
    echo.
    call npm install
)
if not exist "node_modules\next" (
    echo.
    echo [X] dependencies still incomplete.
    echo     Delete node_modules and run this script again.
    echo.
    pause
    exit /b 1
)

REM ---------- port 3000 ----------
REM Only a LISTENING socket means the port is really taken. A TIME_WAIT entry
REM (common right after a restart) is harmless and must not warn.
set "BUSY="
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /c:"LISTENING" ^| findstr /c:":3000 "') do set "BUSY=1"
if defined BUSY (
    echo.
    echo [^^!] Port 3000 is busy. Next.js will use another port;
    echo     take the URL printed after startup.
)

REM ---------- LAN address ----------
REM Only trust the adapter that owns the default gateway, so Hyper-V,
REM Bluetooth and other virtual adapters are not reported by mistake.
set "IP="
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -First 1).IPv4Address.IPAddress"') do set "IP=%%a"

echo.
echo ====================================
echo    Starting dev server...
echo ====================================
echo.
echo   Local   : http://localhost:3000
if defined IP (
    if /i not "!IP!"=="127.0.0.1" echo   LAN     : http://!IP!:3000
)
echo.
echo   Press Ctrl+C to stop the server.
echo   Closing this window stops the service.
echo.
echo ====================================
echo.

call npm run dev

echo.
echo Server stopped.
pause
