import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu } from 'lucide-react';
import {
  ActiveModule,
  Agent,
  AgentStatus,
  ModelHealthStatus,
  ModelNode,
  NewTaskInput,
  ProjectMilestone,
  ProjectRoadmap,
  RoutingPolicy,
  TaskStage,
} from './types/orbis';
import type { AgentCreatePayload } from './types/agentProfile';
import { INITIAL_MODELS, isResting } from './data/initialData';
import { initModelCatalog } from './utils/models';
import { api, ApiError } from './api/client';
import type { ApiAgentCreate, ApiAgentUpdate } from './api/types';
import { CONFIG_ERROR } from './api/config';
import { connectRealtime } from './api/realtime';
import {
  agentFromApi,
  agentStatusToApi,
  proposalFromApproval,
  stageFromTicket,
  ticketFromApi,
  ticketStatusForStage,
  canMoveTo,
} from './api/mappers';
import { useOfficeStore } from './state/useOfficeStore';
import { Sidebar } from './components/Sidebar';
import { Colmena3DView } from './components/Colmena3DView';
import { CerebroOrbisView } from './components/CerebroOrbisView';
import { KanbanPipelineView } from './components/KanbanPipelineView';
import { RoadmapCalendarView } from './components/RoadmapCalendarView';
import { CreateAgentProfileModal } from './components/CreateAgentProfileModal';
import { AdminView, AdminTab } from './components/AdminView';
import { EmptyState } from './components/EmptyState';

const MODULE_HEADERS: Record<
  ActiveModule,
  { breadcrumb: string; title: string }
> = {
  kanban: {
    breadcrumb: 'FlowClic Oficina IA / Ejecución',
    title: 'To-Do & Pipeline de Tareas',
  },
  roadmap: {
    breadcrumb: 'FlowClic Oficina IA / Planificación',
    title: 'Calendario de Proyectos',
  },
  cerebro: {
    breadcrumb: 'FlowClic Oficina IA / Orquestación',
    title: 'Cerebro FlowClic',
  },
  colmena3d: {
    breadcrumb: 'FlowClic Oficina IA / Vista Principal 3D',
    title: 'Oficina IA 3D',
  },
  admin: {
    breadcrumb: 'FlowClic Oficina IA / Sistema',
    title: 'Administración',
  },
};

const EMPTY_TEXT: Record<
  Exclude<ActiveModule, 'admin'>,
  { title: string; description: string }
> = {
  kanban: {
    title: 'Todavía no hay agentes',
    description:
      'El tablero se llena con las tareas de tu equipo. Crea el primer agente para empezar.',
  },
  roadmap: {
    title: 'Todavía no hay agentes ni proyectos',
    description:
      'El calendario muestra los proyectos de tu equipo. Crea el primer agente para empezar.',
  },
  cerebro: {
    title: 'Cerebro sin agentes',
    description:
      'Aquí verás la memoria, el enrutado de modelos y la cola de aprobación. Crea el primer agente para empezar.',
  },
  colmena3d: {
    title: 'La oficina está vacía',
    description:
      'Cada agente aparecerá en la oficina 3D según su estado. Crea el primero para verlo entrar.',
  },
};

interface Notice {
  kind: 'error' | 'info';
  text: string;
}

