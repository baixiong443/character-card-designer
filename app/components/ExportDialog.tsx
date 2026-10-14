'use client';

import { useState } from 'react';
import { X, Download, FileJson, Image as ImageIcon, FileText, AlertCircle, Archive, Check } from 'lucide-react';
import { createDefaultCharacter, useProgressStore } from '@/stores/progressStore';
import { CharacterBook, convertToCharacterBookEntry, WORLDBOOK_DEFAULTS } from '@/types/worldbook';
import {
  buildCharacterCardV2,
  buildCharacterCardV3,
  validateCharacterCard,
  writeCharacterCardPng,
} from '@/lib/characterCard';
import {
  buildCardTimelineExtension,
  buildPsycheBookBytes,
  validatePsycheTimelineState,
} from '@/lib/psycheTimeline';
import { getStorySourceCorpus } from '@/lib/storySourceDb';

interface ExportDialogProps {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const project = useProgressStore(state => state.getCurrentProject());
  const character = project?.character || createDefaultCharacter();
  const sourceEnvelope = project?.sourceEnvelope || null;
  const entries = project?.worldBookEntries || [];
  const bookMetadata = project?.bookMetadata || null;
  const psycheTimeline = project?.psycheTimeline || null;
  const [format, setFormat] = useState<'v3' | 'v2' | 'png' | 'psychebook' | 'markdown'>('v3');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(sourceEnvelope?.sourceImageDataUrl ?? null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const buildCharacterBook = (): CharacterBook | undefined => {
    if (entries.length === 0 && !bookMetadata) return undefined;

    return {
      ...bookMetadata,
      name: bookMetadata?.name ?? `${character.name || 'Character'}'s Lorebook`,
      description: bookMetadata?.description ?? '由 Psyche 角色卡设计器生成的世界书',
      scan_depth: bookMetadata?.scan_depth ?? WORLDBOOK_DEFAULTS.DEFAULT_SCAN_DEPTH,
      token_budget: bookMetadata?.token_budget ?? WORLDBOOK_DEFAULTS.DEFAULT_TOKEN_BUDGET,
      recursive_scanning: bookMetadata?.recursive_scanning ?? WORLDBOOK_DEFAULTS.DEFAULT_RECURSIVE_SCANNING,
      extensions: bookMetadata?.extensions ?? {},
      entries: entries.map(entry => convertToCharacterBookEntry(entry)),
    };
  };

  const checkCard = (card: unknown): boolean => {
    const result = validateCharacterCard(card);
    setDiagnostics([...result.errors, ...result.warnings]);
    return result.errors.length === 0;
  };

  const buildTimelineExtension = () => buildCardTimelineExtension(psycheTimeline, true);

  const handleExport = async () => {
    try {
      switch (format) {
        case 'v3':
          exportV3JSON();
          break;
        case 'v2':
          exportV2JSON();
          break;
        case 'png':
          void exportPNG();
          break;
        case 'psychebook':
          await exportPsycheBook();
          break;
        case 'markdown':
          exportMarkdown();
          break;
      }
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : String(error)]);
    }
  };

  const exportV3JSON = () => {
    const v3Card = buildCharacterCardV3(
      character,
      sourceEnvelope,
      buildCharacterBook(),
      buildTimelineExtension(),
    );
    if (!checkCard(v3Card)) return;
    downloadJSON(v3Card, `${character.name || 'character'}_v3.json`);
  };

  const exportV2JSON = () => {
    const v2Card = buildCharacterCardV2(
      character,
      sourceEnvelope,
      buildCharacterBook(),
      buildTimelineExtension(),
    );
    if (!checkCard(v2Card)) return;
    downloadJSON(v2Card, `${character.name || 'character'}_v2.json`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件！');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const exportPNG = async () => {
    if (!uploadedImage) {
      setShowImageUpload(true);
      return;
    }

    try {
      const characterBook = buildCharacterBook();
      const timelineExtension = buildTimelineExtension();
      const v2Card = buildCharacterCardV2(character, sourceEnvelope, characterBook, timelineExtension);
      const v3Card = buildCharacterCardV3(character, sourceEnvelope, characterBook, timelineExtension);
      if (!checkCard(v2Card) || !checkCard(v3Card)) return;

      // 创建 canvas 并绘制图片
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas 初始化失败');
          return;
        }

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 获取图片数据
        canvas.toBlob(async (blob) => {
          if (!blob) {
            alert('图片处理失败');
            return;
          }

          // 读取 blob 为 ArrayBuffer
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // SillyTavern 1.18 同时写入 chara(V2) 与 ccv3(V3)，读取时优先 ccv3。
          const pngWithMetadata = writeCharacterCardPng(uint8Array, v2Card, v3Card);

          // 下载
          const finalBlob = new Blob([pngWithMetadata as unknown as BlobPart], { type: 'image/png' });
          const url = URL.createObjectURL(finalBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${character.name || 'character'}_card.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          alert('PNG Card 导出成功！');
          setShowImageUpload(false);
          setUploadedImage(null);
        }, 'image/png');
      };

      img.onerror = () => {
        alert('图片加载失败');
      };

      img.src = uploadedImage;
    } catch (error) {
      console.error('PNG 导出失败:', error);
      alert('PNG 导出失败，请重试');
    }
  };

  const exportPsycheBook = async () => {
    if (!psycheTimeline?.plan) {
      setDiagnostics(['当前项目没有可导出的结构化时间线。请使用“剧情线模式”完成文本导入。']);
      return;
    }
    const validation = validatePsycheTimelineState(psycheTimeline);
    if (!validation.valid) {
      setDiagnostics(validation.errors);
      return;
    }
    try {
      const source = project?.storySource
        ? await getStorySourceCorpus(project.storySource.corpusId)
        : null;
      if (project?.storySource && !source) {
        setDiagnostics(['项目引用的原文库不存在，无法生成包含原作索引的故事包。请重新导入原文。']);
        return;
      }
      const bytes = buildPsycheBookBytes(psycheTimeline, '1.0.0', source || undefined);
      downloadBinary(bytes, `${character.name || psycheTimeline.plan.title || 'story'}.psychebook`, 'application/zip');
      setDiagnostics([]);
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : String(error)]);
    }
  };

  const exportMarkdown = () => {
    const markdown = `# ${character.name || '未命名角色'}

## 基础信息

**角色名称**: ${character.name || '未命名'}

## 描述

${character.description || '暂无描述'}

## 性格

${character.personality || '暂无'}

## 场景

${character.scenario || '暂无'}

## 首条消息

${character.first_mes || '暂无'}

## 对话示例

${character.mes_example || '暂无'}

## 标签

${character.tags?.join(', ') || '无'}

---

*由 Psyche 角色卡设计器创建*
`;

    downloadText(markdown, `${character.name || 'character'}.md`);
  };

  const downloadJSON = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBinary = (data: Uint8Array, filename: string, type: string) => {
    const blob = new Blob([data as unknown as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Download className="w-5 h-5 mr-2" />
            导出角色卡
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
          {/* 格式选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              选择导出格式
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setFormat('v3')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${
                  format === 'v3'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileJson className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Character Card V3 JSON
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    推荐 · SillyTavern 原生支持 · 包含所有扩展字段
                  </div>
                </div>
                {format === 'v3' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                onClick={() => setFormat('v2')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${
                  format === 'v2'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileJson className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Character Card V2 JSON
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    标准 V2 包装结构 · 完整字段 · 世界书兼容
                  </div>
                </div>
                {format === 'v2' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                onClick={() => setFormat('png')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${
                  format === 'png'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <ImageIcon className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    PNG Card
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    图片嵌入 · 拖拽导入 · SillyTavern 直接识别
                  </div>
                </div>
                {format === 'png' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                onClick={() => setFormat('psychebook')}
                disabled={!psycheTimeline?.plan}
                title={psycheTimeline?.plan ? '导出供 Psyche Timeline Engine 安装的故事包' : '先用剧情线模式导入文本并完成结构化时间线编译'}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  format === 'psychebook'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Archive className="w-5 h-5 mr-3 text-amber-600 dark:text-amber-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    PTE 故事包 (.psychebook)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    插件安装包 · 结构化事件与初始状态 · 可摘要校验
                  </div>
                </div>
                {format === 'psychebook' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <button
                onClick={() => setFormat('markdown')}
                className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${
                  format === 'markdown'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileText className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Markdown 文档
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    人类可读 · 用于查看和分享
                  </div>
                </div>
                {format === 'markdown' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {diagnostics.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  {diagnostics.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
                </div>
              </div>
            </div>
          )}

          {/* 预览 */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              📝 <strong>角色名称:</strong> {character.name || '未命名角色'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              文件名: {character.name || 'character'}
              {format === 'markdown'
                ? '.md'
                : format === 'png'
                  ? '.png'
                  : format === 'psychebook'
                    ? '.psychebook'
                    : `_${format}.json`}
            </div>
            {psycheTimeline?.plan && (
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                PTE 时间线: {psycheTimeline.plan.events.length} 个事件 · {psycheTimeline.plan.storyId}
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>
        </div>
      </div>

      {/* PNG 图片上传对话框 */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📷 上传角色立绘
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                PNG Card 需要一张图片作为载体
              </p>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-4">
              {uploadedImage ? (
                <div>
                  <img
                    src={uploadedImage}
                    alt="预览"
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    重新选择图片
                  </button>
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                    <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      点击上传或拖拽图片到此处
                    </p>
                    <p className="text-xs text-slate-500">
                      支持 PNG、JPG、WEBP 格式
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}

              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  <strong>💡 提示：</strong>
                  <br />
                  • 同时嵌入 chara(V2) 与 ccv3(V3) 元数据
                  <br />
                  • SillyTavern 1.18 会优先读取 ccv3
                  <br />
                  • 从 PNG 导入的卡会自动沿用原图，也可以重新选择
                </p>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => {
                  setShowImageUpload(false);
                  setUploadedImage(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={exportPNG}
                disabled={!uploadedImage}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>生成 PNG Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
