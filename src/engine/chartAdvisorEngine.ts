import { Dataset, Column, SpcChartType } from '../types/spc';
import { calculateDescriptiveStatistics } from './statisticalEngine';
import { calculateAndersonDarlingTest } from './distributionEngine';
import { calculateSpcChart } from './spcEngine';
import { calculateProcessCapability } from './capabilityEngine';
import { calculateCorrelation, calculateLinearRegression } from './hypothesisEngine';

export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime';
  totalCount: number;
  validCount: number;
  missingCount: number;
  uniqueCount: number;
  isInteger: boolean;
  isBinary: boolean; // Only 0/1 or True/False
  isSequential: boolean; // 1, 2, 3...
  isSubgroupIdentifier: boolean; // e.g. Batch_01, Subgroup 1
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  skewness?: number;
  kurtosis?: number;
  andersonDarlingPValue?: number;
  isNormalDistribution?: boolean;
}

export interface DatasetProfile {
  datasetId: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
  numericColumnCount: number;
  categoricalColumnCount: number;
  columnProfiles: ColumnProfile[];
  primaryNumericColumn?: ColumnProfile;
  secondaryNumericColumn?: ColumnProfile;
  primaryCategoricalColumn?: ColumnProfile;
  detectedSubgroupColumn?: ColumnProfile;
  detectedSubgroupSize?: number;
  isLikelyAttributeDefective: boolean; // p or np chart
  isLikelyAttributeDefects: boolean; // c or u chart
  isLikelyParetoDistribution: boolean;
  isLikelyBivariateContinuous: boolean;
  isLikelyTimeSeriesContinuous: boolean;
}

export type RecommendationLevel = 'PRIMARY_RECOMMENDATION' | 'HIGHLY_SUITABLE' | 'FEASIBLE_ALTERNATIVE' | 'NOT_RECOMMENDED';

export interface ChartRecommendation {
  chartId: string;
  title: string;
  subtitle: string;
  category: 'SPC Control Charts' | 'Capability & Specs' | 'Distribution & Normality' | 'Correlation & OLS' | 'Pareto & Defect Classification' | 'Energy & EnPI';
  confidence: number; // 0 - 100
  level: RecommendationLevel;
  why: string;
  statisticalCriteriaMet: string[];
  suggestedColumns: {
    primary?: string;
    secondary?: string;
    subgroup?: string;
    category?: string;
    count?: string;
  };
  pros: string[];
  watchOut: string[];
  targetModuleTab: string;
}

export interface ComprehensiveAdvisorAnalysis {
  profile: DatasetProfile;
  recommendations: ChartRecommendation[];
  topRecommendation: ChartRecommendation;
  executiveSummary: string;
  processHealthStatus: 'HEALTHY_IN_CONTROL' | 'WARNING_SPECIAL_CAUSES' | 'CRITICAL_UNSTABLE' | 'UNANALYZED';
  stabilityScore: number; // 0 to 100
  spcMetrics?: {
    chartType: string;
    column: string;
    mean: number;
    ucl: number;
    lcl: number;
    sigma: number;
    outOfControlPoints: number;
    violatedRules: string[];
  };
  capabilityMetrics?: {
    cp: number | null;
    cpk: number | null;
    ppk: number | null;
    ppm: number;
    sigmaLevel: number;
    assessment: string;
  };
  normalityMetrics?: {
    isNormal: boolean;
    adStatistic: number;
    pValue: number;
    skewness: number;
    kurtosis: number;
    shapeDescription: string;
  };
  correlationInsights?: {
    varX: string;
    varY: string;
    r: number;
    r2: number;
    equation: string;
    significance: string;
  }[];
  paretoInsights?: {
    vitalFewCount: number;
    vitalFewPercentage: number;
    topCauses: { category: string; count: number; pct: number; cumPct: number }[];
    recommendation: string;
  };
  actionableEngineeringSteps: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    recommendation: string;
    category: 'SPC' | 'MSA' | 'CAPABILITY' | 'PROCESS' | 'PARETO';
  }[];
}

/**
 * Profiles the raw dataset to detect data patterns, distributions, types, and subgroup structures
 */
