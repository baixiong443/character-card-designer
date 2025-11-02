'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Sparkles, AlertCircle } from 'lucide-react';
import { useWorldBookStore } from '@/stores/worldbookStore';
import { WorldBookEntry } from '@/types/worldbook';
import { useAIService } from '@/services/aiService';

export default function WorldBookEditor() {
  const { entries, addEntry, updateEntry, deleteEntry } = useWorldBookStore();
  const { generateResponse, loading } = useAIService();
  
  const [editingEntry, setEditingEntry] = useState<WorldBookEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * 开始编辑条目
   */
  const handleEdit = (entry: WorldBookEntry) => {
    setEditingEntry({ ...entry });
  };

  /**
   * 保存编辑
   */
  const handleSave = () => {
    if (editingEntry) {
      updateEntry(editingEntry.uid, editingEntry);
      setEditingEntry(null);
    }
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setEditingEntry(null);
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
      // 构建 AI 提示词
      const prompt = `# 世界书生成任务

你是专业的世界书（Lorebook）设计师。请分析当前角色的设定，生成 3-5 个高质量的世界书条目。

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
   - 必须：主要地点（1个）
   - 必须：重要NPC或对手（1-2个）
   - 可选：标志性物品（1个）
   - 可选：Furry特征（如适用，1-2个）
   - 可选：游戏规则（如适用，1个）

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
【内容】
详细描述...（50-150字）

---

【关键词】关键词1, 关键词2
【内容】
详细描述...

---

...

## 开始生成

请根据当前角色的设定，生成 3-5 个世界书条目：`;

      const systemPrompt = `你是专业的世界书（Lorebook）设计师。你深度理解：
1. 世界书是动态知识注入系统，按关键词触发
2. 条目内容要精炼（50-150字），信息密集
3. 关键词要多样（中英文、别名、简称）
4. 条目之间要相互关联，构成完整世界观
5. Furry角色需要详细的身体细节（毛皮/尾巴/肉垫/信息素）
6. RPG角色需要清晰的游戏机制
7. 必须使用标准格式：【关键词】...【内容】...，条目间用"---"分隔

你生成的世界书将被 SillyTavern 等平台直接使用，因此质量至关重要。`;

      const response = await generateResponse(
        [{ role: 'user', content: prompt }],
        systemPrompt
      );

      // 解析 AI 响应
      const parsedEntries = parseAIGeneratedEntries(response);
      
      if (parsedEntries.length > 0) {
        // 添加到世界书
        parsedEntries.forEach(entry => addEntry(entry));
        alert(`成功生成 ${parsedEntries.length} 个世界书条目！`);
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

  /**
   * 解析 AI 生成的条目
   */
  const parseAIGeneratedEntries = (text: string): Partial<WorldBookEntry>[] => {
    const entries: Partial<WorldBookEntry>[] = [];
    
    // 按 "---" 分割
    const blocks = text.split('---').map(b => b.trim()).filter(b => b);
    
    for (const block of blocks) {
      // 提取关键词
      const keysMatch = block.match(/【关键词】([^\n]+)/);
      const keys = keysMatch 
        ? keysMatch[1].split(/[,，]/).map(k => k.trim()).filter(k => k)
        : [];
      
      // 提取内容
      const contentMatch = block.match(/【内容】\s*([^【]+)/s);
      const content = contentMatch ? contentMatch[1].trim() : '';
      
      if (keys.length > 0 && content) {
        entries.push({
          keys,
          content,
          comment: keys[0], // 用第一个关键词作为备注
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
            disabled={isGenerating || loading}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            {isGenerating ? '生成中...' : 'AI生成'}
          </button>
          <button
            onClick={() => addEntry()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            添加条目
          </button>
        </div>
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

                  {/* 高级选项 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingEntry.constant}
                          onChange={(e) => updateEditingEntry({ constant: e.target.checked })}
                          className="mr-2"
                        />
                        永久激活（忽略关键词）
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingEntry.enabled}
                          onChange={(e) => updateEditingEntry({ enabled: e.target.checked })}
                          className="mr-2"
                        />
                        启用
                      </label>
                    </div>
                  </div>

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
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这个条目吗？')) {
                            deleteEntry(entry.uid);
                          }
                        }}
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

