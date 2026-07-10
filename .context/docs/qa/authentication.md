---
slug: authentication
category: features
generatedAt: 2026-07-09T23:58:35.846Z
relevantFiles:
  - src/http.ts
  - src/index.ts
  - .env.example
---

# Authentication

## OAuth2 (v3)

GLPI 11 uses OAuth2 for API authentication. Three grant types are supported:

### Password grant (`GLPI_AUTH_METHOD=password`)
- Requires `GLPI_USERNAME`, `GLPI_PASSWORD`, and `GLPI_CLIENT_ID`
- Token request includes `scope=api` (required by GLPI 11 to populate JWT scopes)

### Client credentials grant (`GLPI_AUTH_METHOD=client_credentials`)
- Requires `GLPI_CLIENT_ID` and optionally `GLPI_CLIENT_SECRET`
- Token request includes `scope=api`

### Bearer token (`GLPI_AUTH_METHOD=bearer`)
- Requires `GLPI_ACCESS_TOKEN` — a pre-obtained token used directly

## Key detail: `scope=api`

GLPI 11's OAuth2 token endpoint requires the `scope=api` parameter. Without it,
the JWT is issued with `"scopes":[]` and all API calls return 401
("The authorization header is missing or invalid") or 403 ("You do not have the
required scope(s)"). The OAuth2 client in GLPI must also have API scopes
configured (Setup → General → OAuth2 Client → edit client → Scopes field).

## HTTP layer (`src/http.ts`)

- `Content-Type: application/json` is only set on requests that carry a JSON
  body. GLPI 11 rejects GET requests with this header and no body (400
  "Invalid JSON Body").
- Automatic re-authentication on 401: the token is refreshed and the request
  retried once.
- Retry on 5xx / 429 with exponential backoff.
