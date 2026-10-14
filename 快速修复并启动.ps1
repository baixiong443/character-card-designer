# Psyche 快速修复和启动脚本

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Psyche 快速修复和启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 第1步：清理缓存
Write-Host "[1/4] 清理缓存..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue
Remove-Item -Force compile_output.txt -ErrorAction SilentlyContinue
Write-Host "✓ 缓存已清理" -ForegroundColor Green

Write-Host ""

# 第2步：清理 node_modules 缓存
Write-Host "[2/4] 清理 node_modules 缓存..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Write-Host "✓ node_modules 缓存已清理" -ForegroundColor Green

Write-Host ""

# 第3步：安装依赖
Write-Host "[3/4] 安装依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 依赖安装失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}
Write-Host "✓ 依赖已安装" -ForegroundColor Green

Write-Host ""

# 第4步：启动开发服务器
Write-Host "[4/4] 启动开发服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "服务器将在 http://localhost:3000 启动" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host ""

npm run dev
