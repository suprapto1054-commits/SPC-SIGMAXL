import {
  CorrelationResult,
  LinearRegressionResult,
  HypothesisTestResult,
} from '../types/statistics';
import { getStudentTCritical, standardNormalCdf } from './statisticalEngine';

/**
 * Calculates Pearson & Spearman Correlation with p-values and confidence intervals
 */
export function calculateCorrelation(
  x: number[],
  y: number[],
  varNameX = 'Variable X',
  varNameY = 'Variable Y'
): CorrelationResult {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (
      typeof x[i] === 'number' &&
      !isNaN(x[i]) &&
      isFinite(x[i]) &&
      typeof y[i] === 'number' &&
      !isNaN(y[i]) &&
      isFinite(y[i])
    ) {
      pairs.push([x[i], y[i]]);
    }
  }

  const n = pairs.length;
  if (n < 3) {
    return {
      variableX: varNameX,
      variableY: varNameY,
      n,
      pearsonR: 0,
      pearsonPValue: 1,
      spearmanRho: 0,
      rSquared: 0,
      direction: 'None',
      strength: 'Very Weak',
      isSignificant: false,
      ci95: [0, 0],
      disclaimer: 'Correlation requires at least 3 valid coordinate pairs.',
    };
  }

  const xVals = pairs.map((p) => p[0]);
  const yVals = pairs.map((p) => p[1]);

  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const pearsonR = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
  const rSquared = Math.pow(pearsonR, 2);

  // t-statistic for Pearson: t = r * sqrt((n - 2) / (1 - r^2))
  const tStat = Math.abs(pearsonR) < 1 ? pearsonR * Math.sqrt((n - 2) / (1 - rSquared)) : 999;
  const df = n - 2;
  // Approximate p-value for Student t
  const zApprox = Math.abs(tStat);
  const pValue = 2 * (1 - standardNormalCdf(zApprox));

  // Spearman rank correlation
  const rankX = getRanks(xVals);
  const rankY = getRanks(yVals);
  let dSqSum = 0;
  for (let i = 0; i < n; i++) {
    dSqSum += Math.pow(rankX[i] - rankY[i], 2);
  }
  const spearmanRho = 1 - (6 * dSqSum) / (n * (n * n - 1));

  // Fisher Z transformation for 95% CI
  const z = 0.5 * Math.log((1 + pearsonR) / Math.max(1e-10, 1 - pearsonR));
  const seZ = 1 / Math.sqrt(n - 3);
  const zLow = z - 1.96 * seZ;
  const zHigh = z + 1.96 * seZ;
  const ciLow = (Math.exp(2 * zLow) - 1) / (Math.exp(2 * zLow) + 1);
  const ciHigh = (Math.exp(2 * zHigh) - 1) / (Math.exp(2 * zHigh) + 1);

  const direction: 'Positive' | 'Negative' | 'None' =
    pearsonR > 0.05 ? 'Positive' : pearsonR < -0.05 ? 'Negative' : 'None';
  const absR = Math.abs(pearsonR);
  const strength: 'Strong' | 'Moderate' | 'Weak' | 'Very Weak' =
    absR >= 0.7 ? 'Strong' : absR >= 0.4 ? 'Moderate' : absR >= 0.2 ? 'Weak' : 'Very Weak';

  return {
    variableX: varNameX,
    variableY: varNameY,
    n,
    pearsonR,
    pearsonPValue: Math.max(0.0001, Math.min(1, pValue)),
    spearmanRho,
    rSquared,
    direction,
    strength,
    isSignificant: pValue < 0.05,
    ci95: [ciLow, ciHigh],
    disclaimer:
      'CRITICAL NOTE: Statistical correlation measures linear association and does NOT imply causal relationship.',
  };
}

function getRanks(arr: number[]): number[] {
  const indexed = arr.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => a.val - b.val);

  const ranks = Array(arr.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[j].val) {
      j++;
    }
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/**
 * Calculates Simple Linear Regression (Y = a + bX) with ANOVA table and residuals
 */
