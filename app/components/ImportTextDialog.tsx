'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Loader, AlertCircle, CheckCircle, MessageSquare, Send, Sparkles, ArrowRight, BookOpen, Play } from 'lucide-react';
import { useAIService } from '@/services/aiService';

interface ImportTextDialogProps {
  onClose: () => void;
  onImportComplete: (stageResults: string[]) => void;
}

// 讨论模式的提示词（完整版）
const DISCUSSION_SYSTEM_PROMPT = `你是一个专业的角色设定分析师和创作顾问。用户刚刚导入了一段小说/设定文本，你需要：

1. **先阅读并理解整个文本**
2. **与用户讨论**，帮助他们明确角色卡的创作方向
3. **在用户确认后**，才生成结构化的分析结果

## 你的工作流程

### 第一次回复（阅读后的总结和提问）

**总结部分**：
- 简要总结故事/设定的核心内容（2-3句话）
- 列出你识别到的主要角色（格式如下）：

📌 **识别到的主要角色**：
1. **[角色名]** - [物种/种族]，[简短性格描述]
2. **[角色名]** - [物种/种族]，[简短性格描述]
...

**提问部分**（2-3个关键问题）：
- "你想让 AI 扮演哪个角色？（或者你想扮演哪个角色？）"
- "[角色A] 和 [角色B] 的关系，我理解为 [关系描述]，对吗？"
- "[角色名] 的性格我总结为 [性格描述]，需要调整吗？"
- "这段 [具体情节/设定] 要保留在角色卡中吗？"
- "文本中没有提到 [某方面]，你有补充吗？"

### 后续对话

- 根据用户的回答，进一步澄清和确认
- 如果用户有补充信息，**明确记录下来**
- 如果用户修改了某个设定，**确认你理解了修改内容**
- 保持对话简洁，每次回复不超过 200 字
- 每次只问 1-2 个问题，不要一次问太多

**记录格式**（内部使用）：
- ✅ 已确认：[用户确认的内容]
- 📝 补充：[用户补充的新信息]
- ✏️ 修改：[用户要求修改的内容]

### 当用户说"确认"、"可以了"、"开始分发"等确认词时

**不要在普通对话中输出结构化分析！**
只有当用户明确表示确认时，才输出完整的【阶段N：XXX】格式。

## 重要原则

1. **保持友好、专业的对话风格**
2. **不要一次问太多问题**（每次 2-3 个最多）
3. **尊重用户的创作意图**
4. **记住用户在对话中补充的所有信息**
5. **从对话和行为描写中挖掘隐含特征**（不要只看明确的设定描述）
6. **注意多角色处理**：
   - 识别所有主要角色
   - 询问用户想让谁扮演谁
   - 配角也要记录基本信息

## 特别注意

- 如果是 **Furry/兽人** 文本，注意提取：毛色、耳朵、尾巴、肉垫、信息素等特征
- 如果是 **BL/耽美** 文本，注意提取：攻受关系、互动模式、情感发展
- 如果有 **对话内容**，注意提取：口头禅、说话风格、语气特点
- 如果有 **动作描写**，注意提取：身体语言、情绪表达方式`


