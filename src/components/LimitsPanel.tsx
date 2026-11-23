import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Gauge,
  Info,
  Loader2,
  RefreshCw,
  Shield,
  Ticket,
  Users,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { API_URL } from '../api/config';
import type { ApiLimitsSettings } from '../api/types';

interface FieldErrors {
  maxAgents?: string;
  maxActiveTicketsPerAgent?: string;
  general?: string;
}

export const LimitsPanel: React.FC = () => {
  const [maxAgents, setMaxAgents] = useState<number>(20);
  const [maxActiveTicketsPerAgent, setMaxActiveTicketsPerAgent] = useState<number>(3);
  const [requireApprovalForDone, setRequireApprovalForDone] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setErrors({});
    try {
      const data = await api.getLimitsSettings();
      setMaxAgents(data.maxAgents ?? 20);
      setMaxActiveTicketsPerAgent(data.maxActiveTicketsPerAgent ?? 3);
      setRequireApprovalForDone(Boolean(data.requireApprovalForDone));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: 'Error al cargar los límites del sistema.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  // Sincronización en vivo vía SSE (settings.updated)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      es.addEventListener('settings.updated', (e) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data as string) as {
            key: string;
            value: ApiLimitsSettings;
          };
          if (payload && payload.key === 'limits' && payload.value) {
            setMaxAgents(payload.value.maxAgents ?? 20);
            setMaxActiveTicketsPerAgent(payload.value.maxActiveTicketsPerAgent ?? 3);
            setRequireApprovalForDone(Boolean(payload.value.requireApprovalForDone));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaveSuccess(false);

    const newErrors: FieldErrors = {};
    if (isNaN(maxAgents) || maxAgents < 1 || maxAgents > 100) {
      newErrors.maxAgents = 'El máximo de agentes debe ser un número entero entre 1 y 100.';
    }
    if (
      isNaN(maxActiveTicketsPerAgent) ||
      maxActiveTicketsPerAgent < 1 ||
      maxActiveTicketsPerAgent > 100
    ) {
      newErrors.maxActiveTicketsPerAgent =
        'El máximo de tickets activos por agente debe ser un número entre 1 y 100.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await api.updateLimitsSettings({
        maxAgents: Math.round(maxAgents),
        maxActiveTicketsPerAgent: Math.round(maxActiveTicketsPerAgent),
        requireApprovalForDone,
      });
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: 'Error inesperado al guardar los límites.' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-5">
      {/* Aviso de aplicación estricta por la API */}
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 text-xs text-cyan-200">
        <Shield className="h-4 w-4 shrink-0 text-cyan-400" />
        <p>
          <span className="font-semibold text-cyan-100">Regla estricta:</span> La API los
          aplica: si se superan, la acción se rechaza.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Límites Operativos</h2>
          </div>
          <button
            type="button"
            onClick={() => void fetchLimits()}
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
            Los límites se han guardado y rigen inmediatamente en la API.
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Cargando límites…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
            {/* Máximo de agentes activos */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 font-medium text-slate-200">
                    <Users className="h-4 w-4 text-cyan-400" />
                    Máximo de agentes activos
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Límite global de agentes que pueden existir sin archivar. Si se alcanza,
                    la creación o restauración devolverá error 409 LIMIT_EXCEEDED.
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={maxAgents}
                    onChange={(e) => setMaxAgents(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 font-mono text-center text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="block mt-1 text-center text-[10px] text-slate-500">
                    1 a 100
                  </span>
                </div>
              </div>
              {errors.maxAgents && (
                <p className="mt-2 text-[11px] text-rose-400">{errors.maxAgents}</p>
              )}
            </div>

            {/* Máximo de tickets activos por agente */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 font-medium text-slate-200">
                    <Ticket className="h-4 w-4 text-cyan-400" />
                    Máximo de tickets activos por agente
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Límite de tareas en progreso simultáneas por agente (IN_PROGRESS, IN_QA,
                    IN_REVIEW o RETURNED).
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={maxActiveTicketsPerAgent}
                    onChange={(e) =>
                      setMaxActiveTicketsPerAgent(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 font-mono text-center text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="block mt-1 text-center text-[10px] text-slate-500">
                    1 a 100
                  </span>
                </div>
              </div>
              {errors.maxActiveTicketsPerAgent && (
                <p className="mt-2 text-[11px] text-rose-400">
                  {errors.maxActiveTicketsPerAgent}
                </p>
              )}
            </div>

            {/* Exigir aprobación para HECHO */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requireApprovalForDone}
                  onChange={(e) => setRequireApprovalForDone(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <div className="flex-1">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <CheckSquare className="h-4 w-4 text-cyan-400" />
                    Exigir aprobación para HECHO
                  </span>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Si está activado, ningún ticket podrá pasar a la columna HECHO (DONE)
                    sin contar con al menos una compuerta aprobada (APPROVED). De lo
                    contrario, la API rechazará la transición con 409.
                  </p>
                </div>
              </label>
            </div>

            {/* Botón Guardar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-2.5 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar límites
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
