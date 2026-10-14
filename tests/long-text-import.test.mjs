import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVIDENCE_SECTION_KEYS,
  IMPORT_STAGE_SPECS,
  SOURCE_CHUNK_MAX,
  buildChunkEvidenceReviewPrompt,
  buildEvidenceBlocks,
  buildNarrativeAuditPrompt,
  buildStageGenerationPrompt,
  fingerprintText,
  findEvidenceFidelityViolations,
  groupTextBlocks,
  isFormalStorylineConclusion,
  matchesExactWorkflowCommand,
  parseAuditedResult,
  parseChunkEvidence,
  parseStageResult,
  splitSourceText,
} from '../app/lib/longTextImport.ts';

test('chapter-aware splitting keeps headings and stable source ids', () => {
  const source = [
    '序章\n开场内容。',
    '第一章 相遇\n角色甲出现。',
    '第二章 冲突\n角色乙出现。',
  ].join('\n\n');
  const chunks = splitSourceText(source);

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].id, 'S0001');
  assert.match(chunks[0].title, /序章/);
  assert.match(chunks[0].title, /第二章/);
  assert.match(chunks[0].text, /第一章 相遇/);
});

test('oversized chapters split only at bounded natural breaks', () => {
  const paragraph = '这是一个包含人物动作、对白和环境信息的自然段。'.repeat(80);
  const source = `第一章 很长的章节\n${Array.from({ length: 12 }, () => paragraph).join('\n\n')}`;
  const chunks = splitSourceText(source);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.text.length <= SOURCE_CHUNK_MAX));
  assert.deepEqual(chunks.map(chunk => chunk.id), chunks.map((_, index) => `S${String(index + 1).padStart(4, '0')}`));
});

test('evidence parser rejects incomplete output and preserves every section', () => {
  const chunk = splitSourceText('第一章\n测试文本。')[0];
  const response = EVIDENCE_SECTION_KEYS.map(key => {
    const marker = key.toUpperCase();
    return `<<<${marker}>>>\n${key} content\n<<<END_${marker}>>>`;
  }).join('\n');
  const parsed = parseChunkEvidence(response, chunk);

  assert.ok(parsed);
  assert.equal(parsed.sections.dialogue, 'dialogue content');
  assert.equal(parseChunkEvidence(response.replace('<<<END_WORLD>>>', ''), chunk), null);
});

test('evidence blocks can be regrouped under a context budget', () => {
  const evidence = [{
    chunkId: 'S0001',
    title: '第一章',
    sections: Object.fromEntries(EVIDENCE_SECTION_KEYS.map(key => [key, `${key}-${'x'.repeat(80)}`])),
  }];
  const blocks = buildEvidenceBlocks(evidence, ['characters', 'dialogue']);
  const groups = groupTextBlocks([...blocks, ...blocks, ...blocks], 300);

  assert.equal(blocks.length, 1);
  assert.ok(groups.length >= 2);
  assert.ok(groups.every(group => group.join('\n\n').length <= 300));

  const oversizedSingleBlock = groupTextBlocks(['句子。'.repeat(300)], 300);
  assert.ok(oversizedSingleBlock.length > 1);
  assert.ok(oversizedSingleBlock.every(group => group.join('\n\n').length <= 300));
});

test('stage markers and source fingerprints are deterministic', () => {
  assert.equal(parseStageResult('<<<STAGE_RESULT>>>\n正文\n<<<END_STAGE_RESULT>>>'), '正文');
  assert.equal(parseStageResult('正文'), null);
  assert.equal(fingerprintText('a\r\nb'), fingerprintText('a\nb'));
  assert.notEqual(fingerprintText('a\nb'), fingerprintText('a\nc'));
});

test('stage generation prompt carries evidence fidelity and timeline rules', () => {
  const prompt = buildStageGenerationPrompt(
    IMPORT_STAGE_SPECS[0],
    'S0001：沈砚川被海事调查署带走。',
    '用户确认故事起点为标准时间 3:42。',
    true,
  );

  assert.match(prompt, /标题、姓名、别名、地名/);
  assert.match(prompt, /不得强化原文结论/);
  assert.match(prompt, /用户在讨论阶段的明确纠正优先/);
  assert.match(prompt, /边界之后的事件只能写入潜在剧情轨迹/);
  assert.match(prompt, /关系网络必须独立整理双方态度/);
});

test('workflow commands require an exact confirmation instead of substring matches', () => {
  assert.equal(matchesExactWorkflowCommand('确认剧情。', ['确认剧情']), true);
  assert.equal(matchesExactWorkflowCommand('请不要确认剧情，我还要修改', ['确认剧情']), false);
  assert.equal(matchesExactWorkflowCommand('我就可以输出【剧情结论】', ['确认剧情']), false);
});

test('storyline conclusion detection requires the complete formal structure', () => {
  assert.equal(isFormalStorylineConclusion('我就可以输出【剧情结论】。'), false);
  assert.equal(isFormalStorylineConclusion([
    '【剧情结论】',
    '',
    '**扮演设定**：AI 扮演角色甲',
    '',
    '**故事起点**：第一章结束后',
  ].join('\n')), true);
});

test('independent review and audit prompts retain strict output contracts', () => {
  const chunk = splitSourceText('第一章\n凌汐只说：“雾还没散。”')[0];
  const sections = Object.fromEntries(EVIDENCE_SECTION_KEYS.map(key => [key, `${key} draft`]));
  const reviewPrompt = buildChunkEvidenceReviewPrompt(chunk, {
    chunkId: chunk.id,
    title: chunk.title,
    sections,
  });
  assert.match(reviewPrompt, /独立的原作证据复核员/);
  assert.match(reviewPrompt, /原文不支持/);
  assert.match(reviewPrompt, /<<<DIALOGUE>>>/);

  const auditPrompt = buildNarrativeAuditPrompt(
    '剧情结论',
    '原作证据',
    '用户选择中期进入',
    '候选内容',
    '保持知识边界',
  );
  assert.match(auditPrompt, /用户只负责创作偏好/);
  assert.match(auditPrompt, /<<<AUDITED_RESULT>>>/);
  assert.equal(parseAuditedResult('<<<AUDITED_RESULT>>>\n修订结果\n<<<END_AUDITED_RESULT>>>'), '修订结果');
});

test('deterministic fidelity gate catches death and custody strengthening', () => {
  const evidence = [
    '凌舟当前生死未确认，外海信号来源不明。',
    '沈砚川被海事调查署带走，后续处理未知。',
  ].join('\n');
  const violations = findEvidenceFidelityViolations(
    evidence,
    '凌舟在录音中留下遗言。沈砚川最终入狱。',
  );
  assert.deepEqual(violations.map(item => item.type), [
    'unresolved_life_status',
    'custody_status_strengthened',
  ]);
  assert.equal(findEvidenceFidelityViolations(
    evidence,
    '凌舟留下了一句话，当前生死未确认。沈砚川被带走，不能写成入狱。',
  ).length, 0);
  assert.equal(findEvidenceFidelityViolations(
    evidence,
    '遇难者凌舟的妹妹继续调查真相。',
  )[0]?.type, 'unresolved_life_status');
});
