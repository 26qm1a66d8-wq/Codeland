import * as THREE from 'three';
import { World1SiteId, World1StationVisualKind } from '../../types/codeland';
import { WORLD1_LEVELS } from '../../data/world1ForestData';
import { addContactShadow, createVoxelCanvasTexture } from '../VoxelTexturesAndProps';

export interface SiteStructureController {
  siteId: World1SiteId;
  levelNumber: number;
  root: THREE.Group;
  stageGroups: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  ruinGroup: THREE.Group;
  currentStageProgress: [number, number, number, number];
}

export interface TaskStationEntry {
  siteId: World1SiteId;
  levelNumber: number;
  taskNumber: 1 | 2 | 3 | 4;
  taskId: string;
  stationLabel: string;
  worldPosition: [number, number, number];
  group: THREE.Group;
  clickProxy: THREE.Mesh;
  screenMat: THREE.MeshStandardMaterial;
  ringMesh: THREE.Mesh;
}

export interface SupplyCrateEntry {
  supplyId: string;
  supplyLabel: string;
  worldPosition: [number, number, number];
  group: THREE.Group;
  clickProxy: THREE.Mesh;
  floatingCrystal: THREE.Mesh;
  floatingGear: THREE.Mesh;
  auraRing: THREE.Mesh;
}

export interface ForestStructuresSystem {
  group: THREE.Group;
  sites: Record<World1SiteId, SiteStructureController>;
  taskStations: TaskStationEntry[];
  supplyCrates: SupplyCrateEntry[];
  update: (
    dt: number,
    elapsed: number,
    stages: Record<World1SiteId, number>,
    activeSiteId: World1SiteId,
    activeTaskNumber: 1 | 2 | 3 | 4 | null,
    activeBeaconWorldPos: [number, number, number] | null,
    purchasedSupplyIds: string[],
    collectedSupplyIds: string[],
    freeRoamUnlocked: boolean
  ) => void;
  updateRegistryBoard: (villagerName: string, crystalCount: number) => void;
  dispose: () => void;
}

/**
 * Builds all 10 persistent World 1 structures across the Beginner's Forest,
 * including the redesigned Level 2 Hollow Walkable Compiler Workshop + Creek Bridge +
 * Collectible Supply Crates, 40 distinct 3D Task Objective Stations, and an Active 3D Objective Beacon.
 */
