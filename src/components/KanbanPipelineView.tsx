import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CornerDownRight, KanbanSquare, List, Loader2, Plus, Search, Undo2, X } from 'lucide-react';
import { Agent, KanbanTask, NewTaskInput, TaskPriority, TaskStage } from '../types/orbis';
import type { ApiProject } from '../api/types';
import { TASK_STAGE_META } from '../data/initialData';
import { KANBAN_STAGES, canMoveTo, validTargetStages } from '../api/mappers';
import { getModelDisplayName } from '../utils/models';

interface KanbanPipelineViewProps {
  tasks: KanbanTask[];
  agents: Agent[];
  /** Proyectos activos (select del modal "Nueva tarea"). */
  projects: ApiProject[];
  onMoveTaskStage: (taskId: string, newStage: TaskStage) => void;
  /** Crea un pedido del CEO. Devuelve el mensaje de error de la API o null si salió bien. */
  onCreateTask: (input: NewTaskInput) => Promise<string | null>;
}

const UNDEFINED_TEXT = 'Por definir';

const PRIORITY_TEXT: Record<TaskPriority, { label: string; className: string }> = {
  alta: { label: 'Prioridad alta', className: 'text-rose-400' },
  media: { label: 'Prioridad media', className: 'text-amber-400' },
  baja: { label: 'Prioridad baja', className: 'text-slate-400' },
};

const priorityView = (p: TaskPriority | null): { label: string; className: string } =>
  p
    ? PRIORITY_TEXT[p]
    : { label: `Prioridad: ${UNDEFINED_TEXT}`, className: 'text-slate-500 italic' };

/** Botón de mover: avanzar a la siguiente revisión o devolver. */
const moveLabel = (target: TaskStage): string =>
  target === 'returned' ? 'Devolver' : `→ ${TASK_STAGE_META[target].label}`;

