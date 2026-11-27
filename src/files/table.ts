// A table from a file a person picks: a CSV or an Excel workbook, as rows of text cells.

import { parseCsv, tableKind } from './csv';
import { readXlsx, type XlsxSheet } from './xlsx';

/**
 * A file's rows as text cells, the header first, from a CSV or an Excel workbook (its first visible sheet, named in
 * `sheet` when the workbook has several). Throws `XlsxError` for a workbook it can't read, and an Error for a file
 * that is neither.
 */
export async function readTable(file: File): Promise<{ rows: string[][]; sheet?: Pick<XlsxSheet, 'sheet' | 'sheets'> }> {
  const kind = tableKind(file);
  if (kind === 'xlsx') {
    const book = await readXlsx(await file.arrayBuffer());
    return { rows: book.rows, sheet: { sheet: book.sheet, sheets: book.sheets } };
  }
  if (kind === 'csv') return { rows: parseCsv(await file.text()) };
  throw new Error(kind === 'old' ? 'old' : 'type');
}
