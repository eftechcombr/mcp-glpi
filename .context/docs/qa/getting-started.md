---
slug: getting-started
category: getting-started
generatedAt: 2026-07-09T23:58:35.844Z
---

# How do I set up and run this project?

## Getting Started

### Prerequisites

- **Bun** ≥ 1.0 (runtime, package manager, and test runner)
- A GLPI instance with OAuth2 configured

### Installation

```bash
# Clone the repository
git clone https://github.com/eftechcombr/mcp-glpi.git
cd mcp-glpi

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
```

### Running (development)

```bash
# Run the MCP server directly via Bun (no compilation step)
bun run dev
```

### Running (production)

```bash
# Build and start
bun run build
bun start
```

### Testing

```bash
# Run unit tests
bun test

# Run live smoke test (requires GLPI credentials in .env)
bun run smoke
```