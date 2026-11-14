// The FLIP helper's arithmetic (ADR 0058, amended): how far something moved, scrolling not taken for a move, and the
// curve that a number counting up follows. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubicBezier, flipTransform, liftOf, relativeTo } from '../src/motion/flip-math.ts';

const box = (left, top, width = 100, height = 20) => ({ left, top, width, height });

test('something that moved is put back where it was, then slides home', () => {
  assert.equal(flipTransform(box(10, 40), box(110, 40), false), 'translate(-100px, 0px)');
  assert.equal(flipTransform(box(0, 300), box(0, 120), false), 'translate(0px, 180px)');
});

test('something that stayed (under half a pixel) plays nothing', () => {
  assert.equal(flipTransform(box(10, 40), box(10.3, 40.2), false), null);
  assert.equal(flipTransform(box(10, 40, 100), box(10, 40, 160), false), null, 'a size change alone counts only with scale');
});

test('a mark sliding between items of different widths is undone in size too', () => {
  assert.equal(flipTransform(box(0, 0, 80, 2), box(120, 0, 40, 2), true), 'translate(-120px, 0px) scale(2, 1)');
  assert.equal(flipTransform(box(0, 0, 50, 20), box(0, 0, 100, 20), true), 'translate(0px, 0px) scale(0.5, 1)');
});

test('measured against its scrolling container, a scroll is not a move', () => {
  const container = box(0, 100, 800, 600);
  const before = relativeTo(box(200, 150), container, 0, 0);
  // the container scrolled 120 px sideways: the card's screen position moved, its place in the container didn't
  const after = relativeTo(box(80, 150), container, 120, 0);
  assert.equal(flipTransform(before, after, false), null);
});

test('the farther something travels, the higher it is drawn, within 1 to 9', () => {
  assert.equal(liftOf(box(0, 0), box(0, 98)), 1, 'a card making room one place down');
  assert.equal(liftOf(box(646, 253), box(271, 253)), 4, 'a card crossing to the next column passes over it');
  assert.ok(liftOf(box(0, 0), box(375, 0)) > liftOf(box(0, 0), box(0, 98)));
  assert.equal(liftOf(box(0, 0), box(5000, 4000)), 9, 'never above what floats over the page');
});

test("the curve starts and ends where it should and follows the out curve", () => {
  const out = cubicBezier(0.23, 1, 0.32, 1);
  assert.equal(out(0), 0);
  assert.equal(out(1), 1);
  const samples = [0.1, 0.25, 0.5, 0.75, 0.9].map(out);
  for (let i = 1; i < samples.length; i++) assert.ok(samples[i] > samples[i - 1], 'it only goes forward');
  assert.ok(out(0.25) > 0.7, `quick at first (${out(0.25)})`);
  assert.ok(Math.abs(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.4) - 0.4) < 1e-4, 'a straight curve is linear');
});
