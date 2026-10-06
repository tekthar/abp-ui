import { useMemo } from 'react';
import { useTodaLocale } from '../provider/locale';

/** Placeholder for a missing value in tables and property lists. */
export const EMPTY_VALUE = '—';

/*
 * Numbers and dates use Latin digits in every locale (numberingSystem "latn"): record keys,
 * ids and counts then read the same in English and Arabic, as they do in most Arabic business
 * software. Month names and word order still follow the locale.
 */

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  if (value == null || value === '') return EMPTY_VALUE;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { numberingSystem: 'latn', ...options }).format(d);
}

export function formatNumber(value: number | null | undefined, locale: string, options?: Intl.NumberFormatOptions): string {
  if (value == null || Number.isNaN(value)) return EMPTY_VALUE;
  return new Intl.NumberFormat(locale, { numberingSystem: 'latn', ...options }).format(value);
}

/** Formatters bound to the current TodaProvider locale. */
export function useFormatters() {
  const { locale } = useTodaLocale();
  return useMemo(
    () => ({
      dateTime: (value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) =>
        formatDateTime(value, locale, options),
      number: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
    }),
    [locale],
  );
}
