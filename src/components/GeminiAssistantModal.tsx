import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  Loader2,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  AnimationClip,
  JuicierAnalysisResponse,
  JuicierSuggestion,
  TierVariant,
  VfxEffect,
  WorkbenchMode,
} from '../types/workbench';
import { exportVfxToLuau } from '../engine/vfxMath';

interface GeminiAssistantModalProps {
  open: boolean;
  onClose: () => void;
  mode: WorkbenchMode;
  vfxEffect: VfxEffect;
  animation: AnimationClip;
  onApplyVfx: (effect: VfxEffect) => void;
  onApplyAnimation: (clip: AnimationClip) => void;
}

type AssistantTab = 'describe' | 'juicier' | 'variants';

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  open,
  onClose,
  mode,
  vfxEffect,
  animation,
  onApplyVfx,
  onApplyAnimation,
}) => {
  const [tab, setTab] = useState<AssistantTab>('juicier');
  const [prompt, setPrompt] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Describe state
  const [describeResult, setDescribeResult] = useState<{
    summary: string;
    vfxEffect?: VfxEffect;
    animation?: AnimationClip;
  } | null>(null);

  // Make it Juicier state
  const [juicierResult, setJuicierResult] = useState<JuicierAnalysisResponse | null>(null);
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set());

  // 5-Tier Variants state
  const [variants, setVariants] = useState<TierVariant[]>([]);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [copiedTier, setCopiedTier] = useState<string | null>(null);

  if (!open) return null;

  const runDescribe = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setValidationError(
        `Describe the ${mode === 'vfx' ? 'Stud Voxel VFX effect' : `${animation.rig} animation`} before generating.`
      );
      return;
    }
    setValidationError(null);
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, mode, rig: animation.rig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini generation failed.');
      setDescribeResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const runMakeItJuicier = async () => {
    setValidationError(null);
    setApiError(null);
    setLoading(true);
    setAppliedSuggestionIds(new Set());
    try {
      const res = await fetch('/api/gemini/juicier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          vfxEffect: mode === 'vfx' ? vfxEffect : undefined,
          animation: mode === 'animation' ? animation : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini analysis failed.');
      setJuicierResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const runGenerateVariants = async () => {
    setValidationError(null);
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vfxEffect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Variant generation failed.');
      setVariants(Array.isArray(data.variants) ? data.variants : []);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Variant generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s: JuicierSuggestion) => {
    if (s.patch.mode === 'vfx' && s.patch.vfxEffect) {
      onApplyVfx(s.patch.vfxEffect);
    } else if (s.patch.mode === 'animation' && s.patch.animation) {
      onApplyAnimation(s.patch.animation);
    }
    setAppliedSuggestionIds((prev) => new Set(prev).add(s.id));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gemini Creative Assistant"
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
    >
      <div className="w-full max-w-[540px] h-full bg-[#131720] border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Gemini Assistant</h2>
            <p className="text-xs text-slate-400">
              Active target: {mode === 'vfx' ? `VFX "${vfxEffect.name}"` : `Animation "${animation.name}" (${animation.rig})`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Gemini Assistant"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Mode Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800 flex items-center gap-1.5 bg-[#10141D]">
          <button
            type="button"
            onClick={() => {
              setTab('describe');
              setApiError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'describe'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100 bg-[#171D2A]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Describe
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('juicier');
              setApiError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'juicier'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100 bg-[#171D2A]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Make it Juicier
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('variants');
              setApiError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'variants'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100 bg-[#171D2A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            5-Tier Variants
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-rose-950/60 border border-rose-700/80 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-100">Gemini Request Error</p>
                <p className="mt-0.5 leading-relaxed">{apiError}</p>
              </div>
            </div>
          )}

          {/* TAB 1: DESCRIBE */}
          {tab === 'describe' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="gemini-describe-input" className="block text-xs font-semibold text-slate-200">
                  Describe the {mode === 'vfx' ? 'Stud Voxel VFX' : `${animation.rig} Animation`} in words
                </label>
                <textarea
                  id="gemini-describe-input"
                  rows={4}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={
                    mode === 'vfx'
                      ? 'e.g. Rainbow stud cube explosion with golden shockwave ring, brief hitstop slow-mo, and rising confetti sparks for feeding a rare Husser...'
                      : 'e.g. Over-the-top greedy Husser belly flop with big anticipation wind-up, wide panting jaw, squash landing, and happy tail wag...'
                  }
                  className="w-full bg-[#0D1119] border border-slate-700 focus:border-amber-500 focus:outline-none rounded-md p-3 text-xs text-slate-100 placeholder:text-slate-500"
                />
                {validationError && (
                  <p className="text-xs text-rose-400">{validationError}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {(mode === 'vfx'
                    ? [
                        'Golden burger chomp burst with stud cubes & shock ring',
                        'Mythic sky pillar summon with orbiting ribbon trail',
                        'Comic spicy burp cloud with star sparks & camera shake',
                      ]
                    : [
                        'Greedy chomp lunge with big wind-up & jaw snap',
                        'Hyper happy jump spin with tongue flapping',
                        'Dramatic sneeze recoil with squash & stretch',
                      ]
                  ).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setPrompt(ex);
                        setValidationError(null);
                      }}
                      className="text-[11px] text-slate-300 bg-[#181F2D] hover:bg-slate-800 border border-slate-700/80 rounded px-2 py-1 text-left transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={runDescribe}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating with Gemini...' : `Generate ${mode === 'vfx' ? 'VFX Timeline' : 'Animation Keyframes'}`}
              </button>

              {describeResult && (
                <div className="bg-[#181E2B] border border-slate-700 rounded-md p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white">Generated Result</h3>
                    <span className="text-[11px] font-mono text-amber-400">
                      {describeResult.vfxEffect
                        ? `${describeResult.vfxEffect.elements.length} VFX elements`
                        : describeResult.animation
                          ? `${describeResult.animation.keys.length} keyframes`
                          : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{describeResult.summary}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (describeResult.vfxEffect) onApplyVfx(describeResult.vfxEffect);
                      if (describeResult.animation) onApplyAnimation(describeResult.animation);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
                  >
                    Apply to Live 3D Timeline
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MAKE IT JUICIER */}
          {tab === 'juicier' && (
            <div className="space-y-4">
              <div className="bg-[#171D29] border border-slate-800 rounded-md p-3.5 space-y-2">
                <h3 className="text-xs font-semibold text-white">
                  7-Principle Juice & Mobile Audit
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gemini inspects your active {mode === 'vfx' ? 'VFX timeline' : 'Animation keyframes'} for{' '}
                  <strong className="text-slate-200">
                    Anticipation, Overshoot, Squash &amp; Stretch, Follow-through, Timing Contrast, Mobile Readability, and Performance Budget
                  </strong>{' '}
                  and produces concrete 1-click upgrades.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={runMakeItJuicier}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? 'Analyzing Timeline...' : 'Analyze & Make It Juicier'}
                </button>
              </div>

              {juicierResult && (
                <div className="space-y-4">
                  <div className="bg-[#181E2B] border border-slate-700 rounded-md p-3.5 space-y-2.5">
                    <p className="text-xs text-slate-200 leading-relaxed">{juicierResult.summary}</p>

                    <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-800">
                      {juicierResult.criteria.map((c) => (
                        <div key={c.name} className="flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-slate-400"> — {c.note}</span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-amber-400 shrink-0">
                            {c.score}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Concrete 1-click Suggestions */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Actionable Upgrades ({juicierResult.suggestions.length})
                    </h4>
                    {juicierResult.suggestions.map((sug) => {
                      const isApplied = appliedSuggestionIds.has(sug.id);
                      return (
                        <div
                          key={sug.id}
                          className="bg-[#171D2A] border border-slate-700/90 rounded-md p-3.5 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-medium text-amber-400">
                                {sug.principle} · {sug.impact} Impact
                              </span>
                              <h5 className="text-sm font-bold text-white mt-0.5">{sug.title}</h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => applySuggestion(sug)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold shrink-0 transition-colors ${
                                isApplied
                                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Applied
                                </>
                              ) : (
                                'Apply'
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{sug.rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 5-TIER RARITY VARIANTS */}
          {tab === 'variants' && (
            <div className="space-y-4">
              <div className="bg-[#171D29] border border-slate-800 rounded-md p-3.5 space-y-2">
                <h3 className="text-xs font-semibold text-white">
                  5-Tier Feed The Hussers Escalation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatically scale <strong className="text-slate-200">{vfxEffect.name}</strong> into 5 progressive rarity tiers:{' '}
                  <span className="text-blue-400">Rare</span> · <span className="text-amber-400">Legend</span> ·{' '}
                  <span className="text-pink-400">Mythic</span> · <span className="text-violet-400">Husstastic</span> ·{' '}
                  <span className="text-emerald-400">Impossible</span>.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={runGenerateVariants}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  {loading ? 'Generating 5 Rarity Tiers...' : 'Generate 5 Rarity Variants'}
                </button>
              </div>

              {variants.length > 0 && (
                <div className="space-y-2.5">
                  {variants.map((v) => {
                    const isActive = activeTier === v.tier;
                    return (
                      <div
                        key={v.tier}
                        className={`bg-[#171D2A] border rounded-md p-3.5 space-y-2 transition-colors ${
                          isActive ? 'border-amber-400' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: v.accentHex }}
                            />
                            <h4 className="text-sm font-bold text-white">{v.tier}</h4>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              {v.effect.elements.length} els · Peak {v.estimatedPeak}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onApplyVfx(v.effect);
                                setActiveTier(v.tier);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold transition-colors"
                            >
                              {isActive ? 'Loaded' : 'Preview'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(exportVfxToLuau(v.effect));
                                setCopiedTier(v.tier);
                                setTimeout(() => setCopiedTier(null), 1500);
                              }}
                              aria-label={`Copy ${v.tier} Luau`}
                              className="p-1.5 rounded bg-[#0F131B] border border-slate-700 text-slate-300 hover:text-white"
                            >
                              {copiedTier === v.tier ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300">{v.tagline}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
