import { resolveChatEndpoint, type CompatibleProvider } from '@/lib/modelDiscovery';

export const runtime = 'nodejs';

interface ChatProxyRequest {
  apiEndpoint?: unknown;
  apiKey?: unknown;
  provider?: unknown;
  requestBody?: unknown;
}

function isProvider(value: unknown): value is CompatibleProvider {
  return value === 'openai' || value === 'claude' || value === 'custom';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await request.json() as ChatProxyRequest;
    if (
      typeof input.apiEndpoint !== 'string'
      || !isProvider(input.provider)
      || !input.requestBody
      || typeof input.requestBody !== 'object'
    ) {
      return Response.json({ error: { message: 'AI 请求参数不完整' } }, { status: 400 });
    }

    const endpoint = resolveChatEndpoint(input.apiEndpoint, input.provider);
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Response.json({ error: { message: 'API 端点只支持 HTTP 或 HTTPS' } }, { status: 400 });
    }

    const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      if (input.provider === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
    }

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.requestBody),
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
      { error: { message: `AI 上游连接失败: ${(error as Error).message}` } },
      { status: 502 },
    );
  }
}
