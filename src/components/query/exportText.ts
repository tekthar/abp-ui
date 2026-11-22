// The export dialog's preview (UI round 10 step 76): values as plain text, and CSV fields as the server writes them.

/** A value as plain text, as a file shows it: a person's or an option's name, a list joined, a number as it is. */
export function exportText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(exportText).filter(Boolean).join('; ');
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    for (const k of ['displayName', 'name', 'title', 'label', 'key']) if (typeof v[k] === 'string') return v[k] as string;
    return '';
  }
  return String(value);
}

/** One CSV field as the server writes it: quoted when it holds the separator, a quote or a line break. */
export function csvField(text: string, separator: string): string {
  return text.includes(separator) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
