---
status: completed
generated: 2026-07-10
agents:
  - type: "refactoring-specialist"
    role: "Rewrite HTTP, search, and client layers for GLPI v2.3.0 API migration"
  - type: "test-writer"
    role: "Update all unit tests for new auth flow, search mechanism, and response formats"
phases:
  - id: "phase-1"
    name: "Rewrite HTTP layer"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-2"
    name: "Rewrite Search layer"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-3"
    name: "Rewrite Client layer"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-4"
    name: "Update Tool definitions"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-5"
    name: "Update tests and smoke script"
    prevc: "V"
    agent: "test-writer"
---

# mcp-glpi v2.3.0 API Migration

> Rewrite the HTTP, search, and client layers of mcp-glpi to connect to GLPI's new api.php v2.3.0 REST API. All existing MCP tools preserved (0 new, 0 removed).

## Migration Summary

### What changed

| Layer | File | Key Changes |
|---|---|---|
| HTTP | `src/http.ts` | OAuth2 password grant auth (`POST /api.php/token`), `Authorization: Bearer`, base URL `/api.php/`, PATCH support, 204 handling |
| Search | `src/search.ts` | RSQL filter builder, collection GET with `start`/`limit`, bare array response, Content-Range for totalcount |
| SearchOptions | `src/search-options.ts` | Graceful null return when `listSearchOptions` unavailable, added `resolvePropertyName` |
| Client | `src/glpi-client.ts` | Itemtype-to-path mapping (25+ types), removed `input` wrapper, PATCH for updates, new sub-resource paths (`/Assistance/Ticket/{id}/Timeline/*`) |
| Tools | `src/index.ts` | `TICKET_FIELDS` use property names, OAuth2 config, session endpoints unified |
| Tests | `test/*.test.ts` | Updated for OAuth2 flow, new URL patterns, new response formats |
| Smoke | `scripts/smoke.ts` | Updated for new API patterns |

### Auth Migration
- **Old**: `GET /apirest.php/initSession` + `Session-Token` header
- **New**: `POST /api.php/token` (form: `grant_type=password`, `username`, `password`) + `Authorization: Bearer <token>`
- **Env vars**: `GLPI_USERNAME` + `GLPI_PASSWORD` (required). `GLPI_APP_TOKEN` / `GLPI_USER_TOKEN` no longer used.

### Path Migration
- `{itemtype}` → `/{Category}/{ItemType}` (e.g., `Ticket` → `/Assistance/Ticket`)
- Sub-resources: `Ticket/{id}/ITILFollowup` → `/Assistance/Ticket/{id}/Timeline/Followup`
- Session: `getMyProfiles`/`getActiveProfile`/`getMyEntities` → `/session` + `/Session/EntityTree`

### Search Migration
- **Old**: `GET /apirest.php/search/{itemtype}?criteria[0][field]=12&criteria[0][searchtype]=equals&criteria[0][value]=1&range=0-49`
- **New**: `GET /api.php/Assistance/Ticket?filter=status==1&start=0&limit=50`
- Field IDs → property names (resolved via `listSearchOptions` uid, or used directly as string)

### CRUD Changes
- `PUT` → `PATCH` for updates
- No `{ input: payload }` wrapper
- `POST` returns `{ id, href }` (201)
- `DELETE` returns 204 (no body)
- Collection `GET` returns bare array

## Verification
- Build: `npm run build` → 0 errors
- Tests: `npm run test` → 12/12 pass
