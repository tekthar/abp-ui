// CSV in the browser: read what a person uploads, and write it back with its columns renamed or left out, for an
// import on the server. RFC 4180: fields quoted when they hold the separator, a quote or a line break; a byte order
// mark at the start is dropped; the separator (comma, semicolon or tab) is the one the header row uses most. Tested in
// tests/files-csv.test.mjs.

/** A file's rows as cells, the header first. Empty lines are skipped. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const sep = guessSeparator(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"' && cell === '') {
      quoted = true;
    } else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** The separator the first line uses most: comma, semicolon or tab (outside quotes). */
export function guessSeparator(text: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const c of text) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted && c in counts) counts[c]++;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

/** Rows as CSV with commas, CRLF line ends, fields quoted when they must be. */
export function writeCsv(rows: string[][]): string {
  const field = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(field).join(',')).join('\r\n') + '\r\n';
}

/**
 * The rows with their columns renamed and some left out: `targets[i]` is column i's new header, or null to leave it
 * out. Columns past the header's length are dropped; short rows are padded.
 */
export function remapCsv(rows: string[][], targets: (string | null)[]): string[][] {
  const keep = targets.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  return rows.map((r, n) => keep.map((i) => (n === 0 ? (targets[i] as string) : (r[i] ?? ''))));
}

/** The media type of an Excel workbook (.xlsx). */
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** What kind of table a file is, by its name and type: a CSV, an Excel workbook, an older Excel file, or neither. */
export function tableKind(file: { name: string; type?: string }): 'csv' | 'xlsx' | 'old' | null {
  if (/\.(xls|xlsb)$/i.test(file.name)) return 'old';
  if (/\.(xlsx|xlsm)$/i.test(file.name) || file.type === XLSX_TYPE) return 'xlsx';
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') return 'csv';
  return null;
}
