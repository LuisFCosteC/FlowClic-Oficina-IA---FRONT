import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Cpu,
  Database,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import type {
  ApiModelInfo,
  ComputedKeyStatus,
  KeyProvider,
  KeyTestResult,
  ProviderKey,
} from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';
import { DbConnectionPanel } from './DbConnectionPanel';
import { getModelDisplayName, setModelCatalog } from '../utils/models';

const PROVIDER_OPTIONS: Array<{ id: KeyProvider; label: string }> = [
  { id: 'google', label: 'Google / Gemini' },
  { id: 'anthropic', label: 'Anthropic / Claude' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'other', label: 'Otro' },
];

const PROVIDER_NAMES: Record<KeyProvider, string> = {
  google: 'Google / Gemini',
  anthropic: 'Anthropic / Claude',
  openai: 'OpenAI',
  other: 'Otro',
};

const STATUS_CLASS: Record<ComputedKeyStatus, string> = {
  ACTIVE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  IN_USE: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  EXHAUSTED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  INVALID: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  REVOKED: 'border-slate-600/60 bg-slate-800/60 text-slate-400',
};

const REFRESH_MS = 15000;

const fmtTokens = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(1)}k`
      : String(n);

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

export const ConnectionsPanel: React.FC = () => {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [models, setModels] = useState<ApiModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alta
  const [provider, setProvider] = useState<KeyProvider>('google');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Acciones por fila
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, KeyTestResult>>({});
  const [revoking, setRevoking] = useState<ProviderKey | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [list, mods] = await Promise.all([api.listKeys(), api.listModels()]);
      if (!aliveRef.current) return;
      setKeys([...list].sort((a, b) => a.position - b.position));
      setModels(mods);
      setModelCatalog(mods);
      setError(null);
    } catch (err) {
      if (aliveRef.current) setError(getApiErrorMessage(err, 'Error al cargar las claves API.'));
    } finally {
      if (aliveRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void load();
    const timer = window.setInterval(() => void load(true), REFRESH_MS);
    return () => {
      aliveRef.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const value = secret.trim();
    if (!label.trim()) return setFormError('Escribe una etiqueta (p. ej. «Gemini principal»).');
    if (value.length < 8) return setFormError('La clave es demasiado corta (mínimo 8 caracteres).');
    if (/\s/.test(value)) return setFormError('La clave no puede contener espacios.');
    setSaving(true);
    try {
      await api.createKey({ provider, label: label.trim(), secret: value });
      setLabel('');
      await load(true);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'No se pudo guardar la clave.'));
    } finally {
      setSecret(''); // se vacía siempre, con éxito o con error
      setSaving(false);
    }
  };

  const runRow = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setRowError(null);
    try {
      await fn();
      await load(true);
    } catch (err) {
      setRowError(getApiErrorMessage(err, 'La operación falló.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleTest = async (k: ProviderKey) => {
    setBusyId(k.id);
    setRowError(null);
    try {
      const res = await api.testKey(k.id);
      setTestResults((prev) => ({ ...prev, [k.id]: res }));
    } catch (err) {
      setRowError(getApiErrorMessage(err, 'No se pudo probar la clave.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = (k: ProviderKey, dir: -1 | 1) => {
    const live = keys.filter((x) => x.status !== 'REVOKED');
    const i = live.findIndex((x) => x.id === k.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= live.length) return;
    const ids = live.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void runRow(k.id, () => api.reorderKeys(ids));
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    const target = revoking;
    setRevoking(null);
    await runRow(target.id, () => api.revokeKey(target.id));
  };

  if (error && keys.length === 0 && models.length === 0 && !loading) {
    return <AdminErrorCard message={error} onRetry={() => void load()} />;
  }

  const liveKeys = keys.filter((k) => k.status !== 'REVOKED');
  const revokedKeys = keys.filter((k) => k.status === 'REVOKED');

  return (
    <div className="space-y-6">
      {/* 1. Alta de clave */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <KeyRound className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-slate-100">Claves API (bolsa global)</h2>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Las claves son compartidas por todos los agentes: se usa la primera activa de la lista
          y, si se agota o falla, pasa a la siguiente. La clave se guarda cifrada y nunca vuelve a
          mostrarse (solo sus 4 últimos caracteres).
        </p>

        <form onSubmit={(e) => void handleAdd(e)} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-300">
            Proveedor
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as KeyProvider)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Etiqueta
            <input
              type="text"
              name="provider-key-label"
              autoComplete="off"
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Gemini principal"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Clave
            <input
              type="password"
              name="provider-api-key"
              value={secret}
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Pega la clave aquí"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Añadir clave
            </button>
          </div>
        </form>
        {formError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}
      </section>

      {/* 2. Lista por prioridad */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-slate-100">Claves por orden de prioridad</h3>
            <span className="font-mono text-xs text-slate-400">{liveKeys.length}</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>

        {rowError && (
          <div className="m-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            {rowError}
          </div>
        )}

        {keys.length === 0 && !loading ? (
          <p className="p-8 text-center text-xs text-slate-500">
            Aún no hay claves. Añade la primera arriba para que los agentes puedan trabajar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Prioridad</th>
                  <th className="px-3 py-2.5 font-medium">Proveedor</th>
                  <th className="px-3 py-2.5 font-medium">Etiqueta</th>
                  <th className="px-3 py-2.5 font-medium">Clave</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium">Uso de hoy</th>
                  <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {[...liveKeys, ...revokedKeys].map((k) => {
                  const idx = liveKeys.findIndex((x) => x.id === k.id);
                  const revoked = k.status === 'REVOKED';
                  const busy = busyId === k.id;
                  const test = testResults[k.id];
                  return (
                    <tr key={k.id} className={`text-slate-200 ${revoked ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {revoked ? '—' : `#${idx + 1}`}
                      </td>
                      <td className="px-3 py-3 text-slate-300">{PROVIDER_NAMES[k.provider]}</td>
                      <td className="px-3 py-3">{k.label}</td>
                      <td className="px-3 py-3 font-mono text-slate-400">••••{k.last4}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[k.computedStatus]}`}
                        >
                          {k.statusLabel}
                        </span>
                        {k.computedStatus !== 'EXHAUSTED' &&
                          k.exhaustedModels.map((m) => (
                            <div key={m.model} className="mt-1 text-[10px] text-amber-400">
                              {getModelDisplayName(m.model)} agotado hasta {fmtTime(m.until)}
                            </div>
                          ))}
                        {test && (
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] ${
                              test.ok ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {test.ok ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {test.message}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        <div className="font-mono">
                          {k.usageToday.requests} pet. ·{' '}
                          {fmtTokens(k.usageToday.inputTokens + k.usageToday.outputTokens)} tokens
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ${k.usageToday.costUsd.toFixed(4)}
                          {k.dailyRequestLimit ? ` · límite ${k.dailyRequestLimit} pet.` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!revoked && (
                            <>
                              <button
                                type="button"
                                aria-label="Subir prioridad"
                                title="Subir prioridad"
                                disabled={busy || idx === 0}
                                onClick={() => handleMove(k, -1)}
                                className="rounded-lg border border-slate-700/80 p-1.5 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                aria-label="Bajar prioridad"
                                title="Bajar prioridad"
                                disabled={busy || idx === liveKeys.length - 1}
                                onClick={() => handleMove(k, 1)}
                                className="rounded-lg border border-slate-700/80 p-1.5 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleTest(k)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Zap className="h-3 w-3" />
                                )}
                                Probar
                              </button>
                            </>
                          )}
                          {(revoked ||
                            k.status === 'INVALID' ||
                            k.computedStatus === 'EXHAUSTED') && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runRow(k.id, () => api.reactivateKey(k.id))}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/80 bg-emerald-950/20 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reactivar
                            </button>
                          )}
                          {!revoked && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setRevoking(k)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-900/60 bg-rose-950/20 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-900/40 disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Revocar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Catálogo de modelos (GET /api/models) */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <Cpu className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">Modelos disponibles</h3>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2.5"
            >
              <div>
                <div className="text-xs font-medium text-slate-100">{m.label}</div>
                <div className="font-mono text-[10px] text-slate-500">{m.provider}</div>
              </div>
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                  m.hasConnection
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-600/60 bg-slate-800/60 text-slate-400'
                }`}
              >
                {m.hasConnection ? 'Con clave' : 'Sin clave'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Base de datos */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-5">
        <div className="border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">Base de datos</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Estado de conexión, copias de seguridad manuales y conmutación en caliente de base de
            datos.
          </p>
        </div>
        <DbConnectionPanel />
      </section>

      {/* Confirmación de revocar (sin window.confirm) */}
      {revoking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-slate-100">¿Revocar esta clave?</h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setRevoking(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              «{revoking.label}» (••••{revoking.last4}) dejará de usarse. Podrás reactivarla
              después.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevoking(null)}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmRevoke()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Revocar clave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
