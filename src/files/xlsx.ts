// Excel in the browser: the first visible sheet of an .xlsx file as rows of text, the header first, as parseCsv gives
// a CSV's. No library: an .xlsx is a zip of XML parts, unzipped with the browser's DecompressionStream and read for the
// few parts a sheet's values need (the workbook, its relationships, shared strings and cell styles, for dates). Tested
// in tests/files-xlsx.test.mjs.

/** Why a file can't be read: an older .xls or one with a password, not a zip, too big unpacked, or no sheet. */
export type XlsxProblem = 'old' | 'broken' | 'tooBig' | 'noSheet';

export class XlsxError extends Error {
  readonly problem: XlsxProblem;

  constructor(problem: XlsxProblem) {
    super(`xlsx: ${problem}`);
    this.problem = problem;
  }
}

export interface XlsxSheet {
  /** The sheet read: the workbook's first visible one. */
  sheet: string;
  /** How many visible sheets the workbook has. */
  sheets: number;
  rows: string[][];
}

/** At most this much XML is unpacked from one file (a 5 MB upload rarely needs a tenth of it). */
const MAX_UNPACKED = 64_000_000;

/** The first visible sheet's rows as text: numbers as Excel shows them to 15 digits, dates as yyyy-MM-dd. */
export async function readXlsx(data: ArrayBuffer | Uint8Array): Promise<XlsxSheet> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // An OLE file: an Excel 97-2003 workbook, or an .xlsx saved with a password (encrypted inside one).
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) throw new XlsxError('old');
  const zip = entries(bytes);
  let unpacked = 0;
  const read = async (path: string): Promise<string | null> => {
    const entry = zip.get(path.replace(/^\/+/, ''));
    if (!entry) return null;
    const out = await inflate(bytes, entry, MAX_UNPACKED - unpacked);
    unpacked += out.length;
    return new TextDecoder().decode(out);
  };

  const workbook = await read('xl/workbook.xml');
  if (workbook == null) throw new XlsxError('broken');
  const rels = parseRels((await read('xl/_rels/workbook.xml.rels')) ?? '');
  const visible = tags(workbook, 'sheet').map(attrs).filter((a) => a.state !== 'hidden' && a.state !== 'veryHidden');
  const first = visible[0];
  const target = first && rels.get(first['r:id'] ?? first.id ?? '');
  if (!target) throw new XlsxError('noSheet');
  const sheetXml = await read(target.startsWith('/') ? target : `xl/${target}`);
  if (sheetXml == null) throw new XlsxError('noSheet');

  const date1904 = /<(?:\w+:)?workbookPr\b[^>]*\bdate1904="(?:1|true)"/.test(workbook);
  const strings = sharedStrings((await read('xl/sharedStrings.xml')) ?? '');
  const dates = dateStyles((await read('xl/styles.xml')) ?? '');
  return { sheet: decode(first.name ?? ''), sheets: visible.length, rows: sheetRows(sheetXml, strings, dates, date1904) };
}

// ---- zip ------------------------------------------------------------------------------------------------------------

interface Entry {
  method: number;
  flags: number;
  size: number;
  unpacked: number;
  offset: number;
}

/** A zip's files by name, from its central directory. */
function entries(b: Uint8Array): Map<string, Entry> {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 22 || view.getUint32(0, true) !== 0x04034b50) throw new XlsxError('broken');
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new XlsxError('broken');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const names = new TextDecoder();
  const files = new Map<string, Entry>();
  for (let n = 0; n < count; n++) {
    if (at + 46 > b.length || view.getUint32(at, true) !== 0x02014b50) throw new XlsxError('broken');
    const nameLength = view.getUint16(at + 28, true);
    const name = names.decode(b.subarray(at + 46, at + 46 + nameLength));
    files.set(name, {
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      size: view.getUint32(at + 20, true),
      unpacked: view.getUint32(at + 24, true),
      offset: view.getUint32(at + 42, true),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return files;
}

/** One file's bytes, unpacked (stored or deflated), stopping past `room` bytes. */
async function inflate(b: Uint8Array, e: Entry, room: number): Promise<Uint8Array> {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (e.flags & 1) throw new XlsxError('old');
  if (e.unpacked > room) throw new XlsxError('tooBig');
  if (e.offset + 30 > b.length || view.getUint32(e.offset, true) !== 0x04034b50) throw new XlsxError('broken');
  const start = e.offset + 30 + view.getUint16(e.offset + 26, true) + view.getUint16(e.offset + 28, true);
  const packed = b.subarray(start, start + e.size);
  if (e.method === 0) return packed;
  if (e.method !== 8) throw new XlsxError('broken');
  const reader = new Blob([packed as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > room) {
        await reader.cancel();
        throw new XlsxError('tooBig');
      }
      parts.push(value);
    }
  } catch (err) {
    throw err instanceof XlsxError ? err : new XlsxError('broken');
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ---- XML ------------------------------------------------------------------------------------------------------------

/** Each element named `name` (any namespace prefix), as its opening tag's attributes text and its inner XML. */
function elements(xml: string, name: string): { attrs: string; inner: string }[] {
  const re = new RegExp(`<(?:[\\w.-]+:)?${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>)`, 'g');
  return [...xml.matchAll(re)].map((m) => ({ attrs: m[1], inner: m[2] ?? '' }));
}

const tags = (xml: string, name: string) => elements(xml, name).map((e) => e.attrs);

function attrs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = m[2] ?? m[3];
  return out;
}

/** Text with XML's entities and OOXML's `_xHHHH_` escapes turned back into characters. */
export function decode(text: string): string {
  return text
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|amp|quot|apos));/gi, (_, hex, dec, named) =>
      hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec))
        : ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[named.toLowerCase()])
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** A string item's text: its `t` runs joined, phonetic runs left out. */
function runText(inner: string): string {
  const plain = inner.replace(/<(?:[\w.-]+:)?rPh\b[\s\S]*?<\/(?:[\w.-]+:)?rPh>/g, '');
  return elements(plain, 't').map((t) => decode(t.inner)).join('');
}

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of tags(xml, 'Relationship').map(attrs)) if (a.Id && a.Target) map.set(a.Id, a.Target);
  return map;
}

