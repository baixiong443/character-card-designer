type ApiEvent = {
  error?: unknown;
  choices?: Array<{
    delta?: { content?: unknown };
    message?: { content?: unknown };
    text?: unknown;
    finish_reason?: unknown;
  }>;
};

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseJsonOrSseResponse(text: string): unknown {
  const trimmed = text.trim();
  const direct = parseJson(trimmed);
  if (direct !== null) return direct;

  const events: ApiEvent[] = [];
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) continue;

    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;

    const event = parseJson(payload);
    if (event && typeof event === 'object') events.push(event as ApiEvent);
  }

  if (events.length === 0) {
    throw new Error('API 返回的内容既不是 JSON，也不是可识别的 SSE 数据流');
  }

  const errorEvent = events.find(event => event.error);
  if (errorEvent) return errorEvent;

  let content = '';
  let finishReason: unknown = null;
  for (const event of events) {
    const choice = event.choices?.[0];
    if (!choice) continue;

    const fragment = typeof choice.delta?.content === 'string'
      ? choice.delta.content
      : typeof choice.message?.content === 'string'
        ? choice.message.content
        : typeof choice.text === 'string'
          ? choice.text
          : '';
    content += fragment;
    if (choice.finish_reason != null) finishReason = choice.finish_reason;
  }

  if (content) {
    return {
      choices: [{
        message: { content },
        finish_reason: finishReason,
      }],
    };
  }

  return events[events.length - 1];
}

export async function readApiResponse(response: Response): Promise<unknown> {
  return parseJsonOrSseResponse(await response.text());
}
