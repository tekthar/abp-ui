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
  const item = items.find((i) => i.id === id);
  if (!item) return items;
  const rest = items.filter((i) => i.id !== id);
  const anchor = to.before ?? to.after;
  const at = anchor ? rest.findIndex((i) => i.id === anchor) : -1;
  const index = at < 0 ? rest.length : to.before ? at : at + 1;
  return [...rest.slice(0, index), { ...item, column: to.column, lane: to.lane }, ...rest.slice(index)];
}
