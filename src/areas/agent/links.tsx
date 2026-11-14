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

/**
 * An item's key, or words about it (`children`): a link where the host says where it opens, plain otherwise. A bare key
 * reads left to right; words keep the page's direction.
 */
export function ItemLink({ kind, itemKey, children, textStyle }: { kind: string | null | undefined; itemKey: string; children?: ReactNode; textStyle?: string }) {
  const href = useContext(ItemHrefContext)?.(kind ?? '', itemKey);
  const dir = children == null ? 'ltr' : undefined;
  return href
    ? <AppLink href={href} dir={dir} textStyle={textStyle}>{children ?? itemKey}</AppLink>
    : <Text as="span" dir={dir} textStyle={textStyle}>{children ?? itemKey}</Text>;
}

/**
 * Which of the host's own groups a tool is in, by what the host knows of it (its skills, an outside server's tools, by
 * their names): a group's id and its heading, or nothing for the area's own groups (the host's tools, plugins',
 * sandbox's). A host's groups follow the area's, in the order their first tools come.
 */
export type ToolGroupOf = (tool: { name: string; title: string; readsOnly: boolean; optIn?: boolean }) => { id: string; title: string } | null | undefined;

const ToolGroupContext = createContext<ToolGroupOf | null>(null);

/** Gives the tools tabs inside the host's own groups of tools. */
export function ToolGroupsProvider({ value, children }: { value: ToolGroupOf; children: ReactNode }) {
  return <ToolGroupContext.Provider value={value}>{children}</ToolGroupContext.Provider>;
}

/** The host's grouping of tools, or none. */
export function useToolGroupOf(): ToolGroupOf | null {
  return useContext(ToolGroupContext);
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
