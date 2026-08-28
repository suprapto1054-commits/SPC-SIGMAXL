import React, { useState, useEffect } from 'react';
import { CapabilityResult } from '../../types/statistics';
import { SpecificationLimits, Dataset } from '../../types/spc';
import { calculateProcessCapability } from '../../engine/capabilityEngine';
import { standardNormalInv } from '../../engine/statisticalEngine';
import { MetricCard } from '../common/MetricCard';
import { Gauge, Sliders, AlertTriangle, CheckCircle, Info, RefreshCw, Zap, Activity, Binary, Calculator } from 'lucide-react';

interface CapabilityViewProps {
  dataset: Dataset;
  columnName: string;
  initialSpecLimits?: SpecificationLimits;
  onUpdateSpecLimits?: (specs: SpecificationLimits) => void;
}

export const CapabilityView: React.FC<CapabilityViewProps> = ({
  dataset,
  columnName,
  initialSpecLimits,
  onUpdateSpecLimits,
}) => {
  const [mode, setMode] = useState<'continuous' | 'discrete'>('continuous');

  const col = dataset.columns.find((c) => c.name === columnName);
  const values = (col?.values || []).filter(
    (v) => typeof v === 'number' && !isNaN(v) && isFinite(v)
  ) as number[];

  // --- CONTINUOUS CAPABILITY STATE ---
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1)
      : 1;
  const std = Math.sqrt(variance);

  const [usl, setUsl] = useState<string>('');
  const [lsl, setLsl] = useState<string>('');
  const [target, setTarget] = useState<string>('');

  // --- DISCRETE CAPABILITY STATE ---
  const initialDefectCount = values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
  const [inspectedUnits, setInspectedUnits] = useState<string>(String(values.length || 1));
  const [opportunitiesPerUnit, setOpportunitiesPerUnit] = useState<string>('1');
  const [totalDefects, setTotalDefects] = useState<string>(String(initialDefectCount));

  // Sync state when dataset, column, or initialSpecLimits change
  useEffect(() => {
    if (initialSpecLimits?.usl !== undefined && initialSpecLimits.usl !== null) {
      setUsl(String(initialSpecLimits.usl));
    } else {
      setUsl((mean + 3.5 * (std > 0 ? std : 1)).toFixed(2));
    }

    if (initialSpecLimits?.lsl !== undefined && initialSpecLimits.lsl !== null) {
      setLsl(String(initialSpecLimits.lsl));
    } else {
      setLsl((mean - 3.5 * (std > 0 ? std : 1)).toFixed(2));
    }

    if (initialSpecLimits?.target !== undefined && initialSpecLimits.target !== null) {
      setTarget(String(initialSpecLimits.target));
    } else {
      setTarget(mean.toFixed(2));
    }
    
    // Reset discrete baseline when column changes
    setInspectedUnits(String(values.length || 1));
    setOpportunitiesPerUnit('1');
    setTotalDefects(String(values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0)));
    
  }, [dataset.id, columnName, initialSpecLimits?.usl, initialSpecLimits?.lsl, initialSpecLimits?.target, mean, std, values.length]);

  const numUsl = parseFloat(usl);
  const numLsl = parseFloat(lsl);
  const numTarget = parseFloat(target);

  const isUslValid = !isNaN(numUsl) && isFinite(numUsl);
  const isLslValid = !isNaN(numLsl) && isFinite(numLsl);
  const isTargetValid = !isNaN(numTarget) && isFinite(numTarget);

  // Validate spec range
  const hasInvertedSpecs = isUslValid && isLslValid && numUsl <= numLsl;

  const specLimits: SpecificationLimits = {
    usl: isUslValid && !hasInvertedSpecs ? numUsl : undefined,
    lsl: isLslValid && !hasInvertedSpecs ? numLsl : undefined,
    target: isTargetValid ? numTarget : undefined,
  };

  // Safe capability calculation
  const capability: CapabilityResult = calculateProcessCapability(values, specLimits);

  // --- CONTINUOUS SIGMA LEVEL ---
  let continuousYield = 0;
  let continuousSigmaLevel = 0;
  if (typeof capability.expectedPpmTotal === 'number' && !isNaN(capability.expectedPpmTotal)) {
     continuousYield = 1 - (capability.expectedPpmTotal / 1_000_000);
     continuousSigmaLevel = standardNormalInv(Math.max(0.0000001, Math.min(0.9999999, continuousYield))) + 1.5;
  }

  // --- DISCRETE SIGMA LEVEL ---
  const numInspected = parseFloat(inspectedUnits) || 0;
  const numOpp = parseFloat(opportunitiesPerUnit) || 0;
  const numDefects = parseFloat(totalDefects) || 0;
  
  const totalOpportunities = numInspected * numOpp;
  let discreteDpmo = 0;
  let discreteYield = 0;
  let discreteSigmaLevel = 0;
  
  if (totalOpportunities > 0) {
    discreteDpmo = (numDefects / totalOpportunities) * 1_000_000;
    discreteYield = Math.max(0, 1 - (discreteDpmo / 1_000_000));
    discreteSigmaLevel = standardNormalInv(Math.max(0.0000001, Math.min(0.9999999, discreteYield))) + 1.5;
  }

  const handleApplySpecs = () => {
    onUpdateSpecLimits?.(specLimits);
  };

  const handleSetPreset = (multiplier: number) => {
    const s = std > 0 ? std : 1;
    const newUsl = (mean + multiplier * s).toFixed(2);
    const newLsl = (mean - multiplier * s).toFixed(2);
    const newTarget = mean.toFixed(2);
    setUsl(newUsl);
    setLsl(newLsl);
    setTarget(newTarget);
    onUpdateSpecLimits?.({
      usl: parseFloat(newUsl),
      lsl: parseFloat(newLsl),
      target: parseFloat(newTarget),
    });
  };

  const handleClearSpecs = () => {
    setUsl('');
    setLsl('');
    setTarget('');
    onUpdateSpecLimits?.({
      usl: undefined,
      lsl: undefined,
      target: undefined,
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'CAPABLE':
        return 'success';
      case 'MARGINAL':
        return 'warning';
      default:
        return 'danger';
    }
  };

  // SVG dimensions for Capability Distribution Chart
  const svgWidth = 800;
  const svgHeight = 280;
  const margin = { top: 30, right: 40, bottom: 40, left: 50 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Safe sigma bounds
  const sigmaO = capability?.sigmaOverall && capability.sigmaOverall > 0 ? capability.sigmaOverall : (std > 0 ? std : 1);
  const sigmaW = capability?.sigmaWithin && capability.sigmaWithin > 0 ? capability.sigmaWithin : sigmaO;
  const safeMean = typeof capability?.mean === 'number' && !isNaN(capability.mean) ? capability.mean : mean;

  const minBound = specLimits.lsl !== undefined ? specLimits.lsl - 0.5 * sigmaO : safeMean - 4 * sigmaO;
  const maxBound = specLimits.usl !== undefined ? specLimits.usl + 0.5 * sigmaO : safeMean + 4 * sigmaO;

  const chartMin = isFinite(minBound) ? Math.min(minBound, safeMean - 4 * sigmaO) : safeMean - 4 * sigmaO;
  const chartMax = isFinite(maxBound) ? Math.max(maxBound, safeMean + 4 * sigmaO) : safeMean + 4 * sigmaO;
  const chartRange = chartMax > chartMin ? chartMax - chartMin : 8 * sigmaO;

  const scaleX = (val: number): number => {
    if (!isFinite(val) || chartRange <= 0) return margin.left + innerWidth / 2;
    const ratio = (val - chartMin) / chartRange;
    return margin.left + Math.max(0, Math.min(1, ratio)) * innerWidth;
  };

  // Generate Within & Overall Normal Density Curves safely
  const curvePointsWithin: { x: number; y: number }[] = [];
  const curvePointsOverall: { x: number; y: number }[] = [];
  const steps = 80;
  const stepSize = chartRange / steps;

  let maxPdf = 0;
  if (sigmaW > 0 && sigmaO > 0 && stepSize > 0) {
    for (let i = 0; i <= steps; i++) {
      const x = chartMin + i * stepSize;
      const zW = (x - safeMean) / sigmaW;
      const pdfW = (1 / (sigmaW * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * zW * zW);
      const zO = (x - safeMean) / sigmaO;
      const pdfO = (1 / (sigmaO * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * zO * zO);

      if (isFinite(pdfW) && isFinite(pdfO)) {
        maxPdf = Math.max(maxPdf, pdfW, pdfO);
        curvePointsWithin.push({ x, y: pdfW });
        curvePointsOverall.push({ x, y: pdfO });
      }
    }
  }

  const scaleY = (pdf: number): number => {
    if (!isFinite(pdf) || maxPdf <= 0) return margin.top + innerHeight;
    const ratio = pdf / (maxPdf * 1.15 || 1);
    return margin.top + innerHeight - Math.max(0, Math.min(1, ratio)) * innerHeight;
  };

  const withinPolylinePoints = curvePointsWithin
    .map((p) => `${scaleX(p.x)},${scaleY(p.y)}`)
    .filter((pt) => !pt.includes('NaN') && !pt.includes('Infinity'))
    .join(' ');

  const overallPolylinePoints = curvePointsOverall
    .map((p) => `${scaleX(p.x)},${scaleY(p.y)}`)
    .filter((pt) => !pt.includes('NaN') && !pt.includes('Infinity'))
    .join(' ');

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg w-fit">
        <button
          onClick={() => setMode('continuous')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === 'continuous'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          CONTINUOUS VARIABLES
        </button>
        <button
          onClick={() => setMode('discrete')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === 'discrete'
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Binary className="w-4 h-4" />
          DISCRETE ATTRIBUTES
        </button>
      </div>

      {mode === 'continuous' && (
        <>
          {/* Spec Limit Configuration Toolbar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#020617]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white font-mono">
                  PROCESS CAPABILITY & SPECIFICATION LIMITS SETUP
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  ({columnName} • {values.length} obs)
                </span>
              </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] uppercase text-slate-400 font-bold hidden sm:inline">Presets:</span>
            <button
              onClick={() => handleSetPreset(3.0)}
              className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ±3.0σ (99.73%)
            </button>
            <button
              onClick={() => handleSetPreset(4.0)}
              className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ±4.0σ
            </button>
            <button
              onClick={() => handleSetPreset(6.0)}
              className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
            >
              ±6.0σ (6-Sigma)
            </button>
            <button
              onClick={handleClearSpecs}
              className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              LOWER SPEC LIMIT (LSL)
            </label>
            <input
              type="number"
              step="any"
              value={lsl}
              onChange={(e) => setLsl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-white"
              placeholder="e.g. 49.5"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              TARGET (NOMINAL)
            </label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-white"
              placeholder="e.g. 50.0"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              UPPER SPEC LIMIT (USL)
            </label>
            <input
              type="number"
              step="any"
              value={usl}
              onChange={(e) => setUsl(e.target.value)}
              className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs placeholder-slate-400 focus:outline-hidden ${
                hasInvertedSpecs
                  ? 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 focus:border-rose-600'
                  : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-white'
              }`}
              placeholder="e.g. 50.5"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplySpecs}
              disabled={hasInvertedSpecs}
              className="w-full rounded-lg border border-sky-500 bg-sky-500 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              APPLY & RECALCULATE
            </button>
          </div>
        </div>

        {/* Warning if USL <= LSL */}
        {hasInvertedSpecs && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Specification error: Upper Spec Limit (USL) must be strictly greater than Lower Spec Limit (LSL).</span>
          </div>
        )}
      </div>

      {/* Capability Overview Status Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 shadow-xs ${
          capability.status === 'EXCELLENT' || capability.status === 'CAPABLE'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
            : capability.status === 'MARGINAL'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-sky-500 shadow-xs">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white font-mono">
                STATUS: {capability.status || 'UNDEFINED'}
              </h3>
              <span className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-2 py-0.5 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 shadow-xs">
                Cpk = {typeof capability.cpk === 'number' && !isNaN(capability.cpk) ? capability.cpk.toFixed(2) : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              {capability.interpretation || 'Enter valid specification limits to calculate process capability indices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">EXPECTED DPM:</span>
            <p className="font-bold text-rose-600 dark:text-rose-400">
              {typeof capability.expectedPpmTotal === 'number' && !isNaN(capability.expectedPpmTotal)
                ? Math.round(capability.expectedPpmTotal).toLocaleString()
                : '0'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">OBSERVED DPM:</span>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              {typeof capability.observedPpm === 'number' && !isNaN(capability.observedPpm)
                ? Math.round(capability.observedPpm).toLocaleString()
                : '0'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Z-BENCHMARK:</span>
            <p className="font-bold text-sky-600 dark:text-sky-400">
              {typeof capability.zBenchmark === 'number' && !isNaN(capability.zBenchmark)
                ? capability.zBenchmark.toFixed(2)
                : '—'}
              σ
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">PROCESS SIGMA:</span>
            <p className="font-bold text-purple-600 dark:text-purple-400">
              {continuousSigmaLevel > 0
                ? continuousSigmaLevel.toFixed(2)
                : '—'}
              σ
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Potential (Cp)"
          value={typeof capability.cp === 'number' && !isNaN(capability.cp) ? capability.cp.toFixed(2) : 'N/A'}
          subtitle={`±3σ_w (${(6 * sigmaW).toFixed(3)})`}
          badge={typeof capability.cp === 'number' && capability.cp >= 1.33 ? 'PASS' : 'LOW'}
          badgeType={getStatusColor(capability.status)}
        />
        <MetricCard
          title="Capability (Cpk)"
          value={typeof capability.cpk === 'number' && !isNaN(capability.cpk) ? capability.cpk.toFixed(2) : 'N/A'}
          subtitle={`Cpl: ${typeof capability.cpl === 'number' ? capability.cpl.toFixed(2) : '—'}, Cpu: ${typeof capability.cpu === 'number' ? capability.cpu.toFixed(2) : '—'}`}
          badge={typeof capability.cpk === 'number' && capability.cpk >= 1.33 ? '>=1.33' : '<1.33'}
          badgeType={getStatusColor(capability.status)}
        />
        <MetricCard
          title="Performance (Pp)"
          value={typeof capability.pp === 'number' && !isNaN(capability.pp) ? capability.pp.toFixed(2) : 'N/A'}
          subtitle={`±3σ_o (${(6 * sigmaO).toFixed(3)})`}
          badgeType="info"
        />
        <MetricCard
          title="Overall Cap (Ppk)"
          value={typeof capability.ppk === 'number' && !isNaN(capability.ppk) ? capability.ppk.toFixed(2) : 'N/A'}
          subtitle={`Ppl: ${typeof capability.ppl === 'number' ? capability.ppl.toFixed(2) : '—'}, Ppu: ${typeof capability.ppu === 'number' ? capability.ppu.toFixed(2) : '—'}`}
          badgeType="info"
        />
      </div>

      {/* Capability Distribution Overlay Chart */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#020617]">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800 gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 font-mono">
              PROCESS DISTRIBUTION // GAUSSIAN DENSITY VS LIMITS
            </h4>
            <p className="text-[10px] font-mono text-slate-500">
              Within-Subgroup Short Term (Solid Sky) vs Overall Long Term (Dashed Violet)
            </p>
          </div>
          <div className="flex gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-sky-500 font-bold">
              <span className="h-0.5 w-3 bg-sky-500" /> WITHIN (σ={sigmaW.toFixed(3)})
            </span>
            <span className="flex items-center gap-1.5 text-purple-500 font-bold">
              <span className="h-0.5 w-3 bg-purple-500 border-b border-dashed" /> OVERALL (σ={sigmaO.toFixed(3)})
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px', maxHeight: '340px' }}
          >
            {/* Background */}
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              className="fill-slate-50 dark:fill-[#020617]"
            />

            {/* Spec Limit Lines */}
            {specLimits.lsl !== undefined && isFinite(specLimits.lsl) && (
              <g>
                <line
                  x1={scaleX(specLimits.lsl)}
                  y1={margin.top}
                  x2={scaleX(specLimits.lsl)}
                  y2={margin.top + innerHeight}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={scaleX(specLimits.lsl) - 5}
                  y={margin.top + 15}
                  textAnchor="end"
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  LSL ({specLimits.lsl})
                </text>
              </g>
            )}

            {specLimits.target !== undefined && isFinite(specLimits.target) && (
              <g>
                <line
                  x1={scaleX(specLimits.target)}
                  y1={margin.top}
                  x2={scaleX(specLimits.target)}
                  y2={margin.top + innerHeight}
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <text
                  x={scaleX(specLimits.target)}
                  y={margin.top + 15}
                  textAnchor="middle"
                  fill="#10b981"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TARGET ({specLimits.target})
                </text>
              </g>
            )}

            {specLimits.usl !== undefined && isFinite(specLimits.usl) && (
              <g>
                <line
                  x1={scaleX(specLimits.usl)}
                  y1={margin.top}
                  x2={scaleX(specLimits.usl)}
                  y2={margin.top + innerHeight}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={scaleX(specLimits.usl) + 5}
                  y={margin.top + 15}
                  textAnchor="start"
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  USL ({specLimits.usl})
                </text>
              </g>
            )}

            {/* Mean (Center) Line */}
            <line
              x1={scaleX(safeMean)}
              y1={margin.top}
              x2={scaleX(safeMean)}
              y2={margin.top + innerHeight}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <text
              x={scaleX(safeMean)}
              y={margin.top + innerHeight - 6}
              textAnchor="middle"
              fill="#0284c7"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Mean ({safeMean.toFixed(2)})
            </text>

            {/* Normal Curves */}
            {withinPolylinePoints && (
              <polyline
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                points={withinPolylinePoints}
              />
            )}

            {overallPolylinePoints && (
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                points={overallPolylinePoints}
              />
            )}

            {/* X-Axis */}
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
      </>
      )}

      {mode === 'discrete' && (
        <>
          {/* Discrete Capability Config */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#020617]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white font-mono">
                  DISCRETE PROCESS METRICS SETUP
                </h3>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  TOTAL UNITS INSPECTED
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={inspectedUnits}
                  onChange={(e) => setInspectedUnits(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-white"
                  placeholder="e.g. 1000"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  OPPORTUNITIES PER UNIT (OPP)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={opportunitiesPerUnit}
                  onChange={(e) => setOpportunitiesPerUnit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-white"
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  TOTAL DEFECTS OBSERVED
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalDefects}
                  onChange={(e) => setTotalDefects(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-white"
                  placeholder="e.g. 15"
                />
              </div>
            </div>
            
            {totalOpportunities === 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Error: Total Units and Opportunities must be strictly greater than 0.</span>
              </div>
            )}
          </div>
          
          {/* Discrete Capability Metrics */}
          {totalOpportunities > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                title="TOTAL OPPORTUNITIES"
                value={totalOpportunities.toLocaleString()}
                subtitle={`${numInspected} units × ${numOpp} opps`}
                badgeType="neutral"
              />
              <MetricCard
                title="DPMO (Defects Per Million)"
                value={Math.round(discreteDpmo).toLocaleString()}
                subtitle="DPMO"
                badge={discreteDpmo < 3.4 ? '6-SIGMA' : (discreteDpmo < 66807 ? 'CAPABLE' : 'HIGH')}
                badgeType={discreteDpmo < 66807 ? 'success' : 'danger'}
              />
              <MetricCard
                title="PROCESS YIELD"
                value={(discreteYield * 100).toFixed(4)}
                subtitle="%"
                badgeType={discreteYield > 0.99 ? 'success' : 'warning'}
              />
              <MetricCard
                title="PROCESS SIGMA LEVEL"
                value={discreteSigmaLevel.toFixed(2)}
                subtitle="σ (Short Term)"
                badge={discreteSigmaLevel >= 6 ? 'WORLD CLASS' : (discreteSigmaLevel >= 4 ? 'SATISFACTORY' : 'POOR')}
                badgeType={discreteSigmaLevel >= 4 ? 'success' : 'danger'}
              />
            </div>
          )}
          
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 flex gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Info className="h-5 w-5 shrink-0 text-slate-400" />
            <p>
              <strong>Discrete Capability Analysis</strong> uses the Defect Per Million Opportunities (DPMO) standard. 
              The <em>Process Sigma Level</em> displayed is calculated assuming the standard normal inverse of the Yield, shifted by a 1.5σ allowance for long-term variation drifting 
              (<code className="px-1 text-xs">Sigma = Z(Yield) + 1.5</code>). 
              A 6-Sigma process equates to 3.4 DPMO or ~99.99966% yield.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
