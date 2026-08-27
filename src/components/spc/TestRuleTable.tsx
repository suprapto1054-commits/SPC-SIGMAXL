import React from 'react';
import { RuleSummary } from '../../types/spc';
import { ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface TestRuleTableProps {
  ruleSummaries: RuleSummary[];
  onSelectPoint?: (pointNumber: number) => void;
  selectedPoint?: number | null;
}

export const TestRuleTable: React.FC<TestRuleTableProps> = ({
  ruleSummaries,
  onSelectPoint,
  selectedPoint,
}) => {
  const failedCount = ruleSummaries.filter((r) => r.status === 'FAIL').length;

  return (
    <div className="overflow-hidden rounded border border-slate-800 bg-[#020617] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3.5 py-2">
        <div className="flex items-center gap-2">
          {failedCount > 0 ? (
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono">
            RULE EVALUATION MATRIX // WESTERN ELECTRIC & NELSON
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${
            failedCount > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {failedCount > 0 ? `${failedCount} RULES VIOLATED` : 'ALL 8 RULES PASSED'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-slate-800 bg-slate-950/90 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2 px-3.5">RULE_ID</th>
              <th className="py-2 px-3.5">CRITERION / CONDITION</th>
              <th className="py-2 px-3 text-center">STATUS</th>
              <th className="py-2 px-3 text-center">VIOLATIONS</th>
              <th className="py-2 px-3.5">VIOLATED OBSERVATIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {ruleSummaries.map((rule) => {
              const isFail = rule.status === 'FAIL';
              return (
                <tr
                  key={rule.ruleId}
                  className={`transition-colors ${
                    isFail
                      ? 'bg-rose-500/5 hover:bg-rose-500/10 text-slate-200'
                      : 'hover:bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <td className="py-2 px-3.5 font-bold text-white whitespace-nowrap">
                    {rule.ruleId}
                  </td>
                  <td className="py-2 px-3.5 text-slate-300 font-sans text-xs">
                    {rule.description}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[9px] font-bold ${
                        isFail
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {isFail ? <AlertCircle className="w-2.5 h-2.5" /> : null}
                      {rule.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-200">
                    {rule.violationCount}
                  </td>
                  <td className="py-2 px-3.5">
                    {rule.violatedPoints.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rule.violatedPoints.map((pNum) => (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => onSelectPoint?.(pNum)}
                            className={`rounded border px-1.5 py-0.2 text-[10px] font-bold transition-all ${
                              selectedPoint === pNum
                                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-xs'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                            title={`Inspect Point #${pNum}`}
                          >
                            #{pNum}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
