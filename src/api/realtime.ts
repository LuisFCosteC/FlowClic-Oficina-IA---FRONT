import { API_URL, CONFIG_ERROR } from './config';
import type { ApiAgent, ApiApproval, ApiProject, ApiTicket } from './types';

export type RealtimeEvent =
  | { type: 'agent.created' | 'agent.updated'; agent: ApiAgent }
  | { type: 'agent.archived'; id: string }
  | { type: 'ticket.created' | 'ticket.updated'; ticket: ApiTicket }
  | { type: 'ticket.deleted'; id: string }
  | { type: 'approval.created' | 'approval.updated'; approval: ApiApproval }
  | { type: 'project.created' | 'project.updated' | 'project.archived'; project: ApiProject }
  | { type: 'settings.updated'; key: 'project' | 'limits'; value: unknown };

export interface RealtimeHandlers {
  onEvent: (event: RealtimeEvent) => void;
  /** Conexión restablecida tras un corte: hay que volver a pedir `/api/snapshot`. */
  onReconnect: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

const RETRY_MS = 3000;

/**
 * Conecta con `GET /api/events` (SSE). EventSource reintenta solo; si el servidor responde con
 * un error (p. ej. 503 en modo SETUP) la conexión se cierra y aquí se reintenta con una espera.
 * Tras cada corte, al volver a abrirse se pide de nuevo el snapshot (no se reenvían eventos).
 * Devuelve la función que cierra la conexión.
 */
export function connectRealtime(handlers: RealtimeHandlers): () => void {
  if (CONFIG_ERROR) return () => {};
  let source: EventSource | null = null;
  let retryTimer: number | undefined;
  let closed = false;
  let needsResync = false;

  const parse = <T>(e: Event): T | null => {
    try {
      return JSON.parse((e as MessageEvent).data as string) as T;
    } catch {
      return null;
    }
  };

  const open = () => {
    if (closed) return;
    const es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
    source = es;

    es.onopen = () => {
      handlers.onConnectionChange?.(true);
      if (needsResync) {
        needsResync = false;
        handlers.onReconnect();
      }
    };
    es.onerror = () => {
      needsResync = true;
      handlers.onConnectionChange?.(false);
      if (es.readyState === EventSource.CLOSED && !closed) {
        es.close();
        retryTimer = window.setTimeout(open, RETRY_MS);
      }
    };

    for (const type of ['agent.created', 'agent.updated'] as const) {
      es.addEventListener(type, (e) => {
        const agent = parse<ApiAgent>(e);
        if (agent) handlers.onEvent({ type, agent });
      });
    }
    es.addEventListener('agent.archived', (e) => {
      const p = parse<{ id: string }>(e);
      if (p) handlers.onEvent({ type: 'agent.archived', id: p.id });
    });
    for (const type of ['ticket.created', 'ticket.updated'] as const) {
      es.addEventListener(type, (e) => {
        const ticket = parse<ApiTicket>(e);
        if (ticket) handlers.onEvent({ type, ticket });
      });
    }
    es.addEventListener('ticket.deleted', (e) => {
      const p = parse<{ id: string }>(e);
      if (p) handlers.onEvent({ type: 'ticket.deleted', id: p.id });
    });
    for (const type of ['approval.created', 'approval.updated'] as const) {
      es.addEventListener(type, (e) => {
        const approval = parse<ApiApproval>(e);
        if (approval) handlers.onEvent({ type, approval });
      });
    }
    for (const type of ['project.created', 'project.updated', 'project.archived'] as const) {
      es.addEventListener(type, (e) => {
        const project = parse<ApiProject>(e);
        if (project) handlers.onEvent({ type, project });
      });
    }
    es.addEventListener('settings.updated', (e) => {
      const p = parse<{ key: 'project' | 'limits'; value: unknown }>(e);
      if (p) handlers.onEvent({ type: 'settings.updated', key: p.key, value: p.value });
    });
  };

  open();
  return () => {
    closed = true;
    window.clearTimeout(retryTimer);
    source?.close();
  };
}
