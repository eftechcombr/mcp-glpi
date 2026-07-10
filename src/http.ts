import { URLSearchParams } from 'url';

export type GlpiAuthMethod = 'password' | 'client_credentials' | 'bearer';

export interface GlpiHttpConfig {
  url: string;
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

export class GlpiHttp {
  readonly config: GlpiHttpConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  /** Mutex lock to prevent concurrent token refresh requests */
  private sessionLock: Promise<void> | null = null;

  constructor(config: GlpiHttpConfig) {
    this.config = {
      maxRetries: 2,
      retryBaseDelayMs: 300,
      timeoutMs: 15000,
      ...config,
      url: config.url.replace(/\/+$/, ''),
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
   * Kill the current GLPI session.
   *
   * Calls the GLPI logout endpoint to revoke the server-side session token,
   * then clears the in-memory token reference.
   *
   * Note: The logout call is best-effort (does not throw on failure) so that
   * server shutdown is not blocked by an unreachable GLPI.
   */
  async killSession(): Promise<void> {
    const token = this.accessToken;
    // Clear in-memory token immediately to prevent further use
    this.accessToken = null;
    this.tokenExpiresAt = 0;

    // Best-effort server-side logout: revoke the token
    if (token) {
      try {
        await this.fetchWithTimeout(`${this.config.url}/api.php/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        debugLog('GLPI session terminated server-side');
      } catch {
        // Swallow — GLPI may be unreachable during shutdown
        debugLog('Warning: could not terminate GLPI session server-side');
      }
    }
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
    const fullUrl = `${this.config.url}/api.php/${path}${queryString ? '?' + queryString : ''}`;

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
