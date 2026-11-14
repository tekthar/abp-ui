/**
 * A breadcrumb trail past four levels, folded (UI round 9, step 66): the first and the last two stay, the middle ones
 * go behind "…" (`null` in `shown`) and come back as `hidden`. Four or fewer stay as they are.
 */
export function foldBreadcrumbs<T>(items: readonly T[]): { shown: ({ item: T; index: number } | null)[]; hidden: T[] } {
  if (items.length <= 4) return { shown: items.map((item, index) => ({ item, index })), hidden: [] };
  return {
    shown: [{ item: items[0], index: 0 }, null, ...items.slice(-2).map((item, k) => ({ item, index: items.length - 2 + k }))],
    hidden: items.slice(1, -2),
  };
}
