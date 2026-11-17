---
slug: testing
category: testing
generatedAt: 2026-11-17T00:00:00.000Z
relevantFiles:
  - test/http.test.ts
  - test/search.test.ts
  - test/sessions.test.ts
  - package.json
---

# How do I run and write tests?

## Running Tests

```bash
bun test                    # full suite
bun test --watch            # watch mode
bun test test/http.test.ts  # single file
```

## Test Files

| File | Covers |
|---|---|
| `test/http.test.ts` | OAuth2 token acquisition, 401 re-auth, 5xx/429/network retries, `Retry-After`, timeouts, `GlpiError` parsing, API-version normalization, `killSession()` teardown |
| `test/search.test.ts` | `start`/`limit` pagination, count probes via `Content-Range`, localized field resolution, path mapping for `SoftwareLicense` / `Project` |
| `test/sessions.test.ts` | Per-session client isolation, default-client fallback, status reporting, idle eviction, full teardown |

## Conventions

- Tests use Bun's built-in runner (`test`/`describe`/`expect`).
- Network access is mocked by replacing `globalThis.fetch`; no GLPI instance
  is required for the unit suite.
- Keep request-shape assertions aligned with `ITEMTYPE_PATH_MAP` and the
  `GLPI_API_VERSION` default (`3.0`).

## Live Smoke Test

`scripts/smoke.ts` talks to a real GLPI instance using `GLPI_*` credentials
from the environment or `.env`:

```bash
bun run smoke          # read-only checks
bun run smoke --write  # create → followup → delete cycle
```

There is no coverage threshold, but every new tool or behaviour change should
ship with tests in the matching file.
