/** A row placed in a hierarchy: how deep, whether it has children here, and whether it's only context (a parent the search left out). */
export interface TreeRow<T> {
  row: T;
  key: string;
  depth: number;
  hasChildren: boolean;
  context: boolean;
}

/**
 * Rows as a tree, depth first (a list grouped by parent, UI round 7, step 38): each row under its parent, at any depth;
 * rows whose parent isn't here are roots. `context` rows are parents the search left out, fetched so their children sit
 * under them: they're placed like any row, marked as context, and only kept when they lead to a row of the result.
 * Roots and siblings keep the order the rows came in (the result's, then the context's). A loop (a record that is its
 * own ancestor) breaks where it would repeat.
 */
export function inTree<T>(rows: readonly T[], keyOf: (row: T) => string, parentOf: (row: T) => string | null, context: readonly T[] = []): TreeRow<T>[] {
  const found = new Set(rows.map(keyOf));
  const all: { row: T; key: string; context: boolean }[] = [
    ...rows.map((row) => ({ row, key: keyOf(row), context: false })),
    ...context.filter((row) => !found.has(keyOf(row))).map((row) => ({ row, key: keyOf(row), context: true })),
  ];
  const byKey = new Map(all.map((x) => [x.key, x]));
  const children = new Map<string, typeof all>();
  const roots: typeof all = [];
  for (const x of all) {
    const parent = parentOf(x.row);
    if (parent != null && parent !== x.key && byKey.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(x);
      children.set(parent, list);
    } else {
      roots.push(x);
    }
  }

  // A context row is kept only when a row of the result is under it.
  const leads = new Map<string, boolean>();
  const leadsToResult = (key: string, seen: Set<string>): boolean => {
    const known = leads.get(key);
    if (known != null) return known;
    if (seen.has(key)) return false;
    seen.add(key);
    const x = byKey.get(key)!;
    const result = !x.context || (children.get(key) ?? []).some((c) => leadsToResult(c.key, seen));
    leads.set(key, result);
    return result;
  };

  const out: TreeRow<T>[] = [];
  const placed = new Set<string>();
  const visit = (x: (typeof all)[number], depth: number) => {
    if (placed.has(x.key) || !leadsToResult(x.key, new Set())) return;
    placed.add(x.key);
    const kids = (children.get(x.key) ?? []).filter((c) => !placed.has(c.key) && leadsToResult(c.key, new Set()));
    out.push({ row: x.row, key: x.key, depth, hasChildren: kids.length > 0, context: x.context });
    for (const c of kids) visit(c, depth + 1);
  };
  for (const r of roots) visit(r, 0);
  // Rows only reachable through a loop: placed as roots, so nothing is lost.
  for (const x of all) if (!placed.has(x.key) && !x.context) visit(x, 0);
  return out;
}

/** The rows a fold hides: those under a folded row, at any depth (the folded row itself stays). */
export function visibleInTree<T>(tree: readonly TreeRow<T>[], folded: ReadonlySet<string>): TreeRow<T>[] {
  const shown: TreeRow<T>[] = [];
  let hideBelow: number | null = null;
  for (const t of tree) {
    if (hideBelow != null && t.depth > hideBelow) continue;
    hideBelow = null;
    shown.push(t);
    if (folded.has(t.key) && t.hasChildren) hideBelow = t.depth;
  }
  return shown;
}
