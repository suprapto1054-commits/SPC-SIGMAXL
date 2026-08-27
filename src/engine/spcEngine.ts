import {
  ControlChartType,
  SpcCalculationResult,
  SigmaZones,
  ChartPoint,
  ProcessStatus,
} from '../types/spc';
import { evaluateNelsonTestRules } from './testRulesEngine';

export interface SpcConstantsTable {
  d2: number;
  d3: number;
  c4: number;
  A2: number;
  A3: number;
  D3: number;
  D4: number;
  B3: number;
  B4: number;
}

export const SPC_CONSTANTS: Record<number, SpcConstantsTable> = {
  2: { d2: 1.128, d3: 0.853, c4: 0.7979, A2: 1.880, A3: 2.659, D3: 0, D4: 3.267, B3: 0, B4: 3.267 },
  3: { d2: 1.693, d3: 0.888, c4: 0.8862, A2: 1.023, A3: 1.954, D3: 0, D4: 2.574, B3: 0, B4: 2.568 },
  4: { d2: 2.059, d3: 0.880, c4: 0.9213, A2: 0.729, A3: 1.628, D3: 0, D4: 2.282, B3: 0, B4: 2.266 },
  5: { d2: 2.326, d3: 0.864, c4: 0.9400, A2: 0.577, A3: 1.427, D3: 0, D4: 2.114, B3: 0, B4: 2.089 },
  6: { d2: 2.534, d3: 0.848, c4: 0.9515, A2: 0.483, A3: 1.287, D3: 0, D4: 2.004, B3: 0.030, B4: 1.970 },
  7: { d2: 2.704, d3: 0.833, c4: 0.9594, A2: 0.419, A3: 1.182, D3: 0.076, D4: 1.924, B3: 0.118, B4: 1.882 },
  8: { d2: 2.847, d3: 0.820, c4: 0.9650, A2: 0.373, A3: 1.099, D3: 0.136, D4: 1.864, B3: 0.185, B4: 1.815 },
  9: { d2: 2.970, d3: 0.808, c4: 0.9693, A2: 0.337, A3: 1.032, D3: 0.184, D4: 1.816, B3: 0.239, B4: 1.761 },
  10: { d2: 3.078, d3: 0.797, c4: 0.9727, A2: 0.308, A3: 0.975, D3: 0.223, D4: 1.777, B3: 0.284, B4: 1.716 },
};

/**
 * Calculates Sigma Zones for a given Center Line and within-subgroup Sigma
 */
export function calculateSigmaZones(cl: number, sigma: number): SigmaZones {
  return {
    plus3Sigma: cl + 3 * sigma,
    plus2Sigma: cl + 2 * sigma,
    plus1Sigma: cl + 1 * sigma,
    centerLine: cl,
    minus1Sigma: cl - 1 * sigma,
    minus2Sigma: cl - 2 * sigma,
    minus3Sigma: cl - 3 * sigma,
    sigma,
  };
}

export function determineZoneLabel(z: number): ChartPoint['zone'] {
  if (z > 3) return 'Beyond +3σ';
  if (z > 2) return 'Zone A+';
  if (z > 1) return 'Zone B+';
  if (z > 0) return 'Zone C+';
  if (z > -1) return 'Zone C-';
  if (z > -2) return 'Zone B-';
  if (z >= -3) return 'Zone A-';
  return 'Beyond -3σ';
}

/**
 * Calculates I-MR (Individuals and Moving Range) Control Chart
 */
