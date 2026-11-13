import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality, World1SiteId } from '../../types/codeland';
import { WORLD1_LEVELS, getWorld1LevelSpec } from '../../data/world1ForestData';
import {
  createRadialContactShadowTexture,
  detectSoftwareWebGL,
} from '../VoxelTexturesAndProps';
import { MobileControlState } from '../VoxelAdventureCanvas';
import {
  buildForestTerrainAndNature,
  groundHeightAt,
  isPositionWalkable,
} from './ForestTerrainAndNature';
import { buildForestStructures3D } from './ForestStructures3D';
import {
  buildCompanionSprite,
  buildConstructionCrew,
  buildForestPlayerRig,
  buildSproutGuideNpc,
  PlayerAnimReaction,
} from './ForestActorsAndBots';
import { soundFX } from '../../lib/audio';

export type ForestNearbyTarget =
  | { kind: 'sprout'; label: string }
  | {
      kind: 'supply_crate';
      supplyId: string;
      supplyLabel: string;
      label: string;
    }
  | {
      kind: 'task_station';
      siteId: World1SiteId;
      levelNumber: number;
      taskNumber: 1 | 2 | 3 | 4;
      taskId: string;
      stationLabel: string;
      label: string;
    }
  | null;

export interface ConstructionCutawaySignal {
  nonce: number;
  siteId: World1SiteId;
  stageNumber: number;
  focusPosition?: [number, number, number];
  cameraPosition?: [number, number, number];
}

export interface PlayerReactionSignal {
  nonce: number;
  kind: PlayerAnimReaction;
}

export interface SproutMoodSignal {
  nonce: number;
  mood: 'talking' | 'happy' | 'encouraging';
  durationSec?: number;
}

export interface TeleportSignal {
  nonce: number;
  position: [number, number, number];
}

interface BeginnerForestCanvasProps {
  activeLevelNumber: number;
  activeTaskNumber: 1 | 2 | 3 | 4 | null;
  lessonReady: boolean;
  avatarId: string;
  graphicsQuality: GraphicsQuality;
  visualStages: Record<World1SiteId, number>;
  purchasedSupplyIds: string[];
  collectedSupplyIds: string[];
  carryingSupply: boolean;
  equippedForestOutfit: boolean;
  equippedCompanionAccessory: boolean;
  registeredVillagerName: string;
  registeredCrystalCount: number;
  freeRoamUnlocked: boolean;
  isModalBlockingMovement: boolean;
  constructionSignal: ConstructionCutawaySignal | null;
  reactionSignal: PlayerReactionSignal | null;
  sproutMoodSignal: SproutMoodSignal | null;
  teleportSignal: TeleportSignal | null;
  tourActive: boolean;
  onTourLandmarkChange?: (levelNumber: number) => void;
  onTourComplete?: () => void;
  collectedCoinIndices: Set<number>;
  onCollectCoin: (coinIndex: number) => void;
  onNearbyChange: (nearby: ForestNearbyTarget) => void;
  onInteractTrigger: (target: ForestNearbyTarget) => void;
  onDistantClickHint?: (message: string) => void;
  onObjectiveDistanceSample?: (
    distMeters: number | null,
    targetPos: [number, number, number] | null
  ) => void;
  onPlayerPositionSample?: (pos: [number, number, number]) => void;
  mobileControlsRef: React.MutableRefObject<MobileControlState>;
}

// Collectible Byte Coins placed along trails, crossings, overlooks, and the Crystal Grotto!
export const WORLD1_COIN_SPOTS: [number, number, number][] = [
  [-21, 0.7, 31],
  [-15, 0.7, 30.5],
  [-1, 0.7, 26],
  [7, 0.7, 21.5],
  [14, 0.7, 11],
  [14, 1.0, 0], // Center of wooden bridge!
  [4, 0.7, -6.5],
  [-10, 2.2, -13], // Mid cliff staircase!
  [-21, 4.3, -20.5],
  [-18, 4.3, -29],
  [1, 2.2, -32.8],
  [19, 0.7, -23],
  [27, 0.7, -14],
  [-36.5, 0.8, 12.5], // Hidden Crystal Grotto cache!
  [-33, 0.7, 15],
];

// Reusable module-scope scratch helpers (Zero GC inside tick loop)
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _sproutWaypointVec = new THREE.Vector3();
const _objectivePosVec = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

