import { useSyncExternalStore, type ComponentType } from 'react';
import type { AbpHost, SettingsPage } from '@abpjs/ui';
import { AccountScreen } from './AccountScreen';
import { AccountsScreen } from './AccountsScreen';
import { AnonymousScreen } from './AnonymousScreen';
import { DirectoriesScreen } from './DirectoriesScreen';
import { DirectoryScreen } from './DirectoryScreen';
import { GroupScreen } from './GroupScreen';
import { GroupsScreen } from './GroupsScreen';
import { MergeScreen } from './MergeScreen';
import { guardRoutes, type GuardRoutes } from './routes';
import { SignUpScreen } from './SignUpScreen';
import en from './texts/en.json';

export type GuardPageKey = 'accounts' | 'groups' | 'directories' | 'signup' | 'anonymous';

/** The address's query, read again when the browser moves back or forward. */
function subscribe(changed: () => void): () => void {
  window.addEventListener('popstate', changed);
  return () => window.removeEventListener('popstate', changed);
}

/**
 * Merging an account, the survivor named by the link when it names one (`?into=`, the duplicates list's): read in the
 * browser only, so a host that renders on the server draws the same first page there and in the browser.
 */
function MergePage({ id, routes }: { id: string; routes: GuardRoutes }) {
  const into = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get('into'),
    () => null,
  );
  return <MergeScreen id={id} into={into} routes={routes} />;
}

/**
 * The area's settings pages for a host to file under its sections: `guard.accounts`, `guard.groups`,
 * `guard.directories`, `guard.signup` and `guard.anonymous`, under `base` (`/admin` by default: `/admin/accounts`…).
 * Each is drawn by the host's catch-all route with the path after its address: a list, then one item
 * (`/admin/accounts/{id}`, `/admin/accounts/{id}/merge`, `/admin/groups/{id}`, `/admin/directories/{id}`), so the links
 * between them are `guardRoutes(base)`'s. Who sees them is the host's `guard.site.admin` when `host` is given;
 * `directories: false` (AbpGuard's Directories feature off) leaves the directories page out and sign-up's hint about
 * it. The titles are the area's English words unless given; the server checks every call anyway.
 */
export function guardPages(options: {
  section: string;
  base?: string;
  weight?: number;
  titles?: Partial<Record<GuardPageKey, string>>;
  about?: Partial<Record<GuardPageKey, string>>;
  directories?: boolean;
  visible?: SettingsPage['visible'];
  host?: Pick<AbpHost, 'can'>;
}): SettingsPage[] {
  const base = (options.base ?? '/admin').replace(/\/$/, '');
  const routes = guardRoutes(base);
  const directories = options.directories ?? true;
  const visible = options.visible ?? (options.host?.can ? () => options.host!.can!('guard.site.admin') : undefined);
  const weight = options.weight ?? 100;
  // Settings sort heavier first: accounts the heaviest, anonymous access the lightest, in the order the menu reads.
  const page = (key: GuardPageKey, at: number, component: ComponentType<{ path: string[] }>): SettingsPage => ({
    id: `guard.${key}`,
    section: options.section,
    weight: weight + 4 - at,
    title: options.titles?.[key] ?? en[`nav.${key}`],
    href: `${base}/${key}`,
    about: options.about?.[key],
    plugin: 'guard',
    visible,
    component,
  });

  const pages: SettingsPage[] = [
    page('accounts', 0, ({ path }) =>
      !path[0] ? (
        <AccountsScreen routes={routes} />
      ) : path[1] === 'merge' ? (
        <MergePage id={path[0]} routes={routes} />
      ) : (
        <AccountScreen id={path[0]} routes={routes} />
      ),
    ),
    page('groups', 1, ({ path }) => (path[0] ? <GroupScreen id={path[0]} routes={routes} /> : <GroupsScreen routes={routes} />)),
  ];
  if (directories) {
    pages.push(page('directories', 2, ({ path }) => (path[0] ? <DirectoryScreen id={path[0]} routes={routes} /> : <DirectoriesScreen routes={routes} />)));
  }
  pages.push(page('signup', 3, () => <SignUpScreen directoriesPage={directories} />), page('anonymous', 4, () => <AnonymousScreen />));
  return pages;
}
