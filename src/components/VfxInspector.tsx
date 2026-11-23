import React from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  BeamProps,
  CameraShakeProps,
  CubeBurstProps,
  EmissionDirection,
  EmissionShape,
  FlashProps,
  FlipbookLayout,
  ParticleEmitterProps,
  PillarProps,
  PreviewShape,
  RingCurve,
  RingProps,
  SlowMoProps,
  TrailProps,
  VfxEffect,
  VfxElement,
} from '../types/workbench';
import { VFX_PRESETS } from '../data/presets';
import { TooltipLabel } from './TooltipLabel';
import { ColorSequenceEditor, NumberSequenceEditor } from './SequenceEditors';
import { clamp, roundNum } from '../engine/vfxMath';

interface VfxInspectorProps {
  effect: VfxEffect;
  selectedId: string | null;
  onUpdateEffect: (next: VfxEffect) => void;
  onSelectElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onLoadPreset: (preset: VfxEffect) => void;
}

const inputCls =
  'w-full bg-[#0F131B] border border-slate-700/90 focus:border-amber-500 focus:outline-none rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100';
const selectCls =
  'w-full bg-[#0F131B] border border-slate-700/90 focus:border-amber-500 focus:outline-none rounded px-2 py-1 text-xs text-slate-100';

const NumField: React.FC<{
  label: string;
  tooltipKey?: string;
  customTooltip?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, tooltipKey, customTooltip, value, min, max, step = 0.1, unit, onChange }) => (
  <div>
    <TooltipLabel
      label={label}
      tooltipKey={tooltipKey}
      customTooltip={customTooltip}
      rightText={unit ? `${roundNum(value, 2)} ${unit}` : undefined}
    />
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? roundNum(value, 3) : 0}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) {
          onChange(
            min !== undefined && max !== undefined
              ? clamp(n, min, max)
              : min !== undefined
                ? Math.max(min, n)
                : n
          );
        }
      }}
      className={inputCls}
    />
  </div>
);

const RangePair: React.FC<{
  label: string;
  tooltipKey?: string;
  minVal: number;
  maxVal: number;
  step?: number;
  unit?: string;
  onChange: (min: number, max: number) => void;
}> = ({ label, tooltipKey, minVal, maxVal, step = 0.1, unit, onChange }) => (
  <div className="py-1.5">
    <TooltipLabel label={label} tooltipKey={tooltipKey} rightText={unit} />
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-400 w-7">Min</span>
        <input
          type="number"
          aria-label={`${label} Min`}
          step={step}
          value={roundNum(minVal, 2)}
          onChange={(e) => onChange(Number(e.target.value), maxVal)}
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-400 w-7">Max</span>
        <input
          type="number"
          aria-label={`${label} Max`}
          step={step}
          value={roundNum(maxVal, 2)}
          onChange={(e) => onChange(minVal, Number(e.target.value))}
          className={inputCls}
        />
      </div>
    </div>
  </div>
);

const Vec3Fields: React.FC<{
  label: string;
  tooltipKey?: string;
  value: { x: number; y: number; z: number };
  step?: number;
  onChange: (v: { x: number; y: number; z: number }) => void;
}> = ({ label, tooltipKey, value, step = 0.2, onChange }) => (
  <div className="py-1.5">
    <TooltipLabel label={label} tooltipKey={tooltipKey} rightText="X / Y / Z" />
    <div className="grid grid-cols-3 gap-1.5">
      {(['x', 'y', 'z'] as const).map((axis) => (
        <div key={axis} className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 uppercase">
            {axis}
          </span>
          <input
            type="number"
            aria-label={`${label} ${axis.toUpperCase()}`}
            step={step}
            value={roundNum(value[axis], 2)}
            onChange={(e) => onChange({ ...value, [axis]: Number(e.target.value) })}
            className={`${inputCls} pl-5`}
          />
        </div>
      ))}
    </div>
  </div>
);