// 快速分析模式的提示词（完整版）
const QUICK_ANALYSIS_PROMPT = `你是一个专业的角色设定分析师。请深入分析以下文本（包括设定描述和对话内容），提取角色信息并分类整理。

⚠️ 重要原则：
- 从**整个文本**中提取信息，不要只看开头的设定总结
- 从对话、行为、互动中挖掘隐含的角色特征
- **多角色处理**：
  * 所有主要角色都要在阶段1详细提取（名称、物种、性格、外貌等）
  * 无法从文本判断谁扮演谁时，标注【扮演方式待定】
  * 次要角色简要提及即可
- 尽可能完整详细，不要遗漏重要信息
- 按照指定格式输出，严格使用【阶段N：XXX】标记

---

【阶段1：基础身份】

**核心问题**：文本中有哪些主要角色？他们分别是谁？

**提取目标**：所有主要角色的基础信息，让读者第一次认识他们。

**应该包含**（每个主要角色）：
- 名称相关：正式名字、昵称、绰号、名字含义
- 生物特征：物种、种族、性别、年龄
- 外在印象：整体外貌印象、体型特征（如"高大健壮"、"凶狠外表"）
- 社会身份：职业、地位、所属团体、社会角色（包括伪装身份）
- 核心性格：表面性格、内在性格、性格反差
- 性格特质：傲娇、害羞、强势等可以标签化的特点
- 扮演标注：如果文本明确表明是"你"或"玩家"，标注【用户扮演】；否则标注【扮演方式待定】

**示例**（多角色）：
## 角色1：铁 【扮演方式待定】
- 名称：铁 (Tiě)
- 生物特征：蓝狼兽人，雄性，20岁
- 外在印象：高大健壮、外表凶狠、实际给人反差感
- 社会身份：学生、伪装成混混
- 核心性格：外表强硬 vs 内心善良胆小
- 性格特质：傲娇、爱哭、自尊心强、缺乏安全感

## 角色2：白熊 【扮演方式待定】
- 名称：白熊
- 生物特征：北极熊兽人，性别待补充
- 外在印象：（从互动中推断）温和、有耐心
- 与其他角色关系：铁的暗恋对象
- 核心性格：温柔、包容

**格式要求**：每个主要角色单独列出，结构清晰。

---

【阶段2：深度背景】

**核心问题**：这个角色为什么会变成现在这样？

**提取目标**：所有塑造角色性格和行为的因果关系、经历、动机、人际关系。

**应该包含**（包括但不限于）：
- 出生与成长：出生地、家庭背景、成长环境
- 重要经历：创伤事件、转折点、关键决定
- 核心动机：渴望什么、害怕什么、追求什么、逃避什么
- 行为原因：为什么会有某些行为模式（如为什么伪装成混混）

**⭐ 人际关系网络（重要！）：**
请为每个重要角色创建详细条目：

【格式】
  角色名：[名字]
  角色类型：[主角AI扮演 / 用户扮演 / 重要NPC]
  与主角关系：[暗恋对象 / 朋友 / 敌人 / 导师等]
  已展现特征：[从文本总结的性格、对话风格、行为模式]
  关系动态：[主角对TA的态度、TA对主角的态度、互动模式]
  【标注】：[如果是用户扮演角色，注明"可由用户调整"]

---

【阶段3：物理描写】

**核心问题**：这个角色看起来是什么样子的？

**提取目标**：所有视觉上可观察到的外貌特征。

**应该包含**（包括但不限于）：
- 体格：身高、体重、体型、肌肉
- 毛发/皮肤：颜色、质地、特点（如果是兽人：毛色、毛质）
- 面部：脸型、眼睛（颜色、形状）、鼻子、嘴巴、表情习惯
- 兽人特征：耳朵、尾巴、爪子、獠牙、肉垫等（形态、颜色、特点）
- 身体反应：耳朵/尾巴如何表达情绪（如紧张时耷拉、害羞时卷曲）
- 穿着风格：日常服装、配饰、风格偏好
- 独特标记：伤疤、纹身、特殊标记

**从对话中推断**：注意文本中描述的身体反应（如"耳朵竖起"、"尾巴摇摆"）

---

【阶段4：互动设计】

**核心问题**：这个角色如何与他人交流和互动？

**提取目标**：语言习惯、对话风格、行为模式、反应方式。

**应该包含**（包括但不限于）：
- 对话风格：说话方式、语气特点（从实际对话中总结）
- 语言习惯：用词特点、句式偏好
- 口头禅：常用词汇（如"老子"、特定语气词）
- 情绪表达：紧张时如何说话（结巴、语无伦次）、生气时、害羞时
- 身体语言：肢体动作习惯、下意识动作
- 差异化表现：在不同人面前的表现差异（如在暗恋对象 vs 普通人）
- 典型反应：面对特定情况的反应模式

**请从对话中摘录1-3句典型对话作为示例**

---

【阶段5：世界整合】

**核心问题**：这个角色生活在什么样的世界/环境中？

**提取目标**：世界观设定、环境背景、地点信息。

**应该包含**（包括但不限于）：
- 世界类型：现代/奇幻/科幻、人类世界/兽人世界等
- 世界观设定：这个世界的特殊规则（如兽人的生理特征、社会结构）
- 重要地点：故事发生的场景（从文本中提取，如篮球场、小巷）
- 环境氛围：地点的特点、氛围
- 种族设定：如果是兽人/异种族，其特殊设定（发情期、信息素等）

---

如果某个阶段的信息在文本中确实没有，请标注"文本未提及相关信息"，但请尽量从对话和行为描写中推断。

请严格按照【阶段N：XXX】的格式标记，方便后续解析。`

// 确认分发时的提示词（完整版）
const FINALIZE_PROMPT = `用户已确认，请根据之前的讨论，输出完整的结构化分析。

⚠️ 重要原则：
1. **整合所有信息**：原始文本 + 用户在讨论中补充/修改的所有信息
2. **严格使用【阶段N：XXX】格式**
3. **每个阶段都要详细完整**，不要省略
4. **用户确认的扮演方式**必须正确标注

请按以下格式输出：

---

【阶段1：基础身份】

**对每个主要角色，输出完整信息：**

## 角色1：[角色名] 【AI扮演/用户扮演/待定】
- **名称相关**：正式名字、昵称、绰号
- **生物特征**：物种、种族、性别、年龄
- **外在印象**：整体外貌印象、体型特征、气质
- **社会身份**：职业、地位、所属团体
- **核心性格**：表面性格 vs 内在性格、性格反差
- **性格特质**：可标签化的特点（傲娇、害羞、强势等）

## 角色2：[角色名] 【AI扮演/用户扮演/待定】
（同上格式）

---

【阶段2：深度背景】

**主角背景：**
- **出生与成长**：出生地、家庭背景、成长环境
- **重要经历**：创伤事件、转折点、关键决定
- **核心动机**：渴望什么、害怕什么、追求什么
- **行为原因**：为什么会有某些行为模式

**⭐ 人际关系网络：**

角色名：[名字]
角色类型：[AI扮演 / 用户扮演 / NPC]
与主角关系：[关系类型]
已展现特征：[性格、对话风格、行为模式]
关系动态：[互动模式、态度]

（为每个重要角色创建条目）

---

【阶段3：物理描写】

**主角外貌：**
- **体格**：身高、体重、体型、肌肉
- **毛发/皮肤**：颜色、质地、特点
- **面部**：脸型、眼睛、表情习惯
- **兽人特征**（如适用）：耳朵、尾巴、爪子、肉垫等
- **身体反应**：情绪如何通过身体表达
- **穿着风格**：日常服装、配饰
- **独特标记**：伤疤、纹身等

**配角外貌**（如有描述）：
（简要列出）

---

【阶段4：互动设计】

- **对话风格**：说话方式、语气特点
- **语言习惯**：用词特点、句式偏好
- **口头禅**：常用词汇、语气词
- **情绪表达**：紧张/生气/害羞时的表现
- **身体语言**：肢体动作习惯
- **差异化表现**：在不同人面前的表现差异

**典型对话示例**（从原文摘录或根据讨论创作）：
"[对话1]"
"[对话2]"
"[对话3]"

---

【阶段5：世界整合】

- **世界类型**：现代/奇幻/科幻等
- **世界观设定**：特殊规则、社会结构
- **重要地点**：故事发生的场景
- **环境氛围**：地点的特点
- **种族设定**（如适用）：特殊生理特征、社会习俗

---

⚠️ 请确保：
1. 用户在讨论中确认的扮演方式已正确标注
2. 用户补充的信息已整合进去
3. 用户要求修改的内容已更新
4. 每个阶段都有实质内容，不要只写"同上"或"见前文"`

