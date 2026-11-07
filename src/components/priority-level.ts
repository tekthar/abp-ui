/**
 * How many of the four bars a priority fills, and its colour, from where it sits in its list (`rank` 0 is the highest
 * of `of`): the top of the list reads urgent (red), its middle as a warning (orange), its bottom calm (blue).
 */
export function priorityLevel(rank: number, of: number): { bars: number; palette: 'red' | 'orange' | 'blue' | 'gray' } {
  if (of <= 0 || rank < 0 || rank >= of) return { bars: 0, palette: 'gray' };
  // The share of the list at or below this priority: 1 for the highest, 1/of for the lowest.
  const share = (of - rank) / of;
  const bars = Math.max(1, Math.min(4, Math.round(share * 4)));
  const palette = share > 0.7 ? 'red' : share > 0.45 ? 'orange' : 'blue';
  return { bars, palette };
}
