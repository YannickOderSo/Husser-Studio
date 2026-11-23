import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANIMATION_PRESETS,
  createR15Preset,
  createVfxElement,
  nextId,
  VFX_PRESETS,
} from './data/presets';
import {
  AnimationClip,
  BudgetMetrics,
  HUSSER_JOINTS,
  JointTransform,
  McpActivityEntry,
  R15_JOINTS,
  RigType,
  VfxEffect,
  VfxElementType,
  WorkbenchMode,
} from './types/workbench';
import {
  classifyMobileBudget,
  estimatePeakBudget,
  evaluateAnimationPose,
  roundNum,
} from './engine/vfxMath';
import { TopBar } from './components/TopBar';
import { Viewport3D, Viewport3DHandle } from './components/Viewport3D';
import { VfxInspector } from './components/VfxInspector';
import { AnimationInspector } from './components/AnimationInspector';
import { TimelinePanel } from './components/TimelinePanel';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { ExportImportModal } from './components/ExportImportModal';
import { McpModal } from './components/McpModal';

export default function App() {
  const [mode, setMode] = useState<WorkbenchMode>('vfx');
  const [vfxEffect, setVfxEffect] = useState<VfxEffect>(() => structuredClone(VFX_PRESETS[0]));
  const [selectedVfxId, setSelectedVfxId] = useState<string | null>(VFX_PRESETS[0].elements[0]?.id ?? null);

  const [animation, setAnimation] = useState<AnimationClip>(() =>
    structuredClone(ANIMATION_PRESETS['Huss Run'])
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    ANIMATION_PRESETS['Huss Run'].keys[0]?.id ?? null
  );
  const [selectedJoint, setSelectedJoint] = useState<string>('Head');
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [gizmoMode, setGizmoMode] = useState<'rotate' | 'translate'>('rotate');

  // Playback state
  const [playing, setPlaying] = useState<boolean>(true);
  const [loop, setLoop] = useState<boolean>(true);
  const [quarterSpeed, setQuarterSpeed] = useState<boolean>(false);
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [scrubSignal, setScrubSignal] = useState<number>(0);
  const currentTimeRef = useRef<number>(0);

  // Live particle/cube counts reported from 3D simulation at <= 12Hz
  const [liveCounts, setLiveCounts] = useState<{ particles: number; cubes: number }>({
    particles: 0,
    cubes: 0,
  });

  // Modals & Recording
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Direct MCP Live Sync State
  const [mcpConnected, setMcpConnected] = useState(false);
  const [mcpLogs, setMcpLogs] = useState<McpActivityEntry[]>([]);
  const suppressNextSyncRef = useRef(false);

  const viewportRef = useRef<Viewport3DHandle | null>(null);

  // Subscribe to Server-Sent Events from /api/mcp/events so external local AI agents update the 3D viewport live!
  useEffect(() => {
    const es = new EventSource('/api/mcp/events');
    es.onopen = () => setMcpConnected(true);
    es.onerror = () => setMcpConnected(false);

    es.addEventListener('init', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        if (Array.isArray(data.logs)) setMcpLogs(data.logs);
      } catch {
        // Ignore malformed init
      }
    });

    es.addEventListener('mcp_log', (ev) => {
      try {
        const entry = JSON.parse((ev as MessageEvent).data) as McpActivityEntry;
        setMcpLogs((prev) => [entry, ...prev].slice(0, 40));
      } catch {
        // Ignore
      }
    });

    es.addEventListener('state_update', (ev) => {
      try {
        const incoming = JSON.parse((ev as MessageEvent).data);
        suppressNextSyncRef.current = true;
        if (incoming.mode === 'vfx' || incoming.mode === 'animation') {
          setMode(incoming.mode);
        }
        if (incoming.vfxEffect) {
          setVfxEffect(incoming.vfxEffect);
          setSelectedVfxId(incoming.vfxEffect.elements?.[0]?.id ?? null);
        }
        if (incoming.animation) {
          setAnimation(incoming.animation);
          setSelectedKeyId(incoming.animation.keys?.[0]?.id ?? null);
          const joints = incoming.animation.rig === 'R15' ? R15_JOINTS : HUSSER_JOINTS;
          setSelectedJoint(joints[0]);
        }
        if (incoming.playback) {
          if (typeof incoming.playback.playing === 'boolean') setPlaying(incoming.playback.playing);
          if (typeof incoming.playback.loop === 'boolean') setLoop(incoming.playback.loop);
          if (typeof incoming.playback.quarterSpeed === 'boolean')
            setQuarterSpeed(incoming.playback.quarterSpeed);
          if (typeof incoming.playback.time === 'number') {
            currentTimeRef.current = incoming.playback.time;
            setDisplayTime(incoming.playback.time);
            setScrubSignal((s) => s + 1);
          }
        }
      } catch {
        // Ignore
      }
    });

    return () => {
      es.close();
    };
  }, []);

  // Push browser workbench edits to the local MCP server so AI agents always see current timeline
  useEffect(() => {
    if (suppressNextSyncRef.current) {
      suppressNextSyncRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      fetch('/api/mcp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          vfxEffect,
          animation,
          playback: { playing, loop, quarterSpeed, time: currentTimeRef.current },
        }),
      }).catch(() => {
        // Offline / server restarting
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [mode, vfxEffect, animation, playing, loop, quarterSpeed]);

  // Keyboard shortcuts (Space = play/pause, R = rotate gizmo, G = move gizmo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'r' || e.key === 'R') {
        setGizmoMode('rotate');
      } else if (e.key === 'g' || e.key === 'G') {
        setGizmoMode('translate');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Compute Budget Metrics combining real-time count and peak estimate
  const peakBudget = useMemo(() => estimatePeakBudget(vfxEffect), [vfxEffect]);
  const budget: BudgetMetrics = useMemo(() => {
    const activeTotal = liveCounts.particles + liveCounts.cubes;
    const peak = Math.max(peakBudget.estimatedPeakTotal, activeTotal);
    const mobile = classifyMobileBudget(peak);
    return {
      activeParticles: liveCounts.particles,
      activeCubes: liveCounts.cubes,
      activeTotal,
      estimatedPeakTotal: peak,
      mobileStatus: mobile.status,
      mobileLabel: mobile.label,
    };
  }, [liveCounts, peakBudget]);

  // --- Handlers ---

  const handleScrub = useCallback((t: number) => {
    currentTimeRef.current = t;
    setDisplayTime(t);
    setScrubSignal((s) => s + 1);
  }, []);

  const handleRewind = useCallback(() => {
    handleScrub(0);
  }, [handleScrub]);

  const handleTimeReport = useCallback((time: number, particles: number, cubes: number) => {
    setDisplayTime(time);
    setLiveCounts({ particles, cubes });
  }, []);

  const handleAddVfxElement = useCallback((type: VfxElementType) => {
    const el = createVfxElement(type);
    setVfxEffect((prev) => ({
      ...prev,
      elements: [...prev.elements, el],
    }));
    setSelectedVfxId(el.id);
    setScrubSignal((s) => s + 1);
  }, []);

  const handleDuplicateVfxElement = useCallback((id: string) => {
    setVfxEffect((prev) => {
      const target = prev.elements.find((e) => e.id === id);
      if (!target) return prev;
      const clone = {
        ...structuredClone(target),
        id: nextId('el'),
        name: `${target.name}_Copy`,
      };
      setSelectedVfxId(clone.id);
      return { ...prev, elements: [...prev.elements, clone] };
    });
  }, []);

  const handleDeleteVfxElement = useCallback((id: string) => {
    setVfxEffect((prev) => {
      const next = prev.elements.filter((e) => e.id !== id);
      setSelectedVfxId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return { ...prev, elements: next };
    });
  }, []);

  const handleToggleVfxEnabled = useCallback((id: string) => {
    setVfxEffect((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    }));
  }, []);

  const handleSwitchRig = useCallback((rig: RigType) => {
    const nextClip =
      rig === 'R15'
        ? structuredClone(createR15Preset('Huss Run'))
        : structuredClone(ANIMATION_PRESETS['Huss Run']);
    setAnimation(nextClip);
    setSelectedKeyId(nextClip.keys[0]?.id ?? null);
    setSelectedJoint(rig === 'R15' ? 'Waist' : 'Head');
    handleScrub(0);
  }, [handleScrub]);

  const handleLoadAnimTemplate = useCallback(
    (templateName: string) => {
      const nextClip =
        animation.rig === 'R15'
          ? structuredClone(createR15Preset(templateName))
          : structuredClone(ANIMATION_PRESETS[templateName] ?? ANIMATION_PRESETS['Huss Run']);
      setAnimation(nextClip);
      setSelectedKeyId(nextClip.keys[0]?.id ?? null);
      handleScrub(0);
      setPlaying(true);
    },
    [animation.rig, handleScrub]
  );

  const handleUpdateJointTransform = useCallback(
    (joint: string, transform: JointTransform) => {
      setAnimation((prev) => {
        const targetId = selectedKeyId ?? prev.keys[0]?.id;
        if (!targetId) return prev;
        return {
          ...prev,
          keys: prev.keys.map((k) =>
            k.id === targetId
              ? { ...k, pose: { ...k.pose, [joint]: transform } }
              : k
          ),
        };
      });
    },
    [selectedKeyId]
  );

  const handleAddKeyframeAtCurrent = useCallback(() => {
    const t = roundNum(currentTimeRef.current, 2);
    setAnimation((prev) => {
      const existing = prev.keys.find((k) => Math.abs(k.t - t) < 0.025);
      const currentPose = evaluateAnimationPose(prev, t);
      if (existing) {
        setSelectedKeyId(existing.id);
        return {
          ...prev,
          keys: prev.keys.map((k) => (k.id === existing.id ? { ...k, pose: currentPose } : k)),
        };
      }
      const newKey = {
        id: nextId('key'),
        t,
        ease: 'Back' as const,
        dir: 'Out' as const,
        pose: currentPose,
      };
      setSelectedKeyId(newKey.id);
      return {
        ...prev,
        keys: [...prev.keys, newKey].sort((a, b) => a.t - b.t),
      };
    });
    setPlaying(false);
  }, []);

  const handleDeleteKeyframe = useCallback((id: string) => {
    setAnimation((prev) => {
      if (prev.keys.length <= 1) return prev;
      const next = prev.keys.filter((k) => k.id !== id);
      setSelectedKeyId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return { ...prev, keys: next };
    });
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      viewportRef.current?.stopWebmRecording();
    } else {
      handleScrub(0);
      setPlaying(true);
      viewportRef.current?.startWebmRecording();
    }
  }, [isRecording, handleScrub]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#11141B] text-[#EEF2F7] overflow-hidden">
      <TopBar
        mode={mode}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          handleScrub(0);
        }}
        onOpenGemini={() => setGeminiOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onOpenMcp={() => setMcpOpen(true)}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        mcpConnected={mcpConnected}
      />

      {/* Center Stage: 3D Viewport + Precision Right Inspector */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        <Viewport3D
          ref={viewportRef}
          mode={mode}
          vfxEffect={vfxEffect}
          animation={animation}
          playing={playing}
          loop={loop}
          quarterSpeed={quarterSpeed}
          currentTimeRef={currentTimeRef}
          scrubSignal={scrubSignal}
          selectedJoint={selectedJoint}
          onSelectJoint={(j) => {
            setSelectedJoint(j);
            setPlaying(false);
          }}
          onJointGizmoChange={handleUpdateJointTransform}
          onionSkin={onionSkin}
          onToggleOnionSkin={() => setOnionSkin((v) => !v)}
          gizmoMode={gizmoMode}
          onChangeGizmoMode={setGizmoMode}
          onTimeReport={handleTimeReport}
          onRecordingChange={setIsRecording}
        />

        {mode === 'vfx' ? (
          <VfxInspector
            effect={vfxEffect}
            selectedId={selectedVfxId}
            onUpdateEffect={setVfxEffect}
            onSelectElement={setSelectedVfxId}
            onDuplicateElement={handleDuplicateVfxElement}
            onDeleteElement={handleDeleteVfxElement}
            onLoadPreset={(preset) => {
              setVfxEffect(preset);
              setSelectedVfxId(preset.elements[0]?.id ?? null);
              handleScrub(0);
              setPlaying(true);
            }}
          />
        ) : (
          <AnimationInspector
            clip={animation}
            selectedKeyId={selectedKeyId}
            selectedJoint={selectedJoint}
            onUpdateClip={setAnimation}
            onSelectJoint={setSelectedJoint}
            onUpdateJointTransform={handleUpdateJointTransform}
            onSwitchRig={handleSwitchRig}
            onLoadTemplate={handleLoadAnimTemplate}
          />
        )}
      </main>

      {/* Bottom Timeline & Mobile Budget Bar */}
      <TimelinePanel
        mode={mode}
        vfxEffect={vfxEffect}
        animation={animation}
        playing={playing}
        loop={loop}
        quarterSpeed={quarterSpeed}
        currentTime={displayTime}
        budget={budget}
        selectedVfxId={selectedVfxId}
        selectedKeyId={selectedKeyId}
        onTogglePlay={() => setPlaying((p) => !p)}
        onRewind={handleRewind}
        onToggleLoop={() => setLoop((l) => !l)}
        onToggleQuarterSpeed={() => setQuarterSpeed((q) => !q)}
        onScrub={handleScrub}
        onSelectVfxElement={setSelectedVfxId}
        onAddVfxElement={handleAddVfxElement}
        onToggleVfxEnabled={handleToggleVfxEnabled}
        onDeleteVfxElement={handleDeleteVfxElement}
        onSelectKeyframe={setSelectedKeyId}
        onAddKeyframeAtCurrent={handleAddKeyframeAtCurrent}
        onDeleteKeyframe={handleDeleteKeyframe}
      />

      {/* Modals & Drawers */}
      <GeminiAssistantModal
        open={geminiOpen}
        onClose={() => setGeminiOpen(false)}
        mode={mode}
        vfxEffect={vfxEffect}
        animation={animation}
        onApplyVfx={(nextVfx) => {
          setVfxEffect(nextVfx);
          setSelectedVfxId(nextVfx.elements[0]?.id ?? null);
          setMode('vfx');
          handleScrub(0);
          setPlaying(true);
        }}
        onApplyAnimation={(nextAnim) => {
          setAnimation(nextAnim);
          setSelectedKeyId(nextAnim.keys[0]?.id ?? null);
          setMode('animation');
          handleScrub(0);
          setPlaying(true);
        }}
      />

      <ExportImportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        mode={mode}
        vfxEffect={vfxEffect}
        animation={animation}
        onImportVfx={(nextVfx) => {
          setVfxEffect(nextVfx);
          setSelectedVfxId(nextVfx.elements[0]?.id ?? null);
          setMode('vfx');
          handleScrub(0);
        }}
        onImportAnimation={(nextAnim) => {
          setAnimation(nextAnim);
          setSelectedKeyId(nextAnim.keys[0]?.id ?? null);
          setMode('animation');
          handleScrub(0);
        }}
      />

      <McpModal
        open={mcpOpen}
        onClose={() => setMcpOpen(false)}
        connected={mcpConnected}
        logs={mcpLogs}
      />
    </div>
  );
}