export function calculateIMRChart(
  values: number[],
  columnName = 'Individual Observations',
  labels?: string[]
): SpcCalculationResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;

  if (n < 2) {
    throw new Error('I-MR Chart requires at least 2 valid observations.');
  }

  // Calculate Mean
  const mean = clean.reduce((a, b) => a + b, 0) / n;

  // Calculate Moving Ranges
  const mrValues: number[] = [];
  for (let i = 1; i < n; i++) {
    mrValues.push(Math.abs(clean[i] - clean[i - 1]));
  }
  const mrMean = mrValues.reduce((a, b) => a + b, 0) / (n - 1);

  // Short-term (within) variation estimate using d2(2) = 1.128
  const sigmaWithin = mrMean / 1.128;

  // Overall sample standard deviation
  const sumSq = clean.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const sigmaOverall = Math.sqrt(sumSq / (n - 1));

  // Individuals Chart Zones & Limits
  const iZones = calculateSigmaZones(mean, sigmaWithin);
  const iUcl = iZones.plus3Sigma;
  const iCl = mean;
  const iLcl = iZones.minus3Sigma;

  // Evaluate Test Rules for Individuals Chart
  const { violations, ruleSummaries } = evaluateNelsonTestRules(clean, iCl, sigmaWithin);
  const violatedPointNumbers = new Set(violations.map((v) => v.point));

  // Decorate I Chart points
  const iPoints: ChartPoint[] = clean.map((val, idx) => {
    const pNum = idx + 1;
    const zScore = sigmaWithin > 0 ? (val - iCl) / sigmaWithin : 0;
    const ptViolations = violations.filter((v) => v.point === pNum);
    return {
      index: pNum,
      label: labels && labels[idx] ? labels[idx] : `#${pNum}`,
      value: val,
      mr: idx > 0 ? mrValues[idx - 1] : undefined,
      zScore,
      isViolated: violatedPointNumbers.has(pNum),
      violations: ptViolations,
      zone: determineZoneLabel(zScore),
    };
  });

  // MR Chart Limits: D4(2)=3.267, D3(2)=0
  const mrUcl = 3.267 * mrMean;
  const mrCl = mrMean;
  const mrLcl = 0;

  const mrPoints: ChartPoint[] = mrValues.map((mrVal, idx) => {
    const pNum = idx + 2; // MR corresponds to points (idx, idx+1)
    const isExceeded = mrVal > mrUcl;
    return {
      index: pNum,
      label: `#${pNum - 1}-#${pNum}`,
      value: mrVal,
      zScore: mrVal / (mrMean || 1),
      isViolated: isExceeded,
      violations: isExceeded
        ? [
            {
              rule: 'MR Exceeded',
              ruleName: 'Moving Range Out of Control',
              ruleDescription: `Moving range between points #${pNum - 1} and #${pNum} is ${mrVal.toFixed(2)}, exceeding UCL (${mrUcl.toFixed(2)}).`,
              point: pNum,
              value: mrVal,
              sigmaPosition: 3.267,
              isSevere: true,
            },
          ]
        : [],
      zone: isExceeded ? 'Beyond +3σ' : 'Zone C+',
    };
  });

  // Determine overall process status
  const severeCount = violations.filter((v) => v.isSevere).length;
  let status: ProcessStatus = 'IN_CONTROL';
  let statusMessage = 'Process is in statistical control. No special cause violations detected.';

  if (severeCount > 0) {
    status = 'OUT_OF_CONTROL';
    statusMessage = `Process is OUT OF CONTROL with ${severeCount} severe special cause violation(s).`;
  } else if (violations.length > 0) {
    status = 'WARNING';
    statusMessage = `Process shows warning patterns with ${violations.length} minor non-random rule violations.`;
  }

  return {
    chartType: 'I-MR',
    columnName,
    n,
    subgroupSize: 1,
    mean,
    sigmaWithin,
    sigmaOverall,
    primaryChart: {
      title: `Individuals (I) Chart — ${columnName}`,
      points: iPoints,
      zones: iZones,
      ucl: iUcl,
      cl: iCl,
      lcl: iLcl,
      yAxisLabel: 'Individual Value',
    },
    secondaryChart: {
      title: `Moving Range (MR) Chart (span=2)`,
      points: mrPoints,
      ucl: mrUcl,
      cl: mrCl,
      lcl: mrLcl,
      yAxisLabel: 'Moving Range',
    },
    ruleViolations: violations,
    ruleSummaries,
    status,
    statusMessage,
  };
}

/**
 * Calculates Xbar-R Control Chart for Subgroup Data
 */
