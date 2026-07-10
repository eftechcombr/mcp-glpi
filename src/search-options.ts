import { GlpiHttp } from './http.js';

export interface SearchOption {
  id: number;
  name: string;
  table?: string;
  field?: string;
  datatype?: string;
  uid?: string;
  available_searchtypes?: string[];
  raw: Record<string, unknown>;
}

export interface SearchOptionsCatalogue {
  itemtype: string;
  fetchedAt: number;
  byId: Map<number, SearchOption>;
  byUid: Map<string, SearchOption>;
  byName: Map<string, SearchOption>;
  byField: Map<string, SearchOption>;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export class SearchOptionsCache {
  private cache: Map<string, SearchOptionsCatalogue> = new Map();
  private ttlMs: number;
  private unavailable: Set<string> = new Set();

  constructor(private http: GlpiHttp, ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  async get(itemtype: string): Promise<SearchOptionsCatalogue | null> {
    if (this.unavailable.has(itemtype)) return null;

    const cached = this.cache.get(itemtype);
    if (cached && Date.now() - cached.fetchedAt < this.ttlMs) return cached;

    try {
      const { data } = await this.http.request<Record<string, unknown>>(
        `listSearchOptions/${itemtype}`
      );
      const catalogue = this.parse(itemtype, data);
      this.cache.set(itemtype, catalogue);
      return catalogue;
    } catch {
      this.unavailable.add(itemtype);
      return null;
    }
  }

  invalidate(itemtype?: string) {
    if (itemtype) {
      this.cache.delete(itemtype);
      this.unavailable.delete(itemtype);
    } else {
      this.cache.clear();
      this.unavailable.clear();
    }
  }

  async resolveField(itemtype: string, ref: string | number): Promise<number | undefined> {
    if (typeof ref === 'number') return ref;
    if (/^\d+$/.test(ref)) return parseInt(ref, 10);

    const cat = await this.get(itemtype);
    if (!cat) return undefined;

    const direct =
      cat.byUid.get(ref) ??
      cat.byUid.get(`${itemtype}.${ref}`) ??
      cat.byName.get(ref.toLowerCase()) ??
      cat.byField.get(ref.toLowerCase());
    return direct?.id;
  }

  async resolvePropertyName(itemtype: string, field: number): Promise<string | null> {
    if (this.unavailable.has(itemtype)) return null;

    const cat = await this.get(itemtype);
    if (!cat) return null;

    const option = cat.byId.get(field);
    if (option?.uid) {
      const dotIndex = option.uid.indexOf('.');
      return dotIndex !== -1 ? option.uid.slice(dotIndex + 1) : option.uid;
    }
    return null;
  }

  private parse(itemtype: string, data: Record<string, unknown>): SearchOptionsCatalogue {
    const byId = new Map<number, SearchOption>();
    const byUid = new Map<string, SearchOption>();
    const byName = new Map<string, SearchOption>();
    const byField = new Map<string, SearchOption>();

    for (const [key, value] of Object.entries(data)) {
      const id = parseInt(key, 10);
      if (Number.isNaN(id)) continue;
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
      if (option.uid && !byUid.has(option.uid)) byUid.set(option.uid, option);
      if (option.name && !byName.has(option.name.toLowerCase())) {
        byName.set(option.name.toLowerCase(), option);
      }
      if (option.field) {
        const fieldKey = option.field.toLowerCase();
        const isCanonical = option.uid === `${itemtype}.${option.field}`;
        if (isCanonical || !byField.has(fieldKey)) byField.set(fieldKey, option);
      }
    }

    return { itemtype, fetchedAt: Date.now(), byId, byUid, byName, byField };
  }
}
