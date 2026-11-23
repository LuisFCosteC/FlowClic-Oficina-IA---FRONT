import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Code,
  Eye,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { formatDate } from '../api/mappers';
import type { ApiAuditEntry } from '../api/types';

export const AuditPanel: React.FC = () => {
  const [entries, setEntries] = useState<ApiAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Modal para ver metadata en texto plano seguro (JSON formateado, nunca HTML)
  const [selectedMeta, setSelectedMeta] = useState<{
    action: string;
    id: string;
    meta: Record<string, unknown>;
  } | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAudit({
        limit: 200,
        action: filterAction.trim() || undefined,
        from: filterFrom ? new Date(filterFrom).toISOString() : undefined,
        to: filterTo ? new Date(`${filterTo}T23:59:59.999Z`).toISOString() : undefined,
      });
      setEntries(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al consultar el registro de auditoría.');
      }
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterFrom, filterTo]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  const handleResetFilters = () => {
    setFilterAction('');
    setFilterFrom('');
    setFilterTo('');
  };

  const hasActiveFilters = Boolean(filterAction || filterFrom || filterTo);

  return (
    <section className="space-y-4">
      {/* Barra de Filtros */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Registro de Auditoría (Últimas 200 entradas)
            </h2>
            <span className="font-mono text-xs text-slate-400">
              {entries.length} resultados
            </span>
          </div>

          <button
            type="button"
            onClick={() => void fetchAudit()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {/* Filtro por acción */}
          <div className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar por acción (ej. settings.project_updated)"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-64 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Filtro por fecha Desde */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>Desde:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Filtro por fecha Hasta */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Hasta:</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Tabla de Auditoría (Solo Lectura) */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Consultando registros de auditoría…
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No se encontraron eventos de auditoría con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Acción</th>
                  <th className="px-3 py-3 font-medium">Objetivo</th>
                  <th className="px-3 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 text-right font-medium">Metadatos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {entries.map((entry) => {
                  const hasMeta =
                    entry.meta && Object.keys(entry.meta).length > 0;
                  return (
                    <tr key={entry.id} className="text-slate-200 hover:bg-slate-900/30 transition-colors">
                      {/* Fecha */}
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>

                      {/* Acción */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                          {entry.action}
                        </span>
                      </td>

                      {/* Objetivo */}
                      <td className="px-3 py-3 text-slate-300">
                        {entry.targetType ? (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">{entry.targetType}</span>
                            {entry.targetId && (
                              <span className="text-slate-200">: {entry.targetId}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="px-3 py-3 text-slate-300">
                        <span className="font-mono text-[11px] text-slate-400">
                          {entry.userId || 'Sistema'}
                        </span>
                        {entry.ip && (
                          <span className="ml-1 text-[10px] text-slate-500">
                            ({entry.ip})
                          </span>
                        )}
                      </td>

                      {/* Metadatos (Detalle como texto plano) */}
                      <td className="px-5 py-3 text-right">
                        {hasMeta ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMeta({
                                action: entry.action,
                                id: entry.id,
                                meta: entry.meta,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors"
                          >
                            <Code className="h-3 w-3" />
                            Ver meta
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para ver metadatos en texto plano (JSON formateado, nunca renderizado como HTML) */}
      {selectedMeta && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Metadatos de {selectedMeta.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeta(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Texto plano seguro: preformateado en JSON, sin inyección HTML */}
            <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-300">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(selectedMeta.meta, null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
              <span>Solo lectura · Salida auditada y redactada</span>
              <button
                type="button"
                onClick={() => setSelectedMeta(null)}
                className="rounded-xl border border-slate-700/80 px-4 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
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
