'use client';

import { useState } from 'react';
import { X, Upload, FileText, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useAIService } from '@/services/aiService';

interface ImportTextDialogProps {
  onClose: () => void;
  onImportComplete: (stageResults: string[]) => void;
}

export default function ImportTextDialog({ onClose, onImportComplete }: ImportTextDialogProps) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { generateResponse } = useAIService();

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

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('请先输入或上传文本');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // 让AI分析文本并提取各阶段内容
      const analysisPrompt = `你是一个专业的角色设定分析师。请深入分析以下文本（包括设定描述和对话内容），提取角色信息并分类整理。

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

【示例】
  主角背景：
  - 精灵王国覆灭 → 责任感和愧疚
  - 作为幸存守护者流浪
  - 渴望重建家园，但害怕失败

  人际关系：
  角色名：达伦（同伴）
  角色类型：重要NPC
  与主角关系：战友、旅伴
  已展现特征：勇敢但冲动，忠诚可靠
  关系动态：主角既依赖又保持距离，不愿连累他

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

请严格按照【阶段N：XXX】的格式标记，方便后续解析。

文本内容：
${text}`;

      const analysis = await generateResponse(
        [{ role: 'user', content: analysisPrompt }],
        `你是一个全方位的创作内容分析专家。你的任务是：
1. 提取文本中明确的信息（设定、描述）
2. 从对话和行为中总结隐含特征（如口头禅、说话习惯、行为模式）
3. 推断和归纳角色特点、世界规则、环境氛围
4. 将信息正确分类到对应维度：角色身份、背景、外貌、互动方式、世界观

你需要深入分析整个文本，包括对话、动作描写、心理活动，提取所有创作维度的完整信息。`
      );

      // 解析AI的分析结果，分割成各阶段
      const stageResults = parseAnalysisResult(analysis);
      
      setSuccess(true);
      setTimeout(() => {
        onImportComplete(stageResults);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('分析失败:', error);
      setError('AI分析失败，请检查API设置或稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAnalysisResult = (analysis: string): string[] => {
    const results: string[] = [];
    
    // 使用正则提取各阶段内容
    const stage1Match = analysis.match(/【阶段1：基础身份】([\s\S]*?)(?=【阶段2|$)/);
    const stage2Match = analysis.match(/【阶段2：深度背景】([\s\S]*?)(?=【阶段3|$)/);
    const stage3Match = analysis.match(/【阶段3：物理描写】([\s\S]*?)(?=【阶段4|$)/);
    const stage4Match = analysis.match(/【阶段4：互动设计】([\s\S]*?)(?=【阶段5|$)/);
    const stage5Match = analysis.match(/【阶段5：世界整合】([\s\S]*?)$/);

    // 从阶段2中提取人际关系部分作为独立的关系网络
    let backgroundInfo = stage2Match ? stage2Match[1].trim() : '未能提取到背景信息';
    let relationshipInfo = '';
    
    if (backgroundInfo.includes('人际关系')) {
      const parts = backgroundInfo.split(/人际关系[:：]/);
      if (parts.length > 1) {
        backgroundInfo = parts[0].trim();
        relationshipInfo = parts[1].trim();
      }
    }

    // 映射到StageFlow的9个阶段
    results[0] = stage1Match ? stage1Match[1].trim() : '未能提取到基础身份信息';
    results[1] = backgroundInfo; // 阶段2：深度背景（不含关系）
    results[2] = relationshipInfo || '未能提取到关系网络信息'; // 阶段3：关系网络
    results[3] = stage3Match ? stage3Match[1].trim() : '未能提取到物理描写'; // 阶段4：物理描写
    results[4] = ''; // 阶段5：专项深化（用户选择，导入时跳过）
    results[5] = stage4Match ? stage4Match[1].trim() : '未能提取到互动设计'; // 阶段6：互动设计
    results[6] = stage5Match ? stage5Match[1].trim() : '未能提取到世界设定'; // 阶段7：世界整合
    // results[7] 和 results[8] 是质量检查和导出阶段，不需要导入数据

    return results;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            导入文本分析
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 说明 */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
            <div className="text-sm text-indigo-700 dark:text-indigo-300">
              <p className="font-semibold mb-2">💡 如何使用：</p>
              <ul className="space-y-1 text-xs">
                <li>• 上传包含角色设定的文本文件（.txt、.md等）</li>
                <li>• 或直接在下方粘贴角色设定、小说片段、世界观笔记</li>
                <li>• AI会自动分析并提取：基础身份、背景、外貌、对话风格、世界观</li>
                <li>• 分析结果会自动填充到各个创作阶段</li>
                <li>• 您可以在此基础上继续完善和修改</li>
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
              placeholder="在此粘贴您的角色设定、小说片段或世界观描述...

示例：
艾莉娅是一位120岁的精灵女性，性格温柔善良但内心坚强。她出生于古老的精灵森林，父母都是精灵王国的守护者。在她年轻时经历了一场黑暗势力的入侵，这段经历让她决心成为一名保护者。她有着银色的长发，碧绿的眼睛，身材纤细修长。她说话轻柔但坚定，喜欢用古精灵语的诗句...
"
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
              disabled={isAnalyzing}
            />
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              已输入 {text.length} 字符
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300">
                分析完成！正在导入到各阶段...
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>AI 分析中...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>开始分析</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

