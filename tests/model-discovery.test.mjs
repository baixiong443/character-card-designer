import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseModelListResponse,
  resolveChatEndpoint,
  resolveModelListEndpoint,
} from '../app/lib/modelDiscovery.ts';

test('model endpoint is derived from common chat completion URLs', () => {
  assert.equal(
    resolveModelListEndpoint('https://newapi.example.com/v1/chat/completions'),
    'https://newapi.example.com/v1/models',
  );
  assert.equal(
    resolveModelListEndpoint('https://example.com/api/v1/chat/completions?debug=1'),
    'https://example.com/api/v1/models',
  );
  assert.equal(
    resolveModelListEndpoint('https://example.com'),
    'https://example.com/v1/models',
  );
});

test('chat endpoint accepts roots, v1 bases, and complete endpoints', () => {
  assert.equal(
    resolveChatEndpoint('https://newapi.example.com/v1', 'custom'),
    'https://newapi.example.com/v1/chat/completions',
  );
  assert.equal(
    resolveChatEndpoint('https://newapi.example.com', 'openai'),
    'https://newapi.example.com/v1/chat/completions',
  );
  assert.equal(
    resolveChatEndpoint('https://newapi.example.com/api/v1/models', 'custom'),
    'https://newapi.example.com/api/v1/chat/completions',
  );
  assert.equal(
    resolveChatEndpoint('https://api.anthropic.com/v1', 'claude'),
    'https://api.anthropic.com/v1/messages',
  );
});

test('model parser supports OpenAI and alternate model arrays', () => {
  assert.deepEqual(
    parseModelListResponse({
      data: [
        { id: 'grok-2', name: 'Grok 2' },
        { id: 'gpt-4o' },
        { id: 'grok-2', name: 'duplicate' },
      ],
    }),
    [
      { id: 'gpt-4o', label: 'gpt-4o' },
      { id: 'grok-2', label: 'Grok 2' },
    ],
  );

  assert.deepEqual(
    parseModelListResponse({ models: ['model-b', { model: 'model-a', display_name: 'Model A' }] }),
    [
      { id: 'model-a', label: 'Model A' },
      { id: 'model-b', label: 'model-b' },
    ],
  );
});

test('invalid or empty responses return no models', () => {
  assert.deepEqual(parseModelListResponse(null), []);
  assert.deepEqual(parseModelListResponse({ data: [{ name: '' }, null] }), []);
});
