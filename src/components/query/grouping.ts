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
