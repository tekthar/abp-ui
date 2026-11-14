import { useLocaleContext } from '@chakra-ui/react';

export type Direction = 'ltr' | 'rtl';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'ku', 'dv', 'yi']);

/** Text direction for a BCP 47 locale ("ar", "ar-SA" -> rtl). */
export function directionOf(locale: string): Direction {
  return RTL_LANGUAGES.has(locale.toLowerCase().split('-')[0] ?? '') ? 'rtl' : 'ltr';
}

/**
 * Locale and direction from the nearest AbpProvider. Plugins use this instead of a router
 * or i18n library: the shell's provider is shared with them through Module Federation.
 */
export function useAbpLocale(): { locale: string; dir: Direction; isRtl: boolean } {
  const { locale, dir } = useLocaleContext();
  return { locale, dir, isRtl: dir === 'rtl' };
}
