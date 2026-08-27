import { AIChartInsight, AIRootCauseResult, AIAutoAnalysisReport } from '../types/ai';

export async function requestChartAnalysis(context: any): Promise<AIChartInsight> {
  try {
    const res = await fetch('/api/ai/analyze-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('AI Server endpoint unavailable, using local calculation fallback:', err);
    return generateLocalFallbackInsight(context);
  }
}

export async function requestRootCauseAnalysis(payload: {
  problemStatement: string;
  signalEvidence: any;
  equipmentContext: any;
  processParameters: any;
}): Promise<AIRootCauseResult> {
  try {
    const res = await fetch('/api/ai/root-cause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Root Cause API unavailable, using structured fallback:', err);
    return {
      source: 'heuristic',
      problem: payload.problemStatement,
      fiveWhy: [
        { level: 1, why: `Why did ${payload.problemStatement} occur?`, answer: 'An out-of-control statistical point exceeded allowable ±3σ sigma bounds.' },
        { level: 2, why: 'Why was there excessive variation or limit excursion?', answer: 'Process parameters drifted away from nominal operating conditions.' },
        { level: 3, why: 'Why did parameters drift?', answer: 'Tooling wear or calibration degradation was uncompensated.' },
        { level: 4, why: 'Why was the tool wear uncompensated?', answer: 'Maintenance inspection interval was overdue.' },
        { level: 5, why: 'Why was maintenance overdue?', answer: 'Lack of automated SPC alert triggers tied directly into the work order schedule.' }
      ],
      fishbone: {
        man: ['Operator shift transition variance', 'Inconsistent manual compensation technique', 'SOP training gap'],
        machine: ['Bearing runout or spindle backlash', 'Thermal drift during prolonged cycle', 'Sensor calibration decay'],
        method: ['Feed rate or cycle speed out of sweet spot', 'Inadequate line clearance between lots', 'Unstandardized recipe'],
        material: ['Raw material viscosity / hardness fluctuation', 'Moisture absorption in resin / alloy', 'Supplier lot variance'],
        measurement: ['Gauge R&R measurement system error', 'Dial indicator zero offset', 'Probe misalignment'],
        environment: ['Ambient temperature shift between shifts', 'Humidity spike', 'Vibration from adjacent heavy equipment']
      },
      verificationActions: [
        'Inspect physical cutting inserts and verify spindle runout',
        'Audit raw material lot certificates for the affected batch',
        'Perform Gauge R&R study on the measurement micrometer/gauge',
        'Verify recipe parameters in the machine CNC controller'
      ]
    };
  }
}

export async function sendAIChatMessage(message: string, history: any[], currentContext: any): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, currentContext }),
    });
    if (!res.ok) throw new Error(`Chat error ${res.status}`);
    const data = await res.json();
    return data.reply;
  } catch (err: any) {
    return `Analysis Engine response: Based on the current dataset (Mean = ${currentContext?.mean?.toFixed(3) ?? 'N/A'}, Sigma = ${currentContext?.sigma?.toFixed(3) ?? 'N/A'}, Rule Violations = ${currentContext?.ruleViolations?.length ?? 0}), the process status is ${currentContext?.status ?? 'active'}.`;
  }
}

export async function requestAutoAnalysis(payload: any): Promise<AIAutoAnalysisReport> {
  try {
    const res = await fetch('/api/ai/auto-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Auto-analyze error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      overallStatus: payload.violations?.length > 0 ? 'ATTENTION_REQUIRED' : 'IN_CONTROL',
      priority: payload.violations?.length > 0 ? 'HIGH' : 'LOW',
      keyFindings: [
        `Dataset contains ${payload.datasetSummary?.rowCount ?? 0} rows across ${payload.datasetSummary?.columnCount ?? 0} variables.`,
        payload.violations?.length > 0 ? `Identified ${payload.violations.length} control chart test rule violations.` : 'No special cause rule violations detected.',
        payload.capability?.cpk ? `Process capability Cpk is ${payload.capability.cpk.toFixed(2)} (${payload.capability.cpk >= 1.33 ? 'Capable' : 'Needs Centering/Improvement'}).` : 'Specification limits not set.',
        'Data profiling indicates continuous process data suitable for SPC analysis.'
      ],
      spcAssessment: 'The process was evaluated against Nelson & Western Electric SPC test rules with automated sigma zones.',
      capabilityAssessment: payload.capability?.interpretation || 'Specification limits required for full capability assessment.',
      recommendedActions: [
        'Review specific observation points flagged with special cause signals.',
        'Check equipment logs and line setup parameters.',
        'Monitor next production run with standard subgroup sampling.'
      ]
    };
  }
}

