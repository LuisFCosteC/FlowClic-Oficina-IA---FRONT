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
  | 'IN_SENIOR_REVIEW'
  | 'IN_QA'
  | 'IN_REVIEW'
  | 'DONE'
  | 'RETURNED';

export type ApiTicketKind = 'REQUEST' | 'TASK';
export type ApiPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiModelTier = 'opus_pro' | 'sonnet_pro' | 'haiku_flash';
export type ApiRoleType = 'CTO' | 'DEV_BACKEND' | 'DEV_FRONTEND' | 'QA' | 'CUSTOM';
export type ApiApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApiApprovalCategory =
  | 'Arquitectura'
  | 'Despliegue'
  | 'Seguridad'
  | 'Datos';

export interface ApiModelInfo {
  id: string;
  label: string;
  provider: string;
  apiModel?: string;
  hasConnection: boolean;
}

export type ApiWorkspaceKind = 'api' | 'front' | 'docs' | 'mobile' | 'other';

export interface ApiWorkspace {
  id: string;
  name: string;
  path: string;
  projectId?: string | null;
  kind?: ApiWorkspaceKind;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiWorkspaceCheck {
  exists: boolean;
  isDir: boolean;
  writable: boolean;
}

export interface ApiWorkspaceBody {
  name: string;
  path: string;
  /** Lo que no se envía se conserva; `null` deja el espacio sin proyecto. */
  projectId?: string | null;
  kind?: ApiWorkspaceKind;
}

export type ApiProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface ApiProject {
  id: string;
  name: string;
  description: string;
  goals: string[];
  stack: string[];
  status: ApiProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProjectCreate {
  id: string;
  name: string;
  description?: string;
  goals?: string[];
  stack?: string[];
}

export interface ApiProjectUpdate {
  name?: string;
  description?: string;
  goals?: string[];
  stack?: string[];
}

export interface ApiProjectSettings {
  companyName: string;
  projectName: string;
  description: string;
  goals: string[];
  stack: string[];
}

export interface ApiLimitsSettings {
  maxAgents: number;
  maxActiveTicketsPerAgent: number;
  requireApprovalForDone: boolean;
}

export interface ApiAuditEntry {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface ApiAuditFilters {
  limit?: number;
  action?: string;
  from?: string;
  to?: string;
}

export type ApiUserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface ApiAdminUser {
  id: string;
  email: string;
  displayName: string;
  role: ApiUserRole;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUserCreate {
  email: string;
  displayName: string;
  role: ApiUserRole;
  password: string;
}

export interface ApiUserUpdate {
  displayName?: string;
  role?: ApiUserRole;
  disabled?: boolean;
}

export interface ApiDbInfo {
  mode: 'local' | 'remote';
  host: string;
  connected: boolean;
  schemaVersion: number;
  hasToken: boolean;
  lastBackupAt: string | null;
}

export interface ApiDbTestResult {
  ok: boolean;
  mode: 'local' | 'remote';
  host: string;
  schemaVersion: number | null;
  willCreate: boolean;
}

export interface ApiDbBackupResult {
  folder: string;
  tables: Record<string, number>;
  createdAt: string;
}

export type ApiRuleSeverity = 'MUST' | 'SHOULD';

export interface ApiRule {
  id: string;
  title: string;
  description: string;
  severity: ApiRuleSeverity;
  enabled: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRuleCreate {
  title: string;
  description?: string;
  severity?: ApiRuleSeverity;
  enabled?: boolean;
}

export interface ApiRuleUpdate {
  title?: string;
  description?: string;
  severity?: ApiRuleSeverity;
  enabled?: boolean;
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
  reportsTo?: string | null;
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
  /** null = "Por definir" (lo decide el CTO). */
  priority: ApiPriority | null;
  assignedAgentId: string | null;
  projectId?: string | null;
  /** Nombre del proyecto (solo lectura). */
  project: string | null;
  modelTier: ApiModelTier;
  /** null = "Por definir". */
  model?: string | null;
  kind?: ApiTicketKind;
  parentTicketId?: string | null;
  requirement?: string;
  priorityLabel?: string;
  modelLabel?: string;
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
  projects?: ApiProject[];
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
  /** id del agente al que reporta; null = el CEO. */
  reportsTo?: string | null;
}

export type ApiAgentUpdate = Partial<ApiAgentCreate>;

/** Pedido del CEO: lo recibe el CTO; prioridad y modelo los decide él. */
export interface ApiRequestCreate {
  title: string;
  requirement: string;
  projectId: string;
}

export type KeyProvider = 'google' | 'anthropic' | 'openai' | 'other';
export type KeyStatus = 'ACTIVE' | 'REVOKED' | 'INVALID';
export type ComputedKeyStatus = 'ACTIVE' | 'IN_USE' | 'EXHAUSTED' | 'INVALID' | 'REVOKED';

export interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ModelUsage {
  model: string;
  today: UsageTotals;
  total: UsageTotals;
  exhaustedUntil: string | null;
  lastErrorCode: string | null;
  lastUsedAt: string | null;
}

export interface ExhaustedModel {
  model: string;
  until: string;
}

export interface ProviderKey {
  id: string;
  provider: KeyProvider;
  label: string;
  last4: string;
  position: number;
  status: KeyStatus;
  computedStatus: ComputedKeyStatus;
  statusLabel: string;
  exhaustedUntil: string | null;
  exhaustedModels: ExhaustedModel[];
  dailyRequestLimit: number | null;
  dailyTokenLimit: number | null;
  usageToday: UsageTotals;
  usageTotal: UsageTotals;
  usageByModel: ModelUsage[];
  lastUsedAt: string | null;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
}

export interface KeyCreate {
  provider: KeyProvider;
  label: string;
  secret: string;
}

export interface KeyUpdate {
  label?: string;
  dailyRequestLimit?: number | null;
  dailyTokenLimit?: number | null;
}

export interface KeyTestResult {
  ok: boolean;
  status: 'OK' | 'INVALID_KEY' | 'RATE_LIMITED' | 'ERROR';
  message: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown[] };
}
