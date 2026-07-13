import { GlpiHttp, GlpiHttpConfig } from './http.js';
import { GlpiSearch, SearchCriterion } from './search.js';
import { SearchOptionsCache } from './search-options.js';

export interface GlpiConfig extends GlpiHttpConfig {}

export interface GlpiTicket {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  priority: number;
  impact: number;
  type: number;
  date: string;
  date_mod: string;
  solvedate?: string;
  closedate?: string;
  users_id_recipient: number;
  itilcategories_id: number;
  entities_id: number;
  time_to_resolve?: string;
  actiontime: number;
}

export interface GlpiUser {
  id: number;
  name: string;
  realname: string;
  firstname: string;
  email: string;
  phone: string;
  mobile: string;
  is_active: number;
  locations_id: number;
  profiles_id: number;
}

export interface GlpiGroup {
  id: number;
  name: string;
  completename: string;
  comment: string;
  entities_id: number;
  is_recursive: number;
}

export interface GlpiCategory {
  id: number;
  name: string;
  completename: string;
  itilcategories_id: number;
  level: number;
}

export interface GlpiComputer {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  contact: string;
  contact_num: string;
  users_id_tech: number;
  groups_id_tech: number;
  comment: string;
  date_mod: string;
  locations_id: number;
  states_id: number;
  computertypes_id: number;
  manufacturers_id: number;
  uuid: string;
  is_deleted: number;
  entities_id: number;
}

export interface GlpiSoftware {
  id: number;
  name: string;
  comment: string;
  locations_id: number;
  users_id_tech: number;
  groups_id_tech: number;
  is_helpdesk_visible: number;
  manufacturers_id: number;
  softwarecategories_id: number;
  is_deleted: number;
  entities_id: number;
}

export interface GlpiProblem {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  impact: number;
  priority: number;
  date: string;
  date_mod: string;
  solvedate?: string;
  closedate?: string;
  users_id_recipient: number;
  itilcategories_id: number;
  entities_id: number;
}

export interface GlpiChange {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  impact: number;
  priority: number;
  date: string;
  date_mod: string;
  solvedate?: string;
  closedate?: string;
  users_id_recipient: number;
  itilcategories_id: number;
  entities_id: number;
}

export interface GlpiKnowbaseItem {
  id: number;
  name: string;
  answer: string;
  is_faq: number;
  view: number;
  date: string;
  date_mod: string;
  users_id: number;
  knowbaseitemcategories_id: number;
}

export interface GlpiContract {
  id: number;
  name: string;
  num: string;
  contracttypes_id: number;
  begin_date: string;
  duration: number;
  notice: number;
  periodicity: number;
  billing: number;
  comment: string;
  renewal: number;
  entities_id: number;
}

export interface GlpiSupplier {
  id: number;
  name: string;
  suppliertypes_id: number;
  address: string;
  postcode: string;
  town: string;
  state: string;
  country: string;
  website: string;
  phonenumber: string;
  fax: string;
  email: string;
  comment: string;
  entities_id: number;
}

export interface GlpiLocation {
  id: number;
  name: string;
  completename: string;
  locations_id: number;
  address: string;
  postcode: string;
  town: string;
  country: string;
  building: string;
  room: string;
  entities_id: number;
}

export interface GlpiNetworkEquipment {
  id: number;
  name: string;
  ram: string;
  serial: string;
  otherserial: string;
  contact: string;
  contact_num: string;
  users_id_tech: number;
  groups_id_tech: number;
  date_mod: string;
  comment: string;
  locations_id: number;
  networks_id: number;
  networkequipmenttypes_id: number;
  networkequipmentmodels_id: number;
  manufacturers_id: number;
  is_deleted: number;
  entities_id: number;
}

export interface GlpiPrinter {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  contact: string;
  contact_num: string;
  users_id_tech: number;
  groups_id_tech: number;
  have_serial: number;
  have_parallel: number;
  have_usb: number;
  have_wifi: number;
  have_ethernet: number;
  comment: string;
  date_mod: string;
  locations_id: number;
  printertypes_id: number;
  printermodels_id: number;
  manufacturers_id: number;
  is_deleted: number;
  entities_id: number;
}

