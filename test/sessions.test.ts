import { strict as assert } from 'node:assert';
import { test } from 'bun:test';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../src/sessions.js';

function fakeClient(overrides: Record<string, unknown> = {}) {
  const killed: boolean[] = [];
  return {
    killed,
    impl: {
      http: { config: { url: 'https://glpi.test', authMethod: 'password', ...overrides } },
      killSession: () => {
        killed.push(true);
      },
    },
  };
}

test('get() with no default and no session throws a clean MCP error', () => {
  const sm = new SessionManager();
  assert.throws(() => sm.get(), (e: unknown) => e instanceof McpError && e.code === ErrorCode.InvalidRequest);
  assert.throws(() => sm.get('sess-1'), McpError);
});

test('get() falls back to the default client', () => {
  const f = fakeClient();
  const sm = new SessionManager({ defaultClient: f.impl as any });
  assert.equal(sm.get(), f.impl);
  assert.equal(sm.get('unknown-session'), f.impl);
});

test('set()/get() isolate clients per session', () => {
  const sm = new SessionManager();
  const a = fakeClient().impl;
  const b = fakeClient().impl;
  sm.set('sess-a', a as any);
  sm.set('sess-b', b as any);
  assert.equal(sm.get('sess-a'), a);
  assert.equal(sm.get('sess-b'), b);
});

test('status() reports configured sessions without secrets', () => {
  const sm = new SessionManager();
  assert.deepEqual(sm.status(), { configured: false });
  sm.set('sess-a', fakeClient({ authMethod: 'bearer', apiVersion: '3.0' }).impl as any);
  const st = sm.status('sess-a');
  assert.equal(st.configured, true);
  assert.equal(st.authMethod, 'bearer');
  assert.equal(st.url, 'https://glpi.test');
  assert.equal(st.apiVersion, '3.0');
  assert.ok(!('password' in st));
});

test('remove() deletes the session and revokes its client', async () => {
  const f = fakeClient();
  const sm = new SessionManager();
  sm.set('sess-a', f.impl as any);
  await sm.remove('sess-a');
  assert.equal(f.killed.length, 1);
  assert.throws(() => sm.get('sess-a'), McpError);
});

test('evictExpired() removes and revokes expired sessions', () => {
  const f = fakeClient();
  const sm = new SessionManager({ ttlMs: -1 });
  sm.set('sess-a', f.impl as any);
  sm.evictExpired();
  assert.equal(f.killed.length, 1);
  assert.throws(() => sm.get('sess-a'), McpError);
});

test('close() clears and revokes every session', async () => {
  const a = fakeClient();
  const b = fakeClient();
  const sm = new SessionManager();
  sm.set('sess-a', a.impl as any);
  sm.set('sess-b', b.impl as any);
  await sm.close();
  assert.equal(a.killed.length, 1);
  assert.equal(b.killed.length, 1);
  assert.equal(sm.has('sess-a'), false);
  assert.equal(sm.has('sess-b'), false);
});
