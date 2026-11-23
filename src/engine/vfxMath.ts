import {
  AnimationClip,
  AnimationKeyframe,
  BudgetMetrics,
  ColorKeypoint,
  CubeBurstProps,
  EasingDirection,
  EasingStyle,
  HUSSER_JOINTS,
  JointTransform,
  MobileTrafficLight,
  NumberKeypoint,
  ParticleEmitterProps,
  R15_JOINTS,
  RingCurve,
  VfxEffect,
  VfxElement,
} from '../types/workbench';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function roundNum(val: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// --- Sequence Evaluators ---

export function evaluateColorSequence(
  keypoints: ColorKeypoint[],
  t: number
): { r: number; g: number; b: number } {
  if (!keypoints || keypoints.length === 0) {
    return { r: 1, g: 1, b: 1 };
  }
  const sorted = [...keypoints].sort((a, b) => a.t - b.t);
  const tc = clamp(t, 0, 1);
  if (tc <= sorted[0].t) {
    return { r: sorted[0].r, g: sorted[0].g, b: sorted[0].b };
  }
  const last = sorted[sorted.length - 1];
  if (tc >= last.t) {
    return { r: last.r, g: last.g, b: last.b };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (tc >= a.t && tc <= b.t) {
      const span = Math.max(1e-6, b.t - a.t);
      const u = (tc - a.t) / span;
      return {
        r: clamp(lerp(a.r, b.r, u), 0, 1),
        g: clamp(lerp(a.g, b.g, u), 0, 1),
        b: clamp(lerp(a.b, b.b, u), 0, 1),
      };
    }
  }
  return { r: last.r, g: last.g, b: last.b };
}

export function evaluateNumberSequence(
  keypoints: NumberKeypoint[],
  t: number,
  envelopeSeed = 0 // -1..1 random sample per particle
): number {
  if (!keypoints || keypoints.length === 0) return 1;
  const sorted = [...keypoints].sort((a, b) => a.t - b.t);
  const tc = clamp(t, 0, 1);
  if (tc <= sorted[0].t) {
    return sorted[0].value + sorted[0].envelope * envelopeSeed;
  }
  const last = sorted[sorted.length - 1];
  if (tc >= last.t) {
    return last.value + last.envelope * envelopeSeed;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (tc >= a.t && tc <= b.t) {
      const span = Math.max(1e-6, b.t - a.t);
      const u = (tc - a.t) / span;
      const val = lerp(a.value, b.value, u);
      const env = lerp(a.envelope, b.envelope, u);
      return val + env * envelopeSeed;
    }
  }
  return last.value + last.envelope * envelopeSeed;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    clamp(Math.round(c * 255), 0, 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return { r: isNaN(r) ? 1 : r, g: isNaN(g) ? 1 : g, b: isNaN(b) ? 1 : b };
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return { r: isNaN(r) ? 1 : r, g: isNaN(g) ? 1 : g, b: isNaN(b) ? 1 : b };
}

// --- Roblox Easing Math ---

function easeOutBounce(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    const t = x - 1.5 / d1;
    return n1 * t * t + 0.75;
  } else if (x < 2.5 / d1) {
    const t = x - 2.25 / d1;
    return n1 * t * t + 0.9375;
  } else {
    const t = x - 2.625 / d1;
    return n1 * t * t + 0.984375;
  }
}

function easeBaseIn(style: EasingStyle, x: number): number {
  const t = clamp(x, 0, 1);
  switch (style) {
    case 'Linear':
      return t;
    case 'Sine':
      return 1 - Math.cos((t * Math.PI) / 2);
    case 'Quad':
      return t * t;
    case 'Back': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    }
    case 'Elastic': {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    case 'Bounce':
      return 1 - easeOutBounce(1 - t);
  }
}

export function evaluateEasing(style: EasingStyle, dir: EasingDirection, t: number): number {
  const x = clamp(t, 0, 1);
  if (style === 'Linear') return x;
  if (dir === 'In') {
    return easeBaseIn(style, x);
  }
  if (dir === 'Out') {
    return 1 - easeBaseIn(style, 1 - x);
  }
  // InOut
  if (x < 0.5) {
    return easeBaseIn(style, x * 2) * 0.5;
  }
  return 0.5 + (1 - easeBaseIn(style, (1 - x) * 2)) * 0.5;
}

export function evaluateRingCurve(curve: RingCurve, t: number): number {
  const x = clamp(t, 0, 1);
  switch (curve) {
    case 'Linear':
      return x;
    case 'QuadOut':
      return 1 - (1 - x) * (1 - x);
    case 'CubicOut':
      return 1 - Math.pow(1 - x, 3);
    case 'BackOut':
      return evaluateEasing('Back', 'Out', x);
    case 'SineOut':
      return Math.sin((x * Math.PI) / 2);
  }
}

// --- Animation Pose Interpolation ---

export function identityJoint(): JointTransform {
  return { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 };
}

export function applySquashStretchValue(amount: number): { sx: number; sy: number; sz: number } {
  // Volume-preserving squash (-0.6..0) and stretch (0..0.6)
  const clamped = clamp(amount, -0.6, 0.8);
  const sy = Math.max(0.35, 1 + clamped);
  const xz = 1 / Math.sqrt(sy);
  return {
    sx: roundNum(xz, 3),
    sy: roundNum(sy, 3),
    sz: roundNum(xz, 3),
  };
}

export function evaluateAnimationPose(
  clip: AnimationClip,
  time: number
): Record<string, JointTransform> {
  const joints = clip.rig === 'Husser' ? HUSSER_JOINTS : R15_JOINTS;
  const result: Record<string, JointTransform> = {};
  for (const j of joints) {
    result[j] = identityJoint();
  }

  if (!clip.keys || clip.keys.length === 0) {
    return result;
  }

  const sorted = [...clip.keys].sort((a, b) => a.t - b.t);
  const t = clamp(time, 0, Math.max(clip.length, sorted[sorted.length - 1].t));

  let prev: AnimationKeyframe = sorted[0];
  let next: AnimationKeyframe = sorted[sorted.length - 1];

  if (t <= sorted[0].t) {
    next = sorted[0];
  } else if (t >= sorted[sorted.length - 1].t) {
    prev = sorted[sorted.length - 1];
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].t && t <= sorted[i + 1].t) {
        prev = sorted[i];
        next = sorted[i + 1];
        break;
      }
    }
  }

  const span = next.t - prev.t;
  const rawU = span <= 1e-6 ? 0 : (t - prev.t) / span;
  const u = span <= 1e-6 ? 0 : evaluateEasing(prev.ease, prev.dir, rawU);

  for (const j of joints) {
    const a = prev.pose[j] ?? identityJoint();
    const b = next.pose[j] ?? identityJoint();
    result[j] = {
      rx: lerp(a.rx ?? 0, b.rx ?? 0, u),
      ry: lerp(a.ry ?? 0, b.ry ?? 0, u),
      rz: lerp(a.rz ?? 0, b.rz ?? 0, u),
      px: lerp(a.px ?? 0, b.px ?? 0, u),
      py: lerp(a.py ?? 0, b.py ?? 0, u),
      pz: lerp(a.pz ?? 0, b.pz ?? 0, u),
      sx: lerp(a.sx ?? 1, b.sx ?? 1, u),
      sy: lerp(a.sy ?? 1, b.sy ?? 1, u),
      sz: lerp(a.sz ?? 1, b.sz ?? 1, u),
    };
  }

  return result;
}