export interface GlpiMonitor {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  contact: string;
  contact_num: string;
  users_id_tech: number;
  groups_id_tech: number;
  comment: string;
  date_mod: string;
  size: number;
  have_micro: number;
  have_speaker: number;
  have_subd: number;
  have_bnc: number;
  have_dvi: number;
  have_pivot: number;
  have_hdmi: number;
  have_displayport: number;
  locations_id: number;
  monitortypes_id: number;
  monitormodels_id: number;
  manufacturers_id: number;
  is_deleted: number;
  entities_id: number;
}

export interface GlpiPhone {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  contact: string;
  contact_num: string;
  users_id_tech: number;
  groups_id_tech: number;
  comment: string;
  date_mod: string;
  locations_id: number;
  phonetypes_id: number;
  phonemodels_id: number;
  manufacturers_id: number;
  is_deleted: number;
  entities_id: number;
  firmware: string;
  number_line: string;
  have_headset: number;
  have_hp: number;
}

export interface GlpiEntity {
  id: number;
  name: string;
  completename: string;
  entities_id: number;
  level: number;
  comment: string;
  address: string;
  postcode: string;
  town: string;
  country: string;
  website: string;
  phonenumber: string;
  fax: string;
  email: string;
}

export interface GlpiProject {
  id: number;
  name: string;
  code: string;
  priority: number;
  content: string;
  comment: string;
  date: string;
  date_mod: string;
  plan_start_date: string;
  plan_end_date: string;
  real_start_date: string;
  real_end_date: string;
  percent_done: number;
  projectstates_id: number;
  projecttypes_id: number;
  users_id: number;
  groups_id: number;
  entities_id: number;
}

export interface GlpiDocument {
  id: number;
  name: string;
  filename: string;
  filepath: string;
  mime: string;
  date_mod: string;
  comment: string;
  sha1sum: string;
  documentcategories_id: number;
  users_id: number;
  entities_id: number;
}

export interface ListOptions {
  range?: string;
  sort?: number;
  order?: 'ASC' | 'DESC';
  is_deleted?: boolean;
  expand_dropdowns?: boolean;
  with_networkports?: boolean;
  with_infocoms?: boolean;
  with_contracts?: boolean;
  with_documents?: boolean;
  with_tickets?: boolean;
  with_problems?: boolean;
  with_changes?: boolean;
  with_logs?: boolean;
  searchText?: Record<string, string>;
}

export interface GetOptions {
  expand_dropdowns?: boolean;
  with_networkports?: boolean;
  with_infocoms?: boolean;
  with_contracts?: boolean;
  with_documents?: boolean;
  with_tickets?: boolean;
  with_problems?: boolean;
  with_changes?: boolean;
  with_logs?: boolean;
  with_softwares?: boolean;
  with_connections?: boolean;
  with_disks?: boolean;
}

/**
 * Known GLPI itemtypes and their API paths.
 * Used to prevent path traversal via unvalidated user input.
 */
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
export { ITEMTYPE_PATH_MAP };

/** Set of valid itemtype names for validation */
export const VALID_ITEMTYPES: ReadonlySet<string> = new Set(Object.keys(ITEMTYPE_PATH_MAP));

export class GlpiClient {
  readonly http: GlpiHttp;
  readonly search: GlpiSearch;
  readonly searchOptions: SearchOptionsCache;

  constructor(config: GlpiConfig) {
    this.http = new GlpiHttp(config);
    this.searchOptions = new SearchOptionsCache(this.http);
    this.search = new GlpiSearch(this.http, this.searchOptions);
  }

  async initSession() {
    return this.http.initSession();
  }

  killSession() {
    this.http.killSession();
  }

  /**
   * Resolve an itemtype to its GLPI REST API path.
   * Throws if the itemtype is not in the known map (prevents path traversal).
   */
  private path(itemtype: string): string {
    const resolved = ITEMTYPE_PATH_MAP[itemtype];
    if (!resolved) {
      throw new Error(`Unknown itemtype: "${itemtype}". Allowed types: ${Object.keys(ITEMTYPE_PATH_MAP).sort().join(', ')}`);
    }
    return resolved;
  }

  private toQuery(o: ListOptions | GetOptions): Record<string, string> {
    const q: Record<string, string> = {};
    if ('range' in o && o.range) {
      const parts = o.range.split('-');
      q.start = parts[0] ?? '0';
      if (parts[1]) {
        q.limit = String(parseInt(parts[1], 10) - parseInt(parts[0] ?? '0', 10) + 1);
      }
    }
    if ('sort' in o && o.sort !== undefined) q.sort = String(o.sort);
    if ('order' in o && o.order) q.order = o.order;
    if (o.expand_dropdowns) q.expand_dropdowns = 'true';
    return q;
  }