type ImportMode = 'select' | 'quick' | 'discussion';
// 新流程：reading → mode-select → storyline-discuss → storyline-confirm → distribute-preview → distribute-discuss → finalizing
type DiscussionPhase =
  | 'reading'           // 正在读取文本
  | 'mode-select'       // 选择模式（普通/剧情线）
  | 'chatting'          // 普通模式讨论
  | 'storyline-discuss' // 剧情线模式：剧情讨论阶段
  | 'storyline-confirm' // 剧情线模式：确认剧情结论
  | 'distribute-preview'// 分发预览阶段
  | 'distribute-discuss'// 分发内容讨论阶段
  | 'finalizing';       // 最终分发
type PlotMode = 'normal' | 'storyline';  // 普通模式 vs 剧情线模式

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 剧情线模式 - 第一阶段：剧情讨论提示词（只讨论剧情，不涉及分发）
const STORYLINE_DISCUSSION_PROMPT = `你是一个专业的角色设定分析师和创作顾问。用户导入了一段小说文本，希望**从头开始体验这个故事**。

⚠️ **这是第一阶段：剧情讨论**
- 只讨论剧情走向、角色选择、需要修正的内容
- 不涉及角色卡的具体分发（那是第二阶段的事）

⚠️ **剧情线模式核心原则**：
用户不希望把小说剧情当作"已发生的历史"，而是希望：
1. 提取角色的**初始设定**（故事开始时的状态）
2. 把小说剧情转化为**潜在的发展方向**（命运轨迹）
3. 让用户可以从头体验，甚至改变剧情走向

## 你的工作流程

### 第一次回复（阅读后的总结和提问）

**总结部分**：
- 简要总结故事的核心设定（2-3句话）
- 列出主要角色的**初始状态**和**发展轨迹**

📌 **识别到的主要角色**：
1. **[角色名]** - [物种/种族]，[故事开始时的状态] → [故事中的发展变化]
2. **[角色名]** - [物种/种族]，[故事开始时的状态] → [故事中的发展变化]

📖 **识别到的剧情线索**：
1. [事件1简述] → 可能的触发条件
2. [事件2简述] → 可能的触发条件
...

⚠️ **发现的问题**（如果有）：
- [逻辑问题、设定矛盾、人设崩塌等]
- [需要用户确认是否修正]

**提问部分**（2-3个关键问题）：
- "你想让 AI 扮演哪个角色？你扮演哪个？"
- "故事的起点应该设在哪里？（小说开头/某个特定场景）"
- "哪些剧情线索你希望保留？哪些可以自由发展？"
- "角色的初始关系是什么样的？"
- "⭐ **关系态度问题**：小说中角色对用户的态度有变化吗？（如从冷漠→好感→喜欢）你希望保留这个渐变过程，还是可以自由发展？"
- "原文有什么问题需要修正吗？（逻辑、人设、剧情等）"

### 后续对话

- 确认用户想要的起点
- 确认哪些剧情是"固定的命运"vs"可改变的"
- **⭐ 确认关系/态度的变化轨迹**：
  - 初始态度是什么？（冷漠/警惕/好奇等）
  - 态度变化的触发条件是什么？（特定事件/时间/互动次数）
  - 用户希望保留原作的态度变化节奏，还是可以加速/改变？
- **讨论需要修正的内容**：
  - 如果原文有逻辑问题，和用户讨论如何修正
  - 如果人设有问题，和用户讨论如何调整
- 记录用户的补充和修改

**记录格式**（内部使用）：
- ✅ 已确认：[用户确认的内容]
- 📝 补充：[用户补充的新信息]
- ✏️ 修改：[用户要求修改的内容]
- ⚠️ 待修正：[原文的问题和修正方案]

### 当用户说"确认剧情"时

输出【剧情结论】格式：

---
【剧情结论】

**扮演设定**：
- AI扮演：[角色名]
- 用户扮演：[角色名]

**故事起点**：[详细描述起点场景和状态]

**角色初始状态**：
- [角色名]：[性格、态度、与其他角色的关系]
- [角色名]：[性格、态度、与其他角色的关系]

**保留的剧情线**：
1. [剧情线] - [保留/可改变] - [触发条件]
2. ...

**需要修正的内容**（如果有）：
1. [原文问题] → [修正方案]
2. ...

**态度变化轨迹**：
- 初始态度：[详细描述]
- 态度锚点 1：当[触发条件]时 → 态度变为[新态度]
- 态度锚点 2：当[触发条件]时 → 态度变为[新态度]
- 用户偏好：[保留原作节奏 / 可加速 / 可自由发展]

**其他用户补充**：
- [用户在讨论中补充的信息]
---

⚠️ 只输出剧情结论，不要输出角色卡分发内容！分发是第二阶段的事。

## 重要原则

1. **区分"设定"和"事件"**：
   - 设定：角色的性格、外貌、能力、背景 → 这些在第二阶段提取
   - 事件：小说中发生的具体情节 → 这里讨论保留还是改变

2. **注意原文问题**：
   - 主动发现逻辑问题、人设矛盾
   - 和用户讨论是否需要修正
   - 记录修正方案，传递给第二阶段

3. **保持友好、专业的对话风格**
4. **不要一次问太多问题**（每次 2-3 个最多）
5. **尊重用户的创作意图**`;

