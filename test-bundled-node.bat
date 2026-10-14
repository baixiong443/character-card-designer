@echo off
chcp 65001 >nul
echo ========================================
echo Testing Bundled Node.js
echo ========================================
echo.

cd /d "%~dp0dist-new\win-unpacked"

set BUNDLED_NODE=resources\node\node.exe
set APP_PATH=resources\app.asar.unpacked
set NEXT_BIN=%APP_PATH%\node_modules\next\dist\bin\next

echo 1. Checking Node.js...
if exist "%BUNDLED_NODE%" (
    echo [OK] Found: %BUNDLED_NODE%
    "%BUNDLED_NODE%" --version
) else (
    echo [ERROR] Not found: %BUNDLED_NODE%
    pause
    exit /b 1
)

echo.
echo 2. Checking Next.js binary...
if exist "%NEXT_BIN%" (
    echo [OK] Found: %NEXT_BIN%
) else (
    echo [ERROR] Not found: %NEXT_BIN%
    pause
    exit /b 1
)

echo.
echo 3. Checking .next directory...
if exist "%APP_PATH%\.next" (
    echo [OK] Found: %APP_PATH%\.next
) else (
    echo [ERROR] Not found: %APP_PATH%\.next
    pause
    exit /b 1
)

echo.
echo ========================================
echo All checks passed!
echo ========================================
echo.
echo 4. Testing Next.js startup...
echo.

cd "%APP_PATH%"
set PORT=3000
set NODE_ENV=production

echo Running: node.exe node_modules\next\dist\bin\next start
echo.

..\node\node.exe node_modules\next\dist\bin\next start

pause

