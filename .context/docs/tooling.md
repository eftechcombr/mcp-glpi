## Tooling & Productivity Guide

This document collects the tools, scripts, and configurations that keep contributors efficient.

## Required Tooling

| Tool | Version | Purpose |
|---|---|---|
| Bun | ≥ 1.0.0 | Runtime, package manager, test runner |
| TypeScript | 5.3+ | Language compiler |
| ESLint | 10.6+ | Linting and code quality |

## Recommended Automation

```bash
# Build
npm run build          # Compile TypeScript → dist/

# Dev mode (bun, no compilation step)
npm run dev

# Lint
npm run lint           # Check lint rules
npm run lint:fix       # Auto-fix lint issues

# Tests
npm test               # Run all tests via bun
npm test -- --watch    # Watch mode

# Smoke test (requires GLPI env vars)
npm run smoke

# Watch mode for compilation
npm run watch          # tsc --watch
```

## IDE / Editor Setup

- **VS Code** (recommended):
  - Built-in TypeScript support works out of the box.
  - Enable `tsc` as the build task for error checking.
  - Use the built-in test explorer for `bun test` runner.
  - Install ESLint extension for inline lint feedback.

## Productivity Tips

- Use `npm run dev` for rapid iteration — no build step needed.
- Run `npm run lint` before committing to catch formatting issues early.
- Store generated artefacts in `.context/` for deterministic reruns.
- When debugging HTTP interactions, set `GLPI_DEBUG=1` to log retries and re-auth to stderr.
- The MCP server uses `stdio` transport — all debugging output goes to stderr, leaving stdout clean for the protocol.
