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
      title: 'SPC CONTROL CHARTS',
      items: [
        {
          id: 'spc-imr',
          label: 'I-MR (Individuals)',
          icon: LineChart,
          badge: violationsCount > 0 ? `${violationsCount} OUT` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
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
      title: 'AI QUALITY AGENT',
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
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/20 p-2.5 overflow-y-auto flex flex-col justify-between">
      <div className="space-y-4">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <h4 className="px-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">
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
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition-all ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`rounded px-1 py-0.2 text-[9px] font-mono font-bold ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
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

      <div className="mt-4 p-2.5 rounded border border-slate-800/80 bg-slate-950/60 text-[10px] font-mono">
        <div className="text-slate-500 uppercase tracking-tight text-[9px]">ENGINE STATUS</div>
        <div className="flex items-center justify-between mt-1 text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ACTIVE
          </span>
          <span className="text-sky-400">0.4ms</span>
        </div>
      </div>
    </aside>
  );
};

