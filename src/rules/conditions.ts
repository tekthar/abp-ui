/**
 * A query's conditions as the filter builders write them (ADR 0013; UI round 9, step 57): which operators take a value
 * or a list, a typed value as the query takes it and back, and conditions on one field merged into "is any of".
 */

/** A field a query can use, as GET /api/query/{entity}/fields returns it. */
export interface QueryField {
  id: string;
  kind: string;
  label: string;
  sortable: boolean;
  groupable: boolean;
  /** JSON-form operator names: eq, ne, in, notIn, contains, isEmpty… */
  operators: string[];
}

/** One condition in a query's JSON form. */
export interface QueryConditionJson {
  field: string;
  op: string;
  value?: unknown;
}

/** Operators that take no value ("is empty"). */
export const NO_VALUE_OPS: ReadonlySet<string> = new Set(['isEmpty', 'isNotEmpty']);
/** Operators whose value is a list ("is any of", and "between" with its two ends). */
export const LIST_OPS: ReadonlySet<string> = new Set(['in', 'notIn', 'hasAny', 'hasAll', 'between']);

/** A typed value as the query takes it: a function call ("startOfDay()") or the text. */
export function parseValue(text: string): unknown {
  const call = /^([A-Za-z]\w*)\((.*)\)$/.exec(text.trim());
  if (call) {
    const args = call[2].trim() === '' ? [] : call[2].split(',').map((a) => (Number.isFinite(Number(a.trim())) ? Number(a.trim()) : a.trim()));
    return { fn: call[1], args };
  }
  return text.trim();
}

/** A condition's value as text (a chip's, or a box's to edit). */
export function valueText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.fn === 'string') return `${v.fn}(${Array.isArray(v.args) ? v.args.map(valueText).join(', ') : ''})`;
    if (typeof v.field === 'string') return `field(${v.field})`;
    if ('query' in v) return '(…)';
  }
  return String(value);
}

/**
 * Conditions on one field that each say "is" one value become one "is any of" ("Conditions on the same field match any
 * of their values"), where the field takes that operator; everything else stays an AND. The conditions given are left
 * as they were.
 */
export function mergeSameField(conditions: readonly QueryConditionJson[], fields: readonly Pick<QueryField, 'id' | 'operators'>[]): QueryConditionJson[] {
  const out: QueryConditionJson[] = [];
  for (const c of conditions) {
    const field = fields.find((f) => f.id === c.field);
    const into = c.op === 'eq' && field?.operators.includes('in') ? out.find((o) => o.field === c.field && (o.op === 'eq' || o.op === 'in')) : undefined;
    if (into) {
      const values = [...(into.op === 'in' ? (into.value as unknown[]) : [into.value]), c.value];
      into.op = 'in';
      into.value = values;
    } else {
      out.push({ ...c });
    }
  }
  return out;
}
