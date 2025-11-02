# 📤 上传到 GitHub 指南

> 将 Psyche 角色卡设计器上传到 GitHub

---

## 🚀 快速上传（5分钟）

### 第一步：创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 **+** → **New repository**
3. 填写信息：
   ```
   Repository name: psyche-card-designer
   Description: Professional AI-powered character card designer with 8-stage workflow
   Visibility: Public（或 Private）
   ❌ 不要勾选 "Initialize this repository with a README"
   ```
4. 点击 **Create repository**

---

### 第二步：初始化 Git 并上传

在项目目录打开 PowerShell 或终端，执行以下命令：

```powershell
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交
git commit -m "Initial commit: Psyche Card Designer v1.0"

# 4. 关联远程仓库（替换 YOUR-USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR-USERNAME/psyche-card-designer.git

# 5. 上传到 GitHub
git branch -M main
git push -u origin main
```

---

## 📝 详细步骤

### 如果你没有安装 Git

**Windows**:
```powershell
# 使用 winget 安装
winget install --id Git.Git -e --source winget

# 或下载安装包
# https://git-scm.com/download/win
```

**macOS**:
```bash
# 使用 Homebrew
brew install git

# 或下载安装包
# https://git-scm.com/download/mac
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt install git

# Fedora
sudo dnf install git
```

---

### 配置 Git（首次使用）

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

### 检查文件状态

上传前，可以检查哪些文件会被提交：

```bash
# 查看将要提交的文件
git status

# 查看 .gitignore 是否正确排除了不需要的文件
# 应该看到 node_modules/, .next/, .env 等被忽略
```

**应该被忽略的文件**（已在 `.gitignore` 中）：
- `node_modules/` - 依赖包
- `.next/` - Next.js 构建输出
- `.env` - 环境变量（包含 API 密钥）
- `*.log` - 日志文件

---

### 如果需要更新仓库地址

```bash
# 查看当前远程仓库
git remote -v

# 修改远程仓库地址
git remote set-url origin https://github.com/NEW-USERNAME/psyche-card-designer.git
```

---

## 🔐 保护敏感信息

### ⚠️ 重要提示

上传前，确保以下文件**不会**被上传：

1. **API 密钥**: `.env` 文件（已在 `.gitignore` 中）
2. **node_modules**: 依赖包（已在 `.gitignore` 中）
3. **个人数据**: 本地测试的角色卡数据

### 检查 .gitignore

打开 `.gitignore` 文件，确保包含：

```
# Dependencies
node_modules/

# Next.js
/.next/
/out/

# Local env files
.env
.env*.local

# IDE
.vscode/
.idea/

# Logs
*.log
```

---

## 📦 后续更新

当你修改代码后，可以这样更新 GitHub：

```bash
# 1. 查看修改了哪些文件
git status

# 2. 添加修改的文件
git add .

# 3. 提交
git commit -m "描述你的修改内容"

# 4. 推送到 GitHub
git push
```

---

## 🌟 添加 GitHub Topics（可选）

上传后，在 GitHub 仓库页面：

1. 点击右侧的 ⚙️ **Settings**
2. 在 **Topics** 部分，添加以下标签：
   ```
   character-card
   ai
   nextjs
   sillytavern
   furry
   roleplay
   pwa
   worldbook
   psyche
   ```

这样可以让更多人发现你的项目！

---

## 🎉 完成！

现在你的项目已经在 GitHub 上了！

**仓库地址**：
```
https://github.com/YOUR-USERNAME/psyche-card-designer
```

### 下一步可以做什么？

1. **添加 GitHub Actions**（自动部署到 Vercel）
2. **启用 Issues**（让用户反馈问题）
3. **添加 Star 按钮**（让其他人收藏你的项目）
4. **编写贡献指南** (CONTRIBUTING.md)

---

## ❓ 常见问题

### Q: 上传失败，提示 "Permission denied"

**A**: 需要配置 GitHub 身份验证：

1. **使用 Personal Access Token** (推荐)
   - 前往 GitHub → Settings → Developer settings → Personal access tokens
   - 生成新 Token，勾选 `repo` 权限
   - 用 Token 替代密码

2. **使用 SSH**
   ```bash
   # 生成 SSH 密钥
   ssh-keygen -t ed25519 -C "your.email@example.com"
   
   # 添加到 GitHub
   # Settings → SSH and GPG keys → New SSH key
   ```

---

### Q: 文件太大，无法上传

**A**: GitHub 单文件限制 100MB

- 检查是否误提交了 `node_modules/`
- 使用 Git LFS 处理大文件
- 考虑使用 `.gitignore` 排除大文件

---

### Q: 想要撤销最后一次提交

**A**: 
```bash
# 撤销提交，但保留修改
git reset HEAD~1

# 撤销提交，并放弃修改（危险！）
git reset --hard HEAD~1
```

---

## 📚 更多资源

- [GitHub 官方文档](https://docs.github.com)
- [Git 教程](https://git-scm.com/book/zh/v2)
- [GitHub Desktop](https://desktop.github.com/) - 图形化 Git 工具

---

**祝上传顺利！** 🎊

