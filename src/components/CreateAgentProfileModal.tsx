import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACTION_DEFINITIONS,
  AgentCreatePayload,
  AgentPermissions,
  EMPTY_FOLDER_ACCESS,
  FOLDER_KINDS,
  FolderAccess,
  generateSystemPromptPreview,
  GLOBAL_RESTRICTIONS,
  HairStyle,
  ProjectScope,
  RoleType,
  TicketStatus,
  TRANSITION_LABELS,
  VALID_TRANSITIONS,
  WORKSPACE_LEVELS,
} from '../types/agentProfile';
import { Agent } from '../types/orbis';
import { AvatarEditor } from './AvatarEditor';
import type { AvatarLook } from '../types/agentProfile';
import { api } from '../api/client';
import type { ApiModelInfo, ApiProject } from '../api/types';
import { setModelCatalog } from '../utils/models';
import { agentFromApi } from '../api/mappers';

interface CreateAgentProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: AgentCreatePayload,
    isEdit?: boolean,
    changedFields?: Partial<AgentCreatePayload>
  ) => Promise<void> | void;
  agentToEdit?: Agent | null;
  apiErrors?: Array<{ path: string; message: string }>;
  existingAgents?: Agent[];
  onNavigateToWorkspaces?: () => void;
}

const ROLE_TYPES: Array<{ id: RoleType; label: string }> = [
  { id: 'CUSTOM', label: 'CUSTOM (Personalizado)' },
  { id: 'CTO', label: 'CTO (Orquestador principal)' },
  { id: 'DEV_BACKEND', label: 'DEV_BACKEND (Backend & Core)' },
  { id: 'DEV_FRONTEND', label: 'DEV_FRONTEND (Frontend & UI)' },
  { id: 'QA', label: 'QA (Calidad & Seguridad)' },
];

const LIMIT_DEFAULTS = { maxTokensPerTicket: 150000, maxUsdPerDay: 8, maxRetries: 3 };
const CEO = 'CEO'; // valor del select: se envía como reportsTo = null

/** Sección plegable con un resumen de sus valores por defecto. */
const Collapsible: React.FC<{
  title: string;
  hint: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, hint, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0B1220]/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          )}
          {title}
        </span>
        <span className="text-[11px] text-slate-500">{hint}</span>
      </button>
      {open && <div className="border-t border-slate-800/70 px-4 py-4">{children}</div>}
    </section>
  );
};

const inputCls =
  'mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none';

