export type RoleType = 'CTO' | 'DEV_BACKEND' | 'DEV_FRONTEND' | 'QA' | 'CUSTOM';

export type WorkspaceLevel = 'none' | 'read' | 'tests' | 'qa_report' | 'write';

export type TicketStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_SENIOR_REVIEW'
  | 'IN_QA'
  | 'IN_REVIEW'
  | 'DONE'
  | 'RETURNED';

export type HairStyle =
  | 'short'
  | 'long'
  | 'curly'
  | 'bun'
  | 'parted'
  | 'ponytail'
  | 'spiky'
  | 'bob'
  | 'bald';
export type Gender = 'male' | 'female' | 'neutral';
export type FaceStyle = 'neutral' | 'smile' | 'serious' | 'worried';
export type TopStyle = 'tshirt' | 'jacket' | 'hoodie' | 'suit' | 'dress';
export type PantsStyle = 'pants' | 'shorts' | 'skirt';

/** Apariencia completa del personaje (todo opcional: lo no definido usa el aspecto por defecto). */
export interface AvatarLook {
  gender?: Gender;
  skinTone?: string;
  hairColor?: string;
  face?: FaceStyle;
  topStyle?: TopStyle;
  topColor?: string;
  innerColor?: string;
  pantsStyle?: PantsStyle;
  pantsColor?: string;
  shoeColor?: string;
}

export interface AgentAvatarProfile extends AvatarLook {
  color: string;
  glasses?: boolean;
  hairStyle?: HairStyle;
}

/** Tipos de carpeta sobre los que se concede acceso (PERM01). */
export type FolderKind = 'api' | 'front' | 'docs' | 'mobile' | 'other';

export const FOLDER_KINDS: Array<{ id: FolderKind; label: string }> = [
  { id: 'api', label: 'API' },
  { id: 'front', label: 'Front' },
  { id: 'docs', label: 'Docs' },
  { id: 'mobile', label: 'Móvil' },
  { id: 'other', label: 'Otro' },
];

export type FolderAccess = Record<FolderKind, WorkspaceLevel>;

export const EMPTY_FOLDER_ACCESS: FolderAccess = {
  api: 'none',
  front: 'none',
  docs: 'none',
  mobile: 'none',
  other: 'none',
};

/** "ALL" = todos los proyectos, actuales y futuros; o una lista de ids de proyecto. */
export type ProjectScope = 'ALL' | string[];

export interface AgentPermissions {
  folderAccess: FolderAccess;
  projectScope: ProjectScope;
  actions: string[];
  ticketTransitions: Array<[TicketStatus, TicketStatus]>;
  onlyAssignedTickets: boolean;
}

export interface AgentModelConfig {
  primary: string;
  fallback?: string | null;
  fallbackCondition?: string | null;
}

export interface AgentLimits {
  maxTokensPerTicket: number;
  maxUsdPerDay: number;
  maxRetries: number;
}

export interface AgentTemplateData {
  id: string;
  label: string;
  name: string;
  character: string;
  role: string;
  roleType: RoleType;
  avatar: AgentAvatarProfile;
  functions: string[];
  rules: string[];
  restrictions: string[];
  permissions: AgentPermissions;
  model: AgentModelConfig;
  limits: AgentLimits;
}

export interface AgentCreatePayload {
  name: string;
  role: string;
  roleType: RoleType;
  character?: string;
  /** id del agente al que reporta; null = el CEO. */
  reportsTo?: string | null;
  avatar?: AgentAvatarProfile;
  functions: string[];
  rules: string[];
  restrictions: string[];
  permissions: AgentPermissions;
  model: AgentModelConfig;
  limits: AgentLimits;
  project?: string;
}

export interface ApiFieldError {
  path: string;
  message: string;
}

export const GLOBAL_RESTRICTIONS: string[] = [
  'Ningún agente hace merge a `main` ni despliega a producción. Eso lo hace solo el CEO.',
  'Ningún agente ve llaves de producción ni archivos `.env`.',
  'Ningún agente contacta clientes ni envía correos.',
  'Solo Sheldon (CTO) puede hablar con el CEO y crear aprobaciones.',
  'Todo agente se detiene (BLOCKED) tras 3 fallos seguidos o al llegar a su tope de costo diario.',
  'Ningún agente puede autoaprobar compuertas ni saltarse las restricciones de seguridad.',
];

