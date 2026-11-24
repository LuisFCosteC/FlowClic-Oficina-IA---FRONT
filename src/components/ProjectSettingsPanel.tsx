import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { AdminErrorCard } from './AdminErrorCard';

/**
 * Ajustes de la EMPRESA (PRJ01): la API solo guarda `companyName`. Los proyectos
 * (nombre, descripción, objetivos, stack y espacios de trabajo) viven en la pestaña Proyectos.
 */
export const ProjectSettingsPanel: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [purge, setPurge] = useState<'done' | 'all' | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const runPurge = async () => {
    if (!purge) return;
    setPurging(true);
    try {
      const { deleted } = await api.purgeTickets(purge);
      setPurgeMsg({ ok: true, text: `Se borraron ${deleted} tickets. Los agentes siguen intactos.` });
      setPurge(null);
    } catch (err) {
      setPurgeMsg({ ok: false, text: getApiErrorMessage(err, 'No se pudieron borrar los tickets.') });
      setPurge(null);
    } finally {
      setPurging(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await api.getProjectSettings();
      setCompanyName(s.companyName);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'No se pudieron cargar los datos de la empresa.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.updateProjectSettings({
        companyName: companyName.trim(),
        projectName: '',
        description: '',
        goals: [],
        stack: [],
      });
      setCompanyName(res.companyName);
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError && !companyName) return <AdminErrorCard message={loadError} onRetry={() => void load()} />;

  return (
    <div className="max-w-2xl space-y-5">
    <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100">Empresa</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>
      <form onSubmit={(e) => void save(e)} className="space-y-4 p-6 text-xs">
        <p className="text-slate-400">
          Aquí solo va el nombre de la empresa. Los proyectos, con sus objetivos, stack y espacios
          de trabajo, se gestionan en la pestaña <span className="text-slate-200">Proyectos</span>.
        </p>
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
            {error}
          </div>
        )}
        <label className="block font-medium text-slate-300">
          Nombre de la empresa
          <input
            type="text"
            maxLength={120}
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setSaved(false);
            }}
            placeholder="ej. FlowClic Innovations"
            className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-slate-500">{companyName.length}/120</span>
        </label>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Guardado
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-2.5 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </section>

    <section className="rounded-2xl border border-rose-900/50 bg-[#150C12]/80 p-6 text-xs">
      <div className="flex items-center gap-2.5">
        <Trash2 className="h-4 w-4 text-rose-400" />
        <h2 className="text-sm font-semibold text-slate-100">Limpiar tickets</h2>
      </div>
      <p className="mt-2 text-slate-400">
        Borra tickets de prueba junto con sus eventos, aprobaciones y mensajes. Los{' '}
        <span className="text-slate-200">agentes no se tocan</span> (los que quedaban trabajando
        pasan a descansar). No se puede deshacer.
      </p>
      {purgeMsg && (
        <div
          className={`mt-3 rounded-xl border px-3.5 py-2.5 ${
            purgeMsg.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          {purgeMsg.text}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setPurge('done')}
          className="rounded-xl border border-slate-700/80 px-4 py-2 font-medium text-slate-200 hover:border-rose-500/60 hover:text-rose-300"
        >
          Borrar solo los hechos
        </button>
        <button
          type="button"
          onClick={() => setPurge('all')}
          className="rounded-xl border border-rose-800/70 bg-rose-950/30 px-4 py-2 font-medium text-rose-300 hover:bg-rose-900/40"
        >
          Borrar todos los tickets
        </button>
      </div>
    </section>

    {purge && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B132B] p-6 shadow-2xl">
          <h3 className="text-sm font-semibold text-slate-100">
            {purge === 'done' ? '¿Borrar los tickets hechos?' : '¿Borrar TODOS los tickets?'}
          </h3>
          <p className="mt-1.5 text-xs text-slate-400">
            {purge === 'done'
              ? 'Se borrarán los tickets en estado Hecho, con sus eventos, aprobaciones y mensajes.'
              : 'Se borrarán todos los pedidos y subtareas, con sus eventos, aprobaciones y mensajes.'}{' '}
            Los agentes no se borran. Esta acción no se puede deshacer.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={purging}
              onClick={() => setPurge(null)}
              className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={purging}
              onClick={() => void runPurge()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {purging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Sí, borrar
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
