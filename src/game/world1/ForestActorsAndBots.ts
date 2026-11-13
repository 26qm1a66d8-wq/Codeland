import * as THREE from 'three';
import { CHARACTER_AVATARS } from '../../data/charactersAndBadges';
import { addContactShadow } from '../VoxelTexturesAndProps';

export type PlayerAnimReaction = 'none' | 'celebrate' | 'mistake' | 'interact';
export type SproutMood = 'idle' | 'walking' | 'talking' | 'pointing' | 'happy' | 'encouraging';

export interface ForestPlayerRig {
  root: THREE.Group;
  setForestOutfitVisible: (visible: boolean) => void;
  setCarryingSupplyVisible: (visible: boolean) => void;
  triggerReaction: (kind: PlayerAnimReaction, durationSec?: number) => void;
  update: (
    dt: number,
    elapsed: number,
    moveSpeedNorm: number,
    isSprinting: boolean,
    isGrounded: boolean
  ) => void;
  dispose: () => void;
}

export interface CompanionBotRig {
  root: THREE.Group;
  setAccessoryVisible: (visible: boolean) => void;
  triggerReaction: (kind: PlayerAnimReaction, durationSec?: number) => void;
  update: (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerYaw: number
  ) => void;
  dispose: () => void;
}

export interface SproutGuideRig {
  root: THREE.Group;
  clickProxy: THREE.Mesh;
  triggerMood: (mood: 'talking' | 'happy' | 'encouraging', durationSec?: number) => void;
  update: (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    targetWaypoint: THREE.Vector3,
    objectivePos: THREE.Vector3 | null,
    getGroundY: (x: number, z: number) => number
  ) => void;
  dispose: () => void;
}

export interface ConstructionCrewRig {
  root: THREE.Group;
  triggerSiteBuild: (x: number, y: number, z: number, stageNumber: number) => void;
  isBuilding: () => boolean;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

/**
 * Builds the 10-part articulated 3D Voxel Player Avatar with idle, walk, sprint,
 * jump, interact, celebrate, and mistake reactions + equippable Forest Builder Outfit.
 */
export function buildForestPlayerRig(
  avatarId: string,
  shadowTex: THREE.Texture
): ForestPlayerRig {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const avatarMeta =
    CHARACTER_AVATARS.find((a) => a.id === avatarId) || CHARACTER_AVATARS[0];

  const root = new THREE.Group();
  addContactShadow(root, 0.72, shadowTex);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const matSkin = m(new THREE.MeshStandardMaterial({ color: '#F3C69F', roughness: 0.72, metalness: 0.04 }));
  const matTunic = m(new THREE.MeshStandardMaterial({ color: avatarMeta.accentHex, roughness: 0.48, metalness: 0.16 }));
  const matPants = m(new THREE.MeshStandardMaterial({ color: '#24352C', roughness: 0.82, metalness: 0.06 }));
  const matBoots = m(new THREE.MeshStandardMaterial({ color: '#4A311D', roughness: 0.8, metalness: 0.08 }));
  const matHair = m(new THREE.MeshStandardMaterial({ color: '#3B281B', roughness: 0.78, metalness: 0.04 }));
  const matEye = m(new THREE.MeshStandardMaterial({ color: '#141E19', roughness: 0.2, metalness: 0.5 }));
  const matPack = m(new THREE.MeshStandardMaterial({ color: '#8A5A36', roughness: 0.72, metalness: 0.1 }));

  // Equippable Forest Builder Cloak & Hat materials
  const matCloak = m(new THREE.MeshStandardMaterial({ color: '#1F6E3D', roughness: 0.55, metalness: 0.12 }));
  const matGoldTrim = m(new THREE.MeshStandardMaterial({ color: '#F5C451', roughness: 0.25, metalness: 0.82 }));

  // Pivoted Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.14, 0.48, 0);
  const leftLegMesh = new THREE.Mesh(g(new THREE.BoxGeometry(0.22, 0.36, 0.22)), matPants);
  leftLegMesh.position.y = -0.18;
  leftLegMesh.castShadow = true;
  const leftBoot = new THREE.Mesh(g(new THREE.BoxGeometry(0.24, 0.14, 0.28)), matBoots);
  leftBoot.position.set(0, -0.41, 0.03);
  leftLegPivot.add(leftLegMesh, leftBoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.14, 0.48, 0);
  const rightLegMesh = leftLegMesh.clone();
  const rightBoot = leftBoot.clone();
  rightLegPivot.add(rightLegMesh, rightBoot);

  // Torso & Explorer Backpack
  const torso = new THREE.Mesh(g(new THREE.BoxGeometry(0.54, 0.56, 0.3)), matTunic);
  torso.position.set(0, 0.76, 0);
  torso.castShadow = true;

  const backpack = new THREE.Mesh(g(new THREE.BoxGeometry(0.38, 0.42, 0.18)), matPack);
  backpack.position.set(0, 0.78, -0.22);
  backpack.castShadow = true;

  // Pivoted Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.37, 0.98, 0);
  const leftArmMesh = new THREE.Mesh(g(new THREE.BoxGeometry(0.19, 0.46, 0.2)), matTunic);
  leftArmMesh.position.y = -0.21;
  leftArmMesh.castShadow = true;
  const leftHand = new THREE.Mesh(g(new THREE.BoxGeometry(0.17, 0.14, 0.17)), matSkin);
  leftHand.position.y = -0.46;
  leftArmPivot.add(leftArmMesh, leftHand);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.37, 0.98, 0);
  const rightArmMesh = leftArmMesh.clone();
  const rightHand = leftHand.clone();
  rightArmPivot.add(rightArmMesh, rightHand);