// 剧情线模式 - 第二阶段：分发预览提示词
const DISTRIBUTE_PREVIEW_PROMPT = `你是一个角色卡分发专家。用户已经完成了剧情讨论，现在需要你**预览**角色卡的分发内容。

⚠️ **这是第二阶段：分发预览与讨论**
- 第一阶段已经确定了剧情走向、修正方案
- 现在要把这些整合到角色卡的各个阶段

⚠️ **你的职责**：
1. 根据原文和剧情结论，整理出各阶段的内容
2. **特别注意应用第一阶段讨论中的修正意见**
3. 让用户看到分发预览，确认是否需要修改
4. 根据用户反馈调整内容

⚠️ **剧情线模式特殊要求**：
1. **角色描述**：只写入角色的**初始状态**，不包含小说中后续发生的事件
2. **剧情锚点**：单独输出【剧情轨迹】部分，作为潜在发展方向
3. **首条消息**：必须是故事起点，角色尚未经历任何剧情事件
4. **已应用修正**：明确标注哪些内容是根据用户要求修正的

## 第一次回复

请输出分发预览，格式如下：

---
📋 **分发预览**

**【阶段1：基础身份】预览**
## [角色名] 【AI扮演/用户扮演】
- **名称相关**：[正式名字、昵称]
- **生物特征**：[物种、性别、年龄]
- **初始状态**：[故事开始时的状态 - ⚠️ 不含后续发展]
- **核心性格**：[基础性格特征]
- **初始关系**：[与其他角色的初始关系]
（如有修正）⚠️ 已应用修正：[具体修正内容]

**【阶段2：深度背景】预览**
- **出生与成长**：[背景信息]
- **性格形成原因**：[为什么会有这样的性格]
- **初始动机**：[故事开始时的目标/渴望]
（如有修正）⚠️ 已应用修正：[具体修正内容]

**【阶段3：物理描写】预览**
- **体格**：[身高、体型等]
- **毛发/皮肤**：[颜色、质地]
- **面部特征**：[眼睛、表情等]
- **兽人特征**（如适用）：[耳朵、尾巴等]
- **穿着风格**：[日常服装]

**【阶段4：互动设计】预览**
- **对话风格**：[说话方式、语气]
- **语言习惯**：[口头禅、用词特点]
- **情绪表达**：[不同情绪时的表现]
- **初始态度**：[故事开始时对其他角色的态度]
- **首条消息构思**：[简述故事起点场景]

**【阶段5：世界整合】预览**
- **世界设定**：[世界类型、特殊规则]
- **起始场景**：[故事开始的地点和环境]
- **种族设定**（如适用）：[特殊生理特征]

**【剧情轨迹】预览**
- **剧情锚点 1**：[事件] - [触发条件] - [保留/可改变]
- **剧情锚点 2**：[事件] - [触发条件] - [保留/可改变]
- **态度变化轨迹**：[初始态度] → [锚点1] → [锚点2]
---

**请确认以上内容，或告诉我需要修改的地方。**
确认后输入"确认分发"完成导入。

## 后续对话

- 根据用户反馈修改预览内容
- 如果用户指出问题，立即调整
- 每次修改后重新显示相关部分
- 直到用户满意为止

## 当用户说"确认分发"时

输出完整的结构化分析，使用【阶段1：基础身份】【阶段2：深度背景】等正式格式。`;

// 剧情线模式的最终分发提示词
const STORYLINE_FINALIZE_PROMPT = `用户已确认，请根据之前的讨论，输出完整的结构化分析。

⚠️ **剧情线模式 - 特殊处理原则**：

1. **角色描述**：只写入角色的**初始状态**，不包含小说中后续发生的事件
2. **剧情锚点**：单独输出【剧情轨迹】部分，用于世界书/创作者备注
3. **首条消息**：设定为故事起点，角色尚未经历任何剧情事件

请按以下格式输出：

---

【阶段1：基础身份】

## 角色1：[角色名] 【AI扮演/用户扮演】
- **名称相关**：正式名字、昵称
- **生物特征**：物种、性别、年龄
- **初始状态**：故事开始时的状态（⚠️ 不要写后续发展）
- **核心性格**：基础性格特征
- **初始关系**：与其他角色的初始关系

---

【阶段2：深度背景】

⚠️ 只写入故事开始**之前**的背景，不包含小说剧情中发生的事件

- **出生与成长**：...
- **性格形成原因**：...
- **初始动机**：故事开始时的目标/渴望

---

【阶段3：物理描写】

（正常提取外貌特征）

---

【阶段4：互动设计】

- **对话风格**：...
- **初始态度**：故事开始时对其他角色的态度

**首条消息**（⚠️ 必须是故事起点）：
[设计一个故事开始的场景，角色处于初始状态]

---

【阶段5：世界整合】

- **世界设定**：...
- **起始场景**：故事开始的地点和环境

---

【剧情轨迹】⭐ 新增部分

⚠️ 以下内容将写入**创作者备注**或**世界书**，作为潜在的发展方向，而非已发生的历史。

**格式说明**：
- 这些是"命运的暗示"，AI 可以参考但不是必须遵循
- 用户可以通过选择改变这些轨迹

**剧情锚点 1**：[事件名称]
- 原作描述：[小说中如何发生的]
- 触发条件：[什么情况下可能触发]
- 潜在发展：[可能的展开方式]
- 可改变性：[用户是否可以避免/改变]

**剧情锚点 2**：...

**剧情锚点 3**：...

**关系发展轨迹**：
- [角色A] 与 [角色B]：[原作中的发展方向] → [触发条件]

**⭐ 态度状态轨迹**（重要！）：
描述角色对用户的态度如何随剧情变化，AI 应该遵循这个节奏：

- **初始态度**：[冷漠/警惕/好奇/敌意等] - 故事开始时的态度
- **态度锚点 1**：当[触发条件]时 → 态度变为[新态度]
- **态度锚点 2**：当[触发条件]时 → 态度变为[新态度]
- **用户偏好**：[保留原作节奏 / 可加速 / 可自由发展]

⚠️ AI 扮演时应注意：
- 在触发条件达成前，保持当前态度阶段
- 不要因为用户的普通互动就跳过态度变化阶段
- 态度变化应该有明确的触发事件，而非自然过渡

---

⚠️ 请确保：
1. 角色描述只包含初始状态
2. 所有小说剧情都转化为"剧情锚点"
3. 首条消息是故事起点
4. 用户确认的修改已整合
5. ⭐ 态度变化轨迹已记录（如用户有要求）`;

