import React from 'react';
import {
  Code2,
  Cpu,
  Flame,
  PersonStanding,
  Plug,
  Square,
  Video,
} from 'lucide-react';
import { WorkbenchMode } from '../types/workbench';

interface TopBarProps {
  mode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
  onOpenGemini: () => void;
  onOpenExport: () => void;
  onOpenMcp: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  mcpConnected: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  onOpenGemini,
  onOpenExport,
  onOpenMcp,
  isRecording,
  onToggleRecord,
  mcpConnected,
}) => {
  return (
    <header className="h-[52px] shrink-0 bg-[#12161F] border-b border-slate-800 px-4 flex items-center justify-between gap-6">
      {/* Zone 1: Clean single-line brand wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <span className="text-base font-extrabold tracking-tight text-white">
          Huss Workbench
        </span>
        <span className="hidden lg:inline text-xs text-slate-400">
          Feed The Hussers
        </span>
      </div>

      {/* Zone 2: Primary Workspace Switcher */}
      <nav
        aria-label="Workbench mode"
        className="flex items-center bg-[#0C0F16] border border-slate-800 rounded-lg p-0.5 shrink-0"
      >
        <button
          type="button"
          onClick={() => onModeChange('vfx')}
          aria-pressed={mode === 'vfx'}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            mode === 'vfx'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          VFX Editor
        </button>
        <button
          type="button"
          onClick={() => onModeChange('animation')}
          aria-pressed={mode === 'animation'}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            mode === 'animation'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <PersonStanding className="w-3.5 h-3.5" />
          Animation Editor
        </button>
      </nav>

      {/* Zone 3: Workbench Utility Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleRecord}
          aria-label={isRecording ? 'Stop 16:9 WebM recording' : 'Record 16:9 WebM video'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
            isRecording
              ? 'bg-rose-600 border-rose-500 text-white'
              : 'bg-[#181E2A] border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Video className="w-3.5 h-3.5" />}
          {isRecording ? 'Stop WebM' : 'Rec 16:9'}
        </button>

        <button
          type="button"
          onClick={onOpenMcp}
          aria-label="Open MCP Connection settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#181E2A] border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
        >
          <Plug className={`w-3.5 h-3.5 ${mcpConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
          MCP
        </button>

        <button
          type="button"
          onClick={onOpenGemini}
          aria-label="Open Gemini Assistant"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0"
        >
          <Cpu className="w-3.5 h-3.5" />
          Gemini AI
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          aria-label="Export or import Luau and JSON"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-950 hover:bg-white transition-colors whitespace-nowrap shrink-0"
        >
          <Code2 className="w-3.5 h-3.5" />
          Export Luau
        </button>
      </div>
    </header>
  );
};
