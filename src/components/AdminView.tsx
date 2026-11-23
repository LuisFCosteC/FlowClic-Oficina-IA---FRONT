import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Database,
  Pencil,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { ApiSetupStatus } from '../api/types';
import { Agent } from '../types/orbis';
import { MODEL_TIER_META, STATUS_META } from '../data/initialData';
import { AgentCredentialsPanel } from './AgentCredentialsPanel';

type AdminTab =
  | 'db'
  | 'agents'
  | 'project'
  | 'rules'
  | 'limits'
  | 'users'
  | 'audit';

const TABS: Array<{ id: AdminTab; label: string; enabled: boolean }> = [
  { id: 'db', label: 'Conexión BD', enabled: true },
  { id: 'agents', label: 'Agentes', enabled: true },
  { id: 'project', label: 'Proyecto', enabled: false },
  { id: 'rules', label: 'Reglas', enabled: false },
  { id: 'limits', label: 'Límites', enabled: false },
  { id: 'users', label: 'Usuarios', enabled: false },
  { id: 'audit', label: 'Auditoría', enabled: false },
];

const DISABLED_TEXT = 'Disponible tras el login (S06)';

interface AdminViewProps {
  agents: Agent[];
  onOpenCreateAgent: () => void;
  onOpenEditAgent: (agent: Agent) => void;
}

type DbState =
  | { kind: 'loading' }
  | { kind: 'ok'; status: ApiSetupStatus }
  | { kind: 'unreachable' }
  | { kind: 'setup'; message: string }
  | { kind: 'error'; message: string };

const yesNo = (v: boolean | undefined): string =>
  v === undefined ? 'No disponible' : v ? 'Sí' : 'No';

export const AdminView: React.FC<AdminViewProps> = ({
  agents,
  onOpenCreateAgent,
  onOpenEditAgent,
}) => {
  const [tab, setTab] = useState<AdminTab>('db');
  const [db, setDb] = useState<DbState>({ kind: 'loading' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshDb = useCallback(async () => {
    setDb({ kind: 'loading' });
    try {
      setDb({ kind: 'ok', status: await api.setupStatus() });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) setDb({ kind: 'unreachable' });
        else if (err.code === 'SETUP_REQUIRED') setDb({ kind: 'setup', message: err.message });
        else setDb({ kind: 'error', message: err.message });
      } else {
        setDb({ kind: 'error', message: 'Error inesperado.' });
      }
    }
  }, []);

  useEffect(() => {
    if (tab === 'db') void refreshDb();
  }, [tab, refreshDb]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        role="tablist"
        aria-label="Secciones de administración"
        className="flex flex-wrap items-center gap-2 border-b border-slate-800/75 bg-[#0A101C]/80 px-5 py-3.5 lg:px-8"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={!t.enabled}
              disabled={!t.enabled}
              title={t.enabled ? undefined : DISABLED_TEXT}
              onClick={() => setTab(t.id)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                active
                  ? 'border-cyan-500/45 bg-cyan-500/12 text-cyan-200'
                  : t.enabled
                    ? 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200'
                    : 'cursor-not-allowed border-slate-800/80 bg-slate-900/50 text-slate-600'
              }`}
            >
              {t.label}
              {!t.enabled && (
                <span className="ml-2 hidden text-[10px] font-normal text-slate-600 xl:inline">
                  {DISABLED_TEXT}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-5 lg:px-8">
        {tab === 'db' && (
          <section className="max-w-3xl rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Conexión de base de datos
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void refreshDb()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar
              </button>
            </div>

            <div className="mt-4 text-xs">
              {db.kind === 'loading' && <p className="text-slate-500">Consultando la API…</p>}
              {db.kind === 'unreachable' && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  La API no responde. Comprueba que el servidor esté en marcha.
                </p>
              )}
              {db.kind === 'setup' && (
                <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-amber-300">
                  {db.message || 'La API está en modo SETUP: falta configurar la base de datos.'}
                </p>
              )}
              {db.kind === 'error' && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {db.message}
                </p>
              )}
              {db.kind === 'ok' && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
                  <dt className="text-slate-400">Estado</dt>
                  <dd
                    className={
                      db.status.setupRequired ? 'text-amber-400' : 'text-emerald-400'
                    }
                  >
                    {db.status.setupRequired
                      ? 'Configuración inicial pendiente (modo SETUP)'
                      : 'Configurada y operativa'}
                  </dd>
                  <dt className="text-slate-400">Base de datos conectada</dt>
                  <dd className="text-slate-200">
                    {db.status.hasDatabase !== undefined
                      ? yesNo(db.status.hasDatabase)
                      : db.status.setupRequired
                        ? 'No disponible'
                        : 'Sí'}
                  </dd>
                  <dt className="text-slate-400">Administrador creado</dt>
                  <dd className="text-slate-200">
                    {db.status.hasAdmin !== undefined
                      ? yesNo(db.status.hasAdmin)
                      : db.status.setupRequired
                        ? 'No disponible'
                        : 'Sí'}
                  </dd>
                </dl>
              )}
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              La URL y el token de la base de datos se guardan cifrados en el servidor y
              nunca se muestran aquí.
            </p>
          </section>
        )}

        {tab === 'agents' && (
          <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">Agentes</h2>
                <span className="font-mono text-xs text-slate-400">{agents.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenCreateAgent}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear agente
                </button>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-500">
                  Aún no hay agentes. Crea el primero para empezar.
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateAgent}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear primer agente
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Nombre</th>
                      <th className="px-3 py-2.5 font-medium">Rol</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-3 py-2.5 font-medium">Modelo</th>
                      <th className="px-3 py-2.5 font-medium">Proyecto</th>
                      <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {agents.map((a) => {
                      const st = STATUS_META[a.status];
                      const open = expandedId === a.id;
                      return (
                        <React.Fragment key={a.id}>
                          <tr className="text-slate-200">
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: a.color }}
                                />
                                {a.name}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400">{a.title}</td>
                            <td className={`px-3 py-3 ${st.textClass}`}>{st.label}</td>
                            <td className="px-3 py-3 font-mono text-cyan-400">
                              {MODEL_TIER_META[a.modelTier].shortLabel}
                            </td>
                            <td className="px-3 py-3 text-slate-400">{a.project || '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditAgent(a)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  aria-expanded={open}
                                  onClick={() => setExpandedId(open ? null : a.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                                >
                                  {open ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  {open ? 'Ocultar' : 'Gestionar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={6} className="bg-[#080D18]/60 px-5 py-4">
                                <AgentCredentialsPanel agentId={a.id} agentName={a.name} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
