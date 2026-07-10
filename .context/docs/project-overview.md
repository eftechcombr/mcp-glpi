## Project Overview

mcp-glpi is an MCP (Model Context Protocol) server that exposes GLPI IT Service Management to AI assistants like Claude. It provides a bridge between GLPI's REST API and LLM tools, enabling natural-language-driven ticket management, asset inventory, reporting, and ITIL workflows.

## Quick Facts

- Root: `/Users/eduardo/git/github/eftechcombr/mcp-glpi`
- Languages: TypeScript (7 source files, 2 test files, 1 script)
- Entry: `src/index.ts` — MCP server with tool/resource handlers
- Package: `mcp-glpi` v3.2.0 — published on npm
- License: MIT
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- **CLI**: `dist/index.js` (via `npx mcp-glpi` or `npm start`)
- **Dev**: `src/index.ts` (via `npm run dev` with ts-node)
- **Library exports**: `GlpiClient`, `GlpiHttp`, `GlpiSearch`, `SearchOptionsCache`, typed interfaces in `src/glpi-client.ts`

## Key Exports

All public API symbols are listed in `codebase-map.json`. Major exports include:

- `GlpiClient` — high-level domain methods (tickets, problems, changes, assets, users, knowledge base, contracts, etc.)
- `GlpiHttp` — unified HTTP layer with auto-reauth, structured errors, and retry
- `GlpiSearch` — multi-criteria search with fetch_all, count probes, sort/order
- `SearchOptionsCache` — dynamic field-id mapping via `/listSearchOptions/{itemtype}`

## File Structure & Code Organization

- `src/` — TypeScript source files
  - `index.ts` — MCP server setup, tool definitions, request dispatch (~1750 lines)
  - `glpi-client.ts` — Domain client with typed interfaces for GLPI entities
  - `http.ts` — Unified HTTP layer with session management, retries, error handling
  - `search.ts` — Multi-criteria search engine over GLPI's `/search/` endpoint
  - `search-options.ts` — Field catalogue cache and resolution helpers
- `test/` — Test files (`http.test.ts`, `search.test.ts`) using Node's built-in test runner with mocked fetch
- `scripts/` — `smoke.ts` for manual integration smoke testing
- `dist/` — Compiled output (CommonJS)

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Language | TypeScript 5.3+ |
| Protocol | Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` |
| API | GLPI REST API (`/api.php/`) — OAuth2, tested against GLPI 11 |
| Validation | Zod 3.22+ for input schema validation |
| Test runner | Node `--test` via `tsx` |
| Build | `tsc` (TypeScript compiler) |

## Getting Started Checklist

1. Clone the repo and run `npm install`.
2. Set environment variables: `GLPI_URL`, `GLPI_AUTH_METHOD`, and credentials per `.env.example` (OAuth2 password grant, client_credentials, or bearer).
3. Run `npm start` to start the MCP server.
4. Configure Claude Desktop / Claude Code to connect to the MCP server.
5. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Next Steps

- Review the [Development Workflow](./development-workflow.md) guide
- Check the [Tooling Guide](./tooling.md) for IDE setup
- Refer to the [README](../../README.md) for the full tool catalogue
