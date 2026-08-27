import React from 'react';
import { Dataset, SpcCalculationResult } from '../../types/spc';
import { StatusBadge } from '../common/StatusBadge';
import {
  Upload,
  Sparkles,
  Sun,
  Moon,
  Printer,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { printExecutiveReport } from '../../utils/exportUtils';

interface HeaderProps {
  currentDataset: Dataset;
  allDatasets: Dataset[];
  onSelectDataset: (dataset: Dataset) => void;
  onOpenImportModal: () => void;
  onToggleCopilot: () => void;
  spcResult?: SpcCalculationResult;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDataset,
  allDatasets,
  onSelectDataset,
  onOpenImportModal,
  onToggleCopilot,
  spcResult,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 flex h-13 w-full items-center justify-between border-b border-blue-900/60 bg-[#0a1733] px-4 backdrop-blur-md text-slate-100 shadow-md">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-blue-400/60 bg-blue-600 shadow-sm shadow-blue-500/40">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-tight text-white font-mono">
                AI-SPC & ENERGY COCKPIT
              </span>
              <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-300 border border-blue-400/40">
                PRO v3.2
              </span>
            </div>
          </div>
        </div>

        {/* Dataset Selector */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-blue-800/60">
          <span className="text-[10px] font-mono uppercase font-bold text-blue-300">DATASET:</span>
          <div className="relative">
            <select
              value={currentDataset.id}
              onChange={(e) => {
                const found = allDatasets.find((d) => d.id === e.target.value);
                if (found) onSelectDataset(found);
              }}
              className="appearance-none rounded border border-blue-700/60 bg-blue-950/90 py-1 pl-2.5 pr-7 text-[11px] font-mono font-bold text-blue-100 shadow-xs focus:border-blue-400 focus:outline-hidden max-w-[280px] truncate hover:border-blue-500 cursor-pointer"
            >
              {allDatasets.map((ds, idx) => (
                <option key={`${ds.id}-${idx}`} value={ds.id} className="bg-[#0a1733] text-blue-100">
                  {ds.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-blue-300" />
          </div>
        </div>
      </div>

      {/* Center: Realtime Telemetry Status Pill */}
      <div className="hidden sm:flex items-center gap-3">
        {spcResult ? (
          <StatusBadge status={spcResult.status} size="sm" />
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-950/80 rounded border border-blue-800/60 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-blue-300 font-bold uppercase tracking-widest">SYSTEMS NOMINAL</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 rounded border border-blue-700/70 bg-blue-900/50 px-2.5 py-1 text-[11px] font-mono font-bold text-blue-200 shadow-xs hover:bg-blue-800 hover:text-white transition-colors"
        >
          <Upload className="w-3 h-3 text-blue-300" />
          <span>LOAD DATA</span>
        </button>

        <button
          onClick={onToggleCopilot}
          className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-mono font-bold text-white shadow-sm shadow-blue-500/30 border border-blue-400/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span>AI COPILOT</span>
        </button>

        <button
          onClick={printExecutiveReport}
          className="rounded border border-blue-800/60 bg-blue-950/50 p-1 text-blue-300 hover:bg-blue-900 hover:text-white"
          title="Print Executive Report"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleTheme}
          className="rounded border border-blue-800/60 bg-blue-950/50 p-1 text-blue-300 hover:bg-blue-900 hover:text-white"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
        </button>
      </div>
    </header>
  );
};