export const VfxInspector: React.FC<VfxInspectorProps> = ({
  effect,
  selectedId,
  onUpdateEffect,
  onDuplicateElement,
  onDeleteElement,
  onLoadPreset,
}) => {
  const selected = effect.elements.find((e) => e.id === selectedId) ?? effect.elements[0] ?? null;

  const updateSelected = (patch: Partial<VfxElement>) => {
    if (!selected) return;
    onUpdateEffect({
      ...effect,
      elements: effect.elements.map((e) => (e.id === selected.id ? { ...e, ...patch } : e)),
    });
  };

  const updateProps = (propPatch: Record<string, unknown>) => {
    if (!selected) return;
    updateSelected({
      props: {
        ...(selected.props as unknown as Record<string, unknown>),
        ...propPatch,
      } as unknown as VfxElement['props'],
    });
  };

  return (
    <aside className="w-[376px] shrink-0 h-full bg-[#141821] border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Effect Header & Presets */}
      <div className="px-3.5 py-3 border-b border-slate-800 space-y-2.5 bg-[#12161F]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-200">VFX Inspector</h2>
          <select
            aria-label="Load VFX Preset"
            value=""
            onChange={(e) => {
              const found = VFX_PRESETS.find((p) => p.name === e.target.value);
              if (found) onLoadPreset(structuredClone(found));
            }}
            className="bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-[11px] text-amber-300"
          >
            <option value="" disabled>
              Load Preset...
            </option>
            {VFX_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-[10px] text-slate-400 mb-0.5">Effect Name</label>
            <input
              type="text"
              aria-label="Effect Name"
              value={effect.name}
              onChange={(e) => onUpdateEffect({ ...effect, name: e.target.value })}
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Duration (s)</label>
            <input
              type="number"
              aria-label="Effect Duration"
              min={0.3}
              max={15}
              step={0.1}
              value={roundNum(effect.duration, 2)}
              onChange={(e) =>
                onUpdateEffect({ ...effect, duration: clamp(Number(e.target.value), 0.3, 15) })
              }
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Selected Element Properties */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
          No VFX element selected. Add an emitter from the bottom timeline.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
          {/* Element identity & timing */}
          <div className="bg-[#191F2C] border border-slate-800 rounded-md p-2.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] text-amber-400 font-semibold">
                  {selected.type}
                </span>
                <input
                  type="text"
                  aria-label="Element Name"
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-700 focus:border-amber-400 focus:outline-none text-sm font-semibold text-white py-0.5"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onDuplicateElement(selected.id)}
                  aria-label={`Duplicate ${selected.name}`}
                  className="p-1.5 rounded bg-[#0F131B] border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteElement(selected.id)}
                  aria-label={`Delete ${selected.name}`}
                  className="p-1.5 rounded bg-[#0F131B] border border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-500/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumField
                label="Start (s)"
                customTooltip="Delay in seconds from timeline start before this element fires."
                value={selected.start}
                min={0}
                max={effect.duration}
                step={0.05}
                onChange={(v) => updateSelected({ start: v })}
              />
              <NumField
                label="Duration (s)"
                customTooltip="Active window duration in seconds."
                value={selected.duration}
                min={0.05}
                max={effect.duration}
                step={0.05}
                onChange={(v) => updateSelected({ duration: v })}
              />
            </div>
          </div>

          {/* === PARTICLE EMITTER DETAILED ROBLOX EDITOR === */}
          {selected.type === 'ParticleEmitter' && (() => {
            const p = selected.props as ParticleEmitterProps;
            return (
              <div className="space-y-3">
                {/* Texture placeholder & built-in preview shape */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <TooltipLabel label="Texture Name" tooltipKey="TextureName" />
                    <input
                      type="text"
                      aria-label="Texture Name"
                      value={p.TextureName}
                      onChange={(e) => updateProps({ TextureName: e.target.value })}
                      className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <TooltipLabel label="Preview Shape" tooltipKey="PreviewShape" />
                    <select
                      aria-label="Preview Shape"
                      value={p.PreviewShape}
                      onChange={(e) => updateProps({ PreviewShape: e.target.value as PreviewShape })}
                      className={selectCls}
                    >
                      {(['Circle', 'Star', 'Spark', 'Cube', 'Ring'] as PreviewShape[]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ColorSequence */}
                <ColorSequenceEditor
                  label="Color (ColorSequence)"
                  tooltipKey="Color"
                  value={p.Color}
                  onChange={(Color) => updateProps({ Color })}
                />

                {/* Size NumberSequence + Envelope */}
                <NumberSequenceEditor
                  label="Size (NumberSequence)"
                  tooltipKey="Size"
                  value={p.Size}
                  min={0}
                  max={3}
                  step={0.05}
                  unit="studs"
                  onChange={(Size) => updateProps({ Size })}
                />

                {/* Transparency NumberSequence + Envelope */}
                <NumberSequenceEditor
                  label="Transparency (NumberSequence)"
                  tooltipKey="Transparency"
                  value={p.Transparency}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(Transparency) => updateProps({ Transparency })}
                />

                {/* Emission Rate & Burst */}
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Rate (/sec)"
                    tooltipKey="Rate"
                    value={p.Rate}
                    min={0}
                    max={200}
                    step={1}
                    onChange={(Rate) => updateProps({ Rate })}
                  />
                  <NumField
                    label="Burst Count"
                    tooltipKey="BurstCount"
                    value={p.BurstCount}
                    min={0}
                    max={200}
                    step={1}
                    onChange={(BurstCount) => updateProps({ BurstCount })}
                  />
                </div>

                {/* Lifetime & Speed */}
                <RangePair
                  label="Lifetime"
                  tooltipKey="Lifetime"
                  minVal={p.Lifetime.min}
                  maxVal={p.Lifetime.max}
                  step={0.05}
                  unit="sec"
                  onChange={(min, max) =>
                    updateProps({ Lifetime: { min: Math.max(0.05, min), max: Math.max(min, max) } })
                  }
                />

                <RangePair
                  label="Speed"
                  tooltipKey="Speed"
                  minVal={p.Speed.min}
                  maxVal={p.Speed.max}
                  step={0.5}
                  unit="studs/s"
                  onChange={(min, max) => updateProps({ Speed: { min, max: Math.max(min, max) } })}
                />

                {/* SpreadAngle X / Y */}
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="SpreadAngle X"
                    tooltipKey="SpreadAngle"
                    value={p.SpreadAngle.x}
                    min={0}
                    max={180}
                    step={5}
                    unit="°"
                    onChange={(x) => updateProps({ SpreadAngle: { ...p.SpreadAngle, x } })}
                  />
                  <NumField
                    label="SpreadAngle Y"
                    tooltipKey="SpreadAngle"
                    value={p.SpreadAngle.y}
                    min={0}
                    max={180}
                    step={5}
                    unit="°"
                    onChange={(y) => updateProps({ SpreadAngle: { ...p.SpreadAngle, y } })}
                  />
                </div>

                {/* Acceleration & Drag */}
                <Vec3Fields
                  label="Acceleration"
                  tooltipKey="Acceleration"
                  value={p.Acceleration}
                  step={1}
                  onChange={(Acceleration) => updateProps({ Acceleration })}
                />

                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Drag"
                    tooltipKey="Drag"
                    value={p.Drag}
                    min={0}
                    max={20}
                    step={0.2}
                    onChange={(Drag) => updateProps({ Drag })}
                  />
                  <NumField
                    label="ZOffset"
                    tooltipKey="ZOffset"
                    value={p.ZOffset}
                    min={-5}
                    max={5}
                    step={0.1}
                    onChange={(ZOffset) => updateProps({ ZOffset })}
                  />
                </div>

                {/* Rotation & RotSpeed */}
                <RangePair
                  label="Rotation"
                  tooltipKey="Rotation"
                  minVal={p.Rotation.min}
                  maxVal={p.Rotation.max}
                  step={15}
                  unit="deg"
                  onChange={(min, max) => updateProps({ Rotation: { min, max } })}
                />

                <RangePair
                  label="RotSpeed"
                  tooltipKey="RotSpeed"
                  minVal={p.RotSpeed.min}
                  maxVal={p.RotSpeed.max}
                  step={15}
                  unit="deg/s"
                  onChange={(min, max) => updateProps({ RotSpeed: { min, max } })}
                />

                {/* Lighting: LightEmission & LightInfluence */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <TooltipLabel
                      label="LightEmission"
                      tooltipKey="LightEmission"
                      rightText={p.LightEmission.toFixed(2)}
                    />
                    <input
                      type="range"
                      aria-label="LightEmission"
                      min={0}
                      max={1}
                      step={0.05}
                      value={p.LightEmission}
                      onChange={(e) => updateProps({ LightEmission: Number(e.target.value) })}
                      className="w-full h-1.5"
                    />
                  </div>
                  <div>
                    <TooltipLabel
                      label="LightInfluence"
                      tooltipKey="LightInfluence"
                      rightText={p.LightInfluence.toFixed(2)}
                    />
                    <input
                      type="range"
                      aria-label="LightInfluence"
                      min={0}
                      max={1}
                      step={0.05}
                      value={p.LightInfluence}
                      onChange={(e) => updateProps({ LightInfluence: Number(e.target.value) })}
                      className="w-full h-1.5"
                    />
                  </div>
                </div>

                {/* Shape, Radius, EmissionDirection */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <TooltipLabel label="Shape" tooltipKey="Shape" />
                    <select
                      aria-label="Emission Shape"
                      value={p.Shape}
                      onChange={(e) => updateProps({ Shape: e.target.value as EmissionShape })}
                      className={selectCls}
                    >
                      <option value="Box">Box</option>
                      <option value="Sphere">Sphere</option>
                      <option value="Disc">Disc</option>
                    </select>
                  </div>
                  <NumField
                    label="Radius"
                    tooltipKey="ShapeRadius"
                    value={p.ShapeRadius}
                    min={0.05}
                    max={8}
                    step={0.1}
                    onChange={(ShapeRadius) => updateProps({ ShapeRadius })}
                  />
                  <div>
                    <TooltipLabel label="Direction" tooltipKey="EmissionDirection" />
                    <select
                      aria-label="Emission Direction"
                      value={p.EmissionDirection}
                      onChange={(e) =>
                        updateProps({ EmissionDirection: e.target.value as EmissionDirection })
                      }
                      className={selectCls}
                    >
                      {(['Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'] as EmissionDirection[]).map(
                        (d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* FlipbookLayout & LockedToPart */}
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <TooltipLabel label="FlipbookLayout" tooltipKey="FlipbookLayout" />
                    <select
                      aria-label="Flipbook Layout"
                      value={p.FlipbookLayout}
                      onChange={(e) =>
                        updateProps({ FlipbookLayout: e.target.value as FlipbookLayout })
                      }
                      className={selectCls}
                    >
                      <option value="None">None</option>
                      <option value="Grid2x2">Grid2x2</option>
                      <option value="Grid4x4">Grid4x4</option>
                      <option value="Grid8x8">Grid8x8</option>
                    </select>
                  </div>

                  <div className="pb-0.5">
                    <TooltipLabel label="LockedToPart" tooltipKey="LockedToPart" />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.LockedToPart}
                      onClick={() => updateProps({ LockedToPart: !p.LockedToPart })}
                      className={`w-full py-1 px-2.5 rounded text-xs font-medium border transition-colors ${
                        p.LockedToPart
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#0F131B] border-slate-700 text-slate-400'
                      }`}
                    >
                      {p.LockedToPart ? 'Locked (True)' : 'World Space (False)'}
                    </button>
                  </div>
                </div>

                <Vec3Fields
                  label="Attachment Offset"
                  tooltipKey="Offset"
                  value={p.Offset}
                  onChange={(Offset) => updateProps({ Offset })}
                />
              </div>
            );
          })()}

          {/* === CUBE BURST === */}
          {selected.type === 'CubeBurst' && (() => {
            const p = selected.props as CubeBurstProps;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Cube Count (N)"
                    tooltipKey="Count"
                    value={p.Count}
                    min={1}
                    max={220}
                    step={1}
                    onChange={(Count) => updateProps({ Count })}
                  />
                  <NumField
                    label="Lifetime (s)"
                    tooltipKey="Lifetime"
                    value={p.Lifetime}
                    min={0.15}
                    max={6}
                    step={0.05}
                    onChange={(Lifetime) => updateProps({ Lifetime })}
                  />
                </div>
                <RangePair
                  label="Launch Speed"
                  tooltipKey="SpeedMin"
                  minVal={p.SpeedMin}
                  maxVal={p.SpeedMax}
                  step={0.5}
                  unit="studs/s"
                  onChange={(SpeedMin, SpeedMax) => updateProps({ SpeedMin, SpeedMax })}
                />
                <RangePair
                  label="Cube Size"
                  tooltipKey="SizeMin"
                  minVal={p.SizeMin}
                  maxVal={p.SizeMax}
                  step={0.04}
                  unit="studs"
                  onChange={(SizeMin, SizeMax) => updateProps({ SizeMin, SizeMax })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <NumField
                    label="Gravity"
                    tooltipKey="Gravity"
                    value={p.Gravity}
                    min={0}
                    max={120}
                    step={2}
                    onChange={(Gravity) => updateProps({ Gravity })}
                  />
                  <NumField
                    label="Spin Speed"
                    tooltipKey="SpinSpeed"
                    value={p.SpinSpeed}
                    min={0}
                    max={1080}
                    step={20}
                    onChange={(SpinSpeed) => updateProps({ SpinSpeed })}
                  />
                  <NumField
                    label="Spread"
                    tooltipKey="SpreadAngle"
                    value={p.SpreadAngle}
                    min={5}
                    max={180}
                    step={5}
                    onChange={(SpreadAngle) => updateProps({ SpreadAngle })}
                  />
                </div>

                {/* Stud Voxel Palette Swatches */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <TooltipLabel label="Stud Cube Palette" tooltipKey="Colors" />
                    <button
                      type="button"
                      onClick={() => updateProps({ Colors: [...p.Colors, '#38BDF8'] })}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                    >
                      <Plus className="w-3 h-3" /> Color
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.Colors.map((hex, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1"
                      >
                        <input
                          type="color"
                          aria-label={`Cube color ${i + 1}`}
                          value={hex}
                          onChange={(e) => {
                            const next = [...p.Colors];
                            next[i] = e.target.value;
                            updateProps({ Colors: next });
                          }}
                          className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer"
                        />
                        {p.Colors.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateProps({ Colors: p.Colors.filter((_, idx) => idx !== i) })
                            }
                            aria-label={`Remove cube color ${i + 1}`}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <TooltipLabel label="Lego Studs on Cubes" tooltipKey="StudsOnTop" />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.StudsOnTop}
                    onClick={() => updateProps({ StudsOnTop: !p.StudsOnTop })}
                    className={`px-3 py-1 text-xs rounded border ${
                      p.StudsOnTop
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#0F131B] border-slate-700 text-slate-400'
                    }`}
                  >
                    {p.StudsOnTop ? 'Enabled' : 'Flat Cubes'}
                  </button>
                </div>

                <Vec3Fields
                  label="Spawn Offset"
                  tooltipKey="Offset"
                  value={p.Offset}
                  onChange={(Offset) => updateProps({ Offset })}
                />
              </div>
            );
          })()}

          {/* === RING (SHOCKWAVE) === */}
          {selected.type === 'Ring' && (() => {
            const p = selected.props as RingProps;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <NumField
                    label="Start R"
                    tooltipKey="StartRadius"
                    value={p.StartRadius}
                    min={0.1}
                    max={15}
                    onChange={(StartRadius) => updateProps({ StartRadius })}
                  />
                  <NumField
                    label="End R"
                    tooltipKey="EndRadius"
                    value={p.EndRadius}
                    min={0.5}
                    max={25}
                    onChange={(EndRadius) => updateProps({ EndRadius })}
                  />
                  <NumField
                    label="Thickness"
                    tooltipKey="Thickness"
                    value={p.Thickness}
                    min={0.05}
                    max={3}
                    step={0.04}
                    onChange={(Thickness) => updateProps({ Thickness })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <TooltipLabel label="Curve" tooltipKey="Curve" />
                    <select
                      aria-label="Ring Expansion Curve"
                      value={p.Curve}
                      onChange={(e) => updateProps({ Curve: e.target.value as RingCurve })}
                      className={selectCls}
                    >
                      {(['Linear', 'QuadOut', 'CubicOut', 'BackOut', 'SineOut'] as RingCurve[]).map(
                        (c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <NumField
                    label="Y Offset"
                    tooltipKey="YOffset"
                    value={p.YOffset}
                    min={0.05}
                    max={10}
                    onChange={(YOffset) => updateProps({ YOffset })}
                  />
                  <NumField
                    label="Tilt X"
                    tooltipKey="TiltX"
                    value={p.TiltX}
                    min={-90}
                    max={90}
                    step={5}
                    onChange={(TiltX) => updateProps({ TiltX })}
                  />
                </div>
                <ColorSequenceEditor
                  label="Color"
                  tooltipKey="Color"
                  value={p.Color}
                  onChange={(Color) => updateProps({ Color })}
                />
                <NumberSequenceEditor
                  label="Transparency"
                  tooltipKey="Transparency"
                  value={p.Transparency}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(Transparency) => updateProps({ Transparency })}
                />
              </div>
            );
          })()}

          {/* === PILLAR === */}
          {selected.type === 'Pillar' && (() => {
            const p = selected.props as PillarProps;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Radius"
                    tooltipKey="Radius"
                    value={p.Radius}
                    min={0.2}
                    max={8}
                    onChange={(Radius) => updateProps({ Radius })}
                  />
                  <NumField
                    label="Height"
                    tooltipKey="Height"
                    value={p.Height}
                    min={1}
                    max={30}
                    step={0.5}
                    onChange={(Height) => updateProps({ Height })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Pulse Speed"
                    tooltipKey="PulseSpeed"
                    value={p.PulseSpeed}
                    min={0}
                    max={25}
                    step={0.5}
                    onChange={(PulseSpeed) => updateProps({ PulseSpeed })}
                  />
                  <NumField
                    label="Top Flare"
                    tooltipKey="TopFlare"
                    value={p.TopFlare}
                    min={0.3}
                    max={3}
                    step={0.05}
                    onChange={(TopFlare) => updateProps({ TopFlare })}
                  />
                </div>
                <ColorSequenceEditor
                  label="Color"
                  tooltipKey="Color"
                  value={p.Color}
                  onChange={(Color) => updateProps({ Color })}
                />
                <NumberSequenceEditor
                  label="Transparency"
                  tooltipKey="Transparency"
                  value={p.Transparency}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(Transparency) => updateProps({ Transparency })}
                />
                <Vec3Fields
                  label="Offset"
                  tooltipKey="Offset"
                  value={p.Offset}
                  onChange={(Offset) => updateProps({ Offset })}
                />
              </div>
            );
          })()}

          {/* === BEAM === */}
          {selected.type === 'Beam' && (() => {
            const p = selected.props as BeamProps;
            return (
              <div className="space-y-3">
                <div>
                  <TooltipLabel label="Texture Name" tooltipKey="TextureName" />
                  <input
                    type="text"
                    aria-label="Beam Texture Name"
                    value={p.TextureName}
                    onChange={(e) => updateProps({ TextureName: e.target.value })}
                    className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumField
                    label="Width0"
                    tooltipKey="Width0"
                    value={p.Width0}
                    min={0.05}
                    max={5}
                    onChange={(Width0) => updateProps({ Width0 })}
                  />
                  <NumField
                    label="Width1"
                    tooltipKey="Width1"
                    value={p.Width1}
                    min={0.05}
                    max={5}
                    onChange={(Width1) => updateProps({ Width1 })}
                  />
                  <NumField
                    label="Segments"
                    tooltipKey="Segments"
                    value={p.Segments}
                    min={4}
                    max={36}
                    step={1}
                    onChange={(Segments) => updateProps({ Segments })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumField
                    label="CurveSize0"
                    tooltipKey="CurveSize0"
                    value={p.CurveSize0}
                    min={-8}
                    max={8}
                    onChange={(CurveSize0) => updateProps({ CurveSize0 })}
                  />
                  <NumField
                    label="CurveSize1"
                    tooltipKey="CurveSize1"
                    value={p.CurveSize1}
                    min={-8}
                    max={8}
                    onChange={(CurveSize1) => updateProps({ CurveSize1 })}
                  />
                  <NumField
                    label="TexSpeed"
                    tooltipKey="TextureSpeed"
                    value={p.TextureSpeed}
                    min={-15}
                    max={15}
                    onChange={(TextureSpeed) => updateProps({ TextureSpeed })}
                  />
                </div>
                <Vec3Fields
                  label="Attachment0"
                  tooltipKey="Attachment0"
                  value={p.Attachment0}
                  onChange={(Attachment0) => updateProps({ Attachment0 })}
                />
                <Vec3Fields
                  label="Attachment1"
                  tooltipKey="Attachment1"
                  value={p.Attachment1}
                  onChange={(Attachment1) => updateProps({ Attachment1 })}
                />
                <ColorSequenceEditor
                  label="Color"
                  tooltipKey="Color"
                  value={p.Color}
                  onChange={(Color) => updateProps({ Color })}
                />
                <NumberSequenceEditor
                  label="Transparency"
                  tooltipKey="Transparency"
                  value={p.Transparency}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(Transparency) => updateProps({ Transparency })}
                />
              </div>
            );
          })()}

          {/* === TRAIL === */}
          {selected.type === 'Trail' && (() => {
            const p = selected.props as TrailProps;
            return (
              <div className="space-y-3">
                <div>
                  <TooltipLabel label="Texture Name" tooltipKey="TextureName" />
                  <input
                    type="text"
                    aria-label="Trail Texture Name"
                    value={p.TextureName}
                    onChange={(e) => updateProps({ TextureName: e.target.value })}
                    className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Lifetime (s)"
                    tooltipKey="Lifetime"
                    value={p.Lifetime}
                    min={0.1}
                    max={4}
                    step={0.05}
                    onChange={(Lifetime) => updateProps({ Lifetime })}
                  />
                  <NumField
                    label="MinLength"
                    tooltipKey="MinLength"
                    value={p.MinLength}
                    min={0.05}
                    max={2}
                    step={0.05}
                    onChange={(MinLength) => updateProps({ MinLength })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumField
                    label="Orbit R"
                    tooltipKey="OrbitRadius"
                    value={p.OrbitRadius}
                    min={0.5}
                    max={8}
                    onChange={(OrbitRadius) => updateProps({ OrbitRadius })}
                  />
                  <NumField
                    label="Orbit Spd"
                    tooltipKey="OrbitSpeed"
                    value={p.OrbitSpeed}
                    min={0.5}
                    max={18}
                    onChange={(OrbitSpeed) => updateProps({ OrbitSpeed })}
                  />
                  <NumField
                    label="Height"
                    tooltipKey="Offset"
                    value={p.HeightOffset}
                    min={0.5}
                    max={8}
                    onChange={(HeightOffset) => updateProps({ HeightOffset })}
                  />
                </div>
                <NumberSequenceEditor
                  label="WidthScale"
                  tooltipKey="WidthScale"
                  value={p.WidthScale}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={(WidthScale) => updateProps({ WidthScale })}
                />
                <ColorSequenceEditor
                  label="Color"
                  tooltipKey="Color"
                  value={p.Color}
                  onChange={(Color) => updateProps({ Color })}
                />
                <NumberSequenceEditor
                  label="Transparency"
                  tooltipKey="Transparency"
                  value={p.Transparency}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(Transparency) => updateProps({ Transparency })}
                />
              </div>
            );
          })()}

          {/* === FLASH === */}
          {selected.type === 'Flash' && (() => {
            const p = selected.props as FlashProps;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <TooltipLabel label="Flash Color" tooltipKey="Color" />
                  <input
                    type="color"
                    aria-label="Flash Color"
                    value={p.Color}
                    onChange={(e) => updateProps({ Color: e.target.value })}
                    className="w-10 h-7 bg-transparent border-0 cursor-pointer"
                  />
                </div>
                <div>
                  <TooltipLabel
                    label="Max Opacity"
                    tooltipKey="MaxOpacity"
                    rightText={p.MaxOpacity.toFixed(2)}
                  />
                  <input
                    type="range"
                    aria-label="Flash Max Opacity"
                    min={0.05}
                    max={0.85}
                    step={0.05}
                    value={p.MaxOpacity}
                    onChange={(e) => updateProps({ MaxOpacity: Number(e.target.value) })}
                    className="w-full h-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="FadeIn Ratio"
                    tooltipKey="FadeIn"
                    value={p.FadeIn}
                    min={0.05}
                    max={0.9}
                    step={0.05}
                    onChange={(FadeIn) => updateProps({ FadeIn })}
                  />
                  <NumField
                    label="FadeOut Ratio"
                    tooltipKey="FadeOut"
                    value={p.FadeOut}
                    min={0.05}
                    max={0.95}
                    step={0.05}
                    onChange={(FadeOut) => updateProps({ FadeOut })}
                  />
                </div>
              </div>
            );
          })()}

          {/* === CAMERA SHAKE === */}
          {selected.type === 'CameraShake' && (() => {
            const p = selected.props as CameraShakeProps;
            return (
              <div className="space-y-3">
                <NumField
                  label="Intensity"
                  tooltipKey="Intensity"
                  value={p.Intensity}
                  min={0.05}
                  max={3}
                  step={0.05}
                  onChange={(Intensity) => updateProps({ Intensity })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="Frequency (Hz)"
                    tooltipKey="Frequency"
                    value={p.Frequency}
                    min={4}
                    max={50}
                    step={1}
                    onChange={(Frequency) => updateProps({ Frequency })}
                  />
                  <NumField
                    label="Decay"
                    tooltipKey="Decay"
                    value={p.Decay}
                    min={0}
                    max={8}
                    step={0.2}
                    onChange={(Decay) => updateProps({ Decay })}
                  />
                </div>
              </div>
            );
          })()}

          {/* === SLOW MO === */}
          {selected.type === 'SlowMo' && (() => {
            const p = selected.props as SlowMoProps;
            return (
              <div className="space-y-3">
                <div>
                  <TooltipLabel
                    label="TimeScale"
                    tooltipKey="TimeScale"
                    rightText={`${Math.round(p.TimeScale * 100)}% speed`}
                  />
                  <input
                    type="range"
                    aria-label="SlowMo TimeScale"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={p.TimeScale}
                    onChange={(e) => updateProps({ TimeScale: Number(e.target.value) })}
                    className="w-full h-1.5"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </aside>
  );
};
