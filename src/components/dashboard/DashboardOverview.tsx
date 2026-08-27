import React from 'react';
import { Dataset, SpcCalculationResult } from '../../types/spc';
import { CapabilityResult } from '../../types/statistics';
import { MetricCard } from '../common/MetricCard';
import { StatusBadge } from '../common/StatusBadge';
import { ControlChartView } from '../spc/ControlChartView';
import { Sparkles, ArrowRight, Ruler } from 'lucide-react';

interface DashboardOverviewProps {
  dataset: Dataset;
  spcResult: SpcCalculationResult;
  capability?: CapabilityResult;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  dataset,
  spcResult,
  capability,
  onNavigateToTab,
}) => {
  const violationsCount = spcResult.ruleViolations.length;

  return (
    <div className="space-y-4">
      {/* High-Density Telemetry Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-300 bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono text-xs font-bold shadow-xs">
            SPC
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white font-mono">
                TELEMETRY COCKPIT // {dataset.name}
              </h2>
              <StatusBadge status={spcResult.status} size="sm" />
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              VAR: <span className="text-slate-800 dark:text-slate-200 font-bold">{spcResult.columnName}</span> | OBS: <span className="text-slate-800 dark:text-slate-200 font-bold">{dataset.rowCount}</span> | SUBGROUP: <span className="text-slate-800 dark:text-slate-200 font-bold">n={spcResult.subgroupSize}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('msa')}
            className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-colors"
          >
            <Ruler className="w-3.5 h-3.5" />
            MSA & GAGE R&R
          </button>

          <button
            onClick={() => onNavigateToTab('auto-analysis')}
            className="flex items-center gap-1.5 rounded bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI EXECUTIVE AUDIT
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="PROCESS STABILITY"
          value={spcResult.status === 'IN_CONTROL' ? 'STABLE' : 'UNSTABLE'}
          subtitle={violationsCount > 0 ? `${violationsCount} NELSON VIOLATIONS` : 'IN CONTROL (3σ BOUNDS)'}
          badge={spcResult.status}
          badgeType={spcResult.status === 'IN_CONTROL' ? 'success' : 'danger'}
          onClick={() => onNavigateToTab('spc-imr')}
        />
        <MetricCard
          title="SHORT-TERM CPK"
          value={capability?.cpk ? capability.cpk.toFixed(3) : 'N/A'}
          subtitle={capability?.cpk && capability.cpk >= 1.33 ? 'SIX SIGMA COMPLIANT' : 'CENTERING REQUIRED'}
          badge={capability?.status || 'NO SPECS'}
          badgeType={capability?.status === 'CAPABLE' || capability?.status === 'EXCELLENT' ? 'success' : 'warning'}
          onClick={() => onNavigateToTab('capability')}
        />
        <MetricCard
          title="EXPECTED DEFECT RATE"
          value={capability?.expectedPpmTotal !== undefined ? `${capability.expectedPpmTotal.toFixed(0)} PPM` : '—'}
          subtitle={`Z-BENCH: ${capability?.zBenchmark !== undefined ? capability.zBenchmark.toFixed(2) : '—'}σ`}
          badgeType="info"
          onClick={() => onNavigateToTab('capability')}
        />
        <MetricCard
          title="CENTER LINE (MEAN)"
          value={spcResult.mean.toFixed(3)}
          subtitle={`SIGMA_W: ±${spcResult.sigmaWithin.toFixed(3)}`}
          badgeType="info"
        />
      </div>

      {/* Primary Control Chart Quick View */}
      <div className="rounded border border-slate-300 bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-cyan-500 rounded-xs"></span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 font-mono">
              REAL-TIME CONTROL CHART // {spcResult.chartType}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('spc-imr')}
            className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
          >
            <span>FULL SPC WORKSPACE</span> <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <ControlChartView result={spcResult} metadata={dataset.metadata} />
      </div>
    </div>
  );
};

