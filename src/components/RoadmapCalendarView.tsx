import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flag,
  Plus,
  X,
} from 'lucide-react';
import { Agent, ProjectMilestone, ProjectRoadmap } from '../types/orbis';

interface RoadmapCalendarViewProps {
  projects: ProjectRoadmap[];
  agents: Agent[];
  onUpdateProjectDates: (
    projectId: string,
    dates: { startDate: string; reviewDate: string; endDate: string }
  ) => void;
  onAddMilestone: (projectId: string, milestone: ProjectMilestone) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MILESTONE_META: Record<
  ProjectMilestone['type'],
  { label: string; color: string }
> = {
  inicio: { label: 'Inicio', color: '#06B6D4' },
  revision_sheldon: { label: 'Revisión Sheldon', color: '#F59E0B' },
  entrega: { label: 'Entrega Final', color: '#10B981' },
};

const TIMELINE_START = new Date('2026-11-01T00:00:00').getTime();
const TIMELINE_END = new Date('2026-12-15T00:00:00').getTime();
const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START;

function dateToPct(dateStr: string): number {
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  const raw = ((t - TIMELINE_START) / TIMELINE_SPAN) * 100;
  return Math.max(0, Math.min(100, raw));
}

export const RoadmapCalendarView: React.FC<RoadmapCalendarViewProps> = ({
  projects,
  agents,
  onUpdateProjectDates,
  onAddMilestone,
}) => {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10); // November 2026
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-22');
  const [modalOpen, setModalOpen] = useState(false);

