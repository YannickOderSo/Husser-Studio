import * as THREE from 'three';
import {
  BeamProps,
  CameraShakeProps,
  CubeBurstProps,
  EmissionDirection,
  FlashProps,
  ParticleEmitterProps,
  PillarProps,
  PreviewShape,
  RingProps,
  SlowMoProps,
  TrailProps,
  VfxEffect,
  VfxElement,
} from '../types/workbench';
import {
  clamp,
  evaluateColorSequence,
  evaluateNumberSequence,
  evaluateRingCurve,
  hexToRgb,
} from '../engine/vfxMath';

export interface VfxFrameOutput {
  activeParticles: number;
  activeCubes: number;
  flashColor: string | null;
  flashOpacity: number;
  shakeOffset: THREE.Vector3;
  shakeRotZ: number;
  slowMoScale: number;
}

interface SimParticle {
  alive: boolean;
  age: number;
  lifetime: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: number;
  rotSpeed: number;
  envSeed: number;
}

interface SimCube {
  alive: boolean;
  age: number;
  lifetime: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
  color: THREE.Color;
}

interface EmitterRuntime {
  elementId: string;
  mesh: THREE.InstancedMesh;
  material: THREE.MeshBasicMaterial;
  particles: SimParticle[];
  emitAccum: number;
  burstFired: boolean;
  shapeKey: string;
}

interface CubeBurstRuntime {
  elementId: string;
  cubeMesh: THREE.InstancedMesh;
  studMesh: THREE.InstancedMesh;
  cubes: SimCube[];
  burstFired: boolean;
}

interface RingRuntime {
  elementId: string;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  currentThickness: number;
}

interface PillarRuntime {
  elementId: string;
  group: THREE.Group;
  outerMesh: THREE.Mesh;
  outerMat: THREE.MeshBasicMaterial;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
}

interface BeamRuntime {
  elementId: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  segments: number;
}

interface TrailRuntime {
  elementId: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  points: Array<{ pos: THREE.Vector3; age: number }>;
  orbitAngle: number;
}

const MAX_PARTICLES_PER_EMITTER = 320;
const MAX_CUBES_PER_BURST = 240;

const _dummy = new THREE.Object3D();
const _mat4 = new THREE.Matrix4();
const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _color = new THREE.Color();
const _shakeVec = new THREE.Vector3();

function createProceduralSpriteTexture(shape: PreviewShape): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  if (shape === 'Circle') {
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 52);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.92)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'Star') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#11131a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    const spikes = 4;
    const outerR = 54;
    const innerR = 18;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'Spark') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#11131a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx + 22, cy);
    ctx.lineTo(cx, size - 8);
    ctx.lineTo(cx - 22, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'Cube') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#11131a';
    ctx.lineWidth = 8;
    ctx.fillRect(22, 22, 84, 84);
    ctx.strokeRect(22, 22, 84, 84);
    // Stud highlight circle in center
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'Ring') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#11131a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function getEmissionDirVector(dir: EmissionDirection, target: THREE.Vector3): THREE.Vector3 {
  switch (dir) {
    case 'Top':
      return target.set(0, 1, 0);
    case 'Bottom':
      return target.set(0, -1, 0);
    case 'Front':
      return target.set(0, 0, 1);
    case 'Back':
      return target.set(0, 0, -1);
    case 'Left':
      return target.set(-1, 0, 0);
    case 'Right':
      return target.set(1, 0, 0);
  }
}

export class VfxSceneRenderer {
  private group: THREE.Group;
  private textures: Record<PreviewShape, THREE.CanvasTexture>;
  private planeGeo: THREE.PlaneGeometry;
  private cubeGeo: THREE.BoxGeometry;
  private studGeo: THREE.CylinderGeometry;

  private emitters = new Map<string, EmitterRuntime>();
  private cubeBursts = new Map<string, CubeBurstRuntime>();
  private rings = new Map<string, RingRuntime>();
  private pillars = new Map<string, PillarRuntime>();
  private beams = new Map<string, BeamRuntime>();
  private trails = new Map<string, TrailRuntime>();

  private lastTime = -1;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'VfxRuntimeGroup';
    scene.add(this.group);

