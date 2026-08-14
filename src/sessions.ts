import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { GlpiClient } from './glpi-client.js';

export interface SessionStatus {
  configured: boolean;
  authMethod?: string;
  url?: string;
}

interface SessionEntry {
  client: GlpiClient;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Holds one GlpiClient per MCP session (keyed by Mcp-Session-Id).
 *
 * When a session has no client of its own, it falls back to the server-wide
 * default client (single-tenant mode configured via GLPI_* env vars).
 *
 * Session clients are evicted after `ttlMs` of inactivity and their GLPI
 * session is killed on eviction/close so tokens are revoked promptly.
 */
export class SessionManager {
  private readonly entries = new Map<string, SessionEntry>();
  private readonly defaultClient: GlpiClient | null;
  private readonly ttlMs: number;

  constructor(opts: { ttlMs?: number; defaultClient?: GlpiClient | null } = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.defaultClient = opts.defaultClient ?? null;
  }

  get ttl(): number {
    return this.ttlMs;
  }

  has(sessionId?: string): boolean {
    if (!sessionId) return this.defaultClient !== null;
    return this.entries.has(sessionId);
  }

  touch(sessionId: string): void {
    const entry = this.entries.get(sessionId);
    if (entry) entry.expiresAt = Date.now() + this.ttlMs;
  }

  /** Resolve the client for a session; throws a clean MCP error when unset. */
  get(sessionId?: string): GlpiClient {
    if (sessionId) {
      const entry = this.entries.get(sessionId);
      if (entry) {
        entry.expiresAt = Date.now() + this.ttlMs;
        return entry.client;
      }
    }
    if (this.defaultClient) return this.defaultClient;
    throw new McpError(
      ErrorCode.InvalidRequest,
      'No GLPI connection configured for this session. Call glpi_configure_connection first.'
    );
  }

  set(sessionId: string, client: GlpiClient): void {
    this.entries.set(sessionId, { client, expiresAt: Date.now() + this.ttlMs });
  }

  status(sessionId?: string): SessionStatus {
    if (sessionId) {
      const entry = this.entries.get(sessionId);
      if (entry) {
        return {
          configured: true,
          authMethod: entry.client.http.config.authMethod,
          url: entry.client.http.config.url,
        };
      }
    }
    if (this.defaultClient) {
      return {
        configured: true,
        authMethod: this.defaultClient.http.config.authMethod,
        url: this.defaultClient.http.config.url,
      };
    }
    return { configured: false };
  }

  /** Remove a session and revoke its GLPI session (best-effort). */
  async remove(sessionId?: string): Promise<void> {
    if (!sessionId) return;
    const entry = this.entries.get(sessionId);
    if (!entry) return;
    this.entries.delete(sessionId);
    try {
      await entry.client.killSession();
    } catch {
      // best-effort: a failed logout must not block cleanup
    }
  }

  evictExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt < now) {
        this.entries.delete(id);
        try {
          entry.client.killSession();
        } catch {
          // best-effort: ignore failures during eviction
        }
      }
    }
  }

  /** Revoke every session client. Used on shutdown. */
  async close(): Promise<void> {
    const clients = [...this.entries.values()].map((e) => e.client);
    this.entries.clear();
    await Promise.allSettled(clients.map((c) => c.killSession()));
  }
}