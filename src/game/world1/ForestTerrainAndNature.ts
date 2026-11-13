import * as THREE from 'three';
import { createVoxelCanvasTexture } from '../VoxelTexturesAndProps';
import { WORLD1_LEVELS } from '../../data/world1ForestData';

export interface AnimatedNatureHandle {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

const RIVER_HALF_WIDTH = 3.9;
const PLAYABLE_LIMIT = 46.5;

/**
 * River center Z bends gently across X so the Silverstream looks organic,
 * while passing cleanly through z = 0 around x = 14 (the Level 4 Bridge site).
 */
export function getRiverCenterZ(x: number): number {
  const distFromBridge = Math.abs(x - 14);
  const flatten = THREE.MathUtils.clamp((distFromBridge - 4.5) / 10, 0, 1);
  return Math.sin(x * 0.075) * 1.65 * flatten;
}

function isInsideHighlandBox(x: number, z: number): boolean {
  return x >= -44.5 && x <= -2.5 && z >= -45.5 && z <= -17.5;
}

function isOnStaircaseRamp(x: number, z: number): boolean {
  return x >= -12.6 && x <= -7.4 && z >= -17.6 && z <= -8.0;
}

function isOnNortheastRamp(x: number, z: number): boolean {
  return x >= -3.0 && x <= 5.5 && z >= -35.8 && z <= -29.8;
}

function isInWorkshopCreek(x: number, z: number): boolean {
  return x >= -13.3 && x <= -10.7 && z >= 20.5 && z <= 34.8;
}

function isOnWorkshopCreekBridge(x: number, z: number): boolean {
  return x >= -13.6 && x <= -10.4 && z >= 27.0 && z <= 29.8;
}

/**
 * Computes exact walkable ground Y at (x, z), accounting for:
 * - Level 2 Workshop Creek channel, Stage 1 Creek Bridge, and Hollow Compiler Workshop floor
 * - Silverstream River channel & Level 4 Wooden Bridge arch
 * - Northern Highland Plateau (y = 3.6) & Level 5 Cliffside Staircase
 * - Northeast trail ramp connecting Level 7 Map Station down to Level 8 Repair District
 * - Gentle rolling outer hills beyond playable settlement clearings
 */
export function groundHeightAt(
  x: number,
  z: number,
  bridgeStage: number,
  staircaseStage: number,
  workshopStage = 0
): number {
  // 0a. Level 2 Workshop Creek Bridge (unlocked at workshopStage >= 1)
  if (workshopStage >= 1 && isOnWorkshopCreekBridge(x, z)) {
    const t = THREE.MathUtils.clamp((x - -12.0) / 1.6, -1, 1);
    return 0.2 + Math.cos(t * (Math.PI * 0.5)) * 0.14;
  }

  // 0b. Level 2 Hollow Compiler Workshop interior stone slab & front threshold step
  if (x >= -10.1 && x <= -1.9 && z >= 22.3 && z <= 29.9) {
    return 0.24;
  }
  if (x >= -7.4 && x <= -4.6 && z > 29.9 && z <= 30.35) {
    return 0.12;
  }

  // 0c. Level 2 Workshop Creek bed (blocks west bank from workshop until bridge is compiled)
  if (isInWorkshopCreek(x, z)) {
    const bankT = THREE.MathUtils.clamp(Math.abs(x - -12.0) / 1.3, 0, 1);
    return -0.58 + bankT * bankT * 0.42;
  }

  // 1. Bridge deck over Silverstream River at x in [11.5, 16.5], z in [-4.6, 4.6]
  if (bridgeStage >= 3 && x >= 11.5 && x <= 16.5 && z >= -4.6 && z <= 4.6) {
    const t = THREE.MathUtils.clamp(z / 4.6, -1, 1);
    return 0.22 + Math.cos(t * (Math.PI * 0.5)) * 0.36;
  }

  // 2. Staircase ramp at x in [-12.6, -7.4], z in [-17.6, -8.0]
  if (isOnStaircaseRamp(x, z)) {
    const progress = THREE.MathUtils.clamp((-8.0 - z) / 9.6, 0, 1);
    const maxProgress =
      staircaseStage >= 3 ? 1 : staircaseStage === 2 ? 0.68 : staircaseStage === 1 ? 0.35 : 0.08;
    const clampedProg = Math.min(progress, maxProgress);
    return clampedProg * 3.6;
  }

  // 3. Northeast descending trail between Map Station (-12, -34) and Repair District (12, -30)
  if (isOnNortheastRamp(x, z)) {
    const t = THREE.MathUtils.clamp((x - -3.0) / 8.5, 0, 1);
    return (1 - t) * 3.6;
  }

  // 4. Northern Highland Plateau (Levels 6 & 7)
  if (isInsideHighlandBox(x, z)) {
    return 3.6;
  }

  // 5. Silverstream River bed
  const riverZ = getRiverCenterZ(x);
  const distRiver = Math.abs(z - riverZ);
  if (distRiver < RIVER_HALF_WIDTH) {
    const bankT = distRiver / RIVER_HALF_WIDTH;
    return -1.15 + bankT * bankT * 0.85;
  }

  // 6. Outer scenic mountain / hill rim outside playable bounds
  const edgeX = Math.max(0, Math.abs(x) - 43);
  const edgeZ = Math.max(0, Math.abs(z) - 43);
  const rimDist = Math.hypot(edgeX, edgeZ);
  if (rimDist > 0) {
    const hillWave = 0.5 + 0.5 * Math.sin(x * 0.14 + z * 0.11);
    return Math.min(14, rimDist * 0.62 + rimDist * 0.22 * hillWave);
  }

  // Keep all 10 site clearings, trails, spawn positions, and Sprout spots crisp and level at y = 0
  return 0;
}

/**
 * Checks whether player avatar can walk onto (x, z) given current world construction state.
 */
export function isPositionWalkable(
  x: number,
  z: number,
  bridgeStage: number,
  staircaseStage: number,
  freeRoamUnlocked = false,
  workshopStage = 0
): boolean {
  if (Math.abs(x) > PLAYABLE_LIMIT || Math.abs(z) > PLAYABLE_LIMIT) {
    return false;
  }

  // Level 2 Workshop Creek check: blocked unless crossing on Stage 1 Creek Bridge
  if (x >= -13.25 && x <= -10.75 && z >= 20.5 && z <= 34.8) {
    const onCreekBridge = x >= -13.55 && x <= -10.45 && z >= 27.05 && z <= 29.75;
    if ((workshopStage >= 1 || freeRoamUnlocked) && onCreekBridge) {
      return true;
    }
    return false;
  }

  // Level 2 Hollow Compiler Workshop perimeter solid walls (centered at [-6, 0, 26], 8.4m x 7.6m)
  const hitWorkshopWestWall = x >= -10.45 && x <= -9.55 && z >= 22.0 && z <= 30.05;
  const hitWorkshopEastWall = x >= -2.45 && x <= -1.55 && z >= 22.0 && z <= 30.05;
  const hitWorkshopNorthWall = z >= 21.95 && z <= 22.85 && x >= -10.45 && x <= -1.55;
  const hitWorkshopSouthFlanks =
    z >= 29.45 &&
    z <= 30.15 &&
    ((x >= -10.45 && x < -7.2) || (x > -4.8 && x <= -1.55));
  if (
    hitWorkshopWestWall ||
    hitWorkshopEastWall ||
    hitWorkshopNorthWall ||
    hitWorkshopSouthFlanks
  ) {
    return false;
  }

  // Level 2 Compiler Workshop front double-doors & interior: locked until Stage 2 bytecode door unlock
  if (x >= -9.6 && x <= -2.4 && z >= 22.8 && z <= 30.15) {
    if (workshopStage < 2 && !freeRoamUnlocked) {
      return false;
    }
  }

  // River check: blocked unless crossing on completed Level 4 Bridge (stage >= 3)
  const riverZ = getRiverCenterZ(x);
  if (Math.abs(z - riverZ) < RIVER_HALF_WIDTH - 0.25) {
    const onBridgeSpan = x >= 11.6 && x <= 16.4 && z >= -4.6 && z <= 4.6;
    if ((bridgeStage >= 3 || freeRoamUnlocked) && onBridgeSpan) {
      return true;
    }
    return false;
  }

  // Staircase partial progression check
  if (isOnStaircaseRamp(x, z)) {
    if (freeRoamUnlocked || staircaseStage >= 3) return true;
    const progress = (-8.0 - z) / 9.6;
    if (staircaseStage === 2) return progress <= 0.68;
    if (staircaseStage === 1) return progress <= 0.35;
    return progress <= 0.08;
  }

  // Northeast ramp requires staircase stage >= 3 (or free-roam) so Level 5 isn't bypassed early
  if (isOnNortheastRamp(x, z)) {
    return freeRoamUnlocked || staircaseStage >= 3;
  }

  // Steep Highland cliff face walls: prevent walking straight through the 3.6m rock wall
  const nearSouthCliffWall =
    x >= -44.8 &&
    x <= -2.2 &&
    z >= -18.1 &&
    z <= -16.8 &&
    !(x >= -12.5 && x <= -7.5);
  if (nearSouthCliffWall) {
    return false;
  }

  const nearEastCliffWall =
    z >= -45.5 &&
    z <= -17.2 &&
    x >= -3.2 &&
    x <= -1.9 &&
    !(z >= -35.6 && z <= -30.0);
  if (nearEastCliffWall) {
    return false;
  }

  return true;
}

interface BirdFlight {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  altitude: number;
  radius: number;
  speed: number;
  phase: number;
}

interface ButterflyFlight {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  phase: number;
}

const _dummy = new THREE.Object3D();
const _tint = new THREE.Color();

/**
 * Builds the continuous 3D Beginner's Forest outdoor terrain, Silverstream River,
 * waterfall & Crystal Grotto, stone/dirt trails, signposts, multi-part voxel trees,
 * flowers, lanterns, clouds, birds, butterflies, and sunlight motes.
 */
export function buildForestTerrainAndNature(
  renderer: THREE.WebGLRenderer,
  shadowTex: THREE.Texture,
  isSoftwareGl: boolean
): AnimatedNatureHandle {
  const group = new THREE.Group();
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    texturesToDispose.push(t);
    return t;
  };

