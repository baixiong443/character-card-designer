import { useSettingsStore, getDefaultPrompt } from '@/stores/settingsStore';
import { useState } from 'react';

export function useAIService() {
  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(false);

  const generateResponse = async (
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<string> => {
    setLoading(true);
    try {
      // 决定使用哪个 System Prompt
      let finalSystemPrompt = systemPrompt;
      
      // 如果用户启用了自定义提示词，优先使用自定义的
      if (settings.useCustomPrompt && settings.customSystemPrompt) {
        finalSystemPrompt = settings.customSystemPrompt;
      } else if (!systemPrompt) {
        // 如果没有传入 systemPrompt，且用户没有自定义，使用内置的 Psyche 提示词
        finalSystemPrompt = getDefaultPrompt();
      }
      
      const requestBody = {
        model: settings.model,
        messages: [
          ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
          ...messages,
        ],
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      };

      // 调试信息
      console.log('🔍 API请求信息:', {
        model: settings.model,
        messageCount: requestBody.messages.length,
        systemPromptLength: finalSystemPrompt?.length || 0,
        totalContentLength: requestBody.messages.reduce((sum, msg) => sum + msg.content.length, 0),
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API错误响应:', errorData);
        throw new Error(
          errorData?.error?.message || 
          errorData?.message || 
          `API请求失败 (${response.status} ${response.statusText})`
        );
      }

      const data = await response.json();
      console.log('API响应:', data); // 调试用
      
      // 首先检查是否有错误
      if (data.error) {
        console.error('API返回错误:', data.error);
        
        // 尝试提取错误信息
        let errorMsg = data.error.message || data.error.type || data.error.code;
        
        // 如果error是空对象，使用整个响应作为错误信息
        if (!errorMsg || (typeof data.error === 'object' && Object.keys(data.error).length === 0)) {
          console.error('完整API响应:', JSON.stringify(data, null, 2));
          errorMsg = `API返回错误但未提供详细信息。完整响应: ${JSON.stringify(data).substring(0, 200)}`;
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
        
        throw new Error(errorMsg);
      }
      
      // 检查响应格式
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('API返回了无效的响应格式:', data);
        console.error('完整响应内容:', JSON.stringify(data, null, 2));
        
        // 提供更详细的错误信息
        throw new Error(
          `API返回了无效的响应格式：\n` +
          `- choices字段: ${data.choices ? `存在但为空数组` : '不存在'}\n` +
          `- 响应字段: ${Object.keys(data).join(', ')}\n` +
          `建议检查API兼容性或查看控制台完整日志`
        );
      }
      
      const message = data.choices[0]?.message?.content;
      if (!message) {
        console.error('API响应中缺少消息内容:', data.choices[0]);
        throw new Error('AI未返回有效内容');
      }
      
      return message;
    } finally {
      setLoading(false);
    }
  };

  return { generateResponse, loading };
}