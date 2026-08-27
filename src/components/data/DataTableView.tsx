import React, { useState } from 'react';
import { Dataset } from '../../types/spc';
import { Table, Search, Filter, Hash, Type, FileSpreadsheet } from 'lucide-react';
import { exportDatasetToCSV, exportDatasetToExcel } from '../../utils/exportUtils';

interface DataTableViewProps {
  dataset: Dataset;
  onSelectColumnForSpc?: (columnName: string) => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  dataset,
  onSelectColumnForSpc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filteredRowIndices = Array.from({ length: dataset.rowCount }, (_, i) => i).filter(
    (rowIdx) => {
      if (!searchTerm.trim()) return true;
      return dataset.columns.some((col) =>
        String(col.values[rowIdx] ?? '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
  );

  const paginatedIndices = filteredRowIndices.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredRowIndices.length / pageSize);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              placeholder="Search table values..."
              className="rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredRowIndices.length} of {dataset.rowCount} rows
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDatasetToCSV(dataset)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportDatasetToExcel(dataset)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                {dataset.columns.map((col) => (
                  <th key={col.id} className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {col.type === 'numeric' ? (
                          <Hash className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{col.name}</span>
                      </div>
                      {col.type === 'numeric' && onSelectColumnForSpc && (
                        <button
                          onClick={() => onSelectColumnForSpc(col.name)}
                          className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          Run SPC
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {paginatedIndices.map((rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 text-center font-sans text-slate-400">
                    {rowIdx + 1}
                  </td>
                  {dataset.columns.map((col) => (
                    <td
                      key={col.id}
                      className={`py-2.5 px-4 ${
                        col.type === 'numeric'
                          ? 'text-slate-900 dark:text-white'
                          : 'font-sans text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {typeof col.values[rowIdx] === 'number'
                        ? (col.values[rowIdx] as number).toFixed(3)
                        : String(col.values[rowIdx] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