export function calculateXbarRChart(
  values: number[],
  subgroupSize = 5,
  columnName = 'Process Subgroups'
): SpcCalculationResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const subSize = Math.min(Math.max(subgroupSize, 2), 10);
  const constants = SPC_CONSTANTS[subSize] || SPC_CONSTANTS[5];

  const numSubgroups = Math.floor(clean.length / subSize);
  if (numSubgroups < 2) {
    throw new Error(`Xbar-R chart requires at least 2 full subgroups of size ${subSize}.`);
  }

  const subgroupMeans: number[] = [];
  const subgroupRanges: number[] = [];

  for (let i = 0; i < numSubgroups; i++) {
    const group = clean.slice(i * subSize, (i + 1) * subSize);
    const gMean = group.reduce((a, b) => a + b, 0) / subSize;
    const gMin = Math.min(...group);
    const gMax = Math.max(...group);
    subgroupMeans.push(gMean);
    subgroupRanges.push(gMax - gMin);
  }

  const grandMean = subgroupMeans.reduce((a, b) => a + b, 0) / numSubgroups;
  const rBar = subgroupRanges.reduce((a, b) => a + b, 0) / numSubgroups;
  const sigmaWithin = rBar / constants.d2;

  // Overall sigma
  const totalMean = clean.slice(0, numSubgroups * subSize).reduce((a, b) => a + b, 0) / (numSubgroups * subSize);
  const sumSq = clean.slice(0, numSubgroups * subSize).reduce((acc, v) => acc + Math.pow(v - totalMean, 2), 0);
  const sigmaOverall = Math.sqrt(sumSq / (numSubgroups * subSize - 1));

  // Xbar Chart Limits & Zones (sigma of means = sigmaWithin / sqrt(n))
  const sigmaMean = sigmaWithin / Math.sqrt(subSize);
  const xbarZones = calculateSigmaZones(grandMean, sigmaMean);
  const xbarUcl = grandMean + constants.A2 * rBar;
  const xbarCl = grandMean;
  const xbarLcl = grandMean - constants.A2 * rBar;

  // Evaluate test rules on subgroup means
  const { violations, ruleSummaries } = evaluateNelsonTestRules(subgroupMeans, xbarCl, sigmaMean);
  const violatedPointNumbers = new Set(violations.map((v) => v.point));

  const xbarPoints: ChartPoint[] = subgroupMeans.map((val, idx) => {
    const pNum = idx + 1;
    const zScore = sigmaMean > 0 ? (val - xbarCl) / sigmaMean : 0;
    return {
      index: pNum,
      label: `Subgroup ${pNum}`,
      value: val,
      range: subgroupRanges[idx],
      subgroupSize: subSize,
      zScore,
      isViolated: violatedPointNumbers.has(pNum),
      violations: violations.filter((v) => v.point === pNum),
      zone: determineZoneLabel(zScore),
    };
  });

  // R Chart Limits: D4 * Rbar, D3 * Rbar
  const rUcl = constants.D4 * rBar;
  const rCl = rBar;
  const rLcl = constants.D3 * rBar;

  const rPoints: ChartPoint[] = subgroupRanges.map((rVal, idx) => {
    const pNum = idx + 1;
    const isExceeded = rVal > rUcl || (rLcl > 0 && rVal < rLcl);
    return {
      index: pNum,
      label: `Subgroup ${pNum}`,
      value: rVal,
      zScore: rVal / (rBar || 1),
      isViolated: isExceeded,
      violations: isExceeded
        ? [
            {
              rule: 'R Exceeded',
              ruleName: 'Range Limit Exceeded',
              ruleDescription: `Subgroup #${pNum} range (${rVal.toFixed(2)}) is outside control limits [${rLcl.toFixed(2)}, ${rUcl.toFixed(2)}].`,
              point: pNum,
              value: rVal,
              sigmaPosition: 3,
              isSevere: true,
            },
          ]
        : [],
      zone: isExceeded ? 'Beyond +3σ' : 'Zone C+',
    };
  });

  const severeCount = violations.filter((v) => v.isSevere).length;
  const status: ProcessStatus = severeCount > 0 ? 'OUT_OF_CONTROL' : violations.length > 0 ? 'WARNING' : 'IN_CONTROL';

  return {
    chartType: 'Xbar-R',
    columnName,
    n: clean.length,
    subgroupSize: subSize,
    mean: grandMean,
    sigmaWithin,
    sigmaOverall,
    primaryChart: {
      title: `Xbar Chart (Subgroup Size n=${subSize})`,
      points: xbarPoints,
      zones: xbarZones,
      ucl: xbarUcl,
      cl: xbarCl,
      lcl: xbarLcl,
      yAxisLabel: 'Subgroup Mean (X̄)',
    },
    secondaryChart: {
      title: `Range (R) Chart (n=${subSize})`,
      points: rPoints,
      ucl: rUcl,
      cl: rCl,
      lcl: rLcl,
      yAxisLabel: 'Subgroup Range (R)',
    },
    ruleViolations: violations,
    ruleSummaries,
    status,
    statusMessage: status === 'IN_CONTROL' ? 'Xbar-R process is stable.' : 'Special causes detected in Xbar-R process.',
  };
}

/**
 * Calculates Xbar-S Control Chart (using Subgroup Standard Deviations)
 */
