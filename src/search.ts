import { GlpiHttp } from './http.js';
import { SearchOptionsCache } from './search-options.js';

export type SearchType =
  | 'contains'
  | 'notcontains'
  | 'equals'
  | 'notequals'
  | 'lessthan'
  | 'morethan'
  | 'under'
  | 'notunder'
  | 'empty'
  | 'notempty';

export type SearchLink = 'AND' | 'OR' | 'AND NOT' | 'OR NOT';

export interface SearchCriterion {
  field: number | string;
  searchtype: SearchType;
  value: string | number | boolean;
  link?: SearchLink;
}

export interface SearchOptions {
  criteria?: SearchCriterion[];
  forcedisplay?: number[];
  start?: number;
  limit?: number;
  sort?: number | string;
  order?: 'ASC' | 'DESC';
  fetchAll?: boolean;
  maxRows?: number;
  expandDropdowns?: boolean;
  giveItems?: boolean;
}

export interface SearchResponse<T = Record<string, unknown>> {
  itemtype: string;
  totalcount: number;
  count: number;
  start: number;
  data: T[];
  contentRange?: string;
}

const DEFAULT_PAGE = 100;
const DEFAULT_MAX_ROWS = 1000;

const RSQL_LINK_MAP: Record<string, string> = {
  'AND': ';',
  'OR': ',',
  'AND NOT': ';',
  'OR NOT': ',',
};

const SEARCHTYPE_RSQL_MAP: Record<string, (prop: string, value: string) => string> = {
  equals: (prop, v) => `${prop}==${v}`,
  notequals: (prop, v) => `${prop}!=${v}`,
  contains: (prop, v) => `${prop}==*${escapeRsqlValue(v)}*`,
  notcontains: (prop, v) => `${prop}!=*${escapeRsqlValue(v)}*`,
  morethan: (prop, v) => `${prop}=gt=${v}`,
  lessthan: (prop, v) => `${prop}=lt=${v}`,
  empty: (prop) => `${prop}==''`,
  notempty: (prop) => `${prop}!=''`,
  under: (prop, v) => `${prop}==${v}`,
  notunder: (prop, v) => `${prop}!=${v}`,
};

