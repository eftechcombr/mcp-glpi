/**
 * Restrict GLPI destinations selected by a remote MCP caller.
 *
 * A fixed GLPI_URL is operator-controlled, so only that origin is accepted.
 * In multi-tenant mode, callers may select a GLPI URL only when its host (or
 * host:port) appears in the operator-controlled GLPI_ALLOWED_HOSTS list.
 */
export function assertAllowedGlpiUrl(
  rawUrl: string,
  fixedGlpiUrl: string | undefined,
  allowedHostsRaw: string | undefined
): void {
  const target = new URL(rawUrl);
  if (fixedGlpiUrl) {
    const fixed = new URL(fixedGlpiUrl);
    if (target.origin === fixed.origin) return;
    throw new Error('GLPI URL does not match the configured GLPI_URL origin.');
  }

  const allowedHosts = (allowedHostsRaw ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (allowedHosts.length === 0) {
    throw new Error(
      'Per-session GLPI connections require the operator to configure GLPI_ALLOWED_HOSTS.'
    );
  }
  if (!allowedHosts.includes(target.host.toLowerCase()) &&
      !allowedHosts.includes(target.hostname.toLowerCase())) {
    throw new Error('GLPI URL host is not in the operator-configured GLPI_ALLOWED_HOSTS list.');
  }
}

/** Parse a bounded integer environment setting, failing closed on bad input. */
export function parseBoundedEnvInt(
  name: string,
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}
