import * as THREE from 'three';
import { Agent, AgentStatus } from '../../types/orbis';
import {
  createAgentLegoTorsoTexture,
  createCeoTorsoTexture,
  createOutfitTorsoTexture,
  createFlashTorsoTexture,
  createLegoFaceTexture,
} from './proceduralTextures';

export interface AvatarRig {
  agentId: string;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  headGroup: THREE.Group;
  statusRingMat: THREE.MeshStandardMaterial;
  selectRing: THREE.Mesh;
  batteryIcon: THREE.Group;
  hitProxy: THREE.Mesh;
  currentStatus: AgentStatus;
  waypoints: THREE.Vector3[];
  targetPos: THREE.Vector3;
  targetYaw: number;
  labelAnchorY: number;
  /** Pose del puesto actual: sentado (silla, puf, sofá) o acostado (cama). */
  pose?: 'sit' | 'lie';
  /** Altura del cuerpo para apoyarse en el asiento o el colchón. */
  poseY: number;
}

const STATUS_HEX: Record<AgentStatus, number> = {
  working: 0x10b981,
  waiting_sheldon: 0xf59e0b,
  idle: 0x64748b,
  blocked: 0xf43f5e,
  sleep_quota: 0x8b5cf6,
};

export function createAvatarRig(
  agent: Agent,
  contactShadowTex: THREE.CanvasTexture,
  initialPos: THREE.Vector3,
  initialYaw: number
): AvatarRig {
  const root = new THREE.Group();
  root.position.copy(initialPos);
  root.rotation.y = initialYaw;

  // Ground contact shadow
  const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  root.add(shadowPlane);

  // Floor status ring
  const ringGeo = new THREE.RingGeometry(0.38, 0.48, 28);
  const statusRingMat = new THREE.MeshStandardMaterial({
    color: STATUS_HEX[agent.status],
    emissive: STATUS_HEX[agent.status],
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const statusRing = new THREE.Mesh(ringGeo, statusRingMat);
  statusRing.rotation.x = -Math.PI / 2;
  statusRing.position.y = 0.032;
  root.add(statusRing);

  // Selection highlight outer ring (hidden unless selected)
  const selRingGeo = new THREE.RingGeometry(0.55, 0.64, 32);
  const selRingMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  const selectRing = new THREE.Mesh(selRingGeo, selRingMat);
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.position.y = 0.036;
  selectRing.visible = false;
  root.add(selectRing);

  // Articulated LEGO body container
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Tonalidades de piel LEGO y materiales
  const isSheldon = agent.id === 'sheldon' || agent.isCTO;
  const skinTones = ['#f5d061', '#fcd34d', '#eab308', '#fde047'];
  const legacySkin = isSheldon
    ? '#fcd34d'
    : skinTones[
        agent.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % skinTones.length
      ];
  // Apariencia completa elegida en el editor del personaje (si no hay, se usa el aspecto por defecto)
  const look = agent.look ?? {};
  const female = look.gender === 'female';
  const skinToneHex = look.skinTone ?? legacySkin;
  const customOutfit = !!look.topStyle;
  const topHex = look.topColor ?? agent.color;
  const innerHex = look.innerColor ?? '#e2e8f0';
  const bareLegs = look.pantsStyle === 'skirt' || look.topStyle === 'dress';

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinToneHex,
    roughness: 0.3,
    metalness: 0.05,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: look.pantsColor ?? (isSheldon ? 0x22354a : 0x1e293b),
    roughness: 0.35,
    metalness: 0.1,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: look.shoeColor ?? 0x0f172a,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Pelvis / cintura LEGO (punto de unión de piernas y torso)
  const pelvisGeo = new THREE.BoxGeometry(0.38, 0.12, 0.22);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = 0.54;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // Piernas articuladas en la cadera (y = 0.54)
  const buildLegoLeg = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 0.54, 0);

    // Pierna rectangular LEGO
    const shorts = look.pantsStyle === 'shorts';
    const legMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, shorts ? 0.2 : 0.38, 0.2),
      bareLegs ? skinMat : pantsMat
    );
    legMesh.position.y = shorts ? -0.1 : -0.19;
    if (shorts) {
      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.18), skinMat);
      lowerLeg.position.y = -0.29;
      pivot.add(lowerLeg);
    }
    legMesh.castShadow = true;
    pivot.add(legMesh);

    // Zapato / base del pie LEGO
    const shoeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.08, 0.25),
      shoeMat
    );
    shoeMesh.position.set(0, -0.38, 0.025);
    shoeMesh.castShadow = true;
    pivot.add(shoeMesh);

    return pivot;
  };

  const leftLegPivot = buildLegoLeg(-0.1);
  const rightLegPivot = buildLegoLeg(0.1);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  // Torso Trapezoidal LEGO
  // Medidas clásicas LEGO: base inferior más ancha que hombros
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.48, 4, 1);
  torsoGeo.rotateY(Math.PI / 4); // Alinear caras frontal y posterior
  torsoGeo.scale(1.2, 1, 0.72); // Silueta proporcionada LEGO

  // Textura frontal procedural: Flash para Sheldon, Camisa tech para agentes
  const torsoFrontTex = customOutfit
    ? createOutfitTorsoTexture(look.topStyle!, topHex, innerHex, female)
    : isSheldon
      ? createFlashTorsoTexture()
      : createAgentLegoTorsoTexture(agent.color, agent.name);

  const torsoMatSide = new THREE.MeshStandardMaterial({
    color: customOutfit ? new THREE.Color(topHex) : isSheldon ? 0xd92525 : new THREE.Color(agent.color),
    roughness: 0.32,
    metalness: 0.08,
  });

  const torsoMatFront = new THREE.MeshStandardMaterial({
    map: torsoFrontTex,
    roughness: 0.32,
    metalness: 0.08,
  });

  // Asignar materiales con la cara frontal texturizada
  const torsoMaterials = [
    torsoMatSide,
    torsoMatSide,
    torsoMatSide,
    torsoMatSide,
    torsoMatSide,
    torsoMatFront,
  ];

  const torso = new THREE.Mesh(torsoGeo, torsoMaterials);
  torso.position.y = 0.84;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Vestido / falda: cubre las caderas (las piernas se ven con la piel)
  if (look.pantsStyle === 'skirt' || look.topStyle === 'dress') {
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 0.34, 20),
      new THREE.MeshStandardMaterial({
        color: look.topStyle === 'dress' ? topHex : (look.pantsColor ?? '#1e293b'),
        roughness: 0.45,
      })
    );
    skirt.position.y = 0.44;
    skirt.castShadow = true;
    bodyGroup.add(skirt);
  }
  // Capucha de la sudadera
  if (look.topStyle === 'hoodie') {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 10),
      new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.5 })
    );
    hood.scale.set(1.45, 0.7, 0.8);
    hood.position.set(0, 1.1, -0.1);
    bodyGroup.add(hood);
  }

  // Cuello cilíndrico LEGO
  const neckGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.09, 16);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 1.11;
  bodyGroup.add(neck);

  // Brazos articulados estilo LEGO (en hombros y = 1.05)
  const buildLegoArm = (isLeft: boolean) => {
    const pivot = new THREE.Group();
    const xOffset = isLeft ? -0.27 : 0.27;
    pivot.position.set(xOffset, 1.05, 0);

    const armColor = customOutfit ? new THREE.Color(topHex) : isSheldon ? 0xd92525 : new THREE.Color(agent.color);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: armColor,
      roughness: 0.35,
      metalness: 0.05,
    });

    // Brazo superior / manga
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.24, 12),
      sleeveMat
    );
    upperArm.position.set(0, -0.11, 0);
    upperArm.rotation.z = isLeft ? 0.15 : -0.15;
    upperArm.castShadow = true;
    pivot.add(upperArm);

    // Antebrazo inclinado hacia el frente
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.16, 12),
      customOutfit
        ? look.topStyle === 'tshirt' || look.topStyle === 'dress'
          ? skinMat
          : sleeveMat
        : isSheldon
          ? new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
          : sleeveMat
    );
    forearm.position.set(0, -0.26, 0.04);
    forearm.rotation.x = 0.32;
    forearm.castShadow = true;
    pivot.add(forearm);

    // Mano Pinza LEGO clásica en forma de C (Torus abierto)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.37, 0.08);

    const handGeo = new THREE.TorusGeometry(0.054, 0.019, 10, 20, Math.PI * 1.5);
    const handMesh = new THREE.Mesh(handGeo, skinMat);
    handMesh.rotation.z = Math.PI / 2;
    handMesh.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
    handGroup.add(handMesh);

    // Muñeca de anclaje
    const wrist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12),
      skinMat
    );
    wrist.position.y = 0.025;
    handGroup.add(wrist);

    pivot.add(handGroup);
    return pivot;
  };

  const leftArmPivot = buildLegoArm(true);
  const rightArmPivot = buildLegoArm(false);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Cabeza Cilíndrica LEGO con Stud Superior y Rostro Procedural
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.15;
  bodyGroup.add(headGroup);

  const headFaceTex = createLegoFaceTexture(
    skinToneHex,
    isSheldon,
    look.face || female ? { face: look.face, female } : undefined
  );
  const headSideMat = new THREE.MeshStandardMaterial({
    color: skinToneHex,
    roughness: 0.3,
    metalness: 0.02,
  });
  const headFaceMat = new THREE.MeshStandardMaterial({
    map: headFaceTex,
    roughness: 0.3,
    metalness: 0.02,
  });

  // Cabeza cilíndrica con bordes biselados
  const headCylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 24);
  const headMaterials = [headFaceMat, headSideMat, headSideMat];
  const headMesh = new THREE.Mesh(headCylGeo, headMaterials);
  headMesh.position.y = 0.16;
  headMesh.rotation.y = -Math.PI / 2; // Cara mirando al frente
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Stud Superior LEGO (pivote clásico encima de la cabeza)
  const studGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
  const studMesh = new THREE.Mesh(studGeo, headSideMat);
  studMesh.position.y = 0.32;
  studMesh.castShadow = true;
  headGroup.add(studMesh);

  // Cabello / Peinado LEGO
  const hairColors = [0x1c1917, 0x3b2618, 0x5c3c24, 0xd4a259, 0x4b5563];
  const hairColor = look.hairColor
    ? new THREE.Color(look.hairColor).getHex()
    : isSheldon
    ? 0x3b2618
    : agent.id === 'penny' || agent.id === 'bernadette'
      ? 0xd9b25f
      : agent.id === 'beverly'
        ? 0x94a3b8
        : hairColors[
            agent.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3
          ];
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.45,
    metalness: 0.1,
  });

  const style = agent.hairStyle ?? (isSheldon ? 'parted' : 'short');
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hairCap.position.y = 0.24;
  hairCap.scale.set(1.05, 0.85, 1.05);
  hairCap.castShadow = true;
  if (style !== 'bald') headGroup.add(hairCap);

  if (style === 'parted' || (isSheldon && !agent.hairStyle)) {
    // Flequillo lateral icónico
    const bang = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.06), hairMat);
    bang.position.set(-0.06, 0.28, 0.14);
    bang.rotation.z = -0.15;
    headGroup.add(bang);
  } else if (style === 'long') {
    const backHair = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.14),
      hairMat
    );
    backHair.position.set(0, 0.12, -0.12);
    headGroup.add(backHair);
  } else if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), hairMat);
    bun.position.set(0, 0.36, -0.12);
    headGroup.add(bun);
  } else if (style === 'curly') {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), hairMat);
    puff.scale.set(1.08, 0.9, 1.08);
    puff.position.set(0, 0.25, -0.01);
    headGroup.add(puff);
  } else if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.34, 10), hairMat);
    tail.position.set(0, 0.12, -0.2);
    tail.rotation.x = 0.35;
    const tie = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), hairMat);
    tie.position.set(0, 0.27, -0.17);
    headGroup.add(tail, tie);
  } else if (style === 'spiky') {
    [-0.1, 0, 0.1].forEach((px, i) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), hairMat);
      spike.position.set(px, 0.38 - Math.abs(px) * 0.4, i === 1 ? 0.02 : -0.02);
      spike.rotation.z = -px * 2.5;
      headGroup.add(spike);
    });
  } else if (style === 'bob') {
    [-1, 1].forEach((sx) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.3), hairMat);
      side.position.set(sx * 0.18, 0.13, -0.02);
      headGroup.add(side);
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), hairMat);
    back.position.set(0, 0.13, -0.15);
    headGroup.add(back);
  }

  // Gafas opcionales (Leonard, Amy, etc.)
  if (agent.glasses) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });
    const leftLens = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.01, 8, 16),
      frameMat
    );
    leftLens.position.set(-0.065, 0.18, 0.185);
    const rightLens = leftLens.clone();
    rightLens.position.x = 0.065;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.01, 0.01),
      frameMat
    );
    bridge.position.set(0, 0.18, 0.19);
    headGroup.add(leftLens, rightLens, bridge);
  }

  // Indicador de batería baja procedural para SLEEP_QUOTA
  const batteryIcon = new THREE.Group();
  batteryIcon.position.set(0, 2.05, 0);

  const batteryFrameMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.3,
    metalness: 0.7,
  });
  const batteryFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.12, 0.05),
    batteryFrameMat
  );
  const batteryTerminal = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.06, 0.03),
    batteryFrameMat
  );
  batteryTerminal.position.set(0.13, 0, 0);

  const batteryLowLevelMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  const batteryBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.04),
    batteryLowLevelMat
  );
  batteryBar.position.set(-0.065, 0, 0);

  batteryIcon.add(batteryFrame, batteryTerminal, batteryBar);
  batteryIcon.visible = agent.status === 'sleep_quota';
  root.add(batteryIcon);

  // Invisible hit proxy para raycasting y selección suave
  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.75, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitProxy.position.y = 0.9;
  hitProxy.layers.set(1);
  hitProxy.userData.agentId = agent.id;
  root.add(hitProxy);

  return {
    agentId: agent.id,
    root,
    bodyGroup,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    headGroup,
    statusRingMat,
    selectRing,
    batteryIcon,
    hitProxy,
    currentStatus: agent.status,
    waypoints: [],
    targetPos: initialPos.clone(),
    targetYaw: initialYaw,
    labelAnchorY: 1.88,
    poseY: 0,
  };
}

