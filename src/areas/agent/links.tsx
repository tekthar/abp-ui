import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Text } from '@chakra-ui/react';
import { AppLink } from '@abpjs/ui';

/** Where an item opens in the host (a record's page, an asset's), by its kind and key; none when the host doesn't say. */
export type ItemHref = (kind: string, key: string) => string | null | undefined;

const ItemHrefContext = createContext<ItemHref | null>(null);

/** Gives the screens inside where the host's items open: the area's top-level screens take it as `itemHref`. */
export function ItemHrefProvider({ value, children }: { value?: ItemHref | null; children: ReactNode }) {
  const outer = useContext(ItemHrefContext);
  return <ItemHrefContext.Provider value={value ?? outer}>{children}</ItemHrefContext.Provider>;
}

/** An item's key: a link where the host says where it opens, its key alone otherwise. */
export function ItemLink({ kind, itemKey, children, textStyle }: { kind: string | null | undefined; itemKey: string; children?: ReactNode; textStyle?: string }) {
  const href = useContext(ItemHrefContext)?.(kind ?? '', itemKey);
  return href
    ? <AppLink href={href} dir="ltr" textStyle={textStyle}>{children ?? itemKey}</AppLink>
    : <Text as="span" dir="ltr" textStyle={textStyle}>{children ?? itemKey}</Text>;
}

/** A value that follows another after it has stood still for `ms` (a search box's words). */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
