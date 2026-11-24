import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Folder,
  FolderKanban,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Target,
  Undo2,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import type { ApiProject, ApiWorkspace, ApiWorkspaceKind } from '../api/types';
import { WORKSPACE_KINDS } from './WorkspacesPanel';

const PROJECT_ID_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;
const ID_HINT = 'Solo minúsculas, números, - y _; empieza por letra (ej. pagina-abogada)';

/** Color por tipo de carpeta (misma paleta en todo el panel). */
const KIND_STYLE: Record<ApiWorkspaceKind, string> = {
  api: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  front: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  docs: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  mobile: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  other: 'border-slate-600/60 bg-slate-800/60 text-slate-300',
};

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, 32)
    .replace(/[-_]+$/, '');

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?';

/** Color estable del avatar a partir del id del proyecto. */
const AVATARS = [
  'from-cyan-400 to-sky-500',
  'from-violet-400 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-blue-500',
];
const avatarOf = (id: string): string => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
};

interface Draft {
  id: string;
  idTouched: boolean;
  name: string;
  description: string;
  goals: string[];
  stack: string[];
}

const EMPTY_DRAFT: Draft = {
  id: '',
  idTouched: false,
  name: '',
  description: '',
  goals: [],
  stack: [],
};

const draftOf = (p: ApiProject): Draft => ({
  id: p.id,
  idTouched: true,
  name: p.name,
  description: p.description,
  goals: [...p.goals],
  stack: [...p.stack],
});

const sameDraft = (a: Draft, b: Draft): boolean =>
  a.name === b.name &&
  a.description === b.description &&
  JSON.stringify(a.goals) === JSON.stringify(b.goals) &&
  JSON.stringify(a.stack) === JSON.stringify(b.stack);

/** Cabecera de sección: icono, título y ayuda. */
const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}> = ({ icon, title, hint, right }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
        {icon}
      </span>
      <div>
        <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
    {right}
  </div>
);

