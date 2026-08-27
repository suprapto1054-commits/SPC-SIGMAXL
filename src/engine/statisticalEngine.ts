import { DescriptiveStatistics } from '../types/statistics';

/**
 * Robust Statistical Calculation Engine
 * Built strictly according to standard Six Sigma and ISO 3534 formulas.
 */

export function calculateDescriptiveStatistics(data: number[]): DescriptiveStatistics | null {
  const clean = data.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;
  if (n === 0) return null;

  const sorted = [...clean].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // Median
  let median: number;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }

  // Mode
  const frequencyMap = new Map<number, number>();
  let maxFreq = 0;
  for (const num of sorted) {
    const count = (frequencyMap.get(num) || 0) + 1;
    frequencyMap.set(num, count);
    if (count > maxFreq) maxFreq = count;
  }
  const mode: number[] = [];
  if (maxFreq > 1) {
    frequencyMap.forEach((count, key) => {
      if (count === maxFreq) mode.push(key);
    });
  }

  // Min, Max, Range
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Quartiles & IQR (Linear interpolation method / Type 7)
  const q1 = getPercentile(sorted, 0.25);
  const q3 = getPercentile(sorted, 0.75);
  const iqr = q3 - q1;

  // Sample Variance & Sample Standard Deviation (s)
  let sumSquaredDiffs = 0;
  for (const val of sorted) {
    sumSquaredDiffs += Math.pow(val - mean, 2);
  }
  const variance = n > 1 ? sumSquaredDiffs / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Standard Error
  const standardError = n > 0 ? stdDev / Math.sqrt(n) : 0;

  // Coefficient of Variation
  const coefficientOfVariation = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

  // Skewness (Sample Skewness / Fisher-Pearson adjusted)
  let skewness = 0;
  if (n > 2 && stdDev > 0) {
    let m3 = 0;
    for (const val of sorted) {
      m3 += Math.pow((val - mean) / stdDev, 3);
    }
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }

  // Kurtosis (Sample Excess Kurtosis, where Normal = 0)
  let kurtosis = 0;
  if (n > 3 && stdDev > 0) {
    let m4 = 0;
    for (const val of sorted) {
      m4 += Math.pow((val - mean) / stdDev, 4);
    }
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    kurtosis = term1 * m4 - term2;
  }

  // Confidence Intervals for the Mean (t-distribution critical value approximation)
  const t90 = getStudentTCritical(n - 1, 0.10);
  const t95 = getStudentTCritical(n - 1, 0.05);
  const t99 = getStudentTCritical(n - 1, 0.01);

  const ci90: [number, number] = [mean - t90 * standardError, mean + t90 * standardError];
  const ci95: [number, number] = [mean - t95 * standardError, mean + t95 * standardError];
  const ci99: [number, number] = [mean - t99 * standardError, mean + t99 * standardError];

  return {
    n,
    mean,
    median,
    mode,
    stdDev,
    variance,
    min,
    max,
    range,
    q1,
    q3,
    iqr,
    skewness,
    kurtosis,
    standardError,
    coefficientOfVariation,
    cv: coefficientOfVariation,
    ci90,
    ci95,
    ci99,
  };
}

export const calculateDescriptiveStats = (data: number[]) => {
  const result = calculateDescriptiveStatistics(data);
  if (!result) {
    return {
      n: 0,
      mean: 0,
      median: 0,
      mode: [],
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      range: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      skewness: 0,
      kurtosis: 0,
      standardError: 0,
      coefficientOfVariation: 0,
      cv: 0,
      ci90: [0, 0] as [number, number],
      ci95: [0, 0] as [number, number],
      ci99: [0, 0] as [number, number],
    };
  }
  return result;
};


/**
 * Calculates continuous percentile with linear interpolation
 */
export function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Accurate t-critical value approximation using Hill's algorithm or Cornish-Fisher
 */
export function getStudentTCritical(df: number, alpha: number): number {
  if (df <= 0) return 1.96;
  const p = 1 - alpha / 2;
  // Standard normal quantile approximation (Acklam's formula)
  const z = standardNormalInv(p);
  if (df > 120) return z;

  // Cornish-Fisher expansion for Student's t
  const g1 = (Math.pow(z, 3) + z) / (4 * df);
  const g2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * Math.pow(df, 2));
  const g3 = (3 * Math.pow(z, 7) + 19 * Math.pow(z, 5) + 17 * Math.pow(z, 3) - 15 * z) / (384 * Math.pow(df, 3));
  return z + g1 + g2 + g3;
}

/**
 * Standard Normal Cumulative Distribution Function Phi(z)
 */
export function standardNormalCdf(z: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1.0 - prob : prob;
}

/**
 * Inverse Standard Normal Quantile Function (Phi^-1)
 */
export function standardNormalInv(p: number): number {
  if (p <= 0) return -6;
  if (p >= 1) return 6;
  if (p === 0.5) return 0;

  // Coefficients in rational approximations
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}
