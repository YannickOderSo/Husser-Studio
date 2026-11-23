import {
  AnimationClip,
  BeamProps,
  CameraShakeProps,
  CubeBurstProps,
  FlashProps,
  ParticleEmitterProps,
  PillarProps,
  RingProps,
  SlowMoProps,
  TrailProps,
  VfxEffect,
  VfxElement,
  VfxElementType,
  VfxPropsByType,
} from '../types/workbench';

let _idCounter = 1;
export function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter}`;
}

export function createDefaultProps<T extends VfxElementType>(type: T): VfxPropsByType[T] {
  switch (type) {
    case 'ParticleEmitter': {
      const p: ParticleEmitterProps = {
        TextureName: 'StudSpark_01',
        PreviewShape: 'Star',
        Color: [
          { t: 0, r: 1, g: 0.92, b: 0.35 },
          { t: 0.5, r: 1, g: 0.52, b: 0.12 },
          { t: 1, r: 0.92, g: 0.18, b: 0.22 },
        ],
        Size: [
          { t: 0, value: 0.25, envelope: 0.05 },
          { t: 0.25, value: 0.72, envelope: 0.14 },
          { t: 1, value: 0.05, envelope: 0.02 },
        ],
        Transparency: [
          { t: 0, value: 0.0, envelope: 0 },
          { t: 0.75, value: 0.15, envelope: 0.05 },
          { t: 1, value: 1.0, envelope: 0 },
        ],
        Lifetime: { min: 0.45, max: 0.85 },
        Rate: 28,
        BurstCount: 16,
        Speed: { min: 6, max: 13 },
        SpreadAngle: { x: 55, y: 55 },
        Acceleration: { x: 0, y: -14, z: 0 },
        Drag: 1.4,
        Rotation: { min: -180, max: 180 },
        RotSpeed: { min: -180, max: 180 },
        LightEmission: 0.65,
        LightInfluence: 0.35,
        ZOffset: 0.2,
        Shape: 'Sphere',
        ShapeRadius: 0.85,
        EmissionDirection: 'Top',
        LockedToPart: false,
        FlipbookLayout: 'None',
        Offset: { x: 0, y: 2.2, z: 0 },
      };
      return p as VfxPropsByType[T];
    }
    case 'Beam': {
      const p: BeamProps = {
        TextureName: 'VoxelEnergyBeam_01',
        Width0: 0.65,
        Width1: 0.2,
        Segments: 16,
        CurveSize0: 2.2,
        CurveSize1: -1.8,
        Color: [
          { t: 0, r: 1, g: 0.85, b: 0.2 },
          { t: 0.5, r: 0.2, g: 0.88, b: 1 },
          { t: 1, r: 0.25, g: 0.45, b: 1 },
        ],
        Transparency: [
          { t: 0, value: 0.1, envelope: 0 },
          { t: 0.85, value: 0.25, envelope: 0 },
          { t: 1, value: 1, envelope: 0 },
        ],
        TextureSpeed: 2.6,
        LightEmission: 0.75,
        Attachment0: { x: -2.4, y: 2.6, z: 0 },
        Attachment1: { x: 2.4, y: 3.4, z: 0 },
      };
      return p as VfxPropsByType[T];
    }
    case 'Trail': {
      const p: TrailProps = {
        TextureName: 'StudRibbonTrail_01',
        Lifetime: 0.55,
        MinLength: 0.15,
        WidthScale: [
          { t: 0, value: 1.0, envelope: 0 },
          { t: 0.6, value: 0.55, envelope: 0 },
          { t: 1, value: 0.0, envelope: 0 },
        ],
        Color: [
          { t: 0, r: 1, g: 0.9, b: 0.25 },
          { t: 1, r: 1, g: 0.3, b: 0.45 },
        ],
        Transparency: [
          { t: 0, value: 0.05, envelope: 0 },
          { t: 1, value: 1.0, envelope: 0 },
        ],
        LightEmission: 0.55,
        OrbitRadius: 2.6,
        OrbitSpeed: 6.2,
        HeightOffset: 2.5,
      };
      return p as VfxPropsByType[T];
    }
    case 'CubeBurst': {
      const p: CubeBurstProps = {
        Count: 28,
        SpeedMin: 7,
        SpeedMax: 15,
        Gravity: 32,
        SpinSpeed: 320,
        SizeMin: 0.32,
        SizeMax: 0.68,
        Colors: ['#FF4D4D', '#FFBE0B', '#3A86FF', '#2EC4B6', '#FF6B9D'],
        Lifetime: 1.1,
        SpreadAngle: 70,
        StudsOnTop: true,
        Offset: { x: 0, y: 2.1, z: 0 },
      };
      return p as VfxPropsByType[T];
    }
    case 'Ring': {
      const p: RingProps = {
        StartRadius: 0.6,
        EndRadius: 6.8,
        Thickness: 0.36,
        Curve: 'QuadOut',
        Color: [
          { t: 0, r: 1, g: 0.92, b: 0.3 },
          { t: 0.6, r: 1, g: 0.45, b: 0.12 },
          { t: 1, r: 0.95, g: 0.2, b: 0.25 },
        ],
        Transparency: [
          { t: 0, value: 0.05, envelope: 0 },
          { t: 0.65, value: 0.25, envelope: 0 },
          { t: 1, value: 1.0, envelope: 0 },
        ],
        YOffset: 0.35,
        TiltX: 0,
        Segments: 32,
      };
      return p as VfxPropsByType[T];
    }
    case 'Pillar': {
      const p: PillarProps = {
        Radius: 1.15,
        Height: 11,
        Color: [
          { t: 0, r: 1, g: 0.95, b: 0.55 },
          { t: 0.5, r: 1, g: 0.72, b: 0.15 },
          { t: 1, r: 1, g: 0.45, b: 0.05 },
        ],
        Transparency: [
          { t: 0, value: 0.85, envelope: 0 },
          { t: 0.18, value: 0.18, envelope: 0 },
          { t: 0.72, value: 0.3, envelope: 0 },
          { t: 1, value: 1.0, envelope: 0 },
        ],
        PulseSpeed: 7,
        TopFlare: 1.35,
        Offset: { x: 0, y: 0.04, z: 0 },
      };
      return p as VfxPropsByType[T];
    }
    case 'Flash': {
      const p: FlashProps = {
        Color: '#FFF3B0',
        MaxOpacity: 0.45,
        FadeIn: 0.15,
        FadeOut: 0.85,
      };
      return p as VfxPropsByType[T];
    }
    case 'CameraShake': {
      const p: CameraShakeProps = {
        Intensity: 0.65,
        Frequency: 24,
        Decay: 2.6,
      };
      return p as VfxPropsByType[T];
    }
    case 'SlowMo': {
      const p: SlowMoProps = {
        TimeScale: 0.3,
      };
      return p as VfxPropsByType[T];
    }
  }
}

export function createVfxElement<T extends VfxElementType>(
  type: T,
  overrides?: Partial<VfxElement<T>>
): VfxElement<T> {
  return {
    id: nextId('el'),
    name: `${type}_${Math.floor(Math.random() * 90 + 10)}`,
    type,
    enabled: true,
    start: 0.0,
    duration: type === 'Flash' ? 0.25 : type === 'CameraShake' ? 0.35 : type === 'SlowMo' ? 0.3 : 1.2,
    props: createDefaultProps(type),
    ...overrides,
  };
}

export const VFX_PRESETS: VfxEffect[] = [
  {
    name: 'Huss_Chomp_Burst',
    duration: 2.2,
    elements: [
      {
        id: 'el_cube_burst',
        name: 'StudCube_Pop',
        type: 'CubeBurst',
        enabled: true,
        start: 0.18,
        duration: 1.45,
        props: {
          Count: 32,
          SpeedMin: 8,
          SpeedMax: 16,
          Gravity: 34,
          SpinSpeed: 360,
          SizeMin: 0.34,
          SizeMax: 0.72,
          Colors: ['#FFBE0B', '#FB5607', '#FF006E', '#3A86FF', '#2EC4B6'],
          Lifetime: 1.25,
          SpreadAngle: 72,
          StudsOnTop: true,
          Offset: { x: 0, y: 2.4, z: 0.4 },
        },
      },
      {
        id: 'el_ring_shock',
        name: 'Chomp_ShockRing',
        type: 'Ring',
        enabled: true,
        start: 0.18,
        duration: 0.72,
        props: {
          StartRadius: 0.7,
          EndRadius: 7.4,
          Thickness: 0.42,
          Curve: 'QuadOut',
          Color: [
            { t: 0, r: 1, g: 0.95, b: 0.42 },
            { t: 0.55, r: 1, g: 0.55, b: 0.1 },
            { t: 1, r: 0.95, g: 0.2, b: 0.28 },
          ],
          Transparency: [
            { t: 0, value: 0.0, envelope: 0 },
            { t: 0.65, value: 0.25, envelope: 0 },
            { t: 1, value: 1.0, envelope: 0 },
          ],
          YOffset: 0.32,
          TiltX: 0,
          Segments: 32,
        },
      },
      {
        id: 'el_sparks',
        name: 'Crunch_Sparks',
        type: 'ParticleEmitter',
        enabled: true,
        start: 0.15,
        duration: 1.2,
        props: {
          TextureName: 'StudStar_Burst',
          PreviewShape: 'Star',
          Color: [
            { t: 0, r: 1, g: 0.96, b: 0.45 },
            { t: 0.5, r: 1, g: 0.58, b: 0.1 },
            { t: 1, r: 1, g: 0.2, b: 0.35 },
          ],
          Size: [
            { t: 0, value: 0.35, envelope: 0.1 },
            { t: 0.2, value: 0.85, envelope: 0.18 },
            { t: 1, value: 0.05, envelope: 0 },
          ],
          Transparency: [
            { t: 0, value: 0.0, envelope: 0 },
            { t: 0.72, value: 0.15, envelope: 0.05 },
            { t: 1, value: 1.0, envelope: 0 },
          ],
          Lifetime: { min: 0.45, max: 0.85 },
          Rate: 30,
          BurstCount: 22,
          Speed: { min: 7, max: 15 },
          SpreadAngle: { x: 65, y: 65 },
          Acceleration: { x: 0, y: -12, z: 0 },
          Drag: 1.8,
          Rotation: { min: -180, max: 180 },
          RotSpeed: { min: -220, max: 220 },
          LightEmission: 0.75,
          LightInfluence: 0.25,
          ZOffset: 0.25,
          Shape: 'Sphere',
          ShapeRadius: 0.9,
          EmissionDirection: 'Top',
          LockedToPart: false,
          FlipbookLayout: 'None',
          Offset: { x: 0, y: 2.5, z: 0.4 },
        },
      },
      {
        id: 'el_pillar',
        name: 'Golden_Feast_Pillar',
        type: 'Pillar',
        enabled: true,
        start: 0.18,
        duration: 0.95,
        props: {
          Radius: 1.25,
          Height: 11.5,
          Color: [
            { t: 0, r: 1, g: 0.96, b: 0.55 },
            { t: 0.5, r: 1, g: 0.74, b: 0.12 },
            { t: 1, r: 1, g: 0.42, b: 0.08 },
          ],
          Transparency: [
            { t: 0, value: 0.85, envelope: 0 },
            { t: 0.14, value: 0.22, envelope: 0 },
            { t: 0.7, value: 0.35, envelope: 0 },
            { t: 1, value: 1.0, envelope: 0 },
          ],
          PulseSpeed: 8,
          TopFlare: 1.38,
          Offset: { x: 0, y: 0.04, z: 0 },
        },
      },
      {
        id: 'el_flash',
        name: 'Impact_Flash',
        type: 'Flash',
        enabled: true,
        start: 0.17,
        duration: 0.22,
        props: {
          Color: '#FFF4B8',
          MaxOpacity: 0.35,
          FadeIn: 0.15,
          FadeOut: 0.85,
        },
      },
      {
        id: 'el_shake',
        name: 'Chomp_CameraShake',
        type: 'CameraShake',
        enabled: true,
        start: 0.18,
        duration: 0.38,
        props: {
          Intensity: 0.65,
          Frequency: 26,
          Decay: 2.8,
        },
      },
    ],
  },
  {
    name: 'Husser_Feast_Ascension',
    duration: 2.8,
    elements: [
      {
        id: 'el_asc_pillar',
        name: 'Sky_Beam_Pillar',
        type: 'Pillar',
        enabled: true,
        start: 0.25,
        duration: 1.8,
        props: {
          Radius: 1.5,
          Height: 15,
          Color: [
            { t: 0, r: 0.3, g: 0.95, b: 1 },
            { t: 0.5, r: 0.25, g: 0.62, b: 1 },
            { t: 1, r: 0.65, g: 0.3, b: 1 },
          ],
          Transparency: [
            { t: 0, value: 1, envelope: 0 },
            { t: 0.15, value: 0.2, envelope: 0 },
            { t: 0.8, value: 0.3, envelope: 0 },
            { t: 1, value: 1, envelope: 0 },
          ],
          PulseSpeed: 9,
          TopFlare: 1.5,
          Offset: { x: 0, y: 0.04, z: 0 },
        },
      },
      {
        id: 'el_asc_trail',
        name: 'Orbit_Stud_Ribbon',
        type: 'Trail',
        enabled: true,
        start: 0.1,
        duration: 2.2,
        props: {
          TextureName: 'VoxelRibbon_Glow',
          Lifetime: 0.65,
          MinLength: 0.15,
          WidthScale: [
            { t: 0, value: 1, envelope: 0 },
            { t: 1, value: 0, envelope: 0 },
          ],
          Color: [
            { t: 0, r: 0.25, g: 0.95, b: 1 },
            { t: 1, r: 1, g: 0.85, b: 0.2 },
          ],
          Transparency: [
            { t: 0, value: 0.05, envelope: 0 },
            { t: 1, value: 1, envelope: 0 },
          ],
          LightEmission: 0.8,
          OrbitRadius: 2.8,
          OrbitSpeed: 7.5,
          HeightOffset: 2.6,
        },
      },
      {
        id: 'el_asc_cubes',
        name: 'Voxel_Confetti',
        type: 'CubeBurst',
        enabled: true,
        start: 0.3,
        duration: 1.8,
        props: {
          Count: 40,
          SpeedMin: 9,
          SpeedMax: 18,
          Gravity: 26,
          SpinSpeed: 400,
          SizeMin: 0.3,
          SizeMax: 0.65,
          Colors: ['#38BDF8', '#FACC15', '#A855F7', '#34D399'],
          Lifetime: 1.5,
          SpreadAngle: 60,
          StudsOnTop: true,
          Offset: { x: 0, y: 2.0, z: 0 },
        },
      },
      {
        id: 'el_asc_ring',
        name: 'Ascension_Ring',
        type: 'Ring',
        enabled: true,
        start: 0.28,
        duration: 0.9,
        props: {
          StartRadius: 0.5,
          EndRadius: 8.5,
          Thickness: 0.38,
          Curve: 'BackOut',
          Color: [
            { t: 0, r: 0.35, g: 0.95, b: 1 },
            { t: 1, r: 0.65, g: 0.3, b: 1 },
          ],
          Transparency: [
            { t: 0, value: 0.05, envelope: 0 },
            { t: 1, value: 1, envelope: 0 },
          ],
          YOffset: 0.35,
          TiltX: 0,
          Segments: 32,
        },
      },
      {
        id: 'el_asc_slowmo',
        name: 'Impact_Hitstop',
        type: 'SlowMo',
        enabled: true,
        start: 0.26,
        duration: 0.26,
        props: {
          TimeScale: 0.28,
        },
      },
    ],
  },
];

// --- Animation Presets ---

export const ANIMATION_PRESETS: Record<string, AnimationClip> = {
  'Huss Run': {
    name: 'Huss_Run',
    rig: 'Husser',
    length: 0.8,
    keys: [
      {
        id: 'k_run_1',
        t: 0.0,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 14, ry: -8, rz: -6, px: 0, py: 0.15, pz: 0, sx: 1.06, sy: 0.92, sz: 1.06 },
          Head: { rx: -10, ry: 8, rz: 10, px: 0, py: 0.05, pz: 0, sx: 1.04, sy: 0.96, sz: 1.04 },
          Jaw: { rx: 28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 12, ry: -18, rz: -22, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -68, ry: 0, rz: -38, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 52, ry: 0, rz: 32, px: 0, py: 0, pz: 0 },
          LegL: { rx: 46, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: -48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tail: { rx: 14, ry: -32, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_run_2',
        t: 0.2,
        ease: 'Back',
        dir: 'Out',
        pose: {
          Body: { rx: 8, ry: 0, rz: 0, px: 0, py: 0.62, pz: 0, sx: 0.92, sy: 1.12, sz: 0.92 },
          Head: { rx: 8, ry: 0, rz: 0, px: 0, py: 0.12, pz: 0, sx: 0.96, sy: 1.06, sz: 0.96 },
          Jaw: { rx: 42, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -18, ry: 12, rz: 18, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -10, ry: 0, rz: -58, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -10, ry: 0, rz: 58, px: 0, py: 0, pz: 0 },
          LegL: { rx: 0, ry: 0, rz: 0, px: 0, py: 0.1, pz: 0 },
          LegR: { rx: 0, ry: 0, rz: 0, px: 0, py: 0.1, pz: 0 },
          Tail: { rx: 28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_run_3',
        t: 0.4,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 14, ry: 8, rz: 6, px: 0, py: 0.15, pz: 0, sx: 1.06, sy: 0.92, sz: 1.06 },
          Head: { rx: -10, ry: -8, rz: -10, px: 0, py: 0.05, pz: 0, sx: 1.04, sy: 0.96, sz: 1.04 },
          Jaw: { rx: 28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 14, ry: 18, rz: 22, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 52, ry: 0, rz: -32, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -68, ry: 0, rz: 38, px: 0, py: 0, pz: 0 },
          LegL: { rx: -48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: 46, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tail: { rx: 14, ry: 32, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_run_4',
        t: 0.6,
        ease: 'Back',
        dir: 'Out',
        pose: {
          Body: { rx: 8, ry: 0, rz: 0, px: 0, py: 0.62, pz: 0, sx: 0.92, sy: 1.12, sz: 0.92 },
          Head: { rx: 8, ry: 0, rz: 0, px: 0, py: 0.12, pz: 0, sx: 0.96, sy: 1.06, sz: 0.96 },
          Jaw: { rx: 44, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -16, ry: -12, rz: -18, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -10, ry: 0, rz: -58, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -10, ry: 0, rz: 58, px: 0, py: 0, pz: 0 },
          LegL: { rx: 0, ry: 0, rz: 0, px: 0, py: 0.1, pz: 0 },
          LegR: { rx: 0, ry: 0, rz: 0, px: 0, py: 0.1, pz: 0 },
          Tail: { rx: 28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_run_5',
        t: 0.8,
        ease: 'Linear',
        dir: 'Out',
        pose: {
          Body: { rx: 14, ry: -8, rz: -6, px: 0, py: 0.15, pz: 0, sx: 1.06, sy: 0.92, sz: 1.06 },
          Head: { rx: -10, ry: 8, rz: 10, px: 0, py: 0.05, pz: 0, sx: 1.04, sy: 0.96, sz: 1.04 },
          Jaw: { rx: 28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 12, ry: -18, rz: -22, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -68, ry: 0, rz: -38, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 52, ry: 0, rz: 32, px: 0, py: 0, pz: 0 },
          LegL: { rx: 46, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: -48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tail: { rx: 14, ry: -32, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  },

  'Idle Pant': {
    name: 'Idle_Pant',
    rig: 'Husser',
    length: 1.2,
    keys: [
      {
        id: 'k_idle_1',
        t: 0.0,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Body: { rx: 2, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1.03, sy: 0.96, sz: 1.03 },
          Head: { rx: -4, ry: -4, rz: 3, px: 0, py: 0, pz: 0 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 10, ry: -8, rz: -6, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 6, ry: 0, rz: -10, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 6, ry: 0, rz: 10, px: 0, py: 0, pz: 0 },
          Tail: { rx: 12, ry: -26, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_idle_2',
        t: 0.3,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Body: { rx: -2, ry: 0, rz: 0, px: 0, py: 0.14, pz: 0, sx: 0.97, sy: 1.05, sz: 0.97 },
          Head: { rx: 4, ry: 4, rz: -3, px: 0, py: 0.04, pz: 0 },
          Jaw: { rx: 38, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -6, ry: 8, rz: 10, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -6, ry: 0, rz: -18, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -6, ry: 0, rz: 18, px: 0, py: 0, pz: 0 },
          Tail: { rx: 20, ry: 26, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_idle_3',
        t: 0.6,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Body: { rx: 2, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1.03, sy: 0.96, sz: 1.03 },
          Head: { rx: -4, ry: 5, rz: -3, px: 0, py: 0, pz: 0 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 10, ry: 10, rz: 8, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 6, ry: 0, rz: -10, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 6, ry: 0, rz: 10, px: 0, py: 0, pz: 0 },
          Tail: { rx: 12, ry: -26, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_idle_4',
        t: 0.9,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Body: { rx: -2, ry: 0, rz: 0, px: 0, py: 0.14, pz: 0, sx: 0.97, sy: 1.05, sz: 0.97 },
          Head: { rx: 4, ry: -4, rz: 3, px: 0, py: 0.04, pz: 0 },
          Jaw: { rx: 38, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -6, ry: -10, rz: -8, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -6, ry: 0, rz: -18, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -6, ry: 0, rz: 18, px: 0, py: 0, pz: 0 },
          Tail: { rx: 20, ry: 26, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_idle_5',
        t: 1.2,
        ease: 'Linear',
        dir: 'Out',
        pose: {
          Body: { rx: 2, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1.03, sy: 0.96, sz: 1.03 },
          Head: { rx: -4, ry: -4, rz: 3, px: 0, py: 0, pz: 0 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 10, ry: -8, rz: -6, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 6, ry: 0, rz: -10, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 6, ry: 0, rz: 10, px: 0, py: 0, pz: 0 },
          Tail: { rx: 12, ry: -26, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  },

  Celebrate: {
    name: 'Husser_Celebrate',
    rig: 'Husser',
    length: 1.4,
    keys: [
      {
        id: 'k_cel_1',
        t: 0.0,
        ease: 'Quad',
        dir: 'In',
        pose: {
          Body: { rx: 12, ry: 0, rz: 0, px: 0, py: -0.32, pz: 0, sx: 1.18, sy: 0.78, sz: 1.18 },
          Head: { rx: 10, ry: 0, rz: 0, px: 0, py: -0.1, pz: 0, sx: 1.1, sy: 0.88, sz: 1.1 },
          Jaw: { rx: 14, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 28, ry: 0, rz: -24, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 28, ry: 0, rz: 24, px: 0, py: 0, pz: 0 },
          LegL: { rx: -22, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: -22, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_cel_2',
        t: 0.35,
        ease: 'Back',
        dir: 'Out',
        pose: {
          Body: { rx: -10, ry: 18, rz: 0, px: 0, py: 1.65, pz: 0, sx: 0.84, sy: 1.24, sz: 0.84 },
          Head: { rx: -18, ry: 0, rz: 12, px: 0, py: 0.1, pz: 0, sx: 0.92, sy: 1.12, sz: 0.92 },
          Jaw: { rx: 52, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -14, ry: 22, rz: 20, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -145, ry: 0, rz: -35, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -145, ry: 0, rz: 35, px: 0, py: 0, pz: 0 },
          LegL: { rx: 24, ry: 0, rz: -14, px: 0, py: 0, pz: 0 },
          LegR: { rx: 24, ry: 0, rz: 14, px: 0, py: 0, pz: 0 },
          Tail: { rx: 40, ry: 40, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_cel_3',
        t: 0.72,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Body: { rx: -6, ry: -18, rz: 0, px: 0, py: 1.45, pz: 0, sx: 0.92, sy: 1.14, sz: 0.92 },
          Head: { rx: -14, ry: 0, rz: -14, px: 0, py: 0.08, pz: 0 },
          Jaw: { rx: 46, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -10, ry: -24, rz: -18, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -125, ry: 0, rz: -55, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -155, ry: 0, rz: 15, px: 0, py: 0, pz: 0 },
          LegL: { rx: -18, ry: 0, rz: -18, px: 0, py: 0, pz: 0 },
          LegR: { rx: -18, ry: 0, rz: 18, px: 0, py: 0, pz: 0 },
          Tail: { rx: 40, ry: -40, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_cel_4',
        t: 1.05,
        ease: 'Bounce',
        dir: 'Out',
        pose: {
          Body: { rx: 10, ry: 0, rz: 0, px: 0, py: -0.25, pz: 0, sx: 1.22, sy: 0.76, sz: 1.22 },
          Head: { rx: 12, ry: 0, rz: 0, px: 0, py: -0.06, pz: 0, sx: 1.12, sy: 0.86, sz: 1.12 },
          Jaw: { rx: 22, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -35, ry: 0, rz: -42, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -35, ry: 0, rz: 42, px: 0, py: 0, pz: 0 },
          LegL: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_cel_5',
        t: 1.4,
        ease: 'Elastic',
        dir: 'Out',
        pose: {
          Body: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Head: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Jaw: { rx: 24, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 6, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 0, ry: 0, rz: -12, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 0, ry: 0, rz: 12, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  },

  Chomp: {
    name: 'Husser_Chomp',
    rig: 'Husser',
    length: 1.0,
    keys: [
      {
        id: 'k_ch_1',
        t: 0.0,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Head: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_ch_2',
        t: 0.28,
        ease: 'Back',
        dir: 'In',
        pose: {
          Body: { rx: -18, ry: 0, rz: 0, px: 0, py: 0.12, pz: -0.45, sx: 0.9, sy: 1.14, sz: 0.92 },
          Head: { rx: -28, ry: 0, rz: 0, px: 0, py: 0.14, pz: -0.2, sx: 0.94, sy: 1.12, sz: 0.94 },
          Jaw: { rx: 68, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -20, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -55, ry: 0, rz: -42, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -55, ry: 0, rz: 42, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_ch_3',
        t: 0.44,
        ease: 'Back',
        dir: 'Out',
        pose: {
          Body: { rx: 24, ry: 0, rz: 0, px: 0, py: -0.18, pz: 0.72, sx: 1.2, sy: 0.82, sz: 1.18 },
          Head: { rx: 22, ry: 0, rz: 0, px: 0, py: -0.05, pz: 0.35, sx: 1.18, sy: 0.84, sz: 1.15 },
          Jaw: { rx: -4, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: -0.25 },
          ArmL: { rx: 44, ry: 0, rz: -22, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 44, ry: 0, rz: 22, px: 0, py: 0, pz: 0 },
          Tail: { rx: 38, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_ch_4',
        t: 0.68,
        ease: 'Elastic',
        dir: 'Out',
        pose: {
          Body: { rx: 4, ry: 0, rz: 0, px: 0, py: 0.05, pz: 0.15, sx: 0.96, sy: 1.04, sz: 0.96 },
          Head: { rx: 6, ry: 0, rz: 0, px: 0, py: 0, pz: 0.05, sx: 0.98, sy: 1.03, sz: 0.98 },
          Jaw: { rx: 24, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 10, ry: 12, rz: 10, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_ch_5',
        t: 1.0,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Head: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 6, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 0, ry: 0, rz: -10, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 0, ry: 0, rz: 10, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  },

  Startle: {
    name: 'Husser_Startle',
    rig: 'Husser',
    length: 1.1,
    keys: [
      {
        id: 'k_st_1',
        t: 0.0,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Head: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Jaw: { rx: 14, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_st_2',
        t: 0.12,
        ease: 'Back',
        dir: 'Out',
        pose: {
          Body: { rx: -16, ry: 0, rz: 0, px: 0, py: 1.35, pz: -0.35, sx: 0.78, sy: 1.34, sz: 0.78 },
          Head: { rx: -20, ry: 0, rz: 10, px: 0, py: 0.25, pz: 0, sx: 0.88, sy: 1.2, sz: 0.88 },
          Jaw: { rx: 64, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: -25, ry: 0, rz: 24, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -85, ry: 0, rz: -78, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -85, ry: 0, rz: 78, px: 0, py: 0, pz: 0 },
          LegL: { rx: 32, ry: 0, rz: -20, px: 0, py: 0, pz: 0 },
          LegR: { rx: 32, ry: 0, rz: 20, px: 0, py: 0, pz: 0 },
          Tail: { rx: 60, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_st_3',
        t: 0.26,
        ease: 'Linear',
        dir: 'InOut',
        pose: {
          Body: { rx: -14, ry: -12, rz: -8, px: -0.1, py: 1.1, pz: -0.4, sx: 0.85, sy: 1.22, sz: 0.85 },
          Head: { rx: -16, ry: 12, rz: -12, px: 0, py: 0.18, pz: 0 },
          Jaw: { rx: 60, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -95, ry: 0, rz: -65, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -75, ry: 0, rz: 85, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_st_4',
        t: 0.56,
        ease: 'Bounce',
        dir: 'Out',
        pose: {
          Body: { rx: 14, ry: 0, rz: 0, px: 0, py: -0.32, pz: -0.3, sx: 1.26, sy: 0.72, sz: 1.26 },
          Head: { rx: 12, ry: 0, rz: 0, px: 0, py: -0.1, pz: 0, sx: 1.15, sy: 0.84, sz: 1.15 },
          Jaw: { rx: 34, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: -25, ry: 0, rz: -48, px: 0, py: 0, pz: 0 },
          ArmR: { rx: -25, ry: 0, rz: 48, px: 0, py: 0, pz: 0 },
          LegL: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LegR: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'k_st_5',
        t: 1.1,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Body: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Head: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 1, sy: 1, sz: 1 },
          Jaw: { rx: 18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          Tongue: { rx: 6, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          ArmL: { rx: 0, ry: 0, rz: -10, px: 0, py: 0, pz: 0 },
          ArmR: { rx: 0, ry: 0, rz: 10, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  },
};

export function createR15Preset(presetName: string): AnimationClip {
  if (presetName === 'Celebrate') {
    return {
      name: 'R15_Celebrate',
      rig: 'R15',
      length: 1.2,
      keys: [
        {
          id: 'r15_c1',
          t: 0,
          ease: 'Quad',
          dir: 'In',
          pose: {
            Root: { rx: 8, ry: 0, rz: 0, px: 0, py: -0.35, pz: 0 },
            Waist: { rx: 14, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightShoulder: { rx: 20, ry: 0, rz: 18, px: 0, py: 0, pz: 0 },
            LeftShoulder: { rx: 20, ry: 0, rz: -18, px: 0, py: 0, pz: 0 },
            RightHip: { rx: -28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightKnee: { rx: 48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            LeftHip: { rx: -28, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            LeftKnee: { rx: 48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          },
        },
        {
          id: 'r15_c2',
          t: 0.4,
          ease: 'Back',
          dir: 'Out',
          pose: {
            Root: { rx: -6, ry: 0, rz: 0, px: 0, py: 1.4, pz: 0 },
            Waist: { rx: -10, ry: 12, rz: 0, px: 0, py: 0, pz: 0 },
            Neck: { rx: -14, ry: 0, rz: 8, px: 0, py: 0, pz: 0 },
            RightShoulder: { rx: -155, ry: 0, rz: 28, px: 0, py: 0, pz: 0 },
            RightElbow: { rx: -24, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            LeftShoulder: { rx: -155, ry: 0, rz: -28, px: 0, py: 0, pz: 0 },
            LeftElbow: { rx: -24, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightHip: { rx: 16, ry: 0, rz: 12, px: 0, py: 0, pz: 0 },
            LeftHip: { rx: 16, ry: 0, rz: -12, px: 0, py: 0, pz: 0 },
          },
        },
        {
          id: 'r15_c3',
          t: 0.85,
          ease: 'Bounce',
          dir: 'Out',
          pose: {
            Root: { rx: 6, ry: 0, rz: 0, px: 0, py: -0.2, pz: 0 },
            Waist: { rx: 10, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightShoulder: { rx: -50, ry: 0, rz: 45, px: 0, py: 0, pz: 0 },
            LeftShoulder: { rx: -50, ry: 0, rz: -45, px: 0, py: 0, pz: 0 },
            RightHip: { rx: -18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightKnee: { rx: 32, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            LeftHip: { rx: -18, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            LeftKnee: { rx: 32, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          },
        },
        {
          id: 'r15_c4',
          t: 1.2,
          ease: 'Quad',
          dir: 'Out',
          pose: {
            Root: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            Waist: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            Neck: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
            RightShoulder: { rx: 0, ry: 0, rz: 8, px: 0, py: 0, pz: 0 },
            LeftShoulder: { rx: 0, ry: 0, rz: -8, px: 0, py: 0, pz: 0 },
          },
        },
      ],
    };
  }

  // Default R15 energetic Huss Run stride
  return {
    name: `R15_${presetName.replace(/\s+/g, '_')}`,
    rig: 'R15',
    length: 0.8,
    keys: [
      {
        id: 'r15_r1',
        t: 0,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Root: { rx: 12, ry: -10, rz: 0, px: 0, py: 0.12, pz: 0 },
          Waist: { rx: 8, ry: 14, rz: 0, px: 0, py: 0, pz: 0 },
          Neck: { rx: -12, ry: -6, rz: 5, px: 0, py: 0, pz: 0 },
          RightShoulder: { rx: -62, ry: 0, rz: 20, px: 0, py: 0, pz: 0 },
          RightElbow: { rx: -58, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftShoulder: { rx: 52, ry: 0, rz: -20, px: 0, py: 0, pz: 0 },
          LeftElbow: { rx: -40, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightHip: { rx: 48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightKnee: { rx: 32, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftHip: { rx: -44, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftKnee: { rx: 52, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'r15_r2',
        t: 0.2,
        ease: 'Sine',
        dir: 'InOut',
        pose: {
          Root: { rx: 8, ry: 0, rz: 0, px: 0, py: 0.45, pz: 0 },
          Waist: { rx: 4, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightShoulder: { rx: 0, ry: 0, rz: 32, px: 0, py: 0, pz: 0 },
          RightElbow: { rx: -45, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftShoulder: { rx: 0, ry: 0, rz: -32, px: 0, py: 0, pz: 0 },
          LeftElbow: { rx: -45, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightHip: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightKnee: { rx: 14, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftHip: { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftKnee: { rx: 14, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'r15_r3',
        t: 0.4,
        ease: 'Quad',
        dir: 'Out',
        pose: {
          Root: { rx: 12, ry: 10, rz: 0, px: 0, py: 0.12, pz: 0 },
          Waist: { rx: 8, ry: -14, rz: 0, px: 0, py: 0, pz: 0 },
          Neck: { rx: -12, ry: 6, rz: -5, px: 0, py: 0, pz: 0 },
          RightShoulder: { rx: 52, ry: 0, rz: 20, px: 0, py: 0, pz: 0 },
          RightElbow: { rx: -40, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftShoulder: { rx: -62, ry: 0, rz: -20, px: 0, py: 0, pz: 0 },
          LeftElbow: { rx: -58, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightHip: { rx: -44, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightKnee: { rx: 52, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftHip: { rx: 48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftKnee: { rx: 32, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
      {
        id: 'r15_r4',
        t: 0.8,
        ease: 'Linear',
        dir: 'Out',
        pose: {
          Root: { rx: 12, ry: -10, rz: 0, px: 0, py: 0.12, pz: 0 },
          Waist: { rx: 8, ry: 14, rz: 0, px: 0, py: 0, pz: 0 },
          Neck: { rx: -12, ry: -6, rz: 5, px: 0, py: 0, pz: 0 },
          RightShoulder: { rx: -62, ry: 0, rz: 20, px: 0, py: 0, pz: 0 },
          RightElbow: { rx: -58, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftShoulder: { rx: 52, ry: 0, rz: -20, px: 0, py: 0, pz: 0 },
          LeftElbow: { rx: -40, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightHip: { rx: 48, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          RightKnee: { rx: 32, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftHip: { rx: -44, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
          LeftKnee: { rx: 52, ry: 0, rz: 0, px: 0, py: 0, pz: 0 },
        },
      },
    ],
  };
}
