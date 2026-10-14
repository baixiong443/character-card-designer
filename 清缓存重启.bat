@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Character Card Designer - Clean Restart
cd /d "%~dp0"

echo.
echo ====================================
echo    Character Card Designer
echo    Clean restart (clear cache + dev)
echo ====================================
echo.
echo   Use this when the browser keeps showing old behaviour after a
echo   source change: it deletes the .next build cache before starting.
echo.

REM ---------- stop anything still holding port 3000 ----------
set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /c:"LISTENING" ^| findstr /c:":3000 "') do (
    set "FOUND=1"
    echo [..] stopping process on port 3000 ^(PID %%p^)...
    taskkill /PID %%p /T /F >nul 2>&1
)
if defined FOUND (
    echo [OK] port 3000 released
    REM ping is used instead of `timeout`: timeout aborts when stdin is
    REM redirected, which happens when this script is called from elsewhere.
    ping -n 3 127.0.0.1 >nul 2>&1
) else (
    echo [OK] port 3000 is free
)

REM ---------- delete the build cache ----------
set "MISSING="
if not exist ".next" set "MISSING=1"
if defined MISSING (
    echo [OK] no .next cache to clear
) else (
    echo [..] clearing .next build cache, this can take a moment...
    rmdir /s /q ".next" >nul 2>&1
    if exist ".next" (
        echo [!] .next still present. Close any editor or terminal inside it,
        echo     or delete it manually, then run this script again.
        echo.
        pause
        exit /b 1
    )
    echo [OK] .next cache cleared
)

REM ---------- delegate to the normal launcher ----------
echo.
echo [..] starting the dev server via 一键启动.bat ...
echo.
call "%~dp0一键启动.bat"
