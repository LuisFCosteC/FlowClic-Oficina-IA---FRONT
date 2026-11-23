import * as THREE from 'three';
import { Agent, AgentStatus } from '../../types/orbis';

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
  hitProxy: THREE.Mesh;
  currentStatus: AgentStatus;
  waypoints: THREE.Vector3[];
  targetPos: THREE.Vector3;
  targetYaw: number;
  labelAnchorY: number;
}

const STATUS_HEX: Record<AgentStatus, number> = {
  working: 0x10b981,
  waiting_sheldon: 0xf59e0b,
  idle: 0x64748b,
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
  const shadowGeo = new THREE.PlaneGeometry(1.15, 1.15);
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

  // Articulated body container
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Shared materials with varied roughness/metalness
  const accentColor = new THREE.Color(agent.color);
  const jacketMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.68,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.05,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.25,
  });
  const skinTones = [0xf1c7a5, 0xe2b18c, 0xc88d65, 0xf5d4ba, 0x9c6b49];
  const skinIndex =
    agent.id === 'raj'
      ? 4
      : agent.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
        skinTones.length;
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinTones[skinIndex],
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairColors = [0x1c1917, 0x3b2618, 0x5c3c24, 0xd4a259, 0x4b5563];
  const hairColor =
    agent.id === 'penny' || agent.id === 'bernadette'
      ? 0xd9b25f
      : agent.id === 'beverly'
        ? 0x94a3b8
        : hairColors[
            agent.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
              3
          ];
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.78,
    metalness: 0.05,
  });

  // Legs (articulated at hip y = 0.56)
  const buildLeg = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 0.56, 0);

    const legMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.085, 0.34, 6, 10),
      pantsMat
    );
    legMesh.position.y = -0.24;
    legMesh.castShadow = true;
    pivot.add(legMesh);

    const shoeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.26),
      shoeMat
    );
    shoeMesh.position.set(0, -0.51, 0.04);
    shoeMesh.castShadow = true;
    pivot.add(shoeMesh);

    return pivot;
  };

  const leftLegPivot = buildLeg(-0.12);
  const rightLegPivot = buildLeg(0.12);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  // Torso (primary silhouette + collar/badge detail)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.25, 0.58, 14),
    jacketMat
  );
  torso.position.y = 0.87;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Shirt collar / emblem detail
  const collarMat = new THREE.MeshStandardMaterial({
    color: agent.isCTO ? 0xfef08a : 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.2,
  });
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.09, 12),
    collarMat
  );
  collar.position.y = 1.15;
  bodyGroup.add(collar);

  // Tech badge / lanyard on chest
  const badgeMat = new THREE.MeshStandardMaterial({
    color: agent.isCTO ? 0xf59e0b : 0x06b6d4,
    emissive: agent.isCTO ? 0xf59e0b : 0x06b6d4,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.7,
  });
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), badgeMat);
  badge.position.set(0.08, 0.94, 0.22);
  bodyGroup.add(badge);

  // Articulated Arms (pivoted at shoulder y = 1.10)
  const buildArm = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 1.1, 0);

    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.068, 0.34, 6, 10),
      jacketMat
    );
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    pivot.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
    hand.position.y = -0.44;
    pivot.add(hand);

    return pivot;
  };

  const leftArmPivot = buildArm(-0.28);
  const rightArmPivot = buildArm(0.28);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.24;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), skinMat);
  head.position.y = 0.19;
  head.castShadow = true;
  headGroup.add(head);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.3,
  });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
  leftEye.position.set(-0.07, 0.21, 0.185);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.07;
  headGroup.add(leftEye, rightEye);

  // Optional Glasses
  if (agent.glasses) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.75,
    });
    const leftLens = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.011, 8, 16),
      frameMat
    );
    leftLens.position.set(-0.072, 0.21, 0.2);
    const rightLens = leftLens.clone();
    rightLens.position.x = 0.072;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.012, 0.012),
      frameMat
    );
    bridge.position.set(0, 0.21, 0.205);
    headGroup.add(leftLens, rightLens, bridge);
  }

  // Hair styles
  const style = agent.hairStyle ?? 'short';
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.222, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCap.position.y = 0.205;
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  if (style === 'long') {
    const backHair = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.3, 0.16),
      hairMat
    );
    backHair.position.set(0, 0.08, -0.13);
    headGroup.add(backHair);
  } else if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), hairMat);
    bun.position.set(0, 0.34, -0.15);
    headGroup.add(bun);
  } else if (style === 'curly') {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), hairMat);
    puff.scale.set(1.06, 0.85, 1.06);
    puff.position.set(0, 0.24, -0.02);
    headGroup.add(puff);
  }

  // Invisible hit proxy for smooth raycasting (Layer 1)
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
    hitProxy,
    currentStatus: agent.status,
    waypoints: [],
    targetPos: initialPos.clone(),
    targetYaw: initialYaw,
    labelAnchorY: 1.88,
  };
}

export function setAvatarStatusColor(rig: AvatarRig, status: AgentStatus): void {
  const hex = STATUS_HEX[status];
  rig.statusRingMat.color.setHex(hex);
  rig.statusRingMat.emissive.setHex(hex);
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
    // Relaxing / IDLE in BBT Apartment (memory purged)
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
