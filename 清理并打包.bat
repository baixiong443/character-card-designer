@echo off
chcp 65001 >nul
echo ========================================
echo Clean Build and Package
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Closing all related processes...
taskkill /F /IM "角色卡设计器.exe" 2>nul
timeout /t 1 /nobreak >nul

echo Step 2: Preparing Node.js...
echo.
call prepare-nodejs.bat
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to prepare Node.js
    pause
    exit /b 1
)

echo.
echo Step 3: Cleaning old dist-new...
if exist "dist-new" (
    rmdir /s /q "dist-new" 2>nul
    if exist "dist-new" (
        echo WARNING: Failed to delete dist-new, trying to rename...
        if exist "dist-new-old" rmdir /s /q "dist-new-old" 2>nul
        ren "dist-new" "dist-new-old"
    )
    echo [OK] Cleaned
) else (
    echo [OK] No old build found
)

echo.
echo ========================================
echo Ready for packaging!
echo ========================================
echo.
echo Please run this command in ADMIN PowerShell:
echo   cd "%CD%"
echo   npm run dist:portable
echo.
pause











