import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { SessionManager } from './sessions.js';

export type ServerFactory = () => Server;

interface SessionTransport {
  transport: WebStandardStreamableHTTPServerTransport;
  server: Server;
  lastUsedAt: number;
}

const DEFAULT_MAX_SESSIONS = 100;

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}

function isAuthorized(req: Request, expectedToken: string): boolean {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function jsonRpcError(status: number, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Serve the MCP server over Streamable HTTP (GET/POST/DELETE) using Bun's
 * Web-standard fetch handler.
 *
 * Security defaults:
 *   - Binds to 127.0.0.1 unless HOST is set explicitly.
 *   - Requires `Authorization: Bearer $MCP_AUTH_TOKEN` when MCP_AUTH_TOKEN is
 *     set, and refuses to bind a non-loopback interface without it unless
 *     MCP_ALLOW_UNAUTHENTICATED=true is set.
 *   - Caps concurrent sessions (MCP_MAX_SESSIONS, default 100).
 *
 * Each client session gets its own Server + transport pair (keyed by the
 * Mcp-Session-Id header), so multiple clients can initialize concurrently and a
 * session teardown does not affect the others. Multi-tenant GLPI credentials
 * are held per session by SessionManager.
 *
 * Endpoint: {MCP_PATH} (default /mcp). Root and /health answer JSON liveness.
 */
export async function startHttpServer(
  createServer: ServerFactory,
  sessions: SessionManager
): Promise<void> {
  const host = process.env.HOST ?? '127.0.0.1';
  const authToken = process.env.MCP_AUTH_TOKEN?.trim() || undefined;
  const allowUnauthenticated = /^(1|true|yes)$/i.test(
    process.env.MCP_ALLOW_UNAUTHENTICATED ?? ''
  );
  const port = envInt('PORT') ?? envInt('MCP_PORT') ?? 3000;
  const mcpPath = process.env.MCP_PATH ?? '/mcp';
  const basePath = mcpPath.startsWith('/') ? mcpPath : `/${mcpPath}`;
  const maxSessions = envInt('MCP_MAX_SESSIONS') ?? DEFAULT_MAX_SESSIONS;

  if (!authToken && !isLoopbackHost(host) && !allowUnauthenticated) {
    throw new Error(
      `Refusing to expose an unauthenticated MCP endpoint on ${host}. ` +
        'Set MCP_AUTH_TOKEN, bind HOST=127.0.0.1, or explicitly set ' +
        'MCP_ALLOW_UNAUTHENTICATED=true to override.'
    );
  }
  if (!authToken && !isLoopbackHost(host)) {
    console.error(
      `WARNING: MCP endpoint on ${host}:${port}${basePath} is unauthenticated ` +
        '(MCP_ALLOW_UNAUTHENTICATED=true). Anyone who can reach it can use the configured GLPI credentials.'
    );
  }

  const sessionsById = new Map<string, SessionTransport>();

  function disposeSession(sessionId: string): void {
    const entry = sessionsById.get(sessionId);
    if (!entry) return;
    sessionsById.delete(sessionId);
    void sessions.remove(sessionId);
    void entry.server.close().catch(() => {
      // The server may already be closed; teardown is best-effort.
    });
  }

  async function openSession(): Promise<WebStandardStreamableHTTPServerTransport> {
    const server = createServer();
    const transport: WebStandardStreamableHTTPServerTransport =
      new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          sessions.touch(sessionId);
          sessionsById.set(sessionId, { transport, server, lastUsedAt: Date.now() });
        },
        onsessionclosed: (sessionId) => {
          disposeSession(sessionId);
        },
      });
    await server.connect(transport);
    return transport;
  }

  // Reap transports for sessions whose GLPI client has gone idle.
  const sweepTimer = setInterval(
    () => {
      const now = Date.now();
      for (const [id, entry] of sessionsById) {
        if (now - entry.lastUsedAt > sessions.ttl) disposeSession(id);
      }
    },
    Math.max(Math.floor(sessions.ttl / 2), 60_000)
  );
  sweepTimer.unref?.();

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
      if (authToken && !isAuthorized(req, authToken)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: {
            'content-type': 'application/json',
            'www-authenticate': 'Bearer realm="mcp-glpi"',
          },
        });
      }

      const sessionId = req.headers.get('mcp-session-id') ?? undefined;
      if (sessionId) {
        const entry = sessionsById.get(sessionId);
        if (!entry) return jsonRpcError(404, -32000, 'Session not found');
        entry.lastUsedAt = Date.now();
        return entry.transport.handleRequest(req);
      }

      // No session header: only a POST (initialize) may open a new session.
      if (req.method !== 'POST') {
        return jsonRpcError(400, -32000, 'Mcp-Session-Id header is required');
      }
      if (sessionsById.size >= maxSessions) {
        return jsonRpcError(503, -32000, 'Too many active sessions; retry later');
      }
      const transport = await openSession();
      return transport.handleRequest(req);
    },
  });
}