export const BeginnerForestCanvas: React.FC<BeginnerForestCanvasProps> = ({
  activeLevelNumber,
  activeTaskNumber,
  lessonReady,
  avatarId,
  graphicsQuality,
  visualStages,
  purchasedSupplyIds,
  collectedSupplyIds,
  carryingSupply,
  equippedForestOutfit,
  equippedCompanionAccessory,
  registeredVillagerName,
  registeredCrystalCount,
  freeRoamUnlocked,
  isModalBlockingMovement,
  constructionSignal,
  reactionSignal,
  sproutMoodSignal,
  teleportSignal,
  tourActive,
  onTourLandmarkChange,
  onTourComplete,
  collectedCoinIndices,
  onCollectCoin,
  onNearbyChange,
  onInteractTrigger,
  onDistantClickHint,
  onObjectiveDistanceSample,
  onPlayerPositionSample,
  mobileControlsRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Mutable refs so React UI re-renders never destroy or rebuild the WebGL context
  const activeLevelRef = useRef(activeLevelNumber);
  activeLevelRef.current = activeLevelNumber;

  const activeTaskNumberRef = useRef(activeTaskNumber);
  activeTaskNumberRef.current = activeTaskNumber;

  const lessonReadyRef = useRef(lessonReady);
  lessonReadyRef.current = lessonReady;

  const stagesRef = useRef(visualStages);
  stagesRef.current = visualStages;

  const purchasedSupplyRef = useRef(purchasedSupplyIds);
  purchasedSupplyRef.current = purchasedSupplyIds;

  const collectedSupplyRef = useRef(collectedSupplyIds);
  collectedSupplyRef.current = collectedSupplyIds;

  const freeRoamRef = useRef(freeRoamUnlocked);
  freeRoamRef.current = freeRoamUnlocked;

  const modalBlockingRef = useRef(isModalBlockingMovement);
  modalBlockingRef.current = isModalBlockingMovement;

  const coinsSetRef = useRef(collectedCoinIndices);
  coinsSetRef.current = collectedCoinIndices;

  const tourActiveRef = useRef(tourActive);
  tourActiveRef.current = tourActive;

  const callbacksRef = useRef({
    onCollectCoin,
    onNearbyChange,
    onInteractTrigger,
    onDistantClickHint,
    onObjectiveDistanceSample,
    onPlayerPositionSample,
    onTourLandmarkChange,
    onTourComplete,
  });
  callbacksRef.current = {
    onCollectCoin,
    onNearbyChange,
    onInteractTrigger,
    onDistantClickHint,
    onObjectiveDistanceSample,
    onPlayerPositionSample,
    onTourLandmarkChange,
    onTourComplete,
  };

  // Imperative scene handles for live prop updates without remounting
  const handlesRef = useRef<{
    playerRig: ReturnType<typeof buildForestPlayerRig>;
    companionRig: ReturnType<typeof buildCompanionSprite>;
    sproutRig: ReturnType<typeof buildSproutGuideNpc>;
    crewRig: ReturnType<typeof buildConstructionCrew>;
    structuresSys: ReturnType<typeof buildForestStructures3D>;
    teleportPlayerTo: (x: number, y: number, z: number) => void;
    startCutawayFocus: (
      siteId: World1SiteId,
      stageNumber: number,
      focusPosition?: [number, number, number],
      cameraPosition?: [number, number, number]
    ) => void;
    resetTourTimer: () => void;
  } | null>(null);

  // Sync equippable cosmetics, carried supply crate & Scanner 3D Registry Board dynamically
  useEffect(() => {
    handlesRef.current?.playerRig.setForestOutfitVisible(equippedForestOutfit);
  }, [equippedForestOutfit]);

  useEffect(() => {
    handlesRef.current?.playerRig.setCarryingSupplyVisible(carryingSupply);
  }, [carryingSupply]);

  useEffect(() => {
    handlesRef.current?.companionRig.setAccessoryVisible(equippedCompanionAccessory);
  }, [equippedCompanionAccessory]);

  useEffect(() => {
    handlesRef.current?.structuresSys.updateRegistryBoard(
      registeredVillagerName,
      registeredCrystalCount
    );
  }, [registeredVillagerName, registeredCrystalCount]);

  // Trigger 3D Construction Crew + Cutaway Camera + Player/Companion/Sprout Celebration when a task passes!
  useEffect(() => {
    if (!constructionSignal || !handlesRef.current) return;
    handlesRef.current.startCutawayFocus(
      constructionSignal.siteId,
      constructionSignal.stageNumber,
      constructionSignal.focusPosition,
      constructionSignal.cameraPosition
    );
    handlesRef.current.playerRig.triggerReaction('celebrate', 3.0);
    handlesRef.current.companionRig.triggerReaction('celebrate', 3.0);
    handlesRef.current.sproutRig.triggerMood('happy', 3.4);
  }, [constructionSignal]);

  // Trigger player + companion reaction (e.g. mistake animation when Java code fails)
  useEffect(() => {
    if (!reactionSignal || !handlesRef.current) return;
    handlesRef.current.playerRig.triggerReaction(reactionSignal.kind, 2.0);
    handlesRef.current.companionRig.triggerReaction(reactionSignal.kind, 2.0);
    if (reactionSignal.kind === 'mistake') {
      handlesRef.current.sproutRig.triggerMood('encouraging', 2.8);
    }
  }, [reactionSignal]);

  // Explicit Sprout mood signals (talking / happy / encouraging)
  useEffect(() => {
    if (!sproutMoodSignal || !handlesRef.current) return;
    handlesRef.current.sproutRig.triggerMood(
      sproutMoodSignal.mood,
      sproutMoodSignal.durationSec ?? 2.8
    );
  }, [sproutMoodSignal]);

  // Fast-travel / Level switch teleport
  useEffect(() => {
    if (!teleportSignal || !handlesRef.current) return;
    const [tx, ty, tz] = teleportSignal.position;
    handlesRef.current.teleportPlayerTo(tx, ty, tz);
  }, [teleportSignal]);

  // Reset cinematic tour progress when activated
  useEffect(() => {
    if (tourActive && handlesRef.current) {
      handlesRef.current.resetTourTimer();
    }
  }, [tourActive]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const highQuality = graphicsQuality === 'high';

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && highQuality,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, highQuality ? 2 : 1.25)
    );
    renderer.shadowMap.enabled = !isSoftwareGl && highQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = Math.max(1, container.clientWidth);
    const initH = Math.max(1, container.clientHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.className = 'w-full h-full block focus:outline-none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Scene, Sky & Atmospheric Horizon Fog
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color('#BCE4F7');
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2('#C9E9F6', 0.0095);

    const camera = new THREE.PerspectiveCamera(52, initW / initH, 0.2, 220);

    // Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.55;
    pmremGenerator.dispose();

    // Warm Golden Sun Key Light + Cool Sky/Forest Floor Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight('#BEE6FF', '#3A6B42', 0.9);
    hemiLight.position.set(0, 45, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF3D1', 1.75);
    sunLight.position.set(24, 38, 22);
    if (!isSoftwareGl && highQuality) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      const d = 28;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 95;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.025;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight('#9AD8FF', 0.45);
    rimLight.position.set(-28, 18, -24);
    scene.add(rimLight);

    // Build Modular Forest Subsystems
    const shadowTex = createRadialContactShadowTexture();
    const natureSys = buildForestTerrainAndNature(renderer, shadowTex, isSoftwareGl);
    scene.add(natureSys.group);

    const structuresSys = buildForestStructures3D(
      renderer,
      shadowTex,
      isSoftwareGl,
      registeredVillagerName,
      registeredCrystalCount
    );
    scene.add(structuresSys.group);

    const playerRig = buildForestPlayerRig(avatarId, shadowTex);
    playerRig.setForestOutfitVisible(equippedForestOutfit);
    playerRig.setCarryingSupplyVisible(carryingSupply);
    scene.add(playerRig.root);

    const companionRig = buildCompanionSprite();
    companionRig.setAccessoryVisible(equippedCompanionAccessory);
    scene.add(companionRig.root);

    const sproutRig = buildSproutGuideNpc(shadowTex);
    scene.add(sproutRig.root);

    const crewRig = buildConstructionCrew();
    scene.add(crewRig.root);

    // 3D Player Ground Compass Wayfinder Ring & Directional Arrow (points to next objective)
    const wayfinderGroup = new THREE.Group();
    const wfRingGeo = new THREE.RingGeometry(0.74, 0.84, 24);
    wfRingGeo.rotateX(-Math.PI / 2);
    const wfRingMat = new THREE.MeshBasicMaterial({
      color: '#4EF5A8',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const wfRingMesh = new THREE.Mesh(wfRingGeo, wfRingMat);

    const wfArrowGeo = new THREE.ConeGeometry(0.16, 0.36, 4);
    wfArrowGeo.rotateX(Math.PI / 2);
    const wfArrowMat = new THREE.MeshStandardMaterial({
      color: '#F5C451',
      emissive: '#D99B1E',
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.65,
    });
    const wfArrowMesh = new THREE.Mesh(wfArrowGeo, wfArrowMat);
    wfArrowMesh.position.set(0, 0.08, 1.04);

    const wfStemGeo = new THREE.BoxGeometry(0.08, 0.03, 0.22);
    const wfStemMesh = new THREE.Mesh(wfStemGeo, wfArrowMat);
    wfStemMesh.position.set(0, 0.07, 0.82);

    wayfinderGroup.add(wfRingMesh, wfArrowMesh, wfStemMesh);
    wayfinderGroup.visible = false;
    scene.add(wayfinderGroup);

    // Collectible Forest Byte Coins
    const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 12);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: '#F5C451',
      emissive: '#B88214',
      emissiveIntensity: 0.4,
      roughness: 0.22,
      metalness: 0.88,
    });
    const coinMeshes: THREE.Mesh[] = WORLD1_COIN_SPOTS.map(([cx, cy, cz]) => {
      const cm = new THREE.Mesh(coinGeo, coinMat);
      cm.position.set(cx, cy, cz);
      cm.castShadow = true;
      scene.add(cm);
      return cm;
    });

    // Spawn Player & Sprout at active level
    const startSpec = getWorld1LevelSpec(activeLevelRef.current);
    const startGround = groundHeightAt(
      startSpec.spawnPosition[0],
      startSpec.spawnPosition[2],
      stagesRef.current.bridge || 0,
      stagesRef.current.staircase || 0,
      stagesRef.current.workshop || 0
    );
    playerRig.root.position.set(
      startSpec.spawnPosition[0],
      startGround,
      startSpec.spawnPosition[2]
    );
    playerRig.root.rotation.y = Math.atan2(
      startSpec.sproutPosition[0] - startSpec.spawnPosition[0],
      startSpec.sproutPosition[2] - startSpec.spawnPosition[2]
    );

    const sproutGround = groundHeightAt(
      startSpec.sproutPosition[0],
      startSpec.sproutPosition[2],
      stagesRef.current.bridge || 0,
      stagesRef.current.staircase || 0,
      stagesRef.current.workshop || 0
    );
    sproutRig.root.position.set(
      startSpec.sproutPosition[0],
      Math.max(startSpec.sproutPosition[1], sproutGround),
      startSpec.sproutPosition[2]
    );
    companionRig.root.position.set(
      startSpec.spawnPosition[0] + 1.1,
      startGround + 1.65,
      startSpec.spawnPosition[2] + 1.1
    );

    // Camera orbit state
    let camYaw = 0.0;
    let camPitch = 0.46;
    let camDistance = 10.5;
    let isPointerDragging = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let prevPointerX = 0;
    let prevPointerY = 0;

    // Raycaster for direct 3D clicks on Sprout, Task Stations & Supply Crates
    const raycaster = new THREE.Raycaster();
    raycaster.far = 90;
    const clickableProxies: THREE.Object3D[] = [];

    // Player physics state
    let velY = 0;
    let isGrounded = true;
    const keysDown = new Set<string>();

    // Cutaway construction camera state
    let cutawayTimer = 0;
    let cutawayFocusPos: [number, number, number] = startSpec.sitePosition;
    let cutawayCamPos: [number, number, number] = startSpec.cameraLandmarkOffset;

    // World 1 Finale 10-landmark tour timer
    let tourElapsed = 0;
    let lastReportedTourLevel = -1;

    camera.position.set(
      playerRig.root.position.x,
      playerRig.root.position.y + 5.5,
      playerRig.root.position.z + 10.5
    );
    camera.lookAt(
      playerRig.root.position.x,
      playerRig.root.position.y + 1.2,
      playerRig.root.position.z
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const teleportPlayerTo = (tx: number, ty: number, tz: number) => {
      const gh = groundHeightAt(
        tx,
        tz,
        stagesRef.current.bridge || 0,
        stagesRef.current.staircase || 0,
        stagesRef.current.workshop || 0
      );
      const finalY = Math.max(ty, gh);
      playerRig.root.position.set(tx, finalY, tz);
      companionRig.root.position.set(tx + 1.0, finalY + 1.6, tz + 1.0);
      velY = 0;
      isGrounded = true;
    };

    const startCutawayFocus = (
      siteId: World1SiteId,
      stageNumber: number,
      focusPosition?: [number, number, number],
      cameraPosition?: [number, number, number]
    ) => {
      const found =
        WORLD1_LEVELS.find((l) => l.siteId === siteId) ||
        getWorld1LevelSpec(activeLevelRef.current);
      cutawayFocusPos = focusPosition || found.sitePosition;
      cutawayCamPos = cameraPosition || found.cameraLandmarkOffset;
      cutawayTimer = 3.35;
      crewRig.triggerSiteBuild(
        cutawayFocusPos[0],
        cutawayFocusPos[1],
        cutawayFocusPos[2],
        stageNumber
      );
    };

    const resetTourTimer = () => {
      tourElapsed = 0;
      lastReportedTourLevel = -1;
    };

    handlesRef.current = {
      playerRig,
      companionRig,
      sproutRig,
      crewRig,
      structuresSys,
      teleportPlayerTo,
      startCutawayFocus,
      resetTourTimer,
    };

    // Keyboard & Pointer Input Listeners
    const isTypingInEditor = (): boolean => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (el as HTMLElement).isContentEditable ||
        Boolean(el.closest('.cm-editor'))
      );
    };

    let lastNearby: ForestNearbyTarget = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInEditor()) return;
      const code = e.code;
      keysDown.add(code);
      if (code === 'KeyE' && !modalBlockingRef.current && lastNearby) {
        e.preventDefault();
        playerRig.triggerReaction('interact', 0.9);
        if (lastNearby.kind === 'sprout') {
          sproutRig.triggerMood('talking', 3.0);
        }
        callbacksRef.current.onInteractTrigger(lastNearby);
      }
      if (code === 'Space' && !modalBlockingRef.current && isGrounded) {
        e.preventDefault();
        velY = 6.6;
        isGrounded = false;
        soundFX.playJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      isPointerDragging = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDragging) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      camYaw -= dx * 0.0055;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0045, 0.18, 1.15);
    };

    const handleCanvasClickPick = (clientX: number, clientY: number) => {
      if (modalBlockingRef.current || tourActiveRef.current || cutawayTimer > 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      clickableProxies.length = 0;
      clickableProxies.push(sproutRig.clickProxy);
      for (let i = 0; i < structuresSys.supplyCrates.length; i++) {
        const sc = structuresSys.supplyCrates[i];
        if (sc.group.visible) {
          clickableProxies.push(sc.clickProxy);
        }
      }
      for (let i = 0; i < structuresSys.taskStations.length; i++) {
        const ts = structuresSys.taskStations[i];
        if (ts.group.visible) {
          clickableProxies.push(ts.clickProxy);
        }
      }

      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length === 0) return;

      const meta = hits[0].object.userData.interactable as
        | { kind: 'sprout' }
        | { kind: 'supply_crate'; supplyId: string; supplyLabel: string }
        | {
            kind: 'task_station';
            siteId: World1SiteId;
            levelNumber: number;
            taskNumber: 1 | 2 | 3 | 4;
            taskId: string;
            stationLabel: string;
          }
        | undefined;
      if (!meta) return;

      const px = playerRig.root.position.x;
      const pz = playerRig.root.position.z;

      if (meta.kind === 'sprout') {
        const dist = Math.hypot(px - sproutRig.root.position.x, pz - sproutRig.root.position.z);
        if (dist <= 6.5) {
          playerRig.triggerReaction('interact', 0.9);
          sproutRig.triggerMood('talking', 3.2);
          callbacksRef.current.onInteractTrigger({
            kind: 'sprout',
            label: 'Talk to Sprout [E]',
          });
        } else {
          sproutRig.triggerMood('talking', 2.0);
          callbacksRef.current.onDistantClickHint?.(
            `Walk closer to Sprout (${Math.round(dist)}m away) to talk!`
          );
        }
        return;
      }

      if (meta.kind === 'supply_crate') {
        const crateEntry = structuresSys.supplyCrates.find((c) => c.supplyId === meta.supplyId);
        if (!crateEntry) return;
        const dist = Math.hypot(
          px - crateEntry.worldPosition[0],
          pz - crateEntry.worldPosition[2]
        );
        if (dist <= 4.1) {
          playerRig.triggerReaction('interact', 0.9);
          callbacksRef.current.onInteractTrigger({
            kind: 'supply_crate',
            supplyId: meta.supplyId,
            supplyLabel: meta.supplyLabel,
            label: `Pick Up ${meta.supplyLabel} [E]`,
          });
        } else {
          callbacksRef.current.onDistantClickHint?.(
            `Walk physically to the Supply Pallet (${Math.round(dist)}m away) to pick up ${meta.supplyLabel}!`
          );
        }
        return;
      }

      if (meta.kind === 'task_station') {
        const stEntry = structuresSys.taskStations.find((s) => s.taskId === meta.taskId);
        if (!stEntry) return;
        const dist = Math.hypot(px - stEntry.worldPosition[0], pz - stEntry.worldPosition[2]);
        if (dist <= 4.2) {
          playerRig.triggerReaction('interact', 0.9);
          callbacksRef.current.onInteractTrigger({
            kind: 'task_station',
            siteId: meta.siteId,
            levelNumber: meta.levelNumber,
            taskNumber: meta.taskNumber,
            taskId: meta.taskId,
            stationLabel: meta.stationLabel,
            label: `Open ${meta.stationLabel} [E]`,
          });
        } else {
          callbacksRef.current.onDistantClickHint?.(
            `Walk physically to ${meta.stationLabel} (${Math.round(dist)}m away) to interact!`
          );
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPointerDragging) {
        const dragDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
        isPointerDragging = false;
        if (dragDist < 6 && e.target === renderer.domElement) {
          handleCanvasClickPick(e.clientX, e.clientY);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.008, 5.5, 22);
    };

    const onResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    // =========================================================================
    // PACED GAME LOOP (gl.fenceSync + 80ms pause on Software WebGL)
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;
    let posSampleAccum = 0;
    let objDistSampleAccum = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function areNearbyEqual(a: ForestNearbyTarget, b: ForestNearbyTarget): boolean {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.kind !== b.kind) return false;
      if (a.kind === 'sprout' && b.kind === 'sprout') return true;
      if (a.kind === 'supply_crate' && b.kind === 'supply_crate') {
        return a.supplyId === b.supplyId;
      }
      if (a.kind === 'task_station' && b.kind === 'task_station') {
        return a.taskId === b.taskId;
      }
      return false;
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;

      const curStages = stagesRef.current;
      const curSpec = getWorld1LevelSpec(activeLevelRef.current);
      const curTaskNum = activeTaskNumberRef.current;
      const isLessonReady = lessonReadyRef.current;
      const purchasedIds = purchasedSupplyRef.current;
      const collectedIds = collectedSupplyRef.current;

      const bridgeStage = curStages.bridge || 0;
      const stairStage = curStages.staircase || 0;
      const workshopStage = curStages.workshop || 0;

      // Determine active 3D Beacon & Sprout Waypoint
      const needsWorkshopCratePickup =
        curSpec.siteId === 'workshop' &&
        purchasedIds.includes('workshop_supplies') &&
        !collectedIds.includes('workshop_supplies');

      let activeBeaconWorldPos: [number, number, number] | null = null;
      let sproutTargetTuple: [number, number, number] = curSpec.sproutPosition;

      if (!isLessonReady) {
        sproutTargetTuple = curSpec.sproutPosition;
        activeBeaconWorldPos = [
          sproutRig.root.position.x,
          sproutRig.root.position.y,
          sproutRig.root.position.z,
        ];
      } else if (needsWorkshopCratePickup) {
        const palletTask = curSpec.tasks[2];
        sproutTargetTuple = palletTask.sproutWaypoint;
        activeBeaconWorldPos = [-7.5, 0.24, 26.8];
      } else if (curTaskNum !== null) {
        const activeTaskSpec = curSpec.tasks[curTaskNum - 1];
        sproutTargetTuple = activeTaskSpec.sproutWaypoint;
        activeBeaconWorldPos = activeTaskSpec.stationPosition;
      } else {
        sproutTargetTuple = curSpec.sproutPosition;
        activeBeaconWorldPos = null;
      }

      _sproutWaypointVec.set(
        sproutTargetTuple[0],
        sproutTargetTuple[1],
        sproutTargetTuple[2]
      );

      let objectiveVecOrNull: THREE.Vector3 | null = null;
      if (activeBeaconWorldPos && isLessonReady) {
        _objectivePosVec.set(
          activeBeaconWorldPos[0],
          activeBeaconWorldPos[1],
          activeBeaconWorldPos[2]
        );
        objectiveVecOrNull = _objectivePosVec;
      }

      // Mobile / Touch interact & jump triggers
      const mob = mobileControlsRef.current;
      if (mob.jumpRequested && !modalBlockingRef.current && isGrounded) {
        velY = 6.6;
        isGrounded = false;
        soundFX.playJump();
      }
      mob.jumpRequested = false;

      if (mob.interactRequested && !modalBlockingRef.current && lastNearby) {
        playerRig.triggerReaction('interact', 0.9);
        if (lastNearby.kind === 'sprout') {
          sproutRig.triggerMood('talking', 3.0);
        }
        callbacksRef.current.onInteractTrigger(lastNearby);
      }
      mob.interactRequested = false;

      // Player Movement (when not blocked by an open modal or tour)
      let moveSpeedNorm = 0;
      const isSprinting = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');

      if (!modalBlockingRef.current && !tourActiveRef.current && cutawayTimer <= 0) {
        let inputForward = 0;
        let inputRight = 0;
        if (keysDown.has('KeyW') || keysDown.has('ArrowUp') || mob.forward) inputForward += 1;
        if (keysDown.has('KeyS') || keysDown.has('ArrowDown') || mob.backward) inputForward -= 1;
        if (keysDown.has('KeyD') || keysDown.has('ArrowRight') || mob.right) inputRight += 1;
        if (keysDown.has('KeyA') || keysDown.has('ArrowLeft') || mob.left) inputRight -= 1;

        if (inputForward !== 0 || inputRight !== 0) {
          const len = Math.hypot(inputForward, inputRight);
          inputForward /= len;
          inputRight /= len;

          // Camera-relative planar directions
          const sinY = Math.sin(camYaw);
          const cosY = Math.cos(camYaw);
          _moveVec.set(
            -sinY * inputForward + cosY * inputRight,
            0,
            -cosY * inputForward - sinY * inputRight
          );

          const speed = isSprinting ? 9.2 : 6.2;
          const stepX = playerRig.root.position.x + _moveVec.x * speed * dt;
          const stepZ = playerRig.root.position.z + _moveVec.z * speed * dt;

          // Axis-separated sliding collision against rivers, Workshop Creek, locked Workshop walls & cliffs
          if (
            isPositionWalkable(
              stepX,
              playerRig.root.position.z,
              bridgeStage,
              stairStage,
              freeRoamRef.current,
              workshopStage
            )
          ) {
            playerRig.root.position.x = stepX;
          }
          if (
            isPositionWalkable(
              playerRig.root.position.x,
              stepZ,
              bridgeStage,
              stairStage,
              freeRoamRef.current,
              workshopStage
            )
          ) {
            playerRig.root.position.z = stepZ;
          }

          const targetFacing = Math.atan2(_moveVec.x, _moveVec.z);
          let yawDiff = targetFacing - playerRig.root.rotation.y;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          playerRig.root.rotation.y += yawDiff * Math.min(1, dt * 12);
          moveSpeedNorm = isSprinting ? 1 : 0.72;
        }
      }

      // Gravity & Ground Height Follow
      const groundY = groundHeightAt(
        playerRig.root.position.x,
        playerRig.root.position.z,
        bridgeStage,
        stairStage,
        workshopStage
      );
      if (!isGrounded || playerRig.root.position.y > groundY + 0.04) {
        velY -= 18.5 * dt;
        playerRig.root.position.y += velY * dt;
        if (playerRig.root.position.y <= groundY) {
          playerRig.root.position.y = groundY;
          velY = 0;
          isGrounded = true;
        }
      } else {
        playerRig.root.position.y = THREE.MathUtils.damp(
          playerRig.root.position.y,
          groundY,
          16,
          dt
        );
      }

      // Update Player, Companion, Sprout (physical terrain walking + 6 animations), Crew, Nature & Landmarks
      playerRig.update(dt, elapsed, moveSpeedNorm, isSprinting, isGrounded);
      companionRig.update(
        dt,
        elapsed,
        playerRig.root.position,
        playerRig.root.rotation.y
      );
      sproutRig.update(
        dt,
        elapsed,
        playerRig.root.position,
        _sproutWaypointVec,
        objectiveVecOrNull,
        (sx, sz) => groundHeightAt(sx, sz, bridgeStage, stairStage, workshopStage)
      );
      crewRig.update(dt, elapsed);
      natureSys.update(dt, elapsed);
      structuresSys.update(
        dt,
        elapsed,
        curStages,
        curSpec.siteId,
        isLessonReady ? curTaskNum : null,
        activeBeaconWorldPos,
        purchasedIds,
        collectedIds,
        freeRoamRef.current
      );

      // Update 3D Player Ground Compass Wayfinder Arrow
      if (activeBeaconWorldPos && !tourActiveRef.current) {
        const bdx = activeBeaconWorldPos[0] - playerRig.root.position.x;
        const bdz = activeBeaconWorldPos[2] - playerRig.root.position.z;
        const bDist = Math.hypot(bdx, bdz);
        if (bDist > 2.3) {
          wayfinderGroup.visible = true;
          wayfinderGroup.position.set(
            playerRig.root.position.x,
            playerRig.root.position.y + 0.05,
            playerRig.root.position.z
          );
          const targetArrowYaw = Math.atan2(bdx, bdz);
          let adiff = targetArrowYaw - wayfinderGroup.rotation.y;
          while (adiff > Math.PI) adiff -= Math.PI * 2;
          while (adiff < -Math.PI) adiff += Math.PI * 2;
          wayfinderGroup.rotation.y += adiff * Math.min(1, dt * 12);
          wfArrowMesh.position.z = 1.02 + Math.sin(elapsed * 5.0) * 0.07;
        } else {
          wayfinderGroup.visible = false;
        }

        objDistSampleAccum += dt;
        if (objDistSampleAccum >= 0.25) {
          objDistSampleAccum = 0;
          callbacksRef.current.onObjectiveDistanceSample?.(
            Math.round(bDist * 10) / 10,
            activeBeaconWorldPos
          );
        }
      } else {
        wayfinderGroup.visible = false;
        objDistSampleAccum += dt;
        if (objDistSampleAccum >= 0.5) {
          objDistSampleAccum = 0;
          callbacksRef.current.onObjectiveDistanceSample?.(null, null);
        }
      }

      // Update Collectible Byte Coins
      const collected = coinsSetRef.current;
      for (let i = 0; i < coinMeshes.length; i++) {
        const cm = coinMeshes[i];
        if (collected.has(i)) {
          cm.visible = false;
          continue;
        }
        cm.visible = true;
        cm.rotation.z = elapsed * 2.4 + i;
        cm.position.y = WORLD1_COIN_SPOTS[i][1] + Math.sin(elapsed * 3.2 + i) * 0.1;

        const dCoin = playerRig.root.position.distanceTo(cm.position);
        if (dCoin < 1.55) {
          soundFX.playCoinCollect();
          callbacksRef.current.onCollectCoin(i);
        }
      }

      // Detect Nearby Interactable:
      // 1) Visible Supply Crates (< 3.4m)
      // 2) Sprout when lesson isn't started yet (< 3.5m)
      // 3) 40 3D Task Objective Stations (< 3.8m, prioritizing active task station)
      // 4) Sprout during active exploration (< 3.4m)
      let detected: ForestNearbyTarget = null;
      const px = playerRig.root.position.x;
      const pz = playerRig.root.position.z;

      for (let i = 0; i < structuresSys.supplyCrates.length; i++) {
        const sc = structuresSys.supplyCrates[i];
        if (!sc.group.visible) continue;
        const dCrate = Math.hypot(px - sc.worldPosition[0], pz - sc.worldPosition[2]);
        if (dCrate < 3.45) {
          detected = {
            kind: 'supply_crate',
            supplyId: sc.supplyId,
            supplyLabel: sc.supplyLabel,
            label: `Pick Up ${sc.supplyLabel} [E]`,
          };
          break;
        }
      }

      const dSprout = Math.hypot(px - sproutRig.root.position.x, pz - sproutRig.root.position.z);

      if (!detected && !isLessonReady && dSprout < 3.55) {
        detected = { kind: 'sprout', label: 'Talk to Sprout — Start Briefing [E]' };
      }

      if (!detected) {
        let bestScore = 3.8;
        for (let i = 0; i < structuresSys.taskStations.length; i++) {
          const ts = structuresSys.taskStations[i];
          if (!ts.group.visible) continue;
          const dStation = Math.hypot(px - ts.worldPosition[0], pz - ts.worldPosition[2]);
          if (dStation >= 3.8) continue;

          const isTargetStation =
            ts.siteId === curSpec.siteId && curTaskNum === ts.taskNumber && isLessonReady;
          const score = isTargetStation ? dStation - 1.1 : dStation;
          if (score < bestScore) {
            bestScore = score;
            detected = {
              kind: 'task_station',
              siteId: ts.siteId,
              levelNumber: ts.levelNumber,
              taskNumber: ts.taskNumber,
              taskId: ts.taskId,
              stationLabel: ts.stationLabel,
              label: `Inspect ${ts.stationLabel} [E]`,
            };
          }
        }
      }

      if (!detected && dSprout < 3.45) {
        detected = { kind: 'sprout', label: 'Talk to Sprout [E]' };
      }

      if (!areNearbyEqual(detected, lastNearby)) {
        lastNearby = detected;
        callbacksRef.current.onNearbyChange(detected);
      }

      // Sample player checkpoint position every ~4 seconds
      posSampleAccum += dt;
      if (posSampleAccum >= 4.0) {
        posSampleAccum = 0;
        callbacksRef.current.onPlayerPositionSample?.([
          playerRig.root.position.x,
          playerRig.root.position.y,
          playerRig.root.position.z,
        ]);
      }

      // Keep sun shadow frustum centered near player
      sunLight.position.set(
        playerRig.root.position.x + 22,
        playerRig.root.position.y + 34,
        playerRig.root.position.z + 20
      );
      sunLight.target.position.copy(playerRig.root.position);

      // =====================================================================
      // CAMERA CHOREOGRAPHY:
      // 1) World 1 Finale 10-Landmark Cinematic Tour
      // 2) 3.35s Construction Cutaway Framing Active Objective / Structure
      // 3) Smooth Third-Person Elevated Follow / Orbit Camera (with Indoor Roof Guard)
      // =====================================================================
      if (tourActiveRef.current) {
        const secondsPerSite = 2.6;
        tourElapsed += dt;
        const idx = Math.min(9, Math.floor(tourElapsed / secondsPerSite));
        const spec = WORLD1_LEVELS[idx];
        if (lastReportedTourLevel !== spec.levelNumber) {
          lastReportedTourLevel = spec.levelNumber;
          callbacksRef.current.onTourLandmarkChange?.(spec.levelNumber);
        }

        const localT = (tourElapsed % secondsPerSite) / secondsPerSite;
        const orbitShift = (localT - 0.5) * 4.5;
        _desiredCamPos.set(
          spec.cameraLandmarkOffset[0] + orbitShift,
          spec.cameraLandmarkOffset[1] + 1.2,
          spec.cameraLandmarkOffset[2]
        );
        _camTarget.set(
          spec.sitePosition[0],
          spec.sitePosition[1] + 2.0,
          spec.sitePosition[2]
        );

        camera.position.lerp(_desiredCamPos, Math.min(1, dt * 3.8));
        camera.lookAt(_camTarget);

        if (tourElapsed >= secondsPerSite * WORLD1_LEVELS.length) {
          callbacksRef.current.onTourComplete?.();
        }
      } else if (cutawayTimer > 0) {
        cutawayTimer = Math.max(0, cutawayTimer - dt);
        _desiredCamPos.set(cutawayCamPos[0], cutawayCamPos[1], cutawayCamPos[2]);
        _camTarget.set(
          cutawayFocusPos[0],
          cutawayFocusPos[1] + 1.5,
          cutawayFocusPos[2]
        );
        camera.position.lerp(_desiredCamPos, Math.min(1, dt * 4.8));
        camera.lookAt(_camTarget);
      } else {
        const insideCompletedWorkshop =
          workshopStage >= 4 &&
          px >= -9.8 &&
          px <= -2.2 &&
          pz >= 22.6 &&
          pz <= 29.6;

        const effectiveCamDist = insideCompletedWorkshop
          ? Math.min(camDistance, 4.2)
          : camDistance;
        const horizDist = Math.cos(camPitch) * effectiveCamDist;
        const vertDist = Math.sin(camPitch) * effectiveCamDist;

        _desiredCamPos.set(
          px + Math.sin(camYaw) * horizDist,
          playerRig.root.position.y + 1.5 + vertDist,
          pz + Math.cos(camYaw) * horizDist
        );

        if (insideCompletedWorkshop) {
          _desiredCamPos.y = Math.min(_desiredCamPos.y, playerRig.root.position.y + 3.0);
        }

        // Prevent camera dipping below terrain
        const camGround = groundHeightAt(
          _desiredCamPos.x,
          _desiredCamPos.z,
          bridgeStage,
          stairStage,
          workshopStage
        );
        if (_desiredCamPos.y < camGround + 1.1) {
          _desiredCamPos.y = camGround + 1.1;
        }

        _camTarget.set(px, playerRig.root.position.y + 1.35, pz);

        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _desiredCamPos.x,
          8,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _desiredCamPos.y,
          8,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _desiredCamPos.z,
          8,
          dt
        );
        camera.lookAt(_camTarget);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      handlesRef.current = null;

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      wfRingGeo.dispose();
      wfRingMat.dispose();
      wfArrowGeo.dispose();
      wfArrowMat.dispose();
      wfStemGeo.dispose();
      coinGeo.dispose();
      coinMat.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      natureSys.dispose();
      structuresSys.dispose();
      playerRig.dispose();
      companionRig.dispose();
      sproutRig.dispose();
      crewRig.dispose();
      renderer.dispose();
    };
  }, [avatarId, graphicsQuality, mobileControlsRef]);

  return (
    <div className="relative w-full h-full bg-[#BCE4F7] select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      {webglLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0F1F18] text-white p-6 text-center">
          <div className="max-w-md space-y-2">
            <h3 className="text-lg font-bold">3D Forest Renderer Paused</h3>
            <p className="text-xs text-emerald-100/80">
              Your browser temporarily reclaimed the WebGL context. Restoring the Beginner&apos;s
              Forest scene automatically...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
