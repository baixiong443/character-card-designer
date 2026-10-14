import {
  buildEmbeddingRequestBody,
  resolveEmbeddingEndpoint,
  type StoryEmbeddingProvider,
} from '@/lib/storyEmbedding';

export const runtime = 'nodejs';

interface EmbeddingProxyRequest {
  provider?: unknown;
  apiEndpoint?: unknown;
  apiKey?: unknown;
  model?: unknown;
  inputs?: unknown;
}

function isRemoteProvider(value: unknown): value is Exclude<StoryEmbeddingProvider, 'browser-local'> {
  return value === 'openai-compatible' || value === 'ollama' || value === 'custom';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await request.json() as EmbeddingProxyRequest;
    if (!isRemoteProvider(input.provider)
      || typeof input.apiEndpoint !== 'string'
      || typeof input.model !== 'string'
      || !Array.isArray(input.inputs)
      || input.inputs.length === 0
      || input.inputs.length > 64
      || input.inputs.some(value => typeof value !== 'string' || !value.trim())) {
      return Response.json({ error: { message: '嵌入请求参数不完整或批次过大' } }, { status: 400 });
    }
    const endpoint = resolveEmbeddingEndpoint(input.apiEndpoint, input.provider);
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Response.json({ error: { message: '嵌入端点只支持 HTTP 或 HTTPS' } }, { status: 400 });
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
    if (apiKey && input.provider !== 'ollama') headers.Authorization = `Bearer ${apiKey}`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildEmbeddingRequestBody(input.provider, input.model, input.inputs as string[])),
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('Retry-After', retryAfter);
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      { error: { message: `嵌入上游连接失败: ${(error as Error).message}` } },
      { status: 502 },
    );
  }
}
