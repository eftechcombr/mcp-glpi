import { strict as assert } from 'node:assert';
import { test } from 'bun:test';
import { GlpiHttp } from '../src/http.js';
import { GlpiSearch } from '../src/search.js';
import { SearchOptionsCache } from '../src/search-options.js';

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

function installFetch(handler: FetchHandler) {
  global.fetch = handler as unknown as typeof fetch;
}

function authedHttp(): GlpiHttp {
  return new GlpiHttp({
    url: 'https://glpi.test',
    username: 'u',
    password: 'p',
    maxRetries: 0,
    retryBaseDelayMs: 1,
  } as any);
}

function authedSearch(): GlpiSearch {
  const http = authedHttp();
  const cache = new SearchOptionsCache(http, 60000);
  return new GlpiSearch(http, cache);
}

test('search() uses start/limit params instead of range', async () => {
  let capturedStart = '';
  let capturedLimit = '';
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    capturedStart = new URL(url).searchParams.get('start') ?? '';
    capturedLimit = new URL(url).searchParams.get('limit') ?? '';
    return new Response(JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]), { status: 200 });
  });

  const search = authedSearch();
  const result = await search.search('Ticket', { limit: 5 });
  assert.equal(capturedStart, '0');
  assert.equal(capturedLimit, '5');
  assert.equal(result.data.length, 5);

  await search.search('Ticket', { start: 10, limit: 20 });
  assert.equal(capturedStart, '10');
  assert.equal(capturedLimit, '20');
});

test('count() returns 0 when no Content-Range header', async () => {
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
  });

  const search = authedSearch();
  const n = await search.count('Ticket');
  assert.equal(n, 0);
});

test('count() returns totalcount from Content-Range header', async () => {
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
      headers: { 'Content-Range': '0-0/1803' },
    });
  });

  const search = authedSearch();
  const n = await search.count('Ticket');
  assert.equal(n, 1803);
});

const FRENCH_TICKET_OPTIONS = {
  '1': { name: 'Titre', table: 'glpi_tickets', field: 'name', uid: 'Ticket.name', datatype: 'itemlink' },
  '2': { name: 'ID', table: 'glpi_tickets', field: 'id', uid: 'Ticket.id', datatype: 'number' },
  '4': { name: 'Demandeur', table: 'glpi_users', field: 'name', uid: 'Ticket.Ticket_User.User.name', datatype: 'dropdown' },
  '12': { name: 'Statut', table: 'glpi_tickets', field: 'status', uid: 'Ticket.status', datatype: 'specific' },
  common: 'metadata entry to be skipped',
};

function installCatalogueFetch() {
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    assert.match(url, /listSearchOptions\/Ticket/);
    return new Response(JSON.stringify(FRENCH_TICKET_OPTIONS), { status: 200 });
  });
}

test('resolveField works on a localized (French) instance', async () => {
  installCatalogueFetch();
  const http = authedHttp();
  const cache = new SearchOptionsCache(http, 60000);

  assert.equal(await cache.resolveField('Ticket', 'status'), 12);
  assert.equal(await cache.resolveField('Ticket', 'Statut'), 12);
  assert.equal(await cache.resolveField('Ticket', 'Ticket.status'), 12);
  assert.equal(await cache.resolveField('Ticket', 12), 12);
  assert.equal(await cache.resolveField('Ticket', '12'), 12);
  assert.equal(await cache.resolveField('Ticket', 'does_not_exist'), undefined);
});

test('resolveField prefers the own-table option on column-name collisions', async () => {
  installCatalogueFetch();
  const http = authedHttp();
  const cache = new SearchOptionsCache(http, 60000);

  assert.equal(await cache.resolveField('Ticket', 'name'), 1);
});

