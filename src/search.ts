import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
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
/** Hard ceiling on rows returned by a single page request. */
export const MAX_PAGE_SIZE = 1000;
/** Hard ceiling on rows collected by one `fetch_all` call. */
export const MAX_FETCH_ROWS = 5000;

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(Math.max(n, min), max);
}

const RSQL_LINK_MAP: Record<string, string> = {
  'AND': ';',
  'OR': ',',
  'AND NOT': ';',
  'OR NOT': ',',
};

const SEARCHTYPE_RSQL_MAP: Record<string, (prop: string, value: string) => string> = {
  equals: (prop, v) => `${prop}==${v}`,
  notequals: (prop, v) => `${prop}!=${v}`,
  // GLPI's RSQL engine treats `*` in `==` as a literal character, so wildcard
  // matching has to go through the explicit `like`/`ilike` operators. `ilike`
  // keeps the case-insensitive behaviour callers expect from a contains search.
  contains: (prop, v) => `${prop}=ilike=*${v}*`,
  notcontains: (prop, v) => `${prop}=notilike=*${v}*`,
  morethan: (prop, v) => `${prop}=gt=${v}`,
  lessthan: (prop, v) => `${prop}=lt=${v}`,
  empty: (prop) => `${prop}==''`,
  notempty: (prop) => `${prop}!=''`,
  under: (prop, v) => `${prop}==${v}`,
  notunder: (prop, v) => `${prop}!=${v}`,
};

/**
 * RSQL property names may contain letters, digits, underscores, and dotted
 * segments. Anything else (operators, quotes, separators) would let a caller
 * inject additional filter expressions.
 */
const PROPERTY_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/;

/**
 * Format a value for use in RSQL filter expressions.
 *
 * RSQL (RESTful Service Query Language) uses:
 *   - Unquoted literals for simple values (numbers, booleans, simple strings)
 *   - Single-quoted strings for values containing special characters
 *   - Backslash-escaped single quotes inside quoted strings
 *
 * This function ensures all values are properly encoded to prevent RSQL
 * injection. It ALWAYS quotes string values that contain RSQL special
 * characters, regardless of whether they start with a quote character.
 * Literal `*` and `\` characters are escaped so a caller cannot inject or
 * widen a wildcard match.
 */
function formatRsqlValue(v: string | number | boolean): string {
  if (typeof v !== 'string') return String(v);

  let value = v.replace(/\\/g, '\\\\').replace(/\*/g, '\\*');

  // RSQL special characters that require quoting
  const needsQuoting = /[&\|!=<>\(\)\;\*, ]/.test(value) || value.includes("'");
  if (needsQuoting) {
    // Escape single quotes inside the string, then wrap in single quotes
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return value;
}

/**
 * Format a value that sits inside a `like`/`ilike` wildcard (`*value*`).
 *
 * GLPI treats quotes inside a wildcard as literal characters, so quoting the
 * value breaks the match (`=ilike=*'abc'*` never matches). Instead, RSQL
 * separators and operators are backslash-escaped, and `*`/`\` are escaped so a
 * caller cannot widen or break out of the wildcard.
 */
function formatWildcardValue(v: string | number | boolean): string {
  if (typeof v !== 'string') return String(v);
  return v.replace(/[\\*;,()=!<>]/g, '\\$&');
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

    const start = clampInt(options.start, 0, Number.MAX_SAFE_INTEGER, 0);
    const limit = clampInt(options.limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE);
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
    const maxRows = clampInt(options.maxRows, 1, MAX_FETCH_ROWS, DEFAULT_MAX_ROWS);
    const pageSize = clampInt(options.limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE);
    const start = clampInt(options.start, 0, Number.MAX_SAFE_INTEGER, 0);
    let cursor = start;
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
      start,
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

      const builder = SEARCHTYPE_RSQL_MAP[c.searchtype];
      if (!builder) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported searchtype: ${JSON.stringify(c.searchtype)}`
        );
      }
      if (c.link !== undefined && !(c.link in RSQL_LINK_MAP)) {
        throw new McpError(ErrorCode.InvalidParams, `Unsupported link: ${JSON.stringify(c.link)}`);
      }

      const wildcard = c.searchtype === 'contains' || c.searchtype === 'notcontains';
      const rsql = builder(
        propName,
        wildcard ? formatWildcardValue(c.value) : formatRsqlValue(c.value)
      );

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

  private async resolvePropertyName(
    itemtype: string,
    field: number | string
  ): Promise<string> {
    if (typeof field === 'string') {
      return this.validatePropertyName(field);
    }
    const resolved = await this.searchOptions.resolvePropertyName(itemtype, field);
    if (!resolved) {
      // Fail closed: silently dropping a criterion would broaden the result set
      // (for example, a status filter would vanish and return every row).
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown search field id ${field} for ${itemtype}`
      );
    }
    return this.validatePropertyName(resolved);
  }

  private validatePropertyName(name: string): string {
    if (!PROPERTY_NAME_RE.test(name)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid search field: ${JSON.stringify(name)}`
      );
    }
    return name;
  }

  private itemtypeToPath(itemtype: string): string {
    return ITEMTYPE_PATH_MAP[itemtype] ?? itemtype;
  }
}

export const ITEMTYPE_PATH_MAP: Record<string, string> = {
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
  SoftwareLicense: 'Management/License',
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
  Project: 'Project',
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
