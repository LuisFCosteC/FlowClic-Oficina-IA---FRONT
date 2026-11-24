import React, { useMemo, useState } from 'react';
import { AlertCircle, Archive, FolderKanban, Loader2, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import type { ApiProject } from '../api/types';

const PROJECT_ID_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;
const ID_HINT = 'Solo minúsculas, números, - y _; empieza por letra (ej. pagina-abogada)';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, 32)
    .replace(/[-_]+$/, '');

const splitLines = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const splitCommas = (text: string): string[] =>
  text
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

interface FormState {
  open: boolean;
  editingId: string | null;
  id: string;
  idTouched: boolean;
  name: string;
  description: string;
  goals: string;
  stack: string;
  submitting: boolean;
  error?: string;
  idError?: string;
}

const EMPTY_FORM: FormState = {
  open: false,
  editingId: null,
  id: '',
  idTouched: false,
  name: '',
  description: '',
  goals: '',
  stack: '',
  submitting: false,
};

interface ProjectsPanelProps {
  /** Todos los proyectos (activos y archivados), vivos por SSE. */
  projects: ApiProject[];
  onProjectChange: (project: ApiProject) => void;
}

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({ projects, onProjectChange }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<ApiProject | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () =>
      [...projects]
        .filter((p) => showArchived || p.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [projects, showArchived]
  );

  const openCreate = () => setForm({ ...EMPTY_FORM, open: true });
  const openEdit = (p: ApiProject) =>
    setForm({
      ...EMPTY_FORM,
      open: true,
      editingId: p.id,
      id: p.id,
      idTouched: true,
      name: p.name,
      description: p.description,
      goals: p.goals.join('\n'),
      stack: p.stack.join(', '),
    });

  const onNameChange = (name: string) =>
    setForm((f) =>
      f.editingId || (f.idTouched && f.id.trim() !== '')
        ? { ...f, name }
        : { ...f, name, id: slugify(name), idError: undefined }
    );

  const onIdChange = (id: string) =>
    setForm((f) => ({
      ...f,
      id,
      idTouched: id.trim() !== '',
      idError: id.trim() && !PROJECT_ID_REGEX.test(id.trim()) ? ID_HINT : undefined,
    }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id.trim();
    const name = form.name.trim();
    if (!form.editingId && !PROJECT_ID_REGEX.test(id)) {
      setForm((f) => ({ ...f, idError: ID_HINT }));
      return;
    }
    if (!name) {
      setForm((f) => ({ ...f, error: 'El nombre es obligatorio.' }));
      return;
    }
    setForm((f) => ({ ...f, submitting: true, error: undefined }));
    try {
      const body = {
        name,
        description: form.description.trim(),
        goals: splitLines(form.goals),
        stack: splitCommas(form.stack),
      };
      const saved = form.editingId
        ? await api.updateProject(form.editingId, body)
        : await api.createProject({ id, ...body });
      onProjectChange(saved);
      setForm(EMPTY_FORM);
    } catch (err) {
      setForm((f) => ({
        ...f,
        submitting: false,
        error: getApiErrorMessage(err, 'No se pudo guardar el proyecto.'),
      }));
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

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100">Proyectos</h2>
          <span className="font-mono text-xs text-slate-400">{visible.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            Mostrar archivados
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:bg-cyan-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear proyecto
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-xs text-slate-500">
          Aún no hay proyectos. Crea el primero para poder asignarle tareas, espacios y agentes.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Proyecto</th>
                <th className="px-3 py-2.5 font-medium">ID</th>
                <th className="px-3 py-2.5 font-medium">Objetivos</th>
                <th className="px-3 py-2.5 font-medium">Stack</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {visible.map((p) => {
                const archived = p.status === 'ARCHIVED';
                return (
                  <tr key={p.id} className={`text-slate-200 ${archived ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className={archived ? 'line-through' : 'font-medium'}>{p.name}</div>
                      {p.description && (
                        <div className="line-clamp-1 text-[11px] text-slate-500">{p.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-cyan-400">{p.id}</td>
                    <td className="px-3 py-3 text-slate-400">{p.goals.length || '—'}</td>
                    <td className="px-3 py-3 text-slate-400">{p.stack.join(', ') || '—'}</td>
                    <td className="px-3 py-3">
                      {archived ? (
                        <span className="text-amber-400">Archivado</span>
                      ) : (
                        <span className="text-emerald-400">Activo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setConfirm(p);
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] ${
                            archived
                              ? 'border-emerald-700/80 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40'
                              : 'border-amber-900/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40'
                          }`}
                        >
                          {archived ? <RotateCcw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                          {archived ? 'Restaurar' : 'Archivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Crear / editar */}
      {form.open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1220] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                {form.editingId ? 'Editar proyecto' : 'Crear proyecto'}
              </h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setForm(EMPTY_FORM)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void save(e)} className="mt-4 space-y-3.5 text-xs">
              {form.error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {form.error}
                </div>
              )}
              <label className="block font-medium text-slate-300">
                Nombre
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="ej. Página de la abogada"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </label>
              <label className="block font-medium text-slate-300">
                Identificador (ID)
                <input
                  type="text"
                  required
                  disabled={!!form.editingId}
                  value={form.id}
                  onChange={(e) => onIdChange(e.target.value)}
                  placeholder="ej. pagina-abogada"
                  className={`mt-1 w-full rounded-xl border bg-slate-900/90 px-3.5 py-2 font-mono text-xs text-slate-200 focus:outline-none disabled:opacity-60 ${
                    form.idError ? 'border-rose-500/80' : 'border-slate-700/80 focus:border-cyan-500'
                  }`}
                />
                <span className={`mt-1 block text-[11px] ${form.idError ? 'text-rose-400' : 'text-slate-500'}`}>
                  {form.idError ?? ID_HINT}
                </span>
              </label>
              <label className="block font-medium text-slate-300">
                Descripción
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </label>
              <label className="block font-medium text-slate-300">
                Objetivos (uno por línea)
                <textarea
                  rows={3}
                  value={form.goals}
                  onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </label>
              <label className="block font-medium text-slate-300">
                Stack (separado por comas)
                <input
                  type="text"
                  value={form.stack}
                  onChange={(e) => setForm((f) => ({ ...f, stack: e.target.value }))}
                  placeholder="react, fastapi, turso"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={form.submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                >
                  {form.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {form.editingId ? 'Guardar cambios' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </section>
  );
};
