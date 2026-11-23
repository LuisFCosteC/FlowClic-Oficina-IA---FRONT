import React, { useState } from 'react';
import { Database, Plus, Users } from 'lucide-react';
import { Agent } from '../types/orbis';
import { MODEL_TIER_META, STATUS_META } from '../data/initialData';

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
}

export const AdminView: React.FC<AdminViewProps> = ({
  agents,
  onOpenCreateAgent,
}) => {
  const [tab, setTab] = useState<AdminTab>('db');

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
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Conexión de base de datos
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Estado de la conexión (modo local o remoto, host y versión de
              esquema): <span className="text-amber-400">pendiente de C04</span>.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              La URL y el token de la base de datos se guardan cifrados en el
              servidor y nunca se muestran aquí.
            </p>
          </section>
        )}

        {tab === 'agents' && (
          <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Agentes
                </h2>
                <span className="font-mono text-xs text-slate-400">
                  {agents.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenCreateAgent}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear agente
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aún no hay agentes. Crea el primero para empezar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Nombre</th>
                      <th className="px-3 py-2.5 font-medium">Rol</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-3 py-2.5 font-medium">Modelo</th>
                      <th className="px-3 py-2.5 font-medium">Proyecto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {agents.map((a) => {
                      const st = STATUS_META[a.status];
                      return (
                        <tr key={a.id} className="text-slate-200">
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: a.color }}
                              />
                              {a.name}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {a.title}
                          </td>
                          <td className={`px-3 py-3 ${st.textClass}`}>
                            {st.label}
                          </td>
                          <td className="px-3 py-3 font-mono text-cyan-400">
                            {MODEL_TIER_META[a.modelTier].shortLabel}
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {a.project}
                          </td>
                        </tr>
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
