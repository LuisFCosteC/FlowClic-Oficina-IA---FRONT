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
}

// ---------------------------------------------------------------------------
// Distribución Arquitectónica FlowClic Oficina IA:
//   - Ala Norte (Fondo):
//       * Extremo Izquierdo: OFICINA DEL CEO (cx: -23.5, cz: -7.7, w: 16, d: 12.4)
//       * Centro Izquierdo:  OFICINA DE SHELDON (cx: -7.5, cz: -7.7, w: 12, d: 12.4) -> PEGADA AL CEO
//       * Centro Derecho:    OFICINA DEL SENIOR (cx: 7.5, cz: -7.7, w: 12, d: 12.4)
//       * Extremo Derecho:   SALA DE JUNTAS (cx: 21.5, cz: -7.7, w: 14, d: 12.4) -> AL LADO DEL SENIOR
//   - Pasillo Horizontal Central (z = 0, CORRIDOR_W = 3) con el logo central
//   - Ala Sur (Frente):
//       * Izquierda completa: LABORATORIO EXPANDIDO (cx: -15.5, cz: 7.7, w: 28, d: 12.4) -> 20 PUESTOS DE TRABAJO,
//                              ubicado enfrente de la Oficina de Sheldon y la Oficina del CEO.
//       * Centro Derecho:    ZONA DE DESCANSO (cx: 7.5, cz: 7.7, w: 12, d: 12.4)
//       * Extremo Derecho:   DATA CENTER (cx: 21.5, cz: 7.7, w: 14, d: 12.4) -> AL FRENTE DE SALA DE JUNTAS Y AL LADO DE DESCANSO
// ---------------------------------------------------------------------------
export const ROOM_W = 12;
export const ROOM_D = 12.4;
export const CORRIDOR_W = 3;
export const ROOM_CX = CORRIDOR_W / 2 + ROOM_W / 2; // 7.5
export const ROOM_CZ = CORRIDOR_W / 2 + ROOM_D / 2; // 7.7

// Centro original de cada zona (coordenadas con las que está escrito el mobiliario base)
const ORIG = {
  laboratorio: { x: -9.1, z: -0.2 },
  sheldon: { x: 0.2, z: -0.2 },
  descanso: { x: 9.45, z: -0.2 },
};
const offsetTo = (orig: { x: number; z: number }, cx: number, cz: number) => ({
  dx: cx - orig.x,
  dz: cz - orig.z,
});

// El laboratorio expandido tiene su centro en x = -15.5, z = 7.7
export const ZONE_OFFSETS = {
  laboratorio: offsetTo(ORIG.laboratorio, -15.5, ROOM_CZ),
  sheldon: offsetTo(ORIG.sheldon, -ROOM_CX, -ROOM_CZ),
  descanso: offsetTo(ORIG.descanso, ROOM_CX, ROOM_CZ),
};

type Offset = { dx: number; dz: number };
const shiftSlot = (s: ZoneSlot, o: Offset): ZoneSlot => ({ ...s, x: s.x + o.dx, z: s.z + o.dz });

// Laboratorio: 20 Workstations ampliadas (5 columnas x 4 filas frente a monitores)
// con pasillos amplios de tránsito
const RAW_WORKSTATION_SLOTS: ZoneSlot[] = [
  // Fila 1 (Norte)
  { x: -19.5, z: -3.8, yaw: Math.PI },
  { x: -16.5, z: -3.8, yaw: Math.PI },
  { x: -13.5, z: -3.8, yaw: Math.PI },
  { x: -10.5, z: -3.8, yaw: Math.PI },
  { x: -7.5, z: -3.8, yaw: Math.PI },

  // Fila 2
  { x: -19.5, z: -1.2, yaw: Math.PI },
  { x: -16.5, z: -1.2, yaw: Math.PI },
  { x: -13.5, z: -1.2, yaw: Math.PI },
  { x: -10.5, z: -1.2, yaw: Math.PI },
  { x: -7.5, z: -1.2, yaw: Math.PI },

  // Fila 3
  { x: -19.5, z: 1.4, yaw: Math.PI },
  { x: -16.5, z: 1.4, yaw: Math.PI },
  { x: -13.5, z: 1.4, yaw: Math.PI },
  { x: -10.5, z: 1.4, yaw: Math.PI },
  { x: -7.5, z: 1.4, yaw: Math.PI },

  // Fila 4 (Sur)
  { x: -19.5, z: 4.0, yaw: Math.PI },
  { x: -16.5, z: 4.0, yaw: Math.PI },
  { x: -13.5, z: 4.0, yaw: Math.PI },
  { x: -10.5, z: 4.0, yaw: Math.PI },
  { x: -7.5, z: 4.0, yaw: Math.PI },
];

