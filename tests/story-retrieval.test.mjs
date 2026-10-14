import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStoryRetrievalBundle,
  cosineSimilarity,
  hybridRetrieveStorySource,
  sequentialStoryWindow,
} from '../app/lib/storyRetrieval.ts';

function chunk(order, text, chapterOrder = Math.floor(order / 2)) {
  return {
    schemaVersion: 1,
    id: `R${String(order + 1).padStart(6, '0')}`,
    chapterId: `C${String(chapterOrder + 1).padStart(4, '0')}`,
    chapterOrder,
    chunkOrder: order,
    title: `第${chapterOrder + 1}章`,
    startOffset: order * 100,
    endOffset: order * 100 + text.length,
    text,
    contentHash: `hash-${order}`,
    keywordTokens: [],
  };
}

const chunks = [
  chunk(0, '林砚把铜钥匙藏进外套。'),
  chunk(1, '旧港下起了暴雨。'),
  chunk(2, '周宁在灯塔前等待失踪的船。', 1),
  chunk(3, '第三章才出现的密道不能提前泄露。', 2),
  chunk(4, '更远处的结局。', 2),
];

test('keeps the sequential canon window ordered and applies future-bound filters', () => {
  const shuffled = [chunks[3], chunks[1], chunks[2], chunks[0]];
  assert.deepEqual(
    sequentialStoryWindow(shuffled, 2, 1, 2, { maxChapterOrder: 1 }).map(item => item.chunkOrder),
    [1, 2],
  );
});

test('fuses keyword and vector rankings while tolerating missing or invalid vectors', () => {
  const embeddings = [
    { schemaVersion: 1, chunkId: chunks[0].id, modelKey: 'test', vector: [0, 1] },
    { schemaVersion: 1, chunkId: chunks[1].id, modelKey: 'test', vector: [1, 0] },
    { schemaVersion: 1, chunkId: chunks[2].id, modelKey: 'test', vector: [1] },
  ];
  const results = hybridRetrieveStorySource({
    query: '铜钥匙',
    queryVector: [1, 0],
    chunks,
    embeddings,
    limit: 5,
  });
  const keywordHit = results.find(result => result.chunk.id === chunks[0].id);
  const semanticHit = results.find(result => result.chunk.id === chunks[1].id);
  assert.ok(keywordHit?.keywordRank);
  assert.ok(semanticHit?.semanticRank);
  assert.equal(results.some(result => result.chunk.id === chunks[2].id), false);
  assert.equal(cosineSimilarity([Number.NaN], [1]), 0);

  const keywordOnly = hybridRetrieveStorySource({ query: '灯塔', chunks, queryVector: [1, 0] });
  assert.equal(keywordOnly[0].chunk.id, chunks[2].id);
});

test('reserves the entire sequential spine before spending budget on related history', () => {
  const longChunks = chunks.map(item => ({ ...item, text: item.text.repeat(80) }));
  const bundle = buildStoryRetrievalBundle({
    query: '铜钥匙',
    chunks: longChunks,
    cursorOrder: 2,
    sequentialBefore: 1,
    sequentialAfter: 1,
    maxContextChars: 1_000,
    filter: { maxChapterOrder: 1 },
  });
  assert.deepEqual(bundle.sequential.map(item => item.chunkOrder), [1, 2]);
  assert.ok(bundle.totalChars > 1_000);
  assert.equal(bundle.related.length, 0);
  assert.equal(bundle.chunkIds.includes(chunks[3].id), false);
});
