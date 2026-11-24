import { api } from '../api/client';
import type { ApiModelInfo } from '../api/types';

/**
 * Nombres de modelos: TODO sale de GET /api/models (app/domain/models_catalog.py).
 * Mientras no haya respuesta se muestra el id tal cual; no hay nombres copiados en el front.
 */
const cachedModelMap = new Map<string, string>();

export function setModelCatalog(models: ApiModelInfo[]): void {
  for (const m of models) {
    if (m.id && m.label) cachedModelMap.set(m.id, m.label);
  }
}

export function getModelDisplayName(modelId?: string | null): string {
  if (!modelId) return '—';
  return cachedModelMap.get(modelId) ?? modelId;
}

export async function initModelCatalog(): Promise<ApiModelInfo[]> {
  try {
    const models = await api.listModels();
    if (Array.isArray(models)) {
      setModelCatalog(models);
      return models;
    }
  } catch {
    // API no accesible: los ids se muestran tal cual hasta el próximo intento
  }
  return [];
}
