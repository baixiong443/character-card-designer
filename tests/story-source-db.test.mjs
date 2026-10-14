import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { buildStorySourceCorpus } from '../app/lib/storySource.ts';
import {
  deleteStorySourceCorpus,
  findStorySourceByFingerprint,
  getStorySourceCorpus,
  listStorySourceTasks,
  putStorySourceCorpus,
  putStorySourceEmbeddings,
  putStorySourceTask,
  resetStorySourceDatabaseForTests,
} from '../app/lib/storySourceDb.ts';

afterEach(async () => {
  await resetStorySourceDatabaseForTests();
});

function corpus() {
  const source = `第一章 潮声\n${'雾港信标仍未出现。林砚把铜钥匙收进口袋。'.repeat(180)}\n\n第二章 夜渡\n${'周衡沿着旧码头检查船票和账册。'.repeat(180)}`;
  return buildStorySourceCorpus(source, 'story-db', 'fingerprint-db', 'balanced', '2026-07-15T00:00:00.000Z');
}

test('persists and reconstructs a progressive story corpus without localStorage', async () => {
  const input = corpus();
  await putStorySourceCorpus(input);

  const found = await findStorySourceByFingerprint('fingerprint-db');
  assert.equal(found?.corpusId, input.index.corpusId);
  const restored = await getStorySourceCorpus(input.index.corpusId);
  assert.deepEqual(restored, input);
});

test('stores typed vectors and resumable tasks beside the immutable corpus', async () => {
  const input = corpus();
  await putStorySourceCorpus(input);
  const chunks = input.retrievalChunks.slice(0, 2);
  await putStorySourceEmbeddings(input.index.corpusId, {
    provider: 'custom',
    model: 'embed-test',
    dimensions: 3,
    normalized: true,
    distance: 'cosine',
    indexFingerprint: 'vector-fp'
  }, chunks.map((chunk, index) => ({
    schemaVersion: 1,
    chunkId: chunk.id,
    modelKey: 'custom:embed-test',
    vector: [index + 0.1, index + 0.2, index + 0.3]
  })));
  await putStorySourceTask({
    schemaVersion: 1,
    id: 'task-1',
    corpusId: input.index.corpusId,
    type: 'extract_skeleton',
    targetId: input.analysisUnits[0].id,
    status: 'pending',
    priority: 20,
    attempts: 0,
    createdAt: 1,
    updatedAt: 1
  });

  const restored = await getStorySourceCorpus(input.index.corpusId);
  assert.equal(restored?.index.embedding?.model, 'embed-test');
  restored?.embeddings[0].vector.forEach((value, index) => {
    assert.ok(Math.abs(value - [0.1, 0.2, 0.3][index]) < 1e-6);
  });
  assert.equal((await listStorySourceTasks(input.index.corpusId, 'pending'))[0].targetId, input.analysisUnits[0].id);
});

test('deletes every object store row owned by one corpus', async () => {
  const input = corpus();
  await putStorySourceCorpus(input);
  await deleteStorySourceCorpus(input.index.corpusId);
  assert.equal(await getStorySourceCorpus(input.index.corpusId), null);
  assert.equal(await findStorySourceByFingerprint(input.index.sourceFingerprint), null);
});
