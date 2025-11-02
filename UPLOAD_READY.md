# 🚀 准备上传到 GitHub

> 项目已准备就绪！按照以下步骤上传

---

## ✅ 已完成的准备工作

- ✅ Git 已初始化
- ✅ 所有文件已提交
- ✅ 构建测试通过
- ✅ 文档完整
- ✅ 移除了硬编码地址（使用 USERNAME 占位符）
- ✅ .gitignore 配置正确

---

## 📤 上传步骤

### 1. 在 GitHub 创建仓库

1. 登录 https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写：
   ```
   Repository name: psyche-card-designer
   Description: Professional AI character card designer with 8-stage workflow
   Public ✓
   ❌ 不要勾选任何初始化选项
   ```
4. 点击 **Create repository**

---

### 2. 关联并推送

复制你的 GitHub 用户名，然后在项目目录执行：

```powershell
# 替换 YOUR_GITHUB_USERNAME 为你的真实用户名
$username = "YOUR_GITHUB_USERNAME"

# 关联远程仓库
git remote add origin "https://github.com/$username/psyche-card-designer.git"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

**或者一步步执行**：

```powershell
# 1. 关联远程仓库（替换 YOUR_GITHUB_USERNAME）
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/psyche-card-designer.git

# 2. 重命名分支为 main
git branch -M main

# 3. 推送
git push -u origin main
```

---

### 3. 上传后修改占位符

上传成功后，在 GitHub 网页端修改以下文件，将 `USERNAME` 替换为你的真实用户名：

**需要修改的文件**：
1. `package.json`（第 10, 13, 15 行）
2. `INSTALL.md`（多处 GitHub 链接）
3. `GITHUB_UPLOAD.md`（示例中的链接）

**或者在本地修改后重新推送**：

```powershell
# 1. 批量替换（PowerShell）
$files = "package.json", "INSTALL.md", "GITHUB_UPLOAD.md", "README.md"
foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace 'USERNAME', '你的用户名' | Set-Content $file
    }
}

# 2. 提交并推送
git add .
git commit -m "docs: Update GitHub username"
git push
```

---

## 🎯 上传后立即做

### A. 添加仓库描述和主题

在 GitHub 仓库页面：

1. 点击右侧 ⚙️ → **About**
2. 填写描述：
   ```
   Professional AI character card designer with 8-stage workflow, worldbook support, and multi-format export (JSON/PNG/Markdown). Fully compatible with SillyTavern.
   ```
3. 添加主题标签：
   ```
   character-card
   ai
   nextjs
   sillytavern
   furry
   roleplay
   pwa
   worldbook
   typescript
   react
   ```

### B. 更新 README 徽章（可选）

在 `README.md` 开头添加：

```markdown
[![GitHub stars](https://img.shields.io/github/stars/你的用户名/psyche-card-designer)](https://github.com/你的用户名/psyche-card-designer/stargazers)
[![GitHub license](https://img.shields.io/github/license/你的用户名/psyche-card-designer)](https://github.com/你的用户名/psyche-card-designer/blob/main/LICENSE)
```

---

## 🌟 推荐：立即部署到 Vercel

让用户可以在线使用：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

---

## 📋 检查清单

上传前最后确认：

- [ ] GitHub 仓库已创建
- [ ] 你的 GitHub 用户名已准备好
- [ ] 已在项目目录（psyche-card-designer）
- [ ] 网络连接正常

---

## ❓ 可能的问题

### 问题：`git push` 要求输入密码

**解决**：使用 Personal Access Token

1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. 勾选 `repo` 权限
4. 生成后复制 token
5. 推送时用 token 替代密码

### 问题：`remote origin already exists`

**解决**：
```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/psyche-card-designer.git
```

---

## 🎉 完成！

上传成功后，你的项目地址：
```
https://github.com/你的用户名/psyche-card-designer
```

**分享给朋友**，让他们试试吧！ 🚀

