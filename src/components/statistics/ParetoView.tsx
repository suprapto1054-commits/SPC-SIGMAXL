import React from 'react';
import { calculatePareto } from '../../engine/distributionEngine';
import { ParetoResult } from '../../types/statistics';
import { Dataset } from '../../types/spc';
import { BarChart3, AlertCircle } from 'lucide-react';

interface ParetoViewProps {
  dataset: Dataset;
  categoryColName?: string;
  countColName?: string;
}

export const ParetoView: React.FC<ParetoViewProps> = ({
  dataset,
  categoryColName,
  countColName,
}) => {
  // Find suitable category column
  const catCol = dataset.columns.find((c) => c.name === categoryColName) ||
    dataset.columns.find((c) => c.type === 'categorical') ||
    dataset.columns[0];

  const countCol = countColName ? dataset.columns.find((c) => c.name === countColName) : undefined;

  const categories = (catCol?.values || []).map(String);
  const counts = countCol ? (countCol.values as number[]) : undefined;

  const pareto: ParetoResult = calculatePareto(categories, counts);

  const width = 800;
  const height = 320;
  const margin = { top: 25, right: 60, bottom: 65, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxCount = Math.max(...pareto.items.map((i) => i.count), 1);
  const numBars = pareto.items.length;
  const barWidth = numBars > 0 ? (innerWidth / numBars) * 0.7 : 20;
  const barStep = numBars > 0 ? innerWidth / numBars : 20;

  const scaleYCount = (count: number) => {
    return margin.top + innerHeight - (count / (maxCount * 1.15)) * innerHeight;
  };

  const scaleYPercent = (pct: number) => {
    return margin.top + innerHeight - (pct / 100) * innerHeight;
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pareto Defect Analysis (80/20 Rule)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Recorded Events: <strong className="text-slate-700 dark:text-slate-300">{pareto.totalCount}</strong> across {pareto.items.length} distinct categories
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="font-bold">Vital Few (80% Impact):</span> {pareto.vitalFewCategories.join(', ') || 'N/A'}
        </div>
      </div>

      {/* Chart SVG */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px', maxHeight: '380px' }}
          >
            {/* Background Grid */}
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              fill="currentColor"
              className="text-slate-50/50 dark:text-slate-950/20"
            />

            {/* 80% Threshold Line */}
            <line
              x1={margin.left}
              y1={scaleYPercent(80)}
              x2={margin.left + innerWidth}
              y2={scaleYPercent(80)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text
              x={margin.left + innerWidth + 4}
              y={scaleYPercent(80) + 4}
              fill="#f59e0b"
              fontSize="9"
              fontWeight="bold"
            >
              80% Line
            </text>

            {/* Frequency Bars */}
            {pareto.items.map((item, idx) => {
              const x = margin.left + idx * barStep + (barStep - barWidth) / 2;
              const y = scaleYCount(item.count);
              const bHeight = margin.top + innerHeight - y;

              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={bHeight}
                    fill="#3b82f6"
                    fillOpacity="0.8"
                    stroke="#1d4ed8"
                    strokeWidth="1"
                    className="hover:fill-blue-500"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {item.count}
                  </text>
                  {/* Category Label */}
                  <text
                    x={x + barWidth / 2}
                    y={margin.top + innerHeight + 14}
                    textAnchor="end"
                    transform={`rotate(-40, ${x + barWidth / 2}, ${margin.top + innerHeight + 14})`}
                    fill="#64748b"
                    fontSize="9"
                  >
                    {item.category.length > 18 ? `${item.category.slice(0, 16)}...` : item.category}
                  </text>
                </g>
              );
            })}

            {/* Cumulative Percentage Line */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              points={pareto.items
                .map((item, idx) => {
                  const cx = margin.left + idx * barStep + barStep / 2;
                  const cy = scaleYPercent(item.cumulativePercentage);
                  return `${cx},${cy}`;
                })
                .join(' ')}
            />

            {/* Cumulative Percentage Dots */}
            {pareto.items.map((item, idx) => {
              const cx = margin.left + idx * barStep + barStep / 2;
              const cy = scaleYPercent(item.cumulativePercentage);
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Axes */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
