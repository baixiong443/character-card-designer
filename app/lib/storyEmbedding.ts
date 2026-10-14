import type {
  StorySourceEmbeddingConfig,
  StorySourceEmbeddingRecord,
  StorySourceRetrievalChunk,
} from './storySource.ts';

export type StoryEmbeddingProvider = 'openai-compatible' | 'ollama' | 'browser-local' | 'custom';

export interface StoryEmbeddingSettings {
  provider: StoryEmbeddingProvider;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  batchSize: number;
  expectedDimensions?: number | null;
}

export interface StoryEmbeddingProgress {
  completed: number;
  total: number;
  batch: number;
  batches: number;
}

export interface StoryEmbeddingRun {
  config: StorySourceEmbeddingConfig;
  records: StorySourceEmbeddingRecord[];
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function endpointUrl(value: string): URL {
  if (!value.trim()) throw new Error('请先填写嵌入 API 端点');
  try {
    return new URL(value.trim());
  } catch {
    throw new Error('嵌入 API 端点不是有效的网址');
  }
}

export function resolveEmbeddingEndpoint(
  apiEndpoint: string,
  provider: Exclude<StoryEmbeddingProvider, 'browser-local'>,
): string {
  const url = endpointUrl(apiEndpoint);
  const pathname = url.pathname.replace(/\/+$/, '');
  if (provider === 'ollama') {
    if (/\/api\/(?:embed|embeddings)$/i.test(pathname)) {
      url.pathname = pathname.replace(/\/api\/(?:embed|embeddings)$/i, '/api/embed');
    } else if (!pathname || pathname === '/') {
      url.pathname = '/api/embed';
    } else {
      url.pathname = `${pathname}/api/embed`;
    }
  } else if (/\/embeddings$/i.test(pathname)) {
    url.pathname = pathname;
  } else if (/\/(?:chat\/completions|models|messages)$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/(?:chat\/completions|models|messages)$/i, '/embeddings');
  } else if (!pathname || pathname === '/') {
    url.pathname = '/v1/embeddings';
  } else {
    url.pathname = `${pathname}/embeddings`;
  }
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function buildEmbeddingRequestBody(
  provider: Exclude<StoryEmbeddingProvider, 'browser-local'>,
  model: string,
  inputs: string[],
): Record<string, unknown> {
  if (!model.trim()) throw new Error('请先填写嵌入模型');
  if (inputs.length === 0 || inputs.some(input => !input.trim())) throw new Error('嵌入输入不能为空');
  return provider === 'ollama'
    ? { model: model.trim(), input: inputs }
    : { model: model.trim(), input: inputs, encoding_format: 'float' };
}

function numericVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0
    || value.some(item => typeof item !== 'number' || !Number.isFinite(item))) return null;
  return value as number[];
}

export function parseEmbeddingResponse(
  provider: StoryEmbeddingProvider,
  value: unknown,
  expectedCount: number,
): number[][] {
  if (!value || typeof value !== 'object') throw new Error('嵌入接口没有返回 JSON 对象');
  const payload = value as Record<string, unknown>;
  let vectors: number[][] = [];
  if (provider === 'ollama') {
    if (Array.isArray(payload.embeddings)) {
      vectors = payload.embeddings.map(numericVector).filter((item): item is number[] => Boolean(item));
    } else {
      const single = numericVector(payload.embedding);
      if (single) vectors = [single];
    }
  } else if (Array.isArray(payload.data)) {
    const entries = payload.data.map((item, order) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        order,
        index: Number.isInteger(record.index) ? Number(record.index) : order,
        vector: numericVector(record.embedding),
      };
    }).sort((left, right) => left.index - right.index || left.order - right.order);
    vectors = entries.map(item => item.vector).filter((item): item is number[] => Boolean(item));
  }
  if (vectors.length !== expectedCount) {
    throw new Error(`嵌入接口返回 ${vectors.length} 个向量，但本批需要 ${expectedCount} 个`);
  }
  const dimensions = vectors[0]?.length ?? 0;
  if (dimensions === 0 || vectors.some(vector => vector.length !== dimensions)) {
    throw new Error('嵌入接口返回的向量维度不一致');
  }
  return vectors;
}

export function embeddingBatches<T>(items: readonly T[], batchSize: number): T[][] {
  const size = Math.max(1, Math.min(64, Math.floor(batchSize) || 1));
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildEmbeddingIndexFingerprint(
  provider: StoryEmbeddingProvider,
  model: string,
  dimensions: number,
  chunks: readonly StorySourceRetrievalChunk[],
): string {
  const identity = chunks.map(chunk => `${chunk.id}:${chunk.contentHash}`).join('|');
  return `fnv1a:${fnv1a(`${provider}\n${model.trim()}\n${dimensions}\n${identity}`)}`;
}

async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      message = typeof payload.error === 'string' ? payload.error : payload.error?.message || payload.message || message;
    } catch {
      if (text.trim()) message = text.trim().slice(0, 500);
    }
    throw new Error(`嵌入请求失败：${message}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('嵌入接口返回的不是有效 JSON');
  }
}

export async function embedStorySourceChunks(
  chunks: readonly StorySourceRetrievalChunk[],
  settings: StoryEmbeddingSettings,
  options: {
    fetcher?: Fetcher;
    proxyEndpoint?: string;
    onProgress?: (progress: StoryEmbeddingProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<StoryEmbeddingRun> {
  if (chunks.length === 0) throw new Error('没有可建立向量索引的原文片段');
  if (settings.provider === 'browser-local') {
    throw new Error('浏览器本地嵌入运行时尚未安装；不会自动切换到其他提供商');
  }
  const fetcher = options.fetcher ?? fetch;
  const batches = embeddingBatches(chunks, settings.batchSize);
  const records: StorySourceEmbeddingRecord[] = [];
  let dimensions = settings.expectedDimensions && settings.expectedDimensions > 0
    ? Math.floor(settings.expectedDimensions)
    : 0;
  let completed = 0;
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    if (options.signal?.aborted) throw new DOMException('嵌入任务已暂停', 'AbortError');
    const batch = batches[batchIndex]!;
    const response = await fetcher(options.proxyEndpoint ?? '/api/ai/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        provider: settings.provider,
        apiEndpoint: settings.apiEndpoint,
        apiKey: settings.apiKey,
        model: settings.model,
        inputs: batch.map(chunk => chunk.text),
      }),
    });
    const vectors = parseEmbeddingResponse(settings.provider, await responseJson(response), batch.length);
    const batchDimensions = vectors[0]!.length;
    if (dimensions === 0) dimensions = batchDimensions;
    if (batchDimensions !== dimensions || vectors.some(vector => vector.length !== dimensions)) {
      throw new Error(`嵌入维度发生变化：预期 ${dimensions}，本批得到 ${batchDimensions}`);
    }
    batch.forEach((chunk, index) => records.push({
      schemaVersion: 1,
      chunkId: chunk.id,
      modelKey: `${settings.provider}:${settings.model.trim()}`,
      vector: vectors[index]!,
    }));
    completed += batch.length;
    options.onProgress?.({ completed, total: chunks.length, batch: batchIndex + 1, batches: batches.length });
  }
  return {
    config: {
      provider: settings.provider,
      model: settings.model.trim(),
      dimensions,
      normalized: false,
      distance: 'cosine',
      indexFingerprint: buildEmbeddingIndexFingerprint(settings.provider, settings.model, dimensions, chunks),
    },
    records,
  };
}
