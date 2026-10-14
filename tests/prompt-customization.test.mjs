import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ROLE_PROMPTS,
  MATURE_CONTENT_ANALYSIS_CONTRACT,
  promptOverrideFor,
  resolveRolePrompt,
  withRolePromptDefaults,
} from '../app/lib/promptCustomization.ts';

test('each AI role has a separate mature-content-aware built-in prompt', () => {
  for (const role of ['main', 'review', 'audit']) {
    assert.match(DEFAULT_ROLE_PROMPTS[role], /成熟题材处理协议/);
    assert.ok(DEFAULT_ROLE_PROMPTS[role].includes(MATURE_CONTENT_ANALYSIS_CONTRACT));
  }
  assert.notEqual(DEFAULT_ROLE_PROMPTS.main, DEFAULT_ROLE_PROMPTS.review);
  assert.notEqual(DEFAULT_ROLE_PROMPTS.review, DEFAULT_ROLE_PROMPTS.audit);
});

test('append preserves the built-in prompt while replace uses only custom base instructions', () => {
  const appended = resolveRolePrompt({
    rolePromptOverrides: { review: { mode: 'append', text: '重点核对自定义术语。' } },
  }, 'review');
  assert.ok(appended.includes(DEFAULT_ROLE_PROMPTS.review));
  assert.match(appended, /使用者追加指令/);
  assert.match(appended, /重点核对自定义术语/);

  const replaced = resolveRolePrompt({
    rolePromptOverrides: { audit: { mode: 'replace', text: '只执行我的审计规则。' } },
  }, 'audit');
  assert.equal(replaced, '只执行我的审计规则。');
});

test('legacy global custom prompts migrate to all role editors without data loss', () => {
  const legacy = { useCustomPrompt: true, customSystemPrompt: '旧版自定义规则' };
  assert.deepEqual(promptOverrideFor(legacy, 'main'), { mode: 'replace', text: '旧版自定义规则' });

  const migrated = withRolePromptDefaults(legacy);
  assert.equal(migrated.rolePromptOverrides.main.text, '旧版自定义规则');
  assert.equal(migrated.rolePromptOverrides.review.text, '旧版自定义规则');
  assert.equal(migrated.rolePromptOverrides.audit.text, '旧版自定义规则');
});
