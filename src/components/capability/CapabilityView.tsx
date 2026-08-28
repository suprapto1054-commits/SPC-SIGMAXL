import React, { useState, useEffect } from 'react';
import { CapabilityResult } from '../../types/statistics';
import { SpecificationLimits, Dataset } from '../../types/spc';
import { calculateProcessCapability } from '../../engine/capabilityEngine';
import { MetricCard } from '../common/MetricCard';
import { Gauge, Sliders, AlertTriangle, CheckCircle, Info, RefreshCw, Zap } from 'lucide-react';

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
  const col = dataset.columns.find((c) => c.name === columnName);
  const values = (col?.values || []).filter(
    (v) => typeof v === 'number' && !isNaN(v) && isFinite(v)
  ) as number[];

  // Statistics for default auto-suggestions
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1)
      : 1;
  const std = Math.sqrt(variance);

  // Local input states for USL, LSL, Target
  const [usl, setUsl] = useState<string>('');
  const [lsl, setLsl] = useState<string>('');
  const [target, setTarget] = useState<string>('');

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
  }, [dataset.id, columnName, initialSpecLimits?.usl, initialSpecLimits?.lsl, initialSpecLimits?.target, mean, std]);

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
    </div>
  );
};
