import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Upload, X } from 'lucide-react';
import { AnimationClip, VfxEffect, WorkbenchMode } from '../types/workbench';
import {
  exportAnimationToLuau,
  exportVfxToLuau,
  validateAndParseAnimationJson,
  validateAndParseVfxJson,
} from '../engine/vfxMath';

interface ExportImportModalProps {
  open: boolean;
  onClose: () => void;
  mode: WorkbenchMode;
  vfxEffect: VfxEffect;
  animation: AnimationClip;
  onImportVfx: (effect: VfxEffect) => void;
  onImportAnimation: (clip: AnimationClip) => void;
}

type ModalTab = 'luau' | 'json' | 'import';

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  open,
  onClose,
  mode,
  vfxEffect,
  animation,
  onImportVfx,
  onImportAnimation,
}) => {
  const [tab, setTab] = useState<ModalTab>('luau');
  const [target, setTarget] = useState<WorkbenchMode>(mode);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTarget(mode);
      setImportError(null);
      setImportSuccess(null);
    }
  }, [open, mode]);

  if (!open) return null;

  const activeTarget = target;
  const baseName = activeTarget === 'vfx' ? vfxEffect.name : animation.name;
  const luauText =
    activeTarget === 'vfx' ? exportVfxToLuau(vfxEffect) : exportAnimationToLuau(animation);
  const jsonText = JSON.stringify(activeTarget === 'vfx' ? vfxEffect : animation, null, 2);
  const activeCode = tab === 'luau' ? luauText : jsonText;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const ext = tab === 'luau' ? 'luau' : 'json';
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleImport = () => {
    setImportError(null);
    setImportSuccess(null);
    const raw = importText.trim();
    if (!raw) {
      setImportError('Paste exported JSON or choose a .json file first.');
      return;
    }

    if (activeTarget === 'vfx') {
      const parsed = validateAndParseVfxJson(raw);
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      onImportVfx(parsed.data);
      setImportSuccess(`Imported VFX "${parsed.data.name}" (${parsed.data.elements.length} elements).`);
    } else {
      const parsed = validateAndParseAnimationJson(raw);
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      onImportAnimation(parsed.data);
      setImportSuccess(`Imported ${parsed.data.rig} Animation "${parsed.data.name}" (${parsed.data.keys.length} keys).`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ''));
      setImportError(null);
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export and Import Luau or JSON"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div className="w-full max-w-3xl max-h-[86vh] bg-[#131720] border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">Roblox Luau &amp; JSON Export / Import</h2>
            <div className="flex items-center bg-[#0C0F16] border border-slate-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => setTarget('vfx')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                  activeTarget === 'vfx' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                VFX
              </button>
              <button
                type="button"
                onClick={() => setTarget('animation')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                  activeTarget === 'animation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Animation
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-[#10141D]">
          <div className="flex items-center gap-1.5">
            {(['luau', 'json', 'import'] as ModalTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setImportError(null);
                  setImportSuccess(null);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'bg-slate-200 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-[#171D2A]'
                }`}
              >
                {t === 'luau' ? 'Luau ModuleScript' : t === 'json' ? 'JSON Export' : 'Import JSON'}
              </button>
            ))}
          </div>

          {tab !== 'import' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1B2232] hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Download .{tab === 'luau' ? 'luau' : 'json'}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {tab !== 'import' ? (
            <pre
              data-testid="export-code-preview"
              className="w-full h-full min-h-[360px] bg-[#0B0E14] border border-slate-800 rounded-md p-4 text-xs font-mono leading-relaxed text-amber-100/95 overflow-auto select-all"
            >
              {activeCode}
            </pre>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="json-import-textarea" className="text-xs font-semibold text-slate-200">
                  Paste {activeTarget === 'vfx' ? 'VFX' : 'Animation'} JSON
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1B2232] hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Load .json file
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                id="json-import-textarea"
                rows={12}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"name":"My_Effect","duration":2.0,"elements":[...]}'
                className="w-full bg-[#0B0E14] border border-slate-700 focus:border-amber-500 focus:outline-none rounded-md p-3 text-xs font-mono text-slate-100"
              />
              {importError && <p className="text-xs text-rose-400">{importError}</p>}
              {importSuccess && <p className="text-xs text-emerald-400">{importSuccess}</p>}
              <button
                type="button"
                onClick={handleImport}
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Validate &amp; Import {activeTarget === 'vfx' ? 'VFX' : 'Animation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
