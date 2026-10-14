@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Psyche 构建诊断工具
echo ========================================
echo.

echo [检查 1] Node.js 版本
call node --version
echo.

echo [检查 2] npm 版本
call npm --version
echo.

echo [检查 3] 检查 package.json 完整性
if exist package.json (
    echo ✓ package.json 存在
) else (
    echo ✗ package.json 不存在
)
echo.

echo [检查 4] 检查 node_modules
if exist node_modules (
    echo ✓ node_modules 存在
    echo   大小: 
    for /f %%A in ('dir /s /b node_modules ^| find /c /v ""') do echo   %%A 个文件
) else (
    echo ✗ node_modules 不存在，需要运行 npm install
)
echo.

echo [检查 5] 检查 .next 缓存
if exist .next (
    echo ⚠ .next 缓存存在（可能导致问题）
    echo   建议删除: rmdir /s /q .next
) else (
    echo ✓ .next 缓存不存在
)
echo.

echo [检查 6] 检查 TypeScript 配置
if exist tsconfig.json (
    echo ✓ tsconfig.json 存在
) else (
    echo ✗ tsconfig.json 不存在
)
echo.

echo [检查 7] 检查 next.config.ts
if exist next.config.ts (
    echo ✓ next.config.ts 存在
) else (
    echo ✗ next.config.ts 不存在
)
echo.

echo [检查 8] 尝试构建（仅检查，不输出完整日志）
echo 这可能需要几分钟...
timeout /t 3 /nobreak
call npm run build > build_test.log 2>&1
if errorlevel 1 (
    echo ✗ 构建失败，查看 build_test.log 获取详情
    echo.
    echo 最后 20 行错误信息:
    powershell -Command "Get-Content build_test.log -Tail 20"
) else (
    echo ✓ 构建成功
    del build_test.log
)
echo.

echo ========================================
echo 诊断完成
echo ========================================
pause
