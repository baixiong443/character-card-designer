import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type DiscoveredModel,
  parseModelListResponse,
} from '@/lib/modelDiscovery';
import { readApiResponse } from '@/lib/apiResponse';
import {
  DEFAULT_ROLE_PROMPTS,
  type AIPromptRole,
  type RolePromptOverrides,
} from '@/lib/promptCustomization';
import {
  embedStorySourceChunks,
  type StoryEmbeddingProvider,
  type StoryEmbeddingSettings,
} from '@/lib/storyEmbedding';

export interface EmbeddingAISettings extends StoryEmbeddingSettings {
  enabled: boolean;
}

export interface AISettings {
  provider: 'openai' | 'claude' | 'custom';
  apiEndpoint: string;
  apiKey: string;
  model: string;
  reviewModel?: string;
  auditModel?: string;
  temperature: number;
  maxTokens: number;
  customSystemPrompt?: string; // 用户自定义的 System Prompt
  useCustomPrompt: boolean;    // 是否使用自定义提示词
  rolePromptOverrides?: RolePromptOverrides;
  embedding: EmbeddingAISettings;
}

interface SettingsState {
  settings: AISettings;
  updateSettings: (settings: AISettings) => void;
  fetchModels: (settings: AISettings) => Promise<{
    success: boolean;
    message: string;
    models: DiscoveredModel[];
  }>;
  testConnection: (settings: AISettings) => Promise<{ success: boolean; message: string }>;
  testEmbeddingConnection: (settings: AISettings) => Promise<{ success: boolean; message: string }>;
}

export function getDefaultPrompt(role: AIPromptRole = 'main'): string {
  return DEFAULT_ROLE_PROMPTS[role];
}

const defaultSettings: AISettings = {
  provider: 'openai',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4',
  reviewModel: '',
  auditModel: '',
  temperature: 0.8,
  maxTokens: 16000, // 增大到16000，确保阶段9能输出完整的【完整描述】（12000-15000字需要约20000 tokens）
  customSystemPrompt: '', // 默认为空，用户需要自己填写
  useCustomPrompt: false, // 默认使用内置的 Psyche 提示词（不对外暴露）
  rolePromptOverrides: {
    main: { mode: 'builtin', text: '' },
    review: { mode: 'builtin', text: '' },
    audit: { mode: 'builtin', text: '' },
  },
  embedding: {
    enabled: false,
    provider: 'ollama',
    apiEndpoint: 'http://localhost:11434',
    apiKey: '',
    model: 'nomic-embed-text',
    batchSize: 16,
    expectedDimensions: null,
  },
};

export function withEmbeddingDefaults(settings: Partial<AISettings>): AISettings {
  const embedding = settings.embedding || {} as Partial<EmbeddingAISettings>;
  const provider: StoryEmbeddingProvider = ['openai-compatible', 'ollama', 'browser-local', 'custom'].includes(String(embedding.provider))
    ? embedding.provider as StoryEmbeddingProvider
    : defaultSettings.embedding.provider;
  return {
    ...defaultSettings,
    ...settings,
    embedding: {
      ...defaultSettings.embedding,
      ...embedding,
      provider,
      batchSize: Math.max(1, Math.min(64, Math.floor(Number(embedding.batchSize) || defaultSettings.embedding.batchSize))),
    },
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (settings) => set({ settings }),
      fetchModels: async (settings) => {
        try {
          const response = await fetch('/api/ai/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiEndpoint: settings.apiEndpoint,
              apiKey: settings.apiKey,
              provider: settings.provider,
            }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            const error = payload as { error?: { message?: string }; message?: string } | null;
            return {
              success: false,
              message: `获取失败: ${error?.error?.message || error?.message || `${response.status} ${response.statusText}`}`,
              models: [],
            };
          }

          const models = parseModelListResponse(payload);
          if (models.length === 0) {
            return {
              success: false,
              message: '接口已响应，但没有找到可用的模型 ID',
              models: [],
            };
          }

          return {
            success: true,
            message: `已获取 ${models.length} 个模型`,
            models,
          };
        } catch (error) {
          return {
            success: false,
            message: `获取失败: ${(error as Error).message}`,
            models: [],
          };
        }
      },
      testConnection: async (settings) => {
        try {
          const isClaude = settings.provider === 'claude';
          const requestBody = isClaude
            ? {
                model: settings.model,
                messages: [{ role: 'user', content: '测试连接' }],
                max_tokens: 10,
              }
            : {
                model: settings.model,
                messages: [{ role: 'user', content: '测试连接' }],
                max_tokens: 10,
              };
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
            const error = await readApiResponse(response).catch(() => ({})) as {
              error?: { message?: string };
              message?: string;
            };
            return {
              success: false,
              message: `连接失败: ${error.error?.message || error.message || response.statusText}`,
            };
          }

          return {
            success: true,
            message: '连接成功！AI 端点工作正常。',
          };
        } catch (error) {
          return {
            success: false,
            message: `网络错误: ${(error as Error).message}`,
          };
        }
      },
      testEmbeddingConnection: async (settings) => {
        try {
          const resolved = withEmbeddingDefaults(settings).embedding;
          const run = await embedStorySourceChunks([{
            schemaVersion: 1,
            id: 'embedding-test',
            chapterId: 'test',
            chapterOrder: 0,
            chunkOrder: 0,
            title: '连接测试',
            startOffset: 0,
            endOffset: 4,
            text: '连接测试',
            contentHash: 'test',
            keywordTokens: [],
          }], resolved, { proxyEndpoint: '/api/ai/embeddings' });
          return { success: true, message: `嵌入连接成功，向量维度 ${run.config.dimensions}` };
        } catch (error) {
          return { success: false, message: `嵌入连接失败: ${(error as Error).message}` };
        }
      },
    }),
    {
      name: 'psyche-settings',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<SettingsState>;
        return {
          ...currentState,
          ...persisted,
          settings: withEmbeddingDefaults(persisted.settings || currentState.settings),
        };
      },
    }
  )
);
