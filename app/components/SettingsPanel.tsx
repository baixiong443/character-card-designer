'use client';

import { useState } from 'react';
import { X, Save, Check, AlertCircle, FileText, RotateCcw, RefreshCw, Database } from 'lucide-react';
import { useSettingsStore, withEmbeddingDefaults, type AISettings } from '@/stores/settingsStore';
import {
  ROLE_PROMPT_TEMPLATES,
  withRolePromptDefaults,
  type AIPromptRole,
  type PromptCustomizationMode,
} from '@/lib/promptCustomization';
import type { DiscoveredModel } from '@/lib/modelDiscovery';

interface SettingsPanelProps {
  onClose: () => void;
}

const PROMPT_ROLES: Array<{
  id: AIPromptRole;
  title: string;
  description: string;
}> = [
  { id: 'main', title: '主生成 AI', description: '用于文本初次提取、剧情讨论、字段生成和世界书生成。' },
  { id: 'review', title: '证据复核 AI', description: '重新读取原文，修订第一遍提取的遗漏、强化和时间线错误。' },
  { id: 'audit', title: '独立审计 AI', description: '审计剧情结论、分发结果、角色字段、世界书和 PTE 时间线。' },
];

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, fetchModels, testConnection, testEmbeddingConnection } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(() => withRolePromptDefaults(withEmbeddingDefaults(settings)));
  const [availableModels, setAvailableModels] = useState<DiscoveredModel[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelResult, setModelResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testingEmbedding, setTestingEmbedding] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = () => {
    updateSettings({ ...localSettings, useCustomPrompt: false });
    onClose();
  };

  const updateRolePrompt = (
    role: AIPromptRole,
    patch: Partial<{ mode: PromptCustomizationMode; text: string }>,
  ) => {
    setLocalSettings(current => ({
      ...current,
      rolePromptOverrides: {
        ...current.rolePromptOverrides,
        [role]: { ...current.rolePromptOverrides[role], ...patch },
      },
    }));
  };

  const updateEmbedding = (patch: Partial<AISettings['embedding']>) => {
    setLocalSettings(current => ({
      ...current,
      embedding: { ...current.embedding, ...patch },
    }));
  };

  const handleEmbeddingTest = async () => {
    setTestingEmbedding(true);
    setEmbeddingResult(null);
    try {
      setEmbeddingResult(await testEmbeddingConnection(localSettings));
    } finally {
      setTestingEmbedding(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setModelResult(null);
    try {
      const result = await fetchModels(localSettings);
      setAvailableModels(result.models);
      setModelResult({ success: result.success, message: result.message });
    } catch (error) {
      setAvailableModels([]);
      setModelResult({
        success: false,
        message: `获取失败: ${(error as Error).message}`,
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(localSettings);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接失败：' + (error as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            AI 设置
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="关闭设置"
            title="关闭设置"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI 提供商 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              AI 提供商
            </label>
            <select
              value={localSettings.provider}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  provider: e.target.value as AISettings['provider'],
                })
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="custom">自定义端点</option>
            </select>
          </div>

          {/* API 端点 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              API 端点
            </label>
            <input
              type="text"
              value={localSettings.apiEndpoint}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  apiEndpoint: e.target.value,
                })
              }
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              可填写网站根地址、/v1 基础地址或完整聊天接口；系统会自动补全。<br />
              本地模型示例：http://localhost:11434/v1
            </p>
          </div>

          {/* API 密钥 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              API 密钥
            </label>
            <input
              type="password"
              value={localSettings.apiKey}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  apiKey: e.target.value,
                })
              }
              placeholder="sk-..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              本地模型可以留空
            </p>
          </div>

          {/* 代理地址 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              代理地址（可选）
            </label>
            <input
              type="text"
              value={localSettings.proxyUrl}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  proxyUrl: e.target.value,
                })
              }
              placeholder="127.0.0.1:7897"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              留空表示直连。服务器转发请求不会自动使用系统代理，若上游返回 403 或超时，可填入本机 HTTP 代理。<br />
              示例：127.0.0.1:7897（可省略 http://）；仅支持 HTTP 代理，不支持 SOCKS。
            </p>
          </div>

          {/* 模型名称 */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                主生成模型
              </label>
              <button
                type="button"
                onClick={() => void handleFetchModels()}
                disabled={fetchingModels || !localSettings.apiEndpoint.trim()}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingModels ? 'animate-spin' : ''}`} />
                <span>{fetchingModels ? '获取中...' : '获取模型'}</span>
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={localSettings.model}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    model: e.target.value,
                  })
                }
                placeholder="gpt-4"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {availableModels.length > 0 && (
                <select
                  value={availableModels.some(model => model.id === localSettings.model) ? localSettings.model : ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setLocalSettings({ ...localSettings, model: e.target.value });
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  aria-label="选择已获取的模型"
                >
                  <option value="">从 {availableModels.length} 个模型中选择...</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.label === model.id ? model.id : `${model.label} (${model.id})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {modelResult && (
              <div
                className={`mt-2 text-xs ${
                  modelResult.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {modelResult.message}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                证据复核模型
              </label>
              <input
                type="text"
                value={localSettings.reviewModel || ''}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  reviewModel: e.target.value,
                })}
                placeholder="留空则使用主生成模型"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {availableModels.length > 0 && (
                <select
                  value={availableModels.some(model => model.id === localSettings.reviewModel) ? localSettings.reviewModel : ''}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    reviewModel: e.target.value,
                  })}
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  aria-label="选择证据复核模型"
                >
                  <option value="">跟随主生成模型</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.id}</option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                第二 AI，重新对照原文修订第一遍证据。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                独立审计模型
              </label>
              <input
                type="text"
                value={localSettings.auditModel || ''}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  auditModel: e.target.value,
                })}
                placeholder="留空则使用复核模型"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {availableModels.length > 0 && (
                <select
                  value={availableModels.some(model => model.id === localSettings.auditModel) ? localSettings.auditModel : ''}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    auditModel: e.target.value,
                  })}
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  aria-label="选择独立审计模型"
                >
                  <option value="">跟随证据复核模型</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.id}</option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                检查进入点、时间线、分发预览与最终字段。
              </p>
            </div>
          </div>

          <section className="border-y border-slate-200 dark:border-slate-700 py-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Database className="w-4 h-4 mr-2" />
                  原文向量索引
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  用于跨章节召回连续性线索；顺序原文窗口和时间边界始终保留。
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={localSettings.embedding.enabled}
                  onChange={event => updateEmbedding({ enabled: event.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
                启用
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">提供商</label>
                <select
                  value={localSettings.embedding.provider}
                  onChange={event => updateEmbedding({ provider: event.target.value as AISettings['embedding']['provider'] })}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ollama">Ollama</option>
                  <option value="openai-compatible">OpenAI 兼容</option>
                  <option value="custom">自定义兼容端点</option>
                  <option value="browser-local">浏览器本地（需运行时）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">嵌入模型</label>
                <input
                  type="text"
                  value={localSettings.embedding.model}
                  onChange={event => updateEmbedding({ model: event.target.value })}
                  placeholder="nomic-embed-text"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">嵌入 API 端点</label>
              <input
                type="text"
                value={localSettings.embedding.apiEndpoint}
                onChange={event => updateEmbedding({ apiEndpoint: event.target.value })}
                placeholder="http://localhost:11434"
                disabled={localSettings.embedding.provider === 'browser-local'}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">API 密钥</label>
                <input
                  type="password"
                  value={localSettings.embedding.apiKey}
                  onChange={event => updateEmbedding({ apiKey: event.target.value })}
                  placeholder="本地服务可留空"
                  disabled={localSettings.embedding.provider === 'ollama' || localSettings.embedding.provider === 'browser-local'}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">批大小</label>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={localSettings.embedding.batchSize}
                  onChange={event => updateEmbedding({ batchSize: Number(event.target.value) })}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">预期维度</label>
                <input
                  type="number"
                  min="1"
                  max="65536"
                  value={localSettings.embedding.expectedDimensions || ''}
                  onChange={event => updateEmbedding({ expectedDimensions: event.target.value ? Number(event.target.value) : null })}
                  placeholder="自动检测"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleEmbeddingTest()}
              disabled={testingEmbedding || !localSettings.embedding.model.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testingEmbedding ? 'animate-spin' : ''}`} />
              <span>{testingEmbedding ? '测试中...' : '测试嵌入连接'}</span>
            </button>
            {embeddingResult && (
              <div className={`p-3 rounded text-sm flex items-start gap-2 ${embeddingResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                {embeddingResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span>{embeddingResult.message}</span>
              </div>
            )}
          </section>

          {/* 高级设置 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                温度 (Temperature)
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={localSettings.temperature}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                最大输出 Token（AI每次生成的最大长度）
              </label>
              <input
                type="number"
                min="100"
                max="32000"
                step="500"
                value={localSettings.maxTokens}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    maxTokens: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <strong>按次收费建议：</strong> 设置更大值（8000-16000）可以一次生成更详细的内容，减少调用次数。
                <br />
                角色卡创作：8000+ | 极详细描写：16000+ | 注意：这是输出长度，不限制输入长度。
              </p>
            </div>
          </div>

          {/* 分角色提示词 */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center mb-3">
              <h3 className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                <FileText className="w-4 h-4 mr-2" />
                分角色提示词
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              内置提示词已经包含成熟题材的中立分析规则。追加模式保留默认规则；替换模式只保留各任务自己的格式说明。
            </p>

            <div className="border-y border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
              {PROMPT_ROLES.map(role => {
                const prompt = localSettings.rolePromptOverrides[role.id];
                return (
                  <section key={role.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{role.title}</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{role.description}</p>
                      </div>
                      <select
                        value={prompt.mode}
                        onChange={event => updateRolePrompt(role.id, {
                          mode: event.target.value as PromptCustomizationMode,
                        })}
                        className="w-full sm:w-40 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        aria-label={`${role.title}提示词模式`}
                      >
                        <option value="builtin">使用内置</option>
                        <option value="append">追加指令</option>
                        <option value="replace">替换基础提示词</option>
                      </select>
                    </div>
                    {prompt.mode !== 'builtin' && (
                      <>
                        <textarea
                          value={prompt.text}
                          onChange={event => updateRolePrompt(role.id, { text: event.target.value })}
                          placeholder={`输入${role.title}的自定义提示词...`}
                          rows={7}
                          spellCheck={false}
                          className="w-full px-4 py-3 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className={`text-xs ${prompt.mode === 'replace' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            {prompt.mode === 'replace'
                              ? '替换模式会移除该角色的内置事实边界和成熟题材处理协议。'
                              : '追加内容会放在内置提示词之后，任务格式规则仍然保留。'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => updateRolePrompt(role.id, {
                                mode: 'append',
                                text: ROLE_PROMPT_TEMPLATES[role.id],
                              })}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>加载参考模板</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRolePrompt(role.id, { mode: 'builtin', text: '' })}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>恢复内置</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="mt-4 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-3">
              <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">
                <strong>自定义提示词风险声明：</strong>
                使用者应自行检查修改结果。由自定义提示词造成的模型拒答、格式解析失败、事实遗漏、审计失效、时间线错误、额外 API 费用或其他功能异常，不属于软件默认行为的保证范围，开发者不承担由此产生的责任。遇到问题请先恢复内置提示词复测。
              </p>
            </div>
          </div>

          {/* 测试连接 */}
          <div>
            <button
              onClick={handleTest}
              disabled={testing}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start space-x-2 ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{testResult.message}</p>
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
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
}