// --- Mobile Budget Estimation ---

export function classifyMobileBudget(total: number): {
  status: MobileTrafficLight;
  label: string;
} {
  if (total < 150) {
    return { status: 'green', label: 'Mobile Safe (< 150)' };
  }
  if (total < 300) {
    return { status: 'amber', label: 'Mobile Caution (150–299)' };
  }
  return { status: 'red', label: 'Mobile Heavy (300+)' };
}

export function estimatePeakBudget(effect: VfxEffect): BudgetMetrics {
  const sampleSteps = 40;
  const dur = Math.max(0.2, effect.duration);
  let peakParticles = 0;
  let peakCubes = 0;
  let peakTotal = 0;

  for (let i = 0; i <= sampleSteps; i++) {
    const t = (i / sampleSteps) * dur;
    let pCount = 0;
    let cCount = 0;

    for (const el of effect.elements) {
      if (!el.enabled) continue;
      if (el.type === 'ParticleEmitter') {
        const props = el.props as ParticleEmitterProps;
        const maxLife = Math.max(0.05, props.Lifetime.max);
        const endEmit = el.start + el.duration;
        if (t >= el.start && t <= endEmit + maxLife) {
          // Burst contribution
          if (t - el.start <= maxLife) {
            pCount += Math.max(0, props.BurstCount);
          }
          // Rate contribution over active overlap window [max(el.start, t - maxLife), min(endEmit, t)]
          const overlapStart = Math.max(el.start, t - maxLife);
          const overlapEnd = Math.min(endEmit, t);
          if (overlapEnd > overlapStart) {
            pCount += Math.ceil((overlapEnd - overlapStart) * Math.max(0, props.Rate));
          }
        }
      } else if (el.type === 'CubeBurst') {
        const props = el.props as CubeBurstProps;
        const life = Math.max(0.05, Math.min(el.duration, props.Lifetime));
        if (t >= el.start && t <= el.start + life) {
          cCount += Math.max(0, props.Count);
        }
      }
    }

    const total = pCount + cCount;
    if (total > peakTotal) {
      peakTotal = total;
      peakParticles = pCount;
      peakCubes = cCount;
    }
  }

  const mobile = classifyMobileBudget(peakTotal);
  return {
    activeParticles: peakParticles,
    activeCubes: peakCubes,
    activeTotal: peakTotal,
    estimatedPeakTotal: peakTotal,
    mobileStatus: mobile.status,
    mobileLabel: mobile.label,
  };
}

