export interface AIChartInsight {
  source: 'gemini' | 'heuristic';
  executiveSummary: string;
  statisticalFinding: string;
  spcFinding: string;
  specialCauses: string;
  capability?: string;
  pattern: string;
  possibleCauses: string[];
  recommendedActions: string[];
  levels: {
    basic: string;
    professional: string;
    executive: string;
  };
}

export interface FiveWhyItem {
  level: number;
  why: string;
  answer: string;
}

export interface FishboneMatrix {
  man: string[];
  machine: string[];
  method: string[];
  material: string[];
  measurement: string[];
  environment: string[];
}

export interface AIRootCauseResult {
  problem: string;
  fiveWhy: FiveWhyItem[];
  fishbone: FishboneMatrix;
  verificationActions: string[];
  source?: 'gemini' | 'heuristic';
}

export interface AIAutoAnalysisReport {
  overallStatus: 'IN_CONTROL' | 'ATTENTION_REQUIRED' | 'OUT_OF_CONTROL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  keyFindings: string[];
  spcAssessment?: string;
  capabilityAssessment?: string;
  recommendedActions: string[];
}