    this.textures = {
      Circle: createProceduralSpriteTexture('Circle'),
      Star: createProceduralSpriteTexture('Star'),
      Spark: createProceduralSpriteTexture('Spark'),
      Cube: createProceduralSpriteTexture('Cube'),
      Ring: createProceduralSpriteTexture('Ring'),
    };

    this.planeGeo = new THREE.PlaneGeometry(1, 1);
    this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    this.studGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 8);
  }

  public setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  public resetSimulation() {
    this.lastTime = -1;
    for (const em of this.emitters.values()) {
      em.emitAccum = 0;
      em.burstFired = false;
      for (const p of em.particles) p.alive = false;
      em.mesh.count = 0;
    }
    for (const cb of this.cubeBursts.values()) {
      cb.burstFired = false;
      for (const c of cb.cubes) c.alive = false;
      cb.cubeMesh.count = 0;
      cb.studMesh.count = 0;
    }
    for (const tr of this.trails.values()) {
      tr.points.length = 0;
      tr.orbitAngle = 0;
      tr.mesh.visible = false;
    }
  }

  private pruneRemoved(activeIds: Set<string>) {
    for (const [id, em] of this.emitters) {
      if (!activeIds.has(id)) {
        this.group.remove(em.mesh);
        em.material.dispose();
        this.emitters.delete(id);
      }
    }
    for (const [id, cb] of this.cubeBursts) {
      if (!activeIds.has(id)) {
        this.group.remove(cb.cubeMesh);
        this.group.remove(cb.studMesh);
        (cb.cubeMesh.material as THREE.Material).dispose();
        (cb.studMesh.material as THREE.Material).dispose();
        this.cubeBursts.delete(id);
      }
    }
    for (const [id, r] of this.rings) {
      if (!activeIds.has(id)) {
        this.group.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.material.dispose();
        this.rings.delete(id);
      }
    }
    for (const [id, p] of this.pillars) {
      if (!activeIds.has(id)) {
        this.group.remove(p.group);
        p.outerMesh.geometry.dispose();
        p.outerMat.dispose();
        p.coreMesh.geometry.dispose();
        p.coreMat.dispose();
        this.pillars.delete(id);
      }
    }
    for (const [id, b] of this.beams) {
      if (!activeIds.has(id)) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.material.dispose();
        this.beams.delete(id);
      }
    }
    for (const [id, tr] of this.trails) {
      if (!activeIds.has(id)) {
        this.group.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        tr.material.dispose();
        this.trails.delete(id);
      }
    }
  }

  private spawnParticle(em: EmitterRuntime, props: ParticleEmitterProps) {
    const slot = em.particles.find((p) => !p.alive);
    if (!slot) return;

    slot.alive = true;
    slot.age = 0;
    slot.lifetime = Math.max(
      0.08,
      THREE.MathUtils.lerp(props.Lifetime.min, props.Lifetime.max, Math.random())
    );
    slot.envSeed = Math.random() * 2 - 1;
    slot.rot = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(props.Rotation.min, props.Rotation.max, Math.random())
    );
    slot.rotSpeed = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(props.RotSpeed.min, props.RotSpeed.max, Math.random())
    );

    // Spawn position by Shape (Box / Sphere / Disc)
    const r = Math.max(0.01, props.ShapeRadius ?? 0.6);
    const ox = props.Offset?.x ?? 0;
    const oy = props.Offset?.y ?? 2.0;
    const oz = props.Offset?.z ?? 0;

    if (props.Shape === 'Box') {
      slot.pos.set(
        ox + (Math.random() * 2 - 1) * r,
        oy + (Math.random() * 2 - 1) * r,
        oz + (Math.random() * 2 - 1) * r
      );
    } else if (props.Shape === 'Disc') {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * r;
      slot.pos.set(ox + Math.cos(ang) * rad, oy, oz + Math.sin(ang) * rad);
    } else {
      // Sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const rad = Math.cbrt(Math.random()) * r;
      slot.pos.set(
        ox + rad * Math.sin(phi) * Math.cos(theta),
        oy + rad * Math.cos(phi),
        oz + rad * Math.sin(phi) * Math.sin(theta)
      );
    }

    // Launch velocity along EmissionDirection + SpreadAngle
    getEmissionDirVector(props.EmissionDirection, _vec3);
    const spreadX = THREE.MathUtils.degToRad((Math.random() * 2 - 1) * props.SpreadAngle.x);
    const spreadY = THREE.MathUtils.degToRad((Math.random() * 2 - 1) * props.SpreadAngle.y);
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(spreadX, 0, spreadY));
    _vec3.applyQuaternion(quat).normalize();
    const speed = THREE.MathUtils.lerp(props.Speed.min, props.Speed.max, Math.random());
    slot.vel.copy(_vec3).multiplyScalar(speed);
  }

  private fireCubeBurst(cb: CubeBurstRuntime, props: CubeBurstProps) {
    const count = Math.min(MAX_CUBES_PER_BURST, Math.max(1, Math.round(props.Count)));
    const colors = props.Colors && props.Colors.length > 0 ? props.Colors : ['#FFBE0B', '#3A86FF', '#FF4D4D'];
    const ox = props.Offset?.x ?? 0;
    const oy = props.Offset?.y ?? 2.0;
    const oz = props.Offset?.z ?? 0;
    const spreadRad = THREE.MathUtils.degToRad(clamp(props.SpreadAngle, 5, 180));

    for (let i = 0; i < MAX_CUBES_PER_BURST; i++) {
      const c = cb.cubes[i];
      if (i >= count) {
        c.alive = false;
        continue;
      }
      c.alive = true;
      c.age = 0;
      c.lifetime = Math.max(0.15, props.Lifetime * (0.75 + Math.random() * 0.35));
      c.pos.set(ox + (Math.random() - 0.5) * 0.4, oy + (Math.random() - 0.5) * 0.4, oz + (Math.random() - 0.5) * 0.4);

      const az = Math.random() * Math.PI * 2;
      const polar = Math.random() * spreadRad;
      const spd = THREE.MathUtils.lerp(props.SpeedMin, props.SpeedMax, Math.random());
      c.vel.set(
        Math.sin(polar) * Math.cos(az) * spd,
        Math.cos(polar) * spd * 0.95 + 2.5,
        Math.sin(polar) * Math.sin(az) * spd
      );
      c.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const sp = THREE.MathUtils.degToRad(props.SpinSpeed);
      c.spin.set((Math.random() * 2 - 1) * sp, (Math.random() * 2 - 1) * sp, (Math.random() * 2 - 1) * sp);
      c.size = THREE.MathUtils.lerp(props.SizeMin, props.SizeMax, Math.random());
      const hex = colors[i % colors.length];
      const rgb = hexToRgb(hex);
      c.color.setRGB(rgb.r, rgb.g, rgb.b);
    }
  }

  public update(
    effect: VfxEffect,
    time: number,
    dtRaw: number,
    camera: THREE.Camera
  ): VfxFrameOutput {
    // Detect rewind / loop / scrub backward -> reset particle pools cleanly
    if (this.lastTime < 0 || time < this.lastTime - 0.02) {
      this.resetSimulation();
      // If user scrubbed to a mid-point while paused, simulate forward in small bursts so particles are visible!
      if (time > 0.02 && dtRaw === 0) {
        const steps = Math.min(28, Math.ceil(time / 0.04));
        const stepDt = time / steps;
        for (let s = 1; s <= steps; s++) {
          this.stepFrame(effect, s * stepDt, stepDt, camera);
        }
        this.lastTime = time;
        return this.stepFrame(effect, time, 0, camera);
      }
    }

    const out = this.stepFrame(effect, time, dtRaw, camera);
    this.lastTime = time;
    return out;
  }

  private stepFrame(
    effect: VfxEffect,
    time: number,
    dtRaw: number,
    camera: THREE.Camera
  ): VfxFrameOutput {
    const activeIds = new Set(effect.elements.map((e) => e.id));
    this.pruneRemoved(activeIds);

    // 1. Check SlowMo windows first
    let slowMoScale = 1.0;
    for (const el of effect.elements) {
      if (!el.enabled || el.type !== 'SlowMo') continue;
      if (time >= el.start && time <= el.start + el.duration) {
        const props = el.props as SlowMoProps;
        slowMoScale = Math.min(slowMoScale, clamp(props.TimeScale, 0.05, 1));
      }
    }

    const dt = Math.min(0.06, Math.max(0, dtRaw));
    let activeParticles = 0;
    let activeCubes = 0;
    let flashColor: string | null = null;
    let flashOpacity = 0;
    _shakeVec.set(0, 0, 0);
    let shakeRotZ = 0;

    for (const el of effect.elements) {
      if (!el.enabled) {
        this.hideElement(el);
        continue;
      }

      switch (el.type) {
        case 'ParticleEmitter':
          activeParticles += this.updateParticleEmitter(el as VfxElement<'ParticleEmitter'>, time, dt, camera);
          break;
        case 'CubeBurst':
          activeCubes += this.updateCubeBurst(el as VfxElement<'CubeBurst'>, time, dt);
          break;
        case 'Ring':
          this.updateRing(el as VfxElement<'Ring'>, time);
          break;
        case 'Pillar':
          this.updatePillar(el as VfxElement<'Pillar'>, time);
          break;
        case 'Beam':
          this.updateBeam(el as VfxElement<'Beam'>, time);
          break;
        case 'Trail':
          this.updateTrail(el as VfxElement<'Trail'>, time, dt);
          break;
        case 'Flash': {
          const props = el.props as FlashProps;
          if (time >= el.start && time <= el.start + el.duration) {
            const u = (time - el.start) / Math.max(0.001, el.duration);
            const fadeIn = Math.max(0.01, props.FadeIn);
            const fadeOutStart = Math.min(0.99, Math.max(fadeIn, 1 - props.FadeOut));
            let alpha = 1;
            if (u < fadeIn) alpha = u / fadeIn;
            else if (u > fadeOutStart) alpha = 1 - (u - fadeOutStart) / Math.max(0.01, 1 - fadeOutStart);
            const op = clamp(alpha * props.MaxOpacity, 0, 0.9);
            if (op > flashOpacity) {
              flashOpacity = op;
              flashColor = props.Color;
            }
          }
          break;
        }
        case 'CameraShake': {
          const props = el.props as CameraShakeProps;
          if (time >= el.start && time <= el.start + el.duration) {
            const localT = time - el.start;
            const u = localT / Math.max(0.001, el.duration);
            const env = Math.exp(-props.Decay * u) * (1 - u);
            const amp = props.Intensity * env * 0.45;
            const freq = props.Frequency * Math.PI * 2;
            _shakeVec.x += Math.sin(localT * freq * 1.13) * amp;
            _shakeVec.y += Math.cos(localT * freq * 0.91) * amp;
            _shakeVec.z += Math.sin(localT * freq * 0.77 + 1.4) * amp * 0.4;
            shakeRotZ += Math.sin(localT * freq * 1.37) * amp * 0.08;
          }
          break;
        }
      }
    }

    return {
      activeParticles,
      activeCubes,
      flashColor,
      flashOpacity,
      shakeOffset: _shakeVec,
      shakeRotZ,
      slowMoScale,
    };
  }

  private hideElement(el: VfxElement) {
    const em = this.emitters.get(el.id);
    if (em) em.mesh.count = 0;
    const cb = this.cubeBursts.get(el.id);
    if (cb) {
      cb.cubeMesh.count = 0;
      cb.studMesh.count = 0;
    }
    const ring = this.rings.get(el.id);
    if (ring) ring.mesh.visible = false;
    const pillar = this.pillars.get(el.id);
    if (pillar) pillar.group.visible = false;
    const beam = this.beams.get(el.id);
    if (beam) beam.mesh.visible = false;
    const trail = this.trails.get(el.id);
    if (trail) trail.mesh.visible = false;
  }

  private updateParticleEmitter(
    el: VfxElement<'ParticleEmitter'>,
    time: number,
    dt: number,
    camera: THREE.Camera
  ): number {
    const props = el.props;
    let runtime = this.emitters.get(el.id);
    if (!runtime) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures[props.PreviewShape] ?? this.textures.Star,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.InstancedMesh(this.planeGeo, mat, MAX_PARTICLES_PER_EMITTER);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);

      const particles: SimParticle[] = [];
      for (let i = 0; i < MAX_PARTICLES_PER_EMITTER; i++) {
        particles.push({
          alive: false,
          age: 0,
          lifetime: 1,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          rot: 0,
          rotSpeed: 0,
          envSeed: 0,
        });
      }
      runtime = {
        elementId: el.id,
        mesh,
        material: mat,
        particles,
        emitAccum: 0,
        burstFired: false,
        shapeKey: props.PreviewShape,
      };
      this.emitters.set(el.id, runtime);
    }

    // Update texture & additive blending from LightEmission
    if (runtime.shapeKey !== props.PreviewShape) {
      runtime.shapeKey = props.PreviewShape;
      runtime.material.map = this.textures[props.PreviewShape] ?? this.textures.Star;
      runtime.material.needsUpdate = true;
    }
    const targetBlend = props.LightEmission >= 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (runtime.material.blending !== targetBlend) {
      runtime.material.blending = targetBlend;
      runtime.material.needsUpdate = true;
    }

    const inEmitWindow = time >= el.start && time <= el.start + el.duration;
    if (inEmitWindow) {
      if (!runtime.burstFired && props.BurstCount > 0) {
        runtime.burstFired = true;
        const burstN = Math.min(MAX_PARTICLES_PER_EMITTER, Math.round(props.BurstCount));
        for (let i = 0; i < burstN; i++) {
          this.spawnParticle(runtime, props);
        }
      }
      if (dt > 0 && props.Rate > 0) {
        runtime.emitAccum += dt * props.Rate;
        const spawnCount = Math.min(30, Math.floor(runtime.emitAccum));
        runtime.emitAccum -= spawnCount;
        for (let i = 0; i < spawnCount; i++) {
          this.spawnParticle(runtime, props);
        }
      }
    }

    // Update alive particles & write instance transforms (billboard facing camera)
    const dragFactor = Math.exp(-Math.max(0, props.Drag) * dt);
    const camQuat = camera.quaternion;
    const camForward = _vec3b.set(0, 0, 1).applyQuaternion(camQuat);
    let visibleIdx = 0;

    for (const p of runtime.particles) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.lifetime) {
        p.alive = false;
        continue;
      }

      if (dt > 0) {
        p.vel.x += props.Acceleration.x * dt;
        p.vel.y += props.Acceleration.y * dt;
        p.vel.z += props.Acceleration.z * dt;
        p.vel.multiplyScalar(dragFactor);
        p.pos.addScaledVector(p.vel, dt);
        p.rot += p.rotSpeed * dt;
      }

      const lifeT = clamp(p.age / p.lifetime, 0, 1);
      const size = Math.max(0.02, evaluateNumberSequence(props.Size, lifeT, p.envSeed));
      const transp = clamp(evaluateNumberSequence(props.Transparency, lifeT, p.envSeed), 0, 1);
      const alpha = 1 - transp;
      if (alpha <= 0.01) continue;

      const col = evaluateColorSequence(props.Color, lifeT);
      // Modulate brightness by opacity & LightEmission so additive/normal fades gracefully
      const glowBoost = 1 + props.LightEmission * 0.45;
      _color.setRGB(
        clamp(col.r * alpha * glowBoost, 0, 1),
        clamp(col.g * alpha * glowBoost, 0, 1),
        clamp(col.b * alpha * glowBoost, 0, 1)
      );

      // Flipbook pulse subtle scale cadence if FlipbookLayout != None
      const flipBoost =
        props.FlipbookLayout !== 'None'
          ? 0.92 + 0.16 * Math.sin(lifeT * Math.PI * (props.FlipbookLayout === 'Grid2x2' ? 4 : 8))
          : 1;

      _dummy.position.copy(p.pos).addScaledVector(camForward, props.ZOffset * 0.25);
      _dummy.quaternion.copy(camQuat);
      _dummy.rotateZ(p.rot);
      _dummy.scale.setScalar(size * flipBoost);
      _dummy.updateMatrix();

      runtime.mesh.setMatrixAt(visibleIdx, _dummy.matrix);
      runtime.mesh.setColorAt(visibleIdx, _color);
      visibleIdx++;
    }

    runtime.mesh.count = visibleIdx;
    runtime.mesh.instanceMatrix.needsUpdate = true;
    if (runtime.mesh.instanceColor) runtime.mesh.instanceColor.needsUpdate = true;
    return visibleIdx;
  }

  private updateCubeBurst(el: VfxElement<'CubeBurst'>, time: number, dt: number): number {
    const props = el.props;
    let runtime = this.cubeBursts.get(el.id);
    if (!runtime) {
      const cubeMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.08 });
      const studMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
      const cubeMesh = new THREE.InstancedMesh(this.cubeGeo, cubeMat, MAX_CUBES_PER_BURST);
      const studMesh = new THREE.InstancedMesh(this.studGeo, studMat, MAX_CUBES_PER_BURST);
      cubeMesh.frustumCulled = false;
      studMesh.frustumCulled = false;
      cubeMesh.count = 0;
      studMesh.count = 0;
      this.group.add(cubeMesh, studMesh);

      const cubes: SimCube[] = [];
      for (let i = 0; i < MAX_CUBES_PER_BURST; i++) {
        cubes.push({
          alive: false,
          age: 0,
          lifetime: 1,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          rot: new THREE.Euler(),
          spin: new THREE.Vector3(),
          size: 0.4,
          color: new THREE.Color(1, 1, 1),
        });
      }
      runtime = { elementId: el.id, cubeMesh, studMesh, cubes, burstFired: false };
      this.cubeBursts.set(el.id, runtime);
    }

    if (time >= el.start && !runtime.burstFired) {
      runtime.burstFired = true;
      this.fireCubeBurst(runtime, props);
    }

    let visibleIdx = 0;
    for (const c of runtime.cubes) {
      if (!c.alive) continue;
      c.age += dt;
      if (c.age >= c.lifetime || time > el.start + el.duration) {
        c.alive = false;
        continue;
      }

      if (dt > 0) {
        c.vel.y -= props.Gravity * dt;
        c.pos.addScaledVector(c.vel, dt);
        // Bouncy stud floor collision at y = c.size * 0.5
        const floorY = c.size * 0.5;
        if (c.pos.y < floorY) {
          c.pos.y = floorY;
          c.vel.y = Math.abs(c.vel.y) * 0.42;
          c.vel.x *= 0.72;
          c.vel.z *= 0.72;
        }
        c.rot.x += c.spin.x * dt;
        c.rot.y += c.spin.y * dt;
        c.rot.z += c.spin.z * dt;
      }

      const lifeT = clamp(c.age / c.lifetime, 0, 1);
      // Pop-in + shrink-out scale curve
      const scaleCurve = lifeT < 0.1 ? lifeT / 0.1 : lifeT > 0.75 ? (1 - lifeT) / 0.25 : 1;
      const s = Math.max(0.01, c.size * scaleCurve);

      _dummy.position.copy(c.pos);
      _dummy.rotation.copy(c.rot);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      runtime.cubeMesh.setMatrixAt(visibleIdx, _dummy.matrix);
      runtime.cubeMesh.setColorAt(visibleIdx, c.color);

      if (props.StudsOnTop) {
        // Place stud on cube local +Y face
        _vec3.set(0, 0.54 * s, 0).applyEuler(c.rot);
        _dummy.position.copy(c.pos).add(_vec3);
        _dummy.rotation.copy(c.rot);
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        runtime.studMesh.setMatrixAt(visibleIdx, _dummy.matrix);
        runtime.studMesh.setColorAt(visibleIdx, c.color);
      }

      visibleIdx++;
    }

    runtime.cubeMesh.count = visibleIdx;
    runtime.cubeMesh.instanceMatrix.needsUpdate = true;
    if (runtime.cubeMesh.instanceColor) runtime.cubeMesh.instanceColor.needsUpdate = true;

    runtime.studMesh.count = props.StudsOnTop ? visibleIdx : 0;
    runtime.studMesh.instanceMatrix.needsUpdate = true;
    if (runtime.studMesh.instanceColor) runtime.studMesh.instanceColor.needsUpdate = true;

    return visibleIdx;
  }

  private updateRing(el: VfxElement<'Ring'>, time: number) {
    const props = el.props;
    let runtime = this.rings.get(el.id);
    if (!runtime) {
      const geo = new THREE.TorusGeometry(1, Math.max(0.04, props.Thickness * 0.25), 10, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      runtime = { elementId: el.id, mesh, material: mat, currentThickness: props.Thickness };
      this.rings.set(el.id, runtime);
    }

    if (time < el.start || time > el.start + el.duration) {
      runtime.mesh.visible = false;
      return;
    }

    const u = clamp((time - el.start) / Math.max(0.001, el.duration), 0, 1);
    const eased = evaluateRingCurve(props.Curve, u);
    const radius = Math.max(0.05, THREE.MathUtils.lerp(props.StartRadius, props.EndRadius, eased));
    const col = evaluateColorSequence(props.Color, u);
    const transp = clamp(evaluateNumberSequence(props.Transparency, u), 0, 1);

    runtime.mesh.visible = transp < 0.99;
    runtime.mesh.position.set(0, props.YOffset, 0);
    runtime.mesh.rotation.set(Math.PI / 2 + THREE.MathUtils.degToRad(props.TiltX), 0, 0);
    const thickScale = Math.max(0.2, props.Thickness / 0.36);
    runtime.mesh.scale.set(radius, radius, thickScale * (1 - u * 0.45));
    runtime.material.color.setRGB(col.r, col.g, col.b);
    runtime.material.emissive.setRGB(col.r, col.g, col.b);
    runtime.material.opacity = 1 - transp;
  }

  private updatePillar(el: VfxElement<'Pillar'>, time: number) {
    const props = el.props;
    let runtime = this.pillars.get(el.id);
    if (!runtime) {
      const group = new THREE.Group();
      const outerGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);

      const coreGeo = new THREE.CylinderGeometry(0.45, 0.55, 1, 12, 1, true);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);

      group.add(outerMesh, coreMesh);
      group.visible = false;
      this.group.add(group);
      runtime = { elementId: el.id, group, outerMesh, outerMat, coreMesh, coreMat };
      this.pillars.set(el.id, runtime);
    }

    if (time < el.start || time > el.start + el.duration) {
      runtime.group.visible = false;
      return;
    }

    const u = clamp((time - el.start) / Math.max(0.001, el.duration), 0, 1);
    const col = evaluateColorSequence(props.Color, u);
    const transp = clamp(evaluateNumberSequence(props.Transparency, u), 0, 1);
    const pulse = 1 + Math.sin(time * props.PulseSpeed * Math.PI * 2) * 0.08;
    const popIn = u < 0.12 ? u / 0.12 : 1;

    runtime.group.visible = transp < 0.99;
    runtime.group.position.set(
      props.Offset?.x ?? 0,
      (props.Offset?.y ?? 0.04) + (props.Height * popIn) / 2,
      props.Offset?.z ?? 0
    );
    const r = Math.max(0.08, props.Radius * pulse * (1 - u * 0.2));
    runtime.group.scale.set(r, Math.max(0.1, props.Height * popIn), r);

    runtime.outerMat.color.setRGB(col.r, col.g, col.b);
    runtime.outerMat.opacity = (1 - transp) * 0.65;
    runtime.coreMat.color.setRGB(Math.min(1, col.r + 0.35), Math.min(1, col.g + 0.35), Math.min(1, col.b + 0.35));
    runtime.coreMat.opacity = (1 - transp) * 0.85;
  }

  private updateBeam(el: VfxElement<'Beam'>, time: number) {
    const props = el.props;
    const segs = Math.max(4, Math.min(36, Math.round(props.Segments)));
    let runtime = this.beams.get(el.id);
    if (!runtime || runtime.segments !== segs) {
      if (runtime) {
        this.group.remove(runtime.mesh);
        runtime.mesh.geometry.dispose();
        runtime.material.dispose();
      }
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array((segs + 1) * 2 * 3);
      const colors = new Float32Array((segs + 1) * 2 * 3);
      const indices: number[] = [];
      for (let i = 0; i < segs; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      runtime = { elementId: el.id, mesh, material: mat, segments: segs };
      this.beams.set(el.id, runtime);
    }

    if (time < el.start || time > el.start + el.duration) {
      runtime.mesh.visible = false;
      return;
    }

    runtime.mesh.visible = true;
    const p0 = new THREE.Vector3(props.Attachment0.x, props.Attachment0.y, props.Attachment0.z);
    const p3 = new THREE.Vector3(props.Attachment1.x, props.Attachment1.y, props.Attachment1.z);
    const p1 = p0.clone().add(new THREE.Vector3(0, props.CurveSize0, 0));
    const p2 = p3.clone().add(new THREE.Vector3(0, props.CurveSize1, 0));

    const posAttr = runtime.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = runtime.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const scrollPhase = time * props.TextureSpeed;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const pt = curve.getPoint(t);
      const width = THREE.MathUtils.lerp(props.Width0, props.Width1, t) * 0.5;
      const col = evaluateColorSequence(props.Color, t);
      const transp = clamp(evaluateNumberSequence(props.Transparency, t), 0, 1);
      const pulse = 0.78 + 0.22 * Math.sin((t * 6 - scrollPhase) * Math.PI * 2);
      const alpha = (1 - transp) * pulse;

      const idx = i * 2;
      posAttr.setXYZ(idx, pt.x, pt.y + width, pt.z);
      posAttr.setXYZ(idx + 1, pt.x, pt.y - width, pt.z);
      colAttr.setXYZ(idx, col.r * alpha, col.g * alpha, col.b * alpha);
      colAttr.setXYZ(idx + 1, col.r * alpha, col.g * alpha, col.b * alpha);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    runtime.material.opacity = clamp(0.65 + props.LightEmission * 0.35, 0.2, 1);
  }

  private updateTrail(el: VfxElement<'Trail'>, time: number, dt: number) {
    const props = el.props;
    const maxPts = 44;
    let runtime = this.trails.get(el.id);
    if (!runtime) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(maxPts * 2 * 3);
      const colors = new Float32Array(maxPts * 2 * 3);
      const indices: number[] = [];
      for (let i = 0; i < maxPts - 1; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      runtime = { elementId: el.id, mesh, material: mat, points: [], orbitAngle: 0 };
      this.trails.set(el.id, runtime);
    }

    const inWindow = time >= el.start && time <= el.start + el.duration;
    if (dt > 0) {
      for (const pt of runtime.points) pt.age += dt;
      runtime.points = runtime.points.filter((pt) => pt.age <= props.Lifetime);

      if (inWindow) {
        runtime.orbitAngle = (time - el.start) * props.OrbitSpeed;
        const x = Math.cos(runtime.orbitAngle) * props.OrbitRadius;
        const z = Math.sin(runtime.orbitAngle) * props.OrbitRadius;
        const y = props.HeightOffset + Math.sin(runtime.orbitAngle * 2) * 0.45;
        const headPos = new THREE.Vector3(x, y, z);

        const last = runtime.points[0];
        if (!last || last.pos.distanceTo(headPos) >= Math.max(0.05, props.MinLength)) {
          runtime.points.unshift({ pos: headPos, age: 0 });
          if (runtime.points.length > maxPts) runtime.points.pop();
        }
      }
    }

    if (runtime.points.length < 2) {
      runtime.mesh.visible = false;
      return;
    }

    runtime.mesh.visible = true;
    const posAttr = runtime.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = runtime.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const count = runtime.points.length;

    for (let i = 0; i < maxPts; i++) {
      const pt = runtime.points[Math.min(i, count - 1)];
      const t = clamp(pt.age / Math.max(0.05, props.Lifetime), 0, 1);
      const halfW = Math.max(0.01, evaluateNumberSequence(props.WidthScale, t) * 0.36);
      const col = evaluateColorSequence(props.Color, t);
      const transp = clamp(evaluateNumberSequence(props.Transparency, t), 0, 1);
      const alpha = i < count ? 1 - transp : 0;

      const idx = i * 2;
      posAttr.setXYZ(idx, pt.pos.x, pt.pos.y + halfW, pt.pos.z);
      posAttr.setXYZ(idx + 1, pt.pos.x, pt.pos.y - halfW, pt.pos.z);
      colAttr.setXYZ(idx, col.r * alpha, col.g * alpha, col.b * alpha);
      colAttr.setXYZ(idx + 1, col.r * alpha, col.g * alpha, col.b * alpha);
    }

    runtime.mesh.geometry.setDrawRange(0, Math.max(0, (count - 1) * 6));
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public dispose() {
    this.pruneRemoved(new Set());
    this.planeGeo.dispose();
    this.cubeGeo.dispose();
    this.studGeo.dispose();
    for (const tex of Object.values(this.textures)) {
      tex.dispose();
    }
    this.group.parent?.remove(this.group);
  }
}

// Re-export dummy matrix to avoid unused variable warnings if needed
export { _mat4 };
