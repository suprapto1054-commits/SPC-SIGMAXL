import React from 'react';
import { SigmaZones } from '../../types/spc';

interface SigmaZoneLegendProps {
  zones: SigmaZones;
  showZones: boolean;
  onToggleZones: (show: boolean) => void;
  showLimits: boolean;
  onToggleLimits: (show: boolean) => void;
  showSpecLimits?: boolean;
  onToggleSpecLimits?: (show: boolean) => void;
  hasSpecLimits?: boolean;
}

export const SigmaZoneLegend: React.FC<SigmaZoneLegendProps> = ({
  zones,
  showZones,
  onToggleZones,
  showLimits,
  onToggleLimits,
  showSpecLimits = false,
  onToggleSpecLimits,
  hasSpecLimits = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-3.5 py-2 text-[11px] font-mono text-slate-300">
      {/* Zone Legend Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase font-bold text-slate-500">SIGMA ZONES:</span>

        <div className="flex items-center gap-1.5" title="Zone A: ±2σ to ±3σ (Critical boundary)">
          <span className="h-2.5 w-2.5 rounded-xs border border-rose-500/40 bg-rose-500/20" />
          <span className="text-slate-400">Zone A (±2σ-±3σ)</span>
        </div>

        <div className="flex items-center gap-1.5" title="Zone B: ±1σ to ±2σ (Warning zone)">
          <span className="h-2.5 w-2.5 rounded-xs border border-amber-500/40 bg-amber-500/20" />
          <span className="text-slate-400">Zone B (±1σ-±2σ)</span>
        </div>

        <div className="flex items-center gap-1.5" title="Zone C: Center Line to ±1σ (Central target)">
          <span className="h-2.5 w-2.5 rounded-xs border border-emerald-500/40 bg-emerald-500/20" />
          <span className="text-slate-400">Zone C (CL-±1σ)</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
          <span>UCL: <strong className="text-rose-400">{zones.plus3Sigma.toFixed(2)}</strong></span>
          <span>CL: <strong className="text-sky-400">{zones.centerLine.toFixed(2)}</strong></span>
          <span>LCL: <strong className="text-rose-400">{zones.minus3Sigma.toFixed(2)}</strong></span>
          <span>σ: <strong className="text-slate-200">{zones.sigma.toFixed(3)}</strong></span>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <button
          type="button"
          onClick={() => onToggleZones(!showZones)}
          className={`rounded border px-2 py-0.5 transition-colors ${
            showZones
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
          }`}
        >
          {showZones ? '✓ ZONES ON' : '+ ZONES'}
        </button>

        <button
          type="button"
          onClick={() => onToggleLimits(!showLimits)}
          className={`rounded border px-2 py-0.5 transition-colors ${
            showLimits
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
          }`}
        >
          {showLimits ? '✓ LIMITS ON' : '+ LIMITS'}
        </button>

        {hasSpecLimits && onToggleSpecLimits && (
          <button
            type="button"
            onClick={() => onToggleSpecLimits(!showSpecLimits)}
            className={`rounded border px-2 py-0.5 transition-colors ${
              showSpecLimits
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold'
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showSpecLimits ? '✓ SPEC LIMITS' : '+ SPEC LIMITS'}
          </button>
        )}
      </div>
    </div>
  );
};
