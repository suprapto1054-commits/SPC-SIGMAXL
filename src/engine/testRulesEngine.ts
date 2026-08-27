import { RuleViolation, RuleSummary } from '../types/spc';

export interface TestRuleDefinition {
  id: string;
  name: string;
  description: string;
  isAdvanced?: boolean;
}

export const TEST_RULE_DEFINITIONS: TestRuleDefinition[] = [
  {
    id: 'Rule 1',
    name: 'Rule 1: Beyond 3 Sigma (Outlier/Special Cause)',
    description: 'One point beyond Zone A (outside the upper or lower 3σ control limits).',
  },
  {
    id: 'Rule 2',
    name: 'Rule 2: 2 of 3 in Zone A or Beyond',
    description: '2 out of 3 consecutive points in Zone A (> 2σ) or beyond on the same side of the center line.',
  },
  {
    id: 'Rule 3',
    name: 'Rule 3: 4 of 5 in Zone B or Beyond',
    description: '4 out of 5 consecutive points in Zone B (> 1σ) or beyond on the same side of the center line.',
  },
  {
    id: 'Rule 4',
    name: 'Rule 4: 8 Consecutive on Same Side (Shift)',
    description: '8 consecutive points on the same side of the center line, indicating a sustained process shift.',
  },
  {
    id: 'Rule 5',
    name: 'Rule 5: 6 Points Trending Up or Down',
    description: '6 consecutive points steadily increasing or steadily decreasing.',
    isAdvanced: true,
  },
  {
    id: 'Rule 6',
    name: 'Rule 6: 15 Points in Zone C (Stratification)',
    description: '15 consecutive points within Zone C (±1σ) of the center line, suggesting over-control or stratification.',
    isAdvanced: true,
  },
  {
    id: 'Rule 7',
    name: 'Rule 7: 14 Points Alternating Up & Down',
    description: '14 consecutive points alternating direction (up, down, up, down), indicating systematic oscillation.',
    isAdvanced: true,
  },
  {
    id: 'Rule 8',
    name: 'Rule 8: 8 Points with None in Zone C (Mixture)',
    description: '8 consecutive points outside Zone C (> 1σ) on either side with zero points inside Zone C.',
    isAdvanced: true,
  },
];

