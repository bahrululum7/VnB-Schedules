import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Camera, ChevronDown, ChevronUp, RotateCcw, Sparkles } from 'lucide-react';
import type { CoupleOutfitsState, OutfitGender } from '../types/outfit';
import { createOutfitTexturePack, type ProceduralTexturePack } from '../utils/outfitTextures';
import { buildCharacterRig, disposeObject3D, type CharacterRig } from '../utils/outfit3dBuilder';

export type CameraPresetId = 'couple' | 'focus' | 'face' | 'torso' | 'shoes';
export type PoseModeId = 'santai' | 'runway' | 'sapa';

interface OutfitStage3DProps {
  outfits: CoupleOutfitsState;
  activeGender: OutfitGender;
  partner1Name: string;
  partner2Name: string;
  onSelectGender: (gender: OutfitGender) => void;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function getCameraFraming(
  preset: CameraPresetId,
  activeGender: OutfitGender
): { pos: [number, number, number]; target: [number, number, number] } {
  const x = activeGender === 'female' ? -0.34 : 0.34;
  switch (preset) {
    case 'face':
      return { pos: [x, 1.62, 0.92], target: [x, 1.56, 0] };
    case 'torso':
      return { pos: [x, 1.24, 1.22], target: [x, 1.15, 0] };
    case 'shoes':
      return { pos: [x, 0.34, 1.12], target: [x, 0.22, 0] };
    case 'focus':
      return { pos: [x, 1.05, 1.98], target: [x, 0.92, 0] };
    case 'couple':
    default:
      return { pos: [0, 1.14, 2.55], target: [0, 0.92, 0] };
  }
}

export function OutfitStage3D({
  outfits,
  activeGender,
  partner1Name,
  partner2Name,
  onSelectGender,
}: OutfitStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('couple');
  const [poseMode, setPoseMode] = useState<PoseModeId>('santai');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const activeGenderRef = useRef<OutfitGender>(activeGender);
  activeGenderRef.current = activeGender;

  const poseModeRef = useRef<PoseModeId>(poseMode);
  poseModeRef.current = poseMode;

  const onSelectGenderRef = useRef(onSelectGender);
  onSelectGenderRef.current = onSelectGender;

  const transitionActiveRef = useRef(true);
  const goalPosRef = useRef(new THREE.Vector3(0, 1.14, 2.55));
  const goalTargetRef = useRef(new THREE.Vector3(0, 0.92, 0));

  const sceneRef = useRef<THREE.Scene | null>(null);
  const texturesRef = useRef<ProceduralTexturePack | null>(null);
  const isSoftwareGlRef = useRef<boolean>(false);
  const femaleRigRef = useRef<CharacterRig | null>(null);
  const maleRigRef = useRef<CharacterRig | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);

  // Sync camera goal whenever preset or active character changes
  useEffect(() => {
    const framing = getCameraFraming(cameraPreset, activeGender);
    goalPosRef.current.set(...framing.pos);
    goalTargetRef.current.set(...framing.target);
    transitionActiveRef.current = true;
  }, [cameraPreset, activeGender]);

  // Initialize Three.js Studio Viewport once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    isSoftwareGlRef.current = isSoftwareGl;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL tidak tersedia di browser ini.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 520);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';

    const scene = new THREE.Scene();
    const bgHex = 0xf4f2f7;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.Fog(bgHex, 5.2, 12.5);
    sceneRef.current = scene;

    // Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      36,
      (container.clientWidth || 640) / (container.clientHeight || 520),
      0.1,
      40
    );
    camera.position.copy(goalPosRef.current);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(goalTargetRef.current);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.72;
    controls.maxDistance = 4.8;
    controls.maxPolarAngle = Math.PI * 0.51;
    controls.minPolarAngle = 0.18;
    controls.enablePan = true;
    controls.update();

    const handleControlStart = () => {
      transitionActiveRef.current = false;
    };
    controls.addEventListener('start', handleControlStart);

    // 3-Point Warm/Cool Studio Lighting + Pink Rim Highlight
    const hemi = new THREE.HemisphereLight(0xffffff, 0xe9dde8, 1.05);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.65);
    keyLight.position.set(2.4, 4.2, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -0.4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf9a8d4, 0.85);
    rimLight.position.set(-1.6, 2.6, -2.8);
    scene.add(rimLight);

    // Soft Pearl Studio Floor + Sleek Podium Disc
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf6f4f9,
      roughness: 0.9,
      metalness: 0.02,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    scene.add(floor);

    const podiumGroup = new THREE.Group();
    const podiumBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.98, 0.04, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.35,
      })
    );
    podiumBase.position.y = -0.02;
    podiumBase.receiveShadow = true;
    const podiumTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.925, 0.008, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        roughness: 0.22,
        metalness: 0.72,
      })
    );
    podiumTrim.rotation.x = Math.PI / 2;
    podiumTrim.position.y = 0.001;
    podiumGroup.add(podiumBase, podiumTrim);
    scene.add(podiumGroup);

    // Active Character Indicator Ring on Podium
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.27, 40),
      new THREE.MeshBasicMaterial({
        color: 0xec4899,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.set(activeGenderRef.current === 'female' ? -0.34 : 0.34, 0.004, 0);
    scene.add(selectionRing);
    selectionRingRef.current = selectionRing;

    // Procedural Textures
    const textures = createOutfitTexturePack(renderer.capabilities.getMaxAnisotropy());
    texturesRef.current = textures;

    // Build initial characters
    const femaleRig = buildCharacterRig('female', outfits.female, textures, isSoftwareGl);
    femaleRig.root.position.set(-0.34, 0, 0);
    scene.add(femaleRig.root);
    femaleRigRef.current = femaleRig;

    const maleRig = buildCharacterRig('male', outfits.male, textures, isSoftwareGl);
    maleRig.root.position.set(0.34, 0, 0);
    scene.add(maleRig.root);
    maleRigRef.current = maleRig;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster Click-to-Select Character in 3D
    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, camera);

      const targets: THREE.Object3D[] = [];
      if (femaleRigRef.current) targets.push(femaleRigRef.current.root);
      if (maleRigRef.current) targets.push(maleRigRef.current.root);

      const hits = _raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        let cur: THREE.Object3D | null = hits[0].object;
        while (cur) {
          if (cur.userData.gender === 'female' || cur.userData.gender === 'male') {
            onSelectGenderRef.current(cur.userData.gender);
            break;
          }
          cur = cur.parent;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp responsive viewport
    const handleResize = () => {
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('Konteks 3D terputus sementara, silakan muat ulang halaman.');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // Animation Loop (paced via afterDraw on software WebGL, rAF on GPU)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const animateCharacter = (rig: CharacterRig | null, elapsed: number, phaseOffset: number, dt: number) => {
      if (!rig) return;
      const isActive = rig.gender === activeGenderRef.current;
      const pose = poseModeRef.current;

      // Subtle breathing & gentle posture
      const breath = Math.sin(elapsed * 2.1 + phaseOffset);
      rig.torsoGroup.position.y = 0.78 + rig.baseHeightOffset + breath * 0.005;

      const targetYaw = isActive ? (rig.gender === 'female' ? 0.14 : -0.14) : (rig.gender === 'female' ? 0.08 : -0.08);
      rig.root.rotation.y = THREE.MathUtils.damp(rig.root.rotation.y, targetYaw, 6, dt);

      // Pose targets
      let leftArmZ = 0.08;
      let rightArmZ = -0.08;
      let rightArmX = 0;
      let headRotY = isActive ? (rig.gender === 'female' ? -0.06 : 0.06) : 0;

      if (pose === 'runway') {
        leftArmZ = rig.gender === 'female' ? 0.24 : 0.14;
        rightArmZ = rig.gender === 'female' ? -0.24 : -0.14;
        headRotY += Math.sin(elapsed * 1.1 + phaseOffset) * 0.08;
      } else if (pose === 'sapa' && isActive) {
        rightArmZ = -2.35 + Math.sin(elapsed * 5.2) * 0.18;
        rightArmX = -0.18;
      } else {
        leftArmZ = 0.07 + breath * 0.015;
        rightArmZ = -0.07 - breath * 0.015;
      }

      rig.leftArmGroup.rotation.z = THREE.MathUtils.damp(rig.leftArmGroup.rotation.z, leftArmZ, 7, dt);
      rig.rightArmGroup.rotation.z = THREE.MathUtils.damp(rig.rightArmGroup.rotation.z, rightArmZ, 7, dt);
      rig.rightArmGroup.rotation.x = THREE.MathUtils.damp(rig.rightArmGroup.rotation.x, rightArmX, 7, dt);
      rig.headGroup.rotation.y = THREE.MathUtils.damp(rig.headGroup.rotation.y, headRotY, 5, dt);

      // Periodic natural eye blink every ~3.8s
      const blinkCycle = (elapsed + phaseOffset * 1.4) % 3.8;
      const eyeScaleY = blinkCycle > 3.66 ? 0.12 : 1.0;
      rig.eyeLeftGroup.scale.y = THREE.MathUtils.damp(rig.eyeLeftGroup.scale.y, eyeScaleY, 26, dt);
      rig.eyeRightGroup.scale.y = THREE.MathUtils.damp(rig.eyeRightGroup.scale.y, eyeScaleY, 26, dt);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;

      if (transitionActiveRef.current) {
        _camGoalPos.copy(goalPosRef.current);
        _camGoalTarget.copy(goalTargetRef.current);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 6.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 6.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 6.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 6.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 6.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 6.5, dt);
        if (
          camera.position.distanceTo(_camGoalPos) < 0.008 &&
          controls.target.distanceTo(_camGoalTarget) < 0.008
        ) {
          transitionActiveRef.current = false;
        }
      }

      if (selectionRingRef.current) {
        const ringGoalX = activeGenderRef.current === 'female' ? -0.34 : 0.34;
        selectionRingRef.current.position.x = THREE.MathUtils.damp(
          selectionRingRef.current.position.x,
          ringGoalX,
          9,
          dt
        );
      }

      animateCharacter(femaleRigRef.current, elapsed, 0, dt);
      animateCharacter(maleRigRef.current, elapsed, 1.3, dt);

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObs.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      if (femaleRigRef.current) {
        scene.remove(femaleRigRef.current.root);
        disposeObject3D(femaleRigRef.current.root);
        femaleRigRef.current = null;
      }
      if (maleRigRef.current) {
        scene.remove(maleRigRef.current.root);
        disposeObject3D(maleRigRef.current.root);
        maleRigRef.current = null;
      }
      disposeObject3D(floor);
      disposeObject3D(podiumGroup);
      disposeObject3D(selectionRing);
      envTex.dispose();
      textures.dispose();
      renderer.dispose();
      sceneRef.current = null;
      texturesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild Female 3D Character Rig cleanly on outfit change
  useEffect(() => {
    const scene = sceneRef.current;
    const textures = texturesRef.current;
    if (!scene || !textures) return;

    const prevYaw = femaleRigRef.current?.root.rotation.y ?? 0.1;
    if (femaleRigRef.current) {
      scene.remove(femaleRigRef.current.root);
      disposeObject3D(femaleRigRef.current.root);
    }

    const nextRig = buildCharacterRig(
      'female',
      outfits.female,
      textures,
      isSoftwareGlRef.current
    );
    nextRig.root.position.set(-0.34, 0, 0);
    nextRig.root.rotation.y = prevYaw;
    scene.add(nextRig.root);
    femaleRigRef.current = nextRig;
  }, [outfits.female]);

  // Rebuild Male 3D Character Rig cleanly on outfit change
  useEffect(() => {
    const scene = sceneRef.current;
    const textures = texturesRef.current;
    if (!scene || !textures) return;

    const prevYaw = maleRigRef.current?.root.rotation.y ?? -0.1;
    if (maleRigRef.current) {
      scene.remove(maleRigRef.current.root);
      disposeObject3D(maleRigRef.current.root);
    }

    const nextRig = buildCharacterRig(
      'male',
      outfits.male,
      textures,
      isSoftwareGlRef.current
    );
    nextRig.root.position.set(0.34, 0, 0);
    nextRig.root.rotation.y = prevYaw;
    scene.add(nextRig.root);
    maleRigRef.current = nextRig;
  }, [outfits.male]);

  const handleResetView = () => {
    setCameraPreset('couple');
    const framing = getCameraFraming('couple', activeGender);
    goalPosRef.current.set(...framing.pos);
    goalTargetRef.current.set(...framing.target);
    transitionActiveRef.current = true;
  };

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/15 bg-[#F4F2F7]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {webglError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#F4F2F7] text-zinc-800 p-6 text-center text-sm">
          {webglError}
        </div>
      )}

      {/* Top Minimal Overlay Bar (no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
        <div className="pointer-events-auto rounded-xl bg-zinc-950/82 border border-white/15 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          <span className="font-semibold">
            3D Studio · {activeGender === 'female' ? `Wanita (${partner1Name})` : `Lelaki (${partner2Name})`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetView}
          className="pointer-events-auto min-h-[34px] px-3 py-1.5 rounded-xl bg-zinc-950/82 hover:bg-zinc-900 border border-white/15 text-xs font-medium text-zinc-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-pink-400" />
          <span>Reset Kamera</span>
        </button>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setHudCollapsed((v) => !v)}
          className="pointer-events-auto mb-1.5 px-3 py-1 rounded-lg bg-zinc-950/85 border border-white/15 text-[11px] font-medium text-zinc-200 hover:text-white inline-flex items-center gap-1 cursor-pointer"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-pink-400" />
              <span>Tampilkan Kontrol Kamera</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-pink-400" />
              <span>Sembunyikan Kontrol</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto w-full rounded-xl bg-zinc-950/88 border border-white/15 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Camera Framing Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-zinc-400 mr-1 inline-flex items-center gap-1">
                <Camera className="w-3 h-3 text-pink-400" />
                <span>Kamera:</span>
              </span>
              {(
                [
                  { id: 'couple', label: 'Berdua' },
                  { id: 'focus', label: 'Full Body' },
                  { id: 'face', label: 'Wajah' },
                  { id: 'torso', label: 'Atasan' },
                  { id: 'shoes', label: 'Sepatu' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    cameraPreset === cam.id
                      ? 'bg-pink-500 text-zinc-950 font-semibold'
                      : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            {/* Pose Switcher */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-zinc-400 mr-1">Pose:</span>
              {(
                [
                  { id: 'santai', label: 'Santai' },
                  { id: 'runway', label: 'Runway' },
                  { id: 'sapa', label: 'Sapa' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPoseMode(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    poseMode === p.id
                      ? 'bg-pink-500 text-zinc-950 font-semibold'
                      : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
