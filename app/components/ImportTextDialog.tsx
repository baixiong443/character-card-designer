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
      const analysisPrompt = `请仔细分析以下文本，提取角色信息并按以下格式输出（严格按照标记分隔）：

【阶段1：基础身份】
- 角色名称：
- 物种/种族：
- 核心性格：
- 年龄：
- 性别：

【阶段2：深度背景】
- 出生地：
- 成长环境：
- 重要经历：
- 核心动机：
- 人际关系：

【阶段3：物理描写】
（详细的外貌描写，包括身高体型、面部特征、穿着风格等）

【阶段4：互动设计】
- 对话风格：
- 语言特点：
- 口头禅：
（如果有对话示例请列出）

【阶段5：世界整合】
- 所处世界：
- 世界观设定：
- 重要地点：
- 环境氛围：

如果某些信息在文本中没有，请标注"未提及"。

文本内容：
${text}`;

      const analysis = await generateResponse(
        [{ role: 'user', content: analysisPrompt }],
        '你是一个专业的文本分析助手，擅长从文本中提取角色设定信息。'
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

    results[0] = stage1Match ? stage1Match[1].trim() : '未能提取到基础身份信息';
    results[1] = stage2Match ? stage2Match[1].trim() : '未能提取到背景信息';
    results[2] = stage3Match ? stage3Match[1].trim() : '未能提取到物理描写';
    results[3] = stage4Match ? stage4Match[1].trim() : '未能提取到互动设计';
    results[4] = stage5Match ? stage5Match[1].trim() : '未能提取到世界设定';

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

