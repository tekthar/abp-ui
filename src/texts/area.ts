import { useCallback } from 'react';
import { useOptionalHost } from '../host/HostContext';
import { useAbpLocale } from '../provider/locale';
import { useProductName } from '../provider/texts';
import { withProductValue } from '../provider/texts-lookup';
import { formatMessage } from './format';

/** An area's texts in one language: flat keys (`models.title`) to texts in the subset of ICU `formatMessage` reads. */
export type AreaTexts = Record<string, string>;

/**
 * An area's words (ADR 0109 amendment): its own English and Arabic (and any other language), which a host overrides
 * key by key through `AbpHost.texts[area]`. The language is the provider's; a key missing in it falls back to its base
 * language (ar for ar-SA), then English, then the key itself. `{product}` is the host's product name unless `values`
 * gives one.
 */
export function createAreaTexts(area: string, bundled: { en: AreaTexts } & Record<string, AreaTexts>) {
  return function useAreaTexts(): (key: string, values?: Record<string, string | number>) => string {
    const { locale } = useAbpLocale();
    const host = useOptionalHost();
    const product = useProductName();
    const own = host?.texts?.[area];
    return useCallback(
      (key: string, values?: Record<string, string | number>) => {
        const base = locale.split('-')[0];
        const text = own?.[locale]?.[key] ?? own?.[base]?.[key] ?? bundled[locale]?.[key] ?? bundled[base]?.[key] ?? own?.en?.[key] ?? bundled.en[key] ?? key;
        return formatMessage(locale, text, withProductValue(product, values));
      },
      [locale, own, product],
    );
  };
}
