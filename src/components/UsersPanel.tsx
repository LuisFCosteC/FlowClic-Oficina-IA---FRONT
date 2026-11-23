import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import type { ApiAdminUser, ApiUserRole } from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';

const ROLES: Array<{ id: ApiUserRole; label: string; desc: string }> = [
  { id: 'ADMIN', label: 'Administrador (ADMIN)', desc: 'Control total de la plataforma' },
  { id: 'OPERATOR', label: 'Operador (OPERATOR)', desc: 'Gestión de tickets y agentes' },
  { id: 'VIEWER', label: 'Visualizador (VIEWER)', desc: 'Solo lectura de métricas y tareas' },
];

export const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Crear Usuario
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<ApiUserRole>('OPERATOR');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Modal Cambiar Rol
  const [roleModalUser, setRoleModalUser] = useState<ApiAdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ApiUserRole>('OPERATOR');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // Modal Confirmar Activar / Desactivar
  const [toggleUser, setToggleUser] = useState<ApiAdminUser | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Limpieza de contraseña al desmontar
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setNewPassword('');
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar la lista de usuarios.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setNewEmail('');
    setNewDisplayName('');
    setNewRole('OPERATOR');
    setNewPassword('');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim();
    const trimmedName = newDisplayName.trim();

    if (!trimmedEmail) {
      setCreateError('El correo electrónico es obligatorio.');
      return;
    }
    if (!trimmedName) {
      setCreateError('El nombre para mostrar es obligatorio.');
      return;
    }
    if (newPassword.length < 12) {
      setCreateError('La contraseña debe tener al menos 12 caracteres por seguridad.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await api.createUser({
        email: trimmedEmail,
        displayName: trimmedName,
        role: newRole,
        password: newPassword,
      });

      // Vaciado inmediato de la contraseña del estado local
      setNewPassword('');
      setIsCreateOpen(false);
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Error al crear el usuario.');
      }
    } finally {
      setCreating(false);
      // Garantizar vaciado de contraseña en caso de fallo
      setNewPassword('');
    }
  };

  const handleOpenRoleModal = (u: ApiAdminUser) => {
    setRoleModalUser(u);
    setSelectedRole(u.role);
    setRoleError(null);
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    setChangingRole(true);
    setRoleError(null);
    try {
      await api.updateUser(roleModalUser.id, { role: selectedRole });
      setRoleModalUser(null);
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setRoleError(err.message);
      } else {
        setRoleError('Error al cambiar el rol.');
      }
    } finally {
      setChangingRole(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleUser) return;
    setToggling(true);
    setToggleError(null);
    try {
      const willDisable = !toggleUser.disabledAt;
      await api.updateUser(toggleUser.id, { disabled: willDisable });
      setToggleUser(null);
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setToggleError(err.message);
      } else {
        setToggleError('Error al modificar el estado del usuario.');
      }
    } finally {
      setToggling(false);
    }
  };

  if (error && users.length === 0 && !loading) {
    return (
      <section className="space-y-4">
        <AdminErrorCard message={error} onRetry={() => void fetchUsers()} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Gestión de Usuarios ({users.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchUsers()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:-translate-y-0.5 hover:bg-cyan-500/20 active:translate-y-0 active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Crear usuario
            </button>
          </div>
        </div>

        {error && (
          <div className="m-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Nombre</th>
                  <th className="px-3 py-3 font-medium">Rol</th>
                  <th className="px-3 py-3 font-medium">MFA</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {users.map((u) => {
                  const isDisabled = Boolean(u.disabledAt);
                  return (
                    <tr
                      key={u.id}
                      className={`text-slate-200 transition-colors ${
                        isDisabled ? 'opacity-60 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Email */}
                      <td className="px-5 py-3 font-mono text-[11px] text-cyan-300">
                        {u.email}
                      </td>

                      {/* Nombre para mostrar */}
                      <td className="px-3 py-3 font-medium text-slate-100">
                        {u.displayName}
                      </td>

                      {/* Rol */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                            u.role === 'ADMIN'
                              ? 'border-purple-500/30 bg-purple-500/15 text-purple-300'
                              : u.role === 'OPERATOR'
                              ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* MFA activo */}
                      <td className="px-3 py-3">
                        {u.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Sí
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">No</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-3">
                        {isDisabled ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                            Desactivado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            Activo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors"
                          >
                            <Shield className="h-3 w-3" />
                            Rol
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setToggleError(null);
                              setToggleUser(u);
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                              isDisabled
                                ? 'border-emerald-700/80 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500/60'
                                : 'border-rose-900/60 bg-rose-950/20 text-rose-300 hover:border-rose-500/60'
                            }`}
                          >
                            {isDisabled ? (
                              <UserCheck className="h-3 w-3" />
                            ) : (
                              <UserX className="h-3 w-3" />
                            )}
                            {isDisabled ? 'Activar' : 'Desactivar'}
                          </button>

                          {/* Revocar sesiones (desactivado con tooltip S06) */}
                          <button
                            type="button"
                            disabled
                            title="Disponible tras el login (S06)"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-600 cursor-not-allowed"
                          >
                            <Lock className="h-3 w-3" />
                            Revocar
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

      {/* Modal Crear Usuario */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Crear nuevo usuario</h3>
              <button
                type="button"
                onClick={() => {
                  setNewPassword('');
                  setIsCreateOpen(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {createError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-rose-300">
                  {createError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300">
                  Correo electrónico (Email)
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ej. usuario@flowclic.com"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Nombre para mostrar
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="ej. Luis Coste"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">Rol asignado</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as ApiUserRole)}
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Contraseña inicial (mínimo 12 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  La contraseña nunca se guarda en el navegador ni en el estado global.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setIsCreateOpen(false);
                  }}
                  className="rounded-xl border border-slate-700/80 px-4 py-2 text-slate-300 hover:border-slate-600 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 font-semibold text-slate-950 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {creating ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Rol */}
      {roleModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100">
              Cambiar rol de «{roleModalUser.displayName}»
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Selecciona el nuevo nivel de acceso para este usuario.
            </p>

            {roleError && (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-medium text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Operación rechazada (409):
                </div>
                <p className="mt-1 text-rose-300">{roleError}</p>
              </div>
            )}

            <div className="mt-4 space-y-2 text-xs">
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    selectedRole === r.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100'
                      : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="user-role"
                    value={r.id}
                    checked={selectedRole === r.id}
                    onChange={() => setSelectedRole(r.id)}
                    className="mt-0.5 text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold">{r.label}</span>
                    <p className="text-[11px] text-slate-400">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveRole()}
                disabled={changingRole}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {changingRole ? 'Guardando…' : 'Guardar rol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Activar / Desactivar (Protección último ADMIN) */}
      {toggleUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100">
              {toggleUser.disabledAt
                ? '¿Activar usuario?'
                : '¿Desactivar usuario?'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {toggleUser.disabledAt
                ? `Estás a punto de reactivar el acceso para «${toggleUser.displayName}».`
                : `Estás a punto de desactivar a «${toggleUser.displayName}». Sus sesiones activas serán revocadas inmediatamente.`}
            </p>

            {toggleError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-medium text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Operación rechazada (409):
                </div>
                <p className="mt-1 text-rose-300">{toggleError}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setToggleUser(null)}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmToggle()}
                disabled={toggling}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 ${
                  toggleUser.disabledAt
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {toggling
                  ? 'Procesando…'
                  : toggleUser.disabledAt
                  ? 'Activar usuario'
                  : 'Desactivar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
