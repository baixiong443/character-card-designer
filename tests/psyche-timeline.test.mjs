import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { strFromU8, unzipSync } from 'fflate';
import {
  buildCharacterCardV3,
  normalizeCharacterCard,
} from '../app/lib/characterCard.ts';
import {
  buildCardTimelineExtension,
  buildPsycheBookBytes,
  buildPsycheTimelineCompilationPrompt,
  parsePsycheTimelineResponse,
  validatePsycheTimelineState,
} from '../app/lib/psycheTimeline.ts';
import { buildStorySourceCorpus } from '../app/lib/storySource.ts';

function makeTimelineState() {
  const initialState = {
    schemaVersion: 1,
    storyId: 'mist-harbor',
    turn: 0,
    canonCursor: { chapterId: 'chapter-1', sceneId: 'dock', eventOrder: 0 },
    time: { absolute: null, relativeMinutes: 0 },
    location: { area: '雾港', place: '旧码头', position: '候船棚' },
    characters: {
      lin_yan: { present: true, mood: ['警惕'], activity: '等待渡船' },
      user_role: { present: true },
    },
    relationships: {
      lin_user: {
        pairId: 'lin_user',
        stage: '初识',
        directions: {
          lin_yan: { toward: 'user_role', stance: ['审慎观察'], wants: [], secrets: ['铜匣来历'] },
          user_role: { toward: 'lin_yan', stance: ['尚未表态'], wants: [], secrets: [] },
        },
        axes: { trust: 0 },
      },
    },
    inventory: {},
    facts: {
      ferry_delayed: { truth: '夜渡因浓雾延迟', status: 'true', evidenceRefs: ['S0001'] },
    },
    knowledge: {
      lin_yan: { ferry_delayed: { state: 'knows' } },
      user_role: { ferry_delayed: { state: 'knows' } },
    },
    flags: {},
    canonEvents: { signal_seen: 'eligible', leave_dock: 'locked' },
    narrativePurposes: { establish_signal: 'pending', choose_route: 'pending' },
    openThreads: {},
    custom: {},
    lockedPaths: [],
    divergence: { structuralLevel: 0, summary: '' },
  };
  const plan = {
    schemaVersion: 1,
    storyId: 'mist-harbor',
    title: '雾港夜渡',
    initialState,
    events: [
      {
        id: 'signal_seen',
        chapterId: 'chapter-1',
        sceneId: 'dock',
        canonicalOrder: 0,
        kind: 'hard_anchor',
        rigidity: 'hard',
        summary: '林砚看见河道信标连续闪烁三次。',
        participants: ['lin_yan', 'user_role'],
        effects: [{
          id: 'signal_seen_flag',
          type: 'set_flag',
          confidence: 1,
          evidenceIds: [],
          flag: 'signal_seen',
          value: true,
        }],
        narrativePurposes: ['establish_signal'],
        evidenceRefs: ['S0001'],
        revealPolicy: 'eligible_only',
        adaptation: { allowDelay: true, allowRelocation: false, allowSubstitution: false },
      },
      {
        id: 'leave_dock',
        chapterId: 'chapter-1',
        sceneId: 'canal',
        canonicalOrder: 1,
        kind: 'transition',
        rigidity: 'soft',
        summary: '两人选择一条离开旧码头的路线。',
        participants: ['lin_yan', 'user_role'],
        effects: [],
        narrativePurposes: ['choose_route'],
        evidenceRefs: ['S0002'],
        revealPolicy: 'eligible_only',
        adaptation: { allowDelay: true, allowRelocation: true, allowSubstitution: false },
      },
    ],
  };
  return {
    schemaVersion: 1,
    card: {
      schema_version: '1.0',
      story_id: 'mist-harbor',
      entry_point: { chapter_id: 'chapter-1', scene_id: 'dock', event_id: 'signal_seen' },
      bindings: { character_id: 'lin_yan', user_role_id: 'user_role' },
      mode_defaults: { participation: 'adaptive', audit: 'strict', auto_apply: false },
    },
    plan,
    trajectoryNotes: '信标出现后，路线选择才会解锁。',
    sourceFingerprint: 'fixture-1',
    createdAt: '2026-07-14T00:00:00.000Z',
  };
}

