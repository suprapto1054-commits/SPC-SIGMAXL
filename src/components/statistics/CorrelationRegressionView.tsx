import React, { useState } from 'react';
import { Dataset } from '../../types/spc';
import { calculateCorrelation, calculateLinearRegression } from '../../engine/hypothesisEngine';
import { CorrelationResult, LinearRegressionResult } from '../../types/statistics';
import { MetricCard } from '../common/MetricCard';
import { Network, TrendingUp, AlertTriangle } from 'lucide-react';

interface CorrelationRegressionViewProps {
  dataset: Dataset;
}

export const CorrelationRegressionView: React.FC<CorrelationRegressionViewProps> = ({
  dataset,
}) => {
  const numericCols = dataset.columns.filter((c) => c.type === 'numeric');

  const [xColName, setXColName] = useState<string>(numericCols[0]?.name || '');
  const [yColName, setYColName] = useState<string>(
    numericCols[1]?.name || numericCols[0]?.name || ''
  );

  const xCol = dataset.columns.find((c) => c.name === xColName);
  const yCol = dataset.columns.find((c) => c.name === yColName);

  const xVals = (xCol?.values || []).filter((v) => typeof v === 'number') as number[];
  const yVals = (yCol?.values || []).filter((v) => typeof v === 'number') as number[];

  const corr: CorrelationResult = calculateCorrelation(xVals, yVals, xColName, yColName);
  const reg: LinearRegressionResult = calculateLinearRegression(xVals, yVals, xColName, yColName);

  const width = 760;
  const height = 300;
  const margin = { top: 25, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const minY = Math.min(...yVals);
  const maxY = Math.max(...yVals);

  const padX = (maxX - minX) * 0.08 || 1;
  const padY = (maxY - minY) * 0.08 || 1;

  const domainX = [minX - padX, maxX + padX];
  const domainY = [minY - padY, maxY + padY];

  const scaleX = (val: number) => margin.left + ((val - domainX[0]) / (domainX[1] - domainX[0])) * innerWidth;
  const scaleY = (val: number) => margin.top + innerHeight - ((val - domainY[0]) / (domainY[1] - domainY[0])) * innerHeight;

  return (
    <div className="space-y-6">
      {/* Variable Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Bivariate Correlation & Ordinary Least Squares (OLS) Regression
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model equation: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{reg.equation}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Predictor (X):</label>
            <select
              value={xColName}
              onChange={(e) => setXColName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Response (Y):</label>
            <select
              value={yColName}
              onChange={(e) => setYColName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Pearson Correlation (r)"
          value={corr.pearsonR.toFixed(3)}
          subtitle={`p-value = ${corr.pearsonPValue.toFixed(4)} (${corr.isSignificant ? 'Significant' : 'Not Sig'})`}
          badge={corr.strength}
          badgeType={corr.isSignificant ? 'success' : 'warning'}
        />
        <MetricCard
          title="R-Squared (R²)"
          value={`${(corr.rSquared * 100).toFixed(1)}%`}
          subtitle={`Adj R²: ${(reg.adjRSquared * 100).toFixed(1)}%`}
          badgeType="info"
        />
        <MetricCard
          title="Spearman Rank (ρ)"
          value={corr.spearmanRho.toFixed(3)}
          subtitle="Non-parametric rank association"
          badgeType="info"
        />
        <MetricCard
          title="Regression Slope (b)"
          value={reg.slope.toFixed(4)}
          subtitle={`Intercept (a): ${reg.intercept.toFixed(3)}`}
          badgeType="info"
        />
      </div>

      {/* Scatter & Regression Line SVG */}
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

            {/* Regression Fit Line */}
            {reg.points.length > 1 && (
              <line
                x1={scaleX(domainX[0])}
                y1={scaleY(reg.intercept + reg.slope * domainX[0])}
                x2={scaleX(domainX[1])}
                y2={scaleY(reg.intercept + reg.slope * domainX[1])}
                stroke="#2563eb"
                strokeWidth="2.5"
              />
            )}

            {/* Scatter Data Points */}
            {reg.points.map((pt, idx) => (
              <circle
                key={idx}
                cx={scaleX(pt.x)}
                cy={scaleY(pt.y)}
                r="4.5"
                fill="#3b82f6"
                fillOpacity="0.85"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="hover:fill-blue-700"
              />
            ))}

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

            {/* Labels */}
            <text
              x={margin.left + innerWidth / 2}
              y={margin.top + innerHeight + 30}
              textAnchor="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="bold"
            >
              {xColName}
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
              {yColName}
            </text>
          </svg>
        </div>
      </div>

      {/* ANOVA Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider dark:text-slate-200">
            ANOVA Summary Table (Analysis of Variance)
          </h4>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/40">
            <tr>
              <th className="py-2.5 px-4">Source</th>
              <th className="py-2.5 px-4 text-center">DF</th>
              <th className="py-2.5 px-4 text-right">SS</th>
              <th className="py-2.5 px-4 text-right">MS</th>
              <th className="py-2.5 px-4 text-right">F-Stat</th>
              <th className="py-2.5 px-4 text-right">p-Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {reg.anova.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900 dark:text-white">
                  {row.source}
                </td>
                <td className="py-2.5 px-4 text-center">{row.df}</td>
                <td className="py-2.5 px-4 text-right">{row.ss.toFixed(3)}</td>
                <td className="py-2.5 px-4 text-right">{row.ms.toFixed(3)}</td>
                <td className="py-2.5 px-4 text-right">{row.f > 0 ? row.f.toFixed(2) : '—'}</td>
                <td className="py-2.5 px-4 text-right text-blue-600 dark:text-blue-400 font-bold">
                  {row.p > 0 ? row.p.toFixed(4) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mandatory Statistical Disclaimer */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Methodological Note:</strong> Statistical correlation and regression model mathematical association between variables. They do NOT prove physical causality without controlled design of experiments (DOE) or engineering verification.
        </span>
      </div>
    </div>
  );
};