export function profileDataset(dataset: Dataset): DatasetProfile {
  const columnProfiles: ColumnProfile[] = dataset.columns.map((col) => {
    const totalCount = col.values.length;
    const validVals = col.values.filter((v) => v !== null && v !== undefined && v !== '');
    const validCount = validVals.length;
    const missingCount = totalCount - validCount;
    const uniqueVals = Array.from(new Set(validVals));
    const uniqueCount = uniqueVals.length;

    let isInteger = false;
    let isBinary = false;
    let isSequential = false;
    let isSubgroupIdentifier = false;
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let stdDev: number | undefined;
    let skewness: number | undefined;
    let kurtosis: number | undefined;
    let andersonDarlingPValue: number | undefined;
    let isNormalDistribution = false;

    if (col.type === 'numeric') {
      const numVals = validVals.filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v)) as number[];
      if (numVals.length > 0) {
        min = Math.min(...numVals);
        max = Math.max(...numVals);
        isInteger = numVals.every((n) => Number.isInteger(n));
        isBinary = uniqueVals.length <= 2 && numVals.every((n) => n === 0 || n === 1);

        // Check sequential index
        if (numVals.length > 3) {
          const isInc = numVals.every((v, i) => i === 0 || v === numVals[i - 1] + 1);
          if (isInc) isSequential = true;
        }

        const stats = calculateDescriptiveStatistics(numVals);
        if (stats) {
          mean = stats.mean;
          stdDev = stats.stdDev;
          skewness = stats.skewness;
          kurtosis = stats.kurtosis;
        }

        if (numVals.length >= 7) {
          const ad = calculateAndersonDarlingTest(numVals);
          andersonDarlingPValue = ad.pValue;
          isNormalDistribution = ad.isNormal;
        }
      }
    } else {
      // Categorical checks
      isBinary = uniqueCount === 2;
      const lowerName = col.name.toLowerCase();
      if (lowerName.includes('subgroup') || lowerName.includes('lot') || lowerName.includes('batch') || lowerName.includes('sample') || lowerName.includes('group')) {
        isSubgroupIdentifier = true;
      }
    }

    return {
      name: col.name,
      type: col.type,
      totalCount,
      validCount,
      missingCount,
      uniqueCount,
      isInteger,
      isBinary,
      isSequential,
      isSubgroupIdentifier,
      min,
      max,
      mean,
      stdDev,
      skewness,
      kurtosis,
      andersonDarlingPValue,
      isNormalDistribution,
    };
  });

  const numericCols = columnProfiles.filter((c) => c.type === 'numeric' && !c.isSequential);
  const categoricalCols = columnProfiles.filter((c) => c.type === 'categorical' || c.type === 'datetime');

  // Find primary continuous numeric column (avoid sample ID sequence if possible)
  const primaryNumericColumn = numericCols[0] || columnProfiles.find((c) => c.type === 'numeric');
  const secondaryNumericColumn = numericCols[1];
  const primaryCategoricalColumn = categoricalCols[0];

  // Subgroup detection
  const detectedSubgroupColumn = columnProfiles.find((c) => c.isSubgroupIdentifier || c.name.toLowerCase().includes('batch') || c.name.toLowerCase().includes('subgroup'));
  let detectedSubgroupSize = 1;
  if (detectedSubgroupColumn) {
    const valCounts: Record<string, number> = {};
    const colObj = dataset.columns.find((c) => c.name === detectedSubgroupColumn.name);
    colObj?.values.forEach((v) => {
      const k = String(v ?? '');
      valCounts[k] = (valCounts[k] || 0) + 1;
    });
    const sizes = Object.values(valCounts);
    if (sizes.length > 0) {
      detectedSubgroupSize = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
    }
  }

  // Attribute checks
  const hasDefectKeyword = dataset.columns.some((c) => {
    const n = c.name.toLowerCase();
    return n.includes('defect') || n.includes('reject') || n.includes('nonconform') || n.includes('fail') || n.includes('scrap');
  });

  const hasInspectedKeyword = dataset.columns.some((c) => {
    const n = c.name.toLowerCase();
    return n.includes('inspect') || n.includes('sample_size') || n.includes('total_units') || n.includes('lot_size');
  });

  const isLikelyAttributeDefective = hasDefectKeyword && hasInspectedKeyword;
  const isLikelyAttributeDefects = hasDefectKeyword && !hasInspectedKeyword && (primaryNumericColumn?.isInteger ?? false);
  const isLikelyParetoDistribution = (primaryCategoricalColumn !== undefined && hasDefectKeyword) || (primaryCategoricalColumn !== undefined && (primaryCategoricalColumn.uniqueCount <= 20 && primaryCategoricalColumn.uniqueCount >= 3));
  const isLikelyBivariateContinuous = numericCols.length >= 2;
  const isLikelyTimeSeriesContinuous = primaryNumericColumn !== undefined && dataset.rowCount >= 15;

  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    rowCount: dataset.rowCount,
    columnCount: dataset.columns.length,
    numericColumnCount: columnProfiles.filter((c) => c.type === 'numeric').length,
    categoricalColumnCount: columnProfiles.filter((c) => c.type === 'categorical').length,
    columnProfiles,
    primaryNumericColumn,
    secondaryNumericColumn,
    primaryCategoricalColumn,
    detectedSubgroupColumn,
    detectedSubgroupSize,
    isLikelyAttributeDefective,
    isLikelyAttributeDefects,
    isLikelyParetoDistribution,
    isLikelyBivariateContinuous,
    isLikelyTimeSeriesContinuous,
  };
}

