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
    <header className="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 backdrop-blur-md text-slate-300">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500 shadow-xs">
            <div className="h-3 w-3 bg-white rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-tight text-white font-mono">
                AI-SPC QUALITY HUD
              </span>
              <span className="rounded bg-sky-500/10 px-1 py-0.2 text-[9px] font-mono font-bold text-sky-400 border border-sky-500/20">
                v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Dataset Selector */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500">DATASET:</span>
          <div className="relative">
            <select
              value={currentDataset.id}
              onChange={(e) => {
                const found = allDatasets.find((d) => d.id === e.target.value);
                if (found) onSelectDataset(found);
              }}
              className="appearance-none rounded border border-slate-800 bg-slate-900/80 py-1 pl-2.5 pr-7 text-[11px] font-mono text-slate-200 shadow-xs focus:border-sky-500 focus:outline-hidden max-w-[240px] truncate"
            >
              {allDatasets.map((ds) => (
                <option key={ds.id} value={ds.id} className="bg-slate-900 text-slate-200">
                  {ds.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Center: Realtime Telemetry Status Pill */}
      <div className="hidden sm:flex items-center gap-3">
        {spcResult ? (
          <StatusBadge status={spcResult.status} size="sm" />
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700/60 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 uppercase tracking-widest">SYSTEMS NOMINAL</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-slate-300 shadow-xs hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Upload className="w-3 h-3 text-sky-400" />
          <span>LOAD DATA</span>
        </button>

        <button
          onClick={onToggleCopilot}
          className="flex items-center gap-1.5 rounded bg-sky-500 hover:bg-sky-400 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-950 shadow-xs transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span>AI COPILOT</span>
        </button>

        <button
          onClick={printExecutiveReport}
          className="rounded border border-slate-800 p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="Print Executive Report"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleTheme}
          className="rounded border border-slate-800 p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};

