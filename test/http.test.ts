/**
 * Integration tests for GlpiHttp using a mocked fetch.
 *
 * Run with: npm test
 *
 * These tests verify:
 *   - Session initialization with user_token
 *   - Auto re-authentication on 401
 *   - 5xx retry with exponential backoff
 *   - Structured error parsing of GLPI ["CODE", "message"] body
 */

import { strict as assert } from 'node:assert';
import { test, beforeEach, mock } from 'node:test';
import { GlpiHttp, GlpiError } from '../src/http.js';

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

function installFetch(handler: FetchHandler) {
  // @ts-expect-error overriding global fetch
  global.fetch = mock.fn(handler);
}

beforeEach(() => {
  // Reset between tests
});

test('initSession with userToken stores session_token', async () => {
  installFetch(async (url) => {
    assert.match(url, /\/apirest\.php\/initSession$/);
    return new Response(JSON.stringify({ session_token: 'sess-abc' }), { status: 200 });
  });

  const http = new GlpiHttp({ url: 'https://glpi.test', userToken: 'user-123' });
  const token = await http.initSession();
  assert.equal(token, 'sess-abc');
  assert.equal(http.session, 'sess-abc');
});

test('request() re-authenticates on 401 and retries once', async () => {
  let initCalls = 0;
  let requestCalls = 0;

  installFetch(async (url) => {
    if (url.endsWith('/initSession')) {
      initCalls++;
      return new Response(JSON.stringify({ session_token: `sess-${initCalls}` }), { status: 200 });
    }
    requestCalls++;
    if (requestCalls === 1) {
      return new Response('["ERROR_SESSION_TOKEN_INVALID", "session expired"]', { status: 401 });
    }
    return new Response(JSON.stringify([{ id: 42, name: 'PC-01' }]), { status: 200 });
  });

  const http = new GlpiHttp({ url: 'https://glpi.test', userToken: 'u' });
  await http.initSession();

  const result = await http.request<{ id: number; name: string }[]>('Computer');
  assert.equal(result.data[0].id, 42);
  assert.equal(initCalls, 2, 'should have re-authenticated once');
  assert.equal(requestCalls, 2);
});

test('5xx triggers retry with backoff', async () => {
  let attempts = 0;

  installFetch(async (url) => {
    if (url.endsWith('/initSession')) {
      return new Response(JSON.stringify({ session_token: 's' }), { status: 200 });
    }
    attempts++;
    if (attempts < 3) {
      return new Response('upstream error', { status: 503 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  });

  const http = new GlpiHttp({
    url: 'https://glpi.test',
    userToken: 'u',
    maxRetries: 3,
    retryBaseDelayMs: 1,
  });
  await http.initSession();
  await http.request('Computer');
  assert.equal(attempts, 3);
});

test('error body ["CODE","message"] is parsed into GlpiError', async () => {
  installFetch(async (url) => {
    if (url.endsWith('/initSession')) {
      return new Response(JSON.stringify({ session_token: 's' }), { status: 200 });
    }
    return new Response('["ERROR_BAD_INPUT", "Missing required field"]', { status: 400 });
  });

  const http = new GlpiHttp({ url: 'https://glpi.test', userToken: 'u' });
  await http.initSession();

  await assert.rejects(
    () => http.request('Ticket', { method: 'POST', json: { input: {} } }),
    (err: unknown) => {
      assert.ok(err instanceof GlpiError);
      assert.equal(err.status, 400);
      assert.equal(err.glpiCode, 'ERROR_BAD_INPUT');
      assert.equal(err.glpiMessage, 'Missing required field');
      return true;
    }
  );
});
