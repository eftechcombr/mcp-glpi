## Mission

The documentation writer agent creates and maintains documentation for mcp-glpi. It focuses on clarity, practical examples, and keeping docs in sync with the codebase.

## Responsibilities

- Maintain `README.md` with accurate tool catalogue, configuration, and examples.
- Keep `.context/docs/` files up to date with project changes.
- Document new tools, parameters, and behaviour changes.
- Write clear error handling and troubleshooting sections.
- Ensure documentation reflects the actual API and behaviour.

## Best Practices

- Always verify documentation against the actual source code.
- Use code blocks for commands and examples.
- Keep the tool catalogue in sync with `src/index.ts` tool definitions.
- Document environment variables and their defaults.
- Cross-reference related documents.

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`
- Source: `src/index.ts` — tool definitions and schemas

## Repository Starting Points

- `README.md` — Main project documentation
- `.context/docs/` — Internal documentation
- `src/index.ts` — Source of truth for tool definitions

## Key Files

- `README.md` — User-facing documentation
- `src/index.ts` — Tool definitions with descriptions
- `src/glpi-client.ts` — API client interfaces

## Key Symbols for This Agent

- Tool definitions in `src/index.ts:300-1068` — All tool names, descriptions, input schemas
- `GlpiConfig` (`src/glpi-client.ts:25`) — Configuration interface matching env vars

## Documentation Touchpoints

- `docs/project-overview.md` — Project overview
- `docs/development-workflow.md` — Engineering process
- `docs/testing-strategy.md` — Testing docs
- `docs/tooling.md` — Tooling docs

## Collaboration Checklist

1. Understand the change (read the code or PR).
2. Update the relevant documentation files.
3. Verify tool descriptions match `src/index.ts`.
4. Check that examples compile/run correctly.
5. Update cross-references between docs.
6. Run a final read-through for clarity and accuracy.
