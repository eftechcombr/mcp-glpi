# Changelog

## Unreleased

### Security

- **Per-session GLPI destination allowlist**: `glpi_configure_connection` now
  accepts only the configured `GLPI_URL` origin in single-tenant mode; in
  multi-tenant mode, operators must set `GLPI_ALLOWED_HOSTS` to exact approved
  hostnames (or host:port values), mitigating server-side request forgery.
- **Sanitized MCP errors**: upstream and unexpected exception details are no
  longer returned to MCP clients.
- **Validated HTTP limits**: port, rate-limit, and concurrent-session settings
  now reject malformed or out-of-range integer values at startup.
- **HTTP transport authentication**: the Streamable HTTP endpoint now accepts
  `MCP_AUTH_TOKEN` and requires `Authorization: Bearer <token>` on `MCP_PATH`.
  The server binds to `127.0.0.1` by default and refuses to start on a
  non-loopback address without a token unless `MCP_ALLOW_UNAUTHENTICATED=true`
  is set. Health endpoints remain unauthenticated.
- **URL scheme allowlist**: `GLPI_URL` and `glpi_configure_connection` now only
  accept `http`/`https` URLs and reject embedded credentials, query strings,
  and fragments. This closes a `file://` / fragment trick that allowed reading
  local files (including `/proc/self/environ`) through API requests.
- **ID validation and safe API paths**: tool identifiers are validated as
  positive integers and `GlpiHttp` rejects API paths containing `.`/`..`
  segments, query strings, or fragments. This prevents using a crafted `id`
  such as `1/../../../Administration/User/7` to reach a different GLPI endpoint.
- **Pagination caps**: page size is clamped to 1000 rows, `fetch_all` to 5000
  rows, and classic-REST `range` arguments must be `START-END` with a span of
  at most 1000 rows, preventing oversized responses and upstream load.
- **Bounded HTTP sessions**: `MCP_MAX_SESSIONS` (default 100) caps concurrent
  MCP sessions, and idle transports are reaped with the session TTL.
- **RSQL injection hardening**: string `field` names must be simple property
  names, `contains`/`notcontains` values can no longer escape their wildcard
  literal, and unknown searchtypes/links are rejected instead of ignored.
- **Fail-closed search criteria**: unresolved field ids and unknown operators
  now raise `InvalidParams` rather than silently dropping the criterion and
  broadening the result set. Use property names on GLPI v3, where the
  search-options catalogue is unavailable.
- **No mass assignment**: create/update tools for computers, software,
  contracts, suppliers, locations, and projects forward only the fields they
  document, so arbitrary GLPI columns (for example `_users_id_assign`) cannot
  be set through `arguments`.
- **DNS-rebinding and abuse protection**: loopback binds validate `Host`/`Origin`
  (`MCP_ALLOWED_HOSTS` for extra names), and requests are rate-limited per
  session/IP (`MCP_RATE_LIMIT_PER_MINUTE`, default 120/min, `429` + `Retry-After`).
- **Supply-chain pinning**: GitHub Actions are pinned by commit SHA and the
  Docker base image by digest.
- **Dependency upgrade**: `@modelcontextprotocol/sdk` 1.32.2 (from 1.29.0) and
  `zod` 4.6.6, plus an `@hono/node-server` 2.1.9 override. `bun audit
  --production` reports no vulnerabilities; the remaining advisories
  (`minimatch`, `picomatch`) are dev-tooling transitives with no patched
  release yet, so CI gates on production dependencies at high severity.

### Fixed

- **`contains` / `notcontains` search on GLPI v3**: these search types now emit
  `=ilike=*value*` / `=notilike=*value*` instead of `==*value*` / `!=*value*`.
  GLPI treats `*` in `==` as a literal character, so the old filter matched
  nothing (`name==*teste*` returned 0 rows while `name=ilike=*teste*` returned
  the expected matches). Wildcard values are no longer single-quoted, because
  GLPI treats quotes inside a wildcard as literal characters; RSQL separators
  are backslash-escaped instead. Matching is now case-insensitive, matching the
  legacy GLPI search UI.
- **Multiple HTTP sessions per process**: the Streamable HTTP transport now
  creates one server + transport per session instead of sharing a single
  transport. Concurrent `initialize` calls succeed with distinct session ids,
  and `DELETE /mcp` no longer makes the endpoint unable to accept new sessions.

## 3.5.0 — 2026-11-14

### Changed

- **GLPI 12 High-Level API v3.0 support (with v2.x compatibility)**: default
  resource requests now target `/api.php/v3.0/` while preserving backward
  compatibility with High-Level API `v2.x` (`v2.3`, `v2`, etc.).
- **Added `GLPI_API_VERSION` environment variable** (and `api_version` option
  on `glpi_configure_connection`) with validation/normalization via
  `normalizeApiVersion()`, plus `apiVersion` reporting in
  `glpi_connection_status`.
- **Compatible itemtype routing**: updated `ITEMTYPE_PATH_MAP` for
  `SoftwareLicense` (`Management/License`) and `Project` (`Project`) across both
  v2.x and v3.0, and updated `scripts/smoke.ts` team checks for v3.0
  `UserTeamMember` and v2.x `TeamMember` payloads.
