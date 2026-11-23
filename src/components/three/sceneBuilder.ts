import * as THREE from 'three';
import {
  createBbtRugTexture,
  createCeoScreenTexture,
  createLabFloorTexture,
  createMonitorScreenTexture,
  createServerRackTexture,
  createSheldonWhiteboardTexture,
  createGamingScreenTexture,
  createTvScreenTexture,
  createWoodFloorTexture,
} from './proceduralTextures';
import { buildCeoFigure } from './avatarBuilder';

export interface ZoneSlot {
  x: number;
  z: number;
  yaw: number;
  /** 'sit' = sentado (silla, puf, sofá); 'lie' = acostado (cama). Sin pose: de pie / según su estado. */
  pose?: 'sit' | 'lie';
  /** Altura a la que se desplaza el cuerpo respecto al suelo para apoyarse en el asiento o la cama. */
  y?: number;
}

// ---------------------------------------------------------------------------
// Distribución Arquitectónica FlowClic Oficina IA:
//   - Ala Norte (Fondo):
//       * Extremo Izquierdo: OFICINA DEL CEO (cx: -22.5, cz: -7.7, w: 18, d: 12.4) -> PEGADA A SHELDON (x = -13.5)
//       * Centro Izquierdo:  OFICINA DE SHELDON (cx: -7.5, cz: -7.7, w: 12, d: 12.4) -> PEGADA AL CEO
//       * Centro Derecho:    OFICINA DEL LEONARD (cx: 4.5, cz: -7.7, w: 12, d: 12.4)
//       * Extremo Derecho:   SALA DE JUNTAS (cx: 17.5, cz: -7.7, w: 14, d: 12.4) -> PEGADA A LEONARD
//   - Único pasillo: horizontal (z = 0, CORRIDOR_W = 3) entre ambas alas; las oficinas de cada ala van pegadas
//   - Ala Sur (Frente):
//       * Izquierda completa: LABORATORIO EXPANDIDO (cx: -15.5, cz: 7.7, w: 28, d: 12.4) -> 20 PUESTOS DE TRABAJO,
//                              ubicado enfrente de la Oficina de Sheldon y la Oficina del CEO.
//       * Centro Derecho:    ZONA DE DESCANSO (cx: 4.5, cz: 7.7, w: 12, d: 12.4)
//       * Extremo Derecho:   DATA CENTER (cx: 17.5, cz: 7.7, w: 14, d: 12.4) -> PEGADO A DESCANSO
// ---------------------------------------------------------------------------
export const ROOM_W = 12;
export const ROOM_D = 12.4;
export const CORRIDOR_W = 5;
export const ROOM_CX = 7.5; // centro de la oficina de Sheldon: x = -7.5 (ya no depende del ancho del pasillo)
export const ROOM_CZ = CORRIDOR_W / 2 + ROOM_D / 2; // 8.7
// Filas pegadas (sin pasillo vertical): Sheldon -13.5..-1.5 | Leonard -1.5..10.5 | Juntas 10.5..24.5
export const SENIOR_CX = 4.5; // Oficina de Leonard / Zona de descanso
export const WING_E_CX = 17.5; // Sala de juntas / Data center (w: 14)

// Centro original de cada zona (coordenadas con las que está escrito el mobiliario base)
const ORIG = {
  laboratorio: { x: -13.5, z: -0.2 },
  sheldon: { x: 0.2, z: -0.2 },
  descanso: { x: 9.45, z: -0.2 },
};
const offsetTo = (orig: { x: number; z: number }, cx: number, cz: number) => ({
  dx: cx - orig.x,
  dz: cz - orig.z,
});

// El laboratorio (x -31.5..-1.5) tiene el mismo límite oeste que la oficina del CEO
export const ZONE_OFFSETS = {
  laboratorio: offsetTo(ORIG.laboratorio, -16.5, ROOM_CZ),
  sheldon: offsetTo(ORIG.sheldon, -ROOM_CX, -ROOM_CZ),
  descanso: offsetTo(ORIG.descanso, SENIOR_CX, ROOM_CZ),
};

type Offset = { dx: number; dz: number };
const shiftSlot = (s: ZoneSlot, o: Offset): ZoneSlot => ({ ...s, x: s.x + o.dx, z: s.z + o.dz });

// Laboratorio: 20 Workstations ampliadas (5 columnas x 4 filas frente a monitores)
// con pasillos amplios de tránsito
const RAW_WORKSTATION_SLOTS: ZoneSlot[] = Array.from({ length: 20 }, (_, i) => ({
  x: -20.7 + (i % 5) * 3.6,
  z: -4.2 + Math.floor(i / 5) * 2.8,
  yaw: Math.PI,
}));

// Oficina de Sheldon: Work & Review Hub (Apartamento 4A)
// CTO: se sienta en su escritorio al trabajar, se para frente a los tableros al revisar
// y descansa en el sofá del costado.
const RAW_SHELDON_DESK_SLOT: ZoneSlot = { x: 0.2, z: -0.38, yaw: Math.PI };
const RAW_SHELDON_BOARD_SLOT: ZoneSlot = { x: 0.2, z: -4.75, yaw: Math.PI };
const RAW_SHELDON_SOFA_SLOT: ZoneSlot = { x: 5.45, z: 2.2, yaw: -Math.PI / 2, pose: 'sit', y: -0.03 };

// Resto del equipo que espera revisión: en fila delante del escritorio
const RAW_REVIEW_SLOTS: ZoneSlot[] = [
  { x: -2.2, z: 2.2, yaw: Math.PI },
  { x: -1.0, z: 2.2, yaw: Math.PI },
  { x: 0.2, z: 2.2, yaw: Math.PI },
  { x: 1.4, z: 2.2, yaw: Math.PI },
  { x: 2.6, z: 2.2, yaw: Math.PI },
  { x: -1.6, z: 3.4, yaw: Math.PI },
  { x: -0.4, z: 3.4, yaw: Math.PI },
  { x: 0.8, z: 3.4, yaw: Math.PI },
  { x: 2.0, z: 3.4, yaw: Math.PI },
];

// Zona de descanso: Rest & Lounge Zone
// Mesas de la cafetería: (x, z) de cada mesa y asientos W/S/E/N con su orientación hacia la mesa
const DINING_TABLES: Array<[number, number]> = [
  [7.5, -2.2],
  [11.5, -2.2],
  [7.5, 1.4],
  [11.5, 1.4],
];
const chairSlot = (tx: number, tz: number, side: 0 | 1 | 2 | 3): ZoneSlot => {
  const o: Array<[number, number, number]> = [
    [-0.85, 0, Math.PI / 2],
    [0, 0.85, Math.PI],
    [0.85, 0, -Math.PI / 2],
    [0, -0.85, 0],
  ];
  return { x: tx + o[side][0], z: tz + o[side][1], yaw: o[side][2], pose: 'sit', y: -0.01 };
};
// Literas: x, z y altura del colchón (inferior 0.59 / superior 1.55) + 0.13 de grosor del cuerpo
const BUNKS: Array<[number, number]> = [
  [4.2, -2.4],
  [4.2, 0.4],
  [14.7, -2.4],
  [14.7, 0.4],
];
const bedSlot = (b: [number, number], upper: boolean): ZoneSlot => ({
  x: b[0],
  z: b[1],
  yaw: 0,
  pose: 'lie',
  y: upper ? 1.7 : 0.72,
});
const pufSlot = (x: number): ZoneSlot => ({ x, z: 3.65, yaw: 0, pose: 'sit', y: -0.14 });

// Descanso normal: mezcla de pufs, sillas y camas
const RAW_LOUNGE_SLOTS: ZoneSlot[] = [
  pufSlot(6.8),
  chairSlot(7.5, -2.2, 0),
  bedSlot(BUNKS[0], false),
  pufSlot(9.5),
  chairSlot(11.5, -2.2, 2),
  bedSlot(BUNKS[2], false),
  pufSlot(12.2),
  chairSlot(7.5, 1.4, 0),
  bedSlot(BUNKS[1], false),
  chairSlot(11.5, 1.4, 0),
  bedSlot(BUNKS[3], false),
];
// Desayuno / almuerzo: todos sentados a las mesas (4 mesas x 4 sillas = 16)
const RAW_MEAL_SLOTS: ZoneSlot[] = DINING_TABLES.flatMap(([tx, tz]) =>
  ([0, 2, 1, 3] as const).map((side) => chairSlot(tx, tz, side))
);
// Dormir: todos acostados en las camas (4 literas x 2 niveles = 8)
const RAW_SLEEP_SLOTS: ZoneSlot[] = [
  ...BUNKS.map((b) => bedSlot(b, false)),
  ...BUNKS.map((b) => bedSlot(b, true)),
];

export const WORKSTATION_SLOTS: ZoneSlot[] = RAW_WORKSTATION_SLOTS.map((s) =>
  shiftSlot(s, ZONE_OFFSETS.laboratorio)
);
export const SHELDON_DESK_SLOT: ZoneSlot = shiftSlot(RAW_SHELDON_DESK_SLOT, ZONE_OFFSETS.sheldon);
export const SHELDON_BOARD_SLOT: ZoneSlot = shiftSlot(RAW_SHELDON_BOARD_SLOT, ZONE_OFFSETS.sheldon);
export const SHELDON_SOFA_SLOT: ZoneSlot = shiftSlot(RAW_SHELDON_SOFA_SLOT, ZONE_OFFSETS.sheldon);
export const REVIEW_SLOTS: ZoneSlot[] = RAW_REVIEW_SLOTS.map((s) =>
  shiftSlot(s, ZONE_OFFSETS.sheldon)
);
export const LOUNGE_SLOTS: ZoneSlot[] = RAW_LOUNGE_SLOTS.map((s) =>
  shiftSlot(s, ZONE_OFFSETS.descanso)
);
export const MEAL_SLOTS: ZoneSlot[] = RAW_MEAL_SLOTS.map((s) => shiftSlot(s, ZONE_OFFSETS.descanso));
export const SLEEP_SLOTS: ZoneSlot[] = RAW_SLEEP_SLOTS.map((s) => shiftSlot(s, ZONE_OFFSETS.descanso));

/** Puertas de cada oficina hacia el pasillo horizontal (z = ±1.5). */
export const DOORS = {
  sheldon: { x: -ROOM_CX, z: -CORRIDOR_W / 2 },
  senior: { x: SENIOR_CX, z: -CORRIDOR_W / 2 },
  junta: { x: WING_E_CX, z: -CORRIDOR_W / 2 },
  laboratorio: { x: -16.5, z: CORRIDOR_W / 2 },
  descanso: { x: SENIOR_CX, z: CORRIDOR_W / 2 },
  ceo: { x: -22.5, z: -CORRIDOR_W / 2 },
  datacenter: { x: WING_E_CX, z: CORRIDOR_W / 2 },
};

/**
 * Puntos intermedios para ir de A a B dentro de la oficina de Sheldon sin atravesar el
 * escritorio del CTO. Coordenadas del mundo. Devuelve [] si no hace falta desvío.
 */
export function sheldonDetour(
  a: { x: number; z: number },
  b: { x: number; z: number }
): Array<{ x: number; z: number }> {
  const o = ZONE_OFFSETS.sheldon;
  const ax = a.x - o.dx;
  const az = a.z - o.dz;
  const bx = b.x - o.dx;
  const bz = b.z - o.dz;
  const SPLIT_Z = -0.8; // el escritorio ocupa z ∈ [-1.6, 0.1], x ∈ [-1.6, 2.0]
  if (az > SPLIT_Z === bz > SPLIT_Z) return [];
  if (Math.max(ax, bx) < -1.6 || Math.min(ax, bx) > 2.0) return [];
  const sideX = (ax + bx) / 2 > 0.2 ? 2.8 : -2.4;
  return [
    { x: sideX + o.dx, z: az + o.dz },
    { x: sideX + o.dx, z: bz + o.dz },
  ];
}

// Sala de juntas: Al lado de la oficina del Senior en el ala norte (cx: 21.5, cz: -ROOM_CZ)
export const BOARDROOM = { cx: WING_E_CX, cz: -ROOM_CZ, w: 14, d: ROOM_D };

// Data Center: Al frente de la Sala de Juntas y al lado de la Zona de Descanso en el ala sur (cx: 21.5, cz: ROOM_CZ)
export const DATACENTER = { cx: WING_E_CX, cz: ROOM_CZ, w: 14, d: ROOM_D };

// Oficina del CEO: Pegada a la oficina de Sheldon en el ala norte (cx: -22.5, cz: -ROOM_CZ)
export const CEO_OFFICE = { cx: -22.5, cz: -ROOM_CZ, w: 18, d: ROOM_D };

// Dimensiones del Laboratorio expandido a mano izquierda
export const LAB_EXPANDED = { cx: -16.5, cz: ROOM_CZ, w: 30, d: ROOM_D };

// Puesto del CEO: sentado en su sillón presidencial, de cara a la puerta
export const CEO_DESK_SLOT: ZoneSlot = { x: CEO_OFFICE.cx, z: CEO_OFFICE.cz - 1.7 - 1.5, yaw: 0, pose: 'sit', y: 0.065 };

// Slots de visita frente al escritorio del CEO donde vienen Sheldon y Leonard a esperar aprobaciones
export const CEO_VISITOR_SLOTS = {
  chairSheldon: { x: -22.5 - 1.25, z: -ROOM_CZ + 0.5, yaw: Math.PI, pose: 'sit', y: 0 } as ZoneSlot,
  chairLeonard: { x: -22.5 + 1.25, z: -ROOM_CZ + 0.5, yaw: Math.PI, pose: 'sit', y: 0 } as ZoneSlot,
};

const SEAT_SPACING = 1.15;
export const BOARDROOM_SEATS = 15;
export function boardroomLayout(n: number) {
  n = Math.max(n, BOARDROOM_SEATS);
  const perSide = Math.ceil(Math.max(0, n - 1) / 2);
  return { perSide, L: Math.max(3, perSide * SEAT_SPACING + 0.6) };
}
/** Asientos de la sala de juntas. El 0 es la cabecera (CTO); el resto, a los lados de la mesa. */
export function boardroomSeats(n: number): ZoneSlot[] {
  n = Math.max(n, BOARDROOM_SEATS);
  const { perSide, L } = boardroomLayout(n);
  const seats: ZoneSlot[] = [];
  if (n >= 1) seats.push({ x: BOARDROOM.cx + L / 2 + 0.9, z: BOARDROOM.cz, yaw: -Math.PI / 2, pose: 'sit', y: 0 });
  for (let i = 0; i < n - 1; i++) {
    const north = i % 2 === 0;
    const k = Math.floor(i / 2);
    seats.push({
      x: BOARDROOM.cx - ((perSide - 1) * SEAT_SPACING) / 2 + k * SEAT_SPACING,
      z: BOARDROOM.cz + (north ? -1.6 : 1.6),
      yaw: north ? 0 : Math.PI,
      pose: 'sit',
      y: 0,
    });
  }
  return seats;
}

// Oficina del Senior (grupo en ROOM_CX, -ROOM_CZ)
export const SENIOR_DESK_SLOT: ZoneSlot = { x: SENIOR_CX, z: -ROOM_CZ - 0.48, yaw: Math.PI };
export const SENIOR_POUF_SLOT: ZoneSlot = { x: SENIOR_CX + 3.8, z: -ROOM_CZ + 1.8, yaw: Math.PI, pose: 'sit', y: 0.02 };

/**
 * Ruta (coordenadas del mundo) para que un agente del laboratorio vaya a entregar su tarea
 * al tablero 1, tome la nueva en el tablero 2 y vuelva a su puesto sin atravesar los escritorios.
 */
export function labTaskSwapPath(deskIdx: number): Array<{ x: number; z: number }> {
  const o = ZONE_OFFSETS.laboratorio;
  const d = RAW_WORKSTATION_SLOTS[deskIdx];
  const gx = d.x + 1.8; // pasillo libre entre columnas de escritorios
  const rowZ = -5.8;
  const fidget = (bx: number) => [
    { x: bx, z: rowZ },
    { x: bx + 0.4, z: rowZ },
    { x: bx - 0.4, z: rowZ },
    { x: bx + 0.2, z: rowZ },
    { x: bx, z: rowZ },
  ];
  const pts = [
    { x: gx, z: d.z },
    { x: gx, z: rowZ },
    ...fidget(-17.5),
    ...fidget(-9.5),
    { x: gx, z: rowZ },
    { x: gx, z: d.z },
    { x: d.x, z: d.z },
  ];
  return pts.map((p) => ({ x: p.x + o.dx, z: p.z + o.dz }));
}

export const ZONE_LABEL_ANCHORS = [
  {
    id: 'laboratorio',
    title: 'LABORATORIO',
    subtitle: 'Estaciones de Trabajo (20 Puestos)',
    pos: new THREE.Vector3(LAB_EXPANDED.cx, 3.3, CORRIDOR_W / 2 + 0.6),
    accent: '#06B6D4',
  },
  {
    id: 'oficina-sheldon',
    title: 'OFICINA DE SHELDON',
    subtitle: 'Revisión y Arquitectura CTO',
    pos: new THREE.Vector3(-ROOM_CX, 3.6, -ROOM_CZ - ROOM_D / 2 + 0.8),
    accent: '#F59E0B',
  },
  {
    id: 'oficina-ceo',
    title: 'OFICINA DEL CEO',
    subtitle: 'Presidencia & Dirección General',
    pos: new THREE.Vector3(CEO_OFFICE.cx, 3.8, -ROOM_CZ - ROOM_D / 2 + 0.8),
    accent: '#F59E0B',
  },
  {
    id: 'oficina-senior',
    title: 'OFICINA DEL LEONARD',
    subtitle: 'Desarrollo Full-Stack',
    pos: new THREE.Vector3(SENIOR_CX, 3.3, -ROOM_CZ - ROOM_D / 2 + 0.8),
    accent: '#A78BFA',
  },
  {
    id: 'sala-juntas',
    title: 'SALA DE JUNTAS',
    subtitle: 'Reunión del equipo',
    pos: new THREE.Vector3(BOARDROOM.cx, 3.3, BOARDROOM.cz - BOARDROOM.d / 2 + 0.8),
    accent: '#38BDF8',
  },
  {
    id: 'data-center',
    title: 'DATA CENTER',
    subtitle: 'Servidores & Cluster GPU',
    pos: new THREE.Vector3(DATACENTER.cx, 3.3, CORRIDOR_W / 2 + 0.6),
    accent: '#06B6D4',
  },
  {
    id: 'zona-descanso',
    title: 'ZONA DE DESCANSO',
    subtitle: 'Lounge & Reposo',
    pos: new THREE.Vector3(SENIOR_CX, 3.3, CORRIDOR_W / 2 + 0.6),
    accent: '#FB923C',
  },
];

export interface BoardProject {
  name: string;
  total: number;
  done: number;
}

/** Datos reales del equipo que alimentan todas las pantallas y librerías de la oficina. */
export interface OfficeStats {
  online: boolean;
  agents: Array<{
    name: string;
    status: string;
    title: string;
    isCTO: boolean;
    task: string;
    done: number;
    active: number;
    tokens: number;
    ramKb: number;
  }>;
  stages: { backlog: number; in_dev: number; sheldon_review: number; ceo_approval: number; completed: number };
  projects: BoardProject[];
  inDevTitles: string[];
  backlogTitles: string[];
  approvalTitles: string[];
}

/** Contenido del panel que se abre al hacer clic en un equipo, tablero, pantalla o librero. */
export interface InfoTarget {
  title: string;
  section: string;
  description: string;
  lines: string[];
  images: string[];
  /** true cuando todavía no hay información: el panel muestra el apartado donde irá. */
  empty: boolean;
}

export interface BuiltOfficeScene {
  dnaHelix: THREE.Group;
  holoOrb: THREE.Mesh;
  /** Hologramas que la vista hace girar. */
  spinners: THREE.Object3D[];
  /** Rellena los 3 tableros y las librerías (un libro por proyecto). */
  setProjects: (list: BoardProject[]) => void;
  setSelectedProject: (name: string | null) => void;
  /** Tableros y libros sobre los que se puede hacer clic. */
  getPickables: () => THREE.Object3D[];
  /** Nombre del proyecto que corresponde a un impacto del rayo, o null. */
  resolvePick: (hit: THREE.Intersection) => string | null;
  /** Placa con el nombre y nota con la tarea de cada puesto del laboratorio (índice = puesto). */
  setLabDesks: (entries: Array<{ name: string; task: string } | null>) => void;
  /** Tableros del laboratorio: tareas en curso (entregar) y backlog (tomar). */
  setLabBoards: (data: { inProgress: string[]; backlog: string[] }) => void;
  /** Equipos, pantallas, tableros y librerías sobre los que se puede hacer clic. */
  getInfoPickables: () => THREE.Object3D[];
  /** Información del elemento que corresponde a un impacto del rayo, o null. */
  resolveInfo: (hit: THREE.Intersection) => InfoTarget | null;
  /** Alimenta pantallas, tableros y librerías de toda la oficina con datos reales. */
  setOfficeStats: (s: OfficeStats) => void;
  /** Una silla por agente en la sala de juntas. */
  setBoardroomSeats: (n: number) => void;
  dispose: () => void;
}

