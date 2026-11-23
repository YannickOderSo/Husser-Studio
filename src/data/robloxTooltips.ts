export const ROBLOX_TOOLTIPS: Record<string, string> = {
  // ParticleEmitter
  TextureName: 'Roblox ParticleEmitter.Texture placeholder name (swap with rbxassetid:// in Roblox Studio).',
  PreviewShape: 'Built-in procedural preview shape used in the browser viewport before custom texture upload.',
  Color: 'Roblox ColorSequence: tint color over each particle lifetime (t = 0 spawn to t = 1 death).',
  Size: 'Roblox NumberSequence (studs): particle diameter over lifetime, plus random Envelope variance.',
  Transparency: 'Roblox NumberSequence (0 = opaque, 1 = invisible): fade-in/out opacity curve with Envelope.',
  Lifetime: 'Roblox NumberRange (seconds): minimum and maximum lifespan of each spawned particle.',
  Rate: 'Roblox ParticleEmitter.Rate (particles/sec): continuous emission rate while active.',
  BurstCount: 'Roblox ParticleEmitter:Emit(N): instantaneous particle burst fired at element Start time.',
  Speed: 'Roblox NumberRange (studs/sec): initial outward launch velocity along EmissionDirection.',
  SpreadAngle: 'Roblox Vector2 (degrees X/Y): cone half-angle spread around EmissionDirection.',
  Acceleration: 'Roblox Vector3 (studs/sec²): constant world-space force such as gravity (negative Y) or wind.',
  Drag: 'Roblox ParticleEmitter.Drag: exponential velocity damping; higher values slow particles faster.',
  Rotation: 'Roblox NumberRange (degrees): initial random Z-axis roll angle at spawn.',
  RotSpeed: 'Roblox NumberRange (deg/sec): angular spin speed of each particle billboard.',
  LightEmission: 'Roblox LightEmission (0..1): blends particle color additively for bright glowing sparks.',
  LightInfluence: 'Roblox LightInfluence (0..1): how strongly scene lighting shades the particle vs unlit brightness.',
  ZOffset: 'Roblox ZOffset (studs): depth bias shifting render sorting toward (+) or away from (-) the camera.',
  Shape: 'Roblox ParticleEmitterShape: volume geometry particles spawn within (Box, Sphere, or Disc).',
  ShapeRadius: 'Spawn volume radius/half-extent in studs for Box, Sphere, or Disc shapes.',
  EmissionDirection: 'Roblox NormalId face from which particles launch relative to the emitter attachment.',
  LockedToPart: 'Roblox LockedToPart: when true, emitted particles move together with the parent attachment.',
  FlipbookLayout: 'Roblox ParticleFlipbookLayout: animated sprite sheet grid (None, Grid2x2, Grid4x4, Grid8x8).',
  Offset: 'Local attachment position offset in studs relative to the Husser root.',

  // Beam
  Width0: 'Roblox Beam.Width0 (studs): ribbon width at Attachment0.',
  Width1: 'Roblox Beam.Width1 (studs): ribbon width at Attachment1.',
  Segments: 'Roblox Beam.Segments: subdivision count along the cubic Bézier ribbon curve.',
  CurveSize0: 'Roblox Beam.CurveSize0 (studs): control handle length bending the beam near Attachment0.',
  CurveSize1: 'Roblox Beam.CurveSize1 (studs): control handle length bending the beam near Attachment1.',
  TextureSpeed: 'Roblox Beam.TextureSpeed: scrolling speed of the ribbon texture along the beam length.',
  Attachment0: 'Start Attachment0 position offset in studs.',
  Attachment1: 'End Attachment1 position offset in studs.',

  // Trail
  MinLength: 'Roblox Trail.MinLength (studs): minimum distance moved before emitting a new trail segment.',
  WidthScale: 'Roblox Trail.WidthScale (NumberSequence): multiplies trail width from newest (0) to oldest (1).',
  OrbitRadius: 'Preview motion radius (studs) sweeping the Trail attachment around the character.',
  OrbitSpeed: 'Preview orbit angular speed (rad/sec) to inspect trail ribbon curvature live.',

  // CubeBurst
  Count: 'Number of Stud Voxel cubes spawned in the burst (counts directly toward Mobile 150 budget).',
  SpeedMin: 'Minimum outward launch speed (studs/sec) for each voxel cube.',
  SpeedMax: 'Maximum outward launch speed (studs/sec) for each voxel cube.',
  Gravity: 'Downward gravitational acceleration (studs/sec²). Roblox default workspace gravity is ~196; stylized VFX uses 24–45.',
  SpinSpeed: 'Random 3D tumble angular velocity (deg/sec) of flying stud cubes.',
  SizeMin: 'Minimum stud cube edge size (studs).',
  SizeMax: 'Maximum stud cube edge size (studs).',
  Colors: 'Vibrant Stud Voxel palette sampled across spawned cubes.',
  StudsOnTop: 'Renders raised Lego-style studs on top of every burst cube.',

  // Ring
  StartRadius: 'Initial shockwave ring radius in studs at Start time.',
  EndRadius: 'Final shockwave ring radius in studs at Start + Duration.',
  Thickness: 'Cross-sectional tube thickness of the shockwave ring in studs.',
  Curve: 'Easing curve controlling how punchily the ring expands (QuadOut / BackOut gives snappy impact).',
  YOffset: 'Height of the shockwave ring above the studded baseplate in studs.',
  TiltX: 'Ring pitch tilt angle in degrees (0 = horizontal ground shockwave).',

  // Pillar
  Radius: 'Base cylinder radius of the vertical light pillar in studs.',
  Height: 'Vertical height of the light pillar in studs.',
  PulseSpeed: 'Subtle scale oscillation frequency (Hz) keeping the pillar energetic.',
  TopFlare: 'Width multiplier at the top of the pillar (>1 flares upward, <1 tapers to a beam).',

  // Flash
  MaxOpacity: 'Peak opacity (0..1) of the screen flash overlay.',
  FadeIn: 'Fraction of Flash duration spent ramping up to peak opacity.',
  FadeOut: 'Fraction of Flash duration spent fading back to transparent.',

  // CameraShake
  Intensity: 'Peak camera shake displacement & roll trauma magnitude.',
  Frequency: 'Oscillation speed in Hz (higher values feel buzzy, lower values feel heavy).',
  Decay: 'Exponential falloff rate controlling how fast the camera settles after impact.',

  // SlowMo
  TimeScale: 'Simulation speed multiplier during this SlowMo window (e.g. 0.25 = quarter-speed hitstop).',

  // Animation
  Ease: 'Roblox Enum.EasingStyle curve applied between this keyframe and the next.',
  Dir: 'Roblox Enum.EasingDirection (In, Out, InOut) controlling acceleration placement.',
  rx: 'Joint local X-axis pitch rotation in degrees (Motor6D C0/Transform X).',
  ry: 'Joint local Y-axis yaw rotation in degrees (Motor6D C0/Transform Y).',
  rz: 'Joint local Z-axis roll rotation in degrees (Motor6D C0/Transform Z).',
  px: 'Joint local X translation offset in studs.',
  py: 'Joint local Y translation offset in studs.',
  pz: 'Joint local Z translation offset in studs.',
  SquashStretch: 'Volume-preserving Squash (<0 widens X/Z, flattens Y) and Stretch (>0 elongates Y, narrows X/Z) for chunky Husser impact.',
  OnionSkin: 'Displays translucent previous (cyan) and next (amber) keyframe silhouettes to inspect arcs and spacing.',
};
