import type { Transition } from 'motion/react';

/**
 * Motion's ingredients, kept in one place (ADR 0058). The curves are the theme's easing tokens (easings.out, inOut,
 * drawer), so a CSS transition and a Motion animation move alike.
 */
export const curves = {
  /** Entering and leaving: quick at first, settling softly. The default. */
  out: [0.23, 1, 0.32, 1],
  /** Something moving or changing shape on screen. */
  inOut: [0.77, 0, 0.175, 1],
  /** Drawers and sheets. */
  drawer: [0.32, 0.72, 0, 1],
} as const;

/** Seconds. Interface motion stays under 300 ms; a number counting up and a burst take longer, being rare. */
export const durations = {
  press: 0.16,
  quick: 0.15,
  base: 0.2,
  panel: 0.25,
  count: 0.6,
  burst: 0.7,
} as const;

/** Springs carry speed through an interruption: soft by default, snappy for indicators and toggles, bouncy for delights. */
export const springs = {
  soft: { type: 'spring', duration: 0.35, bounce: 0.1 },
  snappy: { type: 'spring', duration: 0.25, bounce: 0 },
  bouncy: { type: 'spring', duration: 0.5, bounce: 0.3 },
} as const satisfies Record<string, Transition>;