// Oficina de Sheldon: Work & Review Hub (Apartamento 4A)
// CTO: se sienta en su escritorio al trabajar, se para frente a los tableros al revisar
// y descansa en el sofá del costado.
const RAW_SHELDON_DESK_SLOT: ZoneSlot = { x: 0.2, z: -0.38, yaw: Math.PI };
const RAW_SHELDON_BOARD_SLOT: ZoneSlot = { x: 0.2, z: -4.75, yaw: Math.PI };
const RAW_SHELDON_SOFA_SLOT: ZoneSlot = { x: 5.45, z: 2.2, yaw: -Math.PI / 2 };

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
const RAW_LOUNGE_SLOTS: ZoneSlot[] = [
  { x: 7.4, z: -0.4, yaw: 0 }, // Sofa left
  { x: 8.8, z: -0.4, yaw: 0 }, // Sofa center
  { x: 10.2, z: -0.4, yaw: 0 }, // Sofa right (Sheldon's spot!)
  { x: 6.2, z: 1.7, yaw: -Math.PI * 0.35 }, // Armchair
  { x: 11.7, z: 1.8, yaw: Math.PI * 0.4 }, // Near coffee table / TV
  { x: 7.1, z: -4.2, yaw: 0 }, // Bunk pod 1
  { x: 9.8, z: -4.2, yaw: 0 }, // Bunk pod 2
  { x: 12.2, z: -3.6, yaw: Math.PI * 0.7 }, // Near DNA sculpture / books
  { x: 7.8, z: 4.1, yaw: Math.PI }, // Lounge mat 1
  { x: 10.4, z: 4.1, yaw: Math.PI }, // Lounge mat 2
  { x: 12.4, z: -0.6, yaw: Math.PI * 0.5 }, // Bookshelf reading
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

/** Puertas de cada oficina hacia el pasillo horizontal (z = ±1.5). */
export const DOORS = {
  sheldon: { x: -ROOM_CX, z: -CORRIDOR_W / 2 },
  senior: { x: ROOM_CX, z: -CORRIDOR_W / 2 },
  junta: { x: 21.5, z: -CORRIDOR_W / 2 },
  laboratorio: { x: -15.5, z: CORRIDOR_W / 2 },
  descanso: { x: ROOM_CX, z: CORRIDOR_W / 2 },
  ceo: { x: -23.5, z: -CORRIDOR_W / 2 },
  datacenter: { x: 21.5, z: CORRIDOR_W / 2 },
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
export const BOARDROOM = { cx: 21.5, cz: -ROOM_CZ, w: 14, d: ROOM_D };

// Data Center: Al frente de la Sala de Juntas y al lado de la Zona de Descanso en el ala sur (cx: 21.5, cz: ROOM_CZ)
export const DATACENTER = { cx: 21.5, cz: ROOM_CZ, w: 14, d: ROOM_D };

// Oficina del CEO: Pegada a la oficina de Sheldon en el ala norte (cx: -23.5, cz: -ROOM_CZ)
export const CEO_OFFICE = { cx: -23.5, cz: -ROOM_CZ, w: 16, d: ROOM_D };

// Dimensiones del Laboratorio expandido a mano izquierda
export const LAB_EXPANDED = { cx: -15.5, cz: ROOM_CZ, w: 28, d: ROOM_D };

// Slots de visita frente al escritorio del CEO donde vienen Sheldon y Leonard a esperar aprobaciones
export const CEO_VISITOR_SLOTS = {
  chairSheldon: { x: -23.6, z: -ROOM_CZ - 1.25, yaw: -Math.PI / 2 } as ZoneSlot,
  chairLeonard: { x: -23.6, z: -ROOM_CZ + 1.25, yaw: -Math.PI / 2 } as ZoneSlot,
};

const SEAT_SPACING = 1.15;
export function boardroomLayout(n: number) {
  const perSide = Math.ceil(Math.max(0, n - 1) / 2);
  return { perSide, L: Math.max(3, perSide * SEAT_SPACING + 0.6) };
}
/** Asientos de la sala de juntas. El 0 es la cabecera (CTO); el resto, a los lados de la mesa. */
export function boardroomSeats(n: number): ZoneSlot[] {
  const { perSide, L } = boardroomLayout(n);
  const seats: ZoneSlot[] = [];
  if (n >= 1) seats.push({ x: BOARDROOM.cx + L / 2 + 0.9, z: BOARDROOM.cz, yaw: -Math.PI / 2 });
  for (let i = 0; i < n - 1; i++) {
    const north = i % 2 === 0;
    const k = Math.floor(i / 2);
    seats.push({
      x: BOARDROOM.cx - ((perSide - 1) * SEAT_SPACING) / 2 + k * SEAT_SPACING,
      z: BOARDROOM.cz + (north ? -1.35 : 1.35),
      yaw: north ? 0 : Math.PI,
    });
  }
  return seats;
}

// Oficina del Senior (grupo en ROOM_CX, -ROOM_CZ)
export const SENIOR_DESK_SLOT: ZoneSlot = { x: ROOM_CX, z: -ROOM_CZ - 0.48, yaw: Math.PI };
export const SENIOR_POUF_SLOT: ZoneSlot = { x: ROOM_CX + 3.8, z: -ROOM_CZ + 1.8, yaw: Math.PI };

/**
 * Ruta (coordenadas del mundo) para que un agente del laboratorio vaya a entregar su tarea
 * al tablero 1, tome la nueva en el tablero 2 y vuelva a su puesto sin atravesar los escritorios.
 */
export function labTaskSwapPath(deskIdx: number): Array<{ x: number; z: number }> {
  const o = ZONE_OFFSETS.laboratorio;
  const d = RAW_WORKSTATION_SLOTS[deskIdx];
  const gx = d.x + 1.25; // pasillo libre entre columnas de escritorios
  const rowZ = -5.2;
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
    ...fidget(-11.6),
    ...fidget(-6.6),
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
    title: 'OFICINA DEL SENIOR',
    subtitle: 'Desarrollo Full-Stack',
    pos: new THREE.Vector3(ROOM_CX, 3.3, -ROOM_CZ - ROOM_D / 2 + 0.8),
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
    pos: new THREE.Vector3(ROOM_CX, 3.3, CORRIDOR_W / 2 + 0.6),
    accent: '#FB923C',
  },
];

export interface BoardProject {
  name: string;
  total: number;
  done: number;
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
  // Abarca todo el complejo: desde x = -32.5 (CEO / Lab) hasta x = 29.5 (Juntas / Data Center)
  // y z = -14.5 a 14.5
  const FULL_W = 62;
  const FULL_D = 29;
  const platform = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(FULL_W, 0.44, FULL_D)),
    baseSlabMat
  );
  platform.position.set(-1.5, -0.22, 0);
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
  frontTrim.position.set(-1.5, -0.02, FULL_D / 2 + 0.04);
  scene.add(frontTrim);

  // Back Architectural Wall
  const backWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(FULL_W + 0.2, 4.1, 0.28)),
    backWallMat
  );
  backWall.position.set(-1.5, 2.05, -FULL_D / 2 - 0.14);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Particiones de cristal en los bordes del pasillo (con puertas abiertas a cada oficina)
  const addGlassWall = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) return;
    const yaw = Math.atan2(-(z2 - z1), x2 - x1);
    const wall = new THREE.Group();
    wall.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    wall.rotation.y = yaw;
    const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(len, 3.0, 0.1)), glassWallMat);
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
  // Pared frontal norte de oficinas (z = -HC = -1.5) con puertas a cada una
  // Oficinas norte: CEO (cx: -23.5), Sheldon (cx: -7.5), Senior (cx: 7.5), Juntas (cx: 21.5)
  [-23.5, -7.5, 7.5, 21.5].forEach((cx) => {
    const halfW = cx === -23.5 ? 8 : cx === 21.5 ? 7 : ROOM_W / 2;
    addGlassWall(cx - halfW, -HC, cx - DOOR_HALF, -HC);
    addGlassWall(cx + DOOR_HALF, -HC, cx + halfW, -HC);
  });
  // Pared frontal sur de oficinas (z = HC = 1.5) con puertas a cada una
  // Oficinas sur: Lab (cx: -15.5, w: 28), Descanso (cx: 7.5, w: 12), Data Center (cx: 21.5, w: 14)
  // Lab
  addGlassWall(-29.5, HC, -15.5 - DOOR_HALF, HC);
  addGlassWall(-15.5 + DOOR_HALF, HC, -1.5, HC);
  // Descanso
  addGlassWall(1.5, HC, 7.5 - DOOR_HALF, HC);
  addGlassWall(7.5 + DOOR_HALF, HC, 13.5, HC);
  // Data Center
  addGlassWall(14.5, HC, 21.5 - DOOR_HALF, HC);
  addGlassWall(21.5 + DOOR_HALF, HC, 28.5, HC);

  // Paredes divisorias entre oficinas:
  // Norte (z ∈ [-14.5, -1.5]):
  addGlassWall(-15.5, -14.5, -15.5, -HC); // Entre CEO y Sheldon (pared divisoria con puerta)
  addGlassWall(-1.5, -14.5, -1.5, -HC);  // Entre Sheldon y pasillo central
  addGlassWall(1.5, -14.5, 1.5, -HC);   // Entre pasillo central y Senior
  addGlassWall(13.5, -14.5, 13.5, -HC);  // Entre Senior y Sala de Juntas
  // Sur (z ∈ [1.5, 14.5]):
  addGlassWall(-1.5, HC, -1.5, 14.5);   // Límite este del Laboratorio
  addGlassWall(1.5, HC, 1.5, 14.5);    // Límite oeste de Descanso
  addGlassWall(13.5, HC, 13.5, 14.5);   // Entre Descanso y Data Center

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
  corridorH.position.set(-1.5, 0.012, 0);
  corridorH.receiveShadow = true;

  const corridorV = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(CORRIDOR_W, FULL_D)), corridorMat);
  corridorV.rotation.x = -Math.PI / 2;
  corridorV.position.set(0, 0.012, 0);
  corridorV.receiveShadow = true;
  scene.add(corridorH, corridorV);

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
  logoPlane.position.set(0, 0.02, 0);
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
  seniorGroup.position.set(ROOM_CX, 0, -ROOM_CZ);
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
  const projectListeners: Array<() => void> = [];
  const spinners: THREE.Object3D[] = [];

  const clipText = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  const BOARD_W_LAB = 3.2;
  const BOARD_H_LAB = 1.9;
  const labDeskTex: Array<{ plate: CTex; note: CTex }> = [];
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

    // 1. Desk tabletop
    const top = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.75, 0.07, 0.82)),
      deskTopMat
    );
    top.position.y = 0.74;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 2. Brushed aluminum desk legs
    const legGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.72, 0.68));
    const leftLeg = new THREE.Mesh(legGeo, brushedAlumMat);
    leftLeg.position.set(-0.78, 0.36, 0);
    const rightLeg = new THREE.Mesh(legGeo, brushedAlumMat);
    rightLeg.position.set(0.78, 0.36, 0);
    group.add(leftLeg, rightLeg);

    // 3. Dual glowing monitors (angled slightly inward)
    const screenTex = monitorTextures[idx % monitorTextures.length];
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
    const bezelGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.42, 0.035));
    const displayGeo = trackGeo(new THREE.PlaneGeometry(0.63, 0.36));

    [-0.36, 0.36].forEach((mx, mIdx) => {
      const monitor = new THREE.Group();
      monitor.position.set(mx, 1.06, -0.2);
      monitor.rotation.y = mIdx === 0 ? 0.18 : -0.18;

      const bezel = new THREE.Mesh(bezelGeo, darkMetalMat);
      bezel.castShadow = true;
      monitor.add(bezel);

      const display = new THREE.Mesh(displayGeo, screenMat);
      display.position.z = 0.02;
      monitor.add(display);

      const stand = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.24, 8)),
        brushedAlumMat
      );
      stand.position.set(0, -0.22, -0.02);
      monitor.add(stand);

      group.add(monitor);
    });

    // 4. Mechanical keyboard with cyan glow rim
    const kb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.46, 0.025, 0.16)),
      darkMetalMat
    );
    kb.position.set(0, 0.79, 0.12);
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
      plateMesh.position.set(0, 0.79, 0.3);
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
      noteMesh.position.set(0.66, 1.02, 0.12);
      noteMesh.rotation.set(-0.35, -0.3, 0);
      group.add(noteMesh);
      drawLabDesk(labelIdx, null);
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
  // Servidores de ejecución y almacenamiento en el lateral izquierdo del laboratorio expandido
  const LAB_RACK_X = -22.5;
  const labRackZs = [-5.0, -3.65, -2.3, -0.95, 0.4, 1.75, 3.1, 4.45];
  labRackZs.forEach((rz) => buildRackAt(LAB_RACK_X, rz, Math.PI / 2, serverFaceMat, darkMetalMat));
  addSign('EJECUCIÓN', LAB_RACK_X + 0.5, 3.0, -2.975, Math.PI / 2, 4.6, '#22d3ee');
  addSign('ALMACENAMIENTO', LAB_RACK_X + 0.5, 3.0, 2.425, Math.PI / 2, 4.6, '#f59e0b');

  // 2 tableros grandes: entregar la tarea terminada y tomar la nueva
  const labBoardXs = [-17.5, -9.5];
  const labBoardTitles = ['ENTREGAR · EN CURSO', 'TOMAR TAREA · BACKLOG'];
  const labBoardColors = ['#10b981', '#f59e0b'];
  const labBoards = labBoardXs.map((bx) => {
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
    for (let i = 0; i < 9; i++) drawLabDesk(i, entries[i] ?? null);
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
  const BOARD_W = 3.2;
  const BOARD_H = 1.9;
  const BOARD_Y = 1.9;
  const BOARD_Z = -6.28;
  const BOARD_PX_W = 1024;
  const BOARD_PX_H = 608;
  const BOARD_HEAD = 96;
  const BOARD_ROW = 84;
  const BOARD_ROWS = 6;
  const boardXs = [-3.5, 0.2, 3.9];
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
  buildBookcase(-5.5, -3.2, Math.PI / 2);
  buildBookcase(-5.5, 1.6, Math.PI / 2);
  buildBookcase(5.95, -3.2, -Math.PI / 2);

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
  zoneCBar.position.set(9.45, 0.03, 6.85);
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
  const counterBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.6, 0.94, 0.92)),
    darkCabinetMat
  );
  counterBase.position.y = 0.47;
  counterBase.castShadow = true;
  breakfastBar.add(counterBase);

  const counterTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.75, 0.06, 0.98)),
    whiteMarbleMat
  );
  counterTop.position.y = 0.97;
  counterTop.castShadow = true;
  breakfastBar.add(counterTop);

  // A) Máquina de café espresso comercial (lado izquierdo de la barra)
  const espressoMachine = new THREE.Group();
  espressoMachine.position.set(-2.0, 1.0, 0);

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
  grinder.position.set(-1.15, 1.0, -0.05);
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
    cup.position.set(-0.6 + i * 0.16, 1.04, 0.26);
    breakfastBar.add(cup);
  });

  // B) Zona de preparación de desayuno: tostadora y tostadas
  const toaster = new THREE.Group();
  toaster.position.set(0.35, 1.0, 0.05);
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
  juiceDispenser.position.set(1.15, 1.0, 0.02);
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
  pastryTray.position.set(1.95, 1.0, 0.1);
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
  bPlate.position.set(2.7, 1.01, 0.05);
  // Yema de huevo
  const eggYolk = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.035, 10, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }))
  );
  eggYolk.position.set(2.7, 1.035, 0.05);
  breakfastBar.add(bPlate, eggYolk);

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
    station.position.set(stationX, 0, 5.9);

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
      poufGroup.position.set(stationX + px, 0, 5.9 + pz);
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
  // 4. PLANTAS DECORATIVAS Y LÁMPARA AMBIENTAL
  // -------------------------------------------------------------------------
  const buildIndoorPlant = (px: number, pz: number, plantHeight: number) => {
    const pot = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.46, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }))
    );
    pot.position.set(px, 0.23, pz);
    pot.castShadow = true;
    scene.add(pot);

    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.03, 0.04, plantHeight, 8)),
      oakLegMat
    );
    trunk.position.set(px, 0.46 + plantHeight / 2, pz);
    scene.add(trunk);

    const leafGeo = trackGeo(new THREE.SphereGeometry(0.26, 8, 8));
    const leafMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 })
    );
    [
      [0, plantHeight, 0, 1.0],
      [0.15, plantHeight * 0.8, 0.1, 0.85],
      [-0.14, plantHeight * 0.7, -0.12, 0.8],
      [0.12, plantHeight * 0.55, -0.15, 0.75],
    ].forEach(([lx, ly, lz, scale]) => {
      const cluster = new THREE.Mesh(leafGeo, leafMat);
      cluster.scale.set(scale, scale * 0.75, scale);
      cluster.position.set(px + lx, 0.46 + ly, pz + lz);
      scene.add(cluster);
    });
  };

  buildIndoorPlant(5.4, -4.8, 0.95);
  buildIndoorPlant(13.6, -4.8, 1.1);
  buildIndoorPlant(13.6, 6.0, 1.15);
  buildIndoorPlant(5.4, 6.0, 0.9);

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
  // OFICINA DEL SENIOR FULL-STACK
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

  // 2 servidores de almacenamiento con todo lo de cada proyecto (pared izquierda)
  buildRackAt(-5.45, -3.6, Math.PI / 2, serverFaceMat, darkMetalMat);
  buildRackAt(-5.45, -2.2, Math.PI / 2, serverFaceMat, darkMetalMat);
  addSign('ALMACENAMIENTO · PROYECTOS', -4.95, 3.0, -2.9, Math.PI / 2, 3.4, '#a78bfa');

  buildIndoorPlant(-4.6, -5.3, 1.0);
  buildIndoorPlant(4.6, -5.3, 0.9);

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
  addSign('</> IA', -4.0, 2.4, -ROOM_D / 2 + 0.16, 0, 2.0, '#22d3ee');

  const seniorLight = new THREE.PointLight(0xc4b5fd, 12, 15, 1.5);
  seniorLight.position.set(0, 4.0, 0);
  seniorGroup.add(seniorLight);

  // =========================================================================
  // SALA DE JUNTAS: al lado de la Oficina del Senior en el ala norte
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

  // Libreros de archivo de actas de juntas generales (pared norte/este)
  const brBookcaseMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.2 }));
  const brLedgerColors = [0x1e3a8a, 0x155e75, 0x0f766e, 0x334155, 0x0369a1];
  [-4.0, 4.0].forEach((bx) => {
    const bookcase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 3.2, 0.9)), brBookcaseMat);
    bookcase.position.set(BR.cx + bx, 1.6, BR.cz - BR.d / 2 + 0.55);
    bookcase.castShadow = true;
    scene.add(bookcase);

    // Carpetas / libros encuadernados de "ACTAS DE JUNTA GENERAL"
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 9; k++) {
        const ledgerMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: brLedgerColors[(row * 9 + k) % brLedgerColors.length],
            roughness: 0.3,
          })
        );
        const binder = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.46, 0.1)), ledgerMat);
        binder.position.set(
          BR.cx + bx - 1.45 + k * 0.36,
          0.65 + row * 0.72,
          BR.cz - BR.d / 2 + 0.62
        );
        scene.add(binder);
      }
    }
  });

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
  scene.add(brScreen);
  const brLight = new THREE.PointLight(0xbfdbfe, 14, 18, 1.5);
  brLight.position.set(BR.cx, 4.0, BR.cz);
  scene.add(brLight);

  // Mesa y sillas: se reconstruyen según el número de agentes (una silla por agente)
  const brSeatsGroup = new THREE.Group();
  scene.add(brSeatsGroup);
  const brTableGeo = trackGeo(new THREE.BoxGeometry(1, 0.08, 1.7));
  const brLegGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.72, 1.3));
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
  setBoardroomSeats(0);

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

  // FILAS DE SERVIDORES CENTRALIZADOS (Servidores de Cómputo, Almacenamiento y Clusters)
  const rackTexture = createServerRackTexture(maxAnisotropy);
  disposables.push(rackTexture);
  const rackFrontMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rackTexture,
      emissiveMap: rackTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.5,
    })
  );
  const rackSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      roughness: 0.4,
      metalness: 0.8,
    })
  );
  const rackMaterials = [rackSideMat, rackSideMat, rackSideMat, rackSideMat, rackFrontMat, rackSideMat];
  const rackGeo = trackGeo(new THREE.BoxGeometry(1.0, 2.6, 1.1));

  // 3 pasillos con racks de 42U para albergar toda la infraestructura del complejo
  [-3.2, 0, 3.2].forEach((rackZOffset, rowIdx) => {
    [-4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5].forEach((rackXOffset) => {
      const rack = new THREE.Mesh(rackGeo, rackMaterials);
      rack.position.set(DATACENTER.cx + rackXOffset, 1.42, DATACENTER.cz + rackZOffset);
      if (rackZOffset > 0) rack.rotation.y = Math.PI;
      rack.castShadow = true;
      rack.receiveShadow = true;
      dcGroup.add(rack);

      // Indicadores LED estatus
      const ledPillMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: rowIdx === 0 ? 0x10b981 : rowIdx === 1 ? 0x00f0ff : 0xf59e0b,
          emissive: rowIdx === 0 ? 0x10b981 : rowIdx === 1 ? 0x00f0ff : 0xf59e0b,
          emissiveIntensity: 1.2,
        })
      );
      const ledPill = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8)), ledPillMat);
      ledPill.position.set(DATACENTER.cx + rackXOffset, 2.76, DATACENTER.cz + rackZOffset + (rackZOffset > 0 ? -0.52 : 0.52));
      dcGroup.add(ledPill);
    });
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

  // Ductos aéreos HVAC y bandejas de fibra óptica
  const hvacMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 }));
  const hvacPipe = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.24, DATACENTER.w - 1, 16)),
    hvacMat
  );
  hvacPipe.rotation.z = Math.PI / 2;
  hvacPipe.position.set(DATACENTER.cx, 3.4, DATACENTER.cz);
  dcGroup.add(hvacPipe);

  // GRAN PANTALLA GIGANTE DE MONITOREO DE INFRAESTRUCTURA Y MÉTRICAS (Pared Este)
  const dcScreenCt = makeCanvasTex(1536, 640);
  {
    const g = dcScreenCt.ctx;
    g.fillStyle = '#030712';
    g.fillRect(0, 0, 1536, 640);

    // Barra superior
    g.fillStyle = '#0f172a';
    g.fillRect(0, 0, 1536, 60);
    g.fillStyle = '#00f0ff';
    g.font = 'bold 30px "JetBrains Mono", monospace';
    g.fillText('⚡ FLOWCLIC DATA CENTER · INFRAESTRUCTURA CRÍTICA & CLUSTER GPU', 30, 42);

    // Paneles de métricas de Servidores, UPS y Almacenamiento
    const metrics = [
      { label: 'POTENCIA UPS', val: '99.4% ONLINE (N+1)', col: '#10b981' },
      { label: 'CLUSTER GPU', val: '128 NODES · H100', col: '#38bdf8' },
      { label: 'ALMACENAMIENTO SAN', val: '1.4 PB DISP. · NVMe', col: '#a855f7' },
      { label: 'TEMPERATURA HVAC', val: '18.2 °C CONTROLADO', col: '#00f0ff' },
    ];
    metrics.forEach((m, idx) => {
      const x = 30 + idx * 370;
      g.fillStyle = '#0b1329';
      g.fillRect(x, 85, 350, 120);
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2;
      g.strokeRect(x, 85, 350, 120);
      g.fillStyle = '#94a3b8';
      g.font = '18px monospace';
      g.fillText(m.label, x + 20, 125);
      g.fillStyle = m.col;
      g.font = 'bold 26px monospace';
      g.fillText(m.val, x + 20, 175);
    });

    // Gráfico de throughput de red en tiempo real
    g.fillStyle = '#0a101f';
    g.fillRect(30, 230, 1476, 380);
    g.strokeStyle = '#1e293b';
    g.strokeRect(30, 230, 1476, 380);
    g.strokeStyle = '#00f0ff';
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i < 45; i++) {
      const gx = 50 + i * 32.5;
      const gy = 480 - Math.sin(i * 0.5) * 80 - Math.cos(i * 1.1) * 45;
      if (i === 0) g.moveTo(gx, gy);
      else g.lineTo(gx, gy);
    }
    g.stroke();

    dcScreenCt.tex.needsUpdate = true;
  }
  const dcSign = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(6.4, 2.66)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: dcScreenCt.tex,
        emissiveMap: dcScreenCt.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
      })
    )
  );
  dcSign.position.set(DATACENTER.cx + DATACENTER.w / 2 - 0.12, 2.4, DATACENTER.cz);
  dcSign.rotation.y = -Math.PI / 2;
  dcGroup.add(dcSign);

  // Iluminación fría de Data Center
  const dcLight = new THREE.PointLight(0x00f0ff, 22, 22, 1.4);
  dcLight.position.set(DATACENTER.cx, 3.8, DATACENTER.cz);
  dcGroup.add(dcLight);

  // =========================================================================
  // OFICINA DEL CEO (Presidencia - El Despacho más Grande de la Oficina)
  // Ubicada al oeste de Sheldon y el Laboratorio (cx: -23.5, cz: 0, w: 16, d: 27)
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

  // Gran alfombra ejecutiva persa / geométrica bajo el área presidencial
  const ceoRugMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const ceoRug = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.0, 0.02, 7.5)),
    ceoRugMat
  );
  ceoRug.position.set(CEO_OFFICE.cx - 2.5, 0.21, CEO_OFFICE.cz);
  ceoRug.receiveShadow = true;
  ceoGroup.add(ceoRug);

  // Paredes perimetrales de la Oficina del CEO
  // (Pared sur tiene la puerta abierta hacia el pasillo central horizontal z = -1.5)
  const ceoW = CEO_OFFICE.cx - CEO_OFFICE.w / 2;
  const ceoE = CEO_OFFICE.cx + CEO_OFFICE.w / 2;
  const ceoN = CEO_OFFICE.cz - CEO_OFFICE.d / 2;
  const ceoS = CEO_OFFICE.cz + CEO_OFFICE.d / 2;
  addGlassWall(ceoW, ceoN, ceoE, ceoN); // Pared norte
  addGlassWall(ceoW, ceoN, ceoW, ceoS); // Pared oeste
  // Pared este linda con la oficina de Sheldon (-15.5)
  addGlassWall(ceoE, ceoN, ceoE, ceoS);
  // Pared sur con puerta hacia el pasillo
  addGlassWall(ceoW, ceoS, CEO_OFFICE.cx - 1.3, ceoS);
  addGlassWall(CEO_OFFICE.cx + 1.3, ceoS, ceoE, ceoS);

  // Escritorio del CEO: 2 VECES MÁS GRANDE que los de Sheldon y Leonard (4.4m x 2.0m)
  const deskMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x271911, // Madera noble de caoba profunda
      roughness: 0.22,
      metalness: 0.12,
    })
  );
  const ceoDeskTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.0, 0.14, 4.4)), // Ancho en Z, Fondo en X
    deskMat
  );
  ceoDeskTop.position.set(CEO_OFFICE.cx - 3.8, 0.82, CEO_OFFICE.cz);
  ceoDeskTop.castShadow = true;
  ceoDeskTop.receiveShadow = true;
  ceoGroup.add(ceoDeskTop);

  // Patas monolíticas en aluminio oscuro pulido con acentos dorados
  const ceoLegMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.85,
    })
  );
  [-1.9, 1.9].forEach((zOff) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.8, 0.75, 0.16)), ceoLegMat);
    leg.position.set(CEO_OFFICE.cx - 3.8, 0.38, CEO_OFFICE.cz + zOff);
    leg.castShadow = true;
    ceoGroup.add(leg);
  });

  // Tapete frontal de cuero negro con inserto de latón
  const deskPadMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }));
  const deskPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 0.015, 1.8)), deskPadMat);
  deskPad.position.set(CEO_OFFICE.cx - 3.6, 0.9, CEO_OFFICE.cz);
  ceoGroup.add(deskPad);

  // Doble Monitor Ultrawide Curvo con el Dashboard Ejecutivo del CEO
  const ceoScreenTex = createCeoScreenTexture(maxAnisotropy);
  disposables.push(ceoScreenTex);
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
  const monitorBackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.3 }));

  const ultrawideScreen = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.8, 2.8, 0.8, 24, 1, true, Math.PI * 0.88, Math.PI * 0.24)),
    ultrawideMat
  );
  ultrawideScreen.position.set(CEO_OFFICE.cx - 3.2, 1.42, CEO_OFFICE.cz);
  ultrawideScreen.rotation.y = -Math.PI / 2;
  ceoGroup.add(ultrawideScreen);

  const monitorStand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 12)),
    brushedAlumMat
  );
  monitorStand.position.set(CEO_OFFICE.cx - 4.1, 1.15, CEO_OFFICE.cz);
  const monitorBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.3, 0.04, 0.7)),
    darkMetalMat
  );
  monitorBase.position.set(CEO_OFFICE.cx - 4.0, 0.9, CEO_OFFICE.cz);
  ceoGroup.add(monitorStand, monitorBase);

  // Sillón Presidencial de Cuero Negro del CEO tras el escritorio
  const chairLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.45,
      metalness: 0.1,
    })
  );
  const ceoChair = new THREE.Group();
  ceoChair.position.set(CEO_OFFICE.cx - 5.0, 0, CEO_OFFICE.cz);
  ceoChair.rotation.y = Math.PI / 2; // Mirando hacia el frente / pasillo

  const chairSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.12, 0.68)), chairLeatherMat);
  chairSeat.position.y = 0.48;
  const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.95, 0.14)), chairLeatherMat);
  chairBack.position.set(0, 0.95, -0.28);
  const chairHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.22, 0.12)), chairLeatherMat);
  chairHead.position.set(0, 1.48, -0.28);
  const chairStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 12)), brushedAlumMat);
  chairStem.position.y = 0.24;
  const chairBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 8)), darkMetalMat);
  chairBase.position.y = 0.04;
  ceoChair.add(chairSeat, chairBack, chairHead, chairStem, chairBase);
  ceoGroup.add(ceoChair);

  // Ubicar al PERSONAJE DEL CEO en su sillón presidencial
  const ceoFigure = buildCeoFigure(true);
  ceoFigure.position.set(CEO_OFFICE.cx - 4.95, 0, CEO_OFFICE.cz);
  ceoFigure.rotation.y = Math.PI / 2; // Mirando hacia el escritorio y los visitantes
  ceoGroup.add(ceoFigure);

  // 2 SILLAS DE VISITA EJECUTIVAS frente al escritorio (para Sheldon y Leonard)
  const visitorChairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
    })
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
  const chair1 = buildVisitorChair(CEO_VISITOR_SLOTS.chairSheldon.x, CEO_VISITOR_SLOTS.chairSheldon.z, CEO_VISITOR_SLOTS.chairSheldon.yaw);
  const chair2 = buildVisitorChair(CEO_VISITOR_SLOTS.chairLeonard.x, CEO_VISITOR_SLOTS.chairLeonard.z, CEO_VISITOR_SLOTS.chairLeonard.yaw);
  ceoGroup.add(chair1, chair2);

  // Libreros grandes de caoba con libros encuadernados
  const bookcaseMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x331c12, roughness: 0.35 }));
  const bookColors = [0x991b1b, 0x1e3a8a, 0x14532d, 0x78350f, 0x312e81];
  [-3.8, 3.8].forEach((zPos) => {
    const bookcase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 3.2, 3.2)), bookcaseMat);
    bookcase.position.set(CEO_OFFICE.cx - 6.8, 1.6, CEO_OFFICE.cz + zPos);
    bookcase.castShadow = true;
    ceoGroup.add(bookcase);

    // Baldas con libros
    for (let row = 0; row < 4; row++) {
      for (let b = 0; b < 7; b++) {
        const bMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: bookColors[(row * 7 + b) % bookColors.length],
            roughness: 0.4,
          })
        );
        const book = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.35, 0.38, 0.09)), bMat);
        book.position.set(
          CEO_OFFICE.cx - 6.4,
          0.6 + row * 0.65,
          CEO_OFFICE.cz + zPos - 1.1 + b * 0.36
        );
        ceoGroup.add(book);
      }
    }
  });

  // Figuras coleccionables: Anime (Mecha Robot), Películas (Monolito Sci-Fi) e IA (Cubo Neuronal)
  // 1) Mecha Robot de Anime
  const mechaGroup = new THREE.Group();
  mechaGroup.position.set(CEO_OFFICE.cx - 3.8, 1.05, CEO_OFFICE.cz - 1.8);
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
    trackGeo(new THREE.BoxGeometry(0.04, 0.22, 0.42)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7 }))
  );
  mechaWings.position.set(-0.06, 0.1, 0);
  mechaGroup.add(mechaBody, mechaHead, mechaWings);
  ceoGroup.add(mechaGroup);

  // 2) Monolito Sci-Fi de Película
  const monolith = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.12, 0.48, 0.24)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.05, metalness: 0.95 }))
  );
  monolith.position.set(CEO_OFFICE.cx - 3.8, 1.15, CEO_OFFICE.cz + 1.8);
  ceoGroup.add(monolith);

  // 3) Cubo de Red Neuronal Holográfica de IA
  const aiHoloCube = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 0.26, 0.26)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.85,
        wireframe: true,
      })
    )
  );
  aiHoloCube.position.set(CEO_OFFICE.cx - 4.3, 1.15, CEO_OFFICE.cz);
  spinners.push(aiHoloCube);
  ceoGroup.add(aiHoloCube);

  // Gran Sofá Seccional de Cuero en el Área Lounge del Despacho
  const sofaLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.5,
      metalness: 0.15,
    })
  );
  const ceoSoofa = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8, 0.48, 1.3)),
    sofaLeatherMat
  );
  ceoSoofa.position.set(CEO_OFFICE.cx + 2.0, 0.42, CEO_OFFICE.cz + 4.2);
  ceoSoofa.castShadow = true;
  const ceoSoofaBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8, 0.62, 0.32)),
    sofaLeatherMat
  );
  ceoSoofaBack.position.set(CEO_OFFICE.cx + 2.0, 0.9, CEO_OFFICE.cz + 4.75);
  ceoGroup.add(ceoSoofa, ceoSoofaBack);

  // Mesa de centro baja de mármol negro frente al sofá
  const marbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.15,
      metalness: 0.3,
    })
  );
  const marbleTable = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2, 0.08, 1.1)),
    marbleMat
  );
  marbleTable.position.set(CEO_OFFICE.cx + 2.0, 0.38, CEO_OFFICE.cz + 2.6);
  ceoGroup.add(marbleTable);

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
  ceoDeskSpot.position.set(CEO_OFFICE.cx - 3.8, 6.2, CEO_OFFICE.cz);
  ceoDeskSpot.target.position.set(CEO_OFFICE.cx - 3.8, 0.8, CEO_OFFICE.cz);
  ceoGroup.add(ceoDeskSpot, ceoDeskSpot.target);

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
  const labLight = new THREE.PointLight(0x06b6d4, 18, 17, 1.6);
  labLight.position.set(-9.0, 4.2, 0.2);
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
    setLabDesks,
    setLabBoards,
    setBoardroomSeats,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
