export type ControlChartType = 
  | 'I-MR' 
  | 'Xbar-R' 
  | 'Xbar-S' 
  | 'p' 
  | 'np' 
  | 'c' 
  | 'u';

export type SpcChartType = ControlChartType;

export type ProcessStatus = 'IN_CONTROL' | 'WARNING' | 'OUT_OF_CONTROL';

export interface DataColumn {
  id: string;
  name: string;
  type: 'numeric' | 'categorical' | 'datetime';
  values: (number | string | null)[];
}

export type Column = DataColumn;

export interface SpecificationLimits {
  usl?: number | null;
  target?: number | null;
  lsl?: number | null;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  columns: DataColumn[];
  rowCount: number;
  createdAt: string;
  metadata?: {
    equipment?: string;
    line?: string;
    process?: string;
    shift?: string;
    operator?: string;
    materialLot?: string;
    product?: string;
  };
}

export interface SigmaZones {
  plus3Sigma: number; // UCL
  plus2Sigma: number;
  plus1Sigma: number;
  centerLine: number; // CL
  minus1Sigma: number;
  minus2Sigma: number;
  minus3Sigma: number; // LCL
  sigma: number;
}

export interface RuleViolation {
  rule: string;
  ruleName: string;
  ruleDescription: string;
  point: number; // 1-indexed observation number
  subgroup?: number;
  value: number;
  sigmaPosition: number; // Z-score relative to CL and sigma
  isSevere: boolean;
  involvedPoints?: number[];
}

export interface RuleSummary {
  ruleId: string;
  name: string;
  description: string;
  status: 'PASS' | 'FAIL';
  violationCount: number;
  violatedPoints: number[];
}

export interface ChartPoint {
  index: number;
  label: string | number;
  value: number;
  mr?: number;
  range?: number;
  stdDev?: number;
  subgroupSize?: number;
  zScore: number;
  isViolated: boolean;
  violations: RuleViolation[];
  zone: 'Zone A+' | 'Zone B+' | 'Zone C+' | 'Zone C-' | 'Zone B-' | 'Zone A-' | 'Beyond +3σ' | 'Beyond -3σ';
  customMetadata?: Record<string, any>;
}

export interface SpcCalculationResult {
  chartType: ControlChartType;
  columnName: string;
  n: number;
  subgroupSize: number;
  mean: number;
  sigmaWithin: number;
  sigmaOverall: number;
  primaryChart: {
    title: string;
    points: ChartPoint[];
    zones: SigmaZones;
    ucl: number;
    cl: number;
    lcl: number;
    yAxisLabel: string;
  };
  secondaryChart?: {
    title: string;
    points: ChartPoint[];
    ucl: number;
    cl: number;
    lcl: number;
    yAxisLabel: string;
  };
  ruleViolations: RuleViolation[];
  ruleSummaries: RuleSummary[];
  status: ProcessStatus;
  statusMessage: string;
  specificationLimits?: {
    usl?: number;
    target?: number;
    lsl?: number;
  };
}

export interface CapabilityResult {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  cpu: number | null;
  cpl: number | null;
  ppu: number | null;
  ppl: number | null;
  mean: number;
  sigmaWithin: number;
  sigmaOverall: number;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  expectedPpmLsl: number;
  expectedPpmUsl: number;
  expectedPpmTotal: number;
  observedPpm: number;
  status: 'EXCELLENT' | 'CAPABLE' | 'MARGINAL' | 'POOR' | 'CRITICAL' | 'UNDEFINED';
  interpretation: string;
  centeringOffsetPercent: number | null;
  zBenchmark?: number;
}
