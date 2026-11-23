import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Cpu,
  Eye,
  FileCode,
  HardDrive,
  Info,
  Layers,
  Lock,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  AgentCreatePayload,
  AgentTemplateData,
  HairStyle,
  RoleType,
  TicketStatus,
  WorkspaceLevel,
} from '../types/agentProfile';
import {
  ACTION_DEFINITIONS,
  AGENT_TEMPLATES,
  generateSystemPromptPreview,
  GLOBAL_RESTRICTIONS,
  MODELS_CATALOG,
  TRANSITION_LABELS,
  VALID_TRANSITIONS,
  WORKSPACE_LEVELS,
} from '../data/agentTemplates';
import { Agent } from '../types/orbis';
import { api } from '../api/client';
import type { ApiModelInfo, ApiWorkspace } from '../api/types';

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
}

const AVATAR_COLORS = [
  '#06B6D4',
  '#38BDF8',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#6366F1',
  '#8B5CF6',
  '#F97316',
];

const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: 'short', label: 'Corto' },
  { id: 'parted', label: 'Raya al lado' },
  { id: 'long', label: 'Largo' },
  { id: 'curly', label: 'Rizado' },
  { id: 'bun', label: 'Moño' },
];

type ModalTab = 'profile' | 'behavior' | 'permissions' | 'model' | 'preview';