test('search uses v3/v2 compatible paths for SoftwareLicense and Project', async () => {
  const requestedPaths: string[] = [];
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    requestedPaths.push(new URL(url).pathname);
    return new Response(JSON.stringify([]), { status: 200 });
  });

  const search = authedSearch();
  await search.search('SoftwareLicense', { limit: 1 });
  await search.search('Project', { limit: 1 });

  assert.deepEqual(requestedPaths, [
    '/api.php/v3.0/Management/License',
    '/api.php/v3.0/Project',
  ]);
});

test('search() clamps page size and negative offsets', async () => {
  const captured: Array<{ start: string; limit: string }> = [];
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    const params = new URL(url).searchParams;
    captured.push({ start: params.get('start') ?? '', limit: params.get('limit') ?? '' });
    return new Response('[]', { status: 200 });
  });

  const search = authedSearch();
  await search.search('Ticket', { start: -5, limit: 100000 });
  assert.deepEqual(captured[0], { start: '0', limit: '1000' });
});

test('fetchAll() clamps maxRows and page size', async () => {
  const limits: string[] = [];
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    const params = new URL(url).searchParams;
    limits.push(params.get('limit') ?? '');
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
  });

  const search = authedSearch();
  await search.search('Ticket', { fetchAll: true, limit: 5000 });
  assert.equal(limits[0], '1000');

  const small = await search.search('Ticket', { fetchAll: true, maxRows: 0, limit: 10 });
  assert.equal(small.count, 1);
});

test('search rejects RSQL injection in string field names before calling GLPI', async () => {
  const paths: string[] = [];
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    paths.push(new URL(url).pathname);
    return new Response('[]', { status: 200 });
  });

  const search = authedSearch();
  await assert.rejects(
    () =>
      search.search('Ticket', {
        criteria: [{ field: 'name==1;status==closed', searchtype: 'equals', value: 'x' }],
      }),
    /Invalid search field/
  );
  assert.deepEqual(paths, []);
});

test('contains values stay inside the quoted wildcard literal', async () => {
  let filter = '';
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    filter = new URL(url).searchParams.get('filter') ?? '';
    return new Response('[]', { status: 200 });
  });

  const search = authedSearch();
  await search.search('Ticket', {
    criteria: [{ field: 'name', searchtype: 'contains', value: 'a;status==closed' }],
  });

  assert.equal(filter, "name==*'a;status==closed'*");
});

test('search fails closed on unresolved fields and unknown operators', async () => {
  installCatalogueFetch();
  const http = authedHttp();
  const cache = new SearchOptionsCache(http, 60000);
  const search = new GlpiSearch(http, cache);

  await assert.rejects(
    () =>
      search.search('Ticket', {
        criteria: [{ field: 9999, searchtype: 'equals', value: 'x' }],
      }),
    /Unknown search field id 9999/
  );

  await assert.rejects(
    () =>
      search.search('Ticket', {
        criteria: [{ field: 'name', searchtype: 'bogus' as any, value: 'x' }],
      }),
    /Unsupported searchtype/
  );

  await assert.rejects(
    () =>
      search.search('Ticket', {
        criteria: [
          { field: 'name', searchtype: 'equals', value: 'a' },
          { field: 'status', searchtype: 'equals', value: 1, link: 'XOR' as any },
        ],
      }),
    /Unsupported link/
  );
});

test('wildcard characters in user values are escaped', async () => {
  const filters: string[] = [];
  installFetch(async (url) => {
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({ access_token: 'tok-s', token_type: 'bearer', expires_in: 3600 }),
        { status: 200 }
      );
    }
    filters.push(new URL(url).searchParams.get('filter') ?? '');
    return new Response('[]', { status: 200 });
  });

  const search = authedSearch();
  await search.search('Ticket', {
    criteria: [{ field: 'name', searchtype: 'equals', value: 'a*b' }],
  });
  await search.search('Ticket', {
    criteria: [{ field: 'name', searchtype: 'contains', value: 'a*b' }],
  });

  assert.equal(filters[0], "name=='a\\*b'");
  assert.equal(filters[1], "name==*'a\\*b'*");
});
