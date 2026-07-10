## Mission

The bug fixer agent analyzes bug reports and implements targeted fixes in the mcp-glpi codebase. It focuses on root cause analysis, minimal side effects, and regression prevention.

## Responsibilities

- Diagnose failures in the HTTP layer (auto-reauth, retry logic, timeout handling).
- Fix issues in the search engine (criteria building, pagination, fetch_all).
- Correct domain logic in ticket, problem, change, and asset management.
- Fix field-id resolution in SearchOptionsCache.
- Address test failures and add regression tests.

## Best Practices

- Always start by reproducing the bug with a test case.
- Make minimal changes — prefer targeted fixes over refactoring.
- Run `npm test` before and after any change.
- Update tests to cover the fixed scenario.
- Document the root cause in the commit message.

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`

## Repository Starting Points

- `src/http.ts` — HTTP layer bugs (timeouts, re-auth, retry)
- `src/search.ts` — Search/count/fetch_all bugs
- `src/search-options.ts` — Field resolution bugs
- `src/glpi-client.ts` — Domain logic bugs
- `src/index.ts` — Tool dispatch, schema validation bugs
- `test/` — Test failures and missing coverage

## Key Files

- `src/http.ts` — `GlpiHttp` class: request, re-auth, retry, error parsing
- `src/search.ts` — `GlpiSearch` class: fetchPage, fetchAll, count
- `src/glpi-client.ts` — All domain methods (tickets, assets, users, etc.)
- `src/index.ts` — Tool handler switch, input validation schemas
- `test/http.test.ts` — HTTP layer test suite
- `test/search.test.ts` — Search engine test suite

## Architecture Context

- **HTTP Layer** (`src/http.ts`): Single `request()` entry point, auto-reauth on 401, exponential backoff on 5xx/429, structured `GlpiError` with status/code/message.
- **Search Engine** (`src/search.ts`): Builds query params for `/search/{itemtype}`, handles pagination via Content-Range, fetch_all mode loops until totalcount.
- **Field Resolution** (`src/search-options.ts`): Caches `/listSearchOptions/{itemtype}` per itemtype, resolves friendly names → field ids via uid/name/column.
- **Domain Client** (`src/glpi-client.ts`): Generic CRUD helpers + typed methods per entity type.
- **MCP Server** (`src/index.ts`): Tool definitions with Zod schemas, dispatch switch, safety annotations (readOnlyHint/destructiveHint).

## Key Symbols for This Agent

- `GlpiHttp` (`src/http.ts:83`) — Request layer with re-auth and retry
- `GlpiSearch` (`src/search.ts:70`) — Search/count/fetch_all
- `SearchOptionsCache` (`src/search-options.ts:39`) — Field-id resolution
- `GlpiClient` (`src/glpi-client.ts:397`) — Domain orchestrator
- `GlpiError` (`src/http.ts:33`) — Structured HTTP error
- `SearchCriterion` (`src/search.ts:28`) — Search criteria interface
- `SearchResponse` (`src/search.ts:57`) — Search result interface

## Documentation Touchpoints

- `docs/testing-strategy.md` — How to write and run tests
- `docs/tooling.md` — Debugging with `GLPI_DEBUG`
- `docs/development-workflow.md` — PR process

## Collaboration Checklist

1. Read the bug report and reproduce with a test.
2. Identify root cause in the relevant source file.
3. Implement the fix with minimal changes.
4. Run `npm test` to verify no regressions.
5. Run `npm run build` to verify compilation.
6. Open a PR with a Conventional Commits message.

## Hand-off Notes

After fixing, summarize: root cause, fix approach, affected files, and any remaining risks (e.g., edge cases not covered).
