import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, Column } from '../../types/spc';
import { SAMPLE_DATASETS } from '../../data/sampleDatasets';
import { Upload, FileText, Database, X, Check, ArrowRight } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'paste'>('samples');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="flex flex-col max-h-[90vh] w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Import & Benchmark Dataset Hub
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Load your manufacturing quality data or explore curated industrial SPC scenarios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'samples'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            10 Industrial Benchmark Datasets
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File (CSV / Excel)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Paste CSV / Text
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* SAMPLES TAB */}
          {activeTab === 'samples' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SAMPLE_DATASETS.map((ds) => (
                <div
                  key={ds.id}
                  onClick={() => {
                    onImportDataset(ds);
                    onClose();
                  }}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xs transition-all hover:border-indigo-500 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {ds.name}
                    </h4>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {ds.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800">
                    <span>{ds.rowCount} rows | {ds.columns.length} columns</span>
                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                      Load Scenario <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
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
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <Upload className="h-10 w-10 text-indigo-500 mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Drag and drop your CSV or Excel file here
              </h4>
              <p className="text-xs text-slate-500 mt-1">Supports .csv, .xlsx, .xls formats</p>

              <label className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer">
                Browse Files
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
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dataset Name:
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paste CSV / Tab-Separated Data (including header row):
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Sample,Diameter_mm,Temp_C\nS-1,50.02,42.1\nS-2,49.98,42.3\nS-3,50.05,42.5`}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  Import Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