test('PTE timeline validation catches broken event indexes', () => {
  const state = makeTimelineState();
  assert.deepEqual(validatePsycheTimelineState(state).errors, []);

  delete state.plan.initialState.canonEvents.leave_dock;
  const invalid = validatePsycheTimelineState(state);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join('\n'), /canonEvents 缺少事件 leave_dock/);
});

test('PTE timeline validation accepts replayable relationship axis changes', () => {
  const state = makeTimelineState();
  state.plan.events[0].effects.push({
    id: 'signal_trust_delta',
    type: 'change_relationship_axis',
    confidence: 0.9,
    evidenceIds: ['S0001'],
    pairId: 'lin_user',
    axis: 'trust',
    delta: 2.5,
  });
  state.plan.events[0].effects.push({
    id: 'signal_divergence',
    type: 'set_divergence',
    confidence: 0.9,
    evidenceIds: ['S0001'],
    structuralLevel: 0.25,
    summary: '信标被提前发现，后续路线选择可能改变。',
  });
  assert.deepEqual(validatePsycheTimelineState(state).errors, []);

  state.plan.events[0].effects[1].delta = Number.POSITIVE_INFINITY;
  const invalid = validatePsycheTimelineState(state);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join('\n'), /delta 数值无效/);
});

test('PTE timeline validation rejects recursive canon transitions inside event effects', () => {
  const state = makeTimelineState();
  state.plan.events[0].effects.push({
    id: 'recursive-transition',
    type: 'transition_canon_event',
    confidence: 1,
    evidenceIds: ['S0001'],
    eventId: 'leave_dock',
    status: 'active',
  });

  const invalid = validatePsycheTimelineState(state);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join('\n'), /不得直接改变原作事件状态/);
});

test('PTE timeline accepts world scope events and rejects unknown scope values', () => {
  const state = makeTimelineState();

  // Omitted scope stays valid and defaults to interpersonal on the PTE side.
  assert.deepEqual(validatePsycheTimelineState(state).errors, []);

  state.plan.events[0].scope = 'world';
  assert.deepEqual(validatePsycheTimelineState(state).errors, []);

  state.plan.events[0].scope = 'interpersonal';
  assert.deepEqual(validatePsycheTimelineState(state).errors, []);

  state.plan.events[0].scope = 'planetary';
  const invalid = validatePsycheTimelineState(state);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join('\n'), /scope 无效/);
});

test('V3 export embeds an inline PTE plan without dropping vendor extensions', () => {
  const state = makeTimelineState();
  const source = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: '林砚',
      description: '守在旧码头的人。',
      personality: '克制',
      scenario: '雾港',
      first_mes: '雾里传来汽笛。',
      mes_example: '',
      extensions: { vendor_extension: { keep: true } },
    },
  };
  const normalized = normalizeCharacterCard(source);
  const extension = buildCardTimelineExtension(state, true);
  const exported = buildCharacterCardV3(normalized.character, normalized.envelope, undefined, extension);

  assert.deepEqual(exported.data.extensions.vendor_extension, { keep: true });
  assert.equal(exported.data.extensions.psyche_timeline.story_id, 'mist-harbor');
  assert.equal(exported.data.extensions.psyche_timeline.inline_plan.events.length, 2);
  assert.equal(exported.data.extensions.psyche_timeline.package_digest, undefined);

  const imported = normalizeCharacterCard(exported);
  assert.equal(imported.psycheTimeline.plan.events[1].id, 'leave_dock');
  assert.deepEqual(validatePsycheTimelineState(imported.psycheTimeline).errors, []);
});

