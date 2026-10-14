@echo off
chcp 65001 >nul
title 角色卡设计器 - 创建分发包（免Electron版）

echo.
echo ════════════════════════════════════════════
echo    角色卡设计器 - 分发包创建工具
echo ════════════════════════════════════════════
echo.
echo 本工具将创建一个压缩包，用户解压后双击启动即可
echo 无需 Electron，无需打包，100%% 可靠！
echo.

REM 检查构建
if not exist ".next" (
    echo ❌ 未找到 .next 文件夹！
    echo 请先运行: npm run build
    pause
    exit /b 1
)

echo ✅ 检查通过
echo.

REM 创建临时发布目录
set RELEASE_DIR=release-temp
if exist "%RELEASE_DIR%" rd /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"

echo 📦 正在复制必要文件...
echo.

REM 复制核心文件
echo [1/7] 复制 .next...
xcopy /E /I /Q ".next" "%RELEASE_DIR%\.next" >nul

echo [2/7] 复制 node_modules...
xcopy /E /I /Q "node_modules" "%RELEASE_DIR%\node_modules" >nul

echo [3/7] 复制 public...
xcopy /E /I /Q "public" "%RELEASE_DIR%\public" >nul

echo [4/7] 复制 app...
xcopy /E /I /Q "app" "%RELEASE_DIR%\app" >nul

echo [5/7] 复制配置文件...
copy /Y "package.json" "%RELEASE_DIR%\" >nul
copy /Y "next.config.ts" "%RELEASE_DIR%\" >nul

echo [6/7] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title 角色卡设计器
echo.
echo ════════════════════════════════════════════
echo    角色卡设计器 - Character Card Designer
echo ════════════════════════════════════════════
echo.
echo 🚀 正在启动...
echo.
echo 💡 提示：
echo    - 应用将在浏览器中自动打开
echo    - 地址：http://localhost:3000
echo    - 关闭本窗口将停止服务
echo.
echo ════════════════════════════════════════════
echo.
echo.
echo ⏳ 正在加载，请稍候...
echo.
echo.
REM 检查Node.js
echo where node ^>nul 2^>^&1
echo if %%ERRORLEVEL%% NEQ 0 ^(
echo     cls
echo     echo.
echo     echo ════════════════════════════════════════════
echo     echo    ❌ 未检测到 Node.js！
echo     echo ════════════════════════════════════════════
echo     echo.
echo     echo 本程序需要 Node.js 运行环境。
echo     echo.
echo     echo 📥 正在打开 Node.js 下载页面...
echo     echo.
echo     echo 请下载并安装 LTS 版本，然后重新运行本程序。
echo     echo.
echo     pause
echo     start https://nodejs.org/zh-cn/download/
echo     exit /b 1
echo ^)
echo.
echo cls
echo echo.
echo echo ════════════════════════════════════════════
echo echo    ✅ 正在启动服务器...
echo echo ════════════════════════════════════════════
echo echo.
echo.
REM 延迟2秒后打开浏览器
echo start /b timeout /t 2 ^>nul ^&^& start http://localhost:3000
echo.
REM 启动Next.js
echo call npx next start -p 3000
echo.
echo pause
) > "%RELEASE_DIR%\启动 - 双击我.bat"

echo [7/7] 创建说明文档...
(
echo # 角色卡设计器 - 使用说明
echo.
echo ## 📥 安装步骤
echo.
echo ### 第一步：安装 Node.js（仅首次需要）
echo.
echo 1. 访问 https://nodejs.org/zh-cn/download/
echo 2. 下载 LTS 版本（推荐 v20 或 v22）
echo 3. 双击安装，一路默认即可
echo.
echo ### 第二步：运行程序
echo.
echo 1. 双击 "启动 - 双击我.bat"
echo 2. 等待3-5秒，程序会自动在浏览器中打开
echo 3. 开始使用！
echo.
echo ## ⚙️ 配置 AI
echo.
echo 首次使用需要配置 AI 接口：
echo.
echo 1. 点击右上角的 ⚙️ 图标
echo 2. 填写你的 API 端点和密钥
echo 3. 点击"测试连接"
echo 4. 连接成功后即可使用
echo.
echo ## 💡 常见问题
echo.
echo ### Q: 打开后白屏？
echo A: 等待10-20秒，首次启动需要编译。
echo.
echo ### Q: 提示端口被占用？
echo A: 其他程序占用了3000端口，请关闭后重试。
echo.
echo ### Q: 如何关闭程序？
echo A: 关闭命令行窗口即可。
echo.
echo ### Q: 数据保存在哪里？
echo A: 保存在浏览器本地，关闭程序不会丢失。
echo.
echo ## 🎉 开始创作！
echo.
echo 现在你可以：
echo - 创建角色卡
echo - 使用 Psyche 9阶段工作流
echo - 生成世界书
echo - 导出为 JSON/PNG/Markdown
echo.
echo 祝创作愉快！
) > "%RELEASE_DIR%\使用说明.txt"

echo.
echo ✅ 文件复制完成！
echo.

REM 压缩成zip
echo 🗜️  正在压缩...
echo.

set VERSION=1.0.0
set ZIP_NAME=角色卡设计器-v%VERSION%-免安装版.zip

REM 使用PowerShell压缩（Windows自带）
powershell -command "Compress-Archive -Path '%RELEASE_DIR%\*' -DestinationPath '%ZIP_NAME%' -Force"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 压缩失败！
    echo 请手动压缩 %RELEASE_DIR% 文件夹
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════
echo    🎉 创建成功！
echo ════════════════════════════════════════════
echo.
echo 📦 生成的文件：
echo    %ZIP_NAME%
echo.

REM 显示文件大小
for %%A in ("%ZIP_NAME%") do set SIZE=%%~zA
set /a SIZE_MB=%SIZE% / 1048576
echo 📊 文件大小：%SIZE_MB% MB
echo.

echo ════════════════════════════════════════════
echo    📤 下一步
echo ════════════════════════════════════════════
echo.
echo 1. 上传到网盘或 GitHub Releases
echo 2. 分享下载链接给用户
echo 3. 用户解压后双击"启动 - 双击我.bat"即可使用
echo.
echo ════════════════════════════════════════════

REM 清理临时目录
echo.
echo 🧹 清理临时文件...
rd /s /q "%RELEASE_DIR%"

echo.
echo ✅ 完成！
echo.

pause









