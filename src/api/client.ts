import { API_URL, CONFIG_ERROR } from './config';
import type {
  ApiAgent,
  ApiAgentCreate,
  ApiAgentStatus,
  ApiAgentUpdate,
  ApiModelInfo,
  ApiProjectSettings,
  ApiLimitsSettings,
  ApiAuditEntry,
  ApiAuditFilters,
  ApiAdminUser,
  ApiUserCreate,
  ApiUserUpdate,
  ApiDbInfo,
  ApiDbTestResult,
  ApiDbBackupResult,
  ApiRule,
  ApiRuleCreate,
  ApiRuleUpdate,
  ApiSetupStatus,
  ApiSnapshot,
  ApiTicket,
  ApiProject,
  ApiProjectCreate,
  ApiProjectUpdate,
  ApiRequestCreate,
  ApiTicketStatus,
  ApiWorkspace,
  ApiWorkspaceBody,
  ApiWorkspaceCheck,
  KeyCreate,
  KeyTestResult,
  KeyUpdate,
  ProviderKey,
} from './types';

/** Error de la API (`{error:{code,message}}`) o de red (`code: 'NETWORK'`, `status: 0`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Error al comunicar con la API.'
): string {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.code === 'NETWORK') {
      return 'No se pudo conectar con la API (¿está arrancada en el puerto 4000?)';
    }
    return err.message;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed') ||
      msg.includes('connection') ||
      msg.includes('api no responde') ||
      msg.includes('puerto 4000')
    ) {
      return 'No se pudo conectar con la API (¿está arrancada en el puerto 4000?)';
    }
    return err.message;
  }
  return fallback;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  if (CONFIG_ERROR) throw new ApiError(0, 'CONFIG', CONFIG_ERROR);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      'No se pudo conectar con la API (¿está arrancada en el puerto 4000?)'
    );
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? `Error ${res.status} de la API.`
    );
  }
  return data as T;
}

export const api = {
  setupStatus: () => request<ApiSetupStatus>('GET', '/api/setup/status'),
  snapshot: () => request<ApiSnapshot>('GET', '/api/snapshot'),

  listAgents: (includeArchived = false) =>
    request<ApiAgent[]>('GET', `/api/agents${includeArchived ? '?includeArchived=true' : ''}`),
  createAgent: (body: ApiAgentCreate) => request<ApiAgent>('POST', '/api/agents', body),
  updateAgent: (id: string, body: ApiAgentUpdate) =>
    request<ApiAgent>('PATCH', `/api/agents/${encodeURIComponent(id)}`, body),
  archiveAgent: (id: string) =>
    request<ApiAgent>('POST', `/api/agents/${encodeURIComponent(id)}/archive`),
  restoreAgent: (id: string) =>
    request<ApiAgent>('POST', `/api/agents/${encodeURIComponent(id)}/restore`),
  setAgentStatus: (id: string, status: ApiAgentStatus) =>
    request<ApiAgent>('PATCH', `/api/agents/${encodeURIComponent(id)}/status`, { status }),

  listRules: () => request<ApiRule[]>('GET', '/api/admin/rules'),
  createRule: (body: ApiRuleCreate) => request<ApiRule>('POST', '/api/admin/rules', body),
  updateRule: (id: string, body: ApiRuleUpdate) =>
    request<ApiRule>('PATCH', `/api/admin/rules/${encodeURIComponent(id)}`, body),
  deleteRule: (id: string) =>
    request<void>('DELETE', `/api/admin/rules/${encodeURIComponent(id)}`),
  reorderRules: (ids: string[]) =>
    request<ApiRule[]>('PUT', '/api/admin/rules/order', { ids }),
  listModels: () => request<ApiModelInfo[]>('GET', '/api/models'),
  listWorkspaces: () => request<ApiWorkspace[]>('GET', '/api/admin/workspaces'),
  getProjectSettings: () =>
    request<ApiProjectSettings>('GET', '/api/admin/settings/project'),
  updateProjectSettings: (body: ApiProjectSettings) =>
    request<ApiProjectSettings>('PUT', '/api/admin/settings/project', body),
  getLimitsSettings: () =>
    request<ApiLimitsSettings>('GET', '/api/admin/settings/limits'),
  updateLimitsSettings: (body: ApiLimitsSettings) =>
    request<ApiLimitsSettings>('PUT', '/api/admin/settings/limits', body),
  upsertWorkspace: (id: string, body: ApiWorkspaceBody) =>
    request<ApiWorkspace>('PUT', `/api/admin/workspaces/${encodeURIComponent(id)}`, body),
  deleteWorkspace: (id: string) =>
    request<void>('DELETE', `/api/admin/workspaces/${encodeURIComponent(id)}`),
  checkWorkspace: (id: string) =>
    request<ApiWorkspaceCheck>('POST', `/api/admin/workspaces/${encodeURIComponent(id)}/check`),
  listAudit: (filters?: ApiAuditFilters) => {
    const params = new URLSearchParams();
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.action) params.set('action', filters.action);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const q = params.toString();
    return request<ApiAuditEntry[]>('GET', `/api/admin/audit${q ? `?${q}` : ''}`);
  },
  listUsers: () => request<ApiAdminUser[]>('GET', '/api/admin/users'),
  createUser: (body: ApiUserCreate) =>
    request<ApiAdminUser>('POST', '/api/admin/users', body),
  updateUser: (id: string, body: ApiUserUpdate) =>
    request<ApiAdminUser>('PATCH', `/api/admin/users/${encodeURIComponent(id)}`, body),

  getDbInfo: () => request<ApiDbInfo>('GET', '/api/admin/db'),
  testDbConnection: (body: { url: string; authToken?: string }) =>
    request<ApiDbTestResult>('POST', '/api/admin/db/test', body),
  updateDbConnection: (body: { url: string; authToken?: string }) =>
    request<ApiDbInfo>('PUT', '/api/admin/db', body),
  createBackup: () => request<ApiDbBackupResult>('POST', '/api/admin/backup'),

  createTicket: (body: ApiRequestCreate) => request<ApiTicket>('POST', '/api/tickets', body),
  transitionTicket: (id: string, to: ApiTicketStatus) =>
    request<ApiTicket>('POST', `/api/tickets/${encodeURIComponent(id)}/transition`, { to }),

  listProjects: (includeArchived = false) =>
    request<ApiProject[]>(
      'GET',
      `/api/admin/projects${includeArchived ? '?includeArchived=true' : ''}`
    ),
  createProject: (body: ApiProjectCreate) =>
    request<ApiProject>('POST', '/api/admin/projects', body),
  updateProject: (id: string, body: ApiProjectUpdate) =>
    request<ApiProject>('PATCH', `/api/admin/projects/${encodeURIComponent(id)}`, body),
  archiveProject: (id: string) =>
    request<ApiProject>('POST', `/api/admin/projects/${encodeURIComponent(id)}/archive`),
  restoreProject: (id: string) =>
    request<ApiProject>('POST', `/api/admin/projects/${encodeURIComponent(id)}/restore`),

  // Bolsa global de claves API (KEY01). La clave nunca vuelve del servidor: solo `last4`.
  listKeys: () => request<ProviderKey[]>('GET', '/api/admin/keys'),
  createKey: (body: KeyCreate) => request<ProviderKey>('POST', '/api/admin/keys', body),
  updateKey: (id: string, body: KeyUpdate) =>
    request<ProviderKey>('PATCH', `/api/admin/keys/${encodeURIComponent(id)}`, body),
  reorderKeys: (ids: string[]) => request<ProviderKey[]>('PUT', '/api/admin/keys/order', { ids }),
  revokeKey: (id: string) => request<void>('DELETE', `/api/admin/keys/${encodeURIComponent(id)}`),
  reactivateKey: (id: string) =>
    request<ProviderKey>('POST', `/api/admin/keys/${encodeURIComponent(id)}/reactivate`),
  testKey: (id: string) =>
    request<KeyTestResult>('POST', `/api/admin/keys/${encodeURIComponent(id)}/test`),
};