// --- Roblox Luau ModuleScript Serialization ---

function escapeLuauString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function serializeColorSequenceLuau(seq: ColorKeypoint[], indent: string): string {
  const sorted = [...seq].sort((a, b) => a.t - b.t);
  const items = sorted.map(
    (k) =>
      `${indent}  { t = ${roundNum(k.t)}, r = ${roundNum(k.r)}, g = ${roundNum(k.g)}, b = ${roundNum(k.b)} }`
  );
  return `{\n${items.join(',\n')}\n${indent}}`;
}

function serializeNumberSequenceLuau(seq: NumberKeypoint[], indent: string): string {
  const sorted = [...seq].sort((a, b) => a.t - b.t);
  const items = sorted.map(
    (k) =>
      `${indent}  { t = ${roundNum(k.t)}, value = ${roundNum(k.value)}, envelope = ${roundNum(k.envelope)} }`
  );
  return `{\n${items.join(',\n')}\n${indent}}`;
}

function serializeLuauValue(value: unknown, indent: string): string {
  if (typeof value === 'string') {
    return `"${escapeLuauString(value)}"`;
  }
  if (typeof value === 'number') {
    return `${roundNum(value)}`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const sample = value[0] as Record<string, unknown>;
      if ('r' in sample && 'g' in sample && 'b' in sample && 't' in sample) {
        return serializeColorSequenceLuau(value as ColorKeypoint[], indent);
      }
      if ('value' in sample && 'envelope' in sample && 't' in sample) {
        return serializeNumberSequenceLuau(value as NumberKeypoint[], indent);
      }
    }
    const items = value.map((item) => serializeLuauValue(item, indent + '  '));
    return `{ ${items.join(', ')} }`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length <= 3 && entries.every(([, v]) => typeof v === 'number')) {
      const inline = entries.map(([k, v]) => `${k} = ${roundNum(v as number)}`).join(', ');
      return `{ ${inline} }`;
    }
    const lines = entries.map(
      ([k, v]) => `${indent}  ${k} = ${serializeLuauValue(v, indent + '  ')}`
    );
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }
  return 'nil';
}

