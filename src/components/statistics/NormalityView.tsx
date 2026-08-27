import React from 'react';
import { calculateAndersonDarlingTest } from '../../engine/distributionEngine';
import { NormalityTestResult } from '../../types/statistics';
import { MetricCard } from '../common/MetricCard';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface NormalityViewProps {
  values: number[];
  columnName: string;
}

export const NormalityView: React.FC<NormalityViewProps> = ({ values, columnName }) => {
  const result: NormalityTestResult = calculateAndersonDarlingTest(values);

  const width = 720;
  const height = 300;
  const margin = { top: 25, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const qVals = result.qqPlotData.map((d) => d.sampleQuantile);
  const tVals = result.qqPlotData.map((d) => d.theoreticalQuantile);

  const minQ = Math.min(...qVals, ...tVals);
  const maxQ = Math.max(...qVals, ...tVals);
  const pad = (maxQ - minQ) * 0.08 || 1;

  const domain = [minQ - pad, maxQ + pad];

  const scaleX = (val: number) => margin.left + ((val - domain[0]) / (domain[1] - domain[0])) * innerWidth;
  const scaleY = (val: number) => margin.top + innerHeight - ((val - domain[0]) / (domain[1] - domain[0])) * innerHeight;

  return (
    <div className="space-y-6">
      {/* Normality Test Result Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${
          result.isNormal
            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            : 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {result.isNormal ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          )}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Anderson-Darling Normality Test: {result.isNormal ? 'NORMAL DISTRIBUTION' : 'NON-NORMAL DISTRIBUTION'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {result.conclusion}
            </p>
          </div>
        </div>

        <div className="flex gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">A² Statistic:</span>
            <p className="font-bold text-slate-900 dark:text-white">{result.statistic.toFixed(4)}</p>
          </div>
          <div>
            <span className="text-slate-500">p-Value:</span>
            <p className={`font-bold ${result.isNormal ? 'text-emerald-600' : 'text-rose-600'}`}>
              {result.pValue.toFixed(4)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Alpha (α):</span>
            <p className="font-bold text-slate-900 dark:text-white">{result.alpha}</p>
          </div>
        </div>
      </div>

      {/* Q-Q Probability Plot */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white">
            Normal Probability Q-Q Plot
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Points conforming strictly along the 45° diagonal line indicate adherence to the Gaussian distribution.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '550px', maxHeight: '360px' }}
          >
            {/* Grid */}
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              fill="currentColor"
              className="text-slate-50/50 dark:text-slate-950/20"
            />

            {/* 45 Degree Theoretical Reference Line */}
            <line
              x1={scaleX(domain[0])}
              y1={scaleY(domain[0])}
              x2={scaleX(domain[1])}
              y2={scaleY(domain[1])}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4 2"
            />

            {/* Q-Q Sample Data Points */}
            {result.qqPlotData.map((pt, idx) => (
              <circle
                key={idx}
                cx={scaleX(pt.theoreticalQuantile)}
                cy={scaleY(pt.sampleQuantile)}
                r="4"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.2"
                className="hover:fill-blue-700"
              />
            ))}

            {/* Axes */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />

            {/* Labels */}
            <text
              x={margin.left + innerWidth / 2}
              y={margin.top + innerHeight + 30}
              textAnchor="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="bold"
            >
              Theoretical Normal Quantiles
            </text>
            <text
              x={-height / 2}
              y="18"
              transform="rotate(-90)"
              textAnchor="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="bold"
            >
              Sample Quantiles ({columnName})
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
