@echo off
chcp 65001 >nul
echo ========================================
echo Preparing Node.js for packaging
echo ========================================
echo.

cd /d "%~dp0"

REM Find Node.js path
for /f "tokens=*" %%i in ('where node 2^>nul') do set NODE_PATH=%%i

if "%NODE_PATH%"=="" (
    echo ERROR: Node.js not found in system PATH!
    echo Please install Node.js first: https://nodejs.org/
    pause
    exit /b 1
)

echo Found Node.js at: %NODE_PATH%

REM Get Node.js directory
for %%i in ("%NODE_PATH%") do set NODE_DIR=%%~dpi

echo Node.js directory: %NODE_DIR%

REM Create resources/node directory
if not exist "resources" mkdir "resources"
if not exist "resources\node" mkdir "resources\node"

echo.
echo Copying Node.js files...
echo.

REM Copy node.exe
copy "%NODE_PATH%" "resources\node\node.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy node.exe
    pause
    exit /b 1
)
echo [OK] Copied node.exe

REM Check file size
for %%A in ("resources\node\node.exe") do set SIZE=%%~zA
set /a SIZE_MB=%SIZE% / 1048576
echo [INFO] Node.js size: %SIZE_MB% MB

echo.
echo ========================================
echo Node.js prepared successfully!
echo ========================================
echo.
echo Next step: Run packaging command
echo   npm run dist:portable
echo.
pause











