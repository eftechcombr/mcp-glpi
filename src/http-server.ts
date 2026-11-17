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

/** Strip the port (and IPv6 brackets) from a Host header or URL host. */
function hostnameOf(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.startsWith('[')) {
    const end = v.indexOf(']');
    return end === -1 ? v : v.slice(1, end);
  }
  const colon = v.lastIndexOf(':');
  return colon === -1 ? v : v.slice(0, colon);
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function jsonRpcError(status: number, code: number, message: string): Response {
  return jsonResponse(status, { jsonrpc: '2.0', error: { code, message }, id: null });
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
  const rateLimitPerMinute = envInt('MCP_RATE_LIMIT_PER_MINUTE') ?? 120;

  // Host/Origin allowlist. DNS-rebinding protection matters most for loopback
  // binds, where a malicious web page can target 127.0.0.1 through its own
  // domain name. Extra names (for reverse proxies) go in MCP_ALLOWED_HOSTS.
  const allowedHosts = new Set(
    (process.env.MCP_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
  const enforceHostCheck = isLoopbackHost(host) || allowedHosts.size > 0;
  const bindHostname = hostnameOf(host);
  const loopbackNames = new Set(['localhost', '127.0.0.1', '::1']);

  function isAllowedHost(hostHeader: string | null): boolean {
    if (!hostHeader) return false;
    const full = hostHeader.trim().toLowerCase();
    if (allowedHosts.has(full)) return true;
    const hostname = hostnameOf(full);
    return (
      allowedHosts.has(hostname) ||
      loopbackNames.has(hostname) ||
      hostname === bindHostname
    );
  }

  function isAllowedOrigin(origin: string | null, hostHeader: string | null): boolean {
    if (!origin) return true;
    if (origin === 'null') return false;
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      return false;
    }
    const originHost = parsed.host.toLowerCase();
    if (allowedHosts.has(originHost) || allowedHosts.has(parsed.hostname.toLowerCase())) {
      return true;
    }
    return hostHeader !== null && originHost === hostHeader.trim().toLowerCase();
  }

  // Fixed-window limiter keyed by session id (or client address for requests
  // that have not initialized a session yet).
  const buckets = new Map<string, { count: number; resetAt: number }>();
  function isRateLimited(key: string): boolean {
    if (rateLimitPerMinute <= 0) return false;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60_000 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (buckets.size > 10_000) {
      for (const [id, entry] of buckets) {
        if (now >= entry.resetAt) buckets.delete(id);
      }
    }
    return bucket.count > rateLimitPerMinute;
  }

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
    async fetch(req: Request, bunServer): Promise<Response> {
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

      if (enforceHostCheck) {
        const hostHeader = req.headers.get('host');
        if (!isAllowedHost(hostHeader) || !isAllowedOrigin(req.headers.get('origin'), hostHeader)) {
          return jsonResponse(403, { error: 'forbidden' });
        }
      }

      const limiterKey =
        req.headers.get('mcp-session-id') ?? bunServer.requestIP(req)?.address ?? 'unknown';
      if (isRateLimited(limiterKey)) {
        return jsonResponse(429, { error: 'too_many_requests' }, { 'retry-after': '60' });
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
