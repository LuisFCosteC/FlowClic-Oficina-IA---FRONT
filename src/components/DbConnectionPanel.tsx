import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Database,
  Download,
  FolderArchive,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import { formatDate } from '../api/mappers';
import type { ApiDbBackupResult, ApiDbInfo, ApiDbTestResult } from '../api/types';
import { AdminErrorCard } from './AdminErrorCard';

export const DbConnectionPanel: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<ApiDbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de cambio
  const [dbUrl, setDbUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Test de conexión
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiDbTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Backup
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<ApiDbBackupResult | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Modal Confirmación de Cambio
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Limpieza de tokens al desmontar
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setAuthToken('');
    };
  }, []);

  const fetchDbInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDbInfo();
      setDbInfo(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ENCRYPTION_UNAVAILABLE') {
        setError(
          'Bóveda de cifrado no disponible: falta APP_MASTER_KEY en el servidor.'
        );
      } else {
        setError(getApiErrorMessage(err, 'Error al consultar el estado de la base de datos.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDbInfo();
  }, [fetchDbInfo]);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = dbUrl.trim();
    if (!trimmedUrl) {
      setTestError('Debes ingresar una URL de conexión para probar.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const res = await api.testDbConnection({
        url: trimmedUrl,
        authToken: authToken || undefined,
      });
      setTestResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setTestError(err.message);
      } else {
        setTestError('Error al probar la conexión con la base de datos.');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleOpenConfirm = () => {
    const trimmedUrl = dbUrl.trim();
    if (!trimmedUrl) {
      setFormError('La URL de conexión es obligatoria.');
      return;
    }
    setFormError(null);
    setSaveError(null);
    setConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    const trimmedUrl = dbUrl.trim();
    setSaving(true);
    setSaveError(null);

    try {
      const updated = await api.updateDbConnection({
        url: trimmedUrl,
        authToken: authToken || undefined,
      });

      // Vaciado de token del estado local
      setAuthToken('');
      setDbInfo(updated);
      setConfirmModalOpen(false);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 5000);
      await fetchDbInfo();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setSaveError(
            'Cambio bloqueado por el servidor (403 FORBIDDEN): ADMIN_ALLOW_DB_CHANGE no está activado en las variables de entorno.'
          );
        } else {
          setSaveError(err.message);
        }
      } else {
        setSaveError('Error inesperado al guardar la nueva base de datos.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);
    setBackupError(null);
    try {
      const res = await api.createBackup();
      setBackupResult(res);
      await fetchDbInfo();
    } catch (err) {
      if (err instanceof ApiError) {
        setBackupError(err.message);
      } else {
        setBackupError('Error al generar el backup.');
      }
    } finally {
      setBackingUp(false);
    }
  };

  if (error && !dbInfo && !loading) {
    return (
      <section className="max-w-4xl space-y-6">
        <AdminErrorCard message={error} onRetry={() => void fetchDbInfo()} />
      </section>
    );
  }

  return (
    <section className="max-w-4xl space-y-6">
      {/* Tarjeta de Estado Actual de la Base de Datos */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Estado de la Base de Datos
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchDbInfo()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => void handleCreateBackup()}
              disabled={backingUp}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {backingUp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderArchive className="h-3.5 w-3.5" />
              )}
              Hacer backup ahora
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {backupResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">
                Backup completado con éxito
              </p>
              <p className="mt-1 font-mono text-[11px] text-emerald-300">
                Carpeta: {backupResult.folder}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-400/80">
                Tablas respaldadas:{' '}
                {Object.entries(backupResult.tables)
                  .map(([t, count]) => `${t} (${count})`)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}

        {backupError && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            Error en backup: {backupError}
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Conexión de base de datos actualizada en caliente con éxito.
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
            Consultando estado de la base de datos…
          </div>
        ) : dbInfo ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Modo */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Modo de almacenamiento</span>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold border ${
                    dbInfo.mode === 'remote'
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {dbInfo.mode.toUpperCase()}
                </span>
                <span className="text-slate-300">
                  {dbInfo.mode === 'remote' ? 'Turso / Nube' : 'Archivo Local'}
                </span>
              </div>
            </div>

            {/* Host */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Host / Archivo</span>
              <p className="mt-1.5 font-mono text-xs text-slate-200 truncate" title={dbInfo.host}>
                {dbInfo.host}
              </p>
            </div>

            {/* Estado Conexión */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Conexión activa</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    dbInfo.connected ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span className={dbInfo.connected ? 'text-emerald-300 font-medium' : 'text-rose-400'}>
                  {dbInfo.connected ? 'Conectada y operativa' : 'Desconectada'}
                </span>
              </div>
            </div>

            {/* Versión de Esquema */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Versión de esquema</span>
              <p className="mt-1.5 font-mono text-xs text-cyan-300">
                Migración #{dbInfo.schemaVersion}
              </p>
            </div>

            {/* Token */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Token de autenticación</span>
              <p className="mt-1.5 text-xs text-slate-200">
                {dbInfo.hasToken ? 'Configurado en bóveda (cifrado)' : 'Sin token (archivo local)'}
              </p>
            </div>

            {/* Último Backup */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="text-[11px] text-slate-400">Último backup realizado</span>
              <p className="mt-1.5 text-xs text-slate-300 font-mono">
                {dbInfo.lastBackupAt ? formatDate(dbInfo.lastBackupAt) : 'Ninguno todavía'}
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-[11px] text-slate-500">
          La URL completa y el token se resguardan de forma segura en la bóveda criptográfica del servidor y nunca se exponen en texto claro.
        </p>
      </div>

      {/* Formulario de Cambio y Prueba de Conexión */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0A1120]/90 p-6">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Cambiar o Probar Conexión de Base de Datos
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Permite enlazar un archivo local (`file:local.db`) o una base de datos distribuida Turso (`libsql://...`).
          </p>
        </div>

        {formError && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {formError}
          </div>
        )}

        {testResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">Prueba de conexión exitosa</p>
              <p className="mt-0.5 text-slate-300">
                Modo: <span className="font-mono text-cyan-300">{testResult.mode}</span> | Host:{' '}
                <span className="font-mono text-cyan-300">{testResult.host}</span> | Esquema:{' '}
                <span className="font-mono text-cyan-300">
                  {testResult.schemaVersion !== null ? `#${testResult.schemaVersion}` : 'Sin migrar'}
                </span>
                {testResult.willCreate && ' (Creará un nuevo archivo)'}
              </p>
            </div>
          </div>
        )}

        {testError && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            Fallo en la prueba de conexión: {testError}
          </div>
        )}

        <form className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300">
              URL de la Base de Datos
            </label>
            <input
              type="text"
              required
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="ej. file:local.db o libsql://flowclic-tu-bd.turso.io"
              className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Formatos aceptados: `file:`, `libsql://`, `https://`.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300">
              Token de autenticación (opcional)
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="••••••••••••••••••••"
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Si se deja vacío al guardar, se conservará el token actual SOLO si el host no cambia.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !dbUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 px-4 py-2 text-slate-200 hover:border-cyan-500/60 hover:text-cyan-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Probar conexión
            </button>

            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={!dbUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50"
            >
              Guardar y cambiar BD
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación de Cambio de Base de Datos (sin window.confirm) */}
      {confirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-900/60 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  ¿Confirmar cambio de base de datos?
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  La conexión se actualizará en caliente.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Avisos importantes:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
                <li>Cambiar de base de datos no copia ni migra datos existentes.</li>
                <li>
                  Si la nueva base de datos no cuenta con un usuario administrador creado, el
                  asistente de setup inicial se reabrirá.
                </li>
              </ul>
            </div>

            {saveError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-medium text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No se pudo aplicar el cambio:
                </div>
                <p className="mt-1 text-rose-300">{saveError}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={saving}
                className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar cambio de base de datos
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
