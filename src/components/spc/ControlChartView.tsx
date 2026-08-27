import React, { useState, useRef } from 'react';
import { SpcCalculationResult, ChartPoint } from '../../types/spc';
import { SigmaZoneLegend } from './SigmaZoneLegend';
import { PointInspectorModal } from './PointInspectorModal';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ControlChartViewProps {
  result: SpcCalculationResult;
  selectedPoint?: number | null;
  onSelectPoint?: (pointNumber: number | null) => void;
  metadata?: Record<string, any>;
}

export const ControlChartView: React.FC<ControlChartViewProps> = ({
  result,
  selectedPoint,
  onSelectPoint,
  metadata,
}) => {
  const [showZones, setShowZones] = useState(true);
  const [showLimits, setShowLimits] = useState(true);
  const [showSpecLimits, setShowSpecLimits] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [inspectedPoint, setInspectedPoint] = useState<ChartPoint | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const primarySvgRef = useRef<SVGSVGElement>(null);

  const { primaryChart, secondaryChart, specificationLimits } = result;
  const points = primaryChart.points;
  const zones = primaryChart.zones;

  // Chart dimensions & scaling
  const width = 850;
  const height = 340;
  const margin = { top: 30, right: 90, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Calculate Y domain to encompass all data, 3-sigma limits, and optional specs
  const allYValues = points.map((p) => p.value);
  allYValues.push(zones.plus3Sigma, zones.minus3Sigma, zones.centerLine);
  if (specificationLimits?.usl) allYValues.push(specificationLimits.usl);
  if (specificationLimits?.lsl) allYValues.push(specificationLimits.lsl);

  const minY = Math.min(...allYValues);
  const maxY = Math.max(...allYValues);
  const yPadding = (maxY - minY) * 0.12 || 1;
  const yDomainMin = minY - yPadding;
  const yDomainMax = maxY + yPadding;

  // Coordinate transforms
  const scaleY = (val: number) => {
    return margin.top + innerHeight - ((val - yDomainMin) / (yDomainMax - yDomainMin)) * innerHeight;
  };

  const scaleX = (idx: number) => {
    const totalPoints = points.length;
    const baseStep = totalPoints > 1 ? innerWidth / (totalPoints - 1) : innerWidth / 2;
    const effectiveStep = baseStep * zoomLevel;
    return margin.left + (idx - 1) * effectiveStep + panOffset;
  };

  // Export as PNG
  const handleExportPNG = () => {
    if (!primarySvgRef.current) return;
    const svgElement = primarySvgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(image, 0, 0);
        const pngURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${result.chartType}_Control_Chart.png`;
        downloadLink.href = pngURL;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Chart Canvas Card */}
      <div className="overflow-hidden rounded border border-slate-800 bg-[#020617] shadow-xs">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-xs bg-sky-400"></div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono">
                {primaryChart.title}
              </h3>
              <p className="text-[10px] font-mono text-slate-500">
                SAMPLE_SIZE: N={result.n} | SUBGROUP: n={result.subgroupSize} | SIGMA_W: {result.sigmaWithin.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center rounded border border-slate-800 bg-slate-900/90 p-0.5 font-mono text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3.5))}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset(0);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Reset View"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900/90 px-2 py-1 text-[10px] font-mono font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Download className="w-3 h-3 text-sky-400" />
              PNG
            </button>
          </div>
        </div>

        {/* Primary Chart SVG */}
        <div className="relative overflow-x-auto bg-[#020617] p-2">
          <svg
            ref={primarySvgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '650px', maxHeight: '420px' }}
          >
            <defs>
              <clipPath id="chart-area-clip">
                <rect x={margin.left} y={margin.top} width={innerWidth} height={innerHeight} />
              </clipPath>
              <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1e293b" fillOpacity="0.8" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              fill="#020617"
            />
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              fill="url(#dot-grid)"
            />

            {/* Sigma Zones Shading (Zone A, B, C) */}
            {showZones && (
              <g clipPath="url(#chart-area-clip)">
                {/* Upper Zone A: +2σ to +3σ */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.plus3Sigma)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.plus2Sigma) - scaleY(zones.plus3Sigma))}
                  fill="#fee2e2"
                  fillOpacity="0.45"
                />
                {/* Upper Zone B: +1σ to +2σ */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.plus2Sigma)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.plus1Sigma) - scaleY(zones.plus2Sigma))}
                  fill="#fef3c7"
                  fillOpacity="0.45"
                />
                {/* Upper Zone C: CL to +1σ */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.plus1Sigma)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.centerLine) - scaleY(zones.plus1Sigma))}
                  fill="#dcfce7"
                  fillOpacity="0.45"
                />
                {/* Lower Zone C: -1σ to CL */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.centerLine)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.minus1Sigma) - scaleY(zones.centerLine))}
                  fill="#dcfce7"
                  fillOpacity="0.45"
                />
                {/* Lower Zone B: -2σ to -1σ */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.minus1Sigma)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.minus2Sigma) - scaleY(zones.minus1Sigma))}
                  fill="#fef3c7"
                  fillOpacity="0.45"
                />
                {/* Lower Zone A: -3σ to -2σ */}
                <rect
                  x={margin.left}
                  y={scaleY(zones.minus2Sigma)}
                  width={innerWidth}
                  height={Math.max(0, scaleY(zones.minus3Sigma) - scaleY(zones.minus2Sigma))}
                  fill="#fee2e2"
                  fillOpacity="0.45"
                />
              </g>
            )}

            {/* Sigma Boundary Lines & Labels */}
            {showLimits && (
              <g>
                {/* UCL (+3σ) */}
                <line
                  x1={margin.left}
                  y1={scaleY(zones.plus3Sigma)}
                  x2={margin.left + innerWidth}
                  y2={scaleY(zones.plus3Sigma)}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={margin.left + innerWidth + 6}
                  y={scaleY(zones.plus3Sigma) + 3}
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  UCL={zones.plus3Sigma.toFixed(2)}
                </text>

                {/* +2σ line */}
                {showZones && (
                  <line
                    x1={margin.left}
                    y1={scaleY(zones.plus2Sigma)}
                    x2={margin.left + innerWidth}
                    y2={scaleY(zones.plus2Sigma)}
                    stroke="#f59e0b"
                    strokeWidth="0.75"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                  />
                )}

                {/* +1σ line */}
                {showZones && (
                  <line
                    x1={margin.left}
                    y1={scaleY(zones.plus1Sigma)}
                    x2={margin.left + innerWidth}
                    y2={scaleY(zones.plus1Sigma)}
                    stroke="#10b981"
                    strokeWidth="0.75"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Center Line (CL) */}
                <line
                  x1={margin.left}
                  y1={scaleY(zones.centerLine)}
                  x2={margin.left + innerWidth}
                  y2={scaleY(zones.centerLine)}
                  stroke="#0284c7"
                  strokeWidth="1.75"
                />
                <text
                  x={margin.left + innerWidth + 6}
                  y={scaleY(zones.centerLine) + 3}
                  fill="#38bdf8"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  CL={zones.centerLine.toFixed(2)}
                </text>

                {/* -1σ line */}
                {showZones && (
                  <line
                    x1={margin.left}
                    y1={scaleY(zones.minus1Sigma)}
                    x2={margin.left + innerWidth}
                    y2={scaleY(zones.minus1Sigma)}
                    stroke="#10b981"
                    strokeWidth="0.75"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                  />
                )}

                {/* -2σ line */}
                {showZones && (
                  <line
                    x1={margin.left}
                    y1={scaleY(zones.minus2Sigma)}
                    x2={margin.left + innerWidth}
                    y2={scaleY(zones.minus2Sigma)}
                    stroke="#f59e0b"
                    strokeWidth="0.75"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                  />
                )}

                {/* LCL (-3σ) */}
                <line
                  x1={margin.left}
                  y1={scaleY(zones.minus3Sigma)}
                  x2={margin.left + innerWidth}
                  y2={scaleY(zones.minus3Sigma)}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={margin.left + innerWidth + 6}
                  y={scaleY(zones.minus3Sigma) + 3}
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  LCL={zones.minus3Sigma.toFixed(2)}
                </text>
              </g>
            )}

            {/* Optional Specification Limits (USL/LSL/Target) */}
            {showSpecLimits && specificationLimits && (
              <g>
                {specificationLimits.usl !== undefined && (
                  <>
                    <line
                      x1={margin.left}
                      y1={scaleY(specificationLimits.usl)}
                      x2={margin.left + innerWidth}
                      y2={scaleY(specificationLimits.usl)}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={margin.left + 6}
                      y={scaleY(specificationLimits.usl) - 5}
                      fill="#fbbf24"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      USL={specificationLimits.usl}
                    </text>
                  </>
                )}
                {specificationLimits.lsl !== undefined && (
                  <>
                    <line
                      x1={margin.left}
                      y1={scaleY(specificationLimits.lsl)}
                      x2={margin.left + innerWidth}
                      y2={scaleY(specificationLimits.lsl)}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={margin.left + 6}
                      y={scaleY(specificationLimits.lsl) + 12}
                      fill="#fbbf24"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      LSL={specificationLimits.lsl}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Connecting Data Line */}
            <g clipPath="url(#chart-area-clip)">
              <polyline
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="1.5"
                points={points.map((p) => `${scaleX(p.index)},${scaleY(p.value)}`).join(' ')}
              />
            </g>

            {/* Data Points & Violation Indicators */}
            <g clipPath="url(#chart-area-clip)">
              {points.map((p) => {
                const cx = scaleX(p.index);
                const cy = scaleY(p.value);
                const isSelected = selectedPoint === p.index;
                const isHovered = hoveredPoint?.index === p.index;

                return (
                  <g
                    key={p.index}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => {
                      onSelectPoint?.(p.index);
                      setInspectedPoint(p);
                    }}
                  >
                    {/* Severe or Nelson Rule Violation Glow & Halo */}
                    {p.isViolated && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 10 : 7}
                        fill="#f43f5e"
                        fillOpacity="0.2"
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Selected Halo */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* Main Point Node */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.isViolated ? 4.5 : isHovered ? 4.5 : 3}
                      fill={p.isViolated ? '#f43f5e' : '#38bdf8'}
                      stroke="#020617"
                      strokeWidth="1"
                    />

                    {/* Violation Rule Badge Label on Chart */}
                    {p.isViolated && (
                      <text
                        x={cx}
                        y={cy - 8}
                        textAnchor="middle"
                        fill="#f43f5e"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        {p.violations[0]?.rule || 'SIGNAL'}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Y-Axis Label */}
            <text
              x={-height / 2}
              y="18"
              transform="rotate(-90)"
              textAnchor="middle"
              fill="currentColor"
              fontSize="11"
              fontWeight="600"
              className="text-slate-500 dark:text-slate-400"
            >
              {primaryChart.yAxisLabel}
            </text>

            {/* X-Axis Observations Markers */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            {points
              .filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 15)) === 0)
              .map((p) => (
                <g key={p.index} transform={`translate(${scaleX(p.index)}, ${margin.top + innerHeight})`}>
                  <line y2="5" stroke="#94a3b8" />
                  <text y="16" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                    #{p.index}
                  </text>
                </g>
              ))}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-30 rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 text-xs text-white shadow-xl backdrop-blur-xs"
              style={{
                left: `${Math.min(scaleX(hoveredPoint.index) + 15, innerWidth)}px`,
                top: `${Math.max(scaleY(hoveredPoint.value) - 70, 10)}px`,
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                <span className="font-bold text-blue-400">Point #{hoveredPoint.index}</span>
                <span className="font-mono text-slate-300">{hoveredPoint.zone}</span>
              </div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                <p>Value: <strong className="font-mono text-white">{hoveredPoint.value.toFixed(3)}</strong></p>
                <p>Z-Score: <strong className="font-mono text-blue-300">{hoveredPoint.zScore > 0 ? `+${hoveredPoint.zScore.toFixed(2)}σ` : `${hoveredPoint.zScore.toFixed(2)}σ`}</strong></p>
                {hoveredPoint.isViolated && (
                  <p className="font-bold text-rose-400">
                    ⚠ {hoveredPoint.violations.map((v) => v.rule).join(', ')}
                  </p>
                )}
              </div>
              <p className="mt-1 text-[9px] text-slate-400 italic">Click point to view root cause details</p>
            </div>
          )}
        </div>

        {/* Sigma Zone Legend & View Toggles */}
        <SigmaZoneLegend
          zones={zones}
          showZones={showZones}
          onToggleZones={setShowZones}
          showLimits={showLimits}
          onToggleLimits={setShowLimits}
          showSpecLimits={showSpecLimits}
          onToggleSpecLimits={setShowSpecLimits}
          hasSpecLimits={!!(specificationLimits?.usl || specificationLimits?.lsl)}
        />
      </div>

      {/* Secondary Chart (MR / R / S Range Chart) */}
      {secondaryChart && (
        <div className="overflow-hidden rounded border border-slate-800 bg-[#020617] p-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
              {secondaryChart.title}
            </h4>
            <div className="flex gap-3 text-[10px] font-mono text-slate-400">
              <span>UCL: <strong className="text-rose-400">{secondaryChart.ucl.toFixed(2)}</strong></span>
              <span>CL: <strong className="text-sky-400">{secondaryChart.cl.toFixed(2)}</strong></span>
              <span>LCL: <strong className="text-rose-400">{secondaryChart.lcl.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="mt-2">
            <svg
              viewBox={`0 0 ${width} 140`}
              className="w-full h-auto select-none"
              style={{ minWidth: '600px', maxHeight: '180px' }}
            >
              {(() => {
                const secHeight = 140;
                const secMargin = { top: 15, right: 80, bottom: 25, left: 60 };
                const secInnerWidth = width - secMargin.left - secMargin.right;
                const secInnerHeight = secHeight - secMargin.top - secMargin.bottom;

                const mrMax = Math.max(...secondaryChart.points.map((p) => p.value), secondaryChart.ucl) * 1.15;
                const secScaleY = (v: number) => secMargin.top + secInnerHeight - (v / (mrMax || 1)) * secInnerHeight;
                const secScaleX = (idx: number) => {
                  const step = secondaryChart.points.length > 1 ? secInnerWidth / (secondaryChart.points.length - 1) : secInnerWidth / 2;
                  return secMargin.left + (idx - 1) * step;
                };

                return (
                  <g>
                    {/* Background */}
                    <rect x={secMargin.left} y={secMargin.top} width={secInnerWidth} height={secInnerHeight} fill="#020617" />

                    {/* Limits */}
                    <line
                      x1={secMargin.left}
                      y1={secScaleY(secondaryChart.ucl)}
                      x2={secMargin.left + secInnerWidth}
                      y2={secScaleY(secondaryChart.ucl)}
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                    />
                    <line
                      x1={secMargin.left}
                      y1={secScaleY(secondaryChart.cl)}
                      x2={secMargin.left + secInnerWidth}
                      y2={secScaleY(secondaryChart.cl)}
                      stroke="#0284c7"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={secMargin.left}
                      y1={secScaleY(secondaryChart.lcl)}
                      x2={secMargin.left + secInnerWidth}
                      y2={secScaleY(secondaryChart.lcl)}
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                    />

                    {/* Connecting Line */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      points={secondaryChart.points.map((p, i) => `${secScaleX(i + 1)},${secScaleY(p.value)}`).join(' ')}
                    />

                    {/* Points */}
                    {secondaryChart.points.map((p, i) => (
                      <circle
                        key={p.index}
                        cx={secScaleX(i + 1)}
                        cy={secScaleY(p.value)}
                        r={p.isViolated ? 4 : 2.5}
                        fill={p.isViolated ? '#f43f5e' : '#38bdf8'}
                        stroke="#020617"
                        strokeWidth="1"
                      />
                    ))}

                    <text
                      x={-secHeight / 2}
                      y="18"
                      transform="rotate(-90)"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {secondaryChart.yAxisLabel}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Point Inspector Modal */}
      <PointInspectorModal
        point={inspectedPoint}
        zones={zones}
        onClose={() => setInspectedPoint(null)}
        metadata={metadata}
      />
    </div>
  );
};
