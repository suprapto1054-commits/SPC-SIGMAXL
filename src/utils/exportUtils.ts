import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset } from '../types/spc';

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
