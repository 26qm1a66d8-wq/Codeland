import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function createVoxelCanvasTexture(
  renderer: THREE.WebGLRenderer,
  baseHex: string,
  variationHex: string,
  pattern: 'noise' | 'brick' | 'plank' | 'circuit' = 'noise'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 64);

  const cell = 8;
  for (let y = 0; y < 64; y += cell) {
    for (let x = 0; x < 64; x += cell) {
      const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const frac = hash - Math.floor(hash);
      if (frac > 0.58) {
        ctx.fillStyle = variationHex;
        ctx.globalAlpha = 0.28 + (frac - 0.58) * 0.5;
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  ctx.globalAlpha = 1;

  if (pattern === 'brick') {
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = row * 16;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y);
      ctx.stroke();
      const offset = row % 2 === 0 ? 0 : 16;
      for (let col = offset; col < 64; col += 32) {
        ctx.beginPath();
        ctx.moveTo(col, y);
        ctx.lineTo(col, y + 16);
        ctx.stroke();
      }
    }
  } else if (pattern === 'plank') {
    ctx.strokeStyle = 'rgba(25,15,5,0.26)';
    ctx.lineWidth = 2;
    for (let row = 1; row < 4; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * 16);
      ctx.lineTo(64, row * 16);
      ctx.stroke();
    }
  } else if (pattern === 'circuit') {
    ctx.strokeStyle = variationHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 52, 52);
    ctx.beginPath();
    ctx.moveTo(16, 32);
    ctx.lineTo(48, 32);
    ctx.moveTo(32, 16);
    ctx.lineTo(32, 48);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(10, 16, 12, 0.52)');
  grad.addColorStop(0.65, 'rgba(10, 16, 12, 0.2)');
  grad.addColorStop(1, 'rgba(10, 16, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addContactShadow(group: THREE.Group, radius: number, shadowTex: THREE.Texture) {
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.025;
  group.add(plane);
}

/**
 * 7-part procedural blocky character (head, visor, torso, 2 arms, 2 legs)
 * Used immediately on spawn and replaced seamlessly when the Kenney GLB loads.
 */
export function buildProceduralBlockyCharacter(
  accentHex: string,
  shadowTex: THREE.Texture
): { root: THREE.Group; bodyRig: THREE.Group } {
  const root = new THREE.Group();
  addContactShadow(root, 0.72, shadowTex);

  const bodyRig = new THREE.Group();
  root.add(bodyRig);

  const skinMat = new THREE.MeshStandardMaterial({ color: '#F3C69F', roughness: 0.75, metalness: 0.05 });
  const tunicMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.48, metalness: 0.18 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#24332C', roughness: 0.82, metalness: 0.08 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#18221D',
    roughness: 0.2,
    metalness: 0.65,
  });

  const legGeo = new THREE.BoxGeometry(0.24, 0.46, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.23, 0);
  leftLeg.castShadow = true;
  leftLeg.name = 'leftLeg';

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14, 0.23, 0);
  rightLeg.castShadow = true;
  rightLeg.name = 'rightLeg';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.3), tunicMat);
  torso.position.set(0, 0.74, 0);
  torso.castShadow = true;

  const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.22);
  const leftArm = new THREE.Mesh(armGeo, tunicMat);
  leftArm.position.set(-0.38, 0.74, 0);
  leftArm.castShadow = true;
  leftArm.name = 'leftArm';

  const rightArm = new THREE.Mesh(armGeo, tunicMat);
  rightArm.position.set(0.38, 0.74, 0);
  rightArm.castShadow = true;
  rightArm.name = 'rightArm';

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
  head.position.set(0, 1.28, 0);
  head.castShadow = true;

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.06), visorMat);
  visor.position.set(0, 1.3, 0.24);

  bodyRig.add(leftLeg, rightLeg, torso, leftArm, rightArm, head, visor);
  return { root, bodyRig };
}

const gltfLoaderSingleton = new GLTFLoader();

