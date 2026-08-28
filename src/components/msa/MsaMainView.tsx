import React, { useState, useMemo } from 'react';
import { MSA_SAMPLE_STUDIES } from '../../data/msaSampleDatasets';
import { MsaStudyConfig, MsaMeasurementRow, AttributeMsaRow } from '../../types/msa';
import { calculateGageRR, calculateType1GageStudy, calculateAttributeMsa } from '../../engine/msaEngine';
import { GageRRView } from './GageRRView';
import { Type1GageStudyView } from './Type1GageStudyView';
import { AttributeMsaView } from './AttributeMsaView';
import { MsaDataEditor } from './MsaDataEditor';
import {
  Ruler,
  Sliders,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';

export const MsaMainView: React.FC = () => {
  const [studies, setStudies] = useState<MsaStudyConfig[]>(MSA_SAMPLE_STUDIES);
  const [activeStudyId, setActiveStudyId] = useState<string>(MSA_SAMPLE_STUDIES[0].id);
  const [activeSubTab, setActiveSubTab] = useState<'grr' | 'type1' | 'attribute' | 'raw-data'>('grr');

  // Statistical calibration state for Gage R&R
  const [grrMethod, setGrrMethod] = useState<'ANOVA' | 'XBAR_R'>('ANOVA');
  const [grrMultiplier, setGrrMultiplier] = useState<number>(6.0);
  const [grrAlphaToPool, setGrrAlphaToPool] = useState<number>(0.05);
  const [grrProcessSd, setGrrProcessSd] = useState<number | undefined>(undefined);

  const currentStudy = useMemo(() => {
    return studies.find((s) => s.id === activeStudyId) || studies[0];
  }, [studies, activeStudyId]);

  // Synchronize active subtab with study type
  const handleSelectStudy = (study: MsaStudyConfig) => {
    setActiveStudyId(study.id);
    if (study.type === 'TYPE_1') {
      setActiveSubTab('type1');
    } else if (study.type === 'ATTRIBUTE_MSA') {
      setActiveSubTab('attribute');
    } else {
      setActiveSubTab('grr');
    }
  };

  // Gage R&R Calculation
  const gageRRResult = useMemo(() => {
    return calculateGageRR(
      currentStudy.data,
      currentStudy.tolerance,
      {
        method: grrMethod,
        studyMultiplier: grrMultiplier,
        alphaToPool: grrAlphaToPool,
        processStdDev: grrProcessSd,
      }
    );
  }, [
    currentStudy.data,
    currentStudy.tolerance,
    grrMethod,
    grrMultiplier,
    grrAlphaToPool,
    grrProcessSd,
  ]);

  // Type 1 Gage Calculation
  const type1Result = useMemo(() => {
    const vals = currentStudy.type1Values || [];
    const ref = currentStudy.referenceValue || 50.0;
    const tol = currentStudy.tolerance || 0.050;
    return calculateType1GageStudy(vals, ref, tol, grrMultiplier);
  }, [currentStudy.type1Values, currentStudy.referenceValue, currentStudy.tolerance, grrMultiplier]);

  // Attribute MSA Calculation
  const attributeResult = useMemo(() => {
    const attrData = currentStudy.attributeData || [];
    return calculateAttributeMsa(attrData);
  }, [currentStudy.attributeData]);

  // Update handlers
  const handleUpdateTolerance = (newTol: number) => {
    setStudies((prev) =>
      prev.map((s) => (s.id === currentStudy.id ? { ...s, tolerance: newTol } : s))
    );
  };

  const handleUpdateOptions = (opts: {
    method?: 'ANOVA' | 'XBAR_R';
    studyMultiplier?: number;
    alphaToPool?: number;
    processStdDev?: number;
  }) => {
    if (opts.method !== undefined) setGrrMethod(opts.method);
    if (opts.studyMultiplier !== undefined) setGrrMultiplier(opts.studyMultiplier);
    if (opts.alphaToPool !== undefined) setGrrAlphaToPool(opts.alphaToPool);
    if ('processStdDev' in opts) setGrrProcessSd(opts.processStdDev);
  };

  const handleUpdateType1Params = (ref: number, tol: number) => {
    setStudies((prev) =>
      prev.map((s) =>
        s.id === currentStudy.id ? { ...s, referenceValue: ref, tolerance: tol } : s
      )
    );
  };

  const handleUpdateRawData = (newData: MsaMeasurementRow[]) => {
    setStudies((prev) =>
      prev.map((s) => (s.id === currentStudy.id ? { ...s, data: newData } : s))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar with Study Preset Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                MEASUREMENT SYSTEM ANALYSIS (MSA)
              </h2>
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                AIAG MSA 4.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Evaluate Metrology Gage Variation, Precision-to-Tolerance (P/T), ndc, & Appraiser Agreement
            </p>
          </div>
        </div>

        {/* Study Preset Picker */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="font-bold text-slate-500 text-[10px] uppercase">MSA STUDY PRESET:</span>
          <div className="relative">
            <select
              value={activeStudyId}
              onChange={(e) => {
                const found = studies.find((s) => s.id === e.target.value);
                if (found) handleSelectStudy(found);
              }}
              className="appearance-none rounded border border-slate-300 bg-white py-1 pl-3 pr-8 font-bold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type === 'GAGE_RR' ? 'Gage R&R' : s.type === 'TYPE_1' ? 'Type 1 Study' : 'Attribute MSA'})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 font-mono text-xs space-x-2">
        <button
          onClick={() => setActiveSubTab('grr')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-all ${
            activeSubTab === 'grr'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Gage R&R (ANOVA & 6-in-1)
        </button>

        <button
          onClick={() => setActiveSubTab('type1')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-all ${
            activeSubTab === 'type1'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Type 1 Gage Study (Cg / Cgk)
        </button>

        <button
          onClick={() => setActiveSubTab('attribute')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-all ${
            activeSubTab === 'attribute'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          Attribute MSA (Go / No-Go Kappa)
        </button>

        <button
          onClick={() => setActiveSubTab('raw-data')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-all ${
            activeSubTab === 'raw-data'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Raw Measurement Matrix
        </button>
      </div>

      {/* Subtab Contents */}
      {activeSubTab === 'grr' && (
        <GageRRView
          result={gageRRResult}
          unit={currentStudy.unit}
          onUpdateTolerance={handleUpdateTolerance}
          onUpdateOptions={handleUpdateOptions}
          currentMethod={grrMethod}
          currentStudyMultiplier={grrMultiplier}
          currentAlphaToPool={grrAlphaToPool}
          currentProcessStdDev={grrProcessSd}
        />
      )}

      {activeSubTab === 'type1' && (
        <Type1GageStudyView
          values={currentStudy.type1Values || [50.001, 50.003, 49.998, 50.002, 50.001]}
          referenceValue={currentStudy.referenceValue || 50.0}
          tolerance={currentStudy.tolerance || 0.05}
          result={type1Result}
          unit={currentStudy.unit}
          onUpdateParams={handleUpdateType1Params}
        />
      )}

      {activeSubTab === 'attribute' && (
        <AttributeMsaView
          result={attributeResult}
          data={currentStudy.attributeData || []}
        />
      )}

      {activeSubTab === 'raw-data' && (
        <MsaDataEditor
          data={currentStudy.data}
          unit={currentStudy.unit}
          onUpdateData={handleUpdateRawData}
        />
      )}
    </div>
  );
};
