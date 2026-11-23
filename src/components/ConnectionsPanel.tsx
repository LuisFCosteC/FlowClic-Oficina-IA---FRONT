import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  Filter,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { formatDate } from '../api/mappers';
import type { ApiCredential, ApiModelInfo, CredentialProvider } from '../api/types';
import type { Agent } from '../types/orbis';
import { AgentCredentialsPanel } from './AgentCredentialsPanel';

const PROVIDER_NAMES: Record<CredentialProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
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

  // Filtros
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  // Modal para gestionar conexiones del agente (F07)
  const [managingAgent, setManagingAgent] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [creds, mods] = await Promise.all([
        api.listAllCredentials(),
        api.listModels(),
      ]);
      setCredentials(creds);
      setModels(mods);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar las conexiones y modelos.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Mapa de agentId a Agent para acceso rápido a nombre y color
  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  // Lista única de agentes presentes en credenciales y agentes activos
  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((a) => map.set(a.id, a.name));
    credentials.forEach((c) => {
      if (!map.has(c.agentId)) {
        map.set(c.agentId, c.agentId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [agents, credentials]);

  // Filtrado de credenciales
  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      const matchesProvider =
        selectedProvider === 'all' || c.provider === selectedProvider;
      const matchesAgent =
        selectedAgentId === 'all' || c.agentId === selectedAgentId;
      return matchesProvider && matchesAgent;
    });
  }, [credentials, selectedProvider, selectedAgentId]);

  return (
    <section className="space-y-5">
      {/* Resumen de Modelos Disponibles (GET /api/models) */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
              Modelos disponibles en el catálogo
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {models.filter((m) => m.hasConnection).length} de {models.length} con conexión activa
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {models.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                m.hasConnection
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-100'
                  : 'border-slate-800/80 bg-slate-900/40 text-slate-400'
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
                  {m.hasConnection ? 'Conectado' : 'Sin conexión'}
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

      {/* Tabla Global de Conexiones API */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Conexiones API activas
            </h2>
            <span className="font-mono text-xs text-slate-400">
              {filteredCredentials.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Proveedor */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                aria-label="Filtrar por proveedor"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">Todos los proveedores</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Filtro por Agente */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <select
                aria-label="Filtrar por agente"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">Todos los agentes</option>
                {agentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Cargando conexiones activas…
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">
              No hay conexiones activas con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Agente</th>
                  <th className="px-3 py-2.5 font-medium">Proveedor</th>
                  <th className="px-3 py-2.5 font-medium">Etiqueta</th>
                  <th className="px-3 py-2.5 font-medium">Clave</th>
                  <th className="px-3 py-2.5 font-medium">Creada</th>
                  <th className="px-3 py-2.5 font-medium">Última rotación</th>
                  <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCredentials.map((c) => {
                  const ag = agentMap.get(c.agentId);
                  const agentName = ag?.name || c.agentId;
                  return (
                    <tr key={c.id} className="text-slate-200">
                      <td className="px-5 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          {ag && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: ag.color }}
                            />
                          )}
                          <span className="text-slate-100">{agentName}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ({c.agentId})
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                          <Sparkles className="h-3 w-3 text-cyan-400" />
                          {PROVIDER_NAMES[c.provider] || c.provider}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-300">{c.label}</td>
                      <td className="px-3 py-3 font-mono text-cyan-400">
                        ••••{c.last4}
                      </td>
                      <td className="px-3 py-3 text-slate-400">{formatDate(c.createdAt)}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {c.rotatedAt ? formatDate(c.rotatedAt) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setManagingAgent({ id: c.agentId, name: agentName })}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                        >
                          <KeyRound className="h-3 w-3" />
                          Gestionar agente
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Drawer F07 para gestionar credenciales del agente */}
      {managingAgent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Conexiones API de {managingAgent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManagingAgent(null);
                  void fetchData();
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-y-auto">
              <AgentCredentialsPanel
                agentId={managingAgent.id}
                agentName={managingAgent.name}
              />
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => {
                  setManagingAgent(null);
                  void fetchData();
                }}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
