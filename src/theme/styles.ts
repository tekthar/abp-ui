import { defineGlobalStyles, defineLayerStyles, defineTextStyles } from '@chakra-ui/react';

/**
 * Type scale. Sizes come from tokens.fontSizes; every style pairs a size with a line height on a
 * 4px rhythm. No letter-spacing anywhere: tracking breaks Arabic joining.
 */
export const textStyles = defineTextStyles({
  '2xs': { value: { fontSize: '2xs', lineHeight: '1rem' } },
  xs: { value: { fontSize: 'xs', lineHeight: '1rem' } },
  sm: { value: { fontSize: 'sm', lineHeight: '1.125rem' } },
  md: { value: { fontSize: 'md', lineHeight: '1.25rem' } },
  lg: { value: { fontSize: 'lg', lineHeight: '1.5rem' } },
  xl: { value: { fontSize: 'xl', lineHeight: '1.625rem' } },
  '2xl': { value: { fontSize: '2xl', lineHeight: '1.75rem' } },
  '3xl': { value: { fontSize: '3xl', lineHeight: '2.25rem' } },

  /** Default copy. */
  body: { value: { fontSize: 'md', lineHeight: '1.25rem', fontWeight: 'normal' } },
  /** Secondary copy, table cells in dense tables. */
  'body.sm': { value: { fontSize: 'sm', lineHeight: '1.125rem', fontWeight: 'normal' } },
  /** Help text, timestamps, captions. */
  caption: { value: { fontSize: 'xs', lineHeight: '1rem', fontWeight: 'normal' } },
  /** Form labels and table column headers. */
  label: { value: { fontSize: 'sm', lineHeight: '1.125rem', fontWeight: 'medium' } },
  /** Sidebar section titles and other small headings. */
  overline: { value: { fontSize: '2xs', lineHeight: '1rem', fontWeight: 'semibold', textTransform: 'uppercase' } },
  /** Page title (one per page). */
  'heading.page': { value: { fontSize: 'xl', lineHeight: '1.75rem', fontWeight: 'semibold' } },
  /** Panel and dialog titles. */
  'heading.section': { value: { fontSize: 'md', lineHeight: '1.25rem', fontWeight: 'semibold' } },
  /** Record keys like PAY-41: mono, tabular. */
  key: { value: { fontFamily: 'mono', fontSize: 'sm', lineHeight: '1.125rem', fontWeight: 'medium', fontVariantNumeric: 'tabular-nums' } },
  /** Ids, paths, versions. */
  code: { value: { fontFamily: 'mono', fontSize: 'xs', lineHeight: '1rem', fontWeight: 'normal' } },
  /** Numbers in tables and stats. */
  numeric: { value: { fontVariantNumeric: 'tabular-nums' } },
});

export const layerStyles = defineLayerStyles({
  /** A bordered surface on the canvas. */
  panel: {
    value: { bg: 'bg.panel', borderWidth: '1px', borderColor: 'border', borderRadius: 'l3', boxShadow: 'xs' },
  },
  /** Floating surfaces: menus, popovers, dialogs. */
  'panel.raised': {
    value: { bg: 'bg.panel', borderWidth: '1px', borderColor: 'border', borderRadius: 'l3', boxShadow: 'lg' },
  },
  /** Recessed area inside a panel. */
  sunken: {
    value: { bg: 'bg.subtle', borderWidth: '1px', borderColor: 'border.muted', borderRadius: 'l2' },
  },
  /** Current item in a list or nav. */
  selected: {
    value: { bg: 'bg.selected', color: 'fg.accent' },
  },
  /** Small bordered token (path segment, contribution, tag). */
  chip: {
    value: { bg: 'bg.subtle', borderWidth: '1px', borderColor: 'border', borderRadius: 'l2', color: 'fg' },
  },
});

export const globalCss = defineGlobalStyles({
  // Chakra's default enables Inter's cv11; Plex has no such feature.
  '*': { fontFeatureSettings: 'normal' },
  html: {
    colorPalette: 'accent',
    bg: 'bg.canvas',
    color: 'fg',
    fontFamily: 'body',
    lineHeight: 'normal',
    textRendering: 'optimizeLegibility',
  },
  body: {
    bg: 'bg.canvas',
    color: 'fg',
    textStyle: 'body',
    minHeight: '100dvh',
  },
  // Arabic needs a little more leading than Latin at the same size.
  'html[lang|=ar] body': { lineHeight: 'relaxed' },
  'code, kbd, samp, pre': { fontFamily: 'mono' },
  '*::selection': { bg: 'accent.muted', color: 'fg' },
  '*::placeholder, *[data-placeholder]': { color: 'fg.subtle' },
  // A person who chose less motion (ADR 0058): keyframe animations end at once, and the browser's view transitions
  // don't play. The same for a system that asks for less, unless the person chose full.
  'html[data-motion=reduced] *, html[data-motion=reduced] *::before, html[data-motion=reduced] *::after': {
    animationDuration: '0.01ms !important',
    animationIterationCount: '1 !important',
  },
  'html[data-motion=reduced]::view-transition-group(*), html[data-motion=reduced]::view-transition-old(*), html[data-motion=reduced]::view-transition-new(*)': {
    animation: 'none !important',
  },
  'html:not([data-motion=full])::view-transition-group(*), html:not([data-motion=full])::view-transition-old(*), html:not([data-motion=full])::view-transition-new(*)': {
    '@media (prefers-reduced-motion: reduce)': { animation: 'none !important' },
  },
});
