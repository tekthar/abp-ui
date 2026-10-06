import { defineSemanticTokens } from '@chakra-ui/react';

type Mode = { _light: string; _dark: string };
const c = (light: string, dark: string): { value: Mode } => ({
  value: { _light: `{colors.${light}}`, _dark: `{colors.${dark}}` },
});

/**
 * The palette shape every Chakra recipe reads through `colorPalette.*`
 * (solid, contrast, fg, muted, subtle, emphasized, focusRing, border).
 */
function palette(
  ramp: string,
  o: { solid: [number, number]; contrast?: [string, string]; focusRing?: [string, string] },
) {
  return {
    solid: c(`${ramp}.${o.solid[0]}`, `${ramp}.${o.solid[1]}`),
    contrast: o.contrast ? c(o.contrast[0], o.contrast[1]) : { value: { _light: 'white', _dark: 'white' } },
    fg: c(`${ramp}.700`, `${ramp}.300`),
    muted: c(`${ramp}.100`, `${ramp}.900`),
    subtle: c(`${ramp}.50`, `${ramp}.950`),
    emphasized: c(`${ramp}.200`, `${ramp}.800`),
    focusRing: o.focusRing ? c(o.focusRing[0], o.focusRing[1]) : c(`${ramp}.500`, `${ramp}.400`),
    border: c(`${ramp}.300`, `${ramp}.700`),
  };
}

const accentPalette = palette('accent', { solid: [600, 500] });
const successPalette = palette('green', { solid: [600, 600] });
const warningPalette = palette('amber', { solid: [400, 400], contrast: ['neutral.950', 'neutral.950'] });
const dangerPalette = palette('red', { solid: [600, 500] });
const infoPalette = palette('blue', { solid: [600, 500] });

const neutralPalette = {
  solid: c('neutral.900', 'neutral.50'),
  contrast: c('neutral.0', 'neutral.950'),
  fg: c('neutral.800', 'neutral.200'),
  muted: c('neutral.200', 'neutral.800'),
  subtle: c('neutral.100', 'neutral.850'),
  emphasized: c('neutral.300', 'neutral.700'),
  // Neutral controls get the accent focus ring, so focus always looks the same.
  focusRing: c('accent.500', 'accent.400'),
  border: c('neutral.300', 'neutral.700'),
};

/** Status categories (to do / in progress / done). Their own palettes so they can diverge from status colours. */
const todoPalette = {
  ...neutralPalette,
  solid: c('neutral.500', 'neutral.400'),
  fg: c('neutral.700', 'neutral.200'),
  subtle: c('neutral.100', 'neutral.850'),
};
const inProgressPalette = palette('blue', { solid: [500, 400] });
const donePalette = palette('green', { solid: [500, 400] });

