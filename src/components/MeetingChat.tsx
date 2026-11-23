import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { API_URL, CONFIG_ERROR } from '../api/config';
import { STATUS_META } from '../data/initialData';
import type { Agent } from '../types/orbis';
import type { ThreadEntryDto } from './OfficeControlPanel';

export interface MeetingReport {
  agent: Agent;
  done: number;
  active: number;
}

interface MeetingChatProps {
  /** 'ceo' = reunión en la oficina del CEO con Sheldon y Leonard; 'junta' = sala de juntas con todo el equipo. */
  mode: 'ceo' | 'junta';
  /** Agentes que participan (en 'ceo' son Sheldon y Leonard; en 'junta' todo el equipo). */
  participants: Agent[];
  /** Reporte de cada participante (solo se muestra en la reunión con el CEO). */
  reports?: MeetingReport[];
  /** Distancia al borde derecho (para no tapar el panel de mando). */
  rightOffset: number;
  onClose: () => void;
}

const TARGET_ALL = '__all__';

/**
 * Chat de reunión: el CEO (usuario) hace preguntas a los participantes. Las preguntas se envían a la API
 * como mensajes QUESTION (por agente, o globales para todo el equipo). Las respuestas aparecerán en el
 * hilo cuando el orquestador esté conectado (Fase 2).
 */
