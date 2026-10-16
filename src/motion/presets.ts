// Self-contained (no imports), so the web's node tests can load it as it is.

/** Items of a list arrive 40 ms apart; after the tenth, the rest arrive with it, so a long list never waits. */
export const STAGGER = 0.04;
export const STAGGER_CAP = 10;

/**
 * Where something comes from, and goes back to: `fade` in place, `rise` from a little below, `drop` from a little
 * above (what hangs from the top bar), `pop` from slightly smaller (what opens from a trigger), `start` and `end` from
 * the reading direction's sides.
 */
export type Arrival = 'fade' | 'rise' | 'drop' | 'pop' | 'start' | 'end';

/** A pose Motion animates between. Always the same transform shape, so any two poses interpolate. */
export type Pose = {
  opacity: number;
  transform: string;
};

const pose = (opacity: number, x = 0, y = 0, scale = 1): Pose => ({
  opacity,
  transform: `translate3d(${x}px, ${y}px, 0px) scale(${scale})`,
});

/** Where everything settles. */
export const SHOWN: Pose = pose(1);

/**
 * The hidden pose for an arrival. `start` is the left in English and the right in Arabic; with reduced motion
 * nothing moves and only the opacity changes.
 */
export function hiddenPose(kind: Arrival, options: { rtl: boolean; reduce?: boolean; distance?: number }): Pose {
  if (options.reduce || kind === 'fade') return pose(0);
  const d = options.distance ?? (kind === 'start' || kind === 'end' ? 16 : 8);
  const startSide = options.rtl ? d : -d;
  switch (kind) {
    case 'rise':
      return pose(0, 0, d);
    case 'drop':
      return pose(0, 0, -d);
    case 'pop':
      return pose(0, 0, 0, 0.96);
    case 'start':
      return pose(0, startSide);
    case 'end':
      return pose(0, -startSide);
  }
}

/** How long the item at this place in a list waits before it arrives (capped, so long lists don't wait). */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), STAGGER_CAP) * STAGGER;
}

/** One particle of a burst: where it flies to, how it turns, its size and colour slot. */
export interface Particle {
  x: number;
  y: number;
  rotate: number;
  size: number;
  tone: number;
  round: boolean;
}

/**
 * A small burst (Celebrate): particles spread evenly around the point, each a little off its line, flying 40 to 90 px
 * and falling a little at the end. Seeded, so the same seed gives the same burst.
 */
export function burst(count: number, seed = 1): Particle[] {
  let s = seed >>> 0 || 1;
  const random = () => {
    // xorshift32: tiny and seedable
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.6;
    const distance = 40 + random() * 50;
    return {
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance + 12),
      rotate: Math.round((random() - 0.5) * 360),
      size: 5 + Math.round(random() * 4),
      tone: i % 4,
      round: random() > 0.5,
    };
  });
}
