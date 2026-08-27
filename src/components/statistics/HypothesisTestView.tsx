import React, { useState } from 'react';
import { Dataset } from '../../types/spc';
import { calculateOneSampleTTest, calculateOneWayANOVA } from '../../engine/hypothesisEngine';
import { HypothesisTestResult } from '../../types/statistics';
import { MetricCard } from '../common/MetricCard';
import { Scale, CheckCircle2, XCircle } from 'lucide-react';

interface HypothesisTestViewProps {
  dataset: Dataset;
}

export const HypothesisTestView: React.FC<HypothesisTestViewProps> = ({ dataset }) => {
  const [testType, setTestType] = useState<'1-sample-t' | '1-way-anova'>('1-sample-t');

  const numericCols = dataset.columns.filter((c) => c.type === 'numeric');
  const catCols = dataset.columns.filter((c) => c.type === 'categorical');

  const [selectedNumCol, setSelectedNumCol] = useState<string>(numericCols[0]?.name || '');
  const [selectedCatCol, setSelectedCatCol] = useState<string>(catCols[0]?.name || '');
  const [targetMean, setTargetMean] = useState<string>('50');
  const [alpha, setAlpha] = useState<number>(0.05);

  const numCol = dataset.columns.find((c) => c.name === selectedNumCol);
  const catCol = dataset.columns.find((c) => c.name === selectedCatCol);

  let testResult: HypothesisTestResult | null = null;
  let errorMsg = '';

  try {
    if (testType === '1-sample-t') {
      const vals = (numCol?.values || []).filter((v) => typeof v === 'number') as number[];
      const mu0 = parseFloat(targetMean) || 0;
      testResult = calculateOneSampleTTest(vals, mu0, alpha);
    } else {
      // 1-Way ANOVA by Grouping
      const groupsMap = new Map<string, number[]>();
      for (let i = 0; i < dataset.rowCount; i++) {
        const grp = String(catCol?.values[i] ?? 'Default');
        const val = numCol?.values[i];
        if (typeof val === 'number' && !isNaN(val)) {
          if (!groupsMap.has(grp)) groupsMap.set(grp, []);
          groupsMap.get(grp)!.push(val);
        }
      }

      const groups = Array.from(groupsMap.entries()).map(([name, values]) => ({ name, values }));
      testResult = calculateOneWayANOVA(groups, alpha);
    }
  } catch (err: any) {
    errorMsg = err.message || 'Error computing hypothesis test.';
  }

  return (
    <div className="space-y-6">
      {/* Test Setup Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Statistical Hypothesis Testing & Inferential Statistics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rigorous statistical inference with test statistics, exact p-values, and effect sizes.
          </p>
        </div>

        {/* Test Type Toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
          <button
            onClick={() => setTestType('1-sample-t')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              testType === '1-sample-t'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            1-Sample t-Test
          </button>
          <button
            onClick={() => setTestType('1-way-anova')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              testType === '1-way-anova'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            One-Way ANOVA
          </button>
        </div>
      </div>

      {/* Test Parameters Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-slate-500 mb-1 font-medium">Measurement Variable:</label>
          <select
            value={selectedNumCol}
            onChange={(e) => setSelectedNumCol(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {numericCols.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {testType === '1-sample-t' && (
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Hypothesized Mean (μ₀):</label>
            <input
              type="number"
              step="any"
              value={targetMean}
              onChange={(e) => setTargetMean(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 w-28"
            />
          </div>
        )}

        {testType === '1-way-anova' && (
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Factor / Grouping Column:</label>
            <select
              value={selectedCatCol}
              onChange={(e) => setSelectedCatCol(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {catCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-slate-500 mb-1 font-medium">Significance Level (α):</label>
          <select
            value={alpha}
            onChange={(e) => setAlpha(parseFloat(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={0.01}>α = 0.01 (99% Confidence)</option>
            <option value={0.05}>α = 0.05 (95% Confidence)</option>
            <option value={0.1}>α = 0.10 (90% Confidence)</option>
          </select>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {errorMsg}
        </div>
      ) : testResult ? (
        <div className="space-y-6">
          {/* Decision Banner */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${
              testResult.rejectNull
                ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-950/20'
                : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              {testResult.rejectNull ? (
                <CheckCircle2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <XCircle className="h-6 w-6 text-slate-400" />
              )}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Decision: {testResult.rejectNull ? 'REJECT H₀ (STATISTICALLY SIGNIFICANT)' : 'FAIL TO REJECT H₀ (NOT SIGNIFICANT)'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  {testResult.conclusion}
                </p>
              </div>
            </div>

            <div className="flex gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500">{testResult.statisticName}:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {testResult.statisticValue.toFixed(3)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">p-Value:</span>
                <p className={`font-bold ${testResult.rejectNull ? 'text-indigo-600' : 'text-slate-700'}`}>
                  {testResult.pValue.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* Group Summaries & Intervals */}
          {testResult.groupSummaries && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider dark:text-slate-200">
                  Sample Group Statistics & 95% Confidence Intervals
                </h4>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-2.5 px-4">Group / Factor</th>
                    <th className="py-2.5 px-4 text-center">N</th>
                    <th className="py-2.5 px-4 text-right">Mean</th>
                    <th className="py-2.5 px-4 text-right">Std Dev</th>
                    <th className="py-2.5 px-4 text-right">95% Confidence Interval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {testResult.groupSummaries.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900 dark:text-white">
                        {g.group}
                      </td>
                      <td className="py-2.5 px-4 text-center">{g.n}</td>
                      <td className="py-2.5 px-4 text-right">{g.mean.toFixed(3)}</td>
                      <td className="py-2.5 px-4 text-right">{g.stdDev.toFixed(3)}</td>
                      <td className="py-2.5 px-4 text-right text-blue-600 dark:text-blue-400">
                        [{g.ci95[0].toFixed(3)}, {g.ci95[1].toFixed(3)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