export const semanticColors = defineSemanticTokens.colors({
  // ---- Surfaces -------------------------------------------------------------------------
  bg: {
    DEFAULT: c('neutral.0', 'neutral.900'),
    /** Page background behind panels. */
    canvas: c('neutral.25', 'neutral.925'),
    /** Sidebar and other app chrome. */
    chrome: c('neutral.50', 'neutral.950'),
    /** Panels, cards, popovers, dialogs, inputs. */
    panel: c('neutral.0', 'neutral.900'),
    /** Sunken areas inside a panel: table headers, code, read-only fields. */
    subtle: c('neutral.50', 'neutral.925'),
    /** Hover. */
    muted: c('neutral.100', 'neutral.850'),
    /** Pressed / selected neutral. */
    emphasized: c('neutral.200', 'neutral.800'),
    inverted: c('neutral.900', 'neutral.50'),
    /** Scrim behind dialogs and drawers. */
    backdrop: { value: { _light: '{colors.neutral.950/48}', _dark: '{colors.black/64}' } },
    /** Selected row / current nav item. */
    selected: c('accent.50', 'accent.950'),
    accent: c('accent.50', 'accent.950'),
    success: c('green.50', 'green.950'),
    warning: c('amber.50', 'amber.950'),
    danger: c('red.50', 'red.950'),
    error: c('red.50', 'red.950'),
    info: c('blue.50', 'blue.950'),
  },
  // ---- Text and icons -------------------------------------------------------------------
  fg: {
    DEFAULT: c('neutral.900', 'neutral.50'),
    muted: c('neutral.600', 'neutral.400'),
    subtle: c('neutral.500', 'neutral.500'),
    disabled: c('neutral.400', 'neutral.600'),
    inverted: c('neutral.50', 'neutral.900'),
    accent: c('accent.700', 'accent.300'),
    link: c('accent.700', 'accent.300'),
    success: c('green.700', 'green.300'),
    warning: c('amber.700', 'amber.300'),
    danger: c('red.600', 'red.300'),
    error: c('red.600', 'red.300'),
    info: c('blue.700', 'blue.300'),
  },
  // ---- Lines ----------------------------------------------------------------------------
  border: {
    DEFAULT: c('neutral.200', 'neutral.800'),
    muted: c('neutral.100', 'neutral.850'),
    subtle: c('neutral.50', 'neutral.900'),
    /** Inputs and outline buttons: one step stronger than panel borders. */
    emphasized: c('neutral.300', 'neutral.700'),
    /** Hovered input border. */
    hover: c('neutral.400', 'neutral.600'),
    inverted: c('neutral.800', 'neutral.200'),
    accent: c('accent.500', 'accent.400'),
    focus: c('accent.500', 'accent.400'),
    success: c('green.500', 'green.400'),
    warning: c('amber.400', 'amber.400'),
    danger: c('red.500', 'red.400'),
    error: c('red.500', 'red.400'),
    info: c('blue.500', 'blue.400'),
  },
  // ---- Palettes for `colorPalette` --------------------------------------------------------
  accent: accentPalette,
  neutral: neutralPalette,
  success: successPalette,
  warning: warningPalette,
  danger: dangerPalette,
  info: infoPalette,
  todo: todoPalette,
  inProgress: inProgressPalette,
  done: donePalette,
  // Chakra's built-in palette names, re-pointed so internal recipes (alerts, toasts) match.
  gray: neutralPalette,
  green: successPalette,
  orange: warningPalette,
  red: dangerPalette,
  blue: infoPalette,
  // ---- Status categories as plain tokens (for custom drawings like boards) ---------------
  statusCategory: {
    todo: { bg: todoPalette.subtle, fg: todoPalette.fg, solid: todoPalette.solid, border: todoPalette.border },
    inProgress: {
      bg: inProgressPalette.subtle,
      fg: inProgressPalette.fg,
      solid: inProgressPalette.solid,
      border: inProgressPalette.border,
    },
    done: { bg: donePalette.subtle, fg: donePalette.fg, solid: donePalette.solid, border: donePalette.border },
  },
});

export const semanticShadows = defineSemanticTokens.shadows({
  xs: {
    value: {
      _light: '0 1px 2px {colors.neutral.950/6}',
      _dark: '0 1px 2px {colors.black/40}',
    },
  },
  sm: {
    value: {
      _light: '0 1px 2px {colors.neutral.950/6}, 0 1px 3px {colors.neutral.950/8}',
      _dark: '0 1px 3px {colors.black/50}, 0 0 0 1px {colors.neutral.800}',
    },
  },
  md: {
    value: {
      _light: '0 4px 12px -2px {colors.neutral.950/10}, 0 0 0 1px {colors.neutral.950/6}',
      _dark: '0 4px 12px -2px {colors.black/60}, 0 0 0 1px {colors.neutral.800}',
    },
  },
  lg: {
    value: {
      _light: '0 12px 28px -6px {colors.neutral.950/16}, 0 0 0 1px {colors.neutral.950/6}',
      _dark: '0 12px 28px -6px {colors.black/70}, 0 0 0 1px {colors.neutral.800}',
    },
  },
  xl: {
    value: {
      _light: '0 20px 40px -8px {colors.neutral.950/20}, 0 0 0 1px {colors.neutral.950/6}',
      _dark: '0 20px 40px -8px {colors.black/75}, 0 0 0 1px {colors.neutral.800}',
    },
  },
});

export const semanticRadii = defineSemanticTokens.radii({
  /** Small controls inside other controls (checkbox, tag). */
  l1: { value: '{radii.xs}' },
  /** Buttons, inputs, badges, menus items. */
  l2: { value: '{radii.sm}' },
  /** Panels, dialogs, popovers. */
  l3: { value: '{radii.md}' },
});

/** Layout rhythm. Use these names for page-level spacing instead of raw steps. */
export const semanticSpacing = defineSemanticTokens.spacing({
  page: {
    x: { value: '{spacing.6}' },
    y: { value: '{spacing.5}' },
  },
  section: { value: '{spacing.5}' },
  stack: { value: '{spacing.3}' },
  inline: { value: '{spacing.2}' },
  panel: { value: '{spacing.4}' },
  field: { value: '{spacing.4}' },
});

export const semanticTokens = {
  colors: semanticColors,
  shadows: semanticShadows,
  radii: semanticRadii,
  spacing: semanticSpacing,
};
