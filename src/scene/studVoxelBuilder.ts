import * as THREE from 'three';
import { JointTransform, RigType } from '../types/workbench';

export interface RigHandle {
  rigType: RigType;
  root: THREE.Group;
  joints: Record<string, THREE.Group>;
  restPositions: Record<string, THREE.Vector3>;
  pickables: THREE.Mesh[];
  dispose: () => void;
}

const INK_COLOR = 0x11131a;

function createInkMaterial(opacity = 1, transparent = false): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: INK_COLOR,
    side: THREE.BackSide,
    transparent,
    opacity,
    depthWrite: !transparent,
  });
}

function createVoxelMaterial(
  color: number,
  roughness: number,
  ghostColor?: number,
  ghostOpacity?: number
): THREE.MeshStandardMaterial {
  if (ghostColor !== undefined && ghostOpacity !== undefined) {
    return new THREE.MeshStandardMaterial({
      color: ghostColor,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: ghostOpacity,
      depthWrite: false,
    });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.06,
  });
}

/**
 * Creates a crisp Stud-Voxel block with optional Lego-style raised studs on top
 * and an authentic comic black ink silhouette contour + edge lines.
 */
function createStudBlock(opts: {
  w: number;
  h: number;
  d: number;
  color: number;
  roughness?: number;
  studsX?: number;
  studsZ?: number;
  jointName?: string;
  ghostColor?: number;
  ghostOpacity?: number;
  outlineThickness?: number;
  castShadow?: boolean;
  disposables: Array<{ dispose: () => void }>;
  pickables?: THREE.Mesh[];
}): THREE.Group {
  const {
    w,
    h,
    d,
    color,
    roughness = 0.52,
    studsX = 0,
    studsZ = 0,
    jointName,
    ghostColor,
    ghostOpacity,
    outlineThickness = 0.045,
    castShadow = true,
    disposables,
    pickables,
  } = opts;

  const isGhost = ghostColor !== undefined && ghostOpacity !== undefined;
  const group = new THREE.Group();

  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = createVoxelMaterial(color, roughness, ghostColor, ghostOpacity);
  disposables.push(geo, mat);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !isGhost && castShadow;
  mesh.receiveShadow = !isGhost;
  if (jointName) {
    mesh.userData.jointName = jointName;
    if (pickables && !isGhost) pickables.push(mesh);
  }
  group.add(mesh);

  // Black ink contour hull + sharp edges (Stud Voxel aesthetic)
  if (!isGhost) {
    const hullGeo = new THREE.BoxGeometry(
      w + outlineThickness * 2,
      h + outlineThickness * 2,
      d + outlineThickness * 2
    );
    const hullMat = createInkMaterial();
    disposables.push(hullGeo, hullMat);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    group.add(hull);

    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: INK_COLOR });
    disposables.push(edgesGeo, edgesMat);
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    group.add(edges);
  }

  // Lego-like cylindrical studs on top
  if (studsX > 0 && studsZ > 0) {
    const studRadius = Math.min(w / (studsX * 2.7), d / (studsZ * 2.7), 0.19);
    const studHeight = 0.11;
    const studGeo = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 12);
    const studMat = createVoxelMaterial(color, Math.max(0.25, roughness - 0.18), ghostColor, ghostOpacity);
    disposables.push(studGeo, studMat);

    const stepX = w / studsX;
    const stepZ = d / studsZ;
    for (let ix = 0; ix < studsX; ix++) {
      for (let iz = 0; iz < studsZ; iz++) {
        const stud = new THREE.Mesh(studGeo, studMat);
        stud.position.set(
          -w / 2 + stepX * (ix + 0.5),
          h / 2 + studHeight / 2,
          -d / 2 + stepZ * (iz + 0.5)
        );
        stud.castShadow = !isGhost && castShadow;
        stud.receiveShadow = !isGhost;
        if (jointName) stud.userData.jointName = jointName;
        group.add(stud);
      }
    }
  }

  return group;
}

/**
 * Builds the grey Lego-studded Roblox baseplate (zero neon on floor) + contact shadow disc.
 */
