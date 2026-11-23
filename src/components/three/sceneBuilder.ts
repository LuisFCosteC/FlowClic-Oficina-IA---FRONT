import * as THREE from 'three';
import {
  createBbtRugTexture,
  createLabFloorTexture,
  createMonitorScreenTexture,
  createServerRackTexture,
  createSheldonWhiteboardTexture,
  createTvScreenTexture,
  createWoodFloorTexture,
} from './proceduralTextures';

export interface ZoneSlot {
  x: number;
  z: number;
  yaw: number;
}

// Laboratorio: Workstations (facing monitors)
export const WORKSTATION_SLOTS: ZoneSlot[] = [
  { x: -11.4, z: -3.2, yaw: Math.PI },
  { x: -8.9, z: -3.2, yaw: Math.PI },
  { x: -6.4, z: -3.2, yaw: Math.PI },
  { x: -11.4, z: 0.4, yaw: Math.PI },
  { x: -8.9, z: 0.4, yaw: Math.PI },
  { x: -6.4, z: 0.4, yaw: Math.PI },
  { x: -11.4, z: 4.0, yaw: Math.PI },
  { x: -8.9, z: 4.0, yaw: Math.PI },
  { x: -6.4, z: 4.0, yaw: Math.PI },
  { x: -12.6, z: 2.2, yaw: -Math.PI / 2 },
  { x: -5.0, z: 2.2, yaw: Math.PI / 2 },
  { x: -12.6, z: -1.4, yaw: -Math.PI / 2 },
];

// Oficina de Sheldon: Work & Review Hub
export const SHELDON_CTO_SLOT: ZoneSlot = { x: 0.2, z: -3.4, yaw: 0 };

export const REVIEW_SLOTS: ZoneSlot[] = [
  { x: -1.4, z: -1.2, yaw: Math.PI * 0.82 },
  { x: 1.8, z: -1.2, yaw: -Math.PI * 0.82 },
  { x: -2.0, z: 1.4, yaw: Math.PI * 0.72 },
  { x: 2.3, z: 1.4, yaw: -Math.PI * 0.72 },
  { x: 0.2, z: 2.7, yaw: Math.PI },
  { x: -1.2, z: 3.4, yaw: Math.PI * 0.88 },
  { x: 1.6, z: 3.4, yaw: -Math.PI * 0.88 },
  { x: -2.2, z: -2.6, yaw: -Math.PI * 0.45 },
  { x: 2.5, z: -2.6, yaw: Math.PI * 0.45 },
];

