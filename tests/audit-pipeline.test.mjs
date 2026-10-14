import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFinalFieldAuditPrompt,
  buildStageSummaryAuditPrompt,
  buildWorldBookAuditPrompt,
  findWorldBookAuditFindings,
  parseAuditedFieldResult,
  parseAuditedResult,
  parseWorldBookAuditResponse,
} from '../app/lib/auditPipeline.ts';

function entry(uid, overrides = {}) {
  return {
    uid,
    keys: [`关键词${uid}`],
    content: `条目${uid}内容`,
    enabled: true,
    constant: false,
    selective: true,
    order: 100,
    position: 1,
    depth: 4,
    role: 0,
    probability: 100,
    useProbability: true,
    ignoreBudget: false,
    preventRecursion: false,
    excludeRecursion: false,
    source: { third_party_field: `keep-${uid}` },
    extensions: { plugin_data: { keep: true } },
    ...overrides,
  };
}

test('worldbook deterministic audit catches trigger and runtime problems', () => {
  const findings = findWorldBookAuditFindings([
    entry(0, { keys: ['他', '重名'], content: '人物资料' }),
    entry(1, { keys: ['重名'], content: '另一个人物资料' }),
    entry(2, {
      keys: [],
      constant: true,
      content: '每次回复输出【状态】和物品栏。',
      position: 1,
      depth: 4,
      role: 2,
      ignoreBudget: false,
      preventRecursion: false,
    }),
    entry(3, { keys: [], content: '' }),
  ]);

  const codes = new Set(findings.map(item => item.code));
  assert.ok(codes.has('broad-key'));
  assert.ok(codes.has('duplicate-key'));
  assert.ok(codes.has('constant-recursion'));
  assert.ok(codes.has('format-position'));
  assert.ok(codes.has('format-runtime-guards'));
  assert.ok(codes.has('missing-keys'));
  assert.ok(codes.has('empty-content'));
});

test('worldbook audit parser preserves uid count and unknown extension fields', () => {
  const originals = [entry(4), entry(9, { constant: true, preventRecursion: true })];
  const response = `前置解释会被忽略
<<<WORLDBOOK_AUDIT>>>
\`\`\`json
{"entries":[
  {"uid":4,"verdict":"revised","issues":["删除了过宽关键词"],"keys":["专名"],"content":"修订内容","comment":"人物","enabled":true,"constant":false,"selective":true,"order":120,"position":1,"depth":3,"role":0,"probability":100,"useProbability":true,"ignoreBudget":false,"preventRecursion":false,"excludeRecursion":false,"cooldown":null,"sticky":null,"delay":null},
  {"uid":9,"verdict":"pass","issues":[],"keys":["关键词9"],"content":"条目9内容","comment":"规则","enabled":true,"constant":true,"selective":true,"order":100,"position":1,"depth":4,"role":0,"probability":100,"useProbability":true,"ignoreBudget":false,"preventRecursion":true,"excludeRecursion":false,"cooldown":null,"sticky":null,"delay":null}
]}
\`\`\`
<<<END_WORLDBOOK_AUDIT>>>
尾部解释也会被忽略`;

  const parsed = parseWorldBookAuditResponse(response, originals);
  assert.deepEqual(parsed.map(item => item.entry.uid), [4, 9]);
  assert.deepEqual(parsed[0].entry.keys, ['专名']);
  assert.equal(parsed[0].entry.content, '修订内容');
  assert.equal(parsed[0].entry.source.third_party_field, 'keep-4');
  assert.deepEqual(parsed[0].entry.extensions, { plugin_data: { keep: true } });
  assert.equal(parsed[0].verdict, 'revised');
});

test('worldbook audit parser rejects added or missing entries', () => {
  const originals = [entry(0), entry(1)];
  const response = `<<<WORLDBOOK_AUDIT>>>
{"entries":[{"uid":0,"keys":["甲"],"content":"内容"}]}
<<<END_WORLDBOOK_AUDIT>>>`;
  assert.throws(
    () => parseWorldBookAuditResponse(response, originals),
    /不得新增或删除条目/,
  );
});

test('audit prompts contain evidence and strict output contracts', () => {
  const worldPrompt = buildWorldBookAuditPrompt('原作证据', '用户决定', [entry(7)]);
  assert.match(worldPrompt, /原作证据/);
  assert.match(worldPrompt, /用户决定/);
  assert.match(worldPrompt, /<<<WORLDBOOK_AUDIT>>>/);
  assert.match(worldPrompt, /"uid": 7/);

  const stagePrompt = buildStageSummaryAuditPrompt({
    stageNumber: 3,
    stageTitle: '关系网络',
    previousStages: '基础身份',
    importedBase: '原始关系',
    discussionRecord: '用户：修正关系',
    candidate: '候选关系',
  });
  assert.match(stagePrompt, /用户本阶段明确提出的创作决定优先/);
  assert.match(stagePrompt, /<<<AUDITED_RESULT>>>/);

  const finalPrompt = buildFinalFieldAuditPrompt({
    label: '互动字段',
    evidence: '互动证据',
    candidate: '【首条消息】候选',
    requiredMarkers: ['首条消息', '对话示例'],
  });
  assert.match(finalPrompt, /【首条消息】、【对话示例】/);
});

test('audited result parsers reject incomplete field contracts', () => {
  const response = `<<<AUDITED_RESULT>>>
【首条消息】
这是经过审计的开场消息，长度足够用于测试。
<<<END_AUDITED_RESULT>>>`;
  assert.match(parseAuditedResult(response), /经过审计/);
  assert.throws(
    () => parseAuditedFieldResult(response, ['首条消息', '对话示例']),
    /缺少字段标记：对话示例/,
  );
});