export function attachKenneyCharacterModel(
  bodyRig: THREE.Group,
  glbUrl: string,
  onAssetWarning?: (msg: string) => void
) {
  gltfLoaderSingleton.load(
    glbUrl,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const targetHeight = 1.65;
      const scale = size.y > 0.01 ? targetHeight / size.y : 1;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      // Clear procedural fallback children inside bodyRig and mount Kenney model
      while (bodyRig.children.length > 0) {
        bodyRig.remove(bodyRig.children[0]);
      }
      bodyRig.add(model);
    },
    undefined,
    () => {
      onAssetWarning?.('Using procedural blocky character fallback.');
    }
  );
}

/**
 * 6-part composite voxel tree (root collar, trunk, 3 stepped canopies, accent crystals/fruits)
 */
export function createCompositeVoxelTree(
  style: 'forest' | 'pine' | 'crystal',
  shadowTex: THREE.Texture,
  barkTex: THREE.Texture,
  leafTex: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();
  addContactShadow(group, 1.35, shadowTex);

  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    roughness: 0.88,
    metalness: 0.04,
  });

  const leafColor =
    style === 'forest' ? '#2F7D46' : style === 'pine' ? '#265C42' : '#4EA8DE';
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    color: leafColor,
    roughness: style === 'crystal' ? 0.25 : 0.62,
    metalness: style === 'crystal' ? 0.45 : 0.06,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: style === 'crystal' ? '#69B9E7' : '#F5C451',
    emissive: style === 'crystal' ? '#2B6CB0' : '#000000',
    emissiveIntensity: style === 'crystal' ? 0.5 : 0,
    roughness: 0.3,
    metalness: 0.35,
  });

  const rootCollar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), barkMat);
  rootCollar.position.y = 0.15;
  rootCollar.castShadow = true;
  rootCollar.receiveShadow = true;

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.9, 0.62), barkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  const canopyLow = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 2.3), leafMat);
  canopyLow.position.y = 2.25;
  canopyLow.castShadow = true;
  canopyLow.receiveShadow = true;

  const canopyMid = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.8, 1.75), leafMat);
  canopyMid.position.y = 3.0;
  canopyMid.castShadow = true;

  const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.65, 1.05), leafMat);
  canopyTop.position.y = 3.65;
  canopyTop.castShadow = true;

  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), accentMat);
  accent.position.set(0.85, 1.95, 0.75);

  group.add(rootCollar, trunk, canopyLow, canopyMid, canopyTop, accent);
  return group;
}

/**
 * 7-part interactive Java Terminal Console placed near obstacles
 */
export function createJavaTerminalConsole(
  accentHex: string,
  shadowTex: THREE.Texture
): { group: THREE.Group; screenMat: THREE.MeshStandardMaterial; beaconMesh: THREE.Mesh } {
  const group = new THREE.Group();
  addContactShadow(group, 0.95, shadowTex);

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#39463F', roughness: 0.85, metalness: 0.12 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#1B2520', roughness: 0.38, metalness: 0.68 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.3,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 1.15), stoneMat);
  plinth.position.y = 0.12;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.95, 0.56), trimMat);
  pillar.position.y = 0.7;
  pillar.castShadow = true;

  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.72), stoneMat);
  desk.position.set(0, 1.22, 0.06);
  desk.rotation.x = 0.32;
  desk.castShadow = true;

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.48), screenMat);
  screen.position.set(0, 1.31, 0.08);
  screen.rotation.x = 0.32;

  const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), trimMat);
  antennaRod.position.set(0.36, 1.55, -0.2);

  const beaconMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), screenMat);
  beaconMesh.position.set(0.36, 2.02, -0.2);

  group.add(plinth, pillar, desk, screen, antennaRod, beaconMesh);
  return { group, screenMat, beaconMesh };
}

/**
 * 9-part Swirling Voxel Victory Portal
 */
