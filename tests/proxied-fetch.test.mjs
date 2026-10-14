import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeProxyUrl, proxiedFetch, asBodyInit } from '../app/lib/proxiedFetch.ts';

test('normalizeProxyUrl accepts the shapes a user is likely to type', () => {
  assert.equal(normalizeProxyUrl(''), null);
  assert.equal(normalizeProxyUrl('   '), null);
  assert.equal(normalizeProxyUrl(null), null);
  assert.equal(normalizeProxyUrl(undefined), null);

  assert.equal(normalizeProxyUrl('127.0.0.1:7897'), 'http://127.0.0.1:7897/');
  assert.equal(normalizeProxyUrl('http://127.0.0.1:7897'), 'http://127.0.0.1:7897/');
  assert.equal(normalizeProxyUrl(' https://proxy.local:8080 '), 'https://proxy.local:8080/');
});

test('normalizeProxyUrl rejects SOCKS and nonsense explicitly', () => {
  assert.throws(() => normalizeProxyUrl('socks5://127.0.0.1:1080'), /SOCKS/);
  assert.throws(() => normalizeProxyUrl('socks://127.0.0.1:1080'), /SOCKS/);
  assert.throws(() => normalizeProxyUrl('ftp://127.0.0.1:21'), /HTTP/);
  assert.throws(() => normalizeProxyUrl('http://'), /主机名|有效的网址/);
});

test('asBodyInit preserves bytes exactly', () => {
  const source = Buffer.from('{"a":1}', 'utf8');
  const init = asBodyInit(source);
  assert.ok(init instanceof Uint8Array);
  assert.deepEqual(Buffer.from(init), source);
});

test('proxiedFetch without a proxy delegates to global fetch unchanged', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{"ok":true}', { status: 201, statusText: 'Created' });
  });

  try {
    const result = await proxiedFetch('https://example.test/v1/models', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      proxyUrl: '',
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.toString('utf8'), '{"ok":true}');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.test/v1/models');
    assert.equal(calls[0].init?.cache, 'no-store');
  } finally {
    globalThis.fetch = original;
  }
});

test('proxiedFetch reports an unreachable proxy instead of silently going direct', async () => {
  // Port 1 is not listening; the failure must surface, never fall back to a
  // direct dial, because that would hide the proxy misconfiguration.
  await assert.rejects(
    proxiedFetch('https://example.test/v1/models', {
      proxyUrl: 'http://127.0.0.1:1',
      timeoutMs: 5000,
    }),
  );
});
