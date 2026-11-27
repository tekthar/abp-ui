import type { ComponentType } from 'react';
import type { AbpHost, SettingsPage } from '@abpjs/ui';
import { LanguagesScreen } from './LanguagesScreen';
import en from './texts/en.json';
import { TranslateScreen } from './TranslateScreen';

export interface LanguagesPageOptions {
  section: string;
  href: string;
  weight?: number;
  title?: string;
  about?: string;
  visible?: SettingsPage['visible'];
  host?: Pick<AbpHost, 'can'>;
  /** After every change the server has taken: the host reads its languages and texts again. */
  onChanged?: () => void | Promise<void>;
  /** The catalog of the host's own texts (`app` by default). */
  mainCatalog?: string;
  /** The name for any other catalog; its key by default. */
  catalogName?: (catalog: string) => string;
}

/**
 * One page component per address, kept across calls: a host's `onChanged` refreshes its pages, which builds its settings
 * again, and a new component there would start the editor afresh, its filters and search gone. It reads the latest call's
 * options. The map is the module's, so on a server that renders pages it's shared by every request and by every host in
 * the process: what it keeps is a component and the last options given for that address, which every host gives the same
 * way today. A host whose options differ by request would need its own page instead (`LanguagesScreen`, `TranslateScreen`).
 */
const pages = new Map<string, { options: LanguagesPageOptions; component: ComponentType<{ path: string[] }> }>();

function pageFor(href: string, options: LanguagesPageOptions): ComponentType<{ path: string[] }> {
  const kept = pages.get(href);
  if (kept) {
    kept.options = options;
    return kept.component;
  }
  const entry = { options, component: (() => null) as ComponentType<{ path: string[] }> };
  const translateHref = (code: string) => `${href}/${encodeURIComponent(code)}`;
  const onChanged = () => entry.options.onChanged?.();
  entry.component = function LanguagesPage({ path }: { path: string[] }) {
    const { mainCatalog, catalogName } = entry.options;
    // Keyed by the language, so moving to another one in the app starts its editor afresh, with no edits of the last.
    return path[0] ? (
      <TranslateScreen key={path[0]} code={path[0]} listHref={href} onChanged={onChanged} mainCatalog={mainCatalog} catalogName={catalogName} />
    ) : (
      <LanguagesScreen translateHref={translateHref} onChanged={onChanged} />
    );
  };
  pages.set(href, entry);
  return entry.component;
}

/**
 * The area's settings page for a host to file under its sections: `languages.admin` at `href`, drawn by the host's
 * catch-all route with the path after it: the languages (`/admin/languages`), then one language's texts
 * (`/admin/languages/{code}`). Who sees it is the host's `languages.site.admin` when `host` is given. `onChanged` runs
 * after every change, so the host reads its languages and texts again; `mainCatalog` and `catalogName` name the catalogs
 * in the editor (`TranslateScreen`). The title is the area's English word unless given; the server checks every call.
 */
export function languagesPages(options: LanguagesPageOptions): SettingsPage[] {
  const href = options.href.replace(/\/$/, '');
  return [
    {
      id: 'languages.admin',
      section: options.section,
      weight: options.weight ?? 100,
      title: options.title ?? en.title,
      href,
      about: options.about,
      plugin: 'languages',
      visible: options.visible ?? (options.host?.can ? () => options.host!.can!('languages.site.admin') : undefined),
      component: pageFor(href, options),
    },
  ];
}
