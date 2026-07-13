## Testing Strategy

Quality is maintained through unit tests, integration-style tests (mocked fetch), and manual smoke testing. The focus is on correctness of the HTTP layer, search/count logic, and tool dispatch.

## Test Types

- **Unit/Integration**: Bun's built-in test runner (`bun test`), files in `test/` using `describe`/`it`/`expect` or `node:assert`. Tests use mocked `fetch` to simulate GLPI API responses.
  - `test/http.test.ts` — HTTP layer: session init, re-auth on 401, retry on 5xx, error parsing, timeout handling, RSQL escaping.
  - `test/search.test.ts` — Search engine: single page, fetch_all, count probes, criteria building, forcedisplay, RSQL filter formatting.
- **Smoke/Integration**: `scripts/smoke.ts` — manual smoke test that connects to a real GLPI instance. Requires `GLPI_*` env vars.

## Running Tests

```bash
# Run all tests
bun test

# Watch mode (useful during TDD)
bun test --watch

# Run a single test file
bun test test/http.test.ts

# Smoke test against live GLPI
bun run smoke
```

## Quality Gates

- All tests must pass before merging (`bun test`).
- `bun run lint && bun run build && bun test` must pass before PR (mimics CI).
- No formal coverage threshold is enforced, but new features should include tests.
- Test files use `describe`/`it` blocks and `assert`/`assert.strictEqual` for assertions.

## Troubleshooting

- Tests use mocked `fetch` via manual `globalThis.fetch` override — no network required.
- Smoke tests require a live GLPI instance with valid credentials — skip if not available.
- Flaky tests are rare; if a test fails, check that the mock handler matches the expected request shape.
