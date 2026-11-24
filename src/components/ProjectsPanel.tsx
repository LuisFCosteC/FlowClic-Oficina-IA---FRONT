import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  FolderKanban,
  Folder,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Target,
  Layers,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import type { ApiProject, ApiWorkspace, ApiWorkspaceKind } from '../api/types';
import { WORKSPACE_KINDS } from './WorkspacesPanel';

const PROJECT_ID_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;
const ID_HINT = 'Solo minúsculas, números, - y _; empieza por letra (ej. pagina-abogada)';

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

/** Lista de textos con "añadir" (Enter) y quitar. */
const ChipList: React.FC<{
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  max: number;
  maxLen: number;
  block?: boolean;
}> = ({ items, onChange, placeholder, max, maxLen, block }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.length >= max || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <div className={block ? 'space-y-1.5' : 'flex flex-wrap gap-1.5'}>
        {items.map((it, i) => (
          <span
            key={`${i}-${it}`}
            className={`flex items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200 ${
              block ? '' : 'inline-flex'
            }`}
          >
            {it}
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-slate-500 hover:text-rose-400"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
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
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {items.length}/{max}
      </p>
    </div>
  );
};

interface ProjectsPanelProps {
  /** Todos los proyectos (activos y archivados), vivos por SSE. */
  projects: ApiProject[];
  onProjectChange: (project: ApiProject) => void;
}

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({ projects, onProjectChange }) => {
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
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
  const [newWs, setNewWs] = useState({ open: false, name: '', id: '', idTouched: false, path: '', kind: 'other' as ApiWorkspaceKind });

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

  // Al elegir otro proyecto se carga su formulario.
  const select = (p: ApiProject | 'new') => {
    setError(null);
    setIdError(null);
    setWsError(null);
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

  const onNameChange = (name: string) =>
    setDraft((d) =>
      selected || (d.idTouched && d.id.trim() !== '')
        ? { ...d, name }
        : { ...d, name, id: slugify(name) }
    );

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
      const saved = selected
        ? await api.updateProject(selected.id, body)
        : await api.createProject({ id: draft.id.trim(), ...body });
      onProjectChange(saved);
      setSelectedId(saved.id);
      setDraft(draftOf(saved));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el proyecto.'));
    } finally {
      setSaving(false);
    }
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
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(id)) {
      setWsError('El ID del espacio: ' + ID_HINT);
      return;
    }
    if (!newWs.name.trim() || !newWs.path.trim()) {
      setWsError('Nombre y ruta local son obligatorios.');
      return;
    }
    await putWorkspace({ id, name: newWs.name.trim(), path: newWs.path.trim() }, selected.id, newWs.kind);
    setNewWs({ open: false, name: '', id: '', idTouched: false, path: '', kind: 'other' });
  };

  const unassigned = workspaces.filter((w) => !w.projectId);
  const otherProject = workspaces.filter((w) => w.projectId && w.projectId !== selected?.id);
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ───────── Izquierda: editor del proyecto ───────── */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FolderKanban className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              {selected ? `Proyecto: ${selected.name}` : 'Nuevo proyecto'}
            </h2>
            {selected?.status === 'ARCHIVED' && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                Archivado
              </span>
            )}
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
                  selected.status === 'ARCHIVED'
                    ? 'border-emerald-700/80 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40'
                    : 'border-amber-900/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40'
                }`}
              >
                {selected.status === 'ARCHIVED' ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                {selected.status === 'ARCHIVED' ? 'Restaurar' : 'Archivar'}
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

        <form onSubmit={(e) => void save(e)} className="space-y-6 p-6 text-xs">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block font-medium text-slate-300">
              Nombre del proyecto
              <input
                type="text"
                maxLength={120}
                value={draft.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="ej. Página de la abogada"
                className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
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
                className={`mt-1.5 w-full rounded-xl border bg-slate-900/90 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none disabled:opacity-60 ${
                  idError ? 'border-rose-500/80' : 'border-slate-700/80 focus:border-cyan-500'
                }`}
              />
              <span className={`mt-1 block text-[11px] ${idError ? 'text-rose-400' : 'text-slate-500'}`}>
                {idError ?? (selected ? 'El ID no se puede cambiar.' : ID_HINT)}
              </span>
            </label>
          </div>

          <label className="block font-medium text-slate-300">
            Descripción del proyecto
            <textarea
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Describe el propósito general y el alcance del proyecto…"
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>

          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Target className="h-4 w-4 text-cyan-400" />
              Objetivos del proyecto
            </div>
            <div className="mt-2">
              <ChipList
                items={draft.goals}
                onChange={(goals) => setDraft((d) => ({ ...d, goals }))}
                placeholder="Añadir nuevo objetivo (pulsa Enter)…"
                max={20}
                maxLen={200}
                block
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Layers className="h-4 w-4 text-cyan-400" />
              Stack tecnológico
            </div>
            <div className="mt-2 max-w-md">
              <ChipList
                items={draft.stack}
                onChange={(stack) => setDraft((d) => ({ ...d, stack }))}
                placeholder="ej. Python, FastAPI, React…"
                max={30}
                maxLen={60}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-2.5 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {selected ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>

        {/* Espacios de trabajo del proyecto */}
        <div className="border-t border-slate-800/80 p-6 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <Folder className="h-4 w-4 text-cyan-400" />
            Espacios de trabajo del proyecto
            {selected && <span className="font-mono text-slate-400">{wsOf(selected.id).length}</span>}
          </div>

          {!selected ? (
            <p className="mt-3 text-slate-500">Guarda el proyecto para poder añadirle espacios de trabajo.</p>
          ) : (
            <>
              {wsError && (
                <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {wsError}
                </div>
              )}

              {wsOf(selected.id).length === 0 ? (
                <p className="mt-3 text-slate-500">Este proyecto aún no tiene espacios de trabajo.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {wsOf(selected.id).map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-cyan-300">{w.id}</span>
                          <span className="text-slate-300">{w.name}</span>
                          <span className="rounded-md border border-slate-600/60 bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-300">
                            {WORKSPACE_KINDS.find((k) => k.id === (w.kind ?? 'other'))?.label ?? 'Otro'}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{w.path}</div>
                      </div>
                      <button
                        type="button"
                        disabled={wsBusy}
                        onClick={() => void putWorkspace(w, null)}
                        className="rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-50"
                      >
                        Quitar del proyecto
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Asignar uno existente */}
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="block min-w-[220px] flex-1 font-medium text-slate-300">
                  Asignar un espacio existente
                  <select
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
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
                  className="rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  Asignar
                </button>
                <button
                  type="button"
                  onClick={() => setNewWs((w) => ({ ...w, open: !w.open }))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3.5 py-2 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear espacio nuevo
                </button>
              </div>

              {newWs.open && (
                <div className="mt-3 grid gap-3 rounded-xl border border-slate-800 bg-[#070B14] p-3.5 sm:grid-cols-2">
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
                      className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  <label className="block font-medium text-slate-300">
                    ID
                    <input
                      type="text"
                      value={newWs.id}
                      onChange={(e) =>
                        setNewWs((w) => ({ ...w, id: e.target.value, idTouched: e.target.value.trim() !== '' }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  <label className="block font-medium text-slate-300">
                    Tipo de carpeta
                    <select
                      value={newWs.kind}
                      onChange={(e) => setNewWs((w) => ({ ...w, kind: e.target.value as ApiWorkspaceKind }))}
                      className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
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
                      className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  <div className="sm:col-span-2 flex justify-end">
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
            </>
          )}
        </div>
      </section>

      {/* ───────── Derecha: todos los proyectos (scroll interno) ───────── */}
      <aside className="flex max-h-[calc(100vh-170px)] min-h-[320px] flex-col rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="border-b border-slate-800/80 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              Proyectos <span className="font-mono text-xs text-slate-400">{listed.length}</span>
            </h3>
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
            <p className="p-6 text-center text-xs text-slate-500">
              {projects.length === 0
                ? 'Aún no hay proyectos. Crea el primero con el formulario.'
                : 'Ningún proyecto coincide.'}
            </p>
          ) : (
            listed.map((p) => {
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p)}
                  className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    active
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-slate-800 bg-[#0D1525] hover:border-slate-600'
                  } ${p.status === 'ARCHIVED' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-slate-100">{p.name}</span>
                    {p.status === 'ARCHIVED' && (
                      <span className="shrink-0 text-[10px] text-amber-400">Archivado</span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-cyan-400">{p.id}</div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{wsOf(p.id).length} espacios</span>
                    <span>{p.goals.length} objetivos</span>
                    <span className="truncate">{p.stack.join(', ')}</span>
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