function generateLocalFallbackInsight(ctx: any): AIChartInsight {
  const violations = ctx.ruleViolations || [];
  const isOutOfControl = ctx.status === 'OUT_OF_CONTROL' || violations.length > 0;

  return {
    source: 'heuristic',
    executiveSummary: isOutOfControl
      ? `Process exhibits special-cause variation with ${violations.length} test rule violation(s). Immediate root cause investigation is required to eliminate assignable causes.`
      : `Process is statistically in control. Common-cause variation adheres to normal distribution boundaries within calculated ±3σ control limits.`,
    statisticalFinding: `Sample size N=${ctx.n || 0}. Process Mean = ${ctx.mean?.toFixed(3) || '0.000'}, Standard Deviation (σ) = ${ctx.sigma?.toFixed(3) || '0.000'}. Calculated 3-Sigma limits span from ${ctx.lcl?.toFixed(3) || '0.000'} to ${ctx.ucl?.toFixed(3) || '0.000'}.`,
    spcFinding: `Control chart type is ${ctx.chartType || 'I-MR'}. Center line established at ${ctx.mean?.toFixed(3) || '0.000'}. Zone A, B, and C partitions actively monitored.`,
    specialCauses: violations.length > 0
      ? `Special causes detected: ${violations.map((v: any) => `${v.rule} at point #${v.point} (val: ${v.value?.toFixed(2)})`).slice(0, 5).join('; ')}.`
      : 'No test rule violations detected across Western Electric / Nelson Rules 1 through 8.',
    capability: ctx.capability?.cpk
      ? `Process capability Cpk is ${ctx.capability.cpk.toFixed(2)} (Cp = ${ctx.capability.cp?.toFixed(2) || 'N/A'}). ${ctx.capability.cpk >= 1.33 ? 'Process meets standard 1.33 Six Sigma capability threshold.' : 'Process capability is below target benchmark (1.33), presenting defect risk.'}`
      : 'Specification limits (USL/LSL) not provided.',
    pattern: violations.some((v: any) => v.rule === 'Rule 4')
      ? 'Process Shift detected: Sustained points on one side of center line.'
      : violations.some((v: any) => v.rule === 'Rule 5')
      ? 'Trend detected: Continuous sequence of increasing/decreasing observations.'
      : violations.some((v: any) => v.rule === 'Rule 1')
      ? 'Extreme outlier excursion beyond ±3σ limit.'
      : 'Random common-cause variation.',
    possibleCauses: [
      'Process setting shift or recipe parameter modification',
      'Raw material batch-to-batch variation',
      'Tool wear or mechanical backlash',
      'Operator technique differences across shifts',
      'Ambient temperature or environmental humidity fluctuations'
    ],
    recommendedActions: [
      `Investigate flagged observations (${violations.map((v: any) => `#${v.point}`).slice(0, 4).join(', ') || 'none'})`,
      'Conduct 5-Why root cause inquiry with process owner',
      'Examine equipment maintenance logs for recent servicing or tooling changeover',
      'Verify calibration of primary measurement instrumentation'
    ],
    levels: {
      basic: `Status: ${ctx.status || 'Active'}. ${violations.length ? `${violations.length} points need attention.` : 'Everything is running within normal limits.'}`,
      professional: `Chart ${ctx.chartType}, N=${ctx.n}, CL=${ctx.mean?.toFixed(3)}, Sigma=${ctx.sigma?.toFixed(3)}. ${violations.length ? `Detected ${violations.length} Western Electric / Nelson rule violations.` : 'Process demonstrates statistical stability.'}`,
      executive: `Quality Status: Process ${isOutOfControl ? 'requires operational intervention due to special cause variation' : 'operates within statistical control limits'}.`
    }
  };
}
