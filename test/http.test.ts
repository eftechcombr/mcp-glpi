import { strict as assert } from 'node:assert';
import { test } from 'bun:test';
import { GlpiHttp, GlpiError } from '../src/http.js';

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

function installFetch(handler: FetchHandler) {
  global.fetch = handler as unknown as typeof fetch;
}

function makeHttp(overrides: Record<string, unknown> = {}) {
  return new GlpiHttp({
    url: 'https://glpi.test',
    username: 'testuser',
    password: 'testpass',
    maxRetries: 2,
    retryBaseDelayMs: 1,
    ...overrides,
  } as any);
}

test('initSession with username/password obtains OAuth2 token', async () => {
  installFetch(async (url, init) => {
    assert.match(url, /\/api\.php\/token$/);
    assert.equal(init?.method, 'POST');
    const body = init?.body?.toString() ?? '';
    assert.ok(body.includes('grant_type=password'));
    assert.ok(body.includes('username=testuser'));
    assert.ok(body.includes('password=testpass'));
    return new Response(
      JSON.stringify({ access_token: 'tok-abc', token_type: 'bearer', expires_in: 3600, scope: 'api' }),
      { status: 200 }
    );
  });

  const http = makeHttp();
  await http.initSession();
  assert.equal(http.token, 'tok-abc');
});

test('request() re-authenticates on 401 and retries once', async () => {
  let tokenCalls = 0;
  let requestCalls = 0;

  installFetch(async (url, _init) => {
    if (url.endsWith('/token')) {
      tokenCalls++;
      return new Response(
        JSON.stringify({ access_token: `tok-${tokenCalls}`, token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    requestCalls++;
    if (requestCalls === 1) {
      return new Response('["ERROR_SESSION_TOKEN_INVALID", "session expired"]', { status: 401 });
    }
    return new Response(JSON.stringify([{ id: 42, name: 'PC-01' }]), { status: 200 });
  });

  const http = makeHttp();
  await http.initSession();

  const result = await http.request<{ id: number; name: string }[]>('Assets/Computer');
  assert.equal(result.data[0].id, 42);
  assert.equal(tokenCalls, 2, 'should have re-authenticated once');
  assert.equal(requestCalls, 2);
});

test('5xx triggers retry with backoff', async () => {
  let attempts = 0;

  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    attempts++;
    if (attempts < 3) {
      return new Response('upstream error', { status: 503 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  });

  const http = makeHttp({ maxRetries: 3, retryBaseDelayMs: 1 });
  await http.initSession();
  await http.request('Assets/Computer');
  assert.equal(attempts, 3);
});

test('429 is retried, honouring Retry-After', async () => {
  let attempts = 0;

  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    attempts++;
    if (attempts === 1) {
      return new Response('rate limited', {
        status: 429,
        headers: { 'Retry-After': '0' },
      });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  });

  const http = makeHttp({ retryBaseDelayMs: 1 });
  await http.initSession();
  await http.request('Assets/Computer');
  assert.equal(attempts, 2);
});

test('network error is retried with backoff', async () => {
  let attempts = 0;

  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    attempts++;
    if (attempts === 1) throw new TypeError('fetch failed: ECONNRESET');
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
  });

  const http = makeHttp({ retryBaseDelayMs: 1 });
  await http.initSession();
  const result = await http.request<{ id: number }[]>('Assets/Computer');
  assert.equal(result.data[0].id, 1);
  assert.equal(attempts, 2);
});

test('request aborts after timeoutMs', async () => {
  installFetch(async (url, init) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  });

  const http = makeHttp({ timeoutMs: 20, maxRetries: 0 });
  await http.initSession();

  await assert.rejects(
    () => http.request('Assets/Computer'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /timeout after 20ms/);
      return true;
    }
  );
});

test('error body ["CODE","message"] is parsed into GlpiError', async () => {
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    return new Response('["ERROR_BAD_INPUT", "Missing required field"]', { status: 400 });
  });

  const http = makeHttp();
  await http.initSession();

  await assert.rejects(
    () => http.request('Assistance/Ticket', { method: 'POST', json: {} }),
    (err: unknown) => {
      assert.ok(err instanceof GlpiError);
      assert.equal(err.status, 400);
      assert.equal(err.glpiCode, 'ERROR_BAD_INPUT');
      assert.equal(err.glpiMessage, 'Missing required field');
      return true;
    }
  );
});
