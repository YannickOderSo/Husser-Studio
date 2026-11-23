import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipBack,
  Trash2,
} from 'lucide-react';
import {
  AnimationClip,
  BudgetMetrics,
  VfxEffect,
  VfxElementType,
  WorkbenchMode,
} from '../types/workbench';
import { clamp } from '../engine/vfxMath';

interface TimelinePanelProps {
  mode: WorkbenchMode;
  vfxEffect: VfxEffect;
  animation: AnimationClip;
  playing: boolean;
  loop: boolean;
  quarterSpeed: boolean;
  currentTime: number;
  budget: BudgetMetrics;
  selectedVfxId: string | null;
  selectedKeyId: string | null;
  onTogglePlay: () => void;
  onRewind: () => void;
  onToggleLoop: () => void;
  onToggleQuarterSpeed: () => void;
  onScrub: (time: number) => void;
  onSelectVfxElement: (id: string) => void;
  onAddVfxElement: (type: VfxElementType) => void;
  onToggleVfxEnabled: (id: string) => void;
  onDeleteVfxElement: (id: string) => void;
  onSelectKeyframe: (id: string) => void;
  onAddKeyframeAtCurrent: () => void;
  onDeleteKeyframe: (id: string) => void;
}

const ELEMENT_TYPES: VfxElementType[] = [
  'ParticleEmitter',
  'CubeBurst',
  'Ring',
  'Pillar',
  'Beam',
  'Trail',
  'Flash',
  'CameraShake',
  'SlowMo',
];