export function createVictoryPortal(
  accentHex: string,
  shadowTex: THREE.Texture
): {
  group: THREE.Group;
  vortexMesh: THREE.Mesh;
  vortexMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  addContactShadow(group, 2.3, shadowTex);

  const frameStone = new THREE.MeshStandardMaterial({ color: '#242F29', roughness: 0.82, metalness: 0.18 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: '#F5C451', roughness: 0.28, metalness: 0.82 });
  const vortexMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 1.8), frameStone);
  baseStep1.position.y = 0.14;
  baseStep1.receiveShadow = true;

  const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.24, 1.3), frameStone);
  baseStep2.position.y = 0.4;
  baseStep2.receiveShadow = true;

  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.6, 0.65), frameStone);
  leftPillar.position.set(-1.35, 2.2, 0);
  leftPillar.castShadow = true;

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.6, 0.65), frameStone);
  rightPillar.position.set(1.35, 2.2, 0);
  rightPillar.castShadow = true;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.68, 0.82), frameStone);
  lintel.position.set(0, 4.15, 0);
  lintel.castShadow = true;

  const crown = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.92), goldTrim);
  crown.position.set(0, 4.65, 0);

  const leftCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.78), goldTrim);
  leftCap.position.set(-1.35, 2.2, 0);

  const rightCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.78), goldTrim);
  rightCap.position.set(1.35, 2.2, 0);

  const vortexMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 3.25), vortexMat);
  vortexMesh.position.set(0, 2.15, 0);

  group.add(
    baseStep1,
    baseStep2,
    leftPillar,
    rightPillar,
    lintel,
    crown,
    leftCap,
    rightCap,
    vortexMesh
  );

  return { group, vortexMesh, vortexMat };
}

/**
 * 8-part Regional Centerpiece Structure (Communication Tower / Vault / Keep / Turbine / Core)
 */
export function createRegionalCenterpiece(
  levelNumber: number,
  accentHex: string,
  shadowTex: THREE.Texture
): { group: THREE.Group; coreCrystal: THREE.Mesh; coreMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  addContactShadow(group, 2.1, shadowTex);

  const baseMat = new THREE.MeshStandardMaterial({
    color: levelNumber >= 5 ? '#263544' : '#4A5550',
    roughness: 0.78,
    metalness: levelNumber >= 5 ? 0.55 : 0.15,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: levelNumber === 2 ? '#8B5A2B' : levelNumber === 3 ? '#3A434E' : '#F5C451',
    roughness: 0.42,
    metalness: 0.55,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.2,
    roughness: 0.18,
    metalness: 0.4,
  });

  const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 2.8), baseMat);
  foundation.position.y = 0.25;
  foundation.castShadow = true;
  foundation.receiveShadow = true;

  const midTier = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.8, 1.9), baseMat);
  midTier.position.y = 1.4;
  midTier.castShadow = true;

  const collar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 2.2), secondaryMat);
  collar.position.y = 2.4;
  collar.castShadow = true;

  const upperCage = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), baseMat);
  upperCage.position.y = 3.2;
  upperCage.castShadow = true;

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 1.4, 6), secondaryMat);
  spire.position.y = 4.5;
  spire.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.1, 8, 24), secondaryMat);
  ring.position.y = 3.9;
  ring.rotation.x = Math.PI / 2;

  const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), coreMat);
  coreCrystal.position.y = 5.55;

  group.add(foundation, midTier, collar, upperCage, spire, ring, coreCrystal);
  return { group, coreCrystal, coreMat };
}

/**
 * 4-part Collectible Golden Byte Coin
 */
export function createCollectibleCoin(shadowTex: THREE.Texture): {
  group: THREE.Group;
  spinner: THREE.Group;
} {
  const group = new THREE.Group();
  addContactShadow(group, 0.48, shadowTex);

  const spinner = new THREE.Group();
  spinner.position.y = 0.85;
  group.add(spinner);

  const goldMat = new THREE.MeshStandardMaterial({
    color: '#F5C451',
    emissive: '#B7791F',
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.88,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#FFFBEB',
    roughness: 0.35,
    metalness: 0.5,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 8), goldMat);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;

  const innerGem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.14), coreMat);
  innerGem.rotation.z = Math.PI / 4;

  spinner.add(disc, innerGem);
  return { group, spinner };
}
