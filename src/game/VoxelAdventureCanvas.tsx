import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality, WorldSpec } from '../types/codeland';
import { getCharacterById } from '../data/charactersAndBadges';
import {
  attachKenneyCharacterModel,
  buildProceduralBlockyCharacter,
  createCollectibleCoin,
  createCompositeVoxelTree,
  createJavaTerminalConsole,
  createRadialContactShadowTexture,
  createRegionalCenterpiece,
  createVictoryPortal,
  createVoxelCanvasTexture,
  detectSoftwareWebGL,
} from './VoxelTexturesAndProps';
import { soundFX } from '../lib/audio';

export interface NearbyInteractable {
  kind: 'npc' | 'obstacle-1' | 'obstacle-2' | 'portal';
  label: string;
}

export interface MobileControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jumpRequested: boolean;
  interactRequested: boolean;
}

interface VoxelAdventureCanvasProps {
  world: WorldSpec;
  playerAvatarId: string;
  graphicsQuality: GraphicsQuality;
  paused: boolean;
  obstacle1Solved: boolean;
  obstacle2Solved: boolean;
  resetSignal: number;
  mobileControlsRef: React.MutableRefObject<MobileControlState>;
  onNearbyChange: (nearby: NearbyInteractable | null) => void;
  onTriggerInteract: (target: NearbyInteractable) => void;
  onCollectCoin: (coinIndex: number) => void;
  onReachVictoryPortal: () => void;
  onAssetNotice?: (msg: string) => void;
}

// Pre-allocated scratch math helpers outside the animation loop (Zero GC)
const _camDesired = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _particlePos = new THREE.Vector3();

