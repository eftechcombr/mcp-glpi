## Project Overview

mcp-glpi is an MCP (Model Context Protocol) server that exposes GLPI IT Service Management to AI assistants like Claude. It provides a bridge between GLPI's REST API and LLM tools, enabling natural-language-driven ticket management, asset inventory, reporting, and ITIL workflows.

## Quick Facts

- Root: `/Users/eduardo/git/github/eftechcombr/mcp-glpi`
- Languages: TypeScript (5 source files, 2 test files, 1 script)
- Entry: `src/index.ts` — MCP server with tool/resource handlers
- Package: `mcp-glpi` v3.3.0 — published on npm
- License: MIT
- Runtime: Bun 1.0+
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- **CLI**: `dist/index.js` (via `bun start` or `npx mcp-glpi`)
- **Dev**: `src/index.ts` (via `bun run dev`)
- **Library exports**: `GlpiHttp`, `GlpiSearch`, `SearchOptionsCache`, `GlpiError`, typed interfaces in `src/http.ts`, `src/search.ts`, `src/search-options.ts`

## Key Exports

All public API symbols are listed in `codebase-map.json`. Major exports include:

- `GlpiHttp` — unified HTTP layer with auto-reauth (`password`, `client_credentials`, or `bearer`), structured errors, retry with exponential backoff, timeout handling
- `GlpiSearch` — multi-criteria search with fetch_all (auto-pagination), count probes, RSQL filter expressions, sort/order, forcedisplay
- `SearchOptionsCache` — dynamic field-id mapping via `/listSearchOptions/{itemtype}`, lazy-loaded with TTL
- `GlpiError` — structured HTTP error with status code, GLPI error body, and message
- `GlpiAuthMethod` — supported auth strategies: `password`, `client_credentials`, `bearer`

## File Structure & Code Organization

- `src/` — TypeScript source files
  - `index.ts` — MCP server setup, ~95 tool definitions, request dispatch (~1928 lines)
  - `glpi-client.ts` — Domain client with typed interfaces for GLPI entities (tickets, problems, changes, assets, users, KB, contracts, suppliers, locations, groups, projects, documents)
  - `http.ts` — Unified HTTP layer with session management, retries, error handling, timeout
  - `search.ts` — Multi-criteria search engine over GLPI's `/search/` endpoint with RSQL support and fetch_all
  - `search-options.ts` — Field catalogue cache and resolution helpers
- `test/` — Test files (`http.test.ts`, `search.test.ts`) using Bun's built-in test runner with mocked fetch
- `scripts/` — `smoke.ts` for manual integration smoke testing
- `dist/` — Compiled output (CommonJS via `tsc`)

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Bun ≥ 1.0 |
| Language | TypeScript 5.3+ |
| Protocol | Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` |
| API | GLPI REST API (`/api.php/`) — OAuth2 tested against GLPI 11 |
| Validation | Zod 3.22+ for input schema validation |
| Test runner | Bun test (built-in) |
| Linter | ESLint 10.6+ with `@typescript-eslint` |
| Build | `tsc` (TypeScript compiler) → CommonJS |

## Getting Started Checklist

1. Clone the repo and run `bun install`.
2. Set environment variables: `GLPI_URL`, `GLPI_AUTH_METHOD`, and credentials per `.env.example` (OAuth2 password grant, client_credentials, or bearer).
3. Run `bun start` to start the MCP server.
4. Configure Claude Desktop / Claude Code to connect to the MCP server.
5. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Next Steps

- Review the [Development Workflow](./development-workflow.md) guide
- Check the [Tooling Guide](./tooling.md) for IDE setup and linting
- Refer to the [QA docs](./qa/README.md) for detailed API, auth, and project structure references
- See the [README](../../README.md) for the full tool catalogue
