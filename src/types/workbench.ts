export type WorkbenchMode = 'vfx' | 'animation';

export type ViewportBackdrop = 'dark' | 'light';
export type ViewportAspectFrame = 'free' | '16:9' | 'mobile';

export type VfxElementType =
  | 'ParticleEmitter'
  | 'Beam'
  | 'Trail'
  | 'CubeBurst'
  | 'Ring'
  | 'Pillar'
  | 'Flash'
  | 'CameraShake'
  | 'SlowMo';

export interface ColorKeypoint {
  t: number; // 0..1
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
}

export interface NumberKeypoint {
  t: number; // 0..1
  value: number;
  envelope: number;
}

export interface NumberRange {
  min: number;
  max: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type EmissionShape = 'Box' | 'Sphere' | 'Disc';
export type EmissionDirection = 'Top' | 'Bottom' | 'Front' | 'Back' | 'Left' | 'Right';
export type FlipbookLayout = 'None' | 'Grid2x2' | 'Grid4x4' | 'Grid8x8';
export type PreviewShape = 'Circle' | 'Star' | 'Spark' | 'Cube' | 'Ring';

export interface ParticleEmitterProps {
  TextureName: string;
  PreviewShape: PreviewShape;
  Color: ColorKeypoint[];
  Size: NumberKeypoint[];
  Transparency: NumberKeypoint[];
  Lifetime: NumberRange;
  Rate: number;
  BurstCount: number;
  Speed: NumberRange;
  SpreadAngle: Vec2;
  Acceleration: Vec3;
  Drag: number;
  Rotation: NumberRange;
  RotSpeed: NumberRange;
  LightEmission: number;
  LightInfluence: number;
  ZOffset: number;
  Shape: EmissionShape;
  ShapeRadius: number;
  EmissionDirection: EmissionDirection;
  LockedToPart: boolean;
  FlipbookLayout: FlipbookLayout;
  Offset: Vec3;
}

export interface BeamProps {
  TextureName: string;
  Width0: number;
  Width1: number;
  Segments: number;
  CurveSize0: number;
  CurveSize1: number;
  Color: ColorKeypoint[];
  Transparency: NumberKeypoint[];
  TextureSpeed: number;
  LightEmission: number;
  Attachment0: Vec3;
  Attachment1: Vec3;
}

export interface TrailProps {
  TextureName: string;
  Lifetime: number;
  MinLength: number;
  WidthScale: NumberKeypoint[];
  Color: ColorKeypoint[];
  Transparency: NumberKeypoint[];
  LightEmission: number;
  OrbitRadius: number;
  OrbitSpeed: number;
  HeightOffset: number;
}

export interface CubeBurstProps {
  Count: number;
  SpeedMin: number;
  SpeedMax: number;
  Gravity: number;
  SpinSpeed: number;
  SizeMin: number;
  SizeMax: number;
  Colors: string[]; // hex colors e.g. "#FF4D4D"
  Lifetime: number;
  SpreadAngle: number;
  StudsOnTop: boolean;
  Offset: Vec3;
}

export type RingCurve = 'Linear' | 'QuadOut' | 'CubicOut' | 'BackOut' | 'SineOut';

export interface RingProps {
  StartRadius: number;
  EndRadius: number;
  Thickness: number;
  Curve: RingCurve;
  Color: ColorKeypoint[];
  Transparency: NumberKeypoint[];
  YOffset: number;
  TiltX: number;
  Segments: number;
}

export interface PillarProps {
  Radius: number;
  Height: number;
  Color: ColorKeypoint[];
  Transparency: NumberKeypoint[];
  PulseSpeed: number;
  TopFlare: number;
  Offset: Vec3;
}

export interface FlashProps {
  Color: string;
  MaxOpacity: number;
  FadeIn: number; // fraction 0..1 of element duration
  FadeOut: number; // fraction 0..1 of element duration
}

export interface CameraShakeProps {
  Intensity: number; // 0..3 studs/deg scale
  Frequency: number; // Hz
  Decay: number; // 0..5
}

export interface SlowMoProps {
  TimeScale: number; // 0.05..1
}

export type VfxPropsByType = {
  ParticleEmitter: ParticleEmitterProps;
  Beam: BeamProps;
  Trail: TrailProps;
  CubeBurst: CubeBurstProps;
  Ring: RingProps;
  Pillar: PillarProps;
  Flash: FlashProps;
  CameraShake: CameraShakeProps;
  SlowMo: SlowMoProps;
};

export interface VfxElement<T extends VfxElementType = VfxElementType> {
  id: string;
  name: string;
  type: T;
  enabled: boolean;
  start: number;
  duration: number;
  props: VfxPropsByType[T];
}

export interface VfxEffect {
  name: string;
  duration: number;
  elements: VfxElement[];
}

// --- Animation Types ---

export type RigType = 'Husser' | 'R15';

export const HUSSER_JOINTS = [
  'Body',
  'Head',
  'Jaw',
  'Tongue',
  'ArmL',
  'ArmR',
  'LegL',
  'LegR',
  'Tail',
] as const;

export const R15_JOINTS = [
  'Root',
  'Waist',
  'Neck',
  'RightShoulder',
  'RightElbow',
  'RightWrist',
  'LeftShoulder',
  'LeftElbow',
  'LeftWrist',
  'RightHip',
  'RightKnee',
  'LeftHip',
  'LeftKnee',
] as const;

export type HusserJointName = (typeof HUSSER_JOINTS)[number];
export type R15JointName = (typeof R15_JOINTS)[number];
export type JointName = HusserJointName | R15JointName;

export type EasingStyle = 'Linear' | 'Sine' | 'Quad' | 'Back' | 'Elastic' | 'Bounce';
export type EasingDirection = 'In' | 'Out' | 'InOut';

export interface JointTransform {
  rx: number; // degrees
  ry: number; // degrees
  rz: number; // degrees
  px: number; // studs
  py: number; // studs
  pz: number; // studs
  sx?: number; // scale X (Squash & Stretch)
  sy?: number; // scale Y
  sz?: number; // scale Z
}

export interface AnimationKeyframe {
  id: string;
  t: number; // seconds
  ease: EasingStyle;
  dir: EasingDirection;
  pose: Partial<Record<string, JointTransform>>;
}

export interface AnimationClip {
  name: string;
  rig: RigType;
  length: number;
  keys: AnimationKeyframe[];
}

// --- Budget & Telemetry ---

export type MobileTrafficLight = 'green' | 'amber' | 'red';

export interface BudgetMetrics {
  activeParticles: number;
  activeCubes: number;
  activeTotal: number;
  estimatedPeakTotal: number;
  mobileStatus: MobileTrafficLight;
  mobileLabel: string;
}

// --- Gemini Assistant Types ---

export interface JuicierCriterion {
  name: string;
  score: number; // 1..10
  note: string;
}

export interface JuicierSuggestion {
  id: string;
  title: string;
  principle:
    | 'Anticipation'
    | 'Overshoot'
    | 'Squash & Stretch'
    | 'Follow-through'
    | 'Timing Contrast'
    | 'Mobile Readability'
    | 'Performance Budget';
  impact: 'High' | 'Medium' | 'Low';
  rationale: string;
  patch: {
    mode: WorkbenchMode;
    vfxEffect?: VfxEffect;
    animation?: AnimationClip;
  };
}

export interface JuicierAnalysisResponse {
  summary: string;
  criteria: JuicierCriterion[];
  suggestions: JuicierSuggestion[];
}

export type TierRarity = 'Rare' | 'Legend' | 'Mythic' | 'Husstastic' | 'Impossible';

export interface TierVariant {
  tier: TierRarity;
  accentHex: string;
  tagline: string;
  estimatedPeak: number;
  effect: VfxEffect;
}

// --- MCP Activity ---

export interface McpActivityEntry {
  id: string;
  timestamp: string;
  method: string;
  toolName?: string;
  summary: string;
  status: 'ok' | 'error';
}
