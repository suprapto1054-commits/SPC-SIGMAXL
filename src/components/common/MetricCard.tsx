import React from 'react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  badge,
  badgeType = 'info',
  icon,
  onClick,
}) => {
  const badgeStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info: 'bg-slate-800 text-slate-300 border-slate-700',
  }[badgeType];

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative overflow-hidden rounded border border-slate-800 bg-[#020617] p-3 sm:p-3.5 flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-900/30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
          {title}
        </span>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {badge && (
          <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-mono font-bold border ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

