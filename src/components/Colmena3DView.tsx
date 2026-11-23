import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Play,
  RotateCcw,
  Square,
  Users,
} from 'lucide-react';
import { Agent, AgentStatus } from '../types/orbis';
import { MODEL_TIER_META, STATUS_META, isResting } from '../data/initialData';
import {
  AvatarRig,
  createAvatarRig,
  setAvatarStatusColor,
  updateAvatarAnimation,
} from './three/avatarBuilder';
import {
  buildColmenaOffice,
  LOUNGE_SLOTS,
  REVIEW_SLOTS,
  SHELDON_CTO_SLOT,
  WORKSTATION_SLOTS,
  ZONE_LABEL_ANCHORS,
  ZoneSlot,
} from './three/sceneBuilder';
import { createContactShadowTexture } from './three/proceduralTextures';

interface Colmena3DViewProps {
  agents: Agent[];
  onChangeAgentStatus: (agentId: string, status: AgentStatus) => void;
}

type CameraPresetKey = 'overview' | 'laboratorio' | 'oficina_sheldon' | 'zona_descanso';

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: {
    label: 'Vista General',
    pos: [0.2, 16.5, 22.0],
    target: [0.2, 0.6, -0.8],
  },
  laboratorio: {
    label: 'Laboratorio',
    pos: [-9.2, 10.5, 12.2],
    target: [-8.9, 0.8, 0.2],
  },
  oficina_sheldon: {
    label: 'Oficina de Sheldon',
    pos: [0.2, 8.8, 10.6],
    target: [0.2, 1.1, -2.5],
  },
  zona_descanso: {
    label: 'Zona de descanso',
    pos: [9.4, 10.2, 12.8],
    target: [9.0, 0.8, 0.2],
  },
};

// Module-scope reusable math helpers (zero GC inside render loop)
const _projVec = new THREE.Vector3();
const _deltaVec = new THREE.Vector3();
const _mouseNdc = new THREE.Vector2();

function shortestAngleDiff(current: number, target: number): number {
  let diff = (target - current + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

function getZoneIndex(x: number): number {
  if (x < -3.7) return 0; // Laboratorio
  if (x > 4.1) return 2; // Zona de descanso
  return 1; // Oficina de Sheldon
}

function buildWaypoints(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const fromZone = getZoneIndex(from.x);
  const toZone = getZoneIndex(to.x);
  const points: THREE.Vector3[] = [];

  if (fromZone !== toZone) {
    // Pass cleanly through open doorways (z = 2.0)
    const corridorZ = 2.0;
    if (fromZone === 0 && toZone === 1) {
      points.push(new THREE.Vector3(-4.5, 0, corridorZ));
      points.push(new THREE.Vector3(-2.6, 0, corridorZ));
    } else if (fromZone === 1 && toZone === 0) {
      points.push(new THREE.Vector3(-2.6, 0, corridorZ));
      points.push(new THREE.Vector3(-4.5, 0, corridorZ));
    } else if (fromZone === 1 && toZone === 2) {
      points.push(new THREE.Vector3(3.1, 0, corridorZ));
      points.push(new THREE.Vector3(5.0, 0, corridorZ));
    } else if (fromZone === 2 && toZone === 1) {
      points.push(new THREE.Vector3(5.0, 0, corridorZ));
      points.push(new THREE.Vector3(3.1, 0, corridorZ));
    } else if (fromZone === 0 && toZone === 2) {
      points.push(new THREE.Vector3(-4.5, 0, corridorZ));
      points.push(new THREE.Vector3(0.2, 0, corridorZ + 0.6));
      points.push(new THREE.Vector3(5.0, 0, corridorZ));
    } else if (fromZone === 2 && toZone === 0) {
      points.push(new THREE.Vector3(5.0, 0, corridorZ));
      points.push(new THREE.Vector3(0.2, 0, corridorZ + 0.6));
      points.push(new THREE.Vector3(-4.5, 0, corridorZ));
    }
  }

  points.push(to.clone());
  return points;
}

function assignZoneSlots(agents: Agent[]): Map<string, ZoneSlot> {
  const map = new Map<string, ZoneSlot>();
  let workIdx = 0;
  let reviewIdx = 0;
  let loungeIdx = 0;

  agents.forEach((agent) => {
    // BLOCKED espera en la zona de revisión; SLEEP_QUOTA descansa en el apartamento (lounge).
    const inReview = agent.status === 'waiting_sheldon' || agent.status === 'blocked';
    if (agent.isCTO && inReview) {
      map.set(agent.id, SHELDON_CTO_SLOT);
      return;
    }

    if (agent.status === 'working') {
      const base = WORKSTATION_SLOTS[workIdx % WORKSTATION_SLOTS.length];
      const overflow = Math.floor(workIdx / WORKSTATION_SLOTS.length);
      map.set(agent.id, {
        x: base.x + overflow * 0.65,
        z: base.z + overflow * 0.55,
        yaw: base.yaw,
      });
      workIdx++;
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
      });
      loungeIdx++;
    }
  });

  return map;
}

