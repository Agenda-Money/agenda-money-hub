// src/lib/exportUtils.ts
//
// Client-side export helpers shared by every Plan page's ExportMenu.
// XLSX uses SheetJS's own CDN-published build (see package.json — the
// npm-published `xlsx` package is stuck on a version with known
// prototype-pollution/ReDoS advisories that SheetJS never patched on
// npm; the fix upstream recommends is installing straight from their CDN).
import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

/** Builds a single-sheet workbook from row objects + column accessors and
 * triggers a browser download. No backend round-trip — everything's
 * already loaded client-side by the time a user clicks Export. */
export function exportRowsToXlsx<T>(filename: string, sheetName: string, columns: ExportColumn<T>[], rows: T[]) {
  const data = rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const col of columns) record[col.header] = col.accessor(row);
    return record;
  });
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // Excel sheet-name limit
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/** Same idea, but for a "line item x year/month" transposed table (BS,
 * Cashflow, Performance Summary, P&L) where columns are periods rather
 * than a flat row-per-record shape. */
export function exportTransposedToXlsx(
  filename: string,
  sheetName: string,
  periodLabels: string[],
  rows: Array<{ label: string; values: number[] }>,
) {
  const data = rows.map((r) => {
    const record: Record<string, string | number> = { "Line item": r.label };
    periodLabels.forEach((label, i) => { record[label] = r.values[i]; });
    return record;
  });
  const worksheet = XLSX.utils.json_to_sheet(data, { header: ["Line item", ...periodLabels] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/** PDF export is the browser's native print-to-PDF, scoped by the
 * .print-hide utility class (see index.css) on page chrome — no
 * client-side PDF rendering dependency needed for an internal admin tool. */
export function printCurrentPage() {
  window.print();
}