export function buildColmenaOffice(
  rootScene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltOfficeScene {
  // `scene` apunta al grupo de la zona que se está construyendo (o a la raíz).
  let scene: THREE.Object3D = rootScene;
  const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposables.push(t);
    return t;
  };

  // --- Shared Architectural Materials ---
  const baseSlabMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090f1a,
      roughness: 0.72,
      metalness: 0.25,
    })
  );
  const darkMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x162032,
      roughness: 0.35,
      metalness: 0.82,
    })
  );
  const brushedAlumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.28,
      metalness: 0.88,
    })
  );
  const glassWallMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  const backWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0d1526,
      roughness: 0.78,
      metalness: 0.15,
    })
  );

  // --- Main Platform Base ---
  // Abarca todo el complejo: desde x = -32.5 (CEO / Lab) hasta x = 24.5 (Juntas / Data Center)
  // y z = -14.5 a 14.5
  const FULL_W = 57;
  const FULL_D = 2 * ROOM_D + CORRIDOR_W;
  const platform = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(FULL_W, 0.44, FULL_D)),
    baseSlabMat
  );
  platform.position.set(-4, -0.22, 0);
  platform.receiveShadow = true;
  scene.add(platform);

  // Outer sleek perimeter trim
  const trimStripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6,
    })
  );
  const frontTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(FULL_W + 0.2, 0.06, 0.08)),
    trimStripMat
  );
  frontTrim.position.set(-4, -0.02, FULL_D / 2 + 0.04);
  scene.add(frontTrim);

  // Back Architectural Wall
  const backWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(FULL_W + 0.2, 4.1, 0.28)),
    backWallMat
  );
  backWall.position.set(-4, 2.05, -FULL_D / 2 - 0.14);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Particiones de cristal en los bordes del pasillo (con puertas abiertas a cada oficina)
  const addGlassWall = (x1: number, z1: number, x2: number, z2: number, mat: THREE.Material = glassWallMat) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) return;
    const yaw = Math.atan2(-(z2 - z1), x2 - x1);
    const wall = new THREE.Group();
    wall.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    wall.rotation.y = yaw;
    const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(len, 3.0, 0.1)), mat);
    glass.position.y = 1.5;
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(len, 0.9, 0.12)), darkMetalMat);
    base.position.y = 0.45;
    wall.add(glass, base);
    [-len / 2, len / 2].forEach((px) => {
      const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 3.15, 0.16)), darkMetalMat);
      post.position.set(px, 1.58, 0);
      wall.add(post);
    });
    scene.add(wall);
  };
  const HC = CORRIDOR_W / 2; // 1.5
  const DOOR_HALF = 1.3;
  const WZ = HC + ROOM_D; // borde exterior norte/sur de las alas
  // Pared frontal norte de oficinas (z = -HC = -1.5) con puertas a cada una
  // Oficinas norte: CEO (cx: -22.5), Sheldon (cx: -7.5), Senior (cx: 7.5), Juntas (cx: 21.5)
  [-22.5, -7.5, SENIOR_CX, WING_E_CX].forEach((cx) => {
    const halfW = cx === -22.5 ? 9 : cx === WING_E_CX ? 7 : ROOM_W / 2;
    addGlassWall(cx - halfW, -HC, cx - DOOR_HALF, -HC);
    addGlassWall(cx + DOOR_HALF, -HC, cx + halfW, -HC);
  });
  // Pared frontal sur de oficinas (z = HC = 1.5) con puertas a cada una
  // Oficinas sur: Lab (cx: -15.5, w: 28), Descanso (cx: 7.5, w: 12), Data Center (cx: 21.5, w: 14)
  // Lab
  addGlassWall(-31.5, HC, -16.5 - DOOR_HALF, HC);
  addGlassWall(-16.5 + DOOR_HALF, HC, -1.5, HC);
  // Descanso
  addGlassWall(-1.5, HC, SENIOR_CX - DOOR_HALF, HC);
  addGlassWall(SENIOR_CX + DOOR_HALF, HC, 10.5, HC);
  // Data Center
  addGlassWall(10.5, HC, WING_E_CX - DOOR_HALF, HC);
  addGlassWall(WING_E_CX + DOOR_HALF, HC, 24.5, HC);

  // Paredes divisorias entre oficinas:
  // Norte (pared exterior a pasillo):
  addGlassWall(-13.5, -WZ, -13.5, -HC); // Entre CEO y Sheldon (vidrio transparente, igual que las demás paredes)
  addGlassWall(-1.5, -WZ, -1.5, -HC);  // Entre Sheldon y Leonard
  addGlassWall(10.5, -WZ, 10.5, -HC);  // Entre Leonard y Sala de Juntas
  // Sur (z ∈ [1.5, 14.5]):
  addGlassWall(-1.5, HC, -1.5, WZ);   // Entre Laboratorio y Descanso
  addGlassWall(10.5, HC, 10.5, WZ);   // Entre Descanso y Data Center

  // =========================================================================
  // PASILLO CENTRAL (Horizontal y conexión vertical) CON EL LOGO
  // =========================================================================
  const corridorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c1526,
      roughness: 0.32,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const corridorH = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(FULL_W, CORRIDOR_W)), corridorMat);
  corridorH.rotation.x = -Math.PI / 2;
  corridorH.position.set(-4, 0.012, 0);
  corridorH.receiveShadow = true;

  scene.add(corridorH);

  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 1024;
  logoCanvas.height = 1024;
  const lg = logoCanvas.getContext('2d')!;
  lg.clearRect(0, 0, 1024, 1024);
  lg.fillStyle = 'rgba(8, 14, 28, 0.92)';
  lg.beginPath();
  lg.arc(512, 512, 500, 0, Math.PI * 2);
  lg.fill();
  lg.strokeStyle = '#06b6d4';
  lg.lineWidth = 14;
  lg.beginPath();
  lg.arc(512, 512, 480, 0, Math.PI * 2);
  lg.stroke();
  lg.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  lg.lineWidth = 4;
  lg.beginPath();
  lg.arc(512, 512, 440, 0, Math.PI * 2);
  lg.stroke();
  // Marca: hexágono con un cursor (clic)
  lg.strokeStyle = '#38bdf8';
  lg.lineWidth = 18;
  lg.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = 512 + Math.cos(a) * 170;
    const py = 380 + Math.sin(a) * 170;
    if (i === 0) lg.moveTo(px, py);
    else lg.lineTo(px, py);
  }
  lg.closePath();
  lg.stroke();
  lg.fillStyle = '#f59e0b';
  lg.beginPath();
  lg.moveTo(470, 320);
  lg.lineTo(470, 450);
  lg.lineTo(505, 418);
  lg.lineTo(535, 480);
  lg.lineTo(562, 468);
  lg.lineTo(532, 406);
  lg.lineTo(580, 400);
  lg.closePath();
  lg.fill();
  lg.textAlign = 'center';
  lg.fillStyle = '#f8fafc';
  lg.font = 'bold 150px sans-serif';
  lg.fillText('FlowClic', 512, 700);
  lg.fillStyle = '#06b6d4';
  lg.font = 'bold 74px sans-serif';
  lg.fillText('OFICINA IA', 512, 790);
  const logoTex = trackTex(new THREE.CanvasTexture(logoCanvas));
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = maxAnisotropy;
  const logoPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(CORRIDOR_W - 0.1, CORRIDOR_W - 0.1)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: logoTex,
        transparent: true,
        roughness: 0.4,
        metalness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    )
  );
  logoPlane.rotation.x = -Math.PI / 2;
  logoPlane.position.set(-4, 0.02, 0);
  scene.add(logoPlane);

  // Grupos de zona: el mobiliario conserva sus coordenadas originales dentro de cada grupo
  const makeZoneGroup = (o: { dx: number; dz: number }) => {
    const g = new THREE.Group();
    g.position.set(o.dx, 0, o.dz);
    rootScene.add(g);
    return g;
  };
  const labGroup = makeZoneGroup(ZONE_OFFSETS.laboratorio);
  const sheldonGroup = makeZoneGroup(ZONE_OFFSETS.sheldon);
  const loungeGroup = makeZoneGroup(ZONE_OFFSETS.descanso);
  const seniorGroup = new THREE.Group();
  seniorGroup.position.set(SENIOR_CX, 0, -ROOM_CZ);
  rootScene.add(seniorGroup);

  scene = labGroup;
  // =========================================================================
  // LABORATORIO EXPANDIDO (20 PUESTOS DE TRABAJO A MANO IZQUIERDA)
  // Ubicado enfrente de la Oficina de Sheldon y la Oficina del CEO (cx: -15.5, cz: 7.7)
  // =========================================================================
  const labFloorTex = trackTex(createLabFloorTexture(maxAnisotropy));
  const labFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: labFloorTex,
      roughness: 0.55,
      metalness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const labFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(LAB_EXPANDED.w, ROOM_D)),
    labFloorMat
  );
  labFloor.rotation.x = -Math.PI / 2;
  labFloor.position.set(-13.5, 0.015, -0.2);
  labFloor.receiveShadow = true;
  scene.add(labFloor);

  // Laboratorio border accent line
  const zoneABar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(LAB_EXPANDED.w - 0.4, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  zoneABar.position.set(-13.5, 0.025, 5.95);
  scene.add(zoneABar);

  // Build 20 composite workstations in Laboratorio (5x4 grid matching RAW_WORKSTATION_SLOTS[0..19])
  const deskTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x131d31,
      roughness: 0.42,
      metalness: 0.38,
    })
  );
  const chairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.12,
    })
  );
  const monitorTextures = [0, 1, 2].map((v) =>
    trackTex(createMonitorScreenTexture(v, maxAnisotropy))
  );

  // --- Utilidades de texturas de texto (placas, notas, tableros, TV) ---
  const makeCanvasTex = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const tex = trackTex(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return { ctx, tex, w, h };
  };
  type CTex = ReturnType<typeof makeCanvasTex>;
  const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
    }
    return lines;
  };
  const addSign = (
    text: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    w: number,
    color: string
  ) => {
    const ct = makeCanvasTex(1024, 128);
    ct.ctx.fillStyle = '#0b1220';
    ct.ctx.fillRect(0, 0, 1024, 128);
    ct.ctx.strokeStyle = color;
    ct.ctx.lineWidth = 8;
    ct.ctx.strokeRect(6, 6, 1012, 116);
    ct.ctx.fillStyle = color;
    ct.ctx.font = 'bold 64px sans-serif';
    ct.ctx.textAlign = 'center';
    ct.ctx.fillText(text, 512, 84);
    ct.tex.needsUpdate = true;
    const sign = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(w, w / 8)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: ct.tex,
          emissiveMap: ct.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.6,
        })
      )
    );
    sign.position.set(x, y, z);
    sign.rotation.y = yaw;
    scene.add(sign);
  };
  const buildRackAt = (
    x: number,
    z: number,
    yaw: number,
    faceMat: THREE.Material,
    metalMat: THREE.Material
  ) => {
    const rack = new THREE.Group();
    rack.position.set(x, 0, z);
    rack.rotation.y = yaw;
    const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 2.7, 0.85)), metalMat);
    chassis.position.y = 1.35;
    chassis.castShadow = true;
    rack.add(chassis);
    const face = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.04, 2.52)), faceMat);
    face.position.set(0, 1.35, 0.432);
    rack.add(face);
    scene.add(rack);
  };
  // --- Utilidades de decoración compartidas (librerías vacías, lámparas, alfombras, sofás) ---
  const mulberry = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const clipTxt = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + '…' : t);

  // Estado compartido de las pantallas de información (datos reales del equipo)
  let officeStats: OfficeStats = {
    online: false,
    agents: [],
    stages: { backlog: 0, in_dev: 0, sheldon_review: 0, ceo_approval: 0, completed: 0 },
    projects: [],
    inDevTitles: [],
    backlogTitles: [],
    approvalTitles: [],
  };
  const infoRedraws: Array<() => void> = [];
  const totalTickets = () => Object.values(officeStats.stages).reduce((a, b) => a + b, 0);

  // Librerías: nacen VACÍAS y se llenan con un libro por proyecto y por tarea completada
  const BOOK_SLOTS_PER_ROW = 20;
  type InfoSpec = {
    title: string;
    section: string;
    description: string;
    lines?: () => string[];
    images?: () => string[];
    empty?: () => boolean;
  };
  const infoPickables: THREE.Object3D[] = [];
  const infoSpecs = new Map<string, InfoSpec>();
  let infoSeq = 0;
  const registerInfo = (root: THREE.Object3D | THREE.Object3D[], spec: InfoSpec) => {
    const key = 'info' + infoSeq++;
    infoSpecs.set(key, spec);
    (Array.isArray(root) ? root : [root]).forEach((r) =>
      r.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.userData.infoKey = key;
          infoPickables.push(o);
        }
      })
    );
  };
  const canvasImages = (o: THREE.Object3D): string[] => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    const img = m?.map?.image as HTMLCanvasElement | undefined;
    return img && typeof img.toDataURL === 'function' ? [img.toDataURL('image/png')] : [];
  };
  const resolveInfo = (hit: THREE.Intersection): InfoTarget | null => {
    const key = hit.object.userData.infoKey as string | undefined;
    const spec = key ? infoSpecs.get(key) : undefined;
    if (!spec) return null;
    return {
      title: spec.title,
      section: spec.section,
      description: spec.description,
      lines: spec.lines ? spec.lines() : [],
      images: spec.images ? spec.images() : canvasImages(hit.object),
      empty: spec.empty ? spec.empty() : false,
    };
  };
  const noTeamData = () => officeStats.agents.length === 0 && totalTickets() === 0;
  const agentLines = (a?: OfficeStats['agents'][number]) =>
    a
      ? [`Agente: ${a.name}`, `Estado: ${a.status}`, `Tarea actual: ${a.task || 'sin tarea'}`, `Tareas completadas: ${a.done}`]
      : [];

  type Library = { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; rows: number; W: number; H: number; h: number; count: number };
  const libraries: Library[] = [];
  const bookPalette2 = ['#991b1b', '#1e3a8a', '#14532d', '#78350f', '#312e81', '#b45309', '#0f766e', '#7c2d12', '#581c87', '#e5e7eb'];
  // Libros sobre baldas reales: la textura es transparente salvo donde hay libros
  const libPitch = (lib: Library) => (lib.h - 0.04) / lib.rows;
  const drawLibrary = (lib: Library, count: number, base: number) => {
    const g = lib.ctx;
    lib.count = count;
    g.clearRect(0, 0, lib.W, lib.H);
    const pitch = libPitch(lib);
    const maxH = ((pitch - 0.1) / lib.h) * lib.H;
    for (let r = 0; r < lib.rows; r++) {
      const baseY = lib.H - ((r * pitch + 0.05) / lib.h) * lib.H;
      for (let k = 0; k < BOOK_SLOTS_PER_ROW; k++) {
        const idx = r * BOOK_SLOTS_PER_ROW + k;
        if (idx >= count) break;
        const rnd = mulberry(base + idx * 17 + 3);
        const bw = 12 + rnd() * 8;
        const bh = maxH * (0.62 + rnd() * 0.38);
        const bx = 10 + k * 24.2;
        g.fillStyle = bookPalette2[Math.floor(rnd() * bookPalette2.length)];
        g.fillRect(bx, baseY - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(bx + 2, baseY - bh + 6, bw - 4, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(bx + bw - 3, baseY - bh, 3, bh);
      }
    }
    lib.tex.needsUpdate = true;
  };
  /** Imagen del librero para el panel de información: madera, baldas y libros. */
  const libraryImage = (lib: Library) => {
    const c = document.createElement('canvas');
    c.width = lib.W;
    c.height = lib.H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#24140b';
    g.fillRect(0, 0, lib.W, lib.H);
    g.fillStyle = '#5a3720';
    const pitch = libPitch(lib);
    for (let r = 0; r <= lib.rows; r++) {
      const y = lib.H - ((r * pitch + 0.02) / lib.h) * lib.H;
      g.fillRect(0, y - 6, lib.W, 12);
    }
    g.drawImage(lib.ctx.canvas, 0, 0);
    return c.toDataURL('image/png');
  };
  const fillLibraries = (total: number) => {
    let rem = Math.max(0, total);
    libraries.forEach((lib, li) => {
      const n = Math.min(lib.rows * BOOK_SLOTS_PER_ROW, rem);
      rem -= n;
      drawLibrary(lib, n, li * 1000);
    });
  };
  const woodDarkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.5, metalness: 0.05 }));
  const addBookcase = (parent: THREE.Object3D, x: number, z: number, yaw: number, w = 2.4, h = 2.7, _seed = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw; // el frente (libros) mira a +z local
    // Mismo estilo que los libreros de Sheldon: laterales, fondo y baldas abiertas
    [-1, 1].forEach((sx) => {
      const side = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, h, 0.42)), woodDarkMat);
      side.position.set((sx * (w - 0.05)) / 2, h / 2, 0);
      side.castShadow = true;
      g.add(side);
    });
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, 0.04)), woodDarkMat);
    back.position.set(0, h / 2, -0.19);
    g.add(back);
    const rows = Math.max(3, Math.round(h / 0.55));
    const pitch = (h - 0.04) / rows;
    for (let r = 0; r <= rows; r++) {
      const plank = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w - 0.1, 0.04, 0.42)), woodDarkMat);
      plank.position.set(0, r * pitch + 0.02, 0);
      g.add(plank);
    }
    const ct = makeCanvasTex(512, Math.round(128 * rows));
    const lib: Library = { ctx: ct.ctx, tex: ct.tex, rows, W: 512, H: Math.round(128 * rows), h, count: 0 };
    libraries.push(lib);
    drawLibrary(lib, 0, 0);
    const books = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(w - 0.1, h)),
      trackMat(new THREE.MeshStandardMaterial({ map: ct.tex, roughness: 0.7, alphaTest: 0.1 }))
    );
    books.position.set(0, h / 2, 0.1);
    g.add(books);
    parent.add(g);
    registerInfo(g, {
      title: 'LIBRERO',
      section: 'Librería de gestión',
      description: 'Aquí se archivan los libros de la gestión: uno por cada proyecto y por cada tarea completada.',
      lines: () => [
        `Libros archivados: ${lib.count} de ${lib.rows * BOOK_SLOTS_PER_ROW}`,
        `Proyectos: ${officeStats.projects.length}`,
        `Tareas completadas: ${officeStats.stages.completed}`,
      ],
      images: () => [libraryImage(lib)],
      empty: () => lib.count === 0,
    });
  };

  // Pantallas de información: título + cuerpo dibujado con datos reales del equipo
  const createInfoTex = (
    pw: number,
    ph: number,
    title: string,
    accent: string,
    body: (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void
  ) => {
    const ct = makeCanvasTex(pw, ph);
    const draw = () => {
      const g = ct.ctx;
      g.fillStyle = '#050b16';
      g.fillRect(0, 0, pw, ph);
      const hh = Math.round(ph * 0.15);
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, pw, hh);
      g.fillStyle = accent;
      g.fillRect(0, hh - 4, pw, 4);
      g.textAlign = 'left';
      g.fillStyle = '#f8fafc';
      g.font = `bold ${Math.round(hh * 0.5)}px sans-serif`;
      g.fillText(title, pw * 0.03, hh * 0.68);
      g.textAlign = 'right';
      g.fillStyle = officeStats.online ? '#34d399' : '#f87171';
      g.font = `${Math.round(hh * 0.34)}px monospace`;
      g.fillText(officeStats.online ? '● EN VIVO' : '● SIN DATOS', pw * 0.97, hh * 0.64);
      g.textAlign = 'left';
      body(g, pw * 0.03, hh + ph * 0.04, pw * 0.94, ph - hh - ph * 0.08);
      ct.tex.needsUpdate = true;
    };
    infoRedraws.push(draw);
    draw();
    return ct.tex;
  };
  const infoFrameMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.4, metalness: 0.6 }));
  const addInfoScreen = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw: number,
    w: number,
    h: number,
    title: string,
    accent: string,
    body: (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void
  ) => {
    const tex = createInfoTex(1024, Math.round((1024 * h) / w), title, accent, body);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw; // la pantalla mira a +z local
    const fr = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.06)), infoFrameMat);
    const pl = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(w, h)),
      trackMat(
        new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.3 })
      )
    );
    pl.position.z = 0.035;
    g.add(fr, pl);
    parent.add(g);
    registerInfo(pl, {
      title,
      section: 'Pantalla de información',
      description: `Aquí se muestra «${title}» con los datos del equipo en tiempo real.`,
      empty: noTeamData,
    });
  };
  const drawKpis = (
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    items: Array<[string, string, string]>
  ) => {
    const n = items.length;
    const gap = w * 0.02;
    const cw = (w - gap * (n - 1)) / n;
    items.forEach(([label, val, col], i) => {
      const cx = x + i * (cw + gap);
      g.fillStyle = '#0b1329';
      g.fillRect(cx, y, cw, h);
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2;
      g.strokeRect(cx, y, cw, h);
      g.fillStyle = '#94a3b8';
      g.font = `${Math.round(h * 0.2)}px monospace`;
      g.fillText(label, cx + cw * 0.06, y + h * 0.3);
      g.fillStyle = col;
      g.font = `bold ${Math.round(h * 0.44)}px monospace`;
      g.fillText(val, cx + cw * 0.06, y + h * 0.82);
    });
  };
  const drawBars = (
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rows: Array<{ label: string; value: number; color: string; text?: string }>,
    max: number
  ) => {
    if (!rows.length) {
      g.fillStyle = '#64748b';
      g.font = `${Math.max(18, Math.round(h * 0.1))}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('Sin datos todavía', x + w / 2, y + h / 2);
      g.textAlign = 'left';
      return;
    }
    const shown = rows.slice(0, 8);
    const rh = Math.min(h / shown.length, h * 0.2);
    const fs = Math.max(14, Math.round(rh * 0.5));
    shown.forEach((r, i) => {
      const ry = y + i * rh;
      g.textAlign = 'left';
      g.fillStyle = '#cbd5e1';
      g.font = `${fs}px sans-serif`;
      g.fillText(clipTxt(r.label, 16), x, ry + rh * 0.68);
      const bx = x + w * 0.34;
      const bw = w * 0.5;
      g.fillStyle = '#0f172a';
      g.fillRect(bx, ry + rh * 0.2, bw, rh * 0.5);
      g.fillStyle = r.color;
      g.fillRect(bx, ry + rh * 0.2, bw * Math.min(1, r.value / Math.max(1, max)), rh * 0.5);
      g.fillStyle = '#f8fafc';
      g.font = `bold ${fs}px monospace`;
      g.textAlign = 'right';
      g.fillText(r.text ?? String(r.value), x + w, ry + rh * 0.68);
      g.textAlign = 'left';
    });
  };
  const drawList = (
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    lines: string[],
    color: string,
    empty: string
  ) => {
    g.textAlign = 'left';
    if (!lines.length) {
      g.fillStyle = '#64748b';
      g.font = `${Math.max(18, Math.round(h * 0.09))}px sans-serif`;
      g.textAlign = 'center';
      g.fillText(empty, x + w / 2, y + h / 2);
      g.textAlign = 'left';
      return;
    }
    const shown = lines.slice(0, 7);
    const rh = Math.min(h / shown.length, h * 0.18);
    const fs = Math.max(14, Math.round(rh * 0.5));
    shown.forEach((ln, i) => {
      g.fillStyle = color;
      g.fillRect(x, y + i * rh + rh * 0.25, fs * 0.45, rh * 0.5);
      g.fillStyle = '#e2e8f0';
      g.font = `${fs}px sans-serif`;
      g.fillText(clipTxt(ln, Math.round(w / (fs * 0.55))), x + fs, y + i * rh + rh * 0.7);
    });
    if (lines.length > shown.length) {
      g.fillStyle = '#f59e0b';
      g.font = `bold ${fs}px sans-serif`;
      g.fillText(`+${lines.length - shown.length} más`, x, y + h);
    }
  };
  const STAGE_META: Array<[keyof OfficeStats['stages'], string, string]> = [
    ['backlog', 'BACKLOG', '#64748b'],
    ['in_dev', 'EN DESARROLLO', '#10b981'],
    ['sheldon_review', 'REVISIÓN SHELDON', '#f59e0b'],
    ['ceo_approval', 'APROBACIÓN CEO', '#38bdf8'],
    ['completed', 'COMPLETADAS', '#a78bfa'],
  ];
  const statusColor = (s: string) =>
    s === 'working' ? '#10b981' : s === 'waiting_sheldon' ? '#f59e0b' : s === 'blocked' ? '#ef4444' : '#64748b';
  const closeRate = () => {
    const t = totalTickets();
    return t ? Math.round((officeStats.stages.completed / t) * 100) : 0;
  };
  const setOfficeStats = (s: OfficeStats) => {
    officeStats = s;
    infoRedraws.forEach((f) => f());
    fillLibraries(s.stages.completed + s.projects.length);
  };

  const lampShadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.7,
      roughness: 0.6,
      side: THREE.DoubleSide,
    })
  );
  const addFloorLamp = (parent: THREE.Object3D, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 16)), darkMetalMat);
    base.position.y = 0.025;
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8)), brushedAlumMat);
    pole.position.y = 0.85;
    const shade = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.3, 0.36, 16, 1, true)), lampShadeMat);
    shade.position.y = 1.75;
    g.add(base, pole, shade);
    parent.add(g);
  };
  const addRug = (parent: THREE.Object3D, x: number, z: number, w: number, d: number, color: number, trim = 0xfbbf24) => {
    const rug = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w, 0.025, d)),
      trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.92 }))
    );
    rug.position.set(x, 0.05, z);
    rug.receiveShadow = true;
    const inner = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w - 0.5, 0.03, d - 0.5)),
      trackMat(new THREE.MeshStandardMaterial({ color: trim, roughness: 0.9, transparent: true, opacity: 0.18 }))
    );
    inner.position.set(x, 0.053, z);
    parent.add(rug, inner);
  };
  const leatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.15 }));
  const addSofa = (parent: THREE.Object3D, x: number, z: number, yaw: number, w = 3.2, color?: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw; // el frente del sofá mira a +z local
    const m = color ? trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.6 })) : leatherMat;
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.45, 1.0)), m);
    seat.position.y = 0.32;
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.7, 0.28)), m);
    back.position.set(0, 0.75, -0.4);
    [-1, 1].forEach((sx) => {
      const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.6, 1.0)), m);
      arm.position.set((sx * (w - 0.26)) / 2, 0.5, 0);
      g.add(arm);
    });
    seat.castShadow = true;
    g.add(seat, back);
    parent.add(g);
  };
  const addCoffeeTable = (parent: THREE.Object3D, x: number, z: number, w = 1.6, d = 0.9) => {
    const top = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w, 0.06, d)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.18, metalness: 0.35 }))
    );
    top.position.set(x, 0.42, z);
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w - 0.3, 0.38, d - 0.3)), darkMetalMat);
    base.position.set(x, 0.2, z);
    parent.add(top, base);
  };

  const projectListeners: Array<() => void> = [];
  const spinners: THREE.Object3D[] = [];

  const clipText = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  const BOARD_W_LAB = 3.2;
  const BOARD_H_LAB = 1.9;
  const labDeskTex: Array<{ plate: CTex; note: CTex }> = [];
  let labDeskEntries: Array<{ name: string; task: string } | null> = [];
  const drawLabDesk = (i: number, entry: { name: string; task: string } | null) => {
    const t = labDeskTex[i];
    if (!t) return;
    const p = t.plate.ctx;
    p.fillStyle = '#0f172a';
    p.fillRect(0, 0, 512, 128);
    p.strokeStyle = entry ? '#22d3ee' : '#475569';
    p.lineWidth = 8;
    p.strokeRect(5, 5, 502, 118);
    p.textAlign = 'center';
    p.fillStyle = entry ? '#f8fafc' : '#64748b';
    p.font = 'bold 60px sans-serif';
    p.fillText(entry ? clipText(entry.name, 14) : 'LIBRE', 256, 84);
    t.plate.tex.needsUpdate = true;
    const n = t.note.ctx;
    n.fillStyle = entry ? '#fde047' : '#e5e7eb';
    n.fillRect(0, 0, 256, 256);
    n.fillStyle = 'rgba(0,0,0,0.12)';
    n.fillRect(0, 0, 256, 30);
    n.textAlign = 'left';
    n.fillStyle = '#92400e';
    n.font = 'bold 22px sans-serif';
    n.fillText('TAREA', 12, 22);
    n.fillStyle = '#1c1917';
    n.font = 'bold 30px sans-serif';
    const text = entry ? entry.task.trim() || 'Sin tarea' : '—';
    wrapLines(n, text, 232, 6).forEach((ln, k) => n.fillText(ln, 12, 70 + k * 36));
    t.note.tex.needsUpdate = true;
  };

  const buildWorkstation = (slotX: number, slotZ: number, idx: number, labelIdx?: number) => {
    const group = new THREE.Group();
    // Place desk slightly ahead of the avatar (-Z because avatar faces PI = -Z)
    group.position.set(slotX, 0, slotZ - 0.72);

    // 1. Desk tabletop (grande: 2.4 x 1.0)
    const top = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4, 0.07, 1.0)),
      deskTopMat
    );
    top.position.y = 0.74;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 2. Brushed aluminum desk legs
    const legGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.72, 0.86));
    const leftLeg = new THREE.Mesh(legGeo, brushedAlumMat);
    leftLeg.position.set(-1.1, 0.36, 0);
    const rightLeg = new THREE.Mesh(legGeo, brushedAlumMat);
    rightLeg.position.set(1.1, 0.36, 0);
    group.add(leftLeg, rightLeg);

    // 3. Tres pantallas por puesto (las laterales ligeramente anguladas hacia el usuario)
    const bezelGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.46, 0.035));
    const displayGeo = trackGeo(new THREE.PlaneGeometry(0.69, 0.4));

    [-0.8, 0, 0.8].forEach((mx, mIdx) => {
      const screenTex = monitorTextures[(idx + mIdx) % monitorTextures.length];
      const screenMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: screenTex,
          emissiveMap: screenTex,
          emissive: 0xffffff,
          emissiveIntensity: 0.85,
          roughness: 0.18,
          metalness: 0.1,
        })
      );
      const monitor = new THREE.Group();
      monitor.position.set(mx, 1.08, mIdx === 1 ? -0.3 : -0.22);
      monitor.rotation.y = mIdx === 0 ? 0.24 : mIdx === 2 ? -0.24 : 0;

      const bezel = new THREE.Mesh(bezelGeo, darkMetalMat);
      bezel.castShadow = true;
      monitor.add(bezel);

      const display = new THREE.Mesh(displayGeo, screenMat);
      display.position.z = 0.02;
      monitor.add(display);

      const stand = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.26, 8)),
        brushedAlumMat
      );
      stand.position.set(0, -0.24, -0.02);
      monitor.add(stand);

      group.add(monitor);
    });

    // 4. Teclado mecánico
    const kb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.6, 0.025, 0.2)),
      darkMetalMat
    );
    kb.position.set(0, 0.79, 0.15);
    group.add(kb);

    // 5. Ergonomic chair behind desk
    const chair = new THREE.Group();
    chair.position.set(0, 0, 0.72);
    const seat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.56, 0.08, 0.54)),
      chairMat
    );
    seat.position.y = 0.44;
    const backrest = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.52, 0.62, 0.08)),
      chairMat
    );
    backrest.position.set(0, 0.78, 0.24);
    const stem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.36, 8)),
      brushedAlumMat
    );
    stem.position.y = 0.22;
    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6)),
      darkMetalMat
    );
    base.position.y = 0.04;
    chair.add(seat, backrest, stem, base);
    group.add(chair);

    // 6. Placa con el nombre de quien se sienta aquí y nota con su tarea actual (solo laboratorio)
    if (labelIdx !== undefined) {
      const plate = makeCanvasTex(512, 128);
      const note = makeCanvasTex(256, 256);
      labDeskTex[labelIdx] = { plate, note };
      const plateMesh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(0.92, 0.23)),
        trackMat(
          new THREE.MeshStandardMaterial({
            map: plate.tex,
            emissiveMap: plate.tex,
            emissive: 0xffffff,
            emissiveIntensity: 0.55,
          })
        )
      );
      plateMesh.position.set(0, 0.79, 0.38);
      plateMesh.rotation.x = -1.15;
      group.add(plateMesh);
      const noteMesh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(0.44, 0.44)),
        trackMat(
          new THREE.MeshStandardMaterial({
            map: note.tex,
            emissiveMap: note.tex,
            emissive: 0xffffff,
            emissiveIntensity: 0.4,
          })
        )
      );
      noteMesh.position.set(1.0, 1.02, 0.12);
      noteMesh.rotation.set(-0.35, -0.3, 0);
      group.add(noteMesh);
      drawLabDesk(labelIdx, null);
    }

    if (labelIdx !== undefined) {
      registerInfo(group, {
        title: `PUESTO ${labelIdx + 1}`,
        section: 'Puesto de trabajo del laboratorio',
        description: 'Aquí se muestra quién trabaja en este puesto y la tarea que tiene asignada.',
        lines: () => {
          const e = labDeskEntries[labelIdx];
          return e ? [`Agente: ${e.name}`, `Tarea: ${e.task.trim() || 'sin tarea'}`] : ['Puesto libre'];
        },
        images: () => {
          const t = labDeskTex[labelIdx];
          return t ? [t.plate.ctx.canvas.toDataURL('image/png'), t.note.ctx.canvas.toDataURL('image/png')] : [];
        },
        empty: () => !labDeskEntries[labelIdx],
      });
    }

    scene.add(group);
  };

  for (let i = 0; i < RAW_WORKSTATION_SLOTS.length; i++) {
    buildWorkstation(RAW_WORKSTATION_SLOTS[i].x, RAW_WORKSTATION_SLOTS[i].z, i, i);
  }

  // Server Racks along Laboratorio back wall
  const serverTex = trackTex(createServerRackTexture(maxAnisotropy));
  const serverFaceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: serverTex,
      emissiveMap: serverTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.6,
    })
  );
  // =====================================================================
  // Laboratorio (coordenadas locales: x -28.5..1.5, z -6.4..6.0). Puerta al pasillo en x = -13.5.
  // =====================================================================
  // Pantallas de rendimiento del equipo (pared norte, a ambos lados de la puerta y de los tableros)
  addInfoScreen(scene, -23.2, 2.3, -6.3, 0, 4.4, 2.3, 'RENDIMIENTO DEL EQUIPO', '#22d3ee', (g, x, y, w, h) => {
    const ag = officeStats.agents;
    const working = ag.filter((a) => a.status === 'working').length;
    drawKpis(g, x, y, w, h * 0.3, [
      ['AGENTES', String(ag.length), '#38bdf8'],
      ['TRABAJANDO', String(working), '#10b981'],
      ['COMPLETADAS', String(officeStats.stages.completed), '#a78bfa'],
      ['CIERRE', closeRate() + '%', '#f59e0b'],
    ]);
    const maxDone = Math.max(1, ...ag.map((a) => a.done));
    drawBars(
      g,
      x,
      y + h * 0.36,
      w,
      h * 0.64,
      ag.map((a) => ({ label: a.name, value: a.done, color: statusColor(a.status), text: `${a.done}✓ ${a.active}▶` })),
      maxDone
    );
  });
  addInfoScreen(scene, -4.3, 2.3, -6.3, 0, 3.8, 2.3, 'FLUJO DE TAREAS', '#10b981', (g, x, y, w, h) => {
    const maxV = Math.max(1, ...STAGE_META.map(([k]) => officeStats.stages[k]));
    drawBars(
      g,
      x,
      y,
      w,
      h,
      STAGE_META.map(([k, label, color]) => ({ label, value: officeStats.stages[k], color })),
      maxV
    );
  });
  // Librerías vacías: se llenan con cada proyecto y tarea completada
  addBookcase(scene, -26.9, -6.15, 0, 2.4, 2.8);
  addBookcase(scene, 0.1, -6.15, 0, 2.4, 2.8);

  // Cuatro estaciones temáticas sobre la pared oeste: desarrollo, IA, marketing y trabajo
  const podChairAt = (x: number, z: number, yaw: number) => {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = yaw;
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.08, 0.54)), chairMat);
    seat.position.y = 0.44;
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.62, 0.08)), chairMat);
    back.position.set(0, 0.78, -0.26);
    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.36, 8)), brushedAlumMat);
    stem.position.y = 0.22;
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6)), darkMetalMat);
    base.position.y = 0.04;
    chair.add(seat, back, stem, base);
    scene.add(chair);
  };
  const buildPod = (z: number, kind: 'dev' | 'ia' | 'mkt' | 'work') => {
    const desk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 0.07, 2.2)), deskTopMat);
    desk.position.set(-27.9, 0.74, z);
    desk.castShadow = true;
    scene.add(desk);
    [-0.95, 0.95].forEach((dz) => {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.72, 0.07)), brushedAlumMat);
      leg.position.set(-27.9, 0.36, z + dz);
      scene.add(leg);
    });
    podChairAt(-26.8, z, -Math.PI / 2);
    const top = 0.78;
    if (kind === 'dev') {
      const lap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.3, 0.02, 0.42)), darkMetalMat);
      lap.position.set(-27.75, top + 0.01, z - 0.4);
      const lapScr = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.28, 0.4)), darkMetalMat);
      lapScr.position.set(-27.92, top + 0.15, z - 0.4);
      lapScr.rotation.z = -0.15;
      const kb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.02, 0.5)), darkMetalMat);
      kb.position.set(-27.6, top + 0.01, z + 0.3);
      scene.add(lap, lapScr, kb);
    } else if (kind === 'ia') {
      const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 16)), darkMetalMat);
      ped.position.set(-27.9, top + 0.05, z);
      const orb = new THREE.Mesh(
        trackGeo(new THREE.IcosahedronGeometry(0.24, 1)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0xa78bfa, emissiveIntensity: 0.9, wireframe: true }))
      );
      orb.position.set(-27.9, top + 0.42, z);
      spinners.push(orb);
      scene.add(ped, orb);
    } else if (kind === 'mkt') {
      const horn = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.2, 0.05, 0.36, 14)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4, metalness: 0.3 }))
      );
      horn.rotation.z = Math.PI / 2;
      horn.position.set(-27.8, top + 0.22, z - 0.4);
      const notes = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.2, 0.03, 0.2)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.8 }))
      );
      notes.position.set(-27.7, top + 0.02, z + 0.5);
      scene.add(horn, notes);
    } else {
      const clip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 0.02, 0.4)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 }))
      );
      clip.position.set(-27.7, top + 0.01, z - 0.4);
      const folders = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.3, 0.12, 0.4)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }))
      );
      folders.position.set(-27.95, top + 0.06, z + 0.5);
      const mug = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }))
      );
      mug.position.set(-27.6, top + 0.05, z + 0.1);
      scene.add(clip, folders, mug);
    }
  };
  buildPod(-4.5, 'dev');
  buildPod(-1.5, 'ia');
  buildPod(1.5, 'mkt');
  buildPod(4.5, 'work');
  addInfoScreen(scene, -28.4, 2.2, -4.5, Math.PI / 2, 2.8, 1.5, 'DESARROLLO', '#38bdf8', (g, x, y, w, h) => {
    drawList(g, x, y, w, h, officeStats.inDevTitles, '#38bdf8', 'Sin tareas en desarrollo');
  });
  addInfoScreen(scene, -28.4, 2.2, -1.5, Math.PI / 2, 2.8, 1.5, 'IA · MODELOS', '#a78bfa', (g, x, y, w, h) => {
    const ag = officeStats.agents;
    const maxT = Math.max(1, ...ag.map((a) => a.tokens));
    drawBars(
      g,
      x,
      y,
      w,
      h,
      ag.map((a) => ({ label: a.name, value: a.tokens, color: '#a78bfa', text: a.tokens.toLocaleString('es') + ' tk' })),
      maxT
    );
  });
  addInfoScreen(scene, -28.4, 2.2, 1.5, Math.PI / 2, 2.8, 1.5, 'MARKETING · ENTREGAS', '#f43f5e', (g, x, y, w, h) => {
    drawBars(
      g,
      x,
      y,
      w,
      h,
      officeStats.projects.map((p) => ({
        label: p.name,
        value: p.done,
        color: '#f43f5e',
        text: `${p.done}/${p.total}`,
      })),
      Math.max(1, ...officeStats.projects.map((p) => p.total))
    );
  });
  addInfoScreen(scene, -28.4, 2.2, 4.5, Math.PI / 2, 2.8, 1.5, 'TRABAJO · PENDIENTES', '#f59e0b', (g, x, y, w, h) => {
    drawList(g, x, y, w, h, officeStats.backlogTitles, '#f59e0b', 'Backlog vacío');
  });

  // Rincón de descanso del laboratorio (extremo este)
  addRug(scene, -0.2, 0.0, 4.6, 7.0, 0x0f2a43, 0x22d3ee);
  addSofa(scene, 1.0, -2.2, -Math.PI / 2, 2.8, 0x155e75);
  addSofa(scene, 1.0, 2.6, -Math.PI / 2, 2.8, 0x155e75);
  addCoffeeTable(scene, -0.6, 0.2, 0.9, 1.8);
  addFloorLamp(scene, -2.4, 0.2);
  addFloorLamp(scene, -25.0, 5.4);

  // 2 tableros grandes: entregar la tarea terminada y tomar la nueva
  const labBoardXs = [-17.5, -9.5];
  const labBoardTitles = ['ENTREGAR · EN CURSO', 'TOMAR TAREA · BACKLOG'];
  const labBoardColors = ['#10b981', '#f59e0b'];
  const labBoards = labBoardXs.map((bx, bi) => {
    const ct = makeCanvasTex(1024, 608);
    const frame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(BOARD_W_LAB + 0.16, BOARD_H_LAB + 0.16, 0.08)),
      brushedAlumMat
    );
    frame.position.set(bx, 1.9, -6.28);
    frame.castShadow = true;
    scene.add(frame);
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(BOARD_W_LAB, BOARD_H_LAB)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: ct.tex,
          emissiveMap: ct.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          roughness: 0.4,
        })
      )
    );
    mesh.position.set(bx, 1.9, -6.28 + 0.045);
    scene.add(mesh);
    registerInfo(mesh, {
      title: labBoardTitles[bi],
      section: 'Tablero del laboratorio',
      description:
        bi === 0
          ? 'Aquí se entregan las tareas terminadas: lista de tareas en curso.'
          : 'Aquí se toman nuevas tareas: lista del backlog pendiente.',
      lines: () => (bi === 0 ? labBoardData.inProgress : labBoardData.backlog),
      empty: () => (bi === 0 ? labBoardData.inProgress : labBoardData.backlog).length === 0,
    });
    return ct;
  });
  let labBoardData = { inProgress: [] as string[], backlog: [] as string[] };
  const drawLabBoards = () => {
    [labBoardData.inProgress, labBoardData.backlog].forEach((items, bi) => {
      const { ctx: g, tex } = labBoards[bi];
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, 1024, 608);
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, 1024, 96);
      g.fillStyle = labBoardColors[bi];
      g.fillRect(0, 90, 1024, 8);
      g.textAlign = 'left';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 42px sans-serif';
      g.fillText(labBoardTitles[bi], 28, 62);
      g.textAlign = 'right';
      g.fillStyle = '#38bdf8';
      g.font = '28px monospace';
      g.fillText(items.length + ' tareas', 996, 60);
      g.textAlign = 'left';
      items.slice(0, 7).forEach((t, r) => {
        const y = 100 + r * 72;
        g.strokeStyle = '#cbd5e1';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, y + 72);
        g.lineTo(1024, y + 72);
        g.stroke();
        g.fillStyle = labBoardColors[bi];
        g.fillRect(24, y + 24, 18, 24);
        g.fillStyle = '#0f172a';
        g.font = 'bold 32px sans-serif';
        g.fillText(clipText(t, 40), 62, y + 50);
      });
      if (items.length > 7) {
        g.fillStyle = '#b91c1c';
        g.font = 'bold 26px sans-serif';
        g.fillText('+' + (items.length - 7) + ' más', 28, 590);
      }
      if (items.length === 0) {
        g.textAlign = 'center';
        g.fillStyle = '#64748b';
        g.font = '34px sans-serif';
        g.fillText('Sin tareas', 512, 340);
      }
      tex.needsUpdate = true;
    });
  };
  drawLabBoards();
  const setLabBoards = (data: { inProgress: string[]; backlog: string[] }) => {
    labBoardData = data;
    drawLabBoards();
  };
  const setLabDesks = (entries: Array<{ name: string; task: string } | null>) => {
    labDeskEntries = entries;
    for (let i = 0; i < RAW_WORKSTATION_SLOTS.length; i++) drawLabDesk(i, entries[i] ?? null);
  };


  scene = sheldonGroup;
  // =========================================================================
  // OFICINA DE SHELDON: LA SALA DEL APARTAMENTO 4A (PLAN §15.3 / V3D05)
  // =========================================================================
  // 1. Suelo de madera de edificio antiguo (parquet cálido) con zócalos y molduras
  const sheldonFloorTex = trackTex(createWoodFloorTexture(maxAnisotropy));
  const sheldonFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: sheldonFloorTex,
      roughness: 0.58,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const sheldonFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(ROOM_W, ROOM_D)),
    sheldonFloorMat
  );
  sheldonFloor.rotation.x = -Math.PI / 2;
  sheldonFloor.position.set(0.2, 0.02, -0.2);
  sheldonFloor.receiveShadow = true;
  scene.add(sheldonFloor);

  // Moldura / línea acento frontal
  const zoneBBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(ROOM_W - 0.4, 0.04, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  zoneBBar.position.set(0.2, 0.03, 5.95);
  scene.add(zoneBBar);

  // Zócalo de madera en la pared de fondo
  const baseboardMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.6 })
  );
  const baseboard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(ROOM_W, 0.22, 0.06)),
    baseboardMat
  );
  baseboard.position.set(0.2, 0.11, -6.27);
  scene.add(baseboard);

  // 2. TABLEROS DE PROYECTOS en la pared del fondo (3 tableros grandes, clicables)
  const BOARD_W = 3.0;
  const BOARD_H = 1.9;
  const BOARD_Y = 1.9;
  const BOARD_Z = -6.28;
  const BOARD_PX_W = 1024;
  const BOARD_PX_H = 608;
  const BOARD_HEAD = 96;
  const BOARD_ROW = 84;
  const BOARD_ROWS = 6;
  const boardXs = [-3.3, 0.2, 3.7];
  let projectList: BoardProject[] = [];
  let selectedName: string | null = null;

  const boards = boardXs.map((bx, bi) => {
    const canvas = document.createElement('canvas');
    canvas.width = BOARD_PX_W;
    canvas.height = BOARD_PX_H;
    const ctx = canvas.getContext('2d')!;
    const tex = trackTex(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;

    const frame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(BOARD_W + 0.16, BOARD_H + 0.16, 0.08)),
      brushedAlumMat
    );
    frame.position.set(bx, BOARD_Y, BOARD_Z);
    frame.castShadow = true;
    scene.add(frame);

    const mesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(BOARD_W, BOARD_H)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          roughness: 0.4,
          metalness: 0.02,
        })
      )
    );
    mesh.position.set(bx, BOARD_Y, BOARD_Z + 0.045);
    mesh.userData.boardIndex = bi;
    scene.add(mesh);

    const tray = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(BOARD_W * 0.8, 0.04, 0.1)),
      brushedAlumMat
    );
    tray.position.set(bx, BOARD_Y - BOARD_H / 2 - 0.1, BOARD_Z + 0.08);
    scene.add(tray);
    registerInfo(mesh, {
      title: `TABLERO DE PROYECTOS ${bi + 1}`,
      section: 'Oficina de Sheldon',
      description: 'Cada fila es un proyecto con su avance. Haz clic en una fila para ver su detalle y tickets.',
      lines: () => projectList.map((p) => `${p.name}: ${p.done}/${p.total} tareas`),
      empty: () => projectList.length === 0,
    });
    return { ctx, tex, mesh };
  });

  const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

  const drawBoards = () => {
    boards.forEach((b, bi) => {
      const g = b.ctx;
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, BOARD_PX_W, BOARD_PX_H);
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, BOARD_PX_W, BOARD_HEAD);
      g.textAlign = 'left';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 40px sans-serif';
      g.fillText('PROYECTOS · TABLERO ' + (bi + 1), 28, 62);
      g.textAlign = 'right';
      g.fillStyle = '#38bdf8';
      g.font = '28px monospace';
      g.fillText(projectList.length + ' en total', BOARD_PX_W - 28, 60);
      for (let r = 0; r < BOARD_ROWS; r++) {
        const y = BOARD_HEAD + r * BOARD_ROW;
        const p = projectList[bi * BOARD_ROWS + r];
        g.strokeStyle = '#cbd5e1';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, y + BOARD_ROW);
        g.lineTo(BOARD_PX_W, y + BOARD_ROW);
        g.stroke();
        if (!p) continue;
        if (p.name === selectedName) {
          g.fillStyle = '#fde68a';
          g.fillRect(0, y, BOARD_PX_W, BOARD_ROW);
        }
        g.textAlign = 'left';
        g.fillStyle = '#0f172a';
        g.font = 'bold 34px sans-serif';
        g.fillText(clip(p.name, 22), 28, y + 38);
        g.fillStyle = '#475569';
        g.font = '24px monospace';
        g.fillText(p.done + '/' + p.total + ' tickets', 28, y + 70);
        g.fillStyle = '#e2e8f0';
        g.fillRect(620, y + 30, 370, 24);
        g.fillStyle = '#10b981';
        g.fillRect(620, y + 30, p.total > 0 ? (370 * p.done) / p.total : 0, 24);
      }
      if (bi === boards.length - 1 && projectList.length > boards.length * BOARD_ROWS) {
        g.textAlign = 'center';
        g.fillStyle = '#b91c1c';
        g.font = 'bold 26px sans-serif';
        g.fillText(
          '+' + (projectList.length - boards.length * BOARD_ROWS) + ' proyectos más (en las librerías)',
          BOARD_PX_W / 2,
          BOARD_PX_H - 12
        );
      }
      if (projectList.length === 0 && bi === 1) {
        g.textAlign = 'center';
        g.fillStyle = '#64748b';
        g.font = '34px sans-serif';
        g.fillText('Sin proyectos todavía', BOARD_PX_W / 2, 330);
      }
      b.tex.needsUpdate = true;
    });
  };
  drawBoards();

  // 3. LIBRERÍAS: un libro por proyecto (pared izquierda x2 y pared derecha x1)
  const bookcaseUnits: THREE.Group[] = [];
  const buildBookcase = (x: number, z: number, yaw: number) => {
    const bc = new THREE.Group();
    bc.position.set(x, 0, z);
    bc.rotation.y = yaw;
    [-1.8, 1.8].forEach((sx) => {
      const side = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 2.45, 0.46)), baseboardMat);
      side.position.set(sx, 1.225, 0);
      side.castShadow = true;
      bc.add(side);
    });
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.65, 2.45, 0.04)), baseboardMat);
    back.position.set(0, 1.225, -0.21);
    bc.add(back);
    [0.04, 0.64, 1.24, 1.84, 2.43].forEach((sy) => {
      const shelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.65, 0.04, 0.46)), baseboardMat);
      shelf.position.set(0, sy, 0);
      bc.add(shelf);
    });
    scene.add(bc);
    bookcaseUnits.push(bc);
  };
  buildBookcase(-5.5, -4.55, Math.PI / 2);
  buildBookcase(-5.5, -0.9, Math.PI / 2);
  buildBookcase(-5.5, 2.75, Math.PI / 2);
  buildBookcase(5.95, -3.2, -Math.PI / 2);
  bookcaseUnits.forEach((bc, i) =>
    registerInfo(bc, {
      title: `LIBRERO DE PROYECTOS ${i + 1}`,
      section: 'Oficina de Sheldon',
      description: 'Aquí se archiva un libro por cada proyecto de la gestión.',
      lines: () => [`Proyectos archivados: ${projectList.length}`],
      empty: () => projectList.length === 0,
    })
  );

  const BOOKS_PER_ROW = 10;
  const BOOK_ROWS = 4;
  const BOOK_CAPACITY = bookcaseUnits.length * BOOKS_PER_ROW * BOOK_ROWS;
  const bookGeo = trackGeo(new THREE.BoxGeometry(0.22, 1, 0.34));
  const bookPalette = [0x6366f1, 0x06b6d4, 0xf59e0b, 0x10b981, 0xef4444, 0xec4899, 0x8b5cf6, 0x0ea5e9].map(
    (c) => trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }))
  );
  const hashName = (n: string) => {
    let h = 7;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return h;
  };
  let bookMeshes: THREE.Mesh[] = [];
  const rebuildBooks = () => {
    bookMeshes.forEach((m) => m.parent?.remove(m));
    bookMeshes = [];
    projectList.slice(0, BOOK_CAPACITY).forEach((p, i) => {
      const perUnit = BOOKS_PER_ROW * BOOK_ROWS;
      const unit = bookcaseUnits[Math.floor(i / perUnit)];
      const within = i % perUnit;
      const row = Math.floor(within / BOOKS_PER_ROW); // 0 = estante superior
      const k = within % BOOKS_PER_ROW;
      const h = hashName(p.name);
      const height = 0.44 + (h % 4) * 0.03;
      const shelfY = [1.84, 1.24, 0.64, 0.04][row];
      const book = new THREE.Mesh(bookGeo, bookPalette[h % bookPalette.length]);
      book.scale.y = height;
      book.position.set(-1.53 + k * 0.34, shelfY + 0.02 + height / 2, p.name === selectedName ? 0.12 : 0);
      book.castShadow = true;
      book.userData.projectName = p.name;
      unit.add(book);
      bookMeshes.push(book);
    });
  };
  rebuildBooks();

  // 4. ESCRITORIO DEL CTO en el centro, con UNA pantalla grande (el CTO se sienta en +z)
  const ctoDesk = new THREE.Group();
  ctoDesk.position.set(0.2, 0, -1.45);
  const ctoTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.08, 1.5)), deskTopMat);
  ctoTop.position.y = 0.74;
  ctoTop.castShadow = true;
  ctoTop.receiveShadow = true;
  ctoDesk.add(ctoTop);
  [-1.7, 1.7].forEach((lx) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.72, 1.3)), brushedAlumMat);
    leg.position.set(lx, 0.36, 0);
    ctoDesk.add(leg);
  });
  const ctoScreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: monitorTextures[1],
      emissiveMap: monitorTextures[1],
      emissive: 0xffffff,
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.1,
    })
  );
  const ctoMonitor = new THREE.Group();
  ctoMonitor.position.set(0, 1.45, -0.45);
  const ctoBezel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 1.3, 0.06)), darkMetalMat);
  ctoBezel.castShadow = true;
  const ctoDisplay = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.3, 1.2)), ctoScreenMat);
  ctoDisplay.position.z = 0.03;
  const ctoStand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 10)), brushedAlumMat);
  ctoStand.position.set(0, -0.85, -0.02);
  ctoMonitor.add(ctoBezel, ctoDisplay, ctoStand);
  ctoDesk.add(ctoMonitor);
  const ctoKeyboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 0.03, 0.25)), darkMetalMat);
  ctoKeyboard.position.set(0, 0.8, 0.4);
  ctoDesk.add(ctoKeyboard);
  const ctoChair = new THREE.Group();
  ctoChair.position.set(0, 0, 1.07);
  const ctoSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 0.08, 0.56)), chairMat);
  ctoSeat.position.y = 0.44;
  const ctoBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.66, 0.08)), chairMat);
  ctoBack.position.set(0, 0.8, 0.26);
  const ctoStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.36, 8)), brushedAlumMat);
  ctoStem.position.y = 0.22;
  const ctoBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 6)), darkMetalMat);
  ctoBase.position.y = 0.04;
  ctoChair.add(ctoSeat, ctoBack, ctoStem, ctoBase);
  ctoDesk.add(ctoChair);
  scene.add(ctoDesk);

  // Holo-orbe decorativo junto al escritorio
  const holoOrb = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(0.18, 1)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.9,
        wireframe: true,
      })
    )
  );
  holoOrb.position.set(1.9, 0.94, -1.45);
  scene.add(holoOrb);

  registerInfo([ctoTop, ctoBezel, ctoDisplay, ctoKeyboard], {
    title: 'PC DE SHELDON (CTO)',
    section: 'Oficina de Sheldon',
    description: 'Aquí se muestra el estado y la tarea actual del CTO, que revisa y aprueba el trabajo del equipo.',
    lines: () => agentLines(officeStats.agents.find((a) => a.isCTO)),
    images: () => [],
    empty: () => !officeStats.agents.some((a) => a.isCTO),
  });

  // 5. SOFÁ en el costado derecho, donde descansa el CTO (mira hacia el centro de la sala)
  const brownLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x61361f, roughness: 0.52, metalness: 0.08 })
  );
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(5.65, 0, 2.2);
  sofaGroup.rotation.y = -Math.PI / 2;
  const sofaBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.32, 1.05)), brownLeatherMat);
  sofaBase.position.y = 0.22;
  sofaBase.castShadow = true;
  const sofaBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.72, 0.34)), brownLeatherMat);
  sofaBack.position.set(0, 0.65, -0.42);
  sofaBack.castShadow = true;
  sofaGroup.add(sofaBase, sofaBack);
  [-1.24, 1.24].forEach((ax) => {
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.58, 1.08)), brownLeatherMat);
    arm.position.set(ax, 0.54, 0);
    arm.castShadow = true;
    sofaGroup.add(arm);
  });
  const cushionGeo = trackGeo(new THREE.BoxGeometry(0.72, 0.16, 0.78));
  [-0.74, 0, 0.74].forEach((cx) => {
    const cushion = new THREE.Mesh(cushionGeo, brownLeatherMat);
    cushion.position.set(cx, 0.44, 0.08);
    cushion.castShadow = true;
    sofaGroup.add(cushion);
  });
  scene.add(sofaGroup);

  // Maqueta de ADN (animada desde la vista) en la esquina delantera izquierda
  const dnaPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.35, 0.42, 0.6, 16)),
    darkMetalMat
  );
  dnaPedestal.position.set(-4.4, 0.3, 4.6);
  scene.add(dnaPedestal);
  const dnaHelix = new THREE.Group();
  dnaHelix.position.set(-4.4, 0.65, 4.6);
  const dnaCyan = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.6,
    })
  );
  const dnaAmber = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.6,
    })
  );
  const sphereGeo = trackGeo(new THREE.SphereGeometry(0.06, 10, 10));
  const rungGeo = trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 6));
  for (let i = 0; i < 12; i++) {
    const angle = i * 0.52;
    const y = i * 0.18;
    const r = 0.26;
    const s1 = new THREE.Mesh(sphereGeo, dnaCyan);
    s1.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    const s2 = new THREE.Mesh(sphereGeo, dnaAmber);
    s2.position.set(-Math.cos(angle) * r, y, -Math.sin(angle) * r);
    const rung = new THREE.Mesh(rungGeo, brushedAlumMat);
    rung.position.y = y;
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = -angle;
    dnaHelix.add(s1, s2, rung);
  }
  scene.add(dnaHelix);

  // 6. AMBIENTE DE CTO: alfombra, figuras de acción y de colección, vitrina, trofeo y pedestal
  const rugMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4a1c24,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  const rug = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.8, 3.4)), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.2, 0.03, -0.7);
  rug.receiveShadow = true;
  scene.add(rug);
  const rugInner = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.3, 2.9)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      })
    )
  );
  rugInner.rotation.x = -Math.PI / 2;
  rugInner.position.set(0.2, 0.032, -0.7);
  scene.add(rugInner);

  const figMats = new Map<number, THREE.MeshStandardMaterial>();
  const figMat = (c: number, metal = 0.2) => {
    const key = c * 10 + (metal > 0.5 ? 1 : 0);
    let m = figMats.get(key);
    if (!m) {
      m = trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: metal }));
      figMats.set(key, m);
    }
    return m;
  };
  const figLeg = trackGeo(new THREE.CylinderGeometry(0.017, 0.02, 0.1, 6));
  const figTorso = trackGeo(new THREE.BoxGeometry(0.1, 0.12, 0.06));
  const figHead = trackGeo(new THREE.SphereGeometry(0.045, 10, 10));
  const figArm = trackGeo(new THREE.BoxGeometry(0.03, 0.11, 0.03));
  const figBase = trackGeo(new THREE.CylinderGeometry(0.07, 0.075, 0.015, 14));
  const figCape = trackGeo(new THREE.PlaneGeometry(0.11, 0.17));
  const figBox = trackGeo(new THREE.BoxGeometry(0.07, 0.06, 0.06));
  const figSword = trackGeo(new THREE.BoxGeometry(0.012, 0.2, 0.012));
  const buildFigure = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale: number,
    kind: 'hero' | 'robot' | 'knight',
    color: number,
    yaw = 0
  ) => {
    const f = new THREE.Group();
    f.position.set(x, y, z);
    f.scale.setScalar(scale);
    f.rotation.y = yaw;
    const base = new THREE.Mesh(figBase, figMat(0x1f2937));
    base.position.y = 0.0075;
    f.add(base);
    const body = figMat(color, kind === 'hero' ? 0.2 : 0.6);
    [-0.03, 0.03].forEach((lx) => {
      const leg = new THREE.Mesh(figLeg, body);
      leg.position.set(lx, 0.065, 0);
      f.add(leg);
    });
    const torso = new THREE.Mesh(figTorso, body);
    torso.position.y = 0.175;
    f.add(torso);
    const armL = new THREE.Mesh(figArm, body);
    armL.position.set(-0.07, 0.185, 0);
    armL.rotation.z = kind === 'hero' ? -2.4 : 0.15; // brazo en alto (pose de acción)
    const armR = new THREE.Mesh(figArm, body);
    armR.position.set(0.07, 0.185, 0);
    armR.rotation.z = -0.15;
    f.add(armL, armR);
    if (kind === 'robot') {
      const head = new THREE.Mesh(figBox, figMat(0x94a3b8, 0.7));
      head.position.y = 0.27;
      const eye = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.05, 0.015, 0.005)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1 }))
      );
      eye.position.set(0, 0.275, 0.031);
      f.add(head, eye);
    } else {
      const head = new THREE.Mesh(figHead, figMat(kind === 'knight' ? 0x9ca3af : 0xffd8b0, kind === 'knight' ? 0.7 : 0.1));
      head.position.y = 0.275;
      f.add(head);
    }
    if (kind === 'hero') {
      const cape = new THREE.Mesh(
        figCape,
        trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, side: THREE.DoubleSide }))
      );
      cape.position.set(0, 0.17, -0.04);
      cape.rotation.x = 0.15;
      f.add(cape);
    }
    if (kind === 'knight') {
      const sword = new THREE.Mesh(figSword, figMat(0xe5e7eb, 0.8));
      sword.position.set(0.1, 0.24, 0.02);
      f.add(sword);
    }
    f.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    parent.add(f);
  };
  const figKinds: Array<'hero' | 'robot' | 'knight'> = ['hero', 'robot', 'knight'];
  const figColors2 = [0x2563eb, 0xdc2626, 0xf59e0b, 0x10b981, 0x7c3aed, 0x0ea5e9];

  // Figuras sobre las 3 librerías
  bookcaseUnits.forEach((unit, u) => {
    for (let i = 0; i < 5; i++) {
      buildFigure(unit, -1.5 + i * 0.75, 2.455, 0, 1.4, figKinds[(i + u) % 3], figColors2[(i * 2 + u) % 6], (i - 2) * 0.2);
    }
  });
  // Figuras y trofeo en el escritorio
  buildFigure(ctoDesk, -1.1, 0.775, -0.1, 1.2, 'hero', 0x2563eb, 0.3);
  buildFigure(ctoDesk, -0.8, 0.775, 0.15, 1.2, 'robot', 0xdc2626, 0.2);
  buildFigure(ctoDesk, 1.0, 0.775, 0.15, 1.2, 'knight', 0x7c3aed, -0.3);
  const trophy = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.035, 0.14, 12)),
    figMat(0xfbbf24, 0.8)
  );
  trophy.position.set(1.55, 0.86, -0.1);
  ctoDesk.add(trophy);

  // Vitrina de coleccionista en la pared derecha
  const vit = new THREE.Group();
  vit.position.set(5.9, 0, -0.1);
  vit.rotation.y = -Math.PI / 2;
  const vitBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 2.1, 0.04)), baseboardMat);
  vitBack.position.set(0, 1.35, -0.2);
  vit.add(vitBack);
  [-0.95, 0.95].forEach((sx) => {
    const side = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 2.1, 0.44)), baseboardMat);
    side.position.set(sx, 1.35, 0);
    vit.add(side);
  });
  const vitBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.3, 0.44)), darkMetalMat);
  vitBase.position.y = 0.15;
  const vitTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.05, 0.44)), baseboardMat);
  vitTop.position.y = 2.4;
  vit.add(vitBase, vitTop);
  const vitGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.8, 2.05, 0.02)), glassWallMat);
  vitGlass.position.set(0, 1.35, 0.2);
  vit.add(vitGlass);
  [0.7, 1.2, 1.7].forEach((sy, r) => {
    const shelf = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.85, 0.03, 0.4)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.2, metalness: 0.1 }))
    );
    shelf.position.y = sy;
    vit.add(shelf);
    for (let i = 0; i < 4; i++) {
      buildFigure(vit, -0.66 + i * 0.44, sy + 0.015, 0.02, 1.25, figKinds[(i + r) % 3], figColors2[(i + r * 2) % 6], 0.15);
    }
  });
  const vitLight = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.7, 0.02, 0.02)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde68a, emissiveIntensity: 1.2 }))
  );
  vitLight.position.set(0, 2.33, 0.15);
  vit.add(vitLight);
  scene.add(vit);

  // Pedestal con pieza estrella bajo cúpula de cristal (esquina delantera derecha)
  const pedestal = new THREE.Group();
  pedestal.position.set(4.9, 0, 4.9);
  const pedBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.95, 18)), darkMetalMat);
  pedBody.position.y = 0.475;
  pedBody.castShadow = true;
  pedestal.add(pedBody);
  buildFigure(pedestal, 0, 0.95, 0, 2.6, 'hero', 0x2563eb, 0);
  const dome = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.95, 20, 1, true)),
    glassWallMat
  );
  dome.position.y = 1.42;
  pedestal.add(dome);
  scene.add(pedestal);

  const setProjects = (list: BoardProject[]) => {
    projectList = list;
    if (selectedName && !list.some((p) => p.name === selectedName)) selectedName = null;
    drawBoards();
    rebuildBooks();
    projectListeners.forEach((f) => f());
  };
  const setSelectedProject = (name: string | null) => {
    selectedName = name;
    drawBoards();
    rebuildBooks();
    projectListeners.forEach((f) => f());
  };
  const getPickables = (): THREE.Object3D[] => [...boards.map((b) => b.mesh), ...bookMeshes];
  const resolvePick = (hit: THREE.Intersection): string | null => {
    const ud = hit.object.userData;
    if (typeof ud.projectName === 'string') return ud.projectName;
    if (typeof ud.boardIndex === 'number' && hit.uv) {
      const cy = (1 - hit.uv.y) * BOARD_PX_H;
      if (cy < BOARD_HEAD) return null;
      const row = Math.floor((cy - BOARD_HEAD) / BOARD_ROW);
      if (row >= BOARD_ROWS) return null;
      return projectList[ud.boardIndex * BOARD_ROWS + row]?.name ?? null;
    }
    return null;
  };

  scene = loungeGroup;
  // =========================================================================
  // ZONA DE DESCANSO: CAFETERÍA DE DESAYUNO, MESAS Y ZONA GAMING 3 TVs (V3D06)
  // =========================================================================
  // Suelo de madera claro pulido
  const woodTex = trackTex(createWoodFloorTexture(maxAnisotropy));
  const woodFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(ROOM_W, ROOM_D)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.52,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    )
  );
  woodFloor.rotation.x = -Math.PI / 2;
  woodFloor.position.set(9.45, 0.02, -0.2);
  woodFloor.receiveShadow = true;
  scene.add(woodFloor);

  // Línea divisoria luminosa ámbar cálida
  const zoneCBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.8, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xfb923c,
        emissiveIntensity: 0.7,
        roughness: 0.35,
      })
    )
  );
  zoneCBar.position.set(9.45, 0.03, 5.9);
  scene.add(zoneCBar);

  // Alfombra gaming bajo la zona de consolas y pufs
  const gamingRug = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(8.6, 3.6)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.92,
        metalness: 0.08,
      })
    )
  );
  gamingRug.rotation.x = -Math.PI / 2;
  gamingRug.position.set(9.5, 0.035, 4.4);
  gamingRug.receiveShadow = true;
  scene.add(gamingRug);

  // Materiales compartidos
  const oakLegMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6, metalness: 0.05 })
  );
  const darkCabinetMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.2 })
  );
  const whiteMarbleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.05 })
  );

  // -------------------------------------------------------------------------
  // 1. GRAN CAFETERÍA: CAFÉ Y PREPARACIÓN DE DESAYUNO
  // -------------------------------------------------------------------------
  const breakfastBar = new THREE.Group();
  breakfastBar.position.set(9.5, 0, -5.2);

  // Mostrador / Barra principal larga
  // Barra PARTIDA: queda libre el hueco de la puerta; café a la izquierda, comidas a la derecha
  [-3.5, 3.5].forEach((cxOff) => {
    const counterBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.0, 0.94, 0.92)),
      darkCabinetMat
    );
    counterBase.position.set(cxOff, 0.47, 0);
    counterBase.castShadow = true;
    const counterTop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.15, 0.06, 0.98)),
      whiteMarbleMat
    );
    counterTop.position.set(cxOff, 0.97, 0);
    counterTop.castShadow = true;
    breakfastBar.add(counterBase, counterTop);
  });

  // A) Máquina de café espresso comercial (lado izquierdo de la barra)
  const espressoMachine = new THREE.Group();
  espressoMachine.position.set(-4.1, 1.0, 0);

  const machineBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.85, 0.52, 0.55)),
    brushedAlumMat
  );
  machineBody.position.y = 0.26;
  machineBody.castShadow = true;
  espressoMachine.add(machineBody);

  const dripTray = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.8, 0.05, 0.22)),
    darkMetalMat
  );
  dripTray.position.set(0, 0.025, 0.28);
  espressoMachine.add(dripTray);

  [-0.18, 0.18].forEach((gx) => {
    const portafilter = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10)),
      darkMetalMat
    );
    portafilter.position.set(gx, 0.24, 0.24);
    const handle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8)),
      oakLegMat
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(gx, 0.24, 0.35);
    espressoMachine.add(portafilter, handle);
  });

  // Tolvas transparentes de café en grano
  [-0.22, 0.22].forEach((hx) => {
    const hopper = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.1, 0.07, 0.24, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3 }))
    );
    hopper.position.set(hx, 0.64, -0.08);
    espressoMachine.add(hopper);
  });
  breakfastBar.add(espressoMachine);

  // Molinillo de café profesional
  const grinder = new THREE.Group();
  grinder.position.set(-3.1, 1.0, -0.05);
  const grinderBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.38, 12)),
    darkMetalMat
  );
  grinderBase.position.y = 0.19;
  const grinderHopper = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.05, 0.2, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3 }))
  );
  grinderHopper.position.y = 0.46;
  grinder.add(grinderBase, grinderHopper);
  breakfastBar.add(grinder);

  // Fila de tazas de café de colores
  const cupColors = [0x06b6d4, 0xef4444, 0xf59e0b, 0x10b981];
  cupColors.forEach((color, i) => {
    const cup = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.038, 0.08, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.25 }))
    );
    cup.position.set(-2.5 + i * 0.16, 1.04, 0.26);
    breakfastBar.add(cup);
  });

  // B) Zona de preparación de desayuno: tostadora y tostadas
  const toaster = new THREE.Group();
  toaster.position.set(2.0, 1.0, 0.05);
  const toasterBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.34, 0.24, 0.22)),
    brushedAlumMat
  );
  toasterBody.position.y = 0.12;
  toaster.add(toasterBody);
  // Rebanadas de pan tostado dorado saliendo de la ranura
  const toastMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 }));
  [-0.05, 0.05].forEach((tx) => {
    const slice = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.02, 0.16, 0.14)),
      toastMat
    );
    slice.position.set(tx, 0.25, 0);
    slice.rotation.z = tx > 0 ? 0.08 : -0.08;
    toaster.add(slice);
  });
  breakfastBar.add(toaster);

  // Dispensador de zumo de naranja natural
  const juiceDispenser = new THREE.Group();
  juiceDispenser.position.set(2.9, 1.0, 0.02);
  const juiceBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 0.1, 14)),
    darkMetalMat
  );
  juiceBase.position.y = 0.05;
  const juiceJar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 16)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.1,
        transparent: true,
        opacity: 0.88,
      })
    )
  );
  juiceJar.position.y = 0.28;
  const juiceLid = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14)),
    darkMetalMat
  );
  juiceLid.position.y = 0.48;
  juiceDispenser.add(juiceBase, juiceJar, juiceLid);
  breakfastBar.add(juiceDispenser);

  // Cesta de bollería y croissants de desayuno
  const pastryTray = new THREE.Group();
  pastryTray.position.set(3.9, 1.0, 0.1);
  const trayMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.55, 0.04, 0.35)),
    oakLegMat
  );
  trayMesh.position.y = 0.02;
  pastryTray.add(trayMesh);
  // Croissants y panecillos
  [-0.14, 0.0, 0.14].forEach((cx) => {
    const croissant = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.055, 0.026, 6, 12, Math.PI)),
      toastMat
    );
    croissant.rotation.x = -Math.PI / 2;
    croissant.position.set(cx, 0.065, 0);
    pastryTray.add(croissant);
  });
  breakfastBar.add(pastryTray);

  // Gran plato de desayuno preparado (huevos y tostada)
  const bPlate = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
  );
  bPlate.position.set(4.8, 1.01, 0.05);
  // Yema de huevo
  const eggYolk = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.035, 10, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }))
  );
  eggYolk.position.set(4.8, 1.035, 0.05);
  breakfastBar.add(bPlate, eggYolk);

  // Almuerzo: microondas (izquierda) y platos calientes con campana (derecha)
  const microwave = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.36, 0.45)), brushedAlumMat);
  microwave.position.set(-5.0, 1.18, 0);
  const mwDoor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.4, 0.26, 0.02)), darkMetalMat);
  mwDoor.position.set(-5.08, 1.18, 0.23);
  breakfastBar.add(microwave, mwDoor);
  [2.45, 3.4].forEach((hx) => {
    const cloche = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      brushedAlumMat
    );
    cloche.position.set(hx, 1.0, 0.3);
    breakfastBar.add(cloche);
  });

  scene.add(breakfastBar);

  // -------------------------------------------------------------------------
  // 2. MESAS DE CAFETERÍA DONDE COMER (CON SILLAS Y DESAYUNO)
  // -------------------------------------------------------------------------
  const buildDiningTable = (tx: number, tz: number) => {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(tx, 0, tz);

    // Tablero cuadrado de madera clara
    const tableTop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.4, 0.06, 1.4)),
      whiteMarbleMat
    );
    tableTop.position.y = 0.74;
    tableTop.castShadow = true;
    tableGroup.add(tableTop);

    // Pata central y base
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 12)),
      darkMetalMat
    );
    pole.position.y = 0.36;
    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.04, 16)),
      darkMetalMat
    );
    base.position.y = 0.02;
    tableGroup.add(pole, base);

    // Platos servidos con tazas sobre la mesa
    [
      [-0.32, -0.28],
      [0.32, 0.28],
    ].forEach(([px, pz]) => {
      const plate = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 14)),
        whiteMarbleMat
      );
      plate.position.set(px, 0.78, pz);
      const cup = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.04, 0.035, 0.07, 10)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25 }))
      );
      cup.position.set(px + 0.18, 0.81, pz);
      tableGroup.add(plate, cup);
    });

    // 3 Sillas ergonómicas nórdicas alrededor de la mesa
    const chairPositions: [number, number, number][] = [
      [-0.85, 0, Math.PI / 2],
      [0, 0.85, Math.PI],
      [0.85, 0, -Math.PI / 2],
      [0, -0.85, 0],
    ];

    chairPositions.forEach(([cx, cz, yaw]) => {
      const chair = new THREE.Group();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = yaw;

      const seat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.46, 0.05, 0.44)),
        darkCabinetMat
      );
      seat.position.y = 0.44;
      seat.castShadow = true;

      const back = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.44, 0.36, 0.04)),
        darkCabinetMat
      );
      back.position.set(0, 0.64, -0.2);
      back.castShadow = true;

      [-0.18, 0.18].forEach((lx) => {
        [-0.18, 0.18].forEach((lz) => {
          const leg = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.018, 0.015, 0.42, 6)),
            oakLegMat
          );
          leg.position.set(lx, 0.21, lz);
          chair.add(leg);
        });
      });

      chair.add(seat, back);
      tableGroup.add(chair);
    });

    scene.add(tableGroup);
  };

  buildDiningTable(7.5, -2.2);
  buildDiningTable(11.5, -2.2);
  buildDiningTable(7.5, 1.4);
  buildDiningTable(11.5, 1.4);

  // Literas con camas a mano izquierda y derecha de la zona de descanso
  const bunkFrameMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 }));
  const mattressMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }));
  const buildBunk = (bx: number, bz: number, blanket: number[]) => {
    const bunk = new THREE.Group();
    bunk.position.set(bx, 0, bz);
    [-0.5, 0.5].forEach((px) => {
      [-1.0, 1.0].forEach((pz) => {
        const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 1.95, 0.07)), bunkFrameMat);
        post.position.set(px, 0.975, pz);
        post.castShadow = true;
        bunk.add(post);
      });
    });
    [0.42, 1.38].forEach((by, i) => {
      const slab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.0, 0.07, 2.05)), bunkFrameMat);
      slab.position.set(0, by, 0);
      const mattress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.94, 0.14, 1.98)), mattressMat);
      mattress.position.set(0, by + 0.1, 0);
      mattress.receiveShadow = true;
      const cover = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.96, 0.05, 1.2)),
        trackMat(new THREE.MeshStandardMaterial({ color: blanket[i % blanket.length], roughness: 0.85 }))
      );
      cover.position.set(0, by + 0.19, 0.4);
      const pillow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.6, 0.1, 0.34)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }))
      );
      pillow.position.set(0, by + 0.22, -0.78);
      bunk.add(slab, mattress, cover, pillow);
    });
    scene.add(bunk);
  };
  buildBunk(4.2, -2.4, [0x2563eb, 0x0ea5e9]);
  buildBunk(4.2, 0.4, [0x16a34a, 0x84cc16]);
  buildBunk(14.7, -2.4, [0xdb2777, 0xf43f5e]);
  buildBunk(14.7, 0.4, [0x7c3aed, 0xa78bfa]);

  // -------------------------------------------------------------------------
  // 3. ZONA GAMING: 3 TELEVISORES, CONSOLAS (XBOX, PLAY, RIG) Y 9 PUFS (3 POR TV)
  // -------------------------------------------------------------------------
  // Función para construir una estación de juego completa con TV, consola, mandos y 3 pufs
  const buildGamingStation = (
    stationX: number,
    theme: 'racing' | 'adventure' | 'space',
    consoleType: 'play' | 'xbox' | 'hybrid',
    poufColors: [number, number, number]
  ) => {
    const station = new THREE.Group();
    station.position.set(stationX, 0, 5.55);

    // Mueble bajo soporte para la consola y mandos
    const stand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.3, 0.52, 0.6)),
      darkCabinetMat
    );
    stand.position.y = 0.26;
    stand.castShadow = true;
    station.add(stand);

    // Marco del TV de 55 pulgadas
    const tvFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2, 1.25, 0.08)),
      darkMetalMat
    );
    tvFrame.position.set(0, 1.48, 0);
    tvFrame.castShadow = true;
    station.add(tvFrame);

    // Pantalla del TV con videojuego en ejecución
    const tvTex = trackTex(createGamingScreenTexture(maxAnisotropy, theme));
    const tvScreen = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.1, 1.15)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: tvTex,
          emissiveMap: tvTex,
          emissive: 0xffffff,
          emissiveIntensity: 0.95,
          roughness: 0.15,
        })
      )
    );
    // Mirando hacia el frente de la sala (rotación en Y de PI)
    tvScreen.rotation.y = Math.PI;
    tvScreen.position.set(0, 1.48, -0.045);
    station.add(tvScreen);

    // Barra de sonido debajo del TV
    const soundbar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.6, 0.08, 0.1)),
      darkMetalMat
    );
    soundbar.position.set(0, 0.82, -0.02);
    station.add(soundbar);

    // Consola de videojuegos estilizada sobre el mueble
    if (consoleType === 'play') {
      // Consola estilizada tipo Play: diseño blanco con franja central negra y LED azul neón
      const consoleGroup = new THREE.Group();
      consoleGroup.position.set(-0.55, 0.52, 0);

      const leftFin = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.04, 0.38, 0.28)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }))
      );
      leftFin.position.set(-0.06, 0.19, 0);
      const rightFin = leftFin.clone();
      rightFin.position.x = 0.06;

      const core = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.08, 0.36, 0.26)),
        darkMetalMat
      );
      core.position.y = 0.18;

      // Luz LED azul neón distintiva
      const ledStripe = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.015, 0.32, 0.015)),
        trackMat(new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x38bdf8,
          emissiveIntensity: 1.5,
        }))
      );
      ledStripe.position.set(-0.045, 0.2, 0.13);

      consoleGroup.add(leftFin, rightFin, core, ledStripe);
      station.add(consoleGroup);
    } else if (consoleType === 'xbox') {
      // Consola estilizada tipo Xbox: monolito cúbico negro mate con rejilla y LED verde neón
      const consoleGroup = new THREE.Group();
      consoleGroup.position.set(0.55, 0.52, 0);

      const tower = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.2, 0.42, 0.2)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }))
      );
      tower.position.y = 0.21;

      // Anillo / botón LED verde neón
      const ledButton = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 10)),
        trackMat(new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          emissive: 0x22c55e,
          emissiveIntensity: 1.6,
        }))
      );
      ledButton.rotation.x = Math.PI / 2;
      ledButton.position.set(-0.05, 0.36, -0.105);

      consoleGroup.add(tower, ledButton);
      station.add(consoleGroup);
    } else {
      // Consola híbrida / rig gamer: toques neón magenta/violeta
      const consoleGroup = new THREE.Group();
      consoleGroup.position.set(0, 0.52, 0);

      const cBody = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.32, 0.1, 0.22)),
        darkMetalMat
      );
      cBody.position.y = 0.05;

      const ledStripe = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.3, 0.02, 0.02)),
        trackMat(new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0xa855f7,
          emissiveIntensity: 1.5,
        }))
      );
      ledStripe.position.set(0, 0.06, -0.115);

      consoleGroup.add(cBody, ledStripe);
      station.add(consoleGroup);
    }

    // 2 Mandos / controladores inalámbricos de juego sobre la mesa
    [-0.2, 0.2].forEach((cx) => {
      const controller = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.035, 0.08)),
        darkMetalMat
      );
      controller.position.set(cx, 0.54, -0.12);
      station.add(controller);
    });

    scene.add(station);

    // 3 Pufs anatómicos frente a este televisor (distribuidos en abanico cómodo)
    const poufOffsets: [number, number, number][] = [
      [-0.8, -1.7, 0.1],   // Puf izquierdo
      [0.0, -1.9, 0.0],    // Puf central
      [0.8, -1.7, -0.1],   // Puf derecho
    ];

    poufOffsets.forEach(([px, pz, rotY], i) => {
      const poufGroup = new THREE.Group();
      poufGroup.position.set(stationX + px, 0, 5.55 + pz);
      poufGroup.rotation.y = rotY;

      // Base acolchada circular del puf
      const pufBase = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 18)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: poufColors[i],
            roughness: 0.78,
            metalness: 0.04,
          })
        )
      );
      pufBase.position.y = 0.17;
      pufBase.castShadow = true;

      // Respaldo ergonómico suave del puf
      const pufBack = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.5, 0.32, 0.18)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: poufColors[i],
            roughness: 0.8,
            metalness: 0.03,
          })
        )
      );
      pufBack.position.set(0, 0.32, 0.18);
      pufBack.rotation.x = -0.15;
      pufBack.castShadow = true;

      poufGroup.add(pufBase, pufBack);
      scene.add(poufGroup);
    });
  };

  // Construir las 3 estaciones de juego con sus 3 TVs y 3 pufs cada una (total 9 pufs)
  // TV 1: Tema carreras + Consola Play Style + 3 pufs en tonos azules/cyan
  buildGamingStation(6.8, 'racing', 'play', [0x1e3a8a, 0x06b6d4, 0x334155]);

  // TV 2: Tema aventura + Consola Xbox Style + 3 pufs en tonos verdes/lima
  buildGamingStation(9.5, 'adventure', 'xbox', [0x15803d, 0x84cc16, 0x1e293b]);

  // TV 3: Tema espacial + Consola Hybrid Rig + 3 pufs en tonos violeta/terracota
  buildGamingStation(12.2, 'space', 'hybrid', [0x7c3aed, 0xe07a5f, 0x475569]);

  // -------------------------------------------------------------------------
  // 4. LÁMPARA AMBIENTAL
  // -------------------------------------------------------------------------
  // Lámpara de pie moderna
  const floorLamp = new THREE.Group();
  floorLamp.position.set(13.5, 0, 1.0);
  const lampFoot = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 16)),
    darkMetalMat
  );
  lampFoot.position.y = 0.02;
  const lampRod = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.02, 0.025, 2.2, 8)),
    darkMetalMat
  );
  lampRod.position.y = 1.1;
  const shade = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18, 0.32, 0.4, 16, 1, true)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.85,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
    )
  );
  shade.position.y = 2.15;
  floorLamp.add(lampFoot, lampRod, shade);
  scene.add(floorLamp);

  // =========================================================================
  // BALANCED ZONE LIGHTING RIG (<= 2 Shadow Casters + Distinct Zone Moods)
  // =========================================================================
  // =========================================================================
  // OFICINA DEL LEONARD (SENIOR FULL-STACK)
  // =========================================================================
  scene = seniorGroup;
  const seniorFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(ROOM_W, ROOM_D)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1b1830,
        roughness: 0.5,
        metalness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    )
  );
  seniorFloor.rotation.x = -Math.PI / 2;
  seniorFloor.position.y = 0.015;
  seniorFloor.receiveShadow = true;
  scene.add(seniorFloor);

  const seniorBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(ROOM_W - 0.4, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa78bfa,
        emissive: 0xa78bfa,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  seniorBar.position.set(0, 0.025, ROOM_D / 2 - 0.25);
  scene.add(seniorBar);

  // TV grande en la pared de enfrente: lista de proyectos
  const tvCt = makeCanvasTex(1280, 720);
  const drawTv = () => {
    const g = tvCt.ctx;
    g.fillStyle = '#0b1220';
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle = '#111c33';
    g.fillRect(0, 0, 1280, 100);
    g.textAlign = 'left';
    g.fillStyle = '#f8fafc';
    g.font = 'bold 54px sans-serif';
    g.fillText('PROYECTOS', 40, 68);
    g.textAlign = 'right';
    g.fillStyle = '#a78bfa';
    g.font = '34px monospace';
    g.fillText(projectList.length + ' activos', 1240, 66);
    projectList.slice(0, 10).forEach((p, i) => {
      const col = Math.floor(i / 5);
      const row = i % 5;
      const x = 40 + col * 620;
      const y = 130 + row * 116;
      g.fillStyle = p.name === selectedName ? '#312e81' : '#131f38';
      g.fillRect(x, y, 580, 100);
      g.textAlign = 'left';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 36px sans-serif';
      g.fillText(clipText(p.name, 22), x + 20, y + 44);
      g.fillStyle = '#94a3b8';
      g.font = '26px monospace';
      g.fillText(p.done + '/' + p.total + ' tickets', x + 20, y + 82);
      g.fillStyle = '#1e293b';
      g.fillRect(x + 300, y + 58, 260, 20);
      g.fillStyle = '#34d399';
      g.fillRect(x + 300, y + 58, p.total > 0 ? (260 * p.done) / p.total : 0, 20);
    });
    if (projectList.length > 10) {
      g.textAlign = 'center';
      g.fillStyle = '#fbbf24';
      g.font = 'bold 28px sans-serif';
      g.fillText('+' + (projectList.length - 10) + ' proyectos más', 640, 706);
    }
    if (projectList.length === 0) {
      g.textAlign = 'center';
      g.fillStyle = '#64748b';
      g.font = '44px sans-serif';
      g.fillText('Sin proyectos todavía', 640, 400);
    }
    tvCt.tex.needsUpdate = true;
  };
  drawTv();
  projectListeners.push(drawTv);
  const tvFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.7, 2.7, 0.12)), darkMetalMat);
  tvFrame.position.set(0, 2.15, -ROOM_D / 2 + 0.12);
  tvFrame.castShadow = true;
  scene.add(tvFrame);
  const tvScreenMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.5, 2.5)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: tvCt.tex,
        emissiveMap: tvCt.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      })
    )
  );
  tvScreenMesh.position.set(0, 2.15, -ROOM_D / 2 + 0.19);
  scene.add(tvScreenMesh);

  // Escritorio del Senior con 3 pantallas (se sienta en +z, mirando a la TV)
  const sDesk = new THREE.Group();
  sDesk.position.set(0, 0, -1.55);
  const sTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.08, 1.5)), deskTopMat);
  sTop.position.y = 0.74;
  sTop.castShadow = true;
  sTop.receiveShadow = true;
  sDesk.add(sTop);
  [-2.1, 2.1].forEach((lx) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.72, 1.3)), brushedAlumMat);
    leg.position.set(lx, 0.36, 0);
    sDesk.add(leg);
  });
  [
    { x: -1.5, yaw: 0.42, tex: 0 },
    { x: 0, yaw: 0, tex: 1 },
    { x: 1.5, yaw: -0.42, tex: 2 },
  ].forEach((m) => {
    const mon = new THREE.Group();
    mon.position.set(m.x, 1.22, -0.45 + (m.x === 0 ? 0 : 0.22));
    mon.rotation.y = m.yaw;
    const bez = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.35, 0.78, 0.05)), darkMetalMat);
    bez.castShadow = true;
    const disp = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.28, 0.72)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: monitorTextures[m.tex],
          emissiveMap: monitorTextures[m.tex],
          emissive: 0xffffff,
          emissiveIntensity: 0.85,
          roughness: 0.18,
        })
      )
    );
    disp.position.z = 0.025;
    const st = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 8)), brushedAlumMat);
    st.position.set(0, -0.5, -0.02);
    mon.add(bez, disp, st);
    sDesk.add(mon);
  });
  const sKb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 0.03, 0.25)), darkMetalMat);
  sKb.position.set(0, 0.8, 0.4);
  sDesk.add(sKb);
  const sChair = new THREE.Group();
  sChair.position.set(0, 0, 1.07);
  const sSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 0.08, 0.56)), chairMat);
  sSeat.position.y = 0.44;
  const sBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.66, 0.08)), chairMat);
  sBack.position.set(0, 0.8, 0.26);
  const sStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.36, 8)), brushedAlumMat);
  sStem.position.y = 0.22;
  const sBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 6)), darkMetalMat);
  sBase.position.y = 0.04;
  sChair.add(sSeat, sBack, sStem, sBase);
  sDesk.add(sChair);
  scene.add(sDesk);

  registerInfo(sDesk, {
    title: 'PC DE LEONARD (FULL-STACK)',
    section: 'Oficina de Leonard',
    description: 'Aquí se muestra el estado y la tarea actual del desarrollador full-stack.',
    lines: () => agentLines(officeStats.agents.find((a) => !a.isCTO && /full.?stack/i.test(a.title))),
    images: () => [],
    empty: () => !officeStats.agents.some((a) => !a.isCTO && /full.?stack/i.test(a.title)),
  });
  registerInfo([tvFrame, tvScreenMesh], {
    title: 'TV DE PROYECTOS',
    section: 'Oficina de Leonard',
    description: 'Aquí se lista cada proyecto de la gestión con su avance.',
    lines: () => officeStats.projects.map((p) => `${p.name}: ${p.done}/${p.total} tareas`),
    empty: () => officeStats.projects.length === 0,
  });

  // Puf para descansar
  const sPouf = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.55, 0.6, 0.45, 20)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.85 }))
  );
  sPouf.position.set(3.8, 0.225, 1.8);
  sPouf.castShadow = true;
  scene.add(sPouf);
  const sPoufTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.5, 0.55, 0.08, 20)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.9 }))
  );
  sPoufTop.position.set(3.8, 0.48, 1.8);
  scene.add(sPoufTop);

  // Librero vacío en la pared izquierda (los servidores de proyectos ahora están en el Data Center)
  addBookcase(scene, -5.55, -2.9, Math.PI / 2, 3.4, 2.8);


  // ---- Tecnología e IA: escritorio ----
  buildFigure(sDesk, -1.9, 0.8, -0.35, 1.3, 'robot', 0x38bdf8, 0.3);
  buildFigure(sDesk, 1.9, 0.8, -0.3, 1.3, 'robot', 0xa78bfa, -0.3);
  const vrHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.1, 0.12)), darkMetalMat);
  vrHead.position.set(-1.45, 0.84, 0.45);
  const vrLens = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.16, 0.05, 0.01)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1 }))
  );
  vrLens.position.set(-1.45, 0.84, 0.51);
  const mug = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }))
  );
  mug.position.set(1.5, 0.84, 0.4);
  sDesk.add(vrHead, vrLens, mug);

  // ---- Hologramas giratorios ----
  const hologramMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.0,
      roughness: 0.3,
    })
  );
  const hologramLineMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.7 });
  disposables.push(hologramLineMat);

  // Red neuronal: 4 capas de nodos conectadas
  const neuralPed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.5, 0.7, 18)), darkMetalMat);
  neuralPed.position.set(-4.0, 0.35, 1.4);
  scene.add(neuralPed);
  const neural = new THREE.Group();
  neural.position.set(-4.0, 1.55, 1.4);
  const layers = [3, 4, 4, 2];
  const nodePos: THREE.Vector3[][] = layers.map((count, li) =>
    Array.from({ length: count }, (_, ni) =>
      new THREE.Vector3(-0.55 + li * 0.37, (ni - (count - 1) / 2) * 0.28, (ni % 2) * 0.1)
    )
  );
  const nodeGeo = trackGeo(new THREE.SphereGeometry(0.055, 10, 10));
  const linePts: number[] = [];
  nodePos.forEach((layer, li) => {
    layer.forEach((np) => {
      const n = new THREE.Mesh(nodeGeo, hologramMat);
      n.position.copy(np);
      neural.add(n);
      if (li < nodePos.length - 1) {
        nodePos[li + 1].forEach((nx) => linePts.push(np.x, np.y, np.z, nx.x, nx.y, nx.z));
      }
    });
  });
  const lineGeo = trackGeo(new THREE.BufferGeometry());
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
  neural.add(new THREE.LineSegments(lineGeo, hologramLineMat));
  scene.add(neural);
  spinners.push(neural);

  // Chip de IA brillante
  const chipPed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.45, 0.8, 18)), darkMetalMat);
  chipPed.position.set(4.8, 0.4, 4.7);
  scene.add(chipPed);
  const chip = new THREE.Group();
  chip.position.set(4.8, 1.35, 4.7);
  const chipBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.5, 0.08, 0.5)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 }))
  );
  const chipCore = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 0.1, 0.26)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x8b5cf6, emissiveIntensity: 1.2 }))
  );
  chip.add(chipBody, chipCore);
  const pinGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.03, 0.07));
  for (let i = 0; i < 8; i++) {
    [-1, 1].forEach((side) => {
      const pinX = new THREE.Mesh(pinGeo, brushedAlumMat);
      pinX.position.set(-0.19 + i * 0.054, 0, side * 0.28);
      const pinZ = new THREE.Mesh(pinGeo, brushedAlumMat);
      pinZ.rotation.y = Math.PI / 2;
      pinZ.position.set(side * 0.28, 0, -0.19 + i * 0.054);
      chip.add(pinX, pinZ);
    });
  }
  scene.add(chip);
  spinners.push(chip);

  // ---- Estatua de robot humanoide ----
  const robot = new THREE.Group();
  robot.position.set(-4.8, 0, 4.6);
  robot.rotation.y = 0.5;
  const robotMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 }));
  const addR = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = robotMat) => {
    const part = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), m);
    part.position.set(x, y, z);
    part.castShadow = true;
    robot.add(part);
  };
  addR(0.9, 0.12, 0.7, 0, 0.06, 0, darkMetalMat); // plataforma
  addR(0.16, 0.7, 0.18, -0.15, 0.47, 0);
  addR(0.16, 0.7, 0.18, 0.15, 0.47, 0);
  addR(0.5, 0.65, 0.3, 0, 1.15, 0);
  addR(0.14, 0.6, 0.14, -0.36, 1.1, 0);
  addR(0.14, 0.6, 0.14, 0.36, 1.1, 0);
  addR(0.3, 0.26, 0.26, 0, 1.63, 0);
  addR(
    0.22,
    0.06,
    0.02,
    0,
    1.65,
    0.14,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2 }))
  );
  addR(
    0.12,
    0.12,
    0.03,
    0,
    1.18,
    0.16,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x8b5cf6, emissiveIntensity: 1.2 }))
  );
  scene.add(robot);

  // ---- Mesa auxiliar con impresora 3D y brazo robótico (pared derecha) ----
  const aux = new THREE.Group();
  aux.position.set(5.45, 0, -3.6);
  aux.rotation.y = -Math.PI / 2;
  const auxTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.07, 0.9)), deskTopMat);
  auxTop.position.y = 0.78;
  auxTop.castShadow = true;
  aux.add(auxTop);
  [-1.1, 1.1].forEach((lx) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.78, 0.8)), brushedAlumMat);
    leg.position.set(lx, 0.39, 0);
    aux.add(leg);
  });
  // Impresora 3D
  const printerFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.7, 0.62, 0.6)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.5 }))
  );
  printerFrame.position.set(-0.6, 1.12, 0);
  printerFrame.castShadow = true;
  const printerGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.52, 0.02)), glassWallMat);
  printerGlass.position.set(-0.6, 1.12, 0.31);
  const printedPiece = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.09, 0.12, 0.2, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.4 }))
  );
  printedPiece.position.set(-0.6, 0.92, 0);
  aux.add(printerFrame, printerGlass, printedPiece);
  // Brazo robótico
  const armBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 0.1, 14)), darkMetalMat);
  armBase.position.set(0.6, 0.86, 0);
  const armLow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.4, 0.07)), brushedAlumMat);
  armLow.position.set(0.6, 1.1, 0);
  armLow.rotation.z = 0.25;
  const armUp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.36, 0.06)), brushedAlumMat);
  armUp.position.set(0.77, 1.4, 0);
  armUp.rotation.z = -0.9;
  const claw = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.12, 0.04, 0.05)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.9 }))
  );
  claw.position.set(0.96, 1.52, 0);
  aux.add(armBase, armLow, armUp, claw);
  scene.add(aux);

  // ---- Cuadros tecnológicos en la pared derecha ----
  const makeArt = (draw: (g: CanvasRenderingContext2D) => void, z: number) => {
    const ct = makeCanvasTex(768, 512);
    draw(ct.ctx);
    ct.tex.needsUpdate = true;
    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 1.34, 2.0)), darkMetalMat);
    frame.position.set(5.96, 2.0, z);
    const art = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.9, 1.24)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: ct.tex,
          emissiveMap: ct.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.65,
        })
      )
    );
    art.position.set(5.92, 2.0, z);
    art.rotation.y = -Math.PI / 2;
    scene.add(frame, art);
  };
  // Placa de circuito
  makeArt((g) => {
    g.fillStyle = '#04141f';
    g.fillRect(0, 0, 768, 512);
    g.strokeStyle = '#22d3ee';
    g.lineWidth = 5;
    g.fillStyle = '#22d3ee';
    for (let i = 0; i < 14; i++) {
      const y = 40 + i * 32;
      const x1 = 40 + ((i * 97) % 300);
      const x2 = x1 + 120 + ((i * 53) % 260);
      g.beginPath();
      g.moveTo(x1, y);
      g.lineTo(x2, y);
      g.lineTo(x2 + 40, y + 28);
      g.lineTo(Math.min(720, x2 + 160), y + 28);
      g.stroke();
      g.beginPath();
      g.arc(x1, y, 9, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#0f172a';
    g.fillRect(300, 190, 170, 130);
    g.strokeStyle = '#a78bfa';
    g.lineWidth = 6;
    g.strokeRect(300, 190, 170, 130);
    g.fillStyle = '#a78bfa';
    g.font = 'bold 64px monospace';
    g.textAlign = 'center';
    g.fillText('AI', 385, 280);
  }, -0.4);
  // Código
  makeArt((g) => {
    g.fillStyle = '#0b1020';
    g.fillRect(0, 0, 768, 512);
    g.fillStyle = '#1e293b';
    g.fillRect(0, 0, 768, 50);
    ['#ef4444', '#f59e0b', '#22c55e'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(34 + i * 34, 25, 11, 0, Math.PI * 2);
      g.fill();
    });
    g.textAlign = 'left';
    g.font = '30px monospace';
    const code: Array<[string, string]> = [
      ['#c084fc', 'async function pensar(prompt) {'],
      ['#e2e8f0', '  const ctx = await memoria.leer();'],
      ['#38bdf8', '  const r = await modelo.generar({'],
      ['#e2e8f0', '    prompt, ctx, temperature: 0.2'],
      ['#38bdf8', '  });'],
      ['#34d399', '  return r.texto; // ✓'],
      ['#c084fc', '}'],
    ];
    code.forEach(([c, t], i) => {
      g.fillStyle = c;
      g.fillText(t, 24, 100 + i * 48);
    });
  }, 1.8);

  // ---- Pizarra de arquitectura de IA y neón en la pared del fondo ----
  const mlCt = makeCanvasTex(1024, 512);
  {
    const g = mlCt.ctx;
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#0f172a';
    g.font = 'bold 34px sans-serif';
    g.textAlign = 'left';
    g.fillText('ARQUITECTURA · AGENTES + LLM', 30, 56);
    const boxes: Array<[string, number, number, string]> = [
      ['Usuario', 40, 150, '#38bdf8'],
      ['Orquestador', 250, 150, '#f59e0b'],
      ['LLM', 480, 100, '#a78bfa'],
      ['Memoria', 480, 250, '#10b981'],
      ['Herramientas', 720, 175, '#ef4444'],
    ];
    boxes.forEach(([t, x, y, c]) => {
      g.fillStyle = c;
      g.fillRect(x, y, 190, 90);
      g.fillStyle = '#ffffff';
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'center';
      g.fillText(t, x + 95, y + 55);
    });
    g.strokeStyle = '#334155';
    g.lineWidth = 5;
    [
      [230, 195, 250, 195],
      [440, 175, 480, 145],
      [440, 215, 480, 295],
      [670, 145, 720, 205],
      [670, 295, 720, 245],
    ].forEach(([x1, y1, x2, y2]) => {
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    });
    g.fillStyle = '#475569';
    g.font = '26px monospace';
    g.textAlign = 'left';
    g.fillText('prompt → plan → llamada al modelo → herramientas → respuesta', 40, 430);
    mlCt.tex.needsUpdate = true;
  }
  const mlFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.3, 1.8, 0.07)), brushedAlumMat);
  mlFrame.position.set(4.1, 2.1, -ROOM_D / 2 + 0.1);
  const mlBoard = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(3.15, 1.575)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: mlCt.tex,
        emissiveMap: mlCt.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
      })
    )
  );
  mlBoard.position.set(4.1, 2.1, -ROOM_D / 2 + 0.14);
  scene.add(mlFrame, mlBoard);
  registerInfo([mlFrame, mlBoard], {
    title: 'TABLERO DE IA',
    section: 'Oficina de Leonard',
    description: 'Aquí se muestra el uso de modelos de IA del equipo.',
    lines: () => officeStats.agents.map((a) => `${a.name}: ${a.tokens.toLocaleString('es')} tokens ahorrados hoy`),
    empty: () => officeStats.agents.length === 0,
  });
  addSign('</> IA', -4.0, 2.4, -ROOM_D / 2 + 0.16, 0, 2.0, '#22d3ee');

  const seniorLight = new THREE.PointLight(0xc4b5fd, 12, 15, 1.5);
  seniorLight.position.set(0, 4.0, 0);
  seniorGroup.add(seniorLight);

  // =========================================================================
  // SALA DE JUNTAS: al lado de la Oficina de Leonard en el ala norte
  // =========================================================================
  scene = rootScene;
  const BR = BOARDROOM;
  const brGroup = new THREE.Group();
  brGroup.position.set(BR.cx, 0, BR.cz);
  rootScene.add(brGroup);
  const brSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(BR.w, 0.44, BR.d)),
    baseSlabMat
  );
  brSlab.position.set(BR.cx, -0.22, BR.cz);
  brSlab.receiveShadow = true;
  scene.add(brSlab);
  const brTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(BR.w + 0.1, 0.06, 0.08)), trimStripMat);
  brTrim.position.set(BR.cx, -0.02, BR.cz - BR.d / 2 - 0.04);
  scene.add(brTrim);
  const brFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(BR.w, BR.d)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x16233d,
        roughness: 0.6,
        metalness: 0.15,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    )
  );
  brFloor.rotation.x = -Math.PI / 2;
  brFloor.position.set(BR.cx, 0.015, BR.cz);
  brFloor.receiveShadow = true;
  scene.add(brFloor);
  const brBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(BR.w - 0.4, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  brBar.position.set(BR.cx, 0.025, BR.cz + BR.d / 2 - 0.25);
  scene.add(brBar);

  // 4 libreros en la pared frente a la puerta (norte); nacen vacíos y se llenan con la gestión
  [-4.8, -1.6, 1.6, 4.8].forEach((bx) =>
    addBookcase(scene, BR.cx + bx, BR.cz - BR.d / 2 + 0.3, 0, 3.1, 3.2)
  );

  // Mesa de snacks y cafetería gourmet de la Sala de Juntas (pared oeste)
  const snackBarMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 }));
  const snackCounter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.0, 0.9, 4.8)), snackBarMat);
  snackCounter.position.set(BR.cx - BR.w / 2 + 0.65, 0.45, BR.cz);
  snackCounter.castShadow = true;
  scene.add(snackCounter);

  // Cafetera express profesional en la mesa de snacks
  const coffeeMachMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 }));
  const coffeeMachine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.58, 0.65)), coffeeMachMat);
  coffeeMachine.position.set(BR.cx - BR.w / 2 + 0.65, 1.19, BR.cz - 1.2);
  scene.add(coffeeMachine);

  // Bandejas de snacks, frutas y termos de café
  const trayMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 }));
  [-0.2, 0.8].forEach((zOff) => {
    const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.04, 0.7)), trayMat);
    tray.position.set(BR.cx - BR.w / 2 + 0.65, 0.92, BR.cz + zOff);
    scene.add(tray);

    // Vasos / bocadillos
    for (let c = 0; c < 3; c++) {
      const cup = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 10)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }))
      );
      cup.position.set(BR.cx - BR.w / 2 + 0.65, 1.0, BR.cz + zOff - 0.2 + c * 0.2);
      scene.add(cup);
    }
  });

  // Libretas para apuntes y bolígrafos sobre la mesa de la pared izquierda (oeste)
  const noteColors = [0x2563eb, 0xf59e0b, 0x10b981, 0xec4899, 0x8b5cf6, 0x06b6d4];
  noteColors.forEach((c, i) => {
    const nb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.3, 0.025, 0.42)),
      trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }))
    );
    nb.position.set(BR.cx - BR.w / 2 + 0.55 + (i % 2) * 0.12, 0.915 + Math.floor(i / 2) * 0.03, BR.cz + 1.55 + (i % 3) * 0.28);
    nb.rotation.y = (i - 2.5) * 0.08;
    scene.add(nb);
  });
  const penCup = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4 }))
  );
  penCup.position.set(BR.cx - BR.w / 2 + 0.95, 0.96, BR.cz + 2.2);
  scene.add(penCup);
  [-0.025, 0, 0.025].forEach((o, i) => {
    const pen = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6)),
      trackMat(new THREE.MeshStandardMaterial({ color: [0xef4444, 0x3b82f6, 0x111827][i], roughness: 0.5 }))
    );
    pen.position.set(BR.cx - BR.w / 2 + 0.95 + o, 1.08, BR.cz + 2.2);
    pen.rotation.z = o * 8;
    scene.add(pen);
  });

  // Pantalla de presentación en la pared este
  const brScreenCt = makeCanvasTex(1280, 560);
  {
    const g = brScreenCt.ctx;
    g.fillStyle = '#0b1220';
    g.fillRect(0, 0, 1280, 560);
    g.fillStyle = '#38bdf8';
    g.fillRect(0, 0, 1280, 14);
    g.textAlign = 'center';
    g.fillStyle = '#f8fafc';
    g.font = 'bold 96px sans-serif';
    g.fillText('SALA DE JUNTAS', 640, 250);
    g.fillStyle = '#38bdf8';
    g.font = '48px sans-serif';
    g.fillText('Reporte de estado del equipo', 640, 340);
    brScreenCt.tex.needsUpdate = true;
  }
  const brScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(5.2, 2.275)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: brScreenCt.tex,
        emissiveMap: brScreenCt.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.7,
      })
    )
  );
  brScreen.position.set(BR.cx + BR.w / 2 - 0.12, 2.0, BR.cz);
  brScreen.rotation.y = -Math.PI / 2;
  registerInfo(brScreen, {
    title: 'PANTALLA DE PRESENTACIÓN',
    section: 'Sala de juntas',
    description: 'Aquí se proyecta el material de las reuniones del equipo.',
    lines: () => officeStats.agents.map((a) => `${a.name}: ${a.status}`),
    empty: () => officeStats.agents.length === 0,
  });
  scene.add(brScreen);
  const brLight = new THREE.PointLight(0xbfdbfe, 14, 18, 1.5);
  brLight.position.set(BR.cx, 4.0, BR.cz);
  scene.add(brLight);

  // Mesa y sillas: se reconstruyen según el número de agentes (una silla por agente)
  const brSeatsGroup = new THREE.Group();
  scene.add(brSeatsGroup);
  const brTableGeo = trackGeo(new THREE.BoxGeometry(1, 0.08, 2.2));
  const brLegGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.72, 1.8));
  const brTableMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.3 }));
  const brHeadChairMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }));
  const brSeatGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.08, 0.54));
  const brBackGeo = trackGeo(new THREE.BoxGeometry(0.52, 0.62, 0.08));
  const brStemGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.36, 8));
  const brBaseGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6));
  const setBoardroomSeats = (n: number) => {
    while (brSeatsGroup.children.length) brSeatsGroup.remove(brSeatsGroup.children[0]);
    const { L } = boardroomLayout(n);
    const table = new THREE.Mesh(brTableGeo, brTableMat);
    table.scale.x = L;
    table.position.set(BR.cx, 0.76, BR.cz);
    table.castShadow = true;
    table.receiveShadow = true;
    brSeatsGroup.add(table);
    [-L / 2 + 0.4, L / 2 - 0.4].forEach((lx) => {
      const leg = new THREE.Mesh(brLegGeo, brushedAlumMat);
      leg.position.set(BR.cx + lx, 0.36, BR.cz);
      brSeatsGroup.add(leg);
    });
    boardroomSeats(n).forEach((seat, i) => {
      const chair = new THREE.Group();
      chair.position.set(seat.x, 0, seat.z);
      chair.rotation.y = seat.yaw;
      const mat = i === 0 ? brHeadChairMat : chairMat;
      const s = new THREE.Mesh(brSeatGeo, mat);
      s.position.y = 0.44;
      const b = new THREE.Mesh(brBackGeo, mat);
      b.position.set(0, 0.78, -0.26);
      const st = new THREE.Mesh(brStemGeo, brushedAlumMat);
      st.position.y = 0.22;
      const ba = new THREE.Mesh(brBaseGeo, darkMetalMat);
      ba.position.y = 0.04;
      chair.add(s, b, st, ba);
      brSeatsGroup.add(chair);
    });
  };
  setBoardroomSeats(BOARDROOM_SEATS);

  // =========================================================================
  // DATA CENTER CENTRALIZADO (Ala Sur, al frente de Sala de Juntas y al lado de Descanso)
  // Almacena todos los servidores transferidos de Laboratorio y Senior, con UPS,
  // clusters GPU, almacenamiento SAN y gran pantalla de métricas de infraestructura.
  // =========================================================================
  const dcGroup = new THREE.Group();
  scene.add(dcGroup);

  // Piso técnico elevado perforado con brillo azul
  const dcFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.28,
      metalness: 0.85,
    })
  );
  const dcFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(DATACENTER.w, 0.24, DATACENTER.d)),
    dcFloorMat
  );
  dcFloor.position.set(DATACENTER.cx, 0.12, DATACENTER.cz);
  dcFloor.receiveShadow = true;
  dcGroup.add(dcFloor);

  // Franjas de ventilación perimetrales
  const dcVentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    })
  );
  const dcVentN = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(DATACENTER.w - 1, 0.02, 0.12)), dcVentMat);
  dcVentN.position.set(DATACENTER.cx, 0.25, DATACENTER.cz - DATACENTER.d / 2 + 0.3);
  const dcVentS = dcVentN.clone();
  dcVentS.position.z = DATACENTER.cz + DATACENTER.d / 2 - 0.3;
  dcGroup.add(dcVentN, dcVentS);

  // =====================================================================
  // DATA CENTER REAL: piso técnico, racks por columnas, pasillos fríos con contención,
  // pasillo caliente central con bandeja de cables, unidades CRAC y seguridad.
  // =====================================================================
  const dcCX = DATACENTER.cx;
  const dcCZ = DATACENTER.cz;

  // Piso técnico elevado: losetas de 60 cm con juntas y perforaciones
  {
    const ft = makeCanvasTex(256, 256);
    const g = ft.ctx;
    g.fillStyle = '#0b1522';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x0 = i * 128;
        const y0 = j * 128;
        g.fillStyle = (i + j) % 2 ? '#0d1a2b' : '#0a1220';
        g.fillRect(x0 + 3, y0 + 3, 122, 122);
        g.strokeStyle = '#223247';
        g.lineWidth = 2;
        g.strokeRect(x0 + 1.5, y0 + 1.5, 125, 125);
        g.fillStyle = '#31475f';
        [[8, 8], [120, 8], [8, 120], [120, 120]].forEach(([px, py]) => g.fillRect(x0 + px - 2, y0 + py - 2, 4, 4));
      }
    }
    ft.tex.wrapS = ft.tex.wrapT = THREE.RepeatWrapping;
    ft.tex.repeat.set(DATACENTER.w / 1.2, DATACENTER.d / 1.2);
    ft.tex.needsUpdate = true;
    dcFloorMat.map = ft.tex;
    dcFloorMat.color.setHex(0xffffff);
    dcFloorMat.needsUpdate = true;
  }

  // Texturas de frente de rack: cómputo (1U/2U), almacenamiento (bahías de disco) y red (puertos)
  const makeRackFront = (kind: 'compute' | 'storage' | 'network') => {
    const ct = makeCanvasTex(128, 512);
    const g = ct.ctx;
    const rnd = mulberry(kind === 'compute' ? 11 : kind === 'storage' ? 23 : 37);
    g.fillStyle = '#080d16';
    g.fillRect(0, 0, 128, 512);
    g.fillStyle = '#1b2433';
    g.fillRect(0, 0, 8, 512);
    g.fillRect(120, 0, 8, 512);
    const accent = kind === 'compute' ? ['#22d3ee', '#10b981'] : kind === 'storage' ? ['#f59e0b', '#a78bfa'] : ['#22c55e', '#38bdf8'];
    let y = 8;
    while (y < 496) {
      const units = kind === 'storage' ? 2 : kind === 'network' ? 1 : rnd() < 0.3 ? 2 : 1;
      const h = units * 11;
      g.fillStyle = '#131c2b';
      g.fillRect(10, y, 108, h - 2);
      g.strokeStyle = '#273449';
      g.lineWidth = 1;
      g.strokeRect(10.5, y + 0.5, 107, h - 3);
      if (kind === 'storage') {
        for (let k = 0; k < 8; k++) {
          g.fillStyle = '#0b1220';
          g.fillRect(14 + k * 12, y + 3, 10, h - 8);
          g.fillStyle = rnd() < 0.85 ? accent[0] : accent[1];
          g.fillRect(17 + k * 12, y + h - 6, 4, 2);
        }
      } else if (kind === 'network') {
        for (let k = 0; k < 16; k++) {
          g.fillStyle = rnd() < 0.65 ? accent[rnd() < 0.5 ? 0 : 1] : '#0b1220';
          g.fillRect(14 + k * 6.4, y + 3, 4, 5);
        }
      } else {
        for (let k = 0; k < 6; k++) {
          g.fillStyle = '#0b1220';
          g.fillRect(14 + k * 10, y + 3, 7, h - 8);
        }
        g.fillStyle = accent[rnd() < 0.5 ? 0 : 1];
        g.fillRect(104, y + 3, 3, 3);
        g.fillRect(109, y + 3, 3, 3);
      }
      y += h;
      if (rnd() < 0.08) y += 11;
    }
    ct.tex.needsUpdate = true;
    return ct.tex;
  };
  const rackSideMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.4, metalness: 0.8 }));
  const rackFrontMats = (['compute', 'storage', 'network'] as const).map((k) => {
    const tex = makeRackFront(k);
    return trackMat(
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.5 })
    );
  });
  const RACK_DEPTH = 1.1;
  const RACK_WIDTH = 0.62;
  const RACKS_PER_COL = 13;
  const RACK_PITCH = 0.65;
  const rackZ0 = dcCZ - 3.9 + RACK_WIDTH / 2;
  const rackZMid = rackZ0 + ((RACKS_PER_COL - 1) * RACK_PITCH) / 2;
  const rackGeo = trackGeo(new THREE.BoxGeometry(RACK_DEPTH, 2.6, RACK_WIDTH));
  const dcColumns = [
    { dx: -3.95, face: 1, kind: 0, label: 'EJECUCIÓN · CÓMPUTO', color: '#22d3ee', led: 0x22d3ee },
    { dx: -1.55, face: -1, kind: 1, label: 'ALMACENAMIENTO · PROYECTOS', color: '#a78bfa', led: 0xa78bfa },
    { dx: 1.55, face: 1, kind: 1, label: 'ALMACENAMIENTO · TICKETS', color: '#f59e0b', led: 0xf59e0b },
    { dx: 3.95, face: -1, kind: 2, label: 'RESPALDO · RED', color: '#22c55e', led: 0x22c55e },
  ];
  dcColumns.forEach((col, ci) => {
    const mats =
      col.face === 1
        ? [rackFrontMats[col.kind], rackSideMat, rackSideMat, rackSideMat, rackSideMat, rackSideMat]
        : [rackSideMat, rackFrontMats[col.kind], rackSideMat, rackSideMat, rackSideMat, rackSideMat];
    const ledMat = trackMat(new THREE.MeshStandardMaterial({ color: col.led, emissive: col.led, emissiveIntensity: 1.4 }));
    for (let i = 0; i < RACKS_PER_COL; i++) {
      const rz = rackZ0 + i * RACK_PITCH;
      const rack = new THREE.Mesh(rackGeo, mats);
      rack.position.set(dcCX + col.dx, 1.54, rz);
      rack.castShadow = true;
      rack.receiveShadow = true;
      dcGroup.add(rack);
      const led = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.04, 0.3)), ledMat);
      led.position.set(dcCX + col.dx + col.face * (RACK_DEPTH / 2 + 0.01), 2.78, rz);
      dcGroup.add(led);
      registerInfo(rack, {
        title: `RACK ${'ABCD'[ci]}${i + 1}`,
        section: col.label,
        description: [
          'Aquí se muestran las tareas que se están ejecutando.',
          'Aquí se archiva todo lo de cada proyecto.',
          'Aquí se almacenan los tickets de la gestión.',
          'Aquí se respalda lo entregado.',
        ][ci],
        lines: () =>
          ci === 0
            ? [`Tareas en curso: ${officeStats.stages.in_dev + officeStats.stages.sheldon_review}`]
            : ci === 1
              ? officeStats.projects.map((p) => `${p.name}: ${p.done}/${p.total} tareas`)
              : ci === 2
                ? [`Tickets: ${totalTickets()}`, `Proyectos: ${officeStats.projects.length}`]
                : [`Entregadas: ${officeStats.stages.completed}`],
        images: () => [],
        empty: () => (ci === 1 ? officeStats.projects.length === 0 : noTeamData()),
      });
    }
    // Rótulo de la columna (colgante, mirando a la puerta)
    addInfoScreen(dcGroup, dcCX + col.dx, 3.05, rackZ0 - 0.55, Math.PI, 2.1, 0.8, col.label, col.color, (g, x, y, w, h) => {
      const item: [string, string, string] =
        ci === 0
          ? ['EN CURSO', String(officeStats.stages.in_dev + officeStats.stages.sheldon_review), col.color]
          : ci === 1
            ? ['PROYECTOS', String(officeStats.projects.length), col.color]
            : ci === 2
              ? ['TICKETS', String(totalTickets()), col.color]
              : ['ENTREGADAS', String(officeStats.stages.completed), col.color];
      drawKpis(g, x, y, w, h, [item]);
    });
  });

  // Contención de pasillo frío: techo y puerta de vidrio sobre cada pasillo frío
  const dcGlassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.3 })
  );
  const dcFrameMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 }));
  const perfTex = makeCanvasTex(128, 512);
  {
    const g = perfTex.ctx;
    g.fillStyle = '#06222e';
    g.fillRect(0, 0, 128, 512);
    g.fillStyle = '#22d3ee';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 32; j++) g.fillRect(8 + i * 15, 6 + j * 16, 6, 6);
    perfTex.tex.needsUpdate = true;
  }
  [-2.75, 2.75].forEach((dx) => {
    const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.35, 0.04, 8.9)), dcGlassMat);
    roof.position.set(dcCX + dx, 2.78, rackZMid);
    dcGroup.add(roof);
    const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 2.6, 0.04)), dcGlassMat);
    door.position.set(dcCX + dx, 1.3, rackZ0 - 0.45);
    dcGroup.add(door);
    [-0.65, 0.65].forEach((fx) => {
      const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 2.6, 0.06)), dcFrameMat);
      post.position.set(dcCX + dx + fx, 1.3, rackZ0 - 0.45);
      dcGroup.add(post);
    });
    // Baldosas perforadas luminosas en el pasillo frío
    const perf = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.2, 8.7)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: perfTex.tex,
          emissiveMap: perfTex.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.7,
          roughness: 0.4,
        })
      )
    );
    perf.rotation.x = -Math.PI / 2;
    perf.position.set(dcCX + dx, 0.246, rackZMid);
    dcGroup.add(perf);
    // CRAC (aire de precisión) que alimenta el pasillo frío desde el extremo sur
    const crac = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.2, 2.3, 0.9)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.35 }))
    );
    crac.position.set(dcCX + dx, 1.4, dcCZ + 5.65);
    crac.castShadow = true;
    dcGroup.add(crac);
    const cracVent = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.0, 1.0)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.55, roughness: 0.5 }))
    );
    cracVent.rotation.y = Math.PI;
    cracVent.position.set(dcCX + dx, 1.0, dcCZ + 5.65 - 0.455);
    dcGroup.add(cracVent);
  });

  // Bandeja de cables aérea sobre el pasillo caliente (rieles, travesaños y haces de cables)
  const trayLen = 9.2;
  [-0.32, 0.32].forEach((rx) => {
    const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.09, trayLen)), dcFrameMat);
    rail.position.set(dcCX + rx, 3.2, rackZMid);
    dcGroup.add(rail);
  });
  for (let i = 0; i < 19; i++) {
    const rung = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.03, 0.04)), dcFrameMat);
    rung.position.set(dcCX, 3.17, rackZMid - trayLen / 2 + i * (trayLen / 18));
    dcGroup.add(rung);
  }
  [0x38bdf8, 0xf59e0b, 0x22c55e, 0xe11d48].forEach((c, i) => {
    const cable = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.07, 0.07, trayLen - 0.3)),
      trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }))
    );
    cable.position.set(dcCX - 0.24 + i * 0.16, 3.24, rackZMid);
    dcGroup.add(cable);
  });
  // Luminarias lineales sobre el pasillo caliente
  const stripMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 1.1 }));
  [-0.75, 0.75].forEach((lx) => {
    const strip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.03, 8.8)), stripMat);
    strip.position.set(dcCX + lx, 3.6, rackZMid);
    dcGroup.add(strip);
  });
  // Líneas de seguridad amarillas en el piso, junto a los racks
  const safetyMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 }));
  [-1.12, 1.12].forEach((lx) => {
    const line = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.012, 8.8)), safetyMat);
    line.position.set(dcCX + lx, 0.246, rackZMid);
    dcGroup.add(line);
  });

  // Seguridad: extintor y paro de emergencia junto a la entrada (fuera del hueco de la puerta)
  const extinguisher = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.3 }))
  );
  extinguisher.position.set(dcCX + 2.4, 0.5, dcCZ - DATACENTER.d / 2 + 0.35);
  const estop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.1)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.6 }))
  );
  estop.position.set(dcCX - 2.4, 1.3, dcCZ - DATACENTER.d / 2 + 0.2);
  dcGroup.add(extinguisher, estop);
  // Tanques de supresión de incendios junto al UPS
  [4.4, 5.1].forEach((tz) => {
    const tank = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.25, 0.25, 1.5, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.5 }))
    );
    tank.position.set(dcCX - DATACENTER.w / 2 + 0.55, 0.75, dcCZ + tz);
    dcGroup.add(tank);
  });

  // BATERÍAS INDUSTRIALES / SISTEMA UPS DE RESPALDO (Pared oeste)
  const upsCabinetMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.3 }));
  const upsMeterMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.0 }));
  [-2.5, -0.8, 0.8, 2.5].forEach((zOff) => {
    const ups = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 2.2, 1.1)), upsCabinetMat);
    ups.position.set(DATACENTER.cx - DATACENTER.w / 2 + 0.8, 1.1, DATACENTER.cz + zOff);
    ups.castShadow = true;
    dcGroup.add(ups);

    const meter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.25, 0.4)), upsMeterMat);
    meter.position.set(DATACENTER.cx - DATACENTER.w / 2 + 1.26, 1.6, DATACENTER.cz + zOff);
    dcGroup.add(meter);
  });

  // PANTALLAS DE MONITOREO CON DATOS REALES DEL EQUIPO
  addInfoScreen(
    dcGroup,
    DATACENTER.cx + DATACENTER.w / 2 - 0.12,
    2.4,
    DATACENTER.cz,
    -Math.PI / 2,
    6.4,
    2.66,
    'DATA CENTER · EQUIPO EN TIEMPO REAL',
    '#00f0ff',
    (g, x, y, w, h) => {
      const ag = officeStats.agents;
      drawKpis(g, x, y, w, h * 0.3, [
        ['ACTIVOS', `${ag.filter((a) => a.status === 'working').length}/${ag.length}`, '#10b981'],
        ['EJECUCIÓN', String(officeStats.stages.in_dev + officeStats.stages.sheldon_review), '#22d3ee'],
        ['TICKETS', String(totalTickets()), '#f59e0b'],
        ['PROYECTOS', String(officeStats.projects.length), '#a78bfa'],
      ]);
      drawBars(
        g,
        x,
        y + h * 0.36,
        w,
        h * 0.64,
        ag.map((a) => ({ label: a.name, value: a.ramKb, color: statusColor(a.status), text: Math.round(a.ramKb / 1024) + ' MB' })),
        Math.max(1, ...ag.map((a) => a.ramKb))
      );
    }
  );
  addInfoScreen(
    dcGroup,
    DATACENTER.cx - 4.6,
    2.4,
    DATACENTER.cz - DATACENTER.d / 2 + 0.12,
    0,
    3.8,
    2.2,
    'ESTADO DE AGENTES',
    '#10b981',
    (g, x, y, w, h) => {
      drawList(
        g,
        x,
        y,
        w,
        h,
        officeStats.agents.map((a) => `${a.name} · ${a.status} · ${a.task || 'sin tarea'}`),
        '#10b981',
        'Sin agentes conectados'
      );
    }
  );

  // Iluminación fría de Data Center
  const dcLight = new THREE.PointLight(0x00f0ff, 22, 22, 1.4);
  dcLight.position.set(DATACENTER.cx, 3.8, DATACENTER.cz);
  dcGroup.add(dcLight);

  // =========================================================================
  // OFICINA DEL CEO (Presidencia - El Despacho más Grande de la Oficina)
  // Ubicada al oeste de Sheldon y el Laboratorio (cx: -22.5, w: 18)
  // =========================================================================
  const ceoGroup = new THREE.Group();
  scene.add(ceoGroup);

  // Piso premium de nogal con textura de madera oscura
  const woodFloorTex = createWoodFloorTexture(maxAnisotropy, 8, 12);
  disposables.push(woodFloorTex);
  const ceoFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: woodFloorTex,
      roughness: 0.38,
      metalness: 0.08,
    })
  );
  const ceoFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(CEO_OFFICE.w, 0.2, CEO_OFFICE.d)),
    ceoFloorMat
  );
  ceoFloor.position.set(CEO_OFFICE.cx, 0.1, CEO_OFFICE.cz);
  ceoFloor.receiveShadow = true;
  ceoGroup.add(ceoFloor);

  // Paredes perimetrales de la Oficina del CEO
  // (Pared sur tiene la puerta abierta hacia el pasillo central horizontal z = -1.5)
  const ceoW = CEO_OFFICE.cx - CEO_OFFICE.w / 2;
  const ceoE = CEO_OFFICE.cx + CEO_OFFICE.w / 2;
  const ceoN = CEO_OFFICE.cz - CEO_OFFICE.d / 2;
  const ceoS = CEO_OFFICE.cz + CEO_OFFICE.d / 2;
  // Las paredes de vidrio (sur con puerta y divisoria con Sheldon) las dibuja el trazado común de oficinas,
  // igual que en las oficinas de Sheldon y Leonard: el CEO ya no tiene muros de vidrio propios extra.
  void ceoW; void ceoE; void ceoN; void ceoS;

  // Escritorio presidencial (4.4m x 2.0m): el CEO se sienta al norte y MIRA HACIA LA PUERTA (sur)
  const CX = CEO_OFFICE.cx;
  const CZ = CEO_OFFICE.cz;
  const DESK_Z = CZ - 1.7;
  const deskMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x271911, // Madera noble de caoba profunda
      roughness: 0.22,
      metalness: 0.12,
    })
  );
  const ceoDeskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.14, 2.0)), deskMat);
  ceoDeskTop.position.set(CX, 0.82, DESK_Z);
  ceoDeskTop.castShadow = true;
  ceoDeskTop.receiveShadow = true;
  ceoGroup.add(ceoDeskTop);

  // Faldón frontal (cara hacia la puerta) y patas laterales en aluminio oscuro con acento dorado
  const ceoLegMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.25, metalness: 0.9, emissive: 0x7a5a00, emissiveIntensity: 0.25 })
  );
  [-2.0, 2.0].forEach((xOff) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.75, 1.8)), ceoLegMat);
    leg.position.set(CX + xOff, 0.38, DESK_Z);
    leg.castShadow = true;
    ceoGroup.add(leg);
  });
  const deskFront = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.0, 0.62, 0.08)), deskMat);
  deskFront.position.set(CX, 0.42, DESK_Z + 0.88);
  ceoGroup.add(deskFront);
  const deskGold = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.04, 0.04)), goldMat);
  deskGold.position.set(CX, 0.76, DESK_Z + 1.0);
  ceoGroup.add(deskGold);

  // Badana de cuero con inserto de latón y teclado
  const deskPad = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.9, 0.015, 0.8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }))
  );
  deskPad.position.set(CX, 0.9, DESK_Z - 0.35);
  ceoGroup.add(deskPad);
  const ceoKb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.025, 0.2)), darkMetalMat);
  ceoKb.position.set(CX, 0.93, DESK_Z - 0.3);
  ceoGroup.add(ceoKb);

  // Monitor ultrawide con el dashboard ejecutivo (pantalla hacia el CEO, espalda hacia los visitantes)
  const ceoScreenTex = createInfoTex(1024, 335, 'DIRECCIÓN GENERAL', '#fbbf24', (g, x, y, w, h) => {
    drawKpis(g, x, y, w, h * 0.48, [
      ['EN CURSO', String(officeStats.stages.in_dev + officeStats.stages.sheldon_review), '#10b981'],
      ['A APROBAR', String(officeStats.stages.ceo_approval), '#38bdf8'],
      ['COMPLETADAS', String(officeStats.stages.completed), '#a78bfa'],
      ['CIERRE', closeRate() + '%', '#f59e0b'],
    ]);
    drawList(g, x, y + h * 0.54, w, h * 0.46, officeStats.approvalTitles, '#38bdf8', 'Nada pendiente de aprobación');
  });
  const ultrawideMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: ceoScreenTex,
      emissiveMap: ceoScreenTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.3,
    })
  );
  const ultrawideBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.7, 0.95, 0.06)), darkMetalMat);
  ultrawideBack.position.set(CX, 1.5, DESK_Z - 0.55);
  ceoGroup.add(ultrawideBack);
  const ultrawideScreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.6, 0.85)), ultrawideMat);
  ultrawideScreen.position.set(CX, 1.5, DESK_Z - 0.55 - 0.035);
  ultrawideScreen.rotation.y = Math.PI; // la pantalla mira al norte, hacia el CEO
  ceoGroup.add(ultrawideScreen);
  const monitorStand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 12)), brushedAlumMat);
  monitorStand.position.set(CX, 1.17, DESK_Z - 0.55);
  const monitorBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 0.04, 0.34)), darkMetalMat);
  monitorBase.position.set(CX, 0.92, DESK_Z - 0.55);
  ceoGroup.add(monitorStand, monitorBase);
  registerInfo([ceoDeskTop, ultrawideScreen, ultrawideBack, deskFront], {
    title: 'ESCRITORIO DEL CEO',
    section: 'Oficina del CEO',
    description: 'Aquí se muestra el panel de dirección: tareas en curso, pendientes de aprobación y completadas.',
    lines: () => [
      `Tareas en curso: ${officeStats.stages.in_dev + officeStats.stages.sheldon_review}`,
      `Pendientes de aprobación: ${officeStats.stages.ceo_approval}`,
      `Completadas: ${officeStats.stages.completed}`,
      ...officeStats.approvalTitles.map((t) => '• ' + t),
    ],
    images: () => canvasImages(ultrawideScreen),
    empty: noTeamData,
  });

  // Sillón presidencial de cuero tras el escritorio, de cara a la puerta
  const chairLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.45, metalness: 0.1 })
  );
  const ceoChair = new THREE.Group();
  ceoChair.position.set(CX, 0, DESK_Z - 1.55);
  ceoChair.rotation.y = 0; // el frente del sillón mira a +z (la puerta)
  const chairSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.78, 0.12, 0.72)), chairLeatherMat);
  chairSeat.position.y = 0.48;
  const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 1.0, 0.14)), chairLeatherMat);
  chairBack.position.set(0, 0.98, -0.32);
  const chairHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.24, 0.12)), chairLeatherMat);
  chairHead.position.set(0, 1.58, -0.32);
  [-1, 1].forEach((sx) => {
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.1, 0.55)), chairLeatherMat);
    arm.position.set(sx * 0.42, 0.78, 0);
    ceoChair.add(arm);
  });
  const chairStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 12)), brushedAlumMat);
  chairStem.position.y = 0.24;
  const chairBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8)), darkMetalMat);
  chairBase.position.y = 0.04;
  ceoChair.add(chairSeat, chairBack, chairHead, chairStem, chairBase);
  ceoGroup.add(ceoChair);

  // (El CEO es un personaje móvil: lo crea la vista 3D y se sienta aquí, mirando a la puerta)

  // 2 sillas de visita frente al escritorio (para Sheldon y Leonard), de cara al CEO
  const visitorChairMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 })
  );
  const buildVisitorChair = (x: number, z: number, yaw: number) => {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = yaw;
    const s = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.09, 0.6)), visitorChairMat);
    s.position.y = 0.45;
    const b = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 0.68, 0.09)), visitorChairMat);
    b.position.set(0, 0.8, -0.26);
    const leg1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8)), brushedAlumMat);
    leg1.position.set(-0.25, 0.22, -0.22);
    const leg2 = leg1.clone();
    leg2.position.x = 0.25;
    const leg3 = leg1.clone();
    leg3.position.set(-0.25, 0.22, 0.22);
    const leg4 = leg1.clone();
    leg4.position.set(0.25, 0.22, 0.22);
    chair.add(s, b, leg1, leg2, leg3, leg4);
    return chair;
  };
  ceoGroup.add(
    buildVisitorChair(CEO_VISITOR_SLOTS.chairSheldon.x, CEO_VISITOR_SLOTS.chairSheldon.z, CEO_VISITOR_SLOTS.chairSheldon.yaw),
    buildVisitorChair(CEO_VISITOR_SLOTS.chairLeonard.x, CEO_VISITOR_SLOTS.chairLeonard.z, CEO_VISITOR_SLOTS.chairLeonard.yaw)
  );

  // Alfombra presidencial bajo el área del escritorio y las sillas de visita
  addRug(ceoGroup, CX, CZ - 1.1, 7.0, 5.0, 0x1e1b4b);

  // Biblioteca de caoba en la pared norte, a ambos lados del rótulo (frente hacia el sur)
  [-6.6, -4.2, 4.2, 6.6].forEach((dx, i) => addBookcase(ceoGroup, CX + dx, CZ - CEO_OFFICE.d / 2 + 0.3, 0, 2.2, 3.2, i + 1));
  // Librerías en la pared oeste (frente hacia el este) y vitrina de trofeos en la este
  [-3.9, -0.5].forEach((dz) => addBookcase(ceoGroup, CX - CEO_OFFICE.w / 2 + 0.3, CZ + dz, Math.PI / 2, 3.0, 3.0));
  // Pared derecha (compartida con Sheldon): libreros del CEO dentro de su oficina, con el frente hacia el CEO
  [-3.9, -0.5].forEach((dz) => addBookcase(ceoGroup, CX + CEO_OFFICE.w / 2 - 0.3, CZ + dz, -Math.PI / 2, 3.0, 3.0));

  // Aparador de caoba tras el sillón con las figuras coleccionables
  const credenza = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.8, 0.55)), deskMat);
  credenza.position.set(CX, 0.4, CZ - CEO_OFFICE.d / 2 + 1.0);
  credenza.castShadow = true;
  ceoGroup.add(credenza);
  const CRED_Y = 0.8;
  const CRED_Z = CZ - CEO_OFFICE.d / 2 + 1.0;

  // 1) Mecha robot de anime
  const mechaGroup = new THREE.Group();
  mechaGroup.position.set(CX - 1.3, CRED_Y + 0.14, CRED_Z);
  const mechaBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.28, 0.14)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.8, roughness: 0.2 }))
  );
  const mechaHead = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.1, 0.1, 0.1)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 }))
  );
  mechaHead.position.y = 0.2;
  const mechaWings = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.22, 0.04)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7 }))
  );
  mechaWings.position.set(0, 0.1, -0.06);
  mechaGroup.add(mechaBody, mechaHead, mechaWings);
  ceoGroup.add(mechaGroup);

  // 2) Monolito sci-fi
  const monolith = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.48, 0.12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.05, metalness: 0.95 }))
  );
  monolith.position.set(CX + 1.3, CRED_Y + 0.24, CRED_Z);
  ceoGroup.add(monolith);

  // 3) Cubo de red neuronal holográfica de IA
  const aiHoloCube = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 0.26, 0.26)),
    trackMat(
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.85, wireframe: true })
    )
  );
  aiHoloCube.position.set(CX, CRED_Y + 0.4, CRED_Z);
  spinners.push(aiHoloCube);
  ceoGroup.add(aiHoloCube);

  // Globo terráqueo y trofeo sobre el escritorio
  const globe = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.2, 20, 14)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.2 }))
  );
  globe.position.set(CX - 1.7, 1.14, DESK_Z - 0.3);
  const globeBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.13, 0.05, 12)), goldMat);
  globeBase.position.set(CX - 1.7, 0.92, DESK_Z - 0.3);
  ceoGroup.add(globe, globeBase);
  const ceoTrophy = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.05, 0.3, 12)), goldMat);
  ceoTrophy.position.set(CX + 1.7, 1.07, DESK_Z - 0.3);
  ceoGroup.add(ceoTrophy);

  // Zona lounge en la esquina suroeste (lejos de la puerta): sofá, butacas y mesa de centro
  addRug(ceoGroup, CX - 5.2, CZ + 3.6, 5.4, 3.6, 0x312e81, 0xa78bfa);
  addSofa(ceoGroup, CX - 5.2, CZ + 5.0, Math.PI, 3.6);
  addCoffeeTable(ceoGroup, CX - 5.2, CZ + 3.4, 2.0, 1.0);
  addSofa(ceoGroup, CX - 7.6, CZ + 3.4, Math.PI / 2, 1.3, 0x7c2d12);
  addSofa(ceoGroup, CX - 2.8, CZ + 3.4, -Math.PI / 2, 1.3, 0x7c2d12);
  addInfoScreen(ceoGroup, CX - CEO_OFFICE.w / 2 + 0.12, 2.0, CZ + 4.7, Math.PI / 2, 2.0, 1.3, 'INDICADORES', '#fbbf24', (g, x, y, w, h) => {
    drawBars(
      g,
      x,
      y,
      w,
      h,
      STAGE_META.map(([k, label, color]) => ({ label, value: officeStats.stages[k], color })),
      Math.max(1, ...STAGE_META.map(([k]) => officeStats.stages[k]))
    );
  });

  // Rincón de reuniones informal en la esquina sureste: mesa redonda y 4 sillas
  const roundTable = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 28)), deskMat);
  roundTable.position.set(CX + 5.6, 0.76, CZ + 3.4);
  const roundStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.16, 0.74, 12)), ceoLegMat);
  roundStem.position.set(CX + 5.6, 0.37, CZ + 3.4);
  ceoGroup.add(roundTable, roundStem);
  [0, 1, 2, 3].forEach((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ceoGroup.add(buildVisitorChair(CX + 5.6 + Math.sin(a) * 1.5, CZ + 3.4 + Math.cos(a) * 1.5, a + Math.PI));
  });

  // Lámparas de pie
  addFloorLamp(ceoGroup, CX - 3.4, DESK_Z - 1.9);
  addFloorLamp(ceoGroup, CX + 3.4, DESK_Z - 1.9);
  addFloorLamp(ceoGroup, CX - 7.8, CZ + 1.7);
  addInfoScreen(ceoGroup, CX - CEO_OFFICE.w / 2 + 0.12, 2.0, CZ + 2.3, Math.PI / 2, 2.0, 1.3, 'APROBACIONES CEO', '#38bdf8', (g, x, y, w, h) => {
    drawList(g, x, y, w, h, officeStats.approvalTitles, '#38bdf8', 'Sin aprobaciones pendientes');
  });

  // Rótulo "OFICINA DEL CEO" en la pared del despacho
  const ceoSignCt = makeCanvasTex(1200, 360);
  {
    const g = ceoSignCt.ctx;
    g.fillStyle = '#0b0f19';
    g.fillRect(0, 0, 1200, 360);
    g.fillStyle = '#fbbf24';
    g.fillRect(0, 0, 1200, 14);
    g.textAlign = 'center';
    g.fillStyle = '#f8fafc';
    g.font = 'bold 88px sans-serif';
    g.fillText('OFICINA DEL CEO', 600, 180);
    g.fillStyle = '#fbbf24';
    g.font = '36px sans-serif';
    g.fillText('DIRECCIÓN GENERAL · FLOWCLIC OFICINA IA', 600, 260);
    ceoSignCt.tex.needsUpdate = true;
  }
  const ceoSign = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.8, 1.44)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: ceoSignCt.tex,
        emissiveMap: ceoSignCt.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.75,
      })
    )
  );
  ceoSign.position.set(CEO_OFFICE.cx, 3.2, CEO_OFFICE.cz - CEO_OFFICE.d / 2 + 0.14);
  ceoGroup.add(ceoSign);

  // Iluminación cálida y lujosa de la Oficina del CEO
  const ceoChandelier = new THREE.PointLight(0xfef08a, 26, 28, 1.5);
  ceoChandelier.position.set(CEO_OFFICE.cx, 5.0, CEO_OFFICE.cz);
  ceoGroup.add(ceoChandelier);

  const ceoDeskSpot = new THREE.SpotLight(0xfffbeb, 42, 22, Math.PI / 4, 0.45, 1.4);
  ceoDeskSpot.position.set(CEO_OFFICE.cx, 6.2, CEO_OFFICE.cz - 1.7);
  ceoDeskSpot.target.position.set(CEO_OFFICE.cx, 0.8, CEO_OFFICE.cz - 1.7);
  ceoGroup.add(ceoDeskSpot, ceoDeskSpot.target);

  // =========================================================================
  // SALA DE JUNTAS: lámparas de pie
  // =========================================================================
  addFloorLamp(rootScene, BOARDROOM.cx - BOARDROOM.w / 2 + 1.1, BOARDROOM.cz + 4.6);
  addFloorLamp(rootScene, BOARDROOM.cx + BOARDROOM.w / 2 - 1.1, BOARDROOM.cz + 2.0);

  scene = rootScene;
  const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
  scene.add(hemiLight);

  // Primary directional key light (casts crisp soft shadows across diorama)
  const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.25);
  keyLight.position.set(18, 28, 22);
  keyLight.target.position.set(7, 0, 0);
  scene.add(keyLight.target);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 75;
    keyLight.shadow.camera.left = -27;
    keyLight.shadow.camera.right = 27;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.025;
  }
  scene.add(keyLight);

  // Laboratorio: Cool Cyan Monitor Lab Glow
  const labLight = new THREE.PointLight(0x06b6d4, 22, 22, 1.5);
  labLight.position.set(-13.5, 4.2, 0.2);
  labGroup.add(labLight);

  // Oficina de Sheldon: Focal SpotLight on Whiteboard & Architecture Table
  const sheldonSpot = new THREE.SpotLight(
    0xfffbeb,
    38,
    24,
    Math.PI / 4.2,
    0.55,
    1.5
  );
  sheldonSpot.position.set(0.2, 9.2, 1.5);
  sheldonSpot.target.position.set(0.2, 1.2, -5.5);
  sheldonGroup.add(sheldonSpot, sheldonSpot.target);

  // Zona de descanso: Luz ambiental suave y cálida tipo lounge
  const loungeWarmLight = new THREE.PointLight(0xfde68a, 16, 18, 1.4);
  loungeWarmLight.position.set(10.2, 3.6, 0.5);
  loungeGroup.add(loungeWarmLight);

  return {
    dnaHelix,
    holoOrb,
    spinners,
    setProjects,
    setSelectedProject,
    getPickables,
    resolvePick,
    getInfoPickables: () => infoPickables,
    resolveInfo,
    setLabDesks,
    setLabBoards,
    setOfficeStats,
    setBoardroomSeats,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
