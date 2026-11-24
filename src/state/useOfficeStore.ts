import { useReducer } from 'react';
import type { ApiAgent, ApiApproval, ApiProject, ApiSnapshot, ApiTicket } from '../api/types';

/** Estado del servidor tal como llega de la API (T74). No contiene lógica de negocio. */
export type ConnectionPhase =
  | 'loading' // primera carga
  | 'ready'
  | 'unreachable' // la API no responde
  | 'setup' // 503 SETUP_REQUIRED
  | 'error'; // otro error de la API o de configuración

export interface OfficeState {
  phase: ConnectionPhase;
  errorMessage: string;
  agents: ApiAgent[];
  tickets: ApiTicket[];
  approvals: ApiApproval[];
  projects: ApiProject[];
}

export type OfficeAction =
  | { type: 'snapshot'; snapshot: ApiSnapshot }
  | { type: 'failed'; phase: Exclude<ConnectionPhase, 'loading' | 'ready'>; message: string }
  | { type: 'agent.upsert'; agent: ApiAgent }
  | { type: 'agent.remove'; id: string }
  | { type: 'ticket.upsert'; ticket: ApiTicket }
  | { type: 'ticket.remove'; id: string }
  | { type: 'approval.upsert'; approval: ApiApproval }
  | { type: 'project.upsert'; project: ApiProject };

export const initialOfficeState: OfficeState = {
  phase: 'loading',
  errorMessage: '',
  agents: [],
  tickets: [],
  approvals: [],
  projects: [],
};

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

function reducer(state: OfficeState, action: OfficeAction): OfficeState {
  switch (action.type) {
    case 'snapshot':
      return {
        phase: 'ready',
        errorMessage: '',
        agents: action.snapshot.agents,
        tickets: action.snapshot.tickets,
        approvals: action.snapshot.approvals,
        projects: action.snapshot.projects ?? [],
      };
    case 'failed':
      return { ...state, phase: action.phase, errorMessage: action.message };
    case 'agent.upsert':
      // Un agente archivado desaparece del equipo.
      return action.agent.archivedAt
        ? { ...state, agents: state.agents.filter((a) => a.id !== action.agent.id) }
        : { ...state, agents: upsertById(state.agents, action.agent) };
    case 'agent.remove':
      return { ...state, agents: state.agents.filter((a) => a.id !== action.id) };
    case 'ticket.upsert':
      return { ...state, tickets: upsertById(state.tickets, action.ticket) };
    case 'ticket.remove':
      return { ...state, tickets: state.tickets.filter((t) => t.id !== action.id) };
    case 'approval.upsert':
      return { ...state, approvals: upsertById(state.approvals, action.approval) };
    case 'project.upsert':
      return { ...state, projects: upsertById(state.projects, action.project) };
    default:
      return state;
  }
}

export function useOfficeStore() {
  return useReducer(reducer, initialOfficeState);
}
