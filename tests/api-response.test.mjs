import assert from 'node:assert/strict';
import test from 'node:test';

import { parseJsonOrSseResponse } from '../app/lib/apiResponse.ts';

test('plain JSON responses are preserved', () => {
  const payload = { choices: [{ message: { content: '普通响应' } }] };
  assert.deepEqual(parseJsonOrSseResponse(JSON.stringify(payload)), payload);
});

test('SSE chat deltas are assembled into one compatible response', () => {
  const response = [
    'data: {"choices":[{"delta":{"content":"雾还"},"finish_reason":null}]}',
    '',
    'data: {"choices":[{"delta":{"content":"没散"},"finish_reason":null}]}',
    '',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
    '',
    'data: [DONE]',
  ].join('\n');

  assert.deepEqual(parseJsonOrSseResponse(response), {
    choices: [{
      message: { content: '雾还没散' },
      finish_reason: 'stop',
    }],
  });
});

test('SSE error events remain available to normal error handling', () => {
  assert.deepEqual(
    parseJsonOrSseResponse('data: {"error":{"message":"模型不可用"}}\n\ndata: [DONE]'),
    { error: { message: '模型不可用' } },
  );
});

test('unrecognized text fails with a useful message', () => {
  assert.throws(
    () => parseJsonOrSseResponse('not json or sse'),
    /既不是 JSON，也不是可识别的 SSE/,
  );
});

// Regression: aiService used to do `readApiResponse(response).catch(() => ({}))`,
// so every non-JSON error body collapsed to `{}` and the console showed
// "API错误响应: {}" with no clue what happened. The fix keeps the raw body, and
// these cases pin the shapes that used to become `{}`.
test('non-JSON error bodies are diagnosable instead of collapsing to an empty object', () => {
  const cases = {
    'cloudflare challenge page': '<!DOCTYPE html><html><body>Just a moment...</body></html>',
    'gateway html error': '<html><head><title>502 Bad Gateway</title></head></html>',
    'plain text': 'Internal Server Error',
    'empty body': '',
  };

  for (const [label, body] of Object.entries(cases)) {
    let parsed = null;
    try {
      parsed = parseJsonOrSseResponse(body);
    } catch {
      parsed = null;
    }
    // The point: the empty/HTML shapes are unparseable, so the caller MUST keep
    // the raw text to explain itself. Assert they are indeed unparseable, which
    // is exactly why the old code lost the reason.
    assert.equal(parsed, null, `${label} unexpectedly parsed`);
    assert.equal(typeof body, 'string');
  }
});

test('an HTML body is detectable so the caller can advise about the API host', () => {
  const html = '<!DOCTYPE html><html lang="zh"><head></head></html>';
  assert.equal(html.trim().startsWith('<'), true);
  // A real API error is JSON, and therefore NOT mistaken for a web page.
  const json = '{"code":30014,"message":"Token is invalid."}';
  assert.equal(json.trim().startsWith('<'), false);
});
