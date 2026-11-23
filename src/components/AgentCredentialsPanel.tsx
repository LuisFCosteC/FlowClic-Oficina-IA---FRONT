import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { formatDate } from '../api/mappers';
import type { ApiCredential, CredentialProvider } from '../api/types';

const PROVIDERS: Array<{ id: CredentialProvider; label: string }> = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
  { id: 'other', label: 'Otro' },
];

const PROVIDER_LABEL: Record<CredentialProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  other: 'Otro',
};

/** Mensaje para el formulario según el código de la API (400, 409, 503). */
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'ENCRYPTION_UNAVAILABLE') {
      return 'No se puede guardar: falta APP_MASTER_KEY en el servidor (ejecuta python scripts/setup_env.py).';
    }
    if (err.status === 0) return 'La API no responde.';
    return err.message;
  }
  return 'Error inesperado.';
}

const inputClass =
  'w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-400 focus:outline-none';

interface AgentCredentialsPanelProps {
  agentId: string;
  agentName: string;
}

/**
 * Conexiones API de un agente (PLAN §16.6). La clave solo vive en el estado local de este
 * componente mientras se escribe: se vacía al guardar y al desmontar, y nunca va al estado
 * global, a localStorage ni a ningún log. La API tampoco la devuelve (solo `••••last4`).
 */
export const AgentCredentialsPanel: React.FC<AgentCredentialsPanelProps> = ({
  agentId,
  agentName,
}) => {
  const [items, setItems] = useState<ApiCredential[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);

  const [provider, setProvider] = useState<CredentialProvider>('anthropic');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateSecret, setRotateSecret] = useState('');
  const [rotateError, setRotateError] = useState('');
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [rowError, setRowError] = useState('');

  // Evita actualizar el estado tras desmontar y garantiza que la clave no sobrevive al panel.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setSecret('');
      setRotateSecret('');
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await api.listCredentials(agentId);
      if (!mounted.current) return;
      setItems(list);
      setLoadError('');
    } catch (err) {
      if (mounted.current) setLoadError(describeError(err));
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!label.trim()) {
      setFormError('Escribe una etiqueta para la conexión.');
      return;
    }
    if (secret.trim().length < 8) {
      setFormError('La clave es demasiado corta.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.addCredential(agentId, { provider, label: label.trim(), secret });
      setSecret(''); // la clave se vacía en cuanto se envía
      setLabel('');
      setAdding(false);
      await load();
    } catch (err) {
      setSecret('');
      setFormError(describeError(err));
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const handleRotate = async (credId: string) => {
    if (saving) return;
    if (rotateSecret.trim().length < 8) {
      setRotateError('La clave es demasiado corta.');
      return;
    }
    setSaving(true);
    setRotateError('');
    try {
      await api.rotateCredential(agentId, credId, rotateSecret);
      setRotateSecret('');
      setRotatingId(null);
      await load();
    } catch (err) {
      setRotateSecret('');
      setRotateError(describeError(err));
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const handleRevoke = async (credId: string) => {
    setRowError('');
    try {
      await api.revokeCredential(agentId, credId);
      setConfirmRevokeId(null);
      await load();
    } catch (err) {
      setRowError(describeError(err));
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#070B12]/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-100">
            Conexiones API · {agentName}
          </h3>
          {items && (
            <span className="font-mono text-[11px] text-slate-400">{items.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setFormError('');
            setSecret('');
          }}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:bg-cyan-500/20 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir conexión
        </button>
      </div>

      {loadError && (
        <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
          {loadError}
        </div>
      )}
      {rowError && (
        <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
          {rowError}
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleAdd}
          autoComplete="off"
          className="mt-3 space-y-3 rounded-xl border border-slate-800/80 bg-[#0D1422] p-4"
        >
          {formError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor={`cred-provider-${agentId}`}
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Proveedor
              </label>
              <select
                id={`cred-provider-${agentId}`}
                value={provider}
                onChange={(e) => setProvider(e.target.value as CredentialProvider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={`cred-label-${agentId}`}
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Etiqueta
              </label>
              <input
                id={`cred-label-${agentId}`}
                type="text"
                value={label}
                maxLength={80}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setFormError('');
                }}
                placeholder="Ej. Producción"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`cred-secret-${agentId}`}
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Clave
              </label>
              <input
                id={`cred-secret-${agentId}`}
                type="password"
                value={secret}
                autoComplete="new-password"
                spellCheck={false}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setFormError('');
                }}
                placeholder="Se guarda cifrada"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              La clave se envía una sola vez y no se vuelve a mostrar: solo verás los 4
              últimos caracteres.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setSecret('');
                  setFormError('');
                }}
                className="rounded-xl border border-slate-700/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition-all hover:from-cyan-300 hover:to-sky-300 active:scale-95 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar conexión'}
              </button>
            </div>
          </div>
        </form>
      )}

      {items === null && !loadError ? (
        <p className="mt-3 text-xs text-slate-500">Cargando conexiones…</p>
      ) : items && items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Este agente no tiene conexiones API. Puedes añadir tantas como necesites, también
          del mismo proveedor.
        </p>
      ) : (
        items && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Proveedor</th>
                  <th className="px-3 py-2 font-medium">Etiqueta</th>
                  <th className="px-3 py-2 font-medium">Clave</th>
                  <th className="px-3 py-2 font-medium">Creada</th>
                  <th className="px-3 py-2 font-medium">Rotada</th>
                  <th className="py-2 pl-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {items.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="text-slate-200">
                      <td className="py-2.5 pr-3">{PROVIDER_LABEL[c.provider]}</td>
                      <td className="px-3 py-2.5">{c.label}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">
                        ••••{c.last4}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {formatDate(c.rotatedAt)}
                      </td>
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRotatingId(rotatingId === c.id ? null : c.id);
                              setRotateSecret('');
                              setRotateError('');
                              setConfirmRevokeId(null);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Rotar
                          </button>
                          {confirmRevokeId === c.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleRevoke(c.id)}
                                className="rounded-lg border border-rose-500/60 bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-200"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(null)}
                                className="rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmRevokeId(c.id);
                                setRotatingId(null);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" />
                              Revocar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {rotatingId === c.id && (
                      <tr>
                        <td colSpan={6} className="pb-3">
                          <form
                            autoComplete="off"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void handleRotate(c.id);
                            }}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="password"
                              value={rotateSecret}
                              autoComplete="new-password"
                              spellCheck={false}
                              aria-label={`Nueva clave para ${c.label}`}
                              onChange={(e) => {
                                setRotateSecret(e.target.value);
                                setRotateError('');
                              }}
                              placeholder="Nueva clave"
                              className={`${inputClass} max-w-xs`}
                            />
                            <button
                              type="submit"
                              disabled={saving}
                              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 active:scale-95 disabled:opacity-60"
                            >
                              Guardar clave nueva
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRotatingId(null);
                                setRotateSecret('');
                              }}
                              className="rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300"
                            >
                              Cancelar
                            </button>
                            {rotateError && (
                              <span className="text-xs text-rose-300">{rotateError}</span>
                            )}
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
