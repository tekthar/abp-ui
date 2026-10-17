import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flipTransform, relativeTo, type Box } from './flip-math';
import { useMotionSetting } from './setting';
import { curves } from './tokens';

/**
 * Sliding to a new place (ADR 0058, amended): FLIP on the browser's Web Animations instead of Motion's layout features.
 * Something that moved is drawn where it was, then slides home on Toda's on-screen curve; nothing plays with less
 * motion. Used by the sliding marks, items that change places, list rows and the board's cards.
 */
export const SLIDE_MS = 250;
const SLIDE_EASING = `cubic-bezier(${curves.inOut.join(', ')})`;
const SLIDE_ID = 'toda-slide';

const boxOf = (element: Element): Box => {
  const r = element.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** Where an element is now, without a slide still playing on it, relative to its container when it has one. */
export function placeOf(element: HTMLElement, container?: Element | null): Box {
  for (const animation of element.getAnimations()) {
    if (animation.id === SLIDE_ID) animation.cancel();
  }
  const box = boxOf(element);
  return container ? relativeTo(box, boxOf(container), container.scrollLeft, container.scrollTop) : box;
}

/** Slides an element from where it was to where it is (both measured the same way); nothing when it hasn't moved. */
export function slide(element: HTMLElement, from: Box, to: Box, scale = false): void {
  const transform = flipTransform(from, to, scale);
  if (!transform || typeof element.animate !== 'function') return;
  const animation = element.animate(
    [
      { transform, transformOrigin: 'top left' },
      { transform: 'none', transformOrigin: 'top left' },
    ],
    { duration: SLIDE_MS, easing: SLIDE_EASING },
  );
  animation.id = SLIDE_ID;
}

export interface SlideItemsOptions {
  /** Don't slide now (while the person drags, say); places are still noted. */
  paused?: boolean;
  /** One item not to slide this time (the card the person just dropped where they wanted it). */
  skip?: () => string | null;
}

/**
 * After each change of `token`, every element in the container carrying `data-slide` (its id) that moved since the
 * last change slides from where it was. Places are measured against the container (its scroll included), so a scroll
 * between two changes is never taken for a move.
 */
export function useSlideItems(container: RefObject<HTMLElement | null>, token: unknown, options: SlideItemsOptions = {}): void {
  const { reduce } = useMotionSetting();
  const places = useRef(new Map<string, Box>());
  const { paused = false, skip } = options;

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
    const next = new Map<string, Box>();
    for (const item of items) next.set(item.dataset.slide!, placeOf(item, root));
    if (!paused && !reduce) {
      const skipped = skip?.() ?? null;
      for (const item of items) {
        const id = item.dataset.slide!;
        const before = places.current.get(id);
        if (before && id !== skipped) slide(item, before, next.get(id)!);
      }
    }
    places.current = next;
    // Only a new token means the items changed; the rest of the options are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
