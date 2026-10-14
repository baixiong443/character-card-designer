'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities -- Imported cards and AI payloads are schema-flexible. */

import { useState } from 'react';
import { X, Upload, FileJson, Loader, AlertCircle, CheckCircle, Info, ClipboardPaste } from 'lucide-react';
import { useAIService } from '@/services/aiService';
import { useProgressStore } from '@/stores/progressStore';
import {
  normalizeCharacterCard,
  readCharacterCardFromPng,
} from '@/lib/characterCard';

interface ImportCardDialogProps {
  onClose: () => void;
  onImportComplete: (stageResults: string[]) => void;
}

export default function ImportCardDialog({ onClose, onImportComplete }: ImportCardDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cardInfo, setCardInfo] = useState<string>('');
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const { generateResponse } = useAIService();
  const { loadImportedCard } = useProgressStore();

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('无法读取 PNG 图片'));
    reader.readAsDataURL(file);
  });

  const importCardData = async (
    cardData: any,
    options: {
      isPng?: boolean;
      sourceImageDataUrl?: string;
      pngMetadataKeyword?: 'chara' | 'ccv3';
    } = {},
  ) => {
    const normalized = normalizeCharacterCard(cardData, {
      sourceFormat: options.isPng ? 'png' : 'json',
      sourceImageDataUrl: options.sourceImageDataUrl,
      pngMetadataKeyword: options.pngMetadataKeyword,
    });
    loadImportedCard(normalized);

    const name = normalized.character.name || '未知';
    const version = normalized.envelope.sourceSpecVersion || normalized.envelope.sourceSpec;
    const worldBookCount = normalized.characterBook?.entries?.length || 0;
    const hasTimeline = Boolean(normalized.psycheTimeline?.plan);
    setCardInfo(
      `已识别角色卡：${name} (${version})`
      + `${options.isPng ? `，PNG 元数据：${options.pngMetadataKeyword}` : ''}`
      + `${worldBookCount > 0 ? `，包含 ${worldBookCount} 个世界书条目` : ''}`
      + `${hasTimeline ? `，包含 ${normalized.psycheTimeline!.plan!.events.length} 个 PTE 事件` : ''}`
      + `${normalized.warnings.length > 0 ? `，${normalized.warnings.join('；')}` : ''}`
      + `${hasTimeline ? '。正在按结构化字段导入...' : '。正在使用 AI 智能分析...'}`,
    );

    const originalData = cardData.data && typeof cardData.data === 'object' ? cardData.data : cardData;
    const analysisCard = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        ...originalData,
        ...normalized.character,
        character_book: normalized.characterBook,
      },
    };
    const stageResults = hasTimeline
      ? parseCharacterCard(analysisCard)
      : await parseCharacterCardWithAI(analysisCard);

    setSuccess(true);
    setTimeout(() => {
      onImportComplete(stageResults);
      onClose();
    }, hasTimeline ? 500 : 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setCardInfo('');

    try {
      let cardData: any;
      let sourceImageDataUrl: string | undefined;
      let pngMetadataKeyword: 'chara' | 'ccv3' | undefined;
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

      if (isPng) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const parsed = readCharacterCardFromPng(bytes);
        cardData = parsed.card;
        pngMetadataKeyword = parsed.keyword;
        sourceImageDataUrl = await fileToDataUrl(file);
      } else {
        try {
          cardData = JSON.parse(await file.text());
        } catch {
          throw new Error('无效的 JSON 角色卡文件');
        }
      }

      await importCardData(cardData, { isPng, sourceImageDataUrl, pngMetadataKeyword });
    } catch (error: any) {
      console.error('解析角色卡失败:', error);
      setError(error.message || '解析失败，请确保上传的是有效的Character Card JSON文件');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJsonPaste = async () => {
    if (!pastedJson.trim() || isProcessing) return;
    setIsProcessing(true);
    setError('');
    setCardInfo('');
    try {
      await importCardData(JSON.parse(pastedJson));
    } catch (error: any) {
      console.error('解析粘贴的角色卡失败:', error);
      setError(error instanceof SyntaxError ? '粘贴内容不是有效 JSON' : error.message || '角色卡导入失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 使用AI智能分析角色卡内容
  const parseCharacterCardWithAI = async (cardData: any): Promise<string[]> => {
    // 提取所有可用的信息
    const data = cardData.data || cardData;
    const allContent = {
      name: data.name || '',
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      first_mes: data.first_mes || '',
      mes_example: data.mes_example || '',
      creator_notes: data.creator_notes || '',
      system_prompt: data.system_prompt || '',
      tags: data.tags || [],
      alternate_greetings: data.alternate_greetings || [],
      extensions: data.extensions || {}
    };

    // 构建提示词，让AI智能分析
    const analysisPrompt = `你是一个专业的角色卡分析助手。请仔细分析以下角色卡的JSON数据，然后按照7个创作阶段提取和整理信息。

**重要说明**：
- 角色卡的内容可能混乱，description字段可能包含多种信息
- 需要你智能地识别哪些内容属于哪个阶段
- 如果某个阶段缺少信息，请标注"【需要补充】"
- 不要生搬硬套，要理解内容的实质

**角色卡原始数据**：
\`\`\`json
${JSON.stringify(allContent, null, 2)}
\`\`\`

**请按以下格式输出（严格使用标记分隔）**：

【阶段1：基础身份】
（提取：角色名称、物种/种族、核心性格特征、年龄、性别等基础信息）

【阶段2：深度背景】
（提取：出生地、成长经历、重要事件、核心动机、人际关系等背景故事）

【阶段3：物理描写】
（提取：外貌特征、身高体型、面部特征、发色眼色、穿着风格、身体细节等）

【阶段4：互动设计】
（提取：对话风格、语言特点、口头禅、对话示例、第一句话等）

【阶段5：世界整合】
（提取：所处世界、场景设定、世界观规则、环境氛围、系统提示等）

【阶段6：感官细节】
（提取：感官描写、Furry特征、男性特征、气味描写、触觉细节等，如果没有明确的感官细节，请标注"【需要补充】"并给出建议）

【阶段7：质量总结】
（总结已有信息的完整度，指出哪些地方需要完善）

**注意**：
- 从description中智能提取不同类型的信息
- 对话示例要保持原格式
- 如果信息混在一起，要合理分类
- 缺失的部分要明确指出`;

    try {
      const analysis = await generateResponse(
        [{ role: 'user', content: analysisPrompt }],
        '你是一个专业的角色卡分析助手，擅长从混乱的文本中智能提取和分类信息。'
      );

      // 解析AI的分析结果
      const results: string[] = [];
      
      const stage1Match = analysis.match(/【阶段1：基础身份】([\s\S]*?)(?=【阶段2|$)/);
      const stage2Match = analysis.match(/【阶段2：深度背景】([\s\S]*?)(?=【阶段3|$)/);
      const stage3Match = analysis.match(/【阶段3：物理描写】([\s\S]*?)(?=【阶段4|$)/);
      const stage4Match = analysis.match(/【阶段4：互动设计】([\s\S]*?)(?=【阶段5|$)/);
      const stage5Match = analysis.match(/【阶段5：世界整合】([\s\S]*?)(?=【阶段6|$)/);
      const stage6Match = analysis.match(/【阶段6：感官细节】([\s\S]*?)(?=【阶段7|$)/);
      const stage7Match = analysis.match(/【阶段7：质量总结】([\s\S]*?)$/);

      results[0] = stage1Match ? stage1Match[1].trim() : '【需要补充】基础身份信息';
      results[1] = stage2Match ? stage2Match[1].trim() : '【需要补充】深度背景故事';
      results[2] = stage3Match ? stage3Match[1].trim() : '【需要补充】物理外貌描写';
      results[3] = stage4Match ? stage4Match[1].trim() : '【需要补充】互动对话设计';
      results[4] = stage5Match ? stage5Match[1].trim() : '【需要补充】世界观设定';
      results[5] = stage6Match ? stage6Match[1].trim() : '【需要补充】详细感官描写（建议添加）';
      results[6] = stage7Match ? stage7Match[1].trim() : '角色卡已导入，请逐个阶段检查和完善';

      return results;
    } catch (error) {
      console.error('AI分析失败，使用基础解析:', error);
      // 如果AI分析失败，回退到基础解析
      return parseCharacterCard(cardData);
    }
  };

  const parseCharacterCard = (cardData: any): string[] => {
    const results: string[] = [];

    // 判断是V2还是V3格式
    const isV3 = cardData.spec === 'chara_card_v3' || cardData.spec_version === '3.0';
    const data = cardData.data || cardData;

    // 阶段1：基础身份
    const stage1Parts: string[] = [];
    stage1Parts.push(`**角色名称**：${data.name || '未设定'}`);
    
    if (data.tags && data.tags.length > 0) {
      const speciesTags = data.tags.filter((tag: string) => 
        tag.includes('species:') || tag.includes('race:') || 
        tag.includes('furry') || tag.includes('人类') || tag.includes('精灵')
      );
      if (speciesTags.length > 0) {
        stage1Parts.push(`**物种/种族**：${speciesTags.join(', ').replace(/species:|race:/g, '')}`);
      }
    }
    
    if (data.personality) {
      stage1Parts.push(`\n**核心性格**：\n${data.personality}`);
    }
    
    results[0] = stage1Parts.join('\n');

    // 阶段2：深度背景
    const stage2Parts: string[] = [];
    
    if (data.description) {
      stage2Parts.push(`**角色背景**：\n${data.description}`);
    }
    
    if (data.creator_notes) {
      stage2Parts.push(`\n**创作者笔记**：\n${data.creator_notes}`);
    }
    
    if (isV3 && data.extensions?.psyche_extensions?.background) {
      stage2Parts.push(`\n**详细背景**：\n${data.extensions.psyche_extensions.background}`);
    }
    
    results[1] = stage2Parts.join('\n') || '未设定详细背景';

    // 阶段3：物理描写
    const stage3Parts: string[] = [];
    
    // 从description中提取外貌描写（通常在description中会包含）
    if (data.description) {
      const appearanceKeywords = ['外貌', '外观', '长相', '身高', '体型', '头发', '眼睛', '穿着', '服装'];
      const descLines = data.description.split('\n');
      const appearanceLines = descLines.filter((line: string) => 
        appearanceKeywords.some(keyword => line.includes(keyword))
      );
      if (appearanceLines.length > 0) {
        stage3Parts.push(appearanceLines.join('\n'));
      }
    }
    
    if (isV3 && data.extensions?.psyche_extensions?.physical_details) {
      stage3Parts.push(`\n**详细物理描写**：\n${JSON.stringify(data.extensions.psyche_extensions.physical_details, null, 2)}`);
    }
    
    results[2] = stage3Parts.join('\n') || '未设定详细外貌（可能包含在背景描述中）';

    // 阶段4：互动设计
    const stage4Parts: string[] = [];
    
    if (data.first_mes) {
      stage4Parts.push(`**第一条消息**：\n${data.first_mes}`);
    }
    
    if (data.mes_example) {
      stage4Parts.push(`\n**对话示例**：\n${data.mes_example}`);
    }
    
    if (data.alternate_greetings && data.alternate_greetings.length > 0) {
      stage4Parts.push(`\n**备用问候语**：\n${data.alternate_greetings.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')}`);
    }
    
    results[3] = stage4Parts.join('\n') || '未设定对话示例';

    // 阶段5：世界整合
    const stage5Parts: string[] = [];
    
    if (data.scenario) {
      stage5Parts.push(`**场景设定**：\n${data.scenario}`);
    }
    
    if (data.system_prompt) {
      stage5Parts.push(`\n**系统提示**：\n${data.system_prompt}`);
    }
    
    if (data.post_history_instructions) {
      stage5Parts.push(`\n**后续指令**：\n${data.post_history_instructions}`);
    }
    
    if (isV3 && data.extensions?.world_book) {
      stage5Parts.push(`\n**世界书**：已包含 ${Object.keys(data.extensions.world_book).length} 个条目`);
    }
    
    results[4] = stage5Parts.join('\n') || '未设定场景和世界观';

    // 阶段6：感官细节
    let stage6Content = '';
    
    if (isV3 && data.extensions?.psyche_extensions) {
      const psycheExt = data.extensions.psyche_extensions;
      const sensoryParts: string[] = [];
      
      if (psycheExt.sensory_details) {
        sensoryParts.push(`**感官细节**：\n${JSON.stringify(psycheExt.sensory_details, null, 2)}`);
      }
      
      if (psycheExt.furry_features) {
        sensoryParts.push(`\n**Furry特征**：\n${JSON.stringify(psycheExt.furry_features, null, 2)}`);
      }
      
      if (psycheExt.male_features) {
        sensoryParts.push(`\n**男性特征**：\n${JSON.stringify(psycheExt.male_features, null, 2)}`);
      }
      
      if (psycheExt.fetish_elements) {
        sensoryParts.push(`\n**Fetish元素**：\n${JSON.stringify(psycheExt.fetish_elements, null, 2)}`);
      }
      
      stage6Content = sensoryParts.join('\n');
    }
    
    results[5] = stage6Content || '未设定详细感官描写（建议在此阶段添加）';

    // 阶段7：质量检查总结
    const stage7Parts: string[] = [];
    stage7Parts.push(`**角色卡导入总结**`);
    stage7Parts.push(`\n角色名称：${data.name}`);
    stage7Parts.push(`格式版本：${isV3 ? 'Character Card V3' : 'Character Card V2'}`);
    if (data.creator) {
      stage7Parts.push(`原创作者：${data.creator}`);
    }
    if (data.character_version) {
      stage7Parts.push(`角色版本：${data.character_version}`);
    }
    
    stage7Parts.push(`\n**已导入内容**：`);
    stage7Parts.push(`✓ 阶段1：基础身份信息`);
    stage7Parts.push(`✓ 阶段2：背景故事`);
    stage7Parts.push(`✓ 阶段3：物理描写`);
    stage7Parts.push(`✓ 阶段4：对话示例`);
    stage7Parts.push(`✓ 阶段5：世界观设定`);
    stage7Parts.push(`${stage6Content ? '✓' : '○'} 阶段6：感官细节${stage6Content ? '' : '（需要补充）'}`);
    
    stage7Parts.push(`\n**建议**：`);
    stage7Parts.push(`- 检查各阶段内容是否完整`);
    stage7Parts.push(`- 根据需要在任意阶段进行修改`);
    stage7Parts.push(`- 特别注意阶段6的感官细节描写`);
    stage7Parts.push(`- 完成后重新导出为新的角色卡`);
    
    results[6] = stage7Parts.join('\n');

    return results;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <FileJson className="w-5 h-5 mr-2 text-indigo-600" />
            导入角色卡编辑
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
              <p className="font-semibold mb-2 flex items-center">
                <Info className="w-4 h-4 mr-1" />
                功能说明：
              </p>
              <ul className="space-y-1 text-xs">
                <li>• 上传角色卡 JSON（V1/V2/V3）或 SillyTavern PNG Card</li>
                <li>• <strong>AI智能分析</strong>：自动识别混乱的description字段，智能分类到各阶段</li>
                <li>• 支持任意结构的角色卡，不要求严格格式</li>
                <li>• 缺失的内容会自动标注"【需要补充】"</li>
                <li>• 您可以在任意阶段查看、修改、完善内容</li>
                <li>• 支持SillyTavern、Agnai等平台导出的角色卡</li>
              </ul>
            </div>
          </div>

          {/* 支持的格式 */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              支持的格式：
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-slate-600 dark:text-slate-400">Character Card V3 (.json)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-slate-600 dark:text-slate-400">Character Card V1/V2 (.json)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-slate-600 dark:text-slate-400">SillyTavern PNG (chara/ccv3)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-slate-600 dark:text-slate-400">Agnai 格式</span>
              </div>
            </div>
          </div>

          {/* 文件上传区域 */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".json,.png,application/json,image/png"
              onChange={handleFileUpload}
              className="hidden"
              id="card-file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="card-file-upload"
              className="cursor-pointer block"
            >
              <div className="flex flex-col items-center space-y-3">
                {isProcessing ? (
                  <Loader className="w-12 h-12 text-indigo-600 animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-slate-400" />
                )}
                <div>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                    {isProcessing ? '正在解析角色卡...' : '点击上传角色卡文件'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    支持 JSON（V1/V2/V3）与 PNG Card
                  </p>
                </div>
              </div>
            </label>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <button
              type="button"
              onClick={() => setShowJsonPaste(value => !value)}
              disabled={isProcessing}
              className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                粘贴角色卡 JSON
              </span>
              <span className="text-xs text-slate-500">{showJsonPaste ? '收起' : '展开'}</span>
            </button>
            {showJsonPaste && (
              <div className="mt-3 space-y-3">
                <textarea
                  value={pastedJson}
                  onChange={event => setPastedJson(event.target.value)}
                  placeholder="粘贴完整的 Character Card V1、V2 或 V3 JSON"
                  rows={8}
                  disabled={isProcessing}
                  className="w-full resize-y rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void handleJsonPaste()}
                  disabled={isProcessing || !pastedJson.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
                  解析并导入
                </button>
              </div>
            )}
          </div>

          {/* 角色卡信息 */}
          {cardInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">{cardInfo}</p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  支持 SillyTavern 的 chara / ccv3 PNG 元数据；ccv3 优先
                </p>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300">
                角色卡解析成功！正在导入到各阶段...
              </p>
            </div>
          )}

          {/* 使用提示 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>💡 AI智能分析：</strong>
              系统会使用AI读取角色卡的所有内容（包括混乱的description字段），智能识别并分类到各阶段。
              即使角色卡结构不规范，AI也能理解内容的实质并正确归类。
              导入后请检查各阶段，标注"【需要补充】"的地方需要您手动完善。
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
