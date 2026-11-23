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

// Oficina de Sheldon: Work & Review Hub (Apartamento 4A)
export const SHELDON_CTO_SLOT: ZoneSlot = { x: -0.6, z: 0.6, yaw: 0 };

export const REVIEW_SLOTS: ZoneSlot[] = [
  { x: 0.8, z: -2.7, yaw: Math.PI },
  { x: 1.6, z: -2.7, yaw: Math.PI },
  { x: -1.2, z: -0.7, yaw: Math.PI },
  { x: -0.4, z: -0.7, yaw: Math.PI },
  { x: -1.8, z: 0.6, yaw: -Math.PI * 0.3 },
  { x: -1.8, z: 1.5, yaw: -Math.PI * 0.3 },
  { x: 2.5, z: -1.8, yaw: Math.PI },
  { x: 3.2, z: -1.8, yaw: Math.PI },
  { x: -1.2, z: -4.8, yaw: 0 },
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
    trackGeo(new THREE.PlaneGeometry(7.6, 14.4)),
    sheldonFloorMat
  );
  sheldonFloor.rotation.x = -Math.PI / 2;
  sheldonFloor.position.set(0.2, 0.02, -0.2);
  sheldonFloor.receiveShadow = true;
  scene.add(sheldonFloor);

  // Moldura / línea acento frontal
  const zoneBBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.4, 0.04, 0.08)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    )
  );
  zoneBBar.position.set(0.2, 0.03, 6.85);
  scene.add(zoneBBar);

  // Zócalo de madera en la pared de fondo
  const baseboardMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.6 })
  );
  const baseboard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.6, 0.22, 0.06)),
    baseboardMat
  );
  baseboard.position.set(0.2, 0.11, -7.16);
  scene.add(baseboard);

  // 2. Sofá de cuero marrón (Apartamento 4A) con "El sitio de Sheldon"
  const brownLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x61361f,
      roughness: 0.52,
      metalness: 0.08,
    })
  );
  const sheldonSpotCushionMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97706, // Cojín diferenciado en el extremo izquierdo
      roughness: 0.65,
      metalness: 0.04,
    })
  );
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(0.2, 0, 0.5);

  const sofaBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4, 0.32, 1.05)),
    brownLeatherMat
  );
  sofaBase.position.y = 0.22;
  sofaBase.castShadow = true;
  sofaGroup.add(sofaBase);

  const sofaBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4, 0.72, 0.34)),
    brownLeatherMat
  );
  sofaBack.position.set(0, 0.65, -0.42);
  sofaBack.castShadow = true;
  sofaGroup.add(sofaBack);

  // Brazos izquierdo y derecho
  [-1.24, 1.24].forEach((ax) => {
    const arm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.58, 1.08)),
      brownLeatherMat
    );
    arm.position.set(ax, 0.54, 0);
    arm.castShadow = true;
    sofaGroup.add(arm);
  });

  // 3 Cojines: Extremo izquierdo mirando a la pantalla (x = -0.74) es el SITIO DE SHELDON
  const cushionGeo = trackGeo(new THREE.BoxGeometry(0.72, 0.16, 0.78));
  const sheldonCushion = new THREE.Mesh(cushionGeo, sheldonSpotCushionMat);
  sheldonCushion.position.set(-0.74, 0.44, 0.08);
  sheldonCushion.castShadow = true;

  const pillow = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 0.22, 0.12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 }))
  );
  pillow.position.set(-0.74, 0.56, -0.22);
  pillow.rotation.x = -0.25;

  const middleCushion = new THREE.Mesh(cushionGeo, brownLeatherMat);
  middleCushion.position.set(0, 0.44, 0.08);
  middleCushion.castShadow = true;

  const rightCushion = new THREE.Mesh(cushionGeo, brownLeatherMat);
  rightCushion.position.set(0.74, 0.44, 0.08);
  rightCushion.castShadow = true;

  sofaGroup.add(sheldonCushion, pillow, middleCushion, rightCushion);
  scene.add(sofaGroup);

  // 3. Mesa de centro baja de madera
  const coffeeTable = new THREE.Group();
  coffeeTable.position.set(0.2, 0, 1.8);
  const coffeeTableTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 0.08, 0.85)),
    baseboardMat
  );
  coffeeTableTop.position.y = 0.42;
  coffeeTableTop.castShadow = true;
  coffeeTable.add(coffeeTableTop);

  [
    [-0.7, -0.34],
    [0.7, -0.34],
    [-0.7, 0.34],
    [0.7, 0.34],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8)),
      baseboardMat
    );
    leg.position.set(lx, 0.21, lz);
    coffeeTable.add(leg);
  });

  // Cajas de comida para llevar (Thai / pizza / china)
  const takeoutBox1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.22, 0.16, 0.22)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 }))
  );
  takeoutBox1.position.set(-0.35, 0.52, 0.1);
  takeoutBox1.rotation.y = 0.35;

  const pizzaBox = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.36, 0.05, 0.36)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }))
  );
  pizzaBox.position.set(0.35, 0.46, -0.1);
  pizzaBox.rotation.y = -0.2;

  // Laptops abiertos (2 laptops)
  const laptopMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 }));
  const screenGlowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 }));

  const buildLaptop = (x: number, z: number, rotY: number) => {
    const laptop = new THREE.Group();
    laptop.position.set(x, 0.44, z);
    laptop.rotation.y = rotY;
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.02, 0.2)), laptopMat);
    const screen = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.18, 0.015)), screenGlowMat);
    screen.position.set(0, 0.09, -0.09);
    screen.rotation.x = -0.25;
    laptop.add(base, screen);
    return laptop;
  };
  coffeeTable.add(buildLaptop(-0.15, -0.15, 0.15));
  coffeeTable.add(buildLaptop(0.42, 0.18, -0.3));

  // Cómics sobre la mesa
  const comicBookMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
  const comicBook = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.025, 0.26)), comicBookMat);
  comicBook.position.set(-0.4, 0.47, -0.18);
  coffeeTable.add(comicBook);
  coffeeTable.add(takeoutBox1, pizzaBox);
  scene.add(coffeeTable);

  // 4. Mueble de TV y Televisor frente al sofá
  const tvGroup = new THREE.Group();
  tvGroup.position.set(0.2, 0, 3.6);
  const tvConsole = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.8, 0.45, 0.5)),
    baseboardMat
  );
  tvConsole.position.y = 0.225;
  tvConsole.castShadow = true;
  tvGroup.add(tvConsole);

  const tvScreen = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.4, 0.82, 0.05)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.2, emissive: 0x0369a1, emissiveIntensity: 0.15 }))
  );
  tvScreen.position.set(0, 0.92, 0);
  tvScreen.rotation.y = Math.PI;
  tvGroup.add(tvScreen);

  const tvBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.4, 0.03, 0.24)),
    darkMetalMat
  );
  tvBase.position.set(0, 0.465, 0);
  tvGroup.add(tvBase);
  scene.add(tvGroup);

  // 5. Cocina americana al fondo (barra alta con taburetes, nevera con imanes)
  const kitchenCounter = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4, 1.05, 0.85)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.4 }))
  );
  kitchenCounter.position.set(-1.2, 0.525, -6.1);
  kitchenCounter.castShadow = true;
  scene.add(kitchenCounter);

  [-2.2, -1.2, -0.2].forEach((bx) => {
    const stool = new THREE.Group();
    stool.position.set(bx, 0, -5.3);
    const seat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16)),
      baseboardMat
    );
    seat.position.y = 0.72;
    seat.castShadow = true;
    stool.add(seat);
    const post = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8)),
      darkMetalMat
    );
    post.position.y = 0.35;
    stool.add(post);
    const stoolBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 16)),
      darkMetalMat
    );
    stoolBase.position.y = 0.015;
    stool.add(stoolBase);
    scene.add(stool);
  });

  // Nevera metálica con imanes de ecuaciones
  const fridgeGroup = new THREE.Group();
  fridgeGroup.position.set(-3.1, 0, -6.2);
  const fridgeBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.9, 1.95, 0.85)),
    darkMetalMat
  );
  fridgeBody.position.y = 0.975;
  fridgeBody.castShadow = true;
  fridgeGroup.add(fridgeBody);

  const fridgeMagnetCanvas = document.createElement('canvas');
  fridgeMagnetCanvas.width = 512;
  fridgeMagnetCanvas.height = 512;
  const fctx = fridgeMagnetCanvas.getContext('2d')!;
  fctx.fillStyle = '#e2e8f0';
  fctx.fillRect(0, 0, 512, 512);
  fctx.fillStyle = '#94a3b8';
  fctx.fillRect(0, 240, 512, 6);
  const magItems = [
    { t: 'E=mc²', bg: '#ef4444', x: 40, y: 50 },
    { t: 'F=ma', bg: '#3b82f6', x: 280, y: 60 },
    { t: '4A', bg: '#06b6d4', x: 190, y: 130 },
    { t: 'c=299792458', bg: '#10b981', x: 45, y: 180 },
    { t: 'SCHRODINGER', bg: '#8b5cf6', x: 240, y: 200 },
    { t: 'TACOS: JUEVES', bg: '#f59e0b', x: 50, y: 320 },
    { t: 'LAUNDRY 8PM', bg: '#ec4899', x: 260, y: 340 },
    { t: 'QUIET HOURS', bg: '#64748b', x: 120, y: 420 },
  ];
  magItems.forEach((m) => {
    fctx.fillStyle = m.bg;
    fctx.beginPath();
    fctx.roundRect(m.x, m.y, 170, 44, 8);
    fctx.fill();
    fctx.fillStyle = '#ffffff';
    fctx.font = 'bold 16px monospace';
    fctx.fillText(m.t, m.x + 12, m.y + 28);
  });
  const fridgeTex = trackTex(new THREE.CanvasTexture(fridgeMagnetCanvas));
  fridgeTex.colorSpace = THREE.SRGBColorSpace;
  const fridgeFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.86, 1.88)),
    trackMat(new THREE.MeshStandardMaterial({ map: fridgeTex, roughness: 0.4, metalness: 0.3 }))
  );
  fridgeFace.position.set(0, 0.975, 0.43);
  fridgeGroup.add(fridgeFace);
  scene.add(fridgeGroup);

  // 6. Dos escritorios de trabajo a la derecha junto a los ventanales
  const deskMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.5 }));
  [
    { x: 2.7, z: -3.4 },
    { x: 2.7, z: -1.4 },
  ].forEach((dp) => {
    const dGroup = new THREE.Group();
    dGroup.position.set(dp.x, 0, dp.z);

    const dTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 0.08, 0.85)), deskMat);
    dTop.position.y = 0.74;
    dTop.castShadow = true;
    dGroup.add(dTop);

    [[-0.72, -0.36], [0.72, -0.36], [-0.72, 0.36], [0.72, 0.36]].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.74, 0.06)), darkMetalMat);
      leg.position.set(px, 0.37, pz);
      dGroup.add(leg);
    });

    [-0.38, 0.38].forEach((mx, mIdx) => {
      const monStand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.28, 0.05)), darkMetalMat);
      monStand.position.set(mx, 0.92, -0.15);
      const monBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.02, 0.16)), darkMetalMat);
      monBase.position.set(mx, 0.79, -0.15);
      const monScreen = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.68, 0.42, 0.03)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.75, roughness: 0.2 }))
      );
      monScreen.position.set(mx, 1.08, -0.15);
      monScreen.rotation.y = mIdx === 0 ? 0.15 : -0.15;
      dGroup.add(monStand, monBase, monScreen);
    });

    const pcTower = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.48, 0.5)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.25 }))
    );
    pcTower.position.set(0.62, 0.24, 0.2);
    dGroup.add(pcTower);

    const chair = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.48, 0.55, 0.48)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }))
    );
    chair.position.set(0, 0.52, 0.55);
    dGroup.add(chair);

    scene.add(dGroup);
  });

  // HoloOrb decorativo colocado sobre el escritorio de Sheldon
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
  holoOrb.position.set(2.2, 0.94, -3.2);
  scene.add(holoOrb);

  // 7. Pizarras blancas con ruedas (teoría de cuerdas, materia oscura, ecuaciones)
  const wbCanvas = document.createElement('canvas');
  wbCanvas.width = 1024;
  wbCanvas.height = 512;
  const wbCtx = wbCanvas.getContext('2d')!;
  wbCtx.fillStyle = '#f8fafc';
  wbCtx.fillRect(0, 0, 1024, 512);
  wbCtx.strokeStyle = '#e2e8f0';
  wbCtx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 64) {
    wbCtx.beginPath(); wbCtx.moveTo(x, 0); wbCtx.lineTo(x, 512); wbCtx.stroke();
  }
  wbCtx.font = 'bold 22px monospace';
  wbCtx.fillStyle = '#0f172a';
  wbCtx.fillText('TEORÍA DE CUERDAS — COMPACTIFICACIÓN HETERÓTICA E8xE8', 35, 45);
  wbCtx.font = '18px monospace';
  wbCtx.fillStyle = '#1e3a8a';
  wbCtx.fillText('S = -1/(4πα\') ∫ d²σ √-g [ g^{ab} ∂_a X^μ ∂_b X_μ + i ψ̄ γ^a ∇_a ψ ]', 35, 85);
  wbCtx.fillStyle = '#0f172a';
  wbCtx.fillText('HALO DE MATERIA OSCURA — PERFIL NAVARRO-FRENK-WHITE', 35, 140);
  wbCtx.fillStyle = '#047857';
  wbCtx.fillText('ρ(r) = ρ_0 / [ (r/r_s) (1 + r/r_s)² ]  ⇒  M_vir = 4π ρ_0 r_s³ [ ln(1+c) - c/(1+c) ]', 35, 175);
  wbCtx.fillStyle = '#b91c1c';
  wbCtx.font = 'bold 20px monospace';
  wbCtx.fillText('ECUACIONES DE CAMPO & GRAVITACIÓN CUÁNTICA', 35, 235);
  wbCtx.fillStyle = '#1e293b';
  wbCtx.font = '18px monospace';
  wbCtx.fillText('G_μν + Λ g_μν = (8πG / c⁴) T_μν ,   ∇_μ T^{μν} = 0', 35, 275);
  wbCtx.fillText('iℏ ∂/∂t Ψ(x,t) = [ -ℏ²/(2m) ∇² + V(x) ] Ψ(x,t)', 35, 320);
  wbCtx.strokeStyle = '#dc2626';
  wbCtx.lineWidth = 3;
  wbCtx.beginPath();
  wbCtx.arc(880, 260, 60, 0, Math.PI * 2);
  wbCtx.stroke();
  wbCtx.fillStyle = '#dc2626';
  wbCtx.font = 'bold 20px monospace';
  wbCtx.fillText('Q.E.D.!', 850, 266);

  const physicsWbTex = trackTex(new THREE.CanvasTexture(wbCanvas));
  physicsWbTex.colorSpace = THREE.SRGBColorSpace;
  const physicsWbMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: physicsWbTex,
      roughness: 0.28,
      metalness: 0.05,
    })
  );

  const buildPhysicsWhiteboard = (x: number, z: number, rotY: number, width: number, height: number) => {
    const wb = new THREE.Group();
    wb.position.set(x, 0, z);
    wb.rotation.y = rotY;

    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.08)), brushedAlumMat);
    frame.position.y = 1.7;
    frame.castShadow = true;
    wb.add(frame);

    const board = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(width, height)), physicsWbMat);
    board.position.set(0, 1.7, 0.045);
    wb.add(board);

    const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width * 0.8, 0.04, 0.12)), brushedAlumMat);
    tray.position.set(0, 1.7 - height / 2 - 0.04, 0.08);
    wb.add(tray);

    [-width / 2 + 0.05, width / 2 - 0.05].forEach((lx) => {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8)), darkMetalMat);
      leg.position.set(lx, 0.9, 0);
      wb.add(leg);
      const foot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.06, 0.6)), darkMetalMat);
      foot.position.set(lx, 0.04, 0);
      wb.add(foot);
    });

    scene.add(wb);
  };

  buildPhysicsWhiteboard(1.1, -3.8, 0, 2.2, 1.5);
  buildPhysicsWhiteboard(-0.8, -1.8, 0, 2.0, 1.4);
  buildPhysicsWhiteboard(-2.6, 0.8, Math.PI * 0.28, 1.9, 1.4);

  // 8. Estanterías, cajas de cómics, figuras, espada decorativa, ADN y busto
  const bookcase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.65, 2.6, 2.2)),
    baseboardMat
  );
  bookcase.position.set(-3.35, 1.3, -3.6);
  bookcase.castShadow = true;
  scene.add(bookcase);

  const comicBoxGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.26, 0.38));
  const comicBoxMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 }));
  const comicBoxInst = new THREE.InstancedMesh(comicBoxGeo, comicBoxMat, 12);
  const dummy = new THREE.Object3D();
  let boxIdx = 0;
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let col = 0; col < 4; col++) {
      dummy.position.set(-3.25, 0.45 + shelf * 0.62, -4.3 + col * 0.44);
      dummy.updateMatrix();
      comicBoxInst.setMatrixAt(boxIdx++, dummy.matrix);
    }
  }
  comicBoxInst.instanceMatrix.needsUpdate = true;
  scene.add(comicBoxInst);

  const figColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
  figColors.forEach((color, i) => {
    const figGroup = new THREE.Group();
    figGroup.position.set(-3.25, 2.25, -4.2 + i * 0.35);
    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8)), trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.3 })));
    body.position.y = 0.08;
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 8, 8)), trackMat(new THREE.MeshStandardMaterial({ color: 0xffedd5 })));
    head.position.y = 0.18;
    figGroup.add(body, head);
    scene.add(figGroup);
  });

  const swordGroup = new THREE.Group();
  swordGroup.position.set(-3.65, 2.4, -1.8);
  swordGroup.rotation.y = Math.PI / 2;
  swordGroup.rotation.z = 0.12;
  const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 1.2, 0.015)), brushedAlumMat);
  const crossguard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.04, 0.04)), darkMetalMat);
  crossguard.position.y = -0.35;
  const pommel = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.035, 8, 8)), darkMetalMat);
  pommel.position.y = -0.55;
  swordGroup.add(blade, crossguard, pommel);
  scene.add(swordGroup);

  // Reubicación de la maqueta de ADN a la Oficina de Sheldon
  const dnaPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.35, 0.42, 0.6, 16)),
    darkMetalMat
  );
  dnaPedestal.position.set(3.3, 0.3, 1.6);
  scene.add(dnaPedestal);

  const dnaHelix = new THREE.Group();
  dnaHelix.position.set(3.3, 0.65, 1.6);
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

  // Busto decorativo estilizado anónimo
  const bustPedestal = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.4, 0.9, 0.4)),
    darkMetalMat
  );
  bustPedestal.position.set(-3.2, 0.45, 2.8);
  const bustSculpture = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.2, 0.45, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }))
  );
  bustSculpture.position.set(-3.2, 1.15, 2.8);
  const bustHead = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.12, 12, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }))
  );
  bustHead.position.set(-3.2, 1.45, 2.8);
  scene.add(bustPedestal, bustSculpture, bustHead);

  // 9. Puerta principal a descansillo, puerta 4B, escalera y ascensor averiado con cinta de precaución
  const doorMat4A = trackMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 }));
  const door4A = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 2.2, 1.1)), doorMat4A);
  door4A.position.set(-3.68, 1.1, 4.8);
  scene.add(door4A);

  const landing = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 0.04, 2.2)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }))
  );
  landing.position.set(-4.5, 0.02, 4.8);
  scene.add(landing);

  const door4B = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 2.2, 1.1)), doorMat4A);
  door4B.position.set(-5.3, 1.1, 4.8);
  scene.add(door4B);

  const elevatorFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.3, 2.3, 0.08)),
    darkMetalMat
  );
  elevatorFrame.position.set(-4.5, 1.15, 5.9);
  scene.add(elevatorFrame);

  const cautionTapeCanvas = document.createElement('canvas');
  cautionTapeCanvas.width = 512;
  cautionTapeCanvas.height = 128;
  const cctx = cautionTapeCanvas.getContext('2d')!;
  cctx.fillStyle = '#eab308';
  cctx.fillRect(0, 0, 512, 128);
  cctx.fillStyle = '#000000';
  for (let x = -64; x < 576; x += 64) {
    cctx.beginPath();
    cctx.moveTo(x, 0);
    cctx.lineTo(x + 32, 0);
    cctx.lineTo(x - 16, 128);
    cctx.lineTo(x - 48, 128);
    cctx.fill();
  }
  cctx.fillStyle = '#000000';
  cctx.font = 'bold 22px sans-serif';
  cctx.fillText('CAUTION · OUT OF ORDER · DO NOT ENTER', 25, 74);
  const cautionTex = trackTex(new THREE.CanvasTexture(cautionTapeCanvas));
  cautionTex.wrapS = THREE.RepeatWrapping;
  cautionTex.repeat.set(1.5, 1);
  const cautionMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: cautionTex,
      emissive: 0xeab308,
      emissiveIntensity: 0.25,
      roughness: 0.5,
    })
  );

  const tape1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.12, 0.02)), cautionMat);
  tape1.position.set(-4.5, 1.4, 5.95);
  tape1.rotation.z = 0.22;

  const tape2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.12, 0.02)), cautionMat);
  tape2.position.set(-4.5, 1.0, 5.95);
  tape2.rotation.z = -0.22;
  scene.add(tape1, tape2);

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

  const zoneCSofaBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.1, 0.42, 1.2)),
    leatherMat
  );
  zoneCSofaBase.position.y = 0.25;
  zoneCSofaBase.castShadow = true;
  sofa.add(zoneCSofaBase);

  const zoneCSofaBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.1, 0.72, 0.28)),
    leatherMat
  );
  zoneCSofaBack.position.set(0, 0.72, -0.46);
  zoneCSofaBack.castShadow = true;
  sofa.add(zoneCSofaBack);

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
  const zoneCCoffeeTable = new THREE.Group();
  zoneCCoffeeTable.position.set(8.8, 0, 1.75);
  const ctTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.3, 0.08, 1.15)),
    woodFurnitureMat
  );
  ctTop.position.y = 0.46;
  ctTop.castShadow = true;
  zoneCCoffeeTable.add(ctTop);
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
    zoneCCoffeeTable.add(leg);
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
  zoneCCoffeeTable.add(box1, box2, mug);
  scene.add(zoneCCoffeeTable);

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
  const zoneCTvScreen = new THREE.Mesh(
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
  zoneCTvScreen.position.set(0, 1.56, -0.058);
  zoneCTvScreen.rotation.y = Math.PI;
  tvUnit.add(zoneCTvScreen);
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
