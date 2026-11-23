import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Folder,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import type { ApiWorkspace, ApiWorkspaceCheck } from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';

interface WorkspaceCheckState {
  loading: boolean;
  result?: ApiWorkspaceCheck;
  error?: string;
}

interface FormState {
  isOpen: boolean;
  isEditing: boolean;
  id: string;
  name: string;
  path: string;
  error?: string;
  idError?: string;
  idManuallyEdited?: boolean;
  submitting: boolean;
}

const WS_ID_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;

const slugifyWorkspaceId = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);

export const WorkspacesPanel: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, WorkspaceCheckState>>({});

  // Modal de Crear / Editar
  const [form, setForm] = useState<FormState>({
    isOpen: false,
    isEditing: false,
    id: '',
    name: '',
    path: '',
    submitting: false,
  });

  // Modal de Confirmación de Borrado
  const [deletingWorkspace, setDeletingWorkspace] = useState<ApiWorkspace | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Error al cargar los espacios de trabajo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCheck = async (id: string) => {
    setChecks((prev) => ({
      ...prev,
      [id]: { loading: true },
    }));

    try {
      const result = await api.checkWorkspace(id);
      setChecks((prev) => ({
        ...prev,
        [id]: { loading: false, result },
      }));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al comprobar';
      setChecks((prev) => ({
        ...prev,
        [id]: { loading: false, error: msg },
      }));
    }
  };

  const openCreateModal = () => {
    setForm({
      isOpen: true,
      isEditing: false,
      id: '',
      name: '',
      path: '',
      submitting: false,
      error: undefined,
      idError: undefined,
      idManuallyEdited: false,
    });
  };

  const openEditModal = (ws: ApiWorkspace) => {
    setForm({
      isOpen: true,
      isEditing: true,
      id: ws.id,
      name: ws.name,
      path: ws.path,
      submitting: false,
      error: undefined,
      idError: undefined,
      idManuallyEdited: true,
    });
  };

  const handleNameChange = (val: string) => {
    setForm((prev) => {
      if (prev.isEditing || prev.idManuallyEdited) {
        return { ...prev, name: val };
      }
      const proposed = slugifyWorkspaceId(val);
      const isInvalid = proposed.length > 0 && !WS_ID_REGEX.test(proposed);
      return {
        ...prev,
        name: val,
        id: proposed,
        idError: isInvalid ? 'Solo minúsculas, números, - y _ (ej. pagina-abogada)' : undefined,
      };
    });
  };

  const handleIdChange = (val: string) => {
    const trimmed = val.trim();
    const isInvalid = trimmed.length > 0 && !WS_ID_REGEX.test(trimmed);
    setForm((prev) => ({
      ...prev,
      id: val,
      idManuallyEdited: true,
      idError: isInvalid ? 'Solo minúsculas, números, - y _ (ej. pagina-abogada)' : undefined,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = form.id.trim();
    const trimmedName = form.name.trim();
    const trimmedPath = form.path.trim();

    if (!WS_ID_REGEX.test(trimmedId)) {
      setForm((prev) => ({
        ...prev,
        idError: 'Solo minúsculas, números, - y _ (ej. pagina-abogada)',
      }));
      return;
    }
    if (!trimmedName) {
      setForm((prev) => ({ ...prev, error: 'El nombre es obligatorio.' }));
      return;
    }
    if (!trimmedPath) {
      setForm((prev) => ({ ...prev, error: 'La ruta local es obligatoria.' }));
      return;
    }

    setForm((prev) => ({ ...prev, submitting: true, error: undefined, idError: undefined }));

    try {
      await api.upsertWorkspace(trimmedId, {
        name: trimmedName,
        path: trimmedPath,
      });
      setForm({
        isOpen: false,
        isEditing: false,
        id: '',
        name: '',
        path: '',
        submitting: false,
        error: undefined,
        idError: undefined,
        idManuallyEdited: false,
      });
      await fetchWorkspaces();
      void handleCheck(trimmedId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setForm((prev) => ({
          ...prev,
          submitting: false,
          idError: err.message,
          error: undefined,
        }));
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Error al guardar el espacio.';
      setForm((prev) => ({ ...prev, submitting: false, error: msg }));
    }
  };

  const confirmDelete = async () => {
    if (!deletingWorkspace) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteWorkspace(deletingWorkspace.id);
      setDeletingWorkspace(null);
      await fetchWorkspaces();
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Error al eliminar el espacio.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (listError && workspaces.length === 0 && !loading) {
    return (
      <section className="space-y-4">
        <AdminErrorCard message={listError} onRetry={() => void fetchWorkspaces()} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Banner de Aviso de Seguridad */}
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 text-xs text-cyan-200">
        <Info className="h-4 w-4 shrink-0 text-cyan-400" />
        <p>
          <span className="font-semibold text-cyan-100">Aviso:</span> La ruta solo la usa el
          servidor; los agentes nunca la ven.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Folder className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Espacios de trabajo</h2>
            <span className="font-mono text-xs text-slate-400">{workspaces.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchWorkspaces()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir espacio
            </button>
          </div>
        </div>

        {listError && (
          <div className="m-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            {listError}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Cargando espacios de trabajo…
          </div>
        ) : workspaces.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">
              No hay espacios de trabajo configurados. Crea uno para asociar carpetas del servidor.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir primer espacio
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Nombre</th>
                  <th className="px-3 py-2.5 font-medium">Ruta local</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {workspaces.map((ws) => {
                  const check = checks[ws.id];
                  return (
                    <tr key={ws.id} className="text-slate-200">
                      <td className="px-5 py-3 font-mono font-medium text-cyan-300">
                        {ws.id}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-100">{ws.name}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                        <span className="rounded bg-slate-950/60 px-2 py-1 border border-slate-800/60">
                          {ws.path}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {!check ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            Sin comprobar
                          </span>
                        ) : check.loading ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Comprobando…
                          </span>
                        ) : check.error ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {check.error}
                          </span>
                        ) : check.result ? (
                          check.result.exists && check.result.isDir && check.result.writable ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              Disponible (RW)
                            </span>
                          ) : check.result.exists && check.result.isDir && !check.result.writable ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
                              <AlertCircle className="h-3 w-3" />
                              Solo lectura
                            </span>
                          ) : check.result.exists && !check.result.isDir ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/30">
                              <XCircle className="h-3 w-3" />
                              No es carpeta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/30">
                              <XCircle className="h-3 w-3" />
                              No existe
                            </span>
                          )
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleCheck(ws.id)}
                            disabled={check?.loading}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
                            title="Comprobar acceso y permisos a la ruta en el servidor"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${check?.loading ? 'animate-spin' : ''}`}
                            />
                            Comprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ws)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingWorkspace(ws);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-900/60 bg-rose-950/20 px-2.5 py-1 text-[11px] text-rose-300 transition-colors hover:border-rose-500/60 hover:bg-rose-900/40"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
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
      </div>

      {/* Modal Crear / Editar Workspace */}
      {form.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">
                {form.isEditing ? 'Editar espacio de trabajo' : 'Añadir espacio de trabajo'}
              </h3>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isOpen: false }))}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              {form.error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {form.error}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300">
                  Identificador (ID)
                </label>
                <input
                  type="text"
                  required
                  disabled={form.isEditing}
                  value={form.id}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="ej. workspace-front"
                  className={`mt-1 w-full rounded-xl border ${
                    form.idError
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-700/80 focus:border-cyan-500'
                  } bg-slate-900/90 px-3.5 py-2 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
                />
                {form.idError ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-400">{form.idError}</p>
                ) : !form.isEditing ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Solo minúsculas, números, - y _ (ej. pagina-abogada)
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ej. Repositorio Front"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Ruta local en el servidor
                </label>
                <input
                  type="text"
                  required
                  value={form.path}
                  onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                  placeholder="ej. D:\proyectos\mi-proyecto"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-cyan-400/80">
                  La ruta solo la usa el servidor; los agentes nunca la ven.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isOpen: false }))}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={form.submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 font-semibold text-slate-950 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {form.submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {form.isEditing ? 'Guardar cambios' : 'Crear espacio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingWorkspace && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  ¿Eliminar espacio de trabajo?
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Estás a punto de eliminar <span className="font-semibold text-slate-200">«{deletingWorkspace.name}»</span> ({deletingWorkspace.id}).
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-medium text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No se pudo eliminar (Conflicto 409):
                </div>
                <p className="mt-1 text-rose-300">{deleteError}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingWorkspace(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Eliminar espacio
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
