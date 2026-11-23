import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Eye,
  Maximize2,
  Moon,
  Move,
  RotateCcw,
  RotateCw,
  Smartphone,
  Sun,
  Tv,
} from 'lucide-react';
import {
  AnimationClip,
  JointTransform,
  RigType,
  VfxEffect,
  ViewportAspectFrame,
  ViewportBackdrop,
  WorkbenchMode,
} from '../types/workbench';
import {
  applyPoseToRig,
  buildHusserRig,
  buildR15Rig,
  buildStudBaseplate,
  RigHandle,
} from '../scene/studVoxelBuilder';
import { VfxSceneRenderer } from '../scene/vfxRenderer';
import { evaluateAnimationPose, roundNum } from '../engine/vfxMath';

export interface Viewport3DHandle {
  resetCamera: () => void;
  startWebmRecording: () => boolean;
  stopWebmRecording: () => void;
}

interface Viewport3DProps {
  mode: WorkbenchMode;
  vfxEffect: VfxEffect;
  animation: AnimationClip;
  playing: boolean;
  loop: boolean;
  quarterSpeed: boolean;
  currentTimeRef: React.MutableRefObject<number>;
  scrubSignal: number;
  selectedJoint: string;
  onSelectJoint: (joint: string) => void;
  onJointGizmoChange: (joint: string, transform: JointTransform) => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  gizmoMode: 'rotate' | 'translate';
  onChangeGizmoMode: (mode: 'rotate' | 'translate') => void;
  onTimeReport: (time: number, activeParticles: number, activeCubes: number) => void;
  onRecordingChange: (recording: boolean) => void;
}

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

