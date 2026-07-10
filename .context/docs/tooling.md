## Tooling & Productivity Guide

This document collects the tools, scripts, and configurations that keep contributors efficient.

## Required Tooling

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18.0.0 | Runtime |
| npm | ≥ 9 | Package management |
| TypeScript | 5.3+ | Language compiler |

## Recommended Automation

```bash
# Build
npm run build          # Compile TypeScript → dist/

# Dev mode (ts-node, no compilation step)
npm run dev

# Tests
npm test               # Run all tests
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
  - Use the built-in test explorer for `node:test` (tsx runner).

## Productivity Tips

- Use `npm run dev` for rapid iteration — no build step needed.
- Store generated artefacts in `.context/` for deterministic reruns.
- When debugging HTTP interactions, set `GLPI_DEBUG=1` to log retries and re-auth to stderr.
- The MCP server uses `stdio` transport — all debugging output goes to stderr, leaving stdout clean for the protocol.
