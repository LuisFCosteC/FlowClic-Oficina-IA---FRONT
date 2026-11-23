import type {
  AgentLimits,
  AgentModelConfig,
  AgentPermissions,
  HairStyle,
  AvatarLook,
} from '../types/agentProfile';

/** DTOs de la API (PLAN §6 y §19). Todo en camelCase, tal como responde la API. */

/** Avatar tal como lo devuelve/acepta la API: todo lo opcional puede venir como null. */
export type ApiAvatar = { color: string; glasses?: boolean | null; hairStyle?: HairStyle | null } & {
  [K in keyof AvatarLook]?: AvatarLook[K] | null;
};

export type ApiAgentStatus =
  | 'IDLE'
  | 'WORKING'
  | 'REVIEW'
  | 'BLOCKED'
  | 'SLEEP_QUOTA';

export type ApiTicketStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_QA'
  | 'IN_REVIEW'
  | 'DONE'
  | 'RETURNED';

export type ApiPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiModelTier = 'opus_pro' | 'sonnet_pro' | 'haiku_flash';
export type ApiRoleType = 'CTO' | 'DEV_BACKEND' | 'DEV_FRONTEND' | 'QA' | 'CUSTOM';
export type ApiApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApiApprovalCategory =
  | 'Arquitectura'
  | 'Despliegue'
  | 'Seguridad'
  | 'Datos';
export type CredentialProvider = 'anthropic' | 'openai' | 'google' | 'other';

export interface ApiModelInfo {
  id: string;
  label: string;
  provider: string;
  hasConnection: boolean;
}

export interface ApiWorkspace {
  id: string;
  name: string;
  path: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiAgent {
  id: string;
  name: string;
  character: string;
  role: string;
  roleType: ApiRoleType;
  status: ApiAgentStatus;
  avatar: ApiAvatar;
  functions: string[];
  rules: string[];
  restrictions: string[];
  permissions?: AgentPermissions;
  model: AgentModelConfig;
  limits?: AgentLimits;
  systemPrompt: string;
  isCto: boolean;
  currentTask: string | null;
  project: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ApiTicket {
  id: string;
  title: string;
  description: string;
  status: ApiTicketStatus;
  priority: ApiPriority;
  assignedAgentId: string | null;
  project: string | null;
  modelTier: ApiModelTier;
  estimatedCostUsd: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiApproval {
  id: string;
  ticketId: string | null;
  agentId: string | null;
  gate: 1 | 2 | 3 | 4;
  title: string;
  category: ApiApprovalCategory;
  summary: string;
  reviewerNote: string;
  estimatedTokens: number;
  status: ApiApprovalStatus;
  decisionNote: string | null;
  decidedBy: string | null;
  requestedAt: string;
  decidedAt: string | null;
}

export interface ApiSnapshot {
  agents: ApiAgent[];
  tickets: ApiTicket[];
  approvals: ApiApproval[];
  serverTime: string;
}

export interface ApiSetupStatus {
  setupRequired: boolean;
  hasDatabase?: boolean;
  hasAdmin?: boolean;
}

export interface ApiAgentCreate {
  name: string;
  role: string;
  roleType?: ApiRoleType;
  character?: string;
  avatar?: ApiAvatar;
  functions?: string[];
  rules?: string[];
  restrictions?: string[];
  permissions?: AgentPermissions;
  model?: AgentModelConfig;
  limits?: AgentLimits;
  project?: string | null;
}

export type ApiAgentUpdate = Partial<ApiAgentCreate>;

export interface ApiTicketCreate {
  title: string;
  description?: string;
  priority?: ApiPriority;
  assignedAgentId?: string | null;
  project?: string;
  modelTier?: ApiModelTier;
  estimatedCostUsd?: number;
}

export interface ApiLoadTeamResult {
  created: ApiAgent[];
  skipped: string[];
}

/** Metadatos de una conexión API de agente. La clave NUNCA llega al front: solo `last4`. */
export interface ApiCredential {
  id: string;
  agentId: string;
  provider: CredentialProvider;
  label: string;
  last4: string;
  keyVersion: number;
  createdBy: string;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown[] };
}
