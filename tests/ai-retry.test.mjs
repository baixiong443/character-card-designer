import assert from 'node:assert/strict';
import test from 'node:test';

import { isRetryableAIError } from '../app/lib/apiRetry.ts';

test('rate limits and temporary failures are retryable', () => {
  assert.equal(isRetryableAIError(new Error('Console API returned 429')), true);
  assert.equal(isRetryableAIError(new Error('rate_limit_exceeded')), true);
  assert.equal(isRetryableAIError(new Error('temporary upstream timeout')), true);
  assert.equal(isRetryableAIError(new Error('请求触发频率限制')), true);
});

test('validation and authentication errors are not retried', () => {
  assert.equal(isRetryableAIError(new Error('invalid model name')), false);
  assert.equal(isRetryableAIError(new Error('Unauthorized')), false);
  assert.equal(isRetryableAIError(new Error('证据标记不完整')), false);
});
