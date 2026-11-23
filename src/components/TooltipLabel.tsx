import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { ROBLOX_TOOLTIPS } from '../data/robloxTooltips';

interface TooltipLabelProps {
  label: string;
  tooltipKey?: string;
  customTooltip?: string;
  htmlFor?: string;
  rightText?: string;
}

export const TooltipLabel: React.FC<TooltipLabelProps> = ({
  label,
  tooltipKey,
  customTooltip,
  htmlFor,
  rightText,
}) => {
  const [open, setOpen] = useState(false);
  const tip = customTooltip ?? (tooltipKey ? ROBLOX_TOOLTIPS[tooltipKey] : undefined);

  return (
    <div className="flex items-center justify-between gap-2 mb-1 relative">
      <div className="flex items-center gap-1.5 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-slate-300 truncate select-none"
        >
          {label}
        </label>
        {tip && (
          <button
            type="button"
            aria-label={`Roblox info for ${label}`}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={() => setOpen((v) => !v)}
            className="text-slate-500 hover:text-amber-400 focus-visible:outline-none focus-visible:text-amber-400 transition-colors shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {rightText && (
        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
          {rightText}
        </span>
      )}
      {open && tip && (
        <div
          role="tooltip"
          className="absolute right-0 bottom-full mb-1.5 z-50 w-56 max-w-[260px] rounded-md bg-[#0B0E14] border border-amber-500/40 px-2.5 py-2 text-[11px] leading-relaxed text-slate-200 shadow-2xl pointer-events-none"
        >
          <span className="block font-semibold text-amber-400 mb-0.5">{label}</span>
          {tip}
        </div>
      )}
    </div>
  );
};
