import { api } from '../api/client';
import type { ApiModelInfo } from '../api/types';

/**
 * Nombres oficiales de los modelos según el catálogo del servidor (app/domain/models_catalog.py).
 * Se usan como fallback si aún no ha terminado GET /api/models o si la API está desconectada.
 */
export const DEFAULT_MODEL_NAMES: Record<string, string> = {
  'claude-opus-5-5': 'Claude Opus 5.5',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-haiku-5-5': 'Claude Haiku 5.5',
  'gemini-pro': 'Gemini Pro',
  'gemini-flash': 'Gemini Flash',
  // Niveles legacy por compatibilidad
  opus_pro: 'Claude Opus 5.5',
  sonnet_pro: 'Claude Sonnet 5.5',
  haiku_flash: 'Claude Haiku 5.5',
};

const cachedModelMap = new Map<string, string>(Object.entries(DEFAULT_MODEL_NAMES));

export function setModelCatalog(models: ApiModelInfo[]): void {
  for (const m of models) {
    if (m.id && m.label) {
      cachedModelMap.set(m.id, m.label);
    }
  }
}

export function getModelDisplayName(modelIdOrTier?: string | null): string {
  if (!modelIdOrTier) return '—';
  return cachedModelMap.get(modelIdOrTier) ?? DEFAULT_MODEL_NAMES[modelIdOrTier] ?? modelIdOrTier;
}

export async function initModelCatalog(): Promise<void> {
  try {
    const models = await api.listModels();
    if (Array.isArray(models)) {
      setModelCatalog(models);
    }
  } catch {
    // Si la API no está accesible, se preserva el catálogo por defecto
  }
}
