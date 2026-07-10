## Testing Strategy

Quality is maintained through unit tests, integration-style tests (mocked fetch), and manual smoke testing. The focus is on correctness of the HTTP layer, search/count logic, and tool dispatch.

## Test Types

- **Unit/Integration**: Node's built-in test runner (`node:test` + `node:assert`), executed via `tsx`. Tests live in `test/` and use mocked `fetch` to simulate GLPI API responses.
  - `test/http.test.ts` — HTTP layer: session init, re-auth on 401, retry on 5xx, error parsing, timeout handling.
  - `test/search.test.ts` — Search engine: single page, fetch_all, count probes, criteria building, forcedisplay.
- **Smoke/Integration**: `scripts/smoke.ts` — manual smoke test that connects to a real GLPI instance. Requires `GLPI_*` env vars.

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (useful during TDD)
npm test -- --watch

# Run a single test file
npx tsx --test test/http.test.ts

# Smoke test against live GLPI
npm run smoke
```

## Quality Gates

- All tests must pass before merging (`npm test`).
- `npm run build && npm test` must pass before PR (mimics CI).
- No formal coverage threshold is enforced, but new features should include tests.
- Test files use `describe`/`it` blocks and `assert`/`assert.strictEqual` for assertions.

## Troubleshooting

- Tests use mocked `fetch` via `MockAgent` or manual `globalThis.fetch` override — no network required.
- Smoke tests require a live GLPI instance with valid credentials — skip if not available.
- Flaky tests are rare; if a test fails, check that the mock handler matches the expected request shape.
