import { defineTokens } from '@chakra-ui/react';
import type { AbpBrand } from './brand';

/**
 * Raw scales, from the host's brand (brand.ts). Components never use these directly: they use the semantic tokens in
 * semantic-tokens.ts (bg, fg, border, accent, success, statusCategory ...), which pick a step per colour mode. The raw
 * scales exist so the semantic layer has one place to point at.
 */

function ramp<T extends Record<string | number, string>>(scale: T) {
  return Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, { value: v }])) as {
    [K in keyof T]: { value: string };
  };
}

/** The brand's scales as colour tokens; Chakra's own recipes speak "gray", pointed at the brand's neutral so they match. */
export function colorsFor(brand: AbpBrand) {
  const grayAlias = Object.fromEntries(Object.keys(brand.neutral).map((k) => [k, { value: `{colors.neutral.${k}}` }]));
  return defineTokens.colors({
    neutral: ramp(brand.neutral),
    gray: grayAlias,
    accent: ramp(brand.accent),
    green: ramp(brand.green),
    amber: ramp(brand.amber),
    red: ramp(brand.red),
    blue: ramp(brand.blue),
  });
}

/**
 * Fonts. The host loads the files and sets the CSS variables, named with its prefix (a Next.js host uses next/font):
 *   --{prefix}-font-sans    Almarai          (Latin and Arabic, one face, 400 and 700)
 *   --{prefix}-font-arabic  optional         (a host that loads a separate Arabic face; Almarai covers Arabic itself)
 *   --{prefix}-font-mono    IBM Plex Mono    (record keys, code, ids)
 * Without the variables the stack falls back to a locally installed Almarai, then Plex, then the system UI font.
 */
export function fontsFor(prefix: string) {
  const sansStack = `var(--${prefix}-font-sans, 'Almarai'), var(--${prefix}-font-arabic, 'Almarai'), 'IBM Plex Sans', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, 'Segoe UI', sans-serif`;
  return defineTokens.fonts({
    body: { value: sansStack },
    heading: { value: sansStack },
    mono: { value: `var(--${prefix}-font-mono, 'IBM Plex Mono'), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` },
  });
}

/** Dense type scale: body copy is `md` (14px); tables and controls use `sm`/`md`. */
export const fontSizes = defineTokens.fontSizes({
  '2xs': { value: '0.6875rem' }, // 11px
  xs: { value: '0.75rem' }, // 12px
  sm: { value: '0.8125rem' }, // 13px
  md: { value: '0.875rem' }, // 14px
  lg: { value: '1rem' }, // 16px
  xl: { value: '1.125rem' }, // 18px
  '2xl': { value: '1.375rem' }, // 22px
  '3xl': { value: '1.75rem' }, // 28px
  '4xl': { value: '2.25rem' }, // 36px
});

// Almarai has two weights in the design (400, 700). The names the UI uses resolve to them
// explicitly, so the Plex fallback (scripts Almarai lacks) draws the same weights rather than its own 500 and 600.
export const fontWeights = defineTokens.fontWeights({
  normal: { value: '400' },
  medium: { value: '400' },
  semibold: { value: '700' },
  bold: { value: '700' },
});

export const lineHeights = defineTokens.lineHeights({
  tight: { value: '1.25' },
  snug: { value: '1.375' },
  normal: { value: '1.5' },
  relaxed: { value: '1.625' },
});

export const radii = defineTokens.radii({
  none: { value: '0' },
  '2xs': { value: '0.0625rem' }, // 1px
  xs: { value: '0.125rem' }, // 2px
  sm: { value: '0.25rem' }, // 4px
  md: { value: '0.375rem' }, // 6px
  lg: { value: '0.5rem' }, // 8px: the largest radius the UI uses
  full: { value: '9999px' },
});

/** Layout sizes used by the shell components. */
export const sizes = defineTokens.sizes({
  sidebar: { value: '15rem' },
  sidebarRail: { value: '4rem' },
  topbar: { value: '3.5rem' },
  content: { value: '80rem' },
  /** The widest a form's field grows: pages use the whole width, a single field never stretches across it. */
  form: { value: '48rem' },
  sidePanel: { value: '20rem' },
  labelColumn: { value: '10rem' },
  control: {
    xs: { value: '1.5rem' }, // 24px
    sm: { value: '1.75rem' }, // 28px
    md: { value: '2rem' }, // 32px
    lg: { value: '2.25rem' }, // 36px
  },
});

/** Named layers on top of Chakra's (dropdown 1000, modal 1400, toast 1700, tooltip 1800 ...). */
export const zIndex = defineTokens.zIndex({
  topbar: { value: 20 },
  sidebar: { value: 30 },
});

export const durations = defineTokens.durations({
  instant: { value: '50ms' },
  fast: { value: '120ms' },
  press: { value: '160ms' },
  moderate: { value: '200ms' },
  slow: { value: '300ms' },
});

/** The motion components (src/motion/tokens.ts) use the same curves, so CSS and Motion move alike (ADR 0058). */
export const easings = defineTokens.easings({
  standard: { value: 'cubic-bezier(0.2, 0, 0, 1)' },
  exit: { value: 'cubic-bezier(0.3, 0, 1, 1)' },
  /** Entering and leaving: quick at first, settling softly. */
  out: { value: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  /** Moving or changing shape on screen. */
  inOut: { value: 'cubic-bezier(0.77, 0, 0.175, 1)' },
  /** Drawers and sheets. */
  drawer: { value: 'cubic-bezier(0.32, 0.72, 0, 1)' },
});

/** Every token, for a prefix (the fonts' variables) and a brand (the colours). */
export function tokensFor(prefix: string, brand: AbpBrand) {
  return { colors: colorsFor(brand), fonts: fontsFor(prefix), fontSizes, fontWeights, lineHeights, radii, sizes, zIndex, durations, easings };
}