  // Pivoted Head
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.06, 0);
  const headBox = new THREE.Mesh(g(new THREE.BoxGeometry(0.48, 0.46, 0.48)), matSkin);
  headBox.position.y = 0.24;
  headBox.castShadow = true;
  const hairCap = new THREE.Mesh(g(new THREE.BoxGeometry(0.52, 0.16, 0.52)), matHair);
  hairCap.position.y = 0.44;
  const eyeL = new THREE.Mesh(g(new THREE.BoxGeometry(0.08, 0.08, 0.05)), matEye);
  eyeL.position.set(-0.11, 0.26, 0.24);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  headPivot.add(headBox, hairCap, eyeL, eyeR);

  // Special Unlockable Forest Builder Outfit (Part 4 & Part 11)
  const outfitGroup = new THREE.Group();
  outfitGroup.visible = false;
  const cloak = new THREE.Mesh(g(new THREE.BoxGeometry(0.58, 0.68, 0.08)), matCloak);
  cloak.position.set(0, 0.68, -0.33);
  cloak.rotation.x = 0.12;
  const shoulderTrim = new THREE.Mesh(g(new THREE.BoxGeometry(0.62, 0.1, 0.36)), matGoldTrim);
  shoulderTrim.position.set(0, 1.03, 0);
  outfitGroup.add(cloak, shoulderTrim);

  const builderHat = new THREE.Group();
  builderHat.visible = false;
  const brim = new THREE.Mesh(g(new THREE.BoxGeometry(0.68, 0.07, 0.68)), matCloak);
  brim.position.y = 0.49;
  const crown = new THREE.Mesh(g(new THREE.ConeGeometry(0.32, 0.36, 4)), matCloak);
  crown.position.y = 0.69;
  crown.rotation.y = Math.PI / 4;
  const plume = new THREE.Mesh(g(new THREE.BoxGeometry(0.08, 0.26, 0.14)), matGoldTrim);
  plume.position.set(0.24, 0.66, 0);
  plume.rotation.z = -0.3;
  builderHat.add(brim, crown, plume);
  headPivot.add(builderHat);

  // Carried Workshop Supply Crate (visible when carrying Brass Gears & JVM Core in Level 2!)
  const carriedCrateGroup = new THREE.Group();
  carriedCrateGroup.position.set(0, 0.72, 0.34);
  carriedCrateGroup.visible = false;
  const matCrateWood = m(new THREE.MeshStandardMaterial({ color: '#8E5D38', roughness: 0.76, metalness: 0.06 }));
  const matCrateCrystal = m(
    new THREE.MeshStandardMaterial({
      color: '#70E4FF',
      emissive: '#22A8D8',
      emissiveIntensity: 0.9,
      roughness: 0.18,
    })
  );
  const crateBox = new THREE.Mesh(g(new THREE.BoxGeometry(0.4, 0.3, 0.34)), matCrateWood);
  crateBox.castShadow = true;
  const crateBand = new THREE.Mesh(g(new THREE.BoxGeometry(0.42, 0.06, 0.36)), matGoldTrim);
  const crateGear = new THREE.Mesh(g(new THREE.TorusGeometry(0.1, 0.028, 6, 10)), matGoldTrim);
  crateGear.position.set(-0.08, 0.2, 0);
  const crateShard = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.1, 0)), matCrateCrystal);
  crateShard.position.set(0.09, 0.22, 0);
  carriedCrateGroup.add(crateBox, crateBand, crateGear, crateShard);

  bodyPivot.add(
    leftLegPivot,
    rightLegPivot,
    torso,
    backpack,
    outfitGroup,
    carriedCrateGroup,
    leftArmPivot,
    rightArmPivot,
    headPivot
  );

  let reaction: PlayerAnimReaction = 'none';
  let reactionTimer = 0;
  let isCarryingSupply = false;

  const setForestOutfitVisible = (visible: boolean) => {
    outfitGroup.visible = visible;
    builderHat.visible = visible;
  };

  const setCarryingSupplyVisible = (visible: boolean) => {
    isCarryingSupply = visible;
    carriedCrateGroup.visible = visible;
  };

  const triggerReaction = (kind: PlayerAnimReaction, durationSec = 2.0) => {
    reaction = kind;
    reactionTimer = durationSec;
  };

  const update = (
    dt: number,
    elapsed: number,
    moveSpeedNorm: number,
    isSprinting: boolean,
    isGrounded: boolean
  ) => {
    if (isCarryingSupply) {
      crateShard.rotation.y = elapsed * 2.2;
      crateGear.rotation.z = elapsed * 1.8;
    }

    if (reactionTimer > 0) {
      reactionTimer = Math.max(0, reactionTimer - dt);
      if (reactionTimer === 0) reaction = 'none';
    }

    if (reaction === 'celebrate') {
      bodyPivot.position.y = Math.abs(Math.sin(elapsed * 10)) * 0.38;
      bodyPivot.rotation.y = Math.sin(elapsed * 6) * 0.45;
      leftArmPivot.rotation.x = -2.5 + Math.sin(elapsed * 14) * 0.25;
      rightArmPivot.rotation.x = -2.5 - Math.sin(elapsed * 14) * 0.25;
      leftLegPivot.rotation.x = 0.25;
      rightLegPivot.rotation.x = -0.25;
      headPivot.rotation.set(-0.15, 0, 0);
      return;
    }

    if (reaction === 'mistake') {
      bodyPivot.position.y = 0;
      bodyPivot.rotation.y = 0;
      headPivot.rotation.set(0.25, Math.sin(elapsed * 18) * 0.38, 0);
      leftArmPivot.rotation.x = 0.35;
      rightArmPivot.rotation.x = 0.35;
      leftLegPivot.rotation.x = 0;
      rightLegPivot.rotation.x = 0;
      return;
    }

    if (reaction === 'interact') {
      rightArmPivot.rotation.x = -1.4 + Math.sin(elapsed * 12) * 0.3;
    }

    bodyPivot.rotation.y = THREE.MathUtils.damp(bodyPivot.rotation.y, 0, 8, dt);

    if (!isGrounded) {
      leftArmPivot.rotation.x = isCarryingSupply ? -0.95 : -0.85;
      rightArmPivot.rotation.x = isCarryingSupply ? -0.95 : -0.85;
      leftLegPivot.rotation.x = 0.35;
      rightLegPivot.rotation.x = -0.35;
      headPivot.rotation.set(-0.1, 0, 0);
      return;
    }

    if (moveSpeedNorm > 0.06) {
      const freq = isSprinting ? 14 : 9.5;
      const swing = Math.sin(elapsed * freq) * 0.72 * moveSpeedNorm;
      leftLegPivot.rotation.x = swing;
      rightLegPivot.rotation.x = -swing;
      if (isCarryingSupply) {
        leftArmPivot.rotation.x = -0.95 + Math.sin(elapsed * freq) * 0.06;
        rightArmPivot.rotation.x = -0.95 - Math.sin(elapsed * freq) * 0.06;
      } else {
        if (reaction !== 'interact') {
          rightArmPivot.rotation.x = swing * 0.85;
        }
        leftArmPivot.rotation.x = -swing * 0.85;
      }
      bodyPivot.position.y = Math.abs(Math.cos(elapsed * freq)) * 0.08;
      headPivot.rotation.set(0, 0, 0);
    } else {
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0, 10, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0, 10, dt);
      const targetArmX = isCarryingSupply ? -0.95 : 0;
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, targetArmX, 10, dt);
      if (reaction !== 'interact') {
        rightArmPivot.rotation.x = THREE.MathUtils.damp(
          rightArmPivot.rotation.x,
          targetArmX,
          10,
          dt
        );
      }
      bodyPivot.position.y = Math.sin(elapsed * 2.4) * 0.025;
      headPivot.rotation.set(0, Math.sin(elapsed * 0.9) * 0.08, 0);
    }
  };

  const dispose = () => {
    geos.forEach((geo) => geo.dispose());
    mats.forEach((mat) => mat.dispose());
  };

  return {
    root,
    setForestOutfitVisible,
    setCarryingSupplyVisible,
    triggerReaction,
    update,
    dispose,
  };
}

