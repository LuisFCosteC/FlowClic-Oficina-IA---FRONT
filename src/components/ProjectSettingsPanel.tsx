import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
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
    <section className="max-w-2xl rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
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
  );
};
