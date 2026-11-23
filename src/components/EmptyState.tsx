import React from 'react';
import { UserPlus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  onCreateFirstAgent: () => void;
  /** Como tarjeta flotante sobre otra vista (p. ej. la escena 3D) en vez de ocupar toda la vista. */
  overlay?: boolean;
}

/** Estado vacío común: la BD no tiene agentes todavía. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onCreateFirstAgent,
  overlay = false,
}) => (
  <div
    className={
      overlay
        ? 'pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6'
        : 'flex h-full w-full items-center justify-center p-6'
    }
  >
    <div className="pointer-events-auto max-w-md rounded-2xl border border-slate-800/80 bg-[#0A1120]/95 p-8 text-center shadow-2xl">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
        <UserPlus className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      <button
        type="button"
        onClick={onCreateFirstAgent}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Crear primer agente
      </button>
    </div>
  </div>
);