function apiMessage(err: unknown): string {
  if (err instanceof ApiError) return err.status === 0 ? 'La API no responde.' : err.message;
  return 'Error inesperado.';
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('kanban');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [createAgentOpen, setCreateAgentOpen] = useState<boolean>(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('agents');
  // Selector global de proyecto (cabecera): filtra Kanban, Cerebro y tablas. 'all' = todos.
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Datos del servidor (BD): agentes, tickets y aprobaciones.
  const [store, dispatch] = useOfficeStore();
  const [realtimeUp, setRealtimeUp] = useState<boolean>(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Solo catálogo / local: modelos, política de enrutado y proyectos (sin datos de ejemplo).
  const [models, setModels] = useState<ModelNode[]>(INITIAL_MODELS);
  const [routingPolicy, setRoutingPolicy] = useState<RoutingPolicy>('balanced');
  const [projects, setProjects] = useState<ProjectRoadmap[]>([]);

  const ticketsRef = useRef(store.tickets);
  ticketsRef.current = store.tickets;
  const movingRef = useRef<Set<string>>(new Set());

  const loadSnapshot = useCallback(async () => {
    try {
      dispatch({ type: 'snapshot', snapshot: await api.snapshot() });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SETUP_REQUIRED') {
        dispatch({ type: 'failed', phase: 'setup', message: err.message });
      } else if (err instanceof ApiError && err.status === 0 && err.code === 'NETWORK') {
        dispatch({ type: 'failed', phase: 'unreachable', message: err.message });
      } else {
        dispatch({ type: 'failed', phase: 'error', message: apiMessage(err) });
      }
    }
  }, [dispatch]);

  useEffect(() => {
    void initModelCatalog();
    void loadSnapshot();
    return connectRealtime({
      onEvent: (ev) => {
        switch (ev.type) {
          case 'agent.created':
          case 'agent.updated':
            dispatch({ type: 'agent.upsert', agent: ev.agent });
            break;
          case 'agent.archived':
            dispatch({ type: 'agent.remove', id: ev.id });
            break;
          case 'ticket.created':
          case 'ticket.updated':
            dispatch({ type: 'ticket.upsert', ticket: ev.ticket });
            break;
          case 'ticket.deleted':
            dispatch({ type: 'ticket.remove', id: ev.id });
            break;
          case 'approval.created':
          case 'approval.updated':
            dispatch({ type: 'approval.upsert', approval: ev.approval });
            break;
          case 'project.created':
          case 'project.updated':
          case 'project.archived':
            dispatch({ type: 'project.upsert', project: ev.project });
            break;
        }
      },
      onReconnect: () => void loadSnapshot(),
      onConnectionChange: setRealtimeUp,
    });
  }, [dispatch, loadSnapshot]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // ── Vistas derivadas de lo que dice la API ──
  const agents = useMemo(() => store.agents.map(agentFromApi), [store.agents]);
  const tasks = useMemo(() => store.tickets.map(ticketFromApi), [store.tickets]);
  const activeProjects = useMemo(
    () => store.projects.filter((p) => p.status === 'ACTIVE'),
    [store.projects]
  );
  // Si el proyecto elegido se archiva o desaparece, se vuelve a "Todos".
  useEffect(() => {
    if (projectFilter !== 'all' && !activeProjects.some((p) => p.id === projectFilter)) {
      setProjectFilter('all');
    }
  }, [activeProjects, projectFilter]);
  const visibleTasks = useMemo(
    () => (projectFilter === 'all' ? tasks : tasks.filter((t) => t.projectId === projectFilter)),
    [tasks, projectFilter]
  );
  const proposals = useMemo(() => {
    const agentsById = new Map(agents.map((a) => [a.id, a]));
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    return store.approvals
      .map((ap) => proposalFromApproval(ap, agentsById, tasksById))
      .filter((p) => p !== null);
  }, [store.approvals, agents, tasks]);
  const visibleProposals = useMemo(() => {
    if (projectFilter === 'all') return proposals;
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return proposals.filter(
      (p) => p.linkedTaskId && byId.get(p.linkedTaskId)?.projectId === projectFilter
    );
  }, [proposals, tasks, projectFilter]);

  // ── Handlers: llaman a la API, sin lógica de negocio local ──
  const handleChangeAgentStatus = async (agentId: string, status: AgentStatus) => {
    try {
      const updated = await api.setAgentStatus(agentId, agentStatusToApi(status));
      dispatch({ type: 'agent.upsert', agent: updated });
    } catch (err) {
      setNotice({ kind: 'error', text: apiMessage(err) });
    }
  };

  const handleSaveAgentProfile = async (
    payload: AgentCreatePayload,
    isEdit?: boolean,
    changedFields?: Partial<AgentCreatePayload>
  ): Promise<void> => {
    try {
      if (isEdit && editingAgent) {
        const body: ApiAgentUpdate = {
          ...(changedFields?.name !== undefined ? { name: changedFields.name } : {}),
          ...(changedFields?.role !== undefined ? { role: changedFields.role } : {}),
          ...(changedFields?.roleType !== undefined ? { roleType: changedFields.roleType } : {}),
          ...(changedFields?.character !== undefined ? { character: changedFields.character } : {}),
          ...(changedFields?.avatar !== undefined ? { avatar: changedFields.avatar } : {}),
          ...(changedFields?.functions !== undefined ? { functions: changedFields.functions } : {}),
          ...(changedFields?.rules !== undefined ? { rules: changedFields.rules } : {}),
          ...(changedFields?.restrictions !== undefined ? { restrictions: changedFields.restrictions } : {}),
          ...(changedFields?.permissions !== undefined ? { permissions: changedFields.permissions } : {}),
          ...(changedFields?.model !== undefined ? { model: changedFields.model } : {}),
          ...(changedFields?.limits !== undefined ? { limits: changedFields.limits } : {}),
        };
        const updated = await api.updateAgent(editingAgent.id, body);
        dispatch({ type: 'agent.upsert', agent: updated });
        setCreateAgentOpen(false);
        setEditingAgent(null);
      } else {
        const body: ApiAgentCreate = {
          name: payload.name,
          role: payload.role,
          roleType: payload.roleType,
          character: payload.character,
          avatar: payload.avatar,
          functions: payload.functions,
          rules: payload.rules,
          restrictions: payload.restrictions,
          permissions: payload.permissions,
          model: payload.model,
          limits: payload.limits,
          ...(payload.project ? { project: payload.project } : {}),
        };
        const created = await api.createAgent(body);
        dispatch({ type: 'agent.upsert', agent: created });
        setCreateAgentOpen(false);
        setEditingAgent(null);
      }
    } catch (err) {
      throw new Error(apiMessage(err));
    }
  };

  /** Crea un pedido del CEO (lo recibe el CTO). Devuelve el mensaje de error o null. */
  const handleCreateTask = async (input: NewTaskInput): Promise<string | null> => {
    try {
      const created = await api.createTicket({
        title: input.title,
        requirement: input.requirement,
        projectId: input.projectId,
      });
      dispatch({ type: 'ticket.upsert', ticket: created });
      return null;
    } catch (err) {
      return apiMessage(err);
    }
  };

  const handleMoveTaskStage = async (taskId: string, newStage: TaskStage) => {
    const ticket = ticketsRef.current.find((t) => t.id === taskId);
    if (!ticket || movingRef.current.has(taskId)) return;
    if (stageFromTicket(ticket.status) === newStage) return;
    if (!canMoveTo(ticket.status, newStage)) {
      setNotice({ kind: 'error', text: 'Esa transición no es válida en el flujo de tickets.' });
      return;
    }
    movingRef.current.add(taskId);
    try {
      // La tarjeta no se mueve hasta que la API acepta: si responde 409/403 vuelve a su sitio.
      const updated = await api.transitionTicket(taskId, ticketStatusForStage(newStage));
      dispatch({ type: 'ticket.upsert', ticket: updated });
    } catch (err) {
      setNotice({ kind: 'error', text: apiMessage(err) });
    } finally {
      movingRef.current.delete(taskId);
    }
  };

  const handleResolveProposal = () => {
    // G06 (aprobar/rechazar compuertas) todavía no existe en la API.
    setNotice({ kind: 'info', text: 'Pendiente de G06: la API aún no permite aprobar o rechazar.' });
  };

  // ── Solo UI local (catálogo y calendario vacío) ──
  const handleChangeRoutingPolicy = (policy: RoutingPolicy) => {
    setRoutingPolicy(policy);
  };

  const handleCycleModelStatus = (modelId: string) => {
    const order: ModelHealthStatus[] = ['online', 'fallback', 'maintenance'];
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        const nextIdx = (order.indexOf(m.status) + 1) % order.length;
        return { ...m, status: order[nextIdx] };
      })
    );
  };

  const handleUpdateProjectDates = (
    projectId: string,
    dates: { startDate: string; reviewDate: string; endDate: string }
  ) => {
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === projectId
          ? {
              ...proj,
              ...dates,
              milestones: proj.milestones.map((ms) => {
                if (ms.type === 'inicio') return { ...ms, date: dates.startDate };
                if (ms.type === 'revision_sheldon')
                  return { ...ms, date: dates.reviewDate };
                if (ms.type === 'entrega') return { ...ms, date: dates.endDate };
                return ms;
              }),
            }
          : proj
      )
    );
  };

  const handleAddMilestone = (
    projectId: string,
    milestone: ProjectMilestone
  ) => {
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === projectId
          ? { ...proj, milestones: [...proj.milestones, milestone] }
          : proj
      )
    );
  };

  const pendingProposalsCount = proposals.filter(
    (p) => p.status === 'pending'
  ).length;
  const activeAgentsCount = agents.filter((a) => !isResting(a.status)).length;
  const headerInfo = MODULE_HEADERS[activeModule];
  const openCreateAgent = () => {
    setEditingAgent(null);
    setCreateAgentOpen(true);
  };
  const openEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setCreateAgentOpen(true);
  };

  // Aviso visible de conexión (API caída, modo SETUP, configuración o tiempo real cortado).
  let banner: { tone: 'error' | 'warn'; text: string } | null = null;
  if (CONFIG_ERROR) {
    banner = { tone: 'error', text: CONFIG_ERROR };
  } else if (store.phase === 'unreachable') {
    banner = { tone: 'error', text: 'La API no responde. Reintentando automáticamente…' };
  } else if (store.phase === 'setup') {
    banner = {
      tone: 'warn',
      text: 'La API está en modo SETUP (503 SETUP_REQUIRED): falta configurar la base de datos.',
    };
  } else if (store.phase === 'error') {
    banner = { tone: 'error', text: store.errorMessage || 'Error al hablar con la API.' };
  } else if (store.phase === 'ready' && !realtimeUp) {
    banner = {
      tone: 'warn',
      text: 'Tiempo real desconectado: reintentando. Los datos se refrescarán al reconectar.',
    };
  }

  const blocked = store.phase !== 'ready' && activeModule !== 'admin';
  const noAgents = store.phase === 'ready' && agents.length === 0;

  const renderEmpty = (module: Exclude<ActiveModule, 'admin'>, overlay = false) => (
    <EmptyState
      title={EMPTY_TEXT[module].title}
      description={EMPTY_TEXT[module].description}
      onCreateFirstAgent={openCreateAgent}
      overlay={overlay}
    />
  );

  return (
    <div className="flowclic-ambient-bg flex h-screen w-screen overflow-hidden text-slate-100">
      {/* Collapsible Fixed Left Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenCreateAgent={openCreateAgent}
        pendingProposalsCount={pendingProposalsCount}
        activeAgentsCount={activeAgentsCount}
        totalAgentsCount={agents.length}
      />

      {/* Right Main Workspace */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* La Oficina 3D usa todo el espacio: solo queda la barra lateral izquierda */}
        {activeModule === 'colmena3d' && (<button type="button" aria-label="Abrir navegación" onClick={() => setMobileMenuOpen(true)} className="absolute left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0A101C]/90 text-slate-300 hover:bg-slate-800 lg:hidden">☰</button>)}
        {activeModule !== 'colmena3d' && (<header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-slate-800/75 bg-[#0A101C]/90 px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegación"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition-colors hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-[11px] text-slate-400">
                {headerInfo.breadcrumb}
              </div>
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-50">
                {headerInfo.title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline">Proyecto</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Proyecto activo"
                className="max-w-[180px] rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="all">Todos</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden items-center gap-3 text-xs text-slate-400 md:flex">
              <span className="font-mono text-slate-300">
                {agents.length} agentes
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-400">
                {pendingProposalsCount} aprobaciones CEO
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveModule('colmena3d')}
              className="rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-4 py-2 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95 whitespace-nowrap shrink-0"
            >
              Ver Oficina 3D
            </button>
          </div>
        </header>)}

        {banner && (
          <div
            role="status"
            className={`shrink-0 border-b px-5 py-2 text-xs lg:px-8 ${
              banner.tone === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* Active Module Viewport with Smooth Transitions */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {blocked ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-slate-400">
              {store.phase === 'loading'
                ? 'Conectando con la API…'
                : 'Sin conexión con los datos. Consulta el aviso de arriba; puedes revisar la conexión en Administración.'}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeModule === 'colmena3d' && (
                <motion.div
                  key="colmena3d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="relative h-full w-full"
                >
                  <Colmena3DView
                    agents={agents}
                    tasks={tasks}
                    onChangeAgentStatus={handleChangeAgentStatus}
                  />
                  {noAgents && renderEmpty('colmena3d', true)}
                </motion.div>
              )}

              {activeModule === 'cerebro' && (
                <motion.div
                  key="cerebro"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full"
                >
                  {noAgents ? (
                    renderEmpty('cerebro')
                  ) : (
                    <CerebroOrbisView
                      agents={agents}
                      models={models}
                      proposals={visibleProposals}
                      routingPolicy={routingPolicy}
                      onChangeRoutingPolicy={handleChangeRoutingPolicy}
                      onCycleModelStatus={handleCycleModelStatus}
                      onResolveProposal={handleResolveProposal}
                      onChangeAgentStatus={handleChangeAgentStatus}
                    />
                  )}
                </motion.div>
              )}

              {activeModule === 'kanban' && (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full"
                >
                  {noAgents ? (
                    renderEmpty('kanban')
                  ) : (
                    <KanbanPipelineView
                      tasks={visibleTasks}
                      agents={agents}
                      projects={activeProjects}
                      onMoveTaskStage={handleMoveTaskStage}
                      onCreateTask={handleCreateTask}
                    />
                  )}
                </motion.div>
              )}

              {activeModule === 'roadmap' && (
                <motion.div
                  key="roadmap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full"
                >
                  {noAgents ? (
                    renderEmpty('roadmap')
                  ) : (
                    <RoadmapCalendarView
                      projects={projects}
                      agents={agents}
                      onUpdateProjectDates={handleUpdateProjectDates}
                      onAddMilestone={handleAddMilestone}
                    />
                  )}
                </motion.div>
              )}
              {activeModule === 'admin' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full"
                >
                  <AdminView
                    agents={agents}
                    projects={store.projects}
                    onProjectChange={(project) => dispatch({ type: 'project.upsert', project })}
                    projectFilter={projectFilter}
                    onOpenCreateAgent={openCreateAgent}
                    onOpenEditAgent={openEditAgent}
                    initialTab={adminTab}
                    onTabChange={setAdminTab}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {notice && (
        <div
          role="alert"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-xs shadow-2xl ${
            notice.kind === 'error'
              ? 'border-rose-500/50 bg-[#1A0D14] text-rose-200'
              : 'border-amber-500/50 bg-[#1A140A] text-amber-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Modal: Crear / Editar Agente con perfiles, modelo y permisos (AG-MANUAL) */}
      <CreateAgentProfileModal
        open={createAgentOpen}
        onClose={() => {
          setCreateAgentOpen(false);
          setEditingAgent(null);
        }}
        onSubmit={handleSaveAgentProfile}
        agentToEdit={editingAgent}
        existingAgents={agents}
        onNavigateToWorkspaces={() => {
          setCreateAgentOpen(false);
          setEditingAgent(null);
          setActiveModule('admin');
          setAdminTab('workspaces');
        }}
      />
    </div>
  );
}
