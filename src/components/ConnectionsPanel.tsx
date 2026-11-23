import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  Filter,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import { formatDate } from '../api/mappers';
import type { ApiCredential, ApiModelInfo, CredentialProvider } from '../api/types';
import type { Agent } from '../types/orbis';
import { AdminErrorCard } from './AdminErrorCard';
import { DbConnectionPanel } from './DbConnectionPanel';

const PROVIDER_OPTIONS: Array<{ id: CredentialProvider; label: string }> = [
  { id: 'google', label: 'Google / Gemini' },
  { id: 'anthropic', label: 'Anthropic / Claude' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'other', label: 'Otro' },
];

const PROVIDER_NAMES: Record<CredentialProvider, string> = {
  google: 'Google / Gemini',
  anthropic: 'Anthropic / Claude',
  openai: 'OpenAI',
  other: 'Otro',
};

interface ConnectionsPanelProps {
  agents: Agent[];
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ agents }) => {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [models, setModels] = useState<ApiModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario Añadir Clave
  const [addAgentId, setAddAgentId] = useState<string>('');
  const [addProvider, setAddProvider] = useState<CredentialProvider>('google');
  const [addLabel, setAddLabel] = useState<string>('');
  const [addSecret, setAddSecret] = useState<string>('');
  const [addingError, setAddingError] = useState<string | null>(null);
  const [addingSuccess, setAddingSuccess] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Filtros de la tabla
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterAgentId, setFilterAgentId] = useState<string>('all');

  // Modales de Rotar y Revocar en UI
  const [rotatingCred, setRotatingCred] = useState<ApiCredential | null>(null);
  const [rotateSecret, setRotateSecret] = useState<string>('');
  const [rotatingError, setRotatingError] = useState<string | null>(null);
  const [submittingRotate, setSubmittingRotate] = useState(false);

  const [revokingCred, setRevokingCred] = useState<ApiCredential | null>(null);
  const [revokingError, setRevokingError] = useState<string | null>(null);
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  // La clave se vacía al desmontar y nunca se guarda en el store ni en el navegador
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setAddSecret('');
      setRotateSecret('');
    };
  }, []);

  // Seleccionar por defecto el primer agente si está disponible
  useEffect(() => {
    if (agents.length > 0 && !addAgentId) {
      setAddAgentId(agents[0].id);
    }
  }, [agents, addAgentId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [creds, mods] = await Promise.all([
        api.listAllCredentials(),
        api.listModels(),
      ]);
      if (!mounted.current) return;
      setCredentials(creds);
      setModels(mods);
    } catch (err) {
      if (mounted.current) {
        setError(getApiErrorMessage(err, 'Error al cargar las conexiones y modelos.'));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Mapa de agentes para lookup rápido
  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  // Filtrado de credenciales activas
  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      const matchesProvider =
        filterProvider === 'all' || c.provider === filterProvider;
      const matchesAgent =
        filterAgentId === 'all' || c.agentId === filterAgentId;
      return matchesProvider && matchesAgent;
    });
  }, [credentials, filterProvider, filterAgentId]);

  // Envío del formulario Añadir Clave
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingError(null);
    setAddingSuccess(null);

    if (!addAgentId) {
      setAddingError('Debes seleccionar un agente.');
      return;
    }
    if (!addLabel.trim()) {
      setAddingError('Debes indicar una etiqueta para la clave.');
      return;
    }
    if (!addSecret.trim() || addSecret.trim().length < 8) {
      setAddingError('La clave API debe tener al menos 8 caracteres.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await api.addCredential(addAgentId, {
        provider: addProvider,
        label: addLabel.trim(),
        secret: addSecret.trim(),
      });
      // La clave se vacía inmediatamente al guardar
      setAddSecret('');
      setAddLabel('');
      setAddingSuccess('Clave API añadida exitosamente.');
      window.setTimeout(() => setAddingSuccess(null), 4000);
      await fetchData();
    } catch (err) {
      setAddSecret('');
      if (err instanceof ApiError) {
        if (err.code === 'ENCRYPTION_UNAVAILABLE') {
          setAddingError(
            'Bóveda de cifrado no disponible: falta APP_MASTER_KEY en el servidor.'
          );
        } else {
          setAddingError(err.message);
        }
      } else {
        setAddingError('Error al guardar la clave API.');
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Envío de Rotar Clave
  const handleRotateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingCred) return;
    setRotatingError(null);

    if (!rotateSecret.trim() || rotateSecret.trim().length < 8) {
      setRotatingError('La nueva clave API debe tener al menos 8 caracteres.');
      return;
    }

    setSubmittingRotate(true);
    try {
      await api.rotateCredential(
        rotatingCred.agentId,
        rotatingCred.id,
        rotateSecret.trim()
      );
      setRotateSecret('');
      setRotatingCred(null);
      await fetchData();
    } catch (err) {
      setRotateSecret('');
      if (err instanceof ApiError) {
        setRotatingError(err.message);
      } else {
        setRotatingError('Error al rotar la clave API.');
      }
    } finally {
      setSubmittingRotate(false);
    }
  };

  // Envío de Revocar Clave
  const handleRevokeSubmit = async () => {
    if (!revokingCred) return;
    setRevokingError(null);
    setSubmittingRevoke(true);
    try {
      await api.revokeCredential(revokingCred.agentId, revokingCred.id);
      setRevokingCred(null);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        setRevokingError(err.message);
      } else {
        setRevokingError('Error al revocar la clave API.');
      }
    } finally {
      setSubmittingRevoke(false);
    }
  };

  if (error && credentials.length === 0 && models.length === 0 && !loading) {
    return (
      <section className="space-y-6">
        <AdminErrorCard message={error} onRetry={() => void fetchData()} />
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {/* =========================================================================
          SECCIÓN A: Claves API de los agentes (arriba)
          ========================================================================= */}
      <section className="space-y-6">
        <div className="border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Claves API de los agentes
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Configura y administra las credenciales seguras de IA asociadas a cada agente del equipo.
          </p>
        </div>

        {/* 1. Formulario Añadir clave */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5">
          <div className="border-b border-slate-800/80 pb-3 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Añadir clave API
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              La clave se almacena cifrada en la bóveda del servidor y nunca se expone en el navegador.
            </p>
          </div>

          {agents.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Crea primero un agente en la pestaña Agentes</span>
            </div>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {addingError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{addingError}</span>
                </div>
              )}

              {addingSuccess && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{addingSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Selector de Agente */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Agente <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={addAgentId}
                    onChange={(e) => setAddAgentId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.title || ag.roleType || 'Agente'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Proveedor */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Proveedor <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={addProvider}
                    onChange={(e) => setAddProvider(e.target.value as CredentialProvider)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    {PROVIDER_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input Etiqueta */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Etiqueta descriptiva <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="ej. Gemini Pro Principal"
                    className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Input Clave */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Clave de API <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={addSecret}
                    onChange={(e) => setAddSecret(e.target.value)}
                    placeholder="••••••••••••••••••••"
                    className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:from-cyan-300 hover:to-sky-300 disabled:opacity-50"
                >
                  {submittingAdd ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Guardar clave</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2. Tabla de todas las claves activas con Filtros */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Claves API activas
              </h3>
              <span className="font-mono text-xs text-slate-400">
                {filteredCredentials.length}
              </span>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro por Proveedor */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <select
                  aria-label="Filtrar por proveedor"
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Todos los proveedores</option>
                  <option value="google">Google / Gemini</option>
                  <option value="anthropic">Anthropic / Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Filtro por Agente */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <select
                  aria-label="Filtrar por agente"
                  value={filterAgentId}
                  onChange={(e) => setFilterAgentId(e.target.value)}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Todos los agentes</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void fetchData()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {filteredCredentials.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {credentials.length === 0
                ? 'No hay claves API registradas en el sistema. Añade una arriba.'
                : 'No se encontraron claves API con los filtros seleccionados.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Agente</th>
                    <th className="px-3 py-2.5 font-medium">Proveedor</th>
                    <th className="px-3 py-2.5 font-medium">Etiqueta</th>
                    <th className="px-3 py-2.5 font-medium">Clave</th>
                    <th className="px-3 py-2.5 font-medium">Creada</th>
                    <th className="px-3 py-2.5 font-medium">Rotada</th>
                    <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredCredentials.map((c) => {
                    const agent = agentMap.get(c.agentId);
                    return (
                      <tr key={c.id} className="text-slate-200 transition-colors hover:bg-slate-900/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: agent?.color || '#06B6D4' }}
                            />
                            <span className="font-medium text-slate-100">
                              {agent?.name || c.agentId}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                            {PROVIDER_NAMES[c.provider] || c.provider}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{c.label}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                          ••••{c.last4}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {c.rotatedAt ? formatDate(c.rotatedAt) : 'Nunca'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRotatingCred(c);
                                setRotateSecret('');
                                setRotatingError(null);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Rotar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRevokingCred(c);
                                setRevokingError(null);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Revocar</span>
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

        {/* 3. Modelos disponibles en el catálogo (GET /api/models) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Modelos disponibles en el catálogo
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3 transition-colors ${
                  m.hasConnection
                    ? 'border-emerald-500/30 bg-emerald-950/10 text-emerald-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      m.hasConnection
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.hasConnection ? 'conectado' : 'sin conexión'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="capitalize">{m.provider}</span>
                  <span className="font-mono">{m.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECCIÓN B: Base de datos (abajo)
          ========================================================================= */}
      <section className="space-y-6 pt-4 border-t border-slate-800/90">
        <div className="border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Base de datos
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Estado de conexión, copias de seguridad manuales y conmutación en caliente de base de datos.
          </p>
        </div>

        {/* Panel completo de Base de Datos */}
        <DbConnectionPanel />
      </section>

      {/* =========================================================================
          MODAL ROTAR CLAVE EN UI
          ========================================================================= */}
      {rotatingCred && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B1220] p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <RefreshCw className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Rotar clave API
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRotatingCred(null);
                  setRotateSecret('');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRotateSubmit} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-300">
                Introduce la nueva clave para{' '}
                <strong className="text-cyan-300">{rotatingCred.label}</strong> (agente:{' '}
                <span className="text-slate-200">
                  {agentMap.get(rotatingCred.agentId)?.name || rotatingCred.agentId}
                </span>
                ). La clave actual (••••{rotatingCred.last4}) será reemplazada.
              </p>

              {rotatingError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300">
                  {rotatingError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300">
                  Nueva clave de API <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={rotateSecret}
                  onChange={(e) => setRotateSecret(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRotatingCred(null);
                    setRotateSecret('');
                  }}
                  className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRotate}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {submittingRotate && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirmar rotación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL REVOCAR CLAVE EN UI
          ========================================================================= */}
      {revokingCred && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0B1220] p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Revocar clave API
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRevokingCred(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas revocar la clave{' '}
                <strong className="text-rose-300">«{revokingCred.label}»</strong> (••••
                {revokingCred.last4}) del agente{' '}
                <strong className="text-slate-100">
                  {agentMap.get(revokingCred.agentId)?.name || revokingCred.agentId}
                </strong>
                ? Las operaciones que dependan de este proveedor fallarán hasta configurar una
                nueva clave.
              </p>

              {revokingError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300">
                  {revokingError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRevokingCred(null)}
                  className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleRevokeSubmit()}
                  disabled={submittingRevoke}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {submittingRevoke && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirmar revocación</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
