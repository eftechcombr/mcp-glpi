## Project Overview

mcp-glpi is an MCP (Model Context Protocol) server that exposes GLPI IT Service
Management to AI assistants like Claude. It provides a bridge between GLPI's
High-Level REST API and LLM tools, enabling natural-language-driven ticket
management, asset inventory, reporting, and ITIL workflows.

The server runs either over **stdio** (local desktop clients) or as a hosted
**Streamable HTTP** endpoint with multi-tenant, per-session GLPI connections.

## Quick Facts

- Root: `/Users/eduardo/git/github/eftechcombr/mcp-glpi`
- Languages: TypeScript (7 source files, 3 test files, 1 script)
- Entry: `src/index.ts` — MCP server with tool/resource handlers
- Package: `mcp-glpi` v3.5.0 — published on npm
- License: MIT
- Runtime: Bun 1.0+
- Transports: stdio (default) and Streamable HTTP (`MCP_TRANSPORT=http`)
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- **CLI**: `dist/index.js` (via `bun start` or `npx mcp-glpi`)
- **Dev**: `src/index.ts` (via `bun run dev`)
- **HTTP server**: `src/http-server.ts` — `startHttpServer()` (via `bun run start:http`)
- **Library exports**: `GlpiHttp`, `GlpiSearch`, `SearchOptionsCache`, `GlpiClient`,
  `SessionManager`, `GlpiError`, `normalizeApiVersion`, `ITEMTYPE_PATH_MAP`,
  and typed interfaces in `src/http.ts`, `src/search.ts`, `src/glpi-client.ts`,
  `src/search-options.ts`, `src/sessions.ts`

## Key Exports

All public API symbols are listed in `codebase-map.json`. Major exports include:

- `GlpiHttp` — unified HTTP layer with auto-reauth (`password`, `client_credentials`, or `bearer`), structured errors, retry with exponential backoff, timeout handling
- `GlpiSearch` — multi-criteria search with fetch_all (auto-pagination), count probes, RSQL filter expressions, sort/order, forcedisplay
- `SearchOptionsCache` — dynamic field-id mapping via `/listSearchOptions/{itemtype}`, lazy-loaded with TTL
- `GlpiClient` — typed domain client for tickets, problems, changes, assets, users, KB, contracts, suppliers, locations, groups, projects, documents
- `SessionManager` — per-session `GlpiClient` registry (keyed by `Mcp-Session-Id`) with idle-TTL eviction and GLPI session revocation
- `GlpiError` — structured HTTP error with status code, GLPI error body, and message
- `normalizeApiVersion` — validates/normalizes `GLPI_API_VERSION` (`3.0`, `3`, `v2.3`, …)
- `GlpiAuthMethod` — supported auth strategies: `password`, `client_credentials`, `bearer`

## File Structure & Code Organization

- `src/` — TypeScript source files
  - `index.ts` — MCP server setup, 88 tool definitions, request dispatch, resources (~2200 lines)
  - `glpi-client.ts` — Domain client with typed interfaces for GLPI entities (tickets, problems, changes, assets, users, KB, contracts, suppliers, locations, groups, projects, documents)
  - `http.ts` — Unified HTTP layer with session management, retries, error handling, timeout, API-version normalization
  - `search.ts` — Multi-criteria search engine over GLPI's `/search/` endpoint with RSQL support and fetch_all
  - `search-options.ts` — Field catalogue cache and resolution helpers
  - `sessions.ts` — Per-session client registry for multi-tenant HTTP mode
  - `http-server.ts` — Streamable HTTP transport served by Bun (`WebStandardStreamableHTTPServerTransport`)
- `test/` — Test files (`http.test.ts`, `search.test.ts`, `sessions.test.ts`) using Bun's built-in test runner with mocked fetch
- `scripts/` — `smoke.ts` for manual integration smoke testing
- `dist/` — Compiled output (CommonJS via `tsc`)

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Bun ≥ 1.0 |
| Language | TypeScript 5.3+ |
| Protocol | Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` (stdio + Streamable HTTP) |
| API | GLPI High-Level REST API (`/api.php/v3.0/` default, `v2.x` compatible via `GLPI_API_VERSION`) — OAuth2 |
| Validation | Zod 3.22+ for input schema validation |
| Test runner | Bun test (built-in) |
| Linter | ESLint 10.6+ with `@typescript-eslint` |
| Build | `tsc` (TypeScript compiler) → CommonJS |
| Packaging | npm (`mcp-glpi`), Docker image published to GHCR |

## Getting Started Checklist

1. Clone the repo and run `bun install`.
2. Set environment variables: `GLPI_URL`, `GLPI_AUTH_METHOD`, and credentials per `.env.example` (OAuth2 password grant, client_credentials, or bearer).
3. Run `bun run dev` (source) or `bun start` (compiled) to start the MCP server over stdio.
4. Configure Claude Desktop / Claude Code to connect to the MCP server.
5. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Hosted Mode

- Set `MCP_TRANSPORT=http` to serve the MCP endpoint at `MCP_PATH` (default `/mcp`);
  `/` and `/health` answer JSON liveness probes.
- Binds to `127.0.0.1` by default. Set `MCP_AUTH_TOKEN` to require
  `Authorization: Bearer <token>` on `MCP_PATH`; the server refuses to start on
  a non-loopback address without a token unless
  `MCP_ALLOW_UNAUTHENTICATED=true` is set (not recommended).
- Each session gets its own MCP server instance and transport, so clients can
  initialize concurrently and tear one down without affecting the others.
  `MCP_MAX_SESSIONS` (default 100) caps concurrency.
- With `GLPI_URL` set, every session shares that GLPI instance (single-tenant).
- With `GLPI_URL` unset, the server is multi-tenant: each client calls
  `glpi_configure_connection` and credentials live in memory only.
- Sessions are evicted after `SESSION_TTL_MS` of inactivity; teardown clears
  the in-memory bearer token (the High-Level API has no logout endpoint).

## Next Steps

- Review the [Development Workflow](./development-workflow.md) guide
- Check the [Tooling Guide](./tooling.md) for IDE setup and linting
- Refer to the [QA docs](./qa/README.md) for detailed API, auth, and project structure references
- See the [README](../../README.md) for the full tool catalogue
