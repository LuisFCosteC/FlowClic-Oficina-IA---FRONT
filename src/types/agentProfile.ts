export type RoleType = 'CTO' | 'DEV_BACKEND' | 'DEV_FRONTEND' | 'QA' | 'CUSTOM';

export type WorkspaceLevel = 'none' | 'read' | 'tests' | 'qa_report' | 'write';

export type TicketStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
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

export interface AgentPermissions {
  workspaces: Record<string, WorkspaceLevel>;
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
