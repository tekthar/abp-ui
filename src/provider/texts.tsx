import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useTodaLocale } from './locale';

type Messages = { [key: string]: string | Messages };

/** Each plugin's texts in the current language, as the site serves them (bundled texts plus admin translations). */
const PluginTextsContext = createContext<Record<string, Messages>>({});

export function PluginTextsProvider({ value, children }: { value?: Record<string, Messages>; children: ReactNode }) {
  return <PluginTextsContext.Provider value={value ?? {}}>{children}</PluginTextsContext.Provider>;
}

function lookup(messages: Messages | undefined, key: string): string | undefined {
  // A flat file may hold dotted keys as they are ("type.epic"); the site sends them nested.
  const flat = messages?.[key];
  if (typeof flat === 'string') return flat;
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * A plugin's translate function (ADR 0026). The plugin ships its texts as `messages/{language}.json` in its package
 * and passes the same files here as `bundled`; the shell supplies the site's version (an admin may have translated
 * or reworded them, or added a language). The site's text wins, then the bundled text in the current language,
 * then the English one, then the key itself. `{name}` placeholders are filled from `values`.
 */
export function usePluginTexts<M extends Messages>(pluginKey: string, bundled: { en: M } & Record<string, Messages>) {
  const site = useContext(PluginTextsContext)[pluginKey];
  const { locale } = useTodaLocale();
  return useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const text =
        lookup(site, key) ?? lookup(bundled[locale], key) ?? lookup(bundled[locale.split('-')[0] ?? ''], key) ?? lookup(bundled.en, key) ?? key;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
    },
    [site, bundled, locale],
  );
}