export const Viewport3D = React.forwardRef<Viewport3DHandle, Viewport3DProps>(
  function Viewport3D(props, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const flashRef = useRef<HTMLDivElement | null>(null);
    const [backdrop, setBackdrop] = useState<ViewportBackdrop>('dark');
    const [aspectFrame, setAspectFrame] = useState<ViewportAspectFrame>('free');
    const [contextLost, setContextLost] = useState(false);

    // Keep latest props in a mutable ref so WebGL mounts exactly once
    const propsRef = useRef(props);
    propsRef.current = props;
    const backdropRef = useRef<ViewportBackdrop>(backdrop);
    backdropRef.current = backdrop;

    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const recordCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isRecordingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(7.5, 5.2, 9.2);
          controlsRef.current.target.set(0, 2.2, 0);
          controlsRef.current.update();
        }
      },
      startWebmRecording: () => {
        const renderer = rendererRef.current;
        if (!renderer || typeof MediaRecorder === 'undefined') return false;
        try {
          // Dedicated 16:9 1280x720 offscreen composite canvas for crisp 16:9 WebM output
          const recCanvas = document.createElement('canvas');
          recCanvas.width = 1280;
          recCanvas.height = 720;
          const recCtx = recCanvas.getContext('2d');
          if (!recCtx) return false;

          recordCanvasRef.current = recCanvas;
          recordCtxRef.current = recCtx;

          const stream = recCanvas.captureStream(30);
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
          };
          recorder.onstop = () => {
            isRecordingRef.current = false;
            propsRef.current.onRecordingChange(false);
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const baseName =
              propsRef.current.mode === 'vfx'
                ? propsRef.current.vfxEffect.name
                : propsRef.current.animation.name;
            a.href = url;
            a.download = `${baseName.replace(/\s+/g, '_')}_16x9.webm`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          };

          mediaRecorderRef.current = recorder;
          isRecordingRef.current = true;
          recorder.start();
          propsRef.current.onRecordingChange(true);
          return true;
        } catch {
          return false;
        }
      },
      stopWebmRecording: () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const scene = new THREE.Scene();
      const darkBg = new THREE.Color(0x161b24);
      const lightBg = new THREE.Color(0xdbe3ee);
      scene.background = darkBg.clone();
      scene.fog = new THREE.Fog(0x161b24, 24, 58);

      const width = Math.max(320, container.clientWidth);
      const height = Math.max(240, container.clientHeight);
      const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 160);
      camera.position.set(7.5, 5.2, 9.2);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(width, height);
      rendererRef.current = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => setContextLost(false);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      // Mandatory Studio Environment Reflection
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmremGenerator.dispose();

      // Balanced 3-point warm/cool studio lighting rig
      const hemi = new THREE.HemisphereLight(0xdbeafe, 0x3b4252, 0.92);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
      keyLight.position.set(9, 15, 10);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 2;
        keyLight.shadow.camera.far = 36;
        const d = 11;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
      }
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
      rimLight.position.set(-10, 8, -10);
      scene.add(rimLight);

      // Grey Stud Voxel Baseplate
      const baseplate = buildStudBaseplate(scene);

      // Build Husser + R15 rigs + Onion Skin ghosts
      const husserRig = buildHusserRig();
      const r15Rig = buildR15Rig();
      r15Rig.root.visible = false;
      scene.add(husserRig.root, r15Rig.root);

      const husserGhostPrev = buildHusserRig({ ghostColor: 0x38bdf8, ghostOpacity: 0.24 });
      const husserGhostNext = buildHusserRig({ ghostColor: 0xf59e0b, ghostOpacity: 0.24 });
      const r15GhostPrev = buildR15Rig({ ghostColor: 0x38bdf8, ghostOpacity: 0.24 });
      const r15GhostNext = buildR15Rig({ ghostColor: 0xf59e0b, ghostOpacity: 0.24 });
      husserGhostPrev.root.visible = false;
      husserGhostNext.root.visible = false;
      r15GhostPrev.root.visible = false;
      r15GhostNext.root.visible = false;
      scene.add(
        husserGhostPrev.root,
        husserGhostNext.root,
        r15GhostPrev.root,
        r15GhostNext.root
      );

      // VFX Simulation Engine
      const vfxRenderer = new VfxSceneRenderer(scene);

      // OrbitControls
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.target.set(0, 2.2, 0);
      orbit.enableDamping = !isSoftwareGl;
      orbit.dampingFactor = 0.07;
      orbit.maxPolarAngle = Math.PI * 0.495;
      orbit.minDistance = 3.5;
      orbit.maxDistance = 32;
      orbit.update();
      controlsRef.current = orbit;

      // TransformControls Gizmo for Animation Rig Editing
      const transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.setSpace('local');
      transformControls.setSize(0.78);
      const gizmoHelper =
        typeof (transformControls as unknown as { getHelper?: () => THREE.Object3D }).getHelper ===
        'function'
          ? (transformControls as unknown as { getHelper: () => THREE.Object3D }).getHelper()
          : (transformControls as unknown as THREE.Object3D);
      scene.add(gizmoHelper);

      let isDraggingGizmo = false;
      const onDraggingChanged = (event: { value: unknown }) => {
        isDraggingGizmo = Boolean(event.value);
        orbit.enabled = !isDraggingGizmo;
      };
      transformControls.addEventListener('dragging-changed', onDraggingChanged);

      const commitGizmoTransform = () => {
        const cur = propsRef.current;
        if (cur.mode !== 'animation' || !isDraggingGizmo) return;
        const activeRig: RigHandle = cur.animation.rig === 'R15' ? r15Rig : husserRig;
        const joint = activeRig.joints[cur.selectedJoint];
        const rest = activeRig.restPositions[cur.selectedJoint];
        if (!joint || !rest) return;

        const radToDeg = THREE.MathUtils.RAD2DEG;
        cur.onJointGizmoChange(cur.selectedJoint, {
          rx: roundNum(joint.rotation.x * radToDeg, 1),
          ry: roundNum(joint.rotation.y * radToDeg, 1),
          rz: roundNum(joint.rotation.z * radToDeg, 1),
          px: roundNum(joint.position.x - rest.x, 2),
          py: roundNum(joint.position.y - rest.y, 2),
          pz: roundNum(joint.position.z - rest.z, 2),
          sx: roundNum(joint.scale.x, 2),
          sy: roundNum(joint.scale.y, 2),
          sz: roundNum(joint.scale.z, 2),
        });
      };
      transformControls.addEventListener('objectChange', commitGizmoTransform);

      // Raycast joint picking on pointer click in Animation mode
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPos = { x: 0, y: 0 };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };
      const onPointerUp = (e: PointerEvent) => {
        if (isDraggingGizmo) return;
        const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (dist > 5) return;
        const cur = propsRef.current;
        if (cur.mode !== 'animation') return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const activeRig = cur.animation.rig === 'R15' ? r15Rig : husserRig;
        const hits = raycaster.intersectObjects(activeRig.pickables, false);
        if (hits.length > 0) {
          const hitJoint = hits[0].object.userData.jointName as string | undefined;
          if (hitJoint) cur.onSelectJoint(hitJoint);
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      // ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        const w = Math.max(320, container.clientWidth);
        const h = Math.max(240, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
      });
      resizeObserver.observe(container);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Main animation loop with software-WebGL pacing via afterDraw()
      let disposed = false;
      let frameId = 0;
      let lastNow = performance.now();
      let lastReportMs = 0;
      let prevScrubSignal = propsRef.current.scrubSignal;
      let prevAttachedJoint: THREE.Object3D | null = null;
      let prevGizmoMode: string = '';
      let prevBackdrop: ViewportBackdrop = 'dark';
      let currentSlowMo = 1.0;

      const afterDraw = (cb: () => void) => {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
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

        const now = performance.now();
        const rawDt = Math.min(0.05, (now - lastNow) / 1000);
        lastNow = now;

        const cur = propsRef.current;

        // Backdrop theme update
        if (backdropRef.current !== prevBackdrop) {
          prevBackdrop = backdropRef.current;
          const targetCol = prevBackdrop === 'light' ? lightBg : darkBg;
          scene.background = targetCol.clone();
          if (scene.fog instanceof THREE.Fog) {
            scene.fog.color.copy(targetCol);
          }
          hemi.intensity = prevBackdrop === 'light' ? 1.15 : 0.92;
        }

        // Scrub detection
        if (cur.scrubSignal !== prevScrubSignal) {
          prevScrubSignal = cur.scrubSignal;
          vfxRenderer.resetSimulation();
        }

        const totalDuration =
          cur.mode === 'vfx'
            ? Math.max(0.2, cur.vfxEffect.duration)
            : Math.max(0.2, cur.animation.length);

        const speedFactor = (cur.quarterSpeed ? 0.25 : 1.0) * (cur.mode === 'vfx' ? currentSlowMo : 1.0);
        const effectiveDt = cur.playing ? rawDt * speedFactor : 0;

        if (cur.playing) {
          let nextT = cur.currentTimeRef.current + effectiveDt;
          if (nextT >= totalDuration) {
            if (cur.loop) {
              nextT = nextT % totalDuration;
            } else {
              nextT = totalDuration;
            }
          }
          cur.currentTimeRef.current = nextT;
        }

        const t = cur.currentTimeRef.current;

        // Rig visibility & pose application
        const activeRigType: RigType = cur.mode === 'vfx' ? 'Husser' : cur.animation.rig;
        husserRig.root.visible = activeRigType === 'Husser';
        r15Rig.root.visible = activeRigType === 'R15';

        let activeParticles = 0;
        let activeCubes = 0;
        const savedCamPos = camera.position.clone();
        const savedCamRotZ = camera.rotation.z;

        if (cur.mode === 'vfx') {
          vfxRenderer.setVisible(true);
          // Subtle lively idle breathing on the Husser placeholder in VFX mode
          const idleBob = Math.sin(now * 0.0045) * 0.08;
          const jawPant = 22 + Math.sin(now * 0.009) * 10;
          applyPoseToRig(husserRig, {
            Body: { rx: 0, ry: 0, rz: 0, px: 0, py: idleBob, pz: 0, sx: 1, sy: 1 + idleBob * 0.25, sz: 1 },
            Head: { rx: -2, ry: Math.sin(now * 0.002) * 5, rz: 0, px: 0, py: 0, pz: 0 },
            Jaw: { rx: jawPant, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            Tongue: { rx: 6, ry: Math.sin(now * 0.011) * 10, rz: Math.cos(now * 0.011) * 8, px: 0, py: 0, pz: 0 },
            Tail: { rx: 14, ry: Math.sin(now * 0.008) * 24, rz: 0, px: 0, py: 0, pz: 0 },
          });

          // Hide gizmo & onion skins in VFX mode
          if (prevAttachedJoint) {
            transformControls.detach();
            prevAttachedJoint = null;
          }
          husserGhostPrev.root.visible = false;
          husserGhostNext.root.visible = false;
          r15GhostPrev.root.visible = false;
          r15GhostNext.root.visible = false;

          const vfxOut = vfxRenderer.update(cur.vfxEffect, t, effectiveDt, camera);
          activeParticles = vfxOut.activeParticles;
          activeCubes = vfxOut.activeCubes;
          currentSlowMo = vfxOut.slowMoScale;

          // Apply Flash overlay directly to DOM ref (zero React re-render)
          if (flashRef.current) {
            if (vfxOut.flashOpacity > 0.005 && vfxOut.flashColor) {
              flashRef.current.style.opacity = String(vfxOut.flashOpacity);
              flashRef.current.style.backgroundColor = vfxOut.flashColor;
            } else {
              flashRef.current.style.opacity = '0';
            }
          }

          orbit.update();
          // Apply non-destructive temporary CameraShake offset for this render frame
          if (vfxOut.shakeOffset.lengthSq() > 0.00001) {
            camera.position.add(vfxOut.shakeOffset);
            camera.rotation.z += vfxOut.shakeRotZ;
          }
        } else {
          // Animation Mode
          vfxRenderer.setVisible(false);
          currentSlowMo = 1.0;
          if (flashRef.current) flashRef.current.style.opacity = '0';

          const activeRig = activeRigType === 'R15' ? r15Rig : husserRig;
          if (!isDraggingGizmo) {
            const pose = evaluateAnimationPose(cur.animation, t);
            applyPoseToRig(activeRig, pose);
          }

          // Onion Skinning (show previous & next keyframes as translucent cyan/amber ghosts)
          const sortedKeys = [...cur.animation.keys].sort((a, b) => a.t - b.t);
          const prevGhost = activeRigType === 'R15' ? r15GhostPrev : husserGhostPrev;
          const nextGhost = activeRigType === 'R15' ? r15GhostNext : husserGhostNext;
          const otherPrev = activeRigType === 'R15' ? husserGhostPrev : r15GhostPrev;
          const otherNext = activeRigType === 'R15' ? husserGhostNext : r15GhostNext;
          otherPrev.root.visible = false;
          otherNext.root.visible = false;

          if (cur.onionSkin && sortedKeys.length >= 2) {
            const prevKey = [...sortedKeys].reverse().find((k) => k.t < t - 0.015) ?? null;
            const nextKey = sortedKeys.find((k) => k.t > t + 0.015) ?? null;

            if (prevKey) {
              prevGhost.root.visible = true;
              applyPoseToRig(prevGhost, evaluateAnimationPose(cur.animation, prevKey.t));
            } else {
              prevGhost.root.visible = false;
            }
            if (nextKey) {
              nextGhost.root.visible = true;
              applyPoseToRig(nextGhost, evaluateAnimationPose(cur.animation, nextKey.t));
            } else {
              nextGhost.root.visible = false;
            }
          } else {
            prevGhost.root.visible = false;
            nextGhost.root.visible = false;
          }

          // Attach TransformControls Gizmo to selected joint
          const targetJoint = activeRig.joints[cur.selectedJoint] ?? null;
          if (targetJoint !== prevAttachedJoint) {
            if (targetJoint) transformControls.attach(targetJoint);
            else transformControls.detach();
            prevAttachedJoint = targetJoint;
          }
          if (cur.gizmoMode !== prevGizmoMode) {
            transformControls.setMode(cur.gizmoMode);
            prevGizmoMode = cur.gizmoMode;
          }

          orbit.update();
        }

        renderer.render(scene, camera);

        // Restore unshaken camera transform immediately after render
        if (cur.mode === 'vfx') {
          camera.position.copy(savedCamPos);
          camera.rotation.z = savedCamRotZ;
        }

        // If 16:9 WebM video recording is active, blit center-cropped 16:9 frame into offscreen recorder canvas
        if (isRecordingRef.current && recordCtxRef.current && recordCanvasRef.current) {
          const src = renderer.domElement;
          const dstW = recordCanvasRef.current.width;
          const dstH = recordCanvasRef.current.height;
          const srcAspect = src.width / Math.max(1, src.height);
          const dstAspect = dstW / dstH;
          let sx = 0;
          let sy = 0;
          let sw = src.width;
          let sh = src.height;
          if (srcAspect > dstAspect) {
            sw = src.height * dstAspect;
            sx = (src.width - sw) / 2;
          } else {
            sh = src.width / dstAspect;
            sy = (src.height - sh) / 2;
          }
          recordCtxRef.current.drawImage(src, sx, sy, sw, sh, 0, 0, dstW, dstH);
        }

        // Throttle React HUD updates to <= 12Hz so we never thrash React state at 60Hz
        if (now - lastReportMs >= 85) {
          lastReportMs = now;
          cur.onTimeReport(t, activeParticles, activeCubes);
        }

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
        clearTimeout(frameId);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        transformControls.removeEventListener('dragging-changed', onDraggingChanged);
        transformControls.removeEventListener('objectChange', commitGizmoTransform);
        transformControls.dispose();
        orbit.dispose();
        baseplate.dispose();
        husserRig.dispose();
        r15Rig.dispose();
        husserGhostPrev.dispose();
        husserGhostNext.dispose();
        r15GhostPrev.dispose();
        r15GhostNext.dispose();
        vfxRenderer.dispose();
        envTex.dispose();
        renderer.dispose();
      };
    }, []);

    return (
      <div
        className="relative flex-1 min-w-0 h-full bg-[#161b24] overflow-hidden select-none"
        data-testid="viewport-3d"
        data-mode={props.mode}
        data-rig={props.mode === 'animation' ? props.animation.rig : 'Husser'}
      >
        {/* Dedicated isolated WebGL canvas mount */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full" />

        {/* Screen Flash overlay for VFX Flash element */}
        <div
          ref={flashRef}
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-75"
          style={{ opacity: 0 }}
        />

        {/* 16:9 or Mobile Landscape aspect frame guide */}
        {aspectFrame !== 'free' && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6">
            <div
              className="relative border-2 border-amber-400/80 shadow-[0_0_0_9999px_rgba(10,12,18,0.52)]"
              style={{
                aspectRatio: aspectFrame === '16:9' ? '16 / 9' : '19.5 / 9',
                width: '100%',
                maxWidth: '92%',
                maxHeight: '86%',
              }}
            >
              <span className="absolute top-2 left-2 text-[11px] font-mono text-amber-300 bg-[#0e1118]/90 border border-amber-500/30 px-2 py-0.5 rounded">
                {aspectFrame === '16:9' ? '16:9 Broadcast Safe Frame' : 'Mobile Landscape 19.5:9 Safe Frame'}
              </span>
            </div>
          </div>
        )}

        {/* Top-left compact viewport controls (no backdrop-filter over WebGL) */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-[#12161F]/95 border border-slate-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setBackdrop('dark')}
              aria-label="Dark viewport background"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                backdrop === 'dark'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setBackdrop('light')}
              aria-label="Light viewport background"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                backdrop === 'light'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
          </div>

          <div className="flex items-center bg-[#12161F]/95 border border-slate-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setAspectFrame('free')}
              aria-label="Free aspect viewport"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                aspectFrame === 'free'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Free
            </button>
            <button
              type="button"
              onClick={() => setAspectFrame('16:9')}
              aria-label="16:9 aspect frame"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                aspectFrame === '16:9'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              16:9
            </button>
            <button
              type="button"
              onClick={() => setAspectFrame('mobile')}
              aria-label="Mobile landscape aspect frame"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                aspectFrame === 'mobile'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Phone
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.set(7.5, 5.2, 9.2);
                controlsRef.current.target.set(0, 2.2, 0);
                controlsRef.current.update();
              }
            }}
            aria-label="Reset 3D camera"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#12161F]/95 border border-slate-800 rounded-md text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Cam
          </button>

          {props.mode === 'animation' && (
            <>
              <div className="flex items-center bg-[#12161F]/95 border border-slate-800 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => props.onChangeGizmoMode('rotate')}
                  aria-label="Gizmo rotate mode"
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    props.gizmoMode === 'rotate'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => props.onChangeGizmoMode('translate')}
                  aria-label="Gizmo move mode"
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    props.gizmoMode === 'translate'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  Move
                </button>
              </div>

              <button
                type="button"
                onClick={props.onToggleOnionSkin}
                aria-label="Toggle onion skinning"
                aria-pressed={props.onionSkin}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap ${
                  props.onionSkin
                    ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                    : 'bg-[#12161F]/95 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Onion Skin
              </button>
            </>
          )}
        </div>

        {/* Bottom-left subtle camera hint */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none text-[11px] text-slate-400 bg-[#12161F]/85 border border-slate-800/80 px-2.5 py-1 rounded">
          {props.mode === 'animation'
            ? `Click joint to select · Drag gizmo to pose (${props.selectedJoint}) · Orbit: Drag`
            : 'Orbit: Left Drag · Pan: Right Drag · Zoom: Scroll · Stud Voxel Baseplate'}
        </div>

        {contextLost && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#12161F]/95 text-slate-200 text-sm">
            WebGL context paused — restoring 3D Stud Voxel viewport...
          </div>
        )}
      </div>
    );
  }
);