/**
 * Intelligent Chart Advisor scoring and recommendation algorithm
 */
export function generateChartRecommendations(dataset: Dataset, profile: DatasetProfile): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = [];
  const primaryNum = profile.primaryNumericColumn;
  const secNum = profile.secondaryNumericColumn;
  const primCat = profile.primaryCategoricalColumn;
  const subgroupSize = profile.detectedSubgroupSize || 1;

  // 1. I-MR Control Chart (Individual & Moving Range)
  if (primaryNum) {
    let score = 70;
    const criteria: string[] = ['Continuous numeric variable measured'];

    if (subgroupSize === 1) {
      score += 25;
      criteria.push('Individual observations (Subgroup size n = 1)');
    }
    if (primaryNum.isNormalDistribution) {
      score += 5;
      criteria.push('Gaussian distribution compliant (Anderson-Darling p > 0.05)');
    }
    if (dataset.rowCount >= 20) {
      criteria.push('Adequate baseline sample count (N ≥ 20 points)');
    } else {
      score -= 10;
      criteria.push('Small sample size (< 20 points, wider limits expected)');
    }

    score = Math.min(99, Math.max(10, score));

    recommendations.push({
      chartId: 'spc-imr',
      title: 'I-MR Control Chart (Individuals & Moving Range)',
      subtitle: 'ISO 7870-2 Individual Process Telemetry & Short-Term Dispersion',
      category: 'SPC Control Charts',
      confidence: score,
      level: score >= 90 ? 'PRIMARY_RECOMMENDATION' : score >= 75 ? 'HIGHLY_SUITABLE' : 'FEASIBLE_ALTERNATIVE',
      why: `The dataset contains continuous individual measurements (${primaryNum.name}). The I-MR chart pairs individual values with consecutive moving ranges (MR) to establish 3-sigma control limits without requiring artificial subgrouping.`,
      statisticalCriteriaMet: criteria,
      suggestedColumns: { primary: primaryNum.name },
      pros: [
        'Evaluates process centering on the Individual (I) chart and dispersion on the Moving Range (MR) chart',
        'Tests 8 Nelson & Western Electric special cause rules in real-time',
        'Provides robust within-subgroup variation estimation via d2 = 1.128',
      ],
      watchOut: [
        'Sensitive to extreme non-normality (heavy tails)',
        'Consecutive points must be in natural chronological order',
      ],
      targetModuleTab: 'spc-imr',
    });
  }

  // 2. Xbar-R Control Chart (Subgroups 2 <= n <= 8)
  if (primaryNum && profile.detectedSubgroupColumn) {
    let score = 65;
    const criteria: string[] = ['Continuous numeric variable detected', `Subgroup structure detected via ${profile.detectedSubgroupColumn.name}`];

    if (subgroupSize >= 2 && subgroupSize <= 8) {
      score += 32;
      criteria.push(`Ideal subgroup size for Range estimation (n = ${subgroupSize}, within 2-8 range)`);
    } else if (subgroupSize > 8) {
      score -= 15;
      criteria.push(`Subgroup size n = ${subgroupSize} > 8 (Xbar-S is statistically superior)`);
    }

    score = Math.min(99, Math.max(10, score));

    recommendations.push({
      chartId: 'spc-xbar-r',
      title: 'Xbar-R Control Chart (Subgroup Average & Range)',
      subtitle: 'Classical Shewhart Subgroup Monitoring for Batch Processing',
      category: 'SPC Control Charts',
      confidence: score,
      level: score >= 90 ? 'PRIMARY_RECOMMENDATION' : score >= 75 ? 'HIGHLY_SUITABLE' : 'FEASIBLE_ALTERNATIVE',
      why: `Rational subgroups of size n=${subgroupSize} detected. The Xbar-R chart separates between-subgroup process shifts from within-subgroup common-cause noise using subgroup ranges (R).`,
      statisticalCriteriaMet: criteria,
      suggestedColumns: { primary: primaryNum.name, subgroup: profile.detectedSubgroupColumn.name },
      pros: [
        'Central Limit Theorem ensures subgroup averages follow normal distribution even if raw data is slightly non-normal',
        'Separates within-piece and lot-to-lot special causes',
      ],
      watchOut: [
        'Subgroups must represent homogeneous batches produced under identical conditions',
      ],
      targetModuleTab: 'spc-xbar-r',
    });
  }

  // 3. Xbar-S Control Chart (Subgroups n >= 9)
  if (primaryNum && profile.detectedSubgroupColumn) {
    let score = 50;
    const criteria: string[] = ['Continuous numeric measurements', `Subgroup structure present (${profile.detectedSubgroupColumn.name})`];

    if (subgroupSize >= 9) {
      score += 45;
      criteria.push(`Large subgroup size (n = ${subgroupSize} ≥ 9, Sample Standard Deviation s is most efficient)`);
    } else if (subgroupSize >= 4) {
      score += 25;
      criteria.push(`Compatible subgroup size (n = ${subgroupSize})`);
    }

    score = Math.min(99, Math.max(10, score));

    recommendations.push({
      chartId: 'spc-xbar-s',
      title: 'Xbar-S Control Chart (Subgroup Average & Std Dev)',
      subtitle: 'High-Efficiency Statistical Dispersion for Large Subgroups',
      category: 'SPC Control Charts',
      confidence: score,
      level: score >= 90 ? 'PRIMARY_RECOMMENDATION' : score >= 75 ? 'HIGHLY_SUITABLE' : 'FEASIBLE_ALTERNATIVE',
      why: `For subgroups of size n=${subgroupSize}, the sample standard deviation (s) utilizes every data point, giving a more statistically efficient dispersion metric than extreme range (R).`,
      statisticalCriteriaMet: criteria,
      suggestedColumns: { primary: primaryNum.name, subgroup: profile.detectedSubgroupColumn.name },
      pros: [
        'Higher statistical power for detecting small process dispersion shifts',
        'Handles variable subgroup sample sizes accurately using c4 and B3/B4 factors',
      ],
      watchOut: ['Requires subgroup sizes n ≥ 4 (ideally n ≥ 9) for maximum efficiency'],
      targetModuleTab: 'spc-xbar-s',
    });
  }

  // 4. p-Chart (Proportion of Defectives / Attribute Binomial)
  if (profile.isLikelyAttributeDefective || (primaryNum && primaryNum.isInteger && dataset.columns.some((c) => c.name.toLowerCase().includes('total')))) {
    const score = 94;
    const defectCol = dataset.columns.find((c) => c.name.toLowerCase().includes('defect') || c.name.toLowerCase().includes('reject'))?.name;
    const totalCol = dataset.columns.find((c) => c.name.toLowerCase().includes('total') || c.name.toLowerCase().includes('inspect'))?.name;

    recommendations.push({
      chartId: 'spc-p',
      title: 'p-Chart (Proportion / Fraction Defective)',
      subtitle: 'Binomial Attribute Control Chart with Dynamic Control Limits',
      category: 'SPC Control Charts',
      confidence: score,
      level: 'PRIMARY_RECOMMENDATION',
      why: `The dataset features discrete inspection lot counts (${defectCol}) relative to sample sizes (${totalCol}). The p-chart models binomial fraction defective with variable 3-sigma control limits.`,
      statisticalCriteriaMet: [
        'Binomial classification (Pass/Fail, Conforming/Non-Conforming)',
        'Variable lot sizes accommodated via dynamic UCL/LCL calculation',
        'Discrete defect counts normalized to percentage',
      ],
      suggestedColumns: { primary: defectCol, count: totalCol },
      pros: [
        'Directly reflects customer-experienced defect rates',
        'Dynamic control limits automatically adjust when inspection sample size varies',
      ],
      watchOut: [
        'np should be ≥ 5 per lot to maintain normal approximation validity',
      ],
      targetModuleTab: 'spc-p',
    });
  }

  // 5. Pareto Analysis (80/20 Non-Conformity Categorization)
  if (primCat && (profile.isLikelyParetoDistribution || dataset.columns.some((c) => c.name.toLowerCase().includes('count')))) {
    let score = 75;
    const criteria: string[] = [`Categorical variable detected: ${primCat.name} (${primCat.uniqueCount} distinct classes)`];

    if (primCat.uniqueCount >= 3 && primCat.uniqueCount <= 30) {
      score += 18;
      criteria.push('Optimal number of discrete failure classes for 80/20 vital few isolation');
    }

    score = Math.min(98, score);

    recommendations.push({
      chartId: 'pareto',
      title: 'Pareto Chart (80/20 Rule Root Cause Prioritization)',
      subtitle: 'Cumulative Frequency Curve for Vital Few vs Trivial Many',
      category: 'Pareto & Defect Classification',
      confidence: score,
      level: score >= 90 ? 'PRIMARY_RECOMMENDATION' : score >= 75 ? 'HIGHLY_SUITABLE' : 'FEASIBLE_ALTERNATIVE',
      why: `Categorical failure modes or attribute groupings detected in ${primCat.name}. Pareto analysis organizes failure frequencies in descending order with a cumulative percentage line to identify the 20% of causes driving 80% of issues.`,
      statisticalCriteriaMet: criteria,
      suggestedColumns: { category: primCat.name },
      pros: [
        'Immediate visual isolation of the "Vital Few" continuous improvement targets',
        'Clear baseline for Six Sigma DMAIC Define & Analyze phases',
      ],
      watchOut: ['Does not account for individual defect financial severity unless weighted by cost'],
      targetModuleTab: 'pareto',
    });
  }

  // 6. OLS Linear Regression & Correlation (2 Continuous Numeric Columns)
  if (primaryNum && secNum) {
    let score = 70;
    const criteria: string[] = [`Two continuous process variables identified: ${primaryNum.name} vs ${secNum.name}`];

    const vals1 = (dataset.columns.find((c) => c.name === primaryNum.name)?.values || []).filter((v) => typeof v === 'number') as number[];
    const vals2 = (dataset.columns.find((c) => c.name === secNum.name)?.values || []).filter((v) => typeof v === 'number') as number[];

    if (vals1.length === vals2.length && vals1.length >= 10) {
      const corr = calculateCorrelation(vals1, vals2, primaryNum.name, secNum.name);
      if (Math.abs(corr.pearsonR) >= 0.6) {
        score += 24;
        criteria.push(`Strong linear association detected (Pearson |r| = ${Math.abs(corr.pearsonR).toFixed(2)}, R² = ${(corr.rSquared * 100).toFixed(1)}%)`);
      } else {
        score += 5;
        criteria.push(`Moderate/weak correlation (|r| = ${Math.abs(corr.pearsonR).toFixed(2)})`);
      }
    }

    score = Math.min(98, score);

    recommendations.push({
      chartId: 'correlation',
      title: 'Bivariate OLS Linear Regression & Scatter Plot',
      subtitle: 'Ordinary Least Squares Fit & Pearson Correlation Coefficient (r, R²)',
      category: 'Correlation & OLS',
      confidence: score,
      level: score >= 90 ? 'PRIMARY_RECOMMENDATION' : score >= 75 ? 'HIGHLY_SUITABLE' : 'FEASIBLE_ALTERNATIVE',
      why: `The dataset contains multiple numeric variables (${primaryNum.name} and ${secNum.name}). OLS regression quantifies cause-and-effect relationships and predictive sensitivity.`,
      statisticalCriteriaMet: criteria,
      suggestedColumns: { primary: primaryNum.name, secondary: secNum.name },
      pros: [
        'Calculates mathematical slope (m), intercept (b), and coefficient of determination (R²)',
        'Identifies leverage outliers and non-linear patterns on the 2D plane',
      ],
      watchOut: ['Correlation does not imply causation; verify physical process mechanism'],
      targetModuleTab: 'correlation',
    });
  }

  // 7. Process Capability Suite (Cp, Cpk, Pp, Ppk)
  if (primaryNum) {
    const score = 88;
    recommendations.push({
      chartId: 'capability',
      title: 'Process Capability Analysis (Cp / Cpk / Pp / Ppk)',
      subtitle: 'Tolerance Centering, Sigma Quality Level & PPM Defect Rate',
      category: 'Capability & Specs',
      confidence: score,
      level: 'HIGHLY_SUITABLE',
      why: `Continuous parameter (${primaryNum.name}) can be evaluated against engineering upper (USL) and lower (LSL) specification limits to assess true process potential (Cp) and actual capability (Cpk).`,
      statisticalCriteriaMet: [
        'Continuous metric with measurable standard deviation',
        'Distinguishes within-subgroup variation (Cp/Cpk) from overall variation (Pp/Ppk)',
      ],
      suggestedColumns: { primary: primaryNum.name },
      pros: [
        'Calculates expected PPM failure rate and 6-Sigma quality benchmark Z-score',
        'Provides centering offset percentage k from nominal target',
      ],
      watchOut: ['Requires stable in-control process for valid statistical inferences'],
      targetModuleTab: 'capability',
    });
  }

  // 8. Gaussian Histogram & Distribution Fit
  if (primaryNum) {
    const score = primaryNum.isNormalDistribution ? 85 : 82;
    recommendations.push({
      chartId: 'histogram',
      title: 'Gaussian Histogram & Distribution Curve',
      subtitle: 'Frequency Density Bins with Superimposed Normal Probability Curve',
      category: 'Distribution & Normality',
      confidence: score,
      level: 'HIGHLY_SUITABLE',
      why: `Visualizes the underlying shape, dispersion spread, modal peaks, and skewness of ${primaryNum.name}.`,
      statisticalCriteriaMet: [
        'Continuous numeric distribution',
        `Sample size N = ${dataset.rowCount}`,
      ],
      suggestedColumns: { primary: primaryNum.name },
      pros: [
        'Immediate visual check for bimodal distributions (mixed tooling/materials)',
        'Displays mean (x̄), median, and ±1σ / ±2σ / ±3σ boundaries',
      ],
      watchOut: ['Bin width selection can influence visual perception; Freedman-Diaconis rule applied'],
      targetModuleTab: 'histogram',
    });
  }

  // 9. Anderson-Darling Normality Probability Plot
  if (primaryNum) {
    recommendations.push({
      chartId: 'normality',
      title: 'Anderson-Darling Normality Test & Probability Plot',
      subtitle: 'Hypothesis Test (H₀: Normal) & Empirical Cumulative Plot',
      category: 'Distribution & Normality',
      confidence: 80,
      level: 'FEASIBLE_ALTERNATIVE',
      why: `Critical validation step to confirm if standard Six Sigma formulas (Z-scores, Cp/Cpk, ANOVA) are mathematically valid for ${primaryNum.name}.`,
      statisticalCriteriaMet: [
        `Anderson-Darling p-value: ${primaryNum.andersonDarlingPValue !== undefined ? primaryNum.andersonDarlingPValue.toFixed(4) : 'Evaluated'}`,
      ],
      suggestedColumns: { primary: primaryNum.name },
      pros: [
        'Weighted tail sensitivity catches extreme outliers and kurtosis deviations',
        'Provides definitive p-value (α = 0.05 critical threshold)',
      ],
      watchOut: ['Large sample sizes (N > 1000) may reject normality for trivial micro-deviations'],
      targetModuleTab: 'normality',
    });
  }

  // Sort descending by confidence score
  recommendations.sort((a, b) => b.confidence - a.confidence);

  // Ensure top recommendation has PRIMARY_RECOMMENDATION badge
  if (recommendations.length > 0) {
    recommendations[0].level = 'PRIMARY_RECOMMENDATION';
  }

  return recommendations;
}

