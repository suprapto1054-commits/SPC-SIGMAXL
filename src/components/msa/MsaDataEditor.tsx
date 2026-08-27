import React, { useState } from 'react';
import { MsaMeasurementRow } from '../../types/msa';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';

interface MsaDataEditorProps {
  data: MsaMeasurementRow[];
  unit?: string;
  onUpdateData: (newData: MsaMeasurementRow[]) => void;
}

export const MsaDataEditor: React.FC<MsaDataEditorProps> = ({
  data,
  unit = 'mm',
  onUpdateData,
}) => {
  const [rows, setRows] = useState<MsaMeasurementRow[]>(data);
  const [newPart, setNewPart] = useState('P11');
  const [newOp, setNewOp] = useState('Op_Alpha');
  const [newTrial, setNewTrial] = useState(1);
  const [newVal, setNewVal] = useState('');
  const [csvText, setCsvText] = useState('');
  const [showCsvBox, setShowCsvBox] = useState(false);

  const handleCellChange = (id: string, val: number) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, value: val } : r));
    setRows(updated);
    onUpdateData(updated);
  };

  const handleAddRow = () => {
    const num = parseFloat(newVal);
    if (isNaN(num)) return;
    const newRow: MsaMeasurementRow = {
      id: `${newPart}_${newOp}_T${newTrial}_${Date.now()}`,
      part: newPart,
      operator: newOp,
      trial: Number(newTrial),
      value: num,
    };
    const updated = [...rows, newRow];
    setRows(updated);
    onUpdateData(updated);
    setNewVal('');
  };

  const handleDeleteRow = (id: string) => {
    const updated = rows.filter((r) => r.id !== id);
    setRows(updated);
    onUpdateData(updated);
  };

  const handleImportCsv = () => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) return;
      const parsed: MsaMeasurementRow[] = [];
      // Expecting: Part, Operator, Trial, Value (or Part, Operator, Value)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/[,\t]/).map((p) => p.trim());
        if (i === 0 && isNaN(parseFloat(parts[parts.length - 1]))) {
          // Header line
          continue;
        }
        if (parts.length >= 4) {
          const val = parseFloat(parts[3]);
          if (!isNaN(val)) {
            parsed.push({
              id: `${parts[0]}_${parts[1]}_T${parts[2]}_${i}`,
              part: parts[0],
              operator: parts[1],
              trial: parseInt(parts[2], 10) || 1,
              value: val,
            });
          }
        } else if (parts.length >= 3) {
          const val = parseFloat(parts[2]);
          if (!isNaN(val)) {
            parsed.push({
              id: `${parts[0]}_${parts[1]}_T1_${i}`,
              part: parts[0],
              operator: parts[1],
              trial: 1,
              value: val,
            });
          }
        }
      }

      if (parsed.length > 0) {
        setRows(parsed);
        onUpdateData(parsed);
        setShowCsvBox(false);
        setCsvText('');
      }
    } catch (e) {
      console.error('CSV parse error', e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              GAGE R&R RAW MEASUREMENT DATA MATRIX
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Total {rows.length} records loaded. Edit cells directly to trigger instant ANOVA recalculations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvBox(!showCsvBox)}
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5 text-cyan-500" />
              PASTE CSV / TSV
            </button>
          </div>
        </div>

        {/* CSV Import Drawer */}
        {showCsvBox && (
          <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2 font-mono text-xs">
            <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
              Paste Comma- or Tab-separated Data (Columns: Part, Operator, Trial, Value):
            </div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="P1, Op_A, 1, 20.012&#10;P1, Op_A, 2, 20.014&#10;P2, Op_A, 1, 19.985"
              className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-hidden"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCsvBox(false)}
                className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                className="rounded bg-cyan-500 px-3 py-1 font-bold text-slate-950 hover:bg-cyan-400"
              >
                Load Matrix Data
              </button>
            </div>
          </div>
        )}

        {/* Add Row Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
          <span className="font-bold text-slate-500 text-[10px] uppercase">ADD RUN:</span>
          <input
            type="text"
            placeholder="Part"
            value={newPart}
            onChange={(e) => setNewPart(e.target.value)}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="text"
            placeholder="Operator"
            value={newOp}
            onChange={(e) => setNewOp(e.target.value)}
            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="number"
            placeholder="Trial #"
            value={newTrial}
            onChange={(e) => setNewTrial(parseInt(e.target.value, 10) || 1)}
            className="w-16 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="number"
            step="any"
            placeholder={`Value (${unit})`}
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1 font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>
        </div>

        {/* Data Table */}
        <div className="mt-3 max-h-96 overflow-y-auto border border-slate-200 rounded dark:border-slate-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Part ID</th>
                <th className="py-2 px-3">Operator / Appraiser</th>
                <th className="py-2 px-3 text-center">Trial</th>
                <th className="py-2 px-3 text-right">Measured Value ({unit})</th>
                <th className="py-2 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200">{row.part}</td>
                  <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{row.operator}</td>
                  <td className="py-1.5 px-3 text-center text-slate-500">T{row.trial}</td>
                  <td className="py-1.5 px-3 text-right">
                    <input
                      type="number"
                      step="any"
                      value={row.value}
                      onChange={(e) => handleCellChange(row.id, parseFloat(e.target.value) || 0)}
                      className="w-28 rounded border border-transparent hover:border-slate-300 focus:border-cyan-500 bg-transparent text-right font-bold text-slate-900 dark:text-white px-1 py-0.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Delete run"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
