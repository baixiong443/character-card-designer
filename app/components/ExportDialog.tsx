'use client';

import { useState } from 'react';
import { X, Download, FileJson, Image, FileText } from 'lucide-react';
import { useCharacterStore } from '@/stores/characterStore';
import { useWorldBookStore } from '@/stores/worldbookStore';
import { convertToCharacterBookEntry, WORLDBOOK_DEFAULTS } from '@/types/worldbook';

interface ExportDialogProps {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const { character } = useCharacterStore();
  const { entries } = useWorldBookStore();
  const [format, setFormat] = useState<'v3' | 'v2' | 'png' | 'markdown'>('v3');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleExport = () => {
    switch (format) {
      case 'v3':
        exportV3JSON();
        break;
      case 'v2':
        exportV2JSON();
        break;
      case 'png':
        exportPNG();
        break;
      case 'markdown':
        exportMarkdown();
        break;
    }
  };

  const exportV3JSON = () => {
    // 转换世界书条目为 Character Card V3 格式
    const characterBookEntries = entries.map(entry => convertToCharacterBookEntry(entry));

    const v3Card = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: character.name || '未命名角色',
        description: character.description || '',
        personality: character.personality || '',
        scenario: character.scenario || '',
        first_mes: character.first_mes || '',
        mes_example: character.mes_example || '',
        creator_notes: character.creator_notes || '',
        system_prompt: character.system_prompt || '',
        post_history_instructions: character.post_history_instructions || '',
        alternate_greetings: character.alternate_greetings || [],
        tags: character.tags || [],
        creator: 'Psyche 角色卡设计器',
        character_version: '1.0',
        // 添加世界书
        character_book: characterBookEntries.length > 0 ? {
          name: `${character.name || 'Character'}'s Lorebook`,
          description: '由 Psyche 角色卡设计器生成的世界书',
          scan_depth: WORLDBOOK_DEFAULTS.DEFAULT_SCAN_DEPTH,
          token_budget: WORLDBOOK_DEFAULTS.DEFAULT_TOKEN_BUDGET,
          recursive_scanning: WORLDBOOK_DEFAULTS.DEFAULT_RECURSIVE_SCANNING,
          extensions: {},
          entries: characterBookEntries,
        } : undefined,
        extensions: {
          psyche: {
            mode: 'standard',
            t_layers: {
              t0_enabled: true,
              t1_enabled: false,
              t2_enabled: false,
              t3_enabled: false,
            },
          },
          furry: {
            enabled: false,
            species: '',
          },
        },
      },
    };

    downloadJSON(v3Card, `${character.name || 'character'}_v3.json`);
  };

  const exportV2JSON = () => {
    const v2Card = {
      name: character.name || '未命名角色',
      description: character.description || '',
      personality: character.personality || '',
      scenario: character.scenario || '',
      first_mes: character.first_mes || '',
      mes_example: character.mes_example || '',
    };

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
      // 生成 V3 JSON
      const characterBookEntries = entries.map(entry => convertToCharacterBookEntry(entry));
      
      const v3Card = {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
          name: character.name || '未命名角色',
          description: character.description || '',
          personality: character.personality || '',
          scenario: character.scenario || '',
          first_mes: character.first_mes || '',
          mes_example: character.mes_example || '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: character.tags || [],
          creator: 'Psyche 角色卡设计器',
          character_version: '1.0',
          character_book: characterBookEntries.length > 0 ? {
            name: `${character.name || 'Character'}'s Lorebook`,
            description: '由 Psyche 角色卡设计器生成的世界书',
            scan_depth: WORLDBOOK_DEFAULTS.DEFAULT_SCAN_DEPTH,
            token_budget: WORLDBOOK_DEFAULTS.DEFAULT_TOKEN_BUDGET,
            recursive_scanning: WORLDBOOK_DEFAULTS.DEFAULT_RECURSIVE_SCANNING,
            extensions: {},
            entries: characterBookEntries,
          } : undefined,
          extensions: {
            psyche: {
              mode: 'standard',
              t_layers: {
                t0_enabled: true,
                t1_enabled: false,
                t2_enabled: false,
                t3_enabled: false,
              },
            },
            furry: {
              enabled: false,
              species: '',
            },
          },
        },
      };

      // 将 JSON 转换为 base64
      const jsonString = JSON.stringify(v3Card);
      const base64Json = btoa(unescape(encodeURIComponent(jsonString)));

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

          // 嵌入 character card 数据到 PNG
          const pngWithMetadata = embedTextChunk(uint8Array, 'chara', base64Json);

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

  /**
   * 嵌入 tEXt chunk 到 PNG 数据中
   */
  const embedTextChunk = (pngData: Uint8Array, keyword: string, text: string): Uint8Array => {
    // PNG 签名: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // 验证 PNG 签名
    if (pngData.length < 8 || !pngData.slice(0, 8).every((val, i) => val === pngSignature[i])) {
      throw new Error('不是有效的 PNG 文件');
    }

    // 找到 IEND chunk 的位置
    let iendPosition = -1;
    for (let i = 8; i < pngData.length - 4; i++) {
      if (pngData[i] === 0x49 && pngData[i+1] === 0x45 && pngData[i+2] === 0x4E && pngData[i+3] === 0x44) {
        iendPosition = i - 4; // IEND chunk 开始于长度字段之前
        break;
      }
    }

    if (iendPosition === -1) {
      throw new Error('无法找到 PNG IEND chunk');
    }

    // 创建 tEXt chunk
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(text);
    const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
    chunkData.set(keywordBytes, 0);
    chunkData[keywordBytes.length] = 0; // null separator
    chunkData.set(textBytes, keywordBytes.length + 1);

    // 计算 chunk 长度
    const chunkLength = chunkData.length;
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, chunkLength, false);

    // tEXt chunk type
    const chunkType = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"

    // 计算 CRC
    const crcData = new Uint8Array(chunkType.length + chunkData.length);
    crcData.set(chunkType, 0);
    crcData.set(chunkData, chunkType.length);
    const crc = calculateCRC(crcData);
    const crcBytes = new Uint8Array(4);
    new DataView(crcBytes.buffer).setUint32(0, crc, false);

    // 组合新的 PNG 数据
    const newPngData = new Uint8Array(
      pngData.length + lengthBytes.length + chunkType.length + chunkData.length + crcBytes.length
    );
    
    newPngData.set(pngData.slice(0, iendPosition), 0);
    let offset = iendPosition;
    newPngData.set(lengthBytes, offset);
    offset += lengthBytes.length;
    newPngData.set(chunkType, offset);
    offset += chunkType.length;
    newPngData.set(chunkData, offset);
    offset += chunkData.length;
    newPngData.set(crcBytes, offset);
    offset += crcBytes.length;
    newPngData.set(pngData.slice(iendPosition), offset);

    return newPngData;
  };

  /**
   * 计算 CRC32
   */
  const calculateCRC = (data: Uint8Array): number => {
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[i] = c;
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
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

  const downloadJSON = (data: any, filename: string) => {
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
                    兼容旧版 · 基础字段
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
                <Image className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
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

          {/* 预览 */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              📝 <strong>角色名称:</strong> {character.name || '未命名角色'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              文件名: {character.name || 'character'}_
              {format === 'markdown' ? '.md' : format === 'png' ? '.png' : `_${format}.json`}
            </div>
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
                    <Image className="w-12 h-12 mx-auto text-slate-400 mb-3" />
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
                  • JSON 数据会嵌入到图片的 metadata 中
                  <br />
                  • SillyTavern 可以直接拖拽导入这个 PNG
                  <br />
                  • 图片尺寸建议：400x600 或更大
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

