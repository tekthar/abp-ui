/**
 * What the browser's tab says for a page, kept apart from React so it can be tested alone (provider/title.tsx).
 *
 * The convention, the same in Toda, its portals and its plugins: "{what the page shows} · {where} · {site}", the most
 * specific part first ("PAY-41 Retry failed payouts · Payments · Toda"). A page claims its parts; the last claim set
 * wins, and a page's claim leaves with it, so the one under it shows again. An empty claim is no claim, so a page
 * whose title is still loading never shows " · Toda" alone. The site's name ends every title; a portal on a host of
 * its own may claim another name in its place.
 */

/** A page's title: one part, or its parts, most specific first. Empty and missing parts are left out. */
export type TitleParts = string | number | readonly (string | number | null | undefined | false)[] | null | undefined | false;

export const TITLE_SEPARATOR = ' · ';

/** Right-to-left mark, first isolate and pop directional isolate. */
const RLM = '‏';
const FSI = '⁨';
const PDI = '⁩';
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** The parts a claim names, trimmed, empty ones dropped. */
export function partsOf(title: TitleParts): string[] {
  if (title === null || title === undefined || title === false) return [];
  const list = Array.isArray(title) ? title : [title];
  return list.flatMap((p) => (p === null || p === undefined || p === false ? [] : [String(p).replace(/\s+/g, ' ').trim()])).filter((p) => p.length > 0);
}

/**
 * The tab's text: the parts, then the site's name, with a part said twice in a row once ("Partnerships · Partnerships").
 * In a right-to-left language, or when a part is in a right-to-left script, each part is isolated and the title starts
 * right to left, so "PAY-41 …" doesn't turn an Arabic title's order around.
 */
export function composeTitle(parts: readonly string[], site: string | undefined, rtl: boolean): string {
  const all = [...parts, ...(site && site.trim() ? [site.trim()] : [])].filter((p, i, list) => i === 0 || p !== list[i - 1]);
  const mixed = rtl || all.some((p) => RTL_LETTER.test(p));
  if (!mixed || all.length < 2) return (rtl && all.length > 0 ? RLM : '') + all.join(TITLE_SEPARATOR);
  return (rtl ? RLM : '') + all.map((p) => FSI + p + PDI).join(TITLE_SEPARATOR);
}

interface Claim<T> {
  value: T;
  at: number;
}

/** Claims on one thing (the parts, the site's name): the one set last wins; one that leaves gives way to the one before. */
class Claims<T> {
  private readonly claims = new Map<number, Claim<T>>();
  private clock = 0;

  set(id: number, value: T | null, same: (a: T, b: T) => boolean): boolean {
    const had = this.claims.get(id);
    if (value === null) return this.claims.delete(id);
    if (had && same(had.value, value)) return false;
    this.claims.set(id, { value, at: ++this.clock });
    return true;
  }

  current(): T | undefined {
    let best: Claim<T> | undefined;
    for (const c of this.claims.values()) if (!best || c.at > best.at) best = c;
    return best?.value;
  }
}

const sameParts = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((p, i) => p === b[i]);

/** What the provider keeps: every page's claim, and who's told when the winning one changes. */
export class TitleStore {
  private readonly parts = new Claims<string[]>();
  private readonly sites = new Claims<string>();
  private next = 0;
  private listeners = new Set<() => void>();
  private snapshot: { parts: readonly string[]; site: string | undefined } = { parts: [], site: undefined };

  /** A new claimant's id. */
  open(): number {
    return ++this.next;
  }

  /** A page's parts; none (or null) withdraws its claim. */
  setParts(id: number, parts: readonly string[] | null): void {
    if (this.parts.set(id, parts && parts.length > 0 ? [...parts] : null, sameParts)) this.changed();
  }

  /** A portal's name in place of the site's; none (or null) withdraws it. */
  setSite(id: number, site: string | null): void {
    const name = site?.trim();
    if (this.sites.set(id, name ? name : null, (a, b) => a === b)) this.changed();
  }

  /** The winning parts and site name (the same object until one changes). */
  current = (): { parts: readonly string[]; site: string | undefined } => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private changed() {
    const parts = this.parts.current() ?? [];
    const site = this.sites.current();
    if (sameParts(parts, this.snapshot.parts) && site === this.snapshot.site) return;
    this.snapshot = { parts, site };
    for (const l of this.listeners) l();
  }
}
