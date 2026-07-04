# Changelog

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
