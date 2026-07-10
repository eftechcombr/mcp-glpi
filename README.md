# MCP Server for GLPI v3.2

A Model Context Protocol (MCP) server that exposes GLPI (IT Service
Management) to AI assistants like Claude, Cline, and other MCP-compatible
clients.

v3 is a foundations-and-coverage overhaul on top of v2. See
[CHANGELOG.md](./CHANGELOG.md) for the full list of changes; the rest of this
README documents what's exposed today.

## What's in v3

- **Solid foundations**: unified HTTP layer with auto re-authentication on 401,
  structured errors, retry on 5xx/429, configurable timeouts.
- **OAuth2 auth**: password grant, client_credentials, or bearer token (v2
  app_token/user_token auth is **not** supported in v3).
- **Real search**: multi-criteria RSQL filter with `AND` / `OR` / `AND NOT` /
  `OR NOT`, `forcedisplay`, pagination, `fetch_all`, dedicated count probe.
- **Dynamic field mapping**: `/listSearchOptions/{itemtype}` is cached (1-hour
  TTL) so `field_id` ↔ name translations stay valid across GLPI versions.
- **High-level reporting**: `glpi_search_tickets` accepts friendly params,
  `glpi_tickets_stats_by` ventilates counts by status / category / technician /
  entity / month.
- **Full ITIL coverage**: timeline (followups + tasks + solutions +
  validations), validations request/approve, ticket linking, document
  attachment, satisfaction, overdue (SLA) tickets.
- **Resolved foreign keys by default**: detail views return `users_id_tech: 42`
  *and* the resolved name, so the LLM doesn't have to guess.
- **MCP tool safety annotations**: `readOnlyHint` on list/get/search/count/stats
  tools, `destructiveHint` on delete/update/set/assign tools — agents get
  explicit signals before acting.
- **Runtime input validation** (zod) on ticket tools — clear `InvalidParams`
  errors instead of downstream GLPI failures.
- **84 MCP tools**: covering tickets, problems, changes, assets (computers,
  software, network equipment, printers, monitors, phones), knowledge base,
  contracts, suppliers, locations, projects, users, groups, categories,
  entities, documents, search, and statistics.

## Configuration

### Auth method

v3 uses GLPI's OAuth2 API. You need an OAuth2 client configured in GLPI
(Setup → General → OAuth2 Client) with the appropriate grant type enabled.

| Env var | Required | Default | Description |
|---|---|---|---|---|
| `GLPI_URL` | yes | — | Base URL of the GLPI instance (no trailing slash) |
| `GLPI_AUTH_METHOD` | no | `password` | `password`, `client_credentials`, or `bearer` |
| `GLPI_USERNAME` | yes* | — | Login (password grant) |
| `GLPI_PASSWORD` | yes* | — | Password (password grant) |
| `GLPI_CLIENT_ID` | yes* | — | OAuth2 client id (password / client_credentials grant) |
| `GLPI_CLIENT_SECRET` | no | — | OAuth2 client secret (password / client_credentials grant) |
| `GLPI_ACCESS_TOKEN` | yes* | — | Pre-obtained bearer token (bearer auth) |
| `GLPI_TIMEOUT_MS` | no | `15000` | HTTP request timeout in ms |
| `GLPI_MAX_RETRIES` | no | `2` | Max retries on 5xx / 429 / network errors |
| `GLPI_DEBUG` | no | — | Set to any value to log HTTP retries/re-auth to stderr |
| `GLPI_ENTITY_ID` | no | — | Default entity context header |
| `GLPI_PROFILE_ID` | no | — | Default profile context header |
| `GLPI_ENTITY_RECURSIVE` | no | `false` | Entity recursion flag (`true`/`false`) |

