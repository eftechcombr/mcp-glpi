---
slug: error-handling
category: operations
generatedAt: 2026-11-17T00:00:00.000Z
relevantFiles:
  - src/http.ts
  - src/index.ts
---

# How are errors handled?

## HTTP layer (`src/http.ts`)

### `GlpiError`

Non-2xx responses become a `GlpiError` with structured fields:

| Field | Meaning |
|---|---|
| `status` | HTTP status code |
| `glpiCode` | GLPI error code, when the body provides one |
| `glpiMessage` | GLPI human-readable message, when available |
| `body` | Raw response body (message falls back to the first 500 chars) |
| `url`, `method` | Failing request |

Error bodies shaped `["CODE","message"]` are parsed into `glpiCode` /
`glpiMessage`; anything else is kept raw.

### Automatic recovery

- **401** — the token is cleared, the session is re-initialised, and the
  request is retried **once**.
- **429** — retried with exponential backoff, honouring `Retry-After` seconds
  when present.
- **5xx and network errors** — retried up to `GLPI_MAX_RETRIES` (default 2)
  with exponential backoff from `retryBaseDelayMs` (300 ms).
- **Timeout** — aborted after `GLPI_TIMEOUT_MS` (default 15000 ms) and
  surfaced as `Request timeout after <ms>ms: <url>`.

Token refresh is mutex-guarded so concurrent requests trigger a single
re-authentication. `killSession()` only clears the in-memory token; the GLPI
High-Level API has no logout endpoint.

## MCP layer (`src/index.ts`)

Tool errors are translated for the client:

| Source | MCP error |
|---|---|
| Unknown tool | `MethodNotFound` — `Unknown tool: <name>` |
| Zod validation failure | `InvalidParams` — `Invalid arguments for <tool>: <field: message>` |
| `GlpiError` | `InternalError` — `GLPI API error on <tool> (HTTP <status>): <detail>` |
| Any other exception | `InternalError` — `Error executing <tool>: <message>` |

Resources use `InvalidRequest` for unknown URIs and `InternalError` for
backend failures.

## Debugging

Set `GLPI_DEBUG` to log retries, re-authentication, and token acquisition to
stderr. Stdout stays reserved for the MCP stdio protocol.