const BAR_COLORS: Record<VfxElementType, string> = {
  ParticleEmitter: 'bg-amber-500/85 border-amber-300',
  CubeBurst: 'bg-orange-500/85 border-orange-300',
  Ring: 'bg-cyan-500/85 border-cyan-300',
  Pillar: 'bg-yellow-400/85 border-yellow-200 text-slate-950',
  Beam: 'bg-sky-500/85 border-sky-300',
  Trail: 'bg-fuchsia-500/85 border-fuchsia-300',
  Flash: 'bg-slate-200/90 border-white text-slate-950',
  CameraShake: 'bg-rose-500/85 border-rose-300',
  SlowMo: 'bg-indigo-500/85 border-indigo-300',
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  mode,
  vfxEffect,
  animation,
  playing,
  loop,
  quarterSpeed,
  currentTime,
  budget,
  selectedVfxId,
  selectedKeyId,
  onTogglePlay,
  onRewind,
  onToggleLoop,
  onToggleQuarterSpeed,
  onScrub,
  onSelectVfxElement,
  onAddVfxElement,
  onToggleVfxEnabled,
  onDeleteVfxElement,
  onSelectKeyframe,
  onAddKeyframeAtCurrent,
  onDeleteKeyframe,
}) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);

  const totalDuration = mode === 'vfx' ? Math.max(0.2, vfxEffect.duration) : Math.max(0.2, animation.length);
  const playheadPct = clamp((currentTime / totalDuration) * 100, 0, 100);

  const scrubFromClientX = (clientX: number) => {
    const el = trackAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    onScrub(ratio * totalDuration);
  };

  const handleRulerPointerDown = (e: React.PointerEvent) => {
    scrubFromClientX(e.clientX);
    const onMove = (ev: PointerEvent) => scrubFromClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const tickCount = 8;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * totalDuration);

  return (
    <section
      aria-label="Timeline"
      className="h-[220px] shrink-0 bg-[#12161F] border-t border-slate-800 flex flex-col select-none"
    >
      {/* Transport & Budget Bar */}
      <div className="h-10 shrink-0 px-3 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#141923]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRewind}
            aria-label="Rewind to start"
            className="p-1.5 rounded bg-[#1B2230] border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause playback' : 'Play timeline'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            aria-label="Toggle loop playback"
            aria-pressed={loop}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
              loop
                ? 'bg-slate-700 border-slate-500 text-white'
                : 'bg-[#181E2A] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Loop
          </button>

          <button
            type="button"
            onClick={onToggleQuarterSpeed}
            aria-label="Toggle quarter speed slow motion"
            aria-pressed={quarterSpeed}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium border transition-colors whitespace-nowrap ${
              quarterSpeed
                ? 'bg-indigo-600 border-indigo-400 text-white'
                : 'bg-[#181E2A] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            ¼×
          </button>

          <span className="ml-2 text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap">
            {currentTime.toFixed(2)}s <span className="text-slate-500">/ {totalDuration.toFixed(2)}s</span>
          </span>
        </div>

        {/* Right Controls: Add Element / Add Keyframe + Mobile Budget Meter */}
        <div className="flex items-center gap-3">
          {mode === 'vfx' ? (
            <>
              {/* Mobile Budget Traffic Light (never hue-only: icon + numeric readout + explicit label) */}
              <div
                data-testid="mobile-budget-meter"
                className="flex items-center gap-2 text-xs font-mono tabular-nums"
              >
                <span className="text-slate-400">
                  Live <strong className="text-slate-100">{budget.activeTotal}</strong>
                  <span className="text-slate-500"> · Peak </span>
                  <strong className="text-slate-100">{budget.estimatedPeakTotal}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  /
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-sans font-semibold ${
                    budget.mobileStatus === 'green'
                      ? 'text-emerald-400'
                      : budget.mobileStatus === 'amber'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {budget.mobileStatus === 'green' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {budget.mobileLabel}
                </span>
              </div>

              {/* Add Element Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddMenuOpen((v) => !v)}
                  aria-expanded={addMenuOpen}
                  aria-label="Add VFX element"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1D2534] hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white whitespace-nowrap transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Element
                </button>
                {addMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 z-40 w-48 bg-[#0E121A] border border-slate-700 rounded-md shadow-2xl py-1 grid grid-cols-1">
                    {ELEMENT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onAddVfxElement(t);
                          setAddMenuOpen(false);
                        }}
                        className="px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {animation.keys.length} keyframes · {animation.rig}
              </span>
              <button
                type="button"
                onClick={onAddKeyframeAtCurrent}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Add / Update Key
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Track Grid */}
      {mode === 'vfx' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Sticky Ruler Header Row */}
          <div className="h-6 shrink-0 flex border-b border-slate-800 bg-[#141923]">
            <div className="w-[210px] shrink-0 border-r border-slate-800 px-3 flex items-center text-[10px] font-semibold text-slate-400 bg-[#11151E]">
              Elements ({vfxEffect.elements.length})
            </div>
            <div
              ref={trackAreaRef}
              onPointerDown={handleRulerPointerDown}
              className="flex-1 relative cursor-ew-resize mx-4"
            >
              {ticks.map((tick, idx) => (
                <div
                  key={idx}
                  style={{ left: `${(tick / totalDuration) * 100}%` }}
                  className={`absolute top-0 bottom-0 border-l border-slate-700/70 pl-1 text-[10px] font-mono tabular-nums text-slate-400 pointer-events-none whitespace-nowrap ${
                    idx === ticks.length - 1 ? '-translate-x-full pr-1 pl-0 border-l-0 border-r' : ''
                  }`}
                >
                  {tick.toFixed(2)}s
                </div>
              ))}
            </div>
          </div>

          {/* Synchronized Scrollable VFX Element Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0E1219] relative">
            {vfxEffect.elements.map((el) => {
              const leftPct = clamp((el.start / totalDuration) * 100, 0, 100);
              const widthPct = clamp((el.duration / totalDuration) * 100, 2, 100 - leftPct);
              const isSelected = el.id === selectedVfxId;
              return (
                <div key={el.id} className="h-7 flex border-b border-slate-800/60">
                  <div
                    className={`w-[210px] shrink-0 border-r border-slate-800 px-2 flex items-center justify-between gap-1 ${
                      isSelected ? 'bg-amber-500/15' : 'bg-[#11151E] hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectVfxElement(el.id)}
                      className="flex-1 min-w-0 text-left truncate text-xs font-medium text-slate-200"
                    >
                      {el.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleVfxEnabled(el.id)}
                      aria-label={`${el.enabled ? 'Hide' : 'Show'} ${el.name}`}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      {el.enabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteVfxElement(el.id)}
                      aria-label={`Remove ${el.name}`}
                      className="p-0.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div
                    className="flex-1 relative mx-4 flex items-center"
                    onPointerDown={(e) => {
                      if (e.target === e.currentTarget) handleRulerPointerDown(e);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectVfxElement(el.id)}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute h-4.5 rounded-sm border px-1.5 text-[10px] font-semibold truncate text-left transition-opacity ${
                        BAR_COLORS[el.type]
                      } ${!el.enabled ? 'opacity-30' : 'opacity-95'} ${
                        isSelected ? 'ring-2 ring-white/90 z-10' : ''
                      }`}
                    >
                      {el.type}
                    </button>
                    <div
                      style={{ left: `${playheadPct}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Animation Keyframe List */}
          <div className="w-[210px] shrink-0 border-r border-slate-800 overflow-y-auto bg-[#11151E]">
            <div className="h-6 border-b border-slate-800 px-3 flex items-center text-[10px] font-semibold text-slate-400">
              Keyframe Track ({animation.keys.length})
            </div>
            <div className="p-2 space-y-1">
              {animation.keys.map((k, i) => {
                const isSelected = k.id === selectedKeyId;
                return (
                  <div
                    key={k.id}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                      isSelected
                        ? 'bg-blue-600/25 border border-blue-500/60 text-white'
                        : 'bg-[#171C27] text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectKeyframe(k.id);
                        onScrub(k.t);
                      }}
                      className="flex-1 text-left font-mono tabular-nums truncate"
                    >
                      #{i + 1} · {k.t.toFixed(2)}s ({k.ease})
                    </button>
                    {animation.keys.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteKeyframe(k.id)}
                        aria-label={`Delete keyframe ${i + 1}`}
                        className="p-0.5 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Animation Scrubbable Keyframe Diamond Rail (inset mx-10 so 0.00s and end labels never clip!) */}
          <div className="flex-1 flex flex-col bg-[#0E1219] overflow-hidden">
            <div className="h-6 border-b border-slate-800 bg-[#141923] px-10">
              <div
                ref={trackAreaRef}
                onPointerDown={handleRulerPointerDown}
                className="relative h-full cursor-ew-resize"
              >
                {ticks.map((tick, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${(tick / totalDuration) * 100}%` }}
                    className="absolute top-0 bottom-0 -translate-x-1/2 flex items-center text-[10px] font-mono tabular-nums text-slate-400 pointer-events-none whitespace-nowrap"
                  >
                    {tick.toFixed(2)}s
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 px-10 relative flex items-center">
              <div
                className="relative w-full h-24 flex items-center"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) handleRulerPointerDown(e);
                }}
              >
                <div className="w-full h-1 bg-slate-800 rounded" />
                {animation.keys.map((k, idx) => {
                  const pct = clamp((k.t / totalDuration) * 100, 0, 100);
                  const isSelected = k.id === selectedKeyId;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        onSelectKeyframe(k.id);
                        onScrub(k.t);
                      }}
                      aria-label={`Select keyframe ${idx + 1} at ${k.t.toFixed(2)}s`}
                      style={{ left: `${pct}%` }}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center z-10"
                    >
                      <span
                        className={`w-4 h-4 rotate-45 border-2 transition-transform ${
                          isSelected
                            ? 'bg-amber-400 border-white scale-115'
                            : 'bg-blue-500 border-slate-900 group-hover:scale-110'
                        }`}
                      />
                      <span className="mt-3 text-[10px] font-mono tabular-nums whitespace-nowrap text-slate-300 bg-[#141923] px-1.5 py-0.5 rounded border border-slate-800">
                        {k.ease} {k.dir}
                      </span>
                    </button>
                  );
                })}

                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