\* depends on `GLPI_AUTH_METHOD` — see `.env.example` for details.

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "glpi": {
      "command": "bunx",
      "args": ["mcp-glpi"],
      "env": {
        "GLPI_URL": "https://glpi.example.com",
        "GLPI_AUTH_METHOD": "password",
        "GLPI_USERNAME": "your_username",
        "GLPI_PASSWORD": "your_password",
        "GLPI_CLIENT_ID": "your_client_id"
      }
    }
  }
}
```

## Tool catalogue

### Tickets — read

| Tool | Description |
|---|---|
| `glpi_list_tickets` | List with `start`/`limit`/`range`/`sort`/`order`/`status` |
| `glpi_get_ticket` | Detail + status/urgency labels + counts of linked items |
| `glpi_get_ticket_timeline` | Followups + tasks + solutions + validations, chronological |
| `glpi_search_tickets` | High-level search (status, assigned, requester, dates, ...) |
| `glpi_get_ticket_followups` | Followups of a ticket |
| `glpi_get_ticket_tasks` | Tasks |
| `glpi_get_ticket_solutions` | Solutions |
| `glpi_get_ticket_validations` | Validations (approvals) |
| `glpi_get_ticket_documents` | Linked documents |
| `glpi_get_ticket_satisfaction` | Satisfaction survey result |
| `glpi_list_overdue_tickets` | Tickets whose SLA deadline has passed |

### Tickets — write

| Tool | Description |
|---|---|
| `glpi_create_ticket` | Create a ticket |
| `glpi_update_ticket` | Update fields |
| `glpi_delete_ticket` | ⚠️ Delete (force=true purges) |
| `glpi_add_followup` | Add a followup |
| `glpi_add_task` | Add a task with time tracking |
| `glpi_add_solution` | Add a solution |
| `glpi_assign_ticket` | Assign to user OR group |
| `glpi_link_tickets` | link / duplicate / parent |
| `glpi_add_ticket_validation` | Request a validation |
| `glpi_set_validation_status` | Approve (2) or refuse (3) |
| `glpi_attach_document_to_ticket` | Link an uploaded document to a ticket |

### Problems & Changes

| Tool | Description |
|---|---|
| `glpi_list_problems` / `glpi_get_problem` / `glpi_create_problem` / `glpi_update_problem` | Problem management |
| `glpi_list_changes` / `glpi_get_change` / `glpi_create_change` / `glpi_update_change` | Change management |

### Assets

| Tool family | Notes |
|---|---|
| Computer, Software, NetworkEquipment, Printer, Monitor, Phone | `list_*`, `get_*` (with `with_softwares`/`with_networkports`/`with_connections`/`with_documents`), plus `create`/`update`/`delete` symmetry |

### Knowledge base, contracts, suppliers, locations, projects, documents

`glpi_list_*`, `glpi_get_*`, and `glpi_create_*` where the GLPI API allows it.
`glpi_search_knowbase` performs a free-text search on the title (field id
resolved dynamically — no longer hard-coded). Projects also support
`glpi_update_project`.

### Users, groups, categories, entities

`glpi_list_users` filters active users via the search endpoint (not
`searchText`); `glpi_search_user` searches by login name; `glpi_create_user`/
`glpi_create_group`/`glpi_add_user_to_group` cover provisioning.

### Statistics

| Tool | Description |
|---|---|
| `glpi_get_ticket_stats` | Counts by status (optional entity / date filters) |
| `glpi_get_asset_stats` | Total counts per asset type |
| `glpi_tickets_stats_by` | Ventilation by `status` / `category` / `technician` / `entity` / `month`, optional period |

### Generic / introspection

| Tool | Description |
|---|---|
| `glpi_search_v2` | Multi-criteria search (`criteria[]`, `forcedisplay`, `fetch_all`, ...) |
| `glpi_count` | Cheap totalcount probe with criteria |
| `glpi_list_search_options` | Catalogue of searchable fields for an itemtype |
| `glpi_get_session_info` | Active profile + available profiles + entities |
| `glpi_search` | **Deprecated**: single-criterion alias kept for backward compat |

### Resources

`glpi://tickets/open`, `glpi://tickets/recent`, `glpi://problems/open`,
`glpi://changes/pending`, `glpi://computers`, `glpi://groups`,
`glpi://categories`, `glpi://stats/tickets`, `glpi://stats/assets`.

## Reference

### Ticket status

| ID | Label |
|---|---|
| 1 | New |
| 2 | Processing (assigned) |
| 3 | Processing (planned) |
| 4 | Pending |
| 5 | Solved |
| 6 | Closed |

### Validation status

| ID | Label |
|---|---|
| 1 | Waiting |
| 2 | Granted |
| 3 | Refused |

### Urgency / impact / priority

| ID | Label |
|---|---|
| 1 | Very low |
| 2 | Low |
| 3 | Medium |
| 4 | High |
| 5 | Very high |

### Problem status

| ID | Label |
|---|---|
| 1 | New |
| 2 | Accepted |
| 3 | Planned |
| 4 | Pending |
| 5 | Solved |
| 6 | Closed |

