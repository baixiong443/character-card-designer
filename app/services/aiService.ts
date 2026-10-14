import { useSettingsStore } from '@/stores/settingsStore';
import { resolveRolePrompt, type AIPromptRole } from '@/lib/promptCustomization';
import { useState } from 'react';
import { readApiResponse } from '@/lib/apiResponse';
import { isRetryableAIError } from '@/lib/apiRetry';

const RETRY_DELAYS_MS = [10_000, 30_000, 60_000];

class AIRequestError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, options?: { status?: number; retryAfterMs?: number }) {
    super(message);
    this.name = 'AIRequestError';
    this.status = options?.status;
    this.retryAfterMs = options?.retryAfterMs;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) return Math.max(0, timestamp - Date.now());
  return undefined;
}

export function useAIService() {
  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [retryNotice, setRetryNotice] = useState('');

  const generateResponse = async (
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    options?: { model?: string; temperature?: number; promptRole?: AIPromptRole },
  ): Promise<string> => {
    setLoading(true);
    setRetryNotice('');
    try {
      const basePrompt = resolveRolePrompt(settings, options?.promptRole || 'main');
      const finalSystemPrompt = systemPrompt
        ? [basePrompt, '--- 当前任务 ---', systemPrompt].filter(Boolean).join('\n\n')
        : basePrompt;
      
      const isClaude = settings.provider === 'claude';
      const selectedModel = options?.model?.trim() || settings.model;
      const selectedTemperature = options?.temperature ?? settings.temperature;
      const contextualSystemMessages = messages
        .filter(message => message.role === 'system')
        .map(message => message.content);
      const conversationMessages = messages.filter(message => message.role !== 'system');
      const requestMessages = [
        ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
        ...messages,
      ];
      const requestBody = isClaude
        ? {
            model: selectedModel,
            system: [finalSystemPrompt, ...contextualSystemMessages].filter(Boolean).join('\n\n'),
            messages: conversationMessages.map(message => ({
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content: message.content,
            })),
            temperature: selectedTemperature,
            max_tokens: settings.maxTokens,
          }
        : {
            model: selectedModel,
            messages: requestMessages,
            temperature: selectedTemperature,
            max_tokens: settings.maxTokens,
          };

      // 调试信息
      console.log('🔍 API请求信息:', {
        model: selectedModel,
        messageCount: isClaude ? conversationMessages.length : requestMessages.length,
        systemPromptLength: finalSystemPrompt?.length || 0,
        totalContentLength: messages.reduce((sum, msg) => sum + msg.content.length, 0),
        temperature: selectedTemperature,
        maxTokens: settings.maxTokens,
      });

      const requestOnce = async (): Promise<string> => {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiEndpoint: settings.apiEndpoint,
            apiKey: settings.apiKey,
            provider: settings.provider,
            requestBody,
          }),
        });

        if (!response.ok) {
          const errorData = await readApiResponse(response).catch(() => ({})) as {
            error?: { message?: string };
            message?: string;
          };
          console.error('API错误响应:', errorData);
          throw new AIRequestError(
            errorData?.error?.message
              || errorData?.message
              || `API请求失败 (${response.status} ${response.statusText})`,
            {
              status: response.status,
              retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
            },
          );
        }

        const data = await readApiResponse(response) as {
        error?: { message?: string; type?: string; code?: string };
        stop_reason?: string;
        content?: Array<{ type?: string; text?: string }>;
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string | null;
        }>;
        };
      
      // 首先检查是否有错误
      if (data.error) {
        console.error('API返回错误:', data.error);
        
        // 尝试提取错误信息
        let errorMsg = data.error.message || data.error.type || data.error.code;
        
        // 如果error是空对象，使用整个响应作为错误信息
        if (!errorMsg || (typeof data.error === 'object' && Object.keys(data.error).length === 0)) {
          errorMsg = 'API返回错误但未提供详细信息';
        }
        
        // 特殊错误提示
        if (errorMsg.includes('No candidates returned')) {
          throw new Error(
            '⚠️ AI无法生成回复。可能原因：\n' +
            '1. 内容触发了审查机制（尝试修改措辞）\n' +
            '2. 对话历史太长（尝试重新开始）\n' +
            '3. 服务器临时错误（稍后重试）'
          );
        }
        
        throw new AIRequestError(errorMsg);
      }
      
      if (isClaude) {
        if (data.stop_reason === 'max_tokens') {
          throw new Error('AI 输出达到长度上限，本任务未完成，请缩小内容或重试');
        }
        const claudeMessage = Array.isArray(data.content)
          ? data.content.find((item: { type?: string; text?: string }) => item.type === 'text')?.text
          : undefined;
        if (!claudeMessage) throw new Error('Claude API 未返回文本内容');
        return claudeMessage;
      }

      // 检查 OpenAI 兼容响应格式
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('API返回了无效的响应格式:', data);
        // 提供更详细的错误信息
        throw new Error(
          `API返回了无效的响应格式：\n` +
          `- choices字段: ${data.choices ? `存在但为空数组` : '不存在'}\n` +
          `- 响应字段: ${Object.keys(data).join(', ')}\n` +
          `建议检查API兼容性或查看控制台完整日志`
        );
      }
      
      const message = data.choices[0]?.message?.content;
      if (data.choices[0]?.finish_reason === 'length') {
        throw new Error('AI 输出达到长度上限，本任务未完成，请缩小内容或重试');
      }
      if (!message) {
        console.error('API响应中缺少消息内容:', data.choices[0]);
        throw new Error('AI未返回有效内容');
      }
      
        return message;
      };

      let lastError: unknown;
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await requestOnce();
          setRetryNotice('');
          return result;
        } catch (error) {
          lastError = error;
          if (attempt >= RETRY_DELAYS_MS.length || !isRetryableAIError(error)) throw error;

          const fallbackDelay = RETRY_DELAYS_MS[attempt];
          const requestedDelay = error instanceof AIRequestError ? error.retryAfterMs : undefined;
          const delay = Math.min(60_000, Math.max(fallbackDelay, requestedDelay || 0));
          setRetryNotice(`服务限流，${Math.ceil(delay / 1_000)} 秒后自动重试（${attempt + 1}/${RETRY_DELAYS_MS.length}）`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError instanceof Error ? lastError : new Error('AI 请求失败');
    } finally {
      setLoading(false);
      setRetryNotice('');
    }
  };

  const generateReviewResponse = (
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ) => generateResponse(messages, systemPrompt, {
    model: settings.reviewModel?.trim() || settings.model,
    temperature: Math.min(settings.temperature, 0.25),
    promptRole: 'review',
  });

  const generateAuditResponse = (
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ) => generateResponse(messages, systemPrompt, {
    model: settings.auditModel?.trim() || settings.reviewModel?.trim() || settings.model,
    temperature: Math.min(settings.temperature, 0.15),
    promptRole: 'audit',
  });

  return { generateResponse, generateReviewResponse, generateAuditResponse, loading, retryNotice };
}
