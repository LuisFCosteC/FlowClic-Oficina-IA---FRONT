export type ActiveModule = 'kanban' | 'roadmap' | 'cerebro' | 'colmena3d' | 'admin';

export type AgentStatus = 'working' | 'waiting_sheldon' | 'idle';

export type ModelTier = 'opus_pro' | 'sonnet_pro' | 'haiku_flash';

export type ModelProvider = 'Claude' | 'Gemini';

export type ModelHealthStatus = 'online' | 'fallback' | 'maintenance';

export type RoutingPolicy = 'balanced' | 'cost_saver' | 'max_precision';

export type TaskStage =
  | 'backlog'
  | 'in_dev'
  | 'sheldon_review'
  | 'ceo_approval'
  | 'completed';

export type TaskPriority = 'alta' | 'media' | 'baja';

export interface Agent {
  id: string;
  name: string;
  title: string;
  systemPrompt: string;
  modelTier: ModelTier;
  color: string;
  status: AgentStatus;
  ramKb: number;
  currentTask: string;
  project: string;
  tokensSavedToday: number;
  isCTO?: boolean;
  glasses?: boolean;
  hairStyle?: 'short' | 'long' | 'curly' | 'bun' | 'parted';
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
  modelTier: ModelTier;
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
  modelTier: ModelTier;
  stage: TaskStage;
  priority: TaskPriority;
  estimatedCostUsd: number;
  updatedAt: string;
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
