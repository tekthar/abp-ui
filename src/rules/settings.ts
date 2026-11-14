/**
 * Settings in sections (ADR 0095, moved into the design system by ADR 0109): an area's sections and pages each have a
 * key and a weight. The higher the weight, the nearer the top; equal ones by title. A host's own come in steps of 100,
 * so a package's or a plugin's section or page fits between any two of them.
 */

export interface SettingsSectionLike {
  key: string;
  weight: number;
  title: string;
}

export interface SettingsPageLike {
  section: string;
  weight: number;
  title: string;
}

/** Heavier first, then by title. */
export const heavierFirst = (a: { weight: number; title: string }, b: { weight: number; title: string }) =>
  b.weight - a.weight || a.title.localeCompare(b.title);

/** The sections that have pages, heaviest first, each with its pages heaviest first; a page whose section isn't there is left out. */
export function inSections<S extends SettingsSectionLike, P extends SettingsPageLike>(sections: S[], pages: P[]): { section: S; pages: P[] }[] {
  return [...sections]
    .sort(heavierFirst)
    .map((section) => ({ section, pages: pages.filter((p) => p.section === section.key).sort(heavierFirst) }))
    .filter((s) => s.pages.length > 0);
}

/** A page that may say who sees it (a flag, or a check the host's rights answer). */
export interface MaybeVisible {
  visible?: boolean | (() => boolean);
}

const isVisible = (p: MaybeVisible) => (typeof p.visible === 'function' ? p.visible() : p.visible !== false);

/**
 * An area's sections with the pages this person may see, heaviest first then by title: the host's static sections and
 * pages together with the ones it loads (ADR 0095's order, unchanged). A section a package or plugin adds under a key
 * the host already has is taken once, the host's first.
 */
export function settingsArea<S extends SettingsSectionLike, P extends SettingsPageLike & MaybeVisible>(sections: S[], pages: P[]): { section: S; pages: P[] }[] {
  const once = sections.filter((s, i) => sections.findIndex((x) => x.key === s.key) === i);
  return inSections(once, pages.filter(isVisible));
}

/** The page an address opens, for a host's catch-all route: the one whose `href` is the address or above it, the longest. */
export function findSettingsPage<P extends { href: string }>(pages: P[], pathname: string): P | undefined {
  return pages.filter((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
}
