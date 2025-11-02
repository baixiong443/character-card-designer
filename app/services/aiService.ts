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
      
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
            ...messages,
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } finally {
      setLoading(false);
    }
  };

  return { generateResponse, loading };
}