export function exportVfxToLuau(effect: VfxEffect): string {
  const elementBlocks = effect.elements
    .filter((el) => el.enabled)
    .map((el) => {
      const propEntries = Object.entries(el.props as unknown as Record<string, unknown>).map(
        ([key, val]) => `        ${key} = ${serializeLuauValue(val, '        ')}`
      );
      return [
        `    {`,
        `      Name = "${escapeLuauString(el.name)}",`,
        `      Type = "${el.type}",`,
        `      Start = ${roundNum(el.start)},`,
        `      Duration = ${roundNum(el.duration)},`,
        `      Props = {`,
        propEntries.join(',\n'),
        `      },`,
        `    }`,
      ].join('\n');
    });

  return [
    `-- Feed The Hussers — Stud Voxel VFX ModuleScript`,
    `-- Generated by Huss VFX & Animation Workbench`,
    `return {`,
    `  Name = "${escapeLuauString(effect.name)}",`,
    `  Duration = ${roundNum(effect.duration)},`,
    `  Elements = {`,
    elementBlocks.join(',\n'),
    `  },`,
    `}`,
  ].join('\n');
}

export function exportAnimationToLuau(clip: AnimationClip): string {
  const sortedKeys = [...clip.keys].sort((a, b) => a.t - b.t);
  const keyBlocks = sortedKeys.map((key) => {
    const poseLines = Object.entries(key.pose)
      .filter(([, tr]) => tr !== undefined)
      .map(([joint, tr]) => {
        const j = tr as JointTransform;
        const hasScale =
          (j.sx !== undefined && Math.abs(j.sx - 1) > 0.001) ||
          (j.sy !== undefined && Math.abs(j.sy - 1) > 0.001) ||
          (j.sz !== undefined && Math.abs(j.sz - 1) > 0.001);
        const scaleFields = hasScale
          ? `, sx = ${roundNum(j.sx ?? 1)}, sy = ${roundNum(j.sy ?? 1)}, sz = ${roundNum(j.sz ?? 1)}`
          : '';
        return `        ${joint} = { rx = ${roundNum(j.rx)}, ry = ${roundNum(j.ry)}, rz = ${roundNum(j.rz)}, px = ${roundNum(j.px)}, py = ${roundNum(j.py)}, pz = ${roundNum(j.pz)}${scaleFields} }`;
      });

    return [
      `    {`,
      `      T = ${roundNum(key.t)},`,
      `      Ease = "${key.ease}",`,
      `      Dir = "${key.dir}",`,
      `      Pose = {`,
      poseLines.join(',\n'),
      `      },`,
      `    }`,
    ].join('\n');
  });

  return [
    `-- Feed The Hussers — Stud Voxel Animation ModuleScript`,
    `-- Generated by Huss VFX & Animation Workbench`,
    `return {`,
    `  Name = "${escapeLuauString(clip.name)}",`,
    `  Rig = "${clip.rig}",`,
    `  Length = ${roundNum(clip.length)},`,
    `  Keys = {`,
    keyBlocks.join(',\n'),
    `  },`,
    `}`,
  ].join('\n');
}

// --- JSON Export / Import Validation ---

const VALID_VFX_TYPES = new Set([
  'ParticleEmitter',
  'Beam',
  'Trail',
  'CubeBurst',
  'Ring',
  'Pillar',
  'Flash',
  'CameraShake',
  'SlowMo',
]);

const VALID_EASES = new Set(['Linear', 'Sine', 'Quad', 'Back', 'Elastic', 'Bounce']);
const VALID_DIRS = new Set(['In', 'Out', 'InOut']);

