import React from 'react';
import { ChartPoint, SigmaZones } from '../../types/spc';
import { X, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PointInspectorModalProps {
  point: ChartPoint | null;
  zones: SigmaZones;
  onClose: () => void;
  metadata?: Record<string, any>;
}

export const PointInspectorModal: React.FC<PointInspectorModalProps> = ({
  point,
  zones,
  onClose,
  metadata,
}) => {
  if (!point) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded border border-slate-800 bg-[#020617] p-5 shadow-2xl font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-sky-500/40 bg-sky-500/10 text-xs font-bold text-sky-400">
              #{point.index}
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                OBSERVATION_INSPECT // PT_{point.index}
              </h3>
              <p className="text-[10px] text-slate-400">
                LABEL: {point.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-3">
          {point.isViolated ? (
            <div className="flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-rose-300">
              <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider">SPECIAL CAUSE SIGNAL DETECTED</p>
                <p className="text-[10px] font-sans text-slate-300">Point violates {point.violations.length} statistical test rule(s).</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider">IN STATISTICAL CONTROL</p>
                <p className="text-[10px] font-sans text-slate-300">Observation conforms to normal process variation.</p>
              </div>
            </div>
          )}
        </div>

        {/* Statistical Metrics Table */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">ACTUAL VALUE</span>
            <p className="mt-0.5 text-sm font-bold text-white">
              {point.value.toFixed(3)}
            </p>
          </div>

          <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">Z-SCORE (SIGMA)</span>
            <p className="mt-0.5 text-sm font-bold text-sky-400">
              {point.zScore > 0 ? `+${point.zScore.toFixed(2)}σ` : `${point.zScore.toFixed(2)}σ`}
            </p>
          </div>

          <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">ZONE ASSIGNED</span>
            <p className="mt-0.5 text-xs font-bold text-slate-300">
              {point.zone}
            </p>
          </div>

          <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">CENTER LINE</span>
            <p className="mt-0.5 text-xs font-bold text-slate-300">
              {zones.centerLine.toFixed(3)}
            </p>
          </div>
        </div>

        {/* Violations List */}
        {point.violations.length > 0 && (
          <div className="mt-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              VIOLATED RULE SPECIFICATIONS
            </h4>
            <div className="mt-1.5 space-y-1.5">
              {point.violations.map((v, i) => (
                <div
                  key={i}
                  className="rounded border border-rose-500/30 bg-rose-950/20 p-2 text-xs text-rose-300"
                >
                  <span className="font-bold text-rose-400">{v.rule}: {v.ruleName}</span>
                  <p className="mt-0.5 text-[11px] font-sans text-slate-400">{v.ruleDescription}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata section if present */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              PROCESS METADATA CONTEXT
            </h4>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px]">
              {metadata.equipment && (
                <div><span className="text-slate-500">EQUIPMENT:</span> <strong className="text-slate-300">{metadata.equipment}</strong></div>
              )}
              {metadata.operator && (
                <div><span className="text-slate-500">OPERATOR:</span> <strong className="text-slate-300">{metadata.operator}</strong></div>
              )}
              {metadata.shift && (
                <div><span className="text-slate-500">SHIFT:</span> <strong className="text-slate-300">{metadata.shift}</strong></div>
              )}
              {metadata.materialLot && (
                <div><span className="text-slate-500">LOT:</span> <strong className="text-slate-300">{metadata.materialLot}</strong></div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

