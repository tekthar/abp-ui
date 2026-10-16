import { defineTokens } from '@chakra-ui/react';

/**
 * Raw scales. Components never use these directly: they use the semantic tokens in
 * semantic-tokens.ts (bg, fg, border, accent, success, statusCategory ...), which pick a step
 * per colour mode. The raw scales exist so the semantic layer has one place to point at.
 */

// Neutrals with a slight cool (blue-grey, ~220deg) bias. 25..950, light to dark.
const neutral = {
  0: '#FFFFFF',
  25: '#FBFCFD',
  50: '#F6F7F9',
  100: '#EEF0F3',
  200: '#E2E5EA',
  300: '#CED3DA',
  400: '#A7AEB9',
  500: '#7D8593',
  600: '#5E6673',
  700: '#454C57',
  800: '#2F343C',
  850: '#262A31',
  900: '#1D2025',
  925: '#17191D',
  950: '#111316',
} as const;

// The one accent: a calm petrol blue-green. Distinct from info (blue) and success (green).
const accent = {
  50: '#ECF6F8',
  100: '#D2EBF0',
  200: '#A6D6E0',
  300: '#6FBACB',
  400: '#3B9AB0',
  500: '#15798F',
  600: '#0F6478',
  700: '#0E5162',
  800: '#0E414E',
  900: '#0C323C',
  950: '#082128',
} as const;

// Status ramps. Separate from the accent so "success" never reads as "brand".
const green = {
  50: '#EDF8F1',
  100: '#D3EFDD',
  200: '#A8DDBC',
  300: '#74C595',
  400: '#45A872',
  500: '#2A8C58',
  600: '#1F7247',
  700: '#1A5B3A',
  800: '#164830',
  900: '#123826',
  950: '#0A2217',
} as const;

const amber = {
  50: '#FDF6E7',
  100: '#FAE9C2',
  200: '#F4D286',
  300: '#EBB548',
  400: '#DB971F',
  500: '#BD7A0E',
  600: '#9A600B',
  700: '#7A4B0D',
  800: '#613D10',
  900: '#4D3110',
  950: '#2E1C07',
} as const;

const red = {
  50: '#FDF0EF',
  100: '#FADAD7',
  200: '#F4B4AE',
  300: '#EA857C',
  400: '#DD5A50',
  500: '#C93D33',
  600: '#A92F27',
  700: '#8A2721',
  800: '#6E221D',
  900: '#571D19',
  950: '#34100D',
} as const;

const blue = {
  50: '#EEF4FD',
  100: '#D8E5FA',
  200: '#B1CBF4',
  300: '#82AAEB',
  400: '#5587DF',
  500: '#3769CC',
  600: '#2A54AD',
  700: '#24458C',
  800: '#213A70',
  900: '#1D3159',
  950: '#121E37',
} as const;

function ramp<T extends Record<string | number, string>>(scale: T) {
  return Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, { value: v }])) as {
    [K in keyof T]: { value: string };
  };
}

/** Chakra's own recipes speak "gray"; point it at the Toda neutral scale so they match. */
const grayAlias = Object.fromEntries(
  Object.keys(neutral).map((k) => [k, { value: `{colors.neutral.${k}}` }]),
) as Record<keyof typeof neutral, { value: string }>;

export const colors = defineTokens.colors({
  neutral: ramp(neutral),
  gray: grayAlias,
  accent: ramp(accent),
  green: ramp(green),
  amber: ramp(amber),
  red: ramp(red),
  blue: ramp(blue),
});

/**
 * Fonts. The host loads the files and sets the CSS variables (the shell uses next/font):
 *   --toda-font-sans    IBM Plex Sans          (Latin)
 *   --toda-font-arabic  IBM Plex Sans Arabic   (Arabic script; listed after Latin so each
 *                                               script picks its own face from one stack)
 *   --toda-font-mono    IBM Plex Mono          (record keys, code, ids)
 * Without the variables the stack falls back to locally installed Plex, then the system UI font.
 */
const sansStack =
  "var(--toda-font-sans, 'IBM Plex Sans'), var(--toda-font-arabic, 'IBM Plex Sans Arabic'), ui-sans-serif, system-ui, 'Segoe UI', sans-serif";

export const fonts = defineTokens.fonts({
  body: { value: sansStack },
  heading: { value: sansStack },
  mono: { value: "var(--toda-font-mono, 'IBM Plex Mono'), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
});

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

export const fontWeights = defineTokens.fontWeights({
  normal: { value: '400' },
  medium: { value: '500' },
  semibold: { value: '600' },
  bold: { value: '600' }, // Plex is loaded up to 600; "bold" maps to it rather than faux bold.
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
  sidebarRail: { value: '3.5rem' },
  topbar: { value: '3rem' },
  content: { value: '80rem' },
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

export const tokens = { colors, fonts, fontSizes, fontWeights, lineHeights, radii, sizes, zIndex, durations, easings };

/** Exposed for the design reference page. */
export const scales = { neutral, accent, green, amber, red, blue };
