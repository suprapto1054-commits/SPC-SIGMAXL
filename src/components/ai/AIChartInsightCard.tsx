import React, { useState, useEffect } from 'react';
import { AIChartInsight } from '../../types/ai';
import { SpcCalculationResult } from '../../types/spc';
import { requestChartAnalysis } from '../../services/aiService';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, User, HardHat, Briefcase } from 'lucide-react';

interface AIChartInsightCardProps {
  result: SpcCalculationResult;
  capability?: any;
  datasetName?: string;
}

export const AIChartInsightCard: React.FC<AIChartInsightCardProps> = ({
  result,
  capability,
  datasetName,
}) => {
  const [insight, setInsight] = useState<AIChartInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [audienceLevel, setAudienceLevel] = useState<'basic' | 'professional' | 'executive'>('professional');

  const fetchInsight = async () => {
    setLoading(true);
    try {
      const payload = {
        chartType: result.chartType,
        columnName: result.columnName,
        datasetName,
        n: result.n,
        mean: result.mean,
        sigma: result.sigmaWithin,
        sigmaOverall: result.sigmaOverall,
        ucl: result.primaryChart.ucl,
        cl: result.primaryChart.cl,
        lcl: result.primaryChart.lcl,
        status: result.status,
        ruleViolations: result.ruleViolations.map((v) => ({
          rule: v.rule,
          point: v.point,
          value: v.value,
          sigmaPosition: v.sigmaPosition,
        })),
        capability: capability
          ? {
              cp: capability.cp,
              cpk: capability.cpk,
              pp: capability.pp,
              ppk: capability.ppk,
              ppm: capability.expectedPpmTotal,
            }
          : undefined,
      };

      const data = await requestChartAnalysis(payload);
      setInsight(data);
    } catch (e) {
      console.error('Failed to get AI insight:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [result.chartType, result.columnName, result.n, result.ruleViolations.length]);

  return (
    <div className="rounded border border-slate-800 bg-[#020617] p-3.5 shadow-xs font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-sky-500/40 bg-sky-500/10 text-sky-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                SPC AI ANALYST // STATISTICAL INFERENCE
              </h3>
              {insight?.source === 'gemini' && (
                <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-bold text-purple-400">
                  GEMINI_FLASH
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Automated Root Cause Diagnostics & Statistical Evidence
            </p>
          </div>
        </div>

        {/* Audience Level Selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-slate-800 bg-slate-900/90 p-0.5 text-[10px]">
            <button
              onClick={() => setAudienceLevel('basic')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-bold transition-colors ${
                audienceLevel === 'basic'
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Operator / Floor Level"
            >
              <User className="w-2.5 h-2.5" />
              OPERATOR
            </button>
            <button
              onClick={() => setAudienceLevel('professional')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-bold transition-colors ${
                audienceLevel === 'professional'
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Quality / Process Engineer Level"
            >
              <HardHat className="w-2.5 h-2.5" />
              ENGINEER
            </button>
            <button
              onClick={() => setAudienceLevel('executive')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-bold transition-colors ${
                audienceLevel === 'executive'
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Management / Executive Level"
            >
              <Briefcase className="w-2.5 h-2.5" />
              EXECUTIVE
            </button>
          </div>

          <button
            onClick={fetchInsight}
            disabled={loading}
            className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900/90 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
            RECALC
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-sky-400 mb-2" />
          <p className="text-[10px] uppercase tracking-wider">Analyzing statistical distribution and Nelson rules...</p>
        </div>
      ) : insight ? (
        <div className="mt-3 space-y-2.5 text-xs">
          {/* Executive & Tone Banner */}
          <div className="rounded border border-sky-500/30 bg-sky-950/20 p-2.5">
            <span className="font-bold text-sky-400 uppercase tracking-widest text-[10px]">
              {audienceLevel === 'basic' ? 'OPERATOR SUMMARY' : audienceLevel === 'executive' ? 'EXECUTIVE BRIEFING' : 'ENGINEERING DIAGNOSTIC SUMMARY'}
            </span>
            <p className="mt-1 text-slate-200 leading-relaxed font-sans text-xs">
              {insight.levels?.[audienceLevel] || insight.executiveSummary}
            </p>
          </div>

          {/* Structured Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Statistical & SPC Finding */}
            <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[10px] mb-1">
                STATISTICAL & CONTROL EVIDENCE
              </h4>
              <p className="text-slate-400 font-sans text-xs leading-relaxed">
                {insight.statisticalFinding} {insight.spcFinding}
              </p>
            </div>

            {/* Special Causes & Patterns */}
            <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[10px] mb-1">
                SPECIAL CAUSES & PATTERNS
              </h4>
              <p className="text-slate-400 font-sans text-xs leading-relaxed">
                {insight.specialCauses} <strong className="text-slate-200">Pattern:</strong> {insight.pattern}
              </p>
            </div>
          </div>

          {/* Potential Causes (Hypotheses) */}
          {insight.possibleCauses && insight.possibleCauses.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
                  POTENTIAL CAUSES TO INVESTIGATE (HYPOTHESES)
                </h4>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-4 list-disc text-slate-300 font-sans text-xs">
                {insight.possibleCauses.map((cause, idx) => (
                  <li key={idx} className="leading-snug">
                    {cause}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[9px] text-amber-400/80 italic font-mono">
                * Note: AI generates plausible hypotheses based on SPC signal patterns. Verification through shop-floor inspection is required.
              </p>
            </div>
          )}

          {/* Recommended Investigation Steps */}
          {insight.recommendedActions && insight.recommendedActions.length > 0 && (
            <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">
                  RECOMMENDED ACTION PLAN
                </h4>
              </div>
              <ol className="space-y-1 pl-4 list-decimal text-slate-300 font-sans text-xs">
                {insight.recommendedActions.map((action, idx) => (
                  <li key={idx} className="leading-snug">
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
