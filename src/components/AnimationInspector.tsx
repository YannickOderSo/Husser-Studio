import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  AnimationClip,
  AnimationKeyframe,
  EasingDirection,
  EasingStyle,
  HUSSER_JOINTS,
  JointTransform,
  R15_JOINTS,
  RigType,
} from '../types/workbench';
import { ANIMATION_PRESETS, createR15Preset } from '../data/presets';
import {
  applySquashStretchValue,
  clamp,
  identityJoint,
  roundNum,
} from '../engine/vfxMath';
import { TooltipLabel } from './TooltipLabel';

interface AnimationInspectorProps {
  clip: AnimationClip;
  selectedKeyId: string | null;
  selectedJoint: string;
  onUpdateClip: (next: AnimationClip) => void;
  onSelectJoint: (joint: string) => void;
  onUpdateJointTransform: (joint: string, next: JointTransform) => void;
  onSwitchRig: (rig: RigType) => void;
  onLoadTemplate: (templateName: string) => void;
}

const EASE_STYLES: EasingStyle[] = ['Linear', 'Sine', 'Quad', 'Back', 'Elastic', 'Bounce'];
const EASE_DIRS: EasingDirection[] = ['In', 'Out', 'InOut'];
const TEMPLATE_NAMES = ['Huss Run', 'Idle Pant', 'Celebrate', 'Chomp', 'Startle'];