- **Session teardown**: `killSession()` clears the local bearer token without
  calling an unsupported `/logout` route.

## 3.4.0 — 2026-08-14

### Added

- **Streamable HTTP transport** (`MCP_TRANSPORT=http`): the server can now run
  as a hosted MCP endpoint (GET/POST/DELETE, `MCP_PATH` default `/mcp`) instead
  of stdio only. Uses the SDK's `WebStandardStreamableHTTPServerTransport`
  served by Bun (`src/http-server.ts`). Liveness at `GET /health` and `GET /`.
- **Multi-tenant sessions** (`src/sessions.ts`): one `GlpiClient` per MCP
  session keyed by `Mcp-Session-Id`, with idle-TTL eviction and session
  revocation on close. When `GLPI_URL` is unset the server runs in multi-tenant
  mode; when set it keeps the single-tenant default-client behaviour.
- **`glpi_configure_connection` tool**: configures the GLPI connection for the
  current session (url, auth method, credentials). Credentials are held in
  memory only, never logged, validated with a live `initSession()` probe, and
  revoked when the session ends.
- **`glpi_connection_status` tool**: reports whether a GLPI connection is
  configured for the session (auth method + URL, never credentials).
- **HTTP server env vars**: `HOST`, `PORT`, `MCP_PATH`, `SESSION_TTL_MS`.
- **Docker**: same image serves HTTP mode via `MCP_TRANSPORT=http`; `EXPOSE
  3000` documented for that mode.

## 3.3.0 — 2026-07-13

### Added

- **`glpi_update_task` / `glpi_delete_task`**: two new MCP tools for managing
  ticket tasks — update fields (content, state, actiontime, etc.) or
  delete/purge a task. Backed by `updateTicketTask` and `deleteTicketTask`
  client methods.

## 3.2.1 — 2026-07-09

### Fixed

- **GLPI 11 compatibility — OAuth2 scopes**: token requests now send
  `scope=api`, which GLPI 11 requires to populate the JWT with API scopes.
  Without this, the bearer token is issued with `"scopes":[]` and every API
  call returns 401 / 403.
- **GLPI 11 compatibility — `Content-Type` on GET requests**: the HTTP layer
  no longer sets `Content-Type: application/json` on requests without a body.
  GLPI 11 rejects GET requests that carry this header with no body.
- **GLPI 11 compatibility — RSQL search operators**: `glpi_search_v2` and
  related search tools now use standard RSQL `=lt=` and `=gt=` operators
  instead of raw `<` / `>`. GLPI 11 parses the query via an RSQL parser that
  requires the `=lt=` form.

## 3.2.0 — 2026-07-04

### Added

