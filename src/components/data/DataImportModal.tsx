import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, Column } from '../../types/spc';
import { SAMPLE_DATASETS } from '../../data/sampleDatasets';
import {
  Upload,
  FileText,
  Database,
  X,
  Check,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Zap,
  BarChart3,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Search,
  Copy,
  Flame,
  Droplets,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { exportDatasetToCSV, exportDatasetToExcel, exportBlankTemplate } from '../../utils/exportUtils';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDataset: (dataset: Dataset) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImportDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'samples' | 'upload' | 'paste'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [datasetName, setDatasetName] = useState('Custom Imported Dataset');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const processParsedData = (name: string, rawRows: Record<string, any>[]) => {
    if (!rawRows || rawRows.length === 0) {
      setError('Imported dataset contains no valid rows.');
      return;
    }

    const colNames = Object.keys(rawRows[0]);
    const columns: Column[] = colNames.map((colName, idx) => {
      const sampleVals = rawRows.map((r) => r[colName]);
      const numericCount = sampleVals.filter(
        (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v))
      ).length;
      const isNumeric = numericCount / sampleVals.length > 0.6;

      const typedVals = sampleVals.map((v) => {
        if (isNumeric) {
          const num = parseFloat(v);
          return isNaN(num) ? null : num;
        }
        return String(v ?? '');
      });

      return {
        id: `col-${idx + 1}`,
        name: colName,
        type: isNumeric ? 'numeric' : 'categorical',
        values: typedVals,
      };
    });

    const dataset: Dataset = {
      id: `ds-imported-${Date.now()}`,
      name: name || 'Imported Quality Dataset',
      description: `Imported with ${rawRows.length} rows and ${columns.length} columns.`,
      columns,
      rowCount: rawRows.length,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onImportDataset(dataset);
    onClose();
  };

  const handleFileUpload = (file: File) => {
    setError(null);
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(fileName, results.data as Record<string, any>[]);
        },
        error: (err) => setError(`CSV Parse error: ${err.message}`),
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          processParsedData(fileName, rawRows as Record<string, any>[]);
        } catch (err: any) {
          setError(`Excel Parse error: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Please upload a valid .csv, .xlsx, or .xls file.');
    }
  };

  const handlePasteSubmit = () => {
    setError(null);
    if (!pastedText.trim()) {
      setError('Please paste CSV or tab-separated data into the text box.');
      return;
    }

    try {
      const parsed = Papa.parse(pastedText.trim(), {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      processParsedData(datasetName, parsed.data as Record<string, any>[]);
    } catch (err: any) {
      setError(`Failed to parse pasted data: ${err.message}`);
    }
  };

  const handleCopyHeaders = (ds: Dataset) => {
    const headerStr = ds.columns.map((c) => c.name).join(', ');
    navigator.clipboard.writeText(headerStr);
    setCopiedId(ds.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getDatasetCategory = (ds: Dataset): string => {
    if (ds.id.startsWith('ds-energy')) return 'energy';
    if (ds.id.includes('machin') || ds.id.includes('trend') || ds.id.includes('shift') || ds.id.includes('stable')) return 'machining';
    if (ds.id.includes('ph') || ds.id.includes('kiln') || ds.id.includes('coat')) return 'process';
    if (ds.id.includes('defect') || ds.id.includes('var') || ds.id.includes('center')) return 'quality';
    return 'maintenance';
  };

  const filteredDatasets = SAMPLE_DATASETS.filter((ds) => {
    const category = getDatasetCategory(ds);
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'energy' && category === 'energy') ||
      (selectedCategory === 'machining' && category === 'machining') ||
      (selectedCategory === 'process' && category === 'process') ||
      (selectedCategory === 'quality' && category === 'quality') ||
      (selectedCategory === 'maintenance' && category === 'maintenance');

    const matchesSearch =
      searchQuery.trim() === '' ||
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
      <div className="flex flex-col max-h-[92vh] w-full max-w-5xl rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white font-mono">
                  BENCHMARK DATASHEETS, TEMPLATES & IMPORT HUB
                </h3>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  14 BENCHMARK TEMPLATES
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Download ready-to-use blank Excel/CSV templates with exact column schemas for each manufacturing process.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 text-xs font-mono font-bold dark:border-slate-800 dark:bg-slate-900/80">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3.5 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            EACH BENCHMARK TEMPLATES & SCHEMAS ({SAMPLE_DATASETS.length})
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3.5 transition-colors ${
              activeTab === 'samples'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            ACTIVATE BENCHMARKS DIRECTLY
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            UPLOAD FILLED FILE (.XLSX / .CSV)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3.5 transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            PASTE TEXT / CSV
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 font-mono dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* How to add data banner */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 font-mono shadow-xs">
                <div className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm">
                  <HelpCircle className="w-4 h-4" />
                  HOW TO ADD YOUR PLANT DATA USING A BENCHMARK TEMPLATE:
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">1. Choose Benchmark</span>
                    Pick the benchmark below that matches your equipment or parameter (Energy, Machining, pH, Vibration, etc.).
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">2. Download Template</span>
                    Click <strong>Blank .XLSX</strong> or <strong>Blank .CSV</strong>. It contains the exact column names & data dictionary.
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">3. Populate Your Rows</span>
                    Open in Excel / Google Sheets and enter your real plant measurements in the columns.
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">4. Upload & Analyze</span>
                    Switch to the <strong>Upload File</strong> tab above, drag-and-drop your file, and see instant SPC & AI analysis.
                  </div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    All ({SAMPLE_DATASETS.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('energy')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCategory === 'energy'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Zap className="w-3 h-3" /> Energy & Multi-Utility (4)
                  </button>
                  <button
                    onClick={() => setSelectedCategory('machining')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCategory === 'machining'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Sliders className="w-3 h-3" /> Machining & Dimensions (3)
                  </button>
                  <button
                    onClick={() => setSelectedCategory('process')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCategory === 'process'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Flame className="w-3 h-3" /> Process & Chemistry (3)
                  </button>
                  <button
                    onClick={() => setSelectedCategory('quality')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCategory === 'quality'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Quality & Defects (3)
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search benchmark or column..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Benchmark Templates Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDatasets.map((ds) => {
                  const isEnergy = ds.id.startsWith('ds-energy');
                  return (
                    <div
                      key={ds.id}
                      className="rounded-xl border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between hover:border-blue-500/70 transition-all group"
                    >
                      <div>
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isEnergy ? (
                              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                            <h4 className="font-bold text-xs font-mono text-slate-900 dark:text-white leading-tight">
                              {ds.name}
                            </h4>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            isEnergy
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          }`}>
                            {ds.columns.length} Cols • {ds.rowCount} Rows
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-2 leading-relaxed">
                          {ds.description}
                        </p>

                        {/* Equipment / Line Metadata */}
                        {ds.metadata?.equipment && (
                          <div className="mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span><strong>Equipment:</strong> {ds.metadata.equipment}</span>
                            {ds.metadata.process && <span className="text-slate-400">| {ds.metadata.process}</span>}
                          </div>
                        )}

                        {/* Column Schema Badges */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                            <span>DATASHEET COLUMNS & TYPES:</span>
                            <button
                              onClick={() => handleCopyHeaders(ds)}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {copiedId === ds.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Headers</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {ds.columns.map((c) => (
                              <span
                                key={c.id}
                                className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                                  c.type === 'numeric'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {c.name}
                                <span className="opacity-60 text-[8.5px] ml-1">
                                  ({c.type === 'numeric' ? '#' : 'abc'})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Download Actions Footer */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            BLANK TEMPLATE:
                          </span>
                          <button
                            onClick={() => exportBlankTemplate(ds, 'xlsx')}
                            title="Download blank Excel template with headers & data dictionary"
                            className="flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-500 px-2 py-1 text-[10.5px] font-mono font-bold text-white shadow-xs transition-colors"
                          >
                            <Download className="w-3 h-3" /> .XLSX
                          </button>
                          <button
                            onClick={() => exportBlankTemplate(ds, 'csv')}
                            title="Download blank CSV template with headers"
                            className="flex items-center gap-1 rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-[10.5px] font-mono font-bold text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Download className="w-3 h-3" /> .CSV
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => exportDatasetToExcel(ds)}
                            title="Download reference pre-filled dataset"
                            className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Ref Data (.xlsx)
                          </button>
                          <button
                            onClick={() => {
                              onImportDataset(ds);
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded bg-slate-900 text-white hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 px-2.5 py-1 text-[10.5px] font-mono font-bold transition-colors"
                          >
                            <span>Load</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom bar to quickly upload */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                    Have you filled your template with your plant data?
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Switch to the upload tab to import your .xlsx / .csv file.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  GO TO FILE UPLOAD
                </button>
              </div>
            </div>
          )}

          {/* SAMPLES TAB */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-slate-500 mb-2 flex items-center justify-between">
                <span>Select an industrial benchmark dataset to load into the dashboard:</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">Click any card to load</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SAMPLE_DATASETS.map((ds) => (
                  <div
                    key={ds.id}
                    className="group flex flex-col justify-between rounded-lg border border-slate-300 bg-white p-3.5 text-xs shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 font-mono">
                          {ds.name}
                        </h4>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-mono">
                        {ds.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] font-mono text-slate-400 dark:border-slate-800">
                      <span>{ds.rowCount} rows | {ds.columns.length} cols</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportBlankTemplate(ds, 'xlsx');
                          }}
                          title="Download blank template (.xlsx)"
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Template
                        </button>
                        <button
                          onClick={() => {
                            onImportDataset(ds);
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-500 transition-colors"
                        >
                          <span>Load</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all font-mono ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <Upload className="h-10 w-10 text-blue-500 mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                DRAG AND DROP YOUR CSV OR EXCEL FILE HERE
              </h4>
              <p className="text-xs text-slate-500 mt-1">Supports standard .csv, .xlsx, or .xls files</p>

              <label className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 cursor-pointer">
                BROWSE FILES
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* PASTE TAB */}
          {activeTab === 'paste' && (
            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Dataset Name:
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Paste CSV / Tab-Separated Data (Including Header Row):
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Timestamp_Hour,Electricity_Consumption_kWh,Water_Consumption_m3,Gas_Consumption_MMBTU,Production_Volume_Tons\nDay1 01:00,645,32.4,4.82,43.5\nDay1 02:00,638,31.8,4.68,43.0\nDay1 03:00,630,31.0,4.58,42.5`}
                  className="w-full rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500"
                >
                  IMPORT DATASET
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


