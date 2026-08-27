import { CapabilityResult } from '../types/spc';
import { standardNormalCdf } from './statisticalEngine';

/**
 * Calculates Process Capability (Cp, Cpk, Pp, Ppk) and PPM metrics.
 * 
 * Equations:
 * Cp = (USL - LSL) / (6 * sigma_within)
 * Cpu = (USL - mean) / (3 * sigma_within)
 * Cpl = (mean - LSL) / (3 * sigma_within)
 * Cpk = min(Cpu, Cpl)
 * 
 * Pp = (USL - LSL) / (6 * sigma_overall)
 * Ppu = (USL - mean) / (3 * sigma_overall)
 * Ppl = (mean - LSL) / (3 * sigma_overall)
 * Ppk = min(Ppu, Ppl)
 */
export function calculateCapability(
  values: number[],
  options: {
    usl?: number | null;
    lsl?: number | null;
    target?: number | null;
    sigmaWithin?: number;
  } = {}
): CapabilityResult {
  const clean = values.filter((x) => typeof x === 'number' && !isNaN(x) && isFinite(x));
  const n = clean.length;

  if (n < 2) {
    return {
      cp: null,
      cpk: null,
      pp: null,
      ppk: null,
      cpu: null,
      cpl: null,
      ppu: null,
      ppl: null,
      mean: 0,
      sigmaWithin: 0,
      sigmaOverall: 0,
      usl: options.usl ?? null,
      lsl: options.lsl ?? null,
      target: options.target ?? null,
      expectedPpmLsl: 0,
      expectedPpmUsl: 0,
      expectedPpmTotal: 0,
      observedPpm: 0,
      status: 'UNDEFINED',
      interpretation: 'Insufficient data points to perform process capability calculation.',
      centeringOffsetPercent: null,
      zBenchmark: 0,
    };
  }

  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Overall sigma (s)
  const sumSq = clean.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const sigmaOverall = Math.sqrt(sumSq / (n - 1));

  // Short-term / within sigma from moving range (or passed in from control chart)
  let sigmaWithin = options.sigmaWithin;
  if (!sigmaWithin || sigmaWithin <= 0) {
    let mrSum = 0;
    for (let i = 1; i < n; i++) {
      mrSum += Math.abs(clean[i] - clean[i - 1]);
    }
    const mrMean = mrSum / (n - 1);
    sigmaWithin = mrMean / 1.128;
  }

  const usl = typeof options.usl === 'number' && !isNaN(options.usl) ? options.usl : null;
  const lsl = typeof options.lsl === 'number' && !isNaN(options.lsl) ? options.lsl : null;
  const target = typeof options.target === 'number' && !isNaN(options.target) ? options.target : null;

  let cp: number | null = null;
  let cpu: number | null = null;
  let cpl: number | null = null;
  let cpk: number | null = null;

  let pp: number | null = null;
  let ppu: number | null = null;
  let ppl: number | null = null;
  let ppk: number | null = null;

  let expectedPpmUsl = 0;
  let expectedPpmLsl = 0;

  // Both limits provided (Two-sided specification)
  if (usl !== null && lsl !== null && usl > lsl) {
    const specWidth = usl - lsl;
    if (sigmaWithin > 0) {
      cp = specWidth / (6 * sigmaWithin);
      cpu = (usl - mean) / (3 * sigmaWithin);
      cpl = (mean - lsl) / (3 * sigmaWithin);
      cpk = Math.min(cpu, cpl);
    }
    if (sigmaOverall > 0) {
      pp = specWidth / (6 * sigmaOverall);
      ppu = (usl - mean) / (3 * sigmaOverall);
      ppl = (mean - lsl) / (3 * sigmaOverall);
      ppk = Math.min(ppu, ppl);
    }
  } else if (usl !== null) {
    // Single upper limit
    if (sigmaWithin > 0) {
      cpu = (usl - mean) / (3 * sigmaWithin);
      cpk = cpu;
    }
    if (sigmaOverall > 0) {
      ppu = (usl - mean) / (3 * sigmaOverall);
      ppk = ppu;
    }
  } else if (lsl !== null) {
    // Single lower limit
    if (sigmaWithin > 0) {
      cpl = (mean - lsl) / (3 * sigmaWithin);
      cpk = cpl;
    }
    if (sigmaOverall > 0) {
      ppl = (mean - lsl) / (3 * sigmaOverall);
      ppk = ppl;
    }
  }

  // Calculate Expected PPM (Parts Per Million Non-Conforming)
  if (usl !== null && sigmaWithin > 0) {
    const zUsl = (usl - mean) / sigmaWithin;
    const pAboveUsl = 1 - standardNormalCdf(zUsl);
    expectedPpmUsl = pAboveUsl * 1_000_000;
  }
  if (lsl !== null && sigmaWithin > 0) {
    const zLsl = (mean - lsl) / sigmaWithin;
    const pBelowLsl = 1 - standardNormalCdf(zLsl);
    expectedPpmLsl = pBelowLsl * 1_000_000;
  }
  const expectedPpmTotal = expectedPpmUsl + expectedPpmLsl;

  // Observed non-conforming items in the actual sample
  let observedFailures = 0;
  for (const v of clean) {
    if (usl !== null && v > usl) observedFailures++;
    else if (lsl !== null && v < lsl) observedFailures++;
  }
  const observedPpm = (observedFailures / n) * 1_000_000;

  // Centering offset percentage relative to tolerance center
  let centeringOffsetPercent: number | null = null;
  if (usl !== null && lsl !== null) {
    const specCenter = (usl + lsl) / 2;
    const halfWidth = (usl - lsl) / 2;
    centeringOffsetPercent = halfWidth > 0 ? ((mean - specCenter) / halfWidth) * 100 : 0;
  }

  // Capability Status Classification
  let status: CapabilityResult['status'] = 'UNDEFINED';
  let interpretation = '';

  if (cpk === null) {
    status = 'UNDEFINED';
    interpretation = 'Enter valid specification limits (USL and/or LSL) to evaluate process capability.';
  } else if (cpk >= 1.67) {
    status = 'EXCELLENT';
    interpretation = `World-class capability (Cpk = ${cpk.toFixed(2)} ≥ 1.67). Expected defect rate is < 1 PPM. The process is exceptionally centered and capable.`;
  } else if (cpk >= 1.33) {
    status = 'CAPABLE';
    interpretation = `Satisfactory industrial capability (Cpk = ${cpk.toFixed(2)} ≥ 1.33). Expected defect rate is ~63 PPM. Process meets standard quality requirements.`;
  } else if (cpk >= 1.0) {
    status = 'MARGINAL';
    interpretation = `Marginal capability (1.0 ≤ Cpk = ${cpk.toFixed(2)} < 1.33). Expected defect rate is ~${Math.round(expectedPpmTotal)} PPM. Process requires tight monitoring or centering adjustment.`;
  } else if (cpk > 0) {
    status = 'POOR';
    interpretation = `Poor capability (0 < Cpk = ${cpk.toFixed(2)} < 1.0). High risk of non-conforming units (~${Math.round(expectedPpmTotal)} PPM). Immediate variation reduction is required.`;
  } else {
    status = 'CRITICAL';
    interpretation = `Critical failure (Cpk = ${cpk.toFixed(2)} ≤ 0). The process average has shifted outside the specification limits. Majority of output will be non-conforming.`;
  }

  // Add Cp vs Cpk centering insight if both exist
  if (cp !== null && cpk !== null) {
    const k = Math.abs(cp - cpk);
    if (k > 0.3 && cp >= 1.33) {
      interpretation += ` Note: Potential capability Cp (${cp.toFixed(2)}) is significantly higher than Cpk (${cpk.toFixed(2)}), revealing that the process spread is narrow enough but the average is off-target. Centering the mean will immediately boost capability.`;
    }
  }

  return {
    cp,
    cpk,
    pp,
    ppk,
    cpu,
    cpl,
    ppu,
    ppl,
    mean,
    sigmaWithin,
    sigmaOverall,
    usl,
    lsl,
    target,
    expectedPpmLsl,
    expectedPpmUsl,
    expectedPpmTotal,
    observedPpm,
    status,
    interpretation,
    centeringOffsetPercent,
    zBenchmark: cpk !== null ? cpk * 3 : 0,
  };
}

export const calculateProcessCapability = calculateCapability;

