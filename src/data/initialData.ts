import { AgentStatus, ModelNode, ModelTier, TaskStage } from '../types/orbis';

/**
 * Solo metadatos y catálogos. Agentes, tickets y aprobaciones vienen de la API (BD);
 * aquí no hay datos de ejemplo.
 */

/**
 * @deprecated Nivel de modelo antiguo (la API ya no lo usa). Solo etiquetas genéricas, sin
 * nombres de modelos: esos salen de GET /api/models. Se conserva porque la vista 3D lo importa.
 */
export const MODEL_TIER_META: Record<
  ModelTier,
  { label: string; shortLabel: string; claude: string; gemini: string; costHint: string }
> = {
  opus_pro: {
    label: 'Nivel alto',
    shortLabel: 'Alto',
    claude: '',
    gemini: '',
    costHint: 'Razonamiento crítico',
  },
  sonnet_pro: {
    label: 'Nivel medio',
    shortLabel: 'Medio',
    claude: '',
    gemini: '',
    costHint: 'Ingeniería balanceada',
  },
  haiku_flash: {
    label: 'Nivel rápido',
    shortLabel: 'Rápido',
    claude: '',
    gemini: '',
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

/** Los modelos del Cerebro se construyen con GET /api/models (ver App.tsx). */
export const INITIAL_MODELS: ModelNode[] = [];

/** Nodo de modelo del Cerebro a partir del catálogo de la API (métricas a 0 hasta medirlas). */
export function modelNodeFromApi(m: {
  id: string;
  label: string;
  provider: string;
}): ModelNode {
  const id = m.id.toLowerCase();
  const tier: ModelTier =
    id.includes('opus') || id.includes('pro')
      ? 'opus_pro'
      : id.includes('sonnet')
        ? 'sonnet_pro'
        : 'haiku_flash';
  return {
    id: m.id,
    provider: m.provider.toLowerCase().includes('anthropic') ? 'Claude' : 'Gemini',
    name: m.label,
    tier,
    status: 'online',
    trafficShare: 0,
    latencyMs: 0,
    costPer1MTokens: 0,
    activeRequests: 0,
  };
}
