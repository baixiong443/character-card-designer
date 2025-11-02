# 📦 安装说明

> 确保你能成功运行 Psyche 角色卡设计器

---

## ⚡ 快速安装（3 步）

### 1. 克隆仓库

```bash
# 方式A：使用 Git（推荐）
git clone https://github.com/USERNAME/psyche-card-designer.git
cd psyche-card-designer

# 方式B：下载 ZIP
# 点击 GitHub 页面的 "Code" → "Download ZIP"
# 解压后进入文件夹
```

### 2. 安装依赖

```bash
npm install
```

**等待时间**: 约 2-3 分钟（首次安装）

**如果安装缓慢**（国内用户）：
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 3. 启动应用

```bash
npm run dev
```

**打开浏览器**: http://localhost:3000

---

## ✅ 检查是否成功

启动后，你应该看到：

```
✓ Ready on http://localhost:3000
```

**浏览器应该显示**:
- 顶部导航栏（角色编辑器 / AI 工作流）
- 右上角设置按钮 ⚙️
- 中文界面

---

## ❓ 遇到问题？

### 问题 1：`npm: command not found`

**原因**: 没有安装 Node.js

**解决**:
1. 下载 Node.js: https://nodejs.org
2. 选择 **LTS 版本**（推荐）
3. 安装后重启终端
4. 验证: `node --version` 和 `npm --version`

---

### 问题 2：`npm install` 失败

**常见原因和解决方案**:

**A. 网络问题**（国内常见）
```bash
# 使用镜像
npm config set registry https://registry.npmmirror.com
npm install
```

**B. 权限问题**（macOS/Linux）
```bash
# 不要用 sudo！改用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
npm install
```

**C. 缓存问题**
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### 问题 3：`npm run dev` 后端口被占用

**错误信息**: `Port 3000 is already in use`

**解决**:
```bash
# 方式A：使用其他端口
npm run dev -- --port 3001

# 方式B：关闭占用端口的进程（Windows）
netstat -ano | findstr :3000
taskkill /PID <进程号> /F

# 方式B：关闭占用端口的进程（macOS/Linux）
lsof -ti:3000 | xargs kill -9
```

---

### 问题 4：浏览器显示空白页

**检查步骤**:

1. **打开浏览器控制台** (F12)
2. **查看 Console 标签**
3. **是否有错误信息？**

**常见原因**:
- Next.js 还在编译（等待 1-2 分钟）
- 浏览器缓存问题（Ctrl+Shift+R 强制刷新）
- 端口错误（确认访问 localhost:3000）

---

### 问题 5：TypeScript 编译错误

**如果看到类似错误**:
```
Failed to compile
Type error: ...
```

**解决**:
```bash
# 清理并重建
rm -rf .next
npm run dev
```

---

## 📱 手机访问设置

### 查看电脑 IP

**Windows**:
```powershell
ipconfig
# 找到 "IPv4 地址"，例如：192.168.1.100
```

**macOS**:
```bash
ifconfig en0 | grep inet
# 或者：系统偏好设置 → 网络
```

**Linux**:
```bash
hostname -I
# 或者：ip addr show
```

### 手机浏览器访问

```
http://你的电脑IP:3000

例如：http://192.168.1.100:3000
```

**前提条件**:
- ✅ 手机和电脑在同一 WiFi
- ✅ 防火墙允许端口 3000

---

## 🔧 系统要求

### 最低要求
- **Node.js**: 18.0 或更高
- **内存**: 2GB+
- **存储**: 500MB+（包含 node_modules）
- **浏览器**: Chrome/Edge/Safari/Firefox 最新版

### 推荐配置
- **Node.js**: 20.x LTS
- **内存**: 4GB+
- **网络**: 稳定连接（首次下载依赖）

---

## 🎯 下一步

安装成功后：

1. **配置 AI** → 查看 [QUICK_START.md](./QUICK_START.md)
2. **开始创作** → 使用 AI 工作流
3. **查看文档** → 阅读 [README.md](./README.md)

---

## 🆘 仍然无法解决？

1. **查看 Issues**: https://github.com/USERNAME/psyche-card-designer/issues
2. **提交新 Issue**: 描述你的问题、错误信息、系统环境
3. **提供信息**:
   - 操作系统和版本
   - Node.js 版本 (`node --version`)
   - npm 版本 (`npm --version`)
   - 完整的错误信息

---

**祝安装顺利！** 🎉