/**
 * Construye la figura emblemática del CEO estilo minifigura LEGO presidencial.
 * Sentado tras su escritorio monumental o de pie como autoridad máxima.
 */
export function buildCeoParts(isSeated = false) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfcd34d, // LEGO Yellow
    roughness: 0.3,
    metalness: 0.05,
  });

  const suitPantsMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Carbón ejecutivo
    roughness: 0.4,
    metalness: 0.15,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.25,
    metalness: 0.4,
  });

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Pelvis LEGO
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.13, 0.24),
    suitPantsMat
  );
  pelvis.position.y = isSeated ? 0.48 : 0.54;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // Piernas
  const buildCeoLeg = (xOffset: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, isSeated ? 0.48 : 0.54, 0);

    const legMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.38, 0.22),
      suitPantsMat
    );
    legMesh.position.y = -0.19;
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.26),
      shoeMat
    );
    shoe.position.set(0, -0.38, 0.025);
    shoe.castShadow = true;
    legGroup.add(shoe);

    if (isSeated) {
      legGroup.rotation.x = -Math.PI / 2; // Sentado en el sillón presidencial
    }
    return legGroup;
  };

  const leftLeg = buildCeoLeg(-0.11);
  const rightLeg = buildCeoLeg(0.11);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso Ejecutivo del CEO con textura de traje, camisa, corbata azul y pañuelo
  const torsoGeo = new THREE.CylinderGeometry(0.19, 0.26, 0.5, 4, 1);
  torsoGeo.rotateY(Math.PI / 4);
  torsoGeo.scale(1.22, 1, 0.74);

  const torsoTex = createCeoTorsoTexture();
  const suitSideMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.1,
  });
  const suitFrontMat = new THREE.MeshStandardMaterial({
    map: torsoTex,
    roughness: 0.35,
    metalness: 0.1,
  });

  const torsoMaterials = [
    suitSideMat,
    suitSideMat,
    suitSideMat,
    suitSideMat,
    suitSideMat,
    suitFrontMat,
  ];

  const torso = new THREE.Mesh(torsoGeo, torsoMaterials);
  torso.position.y = isSeated ? 0.79 : 0.85;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Cuello
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.09, 16),
    skinMat
  );
  neck.position.y = isSeated ? 1.06 : 1.12;
  bodyGroup.add(neck);

  // Brazos del CEO (apoyados en reposabrazos o mesa)
  const buildCeoArm = (isLeft: boolean) => {
    const armGroup = new THREE.Group();
    const xOffset = isLeft ? -0.29 : 0.29;
    armGroup.position.set(xOffset, isSeated ? 1.0 : 1.06, 0);

    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.1,
    });

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.34, 12),
      sleeveMat
    );
    arm.position.set(0, -0.16, 0.06);
    arm.rotation.x = isSeated ? 0.65 : 0.15;
    arm.rotation.z = isLeft ? 0.12 : -0.12;
    arm.castShadow = true;
    armGroup.add(arm);

    // Pinza de mano LEGO dorada/piel
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.32, isSeated ? 0.18 : 0.08);

    const handGeo = new THREE.TorusGeometry(0.054, 0.019, 10, 20, Math.PI * 1.5);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.rotation.z = Math.PI / 2;
    hand.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
    handGroup.add(hand);

    armGroup.add(handGroup);
    return armGroup;
  };

  const leftArm = buildCeoArm(true);
  const rightArm = buildCeoArm(false);
  bodyGroup.add(leftArm, rightArm);

  // Cabeza Cilíndrica LEGO con Rostro Decidido del CEO
  const headGroup = new THREE.Group();
  headGroup.position.y = isSeated ? 1.1 : 1.16;
  bodyGroup.add(headGroup);

  const ceoFaceTex = createLegoFaceTexture('#fcd34d', false);
  const headSideMat = new THREE.MeshStandardMaterial({
    color: 0xfcd34d,
    roughness: 0.3,
  });
  const headFaceMat = new THREE.MeshStandardMaterial({
    map: ceoFaceTex,
    roughness: 0.3,
  });

  const headMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.28, 24),
    [headFaceMat, headSideMat, headSideMat]
  );
  headMesh.position.y = 0.16;
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Stud Superior LEGO
  const stud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
    headSideMat
  );
  stud.position.y = 0.32;
  headGroup.add(stud);

  // Peinado Ejecutivo Estilo Boss
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.5,
  });
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hairCap.position.y = 0.25;
  hairCap.scale.set(1.06, 0.86, 1.06);
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const hairTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.09, 0.24),
    hairMat
  );
  hairTop.position.set(0, 0.32, -0.02);
  headGroup.add(hairTop);

  return { root, bodyGroup, leftLeg, rightLeg, leftArm, rightArm, headGroup };
}

