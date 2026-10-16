import { useMemo } from 'react';
import { useTodaLocale } from '../provider/locale';
import { useTodaTimeZone } from '../provider/time-zone';

/** A calendar day ("2026-01-31"): shown as that day wherever the person is, never shifted by their time zone. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Placeholder for a missing value in tables and property lists. */
export const EMPTY_VALUE = '—';

/*
 * Numbers and dates use Latin digits in every locale (numberingSystem "latn"): record keys,
 * ids and counts then read the same in English and Arabic, as they do in most Arabic business
 * software. Month names and word order still follow the locale.
 */

/** How a moment is written unless the caller says otherwise. */
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = DATE_TIME,
  timeZone?: string,
): string {
  if (value == null || value === '') return EMPTY_VALUE;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const zone = typeof value === 'string' && DAY.test(value) ? 'UTC' : timeZone;
  return new Intl.DateTimeFormat(locale, { numberingSystem: 'latn', ...(zone ? { timeZone: zone } : {}), ...options }).format(d);
}

export function formatNumber(value: number | null | undefined, locale: string, options?: Intl.NumberFormatOptions): string {
  if (value == null || Number.isNaN(value)) return EMPTY_VALUE;
  return new Intl.NumberFormat(locale, { numberingSystem: 'latn', ...options }).format(value);
}

/** Formatters bound to the current TodaProvider locale and the person's time zone. */
export function useFormatters() {
  const { locale } = useTodaLocale();
  const timeZone = useTodaTimeZone();
  return useMemo(
    () => ({
      dateTime: (value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) =>
        formatDateTime(value, locale, options, timeZone),
      number: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
    }),
    [locale, timeZone],
  );
}