### Change status

| ID | Label |
|---|---|
| 1 | New |
| 2 | Evaluation |
| 3 | Approval |
| 4 | Accepted |
| 5 | Pending |
| 6 | Test |
| 7 | Qualification |
| 8 | Applied |
| 9 | Review |
| 10 | Closed |
| 11 | Refused |
| 12 | Canceled |

### Ticket type

| ID | Label |
|---|---|
| 1 | Incident |
| 2 | Request |

### Task state (for `glpi_add_task`)

| ID | Label |
|---|---|
| 0 | Info |
| 1 | Todo |
| 2 | Done |

### Ticket assignment type (for `glpi_assign_ticket`)

| ID | Label |
|---|---|
| 1 | Requester |
| 2 | Assigned (technician) |
| 3 | Observer |

## Development

```bash
git clone https://github.com/eftechcombr/mcp-glpi.git
cd mcp-glpi
bun install
bun run build       # compile TypeScript → dist/
bun test            # unit tests (Bun test runner)
bun run smoke       # live integration test against a real GLPI instance
bun run smoke --write  # smoke test + write cycle (create → followup → delete)
```

Run locally (development, runs TypeScript directly):

```bash
cp .env.example .env   # fill in your GLPI credentials
bun run dev             # runs src/index.ts directly via Bun
```

Run locally (production, uses compiled dist/):

```bash
cp .env.example .env   # fill in your GLPI credentials
bun run build && bun start
```

The smoke test reads credentials from env or `.env` (gitignored). Validated
against GLPI 11 (French locale).

## Docker

The Docker image packages the MCP server with all dependencies, so you can run
it anywhere Docker is installed — no Bun or npm required on the host.

### Prerequisites

- Docker Engine 20+ or Docker Desktop
- A GLPI instance and OAuth2 credentials (see [Configuration](#configuration))

### Quick start with Docker Compose

```bash
# 1. Copy and fill in your GLPI credentials
cp .env.example .env

# 2. Build the image
docker compose build

# 3. Start the server (detached)
docker compose up -d
```

### Quick start with Docker directly

```bash
# 1. Build the image
docker build -t mcp-glpi .

# 2. Run the container with your .env file
docker run -d --name mcp-glpi \
  --restart unless-stopped \
  --env-file .env \
  mcp-glpi
```

The container runs as a non-root user (`bunuser:1001`) and reads all
configuration from environment variables (see [Configuration](#configuration)
above).

### Understanding MCP transport and Docker

This server uses **MCP stdio transport** — it reads JSON-RPC messages from
stdin and writes responses to stdout. When running in Docker for direct testing
(without an MCP client), the `-d` (detached) flag is fine because no one is
writing to stdin.

However, when an MCP client like **Claude Desktop** or **VS Code** launches the
server, **the client itself manages the container as a subprocess**. The client
runs `docker run -i --rm ...` and communicates via stdin/stdout. The `-i`
(interactive) flag keeps stdin open for the MCP protocol. The `-t` (TTY) flag
**must not** be used as it can corrupt the binary protocol stream.

### Configuring MCP clients to use the Docker server

#### Claude Desktop / Claude Code

Add the following entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "glpi": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--name", "mcp-glpi",
        "-e", "GLPI_URL=https://glpi.example.com",
        "-e", "GLPI_AUTH_METHOD=password",
        "-e", "GLPI_USERNAME=your_username",
        "-e", "GLPI_PASSWORD=your_password",
        "-e", "GLPI_CLIENT_ID=your_client_id",
        "mcp-glpi"
      ]
    }
  }
}
```

**Key points about the configuration:**

| Flag / Setting | Reason |
|---|---|
| `-i` | Keeps stdin open — **required** for MCP stdio transport |
| `--rm` | Removes the container after Claude Desktop stops |
| `--name` | Optional; lets you reference the container in logs |
| No `-t` | Never combine with `-t` (TTY) — it corrupts the protocol |

#### Using `--env-file` instead of inline `-e`

For many environment variables, use a file-based approach for clarity:

```json
{
  "mcpServers": {
    "glpi": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--env-file", "/absolute/path/to/.env",
        "mcp-glpi"
      ]
    }
  }
}
```

> ⚠️ **Note:** `--env-file` requires the **absolute path** to your `.env` file.
> Relative paths are resolved relative to the Docker daemon, not the config file.

#### VS Code (Cline / Continue extensions)

Extensions that support MCP servers accept the same `command`/`args` pattern.
Configure the Docker container as the server process:

```json
{
  "mcpServers": {
    "glpi": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GLPI_URL=https://glpi.example.com",
        "-e", "GLPI_AUTH_METHOD=password",
        "-e", "GLPI_USERNAME=your_username",
        "-e", "GLPI_PASSWORD=your_password",
        "-e", "GLPI_CLIENT_ID=your_client_id",
        "mcp-glpi"
      ]
    }
  }
}
```

### Environment variables

All configuration is passed via environment variables — no config files are
needed inside the container. See the [Configuration](#configuration) section
above for the complete list of supported variables, their defaults, and which
ones are required for each auth method.

### Using a remote / pre-built image

You can pull a pre-built image from a registry instead of building locally:

```bash
# Pull from GitHub Container Registry (example)
docker pull ghcr.io/eftechcombr/mcp-glpi:latest