  // Procedural Voxel Textures (SRGB + Max Anisotropy)
  const grassTex = trackTex(createVoxelCanvasTexture(renderer, '#4E8E43', '#6AB056', 'noise'));
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(32, 32);

  const highlandGrassTex = trackTex(createVoxelCanvasTexture(renderer, '#3F7D3B', '#5CA04E', 'noise'));
  highlandGrassTex.wrapS = THREE.RepeatWrapping;
  highlandGrassTex.wrapT = THREE.RepeatWrapping;
  highlandGrassTex.repeat.set(14, 10);

  const stoneCliffTex = trackTex(createVoxelCanvasTexture(renderer, '#67706B', '#4F5753', 'brick'));
  stoneCliffTex.wrapS = THREE.RepeatWrapping;
  stoneCliffTex.wrapT = THREE.RepeatWrapping;
  stoneCliffTex.repeat.set(16, 3);

  const cobblePathTex = trackTex(createVoxelCanvasTexture(renderer, '#9A9483', '#7E7868', 'brick'));
  cobblePathTex.wrapS = THREE.RepeatWrapping;
  cobblePathTex.wrapT = THREE.RepeatWrapping;
  cobblePathTex.repeat.set(4, 1);

  const woodTex = trackTex(createVoxelCanvasTexture(renderer, '#8C5C38', '#6F4628', 'plank'));
  const barkTex = trackTex(createVoxelCanvasTexture(renderer, '#5C3D24', '#472E1A', 'plank'));
  const leafTex = trackTex(createVoxelCanvasTexture(renderer, '#2F7D46', '#4CA45C', 'noise'));
  const waterTex = trackTex(createVoxelCanvasTexture(renderer, '#3898C8', '#74CEF2', 'noise'));
  waterTex.wrapS = THREE.RepeatWrapping;
  waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.repeat.set(22, 3);

