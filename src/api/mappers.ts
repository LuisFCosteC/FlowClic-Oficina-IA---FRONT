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
    model: a.model.primary,
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
    reportsTo: a.reportsTo ?? undefined,
    roleType: a.roleType,
    functions: a.functions,
    rules: a.rules,
    restrictions: a.restrictions,
    permissions: a.permissions,
    modelConfig: a.model,
    limits: a.limits,
    archivedAt: a.archivedAt,
    raw: a,
  };
}

/* ── Ticket ↔ columna ──────────────────────────────────────────────────────────────────── */
const STAGE_FROM_TICKET: Record<ApiTicketStatus, TaskStage> = {
  PENDING: 'backlog',
  IN_PROGRESS: 'in_dev',
  IN_SENIOR_REVIEW: 'senior_review',
  IN_QA: 'sheldon_review',
  IN_REVIEW: 'ceo_approval',
  DONE: 'completed',
  RETURNED: 'returned',
};

const TICKET_FOR_STAGE: Record<TaskStage, ApiTicketStatus> = {
  backlog: 'PENDING',
  in_dev: 'IN_PROGRESS',
  senior_review: 'IN_SENIOR_REVIEW',
  sheldon_review: 'IN_QA',
  ceo_approval: 'IN_REVIEW',
  completed: 'DONE',
  returned: 'RETURNED',
};

/** Columnas del Kanban, en orden. */
export const KANBAN_STAGES: TaskStage[] = [
  'backlog',
  'in_dev',
  'senior_review',
  'sheldon_review',
  'ceo_approval',
  'completed',
  'returned',
];

/** Transiciones válidas del flujo (GM02). La API es la autoridad: esto solo evita ofrecer lo imposible. */
const VALID_NEXT: Record<ApiTicketStatus, ApiTicketStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['IN_SENIOR_REVIEW', 'IN_QA'],
  IN_SENIOR_REVIEW: ['IN_QA', 'RETURNED'],
  IN_QA: ['IN_REVIEW', 'RETURNED'],
  IN_REVIEW: ['DONE', 'RETURNED'],
  DONE: [],
  RETURNED: ['IN_PROGRESS'],
};

export const stageFromTicket = (s: ApiTicketStatus): TaskStage => STAGE_FROM_TICKET[s];
export const ticketStatusForStage = (s: TaskStage): ApiTicketStatus => TICKET_FOR_STAGE[s];

/** Columnas a las que se puede mover un ticket desde su estado actual. */
export const validTargetStages = (current: ApiTicketStatus): TaskStage[] =>
  VALID_NEXT[current].map((s) => STAGE_FROM_TICKET[s]);

export const canMoveTo = (current: ApiTicketStatus, target: TaskStage): boolean =>
  VALID_NEXT[current].includes(TICKET_FOR_STAGE[target]);

const PRIORITY_FROM_API: Record<ApiPriority, TaskPriority> = {
  HIGH: 'alta',
  MEDIUM: 'media',
  LOW: 'baja',
};

export function ticketFromApi(t: ApiTicket): KanbanTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    project: t.project ?? '',
    projectId: t.projectId ?? undefined,
    assigneeId: t.assignedAgentId ?? '',
    model: t.model ?? undefined,
    modelTier: t.modelTier,
    stage: stageFromTicket(t.status),
    priority: t.priority ? PRIORITY_FROM_API[t.priority] : null,
    kind: t.kind ?? 'TASK',
    parentId: t.parentTicketId ?? undefined,
    requirement: t.requirement ?? '',
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
    model: agent?.model ?? agent?.modelConfig?.primary ?? ticket?.model,
    modelTier: ticket?.modelTier,
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
