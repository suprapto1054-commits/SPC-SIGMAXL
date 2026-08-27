import React, { useState } from 'react';
import { generateHistogram } from '../../engine/distributionEngine';
import { HistogramResult } from '../../types/statistics';
import { Sliders } from 'lucide-react';

interface HistogramViewProps {
  values: number[];
  columnName: string;
}

export const HistogramView: React.FC<HistogramViewProps> = ({ values, columnName }) => {
  const [binCount, setBinCount] = useState<number>(10);
  const [showNormalCurve, setShowNormalCurve] = useState<boolean>(true);

  const hist: HistogramResult = generateHistogram(values, binCount);

  const width = 780;
  const height = 300;
  const margin = { top: 25, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxCount = Math.max(...hist.bins.map((b) => b.count), ...hist.normalCurvePoints.map((p) => p.y), 1);

  const scaleX = (val: number) => {
    return margin.left + ((val - hist.min) / (hist.max - hist.min || 1)) * innerWidth;
  };

  const scaleY = (count: number) => {
    return margin.top + innerHeight - (count / (maxCount * 1.15)) * innerHeight;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Frequency Histogram & Normal Distribution Fit
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Variable: <strong className="text-slate-700 dark:text-slate-300">{columnName}</strong> (N = {values.length})
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-slate-600 dark:text-slate-400">Bins: {binCount}</label>
            <input
              type="range"
              min="5"
              max="25"
              value={binCount}
              onChange={(e) => setBinCount(parseInt(e.target.value))}
              className="h-1.5 w-24 accent-indigo-600 cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={showNormalCurve}
              onChange={(e) => setShowNormalCurve(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Overlay Gaussian Curve
          </label>
        </div>
      </div>

      {/* SVG Canvas */}
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

            {/* Histogram Bars */}
            {hist.bins.map((bin, idx) => {
              const x1 = scaleX(bin.binStart);
              const x2 = scaleX(bin.binEnd);
              const barWidth = Math.max(1, x2 - x1 - 2);
              const y = scaleY(bin.count);
              const barHeight = margin.top + innerHeight - y;

              return (
                <g key={idx}>
                  <rect
                    x={x1 + 1}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="#3b82f6"
                    fillOpacity="0.75"
                    stroke="#1d4ed8"
                    strokeWidth="1"
                    className="transition-all hover:fill-blue-500"
                  />
                  {bin.count > 0 && (
                    <text
                      x={x1 + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {bin.count}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Normal Fit Curve */}
            {showNormalCurve && hist.normalCurvePoints.length > 0 && (
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                points={hist.normalCurvePoints.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')}
              />
            )}

            {/* Mean Center Line */}
            <line
              x1={scaleX(hist.mean)}
              y1={margin.top}
              x2={scaleX(hist.mean)}
              y2={margin.top + innerHeight}
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />

            {/* Axis Lines */}
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

            {/* X-axis Labels */}
            {hist.bins.map((bin, idx) => (
              <text
                key={idx}
                x={scaleX(bin.midPoint)}
                y={margin.top + innerHeight + 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {bin.midPoint.toFixed(2)}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
