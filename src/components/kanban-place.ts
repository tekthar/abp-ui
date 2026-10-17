/** A card on the board, as far as its place goes. */
interface Placed {
  id: string;
  column: string;
  lane: string;
}

/** Where a dropped card goes: its cell, and the card it lands before or after (none: last in the cell). */
interface Move {
  column: string;
  lane: string;
  before?: string;
  after?: string;
}

/**
 * The board showing a move the person just made, before the host's answer (ADR 0058): the card in its new cell, before
 * or after the card it was dropped on, or last when it was dropped on the cell itself. Cards are in rank order, so the
 * place in the list is the place in the cell.
 */
export function withMove<T extends Placed>(items: T[], id: string, to: Move): T[] {
  return withMoves(items, [id], to);
}

/**
 * Several cards dropped together (ADR 0058, amended): they land side by side in the order they had on the board,
 * where the card they were carried with was dropped. `keepLanes`: on a board without lanes, each keeps its own.
 */
export function withMoves<T extends Placed>(items: T[], ids: readonly string[], to: Move, keepLanes = false): T[] {
  const moving = new Set(ids);
  const carried = items.filter((i) => moving.has(i.id));
  if (carried.length === 0) return items;
  const rest = items.filter((i) => !moving.has(i.id));
  const anchor = to.before ?? to.after;
  const at = anchor ? rest.findIndex((i) => i.id === anchor) : -1;
  const index = at < 0 ? rest.length : to.before ? at : at + 1;
  const landed = carried.map((i) => ({ ...i, column: to.column, lane: keepLanes ? i.lane : to.lane }));
  return [...rest.slice(0, index), ...landed, ...rest.slice(index)];
}

/** The cards from one to another in a cell, both included, in the cell's order (Shift+click); just `to` when either isn't there. */
export function between(cell: readonly string[], from: string, to: string): string[] {
  const a = cell.indexOf(from);
  const b = cell.indexOf(to);
  if (a < 0 || b < 0) return [to];
  return cell.slice(Math.min(a, b), Math.max(a, b) + 1);
}
