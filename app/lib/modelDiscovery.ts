export interface DiscoveredModel {
  id: string;
  label: string;
}

export type CompatibleProvider = 'openai' | 'claude' | 'custom';

type ModelRecord = {
  id?: unknown;
  model?: unknown;
  name?: unknown;
  display_name?: unknown;
  displayName?: unknown;
};

export function resolveModelListEndpoint(apiEndpoint: string): string {
  const value = apiEndpoint.trim();
  if (!value) throw new Error('请先填写 API 端点');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('API 端点不是有效的网址');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/chat\/completions$/i, '/models');
  } else if (/\/messages$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/messages$/i, '/models');
  } else if (/\/models$/i.test(pathname)) {
    url.pathname = pathname;
  } else if (!pathname || pathname === '/') {
    url.pathname = '/v1/models';
  } else if (/\/v1$/i.test(pathname)) {
    url.pathname = `${pathname}/models`;
  } else {
    url.pathname = `${pathname}/models`;
  }

  url.search = '';
  url.hash = '';
  return url.toString();
}

export function resolveChatEndpoint(
  apiEndpoint: string,
  provider: CompatibleProvider,
): string {
  const value = apiEndpoint.trim();
  if (!value) throw new Error('请先填写 API 端点');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('API 端点不是有效的网址');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  const targetSuffix = provider === 'claude' ? '/messages' : '/chat/completions';

  if (provider === 'claude' && /\/messages$/i.test(pathname)) {
    url.pathname = pathname;
  } else if (provider !== 'claude' && /\/chat\/completions$/i.test(pathname)) {
    url.pathname = pathname;
  } else if (/\/chat\/completions$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/chat\/completions$/i, targetSuffix);
  } else if (/\/messages$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/messages$/i, targetSuffix);
  } else if (/\/models$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/models$/i, targetSuffix);
  } else if (!pathname || pathname === '/') {
    url.pathname = `/v1${targetSuffix}`;
  } else {
    url.pathname = `${pathname}${targetSuffix}`;
  }

  url.search = '';
  url.hash = '';
  return url.toString();
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeModel(value: unknown): DiscoveredModel | null {
  if (typeof value === 'string') {
    const id = value.trim();
    return id ? { id, label: id } : null;
  }

  if (!value || typeof value !== 'object') return null;

  const model = value as ModelRecord;
  const id = readString(model.id) || readString(model.model) || readString(model.name);
  if (!id) return null;

  const label = readString(model.display_name)
    || readString(model.displayName)
    || readString(model.name)
    || id;
  return { id, label };
}

export function parseModelListResponse(payload: unknown): DiscoveredModel[] {
  if (!payload || typeof payload !== 'object') return [];

  const response = payload as { data?: unknown; models?: unknown };
  const source = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.models)
      ? response.models
      : [];

  const models = new Map<string, DiscoveredModel>();
  for (const value of source) {
    const model = normalizeModel(value);
    if (model && !models.has(model.id)) models.set(model.id, model);
  }

  return Array.from(models.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' })
  );
}
