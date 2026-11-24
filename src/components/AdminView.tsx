import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import { agentFromApi, formatDate } from '../api/mappers';
import { Agent } from '../types/orbis';
import { STATUS_META } from '../data/initialData';
import { getModelDisplayName } from '../utils/models';
import { AuditPanel } from './AuditPanel';
import { ConnectionsPanel } from './ConnectionsPanel';
import { LimitsPanel } from './LimitsPanel';
import { ProjectSettingsPanel } from './ProjectSettingsPanel';
import { RulesPanel } from './RulesPanel';
import { UsersPanel } from './UsersPanel';
import { WorkspacesPanel } from './WorkspacesPanel';
import { ProjectsPanel } from './ProjectsPanel';
import type { ApiProject } from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';

export type AdminTab =
  | 'agents'
  | 'connections'
  | 'projects'
  | 'workspaces'
  | 'project'
  | 'rules'
  | 'limits'
  | 'users'
  | 'audit';

const TABS: Array<{ id: AdminTab; label: string; enabled: boolean }> = [
  { id: 'agents', label: 'Agentes', enabled: true },
  { id: 'connections', label: 'Conexiones', enabled: true },
  { id: 'projects', label: 'Proyectos', enabled: true },
  { id: 'workspaces', label: 'Espacios de trabajo', enabled: true },
  { id: 'project', label: 'Proyecto', enabled: true },
  { id: 'rules', label: 'Reglas', enabled: true },
  { id: 'limits', label: 'Límites', enabled: true },
  { id: 'users', label: 'Usuarios', enabled: true },
  { id: 'audit', label: 'Auditoría', enabled: true },
];

const DISABLED_TEXT = 'Disponible tras el login (S06)';