export interface ActionDefinition {
  id: string;
  label: string;
  category: 'tickets' | 'code' | 'commands' | 'system';
  description: string;
  onlyFor?: RoleType;
}

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: 'tickets.create',
    label: 'Crear tickets',
    category: 'tickets',
    description: 'Crear nuevos tickets de trabajo en el tablero',
  },
  {
    id: 'tickets.assign',
    label: 'Asignar tickets',
    category: 'tickets',
    description: 'Asignar o reasignar tickets a agentes del equipo',
  },
  {
    id: 'tickets.close',
    label: 'Cerrar tickets',
    category: 'tickets',
    description: 'Mover tickets al estado final DONE',
  },
  {
    id: 'repo.read',
    label: 'Lectura de repositorios',
    category: 'code',
    description: 'Acceso de lectura al código fuente del proyecto',
  },
  {
    id: 'git.commit_dev',
    label: 'Commit en rama dev',
    category: 'code',
    description: 'Realizar commits con ID de ticket en la rama dev',
  },
  {
    id: 'git.push_dev',
    label: 'Push a rama dev',
    category: 'code',
    description: 'Empujar cambios a la rama remota dev',
  },
  {
    id: 'cmd.install_approved',
    label: 'Instalar deps aprobadas',
    category: 'commands',
    description: 'Ejecutar instalación de paquetes aprobados en PLAN',
  },
  {
    id: 'cmd.dev',
    label: 'Comandos dev / preview',
    category: 'commands',
    description: 'Arrancar entorno local de desarrollo y previsualización',
  },
  {
    id: 'cmd.build',
    label: 'Compilación / Build',
    category: 'commands',
    description: 'Ejecutar build del proyecto y verificar bundles',
  },
  {
    id: 'cmd.test',
    label: 'Ejecución de pruebas',
    category: 'commands',
    description: 'Correr suites de tests automatizados (pytest / vitest)',
  },
  {
    id: 'cmd.lint',
    label: 'Linters y tipo-chequeo',
    category: 'commands',
    description: 'Ejecutar verificación de tipos y análisis estático',
  },
  {
    id: 'cmd.audit',
    label: 'Auditoría de seguridad',
    category: 'commands',
    description: 'Ejecutar auditorías de dependencias y secretos',
  },
  {
    id: 'memory.write',
    label: 'Escribir en memoria',
    category: 'system',
    description: 'Registrar notas de arquitectura y contexto persistente',
  },
  {
    id: 'approvals.create',
    label: 'Crear compuertas de aprobación',
    category: 'system',
    description: 'Crear compuertas 1..4 (Restricción global: solo CTO)',
    onlyFor: 'CTO',
  },
];

export const VALID_TRANSITIONS: Array<[TicketStatus, TicketStatus]> = [
  ['PENDING', 'IN_PROGRESS'],
  ['IN_PROGRESS', 'IN_SENIOR_REVIEW'],
  ['IN_SENIOR_REVIEW', 'IN_QA'],
  ['IN_SENIOR_REVIEW', 'RETURNED'],
  ['IN_QA', 'IN_REVIEW'],
  ['IN_QA', 'RETURNED'],
  ['IN_REVIEW', 'DONE'],
  ['IN_REVIEW', 'RETURNED'],
  ['RETURNED', 'IN_PROGRESS'],
];

export const TRANSITION_LABELS: Record<string, string> = {
  'PENDING->IN_PROGRESS': 'PENDIENTE → EN CURSO',
  'IN_PROGRESS->IN_SENIOR_REVIEW': 'EN CURSO → REVISIÓN SENIOR',
  'IN_SENIOR_REVIEW->IN_QA': 'REVISIÓN SENIOR → EN QA',
  'IN_SENIOR_REVIEW->RETURNED': 'REVISIÓN SENIOR → DEVUELTA',
  'IN_QA->IN_REVIEW': 'EN QA → REVISIÓN CTO',
  'IN_QA->RETURNED': 'EN QA → DEVUELTA',
  'IN_REVIEW->DONE': 'REVISIÓN CTO → HECHO',
  'IN_REVIEW->RETURNED': 'REVISIÓN CTO → DEVUELTA',
  'RETURNED->IN_PROGRESS': 'DEVUELTA → EN CURSO',
};

export const WORKSPACE_LEVELS: Array<{ value: WorkspaceLevel; label: string; desc: string }> = [
  { value: 'none', label: 'Sin acceso (none)', desc: 'No puede ver ni modificar esta carpeta' },
  { value: 'read', label: 'Solo lectura (read)', desc: 'Lectura para inspección y análisis' },
  { value: 'tests', label: 'Solo pruebas (tests)', desc: 'Escritura exclusiva en tests/' },
  { value: 'qa_report', label: 'Solo reporte (qa_report)', desc: 'Escritura exclusiva en docs/QA_REPORT.md' },
  { value: 'write', label: 'Lectura y escritura (write)', desc: 'Permiso completo de edición en rama dev' },
];

export function generateSystemPromptPreview(data: {
  name: string;
  role: string;
  roleType: RoleType;
  reportsTo?: string;
  functions: string[];
  rules: string[];
  restrictions: string[];
}): string {
  const name = data.name.trim() || '[Nombre]';
  const role = data.role.trim() || '[Rol]';
  const roleType = data.roleType;

  const formatList = (items: string[]) =>
    items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- (ninguna)';

  const ownRestrictions = data.restrictions.filter(
    (r) => !GLOBAL_RESTRICTIONS.includes(r)
  );

  const globalsBlock = GLOBAL_RESTRICTIONS.map(
    (r, idx) => `${idx + 1}. ${r}`
  ).join('\n');

  const reportsBlock = data.reportsTo ? `\nReporta a: ${data.reportsTo}.` : '';

  return `Eres ${name}, ${role} (role_type=${roleType}) del equipo de FlowClic Oficina IA.${reportsBlock}

## Funciones
${formatList(data.functions)}

## Reglas (cómo trabajas)
${formatList(data.rules)}

## Restricciones propias (nunca)
${formatList(ownRestrictions)}

## RESTRICCIONES GLOBALES (obligatorias y no negociables)
${globalsBlock}`;
}
