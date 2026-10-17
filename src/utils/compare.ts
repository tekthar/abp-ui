/**
 * Orders strings by their UTF-16 code units: what `sort()` does without a compare function, said on purpose. It's the
 * order of ISO dates ("2026-01-31"), ids and keys, the same in every locale, so it's what a canonical form needs (a list
 * sorted to compare it with another). Text people read is sorted with `localeCompare` instead.
 */
export function compareOrdinal(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
