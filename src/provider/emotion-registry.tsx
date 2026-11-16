import { useState, type ReactNode } from 'react';
import createCache, { type EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

/** A framework's hook for HTML to put in the page's head while it streams (Next's `useServerInsertedHTML`). */
export type ServerInsertedHTML = (callback: () => ReactNode) => void;

/**
 * Emotion's styles in the page's head on the server, so the first render matches the client's. Without it, a style
 * Emotion writes during the server render (Chakra's global styles) lands inside the body where the client expects
 * something else (next-themes' script), and React's hydration fails. The framework's hook comes from the host, so the
 * package names no framework.
 */
export function EmotionRegistry({ useServerInsertedHTML, children }: { useServerInsertedHTML: ServerInsertedHTML; children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache: EmotionCache = createCache({ key: 'css' });
    cache.compat = true;
    const insert = cache.insert;
    let inserted: { name: string; global: boolean }[] = [];
    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) inserted.push({ name: serialized.name, global: !selector });
      return insert(...args);
    };
    const flush = () => {
      const was = inserted;
      inserted = [];
      return was;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    let attribute = cache.key;
    const globals: { name: string; style: string }[] = [];
    for (const { name, global } of names) {
      const style = cache.inserted[name];
      if (typeof style !== 'string') continue;
      if (global) globals.push({ name, style });
      else {
        styles += style;
        attribute += ` ${name}`;
      }
    }
    return (
      <>
        {globals.map(({ name, style }) => (
          // Emotion's own CSS, written by its serializer from the host's theme: no person's input.
          <style key={name} data-emotion={`${cache.key}-global ${name}`} dangerouslySetInnerHTML={{ __html: style }} />
        ))}
        {styles && <style data-emotion={attribute} dangerouslySetInnerHTML={{ __html: styles }} />}
      </>
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