export function calculateLinearRegression(
  x: number[],
  y: number[],
  varNameX = 'X',
  varNameY = 'Y'
): LinearRegressionResult {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (
      typeof x[i] === 'number' &&
      !isNaN(x[i]) &&
      isFinite(x[i]) &&
      typeof y[i] === 'number' &&
      !isNaN(y[i]) &&
      isFinite(y[i])
    ) {
      pairs.push([x[i], y[i]]);
    }
  }

  const n = pairs.length;
  if (n < 2) {
    throw new Error('Linear regression requires at least 2 pairs of data.');
  }

  const xVals = pairs.map((p) => p[0]);
  const yVals = pairs.map((p) => p[1]);

  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;

  // Sum of Squares
  let ssr = 0; // Regression SS
  let sse = 0; // Error / Residual SS

  const points = pairs.map(([xi, yi]) => {
    const fitted = intercept + slope * xi;
    const residual = yi - fitted;
    ssr += Math.pow(fitted - meanY, 2);
    sse += Math.pow(residual, 2);
    return {
      x: xi,
      y: yi,
      fitted,
      residual,
      stdResidual: 0,
    };
  });

  const sst = ssr + sse;
  const rSquared = sst > 0 ? ssr / sst : 0;
  const adjRSquared = n > 2 ? 1 - ((1 - rSquared) * (n - 1)) / (n - 2) : rSquared;
  const r = Math.sqrt(Math.max(0, rSquared)) * (slope >= 0 ? 1 : -1);

  const dfReg = 1;
  const dfRes = Math.max(1, n - 2);
  const msReg = ssr / dfReg;
  const msRes = sse / dfRes;
  const fStat = msRes > 0 ? msReg / msRes : 0;
  const stdError = Math.sqrt(msRes);

  // Standardize residuals
  points.forEach((pt) => {
    pt.stdResidual = stdError > 0 ? pt.residual / stdError : 0;
  });

  // Approximate p-value from F-stat
  const zF = Math.sqrt(fStat);
  const pValue = 2 * (1 - standardNormalCdf(zF));

  const equation = `Y = ${intercept >= 0 ? '' : '-'}${Math.abs(intercept).toFixed(3)} ${slope >= 0 ? '+' : '-'} ${Math.abs(slope).toFixed(3)}*X`;

  const anova = [
    { source: 'Regression', df: dfReg, ss: ssr, ms: msReg, f: fStat, p: Math.max(0.0001, Math.min(1, pValue)) },
    { source: 'Residual Error', df: dfRes, ss: sse, ms: msRes, f: 0, p: 0 },
    { source: 'Total', df: n - 1, ss: sst, ms: sst / (n - 1), f: 0, p: 0 },
  ];

  return {
    variableX: varNameX,
    variableY: varNameY,
    n,
    slope,
    intercept,
    r,
    rSquared,
    adjRSquared,
    stdError,
    fStatistic: fStat,
    pValue: Math.max(0.0001, Math.min(1, pValue)),
    equation,
    points,
    anova,
  };
}

/**
 * Calculates One-Way ANOVA across multiple subgroups/categories
 */