# Run with your environment
docker run -i --rm \
  -e GLPI_URL="https://glpi.example.com" \
  -e GLPI_AUTH_METHOD="password" \
  -e GLPI_USERNAME="your_username" \
  -e GLPI_PASSWORD="your_password" \
  -e GLPI_CLIENT_ID="your_client_id" \
  ghcr.io/eftechcombr/mcp-glpi:latest
```

### Volume mounts

The server stores no persistent data on disk — all state is held in the GLPI
API session. Volume mounts are not required for normal operation, but you can
mount them for debugging or custom certificate authorities:

```bash
# Mount a custom CA bundle for the GLPI API
docker run -i --rm \
  -v /host/path/ca-bundle.crt:/etc/ssl/certs/ca-certificates.crt:ro \
  -e GLPI_URL="https://glpi.example.com" \
  -e GLPI_AUTH_METHOD="password" \
  -e GLPI_USERNAME="your_username" \
  -e GLPI_PASSWORD="your_password" \
  -e GLPI_CLIENT_ID="your_client_id" \
  mcp-glpi
```

### Viewing logs

```bash
# Follow logs from a named container
docker logs -f mcp-glpi

# With Docker Compose
docker compose logs -f
```

### Smoke testing the Docker image

The `docker-compose.yml` includes a smoke-test service that runs the
integration tests against a real GLPI instance:

```bash
# Build and run the smoke test
docker compose --profile smoke run --rm mcp-glpi-smoke
```

This uses the `builder` stage image (includes dev dependencies and source) and
executes `bun run smoke --write`.

### Image details

| Aspect | Detail |
|---|---|---|
| Base image | `oven/bun:1-alpine` |
| Final user | `bunuser:1001` (non-root) |
| Build stages | 2 (builder + runner) |
| Build optimizations | Layer caching, multi-stage, `bun install --frozen-lockfile` |
| .dockerignore | Included — excludes `node_modules/`, `.git/`, `.env`, `.context/`, etc. |

### .dockerignore

The project includes a [`.dockerignore`](./.dockerignore) file that excludes
unnecessary files from the Docker build context, resulting in faster builds
and smaller image sizes:

- `node_modules/` — rebuilt inside the container
- `dist/` — rebuilt inside the container
- `.env` — passed at runtime, never baked into the image
- `.git/` — not needed for production builds
- `.context/` — AI development scaffolding only
- `*.log`, `.DS_Store` — OS and tooling artifacts

### Troubleshooting

**Container exits immediately with "GLPI_URL environment variable is required"**
→ You forgot to pass environment variables. Use `--env-file .env` or individual
`-e` flags.

**Claude Desktop shows "No tools found" or "Server disconnected"**
→ The `-i` flag is missing from the Docker args. MCP stdio transport requires
stdin to be open. Ensure your config uses `-i` and does **not** use `-t`.

**Connection refused to GLPI**
→ The container can reach your GLPI instance? If GLPI runs on `localhost`,
use `host.docker.internal` (macOS/Windows) or `--network host` (Linux) instead
of `localhost` in `GLPI_URL`.

**Slow first response**
→ The server lazily initializes the GLPI session on the first tool call. This
is expected — subsequent calls reuse the session.

## License

MIT

## Links

- [GLPI Project](https://glpi-project.org/)
- [GLPI High-Level API](https://glpi-user-documentation.readthedocs.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [NPM Package](https://www.npmjs.com/package/mcp-glpi)
