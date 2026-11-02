import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useTodaLocale } from './locale';
import { bundlesFor, DEFAULT_PRODUCT_NAME, translate, withProductValue, type Messages } from './texts-lookup';

interface PluginTexts {
  /** Each plugin's texts in the current language, as the site serves them (bundled texts plus admin translations). */
  texts: Record<string, Messages>;
  /** The product's name in the current language, for `{product}` (docs/toda.md, layer 1). */
  product: string;
}

const PluginTextsContext = createContext<PluginTexts>({ texts: {}, product: DEFAULT_PRODUCT_NAME });

export function PluginTextsProvider({ value, product, children }: { value?: Record<string, Messages>; product?: string; children: ReactNode }) {
  const texts = useMemo(() => ({ texts: value ?? {}, product: product ?? DEFAULT_PRODUCT_NAME }), [value, product]);
  return <PluginTextsContext.Provider value={texts}>{children}</PluginTextsContext.Provider>;
}

/**
 * A plugin's translate function (ADR 0026). The plugin ships its texts as `messages/{language}.json` in its package
 * and passes the same files here as `bundled`; the shell supplies the site's version (an admin may have translated
 * or reworded them, or added a language). The site's text wins, then the bundled text in the current language,
 * then the English one, then the key itself. `{name}` placeholders are filled from `values`, and `{product}` with the
 * product's name in the current language as the host gives it, whichever file the text came from, unless `values`
 * gives a `product` of its own.
 *
 * The function stays the same across renders while the site's texts and the language do, however `bundled` is passed:
 * it depends on the files, not on the object holding them (ADR 0078), so an effect that uses it runs when the texts
 * change, not on every render.
 */
export function usePluginTexts<M extends Messages>(pluginKey: string, bundled: { en: M } & Record<string, Messages>) {
  const { texts, product } = useContext(PluginTextsContext);
  const site = texts[pluginKey];
  const { locale } = useTodaLocale();
  const [own, base, en] = bundlesFor(bundled, locale);
  return useCallback(
    (key: string, values?: Record<string, string | number>) => translate(site, [own, base, en], key, withProductValue(product, values)),
    [site, own, base, en, product],
  );
}