export const VoxelAdventureCanvas: React.FC<VoxelAdventureCanvasProps> = ({
  world,
  playerAvatarId,
  graphicsQuality,
  paused,
  obstacle1Solved,
  obstacle2Solved,
  resetSignal,
  mobileControlsRef,
  onNearbyChange,
  onTriggerInteract,
  onCollectCoin,
  onReachVictoryPortal,
  onAssetNotice,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props/callbacks in refs so React UI updates never rebuild the WebGL scene
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const obs1Ref = useRef(obstacle1Solved);
  const obs2Ref = useRef(obstacle2Solved);

  const callbacksRef = useRef({
    onNearbyChange,
    onTriggerInteract,
    onCollectCoin,
    onReachVictoryPortal,
    onAssetNotice,
  });
  callbacksRef.current = {
    onNearbyChange,
    onTriggerInteract,
    onCollectCoin,
    onReachVictoryPortal,
    onAssetNotice,
  };

  // Trigger camera shake & celebratory particle burst when obstacle1Solved / obstacle2Solved flips true
  const triggerWorldEventRef = useRef<((which: 1 | 2) => void) | null>(null);

  useEffect(() => {
    if (obstacle1Solved && !obs1Ref.current) {
      triggerWorldEventRef.current?.(1);
    }
    obs1Ref.current = obstacle1Solved;
  }, [obstacle1Solved]);

  useEffect(() => {
    if (obstacle2Solved && !obs2Ref.current) {
      triggerWorldEventRef.current?.(2);
    }
    obs2Ref.current = obstacle2Solved;
  }, [obstacle2Solved]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isLowPerf = isSoftwareGl || graphicsQuality === 'low';
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowPerf,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isLowPerf ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = !isLowPerf;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(world.skyHex);
    scene.fog = new THREE.FogExp2(world.fogHex, 0.024);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 140);
    camera.position.set(0, 6.5, 17.5);

    // Studio 3-point outdoor lighting
    const hemi = new THREE.HemisphereLight(world.skyHex, world.groundSecondaryHex, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF1D0', 1.75);
    keyLight.position.set(14, 24, 14);
    keyLight.castShadow = !isLowPerf;
    keyLight.shadow.mapSize.set(isLowPerf ? 512 : 1024, isLowPerf ? 512 : 1024);
    const frustum = 22;
    keyLight.shadow.camera.left = -frustum;
    keyLight.shadow.camera.right = frustum;
    keyLight.shadow.camera.top = frustum;
    keyLight.shadow.camera.bottom = -frustum;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(world.accentHex, 0.5);
    rimLight.position.set(-14, 10, -18);
    scene.add(rimLight);

    // Procedural Voxel Textures
    const primaryTex = createVoxelCanvasTexture(
      renderer,
      world.groundPrimaryHex,
      world.groundSecondaryHex,
      world.levelNumber >= 5 ? 'circuit' : world.levelNumber === 3 ? 'brick' : 'noise'
    );
    const pathTex = createVoxelCanvasTexture(renderer, '#8C7B65', '#6E5E4B', 'brick');
    const barkTex = createVoxelCanvasTexture(renderer, '#654321', '#4A2F15', 'plank');
    const leafTex = createVoxelCanvasTexture(renderer, '#2F7D46', '#4CA666', 'noise');
    const plankTex = createVoxelCanvasTexture(renderer, '#A47449', '#7C532F', 'plank');
    const shadowTex = createRadialContactShadowTexture();

    // Terrain layout:
    // South Island: z from 2 to 13, x from -10 to 10
    // River / Chasm Gap: z from -2 to 1 (crossed at x in [-1.5, 1.5] ONLY once Obstacle 1 is solved!)
    // North Island: z from -19 to -3, x from -10 to 10
    // Natural outer cliff ring + water plane extending to horizon!
    const waterMat = new THREE.MeshStandardMaterial({
      color: world.levelNumber === 3 ? '#2B4C65' : world.levelNumber >= 5 ? '#16324F' : '#3B9AE1',
      roughness: 0.18,
      metalness: 0.35,
    });
    const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = -0.85;
    scene.add(waterPlane);

    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ map: primaryTex, roughness: 0.82 });
    const pathMat = new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.76 });
    const cliffMat = new THREE.MeshStandardMaterial({ color: '#4A5559', roughness: 0.9 });

    const groundPositions: [number, number, number][] = [];
    const pathPositions: [number, number, number][] = [];
    const cliffPositions: [number, number, number][] = [];

    for (let x = -14; x <= 14; x++) {
      for (let z = -22; z <= 16; z++) {
        const isGap = z >= -2 && z <= 1;
        const onPlayableIsland = Math.abs(x) <= 9 && z >= -19 && z <= 13 && !isGap;

        if (onPlayableIsland) {
          const onRoad = Math.abs(x) <= 1 && z >= -16 && z <= 11;
          if (onRoad) {
            pathPositions.push([x, -0.5, z]);
          } else {
            groundPositions.push([x, -0.5, z]);
          }
        } else if (!isGap && (Math.abs(x) >= 11 || z <= -20 || z >= 14)) {
          // Natural perimeter rock outcrops & stepped cliffs
          const h = 1 + Math.floor((Math.abs(Math.sin(x * 0.7 + z * 0.5)) * 2.8));
          for (let y = 0; y < h; y++) {
            cliffPositions.push([x, -0.5 + y, z]);
          }
        }
      }
    }

    const dummy = new THREE.Object3D();
    const buildBlocks = (coords: [number, number, number][], mat: THREE.MeshStandardMaterial) => {
      const inst = new THREE.InstancedMesh(blockGeo, mat, coords.length);
      inst.receiveShadow = !isLowPerf;
      inst.castShadow = !isLowPerf;
      coords.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
    };

    buildBlocks(groundPositions, groundMat);
    buildBlocks(pathPositions, pathMat);
    buildBlocks(cliffPositions, cliffMat);

    // Decorative Biome Trees / Crystal Pillars along the flanks
    const treeStyle =
      world.levelNumber >= 5 ? 'crystal' : world.levelNumber >= 3 ? 'pine' : 'forest';
    const treeSpots: [number, number, number][] = [
      [-7, 0, 9],
      [7, 0, 8],
      [-7.5, 0, 4],
      [7.5, 0, 4],
      [-7.5, 0, -6],
      [7.5, 0, -6],
      [-7, 0, -14],
      [7, 0, -14],
    ];
    treeSpots.forEach(([tx, ty, tz], idx) => {
      const tree = createCompositeVoxelTree(treeStyle, shadowTex, barkTex, leafTex);
      tree.position.set(tx, ty, tz);
      tree.scale.setScalar(0.85 + (idx % 3) * 0.1);
      scene.add(tree);
    });

    // Dynamic Bridge / Chasm Platforms (5 segments across z = 1, 0.25, -0.5, -1.25, -2)
    const bridgeMat = new THREE.MeshStandardMaterial({
      map: plankTex,
      color: world.levelNumber >= 5 ? '#69B9E7' : '#D69E5C',
      roughness: 0.55,
      metalness: world.levelNumber >= 5 ? 0.45 : 0.1,
    });
    const bridgeSegments: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.36, 0.78), bridgeMat);
      const zPos = 1.1 - i * 0.78;
      seg.position.set(0, obs1Ref.current ? -0.12 : -2.6, zPos);
      seg.castShadow = !isLowPerf;
      seg.receiveShadow = !isLowPerf;
      scene.add(seg);
      bridgeSegments.push(seg);
    }

    // Obstacle 1 & 2 Java Terminals
    const term1 = createJavaTerminalConsole(world.accentHex, shadowTex);
    term1.group.position.set(...world.obstacles[0].position);
    scene.add(term1.group);

    const term2 = createJavaTerminalConsole('#69B9E7', shadowTex);
    term2.group.position.set(...world.obstacles[1].position);
    scene.add(term2.group);

    // Regional Centerpiece Structure behind Terminal 2
    const centerpiece = createRegionalCenterpiece(world.levelNumber, world.accentHex, shadowTex);
    centerpiece.group.position.set(5.2, 0, -10.5);
    scene.add(centerpiece.group);

    // Victory Portal at north end
    const portal = createVictoryPortal(world.accentHex, shadowTex);
    portal.group.position.set(...world.portalPosition);
    scene.add(portal.group);

    // NPC Guide Character
    const npcAvatar = getCharacterById(world.npcAvatarId);
    const npcObj = buildProceduralBlockyCharacter(world.accentHex, shadowTex);
    npcObj.root.position.set(-3.2, 0, 8.2);
    npcObj.root.rotation.y = Math.PI * 0.2;
    scene.add(npcObj.root);
    attachKenneyCharacterModel(npcObj.bodyRig, npcAvatar.glbUrl, (m) =>
      callbacksRef.current.onAssetNotice?.(m)
    );

    // Player Character
    const playerAvatar = getCharacterById(playerAvatarId);
    const playerObj = buildProceduralBlockyCharacter('#2F7D46', shadowTex);
    playerObj.root.position.set(0, 0, 10.5);
    playerObj.root.rotation.y = Math.PI;
    scene.add(playerObj.root);
    attachKenneyCharacterModel(playerObj.bodyRig, playerAvatar.glbUrl, (m) =>
      callbacksRef.current.onAssetNotice?.(m)
    );

    // Collectible Coins
    const coinsState = world.coinPositions.map((pos, idx) => {
      const c = createCollectibleCoin(shadowTex);
      c.group.position.set(pos[0], 0, pos[2]);
      scene.add(c.group);
      return { idx, collected: false, group: c.group, spinner: c.spinner, x: pos[0], z: pos[2] };
    });

    // Pooled Celebration Particles (24 small voxel sparks)
    const sparkGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#F5C451' });
    const sparks = Array.from({ length: 24 }, () => {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.visible = false;
      scene.add(mesh);
      return {
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
      };
    });

    const spawnBurst = (originX: number, originY: number, originZ: number) => {
      sparks.forEach((s, i) => {
        s.mesh.visible = true;
        s.mesh.position.set(originX, originY, originZ);
        const angle = (i / sparks.length) * Math.PI * 2;
        const speed = 2.2 + (i % 4) * 0.9;
        s.vel.set(Math.cos(angle) * speed, 3.5 + (i % 3) * 1.3, Math.sin(angle) * speed);
        s.life = 0.75;
      });
    };

    let shakeTimer = 0;
    let hitstopTimer = 0;

    triggerWorldEventRef.current = (which: 1 | 2) => {
      shakeTimer = 0.35;
      hitstopTimer = 0.05;
      if (which === 1) {
        spawnBurst(0, 0.6, -0.5);
      } else {
        spawnBurst(world.portalPosition[0], 2.0, world.portalPosition[2]);
      }
    };

    // Input Handling (held vs edge-triggered justPressed + clear on blur)
    const heldKeys: Record<string, boolean> = {};
    let jumpBufferedTimer = 0;
    let interactPressedEdge = false;

    const onKeyDown = (e: KeyboardEvent) => {
      // Do not hijack keys when typing in CodeMirror / inputs
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement | null)?.closest('.cm-editor');
      if (isEditable) return;

      if (!heldKeys[e.code]) {
        if (e.code === 'Space') jumpBufferedTimer = 0.14;
        if (e.code === 'KeyE' || e.code === 'Enter') interactPressedEdge = true;
      }
      heldKeys[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys[e.code] = false;
    };

    const clearAllKeys = () => {
      Object.keys(heldKeys).forEach((k) => {
        heldKeys[k] = false;
      });
    };

    // Mouse Drag Camera Orbit
    let cameraYaw = 0;
    let cameraPitch = 0.48;
    let dragging = false;
    let lastPtrX = 0;
    let lastPtrY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      cameraYaw -= dx * 0.006;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.004, 0.22, 0.95);
    };
    const onPointerUp = () => {
      dragging = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllKeys);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    if (!isLowPerf) {
      renderer.compile(scene, camera);
    }

    // Player Physics State
    let velY = 0;
    let coyoteTimer = 0;
    let portalTriggered = false;
    let lastNearbyKey = '';

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
      } else if (!pausedRef.current) {
        const mob = mobileControlsRef.current;
        if (mob.jumpRequested) {
          jumpBufferedTimer = 0.14;
          mob.jumpRequested = false;
        }
        if (mob.interactRequested) {
          interactPressedEdge = true;
          mob.interactRequested = false;
        }

        // Animate bridge segments smoothly when Obstacle 1 is solved
        bridgeSegments.forEach((seg, idx) => {
          const targetY = obs1Ref.current ? -0.12 : -2.6;
          seg.position.y = THREE.MathUtils.damp(seg.position.y, targetY, 6 + idx * 0.6, dt);
        });

        // Animate Portal & Centerpiece when Obstacle 2 is solved
        const targetEmissive = obs2Ref.current ? 1.15 : 0.15;
        const targetOpacity = obs2Ref.current ? 0.82 : 0.24;
        portal.vortexMat.emissiveIntensity = THREE.MathUtils.damp(
          portal.vortexMat.emissiveIntensity,
          targetEmissive,
          5,
          dt
        );
        portal.vortexMat.opacity = THREE.MathUtils.damp(portal.vortexMat.opacity, targetOpacity, 5, dt);
        centerpiece.coreMat.emissiveIntensity = obs2Ref.current
          ? 0.9 + Math.sin(elapsed * 4) * 0.25
          : 0.2;
        centerpiece.coreCrystal.rotation.y += dt * (obs2Ref.current ? 2.6 : 0.5);

        term1.beaconMesh.rotation.y += dt * 1.8;
        term2.beaconMesh.rotation.y += dt * 1.8;
        npcObj.bodyRig.position.y = Math.abs(Math.sin(elapsed * 2.2)) * 0.05;

        // Player Movement Input relative to cameraYaw
        let moveX = 0;
        let moveZ = 0;
        if (heldKeys['KeyW'] || heldKeys['ArrowUp'] || mob.forward) moveZ -= 1;
        if (heldKeys['KeyS'] || heldKeys['ArrowDown'] || mob.backward) moveZ += 1;
        if (heldKeys['KeyA'] || heldKeys['ArrowLeft'] || mob.left) moveX -= 1;
        if (heldKeys['KeyD'] || heldKeys['ArrowRight'] || mob.right) moveX += 1;

        const isMoving = moveX !== 0 || moveZ !== 0;
        if (isMoving) {
          _moveVec.set(moveX, 0, moveZ).normalize();
          const sinY = Math.sin(cameraYaw);
          const cosY = Math.cos(cameraYaw);
          const worldDx = _moveVec.x * cosY + _moveVec.z * sinY;
          const worldDz = -_moveVec.x * sinY + _moveVec.z * cosY;

          const speed = 5.6;
          const nextX = THREE.MathUtils.clamp(playerObj.root.position.x + worldDx * speed * dt, -8.4, 8.4);
          let nextZ = THREE.MathUtils.clamp(playerObj.root.position.z + worldDz * speed * dt, -18.0, 12.2);

          // River / Chasm Collision Check (z between -2.2 and 1.4)
          const enteringGap = nextZ < 1.45 && nextZ > -2.25;
          if (enteringGap) {
            const onBridgeWidth = Math.abs(nextX) <= 1.45;
            if (!obs1Ref.current || !onBridgeWidth) {
              // Block movement into unbridged chasm/river unless high in air
              if (playerObj.root.position.z >= 1.45) nextZ = 1.45;
              else if (playerObj.root.position.z <= -2.25) nextZ = -2.25;
            }
          }

          playerObj.root.position.x = nextX;
          playerObj.root.position.z = nextZ;

          // Smooth character facing angle
          const targetRot = Math.atan2(worldDx, worldDz);
          let diff = targetRot - playerObj.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerObj.root.rotation.y += diff * (1 - Math.exp(-12 * dt));

          // Walk bobbing
          playerObj.bodyRig.position.y = Math.abs(Math.sin(elapsed * 11)) * 0.11;
          playerObj.bodyRig.rotation.z = Math.sin(elapsed * 11) * 0.05;
        } else {
          playerObj.bodyRig.position.y = THREE.MathUtils.damp(playerObj.bodyRig.position.y, 0, 10, dt);
          playerObj.bodyRig.rotation.z = THREE.MathUtils.damp(playerObj.bodyRig.rotation.z, 0, 10, dt);
        }

        // Jump + Gravity + Coyote Time + Squash & Stretch
        if (playerObj.root.position.y <= 0.001) {
          coyoteTimer = 0.12;
        } else {
          coyoteTimer = Math.max(0, coyoteTimer - dt);
        }

        if (jumpBufferedTimer > 0) {
          jumpBufferedTimer -= dt;
          if (coyoteTimer > 0) {
            velY = 6.8;
            coyoteTimer = 0;
            jumpBufferedTimer = 0;
            playerObj.bodyRig.scale.set(0.88, 1.16, 0.88);
            soundFX.playJump();
          }
        }

        velY -= 18.5 * dt;
        playerObj.root.position.y += velY * dt;
        if (playerObj.root.position.y <= 0) {
          if (velY < -3) {
            playerObj.bodyRig.scale.set(1.14, 0.86, 1.14);
          }
          playerObj.root.position.y = 0;
          velY = 0;
        }

        playerObj.bodyRig.scale.x = THREE.MathUtils.damp(playerObj.bodyRig.scale.x, 1, 10, dt);
        playerObj.bodyRig.scale.y = THREE.MathUtils.damp(playerObj.bodyRig.scale.y, 1, 10, dt);
        playerObj.bodyRig.scale.z = THREE.MathUtils.damp(playerObj.bodyRig.scale.z, 1, 10, dt);

        // Coin Collection Check
        const px = playerObj.root.position.x;
        const pz = playerObj.root.position.z;
        coinsState.forEach((c) => {
          if (c.collected) return;
          c.spinner.rotation.y += dt * 2.5;
          if (Math.hypot(px - c.x, pz - c.z) < 1.25) {
            c.collected = true;
            c.group.visible = false;
            soundFX.playCoinCollect();
            spawnBurst(c.x, 0.8, c.z);
            callbacksRef.current.onCollectCoin(c.idx);
          }
        });

        // Proximity Check for Interactables (NPC, Obstacle 1, Obstacle 2, Active Portal)
        let nearest: NearbyInteractable | null = null;
        const dNpc = Math.hypot(px - npcObj.root.position.x, pz - npcObj.root.position.z);
        const dObs1 = Math.hypot(px - world.obstacles[0].position[0], pz - world.obstacles[0].position[2]);
        const dObs2 = Math.hypot(px - world.obstacles[1].position[0], pz - world.obstacles[1].position[2]);
        const dPortal = Math.hypot(px - world.portalPosition[0], pz - world.portalPosition[2]);

        if (obs2Ref.current && dPortal < 1.9 && !portalTriggered) {
          portalTriggered = true;
          soundFX.playMissionVictory();
          callbacksRef.current.onReachVictoryPortal();
        } else if (dObs1 < 2.35) {
          nearest = {
            kind: 'obstacle-1',
            label: obs1Ref.current
              ? `${world.obstacles[0].title} (Solved — Press E to Review)`
              : `Press E · Program ${world.obstacles[0].title}`,
          };
        } else if (dObs2 < 2.45) {
          nearest = {
            kind: 'obstacle-2',
            label: obs2Ref.current
              ? `${world.obstacles[1].title} (Solved — Walk into Portal!)`
              : `Press E · Program ${world.obstacles[1].title}`,
          };
        } else if (dNpc < 2.5) {
          nearest = {
            kind: 'npc',
            label: `Press E · Talk to ${world.npcName}`,
          };
        }

        const nextKey = nearest ? `${nearest.kind}:${nearest.label}` : '';
        if (nextKey !== lastNearbyKey) {
          lastNearbyKey = nextKey;
          callbacksRef.current.onNearbyChange(nearest);
        }

        if (interactPressedEdge && nearest) {
          soundFX.playClick();
          callbacksRef.current.onTriggerInteract(nearest);
        }
        interactPressedEdge = false;
      }

      // Update pooled particles
      sparks.forEach((s) => {
        if (s.life <= 0) return;
        s.life -= dt;
        if (s.life <= 0) {
          s.mesh.visible = false;
          return;
        }
        _particlePos.copy(s.vel).multiplyScalar(dt);
        s.mesh.position.add(_particlePos);
        s.vel.y -= 9.8 * dt;
      });

      // Third-person Exponentially Damped Camera Follow + Decaying Shake
      const camDist = 8.4;
      const horizDist = Math.cos(cameraPitch) * camDist;
      const vertHeight = Math.sin(cameraPitch) * camDist + 1.4;
      _camDesired.set(
        playerObj.root.position.x + Math.sin(cameraYaw) * horizDist,
        playerObj.root.position.y + vertHeight,
        playerObj.root.position.z + Math.cos(cameraYaw) * horizDist
      );

      if (shakeTimer > 0) {
        shakeTimer = Math.max(0, shakeTimer - dt);
        const mag = shakeTimer * 0.35;
        _camDesired.x += Math.sin(elapsed * 48) * mag;
        _camDesired.y += Math.cos(elapsed * 54) * mag;
      }

      const dampAlpha = 1 - Math.exp(-8 * dt);
      camera.position.lerp(_camDesired, dampAlpha);
      _camLookTarget.set(
        playerObj.root.position.x,
        playerObj.root.position.y + 1.25,
        playerObj.root.position.z - 0.6
      );
      camera.lookAt(_camLookTarget);

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    const onResize = () => {
      if (!container || disposed) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllKeys);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      envTex.dispose();
      primaryTex.dispose();
      pathTex.dispose();
      barkTex.dispose();
      leafTex.dispose();
      plankTex.dispose();
      shadowTex.dispose();
      blockGeo.dispose();
      sparkGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [world, playerAvatarId, graphicsQuality, resetSignal, mobileControlsRef]);

  return <div ref={mountRef} className="w-full h-full select-none touch-none" />;
};
