import React, { useState } from 'react';
import { CapabilityResult } from '../../types/statistics';
import { SpecificationLimits, Dataset } from '../../types/spc';
import { calculateProcessCapability } from '../../engine/capabilityEngine';
import { MetricCard } from '../common/MetricCard';
import { Gauge, Sliders, AlertCircle, CheckCircle, Info } from 'lucide-react';

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

  // Auto-suggest reasonable spec limits if not set (Mean ± 3.5*stdDev)
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1)
      : 1;
  const std = Math.sqrt(variance);

  const [usl, setUsl] = useState<string>(
    initialSpecLimits?.usl !== undefined
      ? String(initialSpecLimits.usl)
      : (mean + 3.5 * std).toFixed(2)
  );
  const [lsl, setLsl] = useState<string>(
    initialSpecLimits?.lsl !== undefined
      ? String(initialSpecLimits.lsl)
      : (mean - 3.5 * std).toFixed(2)
  );
  const [target, setTarget] = useState<string>(
    initialSpecLimits?.target !== undefined ? String(initialSpecLimits.target) : mean.toFixed(2)
  );

  const numUsl = parseFloat(usl);
  const numLsl = parseFloat(lsl);
  const numTarget = parseFloat(target);

  const specLimits: SpecificationLimits = {
    usl: !isNaN(numUsl) ? numUsl : undefined,
    lsl: !isNaN(numLsl) ? numLsl : undefined,
    target: !isNaN(numTarget) ? numTarget : undefined,
  };

  const capability: CapabilityResult = calculateProcessCapability(values, specLimits);

  const handleApplySpecs = () => {
    onUpdateSpecLimits?.(specLimits);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'success';
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

  // Chart range encompassing LSL, USL, and mean ± 4 sigma
  const chartMin = Math.min(
    capability.mean - 4 * capability.sigmaOverall,
    specLimits.lsl !== undefined ? specLimits.lsl - 0.5 * capability.sigmaOverall : capability.mean - 4 * capability.sigmaOverall
  );
  const chartMax = Math.max(
    capability.mean + 4 * capability.sigmaOverall,
    specLimits.usl !== undefined ? specLimits.usl + 0.5 * capability.sigmaOverall : capability.mean + 4 * capability.sigmaOverall
  );

  const scaleX = (val: number) => {
    return margin.left + ((val - chartMin) / (chartMax - chartMin)) * innerWidth;
  };

  // Generate Within & Overall Normal Density Curves
  const curvePointsWithin: { x: number; y: number }[] = [];
  const curvePointsOverall: { x: number; y: number }[] = [];
  const steps = 80;
  const stepSize = (chartMax - chartMin) / steps;

  let maxPdf = 0;
  for (let i = 0; i <= steps; i++) {
    const x = chartMin + i * stepSize;
    // PDF within
    const zW = (x - capability.mean) / capability.sigmaWithin;
    const pdfW = (1 / (capability.sigmaWithin * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * zW * zW);
    // PDF overall
    const zO = (x - capability.mean) / capability.sigmaOverall;
    const pdfO = (1 / (capability.sigmaOverall * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * zO * zO);

    maxPdf = Math.max(maxPdf, pdfW, pdfO);
    curvePointsWithin.push({ x, y: pdfW });
    curvePointsOverall.push({ x, y: pdfO });
  }

  const scaleY = (pdf: number) => {
    return margin.top + innerHeight - (pdf / (maxPdf * 1.15 || 1)) * innerHeight;
  };

  return (
    <div className="space-y-3">
      {/* Spec Limit Configuration Toolbar */}
      <div className="rounded border border-slate-800 bg-[#020617] p-3.5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sliders className="h-4 w-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono">
            PROCESS CAPABILITY & SPECIFICATION LIMITS SETUP
          </h3>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400">
              LOWER SPEC LIMIT (LSL)
            </label>
            <input
              type="number"
              step="any"
              value={lsl}
              onChange={(e) => setLsl(e.target.value)}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-500 focus:outline-hidden"
              placeholder="e.g. 49.5"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400">
              TARGET (NOMINAL)
            </label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-500 focus:outline-hidden"
              placeholder="e.g. 50.0"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400">
              UPPER SPEC LIMIT (USL)
            </label>
            <input
              type="number"
              step="any"
              value={usl}
              onChange={(e) => setUsl(e.target.value)}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-500 focus:outline-hidden"
              placeholder="e.g. 50.5"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplySpecs}
              className="w-full rounded border border-sky-500 bg-sky-500/10 px-3 py-1.5 text-xs font-mono font-bold text-sky-400 hover:bg-sky-500 hover:text-slate-950 transition-colors shadow-xs"
            >
              UPDATE MODEL
            </button>
          </div>
        </div>
      </div>

      {/* Capability Overview Status Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded border p-3.5 ${
          capability.status === 'EXCELLENT' || capability.status === 'CAPABLE'
            ? 'border-emerald-500/30 bg-emerald-950/20'
            : capability.status === 'MARGINAL'
            ? 'border-amber-500/30 bg-amber-950/20'
            : 'border-rose-500/30 bg-rose-950/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-slate-800 bg-slate-900 text-sky-400 shadow-xs">
            <Gauge className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white font-mono">
                STATUS: {capability.status}
              </h3>
              <span className="rounded border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400 shadow-xs">
                Cpk = {capability.cpk !== undefined ? capability.cpk.toFixed(2) : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {capability.interpretation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase text-slate-500">DEFECT RATE:</span>
            <p className="font-bold text-slate-200">
              {capability.expectedPpmTotal.toFixed(0)} PPM
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500">BENCHMARK:</span>
            <p className="font-bold text-sky-400">
              {capability.zBenchmark.toFixed(2)}σ
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          title="Potential (Cp)"
          value={capability.cp !== undefined ? capability.cp.toFixed(2) : 'N/A'}
          subtitle={`±3σ_w (${(6 * capability.sigmaWithin).toFixed(3)})`}
          badge={capability.cp && capability.cp >= 1.33 ? 'PASS' : 'LOW'}
          badgeType={getStatusColor(capability.status)}
        />
        <MetricCard
          title="Capability (Cpk)"
          value={capability.cpk !== undefined ? capability.cpk.toFixed(2) : 'N/A'}
          subtitle={`Cpl: ${capability.cpl?.toFixed(2) ?? '—'}, Cpu: ${capability.cpu?.toFixed(2) ?? '—'}`}
          badge={capability.cpk && capability.cpk >= 1.33 ? '>=1.33' : '<1.33'}
          badgeType={getStatusColor(capability.status)}
        />
        <MetricCard
          title="Performance (Pp)"
          value={capability.pp !== undefined ? capability.pp.toFixed(2) : 'N/A'}
          subtitle={`±3σ_o (${(6 * capability.sigmaOverall).toFixed(3)})`}
          badgeType="info"
        />
        <MetricCard
          title="Overall Cap (Ppk)"
          value={capability.ppk !== undefined ? capability.ppk.toFixed(2) : 'N/A'}
          subtitle={`Ppl: ${capability.ppl?.toFixed(2) ?? '—'}, Ppu: ${capability.ppu?.toFixed(2) ?? '—'}`}
          badgeType="info"
        />
      </div>

      {/* Capability Distribution Overlay Chart */}
      <div className="overflow-hidden rounded border border-slate-800 bg-[#020617] p-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
              PROCESS DISTRIBUTION // GAUSSIAN DENSITY VS LIMITS
            </h4>
            <p className="text-[10px] font-mono text-slate-500">
              Within-Subgroup (Solid Sky) vs Overall Process (Dashed Violet)
            </p>
          </div>
          <div className="flex gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-sky-400 font-bold">
              <span className="h-0.5 w-3 bg-sky-400" /> WITHIN (σ={capability.sigmaWithin.toFixed(3)})
            </span>
            <span className="flex items-center gap-1.5 text-purple-400 font-bold">
              <span className="h-0.5 w-3 bg-purple-400 border-b border-dashed" /> OVERALL (σ={capability.sigmaOverall.toFixed(3)})
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
              fill="#020617"
            />

            {/* Spec Limit Lines */}
            {specLimits.lsl !== undefined && (
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

            {specLimits.target !== undefined && (
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

            {specLimits.usl !== undefined && (
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
              x1={scaleX(capability.mean)}
              y1={margin.top}
              x2={scaleX(capability.mean)}
              y2={margin.top + innerHeight}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <text
              x={scaleX(capability.mean)}
              y={margin.top + innerHeight - 6}
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Mean ({capability.mean.toFixed(2)})
            </text>

            {/* Normal Curves */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              points={curvePointsWithin.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')}
            />

            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              points={curvePointsOverall.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')}
            />

            {/* X-Axis */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
              stroke="#334155"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