const ListEditor: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}> = ({ items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={`${inputCls} mt-0`}
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-500/45 bg-cyan-500/12 px-3 text-xs text-cyan-200 hover:bg-cyan-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[11px] text-slate-500">Sin elementos (valor por defecto: vacío).</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <li
              key={`${i}-${it}`}
              className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-1.5 text-xs text-slate-200"
            >
              <span>{it}</span>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-slate-500 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const normalizePermissions = (p?: Partial<AgentPermissions>): AgentPermissions => ({
  folderAccess: { ...EMPTY_FOLDER_ACCESS, ...(p?.folderAccess ?? {}) },
  projectScope: p?.projectScope ?? [],
  actions: p?.actions ?? [],
  ticketTransitions: p?.ticketTransitions ?? [],
  onlyAssignedTickets: p?.onlyAssignedTickets ?? true,
});

export const CreateAgentProfileModal: React.FC<CreateAgentProfileModalProps> = ({
  open,
  onClose,
  onSubmit,
  agentToEdit = null,
  existingAgents,
}) => {
  // ── Obligatorios ──
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('CUSTOM');
  const [primaryModel, setPrimaryModel] = useState('');
  const [reportsTo, setReportsTo] = useState(''); // '' = sin elegir · 'CEO' · id de agente

  // ── Opcionales (plegables, con valores por defecto) ──
  const [character, setCharacter] = useState('');
  const [avatarColor, setAvatarColor] = useState('#06B6D4');
  const [hairStyle, setHairStyle] = useState<HairStyle>('short');
  const [glasses, setGlasses] = useState(false);
  const [look, setLook] = useState<AvatarLook>({});
  const [functions, setFunctions] = useState<string[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [perms, setPerms] = useState<AgentPermissions>(normalizePermissions());
  const [fallbackModel, setFallbackModel] = useState('');
  const [fallbackCondition, setFallbackCondition] = useState('');
  const [maxTokensPerTicket, setMaxTokensPerTicket] = useState(LIMIT_DEFAULTS.maxTokensPerTicket);
  const [maxUsdPerDay, setMaxUsdPerDay] = useState(LIMIT_DEFAULTS.maxUsdPerDay);
  const [maxRetries, setMaxRetries] = useState(LIMIT_DEFAULTS.maxRetries);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [modelsList, setModelsList] = useState<ApiModelInfo[]>([]);
  const [projectsList, setProjectsList] = useState<ApiProject[]>([]);
  const [internalAgents, setInternalAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void api.listModels().then(
      (res) => {
        if (!cancelled && Array.isArray(res)) {
          setModelsList(res);
          setModelCatalog(res);
        }
      },
      () => {}
    );
    void api.listProjects().then(
      (res) => {
        if (!cancelled && Array.isArray(res)) setProjectsList(res);
      },
      () => {}
    );
    if (!existingAgents) {
      void api.listAgents().then(
        (res) => {
          if (!cancelled && Array.isArray(res)) setInternalAgents(res.map(agentFromApi));
        },
        () => {}
      );
    }
    return () => {
      cancelled = true;
    };
  }, [open, existingAgents]);

  const otherAgents = useMemo(() => {
    const list = existingAgents ?? internalAgents;
    return list.filter((a) => a.id !== agentToEdit?.id && !a.archivedAt);
  }, [existingAgents, internalAgents, agentToEdit]);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setSomeMode(false);
    if (agentToEdit) {
      setName(agentToEdit.name);
      setRole(agentToEdit.title);
      setRoleType(agentToEdit.roleType ?? 'CUSTOM');
      setPrimaryModel(agentToEdit.modelConfig?.primary ?? agentToEdit.model ?? '');
      setReportsTo(agentToEdit.reportsTo ?? CEO);
      setCharacter(agentToEdit.character ?? agentToEdit.name);
      setAvatarColor(agentToEdit.color);
      setHairStyle(agentToEdit.hairStyle ?? 'short');
      setGlasses(Boolean(agentToEdit.glasses));
      setLook(agentToEdit.look ?? {});
      setFunctions([...(agentToEdit.functions ?? [])]);
      setRules([...(agentToEdit.rules ?? [])]);
      setRestrictions([...(agentToEdit.restrictions ?? [])]);
      setPerms(normalizePermissions(agentToEdit.permissions));
      setFallbackModel(agentToEdit.modelConfig?.fallback ?? '');
      setFallbackCondition(agentToEdit.modelConfig?.fallbackCondition ?? '');
      setMaxTokensPerTicket(agentToEdit.limits?.maxTokensPerTicket ?? LIMIT_DEFAULTS.maxTokensPerTicket);
      setMaxUsdPerDay(agentToEdit.limits?.maxUsdPerDay ?? LIMIT_DEFAULTS.maxUsdPerDay);
      setMaxRetries(agentToEdit.limits?.maxRetries ?? LIMIT_DEFAULTS.maxRetries);
    } else {
      setName('');
      setRole('');
      setRoleType('CUSTOM');
      setPrimaryModel('');
      setReportsTo('');
      setCharacter('');
      setAvatarColor('#06B6D4');
      setHairStyle('short');
      setGlasses(false);
      setLook({});
      setFunctions([]);
      setRules([]);
      setRestrictions([]);
      setPerms(normalizePermissions());
      setFallbackModel('');
      setFallbackCondition('');
      setMaxTokensPerTicket(LIMIT_DEFAULTS.maxTokensPerTicket);
      setMaxUsdPerDay(LIMIT_DEFAULTS.maxUsdPerDay);
      setMaxRetries(LIMIT_DEFAULTS.maxRetries);
    }
  }, [open, agentToEdit]);

  const groupedModels = useMemo(() => {
    const claude = modelsList.filter(
      (m) => m.provider.toLowerCase().includes('anthropic') || m.id.toLowerCase().includes('claude')
    );
    const gemini = modelsList.filter(
      (m) => m.provider.toLowerCase().includes('google') || m.id.toLowerCase().includes('gemini')
    );
    const others = modelsList.filter((m) => !claude.includes(m) && !gemini.includes(m));
    return { claude, gemini, others };
  }, [modelsList]);

  const isCto = roleType === 'CTO';
  // Regla: solo el CTO habla con el CEO; el resto reporta a un agente (no al CEO).
  const changeRoleType = (next: RoleType) => {
    setRoleType(next);
    if (next === 'CTO') setReportsTo(CEO);
    else if (reportsTo === CEO) setReportsTo('');
  };

  // ¿Su jefe es un revisor senior (puede pasar REVISIÓN SENIOR → EN QA)? Entonces este agente
  // NO puede ir directo de EN CURSO a EN QA: debe pasar por REVISIÓN SENIOR.
  const bossIsSenior = otherAgents.some(
    (a) =>
      a.id === reportsTo &&
      (a.permissions?.ticketTransitions ?? []).some(
        ([f, t]) => f === 'IN_SENIOR_REVIEW' && t === 'IN_QA'
      )
  );

  const bossName =
    reportsTo === CEO ? 'CEO' : (otherAgents.find((a) => a.id === reportsTo)?.name ?? undefined);

  const generatedPrompt = useMemo(
    () =>
      generateSystemPromptPreview({
        name,
        role,
        roleType,
        reportsTo: bossName,
        functions,
        rules,
        restrictions,
      }),
    [name, role, roleType, bossName, functions, rules, restrictions]
  );

  const setFolder = (kind: keyof FolderAccess, level: FolderAccess[typeof kind]) =>
    setPerms((p) => ({ ...p, folderAccess: { ...p.folderAccess, [kind]: level } }));

  const toggleAction = (id: string) =>
    setPerms((p) => ({
      ...p,
      actions: p.actions.includes(id) ? p.actions.filter((a) => a !== id) : [...p.actions, id],
    }));

  const toggleTransition = (from: TicketStatus, to: TicketStatus) =>
    setPerms((p) => {
      const has = p.ticketTransitions.some(([f, t]) => f === from && t === to);
      return {
        ...p,
        ticketTransitions: has
          ? p.ticketTransitions.filter(([f, t]) => !(f === from && t === to))
          : [...p.ticketTransitions, [from, to]],
      };
    });

  const scope: ProjectScope = perms.projectScope;
  // Select global: '' = en blanco (sin proyectos) · ALL = todos, actuales y futuros · SOME = lista
  type ScopeMode = '' | 'ALL' | 'SOME';
  const [someMode, setSomeMode] = useState(false);
  const scopeMode: ScopeMode =
    scope === 'ALL' ? 'ALL' : someMode || scope.length > 0 ? 'SOME' : '';
  const changeScopeMode = (mode: ScopeMode) => {
    setSomeMode(mode === 'SOME');
    setPerms((p) => ({
      ...p,
      projectScope: mode === 'ALL' ? 'ALL' : mode === 'SOME' && p.projectScope !== 'ALL' ? p.projectScope : [],
    }));
  };
  const selectableProjects = projectsList.filter(
    (p) => p.status === 'ACTIVE' || (scope !== 'ALL' && scope.includes(p.id))
  );
  const toggleProject = (id: string) =>
    setPerms((p) => {
      const cur = p.projectScope === 'ALL' ? [] : p.projectScope;
      return {
        ...p,
        projectScope: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });

  const validate = (): string | null => {
    if (!name.trim()) return 'El nombre del agente es obligatorio.';
    if (!role.trim()) return 'El rol funcional es obligatorio.';
    if (!primaryModel) return 'Elige el modelo principal.';
    if (!reportsTo) return 'Indica a quién reporta (CEO o un agente).';
    if (!Number.isInteger(maxTokensPerTicket) || maxTokensPerTicket < 1 || maxTokensPerTicket > 10_000_000)
      return 'Tokens por ticket: entero entre 1 y 10.000.000.';
    if (!(maxUsdPerDay >= 0 && maxUsdPerDay <= 100_000)) return 'USD por día: entre 0 y 100.000.';
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 20)
      return 'Reintentos: entero entre 0 y 20.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    const reports = reportsTo === CEO ? null : reportsTo;
    const model = {
      primary: primaryModel,
      fallback: fallbackModel || null,
      fallbackCondition: fallbackCondition.trim() || null,
    };
    const limits = { maxTokensPerTicket, maxUsdPerDay, maxRetries };
    const avatar = { color: avatarColor, hairStyle, glasses, ...look };
    const payload: AgentCreatePayload = {
      name: name.trim(),
      role: role.trim(),
      roleType,
      character: character.trim() || undefined,
      reportsTo: reports,
      avatar,
      functions,
      rules,
      restrictions,
      permissions: bossIsSenior
        ? {
            ...perms,
            ticketTransitions: perms.ticketTransitions.filter(
              ([f, t]) => !(f === 'IN_PROGRESS' && t === 'IN_QA')
            ),
          }
        : perms,
      model,
      limits,
    };

    const isEdit = Boolean(agentToEdit);
    const changed: Partial<AgentCreatePayload> = {};
    if (isEdit && agentToEdit) {
      if (payload.name !== agentToEdit.name) changed.name = payload.name;
      if (payload.role !== agentToEdit.title) changed.role = payload.role;
      if (roleType !== (agentToEdit.roleType ?? 'CUSTOM')) changed.roleType = roleType;
      if ((character.trim() || '') !== (agentToEdit.character ?? '')) {
        changed.character = character.trim() || undefined;
      }
      if (reports !== (agentToEdit.reportsTo ?? null)) changed.reportsTo = reports;
      const avatarChanged =
        avatarColor !== agentToEdit.color ||
        hairStyle !== (agentToEdit.hairStyle ?? 'short') ||
        glasses !== Boolean(agentToEdit.glasses) ||
        JSON.stringify(look) !== JSON.stringify(agentToEdit.look ?? {});
      if (avatarChanged) changed.avatar = avatar;
      if (JSON.stringify(functions) !== JSON.stringify(agentToEdit.functions ?? []))
        changed.functions = functions;
      if (JSON.stringify(rules) !== JSON.stringify(agentToEdit.rules ?? [])) changed.rules = rules;
      if (JSON.stringify(restrictions) !== JSON.stringify(agentToEdit.restrictions ?? []))
        changed.restrictions = restrictions;
      if (
        JSON.stringify(payload.permissions) !==
        JSON.stringify(normalizePermissions(agentToEdit.permissions))
      )
        changed.permissions = payload.permissions;
      const origModel = agentToEdit.modelConfig ?? { primary: '' };
      if (
        model.primary !== origModel.primary ||
        (model.fallback || null) !== (origModel.fallback || null) ||
        (model.fallbackCondition || null) !== (origModel.fallbackCondition || null)
      )
        changed.model = model;
      const origLimits = agentToEdit.limits ?? LIMIT_DEFAULTS;
      if (JSON.stringify(limits) !== JSON.stringify(origLimits)) changed.limits = limits;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload, isEdit, isEdit ? changed : undefined);
    } catch (e2: unknown) {
      setLocalError(
        e2 instanceof Error
          ? e2.message
          : isEdit
            ? 'Error al actualizar el agente.'
            : 'Ocurrió un error al crear el agente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const modelOptions = (list: ApiModelInfo[]) =>
    list.map((m) => (
      <option key={m.id} value={m.id}>
        {m.label}
        {m.hasConnection ? '' : ' (sin clave)'}
      </option>
    ));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-agent-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      <div
        className="fixed inset-0 bg-[#030712]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0A101C] text-slate-100 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-400">
              {agentToEdit ? <Pencil className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="create-agent-modal-title" className="text-base font-semibold text-slate-50">
                {agentToEdit ? `Editar Agente: ${agentToEdit.name}` : 'Crear Nuevo Agente'}
              </h2>
              <p className="text-xs text-slate-400">
                Lo obligatorio arriba; el resto, en secciones plegables con valores por defecto.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Obligatorios */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-300">
                Nombre del Agente <span className="text-cyan-400">*</span>
                <input
                  type="text"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Penny"
                  className={inputCls}
                />
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Rol funcional <span className="text-cyan-400">*</span>
                <input
                  type="text"
                  value={role}
                  maxLength={120}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ej: Frontend web y móvil"
                  className={inputCls}
                />
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Tipo de rol <span className="text-cyan-400">*</span>
                <select
                  value={roleType}
                  onChange={(e) => changeRoleType(e.target.value as RoleType)}
                  className={inputCls}
                >
                  {ROLE_TYPES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Modelo principal <span className="text-cyan-400">*</span>
                <select
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecciona un modelo…</option>
                  {groupedModels.claude.length > 0 && (
                    <optgroup label="Claude">{modelOptions(groupedModels.claude)}</optgroup>
                  )}
                  {groupedModels.gemini.length > 0 && (
                    <optgroup label="Gemini">{modelOptions(groupedModels.gemini)}</optgroup>
                  )}
                  {groupedModels.others.length > 0 && (
                    <optgroup label="Otros">{modelOptions(groupedModels.others)}</optgroup>
                  )}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300 sm:col-span-2">
                Reporta a <span className="text-cyan-400">*</span>
                <select
                  value={reportsTo}
                  onChange={(e) => setReportsTo(e.target.value)}
                  disabled={isCto}
                  className={`${inputCls} disabled:opacity-60`}
                >
                  {isCto ? (
                    <option value={CEO}>CEO (el CTO reporta directamente al CEO)</option>
                  ) : (
                    <>
                      <option value="">Selecciona a quién reporta…</option>
                      {otherAgents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.title || a.roleType || 'Agente'})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {!isCto && otherAgents.length === 0 && (
                  <span className="mt-1 block text-[11px] text-amber-400">
                    Aún no hay otros agentes: crea primero al CTO (reporta al CEO).
                  </span>
                )}
                {!isCto && (
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Solo el CTO reporta al CEO; el resto reporta a un agente.
                  </span>
                )}
              </label>
            </div>

            {/* Restricciones globales (siempre visibles, con candado) */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Lock className="h-3.5 w-3.5" />
                Restricciones globales ({GLOBAL_RESTRICTIONS.length}) — no editables
              </div>
              <ol className="mt-2 space-y-1">
                {GLOBAL_RESTRICTIONS.map((r, i) => (
                  <li key={r} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/80" />
                    <span>
                      {i + 1}. {r}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Plegables */}
            <Collapsible title="Personaje y avatar" hint="Por defecto: nombre del agente, avatar cian">
              <label className="block text-xs font-medium text-slate-300">
                Personaje / Referencia
                <input
                  type="text"
                  value={character}
                  maxLength={80}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="Ej: Penny"
                  className={inputCls}
                />
              </label>
              <div className="mt-4">
                <AvatarEditor
                  name={name}
                  color={avatarColor}
                  onColor={setAvatarColor}
                  hairStyle={hairStyle}
                  onHairStyle={setHairStyle}
                  glasses={glasses}
                  onGlasses={setGlasses}
                  look={look}
                  onLook={(patch) => setLook((prev) => ({ ...prev, ...patch }))}
                />
              </div>
            </Collapsible>

            <Collapsible title="Funciones" hint={`${functions.length} · por defecto: ninguna`}>
              <ListEditor
                items={functions}
                onChange={setFunctions}
                placeholder="Qué hace este agente (Enter para añadir)"
              />
            </Collapsible>

            <Collapsible title="Reglas" hint={`${rules.length} · por defecto: ninguna`}>
              <ListEditor
                items={rules}
                onChange={setRules}
                placeholder="Cómo trabaja (Enter para añadir)"
              />
            </Collapsible>

            <Collapsible title="Restricciones propias" hint={`${restrictions.length} · por defecto: ninguna`}>
              <ListEditor
                items={restrictions}
                onChange={setRestrictions}
                placeholder="Qué nunca debe hacer (Enter para añadir)"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Las 6 restricciones globales se aplican siempre y no se pueden quitar.
              </p>
            </Collapsible>

            <Collapsible
              title="Permisos"
              hint={`Carpetas, proyectos, acciones y transiciones · por defecto: sin acceso`}
            >
              {/* Acceso por tipo de carpeta */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Acceso por tipo de carpeta</h4>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Se aplica a todos los espacios de ese tipo, dentro del alcance de proyectos.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FOLDER_KINDS.map((k) => (
                    <label
                      key={k.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-300"
                    >
                      {k.label}
                      <select
                        value={perms.folderAccess[k.id]}
                        onChange={(e) =>
                          setFolder(k.id, e.target.value as FolderAccess[typeof k.id])
                        }
                        aria-label={`Acceso a carpetas ${k.label}`}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                      >
                        {WORKSPACE_LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              {/* Alcance de proyectos */}
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-slate-200">Alcance de proyectos</h4>
                <select
                  aria-label="Alcance de proyectos"
                  value={scopeMode}
                  onChange={(e) => changeScopeMode(e.target.value as ScopeMode)}
                  className={inputCls}
                >
                  <option value="">— Sin seleccionar (en blanco) —</option>
                  <option value="ALL">Todos los proyectos (actuales y futuros)</option>
                  <option value="SOME">Solo algunos proyectos…</option>
                </select>
                {scopeMode === '' && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    En blanco: el agente no ve ninguna carpeta de ningún proyecto.
                  </p>
                )}
                {scopeMode === 'SOME' && (
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {selectableProjects.length === 0 ? (
                      <p className="text-[11px] text-amber-400">
                        No hay proyectos: créalos en Administración → Proyectos.
                      </p>
                    ) : (
                      selectableProjects.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-1.5 text-xs text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={scope !== 'ALL' && scope.includes(p.id)}
                            onChange={() => toggleProject(p.id)}
                            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                          />
                          {p.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-slate-200">Acciones permitidas</h4>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {ACTION_DEFINITIONS.map((a) => {
                    const blocked = a.onlyFor !== undefined && a.onlyFor !== roleType;
                    return (
                      <label
                        key={a.id}
                        title={a.description}
                        className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-1.5 text-xs ${
                          blocked ? 'opacity-40' : 'text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={perms.actions.includes(a.id)}
                          onChange={() => toggleAction(a.id)}
                          className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                        />
                        {a.label}
                        {blocked && <Lock className="h-3 w-3 text-slate-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Transiciones */}
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-slate-200">Transiciones de tickets</h4>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {VALID_TRANSITIONS.map(([from, to]) => {
                    const direct = from === 'IN_PROGRESS' && to === 'IN_QA';
                    const locked = direct && bossIsSenior;
                    return (
                    <label
                      key={`${from}-${to}`}
                      title={
                        locked
                          ? 'Reporta a un revisor senior: debe pasar por REVISIÓN SENIOR'
                          : direct
                            ? 'Solo para agentes que no reportan a un revisor senior'
                            : undefined
                      }
                      className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-1.5 text-xs text-slate-300 ${
                        locked ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={
                          !locked && perms.ticketTransitions.some(([f, t]) => f === from && t === to)
                        }
                        onChange={() => toggleTransition(from, to)}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                      />
                      {TRANSITION_LABELS[`${from}->${to}`] ?? `${from} → ${to}`}
                      {locked && <Lock className="h-3 w-3 text-slate-500" />}
                    </label>
                    );
                  })}
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={perms.onlyAssignedTickets}
                    onChange={(e) =>
                      setPerms((p) => ({ ...p, onlyAssignedTickets: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  Solo puede mover tickets asignados a él
                </label>
              </div>
            </Collapsible>

            <Collapsible
              title="Límites"
              hint={`${maxTokensPerTicket.toLocaleString('es')} tokens · ${maxUsdPerDay} USD/día · ${maxRetries} reintentos`}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block text-xs font-medium text-slate-300">
                  Tokens por ticket
                  <input
                    type="number"
                    min={1}
                    max={10000000}
                    step={1}
                    value={maxTokensPerTicket}
                    onChange={(e) => setMaxTokensPerTicket(Number(e.target.value))}
                    className={inputCls}
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">1 – 10.000.000 (def. 150.000)</span>
                </label>
                <label className="block text-xs font-medium text-slate-300">
                  USD por día
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step="any"
                    value={maxUsdPerDay}
                    onChange={(e) => setMaxUsdPerDay(Number(e.target.value))}
                    className={inputCls}
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">0 – 100.000 (def. 8)</span>
                </label>
                <label className="block text-xs font-medium text-slate-300">
                  Reintentos
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className={inputCls}
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">0 – 20 (def. 3)</span>
                </label>
              </div>
            </Collapsible>

            <Collapsible title="Modelo de respaldo" hint="Por defecto: ninguno">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-300">
                  Modelo de respaldo
                  <select
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Sin respaldo</option>
                    {modelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-300">
                  Condición de uso
                  <input
                    type="text"
                    value={fallbackCondition}
                    maxLength={200}
                    onChange={(e) => setFallbackCondition(e.target.value)}
                    placeholder="Ej: solo en compuertas 2 y 4"
                    className={inputCls}
                  />
                </label>
              </div>
            </Collapsible>

            <Collapsible title="Vista previa del prompt" hint="Lo genera el servidor al guardar">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-[#070B14] p-3 text-[11px] leading-relaxed text-slate-300">
                {generatedPrompt}
              </pre>
            </Collapsible>
          </div>

          {localError && (
            <div
              role="alert"
              className="mx-6 mb-0 mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {localError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {agentToEdit ? 'Guardar cambios' : 'Crear agente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