export function buildCeoFigure(isSeated = true): THREE.Group {
  return buildCeoParts(isSeated).root;
}

/**
 * Avatar móvil del CEO: usa el cuerpo presidencial (traje y corbata) con las mismas articulaciones
 * que los demás personajes, para caminar, sentarse y acostarse con la misma animación.
 */
export function createCeoRig(
  agent: Agent,
  contactShadowTex: THREE.CanvasTexture,
  initialPos: THREE.Vector3,
  initialYaw: number
): AvatarRig {
  const rig = createAvatarRig(agent, contactShadowTex, initialPos, initialYaw);
  const parts = buildCeoParts(false);
  rig.root.remove(rig.bodyGroup);
  rig.root.add(parts.bodyGroup);
  rig.bodyGroup = parts.bodyGroup;
  rig.leftLegPivot = parts.leftLeg;
  rig.rightLegPivot = parts.rightLeg;
  rig.leftArmPivot = parts.leftArm;
  rig.rightArmPivot = parts.rightArm;
  rig.headGroup = parts.headGroup;
  return rig;
}

export function setAvatarStatusColor(rig: AvatarRig, status: AgentStatus): void {
  const hex = STATUS_HEX[status];
  rig.statusRingMat.color.setHex(hex);
  rig.statusRingMat.emissive.setHex(hex);
  rig.batteryIcon.visible = status === 'sleep_quota';
  rig.currentStatus = status;
}

