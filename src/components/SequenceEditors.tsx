import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ColorKeypoint, NumberKeypoint } from '../types/workbench';
import { clamp, hexToRgb, rgbToHex, roundNum } from '../engine/vfxMath';
import { TooltipLabel } from './TooltipLabel';

interface ColorSequenceEditorProps {
  label?: string;
  tooltipKey?: string;
  value: ColorKeypoint[];
  onChange: (next: ColorKeypoint[]) => void;
}

export const ColorSequenceEditor: React.FC<ColorSequenceEditorProps> = ({
  label = 'ColorSequence',
  tooltipKey = 'Color',
  value,
  onChange,
}) => {
  const sorted = [...value].sort((a, b) => a.t - b.t);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const safeIdx = Math.min(selectedIdx, Math.max(0, sorted.length - 1));
  const selected = sorted[safeIdx];

  const gradientStops = sorted
    .map((k) => `${rgbToHex(k.r, k.g, k.b)} ${Math.round(k.t * 100)}%`)
    .join(', ');

  const updatePoint = (idx: number, patch: Partial<ColorKeypoint>) => {
    const next = sorted.map((k, i) => (i === idx ? { ...k, ...patch } : k));
    next.sort((a, b) => a.t - b.t);
    onChange(next);
  };

  const addPoint = () => {
    const nextT = clamp(sorted.length >= 2 ? 0.5 : 1, 0, 1);
    const next = [...sorted, { t: roundNum(nextT, 2), r: 1, g: 0.8, b: 0.25 }].sort(
      (a, b) => a.t - b.t
    );
    onChange(next);
    setSelectedIdx(next.findIndex((k) => Math.abs(k.t - nextT) < 0.001));
  };

  const removePoint = (idx: number) => {
    if (sorted.length <= 2) return;
    const next = sorted.filter((_, i) => i !== idx);
    onChange(next);
    setSelectedIdx(Math.max(0, idx - 1));
  };

  return (
    <div className="space-y-2 py-2 border-b border-slate-800/80">
      <div className="flex items-center justify-between">
        <TooltipLabel label={label} tooltipKey={tooltipKey} />
        <button
          type="button"
          onClick={addPoint}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-slate-800/70 hover:bg-slate-800 transition-colors"
          aria-label={`Add color keypoint to ${label}`}
        >
          <Plus className="w-3 h-3" />
          Stop
        </button>
      </div>

      {/* Interactive gradient preview bar */}
      <div className="relative h-7 rounded border border-slate-700 overflow-visible">
        <div
          className="w-full h-full rounded"
          style={{
            background:
              sorted.length > 1
                ? `linear-gradient(90deg, ${gradientStops})`
                : sorted[0]
                  ? rgbToHex(sorted[0].r, sorted[0].g, sorted[0].b)
                  : '#ffffff',
          }}
        />
        {sorted.map((kp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            aria-label={`Select color stop ${idx + 1} at t=${kp.t}`}
            style={{ left: `${clamp(kp.t * 100, 0, 100)}%` }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-5 rounded-sm border-2 transition-transform ${
              idx === safeIdx
                ? 'border-white scale-110 shadow-md z-10'
                : 'border-slate-900 hover:scale-105'
            }`}
          >
            <span
              className="block w-full h-full rounded-[1px]"
              style={{ backgroundColor: rgbToHex(kp.r, kp.g, kp.b) }}
            />
          </button>
        ))}
      </div>

      {/* Selected keypoint controls */}
      {selected && (
        <div className="flex items-center gap-2 bg-[#141821] rounded px-2 py-1.5 border border-slate-800">
          <input
            type="color"
            aria-label="Keypoint color"
            value={rgbToHex(selected.r, selected.g, selected.b)}
            onChange={(e) => {
              const rgb = hexToRgb(e.target.value);
              updatePoint(safeIdx, rgb);
            }}
            className="w-7 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
          />
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono">t</span>
            <input
              type="range"
              aria-label="Color keypoint time"
              min={0}
              max={1}
              step={0.01}
              value={selected.t}
              onChange={(e) => updatePoint(safeIdx, { t: Number(e.target.value) })}
              className="flex-1 h-1.5"
            />
            <span className="text-[11px] font-mono tabular-nums text-slate-300 w-9 text-right">
              {selected.t.toFixed(2)}
            </span>
          </div>
          {sorted.length > 2 && (
            <button
              type="button"
              onClick={() => removePoint(safeIdx)}
              aria-label="Remove selected color keypoint"
              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface NumberSequenceEditorProps {
  label: string;
  tooltipKey?: string;
  value: NumberKeypoint[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (next: NumberKeypoint[]) => void;
}

export const NumberSequenceEditor: React.FC<NumberSequenceEditorProps> = ({
  label,
  tooltipKey,
  value,
  min = 0,
  max = 2,
  step = 0.05,
  unit = '',
  onChange,
}) => {
  const sorted = [...value].sort((a, b) => a.t - b.t);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const safeIdx = Math.min(selectedIdx, Math.max(0, sorted.length - 1));
  const selected = sorted[safeIdx];

  const updatePoint = (idx: number, patch: Partial<NumberKeypoint>) => {
    const next = sorted.map((k, i) => (i === idx ? { ...k, ...patch } : k));
    next.sort((a, b) => a.t - b.t);
    onChange(next);
  };

  const addPoint = () => {
    const midVal = roundNum((min + max) * 0.4, 2);
    const next = [...sorted, { t: 0.5, value: midVal, envelope: 0 }].sort((a, b) => a.t - b.t);
    onChange(next);
    setSelectedIdx(next.findIndex((k) => Math.abs(k.t - 0.5) < 0.001));
  };

  const removePoint = (idx: number) => {
    if (sorted.length <= 2) return;
    const next = sorted.filter((_, i) => i !== idx);
    onChange(next);
    setSelectedIdx(Math.max(0, idx - 1));
  };

  // Build SVG path for curve & envelope band
  const W = 280;
  const H = 64;
  const pad = 6;
  const span = Math.max(0.001, max - min);
  const toX = (t: number) => pad + clamp(t, 0, 1) * (W - pad * 2);
  const toY = (v: number) => H - pad - clamp((v - min) / span, 0, 1) * (H - pad * 2);

  const linePts = sorted.map((k) => `${toX(k.t)},${toY(k.value)}`).join(' ');
  const envUpper = sorted.map((k) => `${toX(k.t)},${toY(k.value + k.envelope)}`);
  const envLower = [...sorted].reverse().map((k) => `${toX(k.t)},${toY(k.value - k.envelope)}`);
  const envPolygon = [...envUpper, ...envLower].join(' ');

  return (
    <div className="space-y-2 py-2 border-b border-slate-800/80">
      <div className="flex items-center justify-between">
        <TooltipLabel label={label} tooltipKey={tooltipKey} />
        <button
          type="button"
          onClick={addPoint}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-slate-800/70 hover:bg-slate-800 transition-colors"
          aria-label={`Add number keypoint to ${label}`}
        >
          <Plus className="w-3 h-3" />
          Key
        </button>
      </div>

      {/* SVG Curve + Envelope preview */}
      <div className="bg-[#0F131B] border border-slate-800 rounded p-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible">
          <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="#1f2736" strokeDasharray="3 3" />
          <polygon points={envPolygon} fill="rgba(245, 158, 11, 0.16)" />
          <polyline
            points={linePts}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {sorted.map((k, idx) => (
            <circle
              key={idx}
              cx={toX(k.t)}
              cy={toY(k.value)}
              r={idx === safeIdx ? 5.5 : 4}
              fill={idx === safeIdx ? '#ffffff' : '#f59e0b'}
              stroke="#0f131b"
              strokeWidth="2"
              className="cursor-pointer"
              onClick={() => setSelectedIdx(idx)}
            />
          ))}
        </svg>
      </div>

      {selected && (
        <div className="grid grid-cols-3 gap-1.5 bg-[#141821] rounded p-2 border border-slate-800">
          <div>
            <span className="block text-[10px] text-slate-400 mb-0.5">Time (0–1)</span>
            <input
              type="number"
              aria-label={`${label} keypoint time`}
              min={0}
              max={1}
              step={0.05}
              value={roundNum(selected.t, 2)}
              onChange={(e) => updatePoint(safeIdx, { t: clamp(Number(e.target.value), 0, 1) })}
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 mb-0.5">
              Value{unit ? ` (${unit})` : ''}
            </span>
            <input
              type="number"
              aria-label={`${label} keypoint value`}
              min={min}
              max={max}
              step={step}
              value={roundNum(selected.value, 2)}
              onChange={(e) =>
                updatePoint(safeIdx, { value: clamp(Number(e.target.value), min, max) })
              }
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">Envelope</span>
              {sorted.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePoint(safeIdx)}
                  aria-label={`Delete ${label} keypoint`}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <input
              type="number"
              aria-label={`${label} keypoint envelope`}
              min={0}
              max={max * 0.5}
              step={0.02}
              value={roundNum(selected.envelope, 2)}
              onChange={(e) =>
                updatePoint(safeIdx, { envelope: clamp(Number(e.target.value), 0, max) })
              }
              className="w-full bg-[#0F131B] border border-slate-700 rounded px-1.5 py-1 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