export function buildForestStructures3D(
  renderer: THREE.WebGLRenderer,
  shadowTex: THREE.Texture,
  isSoftwareGl: boolean,
  initialVillagerName: string,
  initialCrystalCount: number
): ForestStructuresSystem {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometries.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };
  const tx = <T extends THREE.Texture>(tex: T): T => {
    textures.push(tex);
    return tex;
  };

  // Shared PBR Voxel Palette
  const stoneTex = tx(createVoxelCanvasTexture(renderer, '#7B8480', '#606865', 'brick'));
  const carvedStoneTex = tx(createVoxelCanvasTexture(renderer, '#969E98', '#78807A', 'brick'));
  const woodPlankTex = tx(createVoxelCanvasTexture(renderer, '#8E5D38', '#6F4628', 'plank'));
  const darkTimberTex = tx(createVoxelCanvasTexture(renderer, '#593A22', '#422A18', 'plank'));
  const roofShingleTex = tx(createVoxelCanvasTexture(renderer, '#2D6A4F', '#1E4D38', 'brick'));
  const warmTileTex = tx(createVoxelCanvasTexture(renderer, '#B55B3C', '#8F4329', 'brick'));
  const circuitTex = tx(createVoxelCanvasTexture(renderer, '#193829', '#52F2B8', 'circuit'));

  const matStone = m(new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.08 }));
  const matCarved = m(new THREE.MeshStandardMaterial({ map: carvedStoneTex, roughness: 0.72, metalness: 0.12 }));
  const matWood = m(new THREE.MeshStandardMaterial({ map: woodPlankTex, roughness: 0.76, metalness: 0.05 }));
  const matDarkWood = m(new THREE.MeshStandardMaterial({ map: darkTimberTex, roughness: 0.82, metalness: 0.06 }));
  const matPlaster = m(new THREE.MeshStandardMaterial({ color: '#E8E0CE', roughness: 0.8, metalness: 0.04 }));
  const matRoofGreen = m(new THREE.MeshStandardMaterial({ map: roofShingleTex, roughness: 0.65, metalness: 0.12 }));
  const matRoofTerracotta = m(new THREE.MeshStandardMaterial({ map: warmTileTex, roughness: 0.68, metalness: 0.1 }));
  const matIron = m(new THREE.MeshStandardMaterial({ color: '#2F3835', roughness: 0.36, metalness: 0.78 }));
  const matBrass = m(new THREE.MeshStandardMaterial({ color: '#E5B449', roughness: 0.24, metalness: 0.86 }));
  const matEmeraldBanner = m(new THREE.MeshStandardMaterial({ color: '#2F7D46', roughness: 0.58, metalness: 0.08 }));
  const matGoldTrim = m(new THREE.MeshStandardMaterial({ color: '#F5C451', roughness: 0.28, metalness: 0.75 }));
  const matLockedSeal = m(
    new THREE.MeshStandardMaterial({
      color: '#F28C45',
      emissive: '#D96B27',
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })
  );
  const matWarmGlow = m(
    new THREE.MeshStandardMaterial({
      color: '#FFE082',
      emissive: '#FFAA2B',
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  const matEmeraldCrystal = m(
    new THREE.MeshPhysicalMaterial({
      color: '#4EF5A8',
      emissive: '#1DC97A',
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1,
      transmission: isSoftwareGl ? 0 : 0.65,
      transparent: true,
      opacity: isSoftwareGl ? 0.9 : 1,
    })
  );
  const matCyanCrystal = m(
    new THREE.MeshPhysicalMaterial({
      color: '#70E4FF',
      emissive: '#22A8D8',
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.18,
      clearcoat: 1,
    })
  );
  const matBeam = m(
    new THREE.MeshBasicMaterial({
      color: '#6BF7B8',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const matCircuitScreen = m(
    new THREE.MeshStandardMaterial({
      map: circuitTex,
      emissive: '#27B87D',
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.3,
    })
  );
  const matInvisibleHitbox = m(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    })
  );

  // Dynamic Animated Sub-parts references
  let beaconCrystalMesh: THREE.Mesh | null = null;
  let beaconSkyBeam: THREE.Mesh | null = null;
  const compilerGears: THREE.Mesh[] = [];
  let workshopJvmCrystal: THREE.Mesh | null = null;
  let workshopDoorLeftPivot: THREE.Group | null = null;
  let workshopDoorRightPivot: THREE.Group | null = null;
  let workshopLockBar: THREE.Mesh | null = null;
  let workshopWinLeft: THREE.Mesh | null = null;
  let workshopWinRight: THREE.Mesh | null = null;
  let workshopOpenProgress = 0;

  let portcullisGrate: THREE.Group | null = null;
  let signalPrismMesh: THREE.Mesh | null = null;
  let waterwheelGroup: THREE.Group | null = null;
  let monumentEmblemMesh: THREE.Group | null = null;

  const taskStations: TaskStationEntry[] = [];
  const supplyCrates: SupplyCrateEntry[] = [];

  // Dynamic 3D CanvasTexture for Level 9 Village Registration Signboard
  const regCanvas = document.createElement('canvas');
  regCanvas.width = 512;
  regCanvas.height = 256;
  const regCtx = regCanvas.getContext('2d')!;
  const regTexture = tx(new THREE.CanvasTexture(regCanvas));
  regTexture.colorSpace = THREE.SRGBColorSpace;
  regTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const drawRegistryCanvas = (name: string, crystals: number) => {
    regCtx.fillStyle = '#132A1F';
    regCtx.fillRect(0, 0, 512, 256);
    regCtx.strokeStyle = '#F5C451';
    regCtx.lineWidth = 10;
    regCtx.strokeRect(12, 12, 488, 232);

    regCtx.fillStyle = '#F5C451';
    regCtx.font = 'bold 26px monospace';
    regCtx.textAlign = 'center';
    regCtx.fillText('FOREST CITIZEN REGISTRY', 256, 62);

    regCtx.fillStyle = '#A7F3D0';
    regCtx.font = 'bold 34px sans-serif';
    regCtx.fillText(`Explorer: ${(name || 'Explorer').slice(0, 18)}`, 256, 132);

    regCtx.fillStyle = '#70E4FF';
    regCtx.font = 'bold 28px monospace';
    regCtx.fillText(`Crystals Logged: ${Math.max(0, Math.round(crystals))}`, 256, 194);
    regTexture.needsUpdate = true;
  };
  drawRegistryCanvas(initialVillagerName, initialCrystalCount);

  // =========================================================================
  // HELPER: COMPOSITE 3D OBJECTIVE STATION BUILDER (40 DISTINCT STATIONS)
  // =========================================================================
  const hitboxGeo = g(new THREE.BoxGeometry(1.5, 2.25, 1.5));
  const stationRingGeo = g(new THREE.TorusGeometry(0.68, 0.04, 8, 24));
  stationRingGeo.rotateX(Math.PI / 2);

  const buildStationVisual = (
    kind: World1StationVisualKind,
    stationGroup: THREE.Group,
    screenMat: THREE.MeshStandardMaterial
  ) => {
    switch (kind) {
      case 'riverbank_post': {
        const plinth = new THREE.Mesh(g(new THREE.BoxGeometry(0.95, 0.22, 0.95)), matStone);
        plinth.position.y = 0.11;
        const post = new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 1.32, 0.26)), matDarkWood);
        post.position.set(0, 0.72, -0.14);
        post.castShadow = true;
        const crossArm = new THREE.Mesh(g(new THREE.BoxGeometry(0.62, 0.1, 0.12)), matWood);
        crossArm.position.set(0, 1.38, -0.14);
        const lantern = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 0.24, 0.2)), matWarmGlow);
        lantern.position.set(0.26, 1.22, -0.14);
        const slateFrame = new THREE.Mesh(g(new THREE.BoxGeometry(0.98, 0.12, 0.72)), matBrass);
        slateFrame.position.set(0, 1.06, 0.08);
        slateFrame.rotation.x = 0.42;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.84, 0.06, 0.56)), screenMat);
        screen.position.set(0, 1.12, 0.1);
        screen.rotation.x = 0.42;
        stationGroup.add(plinth, post, crossArm, lantern, slateFrame, screen);
        break;
      }

      case 'door_lock': {
        const base = new THREE.Mesh(g(new THREE.BoxGeometry(0.88, 0.26, 0.88)), matCarved);
        base.position.y = 0.13;
        const pillar = new THREE.Mesh(g(new THREE.BoxGeometry(0.54, 1.24, 0.46)), matStone);
        pillar.position.y = 0.78;
        pillar.castShadow = true;
        const brassTrim = new THREE.Mesh(g(new THREE.BoxGeometry(0.62, 0.28, 0.52)), matBrass);
        brassTrim.position.y = 1.18;
        const crystalKey = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.18, 0)), matCyanCrystal);
        crystalKey.position.y = 1.56;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.68, 0.48, 0.08)), screenMat);
        screen.position.set(0, 1.02, 0.26);
        screen.rotation.x = -0.22;
        stationGroup.add(base, pillar, brassTrim, crystalKey, screen);
        break;
      }

      case 'merchant_counter': {
        const rug = new THREE.Mesh(g(new THREE.BoxGeometry(1.12, 0.06, 0.88)), matEmeraldBanner);
        rug.position.y = 0.03;
        const desk = new THREE.Mesh(g(new THREE.BoxGeometry(1.06, 0.96, 0.74)), matWood);
        desk.position.y = 0.51;
        desk.castShadow = true;
        const topTrim = new THREE.Mesh(g(new THREE.BoxGeometry(1.14, 0.1, 0.82)), matDarkWood);
        topTrim.position.y = 1.02;
        const scalePost = new THREE.Mesh(g(new THREE.CylinderGeometry(0.04, 0.06, 0.36, 6)), matBrass);
        scalePost.position.set(-0.34, 1.24, -0.14);
        const scaleBeam = new THREE.Mesh(g(new THREE.BoxGeometry(0.34, 0.04, 0.04)), matGoldTrim);
        scaleBeam.position.set(-0.34, 1.4, -0.14);
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.64, 0.06, 0.48)), screenMat);
        screen.position.set(0.14, 1.1, 0.06);
        screen.rotation.x = 0.28;
        stationGroup.add(rug, desk, topTrim, scalePost, scaleBeam, screen);
        break;
      }

      case 'execution_core': {
        const plinth = new THREE.Mesh(g(new THREE.BoxGeometry(1.12, 0.24, 0.96)), matIron);
        plinth.position.y = 0.12;
        const chassis = new THREE.Mesh(g(new THREE.BoxGeometry(0.86, 0.96, 0.68)), matCarved);
        chassis.position.y = 0.68;
        chassis.castShadow = true;
        const conduitL = new THREE.Mesh(g(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 8)), matBrass);
        conduitL.position.set(-0.46, 0.82, -0.16);
        const conduitR = conduitL.clone();
        conduitR.position.x = 0.46;
        const orbL = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.14, 0)), matEmeraldCrystal);
        orbL.position.set(-0.46, 1.52, -0.16);
        const orbR = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.14, 0)), matCyanCrystal);
        orbR.position.set(0.46, 1.52, -0.16);
        const consoleDeck = new THREE.Mesh(g(new THREE.BoxGeometry(0.94, 0.12, 0.68)), matIron);
        consoleDeck.position.set(0, 1.18, 0.08);
        consoleDeck.rotation.x = 0.34;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.78, 0.06, 0.52)), screenMat);
        screen.position.set(0, 1.24, 0.1);
        screen.rotation.x = 0.34;
        stationGroup.add(plinth, chassis, conduitL, conduitR, orbL, orbR, consoleDeck, screen);
        break;
      }

      case 'stone_altar': {
        const step1 = new THREE.Mesh(g(new THREE.BoxGeometry(1.16, 0.2, 1.02)), matStone);
        step1.position.y = 0.1;
        const altar = new THREE.Mesh(g(new THREE.BoxGeometry(0.84, 0.82, 0.72)), matCarved);
        altar.position.y = 0.58;
        altar.castShadow = true;
        const obeliskL = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 1.38, 0.16)), matStone);
        obeliskL.position.set(-0.46, 0.78, -0.24);
        const obeliskR = obeliskL.clone();
        obeliskR.position.x = 0.46;
        const runeCapL = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.11, 0)), matGoldTrim);
        runeCapL.position.set(-0.46, 1.56, -0.24);
        const runeCapR = runeCapL.clone();
        runeCapR.position.x = 0.46;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.76, 0.08, 0.54)), screenMat);
        screen.position.set(0, 1.06, 0.05);
        screen.rotation.x = 0.32;
        stationGroup.add(step1, altar, obeliskL, obeliskR, runeCapL, runeCapR, screen);
        break;
      }

      case 'anvil_bench': {
        const legL = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 0.88, 0.68)), matDarkWood);
        legL.position.set(-0.42, 0.44, 0);
        const legR = legL.clone();
        legR.position.x = 0.42;
        const top = new THREE.Mesh(g(new THREE.BoxGeometry(1.18, 0.14, 0.82)), matWood);
        top.position.y = 0.94;
        top.castShadow = true;
        const miniAnvil = new THREE.Mesh(g(new THREE.BoxGeometry(0.32, 0.24, 0.2)), matIron);
        miniAnvil.position.set(-0.34, 1.12, -0.14);
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.64, 0.06, 0.48)), screenMat);
        screen.position.set(0.18, 1.06, 0.08);
        screen.rotation.x = 0.3;
        stationGroup.add(legL, legR, top, miniAnvil, screen);
        break;
      }

      case 'lantern_pedestal': {
        const base = new THREE.Mesh(g(new THREE.BoxGeometry(0.92, 0.24, 0.92)), matCarved);
        base.position.y = 0.12;
        const col = new THREE.Mesh(g(new THREE.BoxGeometry(0.46, 0.94, 0.46)), matStone);
        col.position.y = 0.68;
        col.castShadow = true;
        const mast = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 1.65, 0.14)), matDarkWood);
        mast.position.set(-0.36, 0.98, -0.24);
        const lantern = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.18, 0)), matCyanCrystal);
        lantern.position.set(-0.36, 1.88, -0.24);
        const desk = new THREE.Mesh(g(new THREE.BoxGeometry(0.88, 0.12, 0.68)), matDarkWood);
        desk.position.set(0.06, 1.16, 0.04);
        desk.rotation.x = 0.34;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.74, 0.06, 0.52)), screenMat);
        screen.position.set(0.06, 1.22, 0.06);
        screen.rotation.x = 0.34;
        stationGroup.add(base, col, mast, lantern, desk, screen);
        break;
      }

      case 'map_desk': {
        const legFL = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.94, 0.14)), matDarkWood);
        legFL.position.set(-0.46, 0.47, 0.28);
        const legFR = legFL.clone();
        legFR.position.x = 0.46;
        const legBL = legFL.clone();
        legBL.position.z = -0.28;
        const legBR = legFR.clone();
        legBR.position.z = -0.28;
        const board = new THREE.Mesh(g(new THREE.BoxGeometry(1.18, 0.12, 0.84)), matWood);
        board.position.y = 0.98;
        board.rotation.x = 0.2;
        board.castShadow = true;
        const scroll = new THREE.Mesh(g(new THREE.CylinderGeometry(0.08, 0.08, 0.52, 8)), matPlaster);
        scroll.rotation.z = Math.PI / 2;
        scroll.position.set(-0.24, 1.12, -0.22);
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.72, 0.06, 0.5)), screenMat);
        screen.position.set(0.12, 1.07, 0.06);
        screen.rotation.x = 0.2;
        stationGroup.add(legFL, legFR, legBL, legBR, board, scroll, screen);
        break;
      }

      case 'registry_booth': {
        const base = new THREE.Mesh(g(new THREE.BoxGeometry(0.96, 0.22, 0.86)), matCarved);
        base.position.y = 0.11;
        const stand = new THREE.Mesh(g(new THREE.BoxGeometry(0.62, 0.98, 0.52)), matWood);
        stand.position.y = 0.68;
        stand.castShadow = true;
        const trim = new THREE.Mesh(g(new THREE.BoxGeometry(0.96, 0.12, 0.72)), matGoldTrim);
        trim.position.y = 1.18;
        trim.rotation.x = 0.3;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.8, 0.06, 0.56)), screenMat);
        screen.position.set(0, 1.24, 0.02);
        screen.rotation.x = 0.3;
        stationGroup.add(base, stand, trim, screen);
        break;
      }

      default: {
        const pedBase = new THREE.Mesh(g(new THREE.BoxGeometry(0.92, 0.24, 0.92)), matStone);
        pedBase.position.y = 0.12;
        const pedCol = new THREE.Mesh(g(new THREE.BoxGeometry(0.52, 0.92, 0.52)), matCarved);
        pedCol.position.y = 0.68;
        pedCol.castShadow = true;
        const deskTop = new THREE.Mesh(g(new THREE.BoxGeometry(1.04, 0.14, 0.78)), matDarkWood);
        deskTop.position.y = 1.18;
        deskTop.rotation.x = 0.34;
        const screen = new THREE.Mesh(g(new THREE.BoxGeometry(0.86, 0.06, 0.58)), screenMat);
        screen.position.set(0, 1.25, 0.02);
        screen.rotation.x = 0.34;
        stationGroup.add(pedBase, pedCol, deskTop, screen);
        break;
      }
    }
  };

  const sites: Partial<Record<World1SiteId, SiteStructureController>> = {};

  for (const spec of WORLD1_LEVELS) {
    const root = new THREE.Group();
    root.position.set(spec.sitePosition[0], spec.sitePosition[1], spec.sitePosition[2]);
    addContactShadow(
      root,
      spec.siteId === 'grand_settlement' ? 5.8 : spec.siteId === 'workshop' ? 5.0 : 3.6,
      shadowTex
    );

    // Stage 0 Ruin Stakes / Mossy Rubble (not used on hollow workshop which already stands locked across the creek)
    const ruinGroup = new THREE.Group();
    if (spec.siteId !== 'workshop') {
      for (let r = 0; r < 4; r++) {
        const ang = (r * Math.PI) / 2 + 0.4;
        const rub = new THREE.Mesh(g(new THREE.BoxGeometry(0.65, 0.35, 0.55)), matStone);
        rub.position.set(Math.cos(ang) * 1.9, 0.18, Math.sin(ang) * 1.9);
        rub.rotation.y = r * 0.7;
        const stake = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.85, 0.14)), matDarkWood);
        stake.position.set(Math.cos(ang) * 2.35, 0.42, Math.sin(ang) * 2.35);
        ruinGroup.add(rub, stake);
      }
    }
    root.add(ruinGroup);

    const s1 = new THREE.Group();
    const s2 = new THREE.Group();
    const s3 = new THREE.Group();
    const s4 = new THREE.Group();
    const stageGroups: [THREE.Group, THREE.Group, THREE.Group, THREE.Group] = [s1, s2, s3, s4];
    stageGroups.forEach((sg) => {
      sg.visible = false;
      sg.scale.set(1, 0.02, 1);
      root.add(sg);
    });

    // =========================================================================
    // SITE-SPECIFIC 4-STAGE VOXEL ARCHITECTURES
    // =========================================================================
    switch (spec.siteId) {
      case 'beacon': {
        const b1 = new THREE.Mesh(g(new THREE.BoxGeometry(4.4, 0.48, 4.4)), matStone);
        b1.position.y = 0.24;
        const b2 = new THREE.Mesh(g(new THREE.BoxGeometry(3.4, 0.46, 3.4)), matCarved);
        b2.position.y = 0.71;
        b1.castShadow = true;
        b1.receiveShadow = true;
        b2.castShadow = true;
        s1.add(b1, b2);

        const pillarOffsets: [number, number][] = [
          [-1.25, -1.25],
          [1.25, -1.25],
          [-1.25, 1.25],
          [1.25, 1.25],
        ];
        for (const [px, pz] of pillarOffsets) {
          const pil = new THREE.Mesh(g(new THREE.BoxGeometry(0.52, 2.7, 0.52)), matCarved);
          pil.position.set(px, 2.25, pz);
          pil.castShadow = true;
          const runeStrip = new THREE.Mesh(g(new THREE.BoxGeometry(0.56, 0.22, 0.56)), matGoldTrim);
          runeStrip.position.set(px, 2.5, pz);
          s2.add(pil, runeStrip);
        }

        const ring = new THREE.Mesh(g(new THREE.BoxGeometry(3.3, 0.42, 3.3)), matStone);
        ring.position.y = 3.8;
        ring.castShadow = true;
        const cradle = new THREE.Mesh(g(new THREE.CylinderGeometry(0.65, 0.9, 0.45, 6)), matBrass);
        cradle.position.y = 1.16;
        s3.add(ring, cradle);

        beaconCrystalMesh = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.78, 0)), matEmeraldCrystal);
        beaconCrystalMesh.position.y = 2.45;
        beaconCrystalMesh.scale.set(0.85, 1.35, 0.85);
        beaconSkyBeam = new THREE.Mesh(g(new THREE.CylinderGeometry(0.55, 1.05, 18, 12, 1, true)), matBeam);
        beaconSkyBeam.position.y = 10.5;
        const capRoof = new THREE.Mesh(g(new THREE.ConeGeometry(2.1, 1.25, 4)), matRoofGreen);
        capRoof.position.y = 4.62;
        capRoof.rotation.y = Math.PI / 4;
        s4.add(beaconCrystalMesh, beaconSkyBeam, capRoof);
        if (!isSoftwareGl) {
          const pt = new THREE.PointLight('#4EF5A8', 2.8, 15, 2);
          pt.position.y = 2.6;
          s4.add(pt);
        }
        break;
      }

      case 'workshop': {
        // ---------------------------------------------------------------------
        // PERSISTENT HOLLOW WALKABLE COMPILER WORKSHOP SHELL (8.4m x 7.6m)
        // Centered at [-6, 0, 26]; interior walkable at y = 0.24 once Stage 2 unlocks doors
        // ---------------------------------------------------------------------
        const shellGroup = new THREE.Group();

        const floorSlab = new THREE.Mesh(g(new THREE.BoxGeometry(8.4, 0.24, 7.6)), matCarved);
        floorSlab.position.set(0, 0.12, 0);
        floorSlab.receiveShadow = true;
        floorSlab.castShadow = true;
        const entryStep = new THREE.Mesh(g(new THREE.BoxGeometry(2.8, 0.12, 0.65)), matStone);
        entryStep.position.set(0, 0.06, 4.08);
        entryStep.receiveShadow = true;
        shellGroup.add(floorSlab, entryStep);

        // Perimeter Hollow Walls (leaving 2.7m front south doorway at x in [-1.35, +1.35])
        const wallH = 2.75;
        const wallY = 0.24 + wallH * 0.5;
        const westWall = new THREE.Mesh(g(new THREE.BoxGeometry(0.36, wallH, 7.6)), matPlaster);
        westWall.position.set(-4.02, wallY, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;

        const eastWall = new THREE.Mesh(g(new THREE.BoxGeometry(0.36, wallH, 7.6)), matPlaster);
        eastWall.position.set(4.02, wallY, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;

        const northWall = new THREE.Mesh(g(new THREE.BoxGeometry(8.4, wallH, 0.36)), matPlaster);
        northWall.position.set(0, wallY, -3.62);
        northWall.castShadow = true;
        northWall.receiveShadow = true;

        const southLeftWall = new THREE.Mesh(g(new THREE.BoxGeometry(2.85, wallH, 0.36)), matPlaster);
        southLeftWall.position.set(-2.775, wallY, 3.62);
        southLeftWall.castShadow = true;

        const southRightWall = new THREE.Mesh(g(new THREE.BoxGeometry(2.85, wallH, 0.36)), matPlaster);
        southRightWall.position.set(2.775, wallY, 3.62);
        southRightWall.castShadow = true;

        const doorLintel = new THREE.Mesh(g(new THREE.BoxGeometry(3.1, 0.48, 0.44)), matDarkWood);
        doorLintel.position.set(0, 2.78, 3.62);
        doorLintel.castShadow = true;

        const signBoard = new THREE.Mesh(g(new THREE.BoxGeometry(2.35, 0.36, 0.14)), matBrass);
        signBoard.position.set(0, 3.16, 3.84);

        shellGroup.add(
          westWall,
          eastWall,
          northWall,
          southLeftWall,
          southRightWall,
          doorLintel,
          signBoard
        );

        // Timber framing corner & doorway posts + cutaway overhead rafters
        for (const px of [-4.08, -1.42, 1.42, 4.08]) {
          for (const pz of [-3.68, 3.68]) {
            if (Math.abs(px) < 2 && pz < 0) continue;
            const post = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, wallH + 0.18, 0.28)), matDarkWood);
            post.position.set(px, wallY + 0.04, pz);
            post.castShadow = true;
            shellGroup.add(post);
          }
        }
        for (const rz of [-2.1, 0, 2.1]) {
          const rafter = new THREE.Mesh(g(new THREE.BoxGeometry(8.5, 0.18, 0.22)), matDarkWood);
          rafter.position.set(0, 3.08, rz);
          shellGroup.add(rafter);
        }

        // Front Windows (shuttered dark iron until Stage 4 ignites warm workshop glow)
        workshopWinLeft = new THREE.Mesh(g(new THREE.BoxGeometry(0.86, 0.82, 0.42)), matIron);
        workshopWinLeft.position.set(-2.82, 1.78, 3.62);
        workshopWinRight = new THREE.Mesh(g(new THREE.BoxGeometry(0.86, 0.82, 0.42)), matIron);
        workshopWinRight.position.set(2.82, 1.78, 3.62);
        shellGroup.add(workshopWinLeft, workshopWinRight);

        // Hinged Wooden Double Doors (Locked until Stage 2 javac bytecode unlock!)
        workshopDoorLeftPivot = new THREE.Group();
        workshopDoorLeftPivot.position.set(-1.35, 0.24, 3.62);
        const leftLeaf = new THREE.Mesh(g(new THREE.BoxGeometry(1.33, 2.28, 0.14)), matWood);
        leftLeaf.position.set(0.665, 1.14, 0);
        leftLeaf.castShadow = true;
        const leftStrap = new THREE.Mesh(g(new THREE.BoxGeometry(1.15, 0.12, 0.18)), matIron);
        leftStrap.position.set(0.62, 1.65, 0);
        const leftRing = new THREE.Mesh(g(new THREE.TorusGeometry(0.11, 0.03, 6, 12)), matBrass);
        leftRing.position.set(1.14, 1.12, 0.1);
        workshopDoorLeftPivot.add(leftLeaf, leftStrap, leftRing);

        workshopDoorRightPivot = new THREE.Group();
        workshopDoorRightPivot.position.set(1.35, 0.24, 3.62);
        const rightLeaf = new THREE.Mesh(g(new THREE.BoxGeometry(1.33, 2.28, 0.14)), matWood);
        rightLeaf.position.set(-0.665, 1.14, 0);
        rightLeaf.castShadow = true;
        const rightStrap = new THREE.Mesh(g(new THREE.BoxGeometry(1.15, 0.12, 0.18)), matIron);
        rightStrap.position.set(-0.62, 1.65, 0);
        const rightRing = new THREE.Mesh(g(new THREE.TorusGeometry(0.11, 0.03, 6, 12)), matBrass);
        rightRing.position.set(-1.14, 1.12, 0.1);
        workshopDoorRightPivot.add(rightLeaf, rightStrap, rightRing);

        workshopLockBar = new THREE.Mesh(g(new THREE.BoxGeometry(1.65, 0.2, 0.16)), matLockedSeal);
        workshopLockBar.position.set(0, 1.38, 3.74);

        shellGroup.add(workshopDoorLeftPivot, workshopDoorRightPivot, workshopLockBar);

        // Interior West Quartermaster Supply Shelf & Merchant NPC (behind w1_l2_t3 counter at local [-2.2, 0.24, -0.4])
        const merchantShelf = new THREE.Mesh(g(new THREE.BoxGeometry(0.55, 2.1, 2.4)), matDarkWood);
        merchantShelf.position.set(-3.48, 1.29, -0.55);
        const sampleGear = new THREE.Mesh(g(new THREE.TorusGeometry(0.24, 0.06, 6, 10)), matBrass);
        sampleGear.position.set(-3.16, 1.65, -0.95);
        sampleGear.rotation.y = Math.PI / 2;

        const merchantNpc = new THREE.Group();
        merchantNpc.position.set(-2.95, 0.24, -0.45);
        merchantNpc.rotation.y = Math.PI / 2;
        const mBody = new THREE.Mesh(g(new THREE.BoxGeometry(0.48, 0.78, 0.32)), matEmeraldBanner);
        mBody.position.y = 0.39;
        const mApron = new THREE.Mesh(g(new THREE.BoxGeometry(0.42, 0.56, 0.35)), matGoldTrim);
        mApron.position.y = 0.34;
        const mHead = new THREE.Mesh(
          g(new THREE.BoxGeometry(0.42, 0.42, 0.42)),
          m(new THREE.MeshStandardMaterial({ color: '#F2C6A0', roughness: 0.75 }))
        );
        mHead.position.y = 1.0;
        const mCap = new THREE.Mesh(g(new THREE.BoxGeometry(0.46, 0.16, 0.46)), matDarkWood);
        mCap.position.y = 1.26;
        merchantNpc.add(mBody, mApron, mHead, mCap);

        // Interior East JVM Execution Chamber Housing Frame (behind w1_l2_t4 console at local [+2.1, 0.24, -0.6])
        const chamberBase = new THREE.Mesh(g(new THREE.BoxGeometry(1.55, 0.36, 2.2)), matStone);
        chamberBase.position.set(3.05, 0.42, -0.65);
        const chamberArchL = new THREE.Mesh(g(new THREE.BoxGeometry(0.32, 2.1, 0.32)), matIron);
        chamberArchL.position.set(3.05, 1.62, -1.52);
        const chamberArchR = chamberArchL.clone();
        chamberArchR.position.z = 0.22;
        const chamberTop = new THREE.Mesh(g(new THREE.BoxGeometry(0.42, 0.28, 2.1)), matBrass);
        chamberTop.position.set(3.05, 2.68, -0.65);

        shellGroup.add(
          merchantShelf,
          sampleGear,
          merchantNpc,
          chamberBase,
          chamberArchL,
          chamberArchR,
          chamberTop
        );
        root.add(shellGroup);

        // ---------------------------------------------------------------------
        // STAGE 1: WALKABLE TIMBER-AND-STONE CREEK BRIDGE
        // Spans Workshop Creek at world x in [-13.6, -10.4], z = 28.4 (local x in [-7.6, -4.4], z = 2.4)
        // ---------------------------------------------------------------------
        const creekBridge = new THREE.Group();
        creekBridge.position.set(-6.0, 0, 2.4);

        const westAbutment = new THREE.Mesh(g(new THREE.BoxGeometry(0.72, 0.86, 2.95)), matStone);
        westAbutment.position.set(-1.48, -0.16, 0);
        const eastAbutment = westAbutment.clone();
        eastAbutment.position.x = 1.48;
        creekBridge.add(westAbutment, eastAbutment);

        for (let i = -4; i <= 4; i++) {
          const lx = i * 0.34;
          const t = lx / 1.6;
          const archY = 0.18 + Math.cos(t * (Math.PI * 0.5)) * 0.14;
          const plank = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 0.14, 2.74)), matWood);
          plank.position.set(lx, archY, 0);
          plank.receiveShadow = true;
          plank.castShadow = true;
          creekBridge.add(plank);
        }

        for (const sideZ of [-1.28, 1.28]) {
          for (const px of [-1.36, 0, 1.36]) {
            const t = px / 1.6;
            const archY = 0.2 + Math.cos(t * (Math.PI * 0.5)) * 0.14;
            const post = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.86, 0.16)), matDarkWood);
            post.position.set(px, archY + 0.43, sideZ);
            creekBridge.add(post);
          }
          const rail = new THREE.Mesh(g(new THREE.BoxGeometry(3.0, 0.12, 0.12)), matWood);
          rail.position.set(0, 0.92, sideZ);
          creekBridge.add(rail);
        }
        const bridgeLanternL = new THREE.Mesh(g(new THREE.BoxGeometry(0.22, 0.26, 0.22)), matWarmGlow);
        bridgeLanternL.position.set(-1.36, 1.18, -1.28);
        const bridgeLanternR = bridgeLanternL.clone();
        bridgeLanternR.position.z = 1.28;
        creekBridge.add(bridgeLanternL, bridgeLanternR);
        s1.add(creekBridge);

        // ---------------------------------------------------------------------
        // STAGE 2: UNLOCKED WORKSHOP ENTRANCE BANNERS & INTERIOR SCONCES
        // ---------------------------------------------------------------------
        const openBannerL = new THREE.Mesh(g(new THREE.BoxGeometry(0.52, 1.45, 0.08)), matEmeraldBanner);
        openBannerL.position.set(-1.82, 2.15, 3.84);
        const openBannerR = openBannerL.clone();
        openBannerR.position.x = 1.82;
        const sconceW = new THREE.Mesh(g(new THREE.BoxGeometry(0.24, 0.3, 0.24)), matWarmGlow);
        sconceW.position.set(-3.75, 2.15, -2.2);
        const sconceE = sconceW.clone();
        sconceE.position.x = 3.75;
        s2.add(openBannerL, openBannerR, sconceW, sconceE);

        // ---------------------------------------------------------------------
        // STAGE 3: MERCHANT HOIST PULLEY (Collectible Supply Crates spawn separately!)
        // ---------------------------------------------------------------------
        const hoistArm = new THREE.Mesh(g(new THREE.BoxGeometry(1.4, 0.14, 0.14)), matBrass);
        hoistArm.position.set(-2.95, 2.75, 0.8);
        const hoistHook = new THREE.Mesh(g(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6)), matIron);
        hoistHook.position.set(-2.35, 2.45, 0.8);
        s3.add(hoistArm, hoistHook);

        // ---------------------------------------------------------------------
        // STAGE 4: ACTIVE JVM EXECUTION CORE, SPINNING BRASS GEARS & CLERESTORY ROOF
        // ---------------------------------------------------------------------
        const innerGear1 = new THREE.Mesh(g(new THREE.TorusGeometry(0.58, 0.12, 8, 14)), matBrass);
        innerGear1.position.set(3.02, 1.62, -1.05);
        innerGear1.rotation.y = Math.PI / 2;
        const innerGear2 = new THREE.Mesh(g(new THREE.TorusGeometry(0.42, 0.1, 8, 12)), matIron);
        innerGear2.position.set(3.02, 1.15, -0.22);
        innerGear2.rotation.y = Math.PI / 2;
        const outerFlywheel = new THREE.Mesh(g(new THREE.TorusGeometry(0.78, 0.14, 8, 16)), matBrass);
        outerFlywheel.position.set(4.28, 1.95, -0.65);
        outerFlywheel.rotation.y = Math.PI / 2;
        compilerGears.push(innerGear1, innerGear2, outerFlywheel);

        workshopJvmCrystal = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.48, 0)), matEmeraldCrystal);
        workshopJvmCrystal.position.set(3.02, 1.68, -0.65);
        workshopJvmCrystal.scale.set(0.85, 1.35, 0.85);

        // High Clerestory Gabled Roof + Stone Chimney (elevated so interior sightlines stay clear)
        const clerestoryPosts: [number, number][] = [
          [-3.95, -3.55],
          [3.95, -3.55],
          [-3.95, 3.55],
          [3.95, 3.55],
        ];
        for (const [cx, cz] of clerestoryPosts) {
          const riser = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 0.9, 0.28)), matDarkWood);
          riser.position.set(cx, 3.52, cz);
          s4.add(riser);
        }
        const highRoof = new THREE.Mesh(g(new THREE.ConeGeometry(6.25, 2.25, 4)), matRoofTerracotta);
        highRoof.position.set(0, 5.05, 0);
        highRoof.rotation.y = Math.PI / 4;
        highRoof.castShadow = true;

        const chimney = new THREE.Mesh(g(new THREE.BoxGeometry(0.85, 2.6, 0.85)), matStone);
        chimney.position.set(2.55, 5.15, -2.15);

        s4.add(innerGear1, innerGear2, outerFlywheel, workshopJvmCrystal, highRoof, chimney);
        if (!isSoftwareGl) {
          const jvmLight = new THREE.PointLight('#4EF5A8', 2.4, 12, 2);
          jvmLight.position.set(2.2, 2.1, -0.6);
          s4.add(jvmLight);
        }

        // ---------------------------------------------------------------------
        // COLLECTIBLE 3D SUPPLY CRATES AT [-7.5, 0.24, 26.8]
        // Spawned when Stage 3 order succeeds; disappears into player's hands when picked up!
        // ---------------------------------------------------------------------
        const crateGroup = new THREE.Group();
        crateGroup.position.set(-7.5, 0.24, 26.8);
        crateGroup.visible = false;

        const pallet = new THREE.Mesh(g(new THREE.BoxGeometry(1.18, 0.1, 0.96)), matDarkWood);
        pallet.position.y = 0.05;
        const boxA = new THREE.Mesh(g(new THREE.BoxGeometry(0.54, 0.48, 0.54)), matWood);
        boxA.position.set(-0.24, 0.34, 0.06);
        boxA.castShadow = true;
        const boxB = new THREE.Mesh(g(new THREE.BoxGeometry(0.46, 0.42, 0.48)), matWood);
        boxB.position.set(0.28, 0.31, -0.06);
        boxB.castShadow = true;
        const floatingGear = new THREE.Mesh(g(new THREE.TorusGeometry(0.22, 0.06, 8, 12)), matBrass);
        floatingGear.position.set(-0.22, 0.82, 0.06);
        const floatingCrystal = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.22, 0)), matCyanCrystal);
        floatingCrystal.position.set(0.26, 0.84, -0.06);
        const auraRing = new THREE.Mesh(
          stationRingGeo,
          m(
            new THREE.MeshBasicMaterial({
              color: '#F5C451',
              transparent: true,
              opacity: 0.85,
            })
          )
        );
        auraRing.position.y = 0.06;

        const crateProxy = new THREE.Mesh(hitboxGeo, matInvisibleHitbox);
        crateProxy.position.y = 0.9;
        crateProxy.userData.interactable = {
          kind: 'supply_crate',
          supplyId: 'workshop_supplies',
          supplyLabel: 'Brass Compiler Gears & JVM Core Crates',
        };

        crateGroup.add(pallet, boxA, boxB, floatingGear, floatingCrystal, auraRing, crateProxy);
        group.add(crateGroup);

        supplyCrates.push({
          supplyId: 'workshop_supplies',
          supplyLabel: 'Brass Compiler Gears & JVM Core Crates',
          worldPosition: [-7.5, 0.24, 26.8],
          group: crateGroup,
          clickProxy: crateProxy,
          floatingCrystal,
          floatingGear,
          auraRing,
        });

        break;
      }

      case 'gatehouse': {
        const roadSlab = new THREE.Mesh(g(new THREE.BoxGeometry(6.4, 0.34, 4.4)), matCarved);
        roadSlab.position.y = 0.17;
        roadSlab.receiveShadow = true;
        s1.add(roadSlab);

        const pierL = new THREE.Mesh(g(new THREE.BoxGeometry(1.8, 3.6, 2.6)), matStone);
        pierL.position.set(-2.1, 1.95, 0);
        pierL.castShadow = true;
        const pierR = pierL.clone();
        pierR.position.x = 2.1;
        const lintel = new THREE.Mesh(g(new THREE.BoxGeometry(6.0, 1.1, 2.8)), matCarved);
        lintel.position.y = 4.15;
        lintel.castShadow = true;
        s2.add(pierL, pierR, lintel);

        for (const txSide of [-2.45, 2.45]) {
          const tower = new THREE.Mesh(g(new THREE.BoxGeometry(2.0, 5.4, 2.9)), matStone);
          tower.position.set(txSide, 2.85, 0);
          tower.castShadow = true;
          const spire = new THREE.Mesh(g(new THREE.ConeGeometry(1.65, 1.65, 4)), matRoofGreen);
          spire.position.set(txSide, 6.35, 0);
          spire.rotation.y = Math.PI / 4;
          s3.add(tower, spire);
        }

        portcullisGrate = new THREE.Group();
        for (let bar = -1; bar <= 1; bar++) {
          const vBar = new THREE.Mesh(g(new THREE.BoxGeometry(0.12, 2.2, 0.12)), matIron);
          vBar.position.set(bar * 0.65, 3.1, 0);
          portcullisGrate.add(vBar);
        }
        const hBar = new THREE.Mesh(g(new THREE.BoxGeometry(2.1, 0.14, 0.14)), matIron);
        hBar.position.set(0, 2.5, 0);
        portcullisGrate.add(hBar);

        const bannerL = new THREE.Mesh(g(new THREE.BoxGeometry(0.65, 1.8, 0.1)), matEmeraldBanner);
        bannerL.position.set(-2.1, 3.3, 1.48);
        const bannerR = bannerL.clone();
        bannerR.position.x = 2.1;
        const torchL = new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 0.34, 0.26)), matWarmGlow);
        torchL.position.set(-1.35, 2.5, 1.45);
        const torchR = torchL.clone();
        torchR.position.x = 1.35;
        s4.add(portcullisGrate, bannerL, bannerR, torchL, torchR);
        break;
      }

      case 'bridge': {
        const southBank = new THREE.Mesh(g(new THREE.BoxGeometry(4.8, 1.2, 1.8)), matStone);
        southBank.position.set(0, -0.1, 4.4);
        southBank.castShadow = true;
        const northBank = southBank.clone();
        northBank.position.z = -4.4;
        s1.add(southBank, northBank);

        for (const px of [-1.75, 1.75]) {
          for (const pz of [-2.2, 0, 2.2]) {
            const piling = new THREE.Mesh(g(new THREE.CylinderGeometry(0.24, 0.28, 2.2, 8)), matDarkWood);
            piling.position.set(px, -0.45, pz);
            piling.castShadow = true;
            s2.add(piling);
          }
        }

        for (let i = -8; i <= 8; i++) {
          const zPos = i * 0.54;
          const t = zPos / 4.6;
          const archY = 0.18 + Math.cos(t * (Math.PI * 0.5)) * 0.36;
          const plank = new THREE.Mesh(g(new THREE.BoxGeometry(4.4, 0.18, 0.46)), matWood);
          plank.position.set(0, archY, zPos);
          plank.receiveShadow = true;
          plank.castShadow = true;
          s3.add(plank);
        }

        for (const sideX of [-2.05, 2.05]) {
          for (const pz of [-4.2, -2.1, 0, 2.1, 4.2]) {
            const t = pz / 4.6;
            const archY = 0.22 + Math.cos(t * (Math.PI * 0.5)) * 0.36;
            const post = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 1.05, 0.2)), matDarkWood);
            post.position.set(sideX, archY + 0.52, pz);
            s4.add(post);
            if (Math.abs(pz) === 2.1) {
              const lantern = new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 0.3, 0.26)), matWarmGlow);
              lantern.position.set(sideX, archY + 1.14, pz);
              s4.add(lantern);
            }
          }
          const rail = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.14, 9.0)), matWood);
          rail.position.set(sideX, 1.02, 0);
          s4.add(rail);
        }
        break;
      }

      case 'staircase': {
        for (let stepIdx = 0; stepIdx < 5; stepIdx++) {
          const frac = stepIdx / 14;
          const sy = 0.24 + frac * 3.6;
          const sz = 4.8 - frac * 9.4;
          const riser = new THREE.Mesh(g(new THREE.BoxGeometry(4.6, sy, 0.72)), matCarved);
          riser.position.set(0, sy * 0.5, sz);
          riser.castShadow = true;
          riser.receiveShadow = true;
          s1.add(riser);
        }

        for (let stepIdx = 5; stepIdx < 10; stepIdx++) {
          const frac = stepIdx / 14;
          const sy = 0.24 + frac * 3.6;
          const sz = 4.8 - frac * 9.4;
          const riser = new THREE.Mesh(g(new THREE.BoxGeometry(4.8, sy, 0.74)), matStone);
          riser.position.set(0, sy * 0.5, sz);
          riser.castShadow = true;
          riser.receiveShadow = true;
          s2.add(riser);
        }

        for (let stepIdx = 10; stepIdx <= 14; stepIdx++) {
          const frac = stepIdx / 14;
          const sy = 0.24 + frac * 3.6;
          const sz = 4.8 - frac * 9.4;
          const riser = new THREE.Mesh(g(new THREE.BoxGeometry(4.6, sy, 0.74)), matCarved);
          riser.position.set(0, sy * 0.5, sz);
          riser.castShadow = true;
          riser.receiveShadow = true;
          s3.add(riser);
        }

        const slopeLen = Math.hypot(9.4, 3.6);
        const slopeAngle = Math.atan2(3.6, 9.4);
        for (const rx of [-2.25, 2.25]) {
          const handrail = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.16, slopeLen)), matDarkWood);
          handrail.position.set(rx, 2.65, 0.1);
          handrail.rotation.x = slopeAngle;
          const summitPillar = new THREE.Mesh(g(new THREE.BoxGeometry(0.55, 2.2, 0.55)), matCarved);
          summitPillar.position.set(rx, 4.7, -4.6);
          const brazier = new THREE.Mesh(g(new THREE.BoxGeometry(0.42, 0.36, 0.42)), matWarmGlow);
          brazier.position.set(rx, 5.95, -4.6);
          s4.add(handrail, summitPillar, brazier);
        }
        break;
      }

      case 'lantern_grove': {
        const westBase = new THREE.Mesh(g(new THREE.BoxGeometry(1.1, 0.45, 1.1)), matStone);
        westBase.position.set(-2.3, 0.22, 0.8);
        const westPole = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 2.8, 0.28)), matDarkWood);
        westPole.position.set(-2.3, 1.8, 0.8);
        const westOrb = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.45, 0)), matCyanCrystal);
        westOrb.position.set(-2.3, 3.45, 0.8);
        s1.add(westBase, westPole, westOrb);

        const eastBase = westBase.clone();
        eastBase.position.x = 2.3;
        const eastPole = westPole.clone();
        eastPole.position.x = 2.3;
        const eastOrb = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.45, 0)), matEmeraldCrystal);
        eastOrb.position.set(2.3, 3.45, 0.8);
        s2.add(eastBase, eastPole, eastOrb);

        const frame = new THREE.Mesh(g(new THREE.BoxGeometry(2.6, 2.2, 0.32)), matDarkWood);
        frame.position.set(0, 1.85, 1.35);
        s3.add(frame);
        for (const gx of [-0.55, 0.55]) {
          for (const gy of [1.35, 2.35]) {
            const cell = new THREE.Mesh(
              g(new THREE.BoxGeometry(0.82, 0.72, 0.38)),
              gx * gy > 0 ? matEmeraldCrystal : matWarmGlow
            );
            cell.position.set(gx, gy, 1.35);
            s3.add(cell);
          }
        }

        const towerBase = new THREE.Mesh(g(new THREE.BoxGeometry(2.8, 3.8, 2.8)), matCarved);
        towerBase.position.set(0, 1.9, -0.8);
        towerBase.castShadow = true;
        const belfry = new THREE.Mesh(g(new THREE.BoxGeometry(2.1, 1.8, 2.1)), matDarkWood);
        belfry.position.set(0, 4.7, -0.8);
        const spire = new THREE.Mesh(g(new THREE.ConeGeometry(1.85, 1.8, 4)), matRoofGreen);
        spire.position.set(0, 6.45, -0.8);
        spire.rotation.y = Math.PI / 4;
        signalPrismMesh = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.62, 0)), matCyanCrystal);
        signalPrismMesh.position.set(0, 4.7, -0.8);
        s4.add(towerBase, belfry, spire, signalPrismMesh);
        break;
      }

      case 'map_station': {
        const deck = new THREE.Mesh(g(new THREE.BoxGeometry(5.6, 0.42, 4.8)), matWood);
        deck.position.y = 0.21;
        deck.receiveShadow = true;
        deck.castShadow = true;
        s1.add(deck);

        const backWall = new THREE.Mesh(g(new THREE.BoxGeometry(4.8, 2.6, 2.2)), matDarkWood);
        backWall.position.set(0, 1.7, -0.9);
        backWall.castShadow = true;
        const postL = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 2.6, 0.28)), matDarkWood);
        postL.position.set(-2.2, 1.7, 1.9);
        const postR = postL.clone();
        postR.position.x = 2.2;
        s2.add(backWall, postL, postR);

        const boardL = new THREE.Mesh(g(new THREE.BoxGeometry(1.5, 1.2, 0.16)), matPlaster);
        boardL.position.set(-1.6, 1.75, 0.28);
        const boardR = new THREE.Mesh(g(new THREE.BoxGeometry(1.5, 1.2, 0.16)), matCircuitScreen);
        boardR.position.set(1.6, 1.75, 0.28);
        s3.add(boardL, boardR);

        const roof = new THREE.Mesh(g(new THREE.ConeGeometry(4.0, 1.85, 4)), matRoofGreen);
        roof.position.set(0, 3.9, -0.1);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;

        const mapTable = new THREE.Group();
        mapTable.position.set(0, 0.42, 1.15);
        const tablePed = new THREE.Mesh(g(new THREE.BoxGeometry(1.8, 0.72, 1.4)), matCarved);
        tablePed.position.y = 0.36;
        const tableTerrain = new THREE.Mesh(g(new THREE.BoxGeometry(1.65, 0.1, 1.25)), matEmeraldBanner);
        tableTerrain.position.y = 0.77;
        const miniRiver = new THREE.Mesh(g(new THREE.BoxGeometry(1.66, 0.12, 0.18)), matCyanCrystal);
        miniRiver.position.y = 0.78;
        const miniBeacon = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.34, 0.14)), matGoldTrim);
        miniBeacon.position.set(-0.5, 0.95, 0.38);
        const miniTower = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.42, 0.16)), matCyanCrystal);
        miniTower.position.set(-0.45, 0.98, -0.35);
        const miniMonument = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 0.46, 0.2)), matWarmGlow);
        miniMonument.position.set(0.52, 1.0, -0.18);
        mapTable.add(tablePed, tableTerrain, miniRiver, miniBeacon, miniTower, miniMonument);
        s4.add(roof, mapTable);
        break;
      }

      case 'repair_district': {
        const base = new THREE.Mesh(g(new THREE.BoxGeometry(5.6, 0.62, 4.6)), matStone);
        base.position.y = 0.31;
        base.receiveShadow = true;
        base.castShadow = true;
        s1.add(base);

        const millBody = new THREE.Mesh(g(new THREE.BoxGeometry(4.8, 2.7, 3.8)), matPlaster);
        millBody.position.y = 1.95;
        millBody.castShadow = true;
        const forgeWing = new THREE.Mesh(g(new THREE.BoxGeometry(2.0, 2.0, 2.6)), matStone);
        forgeWing.position.set(2.9, 1.6, -0.3);
        s2.add(millBody, forgeWing);

        waterwheelGroup = new THREE.Group();
        waterwheelGroup.position.set(-2.68, 1.85, 0);
        const wheelRim = new THREE.Mesh(g(new THREE.TorusGeometry(1.35, 0.16, 8, 16)), matDarkWood);
        wheelRim.rotation.y = Math.PI / 2;
        waterwheelGroup.add(wheelRim);
        for (let p = 0; p < 8; p++) {
          const ang = (p * Math.PI) / 4;
          const spoke = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 2.6, 0.14)), matWood);
          spoke.rotation.x = ang;
          waterwheelGroup.add(spoke);
        }
        const anvil = new THREE.Mesh(g(new THREE.BoxGeometry(0.75, 0.58, 0.42)), matIron);
        anvil.position.set(2.9, 0.9, 1.45);
        s3.add(waterwheelGroup, anvil);

        const roof = new THREE.Mesh(g(new THREE.ConeGeometry(3.85, 2.05, 4)), matRoofTerracotta);
        roof.position.y = 4.32;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        const hearth = new THREE.Mesh(g(new THREE.BoxGeometry(0.85, 0.85, 0.25)), matWarmGlow);
        hearth.position.set(2.9, 1.15, 0.95);
        const win1 = new THREE.Mesh(g(new THREE.BoxGeometry(0.8, 0.8, 0.18)), matWarmGlow);
        win1.position.set(-0.9, 2.2, 1.92);
        const win2 = win1.clone();
        win2.position.x = 0.9;
        s4.add(roof, hearth, win1, win2);
        break;
      }

      case 'registration_centre': {
        const patio = new THREE.Mesh(g(new THREE.BoxGeometry(6.0, 0.42, 5.0)), matCarved);
        patio.position.y = 0.21;
        patio.receiveShadow = true;
        const counter = new THREE.Mesh(g(new THREE.BoxGeometry(2.8, 1.05, 0.85)), matWood);
        counter.position.set(0, 0.92, 1.55);
        counter.castShadow = true;
        s1.add(patio, counter);

        for (const cx of [-2.4, 2.4]) {
          const col = new THREE.Mesh(g(new THREE.BoxGeometry(0.32, 2.9, 0.32)), matDarkWood);
          col.position.set(cx, 1.85, 1.85);
          s2.add(col);
        }
        const porchBeam = new THREE.Mesh(g(new THREE.BoxGeometry(5.4, 0.34, 0.9)), matWood);
        porchBeam.position.set(0, 3.35, 1.85);
        s2.add(porchBeam);

        const hall = new THREE.Mesh(g(new THREE.BoxGeometry(5.2, 2.9, 3.2)), matPlaster);
        hall.position.set(0, 1.85, -0.35);
        hall.castShadow = true;
        const hallRoof = new THREE.Mesh(g(new THREE.ConeGeometry(4.15, 1.95, 4)), matRoofGreen);
        hallRoof.position.set(0, 4.25, -0.1);
        hallRoof.rotation.y = Math.PI / 4;
        hallRoof.castShadow = true;
        s3.add(hall, hallRoof);

        const signMat = m(
          new THREE.MeshStandardMaterial({
            map: regTexture,
            emissive: '#10281D',
            emissiveIntensity: 0.45,
            roughness: 0.35,
          })
        );
        const registryBoard = new THREE.Mesh(g(new THREE.BoxGeometry(3.4, 1.65, 0.18)), signMat);
        registryBoard.position.set(0, 4.35, 1.92);

        const rowan = new THREE.Group();
        rowan.position.set(0, 0.42, 0.72);
        const rRobe = new THREE.Mesh(g(new THREE.BoxGeometry(0.56, 0.86, 0.36)), matEmeraldBanner);
        rRobe.position.y = 0.43;
        const rHead = new THREE.Mesh(
          g(new THREE.BoxGeometry(0.46, 0.46, 0.46)),
          m(new THREE.MeshStandardMaterial({ color: '#F2C6A0', roughness: 0.75 }))
        );
        rHead.position.y = 1.1;
        const rBeard = new THREE.Mesh(g(new THREE.BoxGeometry(0.38, 0.32, 0.14)), matPlaster);
        rBeard.position.set(0, 0.94, 0.22);
        const rHat = new THREE.Mesh(g(new THREE.ConeGeometry(0.38, 0.55, 4)), matGoldTrim);
        rHat.position.y = 1.56;
        rHat.rotation.y = Math.PI / 4;
        rowan.add(rRobe, rHead, rBeard, rHat);

        s4.add(registryBoard, rowan);
        break;
      }

      case 'grand_settlement': {
        const plaza = new THREE.Mesh(g(new THREE.CylinderGeometry(5.6, 5.8, 0.32, 8)), matCarved);
        plaza.position.y = 0.16;
        plaza.receiveShadow = true;
        const innerRing = new THREE.Mesh(g(new THREE.CylinderGeometry(3.2, 3.2, 0.36, 8)), matStone);
        innerRing.position.y = 0.18;
        s1.add(plaza, innerRing);

        for (let b = 0; b < 4; b++) {
          const ang = (b * Math.PI) / 2 + Math.PI / 4;
          const bx = Math.cos(ang) * 4.25;
          const bz = Math.sin(ang) * 4.25;
          const bench = new THREE.Mesh(g(new THREE.BoxGeometry(1.6, 0.45, 0.55)), matWood);
          bench.position.set(bx, 0.52, bz);
          bench.rotation.y = -ang + Math.PI / 2;
          const lPost = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 2.4, 0.2)), matDarkWood);
          lPost.position.set(Math.cos(ang) * 5.0, 1.4, Math.sin(ang) * 5.0);
          const lBulb = new THREE.Mesh(g(new THREE.BoxGeometry(0.34, 0.38, 0.34)), matWarmGlow);
          lBulb.position.set(Math.cos(ang) * 5.0, 2.72, Math.sin(ang) * 5.0);
          s2.add(bench, lPost, lBulb);
        }

        const ped1 = new THREE.Mesh(g(new THREE.BoxGeometry(2.6, 0.9, 2.6)), matStone);
        ped1.position.y = 0.75;
        ped1.castShadow = true;
        const obelisk = new THREE.Mesh(g(new THREE.BoxGeometry(1.5, 3.6, 1.5)), matCarved);
        obelisk.position.y = 2.95;
        obelisk.castShadow = true;

        monumentEmblemMesh = new THREE.Group();
        monumentEmblemMesh.position.y = 5.45;
        const crown = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.85, 0)), matGoldTrim);
        const halo = new THREE.Mesh(g(new THREE.TorusGeometry(1.25, 0.1, 8, 20)), matEmeraldCrystal);
        halo.rotation.x = Math.PI / 3;
        monumentEmblemMesh.add(crown, halo);
        s3.add(ped1, obelisk, monumentEmblemMesh);

        for (let f = 0; f < 4; f++) {
          const ang = (f * Math.PI) / 2;
          const fx = Math.cos(ang) * 4.9;
          const fz = Math.sin(ang) * 4.9;
          const mast = new THREE.Mesh(g(new THREE.BoxGeometry(0.18, 3.8, 0.18)), matDarkWood);
          mast.position.set(fx, 2.1, fz);
          const flag = new THREE.Mesh(
            g(new THREE.BoxGeometry(0.95, 1.45, 0.08)),
            f % 2 === 0 ? matEmeraldBanner : matGoldTrim
          );
          flag.position.set(fx + 0.48, 3.15, fz);
          s4.add(mast, flag);
        }

        const villagerColors = ['#69B9E7', '#F28C45', '#2F7D46'];
        for (let v = 0; v < 3; v++) {
          const va = v * 2.1 + 0.5;
          const vg = new THREE.Group();
          vg.position.set(Math.cos(va) * 2.65, 0.34, Math.sin(va) * 2.65);
          vg.rotation.y = -va - Math.PI / 2;
          const vBody = new THREE.Mesh(
            g(new THREE.BoxGeometry(0.46, 0.72, 0.3)),
            m(new THREE.MeshStandardMaterial({ color: villagerColors[v], roughness: 0.65 }))
          );
          vBody.position.y = 0.36;
          const vHead = new THREE.Mesh(
            g(new THREE.BoxGeometry(0.4, 0.4, 0.4)),
            m(new THREE.MeshStandardMaterial({ color: '#F3C69F', roughness: 0.75 }))
          );
          vHead.position.y = 0.94;
          vg.add(vBody, vHead);
          s4.add(vg);
        }
        if (!isSoftwareGl) {
          const grandLight = new THREE.PointLight('#F5C451', 3.0, 18, 2);
          grandLight.position.y = 5.2;
          s4.add(grandLight);
        }
        break;
      }
    }

    group.add(root);

    // =========================================================================
    // 4 PHYSICALLY DISTINCT 3D TASK OBJECTIVE STATIONS PER LEVEL
    // =========================================================================
    for (const task of spec.tasks) {
      const stGroup = new THREE.Group();
      stGroup.position.set(
        task.stationPosition[0],
        task.stationPosition[1],
        task.stationPosition[2]
      );
      addContactShadow(stGroup, 0.78, shadowTex);

      const screenMat = matCircuitScreen.clone();
      materials.push(screenMat);
      buildStationVisual(task.stationKind, stGroup, screenMat);

      const ringMat = m(
        new THREE.MeshBasicMaterial({
          color: '#4EF5A8',
          transparent: true,
          opacity: 0.35,
        })
      );
      const ringMesh = new THREE.Mesh(stationRingGeo, ringMat);
      ringMesh.position.y = 0.04;
      stGroup.add(ringMesh);

      const clickProxy = new THREE.Mesh(hitboxGeo, matInvisibleHitbox);
      clickProxy.position.y = 1.05;
      clickProxy.userData.interactable = {
        kind: 'task_station',
        siteId: spec.siteId,
        levelNumber: spec.levelNumber,
        taskNumber: task.taskNumber,
        taskId: task.id,
        stationLabel: task.stationLabel,
      };
      stGroup.add(clickProxy);

      // Face station toward Sprout's waypoint or player's spawn clearing
      const faceDx = task.sproutWaypoint[0] - task.stationPosition[0];
      const faceDz = task.sproutWaypoint[2] - task.stationPosition[2];
      stGroup.rotation.y = Math.atan2(faceDx, faceDz);

      group.add(stGroup);
      taskStations.push({
        siteId: spec.siteId,
        levelNumber: spec.levelNumber,
        taskNumber: task.taskNumber,
        taskId: task.id,
        stationLabel: task.stationLabel,
        worldPosition: task.stationPosition,
        group: stGroup,
        clickProxy,
        screenMat,
        ringMesh,
      });
    }

    sites[spec.siteId] = {
      siteId: spec.siteId,
      levelNumber: spec.levelNumber,
      root,
      stageGroups,
      ruinGroup,
      currentStageProgress: [0, 0, 0, 0],
    };
  }

  // ===========================================================================
  // 3D ACTIVE OBJECTIVE BEACON (Highlights exact world spot to walk to next!)
  // ===========================================================================
  const objectiveBeacon = new THREE.Group();
  objectiveBeacon.visible = false;

  const beaconFloorRing = new THREE.Mesh(
    g(new THREE.TorusGeometry(0.96, 0.055, 8, 28)),
    m(
      new THREE.MeshBasicMaterial({
        color: '#F5C451',
        transparent: true,
        opacity: 0.9,
      })
    )
  );
  beaconFloorRing.rotation.x = Math.PI / 2;
  beaconFloorRing.position.y = 0.06;

  const beaconColumn = new THREE.Mesh(
    g(new THREE.CylinderGeometry(0.48, 0.72, 3.2, 16, 1, true)),
    m(
      new THREE.MeshBasicMaterial({
        color: '#F5C451',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
  );
  beaconColumn.position.y = 1.65;

  const beaconChevron = new THREE.Mesh(
    g(new THREE.ConeGeometry(0.32, 0.62, 4)),
    m(
      new THREE.MeshStandardMaterial({
        color: '#FFE066',
        emissive: '#F5B82E',
        emissiveIntensity: 1.15,
        roughness: 0.22,
        metalness: 0.6,
      })
    )
  );
  beaconChevron.rotation.x = Math.PI;
  beaconChevron.position.y = 2.65;

  objectiveBeacon.add(beaconFloorRing, beaconColumn, beaconChevron);
  group.add(objectiveBeacon);

  const update = (
    dt: number,
    elapsed: number,
    stages: Record<World1SiteId, number>,
    activeSiteId: World1SiteId,
    activeTaskNumber: 1 | 2 | 3 | 4 | null,
    activeBeaconWorldPos: [number, number, number] | null,
    purchasedSupplyIds: string[],
    collectedSupplyIds: string[],
    freeRoamUnlocked: boolean
  ) => {
    for (const spec of WORLD1_LEVELS) {
      const ctrl = sites[spec.siteId]!;
      const targetStage = stages[spec.siteId] || 0;

      ctrl.ruinGroup.visible = spec.siteId !== 'workshop' && targetStage === 0;

      // Smooth damped vertical rise for each of the 4 stages without horizontal drift
      for (let i = 0; i < 4; i++) {
        const unlocked = targetStage >= i + 1 ? 1 : 0;
        const nextP = THREE.MathUtils.damp(ctrl.currentStageProgress[i], unlocked, 5.2, dt);
        ctrl.currentStageProgress[i] = nextP;
        const sg = ctrl.stageGroups[i];
        if (nextP < 0.015) {
          sg.visible = false;
        } else {
          sg.visible = true;
          const overshoot = unlocked === 1 && nextP > 0.75 && nextP < 0.99 ? 1.04 : 1.0;
          const sy = Math.max(0.03, nextP * overshoot);
          sg.scale.set(1, sy, 1);
          sg.position.y = (1 - nextP) * -1.15;
        }
      }
    }

    // Level 2 Compiler Workshop Double-Doors & Windows Animation
    const workshopStage = stages.workshop || 0;
    const doorsUnlocked = workshopStage >= 2 || freeRoamUnlocked;
    workshopOpenProgress = THREE.MathUtils.damp(
      workshopOpenProgress,
      doorsUnlocked ? 1 : 0,
      5.5,
      dt
    );
    if (workshopDoorLeftPivot && workshopDoorRightPivot) {
      workshopDoorLeftPivot.rotation.y = -workshopOpenProgress * 2.15;
      workshopDoorRightPivot.rotation.y = workshopOpenProgress * 2.15;
    }
    if (workshopLockBar) {
      workshopLockBar.visible = !doorsUnlocked;
    }
    if (workshopWinLeft && workshopWinRight) {
      const targetWinMat = workshopStage >= 4 ? matWarmGlow : matIron;
      if (workshopWinLeft.material !== targetWinMat) {
        workshopWinLeft.material = targetWinMat;
        workshopWinRight.material = targetWinMat;
      }
    }

    // Collectible 3D Supply Crates visibility & float animation
    for (const sc of supplyCrates) {
      const isAvailableOnFloor =
        purchasedSupplyIds.includes(sc.supplyId) && !collectedSupplyIds.includes(sc.supplyId);
      sc.group.visible = isAvailableOnFloor;
      if (isAvailableOnFloor) {
        sc.floatingGear.rotation.y = elapsed * 2.2;
        sc.floatingGear.position.y = 0.84 + Math.sin(elapsed * 3.4) * 0.08;
        sc.floatingCrystal.rotation.y = -elapsed * 1.8;
        sc.floatingCrystal.position.y = 0.86 + Math.cos(elapsed * 3.4) * 0.08;
        const pulse = 0.92 + 0.14 * Math.sin(elapsed * 4.0);
        sc.auraRing.scale.setScalar(pulse);
      }
    }

    // Update all 40 Task Objective Stations' screen glow & status rings
    for (const st of taskStations) {
      const siteStage = stages[st.siteId] || 0;
      const isSolved = siteStage >= st.taskNumber;
      const isCurrentTarget =
        st.siteId === activeSiteId && activeTaskNumber === st.taskNumber && !isSolved;
      const rMat = st.ringMesh.material as THREE.MeshBasicMaterial;

      if (isCurrentTarget) {
        st.screenMat.emissive.set('#F5C451');
        st.screenMat.emissiveIntensity = 0.95 + 0.35 * Math.sin(elapsed * 4.5);
        rMat.color.set('#F5C451');
        rMat.opacity = 0.85;
      } else if (isSolved) {
        st.screenMat.emissive.set('#27B87D');
        st.screenMat.emissiveIntensity = 0.65;
        rMat.color.set('#4EF5A8');
        rMat.opacity = 0.45;
      } else {
        st.screenMat.emissive.set('#18543B');
        st.screenMat.emissiveIntensity = 0.28;
        rMat.color.set('#3E6B55');
        rMat.opacity = 0.18;
      }
    }

    // Update Active 3D Objective Beacon
    if (activeBeaconWorldPos) {
      objectiveBeacon.visible = true;
      objectiveBeacon.position.set(
        activeBeaconWorldPos[0],
        activeBeaconWorldPos[1],
        activeBeaconWorldPos[2]
      );
      beaconChevron.rotation.y = elapsed * 2.4;
      beaconChevron.position.y = 2.6 + Math.sin(elapsed * 3.8) * 0.22;
      const ringScale = 0.94 + Math.sin(elapsed * 3.8) * 0.1;
      beaconFloorRing.scale.setScalar(ringScale);
    } else {
      objectiveBeacon.visible = false;
    }

    // Continuous mechanical & magical landmark animations
    if (beaconCrystalMesh) {
      beaconCrystalMesh.rotation.y = elapsed * 1.3;
      beaconCrystalMesh.position.y = 2.45 + Math.sin(elapsed * 2.4) * 0.16;
    }
    if (beaconSkyBeam) {
      beaconSkyBeam.rotation.y = -elapsed * 0.5;
    }
    for (let i = 0; i < compilerGears.length; i++) {
      compilerGears[i].rotation.z = elapsed * (i % 2 === 0 ? 1.5 : -2.1);
    }
    if (workshopJvmCrystal) {
      workshopJvmCrystal.rotation.y = elapsed * 1.9;
      workshopJvmCrystal.position.y = 1.68 + Math.sin(elapsed * 2.8) * 0.12;
    }
    if (portcullisGrate) {
      const gateDone = (stages.gatehouse || 0) >= 4;
      portcullisGrate.position.y = gateDone ? 1.25 : 0;
    }
    if (signalPrismMesh) {
      signalPrismMesh.rotation.y = elapsed * 1.8;
      signalPrismMesh.rotation.x = Math.sin(elapsed * 1.4) * 0.25;
    }
    if (waterwheelGroup && (stages.repair_district || 0) >= 3) {
      waterwheelGroup.rotation.x = elapsed * 1.35;
    }
    if (monumentEmblemMesh) {
      monumentEmblemMesh.rotation.y = elapsed * 1.1;
      monumentEmblemMesh.position.y = 5.45 + Math.sin(elapsed * 2.0) * 0.14;
    }
  };

  const updateRegistryBoard = (villagerName: string, crystalCount: number) => {
    drawRegistryCanvas(villagerName, crystalCount);
  };

  const dispose = () => {
    geometries.forEach((geo) => geo.dispose());
    materials.forEach((mat) => mat.dispose());
    textures.forEach((tex) => tex.dispose());
  };

  return {
    group,
    sites: sites as Record<World1SiteId, SiteStructureController>,
    taskStations,
    supplyCrates,
    update,
    updateRegistryBoard,
    dispose,
  };
}

