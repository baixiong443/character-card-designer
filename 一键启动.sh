#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "===================================="
echo "   角色卡设计器 - 一键启动工具"
echo "===================================="
echo ""

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Node.js！${NC}"
    echo ""
    echo "📥 请先安装 Node.js："
    echo "   macOS: brew install node"
    echo "   Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   或访问：https://nodejs.org/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Node.js 已安装${NC}"
node -v
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    echo "⏳ 这可能需要 2-3 分钟，请耐心等待..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ 依赖安装失败！${NC}"
        echo "💡 请检查网络连接，或尝试切换 npm 镜像源"
        echo ""
        exit 1
    fi
    echo ""
    echo -e "${GREEN}✅ 依赖安装完成！${NC}"
    echo ""
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
    echo ""
fi

# 获取本机IP地址
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0)
    if [ -z "$IP" ]; then
        IP=$(ipconfig getifaddr en1)
    fi
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

echo "===================================="
echo "   🚀 正在启动服务器..."
echo "===================================="
echo ""
echo "📱 访问地址："
echo -e "   ${CYAN}💻 本机访问: http://localhost:3000${NC}"
if [ ! -z "$IP" ]; then
    echo -e "   ${CYAN}📱 手机访问: http://$IP:3000${NC}"
fi
echo ""
echo "💡 提示："
echo "   - 确保手机和电脑在同一WiFi下"
echo "   - 按 Ctrl+C 可停止服务器"
echo ""
echo "===================================="
echo ""

# 启动开发服务器
npm run dev