/**
 * Builds the Floating Companion Sprite/Bot (Part 4) that hovers smoothly near the player,
 * reacts to completed tasks, and wears an unlockable Golden Sprout Halo & Crystal Wings.
 */
export function buildCompanionSprite(): CompanionBotRig {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const matShell = m(new THREE.MeshStandardMaterial({ color: '#E8F5EE', roughness: 0.28, metalness: 0.35 }));
  const matTrim = m(new THREE.MeshStandardMaterial({ color: '#2F7D46', roughness: 0.4, metalness: 0.25 }));
  const matVisor = m(
    new THREE.MeshStandardMaterial({
      color: '#52F2B8',
      emissive: '#1DC97A',
      emissiveIntensity: 0.95,
      roughness: 0.15,
    })
  );
  const matGold = m(
    new THREE.MeshStandardMaterial({
      color: '#F5C451',
      emissive: '#D99B1E',
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.85,
    })
  );

  const chassis = new THREE.Mesh(g(new THREE.BoxGeometry(0.38, 0.34, 0.36)), matShell);
  chassis.castShadow = true;
  const band = new THREE.Mesh(g(new THREE.BoxGeometry(0.41, 0.08, 0.38)), matTrim);
  band.position.y = -0.08;
  const visor = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 0.12, 0.06)), matVisor);
  visor.position.set(0, 0.03, 0.18);
  const antenna = new THREE.Mesh(g(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6)), matTrim);
  antenna.position.y = 0.25;
  const tip = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.07, 0)), matVisor);
  tip.position.y = 0.36;

  const wingL = new THREE.Mesh(g(new THREE.BoxGeometry(0.22, 0.06, 0.14)), matTrim);
  wingL.position.set(-0.27, 0.02, -0.02);
  const wingR = wingL.clone();
  wingR.position.x = 0.27;

  // Unlockable Companion Accessory: Golden Sprout Halo & Crystal Wings
  const accessoryGroup = new THREE.Group();
  accessoryGroup.visible = false;
  const halo = new THREE.Mesh(g(new THREE.TorusGeometry(0.24, 0.035, 8, 16)), matGold);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.46;
  const crystalWingL = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 0.16, 0.04)), matGold);
  crystalWingL.position.set(-0.32, 0.08, -0.1);
  const crystalWingR = crystalWingL.clone();
  crystalWingR.position.x = 0.32;
  accessoryGroup.add(halo, crystalWingL, crystalWingR);

  bodyGroup.add(chassis, band, visor, antenna, tip, wingL, wingR, accessoryGroup);

  let reaction: PlayerAnimReaction = 'none';
  let reactionTimer = 0;

  const setAccessoryVisible = (visible: boolean) => {
    accessoryGroup.visible = visible;
  };

  const triggerReaction = (kind: PlayerAnimReaction, durationSec = 2.0) => {
    reaction = kind;
    reactionTimer = durationSec;
  };

  const update = (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerYaw: number
  ) => {
    if (reactionTimer > 0) {
      reactionTimer = Math.max(0, reactionTimer - dt);
      if (reactionTimer === 0) reaction = 'none';
    }

    // Hover behind and slightly to the right of the player's shoulder
    const offsetX = Math.sin(playerYaw - 0.85) * -1.25;
    const offsetZ = Math.cos(playerYaw - 0.85) * -1.25;
    const targetX = playerPos.x + offsetX;
    const targetY = playerPos.y + 1.65 + Math.sin(elapsed * 3.1) * 0.14;
    const targetZ = playerPos.z + offsetZ;

    root.position.x = THREE.MathUtils.damp(root.position.x, targetX, 5.5, dt);
    root.position.y = THREE.MathUtils.damp(root.position.y, targetY, 5.5, dt);
    root.position.z = THREE.MathUtils.damp(root.position.z, targetZ, 5.5, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, playerYaw, 6, dt);

    const flap = Math.sin(elapsed * 14) * 0.35;
    wingL.rotation.z = flap;
    wingR.rotation.z = -flap;

    if (reaction === 'celebrate') {
      bodyGroup.rotation.y = elapsed * 9.0;
      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 10)) * 0.25;
      matVisor.color.set('#52F2B8');
      matVisor.emissive.set('#1DC97A');
    } else if (reaction === 'mistake') {
      bodyGroup.rotation.y = Math.sin(elapsed * 20) * 0.4;
      bodyGroup.position.y = -0.08;
      matVisor.color.set('#FFB74D');
      matVisor.emissive.set('#F28C45');
    } else {
      bodyGroup.rotation.y = THREE.MathUtils.damp(bodyGroup.rotation.y, 0, 8, dt);
      bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, 0, 8, dt);
      matVisor.color.set('#52F2B8');
      matVisor.emissive.set('#1DC97A');
    }
  };

  const dispose = () => {
    geos.forEach((geo) => geo.dispose());
    mats.forEach((mat) => mat.dispose());
  };

  return { root, setAccessoryVisible, triggerReaction, update, dispose };
}

