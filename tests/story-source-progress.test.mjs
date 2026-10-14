import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { EVIDENCE_SECTION_KEYS } from '../app/lib/longTextImport.ts';
import { buildStorySourceCorpus } from '../app/lib/storySource.ts';
import {
  getStorySourceCorpus,
  listStorySourceTasks,
  putStorySourceCorpus,
  resetStorySourceDatabaseForTests,
} from '../app/lib/storySourceDb.ts';
import {
  initialEvidenceChunkCount,
  mergeReviewedImportEvidence,
  planStorySourceTasks,
  runPendingStoryAnalysis,
  seedStorySourceTasks,
} from '../app/lib/storySourceProgress.ts';

afterEach(async () => {
  await resetStorySourceDatabaseForTests();
});

function corpus(mode = 'balanced') {
  return buildStorySourceCorpus(
    `第一章 雾港\n${'林砚把钥匙收进口袋。'.repeat(1500)}\n第二章 灯塔\n${'周宁沿着石阶向上走。'.repeat(1500)}`,
    'story-1',
    'fp-1',
    mode,
    '2026-07-15T00:00:00.000Z',
  );
}

test('promotes already reviewed long-import evidence to cited L3 claims', () => {
  const input = corpus();
  const evidence = [{
    chunkId: 'S0001',
    title: '第一章',
    sections: {
      overview: '雾港仍未亮灯。', characters: '林砚负责保管钥匙。', events: '', relationships: '',
      appearance: '', dialogue: '', world: '港口终年多雾。', uncertainties: '信标为何熄灭仍未知。',
    },
  }];
  const merged = mergeReviewedImportEvidence(input, evidence);
  assert.equal(merged.compilation[0].level, 3);
  assert.equal(merged.compilation[0].auditStatus, 'passed');
  assert.ok(merged.claims.every(claim => claim.sourceChunkIds.length > 0));
  assert.equal(merged.claims.find(claim => claim.category === 'uncertainty').truthStatus, 'unknown');
});

test('plans only unfinished L2/L3 work and leaves branch-aware L4 to PTE runtime', () => {
  const quick = corpus('quick');
  const complete = corpus('complete');
  const quickTasks = planStorySourceTasks(quick, true, 1);
  const completeTasks = planStorySourceTasks(complete, false, 1);
  assert.equal(quickTasks.filter(task => task.type === 'compile_window').length, 0);
  assert.equal(completeTasks.filter(task => task.type === 'audit_window').length, 0);
  assert.equal(completeTasks.filter(task => task.type === 'extract_skeleton').length, complete.analysisUnits.length);
  assert.equal(completeTasks.filter(task => task.type === 'audit_skeleton').length, complete.analysisUnits.length);
  assert.equal(quickTasks.filter(task => task.type === 'embed_chunk').length, quick.retrievalChunks.length);
  assert.equal(new Set(quickTasks.map(task => task.id)).size, quickTasks.length);
});

test('resumes every pending unit through independent L2 extraction and L3 audit', async () => {
  const input = corpus('quick');
  await putStorySourceCorpus(input);
  await seedStorySourceTasks(planStorySourceTasks(input, false, 1));
  const response = EVIDENCE_SECTION_KEYS.map(key => (
    `<<<${key.toUpperCase()}>>>\n${key === 'events' ? '角色核对了原文中的事件顺序。' : ''}\n<<<END_${key.toUpperCase()}>>>`
  )).join('\n');
  let extracted = 0;
  let audited = 0;

  await runPendingStoryAnalysis(input.index.corpusId, {
    extract: async () => { extracted += 1; return response; },
    audit: async () => { audited += 1; return response; },
  });

  const restored = await getStorySourceCorpus(input.index.corpusId);
  assert.ok(restored.compilation.every(record => record.level >= 3 && record.auditStatus === 'passed'));
  assert.equal(restored.claims.filter(claim => claim.category === 'event').length, input.analysisUnits.length);
  assert.equal(extracted, input.analysisUnits.length);
  assert.equal(audited, input.analysisUnits.length);
  assert.ok((await listStorySourceTasks(input.index.corpusId)).every(task => task.status === 'completed'));
});

test('bounds the synchronous evidence scan for quick and balanced preparation', () => {
  assert.equal(initialEvidenceChunkCount('quick', 20), 2);
  assert.equal(initialEvidenceChunkCount('balanced', 20), 6);
  assert.equal(initialEvidenceChunkCount('complete', 20), 20);
});
