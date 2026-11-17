import { URLSearchParams } from 'url';

export type GlpiAuthMethod = 'password' | 'client_credentials' | 'bearer';

export interface GlpiHttpConfig {
  url: string;
  /** High-level API version used for resource requests. */
  apiVersion?: string;
  authMethod?: GlpiAuthMethod;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  timeoutMs?: number;
  entityId?: number;
  profileId?: number;
  entityRecursive?: boolean;
}

export interface GlpiRawError {
  status: number;
  glpiCode?: string;
  glpiMessage?: string;
  body: string;
  url: string;
  method: string;
}

export class GlpiError extends Error {
  readonly status: number;
  readonly glpiCode?: string;
  readonly glpiMessage?: string;
  readonly body: string;
  readonly url: string;
  readonly method: string;

  constructor(raw: GlpiRawError) {
    const detail = raw.glpiCode
      ? `${raw.glpiCode}${raw.glpiMessage ? ': ' + raw.glpiMessage : ''}`
      : raw.body.slice(0, 500);
    super(`GLPI ${raw.method} ${raw.url} -> ${raw.status} (${detail})`);
    this.name = 'GlpiError';
    this.status = raw.status;
    this.glpiCode = raw.glpiCode;
    this.glpiMessage = raw.glpiMessage;
    this.body = raw.body;
    this.url = raw.url;
    this.method = raw.method;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: URLSearchParams | Record<string, string | number | boolean | undefined>;
  json?: unknown;
  headers?: Record<string, string>;
}

export interface RequestResult<T> {
  data: T;
  headers: Headers;
  status: number;
}

function debugLog(message: string): void {
  if (process.env.GLPI_DEBUG) {
    console.error(`[glpi-http] ${new Date().toISOString()} ${message}`);
  }
}

export const DEFAULT_API_VERSION = '3.0';

/**
 * Normalize and validate a GLPI High-Level API version string.
 *
 * Accepts values like "3.0", "3", "v3.0", "2.3", "2", "v2.3.0".
 * Empty or undefined values resolve to DEFAULT_API_VERSION ("3.0").
 */
export function normalizeApiVersion(version?: string): string {
  const trimmed = version?.trim();
  if (!trimmed) return DEFAULT_API_VERSION;
  const normalized = trimmed.replace(/^v/i, '');
  if (!/^\d+(?:\.\d+){0,2}$/.test(normalized)) {
    throw new Error(
      `Invalid GLPI API version "${version}". Expected a High-Level API version like "3.0" or "2.3".`
    );
  }
  const major = parseInt(normalized.split('.')[0], 10);
  if (major < 2) {
    throw new Error(
      `Unsupported GLPI API version "${version}". Only High-Level API v2+ (e.g. "2.3", "3.0") is supported.`
    );
  }
  return normalized;
}

/**
 * Validate and normalize a GLPI base URL.
 *
 * Only `http:`/`https:` are accepted. Credentials, query strings, and
 * fragments are rejected: the base URL is concatenated with API paths, so a
 * `#` or `?` would let a caller redirect requests to an arbitrary target
 * (including `file:` URLs when combined with a scheme like `file:///etc/passwd#`).
 */
export function normalizeGlpiUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid GLPI URL: ${JSON.stringify(rawUrl)}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Unsupported GLPI URL scheme "${parsed.protocol}" — only http and https are allowed.`
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error('GLPI URL must not embed credentials.');
  }
  if (parsed.search || parsed.hash) {
    throw new Error('GLPI URL must not contain a query string or fragment.');
  }
  const path = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path}`;
}

/**
 * Reject API path segments that could escape the configured GLPI base path.
 *
 * Paths are built by callers from itemtype names and ids; validating here is a
 * defence-in-depth check so a non-numeric id cannot traverse to another
 * endpoint (WHATWG URL normalization collapses `..` segments before sending).
 */
export function assertSafeApiPath(path: string): void {
  const unsafe =
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
  if (unsafe) {
    throw new Error(`Invalid GLPI API path: ${JSON.stringify(path)}`);
  }
}

export class GlpiHttp {
  readonly config: GlpiHttpConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  /** Mutex lock to prevent concurrent token refresh requests */
  private sessionLock: Promise<void> | null = null;

  constructor(config: GlpiHttpConfig) {
    const apiVersion = normalizeApiVersion(config.apiVersion);
    this.config = {
      maxRetries: 2,
      retryBaseDelayMs: 300,
      timeoutMs: 15000,
      ...config,
      apiVersion,
      url: normalizeGlpiUrl(config.url),
    };
  }

  get token(): string | null {
    return this.accessToken;
  }

  async initSession(): Promise<void> {
    const method = this.config.authMethod ?? 'password';

    if (method === 'bearer') {
      if (!this.config.accessToken) {
        throw new Error('bearer auth requires GLPI_ACCESS_TOKEN');
      }
      this.accessToken = this.config.accessToken;
      this.tokenExpiresAt = Infinity;
      debugLog('Using pre-configured bearer token');
      return;
    }

    if (method === 'client_credentials') {
      if (!this.config.clientId) {
        throw new Error('client_credentials grant requires GLPI_CLIENT_ID');
      }
      await this.fetchToken({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        ...(this.config.clientSecret ? { client_secret: this.config.clientSecret } : {}),
        scope: 'api',
      });
      return;
    }

    // password grant
    if (!this.config.username || !this.config.password) {
      throw new Error(
        'password grant requires GLPI_USERNAME and GLPI_PASSWORD'
      );
    }
    await this.fetchToken({
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password,
      client_id: this.config.clientId,
      ...(this.config.clientSecret ? { client_secret: this.config.clientSecret } : {}),
      scope: 'api',
    });
  }

