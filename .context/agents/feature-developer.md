## Mission

The feature developer agent implements new features in mcp-glpi according to specifications. It focuses on clean architecture, integration with existing code patterns, and comprehensive testing.

## Responsibilities

- Implement new GLPI tool endpoints (ticket operations, asset types, statistics).
- Add new MCP resources (`glpi://` URIs).
- Extend search capabilities with new criteria or item types.
- Add validation schemas and input parsing for new tools.
- Implement proper tool annotations (readOnlyHint, destructiveHint).

## Best Practices

- Follow existing patterns: look at similar tools in `src/index.ts` for style.
- Use Zod schemas for input validation — match the existing schema style.
- Add `expand_dropdowns: true` as default for user-facing read tools.
- Use `SearchOptionsCache.resolveField()` instead of hardcoding field IDs.
- Add tool annotations via the `toolAnnotations()` helper.
- Write tests for new functionality.
- Update the README tool catalogue.

## Key Project Resources

- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `AGENTS.md`

## Repository Starting Points

- `src/index.ts` — Add tool definitions and handler cases
- `src/glpi-client.ts` — Add domain methods
- `test/` — Add tests
- `README.md` — Update tool catalogue

## Key Files

- `src/index.ts` — Tool registration + dispatch switch
- `src/glpi-client.ts` — Generic CRUD + typed methods
- `src/http.ts` — HTTP request layer
- `src/search.ts` — Search engine
- `src/search-options.ts` — Field ID resolution

## Architecture Context

New features typically touch two layers:
1. `src/glpi-client.ts`: Add a typed method (or use generic `getItems`/`createItem`).
2. `src/index.ts`: Add tool definition (name, description, inputSchema) and a handler `case` in the dispatch switch.

## Key Symbols for This Agent

- `GlpiClient` (`src/glpi-client.ts:397`) — Add domain methods here
- `parseListArgs` (`src/index.ts:175`) — Standard list argument parsing
- `toolAnnotations` (`src/index.ts:282`) — Safety annotation helper
- `ListOptions` (`src/glpi-client.ts:358`) — List request options
- `GetOptions` (`src/glpi-client.ts:378`) — Get request options

## Documentation Touchpoints

- `docs/testing-strategy.md` — How to write tests
- `docs/development-workflow.md` — PR process
- `docs/project-overview.md` — Architecture understanding

## Collaboration Checklist

1. Read the specification and existing similar implementations.
2. Implement the domain method in `src/glpi-client.ts`.
3. Add the tool definition in `src/index.ts`.
4. Implement the handler `case` in the dispatch switch.
5. Add tests in `test/`.
6. Run `npm test` to verify.
7. Run `npm run build` to verify compilation.
8. Update `README.md` tool catalogue.
