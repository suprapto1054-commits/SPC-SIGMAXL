import React, { useState } from 'react';
import { Type1GageResult } from '../../types/msa';
import { Target, CheckCircle2, XCircle, Gauge } from 'lucide-react';

interface Type1GageStudyViewProps {
  values: number[];
  referenceValue: number;
  tolerance: number;
  result: Type1GageResult;
  unit?: string;
  onUpdateParams?: (ref: number, tol: number) => void;
}

export const Type1GageStudyView: React.FC<Type1GageStudyViewProps> = ({
  values,
  referenceValue,
  tolerance,
  result,
  unit = 'mm',
  onUpdateParams,
}) => {
  const [refInput, setRefInput] = useState(String(referenceValue));
  const [tolInput, setTolInput] = useState(String(tolerance));

  const handleApply = () => {
    const r = parseFloat(refInput);
    const t = parseFloat(tolInput);
    if (!isNaN(r) && !isNaN(t) && t > 0 && onUpdateParams) {
      onUpdateParams(r, t);
    }
  };

  const isCapable = result.isCapable;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-xs">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  TYPE 1 GAGE STUDY (POTENTIAL CAPABILITY & BIAS)
                </span>
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  AIAG STANDARDS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Evaluation of instrument repeatability and calibration bias against a certified reference master standard ({values.length} repeated runs).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-xs font-bold ${
                isCapable
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isCapable ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {isCapable ? 'CAPABLE (Cg & Cgk >= 1.33)' : 'NOT CAPABLE (Cg/Cgk < 1.33)'}
            </span>
          </div>
        </div>

        {/* Parameters Configuration Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase text-[10px]">REFERENCE MASTER:</span>
            <input
              type="number"
              step="any"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-slate-400">{unit}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase text-[10px]">TOLERANCE (USL - LSL):</span>
            <input
              type="number"
              step="any"
              value={tolInput}
              onChange={(e) => setTolInput(e.target.value)}
              className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-slate-400">{unit}</span>
          </div>

          <button
            onClick={handleApply}
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors"
          >
            RECALCULATE TYPE 1
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              GAGE CAPABILITY (Cg)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-bold ${result.cg >= 1.33 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {result.cg.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">Target ≥ 1.33</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Repeatability Potential (0.20×Tol / 6s)
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              CAPABILITY WITH BIAS (Cgk)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-bold ${result.cgk >= 1.33 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {result.cgk.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">Target ≥ 1.33</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Accounts for Calibration Offset
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              CALIBRATION BIAS
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-bold ${Math.abs(result.bias) < tolerance * 0.05 ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {result.bias >= 0 ? `+${result.bias.toFixed(4)}` : result.bias.toFixed(4)} {unit}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Observed Mean - Master Reference
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              GAGE REPEATABILITY (s)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {result.standardDeviation.toFixed(5)} {unit}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Sample Standard Deviation (n={result.sampleCount})
            </p>
          </div>
        </div>
      </div>

      {/* Repeated Measurements Run Chart */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-500" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              RUN CHART: REPEATED MASTER CALIBRATION RUNS
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Reference Target = {referenceValue} {unit}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="flex items-end gap-1.5 h-36 border-b border-slate-300 dark:border-slate-700 pb-2 pt-4 px-2">
            {values.map((val, idx) => {
              const diff = val - referenceValue;
              const maxSpread = tolerance * 0.2 || 0.01;
              const heightPct = Math.min(100, Math.max(10, ((diff + maxSpread) / (2 * maxSpread)) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className={`w-full rounded-t transition-all ${
                      Math.abs(diff) <= tolerance * 0.05 ? 'bg-cyan-500' : 'bg-amber-500'
                    } group-hover:bg-cyan-400`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[8px] font-mono text-slate-400 mt-1">#{idx + 1}</span>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-8 hidden group-hover:block z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 font-mono text-[9px] text-white shadow-md">
                    Run #{idx + 1}: {val} {unit} (Δ {diff >= 0 ? '+' : ''}{diff.toFixed(4)})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
