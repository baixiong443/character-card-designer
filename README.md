# Psyche 角色卡设计器

<div align="center">

**✨ 基于 BMad 创意写作系统的专业角色卡创作工具**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

**[🚀 立即开始](#-立即开始) | [📱 手机使用](#-手机使用指南) | [⚙️ 配置](#️-ai-配置) | [📖 完整文档](#-完整文档)**

</div>

---

## ✨ 特色功能

### 🎯 核心能力
- **🤖 AI 智能辅助**: 支持 OpenAI、Claude、本地模型等任何 OpenAI 兼容 API
- **📝 8 阶段工作流**: 从基础身份到专项深化的完整创作流程
- **🎨 响应式设计**: 完美适配手机、平板、电脑所有设备
- **📱 PWA 支持**: 可"添加到主屏幕"，像原生 app 一样使用
- **🌏 完整中文界面**: 全中文操作，无语言障碍
- **📦 多格式导出**: JSON V2/V3、PNG Card、Markdown 全支持

### 🔥 专业增强
- **Psyche 系统**: T0-T3 极致感官沉浸描写标准
- **Furry 特化**: F1-F5 完整兽人/拟人角色支持
- **BL/耽美**: 男性特征详细描写（白袜、内裤、脚部、气味）
- **世界书系统**: 完整 SillyTavern 兼容，支持高级触发机制
- **12 种专项类型**: Furry、BL、RPG、恋爱、恐怖、科幻等
- **自定义提示词**: 支持用户自定义 System Prompt（破限专用）
- **智能导入**: 解析现有角色卡并分配到对应阶段

---

## 🚀 立即开始

### 前置要求

- **Node.js** 18.0 或更高 ([下载](https://nodejs.org/))
- **npm** 9.0 或更高

### 安装步骤

```bash
# 1. 进入项目目录
cd psyche-card-designer

# 2. 安装依赖（首次运行，约2-3分钟）
npm install

# 3. 启动开发服务器
npm run dev
```

### 访问应用

- **电脑端**: 打开浏览器访问 http://localhost:3000
- **手机端**: 见下方 [手机使用指南](#-手机使用指南)

---

## 📱 手机使用指南

### 方法 1：局域网访问（推荐）⭐

**步骤**：

1. **确保手机和电脑在同一 WiFi**

2. **查看电脑 IP 地址**：
   ```powershell
   # Windows PowerShell
   ipconfig
   
   # 查找 "IPv4 地址"，例如：192.168.1.100
   ```
   
   ```bash
   # macOS/Linux Terminal
   ifconfig
   # 或
   ip addr show
   ```

3. **手机浏览器打开**：
   ```
   http://你的电脑IP:3000
   
   示例：http://192.168.1.100:3000
   ```

4. **添加到主屏幕**（可选）：
   
   **iOS (Safari)**:
   - 点击分享按钮 (↑)
   - 选择"添加到主屏幕"
   - 确认
   
   **Android (Chrome)**:
   - 点击菜单 (⋮)
   - 选择"安装应用"或"添加到主屏幕"
   - 确认

---

### 方法 2：部署到公网（可选）

如果您想在任何地方访问（不限局域网）：

#### 使用 Vercel 部署（免费）⭐

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 获得公网域名
# 例如：https://psyche-card-designer.vercel.app
```

然后任何设备都可以通过域名访问！

---

## ⚙️ AI 配置

### 首次启动配置

1. 点击右上角"设置"⚙️ 按钮
2. 选择以下配置之一：

### 配置选项

#### 选项 A：OpenAI（最常用）

```
AI 提供商: OpenAI
API 端点: https://api.openai.com/v1/chat/completions
API 密钥: sk-你的密钥
模型: gpt-4 或 gpt-3.5-turbo
温度: 0.8
最大 Token: 2000
```

#### 选项 B：Claude (Anthropic)

```
AI 提供商: Claude (Anthropic)
API 端点: https://api.anthropic.com/v1/messages
API 密钥: sk-ant-你的密钥
模型: claude-3-sonnet-20240229
温度: 0.8
最大 Token: 2000
```

#### 选项 C：本地模型（免费！）⭐

**安装 Ollama**:
```bash
# 1. 下载 Ollama: https://ollama.ai

# 2. 拉取模型
ollama pull llama2
# 或
ollama pull mistral
```

**在应用中配置**:
```
AI 提供商: 自定义
API 端点: http://localhost:11434/v1/chat/completions
API 密钥: (留空)
模型: llama2
温度: 0.8
最大 Token: 2000
```

#### 选项 D：自定义端点

```
AI 提供商: 自定义
API 端点: 您的 API 地址
API 密钥: 您的密钥
模型: 您的模型名称
```

### 测试连接

配置完成后，点击"测试连接"按钮，确保设置正确。

---

## 📖 使用流程

### 1. 角色编辑器

**直接编辑模式**：
- 角色名称
- 简短描述
- 首条消息
- 个性特征
- 场景设定
- 对话示例

适合：快速创建、手动编辑、导入已有角色卡

---

### 2. AI 工作流（推荐）

**8 阶段渐进式创作**：

```
阶段 1: 基础身份
↓ 角色名称、物种、核心性格

阶段 2: 深度背景
↓ 背景故事、动机、经历

阶段 3: 物理描写
↓ 外貌、感官特征、身体细节

阶段 4: 专项深化（可选）
↓ 选择专项类型（Furry/BL/RPG/恋爱/恐怖等12种）
↓ AI 根据类型进行针对性深化

阶段 5: 互动设计
↓ 首条消息、对话示例、语言风格

阶段 6: 世界整合与世界书
↓ 场景、世界书条目、环境、触发机制

阶段 7: 质量检查
↓ 运行 Psyche 质量检查清单

阶段 8: 导出
↓ 选择格式（JSON V2/V3/PNG Card/Markdown）
```

**交互方式**：
- 输入您的想法
- 输入数字选项（AI 会提供 1-9 的选择）
- 点击"下一阶段"继续

---

### 3. 专家增强模式

**在任何阶段可调用**：

- **Psyche 增强** → Sensory Specialist
  - T1: 微观触觉沉浸
  - T2: 多感官饱和描写
  - T3: 互动式对话增强

- **Furry 增强** → Furry Expert
  - F1: 物种身体特征
  - F2: 增强感官（嗅觉、听觉）
  - F3: 物种特异解剖（兽茎、结knot等）
  - F4: 本能行为（发情、标记）
  - F5: 专业术语

---

## 📦 导出格式

### 支持的格式

1. **Character Card V3 JSON** ⭐ 推荐
   - SillyTavern 原生支持
   - 包含所有扩展字段
   - Psyche/Furry 元数据

2. **Character Card V2 JSON**
   - 兼容旧版 SillyTavern
   - 基础字段

3. **PNG Card**
   - 图片嵌入 JSON
   - 拖拽导入 SillyTavern

4. **Markdown Profile**
   - 人类可读文档
   - 用于查看和分享

---

## 🎨 项目结构

```
psyche-card-designer/
├── app/
│   ├── layout.tsx             # 布局和 PWA 配置
│   ├── page.tsx               # 主页面（响应式）
│   ├── globals.css            # 全局样式
│   ├── components/
│   │   ├── SettingsPanel.tsx  # AI 设置面板
│   │   ├── CharacterEditor.tsx# 角色编辑器
│   │   ├── StageFlow.tsx      # AI 工作流（8阶段）
│   │   ├── WorldBookEditor.tsx# 世界书编辑器
│   │   ├── ExportDialog.tsx   # 导出对话框
│   │   ├── ImportCardDialog.tsx# 导入角色卡
│   │   └── ImportTextDialog.tsx# 导入文本分析
│   ├── stores/
│   │   ├── settingsStore.ts   # AI 设置状态
│   │   ├── characterStore.ts  # 角色数据状态
│   │   └── worldbookStore.ts  # 世界书状态
│   ├── services/
│   │   └── aiService.ts       # AI API 服务
│   └── types/
│       └── worldbook.ts       # 世界书类型定义
├── public/
│   ├── manifest.json          # PWA 配置
│   ├── icon-192.png           # PWA 图标
│   └── icon-512.png
├── WORLDBOOK_GUIDE.md         # 世界书使用指南
├── CUSTOM_PROMPT_GUIDE.md     # 自定义提示词指南
└── package.json
```

---

## 💡 常见问题

### Q: 我没有 OpenAI API 密钥怎么办？

**A**: 可以使用：
1. **本地模型**（Ollama/LM Studio）- 完全免费
2. **第三方 API 代理** - 通常更便宜
3. **Claude API** - Anthropic 官方

---

### Q: Psyche 模式会被 AI 拒绝吗？

**A**: 系统内置完整的 Jailbreak 机制：
- Roleplay 框架
- 虚构声明
- 反拒绝指令
- Token 走私（世界书注入）

大部分模型可以正常工作。如果仍被拒绝：
1. 使用本地模型（无限制）
2. 调整 Jailbreak 强度
3. 更换 AI 提供商

---

### Q: 生成的角色卡能在哪些平台使用？

**A**: 完全兼容：
- ✅ SillyTavern
- ✅ Agnaistic
- ✅ RisuAI
- ✅ 任何支持 Character Card V3 的平台

---

### Q: 应用是否联网？数据安全吗？

**A**: 
- 应用本身不联网
- 仅在调用 AI API 时联网
- 所有数据保存在本地浏览器
- API 密钥加密存储（localStorage）

---

### Q: 手机能完整使用所有功能吗？

**A**: 
- ✅ 完全支持！界面已针对移动端优化
- ✅ 触摸手势友好
- ✅ 虚拟键盘适配
- ✅ PWA 支持离线缓存
- ✅ 可添加到主屏幕

---

## 🔧 开发指南

### 添加新功能

```bash
# 1. 创建新组件
src/components/YourComponent.tsx

# 2. 创建状态管理（如需要）
src/stores/yourStore.ts

# 3. 在 page.tsx 中集成
```

### 修改 BMad 规则

```bash
# 编辑规则文件
bmad-data/data/psyche-rules.md
bmad-data/data/male-features-guide.md
# ... 等

# 无需重启，刷新页面即可
```

### 调试

```bash
# 开发者工具
浏览器 F12 或 Ctrl+Shift+I

# 查看控制台日志
Console 标签

# 查看网络请求
Network 标签
```

---

## 🚀 构建生产版本

```bash
# 构建
npm run build

# 预览
npm run start

# 部署到 Vercel（推荐）
vercel --prod
```

---

## 📚 完整文档

- **[世界书使用指南](./WORLDBOOK_GUIDE.md)** - 详细的世界书创建和使用教程
- **[自定义提示词指南](./CUSTOM_PROMPT_GUIDE.md)** - 如何编写自定义 System Prompt

---

## 🎉 开始创作！

```bash
# 立即运行
npm run dev

# 浏览器打开
http://localhost:3000

# 手机访问
http://你的IP:3000

# 配置 AI → 开始创作！
```

---

## 📄 许可证

MIT License - 自由使用、修改、分发

---

## 🙏 致谢

- **BMad Method**: 核心框架
- **Psyche System**: 创意写作规则
- **SillyTavern**: Character Card 规范
- **Next.js Team**: 优秀的 React 框架
- **社区贡献者**: 测试和反馈

---

<div align="center">

**祝创作愉快！🎉**

有问题或建议？欢迎提 Issue！

</div>
