// The widget board's layout (WidgetBoard): pure functions, tested in tests/widget-board-layout.test.mjs.
//
// A board row is 60 tracks wide. A widget has a start column `x` (0-59, counted from the start edge, so right to left
// mirrors itself) and a width `w` (1-60) in tracks. Its `y` is only its place in the order (0, 1, 2…; a move may set a
// half to fall between two), never a height or a pixel row: heights are each widget's own content, which differs from
// one person to another, so an order is what's stored. Packing places widgets in (y, x) order at their column, as high
// as they fit without overlapping, so they sit side by side, stack, or fill the space under a shorter one.

export const TRACKS = 60;
export const GAP = 16;
/** Below this board width every widget is full width, stacked in order, without handles. */
export const NARROW = 720;
/** Width presets in tracks: half, two-thirds, full. */
export const PRESETS = { half: 30, two: 40, full: 60 } as const;

export interface BoardItem {
  id: string;
  x: number;
  y: number;
  w: number;
}

export interface Placed {
  id: string;
  x: number;
  w: number;
  /** From the board's top, in px. */
  top: number;
  height: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** One track's width with its share of the gaps, in px. */
export const trackWidth = (boardWidth: number) => (boardWidth + GAP) / TRACKS;
/** A span of tracks in px, the gap after it left out. */
export const spanPx = (w: number, boardWidth: number) => w * trackWidth(boardWidth) - GAP;
/** The fewest tracks that are at least `px` wide on a board this wide. */
export const tracksFor = (px: number, boardWidth: number) => clamp(Math.ceil((px + GAP) / trackWidth(boardWidth)), 1, TRACKS);

/** An item kept inside the row: a width of 1-60 tracks, a start that leaves it whole. */
export function fit<T extends BoardItem>(item: T): T {
  const w = clamp(Math.round(item.w), 1, TRACKS);
  return { ...item, w, x: clamp(Math.round(item.x), 0, TRACKS - w), y: Math.max(0, item.y) };
}

const order = (a: BoardItem, b: BoardItem) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const across = (a: { x: number; w: number }, b: { x: number; w: number }) => a.x < b.x + b.w && b.x < a.x + a.w;

/**
 * Places the items (y, x) in order: each at its column, as high as it fits below or beside those placed before it, a
 * gap apart. `heights` are content heights in px (a missing one counts as `fallback`). An expanded item spans the row
 * from the start. Below `NARROW` everything is full width, one under another.
 */
export function pack(items: BoardItem[], heights: ReadonlyMap<string, number>, options: { narrow?: boolean; expanded?: ReadonlySet<string>; fallback?: number } = {}): Placed[] {
  const placed: Placed[] = [];
  for (const item of [...items].sort(order)) {
    const height = heights.get(item.id) ?? options.fallback ?? 160;
    const wide = options.narrow || options.expanded?.has(item.id);
    const x = wide ? 0 : clamp(item.x, 0, TRACKS - 1);
    const w = wide ? TRACKS : clamp(item.w, 1, TRACKS - x);
    // The highest top where it overlaps nothing in its columns: the board's top, or just under something placed.
    const tops = [0, ...placed.filter((p) => across(p, { x, w })).map((p) => p.top + p.height + GAP)].sort((a, b) => a - b);
    const top = tops.find((t) => !placed.some((p) => across(p, { x, w }) && t < p.top + p.height + GAP && p.top < t + height + GAP)) ?? 0;
    placed.push({ id: item.id, x, w, top, height });
  }
  return placed;
}

/** The board's height: down to the lowest bottom. */
export const boardHeight = (placed: Placed[]) => placed.reduce((h, p) => Math.max(h, p.top + p.height), 0);

/**
 * The items with `y` renumbered 0, 1, 2… in (y, x) order, no gaps and no halves, so a stored layout never drifts.
 * Widths and starts are kept (an expanded or narrow view isn't saved). The items keep their order in the array.
 */
export function renumber<T extends BoardItem>(items: T[]): T[] {
  const rank = new Map([...items].sort(order).map((i, n) => [i.id, n]));
  return items.map((i) => ({ ...i, y: rank.get(i.id)! }));
}

/** Where a new item `w` tracks wide goes: after everything, beside the last one when it fits there, else at the start. */
export function appendAt(items: BoardItem[], w = TRACKS): { x: number; y: number } {
  if (items.length === 0) return { x: 0, y: 0 };
  const last = [...items].sort(order)[items.length - 1];
  const beside = last.x + last.w;
  return { x: beside + Math.min(w, TRACKS) <= TRACKS ? beside : 0, y: last.y + 1 };
}

/** A start column snapped to a neighbour's edge when it's within `reach` tracks of one. */
export function snap(x: number, w: number, others: { x: number; w: number }[], reach = 2): number {
  let best = x;
  let distance = reach + 1;
  for (const o of others) {
    for (const edge of [o.x, o.x + o.w, o.x - w, o.x + o.w - w]) {
      const d = Math.abs(edge - x);
      if (edge >= 0 && edge + w <= TRACKS && d <= reach && d < distance) {
        best = edge;
        distance = d;
      }
    }
  }
  return clamp(best, 0, TRACKS - w);
}

/**
 * Where a dragged item lands: the column its ghost's start is over (snapped to neighbours' edges), and its place in
 * the order. Over the top half of a widget it takes that widget's place, pushing it down; elsewhere it goes where its
 * ghost's top is.
 */
export function dropTarget(id: string, ghost: { start: number; top: number }, w: number, placed: Placed[], items: BoardItem[], boardWidth: number): { x: number; y: number } {
  const others = placed.filter((p) => p.id !== id);
  const y = new Map(items.map((i) => [i.id, i.y]));
  const x = snap(Math.round(ghost.start / trackWidth(boardWidth)), w, others);
  const over = others.find((p) => across(p, { x, w }) && ghost.top >= p.top - GAP && ghost.top < p.top + p.height / 2);
  if (over) return { x, y: y.get(over.id)! - 0.5 };
  // Elsewhere: after the last widget whose top is above the ghost's.
  const before = others.filter((p) => p.top <= ghost.top).map((p) => y.get(p.id)!);
  return { x, y: before.length ? Math.max(...before) + 0.5 : -0.5 };
}

/**
 * A keyboard move from the grip: `side` shifts by `step` tracks toward the end (+) or the start (-), the caller having
 * mirrored the arrows for right to left; `up`/`down` passes the nearest widget above or below in the same columns;
 * `home` goes to the top start, `end` to the very end.
 */
export function keyMove(item: BoardItem, move: { side?: number; vertical?: 'up' | 'down'; home?: boolean; end?: boolean }, placed: Placed[], items: BoardItem[]): BoardItem {
  const ys = items.map((i) => i.y);
  if (move.home) return { ...item, x: 0, y: Math.min(0, ...ys) - 1 };
  if (move.end) return { ...item, x: 0, y: Math.max(0, ...ys) + 1 };
  if (move.side) return { ...item, x: clamp(item.x + move.side, 0, TRACKS - item.w) };
  const me = placed.find((p) => p.id === item.id);
  if (!me || !move.vertical) return item;
  const y = new Map(items.map((i) => [i.id, i.y]));
  const column = placed.filter((p) => p.id !== item.id && across(p, me));
  if (move.vertical === 'up') {
    const above = column.filter((p) => p.top < me.top).sort((a, b) => b.top - a.top)[0];
    return above ? { ...item, y: y.get(above.id)! - 0.5 } : item;
  }
  const below = column.filter((p) => p.top > me.top).sort((a, b) => a.top - b.top)[0];
  return below ? { ...item, y: y.get(below.id)! + 0.5 } : item;
}

/** A width change: kept between the minimum and the row, the start moved back when it would push past the end. */
export function resize(item: BoardItem, w: number, min = 1): BoardItem {
  const width = clamp(Math.round(w), Math.min(min, TRACKS), TRACKS);
  return { ...item, w: width, x: Math.min(item.x, TRACKS - width) };
}

/** A 12-column layout (DashboardGrid's) read on 60 tracks: five tracks a column, its (y, x) order kept. */
export function fromTwelve<T extends BoardItem>(items: T[]): T[] {
  return renumber(items.map((i) => ({ ...i, x: i.x * 5, w: i.w * 5 })));
}