  async getItems<T>(itemtype: string, options: ListOptions = {}): Promise<T[]> {
    const params = new URLSearchParams(this.toQuery(options));
    if (options.searchText) {
      for (const [k, v] of Object.entries(options.searchText)) {
        params.append(`filter`, `${k}==${v}`);
      }
    }
    if (options.is_deleted !== undefined) {
      params.append('filter', `is_deleted==${options.is_deleted ? 1 : 0}`);
    }
    const { data } = await this.http.request<T[]>(this.path(itemtype), { query: params });
    return Array.isArray(data) ? data : [];
  }

  async getItem<T>(itemtype: string, id: number, options: GetOptions = {}): Promise<T> {
    const opts = { expand_dropdowns: true, ...options };
    const { data } = await this.http.request<T>(`${this.path(itemtype)}/${id}`, {
      query: this.toQuery(opts),
    });
    return data;
  }

  async createItem(
    itemtype: string,
    payload: Record<string, unknown>
  ): Promise<{ id: number; message?: string }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      this.path(itemtype),
      { method: 'POST', json: payload }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    const location = headers.get('location') ?? undefined;
    return { id: id ?? 0, message: location };
  }

  async updateItem(
    itemtype: string,
    id: number,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    await this.http.request(`${this.path(itemtype)}/${id}`, {
      method: 'PATCH',
      json: payload,
    });
    return true;
  }

  async deleteItem(
    itemtype: string,
    id: number,
    force: boolean = false,
    history: boolean = true
  ): Promise<boolean> {
    const params = new URLSearchParams();
    if (force) params.append('force_purge', '1');
    if (!history) params.append('history', '0');
    const query = params.toString() ? params : undefined;
    await this.http.request(`${this.path(itemtype)}/${id}`, {
      method: 'DELETE',
      query,
    });
    return true;
  }

  async getTickets(options: ListOptions = {}) {
    return this.getItems<GlpiTicket>('Ticket', options);
  }

  async getTicket(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiTicket>('Ticket', id, options);
  }

  async createTicket(ticket: {
    name: string;
    content: string;
    urgency?: number;
    priority?: number;
    impact?: number;
    type?: number;
    itilcategories_id?: number;
    entities_id?: number;
    _users_id_assign?: number;
    _groups_id_assign?: number;
    _users_id_requester?: number;
    _groups_id_requester?: number;
    time_to_resolve?: string;
  }) {
    return this.createItem('Ticket', ticket);
  }

  async updateTicket(id: number, updates: Partial<GlpiTicket>) {
    return this.updateItem('Ticket', id, updates);
  }

  async deleteTicket(id: number, force: boolean = false) {
    return this.deleteItem('Ticket', id, force);
  }

  async addTicketFollowup(
    ticketId: number,
    content: string,
    isPrivate: boolean = false
  ): Promise<{ id: number }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${ticketId}/Timeline/Followup`,
      {
        method: 'POST',
        json: {
          content,
          is_private: isPrivate ? 1 : 0,
        },
      }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    const location = headers.get('location');
    return { id: id ?? 0, ...(location ? { href: location } : {}) };
  }

  async addTicketTask(
    ticketId: number,
    content: string,
    options: {
      is_private?: boolean;
      actiontime?: number;
      state?: number;
      users_id_tech?: number;
      groups_id_tech?: number;
      begin?: string;
      end?: string;
    } = {}
  ): Promise<{ id: number }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${ticketId}/Timeline/Task`,
      {
        method: 'POST',
        json: {
          tickets_id: ticketId,
          content,
          is_private: options.is_private ? 1 : 0,
          actiontime: options.actiontime ?? 0,
          state: options.state ?? 1,
          users_id_tech: options.users_id_tech,
          groups_id_tech: options.groups_id_tech,
          begin: options.begin,
          end: options.end,
        },
      }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    return { id: id ?? 0 };
  }

  async updateTicketTask(id: number, updates: Record<string, unknown>, ticketId?: number): Promise<boolean> {
    if (ticketId) {
      await this.http.request(
        `Assistance/Ticket/${ticketId}/Timeline/Task/${id}`,
        { method: 'PATCH', json: updates }
      );
      return true;
    }
    return this.updateItem('TicketTask', id, updates);
  }

  async deleteTicketTask(id: number, force: boolean = false, ticketId?: number): Promise<boolean> {
    if (ticketId) {
      const params = new URLSearchParams();
      if (force) params.append('force_purge', '1');
      const query = params.toString() ? params : undefined;
      await this.http.request(
        `Assistance/Ticket/${ticketId}/Timeline/Task/${id}`,
        { method: 'DELETE', query }
      );
      return true;
    }
    return this.deleteItem('TicketTask', id, force);
  }

  async addTicketSolution(
    ticketId: number,
    content: string,
    solutiontypes_id?: number
  ): Promise<{ id: number }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${ticketId}/Timeline/Solution`,
      {
        method: 'POST',
        json: {
          content,
          solutiontypes_id: solutiontypes_id ?? 0,
        },
      }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    return { id: id ?? 0 };
  }

  async getTicketFollowups(ticketId: number) {
    const { data } = await this.http.request<unknown[]>(
      `Assistance/Ticket/${ticketId}/Timeline/Followup`
    );
    return Array.isArray(data) ? data : [];
  }

  async getTicketTasks(ticketId: number) {
    const { data } = await this.http.request<unknown[]>(
      `Assistance/Ticket/${ticketId}/Timeline/Task`
    );
    return Array.isArray(data) ? data : [];
  }

  async getTicketSolutions(ticketId: number) {
    const { data } = await this.http.request<unknown[]>(
      `Assistance/Ticket/${ticketId}/Timeline/Solution`
    );
    return Array.isArray(data) ? data : [];
  }

  async getTicketValidations(ticketId: number) {
    const { data } = await this.http.request<unknown[]>(
      `Assistance/Ticket/${ticketId}/Timeline/Validation`
    );
    return Array.isArray(data) ? data : [];
  }

  async getTicketDocuments(ticketId: number) {
    const { data } = await this.http.request<unknown[]>(
      `Assistance/Ticket/${ticketId}/Timeline/Document`
    );
    return Array.isArray(data) ? data : [];
  }

  async assignTicket(
    ticketId: number,
    options: {
      users_id?: number;
      groups_id?: number;
      type?: number;
    }
  ): Promise<{ id: number; response?: Record<string, unknown> }> {
    if (!options.users_id && !options.groups_id) {
      throw new Error('assignTicket requires users_id or groups_id');
    }

    const type = options.type ?? 2;

    const payload: Record<string, unknown> = {};
    if (type === 2) {
      payload._itil_assign = options.users_id
        ? [{ itemtype: 'User', items_id: options.users_id }]
        : [{ itemtype: 'Group', items_id: options.groups_id }];
    } else if (type === 1) {
      payload._itil_requester = options.users_id
        ? [{ itemtype: 'User', items_id: options.users_id }]
        : [{ itemtype: 'Group', items_id: options.groups_id }];
    } else if (type === 3) {
      payload._itil_observer = options.users_id
        ? [{ itemtype: 'User', items_id: options.users_id }]
        : [{ itemtype: 'Group', items_id: options.groups_id }];
    }

    await this.http.request(`Assistance/Ticket/${ticketId}`, {
      method: 'PATCH',
      json: payload,
    });
    return { id: ticketId };
  }

  async getProblems(options: ListOptions = {}) {
    return this.getItems<GlpiProblem>('Problem', options);
  }
  async getProblem(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiProblem>('Problem', id, options);
  }
  async createProblem(problem: {
    name: string;
    content: string;
    urgency?: number;
    impact?: number;
    priority?: number;
    itilcategories_id?: number;
    entities_id?: number;
  }) {
    return this.createItem('Problem', problem);
  }
  async updateProblem(id: number, updates: Partial<GlpiProblem>) {
    return this.updateItem('Problem', id, updates);
  }

  async getChanges(options: ListOptions = {}) {
    return this.getItems<GlpiChange>('Change', options);
  }
  async getChange(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiChange>('Change', id, options);
  }
  async createChange(change: {
    name: string;
    content: string;
    urgency?: number;
    impact?: number;
    priority?: number;
    itilcategories_id?: number;
    entities_id?: number;
  }) {
    return this.createItem('Change', change);
  }
  async updateChange(id: number, updates: Partial<GlpiChange>) {
    return this.updateItem('Change', id, updates);
  }

  async getUsers(options: ListOptions & { is_active?: boolean } = {}) {
    if (options.is_active === undefined) {
      return this.getItems<GlpiUser>('User', options);
    }
    const result = await this.search.search<GlpiUser>('User', {
      criteria: [
        {
          field: 8,
          searchtype: 'equals',
          value: options.is_active ? 1 : 0,
        },
      ],
      start: options.range ? parseInt(options.range.split('-')[0] ?? '0', 10) : 0,
      limit: options.range
        ? parseInt(options.range.split('-')[1] ?? '49', 10) -
          parseInt(options.range.split('-')[0] ?? '0', 10) +
          1
        : 50,
      expandDropdowns: options.expand_dropdowns ?? true,
    });
    return result.data;
  }

  async getUser(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiUser>('User', id, options);
  }

  async getUserByName(name: string): Promise<GlpiUser | null> {
    const { data } = await this.http.request<GlpiUser>(
      `Administration/User/username/${encodeURIComponent(name)}`
    );
    return data ?? null;
  }

  async createUser(user: {
    name: string;
    password?: string;
    realname?: string;
    firstname?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    profiles_id?: number;
    entities_id?: number;
    is_active?: number;
  }) {
    return this.createItem('User', user);
  }

  async updateUser(id: number, updates: Partial<GlpiUser>) {
    return this.updateItem('User', id, updates);
  }

  async getGroups(options: ListOptions = {}) {
    return this.getItems<GlpiGroup>('Group', options);
  }
  async getGroup(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiGroup>('Group', id, options);
  }
  async createGroup(group: {
    name: string;
    comment?: string;
    entities_id?: number;
    is_recursive?: number;
    is_requester?: number;
    is_assign?: number;
    is_notify?: number;
  }) {
    return this.createItem('Group', group);
  }
  async addUserToGroup(
    userId: number,
    groupId: number,
    isManager: boolean = false
  ): Promise<{ id: number }> {
    const { data } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Administration/Group/${groupId}/User`,
      {
        method: 'POST',
        json: {
          users_id: userId,
          is_manager: isManager ? 1 : 0,
        },
      }
    );
    return { id: (Array.isArray(data) ? data[0]?.id : data?.id) ?? 0 };
  }

  async getComputers(options: ListOptions = {}) {
    return this.getItems<GlpiComputer>('Computer', options);
  }
  async getComputer(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiComputer>('Computer', id, options);
  }
  async createComputer(computer: Record<string, unknown>) {
    return this.createItem('Computer', computer);
  }
  async updateComputer(id: number, updates: Partial<GlpiComputer>) {
    return this.updateItem('Computer', id, updates);
  }
  async deleteComputer(id: number, force: boolean = false) {
    return this.deleteItem('Computer', id, force);
  }

  async getSoftwares(options: ListOptions = {}) {
    return this.getItems<GlpiSoftware>('Software', options);
  }
  async getSoftware(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiSoftware>('Software', id, options);
  }
  async createSoftware(software: Record<string, unknown>) {
    return this.createItem('Software', software);
  }
  async updateSoftware(id: number, updates: Partial<GlpiSoftware>) {
    return this.updateItem('Software', id, updates);
  }
  async deleteSoftware(id: number, force: boolean = false) {
    return this.deleteItem('Software', id, force);
  }

  async getNetworkEquipments(options: ListOptions = {}) {
    return this.getItems<GlpiNetworkEquipment>('NetworkEquipment', options);
  }
  async getNetworkEquipment(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiNetworkEquipment>('NetworkEquipment', id, options);
  }
  async createNetworkEquipment(equipment: Record<string, unknown>) {
    return this.createItem('NetworkEquipment', equipment);
  }
  async updateNetworkEquipment(id: number, updates: Partial<GlpiNetworkEquipment>) {
    return this.updateItem('NetworkEquipment', id, updates);
  }
  async deleteNetworkEquipment(id: number, force: boolean = false) {
    return this.deleteItem('NetworkEquipment', id, force);
  }

  async getPrinters(options: ListOptions = {}) {
    return this.getItems<GlpiPrinter>('Printer', options);
  }
  async getPrinter(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiPrinter>('Printer', id, options);
  }
  async createPrinter(printer: Record<string, unknown>) {
    return this.createItem('Printer', printer);
  }
  async updatePrinter(id: number, updates: Partial<GlpiPrinter>) {
    return this.updateItem('Printer', id, updates);
  }
  async deletePrinter(id: number, force: boolean = false) {
    return this.deleteItem('Printer', id, force);
  }

  async getMonitors(options: ListOptions = {}) {
    return this.getItems<GlpiMonitor>('Monitor', options);
  }
  async getMonitor(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiMonitor>('Monitor', id, options);
  }
  async updateMonitor(id: number, updates: Partial<GlpiMonitor>) {
    return this.updateItem('Monitor', id, updates);
  }
  async deleteMonitor(id: number, force: boolean = false) {
    return this.deleteItem('Monitor', id, force);
  }

  async getPhones(options: ListOptions = {}) {
    return this.getItems<GlpiPhone>('Phone', options);
  }
  async getPhone(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiPhone>('Phone', id, options);
  }
  async updatePhone(id: number, updates: Partial<GlpiPhone>) {
    return this.updateItem('Phone', id, updates);
  }
  async deletePhone(id: number, force: boolean = false) {
    return this.deleteItem('Phone', id, force);
  }

  async getKnowbaseItems(options: ListOptions = {}) {
    return this.getItems<GlpiKnowbaseItem>('KnowbaseItem', options);
  }
  async getKnowbaseItem(id: number, options: GetOptions = {}) {
    return this.getItem<GlpiKnowbaseItem>('KnowbaseItem', id, options);
  }
  async createKnowbaseItem(item: {
    name: string;
    answer: string;
    is_faq?: number;
    knowbaseitemcategories_id?: number;
  }) {
    return this.createItem('KnowbaseItem', item);
  }

  async searchKnowbase(query: string, limit: number = 50): Promise<GlpiKnowbaseItem[]> {
    const fieldId = (await this.searchOptions.resolveField('KnowbaseItem', 'name')) ?? 'name';
    const result = await this.search.search<GlpiKnowbaseItem>('KnowbaseItem', {
      criteria: [{ field: fieldId, searchtype: 'contains', value: query }],
      limit,
      expandDropdowns: true,
    });
    return result.data;
  }

  async getContracts(options: ListOptions = {}) { return this.getItems<GlpiContract>('Contract', options); }
  async getContract(id: number, options: GetOptions = {}) { return this.getItem<GlpiContract>('Contract', id, options); }
  async createContract(contract: Record<string, unknown>) { return this.createItem('Contract', contract); }

  async getSuppliers(options: ListOptions = {}) { return this.getItems<GlpiSupplier>('Supplier', options); }
  async getSupplier(id: number, options: GetOptions = {}) { return this.getItem<GlpiSupplier>('Supplier', id, options); }
  async createSupplier(supplier: Record<string, unknown>) { return this.createItem('Supplier', supplier); }

  async getLocations(options: ListOptions = {}) { return this.getItems<GlpiLocation>('Location', options); }
  async getLocation(id: number, options: GetOptions = {}) { return this.getItem<GlpiLocation>('Location', id, options); }
  async createLocation(location: Record<string, unknown>) { return this.createItem('Location', location); }

  async getEntities(options: ListOptions = {}) { return this.getItems<GlpiEntity>('Entity', options); }
  async getEntity(id: number, options: GetOptions = {}) { return this.getItem<GlpiEntity>('Entity', id, options); }

  async getProjects(options: ListOptions = {}) { return this.getItems<GlpiProject>('Project', options); }
  async getProject(id: number, options: GetOptions = {}) { return this.getItem<GlpiProject>('Project', id, options); }
  async createProject(project: Record<string, unknown>) { return this.createItem('Project', project); }
  async updateProject(id: number, updates: Partial<GlpiProject>) { return this.updateItem('Project', id, updates); }

  async getDocuments(options: ListOptions = {}) { return this.getItems<GlpiDocument>('Document', options); }
  async getDocument(id: number, options: GetOptions = {}) { return this.getItem<GlpiDocument>('Document', id, options); }

  async getCategories(options: ListOptions = {}) { return this.getItems<GlpiCategory>('ITILCategory', options); }

  async addTicketValidation(
    ticketId: number,
    options: {
      users_id_validate: number;
      comment_submission?: string;
      submission_date?: string;
    }
  ): Promise<{ id: number }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${ticketId}/Timeline/Validation`,
      {
        method: 'POST',
        json: {
          users_id_validate: options.users_id_validate,
          comment_submission: options.comment_submission ?? '',
          submission_date:
            options.submission_date ?? new Date().toISOString().slice(0, 19).replace('T', ' '),
          status: 1,
        },
      }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    return { id: id ?? 0 };
  }

  async setTicketValidationStatus(
    validationId: number,
    status: 2 | 3,
    comment_validation?: string
  ): Promise<boolean> {
    await this.http.request(`TicketValidation/${validationId}`, {
      method: 'PATCH',
      json: {
        id: validationId,
        status,
        comment_validation: comment_validation ?? '',
        validation_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    });
    return true;
  }

  async attachDocumentToTicket(
    ticketId: number,
    documentId: number
  ): Promise<{ id: number }> {
    const { data, headers } = await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${ticketId}/Timeline/Document`,
      {
        method: 'POST',
        json: {
          documents_id: documentId,
        },
      }
    );
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    return { id: id ?? 0 };
  }

  async getTicketSatisfaction(ticketId: number) {
    try {
      const { data } = await this.http.request<Record<string, unknown>>(
        `Assistance/Ticket/${ticketId}`
      );
      const satisfaction = (data as any)?.satisfaction
        ?? (data as any)?.ticketsatisfactions
        ?? (data as any)?.TicketSatisfaction;
      if (satisfaction) return satisfaction;
      return { ticket_id: ticketId, satisfaction: null, note: 'satisfaction data not available in ticket response' };
    } catch {
      return null;
    }
  }

  async linkTickets(parentId: number, childId: number, linkType: number = 1): Promise<{ id: number }> {
    await this.http.request<{ id: number } | Array<{ id: number }>>(
      `Assistance/Ticket/${parentId}`,
      {
        method: 'PATCH',
        json: {
          _linked_tickets: [
            {
              tickets_id_2: childId,
              link: linkType,
            },
          ],
        },
      }
    );
    return { id: parentId };
  }

  async getTicketStats(filters: {
    entity_id?: number;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<{
    total: number;
    new: number;
    processing: number;
    pending: number;
    solved: number;
    closed: number;
  }> {
    const baseCriteria: SearchCriterion[] = [];
    if (filters.entity_id !== undefined) {
      baseCriteria.push({ field: 'entities_id', searchtype: 'equals', value: filters.entity_id, link: 'AND' });
    }
    if (filters.date_from) {
      baseCriteria.push({ field: 'date', searchtype: 'morethan', value: filters.date_from, link: 'AND' });
    }
    if (filters.date_to) {
      baseCriteria.push({ field: 'date', searchtype: 'lessthan', value: filters.date_to, link: 'AND' });
    }

    const counts: Record<string, number> = {};
    for (const [label, statusId] of Object.entries({
      new: 1,
      processing_assigned: 2,
      processing_planned: 3,
      pending: 4,
      solved: 5,
      closed: 6,
    })) {
      const criteria: SearchCriterion[] = [
        { field: 'status', searchtype: 'equals', value: statusId },
        ...baseCriteria.map((c) => ({ ...c, link: 'AND' as const })),
      ];
      counts[label] = await this.search.count('Ticket', criteria);
    }

    const total = await this.search.count('Ticket', baseCriteria);

    return {
      total,
      new: counts.new ?? 0,
      processing: (counts.processing_assigned ?? 0) + (counts.processing_planned ?? 0),
      pending: counts.pending ?? 0,
      solved: counts.solved ?? 0,
      closed: counts.closed ?? 0,
    };
  }

  async getAssetStats(): Promise<{
    computers: number;
    monitors: number;
    printers: number;
    networkEquipments: number;
    phones: number;
    softwares: number;
  }> {
    const [computers, monitors, printers, networkEquipments, phones, softwares] =
      await Promise.all([
        this.search.count('Computer'),
        this.search.count('Monitor'),
        this.search.count('Printer'),
        this.search.count('NetworkEquipment'),
        this.search.count('Phone'),
        this.search.count('Software'),
      ]);
    return { computers, monitors, printers, networkEquipments, phones, softwares };
  }

  async getMyProfiles() {
    const { data } = await this.http.request<unknown>('session');
    return (data as any)?.profiles ?? [];
  }
  async getActiveProfile() {
    const { data } = await this.http.request<unknown>('session');
    return (data as any)?.active_profile ?? data;
  }
  async getMyEntities() {
    const { data } = await this.http.request<unknown>('Session/EntityTree');
    return Array.isArray(data) ? data : [];
  }
  async getFullSession() {
    const { data } = await this.http.request<unknown>('session');
    return data;
  }
}