export function evaluateNelsonTestRules(
  values: number[],
  cl: number,
  sigma: number
): { violations: RuleViolation[]; ruleSummaries: RuleSummary[] } {
  const violations: RuleViolation[] = [];
  const n = values.length;

  if (n === 0 || sigma <= 0) {
    return {
      violations: [],
      ruleSummaries: TEST_RULE_DEFINITIONS.map((def) => ({
        ruleId: def.id,
        name: def.name,
        description: def.description,
        status: 'PASS',
        violationCount: 0,
        violatedPoints: [],
      })),
    };
  }

  // Calculate Z-scores for all points
  const zScores = values.map((val) => (val - cl) / sigma);

  // Track violations per rule
  const violatedPointsMap = new Map<string, Set<number>>();
  TEST_RULE_DEFINITIONS.forEach((def) => violatedPointsMap.set(def.id, new Set<number>()));

  // 1. Rule 1: One point beyond 3 sigma (|Z| > 3)
  for (let i = 0; i < n; i++) {
    if (Math.abs(zScores[i]) > 3) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 1')!.add(pNum);
      violations.push({
        rule: 'Rule 1',
        ruleName: 'Beyond 3 Sigma',
        ruleDescription: `Point #${pNum} is at ${zScores[i] > 0 ? '+' : ''}${zScores[i].toFixed(2)}σ, outside the control limits.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: true,
        involvedPoints: [pNum],
      });
    }
  }

  // 2. Rule 2: 2 out of 3 consecutive points beyond 2 sigma on same side
  for (let i = 2; i < n; i++) {
    const window = [zScores[i - 2], zScores[i - 1], zScores[i]];
    const upperCount = window.filter((z) => z > 2).length;
    const lowerCount = window.filter((z) => z < -2).length;

    if (upperCount >= 2 || lowerCount >= 2) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 2')!.add(pNum);
      const windowPoints = [i - 1, i, i + 1];
      violations.push({
        rule: 'Rule 2',
        ruleName: '2 of 3 in Zone A (>2σ)',
        ruleDescription: `Points [${windowPoints.join(', ')}] have 2 out of 3 observations in Zone A on the same side.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: true,
        involvedPoints: windowPoints,
      });
    }
  }

  // 3. Rule 3: 4 out of 5 consecutive points beyond 1 sigma on same side
  for (let i = 4; i < n; i++) {
    const window = [zScores[i - 4], zScores[i - 3], zScores[i - 2], zScores[i - 1], zScores[i]];
    const upperCount = window.filter((z) => z > 1).length;
    const lowerCount = window.filter((z) => z < -1).length;

    if (upperCount >= 4 || lowerCount >= 4) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 3')!.add(pNum);
      const windowPoints = [i - 3, i - 2, i - 1, i, i + 1];
      violations.push({
        rule: 'Rule 3',
        ruleName: '4 of 5 in Zone B (>1σ)',
        ruleDescription: `Points [${windowPoints.slice(0, 5).join(', ')}] have 4 out of 5 observations in Zone B or beyond.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: false,
        involvedPoints: windowPoints,
      });
    }
  }

  // 4. Rule 4: 8 consecutive points on the same side of center line
  for (let i = 7; i < n; i++) {
    const window = zScores.slice(i - 7, i + 1);
    const allUpper = window.every((z) => z > 0);
    const allLower = window.every((z) => z < 0);

    if (allUpper || allLower) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 4')!.add(pNum);
      const windowPoints = Array.from({ length: 8 }, (_, idx) => i - 7 + idx + 1);
      violations.push({
        rule: 'Rule 4',
        ruleName: '8 Consecutive on Same Side (Shift)',
        ruleDescription: `Points #${i - 6} through #${pNum} all reside on the ${allUpper ? 'upper' : 'lower'} side of the center line.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: true,
        involvedPoints: windowPoints,
      });
    }
  }

  // 5. Rule 5: 6 consecutive points steadily increasing or steadily decreasing
  for (let i = 5; i < n; i++) {
    const windowVals = values.slice(i - 5, i + 1);
    let isIncreasing = true;
    let isDecreasing = true;

    for (let k = 1; k < 6; k++) {
      if (windowVals[k] <= windowVals[k - 1]) isIncreasing = false;
      if (windowVals[k] >= windowVals[k - 1]) isDecreasing = false;
    }

    if (isIncreasing || isDecreasing) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 5')!.add(pNum);
      const windowPoints = Array.from({ length: 6 }, (_, idx) => i - 5 + idx + 1);
      violations.push({
        rule: 'Rule 5',
        ruleName: '6 Points Trending',
        ruleDescription: `Points #${i - 4} through #${pNum} demonstrate a continuous ${isIncreasing ? 'upward' : 'downward'} trend.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: false,
        involvedPoints: windowPoints,
      });
    }
  }

  // 6. Rule 6: 15 consecutive points within Zone C (±1σ)
  for (let i = 14; i < n; i++) {
    const window = zScores.slice(i - 14, i + 1);
    const allInZoneC = window.every((z) => Math.abs(z) <= 1);

    if (allInZoneC) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 6')!.add(pNum);
      const windowPoints = Array.from({ length: 15 }, (_, idx) => i - 14 + idx + 1);
      violations.push({
        rule: 'Rule 6',
        ruleName: '15 in Zone C (Stratification)',
        ruleDescription: `Points #${i - 13} to #${pNum} are all tightly confined within ±1σ.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: false,
        involvedPoints: windowPoints,
      });
    }
  }

  // 7. Rule 7: 14 consecutive points alternating up and down
  for (let i = 13; i < n; i++) {
    const windowVals = values.slice(i - 13, i + 1);
    let isAlternating = true;
    for (let k = 1; k < 13; k++) {
      const diff1 = windowVals[k] - windowVals[k - 1];
      const diff2 = windowVals[k + 1] - windowVals[k];
      if (diff1 * diff2 >= 0) {
        isAlternating = false;
        break;
      }
    }
    if (isAlternating) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 7')!.add(pNum);
      const windowPoints = Array.from({ length: 14 }, (_, idx) => i - 13 + idx + 1);
      violations.push({
        rule: 'Rule 7',
        ruleName: '14 Alternating Up/Down',
        ruleDescription: `Points #${i - 12} to #${pNum} oscillate systematically up and down.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: false,
        involvedPoints: windowPoints,
      });
    }
  }

  // 8. Rule 8: 8 consecutive points with none in Zone C (> 1σ on either side)
  for (let i = 7; i < n; i++) {
    const window = zScores.slice(i - 7, i + 1);
    const noneInZoneC = window.every((z) => Math.abs(z) > 1);

    if (noneInZoneC) {
      const pNum = i + 1;
      violatedPointsMap.get('Rule 8')!.add(pNum);
      const windowPoints = Array.from({ length: 8 }, (_, idx) => i - 7 + idx + 1);
      violations.push({
        rule: 'Rule 8',
        ruleName: '8 Outside Zone C (Mixture)',
        ruleDescription: `Points #${i - 6} to #${pNum} avoid the Center Line Zone C entirely, suggesting a bimodal mixture.`,
        point: pNum,
        value: values[i],
        sigmaPosition: zScores[i],
        isSevere: false,
        involvedPoints: windowPoints,
      });
    }
  }

  // Construct rule summaries
  const ruleSummaries: RuleSummary[] = TEST_RULE_DEFINITIONS.map((def) => {
    const points = Array.from(violatedPointsMap.get(def.id) || []);
    return {
      ruleId: def.id,
      name: def.name,
      description: def.description,
      status: points.length > 0 ? 'FAIL' : 'PASS',
      violationCount: points.length,
      violatedPoints: points.sort((a, b) => a - b),
    };
  });

  return { violations, ruleSummaries };
}