export function validateAndParseVfxJson(raw: string): { ok: true; data: VfxEffect } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'JSON root must be an object.' };
    }
    const name = typeof parsed.name === 'string' ? parsed.name : typeof parsed.Name === 'string' ? parsed.Name : '';
    const duration = typeof parsed.duration === 'number' ? parsed.duration : typeof parsed.Duration === 'number' ? parsed.Duration : 0;
    const rawElements = Array.isArray(parsed.elements) ? parsed.elements : Array.isArray(parsed.Elements) ? parsed.Elements : null;

    if (!name.trim()) {
      return { ok: false, error: 'Missing required VFX "name" string.' };
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, error: 'VFX "duration" must be a positive number.' };
    }
    if (!rawElements) {
      return { ok: false, error: 'Missing required "elements" array.' };
    }

    const elements: VfxElement[] = rawElements.map((item: Record<string, unknown>, idx: number) => {
      const type = (item.type ?? item.Type) as string;
      if (!VALID_VFX_TYPES.has(type)) {
        throw new Error(`Element #${idx + 1} has unsupported Type "${String(type)}".`);
      }
      const start = Number(item.start ?? item.Start ?? 0);
      const elDuration = Number(item.duration ?? item.Duration ?? 1);
      const props = (item.props ?? item.Props) as Record<string, unknown>;
      if (!props || typeof props !== 'object') {
        throw new Error(`Element #${idx + 1} is missing a "props" object.`);
      }
      return {
        id: typeof item.id === 'string' && item.id ? item.id : `imp_el_${idx}_${Date.now()}`,
        name: typeof item.name === 'string' ? item.name : typeof item.Name === 'string' ? item.Name : `${type}_${idx + 1}`,
        type: type as VfxElement['type'],
        enabled: item.enabled !== false,
        start: Math.max(0, Number.isFinite(start) ? start : 0),
        duration: Math.max(0.05, Number.isFinite(elDuration) ? elDuration : 1),
        props: props as unknown as VfxElement['props'],
      };
    });

    return {
      ok: true,
      data: {
        name: name.trim(),
        duration: Math.max(0.2, duration),
        elements,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
    };
  }
}

export function validateAndParseAnimationJson(
  raw: string
): { ok: true; data: AnimationClip } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'JSON root must be an object.' };
    }
    const name = typeof parsed.name === 'string' ? parsed.name : typeof parsed.Name === 'string' ? parsed.Name : '';
    const rig = (parsed.rig ?? parsed.Rig) as string;
    const length = Number(parsed.length ?? parsed.Length ?? 0);
    const rawKeys = Array.isArray(parsed.keys) ? parsed.keys : Array.isArray(parsed.Keys) ? parsed.Keys : null;

    if (!name.trim()) {
      return { ok: false, error: 'Missing required Animation "name" string.' };
    }
    if (rig !== 'Husser' && rig !== 'R15') {
      return { ok: false, error: 'Animation "rig" must be "Husser" or "R15".' };
    }
    if (!Number.isFinite(length) || length <= 0) {
      return { ok: false, error: 'Animation "length" must be a positive number.' };
    }
    if (!rawKeys || rawKeys.length === 0) {
      return { ok: false, error: 'Animation must contain at least one keyframe in "keys".' };
    }

    const keys: AnimationKeyframe[] = rawKeys.map((k: Record<string, unknown>, idx: number) => {
      const t = Number(k.t ?? k.T ?? 0);
      const ease = String(k.ease ?? k.Ease ?? 'Quad');
      const dir = String(k.dir ?? k.Dir ?? 'Out');
      const poseObj = (k.pose ?? k.Pose ?? {}) as Record<string, JointTransform>;
      return {
        id: typeof k.id === 'string' && k.id ? k.id : `imp_key_${idx}_${Date.now()}`,
        t: Math.max(0, Number.isFinite(t) ? t : 0),
        ease: (VALID_EASES.has(ease) ? ease : 'Quad') as EasingStyle,
        dir: (VALID_DIRS.has(dir) ? dir : 'Out') as EasingDirection,
        pose: poseObj,
      };
    });

    return {
      ok: true,
      data: {
        name: name.trim(),
        rig,
        length: Math.max(0.2, length),
        keys: keys.sort((a, b) => a.t - b.t),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
    };
  }
}
