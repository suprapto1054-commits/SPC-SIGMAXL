import React, { useState, useMemo } from 'react';
import { Dataset } from '../../types/spc';
import {
  generateComprehensiveAdvisorAnalysis,
  ChartRecommendation,
  ComprehensiveAdvisorAnalysis,
} from '../../engine/chartAdvisorEngine';
import {
  RANDOM_DATASET_PRESETS,
  parseArbitraryRawData,
  randomGaussian,
} from '../../engine/randomDataGenerators';
import { calculateSpcChart } from '../../engine/spcEngine';
import {
  Sparkles,
  Shuffle,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart2,
  LineChart,
  PieChart,
  Layers,
  HelpCircle,
  Download,
  Copy,
  Check,
  Zap,
  Activity,
  Cpu,
  Table,
  Upload,
  Search,
  ExternalLink,
  Flame,
  Scale,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';

interface SmartChartAdvisorViewProps {
  dataset: Dataset;
  onSelectDataset: (newDataset: Dataset) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const SmartChartAdvisorView: React.FC<SmartChartAdvisorViewProps> = ({
  dataset,
  onSelectDataset,
  onNavigateToTab,
}) => {
  const [activeDataset, setActiveDataset] = useState<Dataset>(dataset);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [isRawPasteOpen, setIsRawPasteOpen] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [rawDatasetTitle, setRawDatasetTitle] = useState('My Arbitrary Dataset');
  const [rawParseError, setRawParseError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync if prop changes externally
  React.useEffect(() => {
    setActiveDataset(dataset);
  }, [dataset]);

  // Generate complete profile, recommendations, and deep automated analysis
  const analysis: ComprehensiveAdvisorAnalysis = useMemo(() => {
    return generateComprehensiveAdvisorAnalysis(activeDataset);
  }, [activeDataset]);

  // Set default selected recommendation to top recommendation
  const currentSelectedRecommendation = useMemo(() => {
    if (selectedChartId) {
      return analysis.recommendations.find((r) => r.chartId === selectedChartId) || analysis.topRecommendation;
    }
    return analysis.topRecommendation;
  }, [selectedChartId, analysis]);

  // Handler to load a random dataset preset
  const handleLoadRandomPreset = (presetId: string) => {
    const preset = RANDOM_DATASET_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const generated = preset.generate();
      setActiveDataset(generated);
      onSelectDataset(generated);
      setSelectedChartId(null);
    }
  };

  // Handler to mutate/randomize active dataset slightly (inject random process noise or shift)
  const handleMutateRandomNoise = () => {
    const mutatedCols = activeDataset.columns.map((col) => {
      if (col.type === 'numeric') {
        const numVals = col.values.map((v) => {
          if (typeof v === 'number') {
            const noise = randomGaussian(0, Math.abs(v) * 0.04 || 0.5);
            return parseFloat((v + noise).toFixed(2));
          }
          return v;
        });
        return { ...col, values: numVals };
      }
      return col;
    });

    const mutatedDataset: Dataset = {
      ...activeDataset,
      id: `mutated-${Date.now()}`,
      name: `${activeDataset.name.replace(/\s\(Randomized\)/, '')} (Randomized)`,
      columns: mutatedCols,
    };

    setActiveDataset(mutatedDataset);
    onSelectDataset(mutatedDataset);
  };

  // Handler to parse arbitrary raw pasted text
  const handleParseRawText = () => {
    setRawParseError(null);
    const res = parseArbitraryRawData(rawPastedText, rawDatasetTitle || 'Pasted Arbitrary Dataset');
    if (res.error || !res.dataset) {
      setRawParseError(res.error || 'Failed to parse text. Please check format.');
      return;
    }

    setActiveDataset(res.dataset);
    onSelectDataset(res.dataset);
    setIsRawPasteOpen(false);
    setRawPastedText('');
    setSelectedChartId(null);
  };

  // Export analysis summary as JSON / formatted text
  const handleExportAnalysisReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      dataset: {
        id: activeDataset.id,
        name: activeDataset.name,
        rowCount: activeDataset.rowCount,
        columns: activeDataset.columns.map((c) => ({ name: c.name, type: c.type })),
      },
      processHealth: analysis.processHealthStatus,
      stabilityScore: analysis.stabilityScore,
      topRecommendation: {
        chart: analysis.topRecommendation.title,
        confidence: `${analysis.topRecommendation.confidence}%`,
        reason: analysis.topRecommendation.why,
      },
      allRecommendations: analysis.recommendations.map((r) => ({
        chart: r.title,
        confidence: `${r.confidence}%`,
        category: r.category,
      })),
      spcMetrics: analysis.spcMetrics,
      capabilityMetrics: analysis.capabilityMetrics,
      normalityMetrics: analysis.normalityMetrics,
      correlationInsights: analysis.correlationInsights,
      paretoInsights: analysis.paretoInsights,
      actionableEngineeringSteps: analysis.actionableEngineeringSteps,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Smart_Chart_Advisor_Report_${activeDataset.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER: SMART ADVISOR BANNER */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 px-3 py-0.5 text-xs font-mono font-bold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                AI STATISTICAL ENGINE & CHART ADVISOR
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300">
                ISO 7870 / AIAG SPC COMPLIANT
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
              Smart Chart Recommender & Random Data Analyzer
            </h1>
            <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
              Inject arbitrary or random datasets with any column structure. The advisor automatically profiles data types, distribution normality, subgroup sizes, and correlation patterns to recommend the optimal chart and generate comprehensive diagnostic insights.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsRawPasteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-400/50 bg-indigo-900/60 px-3.5 py-2 text-xs font-mono font-bold text-indigo-100 hover:bg-indigo-800 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-indigo-300" />
              <span>PASTE ARBITRARY RAW DATA</span>
            </button>

            <button
              onClick={handleMutateRandomNoise}
              className="flex items-center gap-1.5 rounded-lg border border-blue-400/50 bg-blue-900/60 px-3.5 py-2 text-xs font-mono font-bold text-blue-100 hover:bg-blue-800 transition-colors shadow-sm"
              title="Add random process noise & outliers to current dataset"
            >
              <Shuffle className="w-4 h-4 text-blue-300" />
              <span>RANDOMIZE NOISE</span>
            </button>

            <button
              onClick={handleExportAnalysisReport}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-indigo-500 transition-colors shadow-md"
            >
              {copiedNotification ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4 text-white" />}
              <span>{copiedNotification ? 'EXPORTED!' : 'EXPORT REPORT (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* RANDOM DATASET PRESET CAROUSEL / BUTTONS */}
        <div className="mt-6 border-t border-indigo-800/60 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              GENERATE RANDOM INDUSTRIAL PRESET (1-CLICK):
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Active: <strong className="text-indigo-200">{activeDataset.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            {RANDOM_DATASET_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleLoadRandomPreset(preset.id)}
                className="flex flex-col items-start p-2.5 rounded-lg bg-slate-900/80 border border-indigo-900/70 hover:border-indigo-400 hover:bg-indigo-950/80 text-left transition-all group cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-300 truncate w-full">
                  {preset.name.split(' (')[0]}
                </span>
                <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                  {preset.category.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RAW DATA PASTE MODAL / DRAWER */}
      {isRawPasteOpen && (
        <div className="rounded-xl border border-indigo-300 bg-white p-5 shadow-lg dark:border-indigo-900 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Paste Any Arbitrary / Random Raw Data (CSV, TSV, JSON, Whitespace Delimited)
              </h3>
            </div>
            <button
              onClick={() => setIsRawPasteOpen(false)}
              className="text-xs font-mono text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              Cancel / Close ✕
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dataset Name:
              </label>
              <input
                type="text"
                value={rawDatasetTitle}
                onChange={(e) => setRawDatasetTitle(e.target.value)}
                placeholder="e.g. Custom Line 4 Telemetry"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Paste Raw Tabular Data or Multi-Column Numbers:
              </label>
              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                rows={6}
                placeholder={`Example CSV or TSV:
Sample_ID,Cavity_Pressure,Mold_Temp,Defects,Shift
1, 102.4, 65.2, 0, Shift_A
2, 103.1, 65.8, 1, Shift_A
3, 101.9, 64.9, 0, Shift_B
... or simply paste rows of numbers separated by spaces/tabs`}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {rawParseError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rawParseError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRawPastedText(`Sample_No,Pressure_Bar,Spindle_RPM,Defective_Count,Batch_Lot\n1, 45.2, 1820, 2, Lot_A\n2, 45.8, 1835, 1, Lot_A\n3, 46.1, 1840, 3, Lot_B\n4, 44.9, 1810, 0, Lot_B\n5, 45.4, 1825, 1, Lot_C\n6, 45.6, 1830, 2, Lot_C\n7, 46.3, 1850, 4, Lot_D\n8, 45.1, 1815, 1, Lot_D`);
                }}
                className="text-xs font-mono text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Insert Sample Data
              </button>
              <button
                onClick={handleParseRawText}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold font-mono text-white hover:bg-indigo-500 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>PARSE & ANALYZE DATASET</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP METRIC CARDS: DATA PROFILE & PROCESS HEALTH SNAPSHOT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="PRIMARY RECOMMENDED CHART"
          value={analysis.topRecommendation.title.split(' (')[0]}
          subtitle={`Match Score: ${analysis.topRecommendation.confidence}%`}
          badge={analysis.topRecommendation.level === 'PRIMARY_RECOMMENDATION' ? 'BEST MATCH' : 'SUITABLE'}
          badgeColor="bg-indigo-500/20 text-indigo-600 border border-indigo-400 dark:text-indigo-300"
          icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
        />

        <MetricCard
          title="PROCESS STABILITY SCORE"
          value={`${analysis.stabilityScore} / 100`}
          subtitle={
            analysis.processHealthStatus === 'HEALTHY_IN_CONTROL'
              ? 'In Statistical Control (0 Violations)'
              : analysis.processHealthStatus === 'WARNING_SPECIAL_CAUSES'
              ? 'Warning: Special Causes Detected'
              : 'Critical: Significant Instability'
          }
          status={
            analysis.stabilityScore >= 90
              ? 'good'
              : analysis.stabilityScore >= 70
              ? 'warning'
              : 'critical'
          }
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
        />

        <MetricCard
          title="DISTRIBUTION NORMALITY"
          value={analysis.normalityMetrics?.isNormal ? 'Gaussian Normal' : 'Non-Normal / Skewed'}
          subtitle={
            analysis.normalityMetrics
              ? `A-D p = ${analysis.normalityMetrics.pValue.toFixed(3)} | Skew = ${analysis.normalityMetrics.skewness.toFixed(2)}`
              : 'Evaluating shape...'
          }
          badge={analysis.normalityMetrics?.isNormal ? 'PASS p>0.05' : 'ATTENTION'}
          badgeColor={
            analysis.normalityMetrics?.isNormal
              ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-400 dark:text-emerald-300'
              : 'bg-amber-500/20 text-amber-600 border border-amber-400 dark:text-amber-300'
          }
          icon={<Scale className="w-5 h-5 text-blue-500" />}
        />

        <MetricCard
          title="DATASET PROFILING"
          value={`${analysis.profile.rowCount} Rows`}
          subtitle={`${analysis.profile.numericColumnCount} Numeric • ${analysis.profile.categoricalColumnCount} Categorical`}
          badge={analysis.profile.detectedSubgroupSize && analysis.profile.detectedSubgroupSize > 1 ? `Subgroup n=${analysis.profile.detectedSubgroupSize}` : 'Individuals n=1'}
          badgeColor="bg-slate-500/20 text-slate-700 border border-slate-400 dark:text-slate-300"
          icon={<Layers className="w-5 h-5 text-slate-500" />}
        />
      </div>

      {/* SECTION: RANKED CHART RECOMMENDATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">
              Intelligent Chart Recommendations (Ranked by Statistical Match)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {analysis.recommendations.length} Suitable Visualizations Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {analysis.recommendations.map((rec, idx) => {
            const isSelected = rec.chartId === currentSelectedRecommendation.chartId;

            return (
              <div
                key={rec.chartId}
                onClick={() => setSelectedChartId(rec.chartId)}
                className={`relative flex flex-col justify-between rounded-xl border p-4.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-400'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                }`}
              >
                {/* Header Badge & Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      <span>#{idx + 1}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {rec.category}
                      </span>
                    </span>

                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                        rec.level === 'PRIMARY_RECOMMENDATION'
                          ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/40 dark:text-emerald-300'
                          : rec.confidence >= 80
                          ? 'bg-indigo-500/20 text-indigo-700 border border-indigo-500/40 dark:text-indigo-300'
                          : 'bg-slate-500/20 text-slate-700 border border-slate-500/30 dark:text-slate-300'
                      }`}
                    >
                      {rec.level === 'PRIMARY_RECOMMENDATION' && <Sparkles className="w-3 h-3 text-amber-500 animate-bounce" />}
                      <span>{rec.confidence}% Match</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {rec.why}
                  </p>
                </div>

                {/* Criteria Satisfied Badges */}
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="space-y-1">
                    {rec.statisticalCriteriaMet.slice(0, 2).map((crit, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{crit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChartId(rec.chartId);
                      }}
                      className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isSelected ? '● Active Preview' : '○ Select Preview'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToTab(rec.targetModuleTab);
                      }}
                      className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-mono font-bold text-white hover:bg-indigo-500 transition-colors shadow-2xs"
                    >
                      <span>Open Module</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: LIVE INTERACTIVE PREVIEW OF THE SELECTED RECOMMENDED CHART */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                ACTIVE PREVIEW
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {currentSelectedRecommendation.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentSelectedRecommendation.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab(currentSelectedRecommendation.targetModuleTab)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-mono font-bold text-white hover:bg-indigo-500 shadow-xs"
            >
              <span>SWITCH TO FULL {currentSelectedRecommendation.title.split(' (')[0].toUpperCase()} VIEW</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Embedded Interactive Visualizer for the Selected Chart */}
        <InteractiveChartVisualizer
          dataset={activeDataset}
          recommendation={currentSelectedRecommendation}
          analysis={analysis}
        />
      </div>

      {/* SECTION: COMPREHENSIVE AUTOMATED ANALYSIS & ENGINEERING DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: PROCESS STABILITY & SPC METRICS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                Statistical Process Control (SPC) Diagnostic
              </h3>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                analysis.processHealthStatus === 'HEALTHY_IN_CONTROL'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {analysis.processHealthStatus.replace(/_/g, ' ')}
            </span>
          </div>

          {analysis.spcMetrics ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Center Line (CL)</div>
                  <div className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {analysis.spcMetrics.mean.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Upper Limit (UCL)</div>
                  <div className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    {analysis.spcMetrics.ucl.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Lower Limit (LCL)</div>
                  <div className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    {analysis.spcMetrics.lcl.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Within Sigma (σ)</div>
                  <div className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {analysis.spcMetrics.sigma.toFixed(3)}
                  </div>
                </div>
              </div>

              {analysis.spcMetrics.outOfControlPoints > 0 ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{analysis.spcMetrics.outOfControlPoints} Nelson Rule Violation(s) Detected:</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-rose-700 dark:text-rose-400">
                    {analysis.spcMetrics.violatedRules.slice(0, 3).map((rule, rIdx) => (
                      <li key={rIdx}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% of points conform to Nelson Tests 1-8. Process is in statistical control.</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Insufficient numeric data for SPC computation.</p>
          )}
        </div>

        {/* CARD 2: PROCESS CAPABILITY & DISTRIBUTION SHAPE */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                Capability & Distribution Assessment
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {analysis.capabilityMetrics?.assessment || 'Estimated Specs'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Process Potential (Cp)</div>
                <div className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {analysis.capabilityMetrics?.cp !== null && analysis.capabilityMetrics?.cp !== undefined
                    ? analysis.capabilityMetrics.cp.toFixed(2)
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Capability (Cpk)</div>
                <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {analysis.capabilityMetrics?.cpk !== null && analysis.capabilityMetrics?.cpk !== undefined
                    ? analysis.capabilityMetrics.cpk.toFixed(2)
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Performance (Ppk)</div>
                <div className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {analysis.capabilityMetrics?.ppk !== null && analysis.capabilityMetrics?.ppk !== undefined
                    ? analysis.capabilityMetrics.ppk.toFixed(2)
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Est. Defect PPM</div>
                <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  {analysis.capabilityMetrics?.ppm !== undefined ? analysis.capabilityMetrics.ppm.toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            {analysis.normalityMetrics && (
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Anderson-Darling Normality:</span>
                  <span className={`font-bold ${analysis.normalityMetrics.isNormal ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {analysis.normalityMetrics.isNormal ? 'Normal (p > 0.05)' : 'Non-Normal (p < 0.05)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {analysis.normalityMetrics.shapeDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: ACTIONABLE ENGINEERING RECOMMENDATIONS (DMAIC) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
              Actionable AI & Six Sigma DMAIC Engineering Recommendations
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {analysis.actionableEngineeringSteps.length} Priority Directives
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.actionableEngineeringSteps.map((step, sIdx) => (
            <div
              key={sIdx}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {step.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                      step.priority === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : step.priority === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {step.priority} PRIORITY
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive SVG / Line / Bar Visualizer for the recommended chart
 */
const InteractiveChartVisualizer: React.FC<{
  dataset: Dataset;
  recommendation: ChartRecommendation;
  analysis: ComprehensiveAdvisorAnalysis;
}> = ({ dataset, recommendation, analysis }) => {
  const primaryColName = recommendation.suggestedColumns.primary || dataset.columns.find((c) => c.type === 'numeric')?.name || '';
  const numVals = (dataset.columns.find((c) => c.name === primaryColName)?.values || []).filter(
    (v) => typeof v === 'number' && !isNaN(v) && isFinite(v)
  ) as number[];

  const width = 840;
  const height = 280;
  const margin = { top: 25, right: 35, bottom: 35, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Render based on chart type
  if (recommendation.chartId === 'pareto' && analysis.paretoInsights) {
    const topCauses = analysis.paretoInsights.topCauses;
    const maxCount = Math.max(...topCauses.map((c) => c.count)) * 1.15 || 10;
    const barWidth = Math.min(60, innerWidth / (topCauses.length * 1.5));

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[320px] select-none font-mono">
          <rect width={width} height={height} fill="transparent" />
          
          {/* Left Y Axis (Count) */}
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#64748b" strokeWidth="1" />
          <text x={margin.left - 38} y={margin.top + innerHeight / 2} fill="#64748b" fontSize="10" transform={`rotate(-90 ${margin.left - 38} ${margin.top + innerHeight / 2})`} textAnchor="middle">
            Defect Count
          </text>

          {/* Right Y Axis (Cumulative %) */}
          <line x1={margin.left + innerWidth} y1={margin.top} x2={margin.left + innerWidth} y2={margin.top + innerHeight} stroke="#64748b" strokeWidth="1" />
          <text x={margin.left + innerWidth + 30} y={margin.top + innerHeight / 2} fill="#e11d48" fontSize="10" transform={`rotate(90 ${margin.left + innerWidth + 30} ${margin.top + innerHeight / 2})`} textAnchor="middle">
            Cumulative %
          </text>

          {/* 80% Cutoff Reference Line */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight * (1 - 0.8)}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight * (1 - 0.8)}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text x={margin.left + 5} y={margin.top + innerHeight * (1 - 0.8) - 4} fill="#f59e0b" fontSize="10" fontWeight="bold">
            80% Pareto Cutoff (Vital Few)
          </text>

          {/* Bars & Line */}
          {topCauses.map((cause, i) => {
            const x = margin.left + (i + 0.5) * (innerWidth / topCauses.length) - barWidth / 2;
            const barH = (cause.count / maxCount) * innerHeight;
            const y = margin.top + innerHeight - barH;
            const isVital = cause.cumPct <= 85;

            return (
              <g key={i}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={isVital ? '#4f46e5' : '#94a3b8'}
                  rx="3"
                  className="hover:opacity-80 transition-opacity"
                />
                <text x={x + barWidth / 2} y={y - 4} fill={isVital ? '#4f46e5' : '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle">
                  {cause.count}
                </text>

                {/* X Label */}
                <text x={x + barWidth / 2} y={margin.top + innerHeight + 16} fill="#64748b" fontSize="9" textAnchor="middle">
                  {cause.category.slice(0, 12)}
                </text>
              </g>
            );
          })}

          {/* Cumulative % Polyline */}
          <path
            d={topCauses
              .map((c, i) => {
                const px = margin.left + (i + 0.5) * (innerWidth / topCauses.length);
                const py = margin.top + innerHeight - (c.cumPct / 100) * innerHeight;
                return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
              })
              .join(' ')}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2"
          />

          {/* Cumulative Points */}
          {topCauses.map((c, i) => {
            const px = margin.left + (i + 0.5) * (innerWidth / topCauses.length);
            const py = margin.top + innerHeight - (c.cumPct / 100) * innerHeight;
            return (
              <g key={i}>
                <circle cx={px} cy={py} r="4" fill="#e11d48" stroke="#fff" strokeWidth="1.5" />
                <text x={px} y={py - 7} fill="#e11d48" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {c.cumPct.toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Default: Control Chart / Time Series Preview (I-MR, Xbar, Capability, etc.)
  if (numVals.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400 font-mono">
        No numeric series available to render preview.
      </div>
    );
  }

  const mean = numVals.reduce((a, b) => a + b, 0) / numVals.length;
  let variance = 0;
  numVals.forEach((v) => (variance += Math.pow(v - mean, 2)));
  const std = Math.sqrt(variance / (numVals.length - 1 || 1));
  const ucl = mean + 3 * std;
  const lcl = mean - 3 * std;

  const minVal = Math.min(...numVals, lcl) * 0.98;
  const maxVal = Math.max(...numVals, ucl) * 1.02;

  const scaleX = (idx: number) => margin.left + (idx / (numVals.length - 1 || 1)) * innerWidth;
  const scaleY = (val: number) => margin.top + innerHeight - ((val - minVal) / (maxVal - minVal || 1)) * innerHeight;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[320px] select-none font-mono">
        <rect width={width} height={height} fill="transparent" />

        {/* Shaded Control Zone (+-3 Sigma) */}
        <rect
          x={margin.left}
          y={scaleY(ucl)}
          width={innerWidth}
          height={Math.abs(scaleY(lcl) - scaleY(ucl))}
          fill="#3b82f6"
          fillOpacity="0.05"
        />

        {/* Center Line (CL) */}
        <line x1={margin.left} y1={scaleY(mean)} x2={margin.left + innerWidth} y2={scaleY(mean)} stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x={margin.left + innerWidth + 4} y={scaleY(mean) + 3} fill="#10b981" fontSize="9" fontWeight="bold">
          CL: {mean.toFixed(2)}
        </text>

        {/* Upper Control Limit (UCL) */}
        <line x1={margin.left} y1={scaleY(ucl)} x2={margin.left + innerWidth} y2={scaleY(ucl)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x={margin.left + innerWidth + 4} y={scaleY(ucl) + 3} fill="#ef4444" fontSize="9" fontWeight="bold">
          UCL: {ucl.toFixed(2)}
        </text>

        {/* Lower Control Limit (LCL) */}
        <line x1={margin.left} y1={scaleY(lcl)} x2={margin.left + innerWidth} y2={scaleY(lcl)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x={margin.left + innerWidth + 4} y={scaleY(lcl) + 3} fill="#ef4444" fontSize="9" fontWeight="bold">
          LCL: {lcl.toFixed(2)}
        </text>

        {/* Data Line */}
        <path
          d={numVals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ')}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
        />

        {/* Data Points */}
        {numVals.map((v, i) => {
          const isOut = v > ucl || v < lcl;
          return (
            <g key={i}>
              <circle
                cx={scaleX(i)}
                cy={scaleY(v)}
                r={isOut ? '5' : '3.5'}
                fill={isOut ? '#ef4444' : '#4f46e5'}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="hover:scale-125 transition-transform"
              />
              {isOut && (
                <text x={scaleX(i)} y={scaleY(v) - 8} fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">
                  OUT
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={margin.left} y1={margin.top + innerHeight} x2={margin.left + innerWidth} y2={margin.top + innerHeight} stroke="#64748b" strokeWidth="1" />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke="#64748b" strokeWidth="1" />

        <text x={margin.left + innerWidth / 2} y={margin.top + innerHeight + 25} fill="#64748b" fontSize="10" textAnchor="middle">
          Observation Sequence / Subgroup Index (N = {numVals.length})
        </text>
        <text x={margin.left - 40} y={margin.top + innerHeight / 2} fill="#64748b" fontSize="10" transform={`rotate(-90 ${margin.left - 40} ${margin.top + innerHeight / 2})`} textAnchor="middle">
          {primaryColName}
        </text>
      </svg>
    </div>
  );
};
