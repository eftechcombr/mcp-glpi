---
slug: getting-started
category: getting-started
generatedAt: 2026-11-17T00:00:00.000Z
---

# How do I set up and run this project?

## Prerequisites

- **Bun** ≥ 1.0 (runtime, package manager, and test runner)
- A GLPI instance with OAuth2 configured (High-Level API `v3.0` for GLPI 12+,
  or `v2.x` for GLPI 11)

## Installation

```bash
# Clone the repository
git clone https://github.com/eftechcombr/mcp-glpi.git
cd mcp-glpi

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
```

## Running (development)

```bash
# Run the MCP server directly via Bun (no compilation step, stdio transport)
bun run dev
```

## Running (production)

```bash
# Build and start over stdio
bun run build
bun start
```

## Running as a hosted Streamable HTTP server

```bash
# Single-tenant: GLPI_URL + auth env vars are shared by every session
MCP_TRANSPORT=http PORT=3000 MCP_AUTH_TOKEN=change-me bun start

# Multi-tenant: leave GLPI_URL unset; clients call glpi_configure_connection
MCP_TRANSPORT=http PORT=3000 MCP_AUTH_TOKEN=change-me bun start
```

The MCP endpoint is `http://localhost:3000/mcp`; `GET /health` and `GET /`
return JSON liveness. Clients must send `Authorization: Bearer <MCP_AUTH_TOKEN>`
when the token is set. The server binds `127.0.0.1` by default and refuses to
start on a non-loopback `HOST` without a token unless
`MCP_ALLOW_UNAUTHENTICATED=true` is set. Other variables: `PORT` (`MCP_PORT`),
`MCP_PATH`, `MCP_MAX_SESSIONS`, `SESSION_TTL_MS`.

## Docker

```bash
docker compose up -d              # stdio-oriented local setup
docker compose --profile smoke run --rm mcp-glpi-smoke
```

See the [README](../../../README.md) for full Docker and hosting details.

## Testing

```bash
# Unit tests (mocked fetch, no GLPI required)
bun test

# Live smoke test (requires GLPI credentials in .env)
bun run smoke
```
