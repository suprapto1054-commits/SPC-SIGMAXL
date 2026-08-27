export type { CapabilityResult } from './spc';

export interface DescriptiveStatistics {
  n: number;
  mean: number;
  median: number;
  mode: number[];
  stdDev: number; // Sample standard deviation (s)
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  standardError: number;
  coefficientOfVariation: number; // CV (%)
  cv?: number;
  ci90: [number, number];
  ci95: [number, number];
  ci99: [number, number];
}

export interface NormalityTestResult {
  testName: 'Anderson-Darling' | 'Shapiro-Wilk' | 'Kolmogorov-Smirnov';
  statistic: number;
  pValue: number;
  alpha: number;
  isNormal: boolean;
  conclusion: string;
  qqPlotData: {
    theoreticalQuantile: number;
    sampleQuantile: number;
    value: number;
  }[];
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  midPoint: number;
  count: number;
  density: number;
  normalCurveHeight: number;
}

export interface HistogramResult {
  bins: HistogramBin[];
  binWidth: number;
  numBins: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  normalCurvePoints: { x: number; y: number }[];
}

export interface ParetoItem {
  category: string;
  count: number;
  percentage: number;
  cumulativeCount: number;
  cumulativePercentage: number;
}

export interface ParetoResult {
  items: ParetoItem[];
  totalCount: number;
  vitalFewCategories: string[]; // categories making up ~80%
  vitalFewPercentage: number;
}

export interface CorrelationResult {
  variableX: string;
  variableY: string;
  n: number;
  pearsonR: number;
  pearsonPValue: number;
  spearmanRho: number;
  rSquared: number;
  direction: 'Positive' | 'Negative' | 'None';
  strength: 'Strong' | 'Moderate' | 'Weak' | 'Very Weak';
  isSignificant: boolean;
  ci95: [number, number];
  disclaimer: string;
}

export interface LinearRegressionResult {
  variableX: string;
  variableY: string;
  n: number;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
  adjRSquared: number;
  stdError: number;
  fStatistic: number;
  pValue: number;
  equation: string;
  points: {
    x: number;
    y: number;
    fitted: number;
    residual: number;
    stdResidual: number;
  }[];
  anova: {
    source: string;
    df: number;
    ss: number;
    ms: number;
    f: number;
    p: number;
  }[];
}

export interface HypothesisTestResult {
  testType: '1-sample-t' | '2-sample-t' | 'paired-t' | '1-way-anova';
  title: string;
  nullHypothesis: string;
  altHypothesis: string;
  statisticName: string;
  statisticValue: number;
  df?: number | [number, number];
  pValue: number;
  alpha: number;
  rejectNull: boolean;
  conclusion: string;
  effectSize?: {
    name: string;
    value: number;
    interpretation: string;
  };
  confidenceInterval?: [number, number];
  groupSummaries?: {
    group: string;
    n: number;
    mean: number;
    stdDev: number;
    ci95: [number, number];
  }[];
}
