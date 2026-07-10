## Mission

The test writer agent writes comprehensive tests and maintains test coverage for mcp-glpi. It focuses on unit tests, integration tests, edge cases, and test maintainability.

## Responsibilities

- Write tests for new tools and handlers in `src/index.ts`.
- Maintain and extend `test/http.test.ts` (HTTP layer coverage).
- Maintain and extend `test/search.test.ts` (search engine coverage).
- Add regression tests for bug fixes.
- Test edge cases: empty results, error responses, pagination boundaries.
- Test the `fetch_all` path with various page sizes and limits.

## Best Practices

- Use Node's built-in test runner (`node:test` + `node:assert`) executed via `tsx`.
- Mock `globalThis.fetch` for HTTP layer tests — never hit real GLPI.
- Test both success and error paths.
- Use `describe`/`it` blocks for test organization.
- Cover the search criteria builder with all link operators (`AND`, `OR`, `AND NOT`, `OR NOT`).
- Test auto-reauth flow (401 triggers re-session and retry).
- Test retry logic (5xx, 429, network errors).
- Test the `count()` method (uses `range=0-0`).

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`
- Test documentation: `docs/testing-strategy.md`

## Repository Starting Points

- `test/http.test.ts` — HTTP layer tests
- `test/search.test.ts` — Search engine tests
- `src/http.ts` — HTTP implementation to test
- `src/search.ts` — Search implementation to test

## Key Files

- `test/http.test.ts` — Existing HTTP tests (mocked fetch)
- `test/search.test.ts` — Existing search tests
- `src/http.ts` — `GlpiHttp` class
- `src/search.ts` — `GlpiSearch` class

## Architecture Context

Tests use mocked `fetch` via `MockAgent` (or direct `globalThis.fetch` assignment). Mock handlers return pre-defined JSON responses matching GLPI's API format. The HTTP tests cover session init, re-auth, retry, timeout, and error parsing. The search tests cover criteria building, pagination, fetch_all, and forcedisplay.

## Key Symbols for This Agent

- `GlpiHttp` (`src/http.ts:83`) — Primary class under test in `http.test.ts`
- `GlpiSearch` (`src/search.ts:70`) — Primary class under test in `search.test.ts`
- `GlpiError` (`src/http.ts:33`) — Error structure to verify in tests
- `SearchCriterion` (`src/search.ts:28`) — Interface to use in test criteria
- `SearchResponse` (`src/search.ts:57`) — Response shape to verify

## Documentation Touchpoints

- `docs/testing-strategy.md` — Test framework and conventions

## Collaboration Checklist

1. Understand the feature or fix being tested.
2. Read existing tests for style and pattern matching.
3. Write tests covering: happy path, error cases, edge cases.
4. Use mocked fetch for HTTP-level tests.
5. Run `npm test` to verify new tests pass.
6. Run `npm test` to confirm no regressions.
7. Keep tests focused and readable.