export const AnimationInspector: React.FC<AnimationInspectorProps> = ({
  clip,
  selectedKeyId,
  selectedJoint,
  onUpdateClip,
  onSelectJoint,
  onUpdateJointTransform,
  onSwitchRig,
  onLoadTemplate,
}) => {
  const joints = clip.rig === 'Husser' ? HUSSER_JOINTS : R15_JOINTS;
  const activeKey: AnimationKeyframe | null =
    clip.keys.find((k) => k.id === selectedKeyId) ?? clip.keys[0] ?? null;

  const jointTr: JointTransform = activeKey?.pose[selectedJoint] ?? identityJoint();
  const squashStretchAmount = roundNum((jointTr.sy ?? 1) - 1, 2);

  const updateKeyMeta = (patch: Partial<AnimationKeyframe>) => {
    if (!activeKey) return;
    const nextKeys = clip.keys
      .map((k) => (k.id === activeKey.id ? { ...k, ...patch } : k))
      .sort((a, b) => a.t - b.t);
    onUpdateClip({ ...clip, keys: nextKeys });
  };

  return (
    <aside className="w-[376px] shrink-0 h-full bg-[#141821] border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Header: Rig Switcher & Clip Metadata */}
      <div className="px-3.5 py-3 border-b border-slate-800 bg-[#12161F] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-200">Animation & Rig Editor</h2>
          <div className="flex items-center bg-[#0C0F16] border border-slate-800 rounded p-0.5">
            {(['Husser', 'R15'] as RigType[]).map((rig) => (
              <button
                key={rig}
                type="button"
                onClick={() => onSwitchRig(rig)}
                aria-pressed={clip.rig === rig}
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                  clip.rig === rig
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rig}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-[10px] text-slate-400 mb-0.5">Clip Name</label>
            <input
              type="text"
              aria-label="Animation Clip Name"
              value={clip.name}
              onChange={(e) => onUpdateClip({ ...clip, name: e.target.value })}
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs font-medium text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Length (s)</label>
            <input
              type="number"
              aria-label="Animation Length"
              min={0.2}
              max={10}
              step={0.1}
              value={roundNum(clip.length, 2)}
              onChange={(e) =>
                onUpdateClip({ ...clip, length: clamp(Number(e.target.value), 0.2, 10) })
              }
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-white"
            />
          </div>
        </div>

        {/* 5 Feed The Hussers Templates */}
        <div>
          <span className="block text-[10px] text-slate-400 mb-1">Templates</span>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_NAMES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => onLoadTemplate(tpl)}
                className="px-2 py-1 text-[11px] font-medium rounded bg-[#1B2230] hover:bg-blue-600/25 border border-slate-700/80 hover:border-blue-500/60 text-slate-200 transition-colors"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5">
        {/* Keyframe Easing & Time */}
        {activeKey && (
          <div className="bg-[#191F2C] border border-slate-800 rounded-md p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-300">
                Active Keyframe
              </span>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                T = {activeKey.t.toFixed(2)}s
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <TooltipLabel label="Time (s)" customTooltip="Keyframe timestamp in seconds." />
                <input
                  type="number"
                  aria-label="Keyframe Time"
                  min={0}
                  max={clip.length}
                  step={0.02}
                  value={roundNum(activeKey.t, 2)}
                  onChange={(e) =>
                    updateKeyMeta({ t: clamp(Number(e.target.value), 0, clip.length) })
                  }
                  className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs font-mono tabular-nums text-white"
                />
              </div>
              <div>
                <TooltipLabel label="Ease" tooltipKey="Ease" />
                <select
                  aria-label="Easing Style"
                  value={activeKey.ease}
                  onChange={(e) => updateKeyMeta({ ease: e.target.value as EasingStyle })}
                  className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                >
                  {EASE_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <TooltipLabel label="Dir" tooltipKey="Dir" />
                <select
                  aria-label="Easing Direction"
                  value={activeKey.dir}
                  onChange={(e) => updateKeyMeta({ dir: e.target.value as EasingDirection })}
                  className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                >
                  {EASE_DIRS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Rig Joint Hierarchy Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-200">
              {clip.rig} Joints ({joints.length})
            </span>
            <span className="text-[11px] text-slate-400">Click or pick in 3D</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {joints.map((j) => {
              const isSelected = j === selectedJoint;
              const hasPose = Boolean(activeKey?.pose[j]);
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => onSelectJoint(j)}
                  className={`px-2 py-1.5 text-[11px] font-medium rounded border text-left truncate transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : hasPose
                        ? 'bg-[#1A2130] border-slate-700 text-slate-200 hover:border-slate-500'
                        : 'bg-[#11151E] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {j}
                </button>
              );
            })}
          </div>
        </div>

        {/* Joint Rotation (rx, ry, rz) & Position (px, py, pz) */}
        <div className="bg-[#191F2C] border border-slate-800 rounded-md p-2.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Joint: <span className="text-blue-400">{selectedJoint}</span>
            </span>
            <button
              type="button"
              onClick={() => onUpdateJointTransform(selectedJoint, identityJoint())}
              aria-label={`Reset ${selectedJoint} transform`}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Rotation Sliders (deg) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400">Rotation (degrees)</span>
            {(['rx', 'ry', 'rz'] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-7 text-[11px] font-mono text-slate-300 uppercase">{axis}</span>
                <input
                  type="range"
                  aria-label={`${selectedJoint} ${axis}`}
                  min={-180}
                  max={180}
                  step={1}
                  value={jointTr[axis]}
                  onChange={(e) =>
                    onUpdateJointTransform(selectedJoint, {
                      ...jointTr,
                      [axis]: Number(e.target.value),
                    })
                  }
                  className="flex-1 h-1.5"
                />
                <input
                  type="number"
                  aria-label={`${selectedJoint} ${axis} degrees`}
                  min={-180}
                  max={180}
                  step={1}
                  value={roundNum(jointTr[axis], 1)}
                  onChange={(e) =>
                    onUpdateJointTransform(selectedJoint, {
                      ...jointTr,
                      [axis]: clamp(Number(e.target.value), -180, 180),
                    })
                  }
                  className="w-16 bg-[#0F131B] border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono tabular-nums text-white text-right"
                />
              </div>
            ))}
          </div>

          {/* Position Offset Sliders (studs) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Position Offset (studs)</span>
            {(['px', 'py', 'pz'] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-7 text-[11px] font-mono text-slate-300 uppercase">{axis}</span>
                <input
                  type="range"
                  aria-label={`${selectedJoint} ${axis}`}
                  min={-3}
                  max={3}
                  step={0.05}
                  value={jointTr[axis]}
                  onChange={(e) =>
                    onUpdateJointTransform(selectedJoint, {
                      ...jointTr,
                      [axis]: Number(e.target.value),
                    })
                  }
                  className="flex-1 h-1.5"
                />
                <input
                  type="number"
                  aria-label={`${selectedJoint} ${axis} studs`}
                  min={-6}
                  max={6}
                  step={0.05}
                  value={roundNum(jointTr[axis], 2)}
                  onChange={(e) =>
                    onUpdateJointTransform(selectedJoint, {
                      ...jointTr,
                      [axis]: clamp(Number(e.target.value), -6, 6),
                    })
                  }
                  className="w-16 bg-[#0F131B] border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono tabular-nums text-white text-right"
                />
              </div>
            ))}
          </div>

          {/* Squash & Stretch Slider (volume-preserving + per-axis scale for Husser parts) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <TooltipLabel
              label="Squash & Stretch"
              tooltipKey="SquashStretch"
              rightText={
                squashStretchAmount > 0.01
                  ? `+${Math.round(squashStretchAmount * 100)}% Stretch`
                  : squashStretchAmount < -0.01
                    ? `${Math.round(squashStretchAmount * 100)}% Squash`
                    : 'Neutral (1.0×)'
              }
            />
            <input
              type="range"
              aria-label={`Squash and Stretch for ${selectedJoint}`}
              min={-0.45}
              max={0.6}
              step={0.02}
              value={clamp(squashStretchAmount, -0.45, 0.6)}
              onChange={(e) => {
                const scale = applySquashStretchValue(Number(e.target.value));
                onUpdateJointTransform(selectedJoint, { ...jointTr, ...scale });
              }}
              className="w-full h-1.5"
            />
            <div className="grid grid-cols-3 gap-1.5">
              {(['sx', 'sy', 'sz'] as const).map((axis) => (
                <div key={axis} className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                    {axis}
                  </span>
                  <input
                    type="number"
                    aria-label={`${selectedJoint} ${axis} scale`}
                    min={0.3}
                    max={2.2}
                    step={0.05}
                    value={roundNum(jointTr[axis] ?? 1, 2)}
                    onChange={(e) =>
                      onUpdateJointTransform(selectedJoint, {
                        ...jointTr,
                        [axis]: clamp(Number(e.target.value), 0.3, 2.2),
                      })
                    }
                    className="w-full bg-[#0F131B] border border-slate-700 rounded pl-6 pr-1.5 py-0.5 text-xs font-mono tabular-nums text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// Re-export presets helper reference for convenience if needed
export { ANIMATION_PRESETS, createR15Preset };
