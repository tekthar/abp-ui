/** A plugin's texts in one language: flat dotted keys or nested objects (ADR 0026). */
export type Messages = { [key: string]: string | Messages };

export function lookup(messages: Messages | undefined, key: string): string | undefined {
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
 * The bundled files a language reads, most fitting first: its own, its base language's (ar for ar-SA), then English.
 * A translate function depends on these files, not on the object a plugin wraps them in, so a plugin that writes
 * `usePluginTexts('x', { en, ar })` on every render still gets the same function each time (ADR 0078).
 */
export function bundlesFor(bundled: { en: Messages } & Record<string, Messages>, locale: string): [Messages | undefined, Messages | undefined, Messages] {
  return [bundled[locale], bundled[locale.split('-')[0] ?? ''], bundled.en];
}

/** The text for a key: the site's, then the bundled files' in order, then the key itself; `{name}` filled from `values`. */
export function translate(site: Messages | undefined, bundles: readonly (Messages | undefined)[], key: string, values?: Record<string, string | number>): string {
  let text = lookup(site, key);
  for (const messages of bundles) {
    text ??= lookup(messages, key);
  }

  return (text ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
}
