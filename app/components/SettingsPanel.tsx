'use client';

import { useState } from 'react';
import { X, Save, Check, AlertCircle, FileText, RotateCcw } from 'lucide-react';
import { useSettingsStore, PROMPT_TEMPLATE } from '@/stores/settingsStore';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, testConnection } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
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
                  provider: e.target.value as any,
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
              本地模型可使用：http://localhost:11434/v1/chat/completions
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

          {/* 模型名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              模型名称
            </label>
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
          </div>

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

          {/* 自定义 System Prompt */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                <FileText className="w-4 h-4 mr-2" />
                自定义 System Prompt（破限/重口味专用）
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.useCustomPrompt}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      useCustomPrompt: e.target.checked,
                    })
                  }
                  className="mr-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">启用</span>
              </label>
            </div>

            {localSettings.useCustomPrompt && (
              <div className="space-y-2">
                <textarea
                  value={localSettings.customSystemPrompt || ''}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      customSystemPrompt: e.target.value,
                    })
                  }
                  placeholder="输入你的自定义 System Prompt..."
                  rows={12}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex items-start justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p>
                      <strong>💡 提示：</strong> 自定义提示词会覆盖默认的 Psyche 提示词
                    </p>
                    <p>
                      <strong>🔥 用途：</strong> 破限、重口味内容、特殊场景、自定义规则
                    </p>
                    <p>
                      <strong>⚠️ 注意：</strong> 确保你的提示词包含必要的创作指导
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        customSystemPrompt: PROMPT_TEMPLATE,
                      })
                    }
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>加载模板</span>
                  </button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>🎯 自定义提示词建议包含：</strong>
                    <br />
                    • 创作原则（真实感、沉浸感、细节标准）
                    <br />
                    • 描写要求（五感细节、对话风格、用词规范）
                    <br />
                    • 特殊场景处理（Furry/BL/RPG/恐怖等专项标准）
                    <br />
                    • 禁止行为（不要拒绝、不要评判、不要总结）
                  </p>
                </div>
              </div>
            )}

            {!localSettings.useCustomPrompt && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  <strong>ℹ️ 当前使用内置 Psyche 专业提示词</strong>
                  <br />
                  系统已内置高质量的角色卡创作标准，包含细节描写、场景构建、角色塑造等专业指导。
                  <br />
                  如需更个性化的创作风格或特殊场景处理，请启用自定义提示词功能。
                </p>
              </div>
            )}
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

