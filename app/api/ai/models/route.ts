import { resolveModelListEndpoint, type CompatibleProvider } from '@/lib/modelDiscovery';

export const runtime = 'nodejs';

interface ModelProxyRequest {
  apiEndpoint?: unknown;
  apiKey?: unknown;
  provider?: unknown;
}

function isProvider(value: unknown): value is CompatibleProvider {
  return value === 'openai' || value === 'claude' || value === 'custom';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await request.json() as ModelProxyRequest;
    if (typeof input.apiEndpoint !== 'string' || !isProvider(input.provider)) {
      return Response.json({ error: { message: '模型列表请求参数不完整' } }, { status: 400 });
    }

    const endpoint = resolveModelListEndpoint(input.apiEndpoint);
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Response.json({ error: { message: 'API 端点只支持 HTTP 或 HTTPS' } }, { status: 400 });
    }

    const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) {
      if (input.provider === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
    }

    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers,
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
      { error: { message: `模型列表上游连接失败: ${(error as Error).message}` } },
      { status: 502 },
    );
  }
}
