import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileText,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import type { ApiRule, ApiRuleSeverity } from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';

const GLOBAL_RESTRICTIONS_LIST: string[] = [
  'Ningún agente hace merge a `main` ni despliega a producción. Eso lo hace solo el CEO.',
  'Ningún agente ve llaves de producción ni archivos `.env`.',
  'Ningún agente contacta clientes ni envía correos.',
  'Solo Sheldon (CTO) puede hablar con el CEO y crear aprobaciones.',
  'Todo agente se detiene (BLOCKED) tras 3 fallos seguidos o al llegar a su tope de costo diario.',
  'Ningún agente puede autoaprobar compuertas ni saltarse las restricciones de seguridad.',
];

interface FormState {
  isOpen: boolean;
  editingId: string | null;
  title: string;
  description: string;
  severity: ApiRuleSeverity;
  enabled: boolean;
  submitting: boolean;
  error?: string;
}

export const RulesPanel: React.FC = () => {
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Crear / Editar
  const [form, setForm] = useState<FormState>({
    isOpen: false,
    editingId: null,
    title: '',
    description: '',
    severity: 'MUST',
    enabled: true,
    submitting: false,
  });

  // Modal Eliminar
  const [deletingRule, setDeletingRule] = useState<ApiRule | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listRules();
      setRules(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar las reglas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const handleToggleEnabled = async (rule: ApiRule) => {
    try {
      const updated = await api.updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIndex];
    newRules[targetIndex] = temp;

    setRules(newRules);

    try {
      const ordered = await api.reorderRules(newRules.map((r) => r.id));
      setRules(ordered);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
      await fetchRules();
    }
  };

  const openCreateModal = () => {
    setForm({
      isOpen: true,
      editingId: null,
      title: '',
      description: '',
      severity: 'MUST',
      enabled: true,
      submitting: false,
      error: undefined,
    });
  };

  const openEditModal = (rule: ApiRule) => {
    setForm({
      isOpen: true,
      editingId: rule.id,
      title: rule.title,
      description: rule.description,
      severity: rule.severity,
      enabled: rule.enabled,
      submitting: false,
      error: undefined,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = form.title.trim();
    const trimmedDesc = form.description.trim();

    if (!trimmedTitle) {
      setForm((p) => ({ ...p, error: 'El título de la regla es obligatorio.' }));
      return;
    }
    if (trimmedTitle.length > 200) {
      setForm((p) => ({ ...p, error: 'El título no puede superar 200 caracteres.' }));
      return;
    }
    if (trimmedDesc.length > 2000) {
      setForm((p) => ({ ...p, error: 'La descripción no puede superar 2000 caracteres.' }));
      return;
    }

    setForm((p) => ({ ...p, submitting: true, error: undefined }));

    try {
      if (form.editingId) {
        await api.updateRule(form.editingId, {
          title: trimmedTitle,
          description: trimmedDesc,
          severity: form.severity,
          enabled: form.enabled,
        });
      } else {
        await api.createRule({
          title: trimmedTitle,
          description: trimmedDesc,
          severity: form.severity,
          enabled: form.enabled,
        });
      }
      setForm((p) => ({ ...p, isOpen: false }));
      await fetchRules();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar la regla.';
      setForm((p) => ({ ...p, submitting: false, error: msg }));
    }
  };

  const confirmDelete = async () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteRule(deletingRule.id);
      setDeletingRule(null);
      await fetchRules();
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Error al eliminar la regla.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (error && rules.length === 0 && !loading) {
    return (
      <section className="space-y-6">
        <AdminErrorCard message={error} onRetry={() => void fetchRules()} />
        {/* Sección Restricciones Globales Inviolables */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
          <div className="flex items-center gap-2.5 text-amber-300">
            <Lock className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Restricciones Globales Inviolables ({GLOBAL_RESTRICTIONS_LIST.length} bloqueadas con candado)
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {GLOBAL_RESTRICTIONS_LIST.map((text, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-[#070B14]/80 p-3 text-xs text-amber-100/90"
              >
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>
                  <strong className="text-amber-400">{idx + 1}.</strong> {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Sección Reglas Configurables */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Scale className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Reglas del Proyecto ({rules.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchRules()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir regla
            </button>
          </div>
        </div>

        {error && (
          <div className="m-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Cargando reglas del proyecto…
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">
              No hay reglas personalizadas creadas aún. Añade la primera regla para guiar el comportamiento de los agentes.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir primera regla
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {rules.map((rule, idx) => {
              const isMust = rule.severity === 'MUST';
              return (
                <div
                  key={rule.id}
                  className={`flex items-start justify-between gap-4 p-4 transition-colors ${
                    !rule.enabled ? 'opacity-60 bg-slate-950/20' : ''
                  }`}
                >
                  {/* Flechas de Ordenación */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => void handleMove(idx, 'up')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Subir posición"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[10px] text-slate-500">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === rules.length - 1}
                      onClick={() => void handleMove(idx, 'down')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Bajar posición"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Detalle de la Regla */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-xs font-semibold ${
                          rule.enabled ? 'text-slate-100' : 'text-slate-400 line-through'
                        }`}
                      >
                        {rule.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                          isMust
                            ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                            : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        {isMust ? 'OBLIGATORIA (MUST)' : 'RECOMENDADA (SHOULD)'}
                      </span>
                    </div>

                    {rule.description && (
                      <p className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">
                        {rule.description}
                      </p>
                    )}
                  </div>

                  {/* Acciones e Interruptor Activa */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => void handleToggleEnabled(rule)}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[11px] text-slate-400">
                        {rule.enabled ? 'Activa' : 'Inactiva'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => openEditModal(rule)}
                      className="rounded-lg border border-slate-700/80 p-1.5 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors"
                      title="Editar regla"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingRule(rule);
                      }}
                      className="rounded-lg border border-rose-900/60 bg-rose-950/20 p-1.5 text-rose-300 hover:border-rose-500/60 hover:bg-rose-900/40 transition-colors"
                      title="Eliminar regla"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6 Restricciones Globales con Candado (Solo Lectura) */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <Lock className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            Restricciones Globales Inviolables (6 restricciones con candado)
          </h3>
          <span className="ml-auto rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            Solo lectura · Aplicadas por la API
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {GLOBAL_RESTRICTIONS_LIST.map((restriction, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 text-xs text-slate-300"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                {idx + 1}
              </div>
              <p className="flex-1 text-slate-300">{restriction}</p>
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Crear / Editar Regla */}
      {form.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">
                {form.editingId ? 'Editar regla' : 'Añadir nueva regla'}
              </h3>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isOpen: false }))}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              {form.error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {form.error}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300">
                  Título de la regla
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="ej. Todo código nuevo debe incluir pruebas unitarias"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Descripción / Instrucciones detalladas
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detalles sobre cuándo y cómo aplica esta regla…"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Severidad de la regla
                </label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, severity: e.target.value as ApiRuleSeverity }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="MUST">OBLIGATORIA (MUST)</option>
                  <option value="SHOULD">RECOMENDADA (SHOULD)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rule-enabled-checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="rule-enabled-checkbox" className="text-slate-300 cursor-pointer">
                  Activa (se incluye en las directivas de los agentes)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isOpen: false }))}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={form.submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 font-semibold text-slate-950 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {form.submitting ? 'Guardando…' : form.editingId ? 'Guardar cambios' : 'Crear regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar Regla (sin window.confirm) */}
      {deletingRule && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  ¿Eliminar regla?
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Estás a punto de eliminar la regla «<span className="font-semibold text-slate-200">{deletingRule.title}</span>».
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingRule(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar regla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