/** Lista de textos con "añadir" (Enter) y quitar. */
const ChipList: React.FC<{
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  max: number;
  maxLen: number;
  numbered?: boolean;
}> = ({ items, onChange, placeholder, max, maxLen, numbered }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.length >= max || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 px-3 py-3 text-center text-[11px] text-slate-500">
          Aún no hay elementos.
        </p>
      ) : numbered ? (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={`${i}-${it}`}
              className="group flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200"
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-[10px] text-cyan-300">
                {i + 1}
              </span>
              <span className="flex-1">{it}</span>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-slate-600 transition-colors hover:text-rose-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span
              key={`${i}-${it}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200"
            >
              {it}
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-cyan-400/60 hover:text-rose-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={maxLen}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
        <span className="w-10 text-right font-mono text-[10px] text-slate-500">
          {items.length}/{max}
        </span>
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: number | string; label: string }> = ({ value, label }) => (
  <div className="rounded-xl border border-slate-800 bg-[#070B14]/80 px-3.5 py-2">
    <div className="font-mono text-base font-semibold text-slate-100">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
  </div>
);

interface ProjectsPanelProps {
  /** Todos los proyectos (activos y archivados), vivos por SSE. */
  projects: ApiProject[];
  onProjectChange: (project: ApiProject) => void;
}

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({ projects, onProjectChange }) => {
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ApiProject | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Espacios de trabajo
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsBusy, setWsBusy] = useState(false);
  const [assignId, setAssignId] = useState('');
  const [newWs, setNewWs] = useState({
    open: false,
    name: '',
    id: '',
    idTouched: false,
    path: '',
    kind: 'other' as ApiWorkspaceKind,
  });

  const loadWorkspaces = useCallback(async () => {
    try {
      setWorkspaces(await api.listWorkspaces());
      setWsError(null);
    } catch (err) {
      setWsError(getApiErrorMessage(err, 'No se pudieron cargar los espacios de trabajo.'));
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const selected = useMemo(
    () => (selectedId === 'new' ? undefined : projects.find((p) => p.id === selectedId)),
    [projects, selectedId]
  );
  const dirty = selected ? !sameDraft(draft, draftOf(selected)) : draft.name.trim() !== '';

  const select = (p: ApiProject | 'new') => {
    setError(null);
    setIdError(null);
    setWsError(null);
    setSaved(false);
    setAssignId('');
    setNewWs((w) => ({ ...w, open: false }));
    if (p === 'new') {
      setSelectedId('new');
      setDraft(EMPTY_DRAFT);
    } else {
      setSelectedId(p.id);
      setDraft(draftOf(p));
    }
  };

  // Primer proyecto activo por defecto.
  useEffect(() => {
    if (selectedId === 'new' && draft === EMPTY_DRAFT && projects.length > 0) {
      const first = projects.find((p) => p.status === 'ACTIVE') ?? projects[0];
      setSelectedId(first.id);
      setDraft(draftOf(first));
    }
  }, [projects, selectedId, draft]);

  const listed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...projects]
      .filter((p) => showArchived || p.status === 'ACTIVE' || p.id === selectedId)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [projects, showArchived, search, selectedId]);

  const wsOf = (projectId: string) => workspaces.filter((w) => w.projectId === projectId);

  const onNameChange = (name: string) => {
    setSaved(false);
    setDraft((d) =>
      selected || (d.idTouched && d.id.trim() !== '')
        ? { ...d, name }
        : { ...d, name, id: slugify(name) }
    );
  };

  const onIdChange = (id: string) => {
    setDraft((d) => ({ ...d, id, idTouched: id.trim() !== '' }));
    setIdError(id.trim() && !PROJECT_ID_REGEX.test(id.trim()) ? ID_HINT : null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = draft.name.trim();
    if (!selected && !PROJECT_ID_REGEX.test(draft.id.trim())) {
      setIdError(ID_HINT);
      return;
    }
    if (!name) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        description: draft.description.trim(),
        goals: draft.goals,
        stack: draft.stack,
      };
      const result = selected
        ? await api.updateProject(selected.id, body)
        : await api.createProject({ id: draft.id.trim(), ...body });
      onProjectChange(result);
      setSelectedId(result.id);
      setDraft(draftOf(result));
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el proyecto.'));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setError(null);
    setIdError(null);
    setSaved(false);
    setDraft(selected ? draftOf(selected) : EMPTY_DRAFT);
  };

  const runArchiveOrRestore = async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated =
        confirm.status === 'ACTIVE'
          ? await api.archiveProject(confirm.id)
          : await api.restoreProject(confirm.id);
      onProjectChange(updated);
      setConfirm(null);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'No se pudo completar la operación.'));
    } finally {
      setBusy(false);
    }
  };

  // ── Espacios de trabajo del proyecto ──
  const putWorkspace = async (
    ws: Pick<ApiWorkspace, 'id' | 'name' | 'path'>,
    projectId: string | null,
    kind?: ApiWorkspaceKind
  ) => {
    setWsBusy(true);
    setWsError(null);
    try {
      await api.upsertWorkspace(ws.id, {
        name: ws.name,
        path: ws.path,
        projectId,
        ...(kind ? { kind } : {}),
      });
      await loadWorkspaces();
    } catch (err) {
      setWsError(getApiErrorMessage(err, 'No se pudo actualizar el espacio de trabajo.'));
    } finally {
      setWsBusy(false);
    }
  };

  const assign = async () => {
    const ws = workspaces.find((w) => w.id === assignId);
    if (!ws || !selected) return;
    await putWorkspace(ws, selected.id);
    setAssignId('');
  };

  const createWs = async () => {
    if (!selected) return;
    const id = newWs.id.trim();
    if (!PROJECT_ID_REGEX.test(id)) {
      setWsError('El ID del espacio: ' + ID_HINT);
      return;
    }
    if (!newWs.name.trim() || !newWs.path.trim()) {
      setWsError('Nombre y ruta local son obligatorios.');
      return;
    }
    await putWorkspace(
      { id, name: newWs.name.trim(), path: newWs.path.trim() },
      selected.id,
      newWs.kind
    );
    setNewWs({ open: false, name: '', id: '', idTouched: false, path: '', kind: 'other' });
  };

  const unassigned = workspaces.filter((w) => !w.projectId);
  const otherProject = workspaces.filter((w) => w.projectId && w.projectId !== selected?.id);
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const archivedSelected = selected?.status === 'ARCHIVED';
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ───────── Izquierda: editor del proyecto ───────── */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        {/* Cabecera del proyecto */}
        <div className="relative border-b border-slate-800/80 bg-gradient-to-br from-cyan-500/[0.07] via-transparent to-transparent px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-slate-950 shadow-lg ${
                  selected ? avatarOf(selected.id) : 'from-slate-600 to-slate-700'
                }`}
              >
                {selected ? initials(selected.name) : <FolderKanban className="h-6 w-6 text-slate-300" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-50">
                    {selected ? selected.name : 'Nuevo proyecto'}
                  </h2>
                  {selected && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        archivedSelected
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {archivedSelected ? 'Archivado' : 'Activo'}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-cyan-400">
                  {selected ? selected.id : 'Define el nombre y el identificador'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setConfirm(selected);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs ${
                    archivedSelected
                      ? 'border-emerald-700/80 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40'
                      : 'border-amber-900/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  {archivedSelected ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {archivedSelected ? 'Restaurar' : 'Archivar'}
                </button>
              )}
              <button
                type="button"
                onClick={() => select('new')}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo proyecto
              </button>
            </div>
          </div>

          {selected && (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:max-w-md">
              <Stat value={wsOf(selected.id).length} label="Espacios" />
              <Stat value={draft.goals.length} label="Objetivos" />
              <Stat value={draft.stack.length} label="Tecnologías" />
            </div>
          )}
        </div>

        <form onSubmit={(e) => void save(e)} className="text-xs">
          <div className="space-y-4 p-6">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Información general */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322]/70 p-5">
              <SectionTitle
                icon={<FolderKanban className="h-3.5 w-3.5" />}
                title="Información general"
                hint="Nombre, identificador y descripción del proyecto."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block font-medium text-slate-300">
                  Nombre del proyecto
                  <input
                    type="text"
                    maxLength={120}
                    value={draft.name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="ej. Página de la abogada"
                    className={inputCls}
                  />
                </label>
                <label className="block font-medium text-slate-300">
                  Identificador (ID)
                  <input
                    type="text"
                    disabled={!!selected}
                    value={draft.id}
                    onChange={(e) => onIdChange(e.target.value)}
                    placeholder="ej. pagina-abogada"
                    className={`${inputCls} font-mono disabled:opacity-60 ${
                      idError ? '!border-rose-500/80' : ''
                    }`}
                  />
                  <span
                    className={`mt-1 block text-[11px] ${idError ? 'text-rose-400' : 'text-slate-500'}`}
                  >
                    {idError ?? (selected ? 'El ID no se puede cambiar.' : ID_HINT)}
                  </span>
                </label>
              </div>
              <label className="mt-4 block font-medium text-slate-300">
                Descripción
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={draft.description}
                  onChange={(e) => {
                    setSaved(false);
                    setDraft((d) => ({ ...d, description: e.target.value }));
                  }}
                  placeholder="Describe el propósito general y el alcance del proyecto…"
                  className={`${inputCls} resize-y`}
                />
                <span className="mt-1 block text-right font-mono text-[10px] text-slate-500">
                  {draft.description.length}/2000
                </span>
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {/* Objetivos */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322]/70 p-5">
                <SectionTitle
                  icon={<Target className="h-3.5 w-3.5" />}
                  title="Objetivos"
                  hint="Qué debe lograr el proyecto."
                />
                <div className="mt-4">
                  <ChipList
                    items={draft.goals}
                    onChange={(goals) => {
                      setSaved(false);
                      setDraft((d) => ({ ...d, goals }));
                    }}
                    placeholder="Nuevo objetivo (Enter)…"
                    max={20}
                    maxLen={200}
                    numbered
                  />
                </div>
              </div>

              {/* Stack */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322]/70 p-5">
                <SectionTitle
                  icon={<Layers className="h-3.5 w-3.5" />}
                  title="Stack tecnológico"
                  hint="Lenguajes, frameworks y servicios."
                />
                <div className="mt-4">
                  <ChipList
                    items={draft.stack}
                    onChange={(stack) => {
                      setSaved(false);
                      setDraft((d) => ({ ...d, stack }));
                    }}
                    placeholder="ej. Python, FastAPI, React…"
                    max={30}
                    maxLen={60}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Barra de guardado */}
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-[#0A1120]/95 px-6 py-3.5 backdrop-blur">
            <div className="text-[11px]">
              {saving ? (
                <span className="text-slate-400">Guardando…</span>
              ) : saved && !dirty ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Cambios guardados
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Cambios sin guardar
                </span>
              ) : (
                <span className="text-slate-500">Sin cambios</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3.5 py-2 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Descartar
              </button>
              <button
                type="submit"
                disabled={saving || !dirty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-2 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {selected ? 'Guardar cambios' : 'Crear proyecto'}
              </button>
            </div>
          </div>
        </form>

        {/* Espacios de trabajo del proyecto */}
        <div className="border-t border-slate-800/80 p-6 text-xs">
          <SectionTitle
            icon={<Folder className="h-3.5 w-3.5" />}
            title="Espacios de trabajo"
            hint="Carpetas del servidor que pertenecen a este proyecto."
            right={
              selected && (
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                  {wsOf(selected.id).length}
                </span>
              )
            }
          />

          {!selected ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-slate-500">
              Guarda el proyecto para poder añadirle espacios de trabajo.
            </p>
          ) : (
            <>
              {wsError && (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {wsError}
                </div>
              )}

              {wsOf(selected.id).length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-slate-500">
                  Este proyecto aún no tiene espacios de trabajo. Asigna uno existente o crea uno nuevo.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {wsOf(selected.id).map((w) => {
                    const kind = w.kind ?? 'other';
                    return (
                      <li
                        key={w.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#070B14] p-3.5 transition-colors hover:border-slate-700"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono font-medium text-cyan-300">{w.id}</span>
                            <span
                              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLE[kind]}`}
                            >
                              {WORKSPACE_KINDS.find((k) => k.id === kind)?.label ?? 'Otro'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-slate-300">{w.name}</div>
                          <div
                            className="mt-1.5 truncate rounded-md bg-slate-950/70 px-2 py-1 font-mono text-[10px] text-slate-500"
                            title={w.path}
                          >
                            {w.path}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={wsBusy}
                          onClick={() => void putWorkspace(w, null)}
                          className="self-end rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-400 hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-50"
                        >
                          Quitar del proyecto
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Asignar uno existente / crear */}
              <div className="mt-4 rounded-2xl border border-slate-800/80 bg-[#0B1322]/70 p-4">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block min-w-[220px] flex-1 font-medium text-slate-300">
                    Asignar un espacio existente
                    <select
                      value={assignId}
                      onChange={(e) => setAssignId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Selecciona un espacio…</option>
                      {unassigned.length > 0 && (
                        <optgroup label="Sin proyecto">
                          {unassigned.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.id} — {w.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherProject.length > 0 && (
                        <optgroup label="De otro proyecto (se mueve)">
                          {otherProject.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.id} — {projectNameById.get(w.projectId ?? '') ?? w.projectId}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!assignId || wsBusy}
                    onClick={() => void assign()}
                    className="rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-4 py-2.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
                  >
                    Asignar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWs((w) => ({ ...w, open: !w.open }))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-4 py-2.5 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crear espacio nuevo
                  </button>
                </div>

                {newWs.open && (
                  <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
                    <label className="block font-medium text-slate-300">
                      Nombre
                      <input
                        type="text"
                        value={newWs.name}
                        onChange={(e) =>
                          setNewWs((w) => ({
                            ...w,
                            name: e.target.value,
                            id: w.idTouched ? w.id : slugify(e.target.value),
                          }))
                        }
                        placeholder="ej. Repositorio Front"
                        className={inputCls}
                      />
                    </label>
                    <label className="block font-medium text-slate-300">
                      ID
                      <input
                        type="text"
                        value={newWs.id}
                        onChange={(e) =>
                          setNewWs((w) => ({
                            ...w,
                            id: e.target.value,
                            idTouched: e.target.value.trim() !== '',
                          }))
                        }
                        className={`${inputCls} font-mono`}
                      />
                    </label>
                    <label className="block font-medium text-slate-300">
                      Tipo de carpeta
                      <select
                        value={newWs.kind}
                        onChange={(e) =>
                          setNewWs((w) => ({ ...w, kind: e.target.value as ApiWorkspaceKind }))
                        }
                        className={inputCls}
                      >
                        {WORKSPACE_KINDS.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block font-medium text-slate-300">
                      Ruta local en el servidor
                      <input
                        type="text"
                        value={newWs.path}
                        onChange={(e) => setNewWs((w) => ({ ...w, path: e.target.value }))}
                        placeholder="ej. D:\proyectos\mi-proyecto"
                        className={`${inputCls} font-mono`}
                      />
                    </label>
                    <div className="flex justify-end sm:col-span-2">
                      <button
                        type="button"
                        disabled={wsBusy}
                        onClick={() => void createWs()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                      >
                        {wsBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Crear y asignar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ───────── Derecha: todos los proyectos (scroll interno) ───────── */}
      <aside className="flex max-h-[calc(100vh-170px)] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 lg:sticky lg:top-0">
        <div className="border-b border-slate-800/80 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Proyectos</h3>
              <p className="text-[11px] text-slate-500">
                {activeCount} activos · {projects.length - activeCount} archivados
              </p>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
              />
              Archivados
            </label>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proyecto…"
              className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {listed.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <FolderKanban className="mx-auto h-8 w-8 text-slate-700" />
              <p className="mt-3 text-xs text-slate-500">
                {projects.length === 0
                  ? 'Aún no hay proyectos. Crea el primero con el formulario.'
                  : 'Ningún proyecto coincide.'}
              </p>
            </div>
          ) : (
            listed.map((p) => {
              const active = p.id === selectedId;
              const archived = p.status === 'ARCHIVED';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p)}
                  className={`group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-cyan-500/60 bg-cyan-500/10 shadow-md shadow-cyan-950/30'
                      : 'border-slate-800 bg-[#0D1525] hover:border-slate-600 hover:bg-[#101A2E]'
                  } ${archived ? 'opacity-60' : ''}`}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-1 bg-cyan-400" />}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-slate-950 ${avatarOf(p.id)}`}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-100">{p.name}</span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            archived ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          title={archived ? 'Archivado' : 'Activo'}
                        />
                      </div>
                      <div className="font-mono text-[10px] text-cyan-400">{p.id}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-md bg-slate-800/70 px-1.5 py-0.5 text-slate-300">
                      {wsOf(p.id).length} espacios
                    </span>
                    <span className="rounded-md bg-slate-800/70 px-1.5 py-0.5 text-slate-300">
                      {p.goals.length} objetivos
                    </span>
                    {p.stack.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300">
                        {t}
                      </span>
                    ))}
                    {p.stack.length > 2 && (
                      <span className="text-slate-500">+{p.stack.length - 2}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Confirmar archivar / restaurar (sin window.confirm) */}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B132B] p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100">
              {confirm.status === 'ACTIVE' ? '¿Archivar proyecto?' : '¿Restaurar proyecto?'}
            </h3>
            <p className="mt-1.5 text-xs text-slate-400">
              {confirm.status === 'ACTIVE'
                ? `«${confirm.name}» dejará de aparecer en los selectores. No se puede archivar si tiene tickets activos.`
                : `«${confirm.name}» volverá a estar disponible.`}
            </p>
            {actionError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {actionError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runArchiveOrRestore()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirm.status === 'ACTIVE' ? 'Archivar' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
