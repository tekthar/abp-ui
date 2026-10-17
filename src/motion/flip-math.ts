// Self-contained (no imports), so the UI package's node tests can load it as it is.

/** A box on the page: where it is and how big. */
export type Box = { left: number; top: number; width: number; height: number };

/**
 * FLIP's "invert": the transform that puts something now at `next` back where it was (`prev`), to animate from there to
 * nowhere. Null when it hasn't really moved (under half a pixel, and the same size), so nothing plays. With `scale`, a
 * change of size is undone too (a mark sliding between items of different widths).
 */
export function flipTransform(prev: Box, next: Box, scale: boolean): string | null {
  const dx = prev.left - next.left;
  const dy = prev.top - next.top;
  const sx = scale && next.width > 0 ? prev.width / next.width : 1;
  const sy = scale && next.height > 0 ? prev.height / next.height : 1;
  const moved = Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5;
  const resized = Math.abs(sx - 1) >= 0.005 || Math.abs(sy - 1) >= 0.005;
  if (!moved && !resized) return null;
  const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
  return resized
    ? `translate(${round(dx, 2)}px, ${round(dy, 2)}px) scale(${round(sx, 4)}, ${round(sy, 4)})`
    : `translate(${round(dx, 2)}px, ${round(dy, 2)}px)`;
}

/** A box relative to another (its scrolling container), so scrolling between two measurements isn't taken for a move. */
export function relativeTo(box: Box, container: Box, scrollLeft = 0, scrollTop = 0): Box {
  return { left: box.left - container.left + scrollLeft, top: box.top - container.top + scrollTop, width: box.width, height: box.height };
}

/**
 * A CSS cubic-bezier curve as a function of progress (0 to 1), for what animates in a frame loop rather than CSS or
 * Web Animations (a number counting up), so it eases exactly as everything else does.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3;
  const dx = (t: number) => 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t ** 2;
  return (progress: number) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    // Newton's method on x(t) = progress, then y at that t; bisection when the slope is too flat.
    let t = progress;
    for (let i = 0; i < 8; i++) {
      const error = bx(t) - progress;
      if (Math.abs(error) < 1e-6) return by(t);
      const slope = dx(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    t = progress;
    for (let i = 0; i < 30; i++) {
      if (bx(t) < progress) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}