test('.psychebook output is deterministic and contains the PTE package contract', () => {
  const state = makeTimelineState();
  const first = buildPsycheBookBytes(state);
  const second = buildPsycheBookBytes(state);
  assert.deepEqual(first, second);

  const files = unzipSync(first);
  assert.deepEqual(Object.keys(files).sort(), ['card.json', 'manifest.json', 'story.json']);
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  const story = JSON.parse(strFromU8(files['story.json']));
  const card = JSON.parse(strFromU8(files['card.json']));
  assert.equal(manifest.format, 'psychebook');
  assert.equal(manifest.story_id, story.storyId);
  assert.equal(card.story_id, story.storyId);
  assert.equal(card.inline_plan, undefined);
  assert.equal(card.package_digest, undefined);
});

test('.psychebook can carry the progressive source without embedding cache', () => {
  const state = makeTimelineState();
  const corpus = buildStorySourceCorpus(
    `第一章 雾港\n${'林砚把铜钥匙藏进外套。'.repeat(140)}`,
    state.plan.storyId,
    state.sourceFingerprint,
    'balanced',
    '2026-07-15T00:00:00.000Z',
  );
  corpus.index.embedding = {
    provider: 'custom', model: 'embed-test', dimensions: 3, normalized: true,
    distance: 'cosine', indexFingerprint: 'vector-fp',
  };
  corpus.embeddings = corpus.retrievalChunks.map(chunk => ({
    schemaVersion: 1, chunkId: chunk.id, modelKey: 'custom:embed-test', vector: [0.1, 0.2, 0.3],
  }));

  const files = unzipSync(buildPsycheBookBytes(state, '1.0.0', corpus));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  assert.equal(manifest.source.index, 'source/index.json');
  assert.ok(files['source/chunks.jsonl']);
  assert.ok(files['source/analysis.jsonl']);
  assert.equal(files['source/embeddings.jsonl'], undefined);
});

test('timeline response parser requires marked JSON and validates the complete bundle', () => {
  const state = makeTimelineState();
  const response = `<<<PSYCHE_TIMELINE_JSON>>>\n${JSON.stringify({ card: state.card, plan: state.plan })}\n<<<END_PSYCHE_TIMELINE_JSON>>>`;
  const parsed = parsePsycheTimelineResponse(response, state.trajectoryNotes, state.sourceFingerprint, state.createdAt);
  assert.equal(parsed.plan.title, '雾港夜渡');
  assert.throws(() => parsePsycheTimelineResponse('{}', '', null), /边界标记/);
});

test('timeline compiler prompt separates the current state from future canon events', () => {
  const prompt = buildPsycheTimelineCompilationPrompt({
    identity: '林砚',
    background: '故事起点前背景',
    relationships: '初识',
    world: '旧码头',
    trajectory: '未来信标事件',
    discussion: '用户选择从第一章开始',
    evidence: 'S0001 原作证据',
  });
  assert.match(prompt, /未来事件只进入 events/);
  assert.match(prompt, /initialState\.canonEvents/);
  assert.match(prompt, /change_relationship_axis/);
  assert.match(prompt, /set_divergence\.structuralLevel/);
  assert.match(prompt, /audit=strict/);
  assert.match(prompt, /<<<PSYCHE_TIMELINE_JSON>>>/);
});

test('browser acceptance fixture imports as a structured project timeline', async () => {
  const fixture = JSON.parse(await readFile(
    new URL('./fixtures/pte-inline-card.json', import.meta.url),
    'utf8',
  ));
  const normalized = normalizeCharacterCard(fixture);
  assert.equal(normalized.warnings.length, 0);
  assert.equal(normalized.psycheTimeline.card.bindings.character_id, 'lin-yan');
  assert.equal(normalized.psycheTimeline.plan.events[0].id, 'signal-seen');
  assert.deepEqual(validatePsycheTimelineState(normalized.psycheTimeline).errors, []);
});
