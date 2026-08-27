import { HistogramResult, NormalityTestResult, ParetoResult } from '../types/statistics';
import { standardNormalCdf, standardNormalInv } from './statisticalEngine';

/**
 * Generates optimal histogram bins and overlaid normal distribution curve
 */
export function generateHistogram(
  values: number[],
  customBinCount?: number
): HistogramResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;

  if (n === 0) {
    return {
      bins: [],
      binWidth: 1,
      numBins: 0,
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
      normalCurvePoints: [],
    };
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance) || 1;

  // Number of bins using Freedman-Diaconis or Sturges rule if not specified
  let numBins = customBinCount && customBinCount > 2 ? customBinCount : Math.min(Math.max(Math.ceil(Math.log2(n) + 1), 6), 25);
  const binWidth = range / numBins;

  // Initialize bins
  const bins = Array.from({ length: numBins }, (_, idx) => {
    const binStart = min + idx * binWidth;
    const binEnd = binStart + binWidth;
    const midPoint = (binStart + binEnd) / 2;
    return {
      binStart,
      binEnd,
      midPoint,
      count: 0,
      density: 0,
      normalCurveHeight: 0,
    };
  });

  // Tally counts
  for (const v of clean) {
    let binIdx = Math.floor((v - min) / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx].count++;
  }

  // Calculate density and theoretical normal curve height
  for (const b of bins) {
    b.density = b.count / (n * binWidth);
    // Gaussian PDF: (1 / (sigma * sqrt(2*pi))) * exp(-0.5 * ((x - mean)/sigma)^2)
    const z = (b.midPoint - mean) / stdDev;
    const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    b.normalCurveHeight = pdf * n * binWidth; // Scaled to frequency count
  }

  // Generate continuous points for smooth normal curve overlay
  const normalCurvePoints: { x: number; y: number }[] = [];
  const curveSteps = 60;
  const curveStart = Math.min(min, mean - 3.5 * stdDev);
  const curveEnd = Math.max(max, mean + 3.5 * stdDev);
  const stepSize = (curveEnd - curveStart) / curveSteps;

  for (let i = 0; i <= curveSteps; i++) {
    const x = curveStart + i * stepSize;
    const z = (x - mean) / stdDev;
    const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    const y = pdf * n * binWidth;
    normalCurvePoints.push({ x, y });
  }

  return {
    bins,
    binWidth,
    numBins,
    min,
    max,
    mean,
    stdDev,
    normalCurvePoints,
  };
}

/**
 * Calculates Anderson-Darling Normality Test
 * 
 * Formula:
 * A^2 = -n - (1/n) * sum_{i=1}^n (2i - 1) * [ln(Phi(Z_i)) + ln(1 - Phi(Z_{n+1-i}))]
 * Adjusted A*^2 = A^2 * (1 + 0.75/n + 2.25/n^2)
 */
export function calculateAndersonDarlingTest(
  values: number[],
  alpha = 0.05
): NormalityTestResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;

  if (n < 5) {
    return {
      testName: 'Anderson-Darling',
      statistic: 0,
      pValue: 1,
      alpha,
      isNormal: true,
      conclusion: 'Sample size is too small (N < 5) for reliable Anderson-Darling normality evaluation.',
      qqPlotData: [],
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  let sum = 0;
  for (let i = 1; i <= n; i++) {
    const zi = (sorted[i - 1] - mean) / stdDev;
    const zn_i = (sorted[n - i] - mean) / stdDev;

    const phi1 = Math.max(1e-15, Math.min(1 - 1e-15, standardNormalCdf(zi)));
    const phi2 = Math.max(1e-15, Math.min(1 - 1e-15, 1 - standardNormalCdf(zn_i)));

    sum += (2 * i - 1) * (Math.log(phi1) + Math.log(phi2));
  }

  const aSq = -n - (1 / n) * sum;
  // D'Agostino & Stephens small-sample correction
  const aSqAdj = aSq * (1.0 + 0.75 / n + 2.25 / (n * n));

  // Empirical p-value calculation based on Stephens (1986)
  let pValue = 0;
  if (aSqAdj >= 0.6) {
    pValue = Math.exp(1.2937 - 5.709 * aSqAdj + 0.0186 * Math.pow(aSqAdj, 2));
  } else if (aSqAdj > 0.34) {
    pValue = Math.exp(0.9177 - 4.279 * aSqAdj - 1.38 * Math.pow(aSqAdj, 2));
  } else if (aSqAdj > 0.2) {
    pValue = 1 - Math.exp(-8.318 + 42.796 * aSqAdj - 59.938 * Math.pow(aSqAdj, 2));
  } else {
    pValue = 1 - Math.exp(-13.436 + 101.14 * aSqAdj - 223.73 * Math.pow(aSqAdj, 2));
  }
  pValue = Math.max(0.0001, Math.min(0.9999, pValue));

  const isNormal = pValue >= alpha;
  const conclusion = isNormal
    ? `There is insufficient evidence to reject normality at α = ${alpha} (p-value = ${pValue.toFixed(4)} ≥ ${alpha}). The normal distribution assumption is reasonable.`
    : `Data shows statistically significant evidence against normality at α = ${alpha} (p-value = ${pValue.toFixed(4)} < ${alpha}). Consider non-normal capability methods or data transformation.`;

  // Generate Q-Q Plot theoretical quantiles vs sample quantiles
  const qqPlotData = sorted.map((val, idx) => {
    // Filliben's estimate or Blom's plotting position: (i - 0.375) / (n + 0.25)
    const p = (idx + 1 - 0.375) / (n + 0.25);
    const theoreticalZ = standardNormalInv(p);
    const theoreticalQuantile = mean + theoreticalZ * stdDev;
    return {
      theoreticalQuantile,
      sampleQuantile: val,
      value: val,
    };
  });

  return {
    testName: 'Anderson-Darling',
    statistic: aSqAdj,
    pValue,
    alpha,
    isNormal,
    conclusion,
    qqPlotData,
  };
}

/**
 * Calculates Pareto Chart & 80/20 Rule Analysis
 */
export function calculatePareto(
  categories: string[],
  counts?: number[]
): ParetoResult {
  const tallyMap = new Map<string, number>();

  if (counts && counts.length === categories.length) {
    categories.forEach((cat, idx) => {
      const c = counts[idx] || 0;
      tallyMap.set(cat, (tallyMap.get(cat) || 0) + c);
    });
  } else {
    categories.forEach((cat) => {
      if (cat !== null && cat !== undefined && cat.trim() !== '') {
        tallyMap.set(cat, (tallyMap.get(cat) || 0) + 1);
      }
    });
  }

  // Sort descending
  const sorted = Array.from(tallyMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const totalCount = sorted.reduce((acc, item) => acc + item.count, 0);

  let runningCount = 0;
  const items = sorted.map((item) => {
    runningCount += item.count;
    const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
    const cumulativePercentage = totalCount > 0 ? (runningCount / totalCount) * 100 : 0;
    return {
      category: item.category,
      count: item.count,
      percentage,
      cumulativeCount: runningCount,
      cumulativePercentage,
    };
  });

  // Identify vital few (~80%)
  const vitalFewCategories: string[] = [];
  let vitalFewPercentage = 0;
  for (const it of items) {
    vitalFewCategories.push(it.category);
    vitalFewPercentage = it.cumulativePercentage;
    if (it.cumulativePercentage >= 80) {
      break;
    }
  }

  return {
    items,
    totalCount,
    vitalFewCategories,
    vitalFewPercentage,
  };
}
