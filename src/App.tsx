import React, { useState, useMemo } from 'react';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { Dataset, SpecificationLimits, SpcChartType, SpcCalculationResult } from './types/spc';
import { calculateSpcChart } from './engine/spcEngine';
import { calculateProcessCapability } from './engine/capabilityEngine';
import { CapabilityResult } from './types/statistics';

// Layout
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Views
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { EnergyMonitoringView } from './components/energy/EnergyMonitoringView';
import { ControlChartView } from './components/spc/ControlChartView';
import { TestRuleTable } from './components/spc/TestRuleTable';
import { CapabilityView } from './components/capability/CapabilityView';
import { MsaMainView } from './components/msa/MsaMainView';
import { DescriptiveStatsView } from './components/statistics/DescriptiveStatsView';
import { HistogramView } from './components/statistics/HistogramView';
import { ParetoView } from './components/statistics/ParetoView';
import { CorrelationRegressionView } from './components/statistics/CorrelationRegressionView';
import { NormalityView } from './components/statistics/NormalityView';
import { HypothesisTestView } from './components/statistics/HypothesisTestView';
import { AIChartInsightCard } from './components/ai/AIChartInsightCard';
import { AIRootCauseAssistant } from './components/ai/AIRootCauseAssistant';
import { AIAutoAnalysisReport } from './components/ai/AIAutoAnalysisReport';
import { AICopilotPanel } from './components/ai/AICopilotPanel';
import { DataTableView } from './components/data/DataTableView';
import { DataPreparationView } from './components/data/DataPreparationView';
import { DataImportModal } from './components/data/DataImportModal';

