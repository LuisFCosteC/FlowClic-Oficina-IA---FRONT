import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertCircle, KeyRound, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { api, ApiError, getApiErrorMessage } from '../api/client';
import type { ApiAuthUser } from '../api/types';

/** Eventos que lanza el cliente HTTP cuando la API pide iniciar sesión o cambiar la clave. */
export const AUTH_EVENTS = {
  unauthenticated: 'flowclic:unauthenticated',
  passwordChange: 'flowclic:password-change',
} as const;

interface AuthContextValue {
  user: ApiAuthUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, logout: async () => {} });
export const useAuth = (): AuthContextValue => useContext(AuthContext);

type Phase = 'checking' | 'login' | 'change' | 'ready';

const MIN_PASSWORD = 12;

const shell = (children: React.ReactNode) => (
  <div className="flowclic-ambient-bg flex min-h-screen w-screen items-center justify-center bg-[#050914] p-4 text-slate-100">
    <div className="w-full max-w-sm rounded-3xl border border-slate-700/80 bg-[#0A101C] p-7 shadow-2xl shadow-cyan-950/40">
      {children}
    </div>
  </div>
);

const inputCls =
  'mt-1.5 w-full rounded-xl border border-slate-700/80 bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none';

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
    {text}
  </div>
);

const LoginView: React.FC<{ onLoggedIn: (u: ApiAuthUser) => void }> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api.login(email.trim(), password);
      setPassword('');
      onLoggedIn(user);
    } catch (err) {
      setPassword('');
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setBusy(false);
    }
  };

  return shell(
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-400">
          <LogIn className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-50">FlowClic Oficina IA</h1>
          <p className="text-xs text-slate-400">Inicia sesión para continuar</p>
        </div>
      </div>
      {error && <ErrorBox text={error} />}
      <label className="block text-xs font-medium text-slate-300">
        Correo
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block text-xs font-medium text-slate-300">
        Contraseña
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </button>
    </form>
  );
};

const ChangePasswordView: React.FC<{
  user: ApiAuthUser | null;
  onChanged: (u: ApiAuthUser) => void;
  onLogout: () => void;
}> = ({ user, onChanged, onLogout }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD) return setError(`La nueva contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
    if (next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    if (next === current) return setError('La nueva contraseña debe ser distinta de la actual.');
    setBusy(true);
    try {
      const updated = await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onChanged(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setBusy(false);
    }
  };

  return shell(
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-400">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-50">Cambia tu contraseña</h1>
          <p className="text-xs text-slate-400">
            {user ? `${user.displayName}: ` : ''}la contraseña actual es temporal y debes cambiarla
            para continuar.
          </p>
        </div>
      </div>
      {error && <ErrorBox text={error} />}
      <label className="block text-xs font-medium text-slate-300">
        Contraseña temporal
        <input
          type="password"
          name="current-password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block text-xs font-medium text-slate-300">
        Nueva contraseña (mínimo {MIN_PASSWORD} caracteres)
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block text-xs font-medium text-slate-300">
        Repite la nueva contraseña
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Guardar contraseña
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
      >
        Salir
      </button>
    </form>
  );
};

/** Pantalla de entrada: login, cambio obligatorio de contraseña y, después, la aplicación. */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [user, setUser] = useState<ApiAuthUser | null>(null);
  // Cambia al entrar/salir para que la aplicación se monte de cero (snapshot fresco).
  const [session, setSession] = useState(0);

  const check = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      setPhase(me.mustChangePassword ? 'change' : 'ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setPhase('login');
      else setPhase('ready'); // API caída, modo SETUP o BD por migrar: la app lo explica con su aviso
    }
  }, []);

  useEffect(() => {
    void check();
    const onUnauth = () => {
      setUser(null);
      setPhase('login');
    };
    const onChange = () => setPhase('change');
    window.addEventListener(AUTH_EVENTS.unauthenticated, onUnauth);
    window.addEventListener(AUTH_EVENTS.passwordChange, onChange);
    return () => {
      window.removeEventListener(AUTH_EVENTS.unauthenticated, onUnauth);
      window.removeEventListener(AUTH_EVENTS.passwordChange, onChange);
    };
  }, [check]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // aunque falle la llamada, se vuelve a la pantalla de entrada
    }
    setUser(null);
    setPhase('login');
    setSession((s) => s + 1);
  }, []);

  if (phase === 'checking') {
    return shell(
      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Conectando…
      </div>
    );
  }
  if (phase === 'login') {
    return (
      <LoginView
        onLoggedIn={(u) => {
          setUser(u);
          setSession((s) => s + 1);
          setPhase(u.mustChangePassword ? 'change' : 'ready');
        }}
      />
    );
  }
  if (phase === 'change') {
    return (
      <ChangePasswordView
        user={user}
        onChanged={(u) => {
          setUser(u);
          setSession((s) => s + 1);
          setPhase('ready');
        }}
        onLogout={() => void logout()}
      />
    );
  }
  return (
    <AuthContext.Provider value={{ user, logout }}>
      <React.Fragment key={session}>{children}</React.Fragment>
    </AuthContext.Provider>
  );
};
