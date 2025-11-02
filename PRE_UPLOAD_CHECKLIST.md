# ✅ 上传前检查清单

> 确保一切准备就绪后再上传到 GitHub

---

## 🔒 安全检查

### ⚠️ 必须确认

- [ ] **没有暴露 API 密钥**
  - 检查所有代码文件
  - 确认 `.env` 在 `.gitignore` 中
  
- [ ] **没有个人敏感信息**
  - 检查测试数据
  - 检查注释中的个人信息
  
- [ ] **核心 IP 已保护**
  - ✅ Psyche 提示词已私有化（`DEFAULT_PSYCHE_PROMPT` 不导出）
  - ✅ 只对外提供简化模板（`PROMPT_TEMPLATE`）
  - ✅ 源代码可见，但核心标准不明显暴露

---

## 📝 文档检查

### 必备文档

- [x] **README.md** - 项目介绍和使用说明
- [x] **QUICK_START.md** - 快速开始指南
- [x] **LICENSE** - MIT 许可证
- [x] **GITHUB_UPLOAD.md** - 上传指南
- [x] **WORLDBOOK_GUIDE.md** - 世界书使用指南
- [x] **CUSTOM_PROMPT_GUIDE.md** - 自定义提示词指南
- [x] **.gitignore** - Git 忽略文件

### 文档内容

- [ ] **README.md 中替换 GitHub 仓库链接**
  - 当前：`your-username/psyche-card-designer`
  - 替换为：`你的用户名/psyche-card-designer`

- [ ] **package.json 中更新仓库信息**
  - 当前：`your-username`
  - 替换为：你的 GitHub 用户名

---

## 🧹 代码清理

### 检查点

- [x] **删除旧文件**
  - ✅ START_HERE.md（已删除）
  - ✅ COMPLETE_SETUP.md（已删除）
  - ✅ bmad-data/（空目录，已删除）
  - ✅ src/（旧目录，已删除）
  - ✅ generate-components.js（已删除）

- [ ] **确认 node_modules 不在 Git 中**
  ```bash
  # 运行这个命令，应该看不到 node_modules
  git status
  ```

- [ ] **确认 .next 构建输出不在 Git 中**

---

## ✨ 功能测试

### 核心功能

- [ ] **应用能正常启动**
  ```bash
  npm run dev
  # 访问 http://localhost:3000
  ```

- [ ] **AI 设置可以保存**
  - 打开设置 → 填写 API → 测试连接

- [ ] **角色编辑器正常工作**
  - 切换到"角色编辑器" → 输入信息 → 保存

- [ ] **AI 工作流正常**
  - 切换到"AI 工作流" → 测试至少前2个阶段

- [ ] **导出功能正常**
  - 导出 JSON V3
  - 导出 PNG Card（如果上传了图片）

- [ ] **世界书编辑器正常**
  - 添加条目 → 保存 → 导出

---

## 📦 构建测试

### 生产构建

- [ ] **能成功构建**
  ```bash
  npm run build
  ```

- [ ] **没有 TypeScript 错误**
  ```bash
  # 如果构建成功，就没有错误
  ```

- [ ] **没有 ESLint 警告**（可选）
  ```bash
  npm run lint
  ```

---

## 🌐 部署准备（可选）

### Vercel 部署

如果你想在上传后立即部署到 Vercel：

- [ ] **注册 Vercel 账号**
  - https://vercel.com

- [ ] **安装 Vercel CLI**
  ```bash
  npm i -g vercel
  ```

- [ ] **准备环境变量**
  - 如果有需要在线设置的 API 密钥

---

## 🎯 GitHub 仓库设置

### 上传后立即做

- [ ] **添加仓库描述**
  ```
  Professional AI-powered character card designer with 8-stage workflow, worldbook support, and multi-format export
  ```

- [ ] **添加 Topics**
  ```
  character-card, ai, nextjs, sillytavern, furry, roleplay, pwa, worldbook, psyche
  ```

- [ ] **设置 GitHub Pages**（可选）
  - Settings → Pages → Source: gh-pages

- [ ] **启用 Issues**
  - Settings → Features → Issues ✓

- [ ] **添加 README badge**（可选）
  - 构建状态、License、版本号等

---

## 🔄 最后一步

### 上传前的最后检查

```bash
# 1. 确认当前状态
git status

# 2. 检查即将提交的文件
git add -n .

# 3. 如果一切正常，执行上传
# 参考 GITHUB_UPLOAD.md
```

---

## ✅ 全部完成？

当所有复选框都勾选后，你就可以：

1. 阅读 [GITHUB_UPLOAD.md](./GITHUB_UPLOAD.md)
2. 按照指南上传到 GitHub
3. 🎉 享受成果！

---

## 🆘 如果遇到问题

### 常见问题解决

1. **构建失败**
   ```bash
   # 清理并重新安装
   rm -rf node_modules .next
   npm install
   npm run build
   ```

2. **Git 冲突**
   ```bash
   # 查看冲突文件
   git status
   
   # 解决后继续
   git add .
   git commit -m "Resolve conflicts"
   ```

3. **文件太大**
   ```bash
   # 查看大文件
   du -h -d 1 | sort -h
   
   # 添加到 .gitignore
   echo "大文件路径" >> .gitignore
   ```

---

**准备好了吗？开始上传吧！** 🚀

