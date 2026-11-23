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
  // ZONA DE DESCANSO: CAFETERÍA LOUNGE MODERNA (V3D06)
  // =========================================================================
  // Suelo de parquet nórdico claro
  const woodTex = trackTex(createWoodFloorTexture(maxAnisotropy));
  const woodFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(10.4, 14.4)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.55,
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
        emissiveIntensity: 0.65,
        roughness: 0.35,
      })
    )
  );
  zoneCBar.position.set(9.45, 0.03, 6.85);
  scene.add(zoneCBar);

  // Alfombra circular central de tejido suave para el lounge
  const loungeRug = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(3.1, 32)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.94,
        metalness: 0.0,
      })
    )
  );
  loungeRug.rotation.x = -Math.PI / 2;
  loungeRug.position.set(9.8, 0.035, 1.2);
  loungeRug.receiveShadow = true;
  scene.add(loungeRug);

  // Materiales compartidos para mobiliario lounge
  const oakLegMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6, metalness: 0.05 })
  );
  const darkMarbleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.15 })
  );

  // -------------------------------------------------------------------------
  // 1. PUESTO DE CAFETERÍA / COFFEE STATION PROFESIONAL
  // -------------------------------------------------------------------------
  const coffeeBar = new THREE.Group();
  coffeeBar.position.set(6.6, 0, -4.8);

  // Mueble bajo aparador
  const barCabinet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4, 0.92, 0.9)),
    darkMetalMat
  );
  barCabinet.position.y = 0.46;
  barCabinet.castShadow = true;
  coffeeBar.add(barCabinet);

  // Encimera de cuarzo blanco/mármol
  const barTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.5, 0.06, 0.96)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }))
  );
  barTop.position.y = 0.95;
  coffeeBar.add(barTop);

  // Máquina de café espresso comercial (acero pulido y negro)
  const espressoMachine = new THREE.Group();
  espressoMachine.position.set(-0.35, 0.98, 0);

  const machineBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.72, 0.48, 0.52)),
    brushedAlumMat
  );
  machineBody.position.y = 0.24;
  machineBody.castShadow = true;
  espressoMachine.add(machineBody);

  // Grupo erogador doble frontal y bandeja goteo
  const dripTray = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.68, 0.05, 0.22)),
    darkMetalMat
  );
  dripTray.position.set(0, 0.025, 0.28);
  espressoMachine.add(dripTray);

  [-0.14, 0.14].forEach((gx) => {
    const portafilter = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10)),
      darkMetalMat
    );
    portafilter.position.set(gx, 0.22, 0.24);
    const handle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8)),
      oakLegMat
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(gx, 0.22, 0.35);
    espressoMachine.add(portafilter, handle);
  });

  // Tolvas de café en grano transparentes arriba
  [-0.18, 0.18].forEach((hx) => {
    const hopper = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.09, 0.06, 0.22, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3 }))
    );
    hopper.position.set(hx, 0.59, -0.06);
    espressoMachine.add(hopper);
  });

  coffeeBar.add(espressoMachine);

  // Molinillo de café profesional al lado
  const grinder = new THREE.Group();
  grinder.position.set(0.48, 0.98, -0.05);
  const grinderBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.36, 12)),
    darkMetalMat
  );
  grinderBase.position.y = 0.18;
  const grinderHopper = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.05, 0.18, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3 }))
  );
  grinderHopper.position.y = 0.44;
  grinder.add(grinderBase, grinderHopper);
  coffeeBar.add(grinder);

  // Fila de tazas de café de colores en la barra
  const cupColors = [0x06b6d4, 0xef4444, 0xf59e0b, 0x10b981];
  cupColors.forEach((color, i) => {
    const cup = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.038, 0.08, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.2 }))
    );
    cup.position.set(0.2 + i * 0.18, 1.02, 0.25);
    coffeeBar.add(cup);
  });

  // Servilletero y azucarero
  const napkinDispenser = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.1, 0.14, 0.1)),
    brushedAlumMat
  );
  napkinDispenser.position.set(-0.95, 1.05, 0.1);
  coffeeBar.add(napkinDispenser);

  scene.add(coffeeBar);

  // -------------------------------------------------------------------------
  // 2. MESA BAJA CON SNACKS
  // -------------------------------------------------------------------------
  const snackTable = new THREE.Group();
  snackTable.position.set(9.8, 0, 0.3);

  // Pata central y tablero circular
  const tableBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.28, 0.32, 0.03, 20)),
    darkMetalMat
  );
  tableBase.position.y = 0.015;
  const tablePole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12)),
    darkMetalMat
  );
  tablePole.position.y = 0.24;
  const tableTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.04, 24)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.05 }))
  );
  tableTop.position.y = 0.47;
  tableTop.castShadow = true;
  snackTable.add(tableBase, tablePole, tableTop);

  // Bandeja de aperitivos y bol de frutas
  const tray = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.02, 0.28)),
    oakLegMat
  );
  tray.position.set(-0.12, 0.5, 0);
  // Croissants / snacks dorados
  const snackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
  [-0.08, 0.06].forEach((sx) => {
    const croissant = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.045, 0.022, 6, 12, Math.PI)),
      snackMat
    );
    croissant.rotation.x = -Math.PI / 2;
    croissant.position.set(-0.12 + sx, 0.525, 0);
    snackTable.add(croissant);
  });
  snackTable.add(tray);

  // Cuenco con manzanas
  const fruitBowl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.12, 0.06, 0.06, 12)),
    darkMetalMat
  );
  fruitBowl.position.set(0.24, 0.52, 0.05);
  const redApple = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.035, 8, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 }))
  );
  redApple.position.set(0.23, 0.56, 0.04);
  const greenApple = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.032, 8, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.35 }))
  );
  greenApple.position.set(0.27, 0.555, 0.07);
  snackTable.add(fruitBowl, redApple, greenApple);

  scene.add(snackTable);

  // -------------------------------------------------------------------------
  // 3. SILLONES INDIVIDUALES MODERNOS TIPO LOUNGE (3 UNIDADES)
  // -------------------------------------------------------------------------
  const buildModernArmchair = (colorHex: number, x: number, z: number, yaw: number) => {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = yaw;

    const fabricMat = trackMat(
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.72, metalness: 0.04 })
    );

    // Asiento acolchado
    const seat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.78, 0.18, 0.76)),
      fabricMat
    );
    seat.position.y = 0.38;
    seat.castShadow = true;
    chair.add(seat);

    // Respaldo ergonómico inclinado
    const back = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.78, 0.52, 0.14)),
      fabricMat
    );
    back.position.set(0, 0.64, -0.32);
    back.rotation.x = -0.12;
    back.castShadow = true;
    chair.add(back);

    // Reposabrazos laterales acolchados
    [-0.41, 0.41].forEach((ax) => {
      const arm = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.32, 0.68)),
        fabricMat
      );
      arm.position.set(ax, 0.48, 0.02);
      chair.add(arm);
    });

    // 4 Patas nórdicas abiertas de madera de roble
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.018, 0.34, 8));
    [
      [-0.34, -0.28, 0.12, -0.1],
      [0.34, -0.28, -0.12, -0.1],
      [-0.34, 0.28, 0.12, 0.1],
      [0.34, 0.28, -0.12, 0.1],
    ].forEach(([lx, lz, tiltZ, tiltX]) => {
      const leg = new THREE.Mesh(legGeo, oakLegMat);
      leg.position.set(lx, 0.16, lz);
      leg.rotation.z = tiltZ;
      leg.rotation.x = tiltX;
      chair.add(leg);
    });

    scene.add(chair);
  };

  buildModernArmchair(0x10b981, 8.0, 2.0, -Math.PI * 0.25); // Menta suave
  buildModernArmchair(0x3b82f6, 9.8, 2.6, Math.PI);          // Azul nórdico
  buildModernArmchair(0xf1f5f9, 11.6, 2.0, Math.PI * 1.25);  // Arena / lino

  // -------------------------------------------------------------------------
  // 4. PUFS CIRCULARES / OTOMANAS MODERNAS (3 UNIDADES)
  // -------------------------------------------------------------------------
  const buildPouf = (colorHex: number, x: number, z: number) => {
    const pouf = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.36, 18)),
      trackMat(new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8, metalness: 0.02 }))
    );
    pouf.position.set(x, 0.18, z);
    pouf.castShadow = true;
    pouf.receiveShadow = true;
    scene.add(pouf);
  };

  buildPouf(0xe07a5f, 8.0, -1.8);  // Terracota
  buildPouf(0xf59e0b, 10.0, -2.0); // Mostaza
  buildPouf(0x475569, 12.2, -0.4); // Grafito

  // -------------------------------------------------------------------------
  // 5. RINCÓN CHILL-OUT CON COJINES MULLIDOS EN EL SUELO
  // -------------------------------------------------------------------------
  const chillRug = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(1.6, 24)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xccfbf1,
        roughness: 0.95,
        metalness: 0.0,
      })
    )
  );
  chillRug.rotation.x = -Math.PI / 2;
  chillRug.position.set(12.0, 0.035, -4.2);
  chillRug.receiveShadow = true;
  scene.add(chillRug);

  const cushionColors = [0x06b6d4, 0xfbbf24, 0xa78bfa, 0x34d399, 0xf472b6, 0x38bdf8];
  [
    [-0.45, -0.2, 0.08, 0.2],
    [0.4, -0.25, 0.08, -0.3],
    [0.0, -0.45, 0.09, 0.6],
    [-0.2, 0.35, 0.08, -0.15],
    [0.35, 0.3, 0.09, 0.4],
    [0.05, 0.0, 0.16, 0.1], // En la cima de la pila
  ].forEach(([cx, cz, cy, rotY], i) => {
    const cushion = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.48, 0.12, 0.44)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: cushionColors[i % cushionColors.length],
          roughness: 0.75,
          metalness: 0.03,
        })
      )
    );
    cushion.position.set(12.0 + cx, cy, -4.2 + cz);
    cushion.rotation.y = rotY;
    cushion.castShadow = true;
    scene.add(cushion);
  });

  // -------------------------------------------------------------------------
  // 6. PLANTAS DECORATIVAS EN MACETAS CONTEMPORÁNEAS
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

  buildIndoorPlant(5.8, -2.5, 0.9);
  buildIndoorPlant(13.6, -5.6, 1.2);
  buildIndoorPlant(13.6, 5.8, 1.1);
  buildIndoorPlant(6.2, 5.8, 0.85);

  // -------------------------------------------------------------------------
  // 7. LÁMPARA DE PIE MODERNA DE ILUMINACIÓN SUAVE
  // -------------------------------------------------------------------------
  const floorLamp = new THREE.Group();
  floorLamp.position.set(13.0, 0, 2.5);
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

  // Zona de descanso: Luz ambiental suave y cálida tipo lounge
  const loungeWarmLight = new THREE.PointLight(0xfde68a, 16, 18, 1.4);
  loungeWarmLight.position.set(10.2, 3.6, 0.5);
  scene.add(loungeWarmLight);

  return {
    dnaHelix,
    holoOrb,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
