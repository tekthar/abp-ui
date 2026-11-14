import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { flipTransform, liftOf, relativeTo, type Box } from './flip-math';
import { useMotionSetting } from './setting';
import { curves } from './tokens';

/**
 * Sliding to a new place (ADR 0058, amended): FLIP on the browser's Web Animations instead of Motion's layout features.
 * Something that moved is drawn where it was, then slides home on the on-screen curve; nothing plays with less
 * motion. Used by the sliding marks, items that change places, list rows and the board's cards.
 */
export const SLIDE_MS = 250;
const SLIDE_EASING = `cubic-bezier(${curves.inOut.join(', ')})`;
const SLIDE_ID = 'abp-slide';

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

export interface SlideOptions {
  /** Undo a change of size too (a mark moving between items of different widths). */
  scale?: boolean;
  /** Drawn above its neighbours while it slides, higher the farther it travels (items that change places). */
  lift?: boolean;
}

/** Slides an element from where it was to where it is (both measured the same way); nothing when it hasn't moved. */
export function slide(element: HTMLElement, from: Box, to: Box, { scale = false, lift = false }: SlideOptions = {}): void {
  const transform = flipTransform(from, to, scale);
  if (!transform || typeof element.animate !== 'function') return;
  // Only while it slides: z-index needs a position, and one the element already has is kept.
  const raised: Keyframe = lift ? { zIndex: liftOf(from, to), ...(getComputedStyle(element).position === 'static' ? { position: 'relative' } : {}) } : {};
  const animation = element.animate(
    [
      { transform, transformOrigin: 'top left', ...raised },
      { transform: 'none', transformOrigin: 'top left', ...raised },
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

/** How far a slide still playing has the element drawn from its place. */
function slideOffset(element: HTMLElement): { x: number; y: number } {
  if (!element.getAnimations().some((a) => a.id === SLIDE_ID)) return { x: 0, y: 0 };
  const m = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  return { x: m.m41, y: m.m42 };
}

/**
 * The items in a container, how far each is drawn from its place by a slide still playing, and their places against
 * the container (without those slides). `settle` ends the slides first (the new ones start from where these had them
 * drawn); without it, they play on.
 */
function placesIn(root: HTMLElement, settle: boolean) {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  // All reads, then all writes, then all reads: one layout, however many cards.
  const offsets = items.map(slideOffset);
  if (settle) {
    for (const item of items) for (const animation of item.getAnimations()) if (animation.id === SLIDE_ID) animation.cancel();
  }
  const container = boxOf(root);
  const places = new Map<string, Box>();
  items.forEach((item, i) => {
    const box = relativeTo(boxOf(item), container, root.scrollLeft, root.scrollTop);
    places.set(item.dataset.slide!, settle ? box : { ...box, left: box.left - offsets[i].x, top: box.top - offsets[i].y });
  });
  return { items, offsets, places };
}

/**
 * After each change of `token`, every element in the container carrying `data-slide` (its id) that moved since the
 * last change slides from where it was. Places are measured against the container (its scroll included), so a scroll
 * between two changes is never taken for a move.
 *
 * Returns `note`: it takes where everything is drawn right now as the place to slide from, for a change that something
 * else has already shown on screen (a drop, after the drag moved the cards around).
 */
export function useSlideItems(container: RefObject<HTMLElement | null>, token: unknown, options: SlideItemsOptions = {}): () => void {
  const { reduce } = useMotionSetting();
  const places = useRef(new Map<string, Box>());
  const { paused = false, skip } = options;

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const { items, offsets, places: next } = placesIn(root, true);
    if (!paused && !reduce) {
      const skipped = skip?.() ?? null;
      items.forEach((item, i) => {
        const id = item.dataset.slide!;
        const before = places.current.get(id);
        // From where it's drawn: its place then, and as far from it as a slide still playing had it.
        const drawn = before && { ...before, left: before.left + offsets[i].x, top: before.top + offsets[i].y };
        if (drawn && id !== skipped) slide(item, drawn, next.get(id)!, { lift: true });
      });
    }
    places.current = next;
    // Only a new token means the items changed; the rest of the options are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return useCallback(() => {
    if (container.current) places.current = placesIn(container.current, false).places;
  }, [container]);
}
