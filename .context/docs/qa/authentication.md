---
slug: authentication
category: features
generatedAt: 2026-11-17T00:00:00.000Z
relevantFiles:
  - src/http.ts
  - src/index.ts
  - .env.example
---

# Authentication

## OAuth2 (High-Level API v2+/v3.0)

The GLPI High-Level API uses OAuth2. The server defaults to `v3.0` paths
(GLPI 12+) and can target `v2.x` (e.g. `v2.3` on GLPI 11) with
`GLPI_API_VERSION`. Three auth strategies are supported:

### Password grant (`GLPI_AUTH_METHOD=password`)
- Requires `GLPI_USERNAME`, `GLPI_PASSWORD`, and `GLPI_CLIENT_ID`
- Token request includes `scope=api` (required by GLPI 11 to populate JWT scopes)

### Client credentials grant (`GLPI_AUTH_METHOD=client_credentials`)
- Requires `GLPI_CLIENT_ID` and optionally `GLPI_CLIENT_SECRET`
- Token request includes `scope=api`

### Bearer token (`GLPI_AUTH_METHOD=bearer`)
- Requires `GLPI_ACCESS_TOKEN` — a pre-obtained token used directly

## HTTP transport authentication (`src/http-server.ts`)

The Streamable HTTP transport is the only network-exposed surface, so it is
gated separately from GLPI auth:

- `MCP_AUTH_TOKEN` — when set, every request to `MCP_PATH` must send
  `Authorization: Bearer <token>`; the comparison is constant-time. `GET /` and
  `GET /health` stay unauthenticated and expose no secrets.
- `HOST` defaults to `127.0.0.1`. Binding a non-loopback address without
  `MCP_AUTH_TOKEN` is refused at startup unless
  `MCP_ALLOW_UNAUTHENTICATED=true` (which logs a warning).
- Each session gets its own `Server` + transport pair; `MCP_MAX_SESSIONS`
  (default 100) caps concurrent sessions and idle transports are reaped with
  the session TTL.
- Terminate TLS at a reverse proxy and forward the `Authorization` header
  unchanged.

## GLPI URL validation (`src/http.ts`)

`normalizeGlpiUrl()` accepts only `http:`/`https:` base URLs and rejects
embedded credentials, query strings, and fragments. `assertSafeApiPath()` runs
in `GlpiHttp.request` and rejects empty, absolute, `.`, and `..` path segments
as well as `?`, `#`, and backslashes. Tool ids are validated as positive
integers before being interpolated into a path.

## Key detail: `scope=api`

The GLPI OAuth2 token endpoint requires the `scope=api` parameter. Without it,
the JWT is issued with `"scopes":[]` and all API calls return 401
("The authorization header is missing or invalid") or 403 ("You do not have the
required scope(s)"). The OAuth2 client in GLPI must also have API scopes
configured (Setup → General → OAuth2 Client → edit client → Scopes field).

## HTTP layer (`src/http.ts`)

- `Content-Type: application/json` is only set on requests that carry a JSON
  body. GLPI 11 rejects GET requests with this header and no body (400
  "Invalid JSON Body").
- Automatic re-authentication on 401: the token is refreshed and the request
  retried once. Concurrent refreshes are mutex-guarded.
- Retry on 5xx / 429 with exponential backoff.
- Optional `GLPI_ENTITY_ID` / `GLPI_PROFILE_ID` / `GLPI_ENTITY_RECURSIVE`
  become the `GLPI-Entity`, `GLPI-Profile`, and `GLPI-Entity-Recursive`
  headers on every request.

## Session lifecycle

- `glpi_connection_status` reports the configured auth method and URL without
  ever returning credentials.
- `glpi_configure_connection` (multi-tenant HTTP mode) performs a live
  `initSession()` probe before accepting a session's configuration.
- `killSession()` clears the in-memory bearer token only; the High-Level API
  exposes no logout endpoint, so expiry/revocation stay server-side.