export interface AdminViewProps {
  agents: Agent[];
  /** Todos los proyectos (activos y archivados). */
  projects: ApiProject[];
  onProjectChange: (project: ApiProject) => void;
  /** Selector global de proyecto de la cabecera ('all' = todos). */
  projectFilter: string;
  onOpenCreateAgent: () => void;
  onOpenEditAgent: (agent: Agent) => void;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  agents,
  projects,
  onProjectChange,
  projectFilter,
  onOpenCreateAgent,
  onOpenEditAgent,
  initialTab,
  onTabChange,
}) => {
  const [tab, setTab] = useState<AdminTab>(initialTab || 'agents');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const selectTab = (t: AdminTab) => {
    setTab(t);
    onTabChange?.(t);
  };

  // ADM03: Agentes archivados y gestión
  const [showArchived, setShowArchived] = useState(false);
  const [fetchedAgents, setFetchedAgents] = useState<Agent[] | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // Modal para confirmar archivar o restaurar
  const [actionModal, setActionModal] = useState<{
    type: 'archive' | 'restore';
    agent: Agent;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadAgentsList = useCallback(async (includeArchived: boolean) => {
    setLoadingAgents(true);
    setAgentsError(null);
    try {
      const data = await api.listAgents(includeArchived);
      setFetchedAgents(data.map(agentFromApi));
    } catch (err) {
      setAgentsError(getApiErrorMessage(err, 'Error al cargar agentes.'));
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'agents') {
      void loadAgentsList(showArchived);
    }
  }, [tab, showArchived, loadAgentsList]);

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      if (actionModal.type === 'archive') {
        await api.archiveAgent(actionModal.agent.id);
      } else {
        await api.restoreAgent(actionModal.agent.id);
      }
      setActionModal(null);
      await loadAgentsList(showArchived);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'LIMIT_EXCEEDED') {
          setActionError(`Límite superado (409): ${err.message}`);
        } else {
          setActionError(err.message);
        }
      } else {
        setActionError('Error inesperado al procesar la acción.');
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  const baseAgents = fetchedAgents ?? agents.filter((a) => showArchived || !a.archivedAt);
  // Selector global de proyecto: solo agentes con alcance "Todos" o que incluyan ese proyecto.
  const displayedAgents =
    projectFilter === 'all'
      ? baseAgents
      : baseAgents.filter((a) => {
          const scope = a.permissions?.projectScope ?? 'ALL';
          return scope === 'ALL' || scope.includes(projectFilter);
        });
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const scopeLabel = (a: Agent): string => {
    const scope = a.permissions?.projectScope ?? 'ALL';
    if (scope === 'ALL') return 'Todos';
    if (scope.length === 0) return 'Ninguno';
    return scope.map((id) => projectNameById.get(id) ?? id).join(', ');
  };

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
              onClick={() => selectTab(t.id)}
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
        {tab === 'agents' && (
          <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">Agentes</h2>
                <span className="font-mono text-xs text-slate-400">
                  {displayedAgents.length}
                </span>
                {loadingAgents && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Interruptor Mostrar archivados */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Mostrar archivados</span>
                </label>

                <button
                  type="button"
                  onClick={() => void loadAgentsList(showArchived)}
                  disabled={loadingAgents}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingAgents ? 'animate-spin' : ''}`}
                  />
                  Actualizar
                </button>

                <button
                  type="button"
                  onClick={onOpenCreateAgent}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear agente
                </button>
              </div>
            </div>

            {agentsError && displayedAgents.length === 0 && !loadingAgents ? (
              <div className="p-5">
                <AdminErrorCard
                  message={agentsError}
                  onRetry={() => void loadAgentsList(showArchived)}
                />
              </div>
            ) : (
              <>
                {agentsError && (
                  <div className="m-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                    {agentsError}
                  </div>
                )}

                {displayedAgents.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-slate-500">
                      {showArchived
                        ? 'No se encontraron agentes (activos ni archivados).'
                        : 'Aún no hay agentes activos. Crea el primero para empezar.'}
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
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Nombre</th>
                      <th className="px-3 py-2.5 font-medium">Rol</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-3 py-2.5 font-medium">Modelo</th>
                      <th className="px-3 py-2.5 font-medium">Reporta a</th>
                      <th className="px-3 py-2.5 font-medium">Proyectos</th>
                      <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {displayedAgents.map((a) => {
                      const st = STATUS_META[a.status];
                      const isArchived = Boolean(a.archivedAt);
                      return (
                        <React.Fragment key={a.id}>
                          <tr
                            className={`text-slate-200 transition-colors ${
                              isArchived ? 'bg-amber-950/10 opacity-75' : ''
                            }`}
                          >
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: a.color }}
                                />
                                <span className={isArchived ? 'line-through text-slate-400' : ''}>
                                  {a.name}
                                </span>
                                {isArchived && (
                                  <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                    Archivado {a.archivedAt ? `(${formatDate(a.archivedAt)})` : ''}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400">{a.title}</td>
                            <td className="px-3 py-3">
                              {isArchived ? (
                                <span className="text-amber-400 font-mono text-[11px]">
                                  ARCHIVADO
                                </span>
                              ) : (
                                <span className={st.textClass}>{st.label}</span>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-cyan-400">
                              {getModelDisplayName(a.model ?? a.modelConfig?.primary ?? a.modelTier)}
                            </td>
                            <td className="px-3 py-3 text-slate-400">
                              {a.reportsTo
                                ? (baseAgents.find((x) => x.id === a.reportsTo)?.name ?? '—')
                                : 'CEO'}
                            </td>
                            <td className="px-3 py-3 text-slate-300">{scopeLabel(a)}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditAgent(a)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </button>

                                {isArchived ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionError(null);
                                      setActionModal({ type: 'restore', agent: a });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/80 bg-emerald-950/20 px-2.5 py-1 text-[11px] text-emerald-300 transition-colors hover:border-emerald-500/60 hover:bg-emerald-900/40"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Restaurar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionError(null);
                                      setActionModal({ type: 'archive', agent: a });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-900/60 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-300 transition-colors hover:border-amber-500/60 hover:bg-amber-900/40"
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archivar
                                  </button>
                                )}

                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
        )}

        {tab === 'connections' && (
          <ConnectionsPanel />
        )}

        {tab === 'projects' && (
          <ProjectsPanel projects={projects} onProjectChange={onProjectChange} />
        )}

        {tab === 'workspaces' && (
          <WorkspacesPanel projects={projects} projectFilter={projectFilter} />
        )}

        {tab === 'project' && <ProjectSettingsPanel />}

        {tab === 'rules' && <RulesPanel />}

        {tab === 'limits' && <LimitsPanel />}

        {tab === 'users' && <UsersPanel />}

        {tab === 'audit' && <AuditPanel />}
      </div>

      {/* Modal de confirmación en UI para Archivar / Restaurar (sin window.confirm) */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div
            className={`w-full max-w-md rounded-2xl border bg-[#0B132B] p-6 shadow-2xl ${
              actionModal.type === 'archive'
                ? 'border-amber-900/60'
                : 'border-emerald-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  actionModal.type === 'archive'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {actionModal.type === 'archive' ? (
                  <Archive className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {actionModal.type === 'archive'
                    ? '¿Archivar agente?'
                    : '¿Restaurar agente?'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {actionModal.type === 'archive'
                    ? `Estás a punto de archivar al agente «${actionModal.agent.name}». Dejará de recibir tareas y tickets.`
                    : `Estás a punto de reactivar al agente «${actionModal.agent.name}».`}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-medium text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Operación rechazada (409):
                </div>
                <p className="mt-1 text-rose-300">{actionError}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionError(null);
                }}
                disabled={actionSubmitting}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleExecuteAction()}
                disabled={actionSubmitting}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 ${
                  actionModal.type === 'archive'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {actionSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {actionModal.type === 'archive' ? 'Archivar agente' : 'Restaurar agente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