export function calculateXbarSChart(
  values: number[],
  subgroupSize = 5,
  columnName = 'Process Subgroups'
): SpcCalculationResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const subSize = Math.min(Math.max(subgroupSize, 2), 10);
  const constants = SPC_CONSTANTS[subSize] || SPC_CONSTANTS[5];

  const numSubgroups = Math.floor(clean.length / subSize);
  if (numSubgroups < 2) {
    throw new Error(`Xbar-S chart requires at least 2 full subgroups of size ${subSize}.`);
  }

  const subgroupMeans: number[] = [];
  const subgroupStdDevs: number[] = [];

  for (let i = 0; i < numSubgroups; i++) {
    const group = clean.slice(i * subSize, (i + 1) * subSize);
    const gMean = group.reduce((a, b) => a + b, 0) / subSize;
    const gVariance = group.reduce((acc, v) => acc + Math.pow(v - gMean, 2), 0) / (subSize - 1);
    subgroupMeans.push(gMean);
    subgroupStdDevs.push(Math.sqrt(gVariance));
  }

  const grandMean = subgroupMeans.reduce((a, b) => a + b, 0) / numSubgroups;
  const sBar = subgroupStdDevs.reduce((a, b) => a + b, 0) / numSubgroups;
  const sigmaWithin = sBar / constants.c4;

  const totalMean = clean.slice(0, numSubgroups * subSize).reduce((a, b) => a + b, 0) / (numSubgroups * subSize);
  const sumSq = clean.slice(0, numSubgroups * subSize).reduce((acc, v) => acc + Math.pow(v - totalMean, 2), 0);
  const sigmaOverall = Math.sqrt(sumSq / (numSubgroups * subSize - 1));

  const sigmaMean = sigmaWithin / Math.sqrt(subSize);
  const xbarZones = calculateSigmaZones(grandMean, sigmaMean);
  const xbarUcl = grandMean + constants.A3 * sBar;
  const xbarCl = grandMean;
  const xbarLcl = grandMean - constants.A3 * sBar;

  const { violations, ruleSummaries } = evaluateNelsonTestRules(subgroupMeans, xbarCl, sigmaMean);
  const violatedPointNumbers = new Set(violations.map((v) => v.point));

  const xbarPoints: ChartPoint[] = subgroupMeans.map((val, idx) => {
    const pNum = idx + 1;
    const zScore = sigmaMean > 0 ? (val - xbarCl) / sigmaMean : 0;
    return {
      index: pNum,
      label: `Subgroup ${pNum}`,
      value: val,
      stdDev: subgroupStdDevs[idx],
      subgroupSize: subSize,
      zScore,
      isViolated: violatedPointNumbers.has(pNum),
      violations: violations.filter((v) => v.point === pNum),
      zone: determineZoneLabel(zScore),
    };
  });

  const sUcl = constants.B4 * sBar;
  const sCl = sBar;
  const sLcl = constants.B3 * sBar;

  const sPoints: ChartPoint[] = subgroupStdDevs.map((sVal, idx) => {
    const pNum = idx + 1;
    const isExceeded = sVal > sUcl || (sLcl > 0 && sVal < sLcl);
    return {
      index: pNum,
      label: `Subgroup ${pNum}`,
      value: sVal,
      zScore: sVal / (sBar || 1),
      isViolated: isExceeded,
      violations: isExceeded
        ? [
            {
              rule: 'S Exceeded',
              ruleName: 'StdDev Limit Exceeded',
              ruleDescription: `Subgroup #${pNum} standard deviation (${sVal.toFixed(2)}) is outside control limits.`,
              point: pNum,
              value: sVal,
              sigmaPosition: 3,
              isSevere: true,
            },
          ]
        : [],
      zone: isExceeded ? 'Beyond +3σ' : 'Zone C+',
    };
  });

  const severeCount = violations.filter((v) => v.isSevere).length;
  const status: ProcessStatus = severeCount > 0 ? 'OUT_OF_CONTROL' : violations.length > 0 ? 'WARNING' : 'IN_CONTROL';

  return {
    chartType: 'Xbar-S',
    columnName,
    n: clean.length,
    subgroupSize: subSize,
    mean: grandMean,
    sigmaWithin,
    sigmaOverall,
    primaryChart: {
      title: `Xbar Chart (n=${subSize})`,
      points: xbarPoints,
      zones: xbarZones,
      ucl: xbarUcl,
      cl: xbarCl,
      lcl: xbarLcl,
      yAxisLabel: 'Subgroup Mean (X̄)',
    },
    secondaryChart: {
      title: `Standard Deviation (S) Chart (n=${subSize})`,
      points: sPoints,
      ucl: sUcl,
      cl: sCl,
      lcl: sLcl,
      yAxisLabel: 'Subgroup Std Dev (S)',
    },
    ruleViolations: violations,
    ruleSummaries,
    status,
    statusMessage: status === 'IN_CONTROL' ? 'Xbar-S process is in control.' : 'Special causes detected in Xbar-S process.',
  };
}