export function updateAvatarAnimation(
  rig: AvatarRig,
  elapsed: number,
  dt: number,
  isMoving: boolean,
  phaseOffset: number
): void {
  const t = elapsed + phaseOffset;

  // Poses de descanso: sentado en silla/puf/sofá o acostado en la cama (solo cuando no camina)
  const lying = !isMoving && rig.pose === 'lie';
  const sitting = !isMoving && rig.pose === 'sit';
  rig.bodyGroup.rotation.x = THREE.MathUtils.damp(rig.bodyGroup.rotation.x, lying ? -Math.PI / 2 : 0, 9, dt);
  rig.bodyGroup.position.z = THREE.MathUtils.damp(rig.bodyGroup.position.z, lying ? 0.75 : 0, 9, dt);
  if (lying || sitting) {
    const to = (o: THREE.Group, target: number, k: number) => {
      o.rotation.x = THREE.MathUtils.damp(o.rotation.x, target, k, dt);
    };
    to(rig.leftLegPivot, lying ? 0 : -1.45, 9);
    to(rig.rightLegPivot, lying ? 0 : -1.45, 9);
    to(rig.leftArmPivot, lying ? 0 : -0.6, 9);
    to(rig.rightArmPivot, lying ? 0 : -0.6, 9);
    rig.bodyGroup.position.y = THREE.MathUtils.damp(rig.bodyGroup.position.y, rig.poseY, 8, dt);
    rig.headGroup.rotation.y = THREE.MathUtils.damp(
      rig.headGroup.rotation.y,
      lying ? 0 : Math.sin(t * 0.6) * 0.1,
      5,
      dt
    );
    return;
  }

  if (isMoving) {
    // Natural walking gait
    const walkFreq = 9.5;
    const stride = Math.sin(t * walkFreq) * 0.58;
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftLegPivot.rotation.x,
      stride,
      14,
      dt
    );
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightLegPivot.rotation.x,
      -stride,
      14,
      dt
    );
    rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftArmPivot.rotation.x,
      -stride * 0.75,
      14,
      dt
    );
    rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightArmPivot.rotation.x,
      stride * 0.75,
      14,
      dt
    );
    rig.bodyGroup.position.y = THREE.MathUtils.damp(
      rig.bodyGroup.position.y,
      Math.abs(Math.sin(t * walkFreq)) * 0.055,
      14,
      dt
    );
    rig.headGroup.rotation.y = THREE.MathUtils.damp(
      rig.headGroup.rotation.y,
      0,
      8,
      dt
    );
  } else if (rig.currentStatus === 'working') {
    // Seated / typing rhythm at workstation
    const typeLeft = -0.85 + Math.sin(t * 11.5) * 0.08;
    const typeRight = -0.85 + Math.cos(t * 12.2) * 0.08;
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftLegPivot.rotation.x,
      -1.15,
      8,
      dt
    );
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightLegPivot.rotation.x,
      -1.15,
      8,
      dt
    );
    rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftArmPivot.rotation.x,
      typeLeft,
      10,
      dt
    );
    rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightArmPivot.rotation.x,
      typeRight,
      10,
      dt
    );
    rig.bodyGroup.position.y = THREE.MathUtils.damp(
      rig.bodyGroup.position.y,
      -0.2,
      8,
      dt
    );
    rig.headGroup.rotation.y = THREE.MathUtils.damp(
      rig.headGroup.rotation.y,
      Math.sin(t * 1.4) * 0.16,
      5,
      dt
    );
  } else if (rig.currentStatus === 'waiting_sheldon') {
    // Standing & gesturing toward Sheldon's whiteboard
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftLegPivot.rotation.x,
      0,
      8,
      dt
    );
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightLegPivot.rotation.x,
      0,
      8,
      dt
    );
    rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftArmPivot.rotation.x,
      -0.25 + Math.sin(t * 2.4) * 0.12,
      7,
      dt
    );
    rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightArmPivot.rotation.x,
      -0.65 + Math.sin(t * 3.1) * 0.25,
      7,
      dt
    );
    rig.bodyGroup.position.y = THREE.MathUtils.damp(
      rig.bodyGroup.position.y,
      Math.sin(t * 2.2) * 0.015,
      8,
      dt
    );
    rig.headGroup.rotation.y = THREE.MathUtils.damp(
      rig.headGroup.rotation.y,
      Math.sin(t * 1.6) * 0.2,
      5,
      dt
    );
  } else {
    // Relaxing / IDLE in Zona de descanso
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftLegPivot.rotation.x,
      -0.55,
      6,
      dt
    );
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightLegPivot.rotation.x,
      -0.55,
      6,
      dt
    );
    rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.leftArmPivot.rotation.x,
      -0.2,
      6,
      dt
    );
    rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      rig.rightArmPivot.rotation.x,
      -0.2,
      6,
      dt
    );
    rig.bodyGroup.position.y = THREE.MathUtils.damp(
      rig.bodyGroup.position.y,
      -0.12 + Math.sin(t * 1.3) * 0.012,
      6,
      dt
    );
    rig.headGroup.rotation.y = THREE.MathUtils.damp(
      rig.headGroup.rotation.y,
      Math.sin(t * 0.7) * 0.14,
      4,
      dt
    );
  }
}
