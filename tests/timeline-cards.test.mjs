// The card timeline's placement (UI round 9, step 48): cards on their real dates, packed into lanes.
// `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeCards } from '../src/components/timeline-cards-math.ts';

test('a due-only card starts on its due day', () => {
  const { cards } = placeCards([{ id: 'a', due: '2026-11-03' }, { id: 'b', due: '2026-11-07' }], '2026-11-01', 7, 'week', 186);
  const a = cards.find((c) => c.id === 'a');
  const b = cards.find((c) => c.id === 'b');
  assert.equal(a.offset, 2 * 186 + 3);
  assert.equal(a.width, 176);
  // A week's column holds the whole card, the last day's too.
  assert.equal(b.offset, 6 * 186 + 3);
  assert.equal(b.range, false);
});

test('in a month a card that would run past the period ends on its due day instead', () => {
  const { cards } = placeCards([{ id: 'z', due: '2026-11-30' }], '2026-11-01', 30, 'month', 42);
  assert.equal(cards[0].offset, 30 * 42 - 3 - 228);
});

test('a start date makes a range; one cut by the period says which edge', () => {
  const { cards } = placeCards([{ id: 'r', start: '2026-10-29', due: '2026-11-02' }], '2026-11-01', 7, 'week', 186);
  assert.deepEqual(cards[0], { id: 'r', offset: 3, width: 2 * 186 - 6, lane: 0, range: true, cutStart: true, cutEnd: false });
});

test('a start after the due date is ignored: the card is a due date only', () => {
  const { cards } = placeCards([{ id: 'x', start: '2026-11-05', due: '2026-11-02' }], '2026-11-01', 7, 'week', 186);
  assert.equal(cards[0].range, false);
  assert.equal(cards[0].offset, 186 + 3);
});

test('records outside the period are left out', () => {
  const { cards } = placeCards([{ id: 'early', due: '2026-10-31' }, { id: 'late', start: '2026-11-09', due: '2026-11-12' }], '2026-11-01', 7, 'week', 186);
  assert.equal(cards.length, 0);
});

test('cards that would touch go to the next lane; a lane is reused once there is room', () => {
  const { cards, lanes } = placeCards(
    [{ id: 'a', due: '2026-11-01' }, { id: 'b', due: '2026-11-01' }, { id: 'c', due: '2026-11-02' }, { id: 'd', due: '2026-11-04' }],
    '2026-11-01', 7, 'week',
  );
  const lane = Object.fromEntries(cards.map((c) => [c.id, c.lane]));
  assert.equal(lane.a, 0);
  assert.equal(lane.b, 1);
  // c starts 186 px in; a ends at 179 + 24 room = 203 > 189, so not lane 0; b likewise; a third lane.
  assert.equal(lane.c, 2);
  // d starts at 3 * 186 + 3 = 561: lane 0 is free again.
  assert.equal(lane.d, 0);
  assert.equal(lanes, 3);
});

test('a month packs narrow columns with cards wider than a day', () => {
  const { cards } = placeCards([{ id: 'a', due: '2026-11-01' }, { id: 'b', due: '2026-11-03' }, { id: 'c', due: '2026-11-15' }], '2026-11-01', 30, 'month', 42);
  const lane = Object.fromEntries(cards.map((c) => [c.id, c.lane]));
  assert.equal(cards.find((c) => c.id === 'a').width, 228);
  assert.equal(lane.b, 1, 'two days later still overlaps a 228 px card');
  assert.equal(lane.c, 0);
});
