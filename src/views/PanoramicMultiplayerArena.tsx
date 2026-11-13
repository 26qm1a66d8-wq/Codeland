import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Camera,
  CameraOff,
  Compass,
  Crown,
  LogOut,
  Play,
  RotateCw,
  CheckCircle2,
  Terminal,
  Trophy,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { AppSection, MultiplayerChallengeNode } from '../types/codeland';
import { usePlayer } from '../context/PlayerContext';
import { buildWorldSpecForCampaignLevel } from '../data/campaign100';
import { getCharacterById } from '../data/charactersAndBadges';
import {
  attachKenneyCharacterModel,
  buildProceduralBlockyCharacter,
  createJavaTerminalConsole,
  createRadialContactShadowTexture,
  detectSoftwareWebGL,
} from '../game/VoxelTexturesAndProps';
import {
  leavePrivateRoom,
  solveRoomChallengeNode,
  startRoomMatch,
} from '../lib/multiplayerClient';
import { AvatarImage } from '../components/BadgeIcon';
import { soundFX } from '../lib/audio';

function createEquirectangularVoxelPanorama(
  skyTopHex: string,
  skyHorizonHex: string,
  groundPrimaryHex: string,
  groundSecondaryHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Sky to horizon to ground gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0B1611');
  grad.addColorStop(0.22, skyTopHex);
  grad.addColorStop(0.49, skyHorizonHex);
  grad.addColorStop(0.51, groundSecondaryHex);
  grad.addColorStop(1, groundPrimaryHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle voxel stars & floating code blocks in upper hemisphere
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 137) % 1016) + 4;
    const sy = ((i * 73) % 190) + 12;
    const sz = i % 3 === 0 ? 4 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // Stepped distant voxel mountains & citadel silhouettes along 360° horizon (y ~ 256)
  ctx.fillStyle = '#13261D';
  for (let x = 0; x < 1024; x += 16) {
    const h1 = Math.floor((Math.sin(x * 0.018) * 0.5 + 0.5) * 44);
    const h2 = Math.floor((Math.cos(x * 0.045) * 0.5 + 0.5) * 26);
    const totalH = 14 + h1 + h2;
    ctx.fillRect(x, 256 - totalH, 16, totalH);
  }

  // Glowing voxel horizon circuit band
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(0, 255, 1024, 3);
  ctx.globalAlpha = 1;

  // Lower hemisphere perspective grid lines for spatial 360° grounding
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.16)';
  ctx.lineWidth = 2;
  for (let y = 272; y < 500; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let x = 0; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 256);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function shortestAngleDiffDeg(a: number, b: number): number {
  const diff = ((((b - a) % 360) + 540) % 360) - 180;
  return diff;
}

