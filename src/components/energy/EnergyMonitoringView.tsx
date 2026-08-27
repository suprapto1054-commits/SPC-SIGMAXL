import React, { useState, useMemo, useEffect } from 'react';
import { Dataset } from '../../types/spc';
import { SAMPLE_DATASETS } from '../../data/sampleDatasets';
import {
  Zap,
  Droplet,
  Flame,
  Factory,
  DollarSign,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Sliders,
  FileSpreadsheet,
  Download,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Calendar,
  Clock,
  CalendarDays,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { exportToCSV } from '../../utils/exportUtils';

interface EnergyMonitoringViewProps {
  dataset: Dataset;
  onNavigateToTab?: (tab: string) => void;
  onSelectDataset?: (dataset: Dataset) => void;
}

export type EnergyTimeResolution = 'hourly' | 'daily' | 'monthly';

export const EnergyMonitoringView: React.FC<EnergyMonitoringViewProps> = ({
  dataset,
  onNavigateToTab,
  onSelectDataset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sec-trends' | 'regression' | 'simulation' | 'datagrid'>('overview');

  // Detect default time resolution from dataset
  const defaultResolution = useMemo<EnergyTimeResolution>(() => {
    const dsName = (dataset.name || '').toLowerCase();
    const colNames = dataset.columns.map((c) => c.name.toLowerCase()).join(' ');
    if (dataset.id === 'ds-energy-monthly' || dsName.includes('monthly') || colNames.includes('month')) {
      return 'monthly';
    }
    if (dataset.id === 'ds-energy-daily' || dsName.includes('daily') || colNames.includes('day') || colNames.includes('timestamp_day')) {
      return 'daily';
    }
    return 'hourly';
  }, [dataset]);

  const [timeResolution, setTimeResolution] = useState<EnergyTimeResolution>(defaultResolution);

  // Sync when dataset changes
  useEffect(() => {
    setTimeResolution(defaultResolution);
  }, [defaultResolution]);

  // Interactive Tariff & Price Simulator State
  const [elecTariff, setElecTariff] = useState<number>(0.12); // $/kWh
  const [gasTariff, setGasTariff] = useState<number>(8.50);   // $/MMBTU
  const [waterTariff, setWaterTariff] = useState<number>(2.20); // $/m3
  const [productPrice, setProductPrice] = useState<number>(550); // $/Ton

  // Parse raw telemetry data
  const rawTelemetry = useMemo(() => {
    const cols = dataset.columns;
    const len = dataset.rowCount || (cols[0]?.values.length ?? 0);

    const timeCol = cols.find((c) => /time|hour|shift|log|interval|day|month/i.test(c.name))?.values || Array.from({ length: len }, (_, i) => `Log-${i + 1}`);
    const elecCol = cols.find((c) => /elec|power|kwh|kw/i.test(c.name))?.values as number[] | undefined;
    const waterCol = cols.find((c) => /water|intake|m3/i.test(c.name))?.values as number[] | undefined;
    const gasCol = cols.find((c) => /gas|mmbtu|thermal/i.test(c.name))?.values as number[] | undefined;
    const prodCol = cols.find((c) => /prod|output|volume|ton|steam/i.test(c.name))?.values as number[] | undefined;

    return Array.from({ length: len }, (_, i) => {
      const timestamp = String(timeCol[i] ?? `Log-${i + 1}`);
      const elecKwh = typeof elecCol?.[i] === 'number' ? elecCol[i] : 650 + (i % 12) * 20;
      const waterM3 = typeof waterCol?.[i] === 'number' ? waterCol[i] : 32 + (i % 8) * 1.8;
      const gasMmbtu = typeof gasCol?.[i] === 'number' ? gasCol[i] : 4.8 + (i % 10) * 0.25;
      const prodTons = typeof prodCol?.[i] === 'number' ? prodCol[i] : 44 + (i % 12) * 1.5;

      return {
        id: i + 1,
        timestamp,
        elecKwh,
        waterM3,
        gasMmbtu,
        prodTons,
      };
    });
  }, [dataset]);

  // Aggregate or process according to selected time resolution
  const telemetryData = useMemo(() => {
    const isDatasetDaily = dataset.id === 'ds-energy-daily' || dataset.name.toLowerCase().includes('daily');
    const isDatasetMonthly = dataset.id === 'ds-energy-monthly' || dataset.name.toLowerCase().includes('monthly');

    // Case 1: Dataset is already at requested resolution or Raw Hourly is requested
    if (
      (timeResolution === 'hourly') ||
      (timeResolution === 'daily' && isDatasetDaily) ||
      (timeResolution === 'monthly' && isDatasetMonthly)
    ) {
      return rawTelemetry.map((row, i) => {
        const secElec = row.prodTons > 0 ? Number((row.elecKwh / row.prodTons).toFixed(2)) : 0;
        const secGas = row.prodTons > 0 ? Number((row.gasMmbtu / row.prodTons).toFixed(3)) : 0;
        const secWater = row.prodTons > 0 ? Number((row.waterM3 / row.prodTons).toFixed(3)) : 0;

        const totalEnergyMmbtu = Number((row.gasMmbtu + row.elecKwh * 0.003412).toFixed(2));
        const totalEnergyKwhEq = Number((row.elecKwh + row.gasMmbtu * 293.07).toFixed(1));

        const costElec = row.elecKwh * elecTariff;
        const costGas = row.gasMmbtu * gasTariff;
        const costWater = row.waterM3 * waterTariff;
        const totalUtilityCost = Number((costElec + costGas + costWater).toFixed(2));

        const grossRevenue = Number((row.prodTons * productPrice).toFixed(2));
        const netValueAdd = Number((grossRevenue - totalUtilityCost).toFixed(2));
        const utilityCostRatioPct = grossRevenue > 0 ? Number(((totalUtilityCost / grossRevenue) * 100).toFixed(2)) : 0;

        return {
          id: i + 1,
          timestamp: row.timestamp,
          elecKwh: row.elecKwh,
          waterM3: row.waterM3,
          gasMmbtu: row.gasMmbtu,
          prodTons: row.prodTons,
          secElec,
          secGas,
          secWater,
          totalEnergyMmbtu,
          totalEnergyKwhEq,
          costElec,
          costGas,
          costWater,
          totalUtilityCost,
          grossRevenue,
          netValueAdd,
          utilityCostRatioPct,
        };
      });
    }

    // Case 2: Roll up Hourly -> Daily (group by 24h buckets or Day tag)
    if (timeResolution === 'daily') {
      const bucketSize = 24;
      const numDays = Math.max(1, Math.ceil(rawTelemetry.length / bucketSize));
      const dailyRows = [];

      for (let d = 0; d < numDays; d++) {
        const slice = rawTelemetry.slice(d * bucketSize, (d + 1) * bucketSize);
        if (slice.length === 0) continue;

        const elecKwh = slice.reduce((sum, r) => sum + r.elecKwh, 0);
        const waterM3 = slice.reduce((sum, r) => sum + r.waterM3, 0);
        const gasMmbtu = slice.reduce((sum, r) => sum + r.gasMmbtu, 0);
        const prodTons = slice.reduce((sum, r) => sum + r.prodTons, 0);

        const secElec = prodTons > 0 ? Number((elecKwh / prodTons).toFixed(2)) : 0;
        const secGas = prodTons > 0 ? Number((gasMmbtu / prodTons).toFixed(3)) : 0;
        const secWater = prodTons > 0 ? Number((waterM3 / prodTons).toFixed(3)) : 0;

        const totalEnergyMmbtu = Number((gasMmbtu + elecKwh * 0.003412).toFixed(2));
        const totalEnergyKwhEq = Number((elecKwh + gasMmbtu * 293.07).toFixed(1));

        const costElec = elecKwh * elecTariff;
        const costGas = gasMmbtu * gasTariff;
        const costWater = waterM3 * waterTariff;
        const totalUtilityCost = Number((costElec + costGas + costWater).toFixed(2));

        const grossRevenue = Number((prodTons * productPrice).toFixed(2));
        const netValueAdd = Number((grossRevenue - totalUtilityCost).toFixed(2));
        const utilityCostRatioPct = grossRevenue > 0 ? Number(((totalUtilityCost / grossRevenue) * 100).toFixed(2)) : 0;

        dailyRows.push({
          id: d + 1,
          timestamp: `Day ${(d + 1).toString().padStart(2, '0')} (Rollup)`,
          elecKwh,
          waterM3,
          gasMmbtu,
          prodTons,
          secElec,
          secGas,
          secWater,
          totalEnergyMmbtu,
          totalEnergyKwhEq,
          costElec,
          costGas,
          costWater,
          totalUtilityCost,
          grossRevenue,
          netValueAdd,
          utilityCostRatioPct,
        });
      }
      return dailyRows;
    }

    // Case 3: Roll up to Monthly
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chunkSize = Math.max(1, Math.floor(rawTelemetry.length / Math.min(12, rawTelemetry.length)));
    const monthlyRows = [];
    const targetMonths = Math.min(12, Math.ceil(rawTelemetry.length / chunkSize));

    for (let m = 0; m < targetMonths; m++) {
      const slice = rawTelemetry.slice(m * chunkSize, (m + 1) * chunkSize);
      if (slice.length === 0) continue;

      const factor = isDatasetDaily ? 30 : 720 / slice.length; // normalize to monthly scale
      const elecKwh = Math.round(slice.reduce((sum, r) => sum + r.elecKwh, 0) * (isDatasetDaily ? 1 : factor));
      const waterM3 = Number((slice.reduce((sum, r) => sum + r.waterM3, 0) * (isDatasetDaily ? 1 : factor)).toFixed(1));
      const gasMmbtu = Number((slice.reduce((sum, r) => sum + r.gasMmbtu, 0) * (isDatasetDaily ? 1 : factor)).toFixed(1));
      const prodTons = Number((slice.reduce((sum, r) => sum + r.prodTons, 0) * (isDatasetDaily ? 1 : factor)).toFixed(1));

      const secElec = prodTons > 0 ? Number((elecKwh / prodTons).toFixed(2)) : 0;
      const secGas = prodTons > 0 ? Number((gasMmbtu / prodTons).toFixed(3)) : 0;
      const secWater = prodTons > 0 ? Number((waterM3 / prodTons).toFixed(3)) : 0;

      const totalEnergyMmbtu = Number((gasMmbtu + elecKwh * 0.003412).toFixed(2));
      const totalEnergyKwhEq = Number((elecKwh + gasMmbtu * 293.07).toFixed(1));

      const costElec = elecKwh * elecTariff;
      const costGas = gasMmbtu * gasTariff;
      const costWater = waterM3 * waterTariff;
      const totalUtilityCost = Number((costElec + costGas + costWater).toFixed(2));

      const grossRevenue = Number((prodTons * productPrice).toFixed(2));
      const netValueAdd = Number((grossRevenue - totalUtilityCost).toFixed(2));
      const utilityCostRatioPct = grossRevenue > 0 ? Number(((totalUtilityCost / grossRevenue) * 100).toFixed(2)) : 0;

      monthlyRows.push({
        id: m + 1,
        timestamp: months[m % 12] + ' (Month ' + (m + 1) + ')',
        elecKwh,
        waterM3,
        gasMmbtu,
        prodTons,
        secElec,
        secGas,
        secWater,
        totalEnergyMmbtu,
        totalEnergyKwhEq,
        costElec,
        costGas,
        costWater,
        totalUtilityCost,
        grossRevenue,
        netValueAdd,
        utilityCostRatioPct,
      });
    }
    return monthlyRows;
  }, [rawTelemetry, timeResolution, dataset, elecTariff, gasTariff, waterTariff, productPrice]);

  // Aggregated Summary Statistics
  const stats = useMemo(() => {
    const count = telemetryData.length;
    if (count === 0) {
      return {
        totalElecKwh: 0,
        totalWaterM3: 0,
        totalGasMmbtu: 0,
        totalProdTons: 0,
        avgSecElec: 0,
        avgSecGas: 0,
        avgSecWater: 0,
        totalUtilityCost: 0,
        totalRevenue: 0,
        totalValueAdd: 0,
        avgUtilitySharePct: 0,
        costElecSum: 0,
        costGasSum: 0,
        costWaterSum: 0,
        regSlope: 0,
        regIntercept: 0,
        r2: 0,
      };
    }

    const totalElecKwh = telemetryData.reduce((sum, d) => sum + d.elecKwh, 0);
    const totalWaterM3 = telemetryData.reduce((sum, d) => sum + d.waterM3, 0);
    const totalGasMmbtu = telemetryData.reduce((sum, d) => sum + d.gasMmbtu, 0);
    const totalProdTons = telemetryData.reduce((sum, d) => sum + d.prodTons, 0);

    const costElecSum = telemetryData.reduce((sum, d) => sum + d.costElec, 0);
    const costGasSum = telemetryData.reduce((sum, d) => sum + d.costGas, 0);
    const costWaterSum = telemetryData.reduce((sum, d) => sum + d.costWater, 0);
    const totalUtilityCost = costElecSum + costGasSum + costWaterSum;

    const totalRevenue = telemetryData.reduce((sum, d) => sum + d.grossRevenue, 0);
    const totalValueAdd = totalRevenue - totalUtilityCost;
    const avgUtilitySharePct = totalRevenue > 0 ? (totalUtilityCost / totalRevenue) * 100 : 0;

    const avgSecElec = totalProdTons > 0 ? totalElecKwh / totalProdTons : 0;
    const avgSecGas = totalProdTons > 0 ? totalGasMmbtu / totalProdTons : 0;
    const avgSecWater = totalProdTons > 0 ? totalWaterM3 / totalProdTons : 0;

    // Linear Regression: Total Energy (MMBTU eq) vs Production (Tons) -> E = m*P + C (Baseload)
    const n = count;
    const sumX = totalProdTons;
    const sumY = telemetryData.reduce((sum, d) => sum + d.totalEnergyMmbtu, 0);
    const sumXY = telemetryData.reduce((sum, d) => sum + d.prodTons * d.totalEnergyMmbtu, 0);
    const sumX2 = telemetryData.reduce((sum, d) => sum + d.prodTons * d.prodTons, 0);
    const sumY2 = telemetryData.reduce((sum, d) => sum + d.totalEnergyMmbtu * d.totalEnergyMmbtu, 0);

    const denom = n * sumX2 - sumX * sumX;
    const regSlope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const regIntercept = denom !== 0 ? (sumY - regSlope * sumX) / n : 0;

    const rNumerator = n * sumXY - sumX * sumY;
    const rDenom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = rDenom !== 0 ? rNumerator / rDenom : 0;
    const r2 = r * r;

    return {
      totalElecKwh,
      totalWaterM3,
      totalGasMmbtu,
      totalProdTons,
      avgSecElec,
      avgSecGas,
      avgSecWater,
      totalUtilityCost,
      totalRevenue,
      totalValueAdd,
      avgUtilitySharePct,
      costElecSum,
      costGasSum,
      costWaterSum,
      regSlope,
      regIntercept,
      r2,
    };
  }, [telemetryData]);

  // Cost Distribution Donut Data
  const costPieData = useMemo(() => [
    { name: 'Electricity (kWh)', value: Number(stats.costElecSum.toFixed(2)), color: '#3b82f6' },
    { name: 'Natural Gas (MMBTU)', value: Number(stats.costGasSum.toFixed(2)), color: '#f59e0b' },
    { name: 'Water (m³)', value: Number(stats.costWaterSum.toFixed(2)), color: '#06b6d4' },
  ], [stats]);

  // Handle CSV Export
  const handleExportCSV = () => {
    exportToCSV(telemetryData, `Energy_${timeResolution.toUpperCase()}_ValueAdd_Telemetry_${dataset.id}`);
  };

  // Helper to switch benchmark datasets directly
  const handleLoadBenchmark = (dsId: string) => {
    if (!onSelectDataset) return;
    const target = SAMPLE_DATASETS.find((d) => d.id === dsId);
    if (target) {
      onSelectDataset(target);
    }
  };

  // Human-readable labels based on time horizon
  const timeLabels = {
    hourly: {
      tag: 'Hourly / Interval Data',
      xLabel: 'Timestamp (Hour / Interval)',
      countLabel: `${telemetryData.length} Intervals`,
      rateUnit: '/hr',
      secElecTarget: 'Hourly SEC Elec',
    },
    daily: {
      tag: 'Daily Aggregated Data (30-Day)',
      xLabel: 'Day of Month',
      countLabel: `${telemetryData.length} Days`,
      rateUnit: '/day',
      secElecTarget: 'Daily SEC Elec',
    },
    monthly: {
      tag: 'Monthly ISO 50001 Baseline (12-Month)',
      xLabel: 'Month',
      countLabel: `${telemetryData.length} Months`,
      rateUnit: '/mo',
      secElecTarget: 'Monthly SEC Elec',
    },
  }[timeResolution];

  return (
    <div className="space-y-4 font-sans text-slate-800 dark:text-slate-200">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-blue-900/60 bg-[#0a1733] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-blue-400/50 bg-blue-600 shadow-sm shadow-blue-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-tight font-mono text-white">
                ENERGY MONITORING & VALUE-ADD SUITE
              </h2>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300 border border-blue-400/40">
                ISO 50001 EnPI
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-400/40">
                {timeLabels.tag}
              </span>
            </div>
            <p className="text-xs text-blue-200/80 font-mono mt-0.5">
              Electricity (kWh) · Water (m³) · Gas (MMBTU) · Production Output (Tons) · Specific Energy Consumption (SEC)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded border border-blue-700/70 bg-blue-900/60 px-3 py-1.5 text-xs font-mono font-bold text-blue-200 shadow-xs hover:bg-blue-800 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT {timeResolution.toUpperCase()} CSV</span>
          </button>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('spc-imr')}
              className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-mono font-bold text-white shadow-xs shadow-blue-500/20 border border-blue-400/40 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>SPC CHARTS</span>
            </button>
          )}
        </div>
      </div>

      {/* 1.5 TIME RESOLUTION OPTION CONTROL BAR (Monthly, Daily, Hourly) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded border border-slate-300 bg-white p-2.5 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            TIME HORIZON & AGGREGATION:
          </span>

          {/* Segmented Time Option Buttons */}
          <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setTimeResolution('hourly')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                timeResolution === 'hourly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>⚡ HOURLY (Interval)</span>
            </button>

            <button
              onClick={() => setTimeResolution('daily')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                timeResolution === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              <span>📅 DAILY DATA</span>
            </button>

            <button
              onClick={() => setTimeResolution('monthly')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                timeResolution === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>🗓️ MONTHLY DATA</span>
            </button>
          </div>
        </div>

        {/* Quick Benchmark Preset Switcher */}
        {onSelectDataset && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Load Benchmark:</span>
            <button
              onClick={() => handleLoadBenchmark('ds-energy-multi')}
              className={`px-2 py-0.5 rounded text-[11px] border font-bold transition-colors ${
                dataset.id === 'ds-energy-multi'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              48h Hourly
            </button>

            <button
              onClick={() => handleLoadBenchmark('ds-energy-daily')}
              className={`px-2 py-0.5 rounded text-[11px] border font-bold transition-colors ${
                dataset.id === 'ds-energy-daily'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              30-Day Daily
            </button>

            <button
              onClick={() => handleLoadBenchmark('ds-energy-monthly')}
              className={`px-2 py-0.5 rounded text-[11px] border font-bold transition-colors ${
                dataset.id === 'ds-energy-monthly'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              12-Month Monthly
            </button>
          </div>
        )}
      </div>

      {/* 2. Primary KPI Strip (4 Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Electricity */}
        <div className="rounded border border-slate-300 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              ELECTRICITY (kWh)
            </span>
            <span className="text-[9px] font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
              ${elecTariff.toFixed(2)}/kWh
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {stats.totalElecKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-slate-500">kWh</span>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                SEC: <span className="font-bold text-blue-600 dark:text-blue-400">{stats.avgSecElec.toFixed(2)}</span> kWh/Ton
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                ${stats.costElecSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Elec Total Cost</div>
            </div>
          </div>
        </div>

        {/* Card 2: Gas */}
        <div className="rounded border border-slate-300 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              NATURAL GAS (MMBTU)
            </span>
            <span className="text-[9px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
              ${gasTariff.toFixed(2)}/MMBTU
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {stats.totalGasMmbtu.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-500">MMBTU</span>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                SEC: <span className="font-bold text-amber-600 dark:text-amber-400">{stats.avgSecGas.toFixed(3)}</span> MMBTU/Ton
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                ${stats.costGasSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Gas Total Cost</div>
            </div>
          </div>
        </div>

        {/* Card 3: Water */}
        <div className="rounded border border-slate-300 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-cyan-500" />
              WATER (m³)
            </span>
            <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded font-bold">
              ${waterTariff.toFixed(2)}/m³
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {stats.totalWaterM3.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-500">m³</span>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                SEC: <span className="font-bold text-cyan-600 dark:text-cyan-400">{stats.avgSecWater.toFixed(3)}</span> m³/Ton
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                ${stats.costWaterSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Water Total Cost</div>
            </div>
          </div>
        </div>

        {/* Card 4: Production Volume & Value-Add */}
        <div className="rounded border border-slate-300 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5 text-emerald-500" />
              PRODUCTION (TONS) & VALUE
            </span>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
              ${productPrice}/Ton
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {stats.totalProdTons.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-500">Tons</span>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                Gross: <span className="font-bold text-emerald-600 dark:text-emerald-400">${(stats.totalRevenue / 1000).toFixed(1)}k</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                ${(stats.totalValueAdd / 1000).toFixed(1)}k
              </div>
              <div className="text-[9px] font-mono text-slate-500">Net Value Added</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            activeSubTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>VALUE-ADD & UTILITY COCKPIT</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sec-trends')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            activeSubTab === 'sec-trends'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>SEC INTENSITY & CONTROL LIMITS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('regression')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            activeSubTab === 'regression'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ISO 50001 BASELINE REGRESSION</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            activeSubTab === 'simulation'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>TARIFF & MARGIN SIMULATOR</span>
        </button>

        <button
          onClick={() => setActiveSubTab('datagrid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            activeSubTab === 'datagrid'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>TELEMETRY MATRIX</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* SUBTAB 1: Overview & Value-Add Cockpit */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Top Row: Multi-Utility vs Production Chart + Cost Breakdown Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Time-Series: Production vs Electricity (kWh) & Gas (MMBTU) */}
            <div className="lg:col-span-2 rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    PRODUCTION (TONS) VS ELECTRICITY (kWh) & GAS (MMBTU) — {timeResolution.toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Correlation tracking utility surge against throughput across {timeLabels.xLabel}</p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                  {timeLabels.countLabel}
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={telemetryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748b' }} interval={Math.max(0, Math.floor(telemetryData.length / 8))} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#3b82f6' }} domain={['auto', 'auto']} label={{ value: `Electricity (kWh${timeLabels.rateUnit})`, angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#10b981' }} domain={['auto', 'auto']} label={{ value: `Production (Tons${timeLabels.rateUnit})`, angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Bar yAxisId="right" dataKey="prodTons" name="Production (Tons)" fill="#10b981" opacity={0.35} />
                    <Line yAxisId="left" type="monotone" dataKey="elecKwh" name="Electricity (kWh)" stroke="#3b82f6" strokeWidth={2} dot={telemetryData.length <= 15} />
                    <Line yAxisId="left" type="monotone" dataKey="waterM3" name="Water (m³)" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Utility Cost Distribution Donut */}
            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white">
                    UTILITY COST BREAKDOWN
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Total: ${stats.totalUtilityCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {costPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Cost']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cost Summary Legend Table */}
              <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2 text-xs font-mono">
                {costPieData.map((item, idx) => {
                  const pct = stats.totalUtilityCost > 0 ? (item.value / stats.totalUtilityCost) * 100 : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Row: Economic Value-Add & EnPI Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-mono text-xs font-bold uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>ECONOMIC VALUE ADD (EVA)</span>
              </div>
              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Gross Output Revenue:</span>
                  <span className="font-bold text-slate-900 dark:text-white">${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Total Utilities (E+G+W):</span>
                  <span className="font-bold text-rose-500">-${stats.totalUtilityCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-emerald-500/10 px-2 rounded font-bold text-emerald-700 dark:text-emerald-400">
                  <span>Net Value Added:</span>
                  <span>${stats.totalValueAdd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-mono text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>SPECIFIC COST PER TON OUTPUT</span>
              </div>
              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Electricity Cost / Ton:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">${(stats.costElecSum / (stats.totalProdTons || 1)).toFixed(2)}/t</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Natural Gas Cost / Ton:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">${(stats.costGasSum / (stats.totalProdTons || 1)).toFixed(2)}/t</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Water Cost / Ton:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">${(stats.costWaterSum / (stats.totalProdTons || 1)).toFixed(2)}/t</span>
                </div>
                <div className="flex justify-between py-1.5 bg-blue-500/10 px-2 rounded font-bold text-blue-800 dark:text-blue-300">
                  <span>Total Utility Cost / Ton:</span>
                  <span>${(stats.totalUtilityCost / (stats.totalProdTons || 1)).toFixed(2)}/Ton</span>
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-mono text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                <span>ISO 50001 EnPI INTENSITY RATIOS</span>
              </div>
              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Electricity SEC:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.avgSecElec.toFixed(2)} kWh / Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Gas Thermal SEC:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.avgSecGas.toFixed(3)} MMBTU / Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Water Intensity:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.avgSecWater.toFixed(3)} m³ / Ton</span>
                </div>
                <div className="flex justify-between py-1.5 bg-slate-100 dark:bg-slate-900 px-2 rounded font-bold text-slate-700 dark:text-slate-300">
                  <span>Utility Cost / Revenue:</span>
                  <span>{stats.avgUtilitySharePct.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Specific Energy Consumption (SEC) Trends & Control Limits */}
      {activeSubTab === 'sec-trends' && (
        <div className="space-y-4">
          <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  SPECIFIC ELECTRICITY CONSUMPTION (SEC_Elec: kWh / Ton) — {timeResolution.toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Statistical Process Control (SPC) applied to Energy Performance Indicators across {timeLabels.xLabel}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold rounded">
                  Mean: {stats.avgSecElec.toFixed(2)} kWh/t
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748b' }} interval={Math.max(0, Math.floor(telemetryData.length / 8))} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                  <ReferenceLine y={stats.avgSecElec} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Target: ${stats.avgSecElec.toFixed(2)}`, fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <Line type="monotone" dataKey="secElec" name="SEC Electricity (kWh/Ton)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gas & Water SEC Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                SPECIFIC GAS CONSUMPTION (MMBTU / Ton)
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#64748b' }} interval={Math.max(0, Math.floor(telemetryData.length / 6))} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                    <ReferenceLine y={stats.avgSecGas} stroke="#f59e0b" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="secGas" name="SEC Gas (MMBTU/Ton)" stroke="#f59e0b" strokeWidth={2} dot={telemetryData.length <= 15} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Droplet className="w-3.5 h-3.5 text-cyan-500" />
                SPECIFIC WATER INTENSITY (m³ / Ton)
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#64748b' }} interval={Math.max(0, Math.floor(telemetryData.length / 6))} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                    <ReferenceLine y={stats.avgSecWater} stroke="#06b6d4" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="secWater" name="SEC Water (m³/Ton)" stroke="#06b6d4" strokeWidth={2} dot={telemetryData.length <= 15} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ISO 50001 Energy Baseline Regression */}
      {activeSubTab === 'regression' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Scatter & Regression Plot */}
            <div className="lg:col-span-2 rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16]">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ENERGY BASELINE (EnB) REGRESSION MODEL — {timeResolution.toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Total Energy (MMBTU Eq.) vs. Production Volume (Tons) [{timeLabels.countLabel}]
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  R² = {stats.r2.toFixed(4)}
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis type="number" dataKey="prodTons" name="Production" unit=" Tons" tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} label={{ value: `Production Volume (Tons${timeLabels.rateUnit})`, position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="number" dataKey="totalEnergyMmbtu" name="Energy" unit=" MMBTU" tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} label={{ value: `Total Energy (MMBTU Eq.${timeLabels.rateUnit})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                    <Scatter name={`${timeResolution.toUpperCase()} Observations`} data={telemetryData} fill="#3b82f6" opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regression Model Equations & Analysis */}
            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  BASELINE EQUATION (ISO 50001)
                </h3>

                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">{timeResolution.toUpperCase()} Baseline Model</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                    E = {stats.regSlope.toFixed(4)} × P + {stats.regIntercept.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">[Energy MMBTU{timeLabels.rateUnit} = Rate × Tons{timeLabels.rateUnit} + Baseload]</div>
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Fixed Baseload Energy:</span>
                    <span className="font-bold text-rose-500">{stats.regIntercept.toFixed(2)} MMBTU{timeLabels.rateUnit}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Variable Energy Rate:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{stats.regSlope.toFixed(4)} MMBTU/Ton</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Coefficient of Det. (R²):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{(stats.r2 * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded bg-blue-500/10 border border-blue-400/30 text-[11px] font-mono text-blue-800 dark:text-blue-300">
                <div className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>ISO 50001 Baseline Note</span>
                </div>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-1">
                  {timeResolution === 'monthly'
                    ? 'The 12-month annual baseline accounts for seasonal thermal shifts and weather degree days. Use this EnB equation to benchmark against current operational months.'
                    : 'The fixed baseload represents idle facility energy consumption (standby transformers, pumps, lighting). Lowering the intercept directly boosts gross value-add.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Tariff & Value-Add Simulator */}
      {activeSubTab === 'simulation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Interactive Sliders */}
            <div className="rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  TARIFF & TARIFF PARAMETERS
                </h3>
                <button
                  onClick={() => {
                    setElecTariff(0.12);
                    setGasTariff(8.50);
                    setWaterTariff(2.20);
                    setProductPrice(550);
                  }}
                  className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Defaults
                </button>
              </div>

              {/* Slider 1: Electricity Tariff */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Electricity Tariff ($/kWh):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">${elecTariff.toFixed(3)}/kWh</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.40"
                  step="0.005"
                  value={elecTariff}
                  onChange={(e) => setElecTariff(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Gas Tariff */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Natural Gas Tariff ($/MMBTU):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">${gasTariff.toFixed(2)}/MMBTU</span>
                </div>
                <input
                  type="range"
                  min="3.00"
                  max="25.00"
                  step="0.25"
                  value={gasTariff}
                  onChange={(e) => setGasTariff(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Water Tariff */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Industrial Water Tariff ($/m³):</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">${waterTariff.toFixed(2)}/m³</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="8.00"
                  step="0.10"
                  value={waterTariff}
                  onChange={(e) => setWaterTariff(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              {/* Slider 4: Finished Product Market Price */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Finished Product Price ($/Ton):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${productPrice}/Ton</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="1500"
                  step="10"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Right Column: Real-time Value Added Simulation Output */}
            <div className="lg:col-span-2 rounded border border-slate-300 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#090d16] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  DYNAMIC FINANCIAL IMPACT & VALUE-ADD MODEL ({timeResolution.toUpperCase()})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                    <div className="text-[10px] text-slate-500 uppercase">Gross Product Value</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      ${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Based on {stats.totalProdTons.toFixed(1)} Tons</div>
                  </div>

                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                    <div className="text-[10px] text-slate-500 uppercase">Simulated Utility Cost</div>
                    <div className="text-lg font-bold text-rose-500 mt-1">
                      ${stats.totalUtilityCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">${(stats.totalUtilityCost / (stats.totalProdTons || 1)).toFixed(2)}/Ton</div>
                  </div>

                  <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">Net Value Added</div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      ${stats.totalValueAdd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-emerald-600/80 mt-0.5">{(100 - stats.avgUtilitySharePct).toFixed(1)}% Gross Margin</div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                    Utility Cost Intensity vs Output Revenue:
                  </h4>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-4 rounded overflow-hidden flex font-mono text-[9px] font-bold text-white">
                    <div
                      style={{ width: `${stats.avgUtilitySharePct}%` }}
                      className="bg-rose-500 flex items-center justify-center truncate px-1"
                    >
                      {stats.avgUtilitySharePct.toFixed(1)}% Energy
                    </div>
                    <div
                      style={{ width: `${100 - stats.avgUtilitySharePct}%` }}
                      className="bg-emerald-600 flex items-center justify-center truncate px-1"
                    >
                      {(100 - stats.avgUtilitySharePct).toFixed(1)}% Margin
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <span>💡 Every 10% reduction in electricity or gas consumption adds </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +${((stats.costElecSum + stats.costGasSum) * 0.10).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span> directly to bottom-line profitability.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: Telemetry Matrix Grid */}
      {activeSubTab === 'datagrid' && (
        <div className="rounded border border-slate-300 bg-white shadow-xs dark:border-slate-800 dark:bg-[#090d16] overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white">
              {timeResolution.toUpperCase()} TELEMETRY LOGS ({telemetryData.length} ROWS)
            </h3>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Download className="w-3.5 h-3.5" /> Download {timeResolution.toUpperCase()} CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">{timeLabels.xLabel}</th>
                  <th className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">Electricity (kWh)</th>
                  <th className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">Gas (MMBTU)</th>
                  <th className="py-2 px-3 text-right text-cyan-600 dark:text-cyan-400">Water (m³)</th>
                  <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">Production (Tons)</th>
                  <th className="py-2 px-3 text-right">SEC (kWh/t)</th>
                  <th className="py-2 px-3 text-right">Utility Cost ($)</th>
                  <th className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">Value Add ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {telemetryData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-1.5 px-3 text-slate-400">{row.id}</td>
                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200">{row.timestamp}</td>
                    <td className="py-1.5 px-3 text-right text-blue-600 dark:text-blue-400 font-bold">{row.elecKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                    <td className="py-1.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">{row.gasMmbtu.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right text-cyan-600 dark:text-cyan-400 font-bold">{row.waterM3.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{row.prodTons.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                    <td className="py-1.5 px-3 text-right text-slate-700 dark:text-slate-300">{row.secElec.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-900 dark:text-white font-bold">${row.totalUtilityCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">${row.netValueAdd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
