import React, { useState } from 'react';
import { AIRootCauseResult } from '../../types/ai';
import { SpcCalculationResult, Dataset } from '../../types/spc';
import { requestRootCauseAnalysis } from '../../services/aiService';
import { Sparkles, GitPullRequest, CheckSquare, Layers, Wrench, RefreshCw } from 'lucide-react';

interface AIRootCauseAssistantProps {
  currentDataset?: Dataset;
  spcResult?: SpcCalculationResult;
}

export const AIRootCauseAssistant: React.FC<AIRootCauseAssistantProps> = ({
  currentDataset,
  spcResult,
}) => {
  const initialProblem = spcResult?.ruleViolations && spcResult.ruleViolations.length > 0
    ? `Process ${spcResult.chartType} chart detected ${spcResult.ruleViolations.length} special cause rule violations (${spcResult.ruleViolations[0].rule}: ${spcResult.ruleViolations[0].ruleName} at point #${spcResult.ruleViolations[0].point}).`
    : `Quality parameter excursion on ${currentDataset?.name || 'active production line'}.`;

  const [problemStatement, setProblemStatement] = useState(initialProblem);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIRootCauseResult | null>(null);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const payload = {
        problemStatement,
        signalEvidence: {
          chartType: spcResult?.chartType,
          mean: spcResult?.mean,
          sigma: spcResult?.sigmaWithin,
          violations: spcResult?.ruleViolations,
        },
        equipmentContext: currentDataset?.metadata || {},
        processParameters: {
          dataset: currentDataset?.name,
          column: spcResult?.columnName,
          rowCount: currentDataset?.rowCount,
        },
      };

      const result = await requestRootCauseAnalysis(payload);
      setAnalysis(result);
      setCheckedActions({});
    } catch (e) {
      console.error('Failed to run root cause analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <GitPullRequest className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI Root Cause & Problem-Solving Studio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive 5-Why Investigation & 6M Ishikawa Fishbone Analysis
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider dark:text-slate-300">
              Problem Statement / SPC Anomaly
            </label>
            <input
              type="text"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Describe the failure mode, out-of-control point, or quality shift..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {currentDataset?.metadata?.equipment && (
                <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  Tool: <strong>{currentDataset.metadata.equipment}</strong>
                </span>
              )}
              {currentDataset?.metadata?.process && (
                <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  Process: <strong>{currentDataset.metadata.process}</strong>
                </span>
              )}
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading || !problemStatement.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate 5-Why & 6M Fishbone
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results View */}
      {analysis && (
        <div className="space-y-6">
          {/* 5-Why Deep Dive */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                5-Why Causal Pathway
              </h4>
            </div>

            <div className="mt-4 space-y-3">
              {analysis.fiveWhy.map((step) => (
                <div
                  key={step.level}
                  className="relative flex gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
                    {step.level}
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {step.why}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      ↳ <strong className="text-slate-900 dark:text-white">Answer:</strong> {step.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6M Ishikawa Fishbone Diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Wrench className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                6M Ishikawa Cause-and-Effect Matrix
              </h4>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Man */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  👤 Man / Operator
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.man.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Machine */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  ⚙️ Machine / Equipment
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.machine.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Method */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  📋 Method / Process SOP
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.method.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Material */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  📦 Material / Raw Stock
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.material.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Measurement */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  📐 Measurement / Gauge R&R
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.measurement.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Milieu / Environment */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                  🌡️ Milieu / Environment
                </span>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                  {analysis.fishbone.environment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Verification & Action Checklist */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 border-b border-emerald-100 pb-3 dark:border-emerald-900/40">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider dark:text-emerald-300">
                On-Floor Verification & Containment Checklist
              </h4>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {analysis.verificationActions.map((action, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2.5 rounded-lg border border-emerald-100 bg-white p-3 cursor-pointer transition-colors hover:bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedActions[idx]}
                    onChange={() => toggleAction(idx)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`text-slate-800 dark:text-slate-200 ${checkedActions[idx] ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {action}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
