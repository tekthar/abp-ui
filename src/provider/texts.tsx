import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useTodaLocale } from './locale';
import { bundlesFor, translate, type Messages } from './texts-lookup';

/** Each plugin's texts in the current language, as the site serves them (bundled texts plus admin translations). */
const PluginTextsContext = createContext<Record<string, Messages>>({});

export function PluginTextsProvider({ value, children }: { value?: Record<string, Messages>; children: ReactNode }) {
  return <PluginTextsContext.Provider value={value ?? {}}>{children}</PluginTextsContext.Provider>;
}

/**
 * A plugin's translate function (ADR 0026). The plugin ships its texts as `messages/{language}.json` in its package
 * and passes the same files here as `bundled`; the shell supplies the site's version (an admin may have translated
 * or reworded them, or added a language). The site's text wins, then the bundled text in the current language,
 * then the English one, then the key itself. `{name}` placeholders are filled from `values`.
 *
 * The function stays the same across renders while the site's texts and the language do, however `bundled` is passed:
 * it depends on the files, not on the object holding them (ADR 0078), so an effect that uses it runs when the texts
 * change, not on every render.
 */
export function usePluginTexts<M extends Messages>(pluginKey: string, bundled: { en: M } & Record<string, Messages>) {
  const site = useContext(PluginTextsContext)[pluginKey];
  const { locale } = useTodaLocale();
  const [own, base, en] = bundlesFor(bundled, locale);
  return useCallback(
    (key: string, values?: Record<string, string | number>) => translate(site, [own, base, en], key, values),
    [site, own, base, en],
  );
}
