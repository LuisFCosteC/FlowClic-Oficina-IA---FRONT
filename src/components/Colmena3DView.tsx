import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Agent, AgentStatus, KanbanTask } from '../types/orbis';
import { OfficeControlPanel, CameraPresetKey } from './OfficeControlPanel';
import { MODEL_TIER_META, STATUS_META, TASK_STAGE_META, isResting } from '../data/initialData';
import {
  AvatarRig,
  createAvatarRig,
  setAvatarStatusColor,
  updateAvatarAnimation, createCeoRig } from './three/avatarBuilder';
import {
  BoardProject,
  boardroomSeats,
  BuiltOfficeScene,
  buildColmenaOffice,
  CEO_OFFICE,
  CEO_DESK_SLOT,
  CEO_VISITOR_SLOTS,
  CORRIDOR_W,
  DATACENTER,
  DOORS,
  labTaskSwapPath,
  LOUNGE_SLOTS,
  MEAL_SLOTS,
  SLEEP_SLOTS,
  REVIEW_SLOTS,
  SENIOR_DESK_SLOT,
  SENIOR_POUF_SLOT,
  SHELDON_BOARD_SLOT,
  SHELDON_DESK_SLOT,
  SHELDON_SOFA_SLOT,
  sheldonDetour,
  WORKSTATION_SLOTS,
  ZONE_LABEL_ANCHORS,
  ZoneSlot,
  type InfoTarget,
} from './three/sceneBuilder';
import { api } from '../api/client';
import { NavGrid } from './three/navGrid';
import { MeetingChat, type MeetingReport } from './MeetingChat';
import { createContactShadowTexture } from './three/proceduralTextures';

interface Colmena3DViewProps {
  agents: Agent[];
  tasks?: KanbanTask[];
  onChangeAgentStatus: (agentId: string, status: AgentStatus) => void;
  onCreateAgent?: () => void;
}

// CameraPresetKey imported from OfficeControlPanel

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: {
    label: 'Vista General',
    pos: [0, 52, 45],
    target: [0, 0, 0],
  },
  oficina_ceo: {
    label: 'Oficina del CEO',
    pos: [-22.5, 14.5, 4.5],
    target: [-22.5, 0.8, -8.7],
  },
  laboratorio: {
    label: 'Laboratorio',
    pos: [-16.5, 15.5, 23.5],
    target: [-16.5, 0.8, 8.7],
  },
  oficina_sheldon: {
    label: 'Oficina de Sheldon',
    pos: [-7.5, 13.5, 4.5],
    target: [-7.5, 0.8, -8.7],
  },
  oficina_senior: {
    label: 'Oficina del Leonard',
    pos: [4.5, 13.5, 4.5],
    target: [4.5, 0.8, -8.7],
  },
  sala_juntas: {
    label: 'Sala de juntas',
    pos: [17.5, 13.5, 4.5],
    target: [17.5, 0.8, -8.7],
  },
  datacenter: {
    label: 'Data Center',
    pos: [17.5, 13.5, 22.5],
    target: [17.5, 0.8, 8.7],
  },
  zona_descanso: {
    label: 'Zona de descanso',
    pos: [4.5, 13.5, 22.5],
    target: [4.5, 0.8, 8.7],
  },
};

// Module-scope reusable math helpers (zero GC inside render loop)
const _projVec = new THREE.Vector3();
const _deltaVec = new THREE.Vector3();
const _mouseNdc = new THREE.Vector2();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _mv = new THREE.Vector3();

