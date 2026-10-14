import http from 'node:http';
import https from 'node:https';
import type { Socket } from 'node:net';

/**
 * Proxied fetch for the server-side AI proxy routes.
 *
 * Node's global `fetch` (undici) ignores the system proxy and the `HTTP_PROXY`
 * environment variable, so a deployment behind a local proxy would otherwise
 * dial the upstream directly. That matters in practice: some OpenAI-compatible
 * endpoints sit behind Cloudflare and reject direct connections from certain
 * regions with an HTML 403, while the same request through a proxy succeeds.
 *
 * This is deliberately dependency-free. `undici` is bundled with Node but is
 * not exposed as `node:undici`, and adding it as a real dependency would pull a
 * second HTTP stack into the bundle. Instead we open an HTTP CONNECT tunnel
 * with the built-in `http`/`https` modules.
 *
 * Only HTTP(S) proxies are supported. SOCKS proxies need a different handshake
 * and are reported as an explicit error rather than silently bypassed.
 */

export interface ProxiedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * Convert a buffered body into a `BodyInit` acceptable to the Web `Response`
 * constructor.
 *
 * A Buffer/Uint8Array is a valid BodyInit at runtime, but the DOM `BodyInit`
 * type is built on `ArrayBufferView<ArrayBuffer>` and rejects the wider
 * `ArrayBufferLike` (which admits SharedArrayBuffer), so this narrow cast is
 * required rather than a conversion.
 */
export function asBodyInit(body: Buffer): BodyInit {
  return body as unknown as BodyInit;
}

export interface ProxiedFetchOptions {
  proxyUrl?: string | null;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  /** Milliseconds for the whole exchange; omitted means no explicit deadline. */
  timeoutMs?: number;
  /** Internal redirect counter; callers should not set this. */
  redirectsLeft?: number;
}

const MAX_REDIRECTS = 5;

/**
 * Accept the shapes a user is likely to type and return a URL string.
 * Returns null for empty input, which means "no proxy configured".
 */
export function normalizeProxyUrl(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('代理地址不是有效的网址');
  }
  if (url.protocol === 'socks:' || url.protocol === 'socks5:' || url.protocol === 'socks4:') {
    throw new Error('暂不支持 SOCKS 代理，请填写 HTTP 代理地址');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('代理地址只支持 HTTP 或 HTTPS');
  }
  if (!url.port && !url.hostname) throw new Error('代理地址缺少主机名');
  return url.toString();
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * Send one request through an HTTP CONNECT tunnel established with the proxy.
 */
function tunneledRequest(
  target: URL,
  proxy: URL,
  options: ProxiedFetchOptions,
): Promise<ProxiedResponse> {
  return new Promise<ProxiedResponse>((resolve, reject) => {
    const targetPort = target.port || (target.protocol === 'https:' ? '443' : '80');
    const proxyIsTls = proxy.protocol === 'https:';
    const proxyPort = proxy.port || (proxyIsTls ? '443' : '80');
    const proxyTransport = proxyIsTls ? https : http;

    const connectRequest = proxyTransport.request({
      host: proxy.hostname,
      port: Number(proxyPort),
      method: 'CONNECT',
      path: `${target.hostname}:${targetPort}`,
      headers: { Host: `${target.hostname}:${targetPort}` },
      ...(proxy.username
        ? { auth: `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}` }
        : {}),
    });

    const fail = (error: Error) => {
      connectRequest.destroy();
      reject(error);
    };

    connectRequest.on('error', error => fail(error));
    connectRequest.on('connect', (connectResponse, socket) => {
      if (connectResponse.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`代理拒绝建立隧道：HTTP ${connectResponse.statusCode ?? 'unknown'}`));
        return;
      }

      const targetIsTls = target.protocol !== 'http:';
      // `socket` is accepted by the runtime but is absent from @types/node's
      // AgentOptions, so the agent is constructed through a narrow cast.
      const agentOptions = { socket: socket as Socket, keepAlive: false, maxSockets: 1 };
      const agent = targetIsTls
        ? new https.Agent(agentOptions as https.AgentOptions)
        : new http.Agent(agentOptions as http.AgentOptions);
      const transport = targetIsTls ? https : http;

      const request = transport.request({
        host: target.hostname,
        port: Number(targetPort),
        path: `${target.pathname}${target.search}`,
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
        agent,
      }, response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => {
          const headers: Record<string, string> = {};
          for (const [name, value] of Object.entries(response.headers)) {
            if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
          }
          resolve({
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? '',
            headers,
            body: Buffer.concat(chunks),
          });
        });
        response.on('error', fail);
      });

      request.on('error', fail);
      if (options.body) request.write(options.body);
      request.end();
    });

    connectRequest.end();
  });
}

/**
 * Fetch `urlString`, optionally through `proxyUrl`.
 *
 * With no proxy configured this delegates to the global `fetch`, so existing
 * direct behaviour is byte-for-byte unchanged.
 */
export async function proxiedFetch(
  urlString: string,
  options: ProxiedFetchOptions = {},
): Promise<ProxiedResponse> {
  const proxyUrl = normalizeProxyUrl(options.proxyUrl);

  if (!proxyUrl) {
    const controller = options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined;
    const response = await fetch(urlString, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body === undefined
        ? undefined
        : (typeof options.body === 'string' ? options.body : asBodyInit(options.body)),
      cache: 'no-store',
      signal: controller,
    });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => { headers[name] = value; });
    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body: Buffer.from(await response.arrayBuffer()),
    };
  }

  const target = new URL(urlString);
  const proxy = new URL(proxyUrl);
  const response = await tunneledRequest(target, proxy, options);

  const redirectsLeft = options.redirectsLeft ?? MAX_REDIRECTS;
  const location = response.headers.location;
  if (isRedirect(response.status) && location && redirectsLeft > 0) {
    const next = new URL(location, target);
    const nextMethod = response.status === 303 ? 'GET' : (options.method ?? 'GET');
    return proxiedFetch(next.toString(), {
      ...options,
      method: nextMethod,
      body: nextMethod === 'GET' ? undefined : options.body,
      redirectsLeft: redirectsLeft - 1,
    });
  }

  return response;
}
