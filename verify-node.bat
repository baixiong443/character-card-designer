@echo off
chcp 65001 >nul
echo ========================================
echo Verifying Node.js Source
echo ========================================
echo.

cd /d "%~dp0dist-new\win-unpacked"

echo Step 1: Check bundled Node.js
echo.
if exist "resources\node\node.exe" (
    echo [OK] Bundled Node.js exists
    "resources\node\node.exe" --version
    echo Path: %CD%\resources\node\node.exe
) else (
    echo [ERROR] Bundled Node.js NOT found!
)

echo.
echo ========================================
echo Step 2: Running application with logs
echo ========================================
echo.
echo Watch for these lines in the output:
echo   - "Bundled Node.js Path: ..."
echo   - "[OK] Using bundled Node.js"
echo.
echo Press any key to start...
pause >nul

set ELECTRON_ENABLE_LOGGING=1

"角色卡设计器.exe"

echo.
echo ========================================
echo Application closed
echo.
echo Did you see "Using bundled Node.js"?
pause











