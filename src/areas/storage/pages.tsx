import type { ComponentType } from 'react';
import type { AbpHost, SettingsPage } from '@abpjs/ui';
import { StorageScreen } from './StorageScreen';
import en from './texts/en.json';

export interface StoragePageOptions {
  section: string;
  href: string;
  weight?: number;
  title?: string;
  about?: string;
  visible?: SettingsPage['visible'];
  host?: Pick<AbpHost, 'can'>;
  /** After a change the server has taken (a copy started, a copy that ended): the host reads what it shows again. */
  onChanged?: () => void | Promise<void>;
  /** A store's name for people, when the host doesn't give `storeNames.<store>` as words; the store's key by default. */
  storeName?: (store: string) => string;
}

/**
 * One page component per address, kept across calls: a host's `onChanged` refreshes its pages, which builds its settings
 * again, and a new component there would start the screen afresh, a running copy's progress and a test's results gone.
 * It reads the latest call's options. The map is the module's, shared by every host in the process; a host whose
 * options differ by request uses `StorageScreen` in a page of its own instead.
 */
const pages = new Map<string, { options: StoragePageOptions; component: ComponentType<{ path: string[] }> }>();

function pageFor(href: string, options: StoragePageOptions): ComponentType<{ path: string[] }> {
  const kept = pages.get(href);
  if (kept) {
    kept.options = options;
    return kept.component;
  }
  const entry = { options, component: (() => null) as ComponentType<{ path: string[] }> };
  const onChanged = () => entry.options.onChanged?.();
  const storeName = (store: string) => entry.options.storeName?.(store) ?? store;
  entry.component = function StoragePage() {
    return <StorageScreen onChanged={onChanged} storeName={storeName} />;
  };
  pages.set(href, entry);
  return entry.component;
}

/**
 * The area's settings page for a host to file under its sections: `storage.admin` at `href`, drawn by the host's
 * catch-all route. Who sees it is the host's `storage.site.admin` when `host` is given. The title is the area's English
 * word unless given; the server checks every call.
 */
export function storagePages(options: StoragePageOptions): SettingsPage[] {
  const href = options.href.replace(/\/$/, '');
  return [
    {
      id: 'storage.admin',
      section: options.section,
      weight: options.weight ?? 100,
      title: options.title ?? en.title,
      href,
      about: options.about,
      plugin: 'storage',
      visible: options.visible ?? (options.host?.can ? () => options.host!.can!('storage.site.admin') : undefined),
      component: pageFor(href, options),
    },
  ];
}