/**
 * Builds SPROUT — The Interactive 3D Forest Guide NPC:
 * Physically walks from waypoint to waypoint across the terrain and features 6 animations:
 * idle, walking, talking, pointing toward objectives, happy celebration, and encouraging reaction.
 */
export function buildSproutGuideNpc(shadowTex: THREE.Texture): SproutGuideRig {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const root = new THREE.Group();
  addContactShadow(root, 0.72, shadowTex);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const matBark = m(new THREE.MeshStandardMaterial({ color: '#6E4B2C', roughness: 0.82, metalness: 0.04 }));
  const matMoss = m(new THREE.MeshStandardMaterial({ color: '#399652', roughness: 0.62, metalness: 0.06 }));
  const matLeafBright = m(new THREE.MeshStandardMaterial({ color: '#6CE07A', roughness: 0.48, metalness: 0.08 }));
  const matFace = m(new THREE.MeshStandardMaterial({ color: '#DCEFD8', roughness: 0.68, metalness: 0.05 }));
  const matEyes = m(
    new THREE.MeshStandardMaterial({
      color: '#13281D',
      emissive: '#22593B',
      emissiveIntensity: 0.35,
      roughness: 0.2,
    })
  );
  const matLantern = m(
    new THREE.MeshStandardMaterial({
      color: '#FFE484',
      emissive: '#FFB636',
      emissiveIntensity: 1.25,
      roughness: 0.2,
    })
  );

  const footL = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 0.2, 0.24)), matBark);
  footL.position.set(-0.13, 0.1, 0);
  const footR = footL.clone();
  footR.position.x = 0.13;

  const cloak = new THREE.Mesh(g(new THREE.CylinderGeometry(0.24, 0.36, 0.58, 6)), matMoss);
  cloak.position.y = 0.46;
  cloak.castShadow = true;

  const collar = new THREE.Mesh(g(new THREE.CylinderGeometry(0.34, 0.28, 0.12, 6)), matLeafBright);
  collar.position.y = 0.74;

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.82, 0);
  const head = new THREE.Mesh(g(new THREE.BoxGeometry(0.5, 0.44, 0.46)), matFace);
  head.position.y = 0.2;
  head.castShadow = true;

  const eyeL = new THREE.Mesh(g(new THREE.BoxGeometry(0.09, 0.1, 0.05)), matEyes);
  eyeL.position.set(-0.12, 0.22, 0.23);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;

  const stem = new THREE.Mesh(g(new THREE.CylinderGeometry(0.03, 0.04, 0.26, 6)), matMoss);
  stem.position.y = 0.54;
  const leafL = new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 0.06, 0.14)), matLeafBright);
  leafL.position.set(-0.13, 0.66, 0);
  leafL.rotation.z = 0.38;
  const leafR = new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 0.06, 0.14)), matLeafBright);
  leafR.position.set(0.13, 0.66, 0);
  leafR.rotation.z = -0.38;
  headPivot.add(head, eyeL, eyeR, stem, leafL, leafR);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.32, 0.68, 0);
  const rArm = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.34, 0.14)), matBark);
  rArm.position.y = -0.14;
  rightArmPivot.add(rArm);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.32, 0.68, 0);
  const lArm = rArm.clone();
  const guideOrb = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.11, 0)), matLantern);
  guideOrb.position.set(0, -0.34, 0.12);
  leftArmPivot.add(lArm, guideOrb);

  const ring = new THREE.Mesh(g(new THREE.TorusGeometry(0.28, 0.032, 8, 18)), matLantern);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.72;

  // Invisible Raycaster Click Hitbox so players can click Sprout directly in 3D!
  const clickProxy = new THREE.Mesh(
    g(new THREE.BoxGeometry(1.3, 2.0, 1.3)),
    m(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      })
    )
  );
  clickProxy.position.y = 0.95;
  clickProxy.userData.interactable = { kind: 'sprout' };
  root.add(clickProxy);

  bodyGroup.add(
    footL,
    footR,
    cloak,
    collar,
    headPivot,
    rightArmPivot,
    leftArmPivot,
    ring
  );

  let timedMood: 'talking' | 'happy' | 'encouraging' | null = null;
  let moodTimer = 0;

  const triggerMood = (mood: 'talking' | 'happy' | 'encouraging', durationSec = 2.6) => {
    timedMood = mood;
    moodTimer = durationSec;
  };

  const rotateYawSmooth = (targetYaw: number, speed: number, dt: number) => {
    let diff = targetYaw - root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.y += diff * Math.min(1, dt * speed);
  };

  const update = (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    targetWaypoint: THREE.Vector3,
    objectivePos: THREE.Vector3 | null,
    getGroundY: (x: number, z: number) => number
  ) => {
    if (moodTimer > 0) {
      moodTimer = Math.max(0, moodTimer - dt);
      if (moodTimer === 0) timedMood = null;
    }

    // 1. Physical Waypoint Movement along Terrain
    const wdx = targetWaypoint.x - root.position.x;
    const wdz = targetWaypoint.z - root.position.z;
    const wDist = Math.hypot(wdx, wdz);
    let isWalking = false;

    if (wDist > 18.0) {
      // Snap cleanly when fast-traveling to a distant level site
      const gy = Math.max(targetWaypoint.y, getGroundY(targetWaypoint.x, targetWaypoint.z));
      root.position.set(targetWaypoint.x, gy, targetWaypoint.z);
    } else if (wDist > 0.14) {
      isWalking = true;
      const walkSpeed = 4.6;
      const step = Math.min(wDist, walkSpeed * dt);
      root.position.x += (wdx / wDist) * step;
      root.position.z += (wdz / wDist) * step;
      const gy = Math.max(targetWaypoint.y, getGroundY(root.position.x, root.position.z));
      root.position.y = THREE.MathUtils.damp(root.position.y, gy, 16, dt);
      rotateYawSmooth(Math.atan2(wdx, wdz), 10, dt);
    } else {
      const gy = Math.max(targetWaypoint.y, getGroundY(root.position.x, root.position.z));
      root.position.y = THREE.MathUtils.damp(root.position.y, gy, 12, dt);
    }

    const pdx = playerPos.x - root.position.x;
    const pdz = playerPos.z - root.position.z;
    const playerDist = Math.hypot(pdx, pdz);

    // Eye blink
    const blink = Math.sin(elapsed * 1.9) > 0.96 ? 0.15 : 1.0;
    eyeL.scale.y = blink;
    eyeR.scale.y = blink;
    ring.rotation.z = elapsed * 1.3;

    // 2. Determine Active Animation State (6 Animations)
    let state: SproutMood = 'idle';
    if (timedMood === 'happy') {
      state = 'happy';
    } else if (timedMood === 'encouraging') {
      state = 'encouraging';
    } else if (isWalking) {
      state = 'walking';
    } else if (timedMood === 'talking') {
      state = 'talking';
    } else if (objectivePos && playerDist < 7.5) {
      state = 'pointing';
    }

    // Reset neutral defaults smoothly
    if (state !== 'walking') {
      footL.position.set(-0.13, 0.1, THREE.MathUtils.damp(footL.position.z, 0, 12, dt));
      footR.position.set(0.13, 0.1, THREE.MathUtils.damp(footR.position.z, 0, 12, dt));
      bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, 0, 10, dt);
    }

    if (state === 'happy') {
      // Joyful celebration hop, twirl, raised arms & emerald halo glow!
      if (!isWalking && playerDist < 16) rotateYawSmooth(Math.atan2(pdx, pdz), 8, dt);
      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 11)) * 0.34;
      bodyGroup.rotation.y = Math.sin(elapsed * 8.5) * 0.65;
      rightArmPivot.rotation.set(-0.4, 0, -2.5 + Math.sin(elapsed * 15) * 0.28);
      leftArmPivot.rotation.set(-0.4, 0, 2.35 - Math.sin(elapsed * 15) * 0.28);
      headPivot.rotation.set(-0.12, 0, 0);
      leafL.rotation.z = 0.38 + Math.sin(elapsed * 18) * 0.22;
      leafR.rotation.z = -0.38 - Math.sin(elapsed * 18) * 0.22;
      matLantern.color.set('#6BF7B8');
      matLantern.emissive.set('#22C57E');
      return;
    }

    matLantern.color.set('#FFE484');
    matLantern.emissive.set('#FFB636');
    bodyGroup.rotation.y = THREE.MathUtils.damp(bodyGroup.rotation.y, 0, 8, dt);

    if (state === 'encouraging') {
      // Empathetic head tilt and warm reassuring wave after a Java error
      if (playerDist < 16) rotateYawSmooth(Math.atan2(pdx, pdz), 8, dt);
      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 3.5)) * 0.05;
      headPivot.rotation.set(0.08, 0, Math.sin(elapsed * 6.5) * 0.18);
      rightArmPivot.rotation.set(-0.3, 0, -2.0 + Math.sin(elapsed * 8.5) * 0.32);
      leftArmPivot.rotation.set(0, 0, 0.2);
      leafL.rotation.z = 0.45;
      leafR.rotation.z = -0.45;
      return;
    }

    if (state === 'walking') {
      // Articulated foot stride, slight forward lean, and brisk arm swing
      const stride = Math.sin(elapsed * 13.5);
      footL.position.z = stride * 0.14;
      footL.position.y = 0.1 + Math.max(0, stride) * 0.08;
      footR.position.z = -stride * 0.14;
      footR.position.y = 0.1 + Math.max(0, -stride) * 0.08;
      bodyGroup.position.y = Math.abs(Math.cos(elapsed * 13.5)) * 0.08;
      bodyGroup.rotation.x = 0.1;
      rightArmPivot.rotation.set(-stride * 0.65, 0, -0.2);
      leftArmPivot.rotation.set(stride * 0.65, 0, 0.2);
      headPivot.rotation.set(0, 0, 0);
      leafL.rotation.z = 0.38 + stride * 0.14;
      leafR.rotation.z = -0.38 + stride * 0.14;
      return;
    }

    if (state === 'talking') {
      // Expressive head nod and conversational hand gestures
      if (playerDist < 16) rotateYawSmooth(Math.atan2(pdx, pdz), 8, dt);
      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 4.5)) * 0.07;
      headPivot.rotation.set(Math.sin(elapsed * 9.5) * 0.11, Math.sin(elapsed * 4.2) * 0.12, 0);
      rightArmPivot.rotation.set(-0.85 + Math.sin(elapsed * 10) * 0.3, 0, -0.9);
      leftArmPivot.rotation.set(-0.55 - Math.sin(elapsed * 10) * 0.22, 0, 0.45);
      leafL.rotation.z = 0.38 + Math.sin(elapsed * 12) * 0.16;
      leafR.rotation.z = -0.38 - Math.sin(elapsed * 12) * 0.16;
      return;
    }

    if (state === 'pointing' && objectivePos) {
      // Turn partway between player & objective and point right arm toward the active 3D objective!
      const odx = objectivePos.x - root.position.x;
      const odz = objectivePos.z - root.position.z;
      const objYaw = Math.atan2(odx, odz);
      rotateYawSmooth(objYaw, 6, dt);

      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 3.0)) * 0.055;
      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        -1.35 + Math.sin(elapsed * 4.5) * 0.1,
        8,
        dt
      );
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, -0.22, 8, dt);
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0, 8, dt);
      leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, 0.18, 8, dt);
      // Glance back toward player periodically while pointing ahead!
      const glance = Math.sin(elapsed * 1.8) > 0.2 ? 0.35 : 0;
      headPivot.rotation.set(0, glance, 0);
      leafL.rotation.z = 0.38 + Math.sin(elapsed * 4) * 0.08;
      leafR.rotation.z = -0.38 - Math.sin(elapsed * 4) * 0.08;
      return;
    }

    // Idle animation: face player if within 14m, gentle breathing & friendly wave if close
    if (playerDist < 14) {
      rotateYawSmooth(Math.atan2(pdx, pdz), 6, dt);
    }
    bodyGroup.position.y = Math.abs(Math.sin(elapsed * 2.6)) * 0.05;
    headPivot.rotation.set(0, Math.sin(elapsed * 1.1) * 0.08, 0);
    rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, 0, 6, dt);
    if (playerDist < 5.5) {
      rightArmPivot.rotation.z = -2.15 + Math.sin(elapsed * 9.0) * 0.35;
    } else {
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, -0.2, 6, dt);
    }
    leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0, 6, dt);
    leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, 0.2, 6, dt);
    leafL.rotation.z = 0.38 + Math.sin(elapsed * 2.6) * 0.06;
    leafR.rotation.z = -0.38 - Math.sin(elapsed * 2.6) * 0.06;
  };

  const dispose = () => {
    geos.forEach((geo) => geo.dispose());
    mats.forEach((mat) => mat.dispose());
  };

  return { root, clickProxy, triggerMood, update, dispose };
}

