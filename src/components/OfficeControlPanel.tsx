import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  PanelRightClose,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { API_URL, CONFIG_ERROR } from '../api/config';
import { STATUS_META } from '../data/initialData';
import { Agent, AgentStatus } from '../types/orbis';

export type CameraPresetKey =
  | 'overview'
  | 'laboratorio'
  | 'oficina_sheldon'
  | 'zona_descanso';

interface StatusSummaryDto {
  agentId: string;
  name: string;
  status: AgentStatus;
  currentTask: string | null;
  ticket: {
    id: string;
    title: string;
    status: string;
    priority: string;
    description: string;
    sinceSeconds: number;
  } | null;
  openTickets?: Record<string, number>;
  blockedReason: string | null;
  pendingApprovals: Array<{ id: string; title: string; gate: string }>;
  nextStep: string;
  summary: string;
}

export interface ThreadEntryDto {
  id: string;
  entryType: 'MESSAGE' | 'TICKET_EVENT';
  kind: string;
  scope: 'GLOBAL' | 'AGENT' | null;
  agentId: string | null;
  authorType: 'HUMAN' | 'AGENT' | 'SYSTEM' | null;
  authorId: string | null;
  body: string;
  status: string | null;
  ticketId: string | null;
  createdAt: string;
}

interface OfficeControlPanelProps {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onChangeAgentStatus: (agentId: string, status: AgentStatus) => void;
  onFlyToPreset: (preset: CameraPresetKey) => void;
  activePreset: CameraPresetKey;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCreateAgent?: () => void;
}