- **MCP tool safety annotations** on all 84 tools (fixes #3, AgentSeal findings):
  - `readOnlyHint: true` on every list/get/search/count/stats tool (56 tools).
  - `destructiveHint: true` on delete/update/set/assign tools (9 tools) —
    agents now get an explicit signal before invoking `glpi_delete_ticket`,
    `glpi_delete_computer`, `glpi_update_*`, etc.
  - `idempotentHint` and `openWorldHint: false` everywhere (tools only reach
    the configured GLPI instance).
  - Annotations are derived from the tool name, so future tools are
    annotated automatically.
- **Live smoke test** (`npm run smoke`, `npm run smoke -- --write`):
  23 checks against a real instance — session, SearchOptions cache, field
  resolution, count/search/stats, timeline, users/computers/groups/entities,
  and an optional write cycle (create test ticket → followup → rename →
  soft delete → verify trash). Reads credentials from env or `.env`
  (gitignored). Validated against GLPI 11 (French locale).

### Fixed

- **Search off-by-one**: `search()` passed `limit` as the range end, but GLPI
  ranges are inclusive — `limit: 5` returned 6 rows. Affected `glpi_search_v2`,
  `glpi_search_tickets`, `glpi_count`-adjacent paths and the active-users
  filter. Found by the live smoke test.
- **`resolveField` failed on localized instances**: friendly-name resolution
  only matched the translated label ("Statut" on a French GLPI), so
  `resolveField('Ticket', 'status')` returned undefined. Resolution now tries,
  in order: explicit uid → canonical own-table uid (`Ticket.status`) →
  localized label → raw SQL column name, with own-table priority on column
  collisions (e.g. `name` exists on both glpi_tickets and joined glpi_users).

## 3.1.0 — 2026-07-04

Reliability hardening after the v3.0.0 audit.

### Added

- **Request timeouts**: every HTTP call (including `initSession`) is wrapped in
  an `AbortController` with a configurable timeout (`GLPI_TIMEOUT_MS`, default
  15 s). A hung GLPI backend can no longer block the MCP server indefinitely.
- **Retry on `429` and network errors**: rate-limited responses honour the
  `Retry-After` header; transient network failures (ECONNRESET, timeouts) are
  retried with the same exponential backoff as `5xx`.
- **Runtime input validation (zod)** on ticket tools (`glpi_list_tickets`,
  `glpi_get_ticket`, `glpi_search_tickets`): invalid arguments now return a
  clear `InvalidParams` MCP error instead of failing downstream in GLPI.
- **Differentiated MCP errors**: zod validation → `InvalidParams`;
  `GlpiError` → message with HTTP status + GLPI code; everything else →
  `InternalError`.
- **Config validation at startup**: `GLPI_URL` must be a valid URL and an
  authentication method must be configured — fail fast with a clear message.
- **Debug logging** (`GLPI_DEBUG=1`): retries, re-authentication and
  rate-limiting events are logged to stderr (stdout stays reserved for the MCP
  stdio transport).
- **Resilient startup**: if GLPI is unreachable when the server starts, a
  warning is logged and the session is established lazily on the first request
  (previously the server exited immediately).
- New env vars: `GLPI_TIMEOUT_MS`, `GLPI_MAX_RETRIES`, `GLPI_DEBUG`.
- 3 new HTTP-layer tests (timeout abort, 429 retry, network-error retry) — 7 total.

## 3.0.0 — 2026-06-08

Major overhaul focused on the foundations and on ITSM/reporting coverage.

### Added

- **Unified HTTP layer** (`src/http.ts`) with:
  - Automatic re-authentication on `401` (expired `session_token`).
  - Exponential-backoff retry on `5xx`.
  - Structured `GlpiError` exposing HTTP status + GLPI error code/message + body.
- **Multi-criteria search** via the new high-level `GlpiSearch` (`src/search.ts`):
  - Array of criteria with `link` operator (`AND` / `OR` / `AND NOT` / `OR NOT`).
  - `forcedisplay` to choose returned columns.
  - Pagination via `start`/`limit`, `fetch_all` with `max_rows` safety cap (default 1000).
  - Reads `totalcount` and `Content-Range` header.
- **`SearchOptionsCache`** (`src/search-options.ts`): caches
  `/listSearchOptions/{itemtype}` (TTL 1h) so high-level tools translate
  friendly names ↔ `field_id` resilient to GLPI version drift.
- **New MCP tools**:
  - `glpi_count` — cheap totalcount probe (range=0-0) with criteria.
  - `glpi_search_v2` — multi-criteria search; `glpi_search` kept as deprecated alias.
  - `glpi_list_search_options` — discover field ids of an itemtype.
  - `glpi_search_tickets` — friendly params (status, assigned_user/group,
    requester, category, entity, priority, urgency, date_from/to, text_search,
    open_only) translated to criteria internally.
  - `glpi_get_ticket_timeline` — merged followups + tasks + solutions +
    validations, sorted chronologically.
  - `glpi_tickets_stats_by(dimension, period)` — counts ventilated by
    status / category / technician / entity / month.
  - `glpi_link_tickets` — Ticket_Ticket relations (link / duplicate / parent).
  - `glpi_add_ticket_validation`, `glpi_set_validation_status`,
    `glpi_get_ticket_validations`.
  - `glpi_attach_document_to_ticket`, `glpi_get_ticket_documents`.
  - `glpi_get_ticket_satisfaction`, `glpi_list_overdue_tickets`.
  - `glpi_get_ticket_solutions`.
  - Symmetric `update`/`delete` on Monitor, Phone, Printer, Software,
    NetworkEquipment (parity with Computer).
- **`expand_dropdowns=true` by default** on all detail reads — foreign-key IDs
  come back resolved (technician name, category label, entity, etc.) while raw
  IDs remain available alongside.
- **Tests**: minimal integration tests using `node --test` + `tsx` (HTTP layer,
  re-auth, retry, error parsing).

### Fixed

- **F9** — Ticket and asset stats no longer fetch up to 9999 rows just to count
  them: they now use criteria + `range=0-0` totalcount probes. Accurate beyond
  10 k tickets, much faster.
- **F10** — `glpi_list_users` `active_only` filter previously used `searchText`
  (LIKE on a label column), which silently mismatched. Now uses the search
  endpoint with `criteria=is_active equals 1`.
- **F12** — `glpi_assign_ticket` ignored `group_id`. It now routes to
  `Group_Ticket` when a group is provided, and `Ticket_User` for a user.
- `glpi_search_knowbase` no longer hard-codes `field=6` for the title; the
  field id is resolved via `listSearchOptions/KnowbaseItem`.

### Changed (breaking)

- **`GlpiClient` constructor**: same shape (`GlpiConfig`) but the internal
  fetch/session/error layer is now `GlpiHttp`. Public domain methods keep
  their v2 names; their behaviour is hardened (see Fixed).
- **`glpi_list_*` tools**: now accept `start`, `range`, `sort`, `order`,
  `expand_dropdowns`. The previous `limit`-only form still works.
- **`glpi_search`**: marked deprecated. Prefer `glpi_search_v2`.
- **Build target**: `strict` TypeScript already, with `tsx` instead of
  `jest`/`ts-node` for test execution.

### Removed

- `eslint` was referenced in `package.json` scripts but never installed; the
  unused script is removed to avoid confusion. Linting can be reintroduced
  alongside tests if needed.
