import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu } from 'lucide-react';
import {
  ActiveModule,
  Agent,
  AgentStatus,
  KanbanTask,
  ModelHealthStatus,
  ModelNode,
  ProjectMilestone,
  ProjectRoadmap,
  RoutingPolicy,
  SheldonProposal,
  TaskStage,
} from './types/orbis';
import {
  INITIAL_AGENTS,
  INITIAL_MODELS,
  INITIAL_PROJECTS,
  INITIAL_PROPOSALS,
  INITIAL_TASKS,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Colmena3DView } from './components/Colmena3DView';
import { CerebroOrbisView } from './components/CerebroOrbisView';
import { KanbanPipelineView } from './components/KanbanPipelineView';
import { RoadmapCalendarView } from './components/RoadmapCalendarView';
import { CreateAgentModal } from './components/CreateAgentModal';
import { AdminView } from './components/AdminView';

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

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('kanban');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [createAgentOpen, setCreateAgentOpen] = useState<boolean>(false);

  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [models, setModels] = useState<ModelNode[]>(INITIAL_MODELS);
  const [routingPolicy, setRoutingPolicy] = useState<RoutingPolicy>('balanced');
  const [proposals, setProposals] =
    useState<SheldonProposal[]>(INITIAL_PROPOSALS);
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [projects, setProjects] = useState<ProjectRoadmap[]>(INITIAL_PROJECTS);

  const handleChangeAgentStatus = (agentId: string, status: AgentStatus) => {
    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id !== agentId) return ag;
        const ramKb =
          status === 'idle'
            ? 0
            : ag.ramKb > 0
              ? ag.ramKb
              : 184000 + ((ag.name.length * 19000) % 140000);
        const currentTask =
          status === 'idle'
            ? 'Memoria purgada — Descansando en Apartamento BBT'
            : status === 'waiting_sheldon'
              ? ag.isCTO
                ? 'Supervisando revisión arquitectónica en pizarra'
                : `Esperando validación de Sheldon · ${ag.project}`
              : ag.currentTask.startsWith('Memoria purgada')
                ? `Ejecutando sprint activo en ${ag.project}`
                : ag.currentTask;
        return { ...ag, status, ramKb, currentTask };
      })
    );
  };

  const handleChangeRoutingPolicy = (policy: RoutingPolicy) => {
    setRoutingPolicy(policy);
    const sharesByPolicy: Record<RoutingPolicy, Record<string, number>> = {
      balanced: {
        'claude-opus': 18,
        'claude-sonnet': 34,
        'claude-haiku': 8,
        'gemini-pro': 22,
        'gemini-flash': 18,
      },
      cost_saver: {
        'claude-opus': 6,
        'claude-sonnet': 18,
        'claude-haiku': 14,
        'gemini-pro': 16,
        'gemini-flash': 46,
      },
      max_precision: {
        'claude-opus': 36,
        'claude-sonnet': 34,
        'claude-haiku': 2,
        'gemini-pro': 24,
        'gemini-flash': 4,
      },
    };
    const nextShares = sharesByPolicy[policy];
    setModels((prev) =>
      prev.map((m) => ({
        ...m,
        trafficShare: nextShares[m.id] ?? m.trafficShare,
      }))
    );
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

  const handleResolveProposal = (
    proposalId: string,
    decision: 'approved' | 'rejected'
  ) => {
    const targetProp = proposals.find((p) => p.id === proposalId);
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: decision } : p))
    );

    if (!targetProp) return;

    if (targetProp.linkedTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === targetProp.linkedTaskId
            ? {
                ...t,
                stage: decision === 'approved' ? 'completed' : 'in_dev',
                updatedAt: 'Ahora mismo',
              }
            : t
        )
      );
    }

    handleChangeAgentStatus(
      targetProp.agentId,
      decision === 'approved' ? 'idle' : 'working'
    );
  };

  const handleMoveTaskStage = (taskId: string, newStage: TaskStage) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, stage: newStage, updatedAt: 'Ahora mismo' }
          : t
      )
    );

    if (!targetTask) return;

    if (newStage === 'in_dev') {
      handleChangeAgentStatus(targetTask.assigneeId, 'working');
    } else if (newStage === 'sheldon_review' || newStage === 'ceo_approval') {
      handleChangeAgentStatus(targetTask.assigneeId, 'waiting_sheldon');
    } else if (newStage === 'completed' || newStage === 'backlog') {
      handleChangeAgentStatus(targetTask.assigneeId, 'idle');
    }

    if (newStage === 'ceo_approval') {
      const exists = proposals.some(
        (p) => p.linkedTaskId === taskId && p.status === 'pending'
      );
      if (!exists) {
        const assignee = agents.find((a) => a.id === targetTask.assigneeId);
        setProposals((prev) => [
          {
            id: `prop-${Date.now()}`,
            title: targetTask.title,
            project: targetTask.project,
            agentId: targetTask.assigneeId,
            agentName: assignee?.name ?? 'Agente',
            modelTier: targetTask.modelTier,
            category: 'Arquitectura',
            summary: targetTask.description,
            sheldonNote: `Validé los entregables de ${assignee?.name ?? 'el agente'} en la pizarra. Listo para autorización ejecutiva CEO.`,
            estimatedTokens: 36400,
            timestamp: 'Ahora mismo',
            status: 'pending',
            linkedTaskId: taskId,
          },
          ...prev,
        ]);
      }
    }
  };

  const handleCreateTask = (newTask: KanbanTask) => {
    setTasks((prev) => [newTask, ...prev]);
    if (newTask.stage === 'in_dev') {
      handleChangeAgentStatus(newTask.assigneeId, 'working');
    } else if (
      newTask.stage === 'sheldon_review' ||
      newTask.stage === 'ceo_approval'
    ) {
      handleChangeAgentStatus(newTask.assigneeId, 'waiting_sheldon');
    }
  };

  const handleCreateAgent = (newAgent: Agent) => {
    setAgents((prev) => [...prev, newAgent]);
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
  const activeAgentsCount = agents.filter((a) => a.status !== 'idle').length;
  const headerInfo = MODULE_HEADERS[activeModule];

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
        onOpenCreateAgent={() => setCreateAgentOpen(true)}
        pendingProposalsCount={pendingProposalsCount}
        activeAgentsCount={activeAgentsCount}
        totalAgentsCount={agents.length}
      />

      {/* Right Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Clean Single-Row Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-slate-800/75 bg-[#0A101C]/90 px-5 lg:px-8">
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
            <div className="hidden items-center gap-3 text-xs text-slate-400 md:flex">
              <span className="font-mono text-slate-300">
                {agents.length} agentes
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-400">
                {pendingProposalsCount} aprobaciones CEO
              </span>
            </div>

            {activeModule !== 'colmena3d' ? (
              <button
                type="button"
                onClick={() => setActiveModule('colmena3d')}
                className="rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-4 py-2 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95 whitespace-nowrap shrink-0"
              >
                Ver Oficina 3D
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModule('cerebro')}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs font-medium text-slate-200 transition-all hover:-translate-y-0.5 hover:border-cyan-500/60 hover:text-cyan-200 active:translate-y-0 active:scale-95 whitespace-nowrap shrink-0"
              >
                Abrir Cerebro FlowClic
              </button>
            )}
          </div>
        </header>

        {/* Active Module Viewport with Smooth Transitions */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeModule === 'colmena3d' && (
              <motion.div
                key="colmena3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="h-full w-full"
              >
                <Colmena3DView
                  agents={agents}
                  onChangeAgentStatus={handleChangeAgentStatus}
                />
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
                <CerebroOrbisView
                  agents={agents}
                  models={models}
                  proposals={proposals}
                  routingPolicy={routingPolicy}
                  onChangeRoutingPolicy={handleChangeRoutingPolicy}
                  onCycleModelStatus={handleCycleModelStatus}
                  onResolveProposal={handleResolveProposal}
                  onChangeAgentStatus={handleChangeAgentStatus}
                />
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
                <KanbanPipelineView
                  tasks={tasks}
                  agents={agents}
                  onMoveTaskStage={handleMoveTaskStage}
                  onCreateTask={handleCreateTask}
                />
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
                <RoadmapCalendarView
                  projects={projects}
                  agents={agents}
                  onUpdateProjectDates={handleUpdateProjectDates}
                  onAddMilestone={handleAddMilestone}
                />
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
                  onOpenCreateAgent={() => setCreateAgentOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modal 5: + Crear Nuevo Agente */}
      <CreateAgentModal
        open={createAgentOpen}
        onClose={() => setCreateAgentOpen(false)}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}
