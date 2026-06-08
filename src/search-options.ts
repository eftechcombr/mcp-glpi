/**
 * SearchOptions cache + helpers.
 *
 * GLPI exposes `/listSearchOptions/{itemtype}` which returns the catalogue of
 * searchable fields for an itemtype. Each entry is keyed by a numeric field_id
 * and carries human-readable metadata (name, table, datatype, available_searchtypes).
 *
 * We cache the catalogue per itemtype (TTL configurable, default 1h) so that:
 *   - high-level tools can translate friendly param names → criteria field_id
 *   - list/search responses can be enriched with field labels
 */

import { GlpiHttp } from './http.js';

export interface SearchOption {
  id: number;
  name: string;
  table?: string;
  field?: string;
  datatype?: string;
  uid?: string;
  available_searchtypes?: string[];
  /** Raw entry from GLPI, kept for debugging / advanced cases. */
  raw: Record<string, unknown>;
}

export interface SearchOptionsCatalogue {
  itemtype: string;
  fetchedAt: number;
  byId: Map<number, SearchOption>;
  byUid: Map<string, SearchOption>;
  byName: Map<string, SearchOption>;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export class SearchOptionsCache {
  private cache: Map<string, SearchOptionsCatalogue> = new Map();
  private ttlMs: number;

  constructor(private http: GlpiHttp, ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  async get(itemtype: string): Promise<SearchOptionsCatalogue> {
    const cached = this.cache.get(itemtype);
    if (cached && Date.now() - cached.fetchedAt < this.ttlMs) return cached;

    const { data } = await this.http.request<Record<string, unknown>>(
      `listSearchOptions/${itemtype}`
    );

    const catalogue = this.parse(itemtype, data);
    this.cache.set(itemtype, catalogue);
    return catalogue;
  }

  /** Invalidate cache for one itemtype, or all if no argument. */
  invalidate(itemtype?: string) {
    if (itemtype) this.cache.delete(itemtype);
    else this.cache.clear();
  }

  /**
   * Resolve a friendly name to a field_id.
   * Looks up by exact id (if numeric string), uid (e.g. "Ticket.status"), or name.
   */
  async resolveField(itemtype: string, ref: string | number): Promise<number | undefined> {
    if (typeof ref === 'number') return ref;
    if (/^\d+$/.test(ref)) return parseInt(ref, 10);

    const cat = await this.get(itemtype);
    const direct = cat.byUid.get(ref) ?? cat.byName.get(ref) ?? cat.byName.get(ref.toLowerCase());
    return direct?.id;
  }

  private parse(itemtype: string, data: Record<string, unknown>): SearchOptionsCatalogue {
    const byId = new Map<number, SearchOption>();
    const byUid = new Map<string, SearchOption>();
    const byName = new Map<string, SearchOption>();

    for (const [key, value] of Object.entries(data)) {
      const id = parseInt(key, 10);
      if (Number.isNaN(id)) continue; // skip metadata entries like "common"
      if (!value || typeof value !== 'object') continue;
      const entry = value as Record<string, unknown>;

      const option: SearchOption = {
        id,
        name: typeof entry.name === 'string' ? entry.name : String(id),
        table: typeof entry.table === 'string' ? entry.table : undefined,
        field: typeof entry.field === 'string' ? entry.field : undefined,
        datatype: typeof entry.datatype === 'string' ? entry.datatype : undefined,
        uid: typeof entry.uid === 'string' ? entry.uid : undefined,
        available_searchtypes: Array.isArray(entry.available_searchtypes)
          ? (entry.available_searchtypes as string[])
          : undefined,
        raw: entry,
      };

      byId.set(id, option);
      if (option.uid) byUid.set(option.uid, option);
      if (option.name) byName.set(option.name.toLowerCase(), option);
    }

    return { itemtype, fetchedAt: Date.now(), byId, byUid, byName };
  }
}
