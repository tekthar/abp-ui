/** Names by language, as settings keep them: `{ en: 'Triage', ar: 'الفرز' }`. */
export type Names = Record<string, string | null | undefined> | null | undefined;

/**
 * The languages to try, in order, when showing a name: the reader's, its base language (ar for ar-SA), the site's
 * default, then English.
 */
export function languageChain(locale: string, defaultLanguage?: string | null): string[] {
  return [...new Set([locale, locale.split('-')[0], defaultLanguage ?? '', 'en'].filter(Boolean))];
}

/** A name in the first language of the chain that has one, else any name given, else the fallback (usually a key). */
export function pickName(chain: readonly string[], names: Names, fallback: string): string {
  if (names) {
    for (const code of chain) {
      const value = names[code];
      if (value && value.trim()) return value;
    }
    for (const value of Object.values(names)) if (value && value.trim()) return value;
  }
  return fallback;
}

/** A comma- or line-separated list, trimmed, without blanks. */
export function splitList(value: string): string[] {
  return value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
}

/**
 * A name kept as a written name and its other languages (`{ name, names }`, as servers keep a group's or a directory's),
 * as the one map `TranslatedInput` edits: the written name under `written` (English unless said).
 */
export function toNamesValue(name: string | null | undefined, names: Names, written = 'en'): Record<string, string> {
  const value: Record<string, string> = {};
  for (const [code, text] of Object.entries(names ?? {})) if (text && text.trim()) value[code] = text;
  if (name && name.trim()) value[written] = name;
  return value;
}

/** And back: the written name, and the other languages with blanks dropped and each trimmed. */
export function fromNamesValue(value: Record<string, string>, written = 'en'): { name: string; names: Record<string, string> } {
  const names = Object.fromEntries(
    Object.entries(value)
      .filter(([code, text]) => code !== written && text && text.trim())
      .map(([code, text]) => [code, text.trim()]),
  );
  return { name: (value[written] ?? '').trim(), names };
}
