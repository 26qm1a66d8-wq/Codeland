import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  attachKenneyCharacterModel,
  buildProceduralBlockyCharacter,
  createCollectibleCoin,
  createCompositeVoxelTree,
  createRadialContactShadowTexture,
  createVictoryPortal,
  createVoxelCanvasTexture,
  detectSoftwareWebGL,
} from './VoxelTexturesAndProps';

export const LandingHeroScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#13261E');
    scene.fog = new THREE.FogExp2('#13261E', 0.036);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(7.6, 5.8, 9.4);
    camera.lookAt(0, 1.3, 0);

    // Warm key light + Cool sky/ground hemisphere fill + Rim light
    const hemi = new THREE.HemisphereLight('#89CFF0', '#1B3B2B', 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#FFE7B8', 1.85);
    sun.position.set(9, 14, 8);
    sun.castShadow = !isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    const d = 9;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const rim = new THREE.DirectionalLight('#69B9E7', 0.65);
    rim.position.set(-8, 6, -8);
    scene.add(rim);

    // Textures
    const grassTex = createVoxelCanvasTexture(renderer, '#2F7D46', '#469B5E', 'noise');
    const stoneTex = createVoxelCanvasTexture(renderer, '#44524A', '#2F3B34', 'brick');
    const barkTex = createVoxelCanvasTexture(renderer, '#6B4423', '#4E3018', 'plank');
    const leafTex = createVoxelCanvasTexture(renderer, '#2F7D46', '#52A869', 'noise');
    const shadowTex = createRadialContactShadowTexture();

    // Floating Voxel Island Diorama using InstancedMesh (> 20 blocks)
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: '#5C4028', roughness: 0.92 });
    const pathMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.72 });

    const grassCoords: [number, number, number][] = [];
    const dirtCoords: [number, number, number][] = [];
    const pathCoords: [number, number, number][] = [];

    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const dist = Math.hypot(x, z);
        if (dist > 4.6) continue;
        const isPath = Math.abs(x) <= 1 && z >= -2 && z <= 3;
        if (isPath) {
          pathCoords.push([x, -0.5, z]);
        } else {
          grassCoords.push([x, -0.5, z]);
        }
        const depth = dist < 2.5 ? 2 : 1;
        for (let y = 1; y <= depth; y++) {
          dirtCoords.push([x, -0.5 - y, z]);
        }
      }
    }

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    const buildInstanced = (coords: [number, number, number][], mat: THREE.MeshStandardMaterial, baseHex?: string) => {
      const inst = new THREE.InstancedMesh(blockGeo, mat, coords.length);
      inst.castShadow = !isSoftwareGl;
      inst.receiveShadow = !isSoftwareGl;
      coords.forEach(([x, y, z], idx) => {
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
        if (baseHex) {
          tint.set(baseHex).offsetHSL(0, 0, ((idx % 5) - 2) * 0.018);
          inst.setColorAt(idx, tint);
        }
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
      return inst;
    };

    buildInstanced(grassCoords, grassMat, '#ffffff');
    buildInstanced(dirtCoords, dirtMat);
    buildInstanced(pathCoords, pathMat);

    // Portal at the back of the island
    const portal = createVictoryPortal('#69B9E7', shadowTex);
    portal.group.position.set(0, 0, -2.8);
    portal.group.scale.setScalar(0.75);
    portal.vortexMat.opacity = 0.65;
    portal.vortexMat.emissiveIntensity = 0.85;
    scene.add(portal.group);

    // Trees
    const treePositions: [number, number, number, number][] = [
      [-3.1, 0, -2.1, 0.85],
      [3.1, 0, -1.8, 0.92],
      [-2.8, 0, 2.2, 0.78],
    ];
    treePositions.forEach(([tx, ty, tz, sc]) => {
      const tree = createCompositeVoxelTree('forest', shadowTex, barkTex, leafTex);
      tree.position.set(tx, ty, tz);
      tree.scale.setScalar(sc);
      scene.add(tree);
    });

    // Explorer Character + Byte Guide
    const heroChar = buildProceduralBlockyCharacter('#2F7D46', shadowTex);
    heroChar.root.position.set(-0.6, 0, 1.7);
    heroChar.root.rotation.y = Math.PI * 0.92;
    scene.add(heroChar.root);
    attachKenneyCharacterModel(heroChar.bodyRig, '/assets/characters/Models/GLB format/character-a.glb');

    const byteChar = buildProceduralBlockyCharacter('#69B9E7', shadowTex);
    byteChar.root.position.set(1.4, 0, 0.9);
    byteChar.root.rotation.y = -Math.PI * 0.22;
    byteChar.root.scale.setScalar(0.86);
    scene.add(byteChar.root);
    attachKenneyCharacterModel(byteChar.bodyRig, '/assets/characters/Models/GLB format/character-g.glb');

    // Glowing Floating Code Cubes & Coin
    const coin = createCollectibleCoin(shadowTex);
    coin.group.position.set(2.4, 0, 2.2);
    scene.add(coin.group);

    const glowCubes: THREE.Mesh[] = [];
    const glowColors = ['#F5C451', '#69B9E7', '#2F7D46', '#F28C45'];
    glowColors.forEach((col, i) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.36, 0.36),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.65,
          roughness: 0.25,
          metalness: 0.4,
        })
      );
      const angle = (i / glowColors.length) * Math.PI * 2;
      m.position.set(Math.cos(angle) * 3.6, 2.2 + (i % 2) * 0.6, Math.sin(angle) * 3.2);
      scene.add(m);
      glowCubes.push(m);
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

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
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Gentle camera orbit
      const camAngle = elapsed * 0.16;
      camera.position.x = Math.cos(camAngle) * 9.6;
      camera.position.z = Math.sin(camAngle) * 9.6;
      camera.position.y = 5.4 + Math.sin(elapsed * 0.5) * 0.25;
      camera.lookAt(0, 1.25, -0.3);

      // Character idle bob
      heroChar.bodyRig.position.y = Math.abs(Math.sin(elapsed * 2.4)) * 0.06;
      byteChar.bodyRig.position.y = 0.15 + Math.sin(elapsed * 3.1) * 0.1;

      coin.spinner.rotation.y += dt * 2.2;
      portal.vortexMat.emissiveIntensity = 0.65 + Math.sin(elapsed * 3.2) * 0.22;

      glowCubes.forEach((cube, idx) => {
        cube.rotation.x += dt * 0.8;
        cube.rotation.y += dt * 1.1;
        cube.position.y = 2.1 + Math.sin(elapsed * 1.8 + idx * 1.4) * 0.35;
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      envTex.dispose();
      grassTex.dispose();
      stoneTex.dispose();
      barkTex.dispose();
      leafTex.dispose();
      shadowTex.dispose();
      blockGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-[#2F7D46]/30 bg-[#13261E]">
      <div ref={mountRef} className="w-full h-full" />
      {/* Semantic floating Java code overlays */}
      <div className="pointer-events-none absolute top-4 left-4 rounded-lg bg-[#141F19]/90 border border-[#2F7D46]/40 px-3 py-2 font-mono text-xs text-[#ECF2EE]">
        <span className="text-[#69B9E7]">System</span>.out.println(<span className="text-[#F5C451]">"Hello CODELAND!"</span>);
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-[#141F19]/90 border border-[#F5C451]/40 px-3 py-2 font-mono text-xs text-[#ECF2EE]">
        <span className="text-[#F28C45]">if</span> (keys &gt;= <span className="text-[#F5C451]">2</span>) &#123; openPortal(); &#125;
      </div>
    </div>
  );
};
