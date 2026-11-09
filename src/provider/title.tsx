import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTodaLocale } from './locale';
import { composeTitle, partsOf, TitleStore, type TitleParts } from './title-claims';

export { composeTitle, partsOf, TITLE_SEPARATOR, type TitleParts } from './title-claims';

const TitleContext = createContext<TitleStore | null>(null);
const EMPTY: { parts: readonly string[]; site: string | undefined } = { parts: [], site: undefined };
const noSubscription = () => () => {};

/**
 * Owns the browser tab's title (provider/title-claims.ts has the convention): it renders the one `<title>` of the
 * document, made of the parts the page claims (`usePageTitle`, and `PageHeader` by itself) and the site's name. The host
 * renders it once, above every frame, and gives the page no title of its own any other way. Without it, claims do
 * nothing, so a host that sets its titles another way (on the server, say) keeps them.
 */
export function PageTitleProvider({ site, children }: { site?: string; children: ReactNode }) {
  const [store] = useState(() => new TitleStore());
  const { parts, site: claimed } = useSyncExternalStore(store.subscribe, store.current, store.current);
  const { isRtl } = useTodaLocale();
  const text = composeTitle(parts, claimed ?? site, isRtl);
  return (
    <TitleContext.Provider value={store}>
      {text && <title>{text}</title>}
      {children}
    </TitleContext.Provider>
  );
}

/**
 * Claims the tab's title for as long as the calling page shows: its parts, most specific first, without the site's
 * name ("PAY-41 Retry failed payouts", "Payments"). An empty title claims nothing, so a title still loading leaves the
 * one before it. `PageHeader` claims its own text title; call this for a title that's a node, or to say where.
 */
export function usePageTitle(title: TitleParts): void {
  const store = useContext(TitleContext);
  const id = useRef(0);
  const parts = partsOf(title);
  const key = parts.join('\u0000');
  useEffect(() => {
    if (!store) return;
    const mine = store.open();
    id.current = mine;
    return () => store.setParts(mine, null);
  }, [store]);
  useEffect(() => {
    if (store && id.current) store.setParts(id.current, key ? key.split('\u0000') : null);
  }, [store, key]);
}

/**
 * Puts another name in the site's place at the end of the title while the calling page shows: a portal with a name of
 * its own (the help center on its own host, a team's portal). Empty puts the site's name back.
 */
export function usePageTitleSite(name: string | null | undefined): void {
  const store = useContext(TitleContext);
  const id = useRef(0);
  useEffect(() => {
    if (!store) return;
    const mine = store.open();
    id.current = mine;
    return () => store.setSite(mine, null);
  }, [store]);
  useEffect(() => {
    if (store && id.current) store.setSite(id.current, name ?? null);
  }, [store, name]);
}

/**
 * The parts the page claims now, most specific first, without the site's name: for what shows a page's title in a
 * narrower place (the phone app's header shows the first). Empty when no page claims one, or with no provider.
 */
export function usePageTitleParts(): readonly string[] {
  const store = useContext(TitleContext);
  return useSyncExternalStore(store?.subscribe ?? noSubscription, store?.current ?? (() => EMPTY), store?.current ?? (() => EMPTY)).parts;
}
