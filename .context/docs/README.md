# Documentation Index

Welcome to the mcp-glpi knowledge base. Start with the project overview, then dive into specific guides as needed.

## Core Guides

- [Project Overview](./project-overview.md) — What mcp-glpi is and how it works
- [Development Workflow](./development-workflow.md) — Day-to-day engineering process
- [Testing Strategy](./testing-strategy.md) — Test framework, patterns, and quality gates
- [Tooling & Productivity Guide](./tooling.md) — Scripts, IDE setup, and automation

## Repository Snapshot

| Path | Description |
|---|---|
| `src/` | TypeScript source (5 files): MCP server, HTTP layer, search engine, field cache, domain client |
| `test/` | Test files (2): HTTP layer tests + search engine tests |
| `scripts/` | `smoke.ts` — manual integration smoke test |
| `dist/` | Compiled CommonJS output |
| `README.md` | Project README with tool catalogue and configuration docs |
| `AGENTS.md` | Agent collaboration conventions |

## Document Map

| Guide | File | Audience |
|---|---|---|
| Project Overview | `project-overview.md` | Mixed |
| Development Workflow | `development-workflow.md` | Developers |
| Testing Strategy | `testing-strategy.md` | Developers |
| Tooling & Productivity Guide | `tooling.md` | Developers |
