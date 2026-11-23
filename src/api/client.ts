import { API_URL, CONFIG_ERROR } from './config';
import type {
  ApiAgent,
  ApiAgentCreate,
  ApiAgentStatus,
  ApiCredential,
  ApiLoadTeamResult,
  ApiSetupStatus,
  ApiSnapshot,
  ApiTicket,
  ApiTicketCreate,
  ApiTicketStatus,
  CredentialProvider,
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

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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
    throw new ApiError(0, 'NETWORK', 'La API no responde.');
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

  createAgent: (body: ApiAgentCreate) => request<ApiAgent>('POST', '/api/agents', body),
  setAgentStatus: (id: string, status: ApiAgentStatus) =>
    request<ApiAgent>('PATCH', `/api/agents/${encodeURIComponent(id)}/status`, { status }),
  loadBaseTeam: () =>
    request<ApiLoadTeamResult>('POST', '/api/admin/agents/load-base-team'),

  createTicket: (body: ApiTicketCreate) => request<ApiTicket>('POST', '/api/tickets', body),
  transitionTicket: (id: string, to: ApiTicketStatus) =>
    request<ApiTicket>('POST', `/api/tickets/${encodeURIComponent(id)}/transition`, { to }),

  listCredentials: (agentId: string) =>
    request<ApiCredential[]>(
      'GET',
      `/api/admin/agents/${encodeURIComponent(agentId)}/credentials`
    ),
  addCredential: (
    agentId: string,
    body: { provider: CredentialProvider; label: string; secret: string }
  ) =>
    request<ApiCredential>(
      'POST',
      `/api/admin/agents/${encodeURIComponent(agentId)}/credentials`,
      body
    ),
  rotateCredential: (agentId: string, credId: string, secret: string) =>
    request<ApiCredential>(
      'POST',
      `/api/admin/agents/${encodeURIComponent(agentId)}/credentials/${encodeURIComponent(credId)}/rotate`,
      { secret }
    ),
  revokeCredential: (agentId: string, credId: string) =>
    request<void>(
      'DELETE',
      `/api/admin/agents/${encodeURIComponent(agentId)}/credentials/${encodeURIComponent(credId)}`
    ),
};
