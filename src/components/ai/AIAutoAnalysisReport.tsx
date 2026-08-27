import React, { useState, useEffect } from 'react';
import { AIAutoAnalysisReport as ReportType } from '../../types/ai';
import { Dataset, SpcCalculationResult } from '../../types/spc';
import { CapabilityResult } from '../../types/statistics';
import { requestAutoAnalysis } from '../../services/aiService';
import { Sparkles, Printer, FileDown, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { exportAnalysisReportJSON, printExecutiveReport } from '../../utils/exportUtils';

interface AIAutoAnalysisReportProps {
  dataset: Dataset;
  spcResult?: SpcCalculationResult;
  capability?: CapabilityResult;
}

export const AIAutoAnalysisReport: React.FC<AIAutoAnalysisReportProps> = ({
  dataset,
  spcResult,
  capability,
}) => {
  const [report, setReport] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const payload = {
        datasetSummary: {
          name: dataset.name,
          rowCount: dataset.rowCount,
          columnCount: dataset.columns.length,
          columns: dataset.columns.map((c) => ({ name: c.name, type: c.type })),
          metadata: dataset.metadata,
        },
        spc: spcResult
          ? {
              chartType: spcResult.chartType,
              columnName: spcResult.columnName,
              n: spcResult.n,
              mean: spcResult.mean,
              sigma: spcResult.sigmaWithin,
              ucl: spcResult.primaryChart.ucl,
              lcl: spcResult.primaryChart.lcl,
              status: spcResult.status,
            }
          : undefined,
        violations: spcResult?.ruleViolations || [],
        capability: capability
          ? {
              cp: capability.cp,
              cpk: capability.cpk,
              pp: capability.pp,
              ppk: capability.ppk,
              ppm: capability.expectedPpmTotal,
              status: capability.status,
              interpretation: capability.interpretation,
            }
          : undefined,
      };

      const res = await requestAutoAnalysis(payload);
      setReport(res);
    } catch (e) {
      console.error('Failed to generate auto analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [dataset.id, spcResult?.columnName]);

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Executive AI Quality & SPC Audit Report
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dataset: <strong className="text-slate-700 dark:text-slate-300">{dataset.name}</strong> | Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-Analyze
          </button>
          <button
            onClick={() => exportAnalysisReportJSON({ dataset, spcResult, capability, report })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FileDown className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            onClick={printExecutiveReport}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Synthesizing Comprehensive SPC Assessment</h4>
          <p className="text-xs text-slate-500 mt-1">Cross-referencing Nelson rules, process capability indices, and variance components...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Executive Priority Banner */}
          <div
            className={`rounded-xl border p-5 ${
              report.overallStatus === 'IN_CONTROL'
                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                : 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {report.overallStatus === 'IN_CONTROL' ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                )}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Overall Quality Posture: {report.overallStatus.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Intervention Priority Level:{' '}
                    <strong className={report.priority === 'HIGH' ? 'text-rose-600' : 'text-emerald-600'}>
                      {report.priority}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Findings Grid */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white mb-3">
              Key Diagnostic Findings & Evidence
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.keyFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {finding}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assessments: SPC & Capability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white mb-2">
                Statistical Process Control Assessment
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.spcAssessment}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white mb-2">
                Process Capability & Specification Compliance
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.capabilityAssessment}
              </p>
            </div>
          </div>

          {/* Recommended Operational Action Plan */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white mb-3">
              Strategic Recommendations for Process Owners
            </h4>
            <ol className="space-y-2 pl-4 list-decimal text-xs text-slate-700 dark:text-slate-300">
              {report.recommendedActions.map((action, idx) => (
                <li key={idx} className="leading-relaxed font-medium">
                  {action}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
};
