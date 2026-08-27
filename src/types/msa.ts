export interface MsaMeasurementRow {
  id: string;
  part: string | number;
  operator: string;
  trial: number;
  value: number;
}

export interface AnovaRow {
  source: string;
  df: number;
  ss: number;
  ms: number;
  fStat?: number;
  pValue?: number;
  varianceComponent: number;
  pctContribution: number;
}

export interface GageRRSummary {
  ev: number; // Repeatability / Equipment Variation
  av: number; // Reproducibility / Appraiser Variation
  interaction?: number; // Part * Operator interaction
  grr: number; // Total Gage R&R
  pv: number; // Part-to-Part Variation
  tv: number; // Total Variation

  // Study Variation (e.g. 6 * sigma)
  studyVariationEV: number;
  studyVariationAV: number;
  studyVariationGRR: number;
  studyVariationPV: number;
  studyVariationTV: number;

  // Percent of Study Variation (%SV)
  pctStudyVarEV: number;
  pctStudyVarAV: number;
  pctStudyVarGRR: number;
  pctStudyVarPV: number;

  // Percent of Tolerance (%Tolerance / P/T Ratio)
  pctToleranceEV?: number;
  pctToleranceAV?: number;
  pctToleranceGRR?: number;
  pctTolerancePV?: number;

  // Percent Contribution (%Variance)
  pctContribEV: number;
  pctContribAV: number;
  pctContribGRR: number;
  pctContribPV: number;

  ndc: number; // Number of Distinct Categories
  status: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE';
  statusDescription: string;
  ndcStatus: 'ADEQUATE' | 'INADEQUATE';
  recommendations: string[];
}

export interface GageRRResult {
  summary: GageRRSummary;
  anovaTable: AnovaRow[];
  method: 'ANOVA' | 'XBAR_R';
  parts: string[];
  operators: string[];
  numTrials: number;
  tolerance?: number;
  studyMultiplier: number; // usually 6.0 or 5.15
  overallMean: number;
  partMeans: { part: string; mean: number; range: number }[];
  operatorMeans: { operator: string; mean: number; range: number }[];
  operatorPartMeans: { operator: string; part: string; mean: number; values: number[] }[];
  rBarByOperator: { operator: string; rBar: number; ucl: number; lcl: number }[];
  xBarByOperator: { operator: string; xDoubleBar: number; ucl: number; lcl: number; partMeans: number[] }[];
}

export interface Type1GageResult {
  sampleCount: number;
  mean: number;
  referenceValue: number;
  bias: number;
  biasPValue: number;
  standardDeviation: number;
  tolerance: number;
  cg: number; // Potential Gage Capability
  cgk: number; // Gage Capability with Bias
  cgTarget: number; // Typically 1.33
  isCapable: boolean;
  pctVar: number; // %EV of tolerance
  tStatistic: number;
}

export interface AttributeMsaRow {
  sampleId: string | number;
  referenceStandard: 'PASS' | 'FAIL' | 1 | 0;
  appraiser: string;
  trial: number;
  result: 'PASS' | 'FAIL' | 1 | 0;
}

export interface AttributeAppraiserSummary {
  appraiser: string;
  withinAgreementPct: number; // agreement with self across trials
  vsStandardPct: number; // agreement with reference standard
  kappa: number; // Cohen's Kappa
  missRate: number; // Good called Bad
  falseAlarmRate: number; // Bad called Good
}

export interface AttributeMsaResult {
  appraisers: AttributeAppraiserSummary[];
  overallSystemAgreementPct: number;
  overallKappa: number;
  overallStatus: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE';
  totalSamples: number;
  totalTrials: number;
  recommendations: string[];
}

export interface MsaStudyConfig {
  id: string;
  name: string;
  type: 'GAGE_RR' | 'TYPE_1' | 'ATTRIBUTE_MSA';
  description: string;
  unit: string;
  tolerance?: number;
  lsl?: number;
  usl?: number;
  target?: number;
  studyMultiplier: number;
  data: MsaMeasurementRow[];
  attributeData?: AttributeMsaRow[];
  type1Values?: number[];
  referenceValue?: number;
}
