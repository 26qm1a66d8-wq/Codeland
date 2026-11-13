import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Compass, Hand, RotateCcw } from 'lucide-react';
import { GraphicsQuality } from '../types/codeland';
import { getCharacterById } from '../data/charactersAndBadges';
import { createRadialContactShadowTexture, createVoxelCanvasTexture } from './VoxelTexturesAndProps';
import { VoxelMentorEmblem } from '../components/hub/VoxelHubArtwork';
import { soundFX } from '../lib/audio';

interface DashboardHero3DSceneProps {
  displayName: string;
  avatarId: string;
  playerLevel: number;
  rankTitle: string;
  equippedForestOutfit: boolean;
  equippedCompanionAccessory: boolean;
  graphicsQuality: GraphicsQuality;
  onEnterWorld: () => void;
}

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _targetLook = new THREE.Vector3(0.4, 2.1, -2.5);
const _rayMouse = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createTwilightSkyTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#050819');
  grad.addColorStop(0.28, '#101946');
  grad.addColorStop(0.52, '#2B1B68');
  grad.addColorStop(0.72, '#581C87');
  grad.addColorStop(0.86, '#9D174D');
  grad.addColorStop(0.95, '#D97706');
  grad.addColorStop(1.0, '#12183B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createMoonTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const glow = ctx.createRadialGradient(64, 64, 18, 64, 64, 62);
  glow.addColorStop(0, 'rgba(255, 251, 235, 1)');
  glow.addColorStop(0.52, 'rgba(224, 242, 254, 0.96)');
  glow.addColorStop(0.62, 'rgba(165, 243, 252, 0.32)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle voxel craters
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.fillRect(46, 44, 12, 10);
  ctx.fillRect(68, 56, 14, 12);
  ctx.fillRect(54, 70, 9, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export const DashboardHero3DScene: React.FC<DashboardHero3DSceneProps> = ({
  displayName,
  avatarId,
  playerLevel,
  rankTitle,
  equippedForestOutfit,
  equippedCompanionAccessory,
  graphicsQuality,
  onEnterWorld,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const triggerGreetingRef = useRef<(() => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [greetingBanner, setGreetingBanner] = useState<string | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareGl();
    const initW = container.clientWidth || 880;
    const initH = container.clientHeight || 480;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl || graphicsQuality === 'low' ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = !isSoftwareGl && graphicsQuality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'w-full h-full block cursor-grab active:cursor-grabbing';
    container.appendChild(renderer.domElement);

    const disposablesGeo: THREE.BufferGeometry[] = [];
    const disposablesMat: THREE.Material[] = [];
    const disposablesTex: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposablesGeo.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposablesMat.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      disposablesTex.push(t);
      return t;
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0E1338');
    scene.fog = new THREE.FogExp2('#1A184A', 0.017);

    // Mandatory studio environment map for metallic gold & crystal reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = trackTex(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 160);
    const defaultCamPos = new THREE.Vector3(0.4, 3.35, 9.2);
    camera.position.copy(defaultCamPos);
    camera.lookAt(_targetLook);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(_targetLook);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 6.2;
    controls.maxDistance = 13.5;
    controls.minAzimuthAngle = -0.58;
    controls.maxAzimuthAngle = 0.58;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.51;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    // 1. Twilight Sky Dome + Full Moon + Starfield
    const skyTex = trackTex(createTwilightSkyTexture(renderer));
    const skyDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(95, 24, 18)),
      trackMat(new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }))
    );
    scene.add(skyDome);

    const moonTex = trackTex(createMoonTexture(renderer));
    const moonPlane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(11, 11)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: moonTex,
          transparent: true,
          depthWrite: false,
          fog: false,
        })
      )
    );
    moonPlane.position.set(12.5, 15.5, -34);
    moonPlane.lookAt(camera.position);
    scene.add(moonPlane);

    // Instanced Starfield (> 20 stars)
    const starCount = 90;
    const starInst = new THREE.InstancedMesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.16, 0.16)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#F8FAFC', fog: false })),
      starCount
    );
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 37) % 76) - 38;
      const sy = 9 + ((i * 19) % 24);
      const sz = -26 - ((i * 13) % 28);
      dummy.position.set(sx, sy, sz);
      const s = 0.65 + (i % 4) * 0.28;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      starInst.setMatrixAt(i, dummy.matrix);
      tint.set(i % 3 === 0 ? '#67E8F9' : i % 4 === 0 ? '#FDE68A' : '#F8FAFC');
      starInst.setColorAt(i, tint);
    }
    starInst.instanceMatrix.needsUpdate = true;
    if (starInst.instanceColor) starInst.instanceColor.needsUpdate = true;
    starInst.computeBoundingSphere();
    scene.add(starInst);

    // 2. Balanced Warm/Cool 3-Point Twilight Lighting Rig
    const hemi = new THREE.HemisphereLight('#7DD3FC', '#1E1B4B', 0.95);
    scene.add(hemi);

    const keySun = new THREE.DirectionalLight('#FFD59E', 2.05);
    keySun.position.set(10, 14, 9);
    keySun.castShadow = !isSoftwareGl && graphicsQuality === 'high';
    keySun.shadow.mapSize.set(1024, 1024);
    const sd = 12;
    keySun.shadow.camera.left = -sd;
    keySun.shadow.camera.right = sd;
    keySun.shadow.camera.top = sd;
    keySun.shadow.camera.bottom = -sd;
    keySun.shadow.bias = -0.0005;
    keySun.shadow.normalBias = 0.02;
    scene.add(keySun);

    const violetRim = new THREE.DirectionalLight('#C084FC', 1.15);
    violetRim.position.set(-10, 8, -12);
    scene.add(violetRim);

    const cyanBounce = new THREE.PointLight('#22D3EE', 1.6, 14, 2);
    cyanBounce.position.set(0.4, 2.3, 3.8);
    scene.add(cyanBounce);

    // 3. Procedural Voxel Textures
    const grassTex = trackTex(createVoxelCanvasTexture(renderer, '#16A34A', '#22C55E', 'noise'));
    const stoneTex = trackTex(createVoxelCanvasTexture(renderer, '#475569', '#334155', 'brick'));
    const dirtTex = trackTex(createVoxelCanvasTexture(renderer, '#6B4423', '#4E3018', 'noise'));
    const woodTex = trackTex(createVoxelCanvasTexture(renderer, '#854D0E', '#713F12', 'plank'));
    const castleTex = trackTex(createVoxelCanvasTexture(renderer, '#4C1D95', '#3B0764', 'brick'));
    const shadowTex = trackTex(createRadialContactShadowTexture());

    const matGrass = trackMat(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.78 }));
    const matStone = trackMat(new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.68, metalness: 0.12 }));
    const matDirt = trackMat(new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.9 }));
    const matWood = trackMat(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.74 }));
    const matLeaf = trackMat(new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.72 }));
    const matLeafDark = trackMat(new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.78 }));
    const matGold = trackMat(new THREE.MeshStandardMaterial({ color: '#FBBF24', roughness: 0.24, metalness: 0.85 }));
    const matCastle = trackMat(new THREE.MeshStandardMaterial({ map: castleTex, roughness: 0.52, metalness: 0.22 }));
    const matSpire = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#7C3AED',
        emissive: '#4C1D95',
        emissiveIntensity: 0.35,
        roughness: 0.32,
        metalness: 0.45,
      })
    );
    const matVioletCrystal = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#C084FC',
        emissive: '#9333EA',
        emissiveIntensity: 0.75,
        roughness: 0.16,
        metalness: 0.15,
        clearcoat: 1.0,
      })
    );
    const matCyanCrystal = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#67E8F9',
        emissive: '#06B6D4',
        emissiveIntensity: 0.85,
        roughness: 0.14,
        metalness: 0.2,
        clearcoat: 1.0,
      })
    );
    const matLanternGlow = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FEF08A',
        emissive: '#F59E0B',
        emissiveIntensity: 1.5,
        roughness: 0.2,
      })
    );

    const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));

    // Helper: composite voxel lantern
    const createLantern = (x: number, y: number, z: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.12, 0.42)), matStone);
      base.position.y = 0.06;
      const core = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.28)), matLanternGlow);
      core.position.y = 0.29;
      const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.12, 0.46)), matStone);
      cap.position.y = 0.52;
      const knob = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.1, 0.16)), matGold);
      knob.position.y = 0.63;
      grp.add(base, core, cap, knob);
      scene.add(grp);
      return core;
    };

    // Helper: composite voxel oak tree
    const createVoxelOakTree = (x: number, y: number, z: number, scale = 1) => {
      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);
      const trunk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 1.5, 0.46)), matWood);
      trunk.position.y = 0.75;
      trunk.castShadow = !isSoftwareGl;
      const crownLow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.85, 0.85, 1.85)), matLeafDark);
      crownLow.position.y = 1.65;
      crownLow.castShadow = !isSoftwareGl;
      const crownMid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.45, 0.75, 1.45)), matLeaf);
      crownMid.position.y = 2.25;
      const crownTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 0.55, 0.9)), matLeaf);
      crownTop.position.y = 2.75;
      tree.add(trunk, crownLow, crownMid, crownTop);
      scene.add(tree);
      return tree;
    };

    // Helper: crystal cluster
    const createCrystalCluster = (
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      scale = 1
    ) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.scale.setScalar(scale);
      const c1 = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.32, 0)), mat);
      c1.scale.set(0.75, 1.8, 0.75);
      c1.position.set(0, 0.45, 0);
      const c2 = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.24, 0)), mat);
      c2.scale.set(0.7, 1.5, 0.7);
      c2.position.set(-0.26, 0.32, 0.12);
      c2.rotation.z = 0.28;
      const c3 = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), mat);
      c3.scale.set(0.7, 1.4, 0.7);
      c3.position.set(0.24, 0.28, -0.08);
      c3.rotation.z = -0.32;
      grp.add(c1, c2, c3);
      scene.add(grp);
      return grp;
    };

    // 4. Foreground Raised Carved Stone Hero Platform (Instanced blocks)
    const stoneBlocks: [number, number, number][] = [];
    const grassBlocks: [number, number, number][] = [];
    const dirtBlocks: [number, number, number][] = [];

    // Foreground hero dais (around x: -0.6..1.6, z: 1.5..4.2, top at y = 0)
    for (let x = -3; x <= 3; x++) {
      for (let z = 1; z <= 5; z++) {
        const dist = Math.hypot(x * 0.85, (z - 3) * 1.05);
        if (dist > 3.1) continue;
        if (Math.abs(x) <= 1 && z <= 4) {
          stoneBlocks.push([x, -0.5, z]);
        } else {
          grassBlocks.push([x, -0.5, z]);
        }
        const depth = dist < 1.9 ? 2 : 1;
        for (let d = 1; d <= depth; d++) {
          dirtBlocks.push([x, -0.5 - d, z]);
        }
      }
    }

    // Left Floating Treehouse Island (x: -9..-4, y: 1.5, z: -6..-1)
    for (let x = -9; x <= -4; x++) {
      for (let z = -6; z <= -1; z++) {
        const dist = Math.hypot(x + 6.5, z + 3.5);
        if (dist > 2.9) continue;
        grassBlocks.push([x, 1.0, z]);
        const depth = dist < 1.6 ? 3 : 2;
        for (let d = 1; d <= depth; d++) {
          dirtBlocks.push([x, 1.0 - d, z]);
        }
      }
    }

    // Right Floating Lantern Pavilion Island (x: 5..10, y: 0.5, z: -8..-3)
    for (let x = 5; x <= 10; x++) {
      for (let z = -8; z <= -3; z++) {
        const dist = Math.hypot(x - 7.5, z + 5.5);
        if (dist > 2.8) continue;
        grassBlocks.push([x, 0.2, z]);
        const depth = dist < 1.6 ? 3 : 2;
        for (let d = 1; d <= depth; d++) {
          dirtBlocks.push([x, 0.2 - d, z]);
        }
      }
    }

    // Distant Central Crystal Castle Floating Island (x: -5..6, y: 3.5, z: -19..-11)
    for (let x = -5; x <= 6; x++) {
      for (let z = -19; z <= -11; z++) {
        const dist = Math.hypot(x - 0.5, z + 15);
        if (dist > 5.2) continue;
        stoneBlocks.push([x, 3.0, z]);
        const depth = Math.max(1, Math.round(4.5 - dist * 0.75));
        for (let d = 1; d <= depth; d++) {
          dirtBlocks.push([x, 3.0 - d, z]);
        }
      }
    }

    const buildBlockMesh = (coords: [number, number, number][], mat: THREE.Material) => {
      if (coords.length === 0) return;
      const inst = new THREE.InstancedMesh(unitBox, mat, coords.length);
      inst.castShadow = !isSoftwareGl && graphicsQuality === 'high';
      inst.receiveShadow = !isSoftwareGl && graphicsQuality === 'high';
      coords.forEach(([bx, by, bz], idx) => {
        dummy.position.set(bx, by, bz);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
    };

    buildBlockMesh(stoneBlocks, matStone);
    buildBlockMesh(grassBlocks, matGrass);
    buildBlockMesh(dirtBlocks, matDirt);

    // Raised hero pedestal slab on foreground terrace
    const heroPedestal = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, 0.24, 2.2)),
      matStone
    );
    heroPedestal.position.set(-0.25, 0.12, 2.8);
    heroPedestal.receiveShadow = !isSoftwareGl;
    scene.add(heroPedestal);

    const lanternCores: THREE.Mesh[] = [
      createLantern(-2.05, 0.0, 3.45),
      createLantern(1.95, 0.0, 3.35),
      createLantern(-5.2, 1.5, -2.2),
      createLantern(6.2, 0.7, -4.2),
    ];

    createCrystalCluster(-2.65, 0.0, 2.2, matVioletCrystal, 1.15);
    createCrystalCluster(-7.8, 1.5, -2.8, matVioletCrystal, 1.3);
    createCrystalCluster(8.4, 0.7, -4.8, matCyanCrystal, 1.2);

    // Trees & Wooden Treehouse on Left Island + Right Island
    createVoxelOakTree(-7.2, 1.5, -4.2, 1.35);
    createVoxelOakTree(-5.2, 1.5, -4.8, 0.95);
    createVoxelOakTree(8.2, 0.7, -6.4, 1.1);
    createVoxelOakTree(6.1, 0.7, -6.8, 0.85);

    // Treehouse Cabin on Left Island
    const cabin = new THREE.Group();
    cabin.position.set(-6.4, 1.5, -2.9);
    const cabinWalls = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 1.3, 1.5)), matWood);
    cabinWalls.position.y = 0.65;
    const cabinRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.45, 0.95, 4)), matGold);
    cabinRoof.position.y = 1.75;
    cabinRoof.rotation.y = Math.PI / 4;
    const cabinWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.45, 1.54)), matLanternGlow);
    cabinWin.position.y = 0.72;
    cabin.add(cabinWalls, cabinRoof, cabinWin);
    scene.add(cabin);

    // Arched Wooden Sky Bridge linking Right Island toward Castle Vista
    const bridgeGroup = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const plank = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.14, 0.52)), matWood);
      plank.position.set(5.4 - t * 3.6, 0.9 + Math.sin(t * Math.PI) * 0.55 + t * 1.7, -5.8 - t * 4.8);
      plank.rotation.y = 0.58;
      bridgeGroup.add(plank);
    }
    scene.add(bridgeGroup);

    // 5. Distant Majestic Glowing Crystal Castle + Sky Energy Beam + Cascading Waterfall
    const castleGroup = new THREE.Group();
    castleGroup.position.set(0.6, 3.5, -15.2);

    const addTower = (tx: number, tz: number, w: number, h: number, roofH: number) => {
      const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, w)), matCastle);
      body.position.set(tx, h / 2, tz);
      const spire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(w * 0.78, roofH, 4)), matSpire);
      spire.position.set(tx, h + roofH / 2, tz);
      spire.rotation.y = Math.PI / 4;
      const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.16, 0.22, w + 0.16)), matGold);
      trim.position.set(tx, h, tz);
      const win = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w * 0.34, 0.75, w + 0.06)), matLanternGlow);
      win.position.set(tx, h * 0.58, tz);
      castleGroup.add(body, spire, trim, win);
    };

    // Main Central Keep + 4 Flanking Royal Spires
    addTower(0, 0, 2.8, 5.6, 3.2);
    addTower(-2.3, 0.6, 1.5, 4.1, 2.3);
    addTower(2.3, 0.6, 1.5, 4.1, 2.3);
    addTower(-3.8, 1.2, 1.2, 3.0, 1.8);
    addTower(3.8, 1.2, 1.2, 3.0, 1.8);

    // Glowing Cyan Castle Portal Arch
    const castleArch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1, 1.7, 2.9)),
      matCyanCrystal
    );
    castleArch.position.set(0, 0.9, 0.05);
    castleGroup.add(castleArch);

    // Central Vertical Sky Energy Beam
    const skyBeamMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#E879F9',
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      })
    );
    const skyBeam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.36, 26, 12)), skyBeamMat);
    skyBeam.position.set(0, 16, 0);
    castleGroup.add(skyBeam);

    scene.add(castleGroup);

    // Animated Cascading Voxel Waterfall from Castle Island Cliff
    const waterfallDropsCount = 28;
    const waterfallInst = new THREE.InstancedMesh(
      trackGeo(new THREE.BoxGeometry(0.85, 0.65, 0.38)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          emissive: '#0284C7',
          emissiveIntensity: 0.75,
          roughness: 0.15,
          transparent: true,
          opacity: 0.88,
        })
      ),
      waterfallDropsCount
    );
    waterfallInst.frustumCulled = false;
    scene.add(waterfallInst);

    // 6. Articulated 12-Part 3D Voxel Hero Explorer Rig (Player's Chosen Avatar + Glowing Cyan Sword!)
    const avatarMeta = getCharacterById(avatarId);
    const heroGroup = new THREE.Group();
    heroGroup.position.set(-0.55, 0.24, 2.85);
    heroGroup.rotation.y = 0.22;

    const contactShadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.5, 1.5)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        })
      )
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    heroGroup.add(contactShadow);

    const heroBodyRig = new THREE.Group();
    heroGroup.add(heroBodyRig);

    const matSkin = trackMat(new THREE.MeshStandardMaterial({ color: '#F3C69F', roughness: 0.7 }));
    const matArmor = trackMat(new THREE.MeshStandardMaterial({ color: '#1E1B4B', roughness: 0.42, metalness: 0.35 }));
    const matCape = trackMat(
      new THREE.MeshStandardMaterial({
        color: equippedForestOutfit ? '#10B981' : '#7C3AED',
        roughness: 0.52,
        metalness: 0.18,
      })
    );
    const matAccent = trackMat(
      new THREE.MeshStandardMaterial({
        color: avatarMeta.accentHex || '#22D3EE',
        emissive: avatarMeta.accentHex || '#22D3EE',
        emissiveIntensity: 0.45,
        roughness: 0.3,
      })
    );
    const matHair = trackMat(new THREE.MeshStandardMaterial({ color: '#451A03', roughness: 0.78 }));
    const matBoots = trackMat(new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.65, metalness: 0.25 }));
    const matEye = trackMat(new THREE.MeshStandardMaterial({ color: '#0284C7', emissive: '#38BDF8', emissiveIntensity: 0.5 }));
    const matSwordBlade = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#67E8F9',
        emissive: '#22D3EE',
        emissiveIntensity: 1.35,
        roughness: 0.15,
        metalness: 0.5,
      })
    );

    // Legs
    const leftLeg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.62, 0.28)), matArmor);
    leftLeg.position.set(-0.17, 0.42, 0);
    leftLeg.castShadow = !isSoftwareGl;
    const leftBoot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.31, 0.18, 0.34)), matBoots);
    leftBoot.position.set(-0.17, 0.09, 0.03);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.17;
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.17;

    // Torso + Chest Rune + Gold Shoulder Pauldrons + Explorer Cape
    const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.76, 0.38)), matArmor);
    torso.position.set(0, 1.08, 0);
    torso.castShadow = !isSoftwareGl;

    const chestCrest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.3, 0.06)), matAccent);
    chestCrest.position.set(0, 1.12, 0.2);

    const belt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.71, 0.11, 0.41)), matGold);
    belt.position.set(0, 0.76, 0);

    const pauldronL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.3, 0.16, 0.44)), matCape);
    pauldronL.position.set(-0.44, 1.4, 0);
    const pauldronR = pauldronL.clone();
    pauldronR.position.x = 0.44;

    const capePivot = new THREE.Group();
    capePivot.position.set(0, 1.42, -0.2);
    const capeMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 1.12, 0.08)), matCape);
    capeMesh.position.set(0, -0.54, -0.06);
    capePivot.rotation.x = 0.16;
    capePivot.add(capeMesh);

    // Left Arm (Waving / Greeting arm!)
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.47, 1.36, 0);
    const leftArmMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.58, 0.24)), matCape);
    leftArmMesh.position.y = -0.26;
    const leftHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.21, 0.18, 0.21)), matSkin);
    leftHand.position.y = -0.58;
    leftArmPivot.add(leftArmMesh, leftHand);

    // Right Arm + Glowing Cyan Voxel Code-Sword!
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.47, 1.36, 0);
    const rightArmMesh = leftArmMesh.clone();
    const rightHand = leftHand.clone();
    rightArmPivot.add(rightArmMesh, rightHand);

    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.58, 0.14);
    swordGroup.rotation.x = Math.PI * 0.36;
    const hilt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.28, 0.09)), matWood);
    const crossguard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.09, 0.12)), matGold);
    crossguard.position.y = 0.15;
    const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 1.08, 0.06)), matSwordBlade);
    blade.position.y = 0.72;
    const bladeTip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.16, 0.05)), matSwordBlade);
    bladeTip.position.y = 1.32;
    swordGroup.add(hilt, crossguard, blade, bladeTip);
    rightArmPivot.add(swordGroup);
    rightArmPivot.rotation.x = -0.35;
    rightArmPivot.rotation.z = -0.18;

    // Head + Hair + Eyes
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.48, 0);
    const headMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.58, 0.62)), matSkin);
    headMesh.position.y = 0.3;
    headMesh.castShadow = !isSoftwareGl;
    const hairTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.22, 0.68)), matHair);
    hairTop.position.y = 0.56;
    const hairBangs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.64, 0.12, 0.14)), matHair);
    hairBangs.position.set(0, 0.46, 0.29);
    const eyeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.11, 0.05)), matEye);
    eyeL.position.set(-0.14, 0.3, 0.31);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.14;
    headPivot.add(headMesh, hairTop, hairBangs, eyeL, eyeR);

    heroBodyRig.add(
      leftLeg,
      leftBoot,
      rightLeg,
      rightBoot,
      torso,
      chestCrest,
      belt,
      pauldronL,
      pauldronR,
      capePivot,
      leftArmPivot,
      rightArmPivot,
      headPivot
    );
    scene.add(heroGroup);

    // Invisible click proxy for Hero + Companion Bot raycasting (Layer 1)
    const heroClickProxy = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5, 2.5, 1.2)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    heroClickProxy.position.set(0, 1.25, 0);
    heroClickProxy.userData.kind = 'hero';
    heroGroup.add(heroClickProxy);

    // 7. Voxel Companion Fox sitting beside Alex on rampart (matching reference image!)
    const botGroup = new THREE.Group();
    botGroup.position.set(0.92, 0.45, 2.7);
    botGroup.rotation.y = -0.42;

    const matFoxOrange = trackMat(
      new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.65, metalness: 0.05 })
    );
    const matFoxWhite = trackMat(
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6, metalness: 0.05 })
    );
    const matFoxDark = trackMat(
      new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8, metalness: 0.1 })
    );
    const matFoxBandana = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.5, metalness: 0.1 })
    );

    // Fox Torso
    const foxBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.48, 0.62)), matFoxOrange);
    foxBody.position.y = 0.24;

    // White Chest/Belly
    const foxChest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.36, 0.18)), matFoxWhite);
    foxChest.position.set(0, 0.22, 0.26);

    // Fox Head
    const foxHeadGroup = new THREE.Group();
    foxHeadGroup.position.set(0, 0.54, 0.26);
    const foxHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.44, 0.46)), matFoxOrange);
    const foxMuzzle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.18, 0.22)), matFoxWhite);
    foxMuzzle.position.set(0, -0.06, 0.26);
    const foxNose = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.06, 0.06)), matFoxDark);
    foxNose.position.set(0, -0.02, 0.38);

    // Fox Eyes
    const foxEyeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.04)), matFoxDark);
    foxEyeL.position.set(-0.14, 0.07, 0.24);
    const foxEyeR = foxEyeL.clone();
    foxEyeR.position.x = 0.14;

    // Fox Pointed Ears
    const foxEarL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.22, 0.1)), matFoxOrange);
    foxEarL.position.set(-0.16, 0.28, 0);
    foxEarL.rotation.z = 0.15;
    const foxEarTipL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.09, 0.09)), matFoxDark);
    foxEarTipL.position.set(-0.16, 0.4, 0);

    const foxEarR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.22, 0.1)), matFoxOrange);
    foxEarR.position.set(0.16, 0.28, 0);
    foxEarR.rotation.z = -0.15;
    const foxEarTipR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.09, 0.09)), matFoxDark);
    foxEarTipR.position.set(0.16, 0.4, 0);

    // Cute Red Bandana/Collar
    const foxBandana = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.12, 0.5)), matFoxBandana);
    foxBandana.position.set(0, -0.19, 0.08);
    const bandanaKnot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.16, 0.08)), matFoxBandana);
    bandanaKnot.position.set(0, -0.28, 0.32);

    foxHeadGroup.add(
      foxHead,
      foxMuzzle,
      foxNose,
      foxEyeL,
      foxEyeR,
      foxEarL,
      foxEarTipL,
      foxEarR,
      foxEarTipR,
      foxBandana,
      bandanaKnot
    );

    // Paws sitting on stone ledge
    const pawFL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.2, 0.18)), matFoxWhite);
    pawFL.position.set(-0.16, 0.1, 0.28);
    const pawFR = pawFL.clone();
    pawFR.position.x = 0.16;

    // Bushy Fox Tail
    const foxTail = new THREE.Group();
    foxTail.position.set(0, 0.18, -0.28);
    const tailBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.38, 0.2)), matFoxOrange);
    tailBase.position.set(0, 0.16, -0.1);
    tailBase.rotation.x = -0.35;
    const tailTip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.16, 0.18)), matFoxWhite);
    tailTip.position.set(0, 0.36, -0.16);
    foxTail.add(tailBase, tailTip);

    const botClickProxy = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.2, 1.2, 1.2)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    botClickProxy.userData.kind = 'bot';

    botGroup.add(
      foxBody,
      foxChest,
      foxHeadGroup,
      pawFL,
      pawFR,
      foxTail,
      botClickProxy
    );
    scene.add(botGroup);

    // Hot Air Balloons drifting in twilight sky (matching reference image!)
    const balloonGroup = new THREE.Group();
    const matBalloon1 = trackMat(new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.55 }));
    const matBalloon2 = trackMat(new THREE.MeshStandardMaterial({ color: '#0EA5E9', roughness: 0.55 }));
    const matBasket = trackMat(new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.9 }));

    const makeBalloon = (x: number, y: number, z: number, s: number, mat: THREE.Material) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.scale.setScalar(s);
      const orb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.3, 12, 10)), mat);
      const basket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.38, 0.42)), matBasket);
      basket.position.y = -1.65;
      g.add(orb, basket);
      return g;
    };

    const balloon1 = makeBalloon(7.8, 9.2, -14, 0.85, matBalloon1);
    const balloon2 = makeBalloon(-4.5, 8.4, -18, 0.65, matBalloon2);
    balloonGroup.add(balloon1, balloon2);
    scene.add(balloonGroup);

    // 8. Drifting Voxel Clouds + Floating Magical Firefly Cubes
    const cloudsGroup = new THREE.Group();
    const matCloud = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E0E7FF',
        emissive: '#312E81',
        emissiveIntensity: 0.25,
        roughness: 0.9,
        transparent: true,
        opacity: 0.72,
      })
    );
    const cloudSpecs: [number, number, number, number][] = [
      [-11, 9.5, -18, 1.4],
      [11, 8.8, -16, 1.2],
      [-3, 12.2, -24, 1.6],
    ];
    cloudSpecs.forEach(([cx, cy, cz, sc]) => {
      const cg = new THREE.Group();
      cg.position.set(cx, cy, cz);
      cg.scale.setScalar(sc);
      const b1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.55, 1.3)), matCloud);
      const b2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.45, 1.1)), matCloud);
      b2.position.set(0.3, 0.38, 0);
      cg.add(b1, b2);
      cloudsGroup.add(cg);
    });
    scene.add(cloudsGroup);

    const fireflyCount = graphicsQuality === 'low' ? 16 : 34;
    const fireflyInst = new THREE.InstancedMesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.11, 0.11)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#FFFFFF' })),
      fireflyCount
    );
    fireflyInst.frustumCulled = false;
    for (let i = 0; i < fireflyCount; i++) {
      tint.set(i % 3 === 0 ? '#22D3EE' : i % 3 === 1 ? '#FBBF24' : '#C084FC');
      fireflyInst.setColorAt(i, tint);
    }
    if (fireflyInst.instanceColor) fireflyInst.instanceColor.needsUpdate = true;
    scene.add(fireflyInst);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Interactive Greeting Wave & Companion Spin State
    let greetTimer = 1.6; // Gentle welcome wave on initial arrival!
    let botSpinTimer = 0;
    let pointerNormX = 0;
    let pointerNormY = 0;

    const triggerGreeting = () => {
      greetTimer = 2.0;
      botSpinTimer = 1.2;
      soundFX.playClick();
      setGreetingBanner('Ready to write Java and unlock the next portal!');
      window.setTimeout(() => {
        setGreetingBanner((prev) =>
          prev === 'Ready to write Java and unlock the next portal!' ? null : prev
        );
      }, 2800);
    };

    triggerGreetingRef.current = triggerGreeting;
    resetCameraRef.current = () => {
      camera.position.copy(defaultCamPos);
      controls.target.copy(_targetLook);
      controls.update();
    };

    // Throttled Pointer Move & Raycast Click
    const raycaster = new THREE.Raycaster();
    const clickTargets = [heroClickProxy, botClickProxy];
    let lastMoveTs = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveTs < 35) return;
      lastMoveTs = now;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNormY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickTargets, false);
      if (hits.length > 0) {
        triggerGreeting();
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Frame Loop with mandatory Software-WebGL fenceSync + 80ms pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = prefersReducedMotion ? 0 : clock.getElapsedTime();

      if (controls.enableDamping) {
        controls.update();
      }

      // Hero breathing, head pointer tracking & greeting wave
      heroBodyRig.position.y = Math.sin(elapsed * 2.2) * 0.035;
      capePivot.rotation.x = 0.16 + Math.sin(elapsed * 1.9) * 0.06;

      headPivot.rotation.y = THREE.MathUtils.damp(
        headPivot.rotation.y,
        pointerNormX * 0.28,
        5,
        dt
      );
      headPivot.rotation.x = THREE.MathUtils.damp(
        headPivot.rotation.x,
        -pointerNormY * 0.14,
        5,
        dt
      );

      if (greetTimer > 0 && !prefersReducedMotion) {
        greetTimer = Math.max(0, greetTimer - dt);
        leftArmPivot.rotation.z = -2.45 + Math.sin(elapsed * 11) * 0.35;
        leftArmPivot.rotation.x = -0.25;
        rightArmPivot.rotation.x = -0.65 + Math.sin(elapsed * 6) * 0.12;
      } else {
        leftArmPivot.rotation.z = THREE.MathUtils.damp(
          leftArmPivot.rotation.z,
          0.12 + Math.sin(elapsed * 1.8) * 0.04,
          6,
          dt
        );
        leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0, 6, dt);
        rightArmPivot.rotation.x = THREE.MathUtils.damp(
          rightArmPivot.rotation.x,
          -0.35 + Math.sin(elapsed * 2.0) * 0.05,
          6,
          dt
        );
      }

      // Companion Fox gentle breathing & tail wag
      foxTail.rotation.y = Math.sin(elapsed * 3.5) * 0.22;
      foxHeadGroup.rotation.y = Math.sin(elapsed * 1.5) * 0.08;
      if (botSpinTimer > 0 && !prefersReducedMotion) {
        botSpinTimer = Math.max(0, botSpinTimer - dt);
        botGroup.rotation.y += dt * 4.2;
      } else {
        botGroup.rotation.y = THREE.MathUtils.damp(botGroup.rotation.y, -0.42, 4, dt);
      }

      // Hot air balloons drifting gently in sky
      balloon1.position.y = 9.2 + Math.sin(elapsed * 0.8) * 0.35;
      balloon2.position.y = 8.4 + Math.cos(elapsed * 0.7) * 0.28;

      // Cascading Waterfall Blocks
      for (let i = 0; i < waterfallDropsCount; i++) {
        const phase = ((elapsed * 1.35 + i / waterfallDropsCount) % 1);
        const wy = 3.2 - phase * 9.5;
        const wz = -11.3 + phase * 0.55;
        const wx = 0.2 + ((i % 3) - 1) * 0.35;
        dummy.position.set(wx, wy, wz);
        dummy.scale.set(1, 0.8 + phase * 0.5, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        waterfallInst.setMatrixAt(i, dummy.matrix);
      }
      waterfallInst.instanceMatrix.needsUpdate = true;

      // Drifting Clouds & Rising Magical Fireflies
      cloudsGroup.children.forEach((cloud, idx) => {
        cloud.position.x += Math.sin(elapsed * 0.18 + idx) * dt * 0.18;
      });

      for (let i = 0; i < fireflyCount; i++) {
        const angle = (i / fireflyCount) * Math.PI * 2 + elapsed * 0.18;
        const radius = 2.6 + (i % 7) * 1.25;
        const fy = 0.6 + ((elapsed * 0.45 + i * 0.37) % 5.5);
        dummy.position.set(
          Math.cos(angle) * radius,
          fy,
          1.2 - (i % 5) * 2.8 + Math.sin(angle) * 1.4
        );
        dummy.scale.setScalar(0.8 + Math.sin(elapsed * 3 + i) * 0.25);
        dummy.rotation.set(elapsed, elapsed * 0.7, 0);
        dummy.updateMatrix();
        fireflyInst.setMatrixAt(i, dummy.matrix);
      }
      fireflyInst.instanceMatrix.needsUpdate = true;

      // Subtle Lantern Flicker & Sky Beam Shimmer
      const glowPulse = 1.35 + Math.sin(elapsed * 5.2) * 0.2;
      matLanternGlow.emissiveIntensity = glowPulse;
      skyBeamMat.opacity = 0.48 + Math.sin(elapsed * 2.6) * 0.12;
      void lanternCores;

      renderer.render(scene, camera);
      if (isSoftwareGl || prefersReducedMotion) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      disposablesGeo.forEach((g) => g.dispose());
      disposablesMat.forEach((m) => m.dispose());
      disposablesTex.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatarId, equippedForestOutfit, equippedCompanionAccessory, graphicsQuality]);

  return (
    <section
      aria-label="CODELAND 3D Voxel Adventure World Hub"
      className="relative w-full h-[430px] sm:h-[470px] lg:h-[510px] rounded-2xl overflow-hidden border border-indigo-400/30 bg-[#0B1026] shadow-xl select-none"
    >
      {/* Isolated WebGL Canvas Mount (Zero backdrop-filter overlays!) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Graceful Fallback if WebGL context is unavailable */}
      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0B1026] via-[#1E1B4B] to-[#3B0764]">
          <VoxelMentorEmblem size={64} />
          <h2 className="mt-3 text-xl font-extrabold text-white">
            Welcome back, {displayName}!
          </h2>
          <p className="mt-1 text-sm text-indigo-200 max-w-md">
            Your next Java adventure awaits across the Six Magical Worlds.
          </p>
        </div>
      )}

      {/* Top-Left Mentor Welcome Banner (Unobtrusive Top Edge, Solid High-Contrast Surface) */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 sm:right-auto sm:max-w-md z-10">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#0D1433]/92 border border-indigo-400/40 shadow-lg">
          <VoxelMentorEmblem size={46} />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-[#FBBF24] leading-tight truncate">
              Welcome back, {displayName}!
            </h1>
            <p className="text-xs text-slate-200 leading-snug truncate">
              {greetingBanner || 'Your next Java adventure awaits.'}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-cyan-300">
              <span>Lv. {playerLevel}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{rankTitle}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Unified Bottom-Center 3D Viewport Dock (100% Unobstructed Center) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94%]">
        <button
          type="button"
          onClick={() => setControlsCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-t-lg bg-[#0D1433]/92 border border-b-0 border-indigo-400/35 text-[11px] font-semibold text-indigo-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {controlsCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Scene Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!controlsCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0D1433]/94 border border-indigo-400/40 shadow-lg">
            <button
              type="button"
              onClick={() => triggerGreetingRef.current?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#18224D] hover:bg-[#22306B] text-cyan-200 border border-cyan-400/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Hand className="w-3.5 h-3.5 text-cyan-300" />
              <span>Greet Hero</span>
            </button>

            <button
              type="button"
              onClick={() => resetCameraRef.current?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#18224D] hover:bg-[#22306B] text-slate-200 border border-indigo-400/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-300" />
              <span>Reset Camera</span>
            </button>

            <button
              type="button"
              onClick={onEnterWorld}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:from-[#FBBF24] hover:to-[#FDE047] text-[#111827] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Enter 3D World</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
