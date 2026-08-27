import React from 'react';
import { ProcessStatus } from '../../types/spc';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ProcessStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
}) => {
  const config = {
    IN_CONTROL: {
      bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      label: 'IN STATISTICAL CONTROL',
    },
    WARNING: {
      bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
      label: 'TREND / RUN WARNING',
    },
    OUT_OF_CONTROL: {
      bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500',
      icon: XCircle,
      label: 'OUT OF CONTROL',
    },
  }[status];

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 gap-1.5 font-mono',
    md: 'text-[10px] font-bold font-mono px-2.5 py-1 gap-1.5',
    lg: 'text-xs font-bold font-mono px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded border uppercase tracking-wider ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status !== 'IN_CONTROL' ? 'animate-ping' : 'animate-pulse'}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

