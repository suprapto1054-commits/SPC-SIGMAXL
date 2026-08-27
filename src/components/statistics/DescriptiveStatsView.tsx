import React from 'react';
import { DescriptiveStatistics } from '../../types/statistics';
import { calculateDescriptiveStats } from '../../engine/statisticalEngine';
import { MetricCard } from '../common/MetricCard';
import { Table, BarChart2 } from 'lucide-react';

interface DescriptiveStatsViewProps {
  values: number[];
  columnName: string;
}

export const DescriptiveStatsView: React.FC<DescriptiveStatsViewProps> = ({
  values,
  columnName,
}) => {
  const stats: DescriptiveStatistics = calculateDescriptiveStats(values);

  return (
    <div className="space-y-6">
      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Sample Size (N)"
          value={stats.n}
          subtitle={`Range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}`}
          badgeType="info"
        />
        <MetricCard
          title="Mean (μ / X̄)"
          value={stats.mean.toFixed(3)}
          subtitle={`Standard Error: ±${stats.standardError.toFixed(4)}`}
          badgeType="info"
        />
        <MetricCard
          title="Std Deviation (s)"
          value={stats.stdDev.toFixed(3)}
          subtitle={`Variance: ${stats.variance.toFixed(4)}`}
          badgeType="info"
        />
        <MetricCard
          title="Median (Q2)"
          value={stats.median.toFixed(3)}
          subtitle={`IQR: ${(stats.q3 - stats.q1).toFixed(3)}`}
          badgeType="info"
        />
      </div>

      {/* Comprehensive Statistical Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Measures of Central Tendency & Dispersion */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white border-b border-slate-100 pb-2.5 dark:border-slate-800">
            Central Tendency & Spread
          </h4>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Mean</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.mean.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Median</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.median.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Std Deviation (Sample)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.stdDev.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Variance</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.variance.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Coefficient of Var (CV)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.cv.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Quartiles & Extremes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white border-b border-slate-100 pb-2.5 dark:border-slate-800">
            Quartiles & Extremes
          </h4>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Minimum</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.min.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">25th Percentile (Q1)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.q1.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">75th Percentile (Q3)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.q3.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Maximum</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.max.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Interquartile Range (IQR)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{(stats.q3 - stats.q1).toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Shape & Confidence Intervals */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white border-b border-slate-100 pb-2.5 dark:border-slate-800">
            Distribution Shape & 95% CI
          </h4>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Skewness</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {stats.skewness.toFixed(3)} ({Math.abs(stats.skewness) < 0.5 ? 'Symmetric' : stats.skewness > 0 ? 'Right Skewed' : 'Left Skewed'})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Kurtosis (Excess)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {stats.kurtosis.toFixed(3)} ({Math.abs(stats.kurtosis) < 0.5 ? 'Mesokurtic' : stats.kurtosis > 0 ? 'Leptokurtic' : 'Platykurtic'})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">90% CI for Mean</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                [{stats.ci90[0].toFixed(3)}, {stats.ci90[1].toFixed(3)}]
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">95% CI for Mean</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                [{stats.ci95[0].toFixed(3)}, {stats.ci95[1].toFixed(3)}]
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">99% CI for Mean</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                [{stats.ci99[0].toFixed(3)}, {stats.ci99[1].toFixed(3)}]
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
