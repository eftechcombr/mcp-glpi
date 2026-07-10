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
- `CHANGELOG.md/` — explain what lives here and when agents should edit it.
- `LICENSE/` — explain what lives here and when agents should edit it.
- `package-lock.json/` — explain what lives here and when agents should edit it.
- `package.json/` — explain what lives here and when agents should edit it.
- `README.md/` — explain what lives here and when agents should edit it.
- `scripts/` — explain what lives here and when agents should edit it.
- `src/` — explain what lives here and when agents should edit it.
- `test/` — explain what lives here and when agents should edit it.

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `CONTRIBUTING.md`