/**
 * Attribute Charts: p, np, c, u
 */
export function calculateAttributeChart(
  chartType: 'p' | 'np' | 'c' | 'u',
  defectValues: number[],
  sampleSizes?: number[],
  columnName = 'Defect Counts'
): SpcCalculationResult {
  const n = defectValues.length;
  if (n < 2) {
    throw new Error(`${chartType.toUpperCase()} chart requires at least 2 observations.`);
  }

  const defaultSampleSize = 50;
  const sizes = sampleSizes && sampleSizes.length === n ? sampleSizes : Array(n).fill(defaultSampleSize);

  let cl = 0;
  let sigma = 1;
  const points: ChartPoint[] = [];

  if (chartType === 'p') {
    // p Chart: Fraction nonconforming
    const totalDefects = defectValues.reduce((a, b) => a + b, 0);
    const totalInspected = sizes.reduce((a, b) => a + b, 0);
    cl = totalInspected > 0 ? totalDefects / totalInspected : 0;
    const avgN = totalInspected / n;
    sigma = Math.sqrt((cl * (1 - cl)) / avgN);

    defectValues.forEach((d, idx) => {
      const p = sizes[idx] > 0 ? d / sizes[idx] : 0;
      const ptSigma = Math.sqrt((cl * (1 - cl)) / sizes[idx]);
      const z = ptSigma > 0 ? (p - cl) / ptSigma : 0;
      const ucl = cl + 3 * ptSigma;
      const lcl = Math.max(0, cl - 3 * ptSigma);
      const isExceeded = p > ucl || p < lcl;

      points.push({
        index: idx + 1,
        label: `#${idx + 1}`,
        value: p,
        zScore: z,
        isViolated: isExceeded,
        violations: isExceeded
          ? [
              {
                rule: 'Rule 1',
                ruleName: 'Beyond 3 Sigma',
                ruleDescription: `Proportion ${p.toFixed(4)} is outside control limits [${lcl.toFixed(4)}, ${ucl.toFixed(4)}].`,
                point: idx + 1,
                value: p,
                sigmaPosition: z,
                isSevere: true,
              },
            ]
          : [],
        zone: determineZoneLabel(z),
      });
    });
  } else if (chartType === 'np') {
    // np Chart: Number nonconforming for constant sample size
    const totalDefects = defectValues.reduce((a, b) => a + b, 0);
    const constantN = sizes[0] || defaultSampleSize;
    const pBar = totalDefects / (n * constantN);
    cl = constantN * pBar;
    sigma = Math.sqrt(constantN * pBar * (1 - pBar));

    const ucl = cl + 3 * sigma;
    const lcl = Math.max(0, cl - 3 * sigma);

    defectValues.forEach((npVal, idx) => {
      const z = sigma > 0 ? (npVal - cl) / sigma : 0;
      const isExceeded = npVal > ucl || npVal < lcl;
      points.push({
        index: idx + 1,
        label: `#${idx + 1}`,
        value: npVal,
        zScore: z,
        isViolated: isExceeded,
        violations: isExceeded
          ? [
              {
                rule: 'Rule 1',
                ruleName: 'Beyond 3 Sigma',
                ruleDescription: `Defect count ${npVal} is outside control limits [${lcl.toFixed(2)}, ${ucl.toFixed(2)}].`,
                point: idx + 1,
                value: npVal,
                sigmaPosition: z,
                isSevere: true,
              },
            ]
          : [],
        zone: determineZoneLabel(z),
      });
    });
  } else if (chartType === 'c') {
    // c Chart: Number of defects in a constant area/unit
    cl = defectValues.reduce((a, b) => a + b, 0) / n;
    sigma = Math.sqrt(cl);
    const ucl = cl + 3 * sigma;
    const lcl = Math.max(0, cl - 3 * sigma);

    defectValues.forEach((cVal, idx) => {
      const z = sigma > 0 ? (cVal - cl) / sigma : 0;
      const isExceeded = cVal > ucl || cVal < lcl;
      points.push({
        index: idx + 1,
        label: `#${idx + 1}`,
        value: cVal,
        zScore: z,
        isViolated: isExceeded,
        violations: isExceeded
          ? [
              {
                rule: 'Rule 1',
                ruleName: 'Beyond 3 Sigma',
                ruleDescription: `Defects count ${cVal} is outside control limits [${lcl.toFixed(2)}, ${ucl.toFixed(2)}].`,
                point: idx + 1,
                value: cVal,
                sigmaPosition: z,
                isSevere: true,
              },
            ]
          : [],
        zone: determineZoneLabel(z),
      });
    });
  } else {
    // u Chart: Defects per unit for varying unit sizes
    const totalDefects = defectValues.reduce((a, b) => a + b, 0);
    const totalUnits = sizes.reduce((a, b) => a + b, 0);
    cl = totalUnits > 0 ? totalDefects / totalUnits : 0;
    const avgN = totalUnits / n;
    sigma = Math.sqrt(cl / avgN);

    defectValues.forEach((d, idx) => {
      const uVal = sizes[idx] > 0 ? d / sizes[idx] : 0;
      const ptSigma = Math.sqrt(cl / sizes[idx]);
      const z = ptSigma > 0 ? (uVal - cl) / ptSigma : 0;
      const ucl = cl + 3 * ptSigma;
      const lcl = Math.max(0, cl - 3 * ptSigma);
      const isExceeded = uVal > ucl || uVal < lcl;

      points.push({
        index: idx + 1,
        label: `#${idx + 1}`,
        value: uVal,
        zScore: z,
        isViolated: isExceeded,
        violations: isExceeded
          ? [
              {
                rule: 'Rule 1',
                ruleName: 'Beyond 3 Sigma',
                ruleDescription: `Rate ${uVal.toFixed(3)} is outside control limits [${lcl.toFixed(3)}, ${ucl.toFixed(3)}].`,
                point: idx + 1,
                value: uVal,
                sigmaPosition: z,
                isSevere: true,
              },
            ]
          : [],
        zone: determineZoneLabel(z),
      });
    });
  }

  const zones = calculateSigmaZones(cl, sigma);
  const allViolations = points.flatMap((p) => p.violations);
  const status: ProcessStatus = allViolations.length > 0 ? 'OUT_OF_CONTROL' : 'IN_CONTROL';

  return {
    chartType,
    columnName,
    n,
    subgroupSize: sizes[0] || defaultSampleSize,
    mean: cl,
    sigmaWithin: sigma,
    sigmaOverall: sigma,
    primaryChart: {
      title: `${chartType.toUpperCase()} Attribute Control Chart — ${columnName}`,
      points,
      zones,
      ucl: zones.plus3Sigma,
      cl,
      lcl: Math.max(0, zones.minus3Sigma),
      yAxisLabel: chartType === 'p' ? 'Fraction Nonconforming' : chartType === 'np' ? 'Defectives (np)' : chartType === 'c' ? 'Defects (c)' : 'Defects/Unit (u)',
    },
    ruleViolations: allViolations,
    ruleSummaries: [
      {
        ruleId: 'Rule 1',
        name: 'Rule 1: Control Limit Exceedance',
        description: 'Observation exceeds calculated 3-sigma control limits.',
        status: allViolations.length > 0 ? 'FAIL' : 'PASS',
        violationCount: allViolations.length,
        violatedPoints: allViolations.map((v) => v.point),
      },
    ],
    status,
    statusMessage: status === 'IN_CONTROL' ? 'Attribute process variation is in statistical control.' : 'Attribute process has points outside control limits.',
  };
}

export interface CalculateSpcOptions {
  values: number[];
  chartType: ControlChartType;
  columnName?: string;
  subgroupSize?: number;
  specificationLimits?: {
    usl?: number | null;
    target?: number | null;
    lsl?: number | null;
  };
}

export function calculateSpcChart(options: CalculateSpcOptions): SpcCalculationResult {
  const { values, chartType, columnName = 'Measurement', subgroupSize = 5 } = options;

  switch (chartType) {
    case 'Xbar-R':
      return calculateXbarRChart(values, subgroupSize, columnName);
    case 'Xbar-S':
      return calculateXbarSChart(values, subgroupSize, columnName);
    case 'p':
    case 'np':
    case 'c':
    case 'u':
      return calculateAttributeChart(chartType, values, Array(values.length).fill(subgroupSize), columnName);
    case 'I-MR':
    default:
      return calculateIMRChart(values, columnName);
  }
}