  private async fetchToken(params: Record<string, string | undefined>): Promise<void> {
    const tokenUrl = `${this.config.url}/api.php/token`;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body.append(k, v);
    }

    const response = await this.fetchWithTimeout(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw await this.buildError(response, 'POST', tokenUrl);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
      scope?: string;
    };

    this.accessToken = data.access_token;
    this.tokenExpiresAt = data.expires_in
      ? Date.now() + (data.expires_in * 1000) - 30000
      : Infinity;

    debugLog(`OAuth2 token obtained via ${params.grant_type}, expires in ${data.expires_in ?? 'never'}s`);
  }

  /**
   * Clear the current bearer token.
   *
   * The high-level API does not expose a logout endpoint. Token expiration and
   * server-side revocation remain GLPI's responsibility.
   */
  async killSession(): Promise<void> {
    const token = this.accessToken;
    // Clear in-memory token immediately to prevent further use
    this.accessToken = null;
    this.tokenExpiresAt = 0;

    if (token) debugLog('GLPI bearer token cleared locally');
  }

  /**
   * Ensure a valid session exists, with mutual exclusion to prevent
   * concurrent token refresh (race condition).
   *
   * If multiple requests arrive while the token is expired, only the
   * first one initiates re-auth; subsequent requests wait on the same
   * lock and use the refreshed token.
   */
  private async ensureSession(): Promise<void> {
    // Fast path: token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return;
    }

    // Mutex: only one request should re-authenticate at a time
    if (this.sessionLock) {
      // Another request is already refreshing; wait for it
      await this.sessionLock;
      // After waiting, check if the token is now valid
      if (this.accessToken && Date.now() < this.tokenExpiresAt) {
        return;
      }
    }

    // Acquire the lock
    let resolveLock: () => void;
    this.sessionLock = new Promise<void>((resolve) => { resolveLock = resolve; });

    try {
      // Double-check: another request may have refreshed while we were
      // acquiring the lock
      if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
        await this.initSession();
      }
    } finally {
      // Release the lock
      if (resolveLock!) resolveLock!();
      this.sessionLock = null;
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const timeoutMs = this.config.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
      }
      throw err;
    }
  }

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<RequestResult<T>> {
    const method = options.method ?? 'GET';

    assertSafeApiPath(path);

    await this.ensureSession();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
    };
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.entityId !== undefined) {
      headers['GLPI-Entity'] = String(this.config.entityId);
    }
    if (this.config.profileId !== undefined) {
      headers['GLPI-Profile'] = String(this.config.profileId);
    }
    if (this.config.entityRecursive !== undefined) {
      headers['GLPI-Entity-Recursive'] = this.config.entityRecursive ? 'true' : 'false';
    }
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const queryString = this.buildQuery(options.query);
    const fullUrl = `${this.config.url}/api.php/v${this.config.apiVersion}/${path}${queryString ? '?' + queryString : ''}`;

    const init: RequestInit = { method, headers };
    if (options.json !== undefined) init.body = JSON.stringify(options.json);

    const maxRetries = this.config.maxRetries ?? 2;
    const baseDelay = this.config.retryBaseDelayMs ?? 300;
    let attempt = 0;
    let lastError: GlpiError | undefined;
    let reauthAttempted = false;

    while (attempt <= maxRetries) {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(fullUrl, init);
      } catch (err) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          debugLog(`${method} ${path} network error (${err instanceof Error ? err.message : err}), retry in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }
        throw err;
      }

      if (response.ok) {
        if (response.status === 204) {
          return { data: undefined as unknown as T, headers: response.headers, status: response.status };
        }
        const data = await this.parseBody<T>(response);
        return { data, headers: response.headers, status: response.status };
      }

      if (response.status === 401 && !reauthAttempted) {
        reauthAttempted = true;
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        debugLog(`${method} ${path} -> 401, re-authenticating`);
        await this.initSession();
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        continue;
      }

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const delay = retryAfter > 0 ? retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
        debugLog(`${method} ${path} -> 429 rate-limited, retry in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        continue;
      }

      if (response.status >= 500 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        debugLog(`${method} ${path} -> ${response.status}, retry in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        continue;
      }

      lastError = await this.buildError(response, method, fullUrl);
      throw lastError;
    }

    throw lastError ?? new Error('Unreachable');
  }

  private async parseBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private async buildError(
    response: Response,
    method: string,
    url: string
  ): Promise<GlpiError> {
    const body = await response.text();
    let glpiCode: string | undefined;
    let glpiMessage: string | undefined;
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed) && parsed.length >= 1 && typeof parsed[0] === 'string') {
        glpiCode = parsed[0];
        glpiMessage = typeof parsed[1] === 'string' ? parsed[1] : undefined;
      }
    } catch {
    }
    return new GlpiError({
      status: response.status,
      glpiCode,
      glpiMessage,
      body,
      url,
      method,
    });
  }

  private buildQuery(
    query: RequestOptions['query']
  ): string {
    if (!query) return '';
    if (query instanceof URLSearchParams) return query.toString();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    return params.toString();
  }
}
