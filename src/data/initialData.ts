import { AgentStatus, ModelNode, ModelTier, TaskStage } from '../types/orbis';

/**
 * Solo metadatos y catálogos. Agentes, tickets y aprobaciones vienen de la API (BD);
 * aquí no hay datos de ejemplo.
 */

export const MODEL_TIER_META: Record<
  ModelTier,
  { label: string; shortLabel: string; claude: string; gemini: string; costHint: string }
> = {
  opus_pro: {
    label: 'Opus / Gemini Pro',
    shortLabel: 'Opus · Pro',
    claude: 'Claude Opus 5.5',
    gemini: 'Gemini Pro',
    costHint: 'Razonamiento crítico',
  },
  sonnet_pro: {
    label: 'Sonnet / Gemini Pro',
    shortLabel: 'Sonnet · Pro',
    claude: 'Claude Sonnet 5.5',
    gemini: 'Gemini Pro',
    costHint: 'Ingeniería balanceada',
  },
  haiku_flash: {
    label: 'Haiku / Gemini Flash',
    shortLabel: 'Haiku · Flash',
    claude: 'Claude Haiku 5.5',
    gemini: 'Gemini Flash',
    costHint: 'Alta velocidad y ahorro',
  },
};

export const TASK_STAGE_META: Record<
  TaskStage,
  { label: string; shortLabel: string; accent: string }
> = {
  backlog: { label: 'Pendiente', shortLabel: 'Pendiente', accent: '#64748B' },
  in_dev: { label: 'En curso', shortLabel: 'En curso', accent: '#10B981' },
  senior_review: { label: 'Revisión senior', shortLabel: 'Rev. senior', accent: '#A78BFA' },
  sheldon_review: { label: 'En QA', shortLabel: 'QA', accent: '#F59E0B' },
  ceo_approval: { label: 'Revisión CTO', shortLabel: 'Rev. CTO', accent: '#06B6D4' },
  completed: { label: 'Hecho', shortLabel: 'Hecho', accent: '#38BDF8' },
  returned: { label: 'Devuelta', shortLabel: 'Devuelta', accent: '#F43F5E' },
};

export const STATUS_META = {
  working: {
    label: 'Trabajando',
    zoneLabel: 'Laboratorio',
    color: '#10B981',
    textClass: 'text-emerald-400',
  },
  waiting_sheldon: {
    label: 'Esperando a Sheldon',
    zoneLabel: 'Oficina de Sheldon',
    color: '#F59E0B',
    textClass: 'text-amber-400',
  },
  idle: {
    label: 'Descansando',
    zoneLabel: 'Zona de descanso',
    color: '#64748B',
    textClass: 'text-slate-400',
  },
  blocked: {
    label: 'Bloqueado',
    zoneLabel: 'Oficina de Sheldon',
    color: '#F43F5E',
    textClass: 'text-rose-400',
  },
  sleep_quota: {
    label: 'En pausa por cuota',
    zoneLabel: 'Zona de descanso',
    color: '#8B5CF6',
    textClass: 'text-violet-400',
  },
} as const;

/** Descansando: sin trabajo en curso (en reposo o dormido por cuota). */
export const isResting = (s: AgentStatus): boolean => s === 'idle' || s === 'sleep_quota';

/**
 * Catálogo de modelos (app/domain/models_catalog.py). Solo nombres: tráfico, latencia y
 * peticiones activas empiezan en 0 hasta que la API los mida; no hay métricas inventadas.
 */
export const INITIAL_MODELS: ModelNode[] = [
  {
    id: 'claude-opus-5-5',
    provider: 'Claude',
    name: 'Claude Opus 5.5',
    tier: 'opus_pro',
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  },
  {
    id: 'claude-sonnet-5-5',
    provider: 'Claude',
    name: 'Claude Sonnet 5.5',
    tier: 'sonnet_pro',
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  },
  {
    id: 'claude-haiku-5-5',
    provider: 'Claude',
    name: 'Claude Haiku 5.5',
    tier: 'haiku_flash',
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  },
  {
    id: 'gemini-pro',
    provider: 'Gemini',
    name: 'Gemini Pro',
    tier: 'opus_pro',
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  },
  {
    id: 'gemini-flash',
    provider: 'Gemini',
    name: 'Gemini Flash',
    tier: 'haiku_flash',
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  },
];
