import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRightLeft,
  Check,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  Agent,
  AgentStatus,
  ModelHealthStatus,
  ModelNode,
  RoutingPolicy,
  SheldonProposal,
} from '../types/orbis';
import { MODEL_TIER_META, STATUS_META, isResting } from '../data/initialData';

interface CerebroOrbisViewProps {
  agents: Agent[];
  models: ModelNode[];
  proposals: SheldonProposal[];
  routingPolicy: RoutingPolicy;
  onChangeRoutingPolicy: (policy: RoutingPolicy) => void;
  onCycleModelStatus: (modelId: string) => void;
  onResolveProposal: (proposalId: string, decision: 'approved' | 'rejected') => void;
  onChangeAgentStatus: (agentId: string, status: AgentStatus) => void;
}

const POLICY_CONFIG: Record<
  RoutingPolicy,
  { label: string; description: string; baseSavingsPct: number; claudeSplit: number }
> = {
  balanced: {
    label: 'Equilibrado',
    description: 'Claude en tareas complejas, Gemini en alto volumen y fallback.',
    baseSavingsPct: 38.4,
    claudeSplit: 58,
  },
  cost_saver: {
    label: 'Ahorro Máximo',
    description: 'Prioriza Gemini Flash y Haiku con purga agresiva de contexto.',
    baseSavingsPct: 54.2,
    claudeSplit: 34,
  },
  max_precision: {
    label: 'Precisión Máxima',
    description: 'Enruta decisiones críticas a Claude Opus 5.5 y Gemini Pro.',
    baseSavingsPct: 24.6,
    claudeSplit: 72,
  },
};

const HEALTH_LABEL: Record<
  ModelHealthStatus,
  { label: string; textClass: string }
> = {
  online: { label: 'Online', textClass: 'text-emerald-400' },
  fallback: { label: 'Fallback activo', textClass: 'text-amber-400' },
  maintenance: { label: 'En pausa', textClass: 'text-rose-400' },
};

