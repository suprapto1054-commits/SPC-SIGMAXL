import { Dataset, Column } from '../types/spc';

/**
 * Utility to generate realistic Gaussian (Normal) random numbers using Box-Muller transform
 */
export function randomGaussian(mean = 0, stdDev = 1): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Generates arbitrary random datasets tailored for testing recommendation engines
 */
export interface RandomDatasetPreset {
  id: string;
  name: string;
  category: 'continuous_individual' | 'continuous_subgroup' | 'attribute_defective' | 'attribute_defects' | 'bivariate_correlation' | 'pareto_defects' | 'messy_mixed';
  description: string;
  generate: () => Dataset;
}

export const RANDOM_DATASET_PRESETS: RandomDatasetPreset[] = [
  {
    id: 'rnd-sensor-stream',
    name: '📡 Random Continuous Sensor Stream (Pressure / Temp / Dimension)',
    category: 'continuous_individual',
    description: 'Individual continuous time-series with random process noise, drift, and intermittent 3-sigma outliers. Ideal for I-MR & Normality assessment.',
    generate: () => {
      const n = 40 + Math.floor(Math.random() * 20);
      const baseMean = 100 + Math.floor(Math.random() * 50);
      const baseStd = 2.5 + Math.random() * 2;
      const values: number[] = [];

      for (let i = 0; i < n; i++) {
        let val = randomGaussian(baseMean, baseStd);
        // Inject small random drift in middle
        if (i > n * 0.6) {
          val += baseStd * 1.5;
        }
        // Random outlier
        if (i === Math.floor(n * 0.35) || i === Math.floor(n * 0.8)) {
          val += (Math.random() > 0.5 ? 1 : -1) * baseStd * 3.4;
        }
        values.push(parseFloat(val.toFixed(2)));
      }

      const columns: Column[] = [
        {
          id: 'seq_id',
          name: 'Sample_Index',
          type: 'numeric',
          values: Array.from({ length: n }, (_, i) => i + 1),
        },
        {
          id: 'timestamp',
          name: 'Telemetry_Time',
          type: 'categorical',
          values: Array.from({ length: n }, (_, i) => {
            const min = (i * 15) % 60;
            const hr = Math.floor((i * 15) / 60) % 24;
            return `T+${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          }),
        },
        {
          id: 'sensor_reading',
          name: 'Cavity_Pressure_PSI',
          type: 'numeric',
          values,
        },
        {
          id: 'temp_reading',
          name: 'Die_Temperature_C',
          type: 'numeric',
          values: values.map((v) => parseFloat((v * 1.8 + randomGaussian(15, 1.2)).toFixed(2))),
        },
      ];

      return {
        id: `rnd-sensor-${Date.now()}`,
        name: `Random Continuous Sensor Telemetry (N=${n})`,
        description: 'Auto-generated continuous telemetry data stream with normal variance and isolated shock disturbances.',
        rowCount: n,
        createdAt: new Date().toISOString().split('T')[0],
        metadata: {
          equipment: 'CNC Injection Unit #4',
          line: 'Assembly Line Alpha',
          process: 'High-Precision Pressure Chamber',
          shift: 'Dynamic Stream',
          operator: 'Autonomous Telemetry Probe',
        },
        columns,
      };
    },
  },

  {
    id: 'rnd-subgroup-batch',
    name: '⚙️ Random Subgrouped Batches (Machining Subgroups n=5)',
    category: 'continuous_subgroup',
    description: 'Rational subgroups of sample size n=5 across 20 production lots. Perfect match for Xbar-R & Xbar-S control charts.',
    generate: () => {
      const lotCount = 20;
      const subgroupSize = 5;
      const totalN = lotCount * subgroupSize;
      const nominal = 25.0;
      const lotMeans: number[] = [];
      for (let l = 0; l < lotCount; l++) {
        lotMeans.push(randomGaussian(nominal, 0.08));
      }

      const sampleIndices: number[] = [];
      const lotIds: string[] = [];
      const measurements: number[] = [];

      let idx = 1;
      for (let l = 0; l < lotCount; l++) {
        for (let s = 1; s <= subgroupSize; s++) {
          sampleIndices.push(idx++);
          lotIds.push(`Batch_${(l + 1).toString().padStart(2, '0')}`);
          const val = randomGaussian(lotMeans[l], 0.04);
          measurements.push(parseFloat(val.toFixed(4)));
        }
      }

      const columns: Column[] = [
        {
          id: 'sample_no',
          name: 'Sample_No',
          type: 'numeric',
          values: sampleIndices,
        },
        {
          id: 'subgroup_batch',
          name: 'Batch_Lot_ID',
          type: 'categorical',
          values: lotIds,
        },
        {
          id: 'dimension_mm',
          name: 'Shaft_Outer_Diameter_mm',
          type: 'numeric',
          values: measurements,
        },
      ];

      return {
        id: `rnd-subgroups-${Date.now()}`,
        name: `Random Subgrouped Machining Dimensions (k=${lotCount}, n=${subgroupSize})`,
        description: 'Auto-generated rational subgroup dataset with 20 lots and 5 parts per lot for Xbar-R / Xbar-S evaluation.',
        rowCount: totalN,
        createdAt: new Date().toISOString().split('T')[0],
        metadata: {
          equipment: 'CNC Lathe Cell #7',
          line: 'Precision Shaft Line',
          process: 'OD Precision Turning',
          product: 'Drive Pinion 25mm',
        },
        columns,
      };
    },
  },

  {
    id: 'rnd-attribute-defective',
    name: '📊 Random Binomial Defectives (Pass/Fail Inspection Lots)',
    category: 'attribute_defective',
    description: 'Inspection lots with inspected counts and non-conforming unit counts. Ideal for p-Chart and np-Chart.',
    generate: () => {
      const lotCount = 25;
      const lotNames: string[] = [];
      const inspectedCounts: number[] = [];
      const defectiveCounts: number[] = [];
      const defectRates: number[] = [];

      for (let i = 1; i <= lotCount; i++) {
        lotNames.push(`Lot-${i.toString().padStart(2, '0')}`);
        // Subgroup sizes between 80 and 150
        const n = 100 + Math.floor(Math.random() * 40 - 20);
        // Base defect rate ~ 3.5%
        let p = 0.035 + randomGaussian(0, 0.008);
        if (i === 14) p += 0.07; // Sudden out of control spike
        p = Math.max(0.005, Math.min(0.20, p));
        const d = Math.round(n * p);
        inspectedCounts.push(n);
        defectiveCounts.push(d);
        defectRates.push(parseFloat((d / n).toFixed(4)));
      }

      const columns: Column[] = [
        {
          id: 'lot_id',
          name: 'Inspection_Lot',
          type: 'categorical',
          values: lotNames,
        },
        {
          id: 'units_inspected',
          name: 'Total_Units_Inspected_n',
          type: 'numeric',
          values: inspectedCounts,
        },
        {
          id: 'defective_units',
          name: 'Defective_Units_Count_np',
          type: 'numeric',
          values: defectiveCounts,
        },
        {
          id: 'defect_fraction',
          name: 'Defect_Fraction_p',
          type: 'numeric',
          values: defectRates,
        },
      ];

      return {
        id: `rnd-pchart-${Date.now()}`,
        name: `Random Quality Inspection Defectives (k=${lotCount} Lots)`,
        description: 'Auto-generated attribute inspection lots with variable sample sizes and non-conforming counts for p/np-Chart.',
        rowCount: lotCount,
        createdAt: new Date().toISOString().split('T')[0],
        columns,
      };
    },
  },

  {
    id: 'rnd-pareto-categories',
    name: '📉 Random Non-Conformity Categorization (Pareto 80/20)',
    category: 'pareto_defects',
    description: 'Categorical defect logs across multiple root cause categories following the Pareto principle. Ideal for Pareto 80/20 analysis.',
    generate: () => {
      const categories = [
        { name: 'Surface Scratch & Scuff', weight: 42 },
        { name: 'Dimensional Out-of-Spec', weight: 26 },
        { name: 'Burr & Sharp Edge', weight: 14 },
        { name: 'Porosity / Voids', weight: 8 },
        { name: 'Color / Coating Discoloration', weight: 5 },
        { name: 'Solder Bridging', weight: 3 },
        { name: 'Foreign Particle Ingot', weight: 2 },
      ];

      const rows: { lot: string; defectCategory: string; severity: string; count: number }[] = [];
      let rowIdx = 1;

      categories.forEach((cat) => {
        const occurrences = Math.round(cat.weight * (0.8 + Math.random() * 0.4));
        rows.push({
          lot: `Shift_${(rowIdx % 3) + 1}`,
          defectCategory: cat.name,
          severity: cat.weight > 20 ? 'Critical' : 'Minor',
          count: occurrences,
        });
        rowIdx++;
      });

      const columns: Column[] = [
        {
          id: 'defect_category',
          name: 'Defect_Mode_Category',
          type: 'categorical',
          values: rows.map((r) => r.defectCategory),
        },
        {
          id: 'defect_count',
          name: 'Defect_Count',
          type: 'numeric',
          values: rows.map((r) => r.count),
        },
        {
          id: 'severity',
          name: 'Defect_Severity',
          type: 'categorical',
          values: rows.map((r) => r.severity),
        },
      ];

      return {
        id: `rnd-pareto-${Date.now()}`,
        name: `Random Failure Mode Pareto Dataset`,
        description: 'Auto-generated non-conformity classification following the 80/20 power law distribution.',
        rowCount: rows.length,
        createdAt: new Date().toISOString().split('T')[0],
        columns,
      };
    },
  },

  {
    id: 'rnd-bivariate-correlation',
    name: '📈 Random Bivariate Process Variables (Temp vs Yield / OLS Regression)',
    category: 'bivariate_correlation',
    description: 'Two continuous correlated manufacturing parameters showing high linear correlation (R² > 0.85). Ideal for OLS Regression and Scatter Analysis.',
    generate: () => {
      const n = 35;
      const xVals: number[] = [];
      const yVals: number[] = [];
      const noiseStd = 1.8;

      for (let i = 0; i < n; i++) {
        const x = 160 + (i * 2.5) + randomGaussian(0, 1.5);
        // y = 0.65 * x - 25 + noise
        const y = 0.65 * x - 25 + randomGaussian(0, noiseStd);
        xVals.push(parseFloat(x.toFixed(2)));
        yVals.push(parseFloat(y.toFixed(2)));
      }

      const columns: Column[] = [
        {
          id: 'run_id',
          name: 'Experimental_Run',
          type: 'numeric',
          values: Array.from({ length: n }, (_, i) => i + 1),
        },
        {
          id: 'process_temp',
          name: 'Furnace_Reaction_Temp_C',
          type: 'numeric',
          values: xVals,
        },
        {
          id: 'process_yield',
          name: 'Catalytic_Yield_Efficiency_Pct',
          type: 'numeric',
          values: yVals,
        },
      ];

      return {
        id: `rnd-regression-${Date.now()}`,
        name: `Random Bivariate Regression Telemetry (Temperature vs Yield)`,
        description: 'Auto-generated continuous bivariate dataset with high Pearson correlation coefficient (r ≈ 0.94).',
        rowCount: n,
        createdAt: new Date().toISOString().split('T')[0],
        columns,
      };
    },
  },

  {
    id: 'rnd-messy-raw-table',
    name: '🎲 Random Messy / Arbitrary Multi-Format Data Matrix',
    category: 'messy_mixed',
    description: 'Raw arbitrary format with timestamps, mixed numeric scales, discrete counts, and categorical tags. The Advisor will parse and rank the best charts.',
    generate: () => {
      const n = 30;
      const timestamps: string[] = [];
      const pressure: number[] = [];
      const rpm: number[] = [];
      const rejectCount: number[] = [];
      const operatorShifts: string[] = [];

      for (let i = 0; i < n; i++) {
        timestamps.push(`2026-08-${(10 + Math.floor(i / 3)).toString().padStart(2, '0')} ${(8 + (i % 8)).toString().padStart(2, '0')}:00`);
        pressure.push(parseFloat((45.2 + randomGaussian(0, 1.1)).toFixed(2)));
        rpm.push(Math.round(1800 + randomGaussian(0, 45)));
        rejectCount.push(Math.max(0, Math.round(randomGaussian(2.2, 1.4))));
        operatorShifts.push(`Shift_${['A', 'B', 'C'][i % 3]}`);
      }

      const columns: Column[] = [
        { id: 'ts', name: 'Timestamp', type: 'categorical', values: timestamps },
        { id: 'pres', name: 'Hydraulic_Pressure_Bar', type: 'numeric', values: pressure },
        { id: 'spindle', name: 'Motor_Spindle_RPM', type: 'numeric', values: rpm },
        { id: 'defects', name: 'Rejects_Per_Batch', type: 'numeric', values: rejectCount },
        { id: 'shift', name: 'Shift_Crew', type: 'categorical', values: operatorShifts },
      ];

      return {
        id: `rnd-messy-${Date.now()}`,
        name: `Random Multi-Parameter Industrial Telemetry Matrix`,
        description: 'Auto-generated multi-format industrial matrix testing multi-chart profiling and automated diagnostics.',
        rowCount: n,
        createdAt: new Date().toISOString().split('T')[0],
        columns,
      };
    },
  },
];

/**
 * Parses any arbitrary raw pasted text (comma, tab, semicolon, space separated, or JSON)
 * into a structured Dataset with automatic column typing.
 */
export function parseArbitraryRawData(rawText: string, datasetName = 'Arbitrary Raw Dataset'): { dataset: Dataset | null; error?: string } {
  if (!rawText || !rawText.trim()) {
    return { dataset: null, error: 'Input text is empty.' };
  }

  const text = rawText.trim();

  // Try JSON first
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (rows.length > 0 && typeof rows[0] === 'object') {
        const keys = Object.keys(rows[0]);
        const columns: Column[] = keys.map((key) => {
          const vals = rows.map((r) => r[key]);
          const numCount = vals.filter((v) => typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null)).length;
          const isNumeric = numCount / vals.length > 0.6;
          return {
            id: key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            name: key,
            type: isNumeric ? 'numeric' : 'categorical',
            values: isNumeric ? vals.map((v) => (v === null || v === '' ? null : Number(v))) : vals.map((v) => String(v ?? '')),
          };
        });
        return {
          dataset: {
            id: `arbitrary-json-${Date.now()}`,
            name: datasetName,
            description: `Parsed from raw JSON format with ${rows.length} rows.`,
            rowCount: rows.length,
            createdAt: new Date().toISOString().split('T')[0],
            columns,
          },
        };
      }
    } catch {
      // Continue to tabular parsing
    }
  }

  // Parse lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { dataset: null, error: 'No valid lines detected in raw input.' };
  }

  // Check delimiter (comma, tab, semicolon, pipe, or multiple spaces)
  const firstLine = lines[0];
  let delimiter: string | RegExp = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';
  else if (firstLine.includes(',')) delimiter = ',';
  else delimiter = /\s+/;

  // Check if line 0 is headers
  const splitLine = (l: string) => {
    if (delimiter instanceof RegExp) {
      return l.split(delimiter);
    }
    return l.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
  };

  const line0Parts = splitLine(lines[0]);
  const hasOnlyNumbers0 = line0Parts.every((p) => !isNaN(Number(p)) && p !== '');

  let headers: string[] = [];
  let dataLines: string[] = [];

  if (!hasOnlyNumbers0 && lines.length > 1) {
    headers = line0Parts.map((h, i) => h || `Column_${i + 1}`);
    dataLines = lines.slice(1);
  } else {
    headers = line0Parts.map((_, i) => `Measurement_Col_${i + 1}`);
    dataLines = lines;
  }

  const rowCount = dataLines.length;
  if (rowCount === 0) {
    return { dataset: null, error: 'Dataset must have at least 1 data row.' };
  }

  const columnValues: (number | string | null)[][] = headers.map(() => []);

  for (const line of dataLines) {
    const parts = splitLine(line);
    for (let c = 0; c < headers.length; c++) {
      const rawVal = parts[c] !== undefined ? parts[c] : '';
      if (rawVal === '' || rawVal === 'null' || rawVal === 'NA' || rawVal === '-') {
        columnValues[c].push(null);
      } else {
        const num = Number(rawVal);
        if (!isNaN(num)) {
          columnValues[c].push(num);
        } else {
          columnValues[c].push(rawVal);
        }
      }
    }
  }

  const columns: Column[] = headers.map((header, idx) => {
    const vals = columnValues[idx];
    const numericCount = vals.filter((v) => typeof v === 'number').length;
    const isNumeric = numericCount / vals.length >= 0.5;

    return {
      id: `col_${idx + 1}_${header.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
      name: header,
      type: isNumeric ? 'numeric' : 'categorical',
      values: vals.map((v) => (isNumeric && typeof v === 'string' ? (isNaN(Number(v)) ? null : Number(v)) : v)),
    };
  });

  return {
    dataset: {
      id: `arbitrary-raw-${Date.now()}`,
      name: datasetName,
      description: `Parsed from arbitrary raw text format (${rowCount} rows, ${columns.length} columns).`,
      rowCount,
      createdAt: new Date().toISOString().split('T')[0],
      columns,
    },
  };
}