export function calculateOneWayANOVA(
  groups: { name: string; values: number[] }[],
  alpha = 0.05
): HypothesisTestResult {
  const cleanGroups = groups
    .map((g) => ({
      name: g.name,
      values: g.values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x)),
    }))
    .filter((g) => g.values.length > 0);

  const k = cleanGroups.length;
  if (k < 2) {
    throw new Error('One-Way ANOVA requires at least 2 groups with valid data.');
  }

  const allVals = cleanGroups.flatMap((g) => g.values);
  const totalN = allVals.length;
  const grandMean = allVals.reduce((a, b) => a + b, 0) / totalN;

  let ssBetween = 0;
  let ssWithin = 0;

  const groupSummaries = cleanGroups.map((g) => {
    const gn = g.values.length;
    const gMean = g.values.reduce((a, b) => a + b, 0) / gn;
    const gVar = gn > 1 ? g.values.reduce((acc, v) => acc + Math.pow(v - gMean, 2), 0) / (gn - 1) : 0;
    const gSd = Math.sqrt(gVar);
    const gSe = gn > 0 ? gSd / Math.sqrt(gn) : 0;
    const tCrit = getStudentTCritical(gn - 1, alpha);

    ssBetween += gn * Math.pow(gMean - grandMean, 2);
    for (const val of g.values) {
      ssWithin += Math.pow(val - gMean, 2);
    }

    return {
      group: g.name,
      n: gn,
      mean: gMean,
      stdDev: gSd,
      ci95: [gMean - tCrit * gSe, gMean + tCrit * gSe] as [number, number],
    };
  });

  const dfBetween = k - 1;
  const dfWithin = totalN - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 1;
  const fStat = msWithin > 0 ? msBetween / msWithin : 0;

  const zF = Math.sqrt(fStat);
  const pValue = 2 * (1 - standardNormalCdf(zF));
  const rejectNull = pValue < alpha;

  // Eta-squared effect size: SSbetween / SStotal
  const ssTotal = ssBetween + ssWithin;
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;
  const effectInterpretation =
    etaSquared >= 0.14 ? 'Large effect' : etaSquared >= 0.06 ? 'Medium effect' : 'Small effect';

  return {
    testType: '1-way-anova',
    title: 'One-Way Analysis of Variance (ANOVA)',
    nullHypothesis: 'H₀: All group population means are equal (μ₁ = μ₂ = ... = μₖ)',
    altHypothesis: 'H₁: At least one group mean is significantly different',
    statisticName: 'F-Statistic',
    statisticValue: fStat,
    df: [dfBetween, dfWithin],
    pValue: Math.max(0.0001, Math.min(1, pValue)),
    alpha,
    rejectNull,
    conclusion: rejectNull
      ? `Reject H₀ at α = ${alpha} (p-value = ${pValue.toFixed(4)} < ${alpha}). Statistically significant difference exists among group means.`
      : `Fail to reject H₀ at α = ${alpha} (p-value = ${pValue.toFixed(4)} ≥ ${alpha}). Insufficient evidence to conclude group means differ.`,
    effectSize: {
      name: 'Eta-squared (η²)',
      value: etaSquared,
      interpretation: effectInterpretation,
    },
    groupSummaries,
  };
}

/**
 * Calculates 1-Sample t-Test against a target / hypothesized mean (mu0)
 */
export function calculateOneSampleTTest(
  values: number[],
  mu0 = 0,
  alpha = 0.05
): HypothesisTestResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;
  if (n < 2) {
    throw new Error('1-Sample t-Test requires at least 2 observations.');
  }

  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const se = stdDev / Math.sqrt(n);

  const tStat = se > 0 ? (mean - mu0) / se : 0;
  const df = n - 1;
  const pValue = 2 * (1 - standardNormalCdf(Math.abs(tStat)));
  const rejectNull = pValue < alpha;

  const tCrit = getStudentTCritical(df, alpha);
  const ci: [number, number] = [mean - tCrit * se, mean + tCrit * se];

  // Cohen's d: (mean - mu0) / stdDev
  const cohensD = stdDev > 0 ? Math.abs(mean - mu0) / stdDev : 0;
  const effectInterpretation =
    cohensD >= 0.8 ? 'Large effect' : cohensD >= 0.5 ? 'Medium effect' : 'Small effect';

  return {
    testType: '1-sample-t',
    title: 'One-Sample Student t-Test',
    nullHypothesis: `H₀: μ = ${mu0} (Process mean equals target)`,
    altHypothesis: `H₁: μ ≠ ${mu0} (Process mean differs from target)`,
    statisticName: 't-Statistic',
    statisticValue: tStat,
    df,
    pValue: Math.max(0.0001, Math.min(1, pValue)),
    alpha,
    rejectNull,
    conclusion: rejectNull
      ? `Reject H₀ at α = ${alpha} (p-value = ${pValue.toFixed(4)} < ${alpha}). Sample mean (${mean.toFixed(3)}) is statistically significantly different from ${mu0}.`
      : `Fail to reject H₀ at α = ${alpha} (p-value = ${pValue.toFixed(4)} ≥ ${alpha}). There is insufficient evidence that the mean differs from ${mu0}.`,
    effectSize: {
      name: "Cohen's d",
      value: cohensD,
      interpretation: effectInterpretation,
    },
    confidenceInterval: ci,
    groupSummaries: [
      {
        group: 'Sample',
        n,
        mean,
        stdDev,
        ci95: ci,
      },
    ],
  };
}