/**
 * Builds the 3D Construction Crew (Part 8):
 * 3 Flying Voxel Construction Bots carrying timber/stone blocks +
 * 2 Ground Voxel Builder Workers + Golden Spark Particle Burst!
 */
export function buildConstructionCrew(): ConstructionCrewRig {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const root = new THREE.Group();
  root.visible = false;

  const matBrass = m(new THREE.MeshStandardMaterial({ color: '#F5C451', roughness: 0.26, metalness: 0.82 }));
  const matIron = m(new THREE.MeshStandardMaterial({ color: '#33413B', roughness: 0.4, metalness: 0.72 }));
  const matBeam = m(
    new THREE.MeshStandardMaterial({
      color: '#52F2B8',
      emissive: '#22C57E',
      emissiveIntensity: 1.2,
      roughness: 0.2,
    })
  );
  const matBlock = m(new THREE.MeshStandardMaterial({ color: '#9C6B43', roughness: 0.75 }));

  // 3 Flying Construction Bots
  const bots: { group: THREE.Group; rotor: THREE.Mesh; cargo: THREE.Mesh }[] = [];
  for (let i = 0; i < 3; i++) {
    const bg = new THREE.Group();
    const hull = new THREE.Mesh(g(new THREE.BoxGeometry(0.56, 0.36, 0.56)), matBrass);
    const rotor = new THREE.Mesh(g(new THREE.BoxGeometry(0.95, 0.05, 0.14)), matIron);
    rotor.position.y = 0.26;
    const eye = new THREE.Mesh(g(new THREE.BoxGeometry(0.32, 0.12, 0.08)), matBeam);
    eye.position.set(0, 0, 0.28);
    const cargo = new THREE.Mesh(g(new THREE.BoxGeometry(0.36, 0.32, 0.36)), matBlock);
    cargo.position.y = -0.36;
    const laser = new THREE.Mesh(
      g(new THREE.CylinderGeometry(0.04, 0.16, 1.4, 8)),
      m(
        new THREE.MeshBasicMaterial({
          color: '#6BF7B8',
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      )
    );
    laser.position.y = -1.05;
    bg.add(hull, rotor, eye, cargo, laser);
    root.add(bg);
    bots.push({ group: bg, rotor, cargo });
  }

  // 2 Ground Builder Worker NPCs hammering around perimeter
  const workers: { group: THREE.Group; arm: THREE.Group }[] = [];
  for (let w = 0; w < 2; w++) {
    const wg = new THREE.Group();
    const torso = new THREE.Mesh(g(new THREE.BoxGeometry(0.44, 0.56, 0.28)), matIron);
    torso.position.y = 0.42;
    const head = new THREE.Mesh(g(new THREE.BoxGeometry(0.38, 0.38, 0.38)), m(new THREE.MeshStandardMaterial({ color: '#F2C6A0', roughness: 0.75 })));
    head.position.y = 0.89;
    const hardhat = new THREE.Mesh(g(new THREE.BoxGeometry(0.44, 0.16, 0.44)), matBrass);
    hardhat.position.y = 1.12;
    const arm = new THREE.Group();
    arm.position.set(0.28, 0.64, 0);
    const hammer = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.38, 0.14)), matBrass);
    hammer.position.y = -0.18;
    arm.add(hammer);
    wg.add(torso, head, hardhat, arm);
    root.add(wg);
    workers.push({ group: wg, arm });
  }

  // Golden Spark Cubes
  const sparks: THREE.Mesh[] = [];
  const sparkGeo = g(new THREE.BoxGeometry(0.16, 0.16, 0.16));
  const sparkMat = m(
    new THREE.MeshBasicMaterial({
      color: '#FFE066',
    })
  );
  for (let s = 0; s < 18; s++) {
    const sp = new THREE.Mesh(sparkGeo, sparkMat);
    root.add(sp);
    sparks.push(sp);
  }

  let activeTimer = 0;
  let totalDuration = 3.4;

  const triggerSiteBuild = (x: number, y: number, z: number, _stageNumber: number) => {
    root.position.set(x, y, z);
    activeTimer = totalDuration;
    root.visible = true;
  };

  const isBuilding = () => activeTimer > 0;

  const update = (dt: number, elapsed: number) => {
    if (activeTimer <= 0) {
      if (root.visible) root.visible = false;
      return;
    }
    activeTimer = Math.max(0, activeTimer - dt);

    // Orbit flying bots dynamically around the rising building
    for (let i = 0; i < bots.length; i++) {
      const ang = elapsed * 2.8 + (i * Math.PI * 2) / 3;
      const rad = 2.6 + Math.sin(elapsed * 3.5 + i) * 0.45;
      const bx = Math.cos(ang) * rad;
      const bz = Math.sin(ang) * rad;
      const by = 3.2 + Math.sin(elapsed * 4.2 + i) * 0.55;
      bots[i].group.position.set(bx, by, bz);
      bots[i].group.lookAt(root.position.x, root.position.y + 1.8, root.position.z);
      bots[i].rotor.rotation.y = elapsed * 22;
      bots[i].cargo.rotation.y = elapsed * 3;
    }

    // Ground builder workers hammering energetically
    for (let w = 0; w < workers.length; w++) {
      const ang = w * Math.PI + 0.65;
      workers[w].group.position.set(Math.cos(ang) * 3.1, 0, Math.sin(ang) * 3.1);
      workers[w].group.rotation.y = -ang - Math.PI / 2;
      workers[w].arm.rotation.x = -1.1 + Math.sin(elapsed * 18 + w) * 0.75;
    }

    // Rising golden construction sparks
    for (let s = 0; s < sparks.length; s++) {
      const cycle = (elapsed * 1.9 + s * 0.17) % 1;
      const sang = s * 1.35 + elapsed * 1.5;
      const srad = 1.2 + (s % 4) * 0.55;
      sparks[s].position.set(
        Math.cos(sang) * srad,
        0.4 + cycle * 4.2,
        Math.sin(sang) * srad
      );
      const sc = 1.0 - cycle * 0.75;
      sparks[s].scale.setScalar(sc);
    }

    if (activeTimer === 0) {
      root.visible = false;
    }
  };

  const dispose = () => {
    geos.forEach((geo) => geo.dispose());
    mats.forEach((mat) => mat.dispose());
  };

  return { root, triggerSiteBuild, isBuilding, update, dispose };
}
