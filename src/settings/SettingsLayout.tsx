import { useState, type ReactNode } from 'react';
import { Text } from '@chakra-ui/react';
import { AppShell, type AppShellProps, type AppShellNavSection } from '../components/AppShell';
import { SearchInput } from '../components/SearchInput';
import type { SettingsArea } from './registry';

export interface SettingsLayoutProps extends Omit<AppShellProps, 'sidebar' | 'navFooter' | 'topNav'> {
  /** The area's sections and the pages this person may see, as `settingsArea` gives them. */
  area: SettingsArea[];
  /** The address now, to mark the page that's open. */
  pathname: string;
  /** The sidebar's id (its collapsed state is kept by it); `settings` when not given. */
  sidebarId?: string;
  labels: {
    /** The find box's placeholder and name: "Find a setting". */
    find: string;
    /** When nothing matches what's typed: "No setting by that name". */
    noSetting: string;
  };
  /** The top bar's links; none when not given (a settings area stands apart from the work). */
  topNav?: AppShellProps['topNav'];
  children: ReactNode;
}

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * A settings area's frame (ADR 0109, decision 4): the app shell with the area's sections as its menu, a box to find a
 * setting by its name or its section's, and a line when nothing matches. The host gives the brand, the way back, the
 * top bar's end and the words; it draws its own pages, and a package's through its catch-all route.
 */
export function SettingsLayout({ area, pathname, sidebarId = 'settings', labels, topNav = [], children, ...shell }: SettingsLayoutProps) {
  const [find, setFind] = useState('');
  const q = find.trim().toLocaleLowerCase();
  const sections: AppShellNavSection[] = area.map(({ section, pages }) => ({
    id: section.key,
    title: section.title,
    items: pages
      .map((p) => ({ id: p.id, href: p.href, icon: p.icon, label: p.title, current: isCurrent(pathname, p.href) }))
      .filter((i) => !q || i.label.toLocaleLowerCase().includes(q) || section.title.toLocaleLowerCase().includes(q)),
  }));
  // "No setting by that name" only answers a search: someone with no page here, who typed its address, has nothing typed.
  const found = !q || sections.some((s) => s.items.length > 0);

  return (
    <AppShell
      {...shell}
      topNav={topNav}
      sidebar={{
        id: sidebarId,
        top: <SearchInput size="sm" value={find} onChange={(e) => setFind(e.target.value)} placeholder={labels.find} aria-label={labels.find} />,
        sections,
      }}
      navFooter={
        !found ? (
          <Text textStyle="caption" color="fg.muted" px="2">
            {labels.noSetting}
          </Text>
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
