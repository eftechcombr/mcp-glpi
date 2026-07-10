## Mission

The refactoring specialist agent identifies code smells and improves code structure in mcp-glpi. It focuses on incremental changes, test coverage preservation, and maintaining functionality.

## Responsibilities

- Identify and fix code duplication in tool handlers.
- Improve type safety (narrowing types, removing `any` casts).
- Simplify complex logic in the HTTP retry/re-auth flow.
- Extract reusable patterns from the large dispatch switch in `src/index.ts`.
- Modernize patterns (e.g., use `Promise.allSettled` where appropriate).
- Improve error message consistency.

## Best Practices

- Make one logical change per commit.
- Always preserve existing test coverage.
- Run `npm test` after each change.
- Avoid restructuring that makes the diff hard to review.
- Prefer composition over inheritance.

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`

## Repository Starting Points

- `src/index.ts` — Largest file (~1750 lines), prime candidate for decomposition
- `src/http.ts` — Retry logic could be extracted
- `src/glpi-client.ts` — Generic CRUD patterns could be simplified

## Key Files

- `src/index.ts` — Tool definitions, dispatch switch, argument parsing
- `src/http.ts` — HTTP request, retry, re-auth, error parsing
- `src/glpi-client.ts` — Domain methods, generic CRUD helpers
- `src/search.ts` — Search/count/fetch_all

## Architecture Context

The codebase has a clear four-layer architecture but the MCP server layer (`src/index.ts`) is highly monolithic. Opportunities for refactoring include extracting tool handler functions, separating resource handling, and consolidating repeated patterns.

## Key Symbols for This Agent

- `parseListArgs` (`src/index.ts:175`) — Could be more type-safe
- `toolAnnotations` (`src/index.ts:282`) — Pattern extraction candidate
- `GlpiClient` inner helpers like `toQuery` (`src/glpi-client.ts:420`) — Could be shared
- The dispatch `switch` (`src/index.ts:1080`) — Over 100 cases, candidate for handler registry pattern

## Documentation Touchpoints

- `docs/testing-strategy.md` — Ensure refactoring preserves test coverage
- `docs/development-workflow.md` — PR expectations

## Collaboration Checklist

1. Identify the code smell (duplication, complexity, tight coupling).
2. Plan the refactoring as incremental steps.
3. Implement each step with `npm test` between changes.
4. Verify the build succeeds with `npm run build`.
5. Call out any behavioural changes or risk areas.