export function buildStudBaseplate(scene: THREE.Scene): {
  group: THREE.Group;
  dispose: () => void;
} {
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  // Baseplate slab (top flush at y = 0)
  const plateSize = 48;
  const plateGeo = new THREE.BoxGeometry(plateSize, 0.5, plateSize);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x8d939e,
    roughness: 0.78,
    metalness: 0.04,
  });
  disposables.push(plateGeo, plateMat);
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, -0.25, 0);
  plate.receiveShadow = true;
  group.add(plate);

  // Crisp matte grid lines on the baseplate (offset slightly above y = 0)
  const grid = new THREE.GridHelper(plateSize, plateSize, 0x6f7580, 0x7b818c);
  grid.position.y = 0.004;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  group.add(grid);

  // Instanced Lego studs across a 28x28 central stud field
  const studSpan = 26;
  const count = studSpan * studSpan;
  const studGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.11, 10);
  const studMat = new THREE.MeshStandardMaterial({
    color: 0x999fa9,
    roughness: 0.58,
    metalness: 0.05,
  });
  disposables.push(studGeo, studMat);

  const instancedStuds = new THREE.InstancedMesh(studGeo, studMat, count);
  instancedStuds.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let idx = 0;
  const half = studSpan / 2;
  for (let x = 0; x < studSpan; x++) {
    for (let z = 0; z < studSpan; z++) {
      dummy.position.set(x - half + 0.5, 0.055, z - half + 0.5);
      dummy.updateMatrix();
      instancedStuds.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instancedStuds.instanceMatrix.needsUpdate = true;
  instancedStuds.computeBoundingSphere();
  group.add(instancedStuds);

  // Soft radial contact shadow beneath the character
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(14, 17, 24, 0.52)');
    grad.addColorStop(0.6, 'rgba(14, 17, 24, 0.22)');
    grad.addColorStop(1, 'rgba(14, 17, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.CircleGeometry(2.3, 28);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  disposables.push(shadowTex, shadowGeo, shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  group.add(contactShadow);

  scene.add(group);
  return {
    group,
    dispose: () => {
      scene.remove(group);
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * Builds the signature "Husser" Stud-Voxel creature rig:
 * Joints: Body, Head, Jaw, Tongue, ArmL, ArmR, LegL, LegR, Tail
 * Features: Oversized chunky head with studs, open panting jaw with teeth,
 * flapping pink voxel tongue, expressive white square eyes with 2 catchlights each.
 */
export function buildHusserRig(opts?: {
  ghostColor?: number;
  ghostOpacity?: number;
}): RigHandle {
  const ghostColor = opts?.ghostColor;
  const ghostOpacity = opts?.ghostOpacity;
  const isGhost = ghostColor !== undefined && ghostOpacity !== undefined;

  const disposables: Array<{ dispose: () => void }> = [];
  const pickables: THREE.Mesh[] = [];
  const joints: Record<string, THREE.Group> = {};
  const restPositions: Record<string, THREE.Vector3> = {};

  const root = new THREE.Group();
  root.name = 'HusserRigRoot';

  const registerJoint = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    restPositions[name] = new THREE.Vector3(x, y, z);
    return g;
  };

  // Vibrant Husser palette (bold saturated toy-voxel colors)
  const BODY_COLOR = 0xff7b29; // Tangy orange voxel body
  const BELLY_COLOR = 0xffe082; // Warm cream belly patch
  const HEAD_COLOR = 0xff8c32; // Chunky bright head
  const EAR_COLOR = 0xe85d1a;
  const LIMB_COLOR = 0xf06520;
  const TONGUE_COLOR = 0xff4d8d; // Playful pink tongue
  const MOUTH_INTERIOR = 0x5c1328;
  const TOOTH_COLOR = 0xfafcff;

  // 1. Body (centered above legs so feet rest flush at y = 0)
  const body = registerJoint('Body', root, 0, 1.55, 0);
  const torsoMesh = createStudBlock({
    w: 1.65,
    h: 1.35,
    d: 1.35,
    color: BODY_COLOR,
    roughness: 0.55,
    studsX: 2,
    studsZ: 2,
    jointName: 'Body',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  body.add(torsoMesh);

  // Cream belly block accent
  const belly = createStudBlock({
    w: 1.15,
    h: 0.9,
    d: 0.16,
    color: BELLY_COLOR,
    roughness: 0.72,
    jointName: 'Body',
    ghostColor,
    ghostOpacity,
    outlineThickness: 0.025,
    disposables,
    pickables,
  });
  belly.position.set(0, -0.05, 0.68);
  body.add(belly);

  // 2. Oversized Chunky Head (signature Husser proportion)
  const head = registerJoint('Head', body, 0, 0.85, 0.12);
  // Upper cranium (sits above the open mouth cavity)
  const upperHead = createStudBlock({
    w: 2.3,
    h: 1.25,
    d: 2.1,
    color: HEAD_COLOR,
    roughness: 0.45,
    studsX: 3,
    studsZ: 3,
    jointName: 'Head',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  upperHead.position.set(0, 0.95, 0);
  head.add(upperHead);

  // Cheek tufts / voxel ears
  const earL = createStudBlock({
    w: 0.48,
    h: 0.55,
    d: 0.42,
    color: EAR_COLOR,
    roughness: 0.65,
    studsX: 1,
    studsZ: 1,
    jointName: 'Head',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  earL.position.set(-0.92, 1.72, -0.15);
  head.add(earL);

  const earR = createStudBlock({
    w: 0.48,
    h: 0.55,
    d: 0.42,
    color: EAR_COLOR,
    roughness: 0.65,
    studsX: 1,
    studsZ: 1,
    jointName: 'Head',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  earR.position.set(0.92, 1.72, -0.15);
  head.add(earR);

  // Mouth cavity back wall
  const mouthBack = createStudBlock({
    w: 1.85,
    h: 0.58,
    d: 1.45,
    color: MOUTH_INTERIOR,
    roughness: 0.85,
    jointName: 'Head',
    ghostColor,
    ghostOpacity,
    outlineThickness: 0.02,
    disposables,
  });
  mouthBack.position.set(0, 0.2, -0.18);
  head.add(mouthBack);

  // Upper blocky teeth
  if (!isGhost) {
    for (const tx of [-0.58, -0.18, 0.18, 0.58]) {
      const tooth = createStudBlock({
        w: 0.24,
        h: 0.2,
        d: 0.18,
        color: TOOTH_COLOR,
        roughness: 0.25,
        jointName: 'Head',
        outlineThickness: 0.018,
        disposables,
      });
      tooth.position.set(tx, 0.26, 0.92);
      head.add(tooth);
    }

    // Expressive big blocky eyes with 2 crisp specular catchlights each!
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.56, 1.02, 1.06);

      // White sclera block
      const sclera = createStudBlock({
        w: 0.62,
        h: 0.66,
        d: 0.12,
        color: 0xffffff,
        roughness: 0.2,
        jointName: 'Head',
        outlineThickness: 0.03,
        disposables,
      });
      eyeGroup.add(sclera);

      // Glossy dark pupil
      const pupilGeo = new THREE.BoxGeometry(0.36, 0.42, 0.08);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.15 });
      disposables.push(pupilGeo, pupilMat);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * -0.04, -0.02, 0.06);
      eyeGroup.add(pupil);

      // Catchlight #1 (large top-right glisten)
      const glint1Geo = new THREE.BoxGeometry(0.14, 0.14, 0.04);
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      disposables.push(glint1Geo, glintMat);
      const glint1 = new THREE.Mesh(glint1Geo, glintMat);
      glint1.position.set(0.08, 0.11, 0.11);
      eyeGroup.add(glint1);

      // Catchlight #2 (smaller bottom-left secondary glisten)
      const glint2Geo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
      disposables.push(glint2Geo);
      const glint2 = new THREE.Mesh(glint2Geo, glintMat);
      glint2.position.set(-0.08, -0.1, 0.11);
      eyeGroup.add(glint2);

      head.add(eyeGroup);
    }
  }

  // 3. Jaw (hinged at back-bottom of head so positive rx opens the mouth wide!)
  const jaw = registerJoint('Jaw', head, 0, 0.14, -0.55);
  const jawMesh = createStudBlock({
    w: 2.08,
    h: 0.42,
    d: 1.65,
    color: HEAD_COLOR,
    roughness: 0.48,
    jointName: 'Jaw',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  jawMesh.position.set(0, -0.22, 0.78);
  jaw.add(jawMesh);

  if (!isGhost) {
    // Lower fang teeth
    for (const tx of [-0.62, 0.62]) {
      const fang = createStudBlock({
        w: 0.24,
        h: 0.22,
        d: 0.18,
        color: TOOTH_COLOR,
        roughness: 0.25,
        jointName: 'Jaw',
        outlineThickness: 0.018,
        disposables,
      });
      fang.position.set(tx, 0.06, 1.45);
      jaw.add(fang);
    }
  }

  // 4. Tongue (attached to Jaw, stepped pink voxel tongue sticking out & panting)
  const tongue = registerJoint('Tongue', jaw, 0, 0.02, 0.92);
  const tongueBase = createStudBlock({
    w: 0.72,
    h: 0.18,
    d: 0.85,
    color: TONGUE_COLOR,
    roughness: 0.35,
    jointName: 'Tongue',
    ghostColor,
    ghostOpacity,
    outlineThickness: 0.024,
    disposables,
    pickables,
  });
  tongueBase.position.set(0, 0, 0.36);
  tongue.add(tongueBase);

  const tongueTip = createStudBlock({
    w: 0.56,
    h: 0.16,
    d: 0.45,
    color: 0xff6ea2,
    roughness: 0.3,
    jointName: 'Tongue',
    ghostColor,
    ghostOpacity,
    outlineThickness: 0.022,
    disposables,
    pickables,
  });
  tongueTip.position.set(0, -0.07, 0.88);
  tongueTip.rotation.x = 0.28;
  tongue.add(tongueTip);

  // 5 & 6. Arms (ArmL, ArmR)
  const armL = registerJoint('ArmL', body, -1.06, 0.38, 0.05);
  const armLMesh = createStudBlock({
    w: 0.48,
    h: 1.05,
    d: 0.48,
    color: LIMB_COLOR,
    roughness: 0.56,
    studsX: 1,
    studsZ: 1,
    jointName: 'ArmL',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  armLMesh.position.set(0, -0.45, 0);
  armL.add(armLMesh);

  const armR = registerJoint('ArmR', body, 1.06, 0.38, 0.05);
  const armRMesh = createStudBlock({
    w: 0.48,
    h: 1.05,
    d: 0.48,
    color: LIMB_COLOR,
    roughness: 0.56,
    studsX: 1,
    studsZ: 1,
    jointName: 'ArmR',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  armRMesh.position.set(0, -0.45, 0);
  armR.add(armRMesh);

  // 7 & 8. Legs (LegL, LegR — bottom sits flush at y = 0)
  const legL = registerJoint('LegL', body, -0.46, -0.68, 0);
  const legLMesh = createStudBlock({
    w: 0.58,
    h: 0.86,
    d: 0.68,
    color: EAR_COLOR,
    roughness: 0.62,
    jointName: 'LegL',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  legLMesh.position.set(0, -0.43, 0.05);
  legL.add(legLMesh);

  const legR = registerJoint('LegR', body, 0.46, -0.68, 0);
  const legRMesh = createStudBlock({
    w: 0.58,
    h: 0.86,
    d: 0.68,
    color: EAR_COLOR,
    roughness: 0.62,
    jointName: 'LegR',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  legRMesh.position.set(0, -0.43, 0.05);
  legR.add(legRMesh);

  // 9. Tail (chunky segmented voxel tail)
  const tail = registerJoint('Tail', body, 0, -0.18, -0.72);
  const tailSeg1 = createStudBlock({
    w: 0.44,
    h: 0.44,
    d: 0.72,
    color: EAR_COLOR,
    roughness: 0.58,
    studsX: 1,
    studsZ: 1,
    jointName: 'Tail',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  tailSeg1.position.set(0, 0.12, -0.34);
  tailSeg1.rotation.x = 0.35;
  tail.add(tailSeg1);

  const tailTip = createStudBlock({
    w: 0.34,
    h: 0.34,
    d: 0.42,
    color: BELLY_COLOR,
    roughness: 0.45,
    jointName: 'Tail',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  tailTip.position.set(0, 0.32, -0.76);
  tailTip.rotation.x = 0.55;
  tail.add(tailTip);

  return {
    rigType: 'Husser',
    root,
    joints,
    restPositions,
    pickables,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * Builds the Roblox R15 Stud-Voxel Avatar rig with all 13 requested controllable joints:
 * Root, Waist, Neck, RightShoulder, RightElbow, RightWrist,
 * LeftShoulder, LeftElbow, LeftWrist, RightHip, RightKnee, LeftHip, LeftKnee.
 */
export function buildR15Rig(opts?: {
  ghostColor?: number;
  ghostOpacity?: number;
}): RigHandle {
  const ghostColor = opts?.ghostColor;
  const ghostOpacity = opts?.ghostOpacity;
  const isGhost = ghostColor !== undefined && ghostOpacity !== undefined;

  const disposables: Array<{ dispose: () => void }> = [];
  const pickables: THREE.Mesh[] = [];
  const joints: Record<string, THREE.Group> = {};
  const restPositions: Record<string, THREE.Vector3> = {};

  const root = new THREE.Group();
  root.name = 'R15RigRoot';

  const registerJoint = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    restPositions[name] = new THREE.Vector3(x, y, z);
    return g;
  };

  // Classic Roblox bright blocky palette
  const TORSO_BLUE = 0x2563eb;
  const PELVIS_BLUE = 0x1d4ed8;
  const SKIN_YELLOW = 0xfacc15;
  const LEG_GREEN = 0x16a34a;

  // Root (LowerTorso pivot at hip height y = 2.0)
  const rootJoint = registerJoint('Root', root, 0, 2.0, 0);
  const lowerTorso = createStudBlock({
    w: 1.75,
    h: 0.55,
    d: 0.95,
    color: PELVIS_BLUE,
    roughness: 0.58,
    jointName: 'Root',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  lowerTorso.position.set(0, 0.25, 0);
  rootJoint.add(lowerTorso);

  // Waist -> UpperTorso
  const waist = registerJoint('Waist', rootJoint, 0, 0.55, 0);
  const upperTorso = createStudBlock({
    w: 1.85,
    h: 1.35,
    d: 1.0,
    color: TORSO_BLUE,
    roughness: 0.5,
    studsX: 2,
    studsZ: 1,
    jointName: 'Waist',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  upperTorso.position.set(0, 0.68, 0);
  waist.add(upperTorso);

  // Neck -> Head
  const neck = registerJoint('Neck', waist, 0, 1.4, 0);
  const headMesh = createStudBlock({
    w: 1.15,
    h: 1.15,
    d: 1.15,
    color: SKIN_YELLOW,
    roughness: 0.42,
    studsX: 2,
    studsZ: 2,
    jointName: 'Neck',
    ghostColor,
    ghostOpacity,
    disposables,
    pickables,
  });
  headMesh.position.set(0, 0.6, 0);
  neck.add(headMesh);

  if (!isGhost) {
    // Simple stylized voxel eyes + smile on R15 head
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x11131a });
    const eyeGeo = new THREE.BoxGeometry(0.14, 0.22, 0.04);
    const smileGeo = new THREE.BoxGeometry(0.42, 0.08, 0.04);
    disposables.push(faceMat, eyeGeo, smileGeo);
    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.position.set(-0.22, 0.72, 0.58);
    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.position.set(0.22, 0.72, 0.58);
    const smile = new THREE.Mesh(smileGeo, faceMat);
    smile.position.set(0, 0.36, 0.58);
    neck.add(eyeL, eyeR, smile);
  }

  // Arms helper
  const buildArm = (side: 'Right' | 'Left', xSign: number) => {
    const shoulder = registerJoint(`${side}Shoulder`, waist, xSign * 1.25, 1.18, 0);
    const upperArm = createStudBlock({
      w: 0.62,
      h: 0.9,
      d: 0.62,
      color: SKIN_YELLOW,
      roughness: 0.48,
      studsX: 1,
      studsZ: 1,
      jointName: `${side}Shoulder`,
      ghostColor,
      ghostOpacity,
      disposables,
      pickables,
    });
    upperArm.position.set(0, -0.4, 0);
    shoulder.add(upperArm);

    const elbow = registerJoint(`${side}Elbow`, shoulder, 0, -0.88, 0);
    const lowerArm = createStudBlock({
      w: 0.58,
      h: 0.76,
      d: 0.58,
      color: SKIN_YELLOW,
      roughness: 0.52,
      jointName: `${side}Elbow`,
      ghostColor,
      ghostOpacity,
      disposables,
      pickables,
    });
    lowerArm.position.set(0, -0.36, 0);
    elbow.add(lowerArm);

    const wrist = registerJoint(`${side}Wrist`, elbow, 0, -0.76, 0);
    const hand = createStudBlock({
      w: 0.54,
      h: 0.38,
      d: 0.54,
      color: SKIN_YELLOW,
      roughness: 0.44,
      jointName: `${side}Wrist`,
      ghostColor,
      ghostOpacity,
      disposables,
      pickables,
    });
    hand.position.set(0, -0.18, 0);
    wrist.add(hand);
  };

  buildArm('Right', 1);
  buildArm('Left', -1);

  // Legs helper (2.0 total height from y=2.0 down to y=0.0)
  const buildLeg = (side: 'Right' | 'Left', xSign: number) => {
    const hip = registerJoint(`${side}Hip`, rootJoint, xSign * 0.48, 0, 0);
    const upperLeg = createStudBlock({
      w: 0.72,
      h: 0.96,
      d: 0.74,
      color: LEG_GREEN,
      roughness: 0.62,
      jointName: `${side}Hip`,
      ghostColor,
      ghostOpacity,
      disposables,
      pickables,
    });
    upperLeg.position.set(0, -0.48, 0);
    hip.add(upperLeg);

    const knee = registerJoint(`${side}Knee`, hip, 0, -0.98, 0);
    const lowerLeg = createStudBlock({
      w: 0.68,
      h: 0.98,
      d: 0.72,
      color: LEG_GREEN,
      roughness: 0.66,
      jointName: `${side}Knee`,
      ghostColor,
      ghostOpacity,
      disposables,
      pickables,
    });
    lowerLeg.position.set(0, -0.5, 0);
    knee.add(lowerLeg);
  };

  buildLeg('Right', 1);
  buildLeg('Left', -1);

  return {
    rigType: 'R15',
    root,
    joints,
    restPositions,
    pickables,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

export function applyPoseToRig(
  rig: RigHandle,
  pose: Record<string, JointTransform>
): void {
  const degToRad = THREE.MathUtils.DEG2RAD;
  for (const [name, joint] of Object.entries(rig.joints)) {
    const rest = rig.restPositions[name];
    const tr = pose[name];
    if (!tr) {
      joint.position.copy(rest);
      joint.rotation.set(0, 0, 0);
      joint.scale.set(1, 1, 1);
      continue;
    }
    joint.position.set(rest.x + (tr.px ?? 0), rest.y + (tr.py ?? 0), rest.z + (tr.pz ?? 0));
    joint.rotation.set(
      (tr.rx ?? 0) * degToRad,
      (tr.ry ?? 0) * degToRad,
      (tr.rz ?? 0) * degToRad
    );
    joint.scale.set(tr.sx ?? 1, tr.sy ?? 1, tr.sz ?? 1);
  }
}
