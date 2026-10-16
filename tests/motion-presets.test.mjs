// The motion components' poses (ADR 0058): where things come from in each direction, reduced motion, the stagger's cap
// and the celebration burst. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burst, hiddenPose, SHOWN, staggerDelay, STAGGER, STAGGER_CAP } from '../src/motion/presets.ts';

const offset = (pose) => pose.transform.match(/translate3d\((-?\d+)px, (-?\d+)px, 0px\) scale\(([\d.]+)\)/).slice(1).map(Number);

test('everything settles in place, fully visible', () => {
  assert.deepEqual(SHOWN, { opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' });
});

test('from the start side is the left in English and the right in Arabic', () => {
  assert.deepEqual(offset(hiddenPose('start', { rtl: false })), [-16, 0, 1]);
  assert.deepEqual(offset(hiddenPose('start', { rtl: true })), [16, 0, 1]);
  assert.deepEqual(offset(hiddenPose('end', { rtl: false })), [16, 0, 1]);
  assert.deepEqual(offset(hiddenPose('end', { rtl: true })), [-16, 0, 1]);
});

test('rise comes from below, drop from above, pop from slightly smaller, never from nothing', () => {
  assert.deepEqual(offset(hiddenPose('rise', { rtl: false })), [0, 8, 1]);
  assert.deepEqual(offset(hiddenPose('drop', { rtl: true })), [0, -8, 1]);
  const [, , scale] = offset(hiddenPose('pop', { rtl: false }));
  assert.ok(scale >= 0.9 && scale < 1, `pop starts at ${scale}`);
  for (const kind of ['fade', 'rise', 'drop', 'pop', 'start', 'end']) assert.equal(hiddenPose(kind, { rtl: false }).opacity, 0);
});

test('with reduced motion nothing moves: only the opacity changes', () => {
  for (const kind of ['rise', 'drop', 'pop', 'start', 'end']) {
    assert.deepEqual(offset(hiddenPose(kind, { rtl: true, reduce: true })), [0, 0, 1], kind);
  }
});

test('a list arrives 40 ms apart, and a long one stops waiting after the tenth', () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(3), 3 * STAGGER);
  assert.equal(staggerDelay(500), STAGGER_CAP * STAGGER);
  assert.ok(STAGGER_CAP * STAGGER <= 0.4);
  assert.equal(staggerDelay(-2), 0);
});

test('a burst spreads all around, a short way, the same for the same seed', () => {
  const particles = burst(14, 42);
  assert.equal(particles.length, 14);
  assert.deepEqual(burst(14, 42), particles);
  assert.notDeepEqual(burst(14, 43), particles);
  for (const p of particles) {
    const distance = Math.hypot(p.x, p.y - 12);
    assert.ok(distance >= 38 && distance <= 92, `flies ${distance}px`);
    assert.ok(p.size >= 5 && p.size <= 9 && p.tone >= 0 && p.tone < 4);
  }
  // every side of the point gets some
  assert.ok(particles.some((p) => p.x > 20) && particles.some((p) => p.x < -20) && particles.some((p) => p.y < -10) && particles.some((p) => p.y > 30));
});