function escapeRsqlValue(v: string): string {
  return v.replace(/'/g, "\\'").replace(/\*/g, '\\*');
}

function formatRsqlValue(v: string | number | boolean): string {
  if (typeof v === 'string') {
    if (/[&\|!=<>\(\)\;\*, ]/.test(v) && !v.startsWith("'")) {
      return `'${v.replace(/'/g, "\\'")}'`;
    }
    return v;
  }
  return String(v);
}

export class GlpiSearch {
  constructor(
    private http: GlpiHttp,
    private searchOptions: SearchOptionsCache
  ) {}

  async search<T = Record<string, unknown>>(
    itemtype: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse<T>> {
    if (options.fetchAll) return this.fetchAll<T>(itemtype, options);

    const start = options.start ?? 0;
    const limit = options.limit ?? DEFAULT_PAGE;
    return this.fetchPage<T>(itemtype, options, start, limit);
  }

  async count(
    itemtype: string,
    criteria: SearchCriterion[] = []
  ): Promise<number> {
    const result = await this.fetchPage(itemtype, { criteria }, 0, 1);
    return result.totalcount;
  }

  private async fetchPage<T>(
    itemtype: string,
    options: SearchOptions,
    start: number,
    limit: number
  ): Promise<SearchResponse<T>> {
    const params = new URLSearchParams();

    const filter = await this.buildFilter(itemtype, options.criteria ?? []);
    if (filter) params.append('filter', filter);

    params.append('start', String(start));
    params.append('limit', String(limit));

    if (options.sort !== undefined) {
      const sortProp = await this.resolvePropertyName(itemtype, options.sort);
      if (sortProp) {
        params.append('sort', options.order === 'DESC' ? `${sortProp}:desc` : `${sortProp}:asc`);
      }
    } else if (options.order) {
      params.append('sort', `id:${options.order.toLowerCase()}`);
    }

    const path = this.itemtypeToPath(itemtype);
    const { data, headers } = await this.http.request<T[]>(path, { query: params });

    const items = Array.isArray(data) ? data : [];
    const contentRange = headers.get('content-range') ?? undefined;

    let totalcount = 0;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) totalcount = parseInt(match[1], 10);
    }

    return {
      itemtype,
      totalcount,
      count: items.length,
      start,
      data: items as unknown as T[],
      contentRange,
    };
  }

  private async fetchAll<T>(
    itemtype: string,
    options: SearchOptions
  ): Promise<SearchResponse<T>> {
    const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
    const pageSize = options.limit ?? DEFAULT_PAGE;
    let cursor = options.start ?? 0;
    const collected: T[] = [];
    let totalcount = 0;
    let contentRange: string | undefined;

    while (collected.length < maxRows) {
      const remaining = maxRows - collected.length;
      const thisPage = Math.min(pageSize, remaining);

      const page = await this.fetchPage<T>(itemtype, options, cursor, thisPage);
      totalcount = page.totalcount;
      contentRange = page.contentRange;

      collected.push(...page.data);
      cursor += page.data.length;

      if (page.data.length === 0) break;
      if (page.data.length < thisPage) break;
      if (totalcount && cursor >= totalcount) break;
    }

    return {
      itemtype,
      totalcount,
      count: collected.length,
      start: options.start ?? 0,
      data: collected,
      contentRange,
    };
  }

  private async buildFilter(
    itemtype: string,
    criteria: SearchCriterion[]
  ): Promise<string> {
    if (criteria.length === 0) return '';

    const parts: string[] = [];

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      const propName = await this.resolvePropertyName(itemtype, c.field);
      if (!propName) continue;

      const builder = SEARCHTYPE_RSQL_MAP[c.searchtype];
      if (!builder) continue;

      const rsql = builder(propName, formatRsqlValue(c.value));

      if (i > 0 && c.link) {
        const separator = RSQL_LINK_MAP[c.link] ?? ';';
        if (c.link === 'AND NOT' || c.link === 'OR NOT') {
          parts.push(`${separator}not(${rsql})`);
        } else {
          parts.push(`${separator}${rsql}`);
        }
      } else {
        parts.push(rsql);
      }
    }

    return parts.join('');
  }

  private async resolvePropertyName(itemtype: string, field: number | string): Promise<string | null> {
    if (typeof field === 'string') return field;
    return this.searchOptions.resolvePropertyName(itemtype, field);
  }

  private itemtypeToPath(itemtype: string): string {
    return ITEMTYPE_PATH_MAP[itemtype] ?? itemtype;
  }
}

const ITEMTYPE_PATH_MAP: Record<string, string> = {
  Ticket: 'Assistance/Ticket',
  Problem: 'Assistance/Problem',
  Change: 'Assistance/Change',
  User: 'Administration/User',
  Group: 'Administration/Group',
  Entity: 'Administration/Entity',
  Computer: 'Assets/Computer',
  Monitor: 'Assets/Monitor',
  Printer: 'Assets/Printer',
  Phone: 'Assets/Phone',
  Peripheral: 'Assets/Peripheral',
  NetworkEquipment: 'Assets/NetworkEquipment',
  Software: 'Assets/Software',
  SoftwareLicense: 'Assets/SoftwareLicense',
  Certificate: 'Assets/Certificate',
  Appliance: 'Assets/Appliance',
  Contract: 'Management/Contract',
  Supplier: 'Management/Supplier',
  Document: 'Management/Document',
  Budget: 'Management/Budget',
  Contact: 'Management/Contact',
  KnowbaseItem: 'Knowledgebase/Article',
  ITILCategory: 'Dropdowns/ITILCategory',
  Location: 'Dropdowns/Location',
  Project: 'Project/Project',
  ProjectTask: 'Project/Task',
  ITILFollowup: 'ITILFollowup',
  ITILSolution: 'ITILSolution',
  TicketTask: 'TicketTask',
  TicketValidation: 'TicketValidation',
  Document_Item: 'Document_Item',
  Ticket_Ticket: 'Ticket_Ticket',
  Group_User: 'Group_User',
  TicketSatisfaction: 'TicketSatisfaction',
  Ticket_User: 'Ticket_User',
  Group_Ticket: 'Group_Ticket',
};