function sharedStrings(xml: string): string[] {
  return elements(xml, 'si').map((si) => runText(si.inner));
}

/** Excel's own number formats that show a date or a time. */
const BUILT_IN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** Whether a number format's code shows a date or time: d, m, y, h or s outside quotes, escapes and [colour] blocks. */
export function isDateFormat(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[(?!h\]|m\]|s\])[^\]]*\]/gi, '').split(';')[0];
  return /[dmyhs]/i.test(bare) && !/^[#0.,%\s]*$/.test(bare);
}

/** Which of the workbook's cell styles (by index) show a date or time. */
function dateStyles(xml: string): Set<number> {
  const custom = new Map<number, string>();
  for (const a of tags(xml, 'numFmt').map(attrs)) custom.set(Number(a.numFmtId), decode(a.formatCode ?? ''));
  const xfs = elements(xml, 'cellXfs')[0]?.inner ?? '';
  const out = new Set<number>();
  tags(xfs, 'xf').map(attrs).forEach((a, i) => {
    const id = Number(a.numFmtId ?? 0);
    if (BUILT_IN_DATES.has(id) || (custom.has(id) && isDateFormat(custom.get(id)!))) out.add(i);
  });
  return out;
}

/** A column's number from a cell reference: A1 → 0, AB7 → 27. */
export function columnOf(ref: string): number {
  let n = 0;
  for (const c of ref.toUpperCase()) {
    if (c < 'A' || c > 'Z') break;
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n - 1;
}

/** An Excel date serial as yyyy-MM-dd, or yyyy-MM-ddTHH:mm[:ss] when it has a time of day. */
export function serialDate(serial: number, date1904 = false): string {
  // The 1900 system counts a 29 February 1900 that never was (serial 60); days before it start a day later.
  const days = date1904 ? serial + 1462 : serial < 60 ? serial + 1 : serial;
  const ms = Math.round((days - 25569) * 86_400_000 / 1000) * 1000;
  const iso = new Date(ms).toISOString();
  const time = iso.slice(11, 19);
  return time === '00:00:00' ? iso.slice(0, 10) : `${iso.slice(0, 10)}T${time.endsWith(':00') ? time.slice(0, 5) : time}`;
}

/** A number as Excel shows it in a cell without a format: at most 15 significant digits. */
export function numberText(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return String(Number(n.toPrecision(15)));
}

function sheetRows(xml: string, strings: string[], dates: Set<number>, date1904: boolean): string[][] {
  const data = elements(xml, 'sheetData')[0]?.inner ?? '';
  const rows: string[][] = [];
  for (const row of elements(data, 'row')) {
    const cells: string[] = [];
    let next = 0;
    for (const c of elements(row.inner, 'c')) {
      const a = attrs(c.attrs);
      const col = a.r ? columnOf(a.r) : next;
      next = col + 1;
      const v = elements(c.inner, 'v')[0]?.inner;
      let text: string;
      switch (a.t) {
        case 's': text = strings[Number(v)] ?? ''; break;
        case 'inlineStr': text = runText(elements(c.inner, 'is')[0]?.inner ?? ''); break;
        case 'b': text = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : ''; break;
        case 'str': case 'e': case 'd': text = decode(v ?? ''); break;
        default:
          text = v == null || v === '' ? '' : dates.has(Number(a.s ?? 0)) && Number.isFinite(Number(v)) ? serialDate(Number(v), date1904) : numberText(v);
      }
      if (text === '') continue;
      while (cells.length < col) cells.push('');
      cells[col] = text;
    }
    if (cells.some((x) => x.trim() !== '')) rows.push(cells);
  }
  return rows;
}