export const PanoramicMultiplayerArena: React.FC = () => {
  const {
    profile,
    activeRoom,
    setActiveRoom,
    setSection,
    remotePlayerPoses,
    emitArenaPose,
    completeMultiplayerMatchReward,
    pushToast,
  } = usePlayer();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [yawDeg, setYawDeg] = useState<number>(0);
  const [pitchDeg, setPitchDeg] = useState<number>(4);
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(4);
  const targetYawRef = useRef<number | null>(null);

  const [arCameraEnabled, setArCameraEnabled] = useState<boolean>(false);
  const [gyroEnabled, setGyroEnabled] = useState<boolean>(false);
  const [scanStepsTaken, setScanStepsTaken] = useState<number>(1);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [countdownSec, setCountdownSec] = useState<number>(0);

  const worldSpec = useMemo(() => {
    const lvl = activeRoom?.selectedLevel || 1;
    return buildWorldSpecForCampaignLevel(lvl);
  }, [activeRoom?.selectedLevel]);

  const nodes = activeRoom?.matchState?.nodes || [];
  const myMember = useMemo(
    () => activeRoom?.members.find((m) => m.userId === profile?.uid),
    [activeRoom?.members, profile?.uid]
  );

  // Determine which beacon is currently centered in the 360° reticle (±20°)
  const lockedNode = useMemo<MultiplayerChallengeNode | null>(() => {
    let best: MultiplayerChallengeNode | null = null;
    let bestAbs = 22;
    for (const n of nodes) {
      const d = Math.abs(shortestAngleDiffDeg(yawDeg, n.bearingDeg));
      if (d < bestAbs) {
        bestAbs = d;
        best = n;
      }
    }
    return best;
  }, [nodes, yawDeg]);

  const activeModalNode = useMemo(
    () => nodes.find((n) => n.id === openNodeId) || null,
    [nodes, openNodeId]
  );

  // Countdown ticker while roomStatus === 'starting'
  useEffect(() => {
    if (!activeRoom?.matchState || activeRoom.roomStatus !== 'starting') {
      setCountdownSec(0);
      return;
    }
    const updateTick = () => {
      const rem = Math.max(
        0,
        Math.ceil((activeRoom.matchState!.countdownEndsAtMs - Date.now()) / 1000)
      );
      setCountdownSec(rem);
    };
    updateTick();
    const timer = window.setInterval(updateTick, 200);
    return () => window.clearInterval(timer);
  }, [activeRoom?.roomStatus, activeRoom?.matchState]);

  // Trigger match completion reward once when roomStatus reaches 'completed'
  useEffect(() => {
    if (!activeRoom || !profile || activeRoom.roomStatus !== 'completed' || !myMember) return;
    const wonOrCoop =
      activeRoom.gameMode === 'coop_adventure' ||
      activeRoom.matchState?.winnerUserId === profile.uid;
    void completeMultiplayerMatchReward(
      activeRoom.id,
      activeRoom.roomCode,
      activeRoom.gameMode,
      wonOrCoop,
      myMember.score
    );
  }, [
    activeRoom?.roomStatus,
    activeRoom?.id,
    activeRoom?.roomCode,
    activeRoom?.gameMode,
    activeRoom?.matchState?.winnerUserId,
    profile,
    myMember,
    completeMultiplayerMatchReward,
  ]);

  // Camera AR Passthrough lifecycle
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const toggleArCameraMode = async () => {
    if (arCameraEnabled) {
      stopCameraStream();
      setArCameraEnabled(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      pushToast({
        title: 'AR Camera Unavailable',
        subtitle: 'Staying in 360° Panoramic Voxel Dome mode on this device.',
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setArCameraEnabled(true);
      pushToast({
        title: 'Live AR Camera Active',
        subtitle: 'Pan around your space to lock onto floating 3D Java Relay Beacons!',
      });
    } catch {
      pushToast({
        title: 'Camera Permission Declined',
        subtitle: 'Continuing seamlessly in 360° Panoramic Voxel Dome mode.',
      });
      setArCameraEnabled(false);
    }
  };

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  // Optional DeviceOrientation 360° Gyroscope listener
  useEffect(() => {
    if (!gyroEnabled || typeof window === 'undefined') return;
    const handleOrientation = (ev: DeviceOrientationEvent) => {
      if (typeof ev.alpha === 'number') {
        const nextYaw = (360 - ev.alpha) % 360;
        yawRef.current = nextYaw;
        setYawDeg(Math.round(nextYaw));
        emitArenaPose(nextYaw, pitchRef.current);
      }
      if (typeof ev.beta === 'number') {
        const nextPitch = Math.max(-40, Math.min(40, ev.beta - 60));
        pitchRef.current = nextPitch;
        setPitchDeg(Math.round(nextPitch));
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroEnabled, emitArenaPose]);

  // Keyboard 360° Panning
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (openNodeId) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        targetYawRef.current = null;
        const next = (yawRef.current - 12 + 360) % 360;
        yawRef.current = next;
        setYawDeg(Math.round(next));
        emitArenaPose(next, pitchRef.current);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        targetYawRef.current = null;
        const next = (yawRef.current + 12) % 360;
        yawRef.current = next;
        setYawDeg(Math.round(next));
        emitArenaPose(next, pitchRef.current);
      } else if (e.key === 'Enter' && lockedNode) {
        setOpenNodeId(lockedNode.id);
        setSelectedOption(null);
        setAnswerFeedback(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openNodeId, lockedNode, emitArenaPose]);

  // Refs for latest state read inside Three.js animation loop without recreating WebGL context
  const roomRef = useRef(activeRoom);
  roomRef.current = activeRoom;
  const posesRef = useRef(remotePlayerPoses);
  posesRef.current = remotePlayerPoses;
  const arEnabledRef = useRef(arCameraEnabled);
  arEnabledRef.current = arCameraEnabled;

  // Main Three.js 360° Panoramic / AR WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoft = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoft,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(
      isSoft ? 1 : Math.min(window.devicePixelRatio || 1, profile?.graphicsQuality === 'low' ? 1 : 2)
    );
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || 1) / (container.clientHeight || 1),
      0.1,
      200
    );
    camera.position.set(0, 1.75, 0);

    // Lighting
    const hemi = new THREE.HemisphereLight('#FFFBEB', worldSpec.groundPrimaryHex, 1.15);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight('#FFF6D6', 1.35);
    dirLight.position.set(12, 24, 10);
    scene.add(dirLight);

    const shadowTex = createRadialContactShadowTexture();

    // 1. 360° Inverted Panoramic Voxel Sky-Dome Sphere
    const panoTex = createEquirectangularVoxelPanorama(
      worldSpec.skyHex,
      worldSpec.fogHex,
      worldSpec.groundPrimaryHex,
      worldSpec.groundSecondaryHex,
      worldSpec.accentHex
    );
    const skyDomeMat = new THREE.MeshBasicMaterial({
      map: panoTex,
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(90, 40, 28), skyDomeMat);
    scene.add(skyDome);

    // 2. Spatial Compass Platform Ring around player
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#1D3B2C',
      emissive: worldSpec.accentHex,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.85,
      roughness: 0.5,
    });
    const platformRing = new THREE.Mesh(new THREE.RingGeometry(6.5, 15.2, 40), ringMat);
    platformRing.rotation.x = -Math.PI / 2;
    platformRing.position.y = -0.05;
    scene.add(platformRing);

    // 3. Central Overhead Co-op Energy Core Spire
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 5.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#F5C451',
      emissive: '#F5C451',
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.6,
    });
    const coreOcta = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), coreMat);
    const coreTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.08, 8, 28),
      new THREE.MeshStandardMaterial({ color: '#69B9E7', roughness: 0.3, metalness: 0.7 })
    );
    coreTorus.rotation.x = Math.PI / 2;
    coreGroup.add(coreOcta, coreTorus);
    scene.add(coreGroup);

    // 4. 5 Interactive 3D Java Relay Beacons around 360° horizon
    const beaconRecords: {
      nodeId: string;
      bearingDeg: number;
      wrapper: THREE.Group;
      beaconMesh: THREE.Mesh;
      screenMat: THREE.MeshStandardMaterial;
      ringHalo: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
    }[] = [];

    const initialNodes = roomRef.current?.matchState?.nodes || [];
    initialNodes.forEach((node) => {
      const rad = THREE.MathUtils.degToRad(node.bearingDeg);
      const dist = 12.2;
      const x = Math.sin(rad) * dist;
      const z = -Math.cos(rad) * dist;
      const y = node.elevationDeg > 8 ? 1.15 : 0.1;

      const wrapper = new THREE.Group();
      wrapper.position.set(x, y, z);
      wrapper.lookAt(0, y + 1.1, 0);

      // Voxel floating plinth under console
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.32, 2.1),
        new THREE.MeshStandardMaterial({ color: '#26382F', roughness: 0.75 })
      );
      pad.position.y = -0.16;
      wrapper.add(pad);

      const term = createJavaTerminalConsole(node.accentHex, shadowTex);
      wrapper.add(term.group);

      const haloMat = new THREE.MeshBasicMaterial({
        color: node.accentHex,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const ringHalo = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.38, 24), haloMat);
      ringHalo.rotation.x = -Math.PI / 2;
      ringHalo.position.y = 0.06;
      wrapper.add(ringHalo);

      wrapper.userData = { nodeId: node.id };
      term.group.traverse((obj) => {
        obj.userData = { nodeId: node.id };
      });

      scene.add(wrapper);
      beaconRecords.push({
        nodeId: node.id,
        bearingDeg: node.bearingDeg,
        wrapper,
        beaconMesh: term.beaconMesh,
        screenMat: term.screenMat,
        ringHalo,
        haloMat,
      });
    });

    // 5. Dynamic 3D Peer Blocky Avatars map
    const peerAvatars = new Map<
      string,
      {
        group: THREE.Group;
        currentYaw: number;
        avatarId: string;
      }
    >();

    const syncPeerAvatars = () => {
      const curRoom = roomRef.current;
      if (!curRoom) return;
      const activeIds = new Set<string>();

      curRoom.members.forEach((m, idx) => {
        if (m.userId === profile?.uid) return;
        activeIds.add(m.userId);
        let entry = peerAvatars.get(m.userId);
        if (!entry) {
          const charDef = getCharacterById(m.avatarId);
          const built = buildProceduralBlockyCharacter(charDef.accentHex, shadowTex);
          attachKenneyCharacterModel(built.bodyRig, charDef.glbUrl);

          // Hover disc under teammate
          const hoverDisc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.85, 0.95, 0.18, 12),
            new THREE.MeshStandardMaterial({
              color: charDef.accentHex,
              emissive: charDef.accentHex,
              emissiveIntensity: 0.3,
              roughness: 0.35,
            })
          );
          hoverDisc.position.y = -0.09;
          built.root.add(hoverDisc);

          scene.add(built.root);
          entry = {
            group: built.root,
            currentYaw: m.yawDeg || idx * 72,
            avatarId: m.avatarId,
          };
          peerAvatars.set(m.userId, entry);
        }

        const targetYaw = posesRef.current[m.userId]?.yawDeg ?? m.yawDeg ?? 0;
        const delta = shortestAngleDiffDeg(entry.currentYaw, targetYaw);
        entry.currentYaw = (entry.currentYaw + delta * 0.16 + 360) % 360;

        const rad = THREE.MathUtils.degToRad(entry.currentYaw);
        const radius = 8.6;
        entry.group.position.set(Math.sin(rad) * radius, 0.15, -Math.cos(rad) * radius);
        // Face outward toward the beacon they are scanning
        entry.group.rotation.y = -rad + Math.PI;
      });

      for (const [uid, rec] of peerAvatars.entries()) {
        if (!activeIds.has(uid)) {
          scene.remove(rec.group);
          peerAvatars.delete(uid);
        }
      }
    };

    // Pointer drag & click raycasting for 360° look + direct beacon click
    let isDragging = false;
    let dragDistance = 0;
    let prevX = 0;
    let prevY = 0;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const onPointerDown = (ev: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      prevX = ev.clientX;
      prevY = ev.clientY;
      targetYawRef.current = null;
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDragging) return;
      const dx = ev.clientX - prevX;
      const dy = ev.clientY - prevY;
      prevX = ev.clientX;
      prevY = ev.clientY;
      dragDistance += Math.abs(dx) + Math.abs(dy);

      const nextYaw = (yawRef.current - dx * 0.26 + 360) % 360;
      const nextPitch = Math.max(-42, Math.min(42, pitchRef.current + dy * 0.2));
      yawRef.current = nextYaw;
      pitchRef.current = nextPitch;
      setYawDeg(Math.round(nextYaw));
      setPitchDeg(Math.round(nextPitch));
      emitArenaPose(nextYaw, nextPitch);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (dragDistance < 8) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(
          beaconRecords.map((b) => b.wrapper),
          true
        );
        if (hits.length > 0) {
          const nid = hits[0].object.userData?.nodeId;
          if (typeof nid === 'string') {
            setOpenNodeId(nid);
            setSelectedOption(null);
            setAnswerFeedback(null);
          }
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Software WebGL fenceSync pacing helper
    const gl = renderer.getContext() as WebGL2RenderingContext;
    let disposed = false;
    let rafId = 0;
    let timeoutId = 0;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      if (!isSoft || typeof gl.fenceSync !== 'function') {
        rafId = requestAnimationFrame(cb);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        if (!sync) {
          timeoutId = window.setTimeout(cb, 80);
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          timeoutId = window.setTimeout(cb, 80);
        } else {
          timeoutId = window.setTimeout(poll, 16);
        }
      };
      timeoutId = window.setTimeout(poll, 16);
    };

    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;
      const t = clock.getElapsedTime();

      // Smooth slew when user clicks a compass bearing button
      if (targetYawRef.current !== null) {
        const diff = shortestAngleDiffDeg(yawRef.current, targetYawRef.current);
        if (Math.abs(diff) < 0.8) {
          yawRef.current = targetYawRef.current;
          targetYawRef.current = null;
        } else {
          yawRef.current = (yawRef.current + diff * 0.18 + 360) % 360;
        }
        setYawDeg(Math.round(yawRef.current));
        emitArenaPose(yawRef.current, pitchRef.current);
      }

      // Toggle sky-dome visibility for Camera AR Passthrough
      skyDome.visible = !arEnabledRef.current;
      ringMat.opacity = arEnabledRef.current ? 0.35 : 0.85;

      // Orient 360° camera
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(pitchRef.current),
        THREE.MathUtils.degToRad(-yawRef.current),
        0,
        'YXZ'
      );
      camera.quaternion.setFromEuler(euler);

      // Animate Java Relay Beacons & Solved Visual State
      const mySolved =
        roomRef.current?.members.find((m) => m.userId === profile?.uid)?.solvedNodeIds || [];
      beaconRecords.forEach((b, idx) => {
        const solved = mySolved.includes(b.nodeId);
        b.beaconMesh.rotation.y = t * (solved ? 2.6 : 1.2) + idx;
        b.beaconMesh.position.y = 2.02 + Math.sin(t * 2.2 + idx) * 0.1;
        b.screenMat.emissiveIntensity = solved ? 0.95 : 0.45;
        b.haloMat.opacity = solved ? 0.9 : 0.45 + Math.sin(t * 3 + idx) * 0.15;
      });

      // Animate Central Co-op Core
      coreOcta.rotation.y = t * 1.4;
      coreTorus.rotation.z = t * 0.9;

      // Update live teammate avatars
      syncPeerAvatars();

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      panoTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
    };
  }, [worldSpec, activeRoom?.matchState?.startedAtIso, profile?.uid, profile?.graphicsQuality, emitArenaPose]);

  if (!profile || !activeRoom) {
    return (
      <div className="min-h-screen bg-[#0F1B15] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-stone-300">No active multiplayer room session found.</p>
        <button
          type="button"
          onClick={() => setSection(AppSection.MULTIPLAYER)}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F7D46] text-white cursor-pointer"
        >
          Return to Multiplayer Hub
        </button>
      </div>
    );
  }

  const isHost = activeRoom.hostUserId === profile.uid;
  const sortedStandings = [...activeRoom.members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.solvedNodeIds.length - a.solvedNodeIds.length;
  });

  const handleSubmitNodeAnswer = async () => {
    if (!activeModalNode || selectedOption === null) return;
    setSubmittingAnswer(true);
    setAnswerFeedback(null);
    try {
      const res = await solveRoomChallengeNode(activeRoom.roomCode, {
        userId: profile.uid,
        nodeId: activeModalNode.id,
        selectedOptionIndex: selectedOption,
        scanStepsTaken,
      });
      setActiveRoom(res.room);
      if (res.correct) {
        soundFX.playAchievementUnlock();
        setAnswerFeedback({
          correct: true,
          message: `${res.explanation} (+${res.pointsEarned ?? 100} pts!)`,
        });
        setScanStepsTaken(1);
        window.setTimeout(() => {
          setOpenNodeId(null);
          setSelectedOption(null);
          setAnswerFeedback(null);
        }, 1250);
      } else {
        setAnswerFeedback({
          correct: false,
          message: res.explanation,
        });
      }
    } catch (err) {
      setAnswerFeedback({
        correct: false,
        message: err instanceof Error ? err.message : 'Could not verify answer.',
      });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B1510] text-[#F5F1E6] select-none">
      {/* Optional Live Rear-Camera AR Passthrough Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
          arCameraEnabled ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Full-Viewport 360° Panoramic / AR Three.js Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Center 360° Reticle Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-transform ${
            lockedNode
              ? 'border-[#F5C451] scale-110'
              : 'border-emerald-300/50 scale-100'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-[#F5C451]" />
        </div>
      </div>

      {/* Top HUD Bar (Solid non-blur surface for fast WebGL compositing) */}
      <header className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto px-3.5 py-2.5 rounded-2xl bg-[#101F18]/95 border border-emerald-800/70 flex items-center gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#F5C451]">
              Room {activeRoom.roomCode} · Level {activeRoom.selectedLevel}
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">
              {activeRoom.roomName} ·{' '}
              {activeRoom.gameMode === 'coding_race'
                ? 'Coding Race'
                : activeRoom.gameMode === 'coop_adventure'
                ? 'Co-op Adventure'
                : 'Challenge Mode'}
            </div>
          </div>
        </div>

        {/* 360° Beacon Compass Quick-Scan Strip */}
        <div className="pointer-events-auto px-3 py-2 rounded-2xl bg-[#101F18]/95 border border-emerald-800/70 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-[#69B9E7] mr-1 shrink-0" />
          <span className="text-[11px] font-mono tabular-nums text-stone-300 mr-1.5">
            {yawDeg}°
          </span>
          {nodes.map((n, i) => {
            const solvedByMe = myMember?.solvedNodeIds.includes(n.id);
            const isLocked = lockedNode?.id === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  targetYawRef.current = n.bearingDeg;
                  setScanStepsTaken((s) => s + 1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  solvedByMe
                    ? 'bg-[#2F7D46] text-white'
                    : isLocked
                    ? 'bg-[#F5C451] text-[#202923]'
                    : 'bg-[#193126] text-stone-300 hover:bg-[#244636]'
                }`}
                title={`Scan to Beacon #${i + 1} (${n.bearingDeg}°)`}
              >
                #{i + 1} {solvedByMe ? '✓' : `${n.bearingDeg}°`}
              </button>
            );
          })}
        </div>

        {/* Camera AR Toggle + Gyro Toggle + Exit */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleArCameraMode()}
            className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
              arCameraEnabled
                ? 'bg-[#F5C451] text-[#202923] border-[#F5C451]'
                : 'bg-[#101F18]/95 text-emerald-100 border-emerald-800/70 hover:bg-[#193025]'
            }`}
          >
            {arCameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            <span>{arCameraEnabled ? 'AR Live' : 'AR Camera'}</span>
          </button>

          <button
            type="button"
            onClick={() => setGyroEnabled((g) => !g)}
            className={`hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold border items-center gap-1.5 cursor-pointer ${
              gyroEnabled
                ? 'bg-[#69B9E7] text-[#0F1B15] border-[#69B9E7]'
                : 'bg-[#101F18]/95 text-stone-200 border-emerald-800/70'
            }`}
            title="Toggle Mobile Gyroscope 360° Look"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Gyro</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              stopCameraStream();
              await leavePrivateRoom(activeRoom.roomCode, profile.uid).catch(() => {});
              setActiveRoom(null);
              setSection(AppSection.MULTIPLAYER);
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#101F18]/95 hover:bg-[#2C2118] border border-emerald-800/70 text-stone-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Co-op Shared Energy Core Bar (when in Co-op Adventure mode) */}
      {activeRoom.gameMode === 'coop_adventure' && activeRoom.matchState && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-md px-4 py-2.5 rounded-2xl bg-[#101F18]/95 border border-[#2F7D46] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#F5C451]" />
              <span>Team Central Core Energy</span>
            </span>
            <span>
              {activeRoom.matchState.sharedCoreEnergy} / {activeRoom.matchState.targetCoreEnergy}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#09120E] overflow-hidden">
            <div
              className="h-full bg-[#2F7D46] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (activeRoom.matchState.sharedCoreEnergy /
                      Math.max(1, activeRoom.matchState.targetCoreEnergy)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Left Live Room Standings Card */}
      <aside className="hidden md:block absolute left-3 bottom-4 z-20 w-72 rounded-2xl bg-[#101F18]/95 border border-emerald-800/70 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-[#F5C451]">
          <span className="flex items-center gap-1.5 font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Live Squad Standings</span>
          </span>
          <span>{nodes.length} Beacons</span>
        </div>

        <div className="space-y-1.5">
          {sortedStandings.map((m, idx) => (
            <div
              key={m.id}
              className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-xs ${
                m.userId === profile.uid
                  ? 'bg-[#1D392C] border border-[#2F7D46]'
                  : 'bg-[#0C1712]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-stone-400 w-4">#{idx + 1}</span>
                <AvatarImage avatarId={m.avatarId} sizeClass="w-6 h-6" />
                <span className="truncate font-semibold">{m.displayName}</span>
              </div>
              <div className="font-mono tabular-nums text-right shrink-0">
                <span className="text-[#F5C451] font-bold">{m.score}</span>
                <span className="text-stone-400 ml-1.5">
                  ({m.solvedNodeIds.length}/{nodes.length})
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Bottom Center Target-Lock Action Prompt */}
      {activeRoom.roomStatus === 'in_progress' && !openNodeId && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-md text-center">
          {lockedNode ? (
            <button
              type="button"
              onClick={() => {
                setOpenNodeId(lockedNode.id);
                setSelectedOption(null);
                setAnswerFeedback(null);
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] font-extrabold text-sm shadow-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>
                {myMember?.solvedNodeIds.includes(lockedNode.id)
                  ? `BEACON #${lockedNode.index + 1} SOLVED ✓ (${lockedNode.title})`
                  : `OPEN JAVA BEACON #${lockedNode.index + 1}: ${lockedNode.title}`}
              </span>
            </button>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-[#101F18]/95 border border-emerald-800/70 text-xs text-stone-200 font-mono">
              Drag 360° (or tap #1–#5 above) to aim at a glowing Java Relay Beacon
            </div>
          )}
        </div>
      )}

      {/* Synchronized Countdown Overlay (roomStatus === 'starting') */}
      {activeRoom.roomStatus === 'starting' && (
        <div className="absolute inset-0 z-30 bg-[#0B1510]/85 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
            Synchronizing 360° Multiplayer Arena
          </div>
          <div className="font-display text-6xl text-white">
            {countdownSec > 0 ? countdownSec : 'GO!'}
          </div>
          <p className="text-sm text-stone-300 max-w-md">
            Scan 360° around {worldSpec.name} and solve the 5 Java Relay Beacons!
          </p>
        </div>
      )}

      {/* Interactive Java Relay Challenge Terminal Modal */}
      {activeModalNode && activeRoom.roomStatus === 'in_progress' && (
        <div className="absolute inset-0 z-30 bg-[#08110D]/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border-2 border-[#F5C451] bg-[#13261E] p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#F5C451]">
                  Java Relay Beacon #{activeModalNode.index + 1} · {activeModalNode.bearingDeg}°
                  Bearing
                </div>
                <h2 className="text-xl font-bold text-white">{activeModalNode.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenNodeId(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-stone-200 leading-relaxed">{activeModalNode.prompt}</p>

            {activeModalNode.codeSnippet && (
              <pre className="p-3.5 rounded-xl bg-[#0B1611] border border-emerald-900 font-mono text-xs text-emerald-200 overflow-x-auto">
                <code>{activeModalNode.codeSnippet}</code>
              </pre>
            )}

            <div className="space-y-2">
              {activeModalNode.options.map((opt, idx) => {
                const chosen = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full p-3 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      chosen
                        ? 'border-[#F5C451] bg-[#1F3B2E] text-white font-bold'
                        : 'border-emerald-900/80 bg-[#0E1C16] text-stone-200 hover:bg-[#162C22]'
                    }`}
                  >
                    <span>{opt}</span>
                    {chosen && <CheckCircle2 className="w-4 h-4 text-[#F5C451] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {answerFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  answerFeedback.correct
                    ? 'bg-[#1B3A2A] border-[#2F7D46] text-emerald-200'
                    : 'bg-[#2C2118] border-[#F28C45] text-amber-100'
                }`}
              >
                {answerFeedback.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpenNodeId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-300 hover:text-white cursor-pointer"
              >
                Back to 360° Scan
              </button>
              <button
                type="button"
                disabled={
                  selectedOption === null ||
                  submittingAnswer ||
                  Boolean(myMember?.solvedNodeIds.includes(activeModalNode.id))
                }
                onClick={() => void handleSubmitNodeAnswer()}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#2F7D46] hover:bg-[#3A9454] disabled:opacity-55 text-white cursor-pointer"
              >
                {submittingAnswer ? 'EXECUTING JAVA...' : 'SUBMIT ANSWER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Match Completion Podium (roomStatus === 'completed') */}
      {activeRoom.roomStatus === 'completed' && (
        <div className="absolute inset-0 z-40 bg-[#0B1510]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-[#F5C451] bg-[#13261E] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F5C451]/20 text-[#F5C451] flex items-center justify-center">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#F5C451]">
                Room {activeRoom.roomCode} · Match Complete
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {activeRoom.gameMode === 'coop_adventure'
                  ? 'Central Core Restored Together!'
                  : `Winner: ${activeRoom.matchState?.winnerDisplayName || sortedStandings[0]?.displayName}!`}
              </h2>
            </div>

            <div className="space-y-2.5">
              {sortedStandings.map((m, idx) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    idx === 0
                      ? 'border-[#F5C451] bg-[#1E392C]'
                      : 'border-emerald-900/70 bg-[#0E1C16]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-sm text-[#F5C451] w-6">#{idx + 1}</span>
                    <AvatarImage avatarId={m.avatarId} sizeClass="w-10 h-10" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                        <span>{m.displayName}</span>
                        {idx === 0 && <Crown className="w-4 h-4 text-[#F5C451] shrink-0" />}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        Beacons Solved: {m.solvedNodeIds.length}/{nodes.length}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-[#F5C451] tabular-nums">
                    {m.score} pts
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setSection(AppSection.MULTIPLAYER);
                }}
                className="px-4 py-3 rounded-xl text-xs font-bold border border-emerald-800 bg-[#182E24] hover:bg-[#213F31] text-stone-200 cursor-pointer"
              >
                Return to Room Lobby
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={async () => {
                    const restarted = await startRoomMatch(activeRoom.roomCode, profile.uid);
                    setActiveRoom(restarted);
                  }}
                  className="px-6 py-3 rounded-xl text-xs font-extrabold bg-[#F5C451] hover:bg-[#f8cf6b] text-[#202923] inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>PLAY REMATCH</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