export const CerebroOrbisView: React.FC<CerebroOrbisViewProps> = ({
  agents,
  models,
  proposals,
  routingPolicy,
  onChangeRoutingPolicy,
  onCycleModelStatus,
  onResolveProposal,
  onChangeAgentStatus,
}) => {
  const [memoryFilter, setMemoryFilter] = useState<'all' | 'active' | 'purged'>(
    'all'
  );

  const purgedAgentsCount = useMemo(
    () => agents.filter((a) => isResting(a.status)).length,
    [agents]
  );
  const totalRamMb = useMemo(
    () => Math.round(agents.reduce((acc, a) => acc + a.ramKb, 0) / 1024),
    [agents]
  );

  const policyMeta = POLICY_CONFIG[routingPolicy];
  // Sin medición real todavía (la API aún no cuenta tokens): no se inventan cifras de ahorro.
  const totalSavingsPct = 0;
  const tokensSavedMillions = 0;
  const monthlyUsdSaved = 0;

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const resolvedProposals = proposals.filter((p) => p.status !== 'pending');

  const filteredAgents = useMemo(() => {
    if (memoryFilter === 'active') return agents.filter((a) => !isResting(a.status));
    if (memoryFilter === 'purged') return agents.filter((a) => isResting(a.status));
    return agents;
  }, [agents, memoryFilter]);

  const claudeTotalShare = models
    .filter((m) => m.provider === 'Claude' && m.status !== 'maintenance')
    .reduce((acc, m) => acc + m.trafficShare, 0);
  const geminiTotalShare = models
    .filter((m) => m.provider === 'Gemini' && m.status !== 'maintenance')
    .reduce((acc, m) => acc + m.trafficShare, 0);
  const shareNorm = Math.max(1, claudeTotalShare + geminiTotalShare);
  const hasTraffic = claudeTotalShare + geminiTotalShare > 0;
  const claudePct = hasTraffic ? Math.round((claudeTotalShare / shareNorm) * 100) : 0;
  const geminiPct = hasTraffic ? 100 - claudePct : 0;

  return (
    <div className="h-full overflow-y-auto px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-[1340px] space-y-6">
        {/* Top Dynamic Metric Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 p-5 shadow-lg shadow-black/20"
          >
            <div className="text-xs text-slate-400">Ahorro mensual de tokens</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-cyan-400">
              {totalSavingsPct}%
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              {tokensSavedMillions}M tokens · ~${monthlyUsdSaved} USD/mes
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 p-5 shadow-lg shadow-black/20"
          >
            <div className="text-xs text-slate-400">Balanceo Claude / Gemini</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-100">
              {claudePct}% / {geminiPct}%
            </div>
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="rounded-l-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${claudePct}%` }}
              />
              <div
                className="rounded-r-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
                style={{ width: `${geminiPct}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 p-5 shadow-lg shadow-black/20"
          >
            <div className="text-xs text-slate-400">Cola de aprobación Sheldon</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-amber-400">
              {pendingProposals.length} pendientes
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {resolvedProposals.length} decisiones CEO registradas hoy
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 p-5 shadow-lg shadow-black/20"
          >
            <div className="text-xs text-slate-400">Memoria efímera purgada</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-emerald-400">
              {purgedAgentsCount} / {agents.length} en 0 KB
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              Consumo activo total: {totalRamMb} MB RAM
            </div>
          </motion.div>
        </section>

        {/* Main 2-Column Command Split: Router & Sheldon Approval Console */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Model Orchestration & Router */}
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20 xl:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Enrutador Híbrido Claude / Gemini
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {policyMeta.description}
                </p>
              </div>

              {/* Policy Segmented Control */}
              <div className="flex items-center gap-1 rounded-xl bg-[#070B12] p-1">
                {(Object.keys(POLICY_CONFIG) as RoutingPolicy[]).map((pol) => (
                  <button
                    key={pol}
                    type="button"
                    onClick={() => onChangeRoutingPolicy(pol)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                      routingPolicy === pol
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {POLICY_CONFIG[pol].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400">
                    <th className="px-5 py-3 font-medium">Modelo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Tráfico</th>
                    <th className="px-4 py-3 text-right font-medium">Latencia</th>
                    <th className="px-4 py-3 text-right font-medium">Costo / 1M</th>
                    <th className="px-5 py-3 text-right font-medium">Simular</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {models.map((node) => {
                    const health = HEALTH_LABEL[node.status];
                    const isClaude = node.provider === 'Claude';
                    return (
                      <tr
                        key={node.id}
                        className="transition-colors hover:bg-slate-800/35"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-100">
                            {node.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {node.provider} · Fallback: {node.fallbackTarget}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-medium ${health.textClass}`}>
                            {health.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isClaude
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                    : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                                }`}
                                style={{
                                  width: `${
                                    node.status === 'maintenance'
                                      ? 0
                                      : Math.min(100, node.trafficShare * 2)
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-slate-200">
                              {node.status === 'maintenance'
                                ? '0%'
                                : `${node.trafficShare}%`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                          {node.latencyMs} ms
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                          ${node.costPer1MTokens.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onCycleModelStatus(node.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-[11px] text-slate-300 transition-all hover:border-cyan-500/60 hover:text-cyan-200 active:scale-95 whitespace-nowrap"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>Alternar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Token Savings Breakdown Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 bg-[#090F1B] px-5 py-3.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span>
                  Ahorro combinado por ruteo dinámico + purga de agentes IDLE:
                </span>
              </div>
              <div className="font-mono font-semibold text-emerald-400">
                -{totalSavingsPct}% gasto mensual · {tokensSavedMillions}M tokens ahorrados
              </div>
            </div>
          </div>

          {/* Sheldon Human-in-the-Loop Approval Console */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20 xl:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span>Consola de Aprobación de Sheldon</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Propuestas técnicas revisadas por el CTO en espera de firma CEO.
                </p>
              </div>
              <span className="font-mono text-xs text-amber-400">
                {pendingProposals.length} activas
              </span>
            </div>

            <div className="flex-1 divide-y divide-slate-800/70 overflow-y-auto">
              {pendingProposals.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-sm font-medium text-slate-200">
                    Todas las propuestas están aprobadas
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Sheldon enviará nuevas solicitudes aquí cuando un agente mueva una tarea a Aprobación CEO en el Kanban.
                  </p>
                </div>
              ) : (
                pendingProposals.map((prop) => (
                  <div key={prop.id} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-400">
                          {prop.project} · {prop.category} · {prop.timestamp}
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-slate-100">
                          {prop.title}
                        </h3>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-cyan-400">
                        {MODEL_TIER_META[prop.modelTier].shortLabel}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300">
                      {prop.summary}
                    </p>

                    <div className="rounded-xl border border-slate-800/90 bg-[#080E19] p-3.5 text-xs">
                      <div className="font-medium text-amber-400">
                        Dictamen de Sheldon (CTO) sobre {prop.agentName}:
                      </div>
                      <p className="mt-1 italic text-slate-300">
                        &ldquo;{prop.sheldonNote}&rdquo;
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="font-mono text-[11px] text-slate-500">
                        Impacto estimado: {(prop.estimatedTokens / 1000).toFixed(1)}k tokens
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onResolveProposal(prop.id, 'rejected')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-medium text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Rechazar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolveProposal(prop.id, 'approved')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/15 transition-all hover:-translate-y-0.5 hover:from-emerald-300 hover:to-teal-300 active:translate-y-0 active:scale-95"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Aprobar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {resolvedProposals.length > 0 && (
                <div className="bg-[#090F1B] px-5 py-3.5">
                  <div className="mb-2 text-xs font-medium text-slate-400">
                    Decisiones recientes del CEO
                  </div>
                  <div className="space-y-1.5">
                    {resolvedProposals.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate text-slate-300">
                          {item.title}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[11px] ${
                            item.status === 'approved'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Ephemeral Memory Monitor */}
        <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0D1525]/95 shadow-lg shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-400">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Monitor de Memoria Efímera de FlowClic
                </h2>
                <p className="text-xs text-slate-400">
                  Los agentes en estado IDLE liberan su contexto completo a 0 KB RAM y descansan en Zona C.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-[#070B12] p-1">
              {(
                [
                  { id: 'all', label: `Todos (${agents.length})` },
                  {
                    id: 'active',
                    label: `Activos (${agents.length - purgedAgentsCount})`,
                  },
                  { id: 'purged', label: `Purgados 0 KB (${purgedAgentsCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMemoryFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                    memoryFilter === tab.id
                      ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400">
                  <th className="px-5 py-3 font-medium">Agente</th>
                  <th className="px-4 py-3 font-medium">Estado / Zona 3D</th>
                  <th className="px-4 py-3 font-medium">Nivel de Modelo</th>
                  <th className="px-4 py-3 font-medium">Tarea Actual</th>
                  <th className="px-4 py-3 text-right font-medium">Memoria RAM</th>
                  <th className="px-5 py-3 text-right font-medium">Control Efímero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAgents.map((agent) => {
                  const st = STATUS_META[agent.status];
                  const isPurged = isResting(agent.status);
                  return (
                    <tr
                      key={agent.id}
                      className="transition-colors hover:bg-slate-800/35"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          />
                          <div>
                            <div className="font-medium text-slate-100">
                              {agent.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {agent.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${st.textClass}`}>
                          {st.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {st.zoneLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-slate-200">
                          <Cpu className="h-3.5 w-3.5 text-slate-500" />
                          <span>{MODEL_TIER_META[agent.modelTier].shortLabel}</span>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-300">
                        <div className="truncate">{agent.currentTask}</div>
                        <div className="text-[11px] text-slate-500">
                          {agent.project}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={
                            isPurged
                              ? 'text-slate-400'
                              : 'font-semibold text-emerald-400'
                          }
                        >
                          {isPurged
                            ? '0 KB · PURGADA'
                            : `${Math.round(agent.ramKb / 1024)} MB`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isPurged ? (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeAgentStatus(agent.id, 'working')
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95 whitespace-nowrap"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Despertar (Zona A)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onChangeAgentStatus(agent.id, 'idle')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-all hover:border-amber-500/50 hover:text-amber-200 active:scale-95 whitespace-nowrap"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Purgar a 0 KB</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