function shortestAngleDiff(current: number, target: number): number {
  let diff = (target - current + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

type RoomKey = 'sheldon' | 'senior' | 'laboratorio' | 'descanso' | 'junta' | 'ceo' | 'datacenter';

/** Oficina en la que está un punto, o null si está en el pasillo central. */
function getRoom(x: number, z: number): RoomKey | null {
  const hc = CORRIDOR_W / 2;
  // Pasillo central
  if (Math.abs(z) < hc) return null;

  if (z < 0) {
    // Ala Norte
    if (x < -13.5) return 'ceo';
    if (x < -1.5) return 'sheldon';
    if (x < 10.5) return 'senior';
    return 'junta';
  } else {
    // Ala Sur
    if (x < -1.5) return 'laboratorio';
    if (x < 10.5) return 'descanso';
    return 'datacenter';
  }
}

function buildWaypoints(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const toRoom = getRoom(to.x, to.z);
  const fromRoom = getRoom(from.x, from.z);
  const points: THREE.Vector3[] = [];
  const push = (x: number, z: number) => {
    const last = points[points.length - 1];
    if (last && Math.abs(last.x - x) < 0.01 && Math.abs(last.z - z) < 0.01) return;
    points.push(new THREE.Vector3(x, 0, z));
  };

  if (toRoom && fromRoom !== toRoom) {
    // Salir de donde está hacia el pasillo central horizontal (z = 0)
    if (fromRoom) {
      const doorFrom = DOORS[fromRoom];
      push(doorFrom.x, doorFrom.z + Math.sign(from.z) * 1.4);
      push(doorFrom.x, 0);
    } else {
      push(from.x, 0);
    }

    // Desplazarse por el pasillo central y entrar a la oficina destino
    const doorTo = DOORS[toRoom];
    push(doorTo.x, 0);
    push(doorTo.x, doorTo.z + Math.sign(to.z) * 1.4);
  }

  if (toRoom === 'sheldon') {
    const prev = points[points.length - 1] ?? from;
    sheldonDetour(prev, to).forEach((d) => push(d.x, d.z));
  }

  points.push(to.clone());
  return points;
}

/** El CEO no es un agente de la API: es un personaje más de la escena (con su etiqueta y movimiento). */
const CEO_ID = 'ceo-figure';
const CEO_AGENT: Agent = {
  id: CEO_ID,
  name: 'CEO',
  title: 'CEO',
  systemPrompt: '',
  modelTier: 'opus_pro',
  color: '#fbbf24',
  status: 'idle',
  ramKb: 0,
  currentTask: '',
  project: '',
  tokensSavedToday: 0,
};
const isCeoAgent = (a: Agent) => a.id === CEO_ID;

const isSenior = (a: Agent) => !a.isCTO && /full.?stack/i.test(a.title ?? '');
/** Agentes con puesto fijo en el laboratorio (todos menos el CTO y el Senior), en orden. */
const labDeskAgents = (agents: Agent[]) => agents.filter((a) => !a.isCTO && !isSenior(a) && !isCeoAgent(a));

/** Estado global de la oficina: todos pausados en la zona de descanso. */
type GlobalMode = 'breakfast' | 'lunch' | 'sleep' | null;
const GLOBAL_MODE_META: Record<Exclude<GlobalMode, null>, { label: string; detail: string }> = {
  breakfast: { label: 'Desayuno', detail: 'todos sentados en las mesas de la zona de descanso' },
  lunch: { label: 'Almuerzo', detail: 'todos sentados en las mesas de la zona de descanso' },
  sleep: { label: 'Dormir', detail: 'todos acostados en las camas de la zona de descanso' },
};
const GLOBAL_MODE_KEY = 'flowclic.globalMode';
const readStoredMode = (): GlobalMode => {
  try {
    const v = window.localStorage.getItem(GLOBAL_MODE_KEY);
    return v === 'breakfast' || v === 'lunch' || v === 'sleep' ? v : null;
  } catch {
    return null;
  }
};

function assignZoneSlots(
  agents: Agent[],
  meeting = false,
  tasks: KanbanTask[] = [],
  mode: GlobalMode = null,
  ceoMeeting = false
): Map<string, ZoneSlot> {
  const map = new Map<string, ZoneSlot>();

  if (mode) {
    // Estado global: todos a la zona de descanso (mesas para comer, camas para dormir), sin trabajar
    const list = mode === 'sleep' ? SLEEP_SLOTS : MEAL_SLOTS;
    [...agents].sort((x, y) => Number(isCeoAgent(y)) - Number(isCeoAgent(x))).forEach((agent, i) => {
      const base = i < list.length ? list[i] : LOUNGE_SLOTS[(i - list.length) % LOUNGE_SLOTS.length];
      const extra = i < list.length ? 0 : Math.floor((i - list.length) / LOUNGE_SLOTS.length);
      map.set(agent.id, {
        x: base.x + extra * 0.5,
        z: base.z + extra * 0.5,
        yaw: base.yaw,
        pose: extra ? undefined : base.pose,
        y: extra ? undefined : base.y,
      });
    });
    return map;
  }

  if (meeting) {
    // Junta: el CTO en la cabecera y el resto en sus sillas
    const seats = boardroomSeats(agents.length);
    const last = seats.length - 1;
    const ceo = agents.find(isCeoAgent);
    const cto = agents.find((a) => a.isCTO);
    const leonard = agents.find((a) => !a.isCTO && isSenior(a));
    if (ceo) map.set(ceo.id, seats[0]); // cabecera
    if (cto) map.set(cto.id, seats[last - 1]); // a su lado (norte)
    if (leonard) map.set(leonard.id, seats[last]); // a su lado (sur)
    // El resto, de las sillas más cercanas a la cabecera hacia el fondo
    let seatIdx = last - 2;
    agents.forEach((a) => {
      if (map.has(a.id)) return;
      map.set(a.id, seats[Math.max(1, seatIdx)]);
      seatIdx--;
    });
    return map;
  }

  // Comprobar si hay tareas pendientes de revisión/aprobación por el CEO o si Sheldon/Leonard están esperando
  const hasPendingCeoApproval = tasks.some(
    (t) => t.stage === 'sheldon_review' || (t as any).requiresApproval
  );

  const owners = labDeskAgents(agents);
  let reviewIdx = 0;
  let loungeIdx = 0;

  agents.forEach((agent) => {
    if (isCeoAgent(agent)) {
      map.set(agent.id, CEO_DESK_SLOT);
      return;
    }
    // BLOCKED espera en la zona de revisión; SLEEP_QUOTA descansa (lounge / puf / sofá).
    const inReview = agent.status === 'waiting_sheldon' || agent.status === 'blocked';
    const isLeonard = !agent.isCTO && (agent.id === 'leonard' || /full.?stack/i.test(agent.title ?? ''));

    // Si Sheldon o Leonard están esperando aprobación del CEO, se sientan en las sillas de la Oficina del CEO
    if (agent.isCTO && (ceoMeeting || inReview || hasPendingCeoApproval)) {
      map.set(agent.id, CEO_VISITOR_SLOTS.chairSheldon);
      return;
    }
    if (isLeonard && (ceoMeeting || inReview || hasPendingCeoApproval)) {
      map.set(agent.id, CEO_VISITOR_SLOTS.chairLeonard);
      return;
    }

    if (agent.isCTO) {
      // Trabaja sentado en su escritorio, revisa de pie frente a los tableros, descansa en el sofá.
      map.set(
        agent.id,
        agent.status === 'working'
          ? SHELDON_DESK_SLOT
          : inReview
            ? SHELDON_BOARD_SLOT
            : SHELDON_SOFA_SLOT
      );
      return;
    }
    if (isSenior(agent) && !inReview) {
      map.set(agent.id, agent.status === 'working' ? SENIOR_DESK_SLOT : SENIOR_POUF_SLOT);
      return;
    }

    if (agent.status === 'working') {
      // Cada agente tiene su puesto fijo en el laboratorio
      const idx = owners.indexOf(agent);
      const base = WORKSTATION_SLOTS[idx % WORKSTATION_SLOTS.length];
      const overflow = Math.floor(idx / WORKSTATION_SLOTS.length);
      map.set(agent.id, {
        x: base.x + overflow * 0.65,
        z: base.z + overflow * 0.55,
        yaw: base.yaw,
      });
    } else if (inReview) {
      const base = REVIEW_SLOTS[reviewIdx % REVIEW_SLOTS.length];
      const overflow = Math.floor(reviewIdx / REVIEW_SLOTS.length);
      map.set(agent.id, {
        x: base.x + overflow * 0.5,
        z: base.z + overflow * 0.45,
        yaw: base.yaw,
      });
      reviewIdx++;
    } else {
      const base = LOUNGE_SLOTS[loungeIdx % LOUNGE_SLOTS.length];
      const overflow = Math.floor(loungeIdx / LOUNGE_SLOTS.length);
      map.set(agent.id, {
        x: base.x + overflow * 0.5,
        z: base.z + overflow * 0.5,
        yaw: base.yaw,
        pose: overflow ? undefined : base.pose,
        y: overflow ? undefined : base.y,
      });
      loungeIdx++;
    }
  });

  return map;
}

export const Colmena3DView: React.FC<Colmena3DViewProps> = ({
  agents,
  tasks = [],
  onChangeAgentStatus,
  onCreateAgent,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const zoneLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [activePreset, setActivePreset] = useState<CameraPresetKey>('overview');
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
  const [webglLost, setWebglLost] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [infoTarget, setInfoTarget] = useState<InfoTarget | null>(null);
  const [meeting, setMeeting] = useState<boolean>(false);
  const [ceoMeeting, setCeoMeeting] = useState<boolean>(false);
  const [globalMode, setGlobalMode] = useState<GlobalMode>(readStoredMode);
  const lastTaskRef = useRef<Map<string, string>>(new Map());
  const keysRef = useRef<Set<string>>(new Set());
  const officeRef = useRef<BuiltOfficeScene | null>(null);

  // Mutable refs for Three.js loop to stay decoupled from React renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigsRef = useRef<Map<string, AvatarRig>>(new Map());
  const navRef = useRef<NavGrid | null>(null);
  const shadowTexRef = useRef<THREE.CanvasTexture | null>(null);
  const selectedIdRef = useRef<string>(selectedAgentId);
  const agentsRef = useRef<Agent[]>(agents);
  const cameraFlightRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.overview.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.overview.target),
  });
  const cycleTimersRef = useRef<number[]>([]);

  useEffect(() => {
    selectedIdRef.current = selectedAgentId;
    rigsRef.current.forEach((rig, id) => {
      rig.selectRing.visible = id === selectedAgentId;
    });
  }, [selectedAgentId]);

  useEffect(() => {
    agentsRef.current = agents;
    if (!agents.some((a) => a.id === selectedAgentId) && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Keyboard shortcut 'H' to toggle HUD dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        setIsRightPanelCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Teclas de movimiento de cámara
  useEffect(() => {
    const moveKeys = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const typing = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (moveKeys.has(k)) {
        keysRef.current.add(k);
        e.preventDefault();
      } else if (k === 'shift') keysRef.current.add('shift');
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const clear = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // Main WebGL initialization (runs once)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a12);
    scene.fog = new THREE.FogExp2(0x060a12, 0.014);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 160);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Procedural studio environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.minDistance = 2.5;
    controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.zoomToCursor = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 1.3;
    controls.minPolarAngle = 0.05;
    controls.update();

    // Cancel camera preset flight immediately when user interacts
    const onControlStart = () => {
      cameraFlightRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // Build 3-zone Tech Office diorama
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const builtOffice = buildColmenaOffice(scene, maxAniso, isSoftwareGl);
    officeRef.current = builtOffice;
    // Cuadrícula de navegación: obstáculos (paredes, muebles) extraídos de la escena construida
    navRef.current = new NavGrid(scene, { minX: -32.5, maxX: 24.5, minZ: -14.9, maxZ: 14.9 });

    // Shared contact shadow texture for avatars
    const contactShadowTex = createContactShadowTexture();
    shadowTexRef.current = contactShadowTex;

    // Spawn initial avatars immediately
    const initialSlots = assignZoneSlots(agentsRef.current);
    const rigs = rigsRef.current;
    rigs.clear();

    agentsRef.current.forEach((agent) => {
      const slot = initialSlots.get(agent.id) ?? { x: 0, z: 0, yaw: 0 };
      const rig = createAvatarRig(
        agent,
        contactShadowTex,
        new THREE.Vector3(slot.x, 0, slot.z),
        slot.yaw
      );
      rig.selectRing.visible = agent.id === selectedIdRef.current;
      scene.add(rig.root);
      rigs.set(agent.id, rig);
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster on Layer 1 for avatar clicking
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pickRay = new THREE.Raycaster();

    let pointerDownX = 0;
    let pointerDownY = 0;
    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const distSq =
        (e.clientX - pointerDownX) ** 2 + (e.clientY - pointerDownY) ** 2;
      if (distSq > 36) return; // User dragged to orbit
      const rect = renderer.domElement.getBoundingClientRect();
      _mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_mouseNdc, camera);
      const proxies: THREE.Object3D[] = [];
      rigs.forEach((r) => proxies.push(r.hitProxy));
      const hits = raycaster.intersectObjects(proxies, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.agentId as string | undefined;
        if (hitId && hitId !== CEO_ID) setSelectedAgentId(hitId);
        return;
      }
      // Sin avatar: ¿tablero o libro de proyecto?
      pickRay.setFromCamera(_mouseNdc, camera);
      const projectPicks = builtOffice.getPickables();
      const pickHits = pickRay.intersectObjects([...projectPicks, ...builtOffice.getInfoPickables()], false);
      if (pickHits.length > 0) {
        const name = projectPicks.includes(pickHits[0].object) ? builtOffice.resolvePick(pickHits[0]) : null;
        if (name) {
          setSelectedProject(name);
          setInfoTarget(null);
        } else {
          // PC, tablero, pantalla o librero: abre su panel (aunque esté vacío)
          const info = builtOffice.resolveInfo(pickHits[0]);
          if (info) {
            setInfoTarget(info);
            setSelectedProject(null);
          }
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver so sidebar collapse resizes canvas smoothly
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop with software-WebGL pacing
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateProjectedLabels(w: number, h: number) {
      // Update zone header anchors
      for (let i = 0; i < ZONE_LABEL_ANCHORS.length; i++) {
        const z = ZONE_LABEL_ANCHORS[i];
        const el = zoneLabelRefs.current.get(z.id);
        if (!el) continue;
        _projVec.copy(z.pos).project(camera);
        if (_projVec.z > 1) {
          el.style.opacity = '0';
          continue;
        }
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        el.style.opacity = '1';
        el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
      }

      // Update agent nameplates
      rigs.forEach((rig, id) => {
        const el = labelRefs.current.get(id);
        if (!el) return;
        _projVec.set(
          rig.root.position.x,
          rig.root.position.y + rig.labelAnchorY,
          rig.root.position.z
        );
        _projVec.project(camera);
        if (_projVec.z > 1 || _projVec.x < -1.1 || _projVec.x > 1.1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
      });
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      // Smooth damped camera preset transitions
      const flight = cameraFlightRef.current;
      if (flight.active) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          flight.pos.x,
          5.5,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          flight.pos.y,
          5.5,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          flight.pos.z,
          5.5,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          flight.target.x,
          5.5,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          flight.target.y,
          5.5,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          flight.target.z,
          5.5,
          dt
        );
        if (
          camera.position.distanceToSquared(flight.pos) < 0.015 &&
          controls.target.distanceToSquared(flight.target) < 0.015
        ) {
          flight.active = false;
        }
      }

      // Movimiento libre con el teclado: WASD / flechas, Q/E bajar/subir, Shift = rápido
      const keys = keysRef.current;
      if (keys.size > 0) {
        camera.getWorldDirection(_fwd);
        _fwd.y = 0;
        if (_fwd.lengthSq() > 1e-6) _fwd.normalize();
        _right.crossVectors(_fwd, camera.up).normalize();
        _mv.set(0, 0, 0);
        if (keys.has('w') || keys.has('arrowup')) _mv.add(_fwd);
        if (keys.has('s') || keys.has('arrowdown')) _mv.sub(_fwd);
        if (keys.has('d') || keys.has('arrowright')) _mv.add(_right);
        if (keys.has('a') || keys.has('arrowleft')) _mv.sub(_right);
        if (keys.has('e')) _mv.y += 1;
        if (keys.has('q')) _mv.y -= 1;
        if (_mv.lengthSq() > 0) {
          _mv.normalize().multiplyScalar((keys.has('shift') ? 18 : 9) * dt);
          camera.position.add(_mv);
          controls.target.add(_mv);
          const cx = THREE.MathUtils.clamp(controls.target.x, -36, 28);
          const cz = THREE.MathUtils.clamp(controls.target.z, -19, 19);
          const cy = THREE.MathUtils.clamp(controls.target.y, 0, 6);
          camera.position.add(_deltaVec.set(cx - controls.target.x, cy - controls.target.y, cz - controls.target.z));
          controls.target.set(cx, cy, cz);
          cameraFlightRef.current.active = false;
        }
      }

      controls.update();

      // Subtle diorama ambient motion (DNA helix & holographic architecture orb)
      builtOffice.dnaHelix.rotation.y = elapsed * 0.45;
      builtOffice.holoOrb.rotation.y = elapsed * 0.7;
      builtOffice.holoOrb.rotation.x = Math.sin(elapsed * 0.5) * 0.25;
      builtOffice.holoOrb.position.y = 1.48 + Math.sin(elapsed * 1.8) * 0.06;
      builtOffice.spinners.forEach((o, i) => {
        o.rotation.y = elapsed * 0.5 + i;
      });

      // Move and animate all avatars smoothly between zones
      let rigIndex = 0;
      rigs.forEach((rig) => {
        let isMoving = false;
        const speed = 4.6;

        if (rig.waypoints.length > 0) {
          const nextPt = rig.waypoints[0];
          _deltaVec.subVectors(nextPt, rig.root.position);
          _deltaVec.y = 0;
          const dist = _deltaVec.length();

          if (dist < 0.14) {
            rig.root.position.x = nextPt.x;
            rig.root.position.z = nextPt.z;
            rig.waypoints.shift();
          } else {
            isMoving = true;
            const step = Math.min(dist, speed * dt);
            _deltaVec.normalize();
            rig.root.position.x += _deltaVec.x * step;
            rig.root.position.z += _deltaVec.z * step;

            const moveYaw = Math.atan2(_deltaVec.x, _deltaVec.z);
            const diff = shortestAngleDiff(rig.root.rotation.y, moveYaw);
            rig.root.rotation.y += diff * Math.min(1, dt * 10);
          }
        } else {
          // Smooth settle to final slot orientation
          const diff = shortestAngleDiff(rig.root.rotation.y, rig.targetYaw);
          rig.root.rotation.y += diff * Math.min(1, dt * 6.5);
        }

        updateAvatarAnimation(rig, elapsed, dt, isMoving, rigIndex * 0.73);
        rigIndex++;
      });

      renderer.render(scene, camera);

      const cw = container?.clientWidth ?? width;
      const ch = container?.clientHeight ?? height;
      updateProjectedLabels(cw, ch);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        onContextRestored
      );
      officeRef.current = null;
      navRef.current = null;
      builtOffice.dispose();
      contactShadowTex.dispose();
      envRT.dispose();
      rigs.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Proyectos reales (BD): los que aparecen en los tickets y los de los agentes
  const projectInfos = useMemo(() => {
    const map = new Map<string, { name: string; tasks: KanbanTask[]; agents: Agent[] }>();
    const entry = (raw: string) => {
      const name = raw.trim();
      if (!name) return null;
      if (!map.has(name)) map.set(name, { name, tasks: [], agents: [] });
      return map.get(name)!;
    };
    tasks.forEach((t) => entry(t.project)?.tasks.push(t));
    agents.forEach((a) => {
      const e = entry(a.project ?? '');
      if (e && !e.agents.includes(a)) e.agents.push(a);
    });
    tasks.forEach((t) => {
      const e = map.get(t.project.trim());
      const ag = agents.find((a) => a.id === t.assigneeId);
      if (e && ag && !e.agents.includes(ag)) e.agents.push(ag);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, agents]);

  useEffect(() => {
    const list: BoardProject[] = projectInfos.map((p) => ({
      name: p.name,
      total: p.tasks.length,
      done: p.tasks.filter((t) => t.stage === 'completed').length,
    }));
    officeRef.current?.setProjects(list);
  }, [projectInfos]);

  useEffect(() => {
    officeRef.current?.setSelectedProject(selectedProject);
  }, [selectedProject]);

  // Puestos del laboratorio (nombre + tarea), tableros de tareas y sillas de la sala de juntas
  useEffect(() => {
    const owners = labDeskAgents(agents);
    officeRef.current?.setLabDesks(
      Array.from({ length: 9 }, (_, i) =>
        owners[i] ? { name: owners[i].name, task: owners[i].currentTask } : null
      )
    );
  }, [agents]);

  useEffect(() => {
    officeRef.current?.setLabBoards({
      inProgress: tasks
        .filter((t) => t.stage === 'in_dev' || t.stage === 'sheldon_review')
        .map((t) => t.title),
      backlog: tasks.filter((t) => t.stage === 'backlog').map((t) => t.title),
    });
  }, [tasks]);

  // Datos reales para pantallas, tableros y librerías de toda la oficina
  useEffect(() => {
    const stageCount = (st: string) => tasks.filter((t) => t.stage === st).length;
    officeRef.current?.setOfficeStats({
      online: agents.length > 0,
      agents: agents.map((a) => ({
        name: a.name,
        title: a.title,
        isCTO: !!a.isCTO,
        status: a.status,
        task: a.currentTask,
        done: tasks.filter((t) => t.assigneeId === a.id && t.stage === 'completed').length,
        active: tasks.filter(
          (t) => t.assigneeId === a.id && (t.stage === 'in_dev' || t.stage === 'sheldon_review')
        ).length,
        tokens: a.tokensSavedToday,
        ramKb: a.ramKb,
      })),
      stages: {
        backlog: stageCount('backlog'),
        in_dev: stageCount('in_dev'),
        sheldon_review: stageCount('sheldon_review'),
        ceo_approval: stageCount('ceo_approval'),
        completed: stageCount('completed'),
      },
      projects: projectInfos.map((p) => ({
        name: p.name,
        total: p.tasks.length,
        done: p.tasks.filter((t) => t.stage === 'completed').length,
      })),
      inDevTitles: tasks.filter((t) => t.stage === 'in_dev').map((t) => t.title),
      backlogTitles: tasks.filter((t) => t.stage === 'backlog').map((t) => t.title),
      approvalTitles: tasks.filter((t) => t.stage === 'ceo_approval').map((t) => t.title),
    });
  }, [agents, tasks, projectInfos]);

  useEffect(() => {
    officeRef.current?.setBoardroomSeats(agents.length);
  }, [agents.length]);

  const activeProject = projectInfos.find((p) => p.name === selectedProject) ?? null;

  // Sync dynamic agent additions & status transitions into the live Three.js scene
  useEffect(() => {
    const scene = sceneRef.current;
    const shadowTex = shadowTexRef.current;
    if (!scene || !shadowTex) return;

    const sceneAgents = [...agents, CEO_AGENT];
    const slots = assignZoneSlots(sceneAgents, meeting && !globalMode, tasks, globalMode, ceoMeeting && !meeting && !globalMode);
    const rigs = rigsRef.current;
    const owners = labDeskAgents(agents);

    // Agentes archivados o eliminados: se retiran de la escena.
    const liveIds = new Set(sceneAgents.map((a) => a.id));
    rigs.forEach((rig, id) => {
      if (liveIds.has(id)) return;
      scene.remove(rig.root);
      rig.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: THREE.Material) => m.dispose());
        }
      });
      rigs.delete(id);
    });

    sceneAgents.forEach((agent) => {
      const slot = slots.get(agent.id) ?? { x: 0, z: 0, yaw: 0 };
      const existing = rigs.get(agent.id);
      // Con un estado global activo, todos quedan en pausa (sin trabajar), sea cual sea su estado real
      const effStatus: AgentStatus = globalMode ? 'idle' : agent.status;

      if (!existing) {
        // Newly created agent — spawn directly in their assigned zone!
        const makeRig = isCeoAgent(agent) ? createCeoRig : createAvatarRig;
        const newRig = makeRig(
          agent,
          shadowTex,
          new THREE.Vector3(slot.x, 0, slot.z),
          slot.yaw
        );
        newRig.selectRing.visible = agent.id === selectedIdRef.current;
        newRig.pose = slot.pose;
        newRig.poseY = slot.y ?? 0;
        if (effStatus !== agent.status) setAvatarStatusColor(newRig, effStatus);
        scene.add(newRig.root);
        rigs.set(agent.id, newRig);
        lastTaskRef.current.set(agent.id, agent.currentTask);
      } else {
        const targetVec = new THREE.Vector3(slot.x, 0, slot.z);
        const statusChanged = existing.currentStatus !== effStatus;
        existing.pose = slot.pose;
        existing.poseY = slot.y ?? 0;
        const posChanged = existing.targetPos.distanceToSquared(targetVec) > 0.04;

        if (statusChanged) {
          setAvatarStatusColor(existing, effStatus);
        }
        // Si cambió su tarea estando en su puesto: va a los tableros, entrega la vieja,
        // toma la nueva y vuelve
        const prevTask = lastTaskRef.current.get(agent.id);
        lastTaskRef.current.set(agent.id, agent.currentTask);
        const deskIdx = owners.indexOf(agent);
        const swapTask =
          !meeting &&
          !globalMode &&
          agent.status === 'working' &&
          deskIdx >= 0 &&
          deskIdx < 9 &&
          prevTask !== undefined &&
          prevTask !== agent.currentTask &&
          !statusChanged &&
          !posChanged;
        if (swapTask) {
          existing.targetPos.copy(targetVec);
          existing.targetYaw = slot.yaw;
          existing.waypoints = labTaskSwapPath(deskIdx).map((pt) => new THREE.Vector3(pt.x, 0, pt.z));
        } else if (statusChanged || posChanged) {
          existing.targetPos.copy(targetVec);
          existing.targetYaw = slot.yaw;
          // Camino real entre muebles y paredes; si no hay ruta se usa el de respaldo por puertas
          const route = navRef.current?.findPath(
            { x: existing.root.position.x, z: existing.root.position.z },
            { x: targetVec.x, z: targetVec.z }
          );
          existing.waypoints = route
            ? route.map((p) => new THREE.Vector3(p.x, 0, p.z))
            : buildWaypoints(existing.root.position, targetVec);
        }
      }
    });
  }, [agents, meeting, globalMode, ceoMeeting]);



  /** Cambia el modo global y lo guarda en el servidor: la pausa detiene a TODOS (también al
   * orquestador) sin perder lo que hacían; `null` reanuda y cada agente vuelve a lo suyo. */
  const applyMode = (next: GlobalMode) => {
    setGlobalMode(next);
    try {
      if (next) window.localStorage.setItem(GLOBAL_MODE_KEY, next);
      else window.localStorage.removeItem(GLOBAL_MODE_KEY);
    } catch {
      /* sin almacenamiento: el estado solo dura la sesión */
    }
    void api.setOfficeMode(next ?? 'work').catch(() => {
      /* si la API no responde, el modo visual igual se aplica y se reintenta al volver a pulsar */
    });
  };

  // El servidor manda: al abrir la vista se toma el modo guardado (así lo ven todas las pestañas).
  useEffect(() => {
    void api
      .getOfficeMode()
      .then(({ mode }) => {
        const next: GlobalMode = mode === 'work' ? null : mode;
        setGlobalMode(next);
        try {
          if (next) window.localStorage.setItem(GLOBAL_MODE_KEY, next);
          else window.localStorage.removeItem(GLOBAL_MODE_KEY);
        } catch {
          /* sin almacenamiento */
        }
      })
      .catch(() => {
        /* API caída: se mantiene el modo local */
      });
  }, []);

  const flyToPreset = (preset: CameraPresetKey) => {
    setActivePreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    cameraFlightRef.current = {
      active: true,
      pos: new THREE.Vector3(...cfg.pos),
      target: new THREE.Vector3(...cfg.target),
    };
  };



  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) ?? agents[0];

  const workingCount = agents.filter((a) => a.status === 'working').length;
  const reviewCount = agents.filter(
    (a) => a.status === 'waiting_sheldon' || a.status === 'blocked'
  ).length;
  const idleCount = agents.filter((a) => isResting(a.status)).length;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#060A12]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Graceful fallback if WebGL context is lost */}
      {webglLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070B12]/95 p-6">
          <div className="max-w-md rounded-2xl border border-slate-800 bg-[#0E1522] p-6 text-center shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100">
              Contexto WebGL pausado
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              El navegador liberó temporalmente la superficie 3D. Recarga la vista o vuelve a enfocar la pestaña para restaurar FlowClic Oficina IA.
            </p>
          </div>
        </div>
      )}

      {/* Projected 3D Zone Headers & Floating Agent Nameplates */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {ZONE_LABEL_ANCHORS.map((zone) => (
          <div
            key={zone.id}
            ref={(el) => {
              if (el) zoneLabelRefs.current.set(zone.id, el);
              else zoneLabelRefs.current.delete(zone.id);
            }}
            className="absolute left-0 top-0 select-none text-center will-change-transform"
            style={{ opacity: 0 }}
          >
            <div className="rounded-xl border border-slate-700/80 bg-[#09101D]/92 px-3 py-1.5 shadow-lg">
              <div
                className="font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap"
                style={{ color: zone.accent }}
              >
                {zone.title}
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">
                {zone.subtitle}
              </div>
            </div>
          </div>
        ))}

        {[...agents, CEO_AGENT].map((agent) => {
          const isCeo = isCeoAgent(agent);
          const isSelected = !isCeo && agent.id === selectedAgentId;
          const statusColor = STATUS_META[agent.status].color;
          return (
            <button
              key={agent.id}
              type="button"
              ref={(el) => {
                if (el) labelRefs.current.set(agent.id, el);
                else labelRefs.current.delete(agent.id);
              }}
              onClick={() => !isCeo && setSelectedAgentId(agent.id)}
              className={`absolute left-0 top-0 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-md transition-colors will-change-transform ${
                isSelected
                  ? 'border-cyan-400 bg-[#0B1B30] text-white'
                  : 'border-slate-700/80 bg-[#080E1A]/92 text-slate-200 hover:border-slate-500'
              }`}
              style={{ opacity: 0 }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <span className={`whitespace-nowrap ${isCeo ? 'font-semibold text-amber-300' : ''}`}>{agent.name}</span>
              {agent.isCTO && (
                <span className="font-mono text-[9px] text-amber-400">CTO</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Convocar junta: todos los agentes van a la sala de juntas */}
      <button
        type="button"
        onClick={() => {
          const next = !meeting;
          setMeeting(next);
          if (next) {
            setCeoMeeting(false);
            flyToPreset('sala_juntas');
          }
        }}
        className={`absolute left-4 top-[66px] z-20 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg transition-colors ${
          meeting
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
            : 'border-cyan-500/60 bg-[#0B1B30] text-cyan-200 hover:bg-cyan-500/20'
        }`}
      >
        {meeting ? 'Terminar junta' : 'Convocar junta'}
      </button>

      {/* Estados globales: desayuno, almuerzo o dormir → todos en pausa en la zona de descanso */}
      <div className="absolute left-[132px] top-[66px] z-20 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = !ceoMeeting;
            setCeoMeeting(next);
            if (next) {
              setMeeting(false);
              applyMode(null);
              flyToPreset('oficina_ceo');
            }
          }}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg transition-colors ${
            ceoMeeting
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'border-amber-500/50 bg-[#1B1408] text-amber-200 hover:bg-amber-500/15'
          }`}
        >
          {ceoMeeting ? 'Terminar reunión CEO' : 'Reunión CEO'}
        </button>
        <button
          type="button"
          title="Reanuda la oficina: cada agente vuelve a lo suyo; sin tareas, descansa"
          onClick={() => {
            applyMode(null);
            setMeeting(false);
            setCeoMeeting(false);
            flyToPreset('overview');
          }}
          className="rounded-xl border border-emerald-500/50 bg-[#0B1F18] px-3 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg transition-colors hover:bg-emerald-500/15"
        >
          Trabajar
        </button>
        {(Object.keys(GLOBAL_MODE_META) as Array<Exclude<GlobalMode, null>>).map((m) => {
          const active = globalMode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                const next = active ? null : m;
                applyMode(next);
                if (next) {
                  setMeeting(false);
                  setCeoMeeting(false);
                  flyToPreset('zona_descanso');
                }
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg transition-colors ${
                active
                  ? 'border-violet-400 bg-violet-500/25 text-violet-100 hover:bg-violet-500/35'
                  : 'border-slate-600 bg-[#0B1B30] text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {GLOBAL_MODE_META[m].label}
            </button>
          );
        })}
      </div>

      {globalMode && (
        <div className="absolute left-1/2 top-[110px] z-20 -translate-x-1/2 rounded-xl border border-violet-500/50 bg-[#150F2E]/95 px-4 py-2 text-xs text-violet-100 shadow-xl">
          <span className="font-mono text-[10px] tracking-wider text-violet-300">ESTADO GLOBAL · </span>
          <span className="font-semibold">{GLOBAL_MODE_META[globalMode].label.toUpperCase()}</span>
          <span className="text-violet-200/80">
            {' '}
            — agentes en pausa: {GLOBAL_MODE_META[globalMode].detail}
          </span>
        </div>
      )}

      {meeting && (
        <div className="absolute bottom-4 left-4 z-20 w-80 rounded-2xl border border-slate-700 bg-[#0B1220]/95 p-4 text-xs shadow-xl">
          <div className="font-mono text-[10px] tracking-wider text-amber-400">
            JUNTA · REPORTE DEL EQUIPO
          </div>
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {agents.length === 0 && <div className="text-slate-500">No hay agentes.</div>}
            {agents.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-800 bg-[#080E1A] px-2.5 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">
                    {a.name}
                    {a.isCTO && <span className="ml-1 font-mono text-[9px] text-amber-400">CTO</span>}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: STATUS_META[a.status].color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[a.status].color }} />
                    {STATUS_META[a.status].label}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-400">
                  {a.currentTask?.trim() || 'Sin tarea asignada'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reunión con el CEO: Sheldon y Leonard vienen a su oficina, reportan y responden preguntas */}
      {ceoMeeting && !meeting && !globalMode && (
        <MeetingChat
          mode="ceo"
          participants={agents.filter((a) => a.isCTO || isSenior(a))}
          reports={
            agents
              .filter((a) => a.isCTO || isSenior(a))
              .map((a): MeetingReport => ({
                agent: a,
                done: tasks.filter((t) => t.assigneeId === a.id && t.stage === 'completed').length,
                active: tasks.filter(
                  (t) => t.assigneeId === a.id && (t.stage === 'in_dev' || t.stage === 'sheldon_review')
                ).length,
              }))
          }
          rightOffset={isRightPanelCollapsed ? 16 : 408}
          onClose={() => setCeoMeeting(false)}
        />
      )}

      {/* Junta general: preguntas a todo el equipo */}
      {meeting && !globalMode && (
        <MeetingChat
          mode="junta"
          participants={agents}
          rightOffset={isRightPanelCollapsed ? 16 : 408}
          onClose={() => setMeeting(false)}
        />
      )}

      <div className="pointer-events-none absolute bottom-3 right-4 z-10 hidden text-[10px] text-slate-500 lg:block">
        WASD / flechas: moverse · Q/E: bajar/subir · Shift: rápido · clic derecho: desplazar · rueda: zoom
      </div>

      {/* Información del equipo, tablero, pantalla o librero seleccionado (aunque esté vacío) */}
      {infoTarget && (
        <div className="absolute left-4 top-28 z-20 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-slate-700 bg-[#0B1220]/95 p-4 text-xs shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] tracking-wider text-cyan-400">
                {infoTarget.section.toUpperCase()}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-100">{infoTarget.title}</div>
            </div>
            <button
              type="button"
              onClick={() => setInfoTarget(null)}
              className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label="Cerrar información"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-slate-400">{infoTarget.description}</p>
          {infoTarget.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={infoTarget.title}
              className="mt-3 w-full rounded-lg border border-slate-700 bg-black"
            />
          ))}
          {infoTarget.lines.length > 0 && (
            <ul className="mt-3 space-y-1">
              {infoTarget.lines.map((ln, i) => (
                <li key={i} className="rounded-md border border-slate-800 bg-[#080E1A] px-2.5 py-1.5 text-slate-200">
                  {ln}
                </li>
              ))}
            </ul>
          )}
          {infoTarget.empty && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-600 px-3 py-3 text-center text-slate-500">
              Aún no hay información. Este es el apartado donde se mostrará a medida que se gestione.
            </div>
          )}
        </div>
      )}

      {/* Información del proyecto seleccionado (clic en un tablero o en un libro), a los lados */}
      {activeProject && (
        <>
          <div className="absolute left-4 top-28 z-20 w-72 rounded-2xl border border-slate-700 bg-[#0B1220]/95 p-4 text-xs shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] tracking-wider text-amber-400">PROYECTO</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">{activeProject.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Cerrar información del proyecto"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 text-slate-400">
              Progreso:{' '}
              <span className="font-mono text-slate-100">
                {activeProject.tasks.filter((t) => t.stage === 'completed').length}/
                {activeProject.tasks.length}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${
                    activeProject.tasks.length
                      ? (activeProject.tasks.filter((t) => t.stage === 'completed').length /
                          activeProject.tasks.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="mt-3 space-y-1">
              {(Object.keys(TASK_STAGE_META) as Array<keyof typeof TASK_STAGE_META>).map((st) => (
                <div key={st} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TASK_STAGE_META[st].accent }}
                    />
                    {TASK_STAGE_META[st].label}
                  </span>
                  <span className="font-mono text-slate-100">
                    {activeProject.tasks.filter((t) => t.stage === st).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="absolute top-28 z-20 w-80 rounded-2xl border border-slate-700 bg-[#0B1220]/95 p-4 text-xs shadow-xl"
            style={{ right: isRightPanelCollapsed ? 16 : 408 }}
          >
            <div className="font-mono text-[10px] tracking-wider text-cyan-400">TICKETS</div>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
              {activeProject.tasks.length === 0 && (
                <div className="text-slate-500">Este proyecto aún no tiene tickets.</div>
              )}
              {activeProject.tasks.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-800 bg-[#080E1A] px-2.5 py-1.5">
                  <div className="truncate font-medium text-slate-100">{t.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span style={{ color: TASK_STAGE_META[t.stage].accent }}>
                      {t.returned ? 'Devuelta' : TASK_STAGE_META[t.stage].shortLabel}
                    </span>
                    <span>{agents.find((a) => a.id === t.assigneeId)?.name ?? 'Sin asignar'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-[10px] tracking-wider text-cyan-400">EQUIPO</div>
            <div className="mt-1 text-slate-300">
              {activeProject.agents.length
                ? activeProject.agents.map((a) => a.name).join(', ')
                : 'Sin agentes asignados'}
            </div>
          </div>
        </>
      )}

      {/* Minimal Top-Left Scene Telemetry Summary (compact, non-occluding, no backdrop-blur) */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-slate-800/90 bg-[#0B1220]/95 px-4 py-2 text-xs shadow-lg">
        <span className="font-semibold text-slate-100 whitespace-nowrap">
          FlowClic Oficina IA · 3D
        </span>
        <span className="text-slate-600" aria-hidden="true">
          |
        </span>
        <span className="font-mono text-emerald-400 whitespace-nowrap">
          Trabajando: {workingCount}
        </span>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <span className="font-mono text-amber-400 whitespace-nowrap">
          Revisión Sheldon: {reviewCount}
        </span>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <span className="font-mono text-slate-400 whitespace-nowrap">
          Descansando: {idleCount}
        </span>
      </div>

            {/* Panel lateral derecho con chat de mando y telemetría (H02) */}
      <OfficeControlPanel
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
        onChangeAgentStatus={onChangeAgentStatus}
        onFlyToPreset={flyToPreset}
        activePreset={activePreset}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)}
        onCreateAgent={onCreateAgent}
      />
    </div>
  );
};
