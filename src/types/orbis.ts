import type { AvatarLook, HairStyle } from './agentProfile';
import type {
  AgentLimits,
  AgentModelConfig,
  AgentPermissions,
  RoleType,
} from './agentProfile';
import type { ApiAgent, ApiTicketStatus } from '../api/types';

export type ActiveModule = 'kanban' | 'roadmap' | 'cerebro' | 'colmena3d' | 'admin';

export type AgentStatus =
  | 'working'
  | 'waiting_sheldon'
  | 'idle'
  | 'blocked'
  | 'sleep_quota';

export type ModelTier = 'opus_pro' | 'sonnet_pro' | 'haiku_flash';

export type ModelProvider = 'Claude' | 'Gemini';

export type ModelHealthStatus = 'online' | 'fallback' | 'maintenance';

export type RoutingPolicy = 'balanced' | 'cost_saver' | 'max_precision';

export type TaskStage =
  | 'backlog'
  | 'in_dev'
  | 'senior_review' // IN_SENIOR_REVIEW · REVISIÓN SENIOR
  | 'sheldon_review' // IN_QA · EN QA (la clave se conserva por la vista 3D)
  | 'ceo_approval' // IN_REVIEW · REVISIÓN CTO (ídem)
  | 'completed'
  | 'returned'; // RETURNED · DEVUELTA

export type TaskPriority = 'alta' | 'media' | 'baja';

export interface Agent {
  id: string;
  name: string;
  title: string;
  systemPrompt: string;
  model?: string;
  modelTier?: ModelTier;
  color: string;
  status: AgentStatus;
  ramKb: number;
  currentTask: string;
  project: string;
  tokensSavedToday: number;
  isCTO?: boolean;
  glasses?: boolean;
  hairStyle?: HairStyle;
  /** Apariencia completa (ropa, piel, cabello...). */
  look?: AvatarLook;
  character?: string;
  reportsTo?: string;
  roleType?: RoleType;
  functions?: string[];
  rules?: string[];
  restrictions?: string[];
  permissions?: AgentPermissions;
  modelConfig?: AgentModelConfig;
  limits?: AgentLimits;
  archivedAt?: string | null;
  raw?: ApiAgent;
}

export interface ModelNode {
  id: string;
  provider: ModelProvider;
  name: string;
  tier: ModelTier;
  status: ModelHealthStatus;
  trafficShare: number;
  latencyMs: number;
  costPer1MTokens: number;
  activeRequests: number;
  fallbackTarget?: string;
}

export interface SheldonProposal {
  id: string;
  title: string;
  project: string;
  agentId: string;
  agentName: string;
  model?: string;
  modelTier?: ModelTier;
  category: 'Arquitectura' | 'Despliegue' | 'Seguridad' | 'Datos';
  summary: string;
  sheldonNote: string;
  estimatedTokens: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  linkedTaskId?: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  project: string;
  assigneeId: string;
  model?: string;
  modelTier?: ModelTier;
  stage: TaskStage;
  /** null = "Por definir" (lo decide el CTO). */
  priority: TaskPriority | null;
  kind?: 'REQUEST' | 'TASK';
  parentId?: string;
  projectId?: string;
  requirement?: string;
  estimatedCostUsd: number;
  updatedAt: string;
  /** Estado exacto del ticket en la API (la columna `stage` lo resume). */
  apiStatus?: ApiTicketStatus;
  /** Ticket devuelto (RETURNED): está en la columna En Desarrollo con la etiqueta "Devuelta". */
  returned?: boolean;
}

/** Datos del formulario "Nueva tarea" (pedido del CEO): la API lo asigna sola al CTO. */
export interface NewTaskInput {
  title: string;
  requirement: string;
  projectId: string;
}

/** Edición de un ticket por el CEO. `priority` null = "Por definir". */
export interface EditTaskInput {
  title: string;
  requirement: string;
  priority: TaskPriority | null;
  projectId: string;
}

/** Datos del modal "Crear agente". */
export interface NewAgentInput {
  name: string;
  title: string;
  description: string;
  modelTier: ModelTier;
  color: string;
  glasses: boolean;
  project: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'inicio' | 'revision_sheldon' | 'entrega';
  completed: boolean;
}

export interface ProjectRoadmap {
  id: string;
  name: string;
  client: string;
  color: string;
  startDate: string; // YYYY-MM-DD
  reviewDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number;
  leadAgentId: string;
  milestones: ProjectMilestone[];
}
