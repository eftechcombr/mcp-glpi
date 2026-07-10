---
slug: caching
category: features
generatedAt: 2026-07-09T23:58:35.846Z
relevantFiles:
  - src/search-options.ts
  - src/search.ts
---

# Caching

## SearchOptionsCache (`src/search-options.ts`)

Caches `/listSearchOptions/{itemtype}` responses with a 1-hour TTL. This avoids
re-fetching the field catalogue on every search call.

### Availability

GLPI 11's REST API does not expose the `/listSearchOptions/` endpoint. The
cache gracefully degrades: `resolveField()` and `resolvePropertyName()` return
`undefined`, and the search layer falls back to using raw field names directly.

### RSQL field names

Without the search options cache, the search layer uses plain column names
(e.g., `status`, `name`, `entities_id`) as RSQL property names. This works for
simple criteria but may not resolve joined/dotted field paths.
