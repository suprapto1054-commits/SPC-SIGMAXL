import { MsaStudyConfig, MsaMeasurementRow, AttributeMsaRow } from '../types/msa';

// 1. Automotive Piston Pin Outer Diameter (10 parts, 3 operators, 3 trials) - Nominal 20.000 mm, Tol ±0.050 mm
const generateAutomotiveGageRRData = (): MsaMeasurementRow[] => {
  const parts = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
  const operators = ['Op_Alpha', 'Op_Bravo', 'Op_Charlie'];
  const basePartDimensions = [
    20.012, 19.985, 20.024, 19.991, 20.038, 
    19.972, 20.019, 20.005, 19.964, 20.041
  ];

  const opBiases = [0.001, -0.002, 0.001]; // minor operator bias
  const data: MsaMeasurementRow[] = [];

  parts.forEach((part, pIdx) => {
    operators.forEach((op, opIdx) => {
      for (let trial = 1; trial <= 3; trial++) {
        // Gage repeatability error ~ 0.002
        const noise = (Math.sin(pIdx * 7 + opIdx * 13 + trial * 19) * 0.0024);
        const val = +(basePartDimensions[pIdx] + opBiases[opIdx] + noise).toFixed(4);
        data.push({
          id: `${part}_${op}_T${trial}`,
          part,
          operator: op,
          trial,
          value: val,
        });
      }
    });
  });

  return data;
};

// 2. Semiconductor Wafer Oxide Thickness (10 wafers, 3 operators, 2 trials) - Nominal 100.0 nm, Tol ±4.0 nm
const generateWaferThicknessData = (): MsaMeasurementRow[] => {
  const parts = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10'];
  const operators = ['Tech_A', 'Tech_B', 'Tech_C'];
  const baseThickness = [98.4, 101.2, 99.8, 102.5, 97.9, 100.4, 99.1, 103.1, 98.7, 100.8];
  const opBiases = [0.15, -0.2, 0.05];

  const data: MsaMeasurementRow[] = [];
  parts.forEach((part, pIdx) => {
    operators.forEach((op, opIdx) => {
      for (let trial = 1; trial <= 2; trial++) {
        const noise = Math.cos(pIdx * 5 + opIdx * 11 + trial * 17) * 0.22;
        const val = +(baseThickness[pIdx] + opBiases[opIdx] + noise).toFixed(2);
        data.push({
          id: `${part}_${op}_T${trial}`,
          part,
          operator: op,
          trial,
          value: val,
        });
      }
    });
  });
  return data;
};

// 3. Type 1 Gage Study Data (50 consecutive repeated measurements of 1 Master Calibration Standard)
const generateType1Values = (): number[] => {
  const masterRef = 50.000;
  const values: number[] = [];
  for (let i = 0; i < 50; i++) {
    const error = (Math.sin(i * 0.8) * 0.004) + (Math.cos(i * 1.5) * 0.003) + 0.0012; // slight positive bias
    values.push(+(masterRef + error).toFixed(4));
  }
  return values;
};

// 4. Attribute MSA (Go/No-Go inspection of 20 samples by 3 inspectors across 2 trials)
const generateAttributeData = (): AttributeMsaRow[] => {
  const samples = Array.from({ length: 20 }, (_, i) => `S-${(i + 1).toString().padStart(2, '0')}`);
  // Reference standard: 14 PASS, 6 FAIL
  const standards: ('PASS' | 'FAIL')[] = [
    'PASS', 'PASS', 'FAIL', 'PASS', 'PASS', 
    'FAIL', 'PASS', 'PASS', 'PASS', 'FAIL', 
    'PASS', 'PASS', 'FAIL', 'PASS', 'PASS', 
    'PASS', 'FAIL', 'PASS', 'PASS', 'FAIL'
  ];

  const appraisers = ['Inspector_1', 'Inspector_2', 'Inspector_3'];
  const data: AttributeMsaRow[] = [];

  samples.forEach((sample, sIdx) => {
    const trueVal = standards[sIdx];
    appraisers.forEach((appraiser, aIdx) => {
      for (let trial = 1; trial <= 2; trial++) {
        // High accuracy with slight human borderline error on sample 7 & 15
        let result = trueVal;
        if (sIdx === 6 && aIdx === 1 && trial === 2) {
          result = 'FAIL'; // false alarm
        } else if (sIdx === 12 && aIdx === 2 && trial === 1) {
          result = 'PASS'; // miss
        }

        data.push({
          sampleId: sample,
          referenceStandard: trueVal,
          appraiser,
          trial,
          result,
        });
      }
    });
  });

  return data;
};

export const MSA_SAMPLE_STUDIES: MsaStudyConfig[] = [
  {
    id: 'auto-pin-grr',
    name: 'Automotive Piston Pin OD Gage R&R',
    type: 'GAGE_RR',
    description: 'Micrometer precision measurement of 10 machined piston pin diameters across 3 shift technicians (3 trials).',
    unit: 'mm',
    tolerance: 0.100, // ±0.050 mm
    lsl: 19.950,
    usl: 20.050,
    target: 20.000,
    studyMultiplier: 6.0,
    data: generateAutomotiveGageRRData(),
  },
  {
    id: 'semiconductor-wafer-grr',
    name: 'Semiconductor Thin-Film Oxide Thickness',
    type: 'GAGE_RR',
    description: 'Ellipsometer thickness analysis on 10 silicon wafers across 3 cleanroom metrology engineers.',
    unit: 'nm',
    tolerance: 8.0, // ±4.0 nm
    lsl: 96.0,
    usl: 104.0,
    target: 100.0,
    studyMultiplier: 6.0,
    data: generateWaferThicknessData(),
  },
  {
    id: 'type1-calibration-micrometer',
    name: 'Digital Caliper Type 1 Gage Study',
    type: 'TYPE_1',
    description: '50 consecutive repeated measurements of 50.000mm Master Gauge Block to verify equipment repeatability and bias capability.',
    unit: 'mm',
    tolerance: 0.050,
    referenceValue: 50.000,
    studyMultiplier: 6.0,
    data: [],
    type1Values: generateType1Values(),
  },
  {
    id: 'attribute-visual-inspection',
    name: 'Go / No-Go Visual Defect Attribute MSA',
    type: 'ATTRIBUTE_MSA',
    description: '20 production PCB solder joint samples evaluated by 3 optical quality inspectors in duplicate trials.',
    unit: 'Decision',
    studyMultiplier: 6.0,
    data: [],
    attributeData: generateAttributeData(),
  },
];
