/**
 * A row's group, as a key: a reference's key or id (a status, a person), a value's text, or "" for none. The groups a
 * grouped query returns key the same way, so a row finds its group's count and name.
 */
export function groupKey(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const id = v.key ?? v.id ?? v.username ?? v.name;
    return id == null ? JSON.stringify(value) : String(id);
  }
  return String(value);
}

/**
 * A date period's name from its first day (yyyy-mm-dd), in the reader's language: a day, "Week of 2 Nov 2026",
 * "November 2026", "Q4 2026", "2026". The day is read as written, never shifted by a time zone.
 */
export function periodName(day: string, period: string, locale: string, labels: { week: string; quarter: string }): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
  const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
  switch (period) {
    case 'year': return format({ year: 'numeric' });
    case 'quarter': return fill(labels.quarter, { quarter: new Intl.NumberFormat(locale).format(Math.floor((Number(m[2]) - 1) / 3) + 1), year: format({ year: 'numeric' }) });
    case 'month': return format({ month: 'long', year: 'numeric' });
    case 'week': return fill(labels.week, { day: format({ day: 'numeric', month: 'short', year: 'numeric' }) });
    default: return format({ day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/** Rows in their groups, in the order they came (a grouped query's rows come in group order). */
export function inGroups<T>(rows: readonly T[], of: (row: T) => string): { key: string; rows: T[] }[] {
  const groups: { key: string; rows: T[] }[] = [];
  for (const row of rows) {
    const key = of(row);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, rows: [row] });
  }
  return groups;
}