export const CreateAgentProfileModal: React.FC<CreateAgentProfileModalProps> = ({
  open,
  onClose,
  onSubmit,
  apiErrors = [],
  agentToEdit = null,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('penny');
  const [activeTab, setActiveTab] = useState<ModalTab>('profile');

  // Basic Profile Info
  const [name, setName] = useState('Penny');
  const [character, setCharacter] = useState('Penny');
  const [role, setRole] = useState('Frontend web y móvil');
  const [roleType, setRoleType] = useState<RoleType>('DEV_FRONTEND');
  const [avatarColor, setAvatarColor] = useState('#EC4899');
  const [hairStyle, setHairStyle] = useState<HairStyle>('long');
  const [glasses, setGlasses] = useState(false);

  // Behavior Lists
  const [functions, setFunctions] = useState<string[]>(
    AGENT_TEMPLATES.find((t) => t.id === 'penny')?.functions ?? []
  );
  const [rules, setRules] = useState<string[]>(
    AGENT_TEMPLATES.find((t) => t.id === 'penny')?.rules ?? []
  );
  const [restrictions, setRestrictions] = useState<string[]>(
    AGENT_TEMPLATES.find((t) => t.id === 'penny')?.restrictions ?? []
  );

  // Inline List Input Temp States
  const [newFunctionInput, setNewFunctionInput] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');
  const [newRestrictionInput, setNewRestrictionInput] = useState('');

  // Permissions
  const [workspaces, setWorkspaces] = useState<Record<string, WorkspaceLevel>>({
    api: 'none',
    front: 'write',
    docs: 'read',
  });
  const [actions, setActions] = useState<string[]>([
    'repo.read',
    'cmd.install_approved',
    'cmd.dev',
    'cmd.build',
    'cmd.test',
    'cmd.lint',
    'git.commit_dev',
    'git.push_dev',
  ]);
  const [ticketTransitions, setTicketTransitions] = useState<
    Array<[TicketStatus, TicketStatus]>
  >([
    ['PENDING', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'IN_QA'],
    ['RETURNED', 'IN_PROGRESS'],
  ]);
  const [onlyAssignedTickets, setOnlyAssignedTickets] = useState(true);

  // Model & Limits
  const [primaryModel, setPrimaryModel] = useState('gemini-pro');
  const [fallbackModel, setFallbackModel] = useState<string>('gemini-flash');
  const [fallbackCondition, setFallbackCondition] = useState(
    'Para cambios pequeños (textos, estilos puntuales).'
  );
  const [maxTokensPerTicket, setMaxTokensPerTicket] = useState(150000);
  const [maxUsdPerDay, setMaxUsdPerDay] = useState(8);
  const [maxRetries, setMaxRetries] = useState(3);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Dynamic Models and Workspaces from API
  const [modelsList, setModelsList] = useState<ApiModelInfo[]>([]);
  const [workspacesList, setWorkspacesList] = useState<ApiWorkspace[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void api.listModels().then(
      (res) => {
        if (!cancelled && Array.isArray(res)) setModelsList(res);
      },
      () => {}
    );
    void api.listWorkspaces().then(
      (res) => {
        if (!cancelled && Array.isArray(res)) setWorkspacesList(res);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Map API errors to field paths
  const fieldErrors = useMemo(() => {
    const map = new Map<string, string>();
    apiErrors.forEach((err) => {
      map.set(err.path, err.message);
    });
    return map;
  }, [apiErrors]);

  const loadTemplate = (tpl: AgentTemplateData) => {
    setSelectedTemplateId(tpl.id);
    setName(tpl.name);
    setCharacter(tpl.character);
    setRole(tpl.role);
    setRoleType(tpl.roleType);
    setAvatarColor(tpl.avatar.color);
    setHairStyle(tpl.avatar.hairStyle ?? 'short');
    setGlasses(Boolean(tpl.avatar.glasses));

    setFunctions([...tpl.functions]);
    setRules([...tpl.rules]);
    setRestrictions([...tpl.restrictions]);

    setWorkspaces({ ...tpl.permissions.workspaces });
    setActions([...tpl.permissions.actions]);
    setTicketTransitions([...tpl.permissions.ticketTransitions]);
    setOnlyAssignedTickets(tpl.permissions.onlyAssignedTickets);

    setPrimaryModel(tpl.model.primary);
    setFallbackModel(tpl.model.fallback ?? '');
    setFallbackCondition(tpl.model.fallbackCondition ?? '');

    setMaxTokensPerTicket(tpl.limits.maxTokensPerTicket);
    setMaxUsdPerDay(tpl.limits.maxUsdPerDay);
    setMaxRetries(tpl.limits.maxRetries);

    setLocalError(null);
  };

  useEffect(() => {
    if (!open) return;
    if (agentToEdit) {
      setSelectedTemplateId('custom');
      setName(agentToEdit.name);
      setCharacter(agentToEdit.character ?? agentToEdit.name);
      setRole(agentToEdit.title);
      setRoleType(agentToEdit.roleType ?? 'CUSTOM');
      setAvatarColor(agentToEdit.color);
      setHairStyle(agentToEdit.hairStyle ?? 'short');
      setGlasses(Boolean(agentToEdit.glasses));

      setFunctions(agentToEdit.functions ? [...agentToEdit.functions] : []);
      setRules(agentToEdit.rules ? [...agentToEdit.rules] : []);
      setRestrictions(agentToEdit.restrictions ? [...agentToEdit.restrictions] : []);

      setWorkspaces(
        agentToEdit.permissions?.workspaces
          ? { ...agentToEdit.permissions.workspaces }
          : { api: 'none', front: 'none', docs: 'read' }
      );
      setActions(
        agentToEdit.permissions?.actions
          ? [...agentToEdit.permissions.actions]
          : ['repo.read']
      );
      setTicketTransitions(
        agentToEdit.permissions?.ticketTransitions
          ? [...agentToEdit.permissions.ticketTransitions]
          : []
      );
      setOnlyAssignedTickets(agentToEdit.permissions?.onlyAssignedTickets ?? true);

      setPrimaryModel(agentToEdit.modelConfig?.primary ?? 'claude-sonnet-5-5');
      setFallbackModel(agentToEdit.modelConfig?.fallback ?? '');
      setFallbackCondition(agentToEdit.modelConfig?.fallbackCondition ?? '');

      setMaxTokensPerTicket(agentToEdit.limits?.maxTokensPerTicket ?? 150000);
      setMaxUsdPerDay(agentToEdit.limits?.maxUsdPerDay ?? 8);
      setMaxRetries(agentToEdit.limits?.maxRetries ?? 3);
      setLocalError(null);
    } else {
      const defaultTpl =
        AGENT_TEMPLATES.find((t) => t.id === 'penny') ?? AGENT_TEMPLATES[0];
      if (defaultTpl) loadTemplate(defaultTpl);
    }
  }, [open, agentToEdit]);

  const workspaceKeys = useMemo(() => {
    const set = new Set<string>(['api', 'front', 'docs']);
    workspacesList.forEach((w) => set.add(w.id));
    Object.keys(workspaces).forEach((k) => set.add(k));
    return Array.from(set);
  }, [workspacesList, workspaces]);

  const groupedModels = useMemo(() => {
    const catalog: ApiModelInfo[] =
      modelsList.length > 0
        ? modelsList
        : MODELS_CATALOG.map((m) => ({
            id: m.id,
            label: m.label,
            provider: m.provider === 'anthropic' ? 'Anthropic' : 'Google',
            hasConnection: true,
          }));

    const claude = catalog.filter(
      (m) =>
        m.provider.toLowerCase().includes('anthropic') ||
        m.id.toLowerCase().includes('claude')
    );
    const gemini = catalog.filter(
      (m) =>
        m.provider.toLowerCase().includes('google') ||
        m.id.toLowerCase().includes('gemini')
    );
    const others = catalog.filter(
      (m) => !claude.includes(m) && !gemini.includes(m)
    );

    return { claude, gemini, others };
  }, [modelsList]);

  const handleAddFunction = () => {
    const val = newFunctionInput.trim();
    if (!val) return;
    setFunctions((prev) => [...prev, val]);
    setNewFunctionInput('');
  };

  const handleAddRule = () => {
    const val = newRuleInput.trim();
    if (!val) return;
    setRules((prev) => [...prev, val]);
    setNewRuleInput('');
  };

  const handleAddRestriction = () => {
    const val = newRestrictionInput.trim();
    if (!val) return;
    setRestrictions((prev) => [...prev, val]);
    setNewRestrictionInput('');
  };

  const toggleAction = (actId: string) => {
    setActions((prev) =>
      prev.includes(actId) ? prev.filter((a) => a !== actId) : [...prev, actId]
    );
  };

  const toggleTransition = (from: TicketStatus, to: TicketStatus) => {
    setTicketTransitions((prev) => {
      const exists = prev.some(([f, t]) => f === from && t === to);
      if (exists) {
        return prev.filter(([f, t]) => !(f === from && t === to));
      }
      return [...prev, [from, to]];
    });
  };

  const generatedPrompt = useMemo(() => {
    return generateSystemPromptPreview({
      name,
      role,
      roleType,
      functions,
      rules,
      restrictions,
    });
  }, [name, role, roleType, functions, rules, restrictions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('El nombre del agente es obligatorio.');
      setActiveTab('profile');
      return;
    }

    if (!role.trim()) {
      setLocalError('El rol del agente es obligatorio.');
      setActiveTab('profile');
      return;
    }

    const payload: AgentCreatePayload = {
      name: name.trim(),
      role: role.trim(),
      roleType,
      character: character.trim() || undefined,
      avatar: {
        color: avatarColor,
        hairStyle,
        glasses,
      },
      functions,
      rules,
      restrictions,
      permissions: {
        workspaces,
        actions,
        ticketTransitions,
        onlyAssignedTickets,
      },
      model: {
        primary: primaryModel,
        fallback: fallbackModel.trim() || null,
        fallbackCondition: fallbackCondition.trim() || null,
      },
      limits: {
        maxTokensPerTicket,
        maxUsdPerDay,
        maxRetries,
      },
    };

    const isEdit = Boolean(agentToEdit);
    const changedFields: Partial<AgentCreatePayload> = {};

    if (isEdit && agentToEdit) {
      if (name.trim() !== agentToEdit.name) changedFields.name = name.trim();
      if (role.trim() !== agentToEdit.title) changedFields.role = role.trim();
      if (roleType !== (agentToEdit.roleType ?? 'CUSTOM')) changedFields.roleType = roleType;
      if (character.trim() !== (agentToEdit.character ?? '')) {
        changedFields.character = character.trim() || undefined;
      }

      const avatarChanged =
        avatarColor !== agentToEdit.color ||
        hairStyle !== (agentToEdit.hairStyle ?? 'short') ||
        glasses !== Boolean(agentToEdit.glasses);
      if (avatarChanged) {
        changedFields.avatar = { color: avatarColor, hairStyle, glasses };
      }

      if (JSON.stringify(functions) !== JSON.stringify(agentToEdit.functions ?? [])) {
        changedFields.functions = functions;
      }
      if (JSON.stringify(rules) !== JSON.stringify(agentToEdit.rules ?? [])) {
        changedFields.rules = rules;
      }
      if (JSON.stringify(restrictions) !== JSON.stringify(agentToEdit.restrictions ?? [])) {
        changedFields.restrictions = restrictions;
      }

      const currentPerms = { workspaces, actions, ticketTransitions, onlyAssignedTickets };
      const origPerms = agentToEdit.permissions ?? {
        workspaces: {},
        actions: [],
        ticketTransitions: [],
        onlyAssignedTickets: true,
      };
      if (JSON.stringify(currentPerms) !== JSON.stringify(origPerms)) {
        changedFields.permissions = currentPerms;
      }

      const currentModel = {
        primary: primaryModel,
        fallback: fallbackModel.trim() || null,
        fallbackCondition: fallbackCondition.trim() || null,
      };
      const origModel = agentToEdit.modelConfig ?? { primary: 'claude-sonnet-5-5' };
      if (
        currentModel.primary !== origModel.primary ||
        (currentModel.fallback || null) !== (origModel.fallback || null) ||
        (currentModel.fallbackCondition || null) !== (origModel.fallbackCondition || null)
      ) {
        changedFields.model = currentModel;
      }

      const currentLimits = { maxTokensPerTicket, maxUsdPerDay, maxRetries };
      const origLimits = agentToEdit.limits ?? {
        maxTokensPerTicket: 150000,
        maxUsdPerDay: 8,
        maxRetries: 3,
      };
      if (JSON.stringify(currentLimits) !== JSON.stringify(origLimits)) {
        changedFields.limits = currentLimits;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload, isEdit, isEdit ? changedFields : undefined);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError(
          isEdit ? 'Error al actualizar el agente.' : 'Ocurrió un error al crear el agente.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-agent-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#030712]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0A101C] text-slate-100 shadow-2xl shadow-cyan-950/40">
        {/* Header with Title and Template Selector */}
        <div className="border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-400">
                {agentToEdit ? (
                  <Pencil className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2
                  id="create-agent-modal-title"
                  className="text-base font-semibold text-slate-50"
                >
                  {agentToEdit
                    ? `Editar Agente: ${agentToEdit.name}`
                    : 'Crear Nuevo Agente'}
                </h2>
                <p className="text-xs text-slate-400">
                  {agentToEdit
                    ? 'Modifica funciones, reglas, restricciones, modelo y permisos del agente (PLAN §19)'
                    : 'Configura perfiles, permisos duros, modelo y reglas del agente (PLAN §19)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Template Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              {agentToEdit ? 'Reemplazar con plantilla:' : 'Plantilla:'}
            </span>
            {AGENT_TEMPLATES.map((tpl) => {
              const active = selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => loadTemplate(tpl)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 shadow-sm shadow-cyan-500/20'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tpl.avatar.color }}
                  />
                  <span>{tpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-800/80 bg-[#070B14] px-6 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('behavior')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'behavior'
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Funciones & Reglas</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {functions.length + rules.length + restrictions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'permissions'
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Permisos Duros</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-cyan-400">
              {actions.length} act.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('model')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'model'
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Modelo & Límites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Vista Previa Prompt</span>
          </button>
        </div>

        {/* Global/API Alert Banner */}
        {(localError || fieldErrors.size > 0) && (
          <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>
              {localError ||
                `Hay errores en el formulario (${fieldErrors.size} campos inválidos). Revisa las pestañas señaladas.`}
            </span>
          </div>
        )}

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: Profile & Avatar */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Nombre del Agente <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Penny"
                      className={`mt-1.5 w-full rounded-xl border bg-[#070B14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none ${
                        fieldErrors.has('name')
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-800 focus:border-cyan-400'
                      }`}
                    />
                    {fieldErrors.has('name') && (
                      <p className="mt-1 text-[11px] text-rose-400">
                        {fieldErrors.get('name')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Personaje / Referencia
                    </label>
                    <input
                      type="text"
                      value={character}
                      onChange={(e) => setCharacter(e.target.value)}
                      placeholder="Ej: Penny"
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Rol Funcional <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Ej: Frontend web y móvil"
                      className={`mt-1.5 w-full rounded-xl border bg-[#070B14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none ${
                        fieldErrors.has('role')
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-800 focus:border-cyan-400'
                      }`}
                    />
                    {fieldErrors.has('role') && (
                      <p className="mt-1 text-[11px] text-rose-400">
                        {fieldErrors.get('role')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Tipo de Rol (`role_type`)
                    </label>
                    <select
                      value={roleType}
                      onChange={(e) => setRoleType(e.target.value as RoleType)}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="CTO">CTO (Orquestador principal)</option>
                      <option value="DEV_BACKEND">DEV_BACKEND (Backend & Core)</option>
                      <option value="DEV_FRONTEND">DEV_FRONTEND (Frontend & UI)</option>
                      <option value="QA">QA (Calidad & Seguridad)</option>
                      <option value="CUSTOM">CUSTOM (Personalizado)</option>
                    </select>
                  </div>
                </div>

                {/* Avatar Styling */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-200">
                    Aspecto en la Oficina 3D
                  </h4>
                  <div>
                    <label className="block text-xs text-slate-400">
                      Color Identificador
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAvatarColor(c)}
                          className={`h-7 w-7 rounded-xl border-2 transition-all ${
                            avatarColor === c
                              ? 'scale-110 border-white shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-slate-400">
                        Estilo de Peinado
                      </label>
                      <select
                        value={hairStyle}
                        onChange={(e) => setHairStyle(e.target.value as HairStyle)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      >
                        {HAIR_STYLES.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="glasses-checkbox"
                        checked={glasses}
                        onChange={(e) => setGlasses(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                      />
                      <label
                        htmlFor="glasses-checkbox"
                        className="text-xs font-medium text-slate-300"
                      >
                        Lentes / Gafas 3D
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Functions, Rules & Restrictions */}
            {activeTab === 'behavior' && (
              <div className="space-y-6">
                {/* 1. Functions */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Funciones del Agente (Qué hace)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Responsabilidades principales que el agente persigue en sus tickets.
                      </p>
                    </div>
                    <span className="font-mono text-xs text-cyan-400">
                      {functions.length} funciones
                    </span>
                  </div>

                  <div className="space-y-2">
                    {functions.map((fn, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0A101C] px-3.5 py-2 text-xs text-slate-200"
                      >
                        <span className="flex-1">{fn}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFunctions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newFunctionInput}
                      onChange={(e) => setNewFunctionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFunction();
                        }
                      }}
                      placeholder="Añadir nueva función y presionar Enter..."
                      className="flex-1 rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFunction}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* 2. Rules */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Reglas Operativas (Cómo trabaja)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Normas blandas de calidad, comunicación y determinismo.
                      </p>
                    </div>
                    <span className="font-mono text-xs text-emerald-400">
                      {rules.length} reglas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {rules.map((rl, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0A101C] px-3.5 py-2 text-xs text-slate-200"
                      >
                        <span className="flex-1">{rl}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRules((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                      placeholder="Añadir nueva regla y presionar Enter..."
                      className="flex-1 rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* 3. Own Restrictions */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Restricciones Propias del Agente
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Límites de alcance propios del rol (ej: Penny no toca API).
                      </p>
                    </div>
                    <span className="font-mono text-xs text-amber-400">
                      {restrictions.length} propias
                    </span>
                  </div>

                  <div className="space-y-2">
                    {restrictions.map((rst, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0A101C] px-3.5 py-2 text-xs text-slate-200"
                      >
                        <span className="flex-1">{rst}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRestrictions((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newRestrictionInput}
                      onChange={(e) => setNewRestrictionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRestriction();
                        }
                      }}
                      placeholder="Añadir restricción propia y presionar Enter..."
                      className="flex-1 rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddRestriction}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* 4. Global Restrictions (LOCKED) */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Lock className="h-4 w-4" />
                    <h4 className="text-xs font-semibold">
                      Restricciones Globales Inviolables (Bloqueadas con Candado)
                    </h4>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Estas 5 restricciones son aplicadas rigurosamente con código por la API
                    y se inyectan automáticamente en el prompt del servidor. No pueden ser
                    modificadas ni removidas por ningún usuario ni plantilla.
                  </p>

                  <div className="space-y-2">
                    {GLOBAL_RESTRICTIONS.map((glob, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-[#070B14]/80 px-3.5 py-2 text-xs text-amber-100/90"
                      >
                        <Lock className="h-3 w-3 shrink-0 text-amber-400" />
                        <span>
                          <strong className="text-amber-400">{idx + 1}.</strong> {glob}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Permissions (Workspaces, Actions, Transitions) */}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                {/* Workspaces */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Espacios de Trabajo (`permissions.workspaces`)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Nivel de acceso en las carpetas lógicas del proyecto (PLAN §19.3).
                      </p>
                    </div>
                    <HardDrive className="h-4 w-4 text-cyan-400" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {workspaceKeys.map((wsKey) => {
                      const wsInfo = workspacesList.find((w) => w.id === wsKey);
                      return (
                        <div
                          key={wsKey}
                          className="rounded-xl border border-slate-800 bg-[#0A101C] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-cyan-300 uppercase">
                              {wsKey}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {workspaces[wsKey] ?? 'none'}
                            </span>
                          </div>
                          {wsInfo?.name && wsInfo.name !== wsKey && (
                            <div className="mt-0.5 truncate text-[10px] text-slate-400">
                              {wsInfo.name}
                            </div>
                          )}
                          <select
                            value={workspaces[wsKey] ?? 'none'}
                            onChange={(e) =>
                              setWorkspaces((prev) => ({
                                ...prev,
                                [wsKey]: e.target.value as WorkspaceLevel,
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-slate-800 bg-[#070B14] px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                          >
                            {WORKSPACE_LEVELS.map((lvl) => (
                              <option key={lvl.value} value={lvl.value}>
                                {lvl.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Checklist */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Acciones Permitidas (`permissions.actions`)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Lista cerrada de acciones seguras. Las acciones prohibidas
                        (merge main, secrets.read, etc.) no están disponibles.
                      </p>
                    </div>
                    <span className="font-mono text-xs text-cyan-400">
                      {actions.length} seleccionadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {ACTION_DEFINITIONS.map((act) => {
                      const isChecked = actions.includes(act.id);
                      const isCtoRestricted =
                        act.onlyFor === 'CTO' && roleType !== 'CTO';

                      return (
                        <label
                          key={act.id}
                          className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer ${
                            isCtoRestricted
                              ? 'opacity-50 border-slate-800/50 bg-[#070B14]'
                              : isChecked
                              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                              : 'border-slate-800/80 bg-[#0A101C] text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isCtoRestricted}
                            onChange={() => toggleAction(act.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium">
                                {act.label}
                              </span>
                              {act.onlyFor && (
                                <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-semibold text-amber-300">
                                  Solo {act.onlyFor}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {act.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Ticket Transitions Matrix */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Transiciones de Tickets Autorizadas
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Grafo de transiciones del flujo de trabajo (§19.4).
                      </p>
                    </div>
                    <span className="font-mono text-xs text-cyan-400">
                      {ticketTransitions.length} transiciones
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {VALID_TRANSITIONS.map(([from, to]) => {
                      const key = `${from}->${to}`;
                      const isChecked = ticketTransitions.some(
                        ([f, t]) => f === from && t === to
                      );

                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer ${
                            isChecked
                              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                              : 'border-slate-800/80 bg-[#0A101C] text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTransition(from, to)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                          />
                          <span className="text-xs font-medium">
                            {TRANSITION_LABELS[key] ?? `${from} → ${to}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyAssignedTickets}
                        onChange={(e) => setOnlyAssignedTickets(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                      />
                      <span className="text-xs text-slate-300 font-medium">
                        Restringir transiciones solo a tickets explícitamente asignados a este agente (`onlyAssignedTickets`)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Model & Limits */}
            {activeTab === 'model' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-200">
                    Configuración de Modelo de Lenguaje
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-slate-400">
                        Modelo Principal (`primary`) <span className="text-cyan-400">*</span>
                      </label>
                      <select
                        value={primaryModel}
                        onChange={(e) => setPrimaryModel(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      >
                        {groupedModels.claude.length > 0 && (
                          <optgroup label="Modelos Claude">
                            {groupedModels.claude.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {groupedModels.gemini.length > 0 && (
                          <optgroup label="Modelos Gemini">
                            {groupedModels.gemini.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {groupedModels.others.length > 0 && (
                          <optgroup label="Otros Modelos">
                            {groupedModels.others.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400">
                        Modelo de Respaldo (`fallback`)
                      </label>
                      <select
                        value={fallbackModel}
                        onChange={(e) => setFallbackModel(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="">Sin respaldo</option>
                        {groupedModels.claude.length > 0 && (
                          <optgroup label="Modelos Claude">
                            {groupedModels.claude.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {groupedModels.gemini.length > 0 && (
                          <optgroup label="Modelos Gemini">
                            {groupedModels.gemini.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {groupedModels.others.length > 0 && (
                          <optgroup label="Otros Modelos">
                            {groupedModels.others.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} {!m.hasConnection ? '— sin conexión' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400">
                      Condición de Respaldo (`fallbackCondition`)
                    </label>
                    <input
                      type="text"
                      value={fallbackCondition}
                      onChange={(e) => setFallbackCondition(e.target.value)}
                      placeholder="Ej: Si falla 2 veces seguidas en el mismo bug."
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-200">
                    Límites Operativos & Presupuesto
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs text-slate-400">
                        Tokens Máximos / Ticket
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={maxTokensPerTicket}
                        onChange={(e) =>
                          setMaxTokensPerTicket(Number(e.target.value) || 0)
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400">
                        Presupuesto Diario (USD)
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={maxUsdPerDay}
                        onChange={(e) =>
                          setMaxUsdPerDay(Number(e.target.value) || 0)
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400">
                        Reintentos Máximos
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxRetries}
                        onChange={(e) =>
                          setMaxRetries(Number(e.target.value) || 3)
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Prompt Preview */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <FileCode className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-xs font-semibold">
                      Vista Previa del `system_prompt` Generado
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Se generará idéntico en el servidor al guardar
                  </span>
                </div>

                <div className="relative rounded-2xl border border-slate-800 bg-[#050810] p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-all">
                  {generatedPrompt}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#070B14] px-6 py-4">
            <div className="text-[11px] text-slate-500">
              Plantilla activa: <strong className="text-slate-300">{selectedTemplateId}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-300 hover:to-sky-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{agentToEdit ? 'Guardar Cambios' : 'Crear Agente'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
