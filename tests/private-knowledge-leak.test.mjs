import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findPrivateKnowledgeLeaks,
  findWorldBookFindings,
} from '../app/lib/auditPipeline.ts';

function entry(uid, content) {
  return {
    uid, keys: ['铜钥匙'], content, enabled: true, constant: false, selective: true,
    order: 100, position: 1, comment: '', keysecondary: [],
  };
}

test('flags a world book entry that publishes a fact a character does not know', () => {
  const entries = [
    entry(0, '林砚把铜钥匙藏在钟楼夹层。'),
    entry(1, '雾港常年多雨。'),
  ];
  const source = {
    facts: { bronze_key: { truth: '林砚把铜钥匙藏在钟楼夹层。', status: 'true' } },
    knowledge: {
      lin_yan: { bronze_key: { state: 'knows' } },
      zhou_qi: { bronze_key: { state: 'unaware' } },
    },
  };

  const findings = findPrivateKnowledgeLeaks(entries, source);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].uid, 0);
  assert.equal(findings[0].code, 'private-knowledge-leak');
  assert.equal(findings[0].severity, 'warning');
  assert.match(findings[0].message, /周栖|zhou_qi/);
});

test('does not flag a fact every registered character may know', () => {
  const entries = [entry(0, '两人都知道渡船已经停航。')];
  const source = {
    facts: { ferry_stopped: { truth: '两人都知道渡船已经停航。', status: 'true' } },
    knowledge: {
      a: { ferry_stopped: { state: 'knows' } },
      b: { ferry_stopped: { state: 'suspects' } },
    },
  };
  assert.deepEqual(findPrivateKnowledgeLeaks(entries, source), []);
});

test('treats hiding and suspects as truth-bearing, but not believes_false', () => {
  const entries = [entry(0, '北门其实已经失守。')];
  const facts = { north_gate: { truth: '北门其实已经失守。', status: 'true' } };

  // hiding still receives the truth text in PTE, so it is not withheld.
  assert.deepEqual(
    findPrivateKnowledgeLeaks(entries, {
      facts,
      knowledge: { a: { north_gate: { state: 'knows' } }, b: { north_gate: { state: 'hiding' } } },
    }),
    [],
  );

  // believes_false receives perceivedTruth instead of the truth -> withheld.
  const flagged = findPrivateKnowledgeLeaks(entries, {
    facts,
    knowledge: { a: { north_gate: { state: 'knows' } }, b: { north_gate: { state: 'believes_false' } } },
  });
  assert.equal(flagged.length, 1);
  assert.match(flagged[0].message, /\bb\b/);
});

test('stays silent without a timeline, or when nobody knows the fact', () => {
  const entries = [entry(0, '林砚把铜钥匙藏在钟楼夹层。')];
  assert.deepEqual(findPrivateKnowledgeLeaks(entries, null), []);
  assert.deepEqual(findPrivateKnowledgeLeaks(entries, {}), []);

  // Known to nobody -> there is no private information to leak yet.
  const knownToNobody = {
    facts: { bronze_key: { truth: '林砚把铜钥匙藏在钟楼夹层。' } },
    knowledge: { zhou_qi: { bronze_key: { state: 'unaware' } } },
  };
  assert.deepEqual(
    findPrivateKnowledgeLeaks(entries, knownToNobody, ['lin_yan', 'zhou_qi']),
    [],
  );
});

test('ignores matches too short to be meaningful', () => {
  const entries = [entry(0, '下雨。')];
  const source = {
    facts: { rain: { truth: '下雨。' } },
    knowledge: { a: { rain: { state: 'knows' } }, b: {} },
  };
  assert.deepEqual(findPrivateKnowledgeLeaks(entries, source), []);
});

test('normalizes whitespace and case when matching fact text', () => {
  const entries = [entry(0, 'The  BRONZE key is hidden.')];
  const source = {
    facts: { k: { truth: 'the bronze key is hidden.' } },
    knowledge: { a: { k: { state: 'knows' } }, b: { k: { state: 'unaware' } } },
  };
  const findings = findPrivateKnowledgeLeaks(entries, source);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].uid, 0);
});

test('findWorldBookFindings combines structural and leak findings', () => {
  const entries = [entry(0, '林砚把铜钥匙藏在钟楼夹层。'), entry(1, '')];
  const source = {
    facts: { bronze_key: { truth: '林砚把铜钥匙藏在钟楼夹层。' } },
    knowledge: { a: { bronze_key: { state: 'knows' } }, b: { bronze_key: { state: 'unaware' } } },
  };
  const codes = findWorldBookFindings(entries, source).map(f => f.code);
  assert.ok(codes.includes('private-knowledge-leak'));
  assert.ok(codes.includes('empty-content'));
});
