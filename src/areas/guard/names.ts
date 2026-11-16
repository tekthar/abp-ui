import { useCallback } from 'react';
import { useAbpLocale, useHostLanguages } from '@abpjs/ui';
import { languageChain, pickName } from '@abpjs/ui/rules';

/**
 * A name as the reader sees it: in their language when one was written for it (a person's, a group's), else the name as
 * written, which is the English one.
 */
export function useWrittenName(): (name: string, names?: Record<string, string> | null) => string {
  const { locale } = useAbpLocale();
  const languages = useHostLanguages();
  const fallback = languages[0]?.code;
  return useCallback(
    (name, names) => pickName(languageChain(locale, fallback), { ...(names ?? {}), en: name }, name),
    [locale, fallback],
  );
}