export function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(SAMPLE_DATASETS);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(SAMPLE_DATASETS[0].id);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  // Active dataset
  const currentDataset = useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || datasets[0];
  }, [datasets, activeDatasetId]);

  // Selected column for SPC
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');

  const activeColumnName = useMemo(() => {
    if (selectedColumnName && currentDataset.columns.some((c) => c.name === selectedColumnName)) {
      return selectedColumnName;
    }
    const firstNum = currentDataset.columns.find((c) => c.type === 'numeric');
    return firstNum ? firstNum.name : currentDataset.columns[0]?.name || '';
  }, [currentDataset, selectedColumnName]);

  const activeValues = useMemo(() => {
    const col = currentDataset.columns.find((c) => c.name === activeColumnName);
    return (col?.values || []).filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v)) as number[];
  }, [currentDataset, activeColumnName]);

  // Spec Limits for Capability
  const [customSpecs, setCustomSpecs] = useState<Record<string, SpecificationLimits>>({});
  const activeSpecs = customSpecs[`${currentDataset.id}_${activeColumnName}`];

  // Determine chart type based on active tab
  const activeChartType: SpcChartType = useMemo(() => {
    if (activeTab === 'spc-xbar-r') return 'Xbar-R';
    if (activeTab === 'spc-xbar-s') return 'Xbar-S';
    if (activeTab === 'spc-p') return 'p-Chart';
    if (activeTab === 'spc-c') return 'c-Chart';
    return 'I-MR';
  }, [activeTab]);

  // Calculate SPC
  const spcResult: SpcCalculationResult = useMemo(() => {
    const subgroupSize = activeChartType === 'Xbar-R' || activeChartType === 'Xbar-S' ? 5 : 1;
    return calculateSpcChart({
      values: activeValues,
      chartType: activeChartType,
      columnName: activeColumnName,
      subgroupSize,
      specificationLimits: activeSpecs,
    });
  }, [activeValues, activeChartType, activeColumnName, activeSpecs]);

  // Calculate Capability
  const capabilityResult: CapabilityResult = useMemo(() => {
    return calculateProcessCapability(activeValues, activeSpecs);
  }, [activeValues, activeSpecs]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleImportNewDataset = (newDataset: Dataset) => {
    // Check if the dataset is already present in the list
    const existing = datasets.find((d) => d.id === newDataset.id);
    if (existing) {
      setActiveDatasetId(newDataset.id);
      setSelectedColumnName('');
      return;
    }

    // Ensure unique ID if imported with a generic name
    const uniqueId = datasets.some((d) => d.id === newDataset.id)
      ? `${newDataset.id}-${Date.now()}`
      : newDataset.id;

    const datasetToAdd = { ...newDataset, id: uniqueId };
    setDatasets((prev) => [datasetToAdd, ...prev]);
    setActiveDatasetId(datasetToAdd.id);
    setSelectedColumnName('');
  };

  const handleUpdateDataset = (updated: Dataset) => {
    setDatasets((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleUpdateSpecLimits = (specs: SpecificationLimits) => {
    setCustomSpecs((prev) => ({
      ...prev,
      [`${currentDataset.id}_${activeColumnName}`]: specs,
    }));
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#050912] dark:text-slate-100 ${theme}`}>
      {/* Top Header */}
      <Header
        currentDataset={currentDataset}
        allDatasets={datasets}
        onSelectDataset={(ds) => {
          setActiveDatasetId(ds.id);
          setSelectedColumnName('');
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen((v) => !v)}
        spcResult={spcResult}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          violationsCount={spcResult.ruleViolations.length}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sub-Header Column Selector when applicable */}
          {['spc-imr', 'spc-xbar-r', 'spc-xbar-s', 'spc-p', 'spc-c', 'capability', 'descriptive', 'histogram', 'normality'].includes(activeTab) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Active Measurement Column:</span>
                <select
                  value={activeColumnName}
                  onChange={(e) => setSelectedColumnName(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-900 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {currentDataset.columns
                    .filter((c) => c.type === 'numeric')
                    .map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <span className="text-xs text-slate-400">
                {currentDataset.name} • {activeValues.length} observations
              </span>
            </div>
          )}

          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              dataset={currentDataset}
              spcResult={spcResult}
              capability={capabilityResult}
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* TAB 1.5: ENERGY & VALUE-ADD MONITORING */}
          {activeTab === 'energy-monitoring' && (
            <EnergyMonitoringView
              dataset={currentDataset}
              onNavigateToTab={setActiveTab}
              onSelectDataset={(ds) => setActiveDatasetId(ds.id)}
            />
          )}

          {/* TAB 2: SPC CONTROL CHARTS */}
          {['spc-imr', 'spc-xbar-r', 'spc-xbar-s', 'spc-p', 'spc-c'].includes(activeTab) && (
            <div className="space-y-6">
              {/* Primary Chart & AI Split View */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <ControlChartView
                    result={spcResult}
                    selectedPoint={selectedPoint}
                    onSelectPoint={setSelectedPoint}
                    metadata={currentDataset.metadata}
                  />
                </div>
                <div className="xl:col-span-1">
                  <AIChartInsightCard
                    result={spcResult}
                    capability={capabilityResult}
                    datasetName={currentDataset.name}
                  />
                </div>
              </div>

              {/* Nelson / Western Electric Rules Table */}
              <TestRuleTable
                ruleSummaries={spcResult.ruleSummaries}
                selectedPoint={selectedPoint}
                onSelectPoint={setSelectedPoint}
              />
            </div>
          )}

          {/* TAB 3: PROCESS CAPABILITY (Cp/Cpk) */}
          {activeTab === 'capability' && (
            <CapabilityView
              dataset={currentDataset}
              columnName={activeColumnName}
              initialSpecLimits={activeSpecs}
              onUpdateSpecLimits={handleUpdateSpecLimits}
            />
          )}

          {/* TAB 3.5: MEASUREMENT SYSTEM ANALYSIS (MSA & Gage R&R) */}
          {activeTab === 'msa' && (
            <MsaMainView />
          )}

          {/* TAB 4: DESCRIPTIVE STATISTICS */}
          {activeTab === 'descriptive' && (
            <DescriptiveStatsView
              values={activeValues}
              columnName={activeColumnName}
            />
          )}

          {/* TAB 5: HISTOGRAM & NORMAL FIT */}
          {activeTab === 'histogram' && (
            <HistogramView
              values={activeValues}
              columnName={activeColumnName}
            />
          )}

          {/* TAB 6: PARETO ANALYSIS */}
          {activeTab === 'pareto' && (
            <ParetoView dataset={currentDataset} />
          )}

          {/* TAB 7: CORRELATION & REGRESSION */}
          {activeTab === 'correlation' && (
            <CorrelationRegressionView dataset={currentDataset} />
          )}

          {/* TAB 8: NORMALITY TEST (ANDERSEN-DARLING) */}
          {activeTab === 'normality' && (
            <NormalityView
              values={activeValues}
              columnName={activeColumnName}
            />
          )}

          {/* TAB 9: HYPOTHESIS TESTING & ANOVA */}
          {activeTab === 'hypothesis' && (
            <HypothesisTestView dataset={currentDataset} />
          )}

          {/* TAB 10: AI EXECUTIVE AUDIT REPORT */}
          {activeTab === 'auto-analysis' && (
            <AIAutoAnalysisReport
              dataset={currentDataset}
              spcResult={spcResult}
              capability={capabilityResult}
            />
          )}

          {/* TAB 11: ROOT CAUSE 5-WHY & 6M FISHBONE */}
          {activeTab === 'root-cause' && (
            <AIRootCauseAssistant
              currentDataset={currentDataset}
              spcResult={spcResult}
            />
          )}

          {/* TAB 12: DATA TABLE SPREADSHEET */}
          {activeTab === 'data-table' && (
            <DataTableView
              dataset={currentDataset}
              onSelectColumnForSpc={(colName) => {
                setSelectedColumnName(colName);
                setActiveTab('spc-imr');
              }}
            />
          )}

          {/* TAB 13: DATA PREPARATION & TRANSFORMS */}
          {activeTab === 'data-prep' && (
            <DataPreparationView
              dataset={currentDataset}
              onUpdateDataset={handleUpdateDataset}
            />
          )}
        </main>
      </div>

      {/* AI Copilot Drawer */}
      <AICopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        currentContext={{
          datasetName: currentDataset.name,
          columnName: activeColumnName,
          rowCount: currentDataset.rowCount,
          status: spcResult.status,
          mean: spcResult.mean,
          sigma: spcResult.sigmaWithin,
          cpk: capabilityResult.cpk,
          ruleViolations: spcResult.ruleViolations,
          metadata: currentDataset.metadata,
        }}
      />

      {/* Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportDataset={handleImportNewDataset}
      />
    </div>
  );
}

export default App;
