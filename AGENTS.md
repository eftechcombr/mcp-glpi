# AGENTS.md

## Dev environment tips
- Install dependencies with `bun install` before running scaffolds.
- Use `bun run dev` for the interactive TypeScript session that powers local experimentation.
- Run `bun run build` to refresh the CommonJS bundle in `dist/` before shipping changes.
- Store generated artefacts in `.context/` so reruns stay deterministic.

## Testing instructions
- Execute `bun test` to run the test suite.
- Append `--watch` while iterating on a failing spec.
- Trigger `bun run build && bun test` before opening a PR to mimic CI.
- Add or update tests alongside any generator or CLI changes.

## PR instructions
- Follow Conventional Commits (for example, `feat(scaffolding): add doc links`).
- Cross-link new scaffolds in `docs/README.md` and `agents/README.md` so future agents can find them.
- Attach sample CLI output or generated markdown when behaviour shifts.
- Confirm the built artefacts in `dist/` match the new source changes.

## Repository map
- `src/index.ts` — MCP server: tool catalogue, dispatch, resources, entry point.
- `src/http.ts` — unified HTTP layer (OAuth2, retries, timeouts, `GlpiError`).
- `src/search.ts` — RSQL search engine, pagination, `ITEMTYPE_PATH_MAP`.
- `src/search-options.ts` — cached `/listSearchOptions` field catalogue.
- `src/glpi-client.ts` — typed domain client for GLPI itemtypes.
- `src/sessions.ts` — per-session `GlpiClient` registry for HTTP mode.
- `src/http-server.ts` — Streamable HTTP transport (Bun `serve`).
- `test/` — `bun test` specs for HTTP, search, and session behaviour.
- `scripts/smoke.ts` — manual/live integration smoke test (`bun run smoke`).
- `dist/` — compiled CommonJS output; regenerate with `bun run build`.
- `.context/` — AI development scaffolding: docs, agent playbooks, skills.
- `README.md` — user-facing docs: configuration, tool catalogue, Docker.
- `CHANGELOG.md` — release history; add an entry for every user-visible change.
- `LICENSE` — MIT licence text; edit only when the licence actually changes.
- `package.json` — package metadata, scripts, dependencies, published files.
- `bun.lock` — Bun lockfile; regenerate with `bun install`, do not edit by hand.
- `Dockerfile` / `docker-compose.yml` — container image and local/compose setups.

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Development workflow: `.context/docs/development-workflow.md`
- Testing strategy: `.context/docs/testing-strategy.md`