/**
 * Generates automated deep analytical insights and engineering diagnostic report
 */
export function generateComprehensiveAdvisorAnalysis(dataset: Dataset): ComprehensiveAdvisorAnalysis {
  const profile = profileDataset(dataset);
  const recommendations = generateChartRecommendations(dataset, profile);
  const topRec = recommendations[0] || {
    chartId: 'spc-imr',
    title: 'I-MR Control Chart',
    subtitle: 'Standard Individual Chart',
    category: 'SPC Control Charts',
    confidence: 85,
    level: 'PRIMARY_RECOMMENDATION',
    why: 'Continuous data stream',
    statisticalCriteriaMet: [],
    suggestedColumns: {},
    pros: [],
    watchOut: [],
    targetModuleTab: 'spc-imr',
  };

  const primaryColName = profile.primaryNumericColumn?.name || dataset.columns[0]?.name || '';
  const numVals = (dataset.columns.find((c) => c.name === primaryColName)?.values || []).filter(
    (v) => typeof v === 'number' && !isNaN(v) && isFinite(v)
  ) as number[];

  // Run SPC calculation
  let spcRes = null;
  let stabilityScore = 85;
  let processHealth: 'HEALTHY_IN_CONTROL' | 'WARNING_SPECIAL_CAUSES' | 'CRITICAL_UNSTABLE' | 'UNANALYZED' = 'HEALTHY_IN_CONTROL';

  if (numVals.length >= 5) {
    const chartType: SpcChartType = profile.detectedSubgroupSize && profile.detectedSubgroupSize > 1 ? 'Xbar-R' : 'I-MR';
    spcRes = calculateSpcChart({
      values: numVals,
      chartType,
      columnName: primaryColName,
      subgroupSize: profile.detectedSubgroupSize || 5,
    });
    const violations = spcRes.ruleViolations.length;
    if (violations === 0) {
      stabilityScore = 98;
      processHealth = 'HEALTHY_IN_CONTROL';
    } else if (violations <= 2) {
      stabilityScore = 78;
      processHealth = 'WARNING_SPECIAL_CAUSES';
    } else {
      stabilityScore = Math.max(30, 70 - violations * 8);
      processHealth = 'CRITICAL_UNSTABLE';
    }
  }

  // Capability estimation
  let capMetrics = undefined;
  if (spcRes && numVals.length >= 10) {
    const mean = spcRes.mean;
    const sigma = spcRes.sigmaWithin || spcRes.sigmaOverall;
    const estUsl = mean + 3.5 * sigma;
    const estLsl = mean - 3.5 * sigma;
    const capRes = calculateProcessCapability(numVals, {
      usl: estUsl,
      lsl: estLsl,
      target: mean,
      sigmaWithin: sigma,
    });
    if (capRes) {
      capMetrics = {
        cp: capRes.cp,
        cpk: capRes.cpk,
        ppk: capRes.ppk,
        ppm: capRes.expectedPpmTotal,
        sigmaLevel: capRes.zBenchmark || 3.5,
        assessment: capRes.interpretation,
      };
    }
  }

  // Normality metrics
  let normalityMetrics = undefined;
  if (numVals.length >= 7) {
    const ad = calculateAndersonDarlingTest(numVals);
    const stats = calculateDescriptiveStatistics(numVals);
    normalityMetrics = {
      isNormal: ad.isNormal,
      adStatistic: ad.statistic,
      pValue: ad.pValue,
      skewness: stats?.skewness || 0,
      kurtosis: stats?.kurtosis || 0,
      shapeDescription: ad.isNormal
        ? 'Gaussian Normal (p > 0.05) — Process follows a standard bell curve.'
        : Math.abs(stats?.skewness || 0) > 1
        ? `Skewed Distribution (Skewness = ${(stats?.skewness || 0).toFixed(2)}) — Asymmetric tails detected.`
        : 'Non-Normal Distribution — Outliers or heavy tails present.',
    };
  }

  // Correlations
  const correlationInsights: { varX: string; varY: string; r: number; r2: number; equation: string; significance: string }[] = [];
  const numericCols = profile.columnProfiles.filter((c) => c.type === 'numeric' && !c.isSequential);
  if (numericCols.length >= 2) {
    for (let i = 0; i < Math.min(3, numericCols.length); i++) {
      for (let j = i + 1; j < Math.min(4, numericCols.length); j++) {
        const c1 = numericCols[i].name;
        const c2 = numericCols[j].name;
        const v1 = (dataset.columns.find((c) => c.name === c1)?.values || []).filter((v) => typeof v === 'number') as number[];
        const v2 = (dataset.columns.find((c) => c.name === c2)?.values || []).filter((v) => typeof v === 'number') as number[];
        if (v1.length === v2.length && v1.length >= 8) {
          const corr = calculateCorrelation(v1, v2, c1, c2);
          const reg = calculateLinearRegression(v1, v2, c1, c2);
          correlationInsights.push({
            varX: c1,
            varY: c2,
            r: corr.pearsonR,
            r2: corr.rSquared,
            equation: reg.equation,
            significance: corr.strength,
          });
        }
      }
    }
  }

  // Pareto insights if categorical column exists
  let paretoInsights = undefined;
  if (profile.primaryCategoricalColumn) {
    const catCol = dataset.columns.find((c) => c.name === profile.primaryCategoricalColumn?.name);
    if (catCol) {
      const counts: Record<string, number> = {};
      catCol.values.forEach((v) => {
        const k = String(v || 'Unspecified');
        counts[k] = (counts[k] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const totalCount = sorted.reduce((sum, item) => sum + item.count, 0);
      let cumulative = 0;
      const topCauses = sorted.slice(0, 5).map((item) => {
        cumulative += item.count;
        const pct = (item.count / totalCount) * 100;
        const cumPct = (cumulative / totalCount) * 100;
        return { category: item.category, count: item.count, pct, cumPct };
      });

      const vitalCount = topCauses.filter((c) => c.cumPct <= 85).length || 1;
      const vitalPct = topCauses[vitalCount - 1]?.cumPct || 80;

      paretoInsights = {
        vitalFewCount: vitalCount,
        vitalFewPercentage: vitalPct,
        topCauses,
        recommendation: `Targeting the top ${vitalCount} categories (${topCauses.slice(0, vitalCount).map((c) => c.category).join(', ')}) will eliminate ${vitalPct.toFixed(1)}% of total issues.`,
      };
    }
  }

  // Actionable Engineering Steps
  const actionableEngineeringSteps: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    recommendation: string;
    category: 'SPC' | 'MSA' | 'CAPABILITY' | 'PROCESS' | 'PARETO';
  }[] = [];

  if (spcRes && spcRes.ruleViolations.length > 0) {
    actionableEngineeringSteps.push({
      priority: 'HIGH',
      title: `Investigate ${spcRes.ruleViolations.length} Special Cause Rule Violation(s)`,
      recommendation: `SPC algorithm detected out-of-control signals (e.g. ${spcRes.ruleViolations[0].ruleName} at point #${spcRes.ruleViolations[0].point}). Isolate assignable causes (tooling wear, raw material batch shift, operator change) before adjusting machine setpoints.`,
      category: 'SPC',
    });
  } else {
    actionableEngineeringSteps.push({
      priority: 'LOW',
      title: 'Process In Statistical Control',
      recommendation: `No 3-sigma or Nelson rule violations detected. The process operates under common-cause random variation. Do not make reactionary adjustments ("tampering") which increase variance.`,
      category: 'SPC',
    });
  }

  if (normalityMetrics && !normalityMetrics.isNormal) {
    actionableEngineeringSteps.push({
      priority: 'MEDIUM',
      title: 'Address Non-Gaussian Distribution Skewness',
      recommendation: `Anderson-Darling test yielded p = ${normalityMetrics.pValue.toFixed(4)} (< 0.05). Consider Box-Cox power transformation or non-parametric capability estimation before signing off customer Cp/Cpk reports.`,
      category: 'PROCESS',
    });
  }

  if (correlationInsights.length > 0 && Math.abs(correlationInsights[0].r) >= 0.7) {
    actionableEngineeringSteps.push({
      priority: 'MEDIUM',
      title: `Leverage Strong Process Dependency (${correlationInsights[0].varX} ↔ ${correlationInsights[0].varY})`,
      recommendation: `Significant linear relationship (r = ${correlationInsights[0].r.toFixed(2)}, R² = ${(correlationInsights[0].r2 * 100).toFixed(1)}%). Regulate ${correlationInsights[0].varX} as the primary leading indicator to control downstream ${correlationInsights[0].varY}.`,
      category: 'PROCESS',
    });
  }

  if (paretoInsights) {
    actionableEngineeringSteps.push({
      priority: 'HIGH',
      title: `DMAIC Focus on Top Vital Few: ${paretoInsights.topCauses[0]?.category}`,
      recommendation: `Focus Kaizen / 5-Why root-cause investigation on "${paretoInsights.topCauses[0]?.category}" to achieve the largest reduction in defect rates with minimal engineering resources.`,
      category: 'PARETO',
    });
  }

  // Executive Summary text
  const execSummary = `Dataset "${dataset.name}" was profiled across ${profile.rowCount} observations and ${profile.columnCount} parameters. The Advisor recommends ${topRec.title} (Match Confidence: ${topRec.confidence}%) as the primary analytical tool. Process stability score is ${stabilityScore}/100 (${processHealth.replace(/_/g, ' ')}). ${
    spcRes?.ruleViolations.length
      ? `Warning: ${spcRes.ruleViolations.length} special cause violations detected.`
      : 'All points remain within 3-sigma Shewhart control boundaries.'
  }`;

  return {
    profile,
    recommendations,
    topRecommendation: topRec,
    executiveSummary: execSummary,
    processHealthStatus: processHealth,
    stabilityScore,
    spcMetrics: spcRes
      ? {
          chartType: spcRes.chartType,
          column: primaryColName,
          mean: spcRes.mean,
          ucl: spcRes.primaryChart.ucl,
          lcl: spcRes.primaryChart.lcl,
          sigma: spcRes.sigmaWithin || spcRes.sigmaOverall,
          outOfControlPoints: spcRes.ruleViolations.length,
          violatedRules: spcRes.ruleViolations.map((v) => `${v.ruleName} (Point #${v.point})`),
        }
      : undefined,
    capabilityMetrics: capMetrics,
    normalityMetrics,
    correlationInsights,
    paretoInsights,
    actionableEngineeringSteps,
  };
}
