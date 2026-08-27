import React from 'react';
import { Dataset, SpcCalculationResult } from '../../types/spc';
import { CapabilityResult } from '../../types/statistics';
import { MetricCard } from '../common/MetricCard';
import { StatusBadge } from '../common/StatusBadge';
import { ControlChartView } from '../spc/ControlChartView';
import { Sparkles, ArrowRight } from 'lucide-react';

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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 bg-[#020617] p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-xs font-bold">
            SPC
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-white font-mono">
                TELEMETRY COCKPIT // {dataset.name}
              </h2>
              <StatusBadge status={spcResult.status} size="sm" />
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              VAR: <span className="text-slate-300 font-bold">{spcResult.columnName}</span> | OBS: <span className="text-slate-300 font-bold">{dataset.rowCount}</span> | SAMPLE_SUBGROUP: <span className="text-slate-300 font-bold">n={spcResult.subgroupSize}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('auto-analysis')}
            className="flex items-center gap-1.5 rounded bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI EXECUTIVE AUDIT
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
      <div className="rounded border border-slate-800 bg-[#020617] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-sky-400 rounded-xs"></span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
              REAL-TIME CONTROL CHART // {spcResult.chartType}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('spc-imr')}
            className="flex items-center gap-1 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>FULL SPC WORKSPACE</span> <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <ControlChartView result={spcResult} metadata={dataset.metadata} />
      </div>
    </div>
  );
};

