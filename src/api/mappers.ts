import type { AvatarLook } from '../types/agentProfile';
import type {
  Agent,
  AgentStatus,
  KanbanTask,
  ModelTier,
  SheldonProposal,
  TaskPriority,
  TaskStage,
} from '../types/orbis';
import type {
  ApiAgent,
  ApiAgentStatus,
  ApiApproval,
  ApiPriority,
  ApiTicket,
  ApiTicketStatus,
} from './types';

/* ── Estado del agente ─────────────────────────────────────────────────────────────────── */
const AGENT_STATUS_FROM_API: Record<ApiAgentStatus, AgentStatus> = {
  IDLE: 'idle',
  WORKING: 'working',
  REVIEW: 'waiting_sheldon',
  BLOCKED: 'blocked',
  SLEEP_QUOTA: 'sleep_quota',
};

const AGENT_STATUS_TO_API: Record<AgentStatus, ApiAgentStatus> = {
  idle: 'IDLE',
  working: 'WORKING',
  waiting_sheldon: 'REVIEW',
  blocked: 'BLOCKED',
  sleep_quota: 'SLEEP_QUOTA',
};

export const agentStatusFromApi = (s: ApiAgentStatus): AgentStatus =>
  AGENT_STATUS_FROM_API[s] ?? 'idle';
export const agentStatusToApi = (s: AgentStatus): ApiAgentStatus => AGENT_STATUS_TO_API[s];

/* ── Modelo ↔ nivel ────────────────────────────────────────────────────────────────────── */
const TIER_BY_MODEL: Record<string, ModelTier> = {
  'claude-opus-5-5': 'opus_pro',
  'gemini-pro': 'opus_pro',
  'claude-sonnet-5-5': 'sonnet_pro',
  'claude-haiku-5-5': 'haiku_flash',
  'gemini-flash': 'haiku_flash',
};

/** Modelo del catálogo (models_catalog.py) que se registra al elegir un nivel. */
export const MODEL_ID_BY_TIER: Record<ModelTier, string> = {
  opus_pro: 'claude-opus-5-5',
  sonnet_pro: 'claude-sonnet-5-5',
  haiku_flash: 'claude-haiku-5-5',
};

export const tierFromModel = (primary: string): ModelTier =>
  TIER_BY_MODEL[primary] ?? 'sonnet_pro';

/* ── Agente ────────────────────────────────────────────────────────────────────────────── */
export function agentFromApi(a: ApiAgent): Agent {
  const look: AvatarLook = {};
  (['gender', 'skinTone', 'hairColor', 'face', 'topStyle', 'topColor', 'innerColor', 'pantsStyle', 'pantsColor', 'shoeColor'] as const).forEach(
    (k) => {
      const v = a.avatar[k];
      if (v != null) (look as Record<string, unknown>)[k] = v;
    }
  );
  return {
    id: a.id,
    name: a.name,
    title: a.role,
    systemPrompt: a.systemPrompt,
    modelTier: tierFromModel(a.model.primary),
    color: a.avatar.color,
    status: agentStatusFromApi(a.status),
    ramKb: 0, // la API no mide memoria todavía: no se inventa
    currentTask: a.currentTask ?? '',
    project: a.project ?? '',
    tokensSavedToday: 0,
    isCTO: a.isCto,
    glasses: a.avatar.glasses ?? undefined,
    hairStyle: a.avatar.hairStyle ?? undefined,
    look: Object.keys(look).length ? look : undefined,
    character: a.character,
    roleType: a.roleType,
    functions: a.functions,
    rules: a.rules,
    restrictions: a.restrictions,
    permissions: a.permissions,
    modelConfig: a.model,
    limits: a.limits,
    raw: a,
  };
}

/* ── Ticket ↔ columna ──────────────────────────────────────────────────────────────────── */
const STAGE_FROM_TICKET: Record<ApiTicketStatus, TaskStage> = {
  PENDING: 'backlog',
  IN_PROGRESS: 'in_dev',
  RETURNED: 'in_dev',
  IN_QA: 'sheldon_review',
  IN_REVIEW: 'ceo_approval',
  DONE: 'completed',
};

/** Estado de la API al que lleva soltar una tarjeta en cada columna. */
const TICKET_FOR_STAGE: Record<TaskStage, ApiTicketStatus> = {
  backlog: 'PENDING',
  in_dev: 'IN_PROGRESS',
  sheldon_review: 'IN_QA',
  ceo_approval: 'IN_REVIEW',
  completed: 'DONE',
};

export const stageFromTicket = (s: ApiTicketStatus): TaskStage => STAGE_FROM_TICKET[s];

/**
 * Transiciones a pedir a la API para llevar un ticket a una columna.
 * Un ticket RETURNED solo puede ir a IN_PROGRESS (§19.4), así que para llegar a revisión de
 * Sheldon se envía primero IN_PROGRESS y después IN_QA.
 */
export function transitionsForMove(
  current: ApiTicketStatus,
  target: TaskStage
): ApiTicketStatus[] {
  const to = TICKET_FOR_STAGE[target];
  if (current === 'RETURNED' && to === 'IN_QA') return ['IN_PROGRESS', 'IN_QA'];
  return [to];
}

const PRIORITY_FROM_API: Record<ApiPriority, TaskPriority> = {
  HIGH: 'alta',
  MEDIUM: 'media',
  LOW: 'baja',
};
const PRIORITY_TO_API: Record<TaskPriority, ApiPriority> = {
  alta: 'HIGH',
  media: 'MEDIUM',
  baja: 'LOW',
};
export const priorityToApi = (p: TaskPriority): ApiPriority => PRIORITY_TO_API[p];

export function ticketFromApi(t: ApiTicket): KanbanTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    project: t.project ?? '',
    assigneeId: t.assignedAgentId ?? '',
    modelTier: t.modelTier,
    stage: stageFromTicket(t.status),
    priority: PRIORITY_FROM_API[t.priority],
    estimatedCostUsd: t.estimatedCostUsd,
    updatedAt: formatRelative(t.updatedAt),
    apiStatus: t.status,
    returned: t.status === 'RETURNED',
  };
}

/* ── Aprobaciones → propuestas de Cerebro ──────────────────────────────────────────────── */
export function proposalFromApproval(
  a: ApiApproval,
  agentsById: Map<string, Agent>,
  ticketsById: Map<string, KanbanTask>
): SheldonProposal | null {
  if (a.status === 'CANCELLED') return null;
  const agent = a.agentId ? agentsById.get(a.agentId) : undefined;
  const ticket = a.ticketId ? ticketsById.get(a.ticketId) : undefined;
  return {
    id: a.id,
    title: a.title,
    project: ticket?.project ?? '',
    agentId: a.agentId ?? '',
    agentName: agent?.name ?? 'Sin agente',
    modelTier: agent?.modelTier ?? ticket?.modelTier ?? 'sonnet_pro',
    category: a.category,
    summary: a.summary,
    sheldonNote: a.reviewerNote,
    estimatedTokens: a.estimatedTokens,
    timestamp: formatRelative(a.requestedAt),
    status: a.status === 'PENDING' ? 'pending' : a.status === 'APPROVED' ? 'approved' : 'rejected',
    linkedTaskId: a.ticketId ?? undefined,
  };
}

/* ── Fechas ────────────────────────────────────────────────────────────────────────────── */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const secs = Math.max(0, Math.round((now - t) / 1000));
  if (secs < 60) return 'Ahora mismo';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}
