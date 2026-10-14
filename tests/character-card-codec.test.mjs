import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCharacterCardV2,
  buildCharacterCardV3,
  normalizeCharacterCard,
  readCharacterCardFromPng,
  validateCharacterCard,
  writeCharacterCardPng,
} from '../app/lib/characterCard.ts';
import {
  convertFromCharacterBookEntry,
  convertToCharacterBookEntry,
} from '../app/types/worldbook.ts';
import {
  assembleFinalDraft,
  getNextRequiredFinalStep,
} from '../app/lib/finalCompiler.ts';
import { parseCharacterFromStages } from '../app/lib/stageParser.ts';

const onePixelPng = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
));

function makeV3Card() {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.1',
    vendor_top_level: { keep: true },
    data: {
      name: '原角色',
      description: '描述',
      personality: '性格',
      scenario: '场景',
      first_mes: '你好',
      mes_example: '<START>',
      creator_notes: '备注',
      system_prompt: '系统',
      post_history_instructions: '历史后提示',
      alternate_greetings: '备用开场',
      tags: ['测试'],
      creator: '作者',
      character_version: '7',
      future_v3_field: { nested: ['必须保留'] },
      extensions: {
        vendor_extension: { answer: 42 },
      },
      character_book: {
        name: '原世界书',
        extensions: { book_vendor: true },
        entries: [{
          id: 9,
          keys: ['关键词'],
          content: '内容',
          enabled: true,
          insertion_order: 12,
          selective: false,
          secondary_keys: [],
          constant: false,
          position: 'after_char',
          vendor_entry_field: '保留',
          extensions: {
            probability: 0,
            vendor_entry_extension: { keep: true },
          },
        }],
      },
    },
  };
}

test('V3 normalization and export preserve unknown fields', () => {
  const normalized = normalizeCharacterCard(makeV3Card());
  assert.deepEqual(normalized.character.alternate_greetings, ['备用开场']);
  assert.equal(normalized.envelope.sourceSpecVersion, '3.1');

  const edited = { ...normalized.character, name: '编辑后的角色' };
  const exported = buildCharacterCardV3(edited, normalized.envelope, normalized.characterBook);

  assert.equal(exported.spec, 'chara_card_v3');
  assert.equal(exported.spec_version, '3.0');
  assert.equal(exported.data.name, '编辑后的角色');
  assert.deepEqual(exported.vendor_top_level, { keep: true });
  assert.deepEqual(exported.data.future_v3_field, { nested: ['必须保留'] });
  assert.deepEqual(exported.data.extensions.vendor_extension, { answer: 42 });
  assert.equal(exported.data.character_book.entries[0].vendor_entry_field, '保留');
});

test('world book conversion overlays edits without dropping modern extensions', () => {
  const source = makeV3Card().data.character_book.entries[0];
  const internal = convertFromCharacterBookEntry(source, 0);
  internal.content = '编辑后的内容';
  const exported = convertToCharacterBookEntry(internal);

  assert.equal(exported.content, '编辑后的内容');
  assert.equal(exported.extensions.probability, 0);
  assert.deepEqual(exported.extensions.vendor_entry_extension, { keep: true });
  assert.equal(exported.vendor_entry_field, '保留');
});

test('world book conversion preserves SillyTavern positions, recursion levels, and runtime fields', () => {
  const source = {
    id: 17,
    keys: ['primary'],
    secondary_keys: ['secondary-a', 'secondary-b'],
    comment: 'runtime-entry',
    content: 'runtime-content',
    enabled: true,
    insertion_order: 900,
    selective: true,
    constant: false,
    position: 'after_char',
    extensions: {
      position: 4,
      depth: 2,
      role: 0,
      scan_depth: 6,
      selectiveLogic: 3,
      probability: 72,
      useProbability: true,
      group: 'route-choice',
      group_override: true,
      group_weight: 125,
      use_group_scoring: true,
      exclude_recursion: true,
      prevent_recursion: true,
      delay_until_recursion: 3,
      sticky: 4,
      cooldown: 5,
      delay: 6,
      case_sensitive: false,
      match_whole_words: true,
      vectorized: true,
      automation_id: 'audit-entry',
      outlet_name: 'status-outlet',
      triggers: ['normal', 'continue'],
      ignore_budget: true,
      match_persona_description: true,
      match_character_description: true,
      match_character_personality: true,
      match_character_depth_prompt: true,
      match_scenario: true,
      match_creator_notes: true,
    },
  };

  const internal = convertFromCharacterBookEntry(source, 0);
  assert.equal(internal.position, 4);
  assert.equal(internal.delayUntilRecursion, 3);

  const exported = convertToCharacterBookEntry(internal);
  assert.deepEqual(exported.secondary_keys, source.secondary_keys);
  assert.equal(exported.extensions.position, 4);
  assert.equal(exported.extensions.depth, 2);
  assert.equal(exported.extensions.role, 0);
  assert.equal(exported.extensions.scan_depth, 6);
  assert.equal(exported.extensions.selectiveLogic, 3);
  assert.equal(exported.extensions.delay_until_recursion, 3);
  assert.equal(exported.extensions.sticky, 4);
  assert.equal(exported.extensions.cooldown, 5);
  assert.equal(exported.extensions.delay, 6);
  assert.equal(exported.extensions.ignore_budget, true);
  assert.equal(exported.extensions.match_creator_notes, true);
});

