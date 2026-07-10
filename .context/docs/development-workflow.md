## Development Workflow

This project follows a trunk-based development model with short-lived feature branches. All changes ship through a standard process: code → lint → build → test → PR → merge.

## Branching & Releases

- **Main branch**: `main` — always releasable. Direct commits are discouraged.
- **Feature branches**: Named `feat/<description>` or `fix/<description>`. Branched from `main`, merged via PR.
- **Releases**: Published to npm on demand via `npm publish`. Tagged with semver (`v3.2.0`, etc.).
- **Changelog**: See [`CHANGELOG.md`](../../CHANGELOG.md) for release history.

## Local Development

```bash
# Install dependencies
bun install

# Run development server (bun, no compilation step)
npm run dev

# Lint
npm run lint
npm run lint:fix       # auto-fix

# Build for distribution (compiles to dist/)
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run smoke test (requires GLPI env vars)
npm run smoke
```

## Code Review Expectations

- All PRs require passing lint and tests before merge.
- Run `npm run build && npm test` before opening a PR to mimic CI.
- Follow Conventional Commits format: `feat(scope): message`, `fix(scope): message`, etc.
- Cross-link new scaffolds in `.context/docs/README.md` and `.context/agents/README.md`.
- Attach sample CLI output or generated markdown when behaviour shifts.
- Confirm built artefacts in `dist/` match source changes.

## Onboarding Tasks

1. Start by reading the [README](../../README.md) to understand the tool catalogue.
2. Review the [Project Overview](./project-overview.md) for architecture context.
3. Run the test suite to verify your environment: `npm test`.
4. Explore the codebase: `src/` for source, `test/` for tests, `scripts/smoke.ts` for integration checks.
