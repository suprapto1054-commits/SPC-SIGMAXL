import React from 'react';
import { AttributeMsaResult, AttributeMsaRow } from '../../types/msa';
import { CheckSquare, CheckCircle2, AlertTriangle, XCircle, Users } from 'lucide-react';

interface AttributeMsaViewProps {
  result: AttributeMsaResult;
  data: AttributeMsaRow[];
}

export const AttributeMsaView: React.FC<AttributeMsaViewProps> = ({
  result,
  data,
}) => {
  const { appraisers, overallSystemAgreementPct, overallKappa, overallStatus } = result;

  const getStatusBadge = () => {
    if (overallStatus === 'ACCEPTABLE') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
        label: 'ACCEPTABLE (Kappa >= 0.75)',
      };
    }
    if (overallStatus === 'MARGINAL') {
      return {
        bg: 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
        label: 'MARGINAL (0.60 <= Kappa < 0.75)',
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400',
      icon: XCircle,
      label: 'UNACCEPTABLE (Kappa < 0.60)',
    };
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  // Extract unique samples
  const sampleMap = new Map<string | number, { standard: string; trials: AttributeMsaRow[] }>();
  data.forEach((d) => {
    if (!sampleMap.has(d.sampleId)) {
      sampleMap.set(d.sampleId, { standard: String(d.referenceStandard), trials: [] });
    }
    sampleMap.get(d.sampleId)?.trials.push(d);
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  ATTRIBUTE AGREEMENT ANALYSIS (GO / NO-GO INSPECTION)
                </span>
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  AIAG / KAPPA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Evaluation of human visual inspectors & optical automated inspection decisions against true engineering defect standard.
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

        {/* Executive Metric Cards */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              OVERALL SYSTEM AGREEMENT %
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-bold ${overallSystemAgreementPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : overallSystemAgreementPct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {overallSystemAgreementPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">All Appraisers vs Standard</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              100% agreement across all replicates & samples
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              OVERALL FLEISS / COHEN KAPPA (κ)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-bold ${overallKappa >= 0.75 ? 'text-emerald-600 dark:text-emerald-400' : overallKappa >= 0.60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {overallKappa.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">Target κ ≥ 0.75</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Chance-corrected Agreement Coefficient
            </p>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              TOTAL STUDY SCOPE
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {result.totalSamples} Parts / {result.totalTrials} Runs
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              {appraisers.length} Appraisers Evaluated
            </p>
          </div>
        </div>
      </div>

      {/* Appraiser Performance Summary Table */}
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-500" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              APPRAISER AGREEMENT & ERROR RATE BREAKDOWN
            </h3>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4">Appraiser Name</th>
                <th className="py-2 px-3 text-right">Self Consistency (%)</th>
                <th className="py-2 px-3 text-right">vs Reference Standard (%)</th>
                <th className="py-2 px-3 text-right">Cohen Kappa (κ)</th>
                <th className="py-2 px-3 text-right">False Alarm (Good→Bad)</th>
                <th className="py-2 pl-3 text-right">Miss Rate (Bad→Good)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {appraisers.map((app) => (
                <tr key={app.appraiser} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="py-2 pr-4 font-bold text-slate-800 dark:text-slate-200">{app.appraiser}</td>
                  <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{app.withinAgreementPct.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-bold text-cyan-600 dark:text-cyan-400">{app.vsStandardPct.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{app.kappa.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{app.falseAlarmRate.toFixed(1)}%</td>
                  <td className={`py-2 pl-3 text-right font-bold ${app.missRate > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {app.missRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