// Zona de descanso: Rest & Lounge Zone
export const LOUNGE_SLOTS: ZoneSlot[] = [
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

export const ZONE_LABEL_ANCHORS = [
  {
    id: 'laboratorio',
    title: 'LABORATORIO',
    subtitle: 'Estaciones de Trabajo',
    pos: new THREE.Vector3(-8.9, 3.3, -6.2),
    accent: '#06B6D4',
  },
  {
    id: 'oficina-sheldon',
    title: 'OFICINA DE SHELDON',
    subtitle: 'Revisión y Arquitectura CTO',
    pos: new THREE.Vector3(0.2, 3.6, -6.2),
    accent: '#F59E0B',
  },
  {
    id: 'zona-descanso',
    title: 'ZONA DE DESCANSO',
    subtitle: 'Lounge & Reposo',
    pos: new THREE.Vector3(9.2, 3.3, -6.2),
    accent: '#FB923C',
  },
];

export interface BuiltOfficeScene {
  dnaHelix: THREE.Group;
  holoOrb: THREE.Mesh;
  dispose: () => void;
}

export function buildColmenaOffice(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltOfficeScene {
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
  const platform = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(29.6, 0.44, 15.2)),
    baseSlabMat
  );
  platform.position.set(0.1, -0.22, -0.2);
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
    trackGeo(new THREE.BoxGeometry(29.7, 0.06, 0.08)),
    trimStripMat
  );
  frontTrim.position.set(0.1, -0.02, 7.42);
  scene.add(frontTrim);

  // Back Architectural Wall
  const backWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(29.6, 4.1, 0.28)),
    backWallMat
  );
  backWall.position.set(0.1, 2.05, -7.65);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Glass partition dividers between Zones A/B and B/C (with open walking doorways!)
  const addPartition = (xPos: number) => {
    const backGlass = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.1, 3.0, 5.2)),
      glassWallMat
    );
    backGlass.position.set(xPos, 1.5, -4.9);
    scene.add(backGlass);

    const framePost = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 3.15, 0.16)),
      darkMetalMat
    );
    framePost.position.set(xPos, 1.58, -2.3);
    scene.add(framePost);

    const frontLowWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.12, 0.9, 3.6)),
      darkMetalMat
    );
    frontLowWall.position.set(xPos, 0.45, 5.2);
    scene.add(frontLowWall);
  };
  addPartition(-3.7);
  addPartition(4.1);

  // =========================================================================
  // LABORATORIO: ESTACIONES DE TRABAJO
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
    trackGeo(new THREE.PlaneGeometry(10.6, 14.4)),
    labFloorMat
  );
  labFloor.rotation.x = -Math.PI / 2;
  labFloor.position.set(-9.1, 0.015, -0.2);
  labFloor.receiveShadow = true;
  scene.add(labFloor);

  // Laboratorio border accent line
  const zoneABar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.2, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  zoneABar.position.set(-9.1, 0.025, 6.85);
  scene.add(zoneABar);

  // Build 9 composite workstations in Laboratorio (3x3 grid matching WORKSTATION_SLOTS[0..8])
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

  const buildWorkstation = (slotX: number, slotZ: number, idx: number) => {
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

    scene.add(group);
  };

  for (let i = 0; i < 9; i++) {
    buildWorkstation(WORKSTATION_SLOTS[i].x, WORKSTATION_SLOTS[i].z, i);
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
  [-12.6, -10.4, -5.6].forEach((sx) => {
    const rack = new THREE.Group();
    rack.position.set(sx, 0, -6.95);
    const chassis = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.15, 2.7, 0.85)),
      darkMetalMat
    );
    chassis.position.y = 1.35;
    chassis.castShadow = true;
    rack.add(chassis);

    const face = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.04, 2.52)),
      serverFaceMat
    );
    face.position.set(0, 1.35, 0.432);
    rack.add(face);
    scene.add(rack);
  });

  // =========================================================================
  // OFICINA DE SHELDON: REUNIONES Y REVISIÓN
  // =========================================================================
  const daisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101827,
      roughness: 0.48,
      metalness: 0.35,
    })
  );
  const dais = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2, 0.08, 13.8)),
    daisMat
  );
  dais.position.set(0.2, 0.04, -0.3);
  dais.receiveShadow = true;
  scene.add(dais);

  // Zone B amber border line
  const zoneBBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
        roughness: 0.3,
      })
    )
  );
  zoneBBar.position.set(0.2, 0.09, 6.5);
  scene.add(zoneBBar);

  // Helper to construct iconic Sheldon whiteboards (with aluminum frame & tray)
  const buildWhiteboard = (
    variant: 'main' | 'left' | 'right',
    width: number,
    height: number,
    pos: THREE.Vector3,
    rotY: number,
    rolling: boolean
  ) => {
    const wbGroup = new THREE.Group();
    wbGroup.position.copy(pos);
    wbGroup.rotation.y = rotY;

    const frame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width + 0.14, height + 0.14, 0.08)),
      brushedAlumMat
    );
    frame.position.y = 1.75;
    frame.castShadow = true;
    wbGroup.add(frame);

    const wbTex = trackTex(createSheldonWhiteboardTexture(variant, maxAnisotropy));
    const wbMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: wbTex,
        emissiveMap: wbTex,
        emissive: 0xfef3c7,
        emissiveIntensity: 0.22,
        roughness: 0.26,
        metalness: 0.05,
      })
    );
    const board = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(width, height)),
      wbMat
    );
    board.position.set(0, 1.75, 0.046);
    wbGroup.add(board);

    // Marker tray
    const tray = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width * 0.75, 0.05, 0.14)),
      brushedAlumMat
    );
    tray.position.set(0, 1.75 - height / 2 - 0.05, 0.08);
    wbGroup.add(tray);

    if (rolling) {
      const standLegGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.9, 8));
      [-width / 2 - 0.05, width / 2 + 0.05].forEach((lx) => {
        const leg = new THREE.Mesh(standLegGeo, darkMetalMat);
        leg.position.set(lx, 0.95, 0);
        wbGroup.add(leg);

        const foot = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.08, 0.06, 0.65)),
          darkMetalMat
        );
        foot.position.set(lx, 0.05, 0);
        wbGroup.add(foot);
      });
    }

    scene.add(wbGroup);
  };

  // Main central whiteboard + 2 angled rolling whiteboards
  buildWhiteboard('main', 3.9, 1.95, new THREE.Vector3(0.2, 0.15, -7.2), 0, false);
  buildWhiteboard(
    'left',
    2.2,
    1.55,
    new THREE.Vector3(-2.45, 0.05, -5.2),
    Math.PI * 0.24,
    true
  );
  buildWhiteboard(
    'right',
    2.2,
    1.55,
    new THREE.Vector3(2.85, 0.05, -5.2),
    -Math.PI * 0.24,
    true
  );

  // Central Holographic Architecture Table in Oficina de Sheldon
  const holoTable = new THREE.Group();
  holoTable.position.set(0.2, 0.08, 0.4);
  const tableBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.55, 0.78, 0.72, 16)),
    darkMetalMat
  );
  tableBase.position.y = 0.36;
  tableBase.castShadow = true;
  holoTable.add(tableBase);

  const tableTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.38, 1.32, 0.09, 24)),
    deskTopMat
  );
  tableTop.position.y = 0.76;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  holoTable.add(tableTop);

  const holoPad = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.42, 0.96, 32)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide,
      })
    )
  );
  holoPad.rotation.x = -Math.PI / 2;
  holoPad.position.y = 0.815;
  holoTable.add(holoPad);

  // Subtle floating wireframe holographic core over Sheldon's review table
  const holoOrb = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(0.36, 1)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.95,
        wireframe: true,
        roughness: 0.2,
      })
    )
  );
  holoOrb.position.set(0.2, 1.48, 0.4);
  scene.add(holoTable, holoOrb);

  // =========================================================================
  // ZONA DE DESCANSO: SALA DE DESCANSO Y REPOSO
  // =========================================================================
  const woodTex = trackTex(createWoodFloorTexture(maxAnisotropy));
  const woodFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(10.4, 14.4)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.62,
        metalness: 0.06,
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

  // Zona de descanso warm amber border line
  const zoneCBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.8, 0.03, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xfb923c,
        emissiveIntensity: 0.75,
        roughness: 0.35,
      })
    )
  );
  zoneCBar.position.set(9.45, 0.03, 6.85);
  scene.add(zoneCBar);

  // Patterned living room rug
  const rugTex = trackTex(createBbtRugTexture(maxAnisotropy));
  const rug = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(5.6, 4.1)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: rugTex,
        roughness: 0.92,
        metalness: 0.0,
      })
    )
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(8.8, 0.04, 1.4);
  rug.receiveShadow = true;
  scene.add(rug);

  // Leather Sofa (composite 7-part couch with Sheldon's spot cushion)
  const leatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c4328,
      roughness: 0.56,
      metalness: 0.08,
    })
  );
  const cushionAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.75,
      metalness: 0.02,
    })
  );
  const sofa = new THREE.Group();
  sofa.position.set(8.8, 0, -0.6);

  const sofaBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.1, 0.42, 1.2)),
    leatherMat
  );
  sofaBase.position.y = 0.25;
  sofaBase.castShadow = true;
  sofa.add(sofaBase);

  const sofaBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.1, 0.72, 0.28)),
    leatherMat
  );
  sofaBack.position.set(0, 0.72, -0.46);
  sofaBack.castShadow = true;
  sofa.add(sofaBack);

  [-1.92, 1.92].forEach((ax) => {
    const arm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.56, 1.2)),
      leatherMat
    );
    arm.position.set(ax, 0.46, 0);
    arm.castShadow = true;
    sofa.add(arm);
  });

  // 3 seat cushions (rightmost = Sheldon's sacred spot with subtle golden pillow!)
  [-1.18, 0, 1.18].forEach((cx, cIdx) => {
    const cushion = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.12, 0.16, 0.88)),
      cIdx === 2 ? cushionAccentMat : leatherMat
    );
    cushion.position.set(cx, 0.52, 0.1);
    sofa.add(cushion);
  });
  scene.add(sofa);

  // Matching lounge armchair
  const armchair = new THREE.Group();
  armchair.position.set(5.9, 0, 1.8);
  armchair.rotation.y = Math.PI * 0.42;
  const acBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.25, 0.42, 1.15)),
    leatherMat
  );
  acBase.position.y = 0.25;
  const acBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.25, 0.68, 0.24)),
    leatherMat
  );
  acBack.position.set(0, 0.68, -0.45);
  armchair.add(acBase, acBack);
  scene.add(armchair);

  // Wooden Coffee Table with takeaway boxes & mugs
  const woodFurnitureMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.6,
      metalness: 0.08,
    })
  );
  const coffeeTable = new THREE.Group();
  coffeeTable.position.set(8.8, 0, 1.75);
  const ctTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.3, 0.08, 1.15)),
    woodFurnitureMat
  );
  ctTop.position.y = 0.46;
  ctTop.castShadow = true;
  coffeeTable.add(ctTop);
  [
    [-1.0, -0.45],
    [1.0, -0.45],
    [-1.0, 0.45],
    [1.0, 0.45],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.44, 0.08)),
      woodFurnitureMat
    );
    leg.position.set(lx, 0.22, lz);
    coffeeTable.add(leg);
  });

  // Takeout food boxes (Thai food nights)
  const takeoutMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
  );
  const box1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.2, 0.24)),
    takeoutMat
  );
  box1.position.set(-0.35, 0.6, 0.08);
  const box2 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.22, 0.18, 0.22)),
    takeoutMat
  );
  box2.position.set(-0.05, 0.59, -0.15);
  box2.rotation.y = 0.4;
  const mug = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }))
  );
  mug.position.set(0.42, 0.57, 0.12);
  coffeeTable.add(box1, box2, mug);
  scene.add(coffeeTable);

  // Glowing Wall / Console TV (facing the sofa)
  const tvUnit = new THREE.Group();
  tvUnit.position.set(8.8, 0, 5.45);
  const consoleBox = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4, 0.62, 0.72)),
    darkMetalMat
  );
  consoleBox.position.y = 0.31;
  consoleBox.castShadow = true;
  tvUnit.add(consoleBox);

  const tvFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.85, 1.58, 0.1)),
    darkMetalMat
  );
  tvFrame.position.set(0, 1.56, 0);
  tvFrame.castShadow = true;
  tvUnit.add(tvFrame);

  const tvTex = trackTex(createTvScreenTexture(maxAnisotropy));
  const tvScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.68, 1.42)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: tvTex,
        emissiveMap: tvTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      })
    )
  );
  tvScreen.position.set(0, 1.56, -0.058);
  tvScreen.rotation.y = Math.PI;
  tvUnit.add(tvScreen);
  scene.add(tvUnit);

  // Two-tier Rest Bunk Pods along back wall
  const mattressMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.02,
    })
  );
  const blanketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const pillowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8,
    })
  );
  const warmStripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.1,
      roughness: 0.25,
    })
  );

  const buildRestBunk = (bx: number, bz: number) => {
    const bunk = new THREE.Group();
    bunk.position.set(bx, 0, bz);

    // 4 Corner posts
    const postGeo = trackGeo(new THREE.BoxGeometry(0.11, 2.55, 0.11));
    [
      [-1.12, -0.56],
      [1.12, -0.56],
      [-1.12, 0.56],
      [1.12, 0.56],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, woodFurnitureMat);
      post.position.set(px, 1.28, pz);
      post.castShadow = true;
      bunk.add(post);
    });

    // Lower & Upper bunks
    [0.48, 1.62].forEach((by) => {
      const frame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.3, 0.12, 1.18)),
        woodFurnitureMat
      );
      frame.position.y = by;
      bunk.add(frame);

      const mattress = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.14, 0.18, 1.06)),
        mattressMat
      );
      mattress.position.y = by + 0.14;
      bunk.add(mattress);

      const blanket = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.42, 0.2, 1.08)),
        blanketMat
      );
      blanket.position.set(0.32, by + 0.15, 0);
      bunk.add(blanket);

      const pillow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.12, 0.72)),
        pillowMat
      );
      pillow.position.set(-0.76, by + 0.27, 0);
      bunk.add(pillow);

      // Warm reading LED strip
      const strip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.8, 0.035, 0.035)),
        warmStripMat
      );
      strip.position.set(0, by + 0.74, -0.52);
      bunk.add(strip);
    });

    // Ladder on right front
    const railGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8));
    [-0.18, 0.18].forEach((rx) => {
      const rail = new THREE.Mesh(railGeo, brushedAlumMat);
      rail.position.set(0.75 + rx, 1.1, 0.62);
      bunk.add(rail);
    });
    for (let r = 0; r < 5; r++) {
      const rung = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8)),
        brushedAlumMat
      );
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0.75, 0.35 + r * 0.38, 0.62);
      bunk.add(rung);
    }

    scene.add(bunk);
  };

  buildRestBunk(6.8, -6.25);
  buildRestBunk(9.7, -6.25);

  // DNA Double Helix Sculpture on pedestal (right corner of Zona de descanso)
  const dnaPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45, 0.52, 0.45, 16)),
    darkMetalMat
  );
  dnaPedestal.position.set(13.2, 0.225, -5.2);
  scene.add(dnaPedestal);

  const dnaHelix = new THREE.Group();
  dnaHelix.position.set(13.2, 0.5, -5.2);
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
  const sphereGeo = trackGeo(new THREE.SphereGeometry(0.07, 10, 10));
  const rungGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 6));
  for (let i = 0; i < 12; i++) {
    const angle = i * 0.52;
    const y = i * 0.19;
    const r = 0.31;
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

  // Warm Floor Lamp beside Sofa
  const lampGroup = new THREE.Group();
  lampGroup.position.set(12.2, 0, -1.1);
  const lampStem = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 2.1, 8)),
    brushedAlumMat
  );
  lampStem.position.y = 1.05;
  const lampShade = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.38, 0.45, 16, 1, true)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    )
  );
  lampShade.position.y = 2.08;
  lampGroup.add(lampStem, lampShade);
  scene.add(lampGroup);

  // =========================================================================
  // BALANCED ZONE LIGHTING RIG (<= 2 Shadow Casters + Distinct Zone Moods)
  // =========================================================================
  const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
  scene.add(hemiLight);

  // Primary directional key light (casts crisp soft shadows across diorama)
  const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.25);
  keyLight.position.set(12, 22, 14);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.025;
  }
  scene.add(keyLight);

  // Laboratorio: Cool Cyan Monitor Lab Glow
  const labLight = new THREE.PointLight(0x06b6d4, 18, 17, 1.6);
  labLight.position.set(-9.0, 4.2, 0.2);
  scene.add(labLight);

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
  sheldonSpot.target.position.set(0.2, 0.8, -3.5);
  scene.add(sheldonSpot, sheldonSpot.target);

  // Zona de descanso: Warm Cozy Amber Light + TV Ambient Glow
  const loungeWarmLight = new THREE.PointLight(0xfb923c, 22, 16, 1.5);
  loungeWarmLight.position.set(11.0, 3.8, -0.5);
  scene.add(loungeWarmLight);

  const tvGlowLight = new THREE.PointLight(0x38bdf8, 8, 9, 1.8);
  tvGlowLight.position.set(8.8, 1.8, 4.2);
  scene.add(tvGlowLight);

  return {
    dnaHelix,
    holoOrb,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
