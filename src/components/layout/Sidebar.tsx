import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  Gauge,
  BarChart2,
  GitPullRequest,
  Sparkles,
  Table,
  Wand2,
  ScatterChart,
  Scale,
  BarChart3,
  CheckCircle2,
  Ruler,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  violationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  violationsCount = 0,
}) => {
  const sections = [
    {
      title: 'CORE TELEMETRY',
      items: [
        { id: 'dashboard', label: 'Executive Cockpit', icon: LayoutDashboard },
      ],
    },
    {
      title: 'ENERGY & VALUE-ADD (EnPI)',
      items: [
        {
          id: 'energy-monitoring',
          label: 'Energy & Value-Add',
          icon: Zap,
          badge: 'ISO 50001',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
        },
      ],
    },
    {
      title: 'SPC CONTROL CHARTS',
      items: [
        {
          id: 'spc-imr',
          label: 'I-MR (Individuals)',
          icon: LineChart,
          badge: violationsCount > 0 ? `${violationsCount} OUT` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        },
        { id: 'spc-xbar-r', label: 'Xbar-R Subgroups', icon: LineChart },
        { id: 'spc-xbar-s', label: 'Xbar-S StdDev', icon: LineChart },
        { id: 'spc-p', label: 'p-Chart (Attributes)', icon: LineChart },
        { id: 'spc-c', label: 'c-Chart (Defects)', icon: LineChart },
      ],
    },
    {
      title: 'PROCESS CAPABILITY',
      items: [
        { id: 'capability', label: 'Cp / Cpk / Pp / Ppk', icon: Gauge },
      ],
    },
    {
      title: 'MEASUREMENT ANALYSIS (MSA)',
      items: [
        {
          id: 'msa',
          label: 'MSA & Gage R&R Suite',
          icon: Ruler,
          badge: 'AIAG 4.0',
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/40',
        },
      ],
    },
    {
      title: 'STATISTICAL ENGINE',
      items: [
        { id: 'descriptive', label: 'Descriptive Statistics', icon: BarChart2 },
        { id: 'histogram', label: 'Gaussian Distribution', icon: BarChart2 },
        { id: 'pareto', label: 'Pareto (80/20 Rule)', icon: BarChart3 },
        { id: 'correlation', label: 'OLS Regression', icon: ScatterChart },
        { id: 'normality', label: 'Anderson-Darling Test', icon: CheckCircle2 },
        { id: 'hypothesis', label: 'Hypothesis & ANOVA', icon: Scale },
      ],
    },
    {
      title: 'AI QUALITY & ENERGY AGENT',
      items: [
        { id: 'auto-analysis', label: 'AI Executive Audit', icon: Sparkles },
        { id: 'root-cause', label: '5-Why & 6M Fishbone', icon: GitPullRequest },
      ],
    },
    {
      title: 'DATA MATRIX',
      items: [
        { id: 'data-table', label: 'Spreadsheet Grid', icon: Table },
        { id: 'data-prep', label: 'Clean & Transform', icon: Wand2 },
      ],
    },
  ];

  return (
    <aside className="w-58 shrink-0 border-r border-blue-900/50 bg-[#091428] dark:border-blue-950/80 dark:bg-[#070f20] p-2.5 overflow-y-auto flex flex-col justify-between shadow-md text-slate-200">
      <div className="space-y-3.5">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <h4 className="px-2 text-[9px] font-bold uppercase tracking-widest text-blue-400/90 dark:text-blue-400 font-mono">
              {sec.title}
            </h4>
            <div className="mt-1 space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition-all font-mono ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold border border-blue-400/40 shadow-sm shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-400/80'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`rounded px-1 py-0.2 text-[8px] font-mono font-bold shrink-0 ${item.badgeColor || 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-2.5 rounded border border-blue-800/60 bg-blue-950/80 text-[10px] font-mono shadow-xs text-blue-100">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tight text-blue-300">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-blue-400" />
            TELEMETRY ENGINE
          </span>
          <span className="text-blue-400">0.4ms</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-slate-300 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            ACTIVE GRID SYNC
          </span>
          <span className="text-emerald-400 font-bold text-[9px]">ISO 50001</span>
        </div>
      </div>
    </aside>
  );
};


