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
bun run build          # Compile TypeScript → dist/

# Dev mode (bun, no compilation step)
bun run dev

# Lint
bun run lint           # Check lint rules
bun run lint:fix       # Auto-fix lint issues

# Tests
bun test               # Run all tests via bun
bun test --watch       # Watch mode

# Smoke test (requires GLPI env vars)
bun run smoke

# Watch mode for compilation
bun run watch          # tsc --watch
```

## IDE / Editor Setup

- **VS Code** (recommended):
  - Built-in TypeScript support works out of the box.
  - Enable `tsc` as the build task for error checking.
  - Use the built-in test explorer for `bun test` runner.
  - Install ESLint extension for inline lint feedback.

## Productivity Tips

- Use `bun run dev` for rapid iteration — no build step needed.
- Run `bun run lint` before committing to catch formatting issues early.
- Store generated artefacts in `.context/` for deterministic reruns.
- When debugging HTTP interactions, set `GLPI_DEBUG=1` to log retries and re-auth to stderr.
- The MCP server uses `stdio` transport — all debugging output goes to stderr, leaving stdout clean for the protocol.
