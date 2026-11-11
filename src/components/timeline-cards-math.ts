/**
 * Where the card timeline (UI round 9, step 48) puts each record: one period (a week or a month) of day columns, a card
 * per record on its real dates, packed into lanes. A record with a start date before its due date spans the two; a record
 * with only a due date starts on that day (or ends on it when it would run past the period). Cards are never moved to
 * other dates. Lanes are packed first-fit in date order with room between cards, for the canvas's staggered rhythm.
 */

export interface CardDates {
  id: string;
  /** ISO day the record starts, when it has one. Ignored when after `due`. */
  start?: string | null;
  /** ISO day the record is due. */
  due: string;
}

export interface PlacedCard {
  id: string;
  /** From the grid's start edge, px. */
  offset: number;
  width: number;
  lane: number;
  /** Spans a start to a due date. */
  range: boolean;
  /** The range starts before the period (its start edge is cut). */
  cutStart: boolean;
  /** The range ends after the period. */
  cutEnd: boolean;
}

const DAY = 86_400_000;

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
}

/**
 * The column width per scale: a week's days are wide enough for a card (140 px at least), a month's narrow (36 px at
 * least); given the width there is, the columns stretch to fill it.
 */
export function columnWidth(scale: 'week' | 'month', days = scale === 'week' ? 7 : 31, available = 0): number {
  const least = scale === 'week' ? 140 : 36;
  return Math.max(least, Math.floor(available / days));
}

/**
 * Places the records that fall in the period (`first`, `days` long) and packs them into lanes. Records due before the
 * period, or starting after it, are left out. Returns the cards in lane order and how many lanes there are.
 */
export function placeCards(items: CardDates[], first: string, days: number, scale: 'week' | 'month', colW = columnWidth(scale)): { cards: PlacedCard[]; lanes: number } {
  const gridW = days * colW;
  const f = dayNumber(first);
  const dueW = scale === 'week' ? colW - 10 : 228;
  const room = scale === 'week' ? 24 : colW * 2;
  const placed: Omit<PlacedCard, 'lane'>[] = [];
  const order = items
    .map((it) => {
      const d = dayNumber(it.due) - f;
      const s0 = it.start ? dayNumber(it.start) - f : null;
      const s = s0 != null && s0 <= d ? s0 : null;
      return { it, d, s };
    })
    .filter(({ d, s }) => d >= 0 && (s ?? d) < days)
    .sort((a, b) => (a.s ?? a.d) - (b.s ?? b.d) || a.d - b.d);
  for (const { it, d, s } of order) {
    if (s != null && s < d) {
      const l0 = Math.max(0, s);
      const l1 = Math.min(days - 1, d);
      placed.push({ id: it.id, offset: l0 * colW + 3, width: Math.max(28, (l1 - l0 + 1) * colW - 6), range: true, cutStart: s < 0, cutEnd: d > days - 1 });
    } else {
      const width = Math.min(dueW, gridW - 6);
      let offset = d * colW + 3;
      if (offset + width > gridW - 3) offset = Math.max(3, (d + 1) * colW - 3 - width);
      placed.push({ id: it.id, offset, width, range: false, cutStart: false, cutEnd: false });
    }
  }
  const ends: number[] = [];
  const cards: PlacedCard[] = [];
  for (const c of [...placed].sort((a, b) => a.offset - b.offset || a.width - b.width)) {
    let lane = ends.findIndex((end) => end + room <= c.offset);
    if (lane < 0) {
      lane = ends.length;
      ends.push(-Infinity);
    }
    ends[lane] = c.offset + c.width;
    cards.push({ ...c, lane });
  }
  cards.sort((a, b) => a.lane - b.lane || a.offset - b.offset);
  return { cards, lanes: ends.length };
}
