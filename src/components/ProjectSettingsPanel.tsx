import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { API_URL } from '../api/config';
import type { ApiProjectSettings } from '../api/types';

interface FieldErrors {
  companyName?: string;
  projectName?: string;
  description?: string;
  goals?: string;
  stack?: string;
  general?: string;
}

export const ProjectSettingsPanel: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [stack, setStack] = useState<string[]>([]);

  // Inputs para añadir
  const [newGoal, setNewGoal] = useState('');
  const [newStackItem, setNewStackItem] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const fetchProjectSettings = useCallback(async () => {
    setLoading(true);
    setErrors({});
    try {
      const data = await api.getProjectSettings();
      setCompanyName(data.companyName ?? '');
      setProjectName(data.projectName ?? '');
      setDescription(data.description ?? '');
      setGoals(data.goals ?? []);
      setStack(data.stack ?? []);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: 'Error al cargar la configuración del proyecto.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjectSettings();
  }, [fetchProjectSettings]);

  // Actualización en vivo mediante SSE (settings.updated)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      es.addEventListener('settings.updated', (e) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data as string) as {
            key: string;
            value: ApiProjectSettings;
          };
          if (payload && payload.key === 'project' && payload.value) {
            setCompanyName(payload.value.companyName ?? '');
            setProjectName(payload.value.projectName ?? '');
            setDescription(payload.value.description ?? '');
            setGoals(payload.value.goals ?? []);
            setStack(payload.value.stack ?? []);
          }
        } catch {
          // Ignorar eventos con formato inesperado
        }
      });
    } catch {
      // Ignorar fallo de conexión SSE
    }

    return () => {
      es?.close();
    };
  }, []);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGoal.trim();
    if (!trimmed) return;
    if (goals.length >= 20) {
      setErrors((prev) => ({ ...prev, goals: 'Máximo 20 objetivos permitidos.' }));
      return;
    }
    if (trimmed.length > 200) {
      setErrors((prev) => ({
        ...prev,
        goals: 'Cada objetivo puede tener como máximo 200 caracteres.',
      }));
      return;
    }
    setGoals((prev) => [...prev, trimmed]);
    setNewGoal('');
    setErrors((prev) => ({ ...prev, goals: undefined }));
  };

  const handleRemoveGoal = (index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGoal = (index: number, val: string) => {
    setGoals((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleAddStack = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStackItem.trim();
    if (!trimmed) return;
    if (stack.length >= 30) {
      setErrors((prev) => ({ ...prev, stack: 'Máximo 30 tecnologías permitidas.' }));
      return;
    }
    if (trimmed.length > 60) {
      setErrors((prev) => ({
        ...prev,
        stack: 'Cada tecnología puede tener como máximo 60 caracteres.',
      }));
      return;
    }
    if (stack.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewStackItem('');
      return;
    }
    setStack((prev) => [...prev, trimmed]);
    setNewStackItem('');
    setErrors((prev) => ({ ...prev, stack: undefined }));
  };

  const handleRemoveStack = (item: string) => {
    setStack((prev) => prev.filter((s) => s !== item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaveSuccess(false);

    // Validaciones locales
    const newErrors: FieldErrors = {};
    if (companyName.length > 120) {
      newErrors.companyName = 'El nombre de la empresa no puede superar 120 caracteres.';
    }
    if (projectName.length > 120) {
      newErrors.projectName = 'El nombre del proyecto no puede superar 120 caracteres.';
    }
    if (description.length > 2000) {
      newErrors.description = 'La descripción no puede superar 2000 caracteres.';
    }
    if (goals.length > 20) {
      newErrors.goals = 'Máximo 20 objetivos permitidos.';
    }
    if (stack.length > 30) {
      newErrors.stack = 'Máximo 30 tecnologías en el stack.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await api.updateProjectSettings({
        companyName,
        projectName,
        description,
        goals,
        stack,
      });
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: 'Error inesperado al guardar los datos.' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-4xl space-y-5">
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Configuración del Proyecto
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void fetchProjectSettings()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {errors.general && (
          <div className="m-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {errors.general}
          </div>
        )}

        {saveSuccess && (
          <div className="m-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Los datos del proyecto se han guardado correctamente y actualizado en vivo.
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Cargando datos del proyecto…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
            {/* Empresa y Proyecto */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block font-medium text-slate-300">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="ej. FlowClic Innovations"
                  className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  {errors.companyName ? (
                    <span className="text-rose-400">{errors.companyName}</span>
                  ) : (
                    <span>Máximo 120 caracteres</span>
                  )}
                  <span>{companyName.length}/120</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Nombre del proyecto
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="ej. Oficina IA - Plataforma de Agentes"
                  className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  {errors.projectName ? (
                    <span className="text-rose-400">{errors.projectName}</span>
                  ) : (
                    <span>Máximo 120 caracteres</span>
                  )}
                  <span>{projectName.length}/120</span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-medium text-slate-300">
                Descripción del proyecto
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el propósito general y el alcance del proyecto…"
                className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-y"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                {errors.description ? (
                  <span className="text-rose-400">{errors.description}</span>
                ) : (
                  <span>Máximo 2000 caracteres</span>
                )}
                <span>{description.length}/2000</span>
              </div>
            </div>

            {/* Objetivos (lista editable) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Target className="h-4 w-4 text-cyan-400" />
                  Objetivos del proyecto ({goals.length}/20)
                </label>
              </div>

              {errors.goals && (
                <p className="mt-1 text-[11px] text-rose-400">{errors.goals}</p>
              )}

              {/* Lista de objetivos existentes */}
              <div className="mt-2 space-y-2">
                {goals.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      maxLength={200}
                      value={g}
                      onChange={(e) => handleUpdateGoal(idx, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(idx)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
                      title="Eliminar objetivo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Input para nuevo objetivo */}
              {goals.length < 20 && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={200}
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGoal(e);
                      }
                    }}
                    placeholder="Añadir nuevo objetivo (pulsa Enter)…"
                    className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir
                  </button>
                </div>
              )}
            </div>

            {/* Stack Tecnológico (chips) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  Stack Tecnológico ({stack.length}/30)
                </label>
              </div>

              {errors.stack && (
                <p className="mt-1 text-[11px] text-rose-400">{errors.stack}</p>
              )}

              {/* Chips existentes */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStack(item)}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Input para añadir al stack */}
              {stack.length < 30 && (
                <div className="mt-3 flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    maxLength={60}
                    value={newStackItem}
                    onChange={(e) => setNewStackItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStack(e);
                      }
                    }}
                    placeholder="ej. Python, FastAPI, React…"
                    className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddStack}
                    className="flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir
                  </button>
                </div>
              )}
            </div>

            {/* Botón Guardar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-2.5 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
