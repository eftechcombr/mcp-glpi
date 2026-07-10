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
