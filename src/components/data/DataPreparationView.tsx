import React, { useState } from 'react';
import { Dataset, Column } from '../../types/spc';
import { Wand2, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

interface DataPreparationViewProps {
  dataset: Dataset;
  onUpdateDataset: (dataset: Dataset) => void;
}

export const DataPreparationView: React.FC<DataPreparationViewProps> = ({
  dataset,
  onUpdateDataset,
}) => {
  const numericCols = dataset.columns.filter((c) => c.type === 'numeric');
  const [selectedCol, setSelectedCol] = useState<string>(numericCols[0]?.name || '');
  const [transformType, setTransformType] = useState<'zscore' | 'log' | 'sqrt' | 'minmax'>('zscore');
  const [imputeType, setImputeType] = useState<'mean' | 'median' | 'drop'>('mean');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const targetCol = dataset.columns.find((c) => c.name === selectedCol);

  const applyTransformation = () => {
    if (!targetCol) return;

    const raw = targetCol.values.filter((v) => typeof v === 'number' && !isNaN(v)) as number[];
    if (raw.length === 0) return;

    const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
    const std = Math.sqrt(raw.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (raw.length - 1)) || 1;
    const min = Math.min(...raw);
    const max = Math.max(...raw);

    const transformedValues = targetCol.values.map((v) => {
      if (typeof v !== 'number' || isNaN(v)) return v;
      switch (transformType) {
        case 'zscore':
          return (v - mean) / std;
        case 'log':
          return v > 0 ? Math.log(v) : null;
        case 'sqrt':
          return v >= 0 ? Math.sqrt(v) : null;
        case 'minmax':
          return (v - min) / (max - min || 1);
      }
    });

    const newColName = `${targetCol.name}_${transformType}`;
    const newCol: Column = {
      id: `col-${Date.now()}`,
      name: newColName,
      type: 'numeric',
      values: transformedValues,
    };

    const updatedDataset: Dataset = {
      ...dataset,
      columns: [...dataset.columns, newCol],
    };

    onUpdateDataset(updatedDataset);
    setStatusMsg(`Successfully generated transformed column "${newColName}".`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleImputation = () => {
    if (!targetCol) return;

    const validNums = targetCol.values.filter((v) => typeof v === 'number' && !isNaN(v)) as number[];
    const mean = validNums.reduce((a, b) => a + b, 0) / (validNums.length || 1);
    const sorted = [...validNums].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || mean;

    const replacement = imputeType === 'mean' ? mean : median;

    const newValues = targetCol.values.map((v) => {
      if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
        return replacement;
      }
      return v;
    });

    const updatedColumns = dataset.columns.map((c) =>
      c.name === selectedCol ? { ...c, values: newValues } : c
    );

    onUpdateDataset({ ...dataset, columns: updatedColumns });
    setStatusMsg(`Imputed missing entries in "${selectedCol}" using ${imputeType}.`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Wand2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Data Preparation, Cleaning & Transformations
          </h3>
        </div>

        {statusMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Transformations Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Mathematical Transformations
            </h4>
            <p className="text-slate-500">
              Apply standard normality or stabilization transforms to handle skewed non-normal distributions.
            </p>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Select Variable:</label>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Transform Type:</label>
              <select
                value={transformType}
                onChange={(e) => setTransformType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="zscore">Standard Z-Score ((X - μ) / σ)</option>
                <option value="log">Natural Logarithm (ln(X))</option>
                <option value="sqrt">Square Root (√X)</option>
                <option value="minmax">Min-Max Scale [0, 1]</option>
              </select>
            </div>

            <button
              onClick={applyTransformation}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              Generate Transformed Column
            </button>
          </div>

          {/* Missing Values & Cleaning Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Missing Value Handling
            </h4>
            <p className="text-slate-500">
              Impute or clean missing / null sensor readings to ensure continuous SPC charting.
            </p>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Imputation Method:</label>
              <select
                value={imputeType}
                onChange={(e) => setImputeType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="mean">Replace with Column Mean (X̄)</option>
                <option value="median">Replace with Column Median (Q2)</option>
              </select>
            </div>

            <div className="pt-8">
              <button
                onClick={handleImputation}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Apply Imputation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
