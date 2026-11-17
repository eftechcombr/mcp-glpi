---
slug: caching
category: features
generatedAt: 2026-11-17T00:00:00.000Z
relevantFiles:
  - src/search-options.ts
  - src/search.ts
  - src/http.ts
---

# How does caching work?

## SearchOptionsCache (`src/search-options.ts`)

Caches `/listSearchOptions/{itemtype}` responses with a 1-hour TTL. This avoids
re-fetching the field catalogue on every search call and keeps `field_id` ↔
name translations valid across GLPI versions.

### Lookup resolution

`resolveField()` accepts a numeric id, a numeric string, a field name, a
column name, or a `uid` (with or without the `Itemtype.` prefix). Lookups are
case-insensitive for names/columns and prefer the itemtype's own-table option
when column names collide (for example `name` exists on many tables).

`resolvePropertyName()` maps a numeric field id back to the RSQL property name
from the search-option `uid`, stripping the itemtype prefix.

### Graceful degradation

If the endpoint is unavailable or returns an error, the cache marks the
itemtype as unavailable and returns `null` on later calls instead of retrying
on every request. The search layer then falls back to raw field names or skips
criteria it cannot resolve.

`invalidate(itemtype?)` clears one or all cached catalogues and unmarks
unavailable itemtypes.

## Search pagination

`GlpiSearch` does not cache results. `fetch_all` paginates with `start`/`limit`
in 100-row pages, stopping at `maxRows` (default 1000), an empty page, a short
page, or the total from the `Content-Range` header.

## Session and token state

`GlpiHttp` caches the OAuth2 access token in memory until expiry. A 401
triggers exactly one re-authentication and retry. `SessionManager` keeps one
`GlpiClient` (and therefore one token) per MCP session, evicting idle sessions
after `SESSION_TTL_MS` (default 24 h) and revoking them on close.
