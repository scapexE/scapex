import * as XLSX from "xlsx";
import { exportTableToPDF } from "./pdfExport";

export type ExportColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9-_\u0600-\u06FF]+/g, "_");
}

function rowsAsMatrix<T>(data: T[], columns: ExportColumn<T>[]): string[][] {
  return data.map((row) =>
    columns.map((c) => {
      const v = c.accessor(row);
      if (v === null || v === undefined) return "";
      return String(v);
    }),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

export function exportToCSV<T>(filename: string, columns: ExportColumn<T>[], data: T[]) {
  const headers = columns.map((c) => c.header);
  const matrix = rowsAsMatrix(data, columns);
  const escape = (s: string) => {
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(","), ...matrix.map((r) => r.map(escape).join(","))];
  // BOM so Excel recognises UTF-8 (Arabic safe)
  const csv = "\uFEFF" + lines.join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${safeFilename(filename)}-${timestamp()}.csv`);
}

export function exportToXLSX<T>(filename: string, columns: ExportColumn<T>[], data: T[], sheetName = "Data") {
  const headers = columns.map((c) => c.header);
  const matrix = rowsAsMatrix(data, columns);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...matrix]);
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...matrix.map((r) => (r[i] || "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
  (ws as any)["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${safeFilename(filename)}-${timestamp()}.xlsx`);
}

export function exportToPDF<T>(title: string, columns: ExportColumn<T>[], data: T[], isRtl: boolean) {
  const headers = columns.map((c) => c.header);
  const matrix = rowsAsMatrix(data, columns);
  exportTableToPDF(title, headers, matrix, isRtl);
}

export function printTable<T>(title: string, columns: ExportColumn<T>[], data: T[], isRtl: boolean) {
  // Same renderer; the PDF window has a built-in print button and auto-triggers print
  const headers = columns.map((c) => c.header);
  const matrix = rowsAsMatrix(data, columns);
  exportTableToPDF(title, headers, matrix, isRtl);
  setTimeout(() => {
    try { (window as any).focus(); } catch {}
  }, 50);
}