  // =========================================================================
  // 1. CONTINUOUS TERRAIN HEIGHTFIELD MESH (144 x 144 outdoor valley)
  // =========================================================================
  const terrainSize = 148;
  const terrainSegs = 96;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const cGrass = new THREE.Color('#569849');
  const cHighland = new THREE.Color('#478642');
  const cSand = new THREE.Color('#C4B287');
  const cCliff = new THREE.Color('#6A726D');
  const cPeak = new THREE.Color('#838B86');
  const cWork = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    // Base static terrain without dynamic wooden bridge deck (staircase stone ramp cut-in stays subtle)
    const vy = groundHeightAt(vx, vz, 0, 0);
    posAttr.setY(i, vy);

    const riverZ = getRiverCenterZ(vx);
    const distR = Math.abs(vz - riverZ);
    const inWorkshopCreekBank = vx >= -13.7 && vx <= -10.3 && vz >= 20.1 && vz <= 35.2;
    if (distR < RIVER_HALF_WIDTH + 1.2 || inWorkshopCreekBank) {
      cWork.copy(cSand);
    } else if (vy > 6.5) {
      cWork.copy(cPeak);
    } else if (vy > 3.9) {
      cWork.copy(cCliff);
    } else if (vy >= 3.4) {
      cWork.copy(cHighland);
    } else {
      const patch = 0.5 + 0.5 * Math.sin(vx * 0.18) * Math.cos(vz * 0.18);
      cWork.copy(cGrass).offsetHSL(0, 0, (patch - 0.5) * 0.06);
    }
    colors[i * 3] = cWork.r;
    colors[i * 3 + 1] = cWork.g;
    colors[i * 3 + 2] = cWork.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Crisp Voxel Cliff Retaining Escarpment for the Northern Highland Plateau
  const cliffMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: stoneCliffTex,
      roughness: 0.86,
      metalness: 0.08,
    })
  );
  const highlandTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: highlandGrassTex,
      roughness: 0.84,
      metalness: 0.04,
    })
  );

  // West & East sections of South Highland Cliff Wall (leaving gap x in [-12.6, -7.4] for Staircase)
  const westCliffBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(31.8, 3.6, 1.4)), cliffMat);
  westCliffBlock.position.set(-28.5, 1.8, -17.5);
  westCliffBlock.castShadow = true;
  westCliffBlock.receiveShadow = true;
  group.add(westCliffBlock);

  const eastCliffBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.0, 3.6, 1.4)), cliffMat);
  eastCliffBlock.position.set(-5.0, 1.8, -17.5);
  eastCliffBlock.castShadow = true;
  eastCliffBlock.receiveShadow = true;
  group.add(eastCliffBlock);

  // East Highland Cliff Wall (z in [-45, -17.5] with gap at z in [-35.8, -29.8] for NE trail ramp)
  const neSouthWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 3.6, 12.4)), cliffMat);
  neSouthWall.position.set(-2.5, 1.8, -23.7);
  neSouthWall.castShadow = true;
  neSouthWall.receiveShadow = true;
  group.add(neSouthWall);

  const neNorthWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 3.6, 9.6)), cliffMat);
  neNorthWall.position.set(-2.5, 1.8, -40.6);
  neNorthWall.castShadow = true;
  neNorthWall.receiveShadow = true;
  group.add(neNorthWall);

  // Northeast Stone Trail Ramp connecting Level 7 Map Station down to Level 8 Repair District
  const neRampLen = Math.hypot(8.5, 3.6);
  const neRampMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(neRampLen, 0.5, 4.4)),
    trackMat(new THREE.MeshStandardMaterial({ map: cobblePathTex, roughness: 0.82, metalness: 0.06 }))
  );
  neRampMesh.position.set(1.25, 1.65, -32.8);
  neRampMesh.rotation.z = -Math.atan2(3.6, 8.5);
  neRampMesh.receiveShadow = true;
  neRampMesh.castShadow = true;
  group.add(neRampMesh);

  // Smooth highland grass cap plate so y = 3.6 looks razor crisp
  const plateauCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(41.8, 0.16, 27.8)), highlandTopMat);
  plateauCap.position.set(-23.5, 3.53, -31.5);
  plateauCap.receiveShadow = true;
  group.add(plateauCap);

  // =========================================================================
  // 2. SILVERSTREAM RIVER, NORTHWEST WATERFALL & CRYSTAL GROTTO CAVE
  // =========================================================================
  const riverSegsX = 72;
  const riverGeo = trackGeo(new THREE.PlaneGeometry(116, RIVER_HALF_WIDTH * 2.05, riverSegsX, 4));
  riverGeo.rotateX(-Math.PI / 2);
  const rPos = riverGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const rz = rPos.getZ(i);
    rPos.setZ(i, rz + getRiverCenterZ(rx));
  }
  riverGeo.computeVertexNormals();

  const riverMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: waterTex,
      color: '#43A8D8',
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.86,
    })
  );
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.y = -0.34;
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  // Millstream Tributary flowing past Level 8 Repair District (x = 7.2, z from -38 to -3)
  const millStreamMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.6, 35, 2, 16)),
    riverMat
  );
  millStreamMesh.rotation.x = -Math.PI / 2;
  millStreamMesh.position.set(7.2, -0.06, -20.5);
  group.add(millStreamMesh);

  // Level 2 Workshop Creek flowing between West Spawn Bank and Compiler Workshop (x = -12.0, z in [20.5, 34.8])
  const workshopCreekMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.55, 14.5, 2, 12)),
    riverMat
  );
  workshopCreekMesh.rotation.x = -Math.PI / 2;
  workshopCreekMesh.position.set(-12.0, -0.18, 27.65);
  workshopCreekMesh.receiveShadow = true;
  group.add(workshopCreekMesh);

  // Mossy stone creek embankments & spring headwalls framing Workshop Creek (leaving gap at z in [26.8, 30.0] for Bridge)
  const creekBankGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.34, 1.35));
  for (let bz = 21.2; bz <= 34.2; bz += 1.6) {
    if (bz >= 26.6 && bz <= 30.2) continue;
    const westStone = new THREE.Mesh(creekBankGeo, cliffMat);
    westStone.position.set(-13.38, 0.08, bz);
    westStone.rotation.y = Math.sin(bz) * 0.14;
    const eastStone = new THREE.Mesh(creekBankGeo, cliffMat);
    eastStone.position.set(-10.62, 0.08, bz);
    eastStone.rotation.y = -Math.sin(bz) * 0.14;
    group.add(westStone, eastStone);
  }
  const creekNorthSpring = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.68, 0.9)), cliffMat);
  creekNorthSpring.position.set(-12.0, 0.16, 20.3);
  const creekSouthCulvert = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.68, 0.9)), cliffMat);
  creekSouthCulvert.position.set(-12.0, 0.16, 35.0);
  group.add(creekNorthSpring, creekSouthCulvert);

  // Northwest Cascading Voxel Waterfall at (-43, 0..9.5, getRiverCenterZ(-43))
  const wfZ = getRiverCenterZ(-43);
  const waterfallGroup = new THREE.Group();
  waterfallGroup.position.set(-43.5, 0, wfZ);

  const wfCliff = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.5, 11, 11)), cliffMat);
  wfCliff.position.set(-2.5, 5.2, 0);
  wfCliff.castShadow = true;
  wfCliff.receiveShadow = true;
  waterfallGroup.add(wfCliff);

  const wfCurtainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterTex,
      color: '#8BE0FF',
      emissive: '#1D6B8C',
      emissiveIntensity: 0.35,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
    })
  );
  const wfCurtain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 9.8, 5.2)), wfCurtainMat);
  wfCurtain.position.set(0.9, 4.6, 0);
  waterfallGroup.add(wfCurtain);

  const foamCubes: THREE.Mesh[] = [];
  const foamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E6F9FF',
      emissive: '#7BD5F5',
      emissiveIntensity: 0.4,
      roughness: 0.3,
    })
  );
  const foamGeo = trackGeo(new THREE.BoxGeometry(0.55, 0.55, 0.55));
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(foamGeo, foamMat);
    f.position.set(1.3 + (i % 3) * 0.45, 0.1, -2.1 + i * 0.46);
    waterfallGroup.add(f);
    foamCubes.push(f);
  }
  group.add(waterfallGroup);

  // Hidden Crystal Grotto Cave (Part 2 small caves & hidden glowing crystals) at (-36, 0, 12)
  const grottoGroup = new THREE.Group();
  grottoGroup.position.set(-36.5, 0, 12.5);
  const caveArchLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 4.2, 4.6)), cliffMat);
  caveArchLeft.position.set(-2.4, 2.1, 0);
  const caveArchRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 4.2, 4.6)), cliffMat);
  caveArchRight.position.set(2.4, 2.1, 0);
  const caveRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.4, 1.8, 5.0)), cliffMat);
  caveRoof.position.set(0, 4.5, 0);
  const caveBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.8, 4.4, 1.6)), cliffMat);
  caveBack.position.set(0, 2.2, -2.2);
  grottoGroup.add(caveArchLeft, caveArchRight, caveRoof, caveBack);

  const crystalColors = ['#4DE8A2', '#64D2FF', '#C084FC', '#F5C451'];
  const grottoCrystals: THREE.Mesh[] = [];
  for (let c = 0; c < 6; c++) {
    const cMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: crystalColors[c % crystalColors.length],
        emissive: crystalColors[c % crystalColors.length],
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.2,
        clearcoat: 1,
      })
    );
    const shard = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.45 + (c % 2) * 0.18, 0)), cMat);
    shard.scale.set(0.75, 1.9, 0.75);
    shard.position.set(-1.5 + c * 0.62, 0.65, -0.8 + (c % 2) * 0.6);
    shard.rotation.z = (c - 2.5) * 0.16;
    grottoGroup.add(shard);
    grottoCrystals.push(shard);
  }
  const grottoLight = new THREE.PointLight('#52F2B8', 2.4, 11, 2);
  grottoLight.position.set(0, 1.8, 0.2);
  grottoGroup.add(grottoLight);
  group.add(grottoGroup);

  // =========================================================================
  // 3. COBBLESTONE & TIMBER PATHWAYS CONNECTING ALL 10 CONSTRUCTION SITES
  // =========================================================================
  const pathMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: cobblePathTex,
      roughness: 0.86,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const addPathSegment = (x1: number, z1: number, x2: number, z2: number, yLevel: number, width = 2.6) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const seg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, 0.08, len)), pathMat);
    seg.position.set((x1 + x2) * 0.5, yLevel + 0.03, (z1 + z2) * 0.5);
    seg.rotation.y = Math.atan2(dx, dz);
    seg.receiveShadow = true;
    group.add(seg);
  };

  // Connected road network across the Beginner's Forest (split cleanly across Workshop Creek at x = -12)
  addPathSegment(-26, 31.8, -13.7, 28.4, 0, 2.6); // Lv 1 Beacon -> West Bank of Workshop Creek
  addPathSegment(-10.3, 28.4, -6.0, 30.5, 0, 2.6); // East Bank of Workshop Creek -> Lv 2 Workshop Entrance
  addPathSegment(-6.0, 30.5, 14, 21, 0, 2.8); // Lv 2 Workshop -> Lv 3 Gatehouse
  addPathSegment(14, 20, 14, 5.2, 0, 3.0); // Lv 3 Gatehouse -> Lv 4 South Bridge
  addPathSegment(14, -5.2, -10, -7.8, 0, 2.8); // North Bridge -> Lv 5 Staircase Base
  addPathSegment(-10, -18.2, -26.5, -20.5, 3.6, 2.5); // Staircase Summit -> Lv 6 Lantern Grove
  addPathSegment(-25, -22, -12, -29.5, 3.6, 2.5); // Lv 6 Lantern Grove -> Lv 7 Map Station
  addPathSegment(-10, -18.5, -12, -29.5, 3.6, 2.4); // Direct Staircase Summit -> Lv 7 Map Station
  addPathSegment(-12, -32.8, -3.2, -32.8, 3.6, 2.5); // Lv 7 Map Station -> NE Ramp Top
  addPathSegment(5.5, -32.8, 12, -25.8, 0, 2.6); // NE Ramp Foot -> Lv 8 Repair District
  addPathSegment(12, -25.8, 28, -19.8, 0, 2.8); // Lv 8 Repair District -> Lv 9 Registration Centre
  addPathSegment(28, -19.8, 25, -9, 0, 3.0); // Lv 9 Registration -> Lv 10 Grand Settlement
  addPathSegment(14, -5.2, 24, -9, 0, 3.0); // North Bridge -> Lv 10 Grand Settlement

  // =========================================================================
  // 4. WOODEN SIGNPOSTS & GLOWING PATH LANTERNS (3–7 Part Composite Props)
  // =========================================================================
  const signPostMat = trackMat(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78, metalness: 0.05 }));
  const signPlaqueMat = trackMat(new THREE.MeshStandardMaterial({ color: '#C6935B', roughness: 0.62, metalness: 0.08 }));
  const ironMat = trackMat(new THREE.MeshStandardMaterial({ color: '#2E3834', roughness: 0.38, metalness: 0.72 }));
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFE082',
      emissive: '#FFAE34',
      emissiveIntensity: 1.35,
      roughness: 0.2,
    })
  );

  const signpostSpots: { x: number; y: number; z: number; rotY: number }[] = [
    { x: -20.5, y: 0, z: 32.5, rotY: 0.35 },
    { x: 3.5, y: 0, z: 26.2, rotY: -0.4 },
    { x: 11.2, y: 0, z: 8.5, rotY: 0.1 },
    { x: 11.2, y: 0, z: -6.2, rotY: -0.8 },
    { x: -13.2, y: 3.6, z: -19.2, rotY: 0.6 },
    { x: 19.5, y: 0, z: -15.5, rotY: 0.45 },
  ];
  for (const sp of signpostSpots) {
    const sg = new THREE.Group();
    sg.position.set(sp.x, sp.y, sp.z);
    sg.rotation.y = sp.rotY;

    const baseStone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.22, 0.55)), cliffMat);
    baseStone.position.y = 0.11;
    const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 1.9, 0.2)), signPostMat);
    post.position.y = 1.05;
    post.castShadow = true;
    const board1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.28, 0.1)), signPlaqueMat);
    board1.position.set(0.28, 1.68, 0.12);
    board1.castShadow = true;
    const board2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.24, 0.1)), signPlaqueMat);
    board2.position.set(-0.22, 1.32, -0.12);
    board2.rotation.y = 0.45;
    board2.castShadow = true;
    const cap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.18, 0.22, 4)), ironMat);
    cap.position.y = 2.08;
    cap.rotation.y = Math.PI / 4;

    sg.add(baseStone, post, board1, board2, cap);
    group.add(sg);
  }

  // Warm Lantern Posts lining key intersections
  const lanternCoords: [number, number, number][] = [
    [-23, 0, 33.5],
    [-9.2, 0, 31.8],
    [11, 0, 18.2],
    [16.8, 0, 5.4],
    [16.8, 0, -5.4],
    [-7.2, 0, -7.8],
    [-22.5, 3.6, -19.2],
    [-14.5, 3.6, -28.2],
    [9.2, 0, -24.5],
    [25.5, 0, -18.5],
    [21.5, 0, -6.5],
    [21.5, 0, -11.5],
  ];
  for (let i = 0; i < lanternCoords.length; i++) {
    const [lx, ly, lz] = lanternCoords[i];
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.28, 0.46)), cliffMat);
    plinth.position.y = 0.14;
    const pole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 2.3, 0.16)), signPostMat);
    pole.position.y = 1.4;
    pole.castShadow = true;
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.12, 0.12)), signPostMat);
    arm.position.set(0.24, 2.48, 0);
    const cage = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.42, 0.34)), ironMat);
    cage.position.set(0.48, 2.18, 0);
    const core = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.22)), lanternGlowMat);
    core.position.set(0.48, 2.18, 0);

    lg.add(plinth, pole, arm, cage, core);
    if (!isSoftwareGl && i % 3 === 0) {
      const pt = new THREE.PointLight('#FFB74D', 1.2, 9.5, 2);
      pt.position.set(0.48, 2.1, 0);
      lg.add(pt);
    }
    group.add(lg);
  }

  // Scenic Abandoned Ruin Stones & Small Forest Cottages on Outskirts (Part 2 Visual Design)
  const cottageSpots: { x: number; y: number; z: number; rotY: number }[] = [
    { x: -37.5, y: 0, z: 25.5, rotY: 0.42 },
    { x: 2.5, y: 0, z: 16.5, rotY: -0.35 },
    { x: 38.5, y: 0, z: -15.5, rotY: -1.1 },
  ];
  const thatchMat = trackMat(new THREE.MeshStandardMaterial({ color: '#9E6B3B', roughness: 0.85, metalness: 0.04 }));
  const plasterMat = trackMat(new THREE.MeshStandardMaterial({ color: '#DFD7C5', roughness: 0.8, metalness: 0.04 }));
  for (const ct of cottageSpots) {
    const cg = new THREE.Group();
    cg.position.set(ct.x, ct.y, ct.z);
    cg.rotation.y = ct.rotY;

    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.5, 3.8)), cliffMat);
    base.position.y = 0.25;
    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.0, 2.4, 3.4)), plasterMat);
    body.position.y = 1.7;
    body.castShadow = true;
    body.receiveShadow = true;
    const beamL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 2.5, 3.55)), signPostMat);
    beamL.position.set(-1.95, 1.7, 0);
    const beamR = beamL.clone();
    beamR.position.x = 1.95;
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(3.35, 1.9, 4)), thatchMat);
    roof.position.y = 3.85;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 1.55, 0.14)), signPostMat);
    door.position.set(0, 1.25, 1.72);
    const win = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.7, 0.14)), lanternGlowMat);
    win.position.set(1.15, 1.85, 1.72);

    cg.add(base, body, beamL, beamR, roof, door, win);
    group.add(cg);
  }

  // =========================================================================
  // 5. INSTANCED MULTI-PART VOXEL TREES, ROCKS, GRASS TUFTS & FLOWERS
  // =========================================================================
  // Exclusion check so trees never spawn on top of roads, river, Workshop Creek, or any of the 40 task stations
  const isClearForTree = (tx: number, tz: number): boolean => {
    if (Math.abs(tz - getRiverCenterZ(tx)) < RIVER_HALF_WIDTH + 2.2) return false;
    if (tx >= 5.2 && tx <= 9.2 && tz >= -38 && tz <= -3) return false; // Millstream
    if (tx >= -15.2 && tx <= -8.8 && tz >= 19.5 && tz <= 36.2) return false; // Workshop Creek & banks
    if (tx >= -11.6 && tx <= -0.4 && tz >= 20.8 && tz <= 32.2) return false; // Hollow Compiler Workshop footprint
    if (isOnStaircaseRamp(tx, tz) || isOnNortheastRamp(tx, tz)) return false;
    if (Math.hypot(tx - -36.5, tz - 12.5) < 6.5) return false; // Crystal Grotto
    for (const ct of cottageSpots) {
      if (Math.hypot(tx - ct.x, tz - ct.z) < 5.5) return false;
    }
    for (const lvl of WORLD1_LEVELS) {
      if (Math.hypot(tx - lvl.sitePosition[0], tz - lvl.sitePosition[2]) < 7.8) return false;
      if (Math.hypot(tx - lvl.spawnPosition[0], tz - lvl.spawnPosition[2]) < 3.8) return false;
      if (Math.hypot(tx - lvl.sproutPosition[0], tz - lvl.sproutPosition[2]) < 3.4) return false;
      if (Math.hypot(tx - lvl.terminalPosition[0], tz - lvl.terminalPosition[2]) < 3.4) return false;
      for (const task of lvl.tasks) {
        if (Math.hypot(tx - task.stationPosition[0], tz - task.stationPosition[2]) < 3.0) {
          return false;
        }
        if (Math.hypot(tx - task.sproutWaypoint[0], tz - task.sproutWaypoint[2]) < 2.6) {
          return false;
        }
      }
    }
    // Keep main road corridors clear
    if (tz > 24 && tz < 35 && tx > -28 && tx < 16 && Math.abs(tz - 30) < 3.2) return false;
    if (Math.abs(tx - 14) < 3.8 && tz > -9 && tz < 22) return false;
    if (tx > 14 && tx < 32 && tz > -26 && tz < -6) return false;
    return true;
  };

  const treeCoords: { x: number; y: number; z: number; scale: number; tintShift: number }[] = [];
  for (let i = 0; i < 290; i++) {
    const angle = i * 2.399963;
    const rad = i < 110 ? 44 + (i % 14) * 1.45 : 10 + ((i * 7.3) % 34);
    const tx = Math.cos(angle) * rad;
    const tz = Math.sin(angle) * rad;
    if (Math.abs(tx) > 64 || Math.abs(tz) > 64) continue;
    if (!isClearForTree(tx, tz)) continue;
    const ty = groundHeightAt(tx, tz, 0, 0);
    const scale = 0.86 + ((i * 13) % 30) * 0.011; // ±15% natural silhouette variation
    const tintShift = (((i * 19) % 20) - 10) * 0.008;
    treeCoords.push({ x: tx, y: ty, z: tz, scale, tintShift });
  }

  const countTrees = treeCoords.length;
  const trunkGeo = trackGeo(new THREE.BoxGeometry(0.68, 2.6, 0.68));
  const rootFlareGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.42, 1.06));
  const canopyLowGeo = trackGeo(new THREE.BoxGeometry(2.7, 1.25, 2.7));
  const canopyMidGeo = trackGeo(new THREE.BoxGeometry(2.05, 1.15, 2.05));
  const canopyTopGeo = trackGeo(new THREE.BoxGeometry(1.25, 0.95, 1.25));

  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.88, metalness: 0.03 }));
  const canopyMat = trackMat(new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.62, metalness: 0.05 }));

  const instRoots = new THREE.InstancedMesh(rootFlareGeo, trunkMat, countTrees);
  const instTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, countTrees);
  const instCanopy1 = new THREE.InstancedMesh(canopyLowGeo, canopyMat, countTrees);
  const instCanopy2 = new THREE.InstancedMesh(canopyMidGeo, canopyMat, countTrees);
  const instCanopy3 = new THREE.InstancedMesh(canopyTopGeo, canopyMat, countTrees);

  instTrunks.castShadow = true;
  instCanopy1.castShadow = true;
  instCanopy2.castShadow = true;
  instCanopy1.receiveShadow = true;

  treeCoords.forEach((t, idx) => {
    const s = t.scale;
    _dummy.rotation.set(0, (idx * 1.17) % (Math.PI * 2), 0);

    _dummy.position.set(t.x, t.y + 0.2 * s, t.z);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    instRoots.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(t.x, t.y + 1.3 * s, t.z);
    _dummy.updateMatrix();
    instTrunks.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(t.x, t.y + 2.85 * s, t.z);
    _dummy.updateMatrix();
    instCanopy1.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(t.x, t.y + 3.85 * s, t.z);
    _dummy.updateMatrix();
    instCanopy2.setMatrixAt(idx, _dummy.matrix);

    _dummy.position.set(t.x, t.y + 4.7 * s, t.z);
    _dummy.updateMatrix();
    instCanopy3.setMatrixAt(idx, _dummy.matrix);

    _tint.set('#3A8E4E').offsetHSL(t.tintShift, 0.04, t.tintShift * 0.8);
    instCanopy1.setColorAt(idx, _tint);
    _tint.set('#49A25B').offsetHSL(t.tintShift, 0.05, 0.03);
    instCanopy2.setColorAt(idx, _tint);
    _tint.set('#5FB96C').offsetHSL(t.tintShift, 0.05, 0.06);
    instCanopy3.setColorAt(idx, _tint);
  });

  [instRoots, instTrunks, instCanopy1, instCanopy2, instCanopy3].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // Instanced Flowers & Grass Tufts across clearings
  const flowerCount = 160;
  const stemGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.34, 0.14));
  const blossomGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.18, 0.28));
  const stemMat = trackMat(new THREE.MeshStandardMaterial({ color: '#3E8E45', roughness: 0.8 }));
  const blossomMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }));
  const instStems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
  const instBlossoms = new THREE.InstancedMesh(blossomGeo, blossomMat, flowerCount);
  const flowerPalette = ['#F5C451', '#FF8BA7', '#7CC6FE', '#FDFCDC', '#C084FC'];

  let fPlaced = 0;
  for (let i = 0; i < 420 && fPlaced < flowerCount; i++) {
    const fx = Math.sin(i * 12.73) * 40;
    const fz = Math.cos(i * 7.91) * 40;
    if (Math.abs(fz - getRiverCenterZ(fx)) < RIVER_HALF_WIDTH + 1.2) continue;
    if (fx >= -14.2 && fx <= -1.2 && fz >= 20.2 && fz <= 35.2) continue;
    const fy = groundHeightAt(fx, fz, 0, 0);
    if (fy < -0.05 || (fy > 0.1 && fy < 3.5)) continue;
    const sc = 0.85 + (i % 5) * 0.08;
    _dummy.position.set(fx, fy + 0.17 * sc, fz);
    _dummy.rotation.set(0, i * 0.7, 0);
    _dummy.scale.set(sc, sc, sc);
    _dummy.updateMatrix();
    instStems.setMatrixAt(fPlaced, _dummy.matrix);

    _dummy.position.set(fx, fy + 0.36 * sc, fz);
    _dummy.updateMatrix();
    instBlossoms.setMatrixAt(fPlaced, _dummy.matrix);
    _tint.set(flowerPalette[fPlaced % flowerPalette.length]);
    instBlossoms.setColorAt(fPlaced, _tint);
    fPlaced++;
  }
  instStems.count = fPlaced;
  instBlossoms.count = fPlaced;
  instStems.instanceMatrix.needsUpdate = true;
  instBlossoms.instanceMatrix.needsUpdate = true;
  if (instBlossoms.instanceColor) instBlossoms.instanceColor.needsUpdate = true;
  instStems.computeBoundingSphere();
  instBlossoms.computeBoundingSphere();
  group.add(instStems, instBlossoms);

  // Instanced Mossy Forest Boulders
  const rockCount = 65;
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.65, 0));
  const rockMat = trackMat(new THREE.MeshStandardMaterial({ color: '#747D77', roughness: 0.9, metalness: 0.06 }));
  const instRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  let rPlaced = 0;
  for (let i = 0; i < 200 && rPlaced < rockCount; i++) {
    const rx = Math.cos(i * 4.19) * (16 + (i % 28));
    const rz = Math.sin(i * 5.63) * (16 + ((i * 3) % 28));
    if (!isClearForTree(rx, rz)) continue;
    const ry = groundHeightAt(rx, rz, 0, 0);
    const sx = 0.7 + (i % 4) * 0.25;
    const sy = 0.55 + (i % 3) * 0.2;
    _dummy.position.set(rx, ry + 0.22 * sy, rz);
    _dummy.rotation.set(i * 0.3, i * 0.9, 0);
    _dummy.scale.set(sx, sy, sx * 0.9);
    _dummy.updateMatrix();
    instRocks.setMatrixAt(rPlaced, _dummy.matrix);
    _tint.set(i % 2 === 0 ? '#6E7871' : '#5E7261');
    instRocks.setColorAt(rPlaced, _tint);
    rPlaced++;
  }
  instRocks.count = rPlaced;
  instRocks.instanceMatrix.needsUpdate = true;
  if (instRocks.instanceColor) instRocks.instanceColor.needsUpdate = true;
  instRocks.computeBoundingSphere();
  group.add(instRocks);

  // =========================================================================
  // 6. DRIFTING VOXEL CLOUDS, ANIMATED BIRDS, BUTTERFLIES & POLLEN PARTICLES
  // =========================================================================
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
    })
  );
  const clouds: { group: THREE.Group; speed: number }[] = [];
  for (let c = 0; c < 12; c++) {
    const cg = new THREE.Group();
    const p1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.5, 1.4, 3.8)), cloudMat);
    const p2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 1.8, 3.0)), cloudMat);
    p2.position.set(-1.4, 0.5, 0.3);
    const p3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 1.2, 2.8)), cloudMat);
    p3.position.set(2.1, 0.2, -0.4);
    cg.add(p1, p2, p3);
    cg.position.set(-55 + c * 10, 24 + (c % 4) * 2.5, -48 + ((c * 17) % 92));
    group.add(cg);
    clouds.push({ group: cg, speed: 0.55 + (c % 3) * 0.22 });
  }

  // Animated 4-part Voxel Birds soaring above the forest canopy
  const birds: BirdFlight[] = [];
  const birdBodyGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.44));
  const birdHeadGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.16, 0.18));
  const birdWingGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.05, 0.24));
  const birdColors = ['#69B9E7', '#F5C451', '#F28C45'];

  for (let b = 0; b < 7; b++) {
    const bMat = trackMat(
      new THREE.MeshStandardMaterial({ color: birdColors[b % birdColors.length], roughness: 0.55 })
    );
    const bRoot = new THREE.Group();
    const body = new THREE.Mesh(birdBodyGeo, bMat);
    const head = new THREE.Mesh(birdHeadGeo, bMat);
    head.position.set(0, 0.08, 0.24);
    const lWing = new THREE.Mesh(birdWingGeo, bMat);
    lWing.position.set(-0.26, 0.05, 0);
    const rWing = new THREE.Mesh(birdWingGeo, bMat);
    rWing.position.set(0.26, 0.05, 0);
    bRoot.add(body, head, lWing, rWing);
    group.add(bRoot);
    birds.push({
      root: bRoot,
      leftWing: lWing,
      rightWing: rWing,
      centerX: -12 + (b % 3) * 16,
      centerZ: -10 + ((b * 13) % 30),
      altitude: 11.5 + (b % 4) * 1.8,
      radius: 9 + (b % 3) * 4.5,
      speed: 0.42 + (b % 3) * 0.12,
      phase: b * 0.95,
    });
  }

  // Fluttering Butterflies near sunlit clearings
  const butterflies: ButterflyFlight[] = [];
  const bfWingGeo = trackGeo(new THREE.PlaneGeometry(0.18, 0.22));
  const bfAnchors: [number, number, number][] = [
    [-24, 1.1, 30],
    [-8, 1.1, 28],
    [12, 1.1, 17],
    [16, 1.1, 6],
    [-25, 4.7, -21],
    [-14, 4.7, -30],
    [14, 1.1, -26],
    [26, 1.1, -12],
  ];
  bfAnchors.forEach(([bx, by, bz], idx) => {
    const bfMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? '#FFE066' : '#74D4FF',
        side: THREE.DoubleSide,
      })
    );
    const root = new THREE.Group();
    const lw = new THREE.Mesh(bfWingGeo, bfMat);
    lw.position.x = -0.08;
    const rw = new THREE.Mesh(bfWingGeo, bfMat);
    rw.position.x = 0.08;
    root.add(lw, rw);
    root.position.set(bx, by, bz);
    group.add(root);
    butterflies.push({ root, leftWing: lw, rightWing: rw, anchorX: bx, anchorY: by, anchorZ: bz, phase: idx * 1.1 });
  });

  // Sunlight Pollen Motes (Points)
  const moteCount = 95;
  const motePositions = new Float32Array(moteCount * 3);
  for (let m = 0; m < moteCount; m++) {
    motePositions[m * 3] = (Math.sin(m * 9.1) * 0.5 + 0.5) * 80 - 40;
    motePositions[m * 3 + 1] = 1.2 + (m % 8) * 0.9;
    motePositions[m * 3 + 2] = (Math.cos(m * 6.7) * 0.5 + 0.5) * 80 - 40;
  }
  const moteGeo = trackGeo(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = trackMat(
    new THREE.PointsMaterial({
      color: '#FFF3B0',
      size: 0.16,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    })
  );
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  // Subtle shadow grounding under grotto & cottages
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
    })
  );
  cottageSpots.forEach((ct) => {
    const sh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.8, 5.2)), shadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(ct.x, ct.y + 0.02, ct.z);
    group.add(sh);
  });

  const update = (dt: number, elapsed: number) => {
    // Scroll river & waterfall texture UVs
    waterTex.offset.x = -(elapsed * 0.18) % 1;
    waterTex.offset.y = (elapsed * 0.05) % 1;

    // Waterfall splash foam bobbing
    for (let i = 0; i < foamCubes.length; i++) {
      const s = 0.75 + 0.35 * Math.sin(elapsed * 5.2 + i * 0.9);
      foamCubes[i].scale.setScalar(s);
      foamCubes[i].position.y = 0.08 + Math.abs(Math.sin(elapsed * 4.1 + i)) * 0.24;
    }

    // Crystal Grotto gentle pulse
    for (let i = 0; i < grottoCrystals.length; i++) {
      grottoCrystals[i].rotation.y = elapsed * 0.4 + i;
    }

    // Drifting clouds
    for (const c of clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > 68) c.group.position.x = -68;
    }

    // Circling voxel birds
    for (const b of birds) {
      const ang = elapsed * b.speed + b.phase;
      const nx = b.centerX + Math.cos(ang) * b.radius;
      const nz = b.centerZ + Math.sin(ang) * b.radius;
      b.root.position.set(nx, b.altitude + Math.sin(elapsed * 2 + b.phase) * 0.45, nz);
      b.root.rotation.y = -ang + Math.PI;
      const flap = Math.sin(elapsed * 11 + b.phase) * 0.55;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }

    // Fluttering butterflies
    for (const bf of butterflies) {
      const t = elapsed * 2.1 + bf.phase;
      bf.root.position.set(
        bf.anchorX + Math.sin(t) * 1.15,
        bf.anchorY + Math.sin(t * 2.3) * 0.28,
        bf.anchorZ + Math.cos(t * 0.85) * 1.15
      );
      bf.root.rotation.y = t + Math.PI * 0.5;
      const wingFlap = Math.sin(elapsed * 18 + bf.phase) * 0.75;
      bf.leftWing.rotation.y = wingFlap;
      bf.rightWing.rotation.y = -wingFlap;
    }

    // Gentle floating pollen motes
    motes.position.y = Math.sin(elapsed * 0.7) * 0.22;
  };

  const dispose = () => {
    geometriesToDispose.forEach((g) => g.dispose());
    materialsToDispose.forEach((m) => m.dispose());
    texturesToDispose.forEach((t) => t.dispose());
  };

  return { group, update, dispose };
}
