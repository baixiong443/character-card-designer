'use client';

/* eslint-disable react/no-unescaped-entities -- Existing Chinese UI copy uses quoted examples. */

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useProgressStore } from '@/stores/progressStore';
import {
  createDefaultWorldBookEntry,
  WORLDBOOK_DEFAULTS,
  WorldBookEntry,
} from '@/types/worldbook';
import { useAIService } from '@/services/aiService';
import {
  buildWorldBookAuditPrompt,
  findWorldBookFindings,
  parseWorldBookAuditResponse,
} from '@/lib/auditPipeline';

interface Message {
  role: string;
  content: string;
}

interface WorldBookEditorProps {
  stageResults?: string[];
  currentStageMessages?: Message[];
}

const POSITION_OPTIONS = [
  { value: 0, label: '角色定义之前' },
  { value: 1, label: '角色定义之后' },
  { value: 2, label: '作者注释之前' },
  { value: 3, label: '作者注释之后' },
  { value: 4, label: '聊天深度' },
  { value: 5, label: '示例消息之前' },
  { value: 6, label: '示例消息之后' },
  { value: 7, label: '命名提示出口' },
] as const;

const SELECTIVE_LOGIC_OPTIONS = [
  { value: 0, label: '主关键词 + 任一辅助词' },
  { value: 1, label: '主关键词 + 非全部辅助词' },
  { value: 2, label: '主关键词 + 无任何辅助词' },
  { value: 3, label: '主关键词 + 全部辅助词' },
] as const;

const ROLE_OPTIONS = [
  { value: 0, label: 'System' },
  { value: 1, label: 'User' },
  { value: 2, label: 'Assistant' },
] as const;

const nullableNumber = (value: string): number | null => value === '' ? null : Number(value);

const triStateValue = (value: boolean | null | undefined): string => value == null ? 'inherit' : String(value);

const parseTriState = (value: string): boolean | null => value === 'inherit' ? null : value === 'true';

export default function WorldBookEditor({ 
  stageResults = [], 
  currentStageMessages = [] 
}: WorldBookEditorProps) {
  const project = useProgressStore(state => state.getCurrentProject());
  const entries = project?.worldBookEntries || [];
  const bookMetadata = project?.bookMetadata || null;
  const {
    addWorldBookEntry,
    updateWorldBookEntry,
    deleteWorldBookEntry,
    updateBookMetadata,
  } = useProgressStore();
  const { generateResponse, generateAuditResponse, loading } = useAIService();
  
  const [editingEntry, setEditingEntry] = useState<WorldBookEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [previewEntries, setPreviewEntries] = useState<Partial<WorldBookEntry>[]>([]);
  const [previewIssues, setPreviewIssues] = useState<string[][]>([]);
  const [previewMode, setPreviewMode] = useState<'generate' | 'audit'>('generate');
  const [showPreview, setShowPreview] = useState(false);
  const [showBookSettings, setShowBookSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creatingUid, setCreatingUid] = useState<number | null>(null);

  useEffect(() => {
    setEditingEntry(null);
    setPreviewEntries([]);
    setPreviewIssues([]);
    setPreviewMode('generate');
    setShowPreview(false);
    setShowBookSettings(false);
    setShowAdvanced(false);
    setCreatingUid(null);
  }, [project?.id]);

  /**
   * 开始编辑条目
   */
  const handleEdit = (entry: WorldBookEntry) => {
    setEditingEntry({ ...entry });
    setShowAdvanced(false);
    setCreatingUid(null);
  };

  const handleAdd = () => {
    const entry = addWorldBookEntry();
    setEditingEntry({ ...entry });
    setCreatingUid(entry.uid);
    setShowAdvanced(false);
  };

  /**
   * 保存编辑
   */
  const handleSave = () => {
    if (editingEntry) {
      updateWorldBookEntry(editingEntry.uid, editingEntry);
      setEditingEntry(null);
      setCreatingUid(null);
    }
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    if (editingEntry && creatingUid === editingEntry.uid && !editingEntry.content.trim() && editingEntry.keys.length === 0) {
      deleteWorldBookEntry(editingEntry.uid);
    }
    setEditingEntry(null);
    setCreatingUid(null);
  };

  /**
   * 更新编辑中的条目
   */
  const updateEditingEntry = (updates: Partial<WorldBookEntry>) => {
    if (editingEntry) {
      setEditingEntry({ ...editingEntry, ...updates });
    }
  };

  /**
   * AI 自动生成世界书条目
   */
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      // 构建角色设定上下文
      const contextInfo = stageResults.filter(r => r && r.trim()).length > 0
        ? `\n## 当前角色设定\n\n${stageResults.map((result, idx) => 
            result ? `### 阶段${idx + 1}\n${result}\n` : ''
          ).join('\n')}\n`
        : '';

      // 构建阶段7的对话历史
      const dialogueInfo = currentStageMessages.length > 0
        ? `\n## 阶段7的讨论内容\n\n用户和AI在阶段7讨论了以下内容，请特别关注这些需求：\n\n${currentStageMessages
            .map(msg => `**${msg.role === 'user' ? '用户' : 'AI'}**: ${msg.content}`)
            .join('\n\n')}\n`
        : '';

      // 构建 AI 提示词
      const prompt = `# 世界书生成任务

