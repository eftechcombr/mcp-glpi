## Mission

The performance optimizer agent identifies bottlenecks and optimizes performance in mcp-glpi. It focuses on measurement, actual bottlenecks, and caching strategies.

## Responsibilities

- Optimize search performance (criteria building, pagination, fetch_all).
- Improve HTTP layer efficiency (connection reuse, timeout tuning).
- Optimize SearchOptionsCache TTL and lookup paths.
- Reduce unnecessary API calls (batch operations, count probes).
- Profile and optimize large result sets (the `fetch_all` path).

## Best Practices

- Measure before optimizing — add debug logging or metrics.
- Focus on the most impactful bottlenecks (network calls, large payloads).
- Cache `/listSearchOptions` responses (already implemented with configurable TTL).
- Use count probes (`range=0-0`) instead of fetching full data for stats.
- Avoid N+1 query patterns in tool handlers.

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`

## Repository Starting Points

- `src/http.ts` — HTTP layer (timeouts, retry delays, connection handling)
- `src/search.ts` — Search engine (pagination, fetch_all loop)
- `src/search-options.ts` — Field cache (TTL, lookup efficiency)

## Key Files

- `src/http.ts` — `GlpiHttp`: retry backoff, timeout, request overhead
- `src/search.ts` — `GlpiSearch`: fetch_all pagination loop, count probes
- `src/search-options.ts` — `SearchOptionsCache`: TTL, map lookups
- `src/glpi-client.ts` — `getTicketStats()`: count probes (already optimized)

## Architecture Context

The main performance considerations are:
- **Network calls**: Each GLPI API call adds latency. Minimize round trips.
- **Pagination**: `fetchAll` loops sequentially — large datasets are slow.
- **Field cache**: `/listSearchOptions` is fetched once per itemtype per TTL window.
- **Count probes**: `glpi_count` uses `range=0-0` — very cheap.
- **Expand dropdowns**: Resolves FK IDs server-side, adds slight overhead but saves LLM round trips.

## Key Symbols for This Agent

- `GlpiHttp.request` (`src/http.ts:169`) — Central request path
- `GlpiSearch.fetchAll` (`src/search.ts:148`) — Pagination loop
- `GlpiSearch.count` (`src/search.ts:91`) — Cheap count probe
- `SearchOptionsCache` (`src/search-options.ts:39`) — TTL and cache invalidation

## Documentation Touchpoints

- `docs/tooling.md` — Debugging with `GLPI_DEBUG`
- `docs/testing-strategy.md` — Performance test considerations

## Collaboration Checklist

1. Profile the current behaviour (manual testing with `GLPI_DEBUG`).
2. Identify the bottleneck (network, CPU, memory).
3. Implement the optimization with a measurable improvement.
4. Run `npm test` to verify correctness.
5. Document any configuration changes (env vars, TTL).
