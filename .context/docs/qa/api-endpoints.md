---
slug: api-endpoints
category: features
generatedAt: 2026-11-17T00:00:00.000Z
relevantFiles:
  - src/search.ts
  - src/glpi-client.ts
  - src/http.ts
---

# API Endpoints

## Base URL

Resource requests go to
`<GLPI_URL>/api.php/v<GLPI_API_VERSION>/<path>` (default `3.0` for GLPI 12+;
set `GLPI_API_VERSION=2.3` or `2` for GLPI 11 / v2 compatibility). Token
requests go to `<GLPI_URL>/api.php/token`.

Versions are validated by `normalizeApiVersion()`: `3`, `3.0`, `v3.0`, `2`,
`2.3`, etc. are accepted; versions below `2` are rejected.

## Authentication

| Path | Method | Purpose |
|---|---|---|
| `/api.php/token` | POST | OAuth2 token (`password` or `client_credentials` grant, `scope=api`) |

With `GLPI_AUTH_METHOD=bearer`, `GLPI_ACCESS_TOKEN` is used directly and the
token endpoint is not called.

## Itemtype paths (`ITEMTYPE_PATH_MAP`)

| Itemtype | Path |
|---|---|
| Ticket | `Assistance/Ticket` |
| Problem | `Assistance/Problem` |
| Change | `Assistance/Change` |
| User | `Administration/User` |
| Group | `Administration/Group` |
| Entity | `Administration/Entity` |
| Computer | `Assets/Computer` |
| Monitor | `Assets/Monitor` |
| Printer | `Assets/Printer` |
| Phone | `Assets/Phone` |
| Peripheral | `Assets/Peripheral` |
| NetworkEquipment | `Assets/NetworkEquipment` |
| Software | `Assets/Software` |
| SoftwareLicense | `Management/License` |
| Certificate | `Assets/Certificate` |
| Appliance | `Assets/Appliance` |
| Contract | `Management/Contract` |
| Supplier | `Management/Supplier` |
| Document | `Management/Document` |
| Budget | `Management/Budget` |
| Contact | `Management/Contact` |
| KnowbaseItem | `Knowledgebase/Article` |
| ITILCategory | `Dropdowns/ITILCategory` |
| Location | `Dropdowns/Location` |
| Project | `Project` |
| ProjectTask | `Project/Task` |
| ITILFollowup | `ITILFollowup` |
| ITILSolution | `ITILSolution` |
| TicketTask | `TicketTask` |
| TicketValidation | `TicketValidation` |
| Document_Item | `Document_Item` |
| Ticket_Ticket | `Ticket_Ticket` |
| Group_User | `Group_User` |
| TicketSatisfaction | `TicketSatisfaction` |
| Ticket_User | `Ticket_User` |
| Group_Ticket | `Group_Ticket` |

`VALID_ITEMTYPES` is the validated set derived from this map; unknown itemtypes
are rejected with a list of allowed values.

## Search (RSQL)

GLPI High-Level API search uses **RSQL** in the `filter` query parameter:

| Search type | RSQL |
|---|---|
| `equals` | `prop==value` |
| `notequals` | `prop!=value` |
| `lessthan` | `prop=lt=value` |
| `morethan` | `prop=gt=value` |
| `contains` | `prop==*value*` |
| `notcontains` | `prop!=*value*` |
| `under` | `prop==value` |
| `notunder` | `prop!=value` |
| `empty` | `prop==''` |
| `notempty` | `prop!=''` |

Criteria are linked with `;` (AND) and `,` (OR). `AND NOT` / `OR NOT` are
emitted as `;not(...)` / `,not(...)`. Values containing RSQL metacharacters
are single-quoted, with `'` escaped.

Field references may be numeric ids (resolved through `SearchOptionsCache`),
friendly names, or raw column names. When a catalogue is unavailable, raw
names are used as-is.

## Field catalogue

`GET listSearchOptions/{itemtype}` feeds `SearchOptionsCache` (1-hour TTL). A
failed lookup marks that itemtype unavailable for the life of the process
until `invalidate()` is called.

## Pagination

List endpoints use `start` and `limit` query parameters (default page size
100). The `Content-Range` response header provides the total count, which
`GlpiSearch.count()` and `fetch_all` rely on. `fetch_all` stops at `maxRows`
(default 1000). Hard caps prevent oversized requests: page size is clamped to
`1..1000` and `fetch_all` to `1..5000` rows per call. Classic-REST list tools
validate `range` as `START-END` and cap the span at 1000 rows.