export const MeetingChat: React.FC<MeetingChatProps> = ({
  mode,
  participants,
  reports = [],
  rightOffset,
  onClose,
}) => {
  const [messages, setMessages] = useState<ThreadEntryDto[]>([]);
  const [text, setText] = useState('');
  const [target, setTarget] = useState<string>(TARGET_ALL);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const ids = useMemo(() => participants.map((p) => p.id), [participants]);
  const idsKey = ids.join('|');
  const nameOf = (id: string | null) => participants.find((p) => p.id === id)?.name ?? 'Agente';
  const cto = participants.find((p) => p.isCTO) ?? participants[0];

  const addMessage = (m: ThreadEntryDto) =>
    setMessages((prev) =>
      prev.some((x) => x.id === m.id)
        ? prev
        : [...prev, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );

  // Hilo existente de la conversación
  useEffect(() => {
    setMessages([]);
    if (CONFIG_ERROR || !API_URL) return;
    let alive = true;
    const queries =
      mode === 'junta' ? ['scope=GLOBAL'] : ids.map((id) => `agentId=${encodeURIComponent(id)}`);
    void Promise.all(
      queries.map((q) =>
        fetch(`${API_URL}/api/messages?${q}`, { credentials: 'include' })
          .then((r) => (r.ok ? (r.json() as Promise<ThreadEntryDto[]>) : []))
          .catch(() => [] as ThreadEntryDto[])
      )
    ).then((lists) => {
      if (!alive) return;
      const merged = new Map<string, ThreadEntryDto>();
      lists.flat().forEach((m) => {
        if (m.entryType === 'MESSAGE') merged.set(m.id, m);
      });
      setMessages([...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    });
    return () => {
      alive = false;
    };
  }, [mode, idsKey]);

  // Mensajes nuevos en vivo (respuestas de los agentes cuando haya orquestador)
  useEffect(() => {
    if (CONFIG_ERROR || !API_URL) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      es.addEventListener('message.created', (event) => {
        try {
          const created: ThreadEntryDto = JSON.parse((event as MessageEvent).data);
          if (created.entryType !== 'MESSAGE') return;
          const relevant =
            mode === 'junta' ? created.scope === 'GLOBAL' : !!created.agentId && ids.includes(created.agentId);
          if (relevant) addMessage(created);
        } catch {
          /* mensaje ilegible */
        }
      });
    } catch {
      /* SSE no disponible */
    }
    return () => es?.close();
  }, [mode, idsKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const post = async (payload: { scope: 'GLOBAL' | 'AGENT'; agentId: string | null; body: string }) => {
    const full = { ...payload, kind: 'QUESTION' };
    try {
      if (!CONFIG_ERROR && API_URL) {
        const res = await fetch(`${API_URL}/api/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(full),
        });
        if (res.ok) {
          addMessage((await res.json()) as ThreadEntryDto);
          return;
        }
      }
    } catch {
      /* sin API: queda registrada localmente */
    }
    addMessage({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entryType: 'MESSAGE',
      kind: 'QUESTION',
      scope: payload.scope,
      agentId: payload.agentId,
      authorType: 'HUMAN',
      authorId: 'ceo',
      body: payload.body,
      status: 'PENDING',
      ticketId: null,
      createdAt: new Date().toISOString(),
    });
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending || participants.length === 0) return;
    setSending(true);
    if (mode === 'junta' && target === TARGET_ALL) {
      await post({ scope: 'GLOBAL', agentId: cto?.id ?? null, body });
    } else if (target === TARGET_ALL) {
      // Reunión con el CEO: la misma pregunta a Sheldon y a Leonard
      for (const p of participants) await post({ scope: 'AGENT', agentId: p.id, body });
    } else {
      await post({ scope: 'AGENT', agentId: target, body });
    }
    setText('');
    setFeedback('Pregunta enviada · las respuestas llegarán cuando se conecte el orquestador (Fase 2)');
    setTimeout(() => setFeedback(null), 4000);
    setSending(false);
  };

  const title = mode === 'ceo' ? 'REUNIÓN CON EL CEO' : 'JUNTA · PREGUNTAS AL EQUIPO';
  const allLabel = mode === 'ceo' ? 'Ambos' : 'Todo el equipo';

  return (
    <div
      className="absolute bottom-4 top-24 z-20 flex w-[26rem] flex-col rounded-2xl border border-slate-700 bg-[#0B1220]/95 p-4 text-xs shadow-xl"
      style={{ right: rightOffset }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] tracking-wider text-cyan-400">{title}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {mode === 'ceo'
              ? 'Sheldon y Leonard están en tu oficina para reportarte. Hazles preguntas.'
              : 'Todo el equipo está en la sala de juntas. Pregunta a quien quieras.'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Terminar reunión"
        >
          ✕
        </button>
      </div>

      {mode === 'ceo' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {reports.map((r) => (
            <div key={r.agent.id} className="rounded-lg border border-slate-800 bg-[#080E1A] px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{r.agent.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_META[r.agent.status].color }}
                  />
                  {STATUS_META[r.agent.status].label}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {r.agent.currentTask?.trim() || 'Sin tarea asignada'}
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-300">
                {r.done} completadas · {r.active} en curso
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 min-h-[220px] flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-800/80 bg-[#060A13] p-2.5">
        {messages.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            Aún no hay preguntas. Escribe abajo para empezar la conversación.
          </div>
        ) : (
          messages.map((m) => {
            const human = m.authorType === 'HUMAN';
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-2 ${
                  human
                    ? 'ml-4 border-cyan-500/30 bg-cyan-950/20 text-slate-200'
                    : 'mr-4 border-slate-800 bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-semibold ${human ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {human
                      ? m.agentId && m.scope === 'AGENT'
                        ? `CEO (Tú) → ${nameOf(m.agentId)}`
                        : 'CEO (Tú) → equipo'
                      : nameOf(m.agentId)}
                  </span>
                  <span className="font-mono text-[9px] text-slate-500">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-slate-200">{m.body}</p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Preguntar a:</span>
          {[{ id: TARGET_ALL, name: allLabel }, ...participants.map((p) => ({ id: p.id, name: p.name }))]
            .slice(0, mode === 'junta' ? 8 : 3)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarget(t.id)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  target === t.id
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t.name}
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder={mode === 'ceo' ? 'Escribe tu pregunta para Sheldon y Leonard…' : 'Escribe tu pregunta para el equipo…'}
            className="flex-1 rounded-lg border border-slate-700 bg-[#080E1A] px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar
          </button>
        </div>
        {feedback && <div className="text-[10px] text-emerald-400">{feedback}</div>}
      </form>
    </div>
  );
};
