import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'AI-SPC Analytics',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// SPC Chart AI Analysis
app.post('/api/ai/analyze-chart', async (req: Request, res: Response) => {
  try {
    const ai = getGenAI();
    const context = req.body;

    if (!context || !context.chartType) {
      return res.status(400).json({ error: 'Missing chart context data' });
    }

    if (!ai) {
      // Return a robust heuristic-based statistical interpretation if no API key is set yet
      return res.json({
        source: 'heuristic',
        message: 'Analysis generated via rule-based statistical calculation engine (API key not configured).',
        executiveSummary: generateHeuristicExecutiveSummary(context),
        statisticalFinding: generateHeuristicStatisticalFinding(context),
        spcFinding: generateHeuristicSpcFinding(context),
        specialCauses: generateHeuristicSpecialCauses(context),
        capability: generateHeuristicCapability(context),
        pattern: generateHeuristicPattern(context),
        possibleCauses: [
          'Process parameter shift or setting change during production',
          'Raw material batch or vendor variability',
          'Tool wear, machine calibration drift, or sensor degradation',
          'Operator turnover or standard operating procedure divergence',
          'Environmental variations (temperature, ambient humidity, line pressure)'
        ],
        recommendedActions: [
          `Investigate specific observations with rule violations (e.g. ${context.ruleViolations?.map((v: any) => `#${v.point}`).slice(0, 5).join(', ') || 'N/A'})`,
          'Perform a 5-Why root cause inquiry with the floor quality engineer',
          'Review machine maintenance logs and tooling changeovers for the affected run',
          'Evaluate if specification limits (USL/LSL) and target centering align with process distribution'
        ],
        levels: {
          basic: `Process status is ${context.status || 'monitored'}. ${context.ruleViolations?.length ? `There are ${context.ruleViolations.length} points that need attention.` : 'All monitored points are within normal variation.'}`,
          professional: `Chart type ${context.chartType} with N=${context.n}. Center Line (CL) = ${context.mean?.toFixed(3)}, Sigma = ${context.sigma?.toFixed(3)}. ${context.ruleViolations?.length ? `Detected ${context.ruleViolations.length} Western Electric / Nelson rule violations.` : 'Process demonstrates statistical control.'}`,
          executive: `Quality evaluation for ${context.chartType}: Process ${context.status === 'OUT_OF_CONTROL' ? 'exhibits special cause variation requiring operational inquiry' : 'operates within statistical stability limits'}. Capability ${context.capability?.cpk ? `Cpk=${context.capability.cpk.toFixed(2)}` : 'unspecified'}.`
        }
      });
    }

    const systemInstruction = `You are a World-Class Statistical Process Control (SPC) Expert and Six Sigma Master Black Belt.
Analyze the provided structured statistical analysis data carefully.
Strict Rules:
1. Never fabricate or change statistical values; use the provided context as absolute truth.
2. Clearly distinguish statistical evidence from hypothetical causes.
3. Never claim correlation proves causation.
4. Distinguish between short-term capability (Cp/Cpk) and overall performance (Pp/Ppk).
5. Always provide structured, actionable, and mathematically grounded findings.`;

    const prompt = `Analyze this SPC and Statistical dataset:
Context:
${JSON.stringify(context, null, 2)}

Return your analysis in valid JSON with this exact structure:
{
  "executiveSummary": "Concise high-level conclusion for leadership",
  "statisticalFinding": "Rigorous explanation of the numeric findings (mean, sigma, spread)",
  "spcFinding": "Control chart state, center line, limits, and stability",
  "specialCauses": "Detailed analysis of violated rules (Rule 1, 2, 3, 4, etc.) and affected point numbers",
  "capability": "Explanation of capability (Cp, Cpk, Pp, Ppk) and centering if specs provided",
  "pattern": "Identification of trends, shifts, cycles, stratification, or mixture",
  "possibleCauses": ["List of 4-6 realistic potential engineering/process causes to investigate"],
  "recommendedActions": ["List of 4-6 concrete, prioritized investigation steps"],
  "levels": {
    "basic": "1-2 sentence operator-friendly summary",
    "professional": "Technical engineer-level analytical explanation",
    "executive": "Strategic risk and quality impact summary for management"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ source: 'gemini', ...parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-chart:', error);
    return res.status(500).json({ error: error.message || 'AI analysis failed' });
  }
});

// AI Root Cause Assistant (5-Why & 6M Fishbone)
app.post('/api/ai/root-cause', async (req: Request, res: Response) => {
  try {
    const ai = getGenAI();
    const { problemStatement, signalEvidence, equipmentContext, processParameters } = req.body;

    if (!problemStatement) {
      return res.status(400).json({ error: 'Problem statement required' });
    }

    if (!ai) {
      // Fallback structured 5-Why and 6M
      return res.json({
        source: 'heuristic',
        problem: problemStatement,
        fiveWhy: [
          { level: 1, why: `Why did ${problemStatement} occur?`, answer: 'Out-of-control statistical signal detected in the control chart beyond allowable sigma threshold.' },
          { level: 2, why: 'Why was there excessive variation or a limit excursion?', answer: 'Process parameters drifted away from nominal operating center line during production cycle.' },
          { level: 3, why: 'Why did the process parameters drift?', answer: 'Equipment calibration or mechanical wear altered the tool feedback response.' },
          { level: 4, why: 'Why was the mechanical wear/drift uncompensated?', answer: 'Preventive maintenance check interval was exceeded due to high production run schedules.' },
          { level: 5, why: 'Why was the maintenance schedule not dynamically adjusted?', answer: 'Lack of automated SPC trigger alerts feeding directly into the maintenance work order system.' }
        ],
        fishbone: {
          man: ['Operator shift handoff discrepancy', 'Inconsistent manual adjustment technique', 'Training gap on new standard operating procedure'],
          machine: ['Tooling wear or bearing play', 'Thermal expansion during continuous running', 'Sensor calibration drift in thermocouple/pressure transducer'],
          method: ['Sub-optimal feed rate or cycle speed', 'Incomplete line clearance between batches', 'Unstandardized parameter recipe selection'],
          material: ['Batch-to-batch raw material viscosity or hardness fluctuation', 'Moisture content variation in incoming resin/alloy', 'Supplier lot changeover without inspection'],
          measurement: ['Gauge R&R measurement system variation', 'Calibration offset on dial indicator/micrometer', 'Parallax or probe seating misalignment'],
          environment: ['Ambient temperature fluctuation between day and night shifts', 'Humidity spike affecting material curing', 'Vibration interference from adjacent heavy press machinery']
        },
        verificationActions: [
          'Inspect physical tooling dimensions and calibrate primary sensors immediately',
          'Review raw material lot certificates for the affected timeframe',
          'Conduct Gauge R&R study if measurement repeatability is suspected',
          'Verify parameter recipe settings on the machine HMI controller'
        ]
      });
    }

    const systemInstruction = `You are a Six Sigma Black Belt and Root Cause Analysis Specialist.
Structure a rigorous 5-Why analysis and a 6M (Fishbone: Man, Machine, Method, Material, Measurement, Environment) cause-and-effect matrix based on the provided SPC problem statement and evidence.`;

    const prompt = `Perform a Root Cause Analysis for this SPC incident:
Problem: ${problemStatement}
SPC Evidence: ${JSON.stringify(signalEvidence || {})}
Equipment & Line Context: ${JSON.stringify(equipmentContext || {})}
Process Parameters: ${JSON.stringify(processParameters || {})}

Return valid JSON with:
{
  "problem": "${problemStatement}",
  "fiveWhy": [
    { "level": 1, "why": "Why ...", "answer": "..." },
    { "level": 2, "why": "Why ...", "answer": "..." },
    { "level": 3, "why": "Why ...", "answer": "..." },
    { "level": 4, "why": "Why ...", "answer": "..." },
    { "level": 5, "why": "Why ...", "answer": "..." }
  ],
  "fishbone": {
    "man": ["3 plausible hypotheses"],
    "machine": ["3 plausible hypotheses"],
    "method": ["3 plausible hypotheses"],
    "material": ["3 plausible hypotheses"],
    "measurement": ["3 plausible hypotheses"],
    "environment": ["3 plausible hypotheses"]
  },
  "verificationActions": ["4 concrete verification steps"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ source: 'gemini', ...parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/root-cause:', error);
    return res.status(500).json({ error: error.message || 'Root cause generation failed' });
  }
});

// Interactive AI Chat Assistant for SPC
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const ai = getGenAI();
    const { message, history, currentContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (!ai) {
      return res.json({
        reply: `[Heuristic Mode - Gemini API key not configured] You asked: "${message}". Based on the current dataset with mean ${currentContext?.mean ?? 'N/A'}, sigma ${currentContext?.sigma ?? 'N/A'}, and ${currentContext?.ruleViolations?.length ?? 0} rule violations, the process is ${currentContext?.status ?? 'active'}. Please review the violated points or check the Capability (Cpk) tab for full detail.`
      });
    }

    const systemInstruction = `You are "SPC AI Analyst", an expert AI assistant embedded inside the AI-SPC Analytics software.
You assist quality engineers, Six Sigma Black Belts, production managers, and operators.
You have real-time access to the user's active dataset statistical summary and control chart state.
Answer user questions accurately, citing specific numbers (mean, sigma, UCL, LSL, Cpk, Nelson rules) from the context.
Never hallucinate numbers. If information is missing, ask the user to select the appropriate column or provide specification limits.`;

    const contents = [];
    if (currentContext) {
      contents.push({
        text: `Active Statistical Workspace Context:\n${JSON.stringify(currentContext, null, 2)}`
      });
    }

    if (Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        contents.push({
          text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        });
      }
    }

    contents.push({ text: `User Question: ${message}` });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts: contents },
      config: {
        systemInstruction,
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

// Auto-Analyze Entire Dataset
app.post('/api/ai/auto-analyze', async (req: Request, res: Response) => {
  try {
    const ai = getGenAI();
    const { datasetSummary, columnStats, recommendedChart, violations, capability } = req.body;

    if (!ai) {
      return res.json({
        overallStatus: violations?.length > 0 ? 'ATTENTION_REQUIRED' : 'IN_CONTROL',
        priority: violations?.length > 0 ? 'HIGH' : 'LOW',
        keyFindings: [
          `Dataset contains ${datasetSummary?.rowCount ?? 0} rows across ${datasetSummary?.columnCount ?? 0} variables.`,
          violations?.length > 0 ? `Detected ${violations.length} control chart test rule violations.` : 'No special cause test rule violations detected.',
          capability?.cpk ? `Process capability Cpk is ${capability.cpk.toFixed(2)} (${capability.cpk >= 1.33 ? 'Capable' : 'Needs Improvement'}).` : 'Specification limits not fully set for capability calculation.',
          'Data profiling indicates continuous process parameters suitable for SPC charting.'
        ],
        recommendedActions: [
          'Inspect identified out-of-control observations immediately.',
          'Review equipment temperature and vibration sensors for correlation.',
          'Maintain regular subgroup sampling cadence.'
        ]
      });
    }

    const prompt = `Perform an executive automatic analysis of this dataset:
Data Profiling: ${JSON.stringify(datasetSummary || {})}
Column Stats: ${JSON.stringify(columnStats || {})}
Recommended SPC Chart: ${JSON.stringify(recommendedChart || {})}
Test Rule Violations: ${JSON.stringify(violations || [])}
Capability Metrics: ${JSON.stringify(capability || {})}

Return valid JSON with:
{
  "overallStatus": "IN_CONTROL" or "ATTENTION_REQUIRED" or "OUT_OF_CONTROL",
  "priority": "LOW" or "MEDIUM" or "HIGH",
  "keyFindings": ["4-5 bullet points of precise observations"],
  "spcAssessment": "Detailed paragraph assessing process stability",
  "capabilityAssessment": "Detailed paragraph assessing capability and centering",
  "recommendedActions": ["3-5 concrete operational next steps"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/auto-analyze:', error);
    return res.status(500).json({ error: error.message || 'Auto analysis failed' });
  }
});

// Heuristic fallback generators
function generateHeuristicExecutiveSummary(ctx: any): string {
  if (ctx.status === 'OUT_OF_CONTROL' || (ctx.ruleViolations && ctx.ruleViolations.length > 0)) {
    return `Process exhibits out-of-control signals with ${ctx.ruleViolations.length} test rule violation(s). Immediate root cause investigation is required to stabilize variation.`;
  }
  return `The monitored process is in statistical control. Natural common-cause variation is within calculated ±3σ control limits with no Western Electric / Nelson rule violations.`;
}

function generateHeuristicStatisticalFinding(ctx: any): string {
  return `Sample size N=${ctx.n || 0}. Process Mean = ${ctx.mean?.toFixed(3) || 'N/A'}, Standard Deviation (σ) = ${ctx.sigma?.toFixed(3) || 'N/A'}. 3-Sigma spread spans from ${ctx.lcl?.toFixed(3) || 'N/A'} to ${ctx.ucl?.toFixed(3) || 'N/A'}.`;
}

function generateHeuristicSpcFinding(ctx: any): string {
  return `For chart type ${ctx.chartType || 'I-MR'}, Center Line is established at ${ctx.mean?.toFixed(3) || 'N/A'}. Upper Control Limit (UCL) is ${ctx.ucl?.toFixed(3) || 'N/A'} and Lower Control Limit (LCL) is ${ctx.lcl?.toFixed(3) || 'N/A'}.`;
}

function generateHeuristicSpecialCauses(ctx: any): string {
  if (!ctx.ruleViolations || ctx.ruleViolations.length === 0) {
    return 'No special cause signals detected. Process variation adheres to expected random distribution patterns.';
  }
  const rules = ctx.ruleViolations.map((v: any) => `${v.rule} at point #${v.point} (val: ${v.value?.toFixed(2)}, sigma: ${v.sigmaPosition > 0 ? '+' : ''}${v.sigmaPosition?.toFixed(2)}σ)`).slice(0, 4).join('; ');
  return `Special cause violations identified: ${rules}.`;
}

function generateHeuristicCapability(ctx: any): string {
  if (!ctx.capability || (!ctx.capability.cp && !ctx.capability.cpk)) {
    return 'Specification limits (USL/LSL) not fully specified. Capability indices (Cp, Cpk) require defined engineering tolerances.';
  }
  return `Process capability: Cp = ${ctx.capability.cp?.toFixed(2) || 'N/A'}, Cpk = ${ctx.capability.cpk?.toFixed(2) || 'N/A'}. ${ctx.capability.cpk < 1.33 ? 'Cpk is below the industrial benchmark of 1.33, indicating potential risk of producing non-conforming parts.' : 'Cpk meets the Six Sigma industrial benchmark of >= 1.33.'}`;
}

function generateHeuristicPattern(ctx: any): string {
  if (ctx.ruleViolations?.some((v: any) => v.rule === 'Rule 4')) {
    return 'Process Shift detected: Sustained consecutive sequence of points on one side of the Center Line.';
  }
  if (ctx.ruleViolations?.some((v: any) => v.rule === 'Rule 5')) {
    return 'Trend detected: Continuous sequence of increasing or decreasing points indicating systematic drift.';
  }
  if (ctx.ruleViolations?.some((v: any) => v.rule === 'Rule 1')) {
    return 'Extreme Outlier / Single-Point Excursion beyond ±3σ limit.';
  }
  return 'Random common-cause variation without significant shifts, cycles, or stratification.';
}

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI-SPC Analytics server listening on port ${PORT}`);
  });
}

startServer();
