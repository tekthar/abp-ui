import type { ComponentType, ReactNode } from 'react';

/** A section of a settings area (Administration, a project's settings): the host's own, or one a package or plugin adds. */
export interface SettingsSection {
  key: string;
  title: string;
  weight: number;
}

/**
 * A page of a settings area (ADR 0109, decision 4): the host's own, a package's (`@abpjs/guard`'s, `@abpjs/ai`'s) or a
 * plugin's, given statically or loaded at run time (a plugin's from its manifest, through the server).
 */
export interface SettingsPage {
  id: string;
  section: string;
  weight: number;
  title: string;
  /** Where it opens. A host's own page has its route; a package's page is drawn by the host's catch-all route. */
  href: string;
  icon?: ReactNode;
  /** Its line on the area's overview. */
  about?: string;
  /** The plugin or package that adds it. */
  plugin?: string;
  /**
   * Whether this person sees it: the host evaluates its rights (an admin right, a role in the project). Shown when not
   * given. The server checks every page anyway; this only keeps the menu to pages the person can open.
   */
  visible?: boolean | (() => boolean);
  /** The page itself, for a package's page that has no route file in the host: its catch-all route draws it. */
  component?: ComponentType<{ path: string[] }>;
}

export interface SettingsArea<P extends SettingsPage = SettingsPage> {
  section: SettingsSection;
  pages: P[];
}

export { findSettingsPage, settingsArea } from '../rules/settings';