export const Colmena3DView: React.FC<Colmena3DViewProps> = ({
  agents,
  onChangeAgentStatus,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const zoneLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [dockExpanded, setDockExpanded] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<CameraPresetKey>('overview');
  const [webglLost, setWebglLost] = useState<boolean>(false);
  const [simulatingCycle, setSimulatingCycle] = useState<boolean>(false);
  const [cycleMessage, setCycleMessage] = useState<string>('');

  // Mutable refs for Three.js loop to stay decoupled from React renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigsRef = useRef<Map<string, AvatarRig>>(new Map());
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
        setDockExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 120);
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
    controls.minDistance = 7;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.minPolarAngle = 0.22;
    controls.update();

    // Cancel camera preset flight immediately when user interacts
    const onControlStart = () => {
      cameraFlightRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // Build 3-zone Tech Office diorama
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const builtOffice = buildColmenaOffice(scene, maxAniso, isSoftwareGl);

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
        if (hitId) setSelectedAgentId(hitId);
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

      controls.update();

      // Subtle diorama ambient motion (DNA helix & holographic architecture orb)
      builtOffice.dnaHelix.rotation.y = elapsed * 0.45;
      builtOffice.holoOrb.rotation.y = elapsed * 0.7;
      builtOffice.holoOrb.rotation.x = Math.sin(elapsed * 0.5) * 0.25;
      builtOffice.holoOrb.position.y = 1.48 + Math.sin(elapsed * 1.8) * 0.06;

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

  // Sync dynamic agent additions & status transitions into the live Three.js scene
  useEffect(() => {
    const scene = sceneRef.current;
    const shadowTex = shadowTexRef.current;
    if (!scene || !shadowTex) return;

    const slots = assignZoneSlots(agents);
    const rigs = rigsRef.current;

    // Agentes archivados o eliminados: se retiran de la escena.
    const liveIds = new Set(agents.map((a) => a.id));
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

    agents.forEach((agent) => {
      const slot = slots.get(agent.id) ?? { x: 0, z: 0, yaw: 0 };
      const existing = rigs.get(agent.id);

      if (!existing) {
        // Newly created agent — spawn directly in their assigned zone!
        const newRig = createAvatarRig(
          agent,
          shadowTex,
          new THREE.Vector3(slot.x, 0, slot.z),
          slot.yaw
        );
        newRig.selectRing.visible = agent.id === selectedIdRef.current;
        scene.add(newRig.root);
        rigs.set(agent.id, newRig);
      } else {
        const targetVec = new THREE.Vector3(slot.x, 0, slot.z);
        const statusChanged = existing.currentStatus !== agent.status;
        const posChanged = existing.targetPos.distanceToSquared(targetVec) > 0.04;

        if (statusChanged) {
          setAvatarStatusColor(existing, agent.status);
        }
        if (statusChanged || posChanged) {
          existing.targetPos.copy(targetVec);
          existing.targetYaw = slot.yaw;
          existing.waypoints = buildWaypoints(existing.root.position, targetVec);
        }
      }
    });
  }, [agents]);

  // Cleanup automatic simulation timers on unmount
  useEffect(() => {
    return () => {
      cycleTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
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

  const stopCycleSimulation = () => {
    cycleTimersRef.current.forEach((id) => window.clearTimeout(id));
    cycleTimersRef.current = [];
    setSimulatingCycle(false);
    setCycleMessage('');
  };

  const runFullCycleSimulation = () => {
    const targetAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
    if (!targetAgent) return;

    stopCycleSimulation();
    setSimulatingCycle(true);
    flyToPreset('overview');

    // Step 1: Start in Zona de descanso -> Walk to Laboratorio -> Walk to Oficina de Sheldon -> Back to Zona de descanso
    setCycleMessage(`${targetAgent.name}: Saliendo de Zona de descanso → Laboratorio`);
    onChangeAgentStatus(targetAgent.id, 'idle');

    const t1 = window.setTimeout(() => {
      setCycleMessage(`${targetAgent.name}: Caminando a Laboratorio · Ejecutando código`);
      onChangeAgentStatus(targetAgent.id, 'working');
    }, 900);

    const t2 = window.setTimeout(() => {
      setCycleMessage(`${targetAgent.name}: Pasando a Oficina de Sheldon · Revisión`);
      onChangeAgentStatus(targetAgent.id, 'waiting_sheldon');
    }, 5200);

    const t3 = window.setTimeout(() => {
      setCycleMessage(`${targetAgent.name}: Tarea finalizada · Regresando a Zona de descanso`);
      onChangeAgentStatus(targetAgent.id, 'idle');
    }, 9400);

    const t4 = window.setTimeout(() => {
      setSimulatingCycle(false);
      setCycleMessage('');
    }, 13000);

    cycleTimersRef.current = [t1, t2, t3, t4];
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

        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const statusColor = STATUS_META[agent.status].color;
          return (
            <button
              key={agent.id}
              type="button"
              ref={(el) => {
                if (el) labelRefs.current.set(agent.id, el);
                else labelRefs.current.delete(agent.id);
              }}
              onClick={() => setSelectedAgentId(agent.id)}
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
              <span className="whitespace-nowrap">{agent.name}</span>
              {agent.isCTO && (
                <span className="font-mono text-[9px] text-amber-400">CTO</span>
              )}
            </button>
          );
        })}
      </div>

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

      {/* Unified Collapsible Bottom Control & Simulation Dock (Zero Side Occlusion, No backdrop-blur) */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[min(960px,94%)] -translate-x-1/2">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockExpanded((prev) => !prev)}
            className="pointer-events-auto flex items-center gap-1.5 rounded-t-xl border border-b-0 border-slate-700/80 bg-[#0B1220]/95 px-4 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-cyan-300"
          >
            {dockExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Ocultar Controles (H)</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Mostrar Simulación y Cámaras (H)</span>
              </>
            )}
          </button>

          {dockExpanded && (
            <div className="pointer-events-auto w-full rounded-2xl border border-slate-800/90 bg-[#0B1220]/96 p-4 shadow-2xl">
              {/* Row 1: Camera Presets + Cycle Simulation Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Eye className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Cámara</span>
                  </span>
                  {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => flyToPreset(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                        activePreset === key
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/60'
                          : 'bg-slate-900/90 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                    >
                      {CAMERA_PRESETS[key].label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => flyToPreset('overview')}
                    title="Restablecer vista"
                    className="ml-1 flex items-center gap-1 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100 active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  {cycleMessage && (
                    <span className="font-mono text-[11px] text-cyan-300">
                      {cycleMessage}
                    </span>
                  )}
                  {simulatingCycle ? (
                    <button
                      type="button"
                      onClick={stopCycleSimulation}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-3.5 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-rose-500/50 transition-all hover:bg-rose-500/30 active:scale-95 whitespace-nowrap"
                    >
                      <Square className="h-3 w-3" />
                      <span>Detener Simulación</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={runFullCycleSimulation}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95 whitespace-nowrap"
                    >
                      <Play className="h-3 w-3" />
                      <span>Simular Recorrido Completo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Quick Agent State Simulator & Selected Agent Telemetry */}
              {selectedAgent && (
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
                  {/* Agent Selector */}
                  <div className="flex items-center gap-2 lg:col-span-4">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <label htmlFor="agent-sim-select" className="sr-only">
                      Seleccionar agente
                    </label>
                    <select
                      id="agent-sim-select"
                      value={selectedAgent.id}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} — {ag.title} ({STATUS_META[ag.status].label})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct State Transition Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 lg:col-span-5">
                    <button
                      type="button"
                      onClick={() => {
                        stopCycleSimulation();
                        onChangeAgentStatus(selectedAgent.id, 'working');
                      }}
                      className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                        selectedAgent.status === 'working'
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/70'
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Trabajar · Laboratorio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCycleSimulation();
                        onChangeAgentStatus(selectedAgent.id, 'waiting_sheldon');
                      }}
                      className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                        selectedAgent.status === 'waiting_sheldon'
                          ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/70'
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Revisión · Oficina de Sheldon
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCycleSimulation();
                        onChangeAgentStatus(selectedAgent.id, 'idle');
                      }}
                      className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                        selectedAgent.status === 'idle'
                          ? 'bg-slate-700/60 text-slate-100 ring-1 ring-slate-400/70'
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Descansar · Zona de descanso
                    </button>
                  </div>

                  {/* Compact Agent Telemetry */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2 text-xs lg:col-span-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span className="truncate font-mono text-[11px]">
                          {MODEL_TIER_META[selectedAgent.modelTier].shortLabel}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {selectedAgent.currentTask}
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[11px]">
                      <div
                        className={
                          selectedAgent.ramKb === 0
                            ? 'text-slate-400'
                            : 'text-emerald-400'
                        }
                      >
                        {selectedAgent.ramKb === 0
                          ? 'En reposo'
                          : `${Math.round(selectedAgent.ramKb / 1024)} MB`}
                      </div>
                      <div className="text-[10px] text-slate-500">RAM</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