export const OfficeControlPanel: React.FC<OfficeControlPanelProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  onChangeAgentStatus,
  onFlyToPreset,
  activePreset,
  isCollapsed,
  onToggleCollapse,
  onCreateAgent,
}) => {
  const [conversationMode, setConversationMode] = useState<'GLOBAL' | 'AGENT'>('AGENT');
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [messages, setMessages] = useState<ThreadEntryDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [orderText, setOrderText] = useState<string>('');
  const [orderKind, setOrderKind] = useState<'ORDER' | 'QUESTION' | 'NOTE'>('ORDER');
  const [sendingOrder, setSendingOrder] = useState<boolean>(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
  const sheldonAgent = agents.find((a) => a.isCTO || a.id.toLowerCase() === 'sheldon') ?? agents[0];

  const workingCount = agents.filter((a) => a.status === 'working').length;
  const reviewCount = agents.filter(
    (a) => a.status === 'waiting_sheldon' || a.status === 'blocked'
  ).length;
  const idleCount = agents.filter(
    (a) => a.status === 'idle' || a.status === 'sleep_quota'
  ).length;

  useEffect(() => {
    if (agents.length === 0 || conversationMode === 'GLOBAL' || !selectedAgent) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    setLoadingSummary(true);

    const fetchSummary = async () => {
      try {
        if (!CONFIG_ERROR && API_URL) {
          const res = await fetch(`${API_URL}/api/agents/${encodeURIComponent(selectedAgent.id)}/status-summary`, {
            credentials: 'include',
          });
          if (res.ok) {
            const data: StatusSummaryDto = await res.json();
            if (isMounted) setSummary(data);
            return;
          }
        }
      } catch {
        // Fallback local summary below
      }

      if (isMounted) {
        setSummary({
          agentId: selectedAgent.id,
          name: selectedAgent.name,
          status: selectedAgent.status,
          currentTask: selectedAgent.currentTask,
          ticket: selectedAgent.currentTask
            ? {
                id: 'TK-101',
                title: selectedAgent.currentTask,
                status: selectedAgent.status === 'working' ? 'IN_PROGRESS' : 'PENDING',
                priority: 'HIGH',
                description: 'Tarea activa asignada en la colmena.',
                sinceSeconds: 1800,
              }
            : null,
          blockedReason: selectedAgent.status === 'blocked' ? 'Esperando revisión de arquitectura' : null,
          pendingApprovals: [],
          nextStep:
            selectedAgent.status === 'working'
              ? 'Finalizar suite de pruebas e iniciar revisión'
              : selectedAgent.status === 'waiting_sheldon'
                ? 'Resolver observaciones de Sheldon'
                : 'Esperar asignación de ticket',
          summary: `${selectedAgent.name} se encuentra en estado ${STATUS_META[selectedAgent.status].label}.`,
        });
      }
    };

    void fetchSummary().finally(() => {
      if (isMounted) setLoadingSummary(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedAgent, conversationMode, agents.length]);

  const fetchThread = async () => {
    if (agents.length === 0) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      if (!CONFIG_ERROR && API_URL) {
        const query =
          conversationMode === 'GLOBAL'
            ? 'scope=GLOBAL'
            : `agentId=${encodeURIComponent(selectedAgent?.id ?? '')}`;
        const res = await fetch(`${API_URL}/api/messages?${query}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data: ThreadEntryDto[] = await res.json();
          setMessages(data);
          return;
        }
      }
    } catch {
      // API offline
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchThread();
  }, [conversationMode, selectedAgent?.id, agents.length]);

  useEffect(() => {
    if (CONFIG_ERROR || !API_URL) return;

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      es.addEventListener('message.created', (event) => {
        try {
          const created: ThreadEntryDto = JSON.parse(event.data);
          if (
            conversationMode === 'GLOBAL' &&
            (created.scope === 'GLOBAL' || created.entryType === 'TICKET_EVENT')
          ) {
            setMessages((prev) => [...prev, created]);
          } else if (
            conversationMode === 'AGENT' &&
            (created.agentId === selectedAgent?.id || created.scope === 'GLOBAL')
          ) {
            setMessages((prev) => [...prev, created]);
          }
        } catch {
          void fetchThread();
        }
      });
    } catch {
      // SSE no disponible
    }

    return () => {
      es?.close();
    };
  }, [conversationMode, selectedAgent?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = orderText.trim();
    if (!trimmed || sendingOrder) return;

    setSendingOrder(true);
    setOrderFeedback(null);

    const targetAgentId =
      conversationMode === 'GLOBAL'
        ? sheldonAgent?.id
        : selectedAgent?.id;

    const payload = {
      scope: conversationMode,
      agentId: targetAgentId,
      kind: orderKind,
      body: trimmed,
    };

    try {
      if (!CONFIG_ERROR && API_URL) {
        const res = await fetch(`${API_URL}/api/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created: ThreadEntryDto = await res.json();
          setMessages((prev) => [...prev, created]);
          setOrderText('');
          setOrderFeedback('Orden registrada · Pendiente de Fase 2');
          setTimeout(() => setOrderFeedback(null), 3500);
          setSendingOrder(false);
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    const fallbackEntry: ThreadEntryDto = {
      id: `local-${Date.now()}`,
      entryType: 'MESSAGE',
      kind: orderKind,
      scope: conversationMode,
      agentId: targetAgentId ?? null,
      authorType: 'HUMAN',
      authorId: 'ceo',
      body: trimmed,
      status: 'PENDING',
      ticketId: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, fallbackEntry]);
    setOrderText('');
    setOrderFeedback('Orden registrada localmente');
    setTimeout(() => setOrderFeedback(null), 3000);
    setSendingOrder(false);
  };

  const handleQuickAction = async (action: 'PAUSE' | 'RESUME' | 'CONTINUE') => {
    if (!selectedAgent) return;

    if (action === 'PAUSE') {
      onChangeAgentStatus(selectedAgent.id, 'sleep_quota');
      try {
        if (!CONFIG_ERROR && API_URL) {
          await fetch(`${API_URL}/api/agents/${encodeURIComponent(selectedAgent.id)}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SLEEP_QUOTA' }),
          });
        }
      } catch {
        // Ignorado
      }
      setOrderFeedback(`${selectedAgent.name} pausado · SLEEP_QUOTA`);
      setTimeout(() => setOrderFeedback(null), 3000);
    } else if (action === 'RESUME') {
      onChangeAgentStatus(selectedAgent.id, 'working');
      try {
        if (!CONFIG_ERROR && API_URL) {
          await fetch(`${API_URL}/api/agents/${encodeURIComponent(selectedAgent.id)}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'WORKING' }),
          });
        }
      } catch {
        // Ignorado
      }
      setOrderFeedback(`${selectedAgent.name} reanudado · WORKING`);
      setTimeout(() => setOrderFeedback(null), 3000);
    } else if (action === 'CONTINUE') {
      setOrderText('Continuar con el siguiente paso prioritario del ticket.');
      setOrderKind('ORDER');
    }
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Abrir chat de mando 3D"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-[#0B1220]/95 text-cyan-400 shadow-xl backdrop-blur transition-all hover:border-cyan-500/60 hover:text-cyan-300 active:scale-95"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  if (agents.length === 0) {
    return (
      <aside
        aria-label="Panel de mando de la Oficina IA"
        className="absolute right-4 top-4 bottom-4 z-20 flex w-full max-w-[380px] flex-col rounded-2xl border border-slate-800 bg-[#0B1220]/95 p-6 shadow-2xl backdrop-blur select-none"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Chat de Mando 3D
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Plegar panel"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-cyan-400 shadow-inner">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            No hay agentes en la oficina
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            La colmena está vacía. Carga el equipo base o crea tu primer agente para comenzar.
          </p>
          <button
            type="button"
            onClick={() => onCreateAgent?.()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Crear primer agente
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Panel de mando de la Oficina IA"
      className="absolute right-4 top-4 bottom-4 z-20 flex w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1220]/95 shadow-2xl backdrop-blur select-none"
    >
      {/* Header con botón de plegar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Chat de Mando 3D
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Plegar panel"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
        {/* a) CÁMARA COMPACTA */}
        <section aria-label="Control de cámara">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              Cámara
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-medium sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onFlyToPreset('overview')}
              className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all ${
                activePreset === 'overview'
                  ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-200 shadow-sm'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Vista general
            </button>
            <button
              type="button"
              onClick={() => onFlyToPreset('laboratorio')}
              className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all ${
                activePreset === 'laboratorio'
                  ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-200 shadow-sm'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Laboratorio
            </button>
            <button
              type="button"
              onClick={() => onFlyToPreset('oficina_sheldon')}
              className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all ${
                activePreset === 'oficina_sheldon'
                  ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-200 shadow-sm'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Oficina Sheldon
            </button>
            <button
              type="button"
              onClick={() => onFlyToPreset('zona_descanso')}
              className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all ${
                activePreset === 'zona_descanso'
                  ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-200 shadow-sm'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Zona descanso
            </button>
            <button
              type="button"
              onClick={() => onFlyToPreset('overview')}
              className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              Restablecer
            </button>
          </div>
        </section>

        {/* b) SELECTOR DE CONVERSACIÓN (GLOBAL O AGENTE INDIVIDUAL) */}
        <section aria-label="Selector de conversación">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Canal de mando</span>
            <span className="font-mono text-[10px] text-slate-500">
              {conversationMode === 'GLOBAL' ? 'Todo el equipo' : 'Chat individual'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setConversationMode('GLOBAL')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                conversationMode === 'GLOBAL'
                  ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Equipo (Global)
            </button>
            <button
              type="button"
              onClick={() => setConversationMode('AGENT')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                conversationMode === 'AGENT'
                  ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Agente individual
            </button>
          </div>

          {conversationMode === 'AGENT' && selectedAgent && (
            <div className="relative">
              <select
                aria-label="Seleccionar agente"
                value={selectedAgent.id}
                onChange={(e) => onSelectAgent(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-700/80 bg-slate-900/90 py-2 pl-3 pr-8 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} — {ag.title} ({STATUS_META[ag.status].label})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </section>

        {/* c) TARJETA: QUÉ ESTÁ HACIENDO / QUÉ LE FALTA */}
        <section aria-label="Estado y telemetría">
          {conversationMode === 'GLOBAL' ? (
            <div className="rounded-xl border border-slate-800/90 bg-[#070D18] p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-200">Resumen del Equipo</span>
                <span className="font-mono text-[10px] text-cyan-400">{agents.length} agentes</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-300">
                  <div className="text-sm font-bold">{workingCount}</div>
                  <div className="text-[9px] text-emerald-400/80">Laboratorio</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-amber-300">
                  <div className="text-sm font-bold">{reviewCount}</div>
                  <div className="text-[9px] text-amber-400/80">Oficina Sheldon</div>
                </div>
                <div className="rounded-lg border border-slate-600/30 bg-slate-800/40 p-1.5 text-slate-300">
                  <div className="text-sm font-bold">{idleCount}</div>
                  <div className="text-[9px] text-slate-400">Zona descanso</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Sheldon lidera la coordinación general y recepción de órdenes globales.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/90 bg-[#070D18] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-slate-800"
                    style={{ backgroundColor: selectedAgent?.color ?? '#06b6d4' }}
                  />
                  <span className="truncate font-medium text-slate-200">
                    {selectedAgent?.name}
                  </span>
                  {selectedAgent?.isCTO && (
                    <span className="font-mono text-[9px] text-amber-400 font-bold">CTO</span>
                  )}
                </div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${STATUS_META[selectedAgent?.status ?? 'idle'].color}20`,
                    color: STATUS_META[selectedAgent?.status ?? 'idle'].color,
                  }}
                >
                  {STATUS_META[selectedAgent?.status ?? 'idle'].label}
                </span>
              </div>

              {loadingSummary ? (
                <div className="text-[11px] text-slate-500 py-1">Cargando telemetría...</div>
              ) : (
                <>
                  <div className="border-t border-slate-800/60 pt-1.5 text-[11px]">
                    <span className="text-slate-500">Ticket actual: </span>
                    <span className="text-slate-200 font-medium">
                      {summary?.ticket ? summary.ticket.title : 'Sin ticket activo'}
                    </span>
                    {summary?.ticket?.sinceSeconds && (
                      <span className="ml-1 font-mono text-[10px] text-slate-400">
                        ({Math.round(summary.ticket.sinceSeconds / 60)}m)
                      </span>
                    )}
                  </div>

                  {summary?.blockedReason && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400 mt-0.5" />
                      <span>{summary.blockedReason}</span>
                    </div>
                  )}

                  {summary && summary.pendingApprovals.length > 0 && (
                    <div className="text-[11px] text-amber-300">
                      <span className="text-slate-500">Aprobaciones: </span>
                      {summary.pendingApprovals.map((a) => a.title).join(', ')}
                    </div>
                  )}

                  {summary?.nextStep && (
                    <div className="text-[11px]">
                      <span className="text-slate-500">Siguiente paso: </span>
                      <span className="text-cyan-300">{summary.nextStep}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* d) HILO DE CHAT: MENSAJES Y EVENTOS DE TICKET */}
        <section aria-label="Hilo de conversación" className="flex flex-col flex-1 min-h-[160px]">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Hilo de actividad</span>
            {loadingMessages && <span className="text-[10px] text-slate-500">Sincronizando...</span>}
          </div>

          <div className="flex-1 rounded-xl border border-slate-800/80 bg-[#060A13] p-2.5 overflow-y-auto max-h-[220px] space-y-2">
            {messages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No hay mensajes aún en este hilo.
              </div>
            ) : (
              messages.map((entry) => {
                const isTicketEvent = entry.entryType === 'TICKET_EVENT';
                const isHuman = entry.authorType === 'HUMAN';

                if (isTicketEvent) {
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-2 text-[11px] text-slate-300 font-mono"
                    >
                      <div className="flex items-center justify-between text-[9px] text-cyan-400/90 mb-0.5">
                        <span>TICKET EVENT · {entry.kind}</span>
                        <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap break-words">{entry.body}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-2 text-xs space-y-1 ${
                      isHuman
                        ? 'border-cyan-500/30 bg-cyan-950/20 text-slate-200 ml-3'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 mr-3'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-semibold ${isHuman ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {isHuman ? 'CEO (Tú)' : selectedAgent?.name ?? 'Agente'}
                        <span className="ml-1.5 font-mono text-[9px] text-slate-500 font-normal uppercase">
                          {entry.kind}
                        </span>
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 whitespace-pre-wrap break-words">
                      {entry.body}
                    </p>

                    {isHuman && (
                      <div className="text-[9px] text-slate-400/90 pt-0.5 font-sans italic">
                        Pendiente · se ejecutará cuando se conecte el orquestador (Fase 2)
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* e) CAJA DE ÓRDENES */}
        <section aria-label="Enviar orden o consulta" className="space-y-2">
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(['ORDER', 'QUESTION', 'NOTE'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setOrderKind(kind)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase transition-colors ${
                      orderKind === kind
                        ? 'border border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                        : 'border border-transparent bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {kind === 'ORDER' ? 'Orden' : kind === 'QUESTION' ? 'Pregunta' : 'Nota'}
                  </button>
                ))}
              </div>

              <span className="font-mono text-[10px] text-slate-500">
                {orderText.length}/2000
              </span>
            </div>

            <div className="relative">
              <textarea
                aria-label="Texto de la orden"
                value={orderText}
                maxLength={2000}
                onChange={(e) => setOrderText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder={
                  conversationMode === 'GLOBAL'
                    ? 'Enviar orden global a Sheldon y al equipo...'
                    : `Escribir ${orderKind === 'ORDER' ? 'orden' : orderKind === 'QUESTION' ? 'pregunta' : 'nota'} para ${selectedAgent?.name}...`
                }
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingOrder || !orderText.trim()}
                title="Enviar (Enter)"
                className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition-all hover:bg-cyan-400 disabled:opacity-40 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {orderFeedback && (
            <div className="text-[10px] text-emerald-400 font-mono text-center">
              {orderFeedback}
            </div>
          )}

          {conversationMode === 'AGENT' && selectedAgent && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleQuickAction('PAUSE')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100 transition-colors"
              >
                <Pause className="h-3 w-3 text-amber-400" />
                Pausar
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('RESUME')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100 transition-colors"
              >
                <Play className="h-3 w-3 text-emerald-400" />
                Reanudar
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('CONTINUE')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                Continuar
              </button>
            </div>
          )}
        </section>

        {/* f) BOTONES DE CAMBIO DE ESTADO DEL AGENTE SELECCIONADO */}
        {conversationMode === 'AGENT' && selectedAgent && (
          <section aria-label="Transiciones de estado" className="border-t border-slate-800/80 pt-2.5 space-y-1.5">
            <div className="text-[11px] text-slate-400 font-medium">
              Ubicación y estado:
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeAgentStatus(selectedAgent.id, 'working')}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium text-left transition-all active:scale-95 ${
                  selectedAgent.status === 'working'
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/70'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Trabajar · Laboratorio
              </button>
              <button
                type="button"
                onClick={() => onChangeAgentStatus(selectedAgent.id, 'waiting_sheldon')}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium text-left transition-all active:scale-95 ${
                  selectedAgent.status === 'waiting_sheldon'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/70'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Revisión · Oficina de Sheldon
              </button>
              <button
                type="button"
                onClick={() => onChangeAgentStatus(selectedAgent.id, 'idle')}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium text-left transition-all active:scale-95 ${
                  selectedAgent.status === 'idle'
                    ? 'bg-slate-700/60 text-slate-100 ring-1 ring-slate-400/70'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Descansar · Zona de descanso
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
