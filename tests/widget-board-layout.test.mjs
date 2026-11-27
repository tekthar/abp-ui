// The widget board's layout (src/components/widget-board/layout.ts): 60 tracks, heights from content, packed in order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dropTarget, fit, fromTwelve, keyMove, pack, renumber, resize, snap, spanPx, tracksFor, appendAt, GAP, TRACKS,
} from '../src/components/widget-board/layout.ts';

const H = (entries) => new Map(Object.entries(entries));
const at = (placed, id) => placed.find((p) => p.id === id);

test('side by side, under one another, and into the space under a shorter one', () => {
  const items = [
    { id: 'a', x: 0, y: 0, w: 30 },
    { id: 'b', x: 30, y: 1, w: 30 },
    { id: 'c', x: 30, y: 2, w: 30 },
    { id: 'd', x: 0, y: 3, w: 60 },
  ];
  const placed = pack(items, H({ a: 300, b: 100, c: 100, d: 50 }));
  assert.deepEqual([at(placed, 'a').top, at(placed, 'b').top], [0, 0], 'a and b side by side');
  assert.equal(at(placed, 'c').top, 100 + GAP, 'c under the shorter b, beside a');
  assert.equal(at(placed, 'd').top, 300 + GAP, 'a full-width d under the taller of the two');
});

test('nothing overlaps, whatever the order and widths', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ id: `w${i}`, x: (i * 17) % 50, y: i, w: 10 + ((i * 13) % 40) }));
  const heights = H(Object.fromEntries(items.map((i, n) => [i.id, 80 + ((n * 37) % 200)])));
  const placed = pack(items, heights);
  for (const a of placed) {
    for (const b of placed) {
      if (a === b) continue;
      const cols = a.x < b.x + b.w && b.x < a.x + a.w;
      const rows = a.top < b.top + b.height && b.top < a.top + a.height;
      assert.ok(!(cols && rows), `${a.id} and ${b.id} overlap`);
    }
  }
});

test('narrow: every widget full width, one under another in order; expanded: full width in place', () => {
  const items = [{ id: 'a', x: 30, y: 0, w: 30 }, { id: 'b', x: 0, y: 1, w: 30 }];
  const narrow = pack(items, H({ a: 100, b: 100 }), { narrow: true });
  assert.deepEqual(narrow.map((p) => [p.id, p.x, p.w, p.top]), [['a', 0, 60, 0], ['b', 0, 60, 100 + GAP]]);
  const wide = pack(items, H({ a: 100, b: 100 }), { expanded: new Set(['a']) });
  assert.deepEqual([at(wide, 'a').w, at(wide, 'b').top], [60, 100 + GAP]);
});

test('y is renumbered 0, 1, 2… in (y, x) order, so a stored layout never drifts', () => {
  const items = [{ id: 'b', x: 30, y: 4, w: 30 }, { id: 'a', x: 0, y: 4, w: 30 }, { id: 'c', x: 0, y: 1.5, w: 60 }];
  assert.deepEqual(renumber(items).map((i) => [i.id, i.y]), [['b', 2], ['a', 1], ['c', 0]]);
  assert.deepEqual(appendAt(renumber(items), 30), { x: 0, y: 3 }, 'the last (b) ends the row: at the start');
  assert.deepEqual(appendAt([{ id: 'a', x: 0, y: 0, w: 30 }], 20), { x: 30, y: 1 }, 'beside the last when it fits');
  assert.deepEqual(appendAt([]), { x: 0, y: 0 });
});

test('a 12-column layout is read on 60 tracks, its order kept', () => {
  const twelve = [{ id: 'a', x: 6, y: 0, w: 6, h: 4 }, { id: 'b', x: 0, y: 0, w: 6, h: 4 }, { id: 'c', x: 0, y: 4, w: 12, h: 2 }];
  assert.deepEqual(fromTwelve(twelve).map((i) => [i.id, i.x, i.w, i.y]), [['a', 30, 30, 1], ['b', 0, 30, 0], ['c', 0, 60, 2]]);
});

test('widths: tracks to px and back, kept whole inside the row', () => {
  assert.equal(spanPx(TRACKS, 1184), 1184);
  assert.equal(spanPx(30, 1184), 600 - GAP, 'half a row: 30 tracks of 20 px, its gap left out');
  assert.equal(tracksFor(360, 1184), 19);
  assert.deepEqual(fit({ id: 'a', x: 55, y: -1, w: 20 }), { id: 'a', x: 40, y: 0, w: 20 });
  assert.deepEqual(resize({ id: 'a', x: 40, y: 0, w: 20 }, 40), { id: 'a', x: 20, y: 0, w: 40 }, 'pushed back to stay whole');
  assert.deepEqual(resize({ id: 'a', x: 0, y: 0, w: 20 }, 4, 12), { id: 'a', x: 0, y: 0, w: 12 }, 'never under its minimum');
});

test('a start snaps to a neighbour’s edge within 2 tracks', () => {
  const others = [{ x: 0, w: 30 }];
  assert.equal(snap(31, 20, others), 30);
  assert.equal(snap(34, 20, others), 34);
  assert.equal(snap(59, 20, others), 40, 'kept inside the row');
});

test('a drop over the top half of a widget takes its place; lower down goes after it', () => {
  const items = [{ id: 'a', x: 0, y: 0, w: 60 }, { id: 'b', x: 0, y: 1, w: 60 }, { id: 'm', x: 0, y: 2, w: 30 }];
  const placed = pack(items, H({ a: 200, b: 200, m: 100 }));
  assert.deepEqual(dropTarget('m', { start: 0, top: 10 }, 30, placed, items, 1184), { x: 0, y: -0.5 }, 'before a');
  assert.deepEqual(dropTarget('m', { start: 0, top: 150 }, 30, placed, items, 1184), { x: 0, y: 0.5 }, 'after a, before b');
  const moved = renumber(items.map((i) => (i.id === 'm' ? { ...i, y: -0.5 } : i)));
  assert.deepEqual(moved.map((i) => [i.id, i.y]), [['a', 1], ['b', 2], ['m', 0]]);
});

test('keyboard moves: sideways by tracks, past the neighbour above or below, to the start or the end', () => {
  const items = [{ id: 'a', x: 0, y: 0, w: 30 }, { id: 'b', x: 0, y: 1, w: 30 }, { id: 'c', x: 0, y: 2, w: 30 }];
  const placed = pack(items, H({ a: 100, b: 100, c: 100 }));
  const b = items[1];
  assert.equal(keyMove(b, { side: 5 }, placed, items).x, 5);
  assert.equal(keyMove({ ...b, x: 28 }, { side: 5 }, placed, items).x, 30, 'kept inside the row');
  assert.equal(keyMove(b, { vertical: 'up' }, placed, items).y, -0.5);
  assert.equal(keyMove(b, { vertical: 'down' }, placed, items).y, 2.5);
  assert.deepEqual(keyMove(items[0], { vertical: 'up' }, placed, items), items[0], 'nothing above: stays');
  assert.equal(keyMove(b, { home: true }, placed, items).y, -1);
  assert.equal(keyMove(b, { end: true }, placed, items).y, 3);
});
