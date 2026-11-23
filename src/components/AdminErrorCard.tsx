import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorCardProps {
  message: string;
  onRetry: () => void;
  title?: string;
  retrying?: boolean;
}

export const AdminErrorCard: React.FC<AdminErrorCardProps> = ({
  message,
  onRetry,
  title = 'Error de conexión con la API',
  retrying = false,
}) => {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6 shadow-xl shadow-rose-950/20"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-200">{title}</h3>
            <p className="text-xs text-rose-300/90 leading-relaxed max-w-xl">{message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 shadow-sm transition-all hover:bg-rose-500/30 active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
          <span>Reintentar</span>
        </button>
      </div>
    </div>
  );
};
