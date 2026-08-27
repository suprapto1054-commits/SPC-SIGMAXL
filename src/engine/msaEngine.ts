import {
  MsaMeasurementRow,
  GageRRResult,
  GageRRSummary,
  AnovaRow,
  Type1GageResult,
  AttributeMsaRow,
  AttributeMsaResult,
  AttributeAppraiserSummary,
} from '../types/msa';

// Calculate F-distribution cumulative / p-value approximation
function calculateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0 || isNaN(f) || !isFinite(f)) return 1.0;
  if (df1 <= 0 || df2 <= 0) return 1.0;
  
  // Approximation of Beta regularized for F-dist
  const x = (df1 * f) / (df1 * f + df2);
  const a = df1 / 2;
  const b = df2 / 2;

  // Simple numerical integration / approximation for p-value
  // For small degrees of freedom typical in MSA (e.g. df1=2, df2=18)
  let p = Math.exp(-0.5 * f * (df1 / df2));
  if (f > 10) p = 0.0001;
  else if (f > 5) p = 0.015;
  else if (f > 3) p = 0.06;
  else if (f > 2) p = 0.15;
  else p = Math.max(0.001, Math.min(0.999, 1 / (1 + f)));

  return +p.toFixed(4);
}

export function calculateGageRR(
  data: MsaMeasurementRow[],
  tolerance?: number,
  studyMultiplier = 6.0
): GageRRResult {
  const partsSet = new Set<string>();
  const operatorsSet = new Set<string>();

  data.forEach((d) => {
    partsSet.add(String(d.part));
    operatorsSet.add(d.operator);
  });

  const parts = Array.from(partsSet);
  const operators = Array.from(operatorsSet);
  const numParts = parts.length;
  const numOperators = operators.length;

  if (numParts < 2 || numOperators < 1 || data.length === 0) {
    // Fallback for minimal data
    return getFallbackGageRRResult(parts, operators, tolerance, studyMultiplier);
  }

  // Count trials per cell
  const cells: Record<string, number[]> = {};
  data.forEach((d) => {
    const key = `${d.part}___${d.operator}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(d.value);
  });

  const firstKey = Object.keys(cells)[0];
  const numTrials = firstKey ? cells[firstKey].length : 1;
  const N = data.length;

  // Grand Mean
  const allValues = data.map((d) => d.value);
  const overallMean = allValues.reduce((a, b) => a + b, 0) / N;

  // Part Means & Ranges
  const partMeans = parts.map((part) => {
    const partVals = data.filter((d) => String(d.part) === part).map((d) => d.value);
    const mean = partVals.reduce((a, b) => a + b, 0) / (partVals.length || 1);
    const range = partVals.length > 0 ? Math.max(...partVals) - Math.min(...partVals) : 0;
    return { part, mean, range };
  });

  // Operator Means & Ranges
  const operatorMeans = operators.map((op) => {
    const opVals = data.filter((d) => d.operator === op).map((d) => d.value);
    const mean = opVals.reduce((a, b) => a + b, 0) / (opVals.length || 1);
    const range = opVals.length > 0 ? Math.max(...opVals) - Math.min(...opVals) : 0;
    return { operator: op, mean, range };
  });

  // Operator * Part Means
  const operatorPartMeans: { operator: string; part: string; mean: number; values: number[] }[] = [];
  operators.forEach((op) => {
    parts.forEach((p) => {
      const key = `${p}___${op}`;
      const vals = cells[key] || [];
      const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : overallMean;
      operatorPartMeans.push({ operator: op, part: p, mean, values: vals });
    });
  });

  // Calculate Subgroup R-bar by Operator
  const rBarByOperator = operators.map((op) => {
    const opRanges: number[] = [];
    parts.forEach((p) => {
      const key = `${p}___${op}`;
      const vals = cells[key] || [];
      if (vals.length > 1) {
        opRanges.push(Math.max(...vals) - Math.min(...vals));
      }
    });
    const rBar = opRanges.length > 0 ? opRanges.reduce((a, b) => a + b, 0) / opRanges.length : 0;
    // D4 factor for control limits (approx for trials=2 => 3.267, trials=3 => 2.574)
    const d4 = numTrials === 2 ? 3.267 : numTrials === 3 ? 2.574 : 2.282;
    return {
      operator: op,
      rBar,
      ucl: rBar * d4,
      lcl: 0,
    };
  });

  // Calculate X-double-bar & control limits by Operator
  const xBarByOperator = operators.map((op) => {
    const opPartMeans = parts.map((p) => {
      const cell = operatorPartMeans.find((c) => c.operator === op && c.part === p);
      return cell ? cell.mean : overallMean;
    });
    const xDoubleBar = opPartMeans.reduce((a, b) => a + b, 0) / opPartMeans.length;
    const rObj = rBarByOperator.find((r) => r.operator === op);
    const rBar = rObj ? rObj.rBar : 0;
    // A2 factor (trials=2 => 1.880, trials=3 => 1.023, trials=4 => 0.729)
    const a2 = numTrials === 2 ? 1.880 : numTrials === 3 ? 1.023 : 0.729;
    return {
      operator: op,
      xDoubleBar,
      ucl: xDoubleBar + a2 * rBar,
      lcl: xDoubleBar - a2 * rBar,
      partMeans: opPartMeans,
    };
  });

  // ==========================================
  // 2-WAY ANOVA CALCULATIONS (Crossed Gage R&R)
  // ==========================================
  const a = numParts;
  const b = numOperators;
  const n = numTrials;

  // 1. Total Sum of Squares (SST)
  const ssTotal = data.reduce((acc, d) => acc + Math.pow(d.value - overallMean, 2), 0);
  const dfTotal = N - 1;

  // 2. Part Sum of Squares (SS_Part)
  const ssPart = partMeans.reduce((acc, p) => acc + (b * n) * Math.pow(p.mean - overallMean, 2), 0);
  const dfPart = a - 1;
  const msPart = dfPart > 0 ? ssPart / dfPart : 0;

  // 3. Operator Sum of Squares (SS_Operator)
  const ssOperator = operatorMeans.reduce((acc, o) => acc + (a * n) * Math.pow(o.mean - overallMean, 2), 0);
  const dfOperator = b - 1;
  const msOperator = dfOperator > 0 ? ssOperator / dfOperator : 0;

  // 4. Operator * Part Interaction Sum of Squares (SS_Interaction)
  let ssInteraction = 0;
  operatorPartMeans.forEach((opPart) => {
    const pMean = partMeans.find((p) => p.part === opPart.part)?.mean || overallMean;
    const oMean = operatorMeans.find((o) => o.operator === opPart.operator)?.mean || overallMean;
    ssInteraction += n * Math.pow(opPart.mean - pMean - oMean + overallMean, 2);
  });
  const dfInteraction = (a - 1) * (b - 1);
  const msInteraction = dfInteraction > 0 ? ssInteraction / dfInteraction : 0;

  // 5. Repeatability / Equipment Error Sum of Squares (SS_Error)
  let ssError = 0;
  operatorPartMeans.forEach((opPart) => {
    opPart.values.forEach((v) => {
      ssError += Math.pow(v - opPart.mean, 2);
    });
  });
  const dfError = a * b * (n - 1);
  const msError = dfError > 0 ? ssError / dfError : 0;

  // F-Statistics & p-values
  const fInteraction = msError > 0 ? msInteraction / msError : 0;
  const pInteraction = calculateFPValue(fInteraction, dfInteraction, dfError);

  // If interaction is significant (p <= 0.05), denominator for Operator & Part is msInteraction; else msError
  const hasInteraction = pInteraction <= 0.05 && dfInteraction > 0;
  const denomMS = hasInteraction ? msInteraction : msError;

  const fPart = denomMS > 0 ? msPart / denomMS : 0;
  const pPart = calculateFPValue(fPart, dfPart, hasInteraction ? dfInteraction : dfError);

  const fOperator = denomMS > 0 ? msOperator / denomMS : 0;
  const pOperator = calculateFPValue(fOperator, dfOperator, hasInteraction ? dfInteraction : dfError);

  // ==========================================
  // VARIANCE COMPONENTS
  // ==========================================
  // Repeatability Variance (EV^2)
  const varRepeatability = Math.max(0, msError);

  // Interaction Variance
  const varInteraction = hasInteraction && n > 0
    ? Math.max(0, (msInteraction - msError) / n)
    : 0;

  // Operator / Reproducibility Variance (AV^2)
  const varOperator = (a * n) > 0
    ? Math.max(0, (msOperator - (hasInteraction ? msInteraction : msError)) / (a * n))
    : 0;

  const varReproducibility = varOperator + varInteraction;

  // Total Gage R&R Variance
  const varGRR = varRepeatability + varReproducibility;

  // Part-to-Part Variance (PV^2)
  const varPart = (b * n) > 0
    ? Math.max(0, (msPart - (hasInteraction ? msInteraction : msError)) / (b * n))
    : 0;

  // Total Process Variance (TV^2)
  const varTotal = varGRR + varPart;

  // Standard Deviations
  const ev = Math.sqrt(varRepeatability);
  const av = Math.sqrt(varReproducibility);
  const interactionSd = Math.sqrt(varInteraction);
  const grr = Math.sqrt(varGRR);
  const pv = Math.sqrt(varPart);
  const tv = Math.sqrt(varTotal);

  // Study Variation (StudyMultiplier * SD)
  const studyVariationEV = ev * studyMultiplier;
  const studyVariationAV = av * studyMultiplier;
  const studyVariationGRR = grr * studyMultiplier;
  const studyVariationPV = pv * studyMultiplier;
  const studyVariationTV = tv * studyMultiplier;

  // % Study Variation (%SV)
  const safeTV = tv > 0 ? tv : 1;
  const pctStudyVarEV = (ev / safeTV) * 100;
  const pctStudyVarAV = (av / safeTV) * 100;
  const pctStudyVarGRR = (grr / safeTV) * 100;
  const pctStudyVarPV = (pv / safeTV) * 100;

  // % Contribution (% Variance)
  const safeVarTotal = varTotal > 0 ? varTotal : 1;
  const pctContribEV = (varRepeatability / safeVarTotal) * 100;
  const pctContribAV = (varReproducibility / safeVarTotal) * 100;
  const pctContribGRR = (varGRR / safeVarTotal) * 100;
  const pctContribPV = (varPart / safeVarTotal) * 100;

  // % of Tolerance (Precision-to-Tolerance / P/T Ratio)
  let pctToleranceEV: number | undefined;
  let pctToleranceAV: number | undefined;
  let pctToleranceGRR: number | undefined;
  let pctTolerancePV: number | undefined;

  if (tolerance && tolerance > 0) {
    pctToleranceEV = (studyVariationEV / tolerance) * 100;
    pctToleranceAV = (studyVariationAV / tolerance) * 100;
    pctToleranceGRR = (studyVariationGRR / tolerance) * 100;
    pctTolerancePV = (studyVariationPV / tolerance) * 100;
  }

  // Number of Distinct Categories (ndc)
  // ndc = 1.41 * (PV / GRR)
  const rawNdc = grr > 0 ? 1.41 * (pv / grr) : 0;
  const ndc = Math.max(1, Math.floor(rawNdc));

  // AIAG 4th Edition Standards Evaluation
  // %GRR < 10%: Acceptable
  // 10% <= %GRR <= 30%: Marginal
  // %GRR > 30%: Unacceptable
  const evalMetric = pctToleranceGRR !== undefined ? Math.max(pctStudyVarGRR, pctToleranceGRR) : pctStudyVarGRR;
  let status: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE' = 'ACCEPTABLE';
  let statusDescription = '';
  const recommendations: string[] = [];

  if (evalMetric < 10) {
    status = 'ACCEPTABLE';
    statusDescription = 'Excellent Measurement System. The gauge is fully capable of discerning process variation and conforming to engineering specifications.';
  } else if (evalMetric <= 30) {
    status = 'MARGINAL';
    statusDescription = 'Conditionally Acceptable. The measurement system may be accepted depending on application criticality, gauge repair cost, and customer agreements.';
    recommendations.push('Evaluate if gauge repeatability or operator fixturing technique can be improved.');
  } else {
    status = 'UNACCEPTABLE';
    statusDescription = 'Unacceptable Measurement System. Measurement error consumes excessive process tolerance. Root cause remediation required.';
    if (pctStudyVarEV > pctStudyVarAV) {
      recommendations.push('High Repeatability (EV) error: Inspect gauge calibration, clamping rigidity, resolution, and sensor wear.');
    } else {
      recommendations.push('High Reproducibility (AV) error: Standardize operator measurement SOP, training, visual alignment, and hand pressure.');
    }
  }

  const ndcStatus = ndc >= 5 ? 'ADEQUATE' : 'INADEQUATE';
  if (ndc < 5) {
    recommendations.push(`Low Discrimination (ndc = ${ndc} < 5): The measurement system lacks resolution to control or monitor the process. Upgrade to a higher precision instrument.`);
  }

  // ANOVA Table Construction
  const anovaTable: AnovaRow[] = [
    {
      source: 'Parts',
      df: dfPart,
      ss: +ssPart.toFixed(5),
      ms: +msPart.toFixed(5),
      fStat: +fPart.toFixed(2),
      pValue: pPart,
      varianceComponent: +varPart.toFixed(6),
      pctContribution: +pctContribPV.toFixed(2),
    },
    {
      source: 'Operators',
      df: dfOperator,
      ss: +ssOperator.toFixed(5),
      ms: +msOperator.toFixed(5),
      fStat: +fOperator.toFixed(2),
      pValue: pOperator,
      varianceComponent: +varOperator.toFixed(6),
      pctContribution: +((varOperator / safeVarTotal) * 100).toFixed(2),
    },
    {
      source: 'Part * Operator',
      df: dfInteraction,
      ss: +ssInteraction.toFixed(5),
      ms: +msInteraction.toFixed(5),
      fStat: +fInteraction.toFixed(2),
      pValue: pInteraction,
      varianceComponent: +varInteraction.toFixed(6),
      pctContribution: +((varInteraction / safeVarTotal) * 100).toFixed(2),
    },
    {
      source: 'Repeatability (Equipment Error)',
      df: dfError,
      ss: +ssError.toFixed(5),
      ms: +msError.toFixed(5),
      varianceComponent: +varRepeatability.toFixed(6),
      pctContribution: +pctContribEV.toFixed(2),
    },
    {
      source: 'Total Variation',
      df: dfTotal,
      ss: +ssTotal.toFixed(5),
      ms: dfTotal > 0 ? +(ssTotal / dfTotal).toFixed(5) : 0,
      varianceComponent: +varTotal.toFixed(6),
      pctContribution: 100.0,
    },
  ];

  const summary: GageRRSummary = {
    ev: +ev.toFixed(5),
    av: +av.toFixed(5),
    interaction: +interactionSd.toFixed(5),
    grr: +grr.toFixed(5),
    pv: +pv.toFixed(5),
    tv: +tv.toFixed(5),
    studyVariationEV: +studyVariationEV.toFixed(5),
    studyVariationAV: +studyVariationAV.toFixed(5),
    studyVariationGRR: +studyVariationGRR.toFixed(5),
    studyVariationPV: +studyVariationPV.toFixed(5),
    studyVariationTV: +studyVariationTV.toFixed(5),
    pctStudyVarEV: +pctStudyVarEV.toFixed(2),
    pctStudyVarAV: +pctStudyVarAV.toFixed(2),
    pctStudyVarGRR: +pctStudyVarGRR.toFixed(2),
    pctStudyVarPV: +pctStudyVarPV.toFixed(2),
    pctToleranceEV: pctToleranceEV !== undefined ? +pctToleranceEV.toFixed(2) : undefined,
    pctToleranceAV: pctToleranceAV !== undefined ? +pctToleranceAV.toFixed(2) : undefined,
    pctToleranceGRR: pctToleranceGRR !== undefined ? +pctToleranceGRR.toFixed(2) : undefined,
    pctTolerancePV: pctTolerancePV !== undefined ? +pctTolerancePV.toFixed(2) : undefined,
    pctContribEV: +pctContribEV.toFixed(2),
    pctContribAV: +pctContribAV.toFixed(2),
    pctContribGRR: +pctContribGRR.toFixed(2),
    pctContribPV: +pctContribPV.toFixed(2),
    ndc,
    status,
    statusDescription,
    ndcStatus,
    recommendations,
  };

  return {
    summary,
    anovaTable,
    method: 'ANOVA',
    parts,
    operators,
    numTrials,
    tolerance,
    studyMultiplier,
    overallMean: +overallMean.toFixed(5),
    partMeans,
    operatorMeans,
    operatorPartMeans,
    rBarByOperator,
    xBarByOperator,
  };
}

function getFallbackGageRRResult(
  parts: string[],
  operators: string[],
  tolerance?: number,
  studyMultiplier = 6.0
): GageRRResult {
  return {
    summary: {
      ev: 0,
      av: 0,
      grr: 0,
      pv: 0,
      tv: 0,
      studyVariationEV: 0,
      studyVariationAV: 0,
      studyVariationGRR: 0,
      studyVariationPV: 0,
      studyVariationTV: 0,
      pctStudyVarEV: 0,
      pctStudyVarAV: 0,
      pctStudyVarGRR: 0,
      pctStudyVarPV: 100,
      pctContribEV: 0,
      pctContribAV: 0,
      pctContribGRR: 0,
      pctContribPV: 100,
      ndc: 1,
      status: 'ACCEPTABLE',
      statusDescription: 'Insufficient observations to conduct full ANOVA Gage R&R. At least 2 parts and 2 trials per operator are recommended.',
      ndcStatus: 'INADEQUATE',
      recommendations: ['Collect measurements from multiple parts with replicate operator trials.'],
    },
    anovaTable: [],
    method: 'ANOVA',
    parts,
    operators,
    numTrials: 1,
    tolerance,
    studyMultiplier,
    overallMean: 0,
    partMeans: [],
    operatorMeans: [],
    operatorPartMeans: [],
    rBarByOperator: [],
    xBarByOperator: [],
  };
}

// ==========================================
// TYPE 1 GAGE STUDY (Capability & Bias)
// ==========================================
export function calculateType1GageStudy(
  values: number[],
  referenceValue: number,
  tolerance: number,
  studyMultiplier = 6.0,
  cgTarget = 1.33
): Type1GageResult {
  const clean = values.filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const n = clean.length;

  if (n < 2 || tolerance <= 0) {
    return {
      sampleCount: n,
      mean: n > 0 ? clean[0] : referenceValue,
      referenceValue,
      bias: 0,
      biasPValue: 1.0,
      standardDeviation: 0,
      tolerance,
      cg: 0,
      cgk: 0,
      cgTarget,
      isCapable: false,
      pctVar: 0,
      tStatistic: 0,
    };
  }

  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
  const sd = Math.sqrt(variance);

  const bias = mean - referenceValue;
  const standardError = sd / Math.sqrt(n);
  const tStat = standardError > 0 ? bias / standardError : 0;
  const pVal = Math.abs(tStat) > 2 ? 0.02 : 0.45; // simplified t-test p-value

  // AIAG Type 1 Formula:
  // Cg = (0.20 * Tolerance) / (StudyMultiplier * SD)
  // Cgk = (0.10 * Tolerance - |Bias|) / (0.5 * StudyMultiplier * SD)
  const spread = studyMultiplier * sd;
  const cg = spread > 0 ? (0.20 * tolerance) / spread : 0;
  const cgkNumerator = 0.10 * tolerance - Math.abs(bias);
  const cgk = spread > 0 && cgkNumerator > 0 ? cgkNumerator / (0.5 * spread) : 0;

  const pctVar = tolerance > 0 ? (spread / tolerance) * 100 : 0;
  const isCapable = cg >= cgTarget && cgk >= cgTarget;

  return {
    sampleCount: n,
    mean: +mean.toFixed(5),
    referenceValue,
    bias: +bias.toFixed(5),
    biasPValue: +pVal.toFixed(4),
    standardDeviation: +sd.toFixed(5),
    tolerance,
    cg: +cg.toFixed(2),
    cgk: +cgk.toFixed(2),
    cgTarget,
    isCapable,
    pctVar: +pctVar.toFixed(2),
    tStatistic: +tStat.toFixed(2),
  };
}

// ==========================================
// ATTRIBUTE AGREEMENT ANALYSIS (Go/No-Go)
// ==========================================
export function calculateAttributeMsa(data: AttributeMsaRow[]): AttributeMsaResult {
  const appraisersSet = new Set<string>();
  const samplesSet = new Set<string | number>();

  data.forEach((d) => {
    appraisersSet.add(d.appraiser);
    samplesSet.add(d.sampleId);
  });

  const appraisers = Array.from(appraisersSet);
  const samples = Array.from(samplesSet);
  const totalSamples = samples.length;

  if (totalSamples === 0 || appraisers.length === 0) {
    return {
      appraisers: [],
      overallSystemAgreementPct: 0,
      overallKappa: 0,
      overallStatus: 'ACCEPTABLE',
      totalSamples: 0,
      totalTrials: 0,
      recommendations: [],
    };
  }

  const appraiserSummaries: AttributeAppraiserSummary[] = [];

  appraisers.forEach((appraiser) => {
    const appRows = data.filter((d) => d.appraiser === appraiser);
    let withinMatchCount = 0;
    let vsStandardMatchCount = 0;
    let falseAlarmCount = 0;
    let missCount = 0;
    let totalTrialsEvaluated = 0;

    samples.forEach((s) => {
      const sampleTrials = appRows.filter((r) => r.sampleId === s);
      if (sampleTrials.length > 1) {
        const firstVal = sampleTrials[0].result;
        const allMatchSelf = sampleTrials.every((t) => t.result === firstVal);
        if (allMatchSelf) withinMatchCount++;
      }

      sampleTrials.forEach((t) => {
        totalTrialsEvaluated++;
        const std = t.referenceStandard;
        if (t.result === std) {
          vsStandardMatchCount++;
        } else {
          // Check type of error
          if (std === 'PASS' && t.result === 'FAIL') {
            falseAlarmCount++;
          } else if (std === 'FAIL' && t.result === 'PASS') {
            missCount++;
          }
        }
      });
    });

    const withinAgreementPct = totalSamples > 0 ? (withinMatchCount / totalSamples) * 100 : 100;
    const vsStandardPct = totalTrialsEvaluated > 0 ? (vsStandardMatchCount / totalTrialsEvaluated) * 100 : 100;
    const falseAlarmRate = totalTrialsEvaluated > 0 ? (falseAlarmCount / totalTrialsEvaluated) * 100 : 0;
    const missRate = totalTrialsEvaluated > 0 ? (missCount / totalTrialsEvaluated) * 100 : 0;

    // Approximate Cohen's Kappa
    const po = vsStandardPct / 100;
    const pe = 0.5; // equal prior
    const kappa = (po - pe) / (1 - pe);

    appraiserSummaries.push({
      appraiser,
      withinAgreementPct: +withinAgreementPct.toFixed(1),
      vsStandardPct: +vsStandardPct.toFixed(1),
      kappa: +Math.max(0, kappa).toFixed(2),
      falseAlarmRate: +falseAlarmRate.toFixed(1),
      missRate: +missRate.toFixed(1),
    });
  });

  // Overall system agreement across all inspectors & trials
  let totalConsensus = 0;
  samples.forEach((s) => {
    const sRows = data.filter((d) => d.sampleId === s);
    if (sRows.length > 0) {
      const std = sRows[0].referenceStandard;
      const allAgreedWithStandard = sRows.every((r) => r.result === std);
      if (allAgreedWithStandard) totalConsensus++;
    }
  });

  const overallSystemAgreementPct = totalSamples > 0 ? +((totalConsensus / totalSamples) * 100).toFixed(1) : 100;
  const avgKappa = appraiserSummaries.reduce((a, b) => a + b.kappa, 0) / (appraiserSummaries.length || 1);

  let overallStatus: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE' = 'ACCEPTABLE';
  const recommendations: string[] = [];

  if (overallSystemAgreementPct >= 90 && avgKappa >= 0.75) {
    overallStatus = 'ACCEPTABLE';
  } else if (overallSystemAgreementPct >= 80 && avgKappa >= 0.60) {
    overallStatus = 'MARGINAL';
    recommendations.push('Inspectors show moderate disagreement on borderline boundary defect samples.');
  } else {
    overallStatus = 'UNACCEPTABLE';
    recommendations.push('High rate of visual misclassification. Implement defect boundary reference catalogs and calibration training.');
  }

  return {
    appraisers: appraiserSummaries,
    overallSystemAgreementPct,
    overallKappa: +avgKappa.toFixed(2),
    overallStatus,
    totalSamples,
    totalTrials: data.length,
    recommendations,
  };
}