export default function ImportTextDialog({ onClose, onImportComplete }: ImportTextDialogProps) {
  // 基础状态
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('select');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 讨论模式状态
  const [discussionPhase, setDiscussionPhase] = useState<DiscussionPhase>('reading');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [originalText, setOriginalText] = useState(''); // 保存原始文本
  const [plotMode, setPlotMode] = useState<PlotMode>('normal'); // 剧情线模式
  const [aiSummary, setAiSummary] = useState(''); // AI 初步分析结果（用于模式选择阶段显示）
  const [storylineConclusion, setStorylineConclusion] = useState(''); // 剧情线结论（第一阶段讨论结果）
  const [storylineMessages, setStorylineMessages] = useState<Message[]>([]); // 剧情讨论的消息历史

  const { generateResponse, loading } = useAIService();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 聚焦输入框（在所有可输入的阶段）
  useEffect(() => {
    const inputPhases: DiscussionPhase[] = ['chatting', 'storyline-discuss', 'distribute-discuss'];
    if (mode === 'discussion' && inputPhases.includes(discussionPhase)) {
      inputRef.current?.focus();
    }
  }, [mode, discussionPhase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  // 开始讨论模式 - 第一步：AI 阅读并进入模式选择
  const startDiscussionMode = async () => {
    if (!text.trim()) {
      setError('请先输入或上传文本');
      return;
    }

    setMode('discussion');
    setDiscussionPhase('reading');
    setOriginalText(text);
    setError('');

    try {
      // AI 先快速阅读文本，给出简要总结（用于模式选择界面）
      const summaryPrompt = `请快速阅读以下文本，给出一个简短的总结（3-5句话），包括：
1. 这是什么类型的内容（小说/设定/角色介绍等）
2. 主要角色有哪些
3. 如果是小说，有哪些主要剧情事件

---
${text}
---

请用简洁的方式总结，不需要提问。`;

      const summary = await generateResponse(
        [{ role: 'user', content: summaryPrompt }],
        '你是一个文本分析助手，请简洁地总结文本内容。'
      );

      setAiSummary(summary);
      setDiscussionPhase('mode-select'); // 进入模式选择阶段
    } catch (error) {
      console.error('AI 分析失败:', error);
      setError('AI 分析失败，请检查 API 设置或稍后重试');
      setMode('select');
    }
  };

  // 确认模式选择，开始正式讨论
  const confirmModeAndStartDiscussion = async (selectedMode: PlotMode) => {
    setPlotMode(selectedMode);
    setDiscussionPhase('reading'); // 显示加载状态

    try {
      // 根据选择的模式使用不同的提示词
      const systemPrompt = selectedMode === 'storyline'
        ? STORYLINE_DISCUSSION_PROMPT
        : DISCUSSION_SYSTEM_PROMPT;

      const modeHint = selectedMode === 'storyline'
        ? '\n\n⚠️ 用户选择了【剧情线模式】：这是第一阶段，只讨论剧情走向，不涉及角色卡分发。'
        : '';

      const initialPrompt = `我刚刚导入了以下文本，请帮我分析：

---
${originalText}
---
${modeHint}

请先简要总结你读到的内容，然后提出 2-3 个问题帮助我明确创作方向。`;

      const response = await generateResponse(
        [{ role: 'user', content: initialPrompt }],
        systemPrompt
      );

      const initialMessages: Message[] = [
        { role: 'user', content: selectedMode === 'storyline'
          ? '（已导入文本，使用【剧情线模式】- 第一阶段：剧情讨论）'
          : '（已导入文本，等待 AI 分析...）'
        },
        { role: 'assistant', content: response }
      ];

      setMessages(initialMessages);

      // 剧情线模式进入专门的剧情讨论阶段
      if (selectedMode === 'storyline') {
        setDiscussionPhase('storyline-discuss');
      } else {
        setDiscussionPhase('chatting');
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      setError('AI 分析失败，请检查 API 设置或稍后重试');
      setMode('select');
    }
  };


  // 发送讨论消息
  const sendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setError('');

    try {
      // 根据当前阶段处理不同的逻辑
      if (discussionPhase === 'storyline-discuss') {
        // 剧情线模式 - 第一阶段：剧情讨论
        await handleStorylineDiscuss(updatedMessages);
      } else if (discussionPhase === 'distribute-discuss') {
        // 剧情线模式 - 第二阶段：分发讨论
        await handleDistributeDiscuss(updatedMessages);
      } else {
        // 普通模式讨论
        await handleNormalDiscuss(updatedMessages);
      }
    } catch (error) {
      console.error('AI 响应失败:', error);
      setError('AI 响应失败，请重试');
      setMessages(updatedMessages);
    }
  };

  // 剧情线模式 - 第一阶段：剧情讨论
  const handleStorylineDiscuss = async (updatedMessages: Message[]) => {
    const confirmKeywords = ['确认剧情', '剧情确认', '确认', '可以了', '没问题'];
    const isConfirmingStoryline = confirmKeywords.some(keyword =>
      userInput.toLowerCase().includes(keyword.toLowerCase())
    );

    const contextMessages = updatedMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    const systemContext = `原始导入文本：
${originalText}

⚠️ 当前是【剧情线模式 - 第一阶段：剧情讨论】
只讨论剧情走向、角色选择、需要修正的内容。
${isConfirmingStoryline ? '用户已确认，请输出【剧情结论】格式。' : ''}`;

    const response = await generateResponse(
      [
        { role: 'system', content: systemContext },
        ...contextMessages
      ],
      STORYLINE_DISCUSSION_PROMPT
    );

    // 检查是否输出了剧情结论（增加空格容错）
    const hasStorylineConclusion = /【\s*剧情结论\s*】/.test(response);
    if (hasStorylineConclusion) {
      // 保存剧情结论和剧情讨论历史
      setStorylineConclusion(response);
      setStorylineMessages([...updatedMessages, { role: 'assistant', content: response }]);
      setMessages([...updatedMessages, { role: 'assistant', content: response }]);

      // 显示确认按钮，等待用户确认进入下一阶段
      setDiscussionPhase('storyline-confirm');
    } else {
      setMessages([...updatedMessages, { role: 'assistant', content: response }]);
    }
  };

  // 进入分发预览阶段
  const startDistributePreview = async () => {
    setDiscussionPhase('distribute-preview');

    try {
      const previewPrompt = `${DISTRIBUTE_PREVIEW_PROMPT}

原始文本：
${originalText}

剧情讨论结论：
${storylineConclusion}

请根据以上信息，输出分发预览。`;

      const response = await generateResponse(
        [{ role: 'user', content: previewPrompt }],
        DISTRIBUTE_PREVIEW_PROMPT
      );

      setMessages([
        { role: 'user', content: '（进入第二阶段：分发预览）' },
        { role: 'assistant', content: response }
      ]);
      setDiscussionPhase('distribute-discuss');
    } catch (error) {
      console.error('分发预览失败:', error);
      setError('分发预览失败，请重试');
    }
  };

  // 剧情线模式 - 第二阶段：分发讨论
  const handleDistributeDiscuss = async (updatedMessages: Message[]) => {
    const confirmKeywords = ['确认分发', '分发确认', '确认', '可以了', '没问题', '开始分发'];
    const isConfirmingDistribute = confirmKeywords.some(keyword =>
      userInput.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isConfirmingDistribute) {
      // 最终分发
      setDiscussionPhase('finalizing');

      const finalizePrompt = `${STORYLINE_FINALIZE_PROMPT}

原始文本：
${originalText}

剧情讨论结论：
${storylineConclusion}

分发讨论记录：
${updatedMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n')}

⚠️ 请输出完整的结构化分析（【阶段1：xxx】格式）`;

      const response = await generateResponse(
        [{ role: 'user', content: finalizePrompt }],
        STORYLINE_FINALIZE_PROMPT
      );

      // 检测是否包含阶段1（增加容错：空格、中英文冒号、汉字数字）
      const hasStage1 = /【\s*阶段\s*[1一]\s*[：:]/.test(response);
      if (hasStage1) {
        const stageResults = parseAnalysisResult(response);
        setSuccess(true);
        setTimeout(() => {
          onImportComplete(stageResults);
          onClose();
        }, 1500);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: response }]);
        setDiscussionPhase('distribute-discuss');
      }
    } else {
      // 继续分发讨论
      const contextMessages = updatedMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const systemContext = `原始导入文本：
${originalText}

剧情讨论结论：
${storylineConclusion}

⚠️ 当前是【分发讨论阶段】，根据用户反馈修改分发内容。`;

      const response = await generateResponse(
        [
          { role: 'system', content: systemContext },
          ...contextMessages
        ],
        DISTRIBUTE_PREVIEW_PROMPT
      );

      setMessages([...updatedMessages, { role: 'assistant', content: response }]);
    }
  };

  // 普通模式讨论
  const handleNormalDiscuss = async (updatedMessages: Message[]) => {
    const confirmKeywords = ['确认', '可以了', '开始分发', '没问题', '就这样', '确定'];
    const isConfirming = confirmKeywords.some(keyword =>
      userInput.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isConfirming) {
      setDiscussionPhase('finalizing');

      const finalizePrompt = `${FINALIZE_PROMPT}

原始文本：
${originalText}

之前的讨论记录：
${updatedMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n')}`;

      const response = await generateResponse(
        [{ role: 'user', content: finalizePrompt }],
        DISCUSSION_SYSTEM_PROMPT
      );

      // 检测是否包含阶段1（增加容错）
      const hasStage1 = /【\s*阶段\s*[1一]\s*[：:]/.test(response);
      if (hasStage1) {
        const stageResults = parseAnalysisResult(response);
        setSuccess(true);
        setTimeout(() => {
          onImportComplete(stageResults);
          onClose();
        }, 1500);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: response }]);
        setDiscussionPhase('chatting');
      }
    } else {
      const contextMessages = updatedMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const systemContext = `原始导入文本：
${originalText}`;

      const response = await generateResponse(
        [
          { role: 'system', content: systemContext },
          ...contextMessages
        ],
        DISCUSSION_SYSTEM_PROMPT
      );

      setMessages([...updatedMessages, { role: 'assistant', content: response }]);
    }
  };

  // 快速分析模式（原有逻辑）
  const handleQuickAnalyze = async () => {
    if (!text.trim()) {
      setError('请先输入或上传文本');
      return;
    }

    setMode('quick');
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await generateResponse(
        [{ role: 'user', content: `${QUICK_ANALYSIS_PROMPT}\n\n文本内容：\n${text}` }],
        '你是一个全方位的创作内容分析专家。深入分析文本，提取所有创作维度的完整信息。'
      );

      const stageResults = parseAnalysisResult(response);
      setSuccess(true);
      setTimeout(() => {
        onImportComplete(stageResults);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('分析失败:', error);
      setError('AI 分析失败，请检查 API 设置或稍后重试');
      setMode('select');
    } finally {
      setIsAnalyzing(false);
    }
  };


  // 解析分析结果
  const parseAnalysisResult = (analysis: string): string[] => {
    const results: string[] = [];

    // 正则表达式增加容错：
    // - \s* 允许空格
    // - [：:] 兼容中英文冒号
    // - [1一] 兼容阿拉伯数字和汉字数字
    // - .*? 允许标题有变体（如"基础身份信息"）
    const stage1Match = analysis.match(/【\s*阶段\s*[1一]\s*[：:]\s*基础身份.*?】([\s\S]*?)(?=【\s*阶段\s*[2二]|$)/i);
    const stage2Match = analysis.match(/【\s*阶段\s*[2二]\s*[：:]\s*深度背景.*?】([\s\S]*?)(?=【\s*阶段\s*[3三]|$)/i);
    const stage3Match = analysis.match(/【\s*阶段\s*[3三]\s*[：:]\s*物理描写.*?】([\s\S]*?)(?=【\s*阶段\s*[4四]|$)/i);
    const stage4Match = analysis.match(/【\s*阶段\s*[4四]\s*[：:]\s*互动设计.*?】([\s\S]*?)(?=【\s*阶段\s*[5五]|$)/i);
    const stage5Match = analysis.match(/【\s*阶段\s*[5五]\s*[：:]\s*世界整合.*?】([\s\S]*?)(?=【\s*剧情轨迹\s*】|$)/i);

    // 剧情线模式：提取【剧情轨迹】部分（也增加空格容错）
    const plotTrajectoryMatch = analysis.match(/【\s*剧情轨迹\s*】([\s\S]*?)$/);

    // 从阶段2中提取人际关系
    let backgroundInfo = stage2Match ? stage2Match[1].trim() : '未能提取到背景信息';
    let relationshipInfo = '';

    if (backgroundInfo.includes('人际关系')) {
      const parts = backgroundInfo.split(/人际关系[:：]/);
      if (parts.length > 1) {
        backgroundInfo = parts[0].trim();
        relationshipInfo = parts[1].trim();
      }
    }

    // 映射到 StageFlow 的 9 个阶段
    results[0] = stage1Match ? stage1Match[1].trim() : '未能提取到基础身份信息';
    results[1] = backgroundInfo;
    results[2] = relationshipInfo || '未能提取到关系网络信息';
    results[3] = stage3Match ? stage3Match[1].trim() : '未能提取到物理描写';
    results[4] = ''; // 专项深化（用户选择）
    results[5] = stage4Match ? stage4Match[1].trim() : '未能提取到互动设计';

    // 世界整合（不包含剧情轨迹）
    const worldInfo = stage5Match ? stage5Match[1].trim() : '未能提取到世界设定';
    results[6] = worldInfo;

    // results[7] 用于质量检查，暂时留空
    results[7] = '';

    // results[8] 用于最终输出，暂时留空
    results[8] = '';

    // ⭐ 剧情轨迹单独存储到 results[9]，后续会写入 creator_notes
    // 这是一个特殊的槽位，用于存储剧情线模式的额外数据
    if (plotTrajectoryMatch) {
      const plotTrajectory = plotTrajectoryMatch[1].trim();
      // 格式化为创作者备注格式
      results[9] = `📖 **剧情轨迹指南**（写入角色卡的 creator_notes 字段）

⚠️ **重要提示**：以下内容是"潜在的发展方向"，不是已发生的历史。
AI 扮演时应参考这些锚点，但角色目前处于初始状态。

---

${plotTrajectory}

---

💡 **使用说明**：
- 此内容已自动写入角色卡的「创作者备注」(creator_notes) 字段
- SillyTavern 会将此内容注入到 AI 的上下文中
- AI 会参考这些指引来控制剧情和态度的发展节奏`;
    } else {
      results[9] = '';
    }

    return results;
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 返回选择模式
  const backToSelect = () => {
    setMode('select');
    setMessages([]);
    setDiscussionPhase('reading');
    setError('');
  };


  // ========== 渲染：模式选择界面 ==========
  const renderSelectMode = () => (
    <>
      {/* 说明 */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          <p className="font-semibold mb-2">💡 如何使用：</p>
          <ul className="space-y-1 text-xs">
            <li>• 上传包含角色设定的文本文件（.txt、.md 等）</li>
            <li>• 或直接在下方粘贴角色设定、小说片段、世界观笔记</li>
            <li>• 选择分析模式后，AI 会提取并整理角色信息</li>
          </ul>
        </div>
      </div>

      {/* 文件上传 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          上传文件（可选）
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".txt,.md,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>选择文件</span>
          </label>
          <span className="text-xs text-slate-500">支持 .txt, .md, .doc, .docx</span>
        </div>
      </div>

      {/* 文本输入 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          或粘贴文本
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在此粘贴您的角色设定、小说片段或世界观描述..."
          rows={8}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
        />
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          已输入 {text.length} 字符
        </div>
      </div>

      {/* 模式选择 */}
      {text.trim() && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            选择分析模式
          </label>

          {/* 讨论模式 - 推荐 */}
          <button
            onClick={startDiscussionMode}
            className="w-full flex items-start p-4 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left"
          >
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-semibold text-slate-900 dark:text-white">讨论模式</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded">推荐</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                AI 先阅读文本，然后与你讨论角色设定、确认细节，最后再分发到各阶段
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5" />
          </button>

          {/* 快速模式 */}
          <button
            onClick={handleQuickAnalyze}
            className="w-full flex items-start p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
          >
            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-white">快速模式</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                AI 直接分析文本并自动填充到各阶段，适合设定已经很完整的情况
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 ml-2 mt-0.5" />
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </>
  );


  // ========== 渲染：模式选择界面（AI 读取后） ==========
  const renderModeSelect = () => (
    <div className="space-y-4">
      {/* AI 总结 */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">AI 已阅读完文本：</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{aiSummary}</p>
          </div>
        </div>
      </div>

      {/* 模式选择 */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          请选择处理模式：
        </p>

        {/* 普通模式 */}
        <button
          onClick={() => confirmModeAndStartDiscussion('normal')}
          disabled={loading}
          className="w-full flex items-start p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left"
        >
          <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-slate-900 dark:text-white">普通模式</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              将小说内容作为角色的<strong>已有经历和背景</strong>写入角色卡。
              <br />适合：角色设定文档、已完结的故事、不需要重新体验剧情的情况。
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 ml-2 mt-0.5" />
        </button>

        {/* 剧情线模式 */}
        <button
          onClick={() => confirmModeAndStartDiscussion('storyline')}
          disabled={loading}
          className="w-full flex items-start p-4 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left"
        >
          <Play className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-semibold text-slate-900 dark:text-white">剧情线模式</span>
              <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded">推荐用于小说</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              将小说剧情转化为<strong>潜在的发展方向</strong>，让你从头体验故事。
              <br />适合：想要重新体验小说剧情、希望改变故事走向的情况。
            </p>
            <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
              ✨ 角色卡只包含初始状态，剧情事件写入世界书/创作者备注
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5" />
        </button>
      </div>

      {/* 返回按钮 */}
      <button
        onClick={backToSelect}
        className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        ← 返回重新选择文本
      </button>
    </div>
  );

  // ========== 渲染：讨论模式界面 ==========
  const renderDiscussionMode = () => (
    <div className="flex flex-col h-full">
      {/* 状态提示 */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 mb-4">
        <div className="flex items-center text-sm text-indigo-700 dark:text-indigo-300">
          <MessageSquare className="w-4 h-4 mr-2" />
          {discussionPhase === 'reading' && '正在阅读文本...'}
          {discussionPhase === 'mode-select' && '请选择处理模式'}
          {discussionPhase === 'chatting' && (
            <>
              与 AI 讨论中
              <span className="ml-2">· 确认后输入"确认"或"开始分发"</span>
            </>
          )}
          {discussionPhase === 'storyline-discuss' && (
            <>
              <span className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded">第一阶段</span>
              <span className="ml-2">剧情讨论 · 输入"确认剧情"进入下一阶段</span>
            </>
          )}
          {discussionPhase === 'storyline-confirm' && (
            <>
              <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">剧情已确认</span>
              <span className="ml-2">点击下方按钮进入分发预览</span>
            </>
          )}
          {discussionPhase === 'distribute-preview' && '正在生成分发预览...'}
          {discussionPhase === 'distribute-discuss' && (
            <>
              <span className="px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded">第二阶段</span>
              <span className="ml-2">分发讨论 · 输入"确认分发"完成导入</span>
            </>
          )}
          {discussionPhase === 'finalizing' && '正在生成结构化分析...'}
        </div>
      </div>

      {/* 模式选择阶段 */}
      {discussionPhase === 'mode-select' && renderModeSelect()}

      {/* 对话区域 */}
      {discussionPhase !== 'mode-select' && (
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px] max-h-[400px]">
        {discussionPhase === 'reading' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">AI 正在阅读你的文本...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-3">
                  <Loader className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      )}

      {/* 输入区域 - 在可输入的阶段显示 */}
      {['chatting', 'storyline-discuss', 'distribute-discuss'].includes(discussionPhase) && (
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              discussionPhase === 'storyline-discuss'
                ? '讨论剧情走向... (输入「确认剧情」进入下一阶段)'
                : discussionPhase === 'distribute-discuss'
                ? '讨论分发内容... (输入「确认分发」完成导入)'
                : '输入你的回复... (Shift+Enter 换行，Enter 发送)'
            }
            rows={2}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !userInput.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 快捷按钮 - 普通模式 */}
      {discussionPhase === 'chatting' && messages.length >= 2 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={backToSelect}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← 返回重新导入
          </button>
          <button
            onClick={() => {
              setUserInput('确认，开始分发到各阶段');
              setTimeout(() => sendMessage(), 100);
            }}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>确认并分发</span>
          </button>
        </div>
      )}

      {/* 快捷按钮 - 剧情讨论阶段 */}
      {discussionPhase === 'storyline-discuss' && messages.length >= 2 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={backToSelect}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← 返回重新导入
          </button>
          <button
            onClick={() => {
              setUserInput('确认剧情');
              setTimeout(() => sendMessage(), 100);
            }}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>确认剧情 → 进入分发预览</span>
          </button>
        </div>
      )}

      {/* 确认按钮 - 剧情确认阶段 */}
      {discussionPhase === 'storyline-confirm' && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setDiscussionPhase('storyline-discuss')}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← 继续讨论剧情
          </button>
          <button
            onClick={startDistributePreview}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>进入分发预览</span>
          </button>
        </div>
      )}

      {/* 快捷按钮 - 分发讨论阶段 */}
      {discussionPhase === 'distribute-discuss' && messages.length >= 2 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setDiscussionPhase('storyline-discuss')}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← 返回剧情讨论
          </button>
          <button
            onClick={() => {
              setUserInput('确认分发');
              setTimeout(() => sendMessage(), 100);
            }}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>确认分发</span>
          </button>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            分析完成！正在导入到各阶段...
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );


  // ========== 渲染：快速分析中界面 ==========
  const renderQuickMode = () => (
    <div className="flex flex-col items-center justify-center py-12">
      {success ? (
        <>
          <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">分析完成！</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">正在导入到各阶段...</p>
        </>
      ) : (
        <>
          <Loader className="w-16 h-16 animate-spin text-indigo-600 mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">AI 正在分析...</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">这可能需要 30 秒到 1 分钟</p>
        </>
      )}

      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start space-x-2 max-w-md">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={backToSelect}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              返回重试
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ========== 主渲染 ==========
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            {mode === 'select' && (
              <>
                <Upload className="w-5 h-5 mr-2" />
                导入文本分析
              </>
            )}
            {mode === 'discussion' && (
              <>
                <MessageSquare className="w-5 h-5 mr-2" />
                讨论模式
              </>
            )}
            {mode === 'quick' && (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                快速分析
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            disabled={isAnalyzing || loading}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'select' && renderSelectMode()}
          {mode === 'discussion' && renderDiscussionMode()}
          {mode === 'quick' && renderQuickMode()}
        </div>

        {/* 底部按钮 - 仅在选择模式显示 */}
        {mode === 'select' && (
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
