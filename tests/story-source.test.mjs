import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANALYSIS_UNIT_MAX,
  RETRIEVAL_CHUNK_MAX,
  RETRIEVAL_CHUNK_OVERLAP,
  buildStorySourceCorpus,
  validateStorySourceCorpus,
} from '../app/lib/storySource.ts';

function sourceBook() {
  const paragraph = '雾沿着旧码头的木板缓慢移动。林砚检查信标，又把铜钥匙放回衣袋。'.repeat(120);
  return [
    `第一章 潮声\n${paragraph}`,
    `第二章 信标\n${paragraph.replaceAll('铜钥匙', '旧账册')}`,
    `第三章 夜渡\n${paragraph.replaceAll('林砚', '周衡')}`,
  ].join('\n\n');
}

test('builds stable dual-granularity source chunks with chapter and neighbor metadata', () => {
  const first = buildStorySourceCorpus(sourceBook(), 'mist-port', 'fp-001', 'balanced', '2026-07-15T00:00:00.000Z');
  const second = buildStorySourceCorpus(sourceBook(), 'mist-port', 'fp-001', 'balanced', '2026-07-15T00:00:00.000Z');

  assert.deepEqual(first, second);
  assert.equal(first.index.chapters.length, 3);
  assert.ok(first.retrievalChunks.length > first.analysisUnits.length);
  assert.equal(first.retrievalChunks[0].id, 'R000001');
  assert.equal(first.analysisUnits[0].id, 'A000001');
  assert.equal(first.retrievalChunks[0].previousChunkId, undefined);
  assert.equal(first.retrievalChunks.at(-1).nextChunkId, undefined);
  assert.equal(first.retrievalChunks[0].nextChunkId, first.retrievalChunks[1].id);
  assert.deepEqual(validateStorySourceCorpus(first), []);
});

test('keeps retrieval chunks bounded and overlapping while analysis units remain non-overlapping', () => {
  const corpus = buildStorySourceCorpus(sourceBook(), 'mist-port', 'fp-002');
  assert.ok(corpus.retrievalChunks.every(chunk => chunk.text.length <= RETRIEVAL_CHUNK_MAX));
  assert.ok(corpus.analysisUnits.every(unit => unit.text.length <= ANALYSIS_UNIT_MAX));

  const sameChapter = corpus.retrievalChunks.filter(chunk => chunk.chapterId === 'C0001');
  for (let index = 1; index < sameChapter.length; index += 1) {
    const overlap = sameChapter[index - 1].endOffset - sameChapter[index].startOffset;
    assert.ok(overlap >= 0 && overlap <= RETRIEVAL_CHUNK_OVERLAP);
  }
  const units = corpus.analysisUnits.filter(unit => unit.chapterId === 'C0001');
  for (let index = 1; index < units.length; index += 1) {
    assert.ok(units[index].startOffset >= units[index - 1].endOffset);
  }
});

test('links every analysis unit to the retrieval chunks covering the same original span', () => {
  const corpus = buildStorySourceCorpus(sourceBook(), 'mist-port', 'fp-003');
  const chunks = new Map(corpus.retrievalChunks.map(chunk => [chunk.id, chunk]));
  for (const unit of corpus.analysisUnits) {
    assert.ok(unit.retrievalChunkIds.length > 0);
    for (const chunkId of unit.retrievalChunkIds) {
      const chunk = chunks.get(chunkId);
      assert.equal(chunk.chapterId, unit.chapterId);
      assert.ok(chunk.endOffset > unit.startOffset && chunk.startOffset < unit.endOffset);
    }
  }
});
