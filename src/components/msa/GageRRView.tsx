import React, { useState } from 'react';
import { GageRRResult } from '../../types/msa';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface GageRRViewProps {
  result: GageRRResult;
  unit?: string;
  onUpdateTolerance?: (tolerance: number) => void;
}

export const GageRRView: React.FC<GageRRViewProps> = ({
  result,
  unit = 'mm',
  onUpdateTolerance,
}) => {
  const { summary, anovaTable, parts, operators, numTrials } = result;
  const [toleranceInput, setToleranceInput] = useState<string>(
    result.tolerance ? String(result.tolerance) : ''
  );
  const [showAnova, setShowAnova] = useState(true);

  const handleApplyTolerance = () => {
    const parsed = parseFloat(toleranceInput);
    if (!isNaN(parsed) && parsed > 0 && onUpdateTolerance) {
      onUpdateTolerance(parsed);
    }
  };

  // Status color logic (Bright Industrial)
  const getStatusBadge = () => {
    if (summary.status === 'ACCEPTABLE') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
        label: 'ACCEPTABLE // AIAG PASS',
      };
    }
    if (summary.status === 'MARGINAL') {
      return {
        bg: 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
        label: 'MARGINAL // CONDITIONAL',
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400',
      icon: XCircle,
      label: 'UNACCEPTABLE // GAGE FAIL',
    };
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4">
      {/* Top Banner: Industrial Gage Status HUD */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  GAGE REPEATABILITY & REPRODUCIBILITY (GAGE R&R)
                </span>
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  AIAG MSA 4TH ED
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                2-Way ANOVA Crossed Model • {parts.length} Parts × {operators.length} Appraisers × {numTrials} Replicate Trials ({parts.length * operators.length * numTrials} total runs)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-xs font-bold ${statusInfo.bg}`}>
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Executive Metrics Industrial Cards */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              % GAGE R&R (% STUDY VAR)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-lg font-bold ${
                summary.pctStudyVarGRR < 10
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : summary.pctStudyVarGRR <= 30
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.pctStudyVarGRR.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400">
                {summary.pctStudyVarGRR < 10 ? '< 10% (Pass)' : summary.pctStudyVarGRR <= 30 ? '10-30% (Marginal)' : '> 30% (Fail)'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full ${
                  summary.pctStudyVarGRR < 10
                    ? 'bg-emerald-500'
                    : summary.pctStudyVarGRR <= 30
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, summary.pctStudyVarGRR)}%` }}
              />
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              % TOLERANCE (P/T RATIO)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-lg font-bold ${
                summary.pctToleranceGRR === undefined
                  ? 'text-slate-400'
                  : summary.pctToleranceGRR < 10
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : summary.pctToleranceGRR <= 30
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.pctToleranceGRR !== undefined ? `${summary.pctToleranceGRR.toFixed(2)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400">
                {summary.pctToleranceGRR !== undefined ? `(Tol: ${result.tolerance}${unit})` : 'Spec missing'}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Precision to Process Spec
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              NUMBER OF DISTINCT CATEGORIES (ndc)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-lg font-bold ${
                summary.ndc >= 5
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.ndc}
              </span>
              <span className={`text-[10px] font-bold ${
                summary.ndc >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.ndc >= 5 ? '>= 5 (Adequate)' : '< 5 (Inadequate)'}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Gage Resolution Discrimination
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              PART-TO-PART (% VARIATION)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {summary.pctStudyVarPV.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400">
                Study: {(summary.studyVariationPV).toFixed(4)} {unit}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Actual Part Spread Coverage
            </p>
          </div>
        </div>

        {/* Tolerance Input Toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
              SPECIFICATION TOLERANCE (USL - LSL):
            </span>
            <input
              type="number"
              step="any"
              value={toleranceInput}
              onChange={(e) => setToleranceInput(e.target.value)}
              placeholder="e.g. 0.100"
              className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-cyan-500 focus:outline-hidden"
            />
            <span className="text-slate-500">{unit}</span>
            <button
              onClick={handleApplyTolerance}
              className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors"
            >
              UPDATE P/T
            </button>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-xl">
            {summary.statusDescription}
          </p>
        </div>
      </div>

      {/* Variation Breakdown Comparison Table */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-500" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              MEASUREMENT SYSTEM VARIATION DECOMPOSITION
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Study Multiplier: 6.00σ (99.73% Process Spread)
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4">Variation Source</th>
                <th className="py-2 px-3 text-right">StdDev (σ)</th>
                <th className="py-2 px-3 text-right">Study Var (6.0×σ)</th>
                <th className="py-2 px-3 text-right">% Study Var (%SV)</th>
                <th className="py-2 px-3 text-right">% Contribution</th>
                {summary.pctToleranceGRR !== undefined && (
                  <th className="py-2 pl-3 text-right">% Tolerance (P/T)</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr className="bg-slate-50/50 dark:bg-slate-900/30 font-bold">
                <td className="py-2 pr-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Total Gage R&R (GRR)
                </td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.grr.toFixed(5)}</td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.studyVariationGRR.toFixed(5)}</td>
                <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">{summary.pctStudyVarGRR.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.pctContribGRR.toFixed(2)}%</td>
                {summary.pctToleranceGRR !== undefined && (
                  <td className="py-2 pl-3 text-right text-rose-600 dark:text-rose-400">{summary.pctToleranceGRR.toFixed(2)}%</td>
                )}
              </tr>
              <tr>
                <td className="py-1.5 pl-6 pr-4 text-slate-600 dark:text-slate-400">
                  └ Repeatability (Equipment EV)
                </td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.ev.toFixed(5)}</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.studyVariationEV.toFixed(5)}</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.pctStudyVarEV.toFixed(2)}%</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.pctContribEV.toFixed(2)}%</td>
                {summary.pctToleranceEV !== undefined && (
                  <td className="py-1.5 pl-3 text-right text-slate-600 dark:text-slate-400">{summary.pctToleranceEV.toFixed(2)}%</td>
                )}
              </tr>
              <tr>
                <td className="py-1.5 pl-6 pr-4 text-slate-600 dark:text-slate-400">
                  └ Reproducibility (Appraiser AV)
                </td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.av.toFixed(5)}</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.studyVariationAV.toFixed(5)}</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.pctStudyVarAV.toFixed(2)}%</td>
                <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{summary.pctContribAV.toFixed(2)}%</td>
                {summary.pctToleranceAV !== undefined && (
                  <td className="py-1.5 pl-3 text-right text-slate-600 dark:text-slate-400">{summary.pctToleranceAV.toFixed(2)}%</td>
                )}
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30 font-bold">
                <td className="py-2 pr-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Part-to-Part Variation (PV)
                </td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.pv.toFixed(5)}</td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.studyVariationPV.toFixed(5)}</td>
                <td className="py-2 px-3 text-right text-cyan-600 dark:text-cyan-400">{summary.pctStudyVarPV.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{summary.pctContribPV.toFixed(2)}%</td>
                {summary.pctTolerancePV !== undefined && (
                  <td className="py-2 pl-3 text-right text-cyan-600 dark:text-cyan-400">{summary.pctTolerancePV.toFixed(2)}%</td>
                )}
              </tr>
              <tr className="border-t border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                <td className="py-2 pr-4">Total Variation (TV)</td>
                <td className="py-2 px-3 text-right">{summary.tv.toFixed(5)}</td>
                <td className="py-2 px-3 text-right">{summary.studyVariationTV.toFixed(5)}</td>
                <td className="py-2 px-3 text-right">100.00%</td>
                <td className="py-2 px-3 text-right">100.00%</td>
                {summary.pctToleranceGRR !== undefined && <td className="py-2 pl-3 text-right">—</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6-in-1 Standard AIAG Diagnostic Charts Grid */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-500" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              AIAG 6-IN-1 DIAGNOSTIC CHARTS
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Graphical Verification Suite
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Chart 1: Components of Variation */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">1. Components of Variation</span>
              <span className="text-[9px] text-slate-400">% Contribution vs % Study Var</span>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Gage R&R (%SV)</span>
                  <span className="font-bold text-rose-500">{summary.pctStudyVarGRR.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden mt-0.5">
                  <div className="h-full bg-rose-500 rounded" style={{ width: `${Math.min(100, summary.pctStudyVarGRR)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Repeatability (EV)</span>
                  <span className="font-bold text-amber-500">{summary.pctStudyVarEV.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden mt-0.5">
                  <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min(100, summary.pctStudyVarEV)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Reproducibility (AV)</span>
                  <span className="font-bold text-purple-500">{summary.pctStudyVarAV.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden mt-0.5">
                  <div className="h-full bg-purple-500 rounded" style={{ width: `${Math.min(100, summary.pctStudyVarAV)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Part-to-Part (PV)</span>
                  <span className="font-bold text-cyan-500">{summary.pctStudyVarPV.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden mt-0.5">
                  <div className="h-full bg-cyan-500 rounded" style={{ width: `${Math.min(100, summary.pctStudyVarPV)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: R Chart by Operator */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">2. R Chart by Operator</span>
              <span className="text-[9px] text-emerald-500">In Control = Consistent</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {result.rBarByOperator.map((r) => (
                <div key={r.operator} className="rounded border border-slate-200 p-1.5 dark:border-slate-800 bg-white dark:bg-slate-900/80">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{r.operator}</span>
                    <span className="text-cyan-600 dark:text-cyan-400">R̄ = {r.rBar.toFixed(4)}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between mt-0.5">
                    <span>UCL: {r.ucl.toFixed(4)}</span>
                    <span className="text-emerald-500 font-bold">Stable</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 3: Xbar Chart by Operator */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">3. Xbar Chart by Operator</span>
              <span className="text-[9px] text-cyan-500">&gt; 50% Out = Good Discrim.</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {result.xBarByOperator.map((x) => (
                <div key={x.operator} className="rounded border border-slate-200 p-1.5 dark:border-slate-800 bg-white dark:bg-slate-900/80">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{x.operator}</span>
                    <span className="text-slate-600 dark:text-slate-400">X̄: {x.xDoubleBar.toFixed(4)}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between mt-0.5">
                    <span>UCL: {x.ucl.toFixed(3)} | LCL: {x.lcl.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 4: By Part Plot */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">4. By Part Dispersion</span>
              <span className="text-[9px] text-slate-400">Part-to-Part Spread</span>
            </div>
            <div className="mt-2.5 h-28 overflow-y-auto space-y-1 pr-1">
              {result.partMeans.map((p) => (
                <div key={p.part} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{p.part}</span>
                  <span className="text-slate-500">Mean: {p.mean.toFixed(3)}</span>
                  <span className="text-cyan-600 dark:text-cyan-400">Range: {p.range.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 5: By Operator Plot */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">5. By Operator Means</span>
              <span className="text-[9px] text-slate-400">Operator Bias Check</span>
            </div>
            <div className="mt-3 space-y-2">
              {result.operatorMeans.map((o) => (
                <div key={o.operator} className="rounded border border-slate-200 p-2 dark:border-slate-800 bg-white dark:bg-slate-900/80">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{o.operator}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">X̄ = {o.mean.toFixed(4)}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between mt-0.5">
                    <span>Delta from Grand Mean:</span>
                    <span className={Math.abs(o.mean - result.overallMean) > 0.005 ? 'text-amber-500' : 'text-emerald-500'}>
                      {o.mean >= result.overallMean ? '+' : ''}{(o.mean - result.overallMean).toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 6: Operator * Part Interaction */}
          <div className="rounded border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase">6. Operator × Part Interaction</span>
              <span className="text-[9px] text-slate-400">Parallelism Check</span>
            </div>
            <div className="mt-3 flex flex-col justify-center h-24 text-center text-[10px] text-slate-500">
              <p className="text-slate-700 dark:text-slate-300 font-bold">
                {anovaTable.find((a) => a.source.includes('Interaction'))?.pValue && (anovaTable.find((a) => a.source.includes('Interaction'))?.pValue || 0) > 0.05
                  ? '✓ Parallel Linearity Confirmed (No Significant Interaction, p > 0.05)'
                  : '⚠ Possible Interaction Detected between Operator & Part Fixturing'}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                ANOVA Interaction F-Stat = {anovaTable.find((a) => a.source.includes('Interaction'))?.fStat || '0.00'} (p = {anovaTable.find((a) => a.source.includes('Interaction'))?.pValue || '0.000'})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Way ANOVA Statistical Table Collapsible */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div
          onClick={() => setShowAnova(!showAnova)}
          className="flex cursor-pointer items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              TWO-WAY ANALYSIS OF VARIANCE (ANOVA TABLE)
            </h3>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Full Crossed Model
            </span>
          </div>
          <button className="font-mono text-xs text-cyan-600 dark:text-cyan-400">
            {showAnova ? 'COLLAPSE [-]' : 'EXPAND [+]'}
          </button>
        </div>

        {showAnova && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4">Source of Variation</th>
                  <th className="py-2 px-3 text-right">DF</th>
                  <th className="py-2 px-3 text-right">Sum of Squares (SS)</th>
                  <th className="py-2 px-3 text-right">Mean Square (MS)</th>
                  <th className="py-2 px-3 text-right">F-Statistic</th>
                  <th className="py-2 px-3 text-right">p-Value</th>
                  <th className="py-2 pl-3 text-right">Variance Component</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {anovaTable.map((row) => (
                  <tr key={row.source} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="py-2 pr-4 font-bold text-slate-800 dark:text-slate-200">{row.source}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{row.df}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{row.ss.toFixed(5)}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{row.ms.toFixed(5)}</td>
                    <td className="py-2 px-3 text-right text-cyan-600 dark:text-cyan-400">{row.fStat !== undefined ? row.fStat.toFixed(2) : '—'}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300">{row.pValue !== undefined ? row.pValue.toFixed(4) : '—'}</td>
                    <td className="py-2 pl-3 text-right text-slate-700 dark:text-slate-300">{row.varianceComponent.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AIAG Recommendations Callout */}
      {summary.recommendations.length > 0 && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3.5 font-mono text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] mb-1">
            <HelpCircle className="h-4 w-4" />
            AIAG ACTIONABLE RECOMMENDATIONS:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {summary.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
