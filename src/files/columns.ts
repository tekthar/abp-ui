// Matching a file's columns to fields, for an import (ColumnMatcher): what each column becomes, guessed from its header
// and its values. Tested in tests/files-columns.test.mjs.

/** What a column of an imported file becomes: left out, one of the fields there already, or a new field. */
export type ColumnTarget = { kind: 'skip' } | { kind: 'field'; name: string } | { kind: 'new'; name: string; type: string };

/** A field a column can go into. */
export interface ColumnField {
  name: string;
  type?: string;
  label?: string;
}

/** The kind of value a column holds, as guessed from its values. */
export type ValueKind = 'integer' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'uuid' | 'text';

const PATTERNS: [ValueKind, RegExp][] = [
  ['integer', /^[-+]?\d+$/],
  ['decimal', /^[-+]?(\d+[.,]\d*|\d*[.,]\d+)([eE][-+]?\d+)?$/],
  ['boolean', /^(true|false|yes|no)$/i],
  ['date', /^\d{4}-\d{2}-\d{2}$/],
  ['timestamp', /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/],
  ['uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
];

/**
 * The kind of a column's values: the first of integer, decimal, boolean, date (yyyy-MM-dd), timestamp or uuid that every
 * non-empty value fits, an integer column with a decimal in it being decimal; text otherwise, or when there's nothing.
 */
export function guessType(values: string[]): ValueKind {
  const filled = values.map((v) => v.trim()).filter((v) => v !== '');
  if (filled.length === 0) return 'text';
  const fits = (re: RegExp) => filled.every((v) => re.test(v));
  for (const [kind, re] of PATTERNS) {
    if (kind === 'decimal' ? filled.every((v) => PATTERNS[0][1].test(v) || re.test(v)) : fits(re)) return kind;
  }
  return 'text';
}

/** A header as a key to compare: lower case, without spaces, dashes or underscores. */
export const headerKey = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\s_\-.]+/g, '');

/**
 * Each column's likely target: the field whose name or label is the header (ignoring case and spacing), each field used
 * once; else, when new fields are allowed, a new field named after the header with the type its values suggest
 * (`typeOf` maps a guessed kind to the host's type); else skipped.
 */
export function guessTargets(headers: string[], samples: string[][], fields?: ColumnField[], options: {
  allowNew?: boolean;
  typeOf?: (kind: ValueKind) => string;
  nameOf?: (header: string, index: number) => string;
} = {}): ColumnTarget[] {
  const allowNew = options.allowNew ?? !(fields && fields.length > 0);
  const used = new Set<string>();
  return headers.map((header, i) => {
    const key = headerKey(header);
    const field = (fields ?? []).find((f) => !used.has(f.name) && key !== '' && (headerKey(f.name) === key || (f.label != null && headerKey(f.label) === key)));
    if (field) {
      used.add(field.name);
      return { kind: 'field', name: field.name };
    }
    if (!allowNew) return { kind: 'skip' };
    const kind = guessType(samples.map((row) => row[i] ?? ''));
    return { kind: 'new', name: options.nameOf ? options.nameOf(header, i) : header.trim() || `column${i + 1}`, type: options.typeOf ? options.typeOf(kind) : kind };
  });
}

/** How many columns become new fields, go into fields there already, and are left out. */
export function columnCounts(targets: ColumnTarget[]): { total: number; created: number; matched: number; skipped: number } {
  return {
    total: targets.length,
    created: targets.filter((t) => t.kind === 'new').length,
    matched: targets.filter((t) => t.kind === 'field').length,
    skipped: targets.filter((t) => t.kind === 'skip').length,
  };
}

/** Problems a host should refuse before importing: a field chosen twice, a new field without a name, or two new fields with one name. */
export function columnProblems(targets: ColumnTarget[]): { twice: string[]; unnamed: number[]; sameName: string[] } {
  const fields = targets.flatMap((t) => (t.kind === 'field' ? [t.name] : []));
  const names = targets.flatMap((t) => (t.kind === 'new' && t.name.trim() ? [t.name.trim().toLowerCase()] : []));
  const dupes = (list: string[]) => [...new Set(list.filter((x, i) => list.indexOf(x) !== i))];
  return {
    twice: dupes(fields),
    unnamed: targets.flatMap((t, i) => (t.kind === 'new' && !t.name.trim() ? [i] : [])),
    sameName: dupes(names),
  };
}
