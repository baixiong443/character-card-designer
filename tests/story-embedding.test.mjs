import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEmbeddingIndexFingerprint,
  embedStorySourceChunks,
  parseEmbeddingResponse,
  resolveEmbeddingEndpoint,
} from '../app/lib/storyEmbedding.ts';

function chunk(order, text) {
  return {
    schemaVersion: 1,
    id: `R${String(order + 1).padStart(6, '0')}`,
    chapterId: 'C0001',
    chapterOrder: 0,
    chunkOrder: order,
    title: '第一章',
    startOffset: order * 10,
    endOffset: order * 10 + text.length,
    text,
    contentHash: `hash-${order}`,
    keywordTokens: [],
  };
}

test('resolves OpenAI-compatible and Ollama embedding endpoints explicitly', () => {
  assert.equal(
    resolveEmbeddingEndpoint('https://newapi.example/v1/chat/completions', 'openai-compatible'),
    'https://newapi.example/v1/embeddings',
  );
  assert.equal(
    resolveEmbeddingEndpoint('http://localhost:11434', 'ollama'),
    'http://localhost:11434/api/embed',
  );
});

test('normalizes provider responses and preserves OpenAI response indexes', () => {
  assert.deepEqual(parseEmbeddingResponse('openai-compatible', {
    data: [
      { index: 1, embedding: [0, 1] },
      { index: 0, embedding: [1, 0] },
    ],
  }, 2), [[1, 0], [0, 1]]);
  assert.deepEqual(parseEmbeddingResponse('ollama', { embeddings: [[1, 0], [0, 1]] }, 2), [[1, 0], [0, 1]]);
  assert.throws(
    () => parseEmbeddingResponse('ollama', { embeddings: [[1, 0]] }, 2),
    /本批需要 2 个/,
  );
});

test('batches source chunks, enforces stable dimensions, and never switches providers', async () => {
  const chunks = [chunk(0, '雾港'), chunk(1, '铜钥匙'), chunk(2, '旧灯塔')];
  const requests = [];
  const progress = [];
  const run = await embedStorySourceChunks(chunks, {
    provider: 'custom',
    apiEndpoint: 'https://embed.example/v1',
    apiKey: 'secret',
    model: 'embed-zh',
    batchSize: 2,
    expectedDimensions: 2,
  }, {
    fetcher: async (_url, init) => {
      const body = JSON.parse(init.body);
      requests.push(body);
      return new Response(JSON.stringify({
        data: body.inputs.map((_text, index) => ({ index, embedding: [index + 1, 0] })),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
    onProgress: value => progress.push(value),
  });
  assert.deepEqual(requests.map(item => item.provider), ['custom', 'custom']);
  assert.deepEqual(requests.map(item => item.inputs.length), [2, 1]);
  assert.equal(run.config.dimensions, 2);
  assert.equal(run.records.length, 3);
  assert.equal(progress.at(-1).completed, 3);
  assert.equal(run.config.indexFingerprint, buildEmbeddingIndexFingerprint('custom', 'embed-zh', 2, chunks));

  await assert.rejects(() => embedStorySourceChunks(chunks.slice(0, 1), {
    provider: 'browser-local', apiEndpoint: '', apiKey: '', model: 'local', batchSize: 1,
  }), /不会自动切换/);
});

test('rejects a provider that changes dimensions between batches', async () => {
  const chunks = [chunk(0, '一'), chunk(1, '二')];
  let call = 0;
  await assert.rejects(() => embedStorySourceChunks(chunks, {
    provider: 'openai-compatible', apiEndpoint: 'https://embed.example/v1', apiKey: '', model: 'e', batchSize: 1,
  }, {
    fetcher: async () => {
      call += 1;
      return new Response(JSON.stringify({ data: [{ index: 0, embedding: call === 1 ? [1, 0] : [1, 0, 0] }] }));
    },
  }), /维度发生变化/);
});
