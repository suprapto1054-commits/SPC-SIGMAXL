import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset } from '../types/spc';

export function exportToCSV(data: any[], filename = 'export_telemetry') {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDatasetToCSV(dataset: Dataset, filename?: string) {
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < dataset.rowCount; i++) {
    const rowObj: Record<string, any> = {};
    dataset.columns.forEach((col) => {
      rowObj[col.name] = col.values[i] ?? '';
    });
    rows.push(rowObj);
  }

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || dataset.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDatasetToExcel(dataset: Dataset, filename?: string) {
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < dataset.rowCount; i++) {
    const rowObj: Record<string, any> = {};
    dataset.columns.forEach((col) => {
      rowObj[col.name] = col.values[i] ?? '';
    });
    rows.push(rowObj);
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename || dataset.name.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Exports a blank data entry template for any dataset, including column headers,
 * data dictionary, and sample structure.
 */
export function exportBlankTemplate(dataset: Dataset, format: 'csv' | 'xlsx' = 'xlsx', filename?: string) {
  const baseName = filename || `Template_${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35)}`;

  // Create 3 sample blank/placeholder rows based on column types and first values
  const sampleRows: Record<string, any>[] = [];
  for (let r = 0; r < 5; r++) {
    const rowObj: Record<string, any> = {};
    dataset.columns.forEach((col) => {
      if (col.type === 'categorical') {
        const sampleVal = col.values[r];
        rowObj[col.name] = sampleVal !== undefined ? String(sampleVal) : `Sample-${r + 1}`;
      } else {
        const sampleVal = col.values[r];
        rowObj[col.name] = typeof sampleVal === 'number' ? sampleVal : 0.0;
      }
    });
    sampleRows.push(rowObj);
  }

  if (format === 'csv') {
    const csv = Papa.unparse(sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${baseName}_Blank_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Excel with two sheets: 1. Template (for user data input) 2. Data Dictionary / Spec
    const wsData = XLSX.utils.json_to_sheet(sampleRows);

    // Data dictionary sheet explaining each column
    const dictRows = dataset.columns.map((c, idx) => ({
      'Column #': idx + 1,
      'Column Header Name': c.name,
      'Data Type': c.type === 'numeric' ? 'Numeric (Float/Int)' : 'Text / Timestamp',
      'Required': 'Yes',
      'Sample Value': c.values[0] ?? '',
      'Description / Purpose': `Target process measurement for ${dataset.name}`,
    }));
    const wsDict = XLSX.utils.json_to_sheet(dictRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsData, 'Data_Entry_Template');
    XLSX.utils.book_append_sheet(workbook, wsDict, 'Data_Dictionary');

    XLSX.writeFile(workbook, `${baseName}_Blank_Template.xlsx`);
  }
}

export function exportAnalysisReportJSON(reportData: any, filename = 'AI_SPC_Analysis_Report') {
  const jsonStr = JSON.stringify(reportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printExecutiveReport() {
  window.print();
}