  const [msProjectId, setMsProjectId] = useState(projects[0]?.id ?? '');
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState('2026-11-24');
  const [msType, setMsType] =
    useState<ProjectMilestone['type']>('revision_sheldon');

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        id: string;
        projectName: string;
        projectColor: string;
        title: string;
        type: ProjectMilestone['type'];
      }>
    >();

    const push = (
      date: string,
      entry: {
        id: string;
        projectName: string;
        projectColor: string;
        title: string;
        type: ProjectMilestone['type'];
      }
    ) => {
      const list = map.get(date) ?? [];
      list.push(entry);
      map.set(date, list);
    };

    projects.forEach((proj) => {
      proj.milestones.forEach((ms) => {
        push(ms.date, {
          id: ms.id,
          projectName: proj.name,
          projectColor: proj.color,
          title: ms.title,
          type: ms.type,
        });
      });
    });

    return map;
  }, [projects]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7;

    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ dateStr: `${year}-${mm}-${dd}`, dayNum: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateStr: null, dayNum: null });
    }
    return cells;
  }, [year, month]);

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim() || !msProjectId) return;
    onAddMilestone(msProjectId, {
      id: `ms-${Date.now()}`,
      title: msTitle.trim(),
      date: msDate,
      type: msType,
      completed: false,
    });
    setSelectedDate(msDate);
    setMsTitle('');
    setModalOpen(false);
  };

  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className="h-full overflow-y-auto px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-[1340px] space-y-6">
        {/* Section 1: Simplified Interactive Gantt Timeline */}
        <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Línea de Tiempo de Proyectos (Gantt)
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Ajusta fechas de inicio, revisión de Sheldon y entrega final para actualizar el roadmap en vivo.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>Ejecución</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>Hito Sheldon</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Entrega</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px] divide-y divide-slate-800/70">
              {/* Scale header */}
              <div className="grid grid-cols-12 bg-[#090F1B] px-5 py-2.5 font-mono text-[11px] text-slate-400">
                <div className="col-span-4">Proyecto & Fechas Clave</div>
                <div className="col-span-8 flex justify-between">
                  <span>01 Nov</span>
                  <span>10 Nov</span>
                  <span>20 Nov</span>
                  <span>30 Nov</span>
                  <span>15 Dic</span>
                </div>
              </div>

              {projects.map((proj) => {
                const startPct = dateToPct(proj.startDate);
                const endPct = Math.max(startPct + 4, dateToPct(proj.endDate));
                const reviewPct = dateToPct(proj.reviewDate);
                const todayPct = dateToPct('2026-11-22');
                const lead = agentMap.get(proj.leadAgentId);

                return (
                  <div
                    key={proj.id}
                    className="grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-800/20"
                  >
                    {/* Project metadata + editable dates */}
                    <div className="col-span-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="text-sm font-semibold text-slate-100">
                            {proj.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-300">
                          {proj.progress}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {proj.client} · Líder: {lead?.name ?? 'Sheldon'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                        <label className="block">
                          <span className="text-slate-500">Inicio</span>
                          <input
                            type="date"
                            value={proj.startDate}
                            onChange={(e) =>
                              onUpdateProjectDates(proj.id, {
                                startDate: e.target.value,
                                reviewDate: proj.reviewDate,
                                endDate: proj.endDate,
                              })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-800 bg-[#070B12] px-1.5 py-1 font-mono text-[10px] text-slate-200 focus:border-cyan-400 focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-amber-400/90">Rev. Sheldon</span>
                          <input
                            type="date"
                            value={proj.reviewDate}
                            onChange={(e) =>
                              onUpdateProjectDates(proj.id, {
                                startDate: proj.startDate,
                                reviewDate: e.target.value,
                                endDate: proj.endDate,
                              })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-800 bg-[#070B12] px-1.5 py-1 font-mono text-[10px] text-slate-200 focus:border-amber-400 focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-emerald-400/90">Entrega</span>
                          <input
                            type="date"
                            value={proj.endDate}
                            onChange={(e) =>
                              onUpdateProjectDates(proj.id, {
                                startDate: proj.startDate,
                                reviewDate: proj.reviewDate,
                                endDate: e.target.value,
                              })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-800 bg-[#070B12] px-1.5 py-1 font-mono text-[10px] text-slate-200 focus:border-emerald-400 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Rounded Gantt Bar Track */}
                    <div className="relative col-span-8 h-12 rounded-xl bg-[#080E19]">
                      <div
                        className="absolute bottom-1 top-1 w-px bg-cyan-500/45"
                        style={{ left: `${todayPct}%` }}
                        title="Hoy: 22 Nov 2026"
                      />

                      <div
                        className="absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-full border border-slate-700/70 transition-all duration-300"
                        style={{
                          left: `${startPct}%`,
                          width: `${Math.max(4, endPct - startPct)}%`,
                          backgroundColor: `${proj.color}24`,
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${proj.progress}%`,
                            backgroundColor: proj.color,
                            opacity: 0.78,
                          }}
                        />
                      </div>

                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-amber-400 shadow-sm"
                        style={{ left: `${reviewPct}%` }}
                        title={`Revisión Sheldon: ${proj.reviewDate}`}
                      />

                      <div
                        className="absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400"
                        style={{ left: `${endPct}%` }}
                        title={`Entrega Final: ${proj.endDate}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Monthly Calendar + Day Inspector */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20 xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">
                  {MONTH_NAMES[month]} {year}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Mes anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 text-slate-300 transition-all hover:border-cyan-500/60 hover:text-white active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYear(2026);
                    setMonth(10);
                    setSelectedDate('2026-11-22');
                  }}
                  className="rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition-all hover:border-cyan-500/60 active:scale-95"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  aria-label="Mes siguiente"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 text-slate-300 transition-all hover:border-cyan-500/60 hover:text-white active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMsDate(selectedDate);
                    setModalOpen(true);
                  }}
                  className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nuevo Hito</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-800/80 bg-[#090F1B]">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2.5 text-center font-mono text-[11px] font-medium text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 p-2.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[84px] rounded-xl bg-[#080D17]/60"
                    />
                  );
                }
                const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === '2026-11-22';

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr!)}
                    className={`flex min-h-[84px] flex-col rounded-xl border p-2 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-cyan-400/70 bg-cyan-500/12'
                        : 'border-slate-800/60 bg-[#0B1220] hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`font-mono text-xs ${
                          isToday
                            ? 'font-bold text-cyan-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {isToday && (
                        <span className="font-mono text-[9px] text-cyan-400">
                          HOY
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 w-full space-y-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1.5 truncate rounded-md border border-slate-800/80 bg-[#070B12] px-1.5 py-0.5 text-[10px] text-slate-200"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: MILESTONE_META[ev.type].color,
                            }}
                          />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="font-mono text-[10px] text-slate-400">
                          +{dayEvents.length - 2} más
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Milestone Inspector */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20 xl:col-span-4">
            <div className="border-b border-slate-800/80 px-5 py-4">
              <div className="font-mono text-xs text-cyan-400">
                {selectedDate}
              </div>
              <h3 className="mt-1 text-base font-semibold text-slate-100">
                Hitos Programados
              </h3>
            </div>

            <div className="flex-1 space-y-3 p-5">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
                  <Flag className="mx-auto h-5 w-5 text-slate-600" />
                  <p className="mt-2 text-xs text-slate-400">
                    No hay hitos registrados para esta fecha.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMsDate(selectedDate);
                      setModalOpen(true);
                    }}
                    className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 py-2 text-xs text-slate-200 transition-all hover:border-cyan-500/60 active:scale-95"
                  >
                    Programar hito en {selectedDate}
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-slate-800/90 bg-[#080E19] p-4"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: ev.projectColor }}>
                        {ev.projectName}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: MILESTONE_META[ev.type].color }}
                      >
                        {MILESTONE_META[ev.type].label}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-slate-100">
                      {ev.title}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Add Milestone Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-milestone-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0D1422] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <h2
                id="add-milestone-title"
                className="text-sm font-semibold text-slate-100"
              >
                Agregar Hito al Roadmap
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddMilestoneSubmit} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="ms-project"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Proyecto
                </label>
                <select
                  id="ms-project"
                  value={msProjectId}
                  onChange={(e) => setMsProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="ms-title"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Nombre del hito
                </label>
                <input
                  id="ms-title"
                  type="text"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  placeholder="Ej. Auditoría final de rendimiento con Sheldon"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ms-date"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Fecha
                  </label>
                  <input
                    id="ms-date"
                    type="date"
                    value={msDate}
                    onChange={(e) => setMsDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 font-mono text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ms-type"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Tipo de hito
                  </label>
                  <select
                    id="ms-type"
                    value={msType}
                    onChange={(e) =>
                      setMsType(e.target.value as ProjectMilestone['type'])
                    }
                    className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="inicio">Inicio de fase</option>
                    <option value="revision_sheldon">Revisión Sheldon</option>
                    <option value="entrega">Entrega Final</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95"
                >
                  Guardar Hito
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