你是专业的世界书（Lorebook）设计师。请分析当前角色的设定，生成 3-5 个高质量的世界书条目。
${contextInfo}${dialogueInfo}
⚠️ 重要：只生成上述设定中**明确提到**的内容（地点、人物、物品等），不要凭空捏造。
${dialogueInfo ? '⚠️ 特别注意：优先满足阶段7讨论中用户提出的需求！' : ''}

## 什么是世界书？
世界书是 AI 角色扮演的**动态知识注入系统**：
- 当对话提到特定关键词时，相关背景信息会自动注入到AI的上下文中
- 不占用常驻token，只在需要时激活
- 完全兼容 SillyTavern 等平台

## 条目类型

### 类型A：地点（Locations）
适用于：角色的居所、活动场所、标志性地点
\`\`\`
【关键词】羊村, 青青草原, Sheep Village
【内容】
羊村位于青青草原北岸，被铁栅栏保护。村内有大肥羊学校、实验室、医务室。慢羊羊是村长。村子经常遭灰太狼袭击，但总被喜羊羊化解。
\`\`\`

### 类型B：人物（Characters）
适用于：NPC、对手、朋友、重要角色
\`\`\`
【关键词】灰太狼, Gray Wolf, 老狼
【内容】
灰太狼住在青青河南岸的狼堡。他每天想办法抓羊，但总是失败。他有个脾气暴躁的妻子红太狼，经常用平底锅敲他。口头禅："我一定会回来的！"
\`\`\`

### 类型C：物品（Objects）
适用于：标志性道具、武器、装备
\`\`\`
【关键词】平底锅, 红太狼的平底锅, frying pan
【内容】
红太狼的标志性武器，黑色铸铁平底锅。每当灰太狼失败，红太狼就用它敲他的头，发出"砰！"的响声，灰太狼会被打飞。这是剧中的经典梗。
\`\`\`

### 类型D：Furry专项（如果是兽人角色）
适用于：种族特征、身体细节、信息素、发情期
\`\`\`
【关键词】肉垫, paw pads, 爪子
【内容】
（角色名）的后足底部有黑色肉垫，分为四个趾垫和一个掌垫。质地柔软有弹性，温暖湿润。趾缝和肉垫边缘是敏感区域。爪子锋利，平时收起，战斗时伸出。
\`\`\`

### 类型E：规则/机制（如果是RPG/游戏角色）
适用于：战斗系统、技能机制、游戏规则
\`\`\`
【关键词】--战斗, --battle, 战斗系统
【内容】
回合制战斗。攻击判定：d20+攻击修正 vs AC。暴击：自然20，伤害翻倍。技能消耗MP。战斗结束：一方HP归0或逃跑。
\`\`\`

## 生成策略

1. **分析角色类型**：
   - Furry角色 → 重点：种族特征、身体细节（毛皮/尾巴/肉垫）、信息素、发情期
   - RPG角色 → 重点：战斗系统、技能列表、装备、地图
   - 日常角色 → 重点：居所、学校/工作地点、朋友、物品
   - BL/耽美角色 → 重点：足部细节、气味、亲密互动场所

2. **确定条目**：
   - ⭐ **必须：重要人物（1-3个）** - 特别关注阶段3（关系网络）！
     * 主角（核心角色条目）
     * 配角/NPC（暗恋对象、朋友、导师等，从阶段3提取）
   - 必须：主要地点（1个）
   - 可选：标志性物品（1个）
   - 可选：重要事件（1个，如"海边之夜"）
   - 可选：Furry特征（如适用，1-2个，如信息素系统、肉垫细节）
   - 可选：游戏规则（如适用，1个）
   - 可选：格式规范（需要每轮稳定输出状态栏时使用）

3. **质量标准**：
   ✅ 多个关键词（中英文、别名、简称）
   ✅ 内容精炼（50-150字）
   ✅ 包含关联信息（提到其他角色/地点）
   ✅ 突出特征细节（视觉、听觉、嗅觉）
   
   ❌ 避免过长（>300字）
   ❌ 避免宽泛关键词（"他"、"的"）
   ❌ 避免重复信息

## 输出格式

**严格按照以下格式**，每个条目之间用"---"分隔：

【关键词】关键词1, 关键词2, 关键词3
【类型】核心角色/外貌细节/背景故事/配角/地点/物品/规则/格式规范
【内容】
详细描述...（50-150字）

---

**类型说明：**
- 普通知识条目按关键词触发，不默认设置冷却，避免关键词仍在时知识突然消失。
- **格式规范**会自动设为常驻、聊天深度 1、System 角色、忽略预算，并阻止其内容继续触发递归扫描，以便每轮稳定注入且不误触发其他关键词条目。

**注意**：类型用于选择合理的运行时默认值，请务必标注。

---

示例：

【关键词】艾莉娅, Elaria, 精灵法师
【类型】核心角色
【内容】
艾莉娅，外表20岁（实际120岁）的精灵女性。纤细修长，银色长发，碧绿眼睛。曾是精灵王国守护者，因王国覆灭而流浪。性格外表温柔冷静，内心坚韧执着。

---

【关键词】禁忌森林, 暗影林, Forbidden Forest
【类型】地点
【内容】
精灵王国遗址所在的森林。常年笼罩在黑暗迷雾中，充满危险的魔法生物。森林中心有古老的精灵圣树遗迹。

---

【关键词】状态栏, 回复格式, status bar
【类型】格式规范
【内容】
每次回复时请在开头添加状态栏：
情绪：[当前情绪]
身体状态：[身体反应，特别注意兽人特征如耳朵、尾巴、肉垫的反应]
环境：[当前场景、天气、氛围]

---

...

## 开始生成

请根据当前角色的设定，生成 3-5 个世界书条目。

⚠️ **关键提醒**：
1. 特别关注**阶段3（关系网络）**，为配角/NPC创建条目！
2. 直接输出标准格式，不要任何解释或寒暄！
3. 立即开始：

【关键词】...`;

      const systemPrompt = `你是专业的世界书（Lorebook）生成器。

**核心规则**：
1. 直接输出标准格式的条目，不要解释、不要寒暄、不要使用markdown代码块
2. 每个条目必须严格遵循格式：【关键词】...【类型】...【内容】...
3. 多个条目之间用"---"分隔
4. 内容精炼（50-150字）

**【类型】必须从以下选项中选择（不要自创！）**：
- 核心角色（主角）
- 配角（其他角色/NPC）
- 外貌细节（身体特征）
- 背景故事（过去经历）
- 地点（场景/环境）
- 物品（道具/装备）
- 规则（游戏机制）
- 格式规范（回复格式，极少用）

⚠️ 不要写"选择性激活"、"常驻"等激活方式！

**输出格式（严格遵循）**：

【关键词】关键词1, 关键词2, 关键词3
【类型】核心角色
【内容】
详细描述内容...

---

【关键词】另一个关键词1, 关键词2
【类型】地点
【内容】
另一个描述...

**禁止**：
❌ 不要写"好的，我们开始生成！"之类的寒暄
❌ 不要使用\`\`\`代码块包裹
❌ 不要解释每个条目的作用
❌ 不要问"接下来要我..."
❌ 【类型】不要写激活方式（"选择性激活"/"常驻"）

**只输出纯净的条目内容！**`;


      const response = await generateResponse(
        [{ role: 'user', content: prompt }],
        systemPrompt
      );

      // 解析 AI 响应
      const parsedEntries = parseAIGeneratedEntries(response);
      
      if (parsedEntries.length > 0) {
        const generatedEntries = parsedEntries.map((entry, index) => ({
          ...createDefaultWorldBookEntry(index),
          ...entry,
          uid: index,
        }));
        const auditResponse = await generateAuditResponse(
          [{
            role: 'user',
            content: buildWorldBookAuditPrompt(
              contextInfo,
              dialogueInfo,
              generatedEntries,
              project?.psycheTimeline?.plan?.initialState ?? null,
            ),
          }],
          '你是独立的世界书审计 AI。逐条核对证据、关键词和 SillyTavern 运行参数，只返回指定 JSON。',
        );
        const auditedEntries = parseWorldBookAuditResponse(auditResponse, generatedEntries);
        // 显示审计后的预览，让用户选择，原始生成结果不会直接写入项目。
        setPreviewEntries(auditedEntries.map(candidate => candidate.entry));
        setPreviewIssues(auditedEntries.map(candidate => candidate.issues));
        setPreviewMode('generate');
        setShowPreview(true);
      } else {
        alert('AI 生成失败，请手动添加条目。');
      }
    } catch (error) {
      console.error('AI生成世界书失败:', error);
      alert('生成失败，请检查 AI 设置或手动添加条目。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIAudit = async () => {
    if (entries.length === 0 || isAuditing || loading) return;
    setIsAuditing(true);
    try {
      const evidenceContext = stageResults
        .slice(0, 7)
        .map((result, index) => result?.trim() ? `### 阶段${index + 1}\n${result.trim()}` : '')
        .filter(Boolean)
        .join('\n\n');
      const discussionRecord = currentStageMessages
        .map(message => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`)
        .join('\n\n');
      const response = await generateAuditResponse(
        [{
          role: 'user',
          content: buildWorldBookAuditPrompt(
            evidenceContext,
            discussionRecord,
            entries,
            project?.psycheTimeline?.plan?.initialState ?? null,
          ),
        }],
        '你是独立的世界书审计 AI。逐条核对证据、关键词和 SillyTavern 运行参数，只返回指定 JSON。',
      );
      const auditedEntries = parseWorldBookAuditResponse(response, entries);
      setPreviewEntries(auditedEntries.map(candidate => candidate.entry));
      setPreviewIssues(auditedEntries.map(candidate => candidate.issues));
      setPreviewMode('audit');
      setShowPreview(true);
    } catch (error) {
      console.error('AI审计世界书失败:', error);
      alert(error instanceof Error ? `审计失败：${error.message}` : '审计失败，请检查 AI 设置后重试。');
    } finally {
      setIsAuditing(false);
    }
  };

  /**
   * 本地确定性检查：不调用模型，直接用运行参数规则与时间线知识状态核对。
   * 这里也会报告世界书条目与时间线知识边界冲突导致的私有知识泄漏风险。
   */
  const handleLocalCheck = () => {
    if (entries.length === 0) return;
    const findings = findWorldBookFindings(
      entries,
      project?.psycheTimeline?.plan?.initialState ?? null,
    );
    if (findings.length === 0) {
      alert('本地检查通过：未发现运行参数问题，也没有检测到私有知识泄漏风险。');
      return;
    }
    const lines = findings
      .map(item => `条目 ${item.uid} [${item.severity}] ${item.message}`)
      .join('\n');
    setPreviewEntries(entries.map(entry => ({ ...entry })));
    setPreviewIssues(entries.map(entry => findings
      .filter(item => item.uid === entry.uid)
      .map(item => item.message)));
    setPreviewMode('audit');
    setShowPreview(true);
    alert(`本地检查发现 ${findings.length} 项问题：\n\n${lines}`);
  };

  /**
   * 确认添加预览的条目
   */
  const handleConfirmPreview = (selectedIndices: number[]) => {
    selectedIndices.forEach(idx => {
      const entry = previewEntries[idx];
      if (entry) {
        if (previewMode === 'audit' && typeof entry.uid === 'number') {
          updateWorldBookEntry(entry.uid, entry);
        } else {
          addWorldBookEntry(entry);
        }
      }
    });
    setShowPreview(false);
    setPreviewEntries([]);
    setPreviewIssues([]);
    alert(previewMode === 'audit'
      ? `已应用 ${selectedIndices.length} 个审计修订候选。`
      : `成功添加 ${selectedIndices.length} 个经过审计的世界书条目！`);
  };

  /**
   * 根据条目类型获取推荐参数
   */
  const getTypeParams = (type: string): Partial<WorldBookEntry> => {
    if (type === '格式规范') {
      return {
        constant: true,
        position: 4,
        depth: 1,
        role: 0,
        order: 900,
        useProbability: false,
        ignoreBudget: true,
        preventRecursion: true,
        cooldown: null,
        sticky: null,
      };
    }

    return {
      cooldown: null,
      sticky: null,
    };
  };

  /**
   * 解析 AI 生成的条目
   */
  const parseAIGeneratedEntries = (text: string): Partial<WorldBookEntry>[] => {
    const entries: Partial<WorldBookEntry>[] = [];
    
    // 清理文本：移除markdown代码块标记
    let cleanedText = text.replace(/```[\s\S]*?```/g, (match) => {
      // 提取代码块内容
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });
    
    // 移除前导的解释性文本（如"好的，我们开始..."）
    // 找到第一个【关键词】之前的内容并删除
    const firstKeywordIndex = cleanedText.indexOf('【关键词】');
    if (firstKeywordIndex > 0) {
      cleanedText = cleanedText.substring(firstKeywordIndex);
    }
    
    // 按 "---" 分割
    const blocks = cleanedText.split('---').map(b => b.trim()).filter(b => b);
    
    for (const block of blocks) {
      // 跳过没有【关键词】的块（纯解释性文本）
      if (!block.includes('【关键词】')) continue;
      
      // 提取关键词
      const keysMatch = block.match(/【关键词】([^\n【]+)/);
      const keys = keysMatch 
        ? keysMatch[1].split(/[,，]/).map(k => k.trim()).filter(k => k)
        : [];
      
      // 提取类型
      const typeMatch = block.match(/【类型】([^\n【]+)/);
      let entryType = typeMatch ? typeMatch[1].trim() : '';
      
      // 修正错误的类型名称
      const typeMapping: Record<string, string> = {
        '选择性激活': '核心角色',
        '常驻激活': '规则',
        '常驻': '规则',
        '人物': '配角',
        '角色': '配角',
        '场景': '地点',
        '环境': '地点',
        '道具': '物品',
        '机制': '规则',
      };
      if (typeMapping[entryType]) {
        entryType = typeMapping[entryType];
      }
      
      // 提取内容（只到下一个问号/感叹号/句号+换行，或文本结束）
      const contentMatch = block.match(/【内容】\s*\n?([\s\S]*?)(?=\n\n[这接要]|$)/);
      let content = contentMatch ? contentMatch[1].trim() : '';
      
      // 进一步清理：移除尾部的问句和解释
      content = content.replace(/\n*这个条目[\s\S]*$/, '');
      content = content.replace(/\n*接下来[\s\S]*$/, '');
      content = content.replace(/\n*要我[\s\S]*$/, '');
      
      if (keys.length > 0 && content) {
        // 格式约束需要每轮注入；普通知识条目不应默认进入冷却。
        const params = getTypeParams(entryType);
        
        entries.push({
          keys,
          content,
          comment: entryType || keys[0], // 用类型或第一个关键词作为备注
          ...params,
        });
      }
    }
    
    return entries;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 md:p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          🌍 世界书条目
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating || isAuditing || loading}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            {isGenerating ? '生成中...' : 'AI生成'}
          </button>
          <button
            onClick={handleAIAudit}
            disabled={entries.length === 0 || isGenerating || isAuditing || loading}
            className="px-3 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="使用独立审计模型核对现有条目的证据、关键词和运行参数"
          >
            <ShieldCheck className="w-4 h-4 inline mr-1" />
            {isAuditing ? '审计中...' : 'AI审计'}
          </button>
          <button
            onClick={handleLocalCheck}
            disabled={entries.length === 0}
            className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="不调用模型，检查运行参数与私有知识泄漏风险"
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            本地检查
          </button>
          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            添加条目
          </button>
        </div>
      </div>

      <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg">
        <button
          type="button"
          onClick={() => setShowBookSettings(value => !value)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
          aria-expanded={showBookSettings}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            世界书卡片元数据
          </span>
          {showBookSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showBookSettings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              这些字段会写入 Character Card V3 的 character_book 元数据。SillyTavern 1.18 导入时会保留它们用于再次导出，但实际扫描深度、预算和递归开关仍由酒馆的账户级“世界书激活设置”决定。
            </div>
            <label className="text-sm text-slate-700 dark:text-slate-300">
              <span className="block mb-1 font-medium">名称</span>
              <input
                type="text"
                value={bookMetadata?.name || ''}
                onChange={(event) => updateBookMetadata({ name: event.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-300">
              <span className="block mb-1 font-medium">卡片建议扫描深度</span>
              <input
                type="number"
                min={0}
                max={1000}
                value={bookMetadata?.scan_depth ?? WORLDBOOK_DEFAULTS.DEFAULT_SCAN_DEPTH}
                onChange={(event) => updateBookMetadata({ scan_depth: Number(event.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-300">
              <span className="block mb-1 font-medium">卡片建议 Token 预算</span>
              <input
                type="number"
                min={0}
                value={bookMetadata?.token_budget ?? WORLDBOOK_DEFAULTS.DEFAULT_TOKEN_BUDGET}
                onChange={(event) => updateBookMetadata({ token_budget: Number(event.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={bookMetadata?.recursive_scanning ?? WORLDBOOK_DEFAULTS.DEFAULT_RECURSIVE_SCANNING}
                onChange={(event) => updateBookMetadata({ recursive_scanning: event.target.checked })}
              />
              卡片递归扫描标记
            </label>
            <label className="md:col-span-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="block mb-1 font-medium">描述</span>
              <textarea
                rows={2}
                value={bookMetadata?.description || ''}
                onChange={(event) => updateBookMetadata({ description: event.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </label>
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700 dark:text-indigo-300">
            <p className="font-semibold mb-1">💡 什么是世界书？</p>
            <p className="text-xs">
              世界书（Lorebook）是动态知识注入系统。当对话中出现特定关键词时，相关背景信息会自动注入到 AI 的上下文中。
              这样可以让 AI 记住复杂的世界观设定，而不占用常驻 token。
            </p>
          </div>
        </div>
      </div>

      {/* 条目列表 */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-2">还没有世界书条目</p>
          <p className="text-sm">点击"AI生成"自动创建，或"添加条目"手动创建</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.uid}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            >
              {editingEntry?.uid === entry.uid ? (
                // 编辑模式
                <div className="space-y-4">
                  {/* 关键词 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      触发关键词（逗号分隔）
                    </label>
                    <input
                      type="text"
                      value={editingEntry.keys.join(', ')}
                      onChange={(e) => updateEditingEntry({ 
                        keys: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                      })}
                      placeholder="例如：羊村, 青青草原, Sheep Village"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  {/* 内容 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      条目内容
                    </label>
                    <textarea
                      value={editingEntry.content}
                      onChange={(e) => updateEditingEntry({ content: e.target.value })}
                      placeholder="详细描述这个概念、地点、人物或事件..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  {/* 备注 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      备注（可选）
                    </label>
                    <input
                      type="text"
                      value={editingEntry.comment || ''}
                      onChange={(e) => updateEditingEntry({ comment: e.target.value })}
                      placeholder="例如：主要地点"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="block mb-1 font-medium">插入位置</span>
                      <select
                        value={editingEntry.position}
                        onChange={(event) => updateEditingEntry({ position: Number(event.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        {POSITION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="block mb-1 font-medium">插入顺序</span>
                      <input
                        type="number"
                        value={editingEntry.order}
                        onChange={(event) => updateEditingEntry({ order: Number(event.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </label>
                    {editingEntry.position === 4 && (
                      <>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">聊天深度</span>
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            value={editingEntry.depth ?? WORLDBOOK_DEFAULTS.DEFAULT_DEPTH}
                            onChange={(event) => updateEditingEntry({ depth: Number(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">消息角色</span>
                          <select
                            value={editingEntry.role ?? 0}
                            onChange={(event) => updateEditingEntry({ role: Number(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          >
                            {ROLE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    {editingEntry.position === 7 && (
                      <label className="md:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="block mb-1 font-medium">提示出口名称</span>
                        <input
                          type="text"
                          value={editingEntry.outletName || ''}
                          onChange={(event) => updateEditingEntry({ outletName: event.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingEntry.enabled}
                        onChange={(event) => updateEditingEntry({ enabled: event.target.checked })}
                      />
                      启用
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingEntry.constant}
                        onChange={(event) => updateEditingEntry(event.target.checked
                          ? { constant: true, preventRecursion: true }
                          : { constant: false })}
                      />
                      常驻激活
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingEntry.selective}
                        onChange={(event) => updateEditingEntry({ selective: event.target.checked })}
                      />
                      使用辅助关键词逻辑
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(value => !value)}
                    className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    aria-expanded={showAdvanced}
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      SillyTavern 高级字段
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="space-y-5 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">辅助关键词（逗号分隔）</span>
                          <input
                            type="text"
                            value={(editingEntry.keysecondary || []).join(', ')}
                            onChange={(event) => updateEditingEntry({
                              keysecondary: event.target.value.split(/[,，]/).map(key => key.trim()).filter(Boolean),
                            })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">辅助关键词逻辑</span>
                          <select
                            value={editingEntry.selectiveLogic ?? 0}
                            onChange={(event) => updateEditingEntry({ selectiveLogic: Number(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          >
                            {SELECTIVE_LOGIC_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">条目扫描深度</span>
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            value={editingEntry.scanDepth ?? ''}
                            placeholder="使用全局设置"
                            onChange={(event) => updateEditingEntry({ scanDepth: nullableNumber(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">触发概率</span>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={editingEntry.useProbability ?? true}
                              onChange={(event) => updateEditingEntry({ useProbability: event.target.checked })}
                              aria-label="启用触发概率"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!(editingEntry.useProbability ?? true)}
                              value={editingEntry.probability ?? WORLDBOOK_DEFAULTS.DEFAULT_PROBABILITY}
                              onChange={(event) => updateEditingEntry({ probability: Number(event.target.value) })}
                              className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                            />
                          </div>
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">大小写匹配</span>
                          <select
                            value={triStateValue(editingEntry.caseSensitive)}
                            onChange={(event) => updateEditingEntry({ caseSensitive: parseTriState(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          >
                            <option value="inherit">继承全局</option>
                            <option value="true">区分</option>
                            <option value="false">不区分</option>
                          </select>
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">整词匹配</span>
                          <select
                            value={triStateValue(editingEntry.matchWholeWords)}
                            onChange={(event) => updateEditingEntry({ matchWholeWords: parseTriState(event.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          >
                            <option value="inherit">继承全局</option>
                            <option value="true">启用</option>
                            <option value="false">禁用</option>
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">黏性轮数</span>
                          <input type="number" min={0} value={editingEntry.sticky ?? ''} onChange={(event) => updateEditingEntry({ sticky: nullableNumber(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">冷却轮数</span>
                          <input type="number" min={0} value={editingEntry.cooldown ?? ''} onChange={(event) => updateEditingEntry({ cooldown: nullableNumber(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">聊天延迟轮数</span>
                          <input type="number" min={0} value={editingEntry.delay ?? ''} onChange={(event) => updateEditingEntry({ delay: nullableNumber(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">延迟到递归层级</span>
                          <input type="number" min={0} value={editingEntry.delayUntilRecursion || 0} onChange={(event) => updateEditingEntry({ delayUntilRecursion: Number(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">包含组</span>
                          <input type="text" value={editingEntry.group || ''} onChange={(event) => updateEditingEntry({ group: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">组权重</span>
                          <input type="number" min={0} value={editingEntry.groupWeight ?? WORLDBOOK_DEFAULTS.DEFAULT_WEIGHT} onChange={(event) => updateEditingEntry({ groupWeight: Number(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-700 dark:text-slate-300">
                        {[
                          ['excludeRecursion', '不在递归扫描中触发'],
                          ['preventRecursion', '不触发其他递归条目'],
                          ['groupOverride', '组内优先覆盖'],
                          ['vectorized', '向量化匹配'],
                          ['ignoreBudget', '忽略世界书预算'],
                          ['matchPersonaDescription', '扫描用户人设'],
                          ['matchCharacterDescription', '扫描角色描述'],
                          ['matchCharacterPersonality', '扫描角色性格'],
                          ['matchCharacterDepthPrompt', '扫描角色深度提示'],
                          ['matchScenario', '扫描场景'],
                          ['matchCreatorNotes', '扫描创作者备注'],
                        ].map(([field, label]) => (
                          <label key={field} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(editingEntry[field as keyof WorldBookEntry])}
                              onChange={(event) => updateEditingEntry({ [field]: event.target.checked })}
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">组评分</span>
                          <select value={triStateValue(editingEntry.useGroupScoring)} onChange={(event) => updateEditingEntry({ useGroupScoring: parseTriState(event.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                            <option value="inherit">继承全局</option>
                            <option value="true">启用</option>
                            <option value="false">禁用</option>
                          </select>
                        </label>
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">生成类型触发器（逗号分隔）</span>
                          <input type="text" value={(editingEntry.triggers || []).join(', ')} onChange={(event) => updateEditingEntry({ triggers: event.target.value.split(/[,，]/).map(value => value.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                        <label className="md:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="block mb-1 font-medium">自动化 ID</span>
                          <input type="text" value={editingEntry.automationId || ''} onChange={(event) => updateEditingEntry({ automationId: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 按钮 */}
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                // 显示模式
                <div>
                  {/* 标题行 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.keys.map((key, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                          >
                            {key}
                          </span>
                        ))}
                        {entry.constant && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                            永久
                          </span>
                        )}
                        {!entry.enabled && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                            已禁用
                          </span>
                        )}
                      </div>
                      {entry.comment && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(entry)}
                        aria-label={`编辑世界书条目 ${entry.comment || entry.uid}`}
                        title="编辑条目"
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这个条目吗？')) {
                            deleteWorldBookEntry(entry.uid);
                          }
                        }}
                        aria-label={`删除世界书条目 ${entry.comment || entry.uid}`}
                        title="删除条目"
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 内容 */}
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {entry.content || '（无内容）'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>位置：{POSITION_OPTIONS.find(option => option.value === entry.position)?.label || entry.position}</span>
                    <span>顺序：{entry.order}</span>
                    {entry.position === 4 && <span>深度：{entry.depth ?? WORLDBOOK_DEFAULTS.DEFAULT_DEPTH}</span>}
                    {entry.scanDepth != null && <span>扫描：{entry.scanDepth}</span>}
                    {entry.keysecondary && entry.keysecondary.length > 0 && <span>辅助词：{entry.keysecondary.length}</span>}
                    {entry.sticky != null && <span>黏性：{entry.sticky}</span>}
                    {entry.cooldown != null && <span>冷却：{entry.cooldown}</span>}
                    {entry.delay != null && <span>延迟：{entry.delay}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 预览确认对话框 */}
      {showPreview && (
        <PreviewDialog
          entries={previewEntries}
          issues={previewIssues}
          mode={previewMode}
          onConfirm={handleConfirmPreview}
          onCancel={() => {
            setShowPreview(false);
            setPreviewEntries([]);
            setPreviewIssues([]);
          }}
        />
      )}
    </div>
  );
}

/**
 * 预览对话框组件
 */
function PreviewDialog({
  entries,
  issues,
  mode,
  onConfirm,
  onCancel,
}: {
  entries: Partial<WorldBookEntry>[];
  issues: string[][];
  mode: 'generate' | 'audit';
  onConfirm: (selectedIndices: number[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(entries.map((_, idx) => idx)) // 默认全选
  );

  const toggleSelect = (idx: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              {mode === 'audit' ? '世界书审计候选预览' : 'AI 生成与审计结果预览'}
            </h2>
            <p className="text-sm text-indigo-100 mt-1">
              {mode === 'audit'
                ? '只有勾选并确认的修订才会覆盖对应条目'
                : '条目已经过独立审计，请勾选要添加的内容'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selected.has(idx)
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => toggleSelect(idx)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected.has(idx)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected.has(idx) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.keys?.map((key, kidx) => (
                        <span
                          key={kidx}
                          className="px-2 py-0.5 text-xs rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                        >
                          {key}
                        </span>
                      ))}
                      {entry.comment && (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          {entry.comment}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-2">
                      {entry.content}
                    </p>
                    {(issues[idx]?.length || 0) > 0 && (
                      <div className="mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <div className="font-semibold mb-1">审计提醒</div>
                        {(issues[idx] || []).map((issue, issueIndex) => (
                          <div key={issueIndex}>- {issue}</div>
                        ))}
                      </div>
                    )}
                    {(entry.cooldown || entry.sticky) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
                        {entry.cooldown && (
                          <span>⏱️ 冷却: {entry.cooldown}轮</span>
                        )}
                        {entry.sticky && (
                          <span>📌 粘性: {entry.sticky}轮</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            已选择 {selected.size} / {entries.length} 个条目
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'audit' ? '应用选中的修订' : '添加选中的条目'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
