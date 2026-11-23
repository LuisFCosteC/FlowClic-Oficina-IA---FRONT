import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  KanbanSquare,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  Agent,
  KanbanTask,
  ModelTier,
  TaskPriority,
  TaskStage,
} from '../types/orbis';
import {
  MODEL_TIER_META,
  PROJECT_NAMES,
  TASK_STAGE_META,
} from '../data/initialData';

interface KanbanPipelineViewProps {
  tasks: KanbanTask[];
  agents: Agent[];
  onMoveTaskStage: (taskId: string, newStage: TaskStage) => void;
  onCreateTask: (task: KanbanTask) => void;
}

const STAGES: TaskStage[] = [
  'backlog',
  'in_dev',
  'sheldon_review',
  'ceo_approval',
  'completed',
];

const PRIORITY_TEXT: Record<TaskPriority, { label: string; className: string }> = {
  alta: { label: 'Prioridad alta', className: 'text-rose-400' },
  media: { label: 'Prioridad media', className: 'text-amber-400' },
  baja: { label: 'Prioridad baja', className: 'text-slate-400' },
};

export const KanbanPipelineView: React.FC<KanbanPipelineViewProps> = ({
  tasks,
  agents,
  onMoveTaskStage,
  onCreateTask,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState(PROJECT_NAMES[0]);
  const [assigneeId, setAssigneeId] = useState(agents[1]?.id ?? agents[0]?.id ?? '');
  const [modelTier, setModelTier] = useState<ModelTier>('sonnet_pro');
  const [priority, setPriority] = useState<TaskPriority>('alta');
  const [stage, setStage] = useState<TaskStage>('in_dev');
  const [formError, setFormError] = useState('');

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.project !== projectFilter) return false;
      if (agentFilter !== 'all' && t.assigneeId !== agentFilter) return false;
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !t.description.toLowerCase().includes(q) &&
        !t.project.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, search, projectFilter, agentFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Escribe un título para la tarea.');
      return;
    }
    const costByTier: Record<ModelTier, number> = {
      opus_pro: 6.4,
      sonnet_pro: 2.5,
      haiku_flash: 0.45,
    };
    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description:
        description.trim() ||
        'Ejecución coordinada por Cerebro FlowClic con reporte automático a Sheldon.',
      project,
      assigneeId: assigneeId || agents[0].id,
      modelTier,
      stage,
      priority,
      estimatedCostUsd: costByTier[modelTier],
      updatedAt: 'Ahora mismo',
    };
    onCreateTask(newTask);
    setTitle('');
    setDescription('');
    setFormError('');
    setCreateOpen(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/75 bg-[#0A101C]/80 px-5 py-3.5 lg:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarea o proyecto..."
              className="w-56 rounded-xl border border-slate-700/80 bg-[#070B12] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filtrar por proyecto"
            className="rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">Todos los proyectos</option>
            {PROJECT_NAMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            aria-label="Filtrar por agente"
            className="rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">Todos los agentes</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Segmented Switch */}
          <div className="flex items-center gap-1 rounded-xl bg-[#070B12] p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                viewMode === 'kanban'
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>Tablero</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                viewMode === 'list'
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Main Pipeline Body */}
      <div className="flex-1 overflow-auto p-5 lg:px-8">
        {viewMode === 'kanban' ? (
          <div className="grid min-w-[1140px] grid-cols-5 gap-4">
            {STAGES.map((stageKey, stageIdx) => {
              const stageMeta = TASK_STAGE_META[stageKey];
              const colTasks = filteredTasks.filter((t) => t.stage === stageKey);
              return (
                <div
                  key={stageKey}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0A1120]/90"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: stageMeta.accent }}
                      />
                      <span className="text-xs font-semibold text-slate-100">
                        {stageMeta.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 p-3">
                    {colTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-500">
                        Sin tareas en esta etapa
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const assignee = agentMap.get(task.assigneeId);
                        const prio = PRIORITY_TEXT[task.priority];
                        return (
                          <motion.div
                            key={task.id}
                            layout
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.16 }}
                            className="rounded-xl border border-slate-800/90 bg-[#10192B] p-3.5 shadow-sm transition-colors hover:border-slate-700"
                          >
                            <div className="text-[11px] text-slate-400">
                              {task.project} ·{' '}
                              <span className={prio.className}>{prio.label}</span>
                            </div>
                            <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-100">
                              {task.title}
                            </h3>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                              {task.description}
                            </p>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-800/70 pt-2.5 text-[11px]">
                              <div className="flex items-center gap-1.5 text-slate-200">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: assignee?.color ?? '#06B6D4',
                                  }}
                                />
                                <span>{assignee?.name ?? 'Sin asignar'}</span>
                              </div>
                              <span className="font-mono text-cyan-400">
                                {MODEL_TIER_META[task.modelTier].shortLabel}
                              </span>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="font-mono">
                                ${task.estimatedCostUsd.toFixed(2)} · {task.updatedAt}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={stageIdx === 0}
                                  onClick={() =>
                                    onMoveTaskStage(task.id, STAGES[stageIdx - 1])
                                  }
                                  title="Mover a etapa anterior"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-[#0A101C] text-slate-300 transition-all hover:border-cyan-500/60 hover:text-cyan-300 active:scale-90 disabled:opacity-30"
                                >
                                  <ArrowLeft className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={stageIdx === STAGES.length - 1}
                                  onClick={() =>
                                    onMoveTaskStage(task.id, STAGES[stageIdx + 1])
                                  }
                                  title="Avanzar a siguiente etapa"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-[#0A101C] text-slate-300 transition-all hover:border-cyan-500/60 hover:text-cyan-300 active:scale-90 disabled:opacity-30"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* High-Density List View */
          <div className="mx-auto max-w-[1340px] overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400">
                    <th className="px-5 py-3.5 font-medium">Tarea & Proyecto</th>
                    <th className="px-4 py-3.5 font-medium">Agente</th>
                    <th className="px-4 py-3.5 font-medium">Modelo</th>
                    <th className="px-4 py-3.5 font-medium">Prioridad</th>
                    <th className="px-4 py-3.5 text-right font-medium">Costo Est.</th>
                    <th className="px-5 py-3.5 font-medium">Etapa del Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-slate-400"
                      >
                        No hay tareas que coincidan con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const assignee = agentMap.get(task.assigneeId);
                      const prio = PRIORITY_TEXT[task.priority];
                      return (
                        <tr
                          key={task.id}
                          className="transition-colors hover:bg-slate-800/35"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-100">
                              {task.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {task.project} · {task.updatedAt}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-slate-200">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: assignee?.color ?? '#06B6D4',
                                }}
                              />
                              <span>{assignee?.name ?? 'Sin asignar'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-cyan-400">
                            {MODEL_TIER_META[task.modelTier].shortLabel}
                          </td>
                          <td className={`px-4 py-3.5 ${prio.className}`}>
                            {prio.label}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                            ${task.estimatedCostUsd.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={task.stage}
                              onChange={(e) =>
                                onMoveTaskStage(
                                  task.id,
                                  e.target.value as TaskStage
                                )
                              }
                              className="rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                            >
                              {STAGES.map((st) => (
                                <option key={st} value={st}>
                                  {TASK_STAGE_META[st].label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create New Task Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0D1422] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <h2
                id="create-task-title"
                className="text-sm font-semibold text-slate-100"
              >
                Crear Nueva Tarea en el Pipeline
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 p-5">
              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Título de la tarea
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder="Ej. Implementar webhook de alertas antifraude"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="task-desc"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Especificación técnica
                </label>
                <textarea
                  id="task-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Criterios de aceptación y dependencias..."
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-project"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Proyecto
                  </label>
                  <select
                    id="task-project"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    {PROJECT_NAMES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-agent"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Agente asignado
                  </label>
                  <select
                    id="task-agent"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="task-tier"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Nivel de Modelo
                  </label>
                  <select
                    id="task-tier"
                    value={modelTier}
                    onChange={(e) => setModelTier(e.target.value as ModelTier)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="opus_pro">Opus / Pro</option>
                    <option value="sonnet_pro">Sonnet / Pro</option>
                    <option value="haiku_flash">Haiku / Flash</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Prioridad
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TaskPriority)
                    }
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-stage"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Etapa inicial
                  </label>
                  <select
                    id="task-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as TaskStage)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {TASK_STAGE_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95"
                >
                  Crear y Asignar Tarea
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
