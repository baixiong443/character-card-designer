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