export const KanbanPipelineView: React.FC<KanbanPipelineViewProps> = ({
  tasks,
  agents,
  projects,
  onMoveTaskStage,
  onCreateTask,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<TaskStage | null>(null);

  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [projectId, setProjectId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
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
  }, [tasks, search, agentFilter]);

  /** Subtareas de cada pedido (se ven debajo de su pedido). */
  const subtasksOf = useMemo(() => {
    const map = new Map<string, KanbanTask[]>();
    for (const t of tasks) {
      if (t.parentId) map.set(t.parentId, [...(map.get(t.parentId) ?? []), t]);
    }
    return map;
  }, [tasks]);

  /** Lista: cada pedido seguido de sus subtareas (sangradas); el resto, suelto. */
  const listRows = useMemo(() => {
    const visible = new Set(filteredTasks.map((t) => t.id));
    const rows: Array<{ task: KanbanTask; depth: number }> = [];
    for (const t of filteredTasks) {
      if (t.parentId && visible.has(t.parentId)) continue; // se pinta bajo su pedido
      rows.push({ task: t, depth: 0 });
      for (const child of subtasksOf.get(t.id) ?? []) {
        if (visible.has(child.id)) rows.push({ task: child, depth: 1 });
      }
    }
    return rows;
  }, [filteredTasks, subtasksOf]);

  const resetForm = () => {
    setTitle('');
    setRequirement('');
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setFormError('Escribe un título para la tarea.');
    if (!requirement.trim()) return setFormError('Describe la especificación o el requerimiento.');
    if (!projectId) return setFormError('Elige el proyecto de la tarea.');
    setSubmitting(true);
    const err = await onCreateTask({
      title: title.trim(),
      requirement: requirement.trim(),
      projectId,
    });
    setSubmitting(false);
    if (err) {
      setFormError(err); // p. ej. "Crea primero un agente con rol CTO"
      return;
    }
    resetForm();
    setCreateOpen(false);
  };

  const stageChip = (t: KanbanTask) => (
    <span
      className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: `${TASK_STAGE_META[t.stage].accent}66`,
        color: TASK_STAGE_META[t.stage].accent,
      }}
    >
      {TASK_STAGE_META[t.stage].label}
    </span>
  );

  const modelTextOf = (task: KanbanTask, assignee: Agent | undefined): string => {
    if (task.model) return getModelDisplayName(task.model);
    if (task.kind === 'REQUEST' || !assignee) return UNDEFINED_TEXT;
    return getModelDisplayName(assignee.model ?? assignee.modelConfig?.primary);
  };

  const renderCard = (task: KanbanTask) => {
    const assignee = agentMap.get(task.assigneeId);
    const prio = priorityView(task.priority);
    const targets = task.apiStatus ? validTargetStages(task.apiStatus) : [];
    const children = subtasksOf.get(task.id) ?? [];
    const parent = task.parentId ? taskMap.get(task.parentId) : undefined;
    const modelText = modelTextOf(task, assignee);
    return (
      <div
        key={task.id}
        draggable={targets.length > 0}
        tabIndex={0}
        aria-label={`${task.title}. Arrastra a una columna válida, o usa Alt + flechas para moverla.`}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggingId(task.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverStage(null);
        }}
        onKeyDown={(e) => {
          if (!e.altKey) return;
          const forward = targets.find((s) => s !== 'returned');
          if (e.key === 'ArrowRight' && forward) {
            e.preventDefault();
            onMoveTaskStage(task.id, forward);
          } else if (e.key === 'ArrowLeft' && targets.includes('returned')) {
            e.preventDefault();
            onMoveTaskStage(task.id, 'returned');
          }
        }}
        className={`rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
          targets.length > 0 ? 'cursor-grab active:cursor-grabbing' : ''
        } ${draggingId === task.id ? 'opacity-40' : ''}`}
      >
        <motion.div
          layout
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16 }}
          className="rounded-xl border border-slate-800/90 bg-[#10192B] p-3.5 shadow-sm transition-colors hover:border-slate-700"
        >
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                task.kind === 'REQUEST'
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'border-slate-600/60 bg-slate-800/60 text-slate-300'
              }`}
            >
              {task.kind === 'REQUEST' ? 'Pedido' : 'Subtarea'}
            </span>
            {task.project && <span>{task.project}</span>}
            <span className={prio.className}>{prio.label}</span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-100">{task.title}</h3>
          {parent && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <CornerDownRight className="h-3 w-3" />
              de «{parent.title}»
            </div>
          )}
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {task.kind === 'REQUEST' ? task.requirement || task.description : task.description}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-800/70 pt-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-200">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: assignee?.color ?? '#06B6D4' }}
              />
              <span>{assignee?.name ?? 'Sin asignar'}</span>
            </div>
            <span
              className={`font-mono ${modelText === UNDEFINED_TEXT ? 'italic text-slate-500' : 'text-cyan-400'}`}
            >
              {modelText}
            </span>
          </div>

          {children.length > 0 && (
            <div className="mt-2.5 space-y-1 rounded-lg border border-slate-800/80 bg-[#0A101C] p-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Subtareas ({children.length})
              </div>
              {children.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1 text-slate-300">
                    <CornerDownRight className="h-3 w-3 shrink-0 text-slate-600" />
                    <span className="truncate">{c.title}</span>
                  </span>
                  {stageChip(c)}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-mono">
              ${task.estimatedCostUsd.toFixed(2)} · {task.updatedAt}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {targets.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => onMoveTaskStage(task.id, target)}
                  title={`Mover a ${TASK_STAGE_META[target].label}`}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-all active:scale-95 ${
                    target === 'returned'
                      ? 'border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40'
                      : 'border-slate-700/80 bg-[#0A101C] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300'
                  }`}
                >
                  {target === 'returned' && <Undo2 className="h-3 w-3" />}
                  {moveLabel(target)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const draggingTask = draggingId ? taskMap.get(draggingId) : undefined;

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
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 overflow-auto p-5 lg:px-8">
        {viewMode === 'kanban' ? (
          <div className="grid min-w-[1700px] grid-cols-7 gap-3">
            {KANBAN_STAGES.map((stageKey) => {
              const stageMeta = TASK_STAGE_META[stageKey];
              const colTasks = filteredTasks.filter((t) => t.stage === stageKey);
              const dropAllowed =
                !!draggingTask?.apiStatus && canMoveTo(draggingTask.apiStatus, stageKey);
              const dimmed = !!draggingTask && !dropAllowed && draggingTask.stage !== stageKey;
              return (
                <div
                  key={stageKey}
                  onDragOver={(e) => {
                    if (!draggingId || !dropAllowed) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStage !== stageKey) setDragOverStage(stageKey);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setDragOverStage((cur) => (cur === stageKey ? null : cur));
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain') || draggingId;
                    setDraggingId(null);
                    setDragOverStage(null);
                    const dropped = tasks.find((t) => t.id === id);
                    if (
                      dropped?.apiStatus &&
                      dropped.stage !== stageKey &&
                      canMoveTo(dropped.apiStatus, stageKey)
                    ) {
                      onMoveTaskStage(dropped.id, stageKey);
                    }
                  }}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-[#0A1120]/90 transition-all ${
                    dragOverStage === stageKey && draggingId
                      ? 'border-cyan-400/80 bg-cyan-500/5 ring-1 ring-cyan-400/50'
                      : 'border-slate-800/80'
                  } ${dimmed ? 'opacity-35' : ''}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: stageMeta.accent }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                        {stageMeta.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-400">{colTasks.length}</span>
                  </div>

                  <div className="flex-1 space-y-3 p-2.5">
                    {colTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-500">
                        Sin tareas en esta etapa
                      </div>
                    ) : (
                      colTasks.map((task) => renderCard(task))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                  {listRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                        No hay tareas que coincidan con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    listRows.map(({ task, depth }) => {
                      const assignee = agentMap.get(task.assigneeId);
                      const prio = priorityView(task.priority);
                      const targets = task.apiStatus ? validTargetStages(task.apiStatus) : [];
                      const modelText = modelTextOf(task, assignee);
                      return (
                        <tr key={task.id} className="transition-colors hover:bg-slate-800/35">
                          <td className="px-5 py-3.5">
                            <div
                              className="flex items-center gap-1.5 font-medium text-slate-100"
                              style={{ paddingLeft: depth * 20 }}
                            >
                              {depth > 0 && <CornerDownRight className="h-3 w-3 text-slate-600" />}
                              {task.title}
                              <span className="rounded-md border border-slate-600/60 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-normal text-slate-300">
                                {task.kind === 'REQUEST' ? 'Pedido' : 'Subtarea'}
                              </span>
                            </div>
                            <div
                              className="text-[11px] text-slate-500"
                              style={{ paddingLeft: depth * 20 }}
                            >
                              {task.project ? `${task.project} · ` : ''}
                              {task.updatedAt}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-slate-200">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: assignee?.color ?? '#06B6D4' }}
                              />
                              <span>{assignee?.name ?? 'Sin asignar'}</span>
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3.5 font-mono ${modelText === UNDEFINED_TEXT ? 'italic text-slate-500' : 'text-cyan-400'}`}
                          >
                            {modelText}
                          </td>
                          <td className={`px-4 py-3.5 ${prio.className}`}>{prio.label}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                            ${task.estimatedCostUsd.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={task.stage}
                              onChange={(e) => onMoveTaskStage(task.id, e.target.value as TaskStage)}
                              aria-label={`Etapa de ${task.title}`}
                              className="rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                            >
                              <option value={task.stage}>{TASK_STAGE_META[task.stage].label}</option>
                              {targets.map((st) => (
                                <option key={st} value={st}>
                                  {moveLabel(st)}
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

      {/* Modal Nueva tarea (pedido del CEO) */}
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
              <h2 id="create-task-title" className="text-sm font-semibold text-slate-100">
                Nueva tarea
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setCreateOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateSubmit(e)} className="space-y-4 p-5">
              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-xs font-medium text-slate-300">
                  Título
                </label>
                <input
                  id="task-title"
                  type="text"
                  maxLength={200}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder="Ej. Landing de la nueva campaña"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="task-req" className="mb-1.5 block text-xs font-medium text-slate-300">
                  Especificación o requerimiento
                </label>
                <textarea
                  id="task-req"
                  rows={5}
                  maxLength={5000}
                  value={requirement}
                  onChange={(e) => {
                    setRequirement(e.target.value);
                    setFormError('');
                  }}
                  placeholder="Qué necesitas, para quién y cómo sabrás que está bien..."
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="task-project" className="mb-1.5 block text-xs font-medium text-slate-300">
                  Proyecto
                </label>
                <select
                  id="task-project"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setFormError('');
                  }}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Selecciona un proyecto…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-400">
                    No hay proyectos activos: créalos en Administración → Proyectos.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#070B12] px-3.5 py-2.5 text-[11px] text-slate-400">
                Se asigna sola al <span className="text-slate-200">CTO</span>. Prioridad y modelo:{' '}
                <span className="italic text-slate-300">{UNDEFINED_TEXT}</span> (los decide el CTO).
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
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Crear tarea
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
