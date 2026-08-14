import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { randomUUID } from 'node:crypto';
import { SessionManager } from './sessions.js';

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Serve the MCP server over Streamable HTTP (GET/POST/DELETE) using Bun's
 * Web-standard fetch handler.
 *
 * Multi-tenant: each client session gets its own GlpiClient via SessionManager,
 * keyed by the Mcp-Session-Id header. Session config is provided per client
 * through the glpi_configure_connection tool.
 *
 * Endpoint: {MCP_PATH} (default /mcp). Root and /health answer JSON liveness.
 */
export async function startHttpServer(server: Server, sessions: SessionManager): Promise<void> {
  const host = process.env.HOST ?? '0.0.0.0';
  const port = envInt('PORT') ?? envInt('MCP_PORT') ?? 3000;
  const mcpPath = process.env.MCP_PATH ?? '/mcp';
  const basePath = mcpPath.startsWith('/') ? mcpPath : `/${mcpPath}`;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.touch(sessionId);
    },
    onsessionclosed: (sessionId) => {
      void sessions.remove(sessionId);
    },
  });

  await server.connect(transport);

  const displayHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
  console.error(`mcp-glpi: Streamable HTTP server listening on http://${displayHost}:${port}${basePath}`);

  Bun.serve({
    hostname: host,
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      if (url.pathname !== basePath) {
        if (url.pathname === '/' || url.pathname === '/health') {
          return new Response(
            JSON.stringify({ ok: true, server: 'mcp-glpi', endpoint: basePath, status: 'running' }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        return new Response('Not Found', { status: 404 });
      }
      return transport.handleRequest(req);
    },
  });
}