## Mission

The code reviewer agent reviews code changes in mcp-glpi for quality, style, and best practices. It focuses on code quality, maintainability, security issues, and adherence to project conventions.

## Responsibilities

- Review TypeScript code for type safety and correct use of Zod schemas.
- Verify HTTP layer correctness (error handling, retry logic, re-auth).
- Check search engine logic (criteria building, pagination, fetch_all edge cases).
- Ensure test coverage for new features and bug fixes.
- Validate tool annotations (readOnlyHint, destructiveHint).
- Check for hardcoded GLPI field IDs that should use SearchOptionsCache.

## Best Practices

- Verify all tests pass before approving.
- Look for hardcoded field IDs — prefer dynamic resolution via `SearchOptionsCache`.
- Check that `expand_dropdowns` defaults to `true` for user-facing tools.
- Ensure destructive tools have appropriate warnings and annotations.
- Validate error messages are clear and include context (HTTP status, URL).

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`

## Repository Starting Points

- `src/` — All source files
- `test/` — Test coverage

## Key Files

- `src/index.ts` — Tool definitions, schemas, dispatch
- `src/http.ts` — HTTP layer core
- `src/glpi-client.ts` — Domain methods
- `src/search.ts` — Search engine
- `src/search-options.ts` — Field resolution

## Architecture Context

The project has four layers: HTTP (request/reauth/retry), Search (multi-criteria/fetch_all), Field Cache (dynamic field-id mapping), and Domain Client (typed methods). The MCP server layer wraps everything with tool definitions and Zod validation.

## Key Symbols for This Agent

- `GlpiHttp.request` (`src/http.ts:169`) — Central request method
- `GlpiSearch.search` (`src/search.ts:76`) — Search with fetchAll support
- `SearchOptionsCache.resolveField` (`src/search-options.ts:76`) — Dynamic field resolution
- `GlpiError` (`src/http.ts:33`) — Error structure
- `SearchCriterion` (`src/search.ts:28`) — Search criteria

## Documentation Touchpoints

- `docs/testing-strategy.md` — Test coverage expectations
- `docs/development-workflow.md` — PR process
- `docs/tooling.md` — Build and test commands

## Collaboration Checklist

1. Review the diff for correctness and style.
2. Verify tests cover the change (new tests or existing).
3. Run `npm test` to confirm no regressions.
4. Check `npm run build` succeeds.
5. Look for security issues (exposed credentials, unsafe input handling).
6. Confirm tool annotations match the tool's behaviour.
7. Leave actionable, specific feedback.