test('V1 input upgrades to a complete validator-compatible V2 card', () => {
  const v1 = {
    name: 'V1',
    description: '',
    personality: '',
    scenario: '',
    first_mes: 'hi',
    mes_example: '',
    vendor: 'keep',
  };
  const normalized = normalizeCharacterCard(v1);
  const v2 = buildCharacterCardV2(normalized.character, normalized.envelope);
  const validation = validateCharacterCard(v2);

  assert.deepEqual(validation.errors, []);
  assert.equal(v2.vendor, 'keep');
  assert.equal(v2.spec, 'chara_card_v2');
  assert.equal(v2.data.creator_notes, '');
  assert.deepEqual(v2.data.alternate_greetings, []);
});

test('PNG writes both metadata chunks and prefers ccv3 when reading', () => {
  const normalized = normalizeCharacterCard(makeV3Card());
  const v2Character = { ...normalized.character, name: '来自 chara' };
  const v3Character = { ...normalized.character, name: '来自 ccv3' };
  const v2 = buildCharacterCardV2(v2Character, normalized.envelope, normalized.characterBook);
  const v3 = buildCharacterCardV3(v3Character, normalized.envelope, normalized.characterBook);

  const png = writeCharacterCardPng(onePixelPng, v2, v3);
  const rawAscii = Buffer.from(png).toString('latin1');
  assert.match(rawAscii, /chara/);
  assert.match(rawAscii, /ccv3/);

  const parsed = readCharacterCardFromPng(png);
  assert.equal(parsed.keyword, 'ccv3');
  assert.equal(parsed.card.data.name, '来自 ccv3');
});

test('large Unicode card metadata survives PNG round-trip', () => {
  const source = makeV3Card();
  source.data.future_v3_field = {
    long_text: '中文角色设定'.repeat(25000),
  };
  const normalized = normalizeCharacterCard(source);
  const v2 = buildCharacterCardV2(normalized.character, normalized.envelope, normalized.characterBook);
  const v3 = buildCharacterCardV3(normalized.character, normalized.envelope, normalized.characterBook);

  const png = writeCharacterCardPng(onePixelPng, v2, v3);
  const parsed = readCharacterCardFromPng(png);
  assert.equal(parsed.card.data.future_v3_field.long_text, source.data.future_v3_field.long_text);
});

test('final compiler assembles persisted sections without duplicating review text', () => {
  const draft = {
    descriptionSections: {
      identity: '身份原文',
      background: '背景原文',
      relationships: '关系原文',
      appearance: '外貌原文',
      specialty: '专项原文',
    },
    fieldBlocks: {
      core: '【角色名】\n白川\n\n【性格】\n克制而敏感',
      interaction: '【首条消息】\n雨夜。',
      world: '【场景设定】\n现代兽人城市。',
    },
    review: '这里是质量检查，不应写入角色描述',
    completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    jobErrors: {},
    manualText: null,
    updatedAt: null,
  };

  const compiled = assembleFinalDraft(draft);
  assert.equal((compiled.match(/身份原文/g) || []).length, 1);
  assert.equal((compiled.match(/【完整描述】/g) || []).length, 1);
  assert.doesNotMatch(compiled, /质量检查/);
  assert.equal(getNextRequiredFinalStep(draft.completedSteps), 9);
});

test('stage parser accepts same-line names and preserves short alternate greetings', () => {
  const results = [];
  results[8] = `【完整描述】
角色描述

【角色名】白川

【性格】
克制

【后历史指令】
保持慢节奏

【标签】
Furry, 日常

【备用开场白】
你好

---

再见`;
  const parsed = parseCharacterFromStages(results);

  assert.equal(parsed.name, '白川');
  assert.equal(parsed.description, '角色描述');
  assert.equal(parsed.post_history_instructions, '保持慢节奏');
  assert.deepEqual(parsed.tags, ['Furry', '日常']);
  assert.deepEqual(parsed.alternate_greetings, ['你好', '再见']);
});

test('stage parser does not export empty prompt placeholders as real instructions', () => {
  const results = [];
  results[8] = `【完整描述】
角色描述

【角色名】白川

【系统提示词】
（留空）

【后历史指令】
N/A`;

  const parsed = parseCharacterFromStages(results);

  assert.equal(parsed.system_prompt, undefined);
  assert.equal(parsed.post_history_instructions, undefined);
});

test('card builders remove prompt placeholders from previously saved projects', () => {
  const normalized = normalizeCharacterCard(makeV3Card());
  const character = {
    ...normalized.character,
    system_prompt: '（留空）',
    post_history_instructions: ' N/A ',
  };

  const v2 = buildCharacterCardV2(character, normalized.envelope, normalized.characterBook);
  const v3 = buildCharacterCardV3(character, normalized.envelope, normalized.characterBook);

  assert.equal(v2.data.system_prompt, '');
  assert.equal(v2.data.post_history_instructions, '');
  assert.equal(v3.data.system_prompt, '');
  assert.equal(v3.data.post_history_instructions, '');
});
