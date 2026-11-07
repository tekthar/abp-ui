import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react';
import {
  alertAnatomy,
  avatarAnatomy,
  breadcrumbAnatomy,
  cardAnatomy,
  checkboxAnatomy,
  dataListAnatomy,
  dialogAnatomy,
  drawerAnatomy,
  emptyStateAnatomy,
  fieldAnatomy,
  comboboxAnatomy,
  menuAnatomy,
  nativeSelectAnatomy,
  popoverAnatomy,
  selectAnatomy,
  switchAnatomy,
  tableAnatomy,
  tabsAnatomy,
  toastAnatomy,
  tooltipAnatomy,
} from '@chakra-ui/react/anatomy';

/*
 * Overrides of Chakra's built-in recipes. createSystem deep-merges these into the defaults, so
 * each block only states what Toda changes: denser sizes, Toda surfaces and borders, the accent
 * focus ring. Control heights share one ladder (sizes.control.*): xs 24, sm 28, md 32, lg 36.
 */

/**
 * Overlays keep Chakra's open and close animations (scale and fade from the trigger, slide for drawers) on Toda's
 * curves (ADR 0058): ease-out both ways, never ease-in, and drawers on the drawer curve.
 */
const opens = { _open: { animationTimingFunction: 'out' }, _closed: { animationTimingFunction: 'out' } } as const;

// Token keys for style props (h, minW) ...
const controlHeights = {
  xs: 'control.xs',
  sm: 'control.sm',
  md: 'control.md',
  lg: 'control.lg',
} as const;
// ... and token paths for CSS variables (--input-height, --select-field-height).
const controlHeightVars = {
  xs: 'sizes.control.xs',
  sm: 'sizes.control.sm',
  md: 'sizes.control.md',
  lg: 'sizes.control.lg',
} as const;

// ---- Button / IconButton ------------------------------------------------------------------
export const buttonRecipe = defineRecipe({
  base: {
    borderRadius: 'l2',
    fontWeight: 'medium',
    transitionDuration: 'fast',
    focusVisibleRing: 'outside',
    focusRingColor: 'colorPalette.focusRing',
  },
  variants: {
    size: {
      xs: { h: controlHeights.xs, minW: controlHeights.xs, px: '2', gap: '1', textStyle: 'xs', _icon: { width: '3.5', height: '3.5' } },
      sm: { h: controlHeights.sm, minW: controlHeights.sm, px: '2.5', gap: '1.5', textStyle: 'sm', _icon: { width: '4', height: '4' } },
      md: { h: controlHeights.md, minW: controlHeights.md, px: '3', gap: '1.5', textStyle: 'md', _icon: { width: '4', height: '4' } },
      lg: { h: controlHeights.lg, minW: controlHeights.lg, px: '4', gap: '2', textStyle: 'md', _icon: { width: '4.5', height: '4.5' } },
    },
    variant: {
      solid: {
        bg: 'colorPalette.solid',
        color: 'colorPalette.contrast',
        _hover: { bg: 'colorPalette.solid/88' },
        _active: { bg: 'colorPalette.solid/80' },
      },
      outline: {
        bg: 'bg.panel',
        borderColor: 'colorPalette.border',
        color: 'colorPalette.fg',
        boxShadow: 'xs',
        _hover: { bg: 'colorPalette.subtle' },
        _active: { bg: 'colorPalette.muted' },
      },
      ghost: {
        color: 'colorPalette.fg',
        _hover: { bg: 'colorPalette.subtle' },
        _active: { bg: 'colorPalette.muted' },
      },
      plain: {
        color: 'colorPalette.fg',
        px: '0',
        h: 'auto',
        minW: 'auto',
        _hover: { textDecoration: 'underline', textUnderlineOffset: '0.2em' },
      },
    },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

// ---- Badge (also the base of StatusPill) ---------------------------------------------------
export const badgeRecipe = defineRecipe({
  base: { borderRadius: 'l2', fontWeight: 'medium', gap: '1', whiteSpace: 'nowrap' },
  variants: {
    size: {
      xs: { textStyle: '2xs', px: '1', minH: '4' },
      sm: { textStyle: 'xs', px: '1.5', minH: '5' },
      md: { textStyle: 'xs', px: '2', minH: '6' },
      lg: { textStyle: 'sm', px: '2.5', minH: '7' },
    },
  },
  defaultVariants: { size: 'sm' },
});

// ---- Link ---------------------------------------------------------------------------------
export const linkRecipe = defineRecipe({
  base: { color: 'fg.link', borderRadius: 'l1', focusVisibleRing: 'outside', gap: '1' },
  variants: {
    variant: {
      plain: { color: 'fg.link', _hover: { textDecoration: 'underline', textUnderlineOffset: '0.2em' } },
      underline: { color: 'fg.link', textDecorationColor: 'currentColor/40' },
    },
  },
});

// ---- Input / Textarea ----------------------------------------------------------------------
const inputFieldBase = {
  bg: 'bg.panel',
  borderColor: 'border.emphasized',
  color: 'fg',
  transitionProperty: 'border-color, box-shadow',
  transitionDuration: 'fast',
  _hover: { borderColor: 'border.hover' },
  _readOnly: { bg: 'bg.subtle' },
} as const;

export const inputRecipe = defineRecipe({
  base: { borderRadius: 'l2' },
  variants: {
    size: {
      xs: { textStyle: 'xs', px: '2', '--input-height': controlHeightVars.xs },
      sm: { textStyle: 'sm', px: '2', '--input-height': controlHeightVars.sm },
      md: { textStyle: 'md', px: '2.5', '--input-height': controlHeightVars.md },
      lg: { textStyle: 'md', px: '3', '--input-height': controlHeightVars.lg },
    },
    variant: {
      outline: inputFieldBase,
    },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

export const textareaRecipe = defineRecipe({
  variants: {
    size: {
      sm: { textStyle: 'sm', px: '2', py: '1.5' },
      md: { textStyle: 'md', px: '2.5', py: '1.5' },
    },
    variant: { outline: inputFieldBase },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

// ---- Native select / Select ----------------------------------------------------------------
const selectSize = (h: string, textStyle: string, ps: string) => ({
  root: { '--select-field-height': h },
  field: { textStyle, ps, pe: '7' },
  indicator: { textStyle: 'md', insetEnd: '2' },
});

export const nativeSelectSlotRecipe = defineSlotRecipe({
  slots: nativeSelectAnatomy.keys(),
  base: {
    field: { borderRadius: 'l2', '& > option, & > optgroup': { bg: 'bg.panel', color: 'fg' } },
    indicator: { color: 'fg.muted' },
  },
  variants: {
    variant: { outline: { field: inputFieldBase } },
    size: {
      xs: selectSize(controlHeightVars.xs, 'xs', '2'),
      sm: selectSize(controlHeightVars.sm, 'sm', '2'),
      md: selectSize(controlHeightVars.md, 'md', '2.5'),
      lg: selectSize(controlHeightVars.lg, 'md', '3'),
    },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

export const selectSlotRecipe = defineSlotRecipe({
  slots: selectAnatomy.keys(),
  base: {
    content: { bg: 'bg.panel', borderWidth: '1px', borderColor: 'border', boxShadow: 'lg', borderRadius: 'l3', ...opens },
    item: { borderRadius: 'l1', _highlighted: { bg: 'bg.muted' } },
  },
  variants: {
    variant: { outline: { trigger: inputFieldBase } },
    size: {
      sm: { trigger: { minH: controlHeights.sm, textStyle: 'sm' }, item: { textStyle: 'sm' } },
      md: { trigger: { minH: controlHeights.md, textStyle: 'md' }, item: { textStyle: 'md' } },
    },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

// ---- Checkbox / Switch ---------------------------------------------------------------------
export const checkboxSlotRecipe = defineSlotRecipe({
  slots: checkboxAnatomy.keys(),
  base: {
    root: { gap: '2' },
    label: { textStyle: 'md', fontWeight: 'normal' },
    control: { borderRadius: 'l1', borderColor: 'border.emphasized', bg: 'bg.panel', focusVisibleRing: 'outside' },
  },
  defaultVariants: { size: 'sm', variant: 'solid' },
});

export const switchSlotRecipe = defineSlotRecipe({
  slots: switchAnatomy.keys(),
  base: {
    label: { textStyle: 'md', fontWeight: 'normal' },
    control: { bg: 'bg.emphasized', _checked: { bg: 'colorPalette.solid' }, focusVisibleRing: 'outside' },
  },
  defaultVariants: { size: 'sm', variant: 'solid' },
});

// ---- Field ---------------------------------------------------------------------------------
export const fieldSlotRecipe = defineSlotRecipe({
  slots: fieldAnatomy.keys(),
  base: {
    root: { gap: '1' },
    label: { textStyle: 'label', color: 'fg' },
    helperText: { textStyle: 'caption', color: 'fg.muted' },
    errorText: { textStyle: 'caption', color: 'fg.danger', fontWeight: 'medium' },
    requiredIndicator: { color: 'fg.danger' },
  },
});

// ---- Card (Panel is built on the same tokens) ------------------------------------------------
export const cardSlotRecipe = defineSlotRecipe({
  slots: cardAnatomy.keys(),
  base: {
    root: { borderRadius: 'l3' },
    title: { textStyle: 'heading.section' },
    description: { textStyle: 'body.sm', color: 'fg.muted' },
  },
  variants: {
    size: {
      sm: { root: { '--card-padding': 'spacing.3' }, title: { textStyle: 'heading.section' } },
      md: { root: { '--card-padding': 'spacing.4' }, title: { textStyle: 'heading.section' } },
      lg: { root: { '--card-padding': 'spacing.6' }, title: { textStyle: 'lg' } },
    },
    variant: {
      outline: { root: { bg: 'bg.panel', borderColor: 'border' } },
      elevated: { root: { bg: 'bg.panel', boxShadow: 'sm' } },
    },
  },
  defaultVariants: { size: 'md', variant: 'outline' },
});

// ---- Table ---------------------------------------------------------------------------------
export const tableSlotRecipe = defineSlotRecipe({
  slots: tableAnatomy.keys(),
  base: {
    root: { color: 'fg' },
    header: { bg: 'bg.subtle' },
    // Headers read as quiet labels over their columns: small capitals in scripts that have them (letter spacing only in
    // left-to-right scripts: Arabic letters join, and spacing them breaks the words).
    columnHeader: {
      textStyle: 'xs',
      fontWeight: 'semibold',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      '[dir=rtl] &': { letterSpacing: 'normal' },
      color: 'fg.muted',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
    },
    cell: { verticalAlign: 'middle' },
    row: { _selected: { bg: 'bg.selected' } },
  },
  variants: {
    interactive: { true: { body: { '& tr': { _hover: { bg: 'bg.muted' } } } } },
    stickyHeader: { true: { header: { '& :where(tr)': { bg: 'bg.subtle', zIndex: 'docked' } } } },
    variant: {
      line: {
        root: { bg: 'transparent' },
        row: { bg: 'transparent' },
        columnHeader: { borderBottomWidth: '1px', borderColor: 'border' },
        cell: { borderBottomWidth: '1px', borderColor: 'border.muted' },
        body: { '& tr:last-of-type td': { borderBottomWidth: '0' } },
      },
      outline: {
        root: { boxShadow: '0 0 0 1px {colors.border}', borderRadius: 'l2' },
      },
    },
    size: {
      sm: { root: { textStyle: 'sm' }, columnHeader: { px: '2.5', py: '1.5', textStyle: 'caption', fontWeight: 'medium' }, cell: { px: '2.5', py: '1.5' } },
      md: { root: { textStyle: 'md' }, columnHeader: { px: '3', py: '2.5' }, cell: { px: '3', py: '2.5' } },
      lg: { root: { textStyle: 'md' }, columnHeader: { px: '4', py: '2.5' }, cell: { px: '4', py: '3' } },
    },
  },
  defaultVariants: { variant: 'line', size: 'md' },
});

// ---- Tabs ----------------------------------------------------------------------------------
export const tabsSlotRecipe = defineSlotRecipe({
  slots: tabsAnatomy.keys(),
  base: {
    trigger: { fontWeight: 'medium', color: 'fg.muted', _selected: { color: 'fg' }, focusVisibleRing: 'inside' },
  },
  variants: {
    size: {
      sm: { trigger: { h: controlHeights.sm, px: '2.5', textStyle: 'sm' } },
      md: { trigger: { h: controlHeights.md, px: '3', textStyle: 'md' } },
    },
    variant: {
      line: { list: { borderColor: 'border' }, trigger: { _selected: { color: 'fg', '--indicator-color': 'colors.accent.solid' } } },
    },
  },
  defaultVariants: { size: 'md', variant: 'line' },
});

// ---- Dialog / Drawer -----------------------------------------------------------------------
const overlayContent = { bg: 'bg.panel', color: 'fg', boxShadow: 'xl', borderRadius: 'l3', ...opens } as const;

export const dialogSlotRecipe = defineSlotRecipe({
  slots: dialogAnatomy.keys(),
  base: {
    backdrop: { bg: 'bg.backdrop' },
    content: overlayContent,
    header: { px: '5', pt: '4', pb: '2', gap: '1' },
    title: { textStyle: 'lg', fontWeight: 'semibold' },
    description: { textStyle: 'body', color: 'fg.muted' },
    body: { px: '5', pt: '2', pb: '4' },
    footer: { px: '5', pt: '3', pb: '4', gap: '2', borderTopWidth: '1px', borderColor: 'border.muted' },
    closeTrigger: { top: '3', insetEnd: '3' },
  },
});

export const drawerSlotRecipe = defineSlotRecipe({
  slots: drawerAnatomy.keys(),
  base: {
    backdrop: { bg: 'bg.backdrop' },
    content: {
      bg: 'bg.panel',
      color: 'fg',
      boxShadow: 'xl',
      _open: { animationDuration: 'slow', animationTimingFunction: 'drawer' },
      _closed: { animationDuration: 'moderate', animationTimingFunction: 'out' },
    },
    header: { px: '4', pt: '4', pb: '2' },
    title: { textStyle: 'lg', fontWeight: 'semibold' },
    body: { px: '4', py: '2' },
    footer: { px: '4', py: '3', gap: '2', borderTopWidth: '1px', borderColor: 'border.muted' },
    closeTrigger: { top: '3', insetEnd: '3' },
  },
});

/** Popovers, comboboxes: only the curve changes. (Selects get theirs in selectSlotRecipe.) */
export const popoverSlotRecipe = defineSlotRecipe({ slots: popoverAnatomy.keys(), base: { content: opens } });
export const comboboxSlotRecipe = defineSlotRecipe({ slots: comboboxAnatomy.keys(), base: { content: opens } });

// ---- Menu / Tooltip / Toast ----------------------------------------------------------------
export const menuSlotRecipe = defineSlotRecipe({
  slots: menuAnatomy.keys(),
  base: {
    content: { bg: 'bg.panel', borderWidth: '1px', borderColor: 'border', boxShadow: 'lg', borderRadius: 'l3', p: '1', ...opens },
    item: { borderRadius: 'l2', textStyle: 'md', _highlighted: { bg: 'bg.muted' } },
    itemGroupLabel: { textStyle: 'overline', color: 'fg.subtle' },
    separator: { bg: 'border.muted' },
  },
  variants: {
    size: {
      sm: { item: { py: '1', px: '2', textStyle: 'sm' } },
      md: { item: { py: '1.5', px: '2', textStyle: 'md' } },
    },
  },
  defaultVariants: { size: 'md' },
});

export const tooltipSlotRecipe = defineSlotRecipe({
  slots: tooltipAnatomy.keys(),
  base: {
    content: {
      bg: 'bg.inverted',
      color: 'fg.inverted',
      textStyle: 'xs',
      px: '2',
      py: '1',
      borderRadius: 'l2',
      boxShadow: 'md',
      '--tooltip-bg': 'colors.bg.inverted',
      ...opens,
    },
  },
});

const toastType = (palette: string) => ({
  bg: 'bg.panel',
  color: 'fg',
  borderInlineStartWidth: '3px',
  borderInlineStartColor: `${palette}.solid`,
  '--toast-indicator-color': `colors.${palette}.solid`,
  '--toast-trigger-bg': 'colors.bg.muted',
  '--toast-border-color': 'colors.border',
});

export const toastSlotRecipe = defineSlotRecipe({
  slots: toastAnatomy.keys(),
  base: {
    root: {
      bg: 'bg.panel',
      color: 'fg',
      borderWidth: '1px',
      borderColor: 'border',
      borderRadius: 'l3',
      boxShadow: 'lg',
      py: '3',
      ps: '3',
      pe: '8',
      gap: '2.5',
      '&[data-type=info]': toastType('info'),
      '&[data-type=success]': toastType('success'),
      '&[data-type=warning]': toastType('warning'),
      '&[data-type=error]': toastType('danger'),
    },
    title: { textStyle: 'md', fontWeight: 'medium' },
    description: { textStyle: 'sm', color: 'fg.muted', opacity: '1' },
    indicator: { color: 'var(--toast-indicator-color, currentColor)', boxSize: '4', mt: '0.5' },
  },
});

// ---- Alert (InlineAlert) -------------------------------------------------------------------
export const alertSlotRecipe = defineSlotRecipe({
  slots: alertAnatomy.keys(),
  base: {
    root: { borderRadius: 'l2' },
    title: { fontWeight: 'medium' },
  },
  variants: {
    status: {
      info: { root: { colorPalette: 'info' } },
      warning: { root: { colorPalette: 'warning' } },
      success: { root: { colorPalette: 'success' } },
      error: { root: { colorPalette: 'danger' } },
      neutral: { root: { colorPalette: 'neutral' } },
    },
    variant: {
      subtle: { root: { bg: 'colorPalette.subtle', color: 'colorPalette.fg', borderWidth: '1px', borderColor: 'colorPalette.muted' } },
    },
    size: {
      sm: { root: { gap: '2', px: '3', py: '2', textStyle: 'sm' }, indicator: { textStyle: 'md' } },
      md: { root: { gap: '2.5', px: '3', py: '2.5', textStyle: 'md' }, indicator: { textStyle: 'lg' } },
    },
  },
  defaultVariants: { status: 'info', variant: 'subtle', size: 'md' },
});

// ---- Avatar / Breadcrumb / EmptyState / DataList / Skeleton ----------------------------------
export const avatarSlotRecipe = defineSlotRecipe({
  slots: avatarAnatomy.keys(),
  base: { root: { fontWeight: 'medium' } },
  variants: {
    variant: {
      subtle: { root: { bg: 'accent.muted', color: 'accent.fg' } },
    },
    size: { sm: {} },
  },
  defaultVariants: { size: 'sm', variant: 'subtle' },
});

export const breadcrumbSlotRecipe = defineSlotRecipe({
  slots: breadcrumbAnatomy.keys(),
  base: {
    list: { color: 'fg.muted' },
    link: { color: 'fg.muted', _hover: { color: 'fg' }, focusVisibleRing: 'outside' },
    currentLink: { color: 'fg' },
    separator: { color: 'fg.subtle' },
  },
  defaultVariants: { size: 'sm', variant: 'plain' },
});

export const emptyStateSlotRecipe = defineSlotRecipe({
  slots: emptyStateAnatomy.keys(),
  base: {
    indicator: { color: 'fg.subtle' },
    title: { color: 'fg' },
    description: { textAlign: 'center', maxW: 'md' },
  },
  variants: {
    size: {
      sm: { root: { px: '4', py: '6' }, content: { gap: '2' }, title: { textStyle: 'heading.section' }, indicator: { textStyle: 'xl' } },
      md: { root: { px: '6', py: '10' }, content: { gap: '3' }, title: { textStyle: 'lg' }, indicator: { textStyle: '2xl' } },
    },
  },
  defaultVariants: { size: 'sm' },
});

export const dataListSlotRecipe = defineSlotRecipe({
  slots: dataListAnatomy.keys(),
  base: {
    itemLabel: { color: 'fg.muted' },
    itemValue: { color: 'fg', minW: '0' },
  },
  variants: {
    orientation: {
      // Label beside value from sm up, stacked on narrow screens.
      horizontal: {
        item: {
          display: 'flex',
          flexDirection: { base: 'column', sm: 'row' },
          alignItems: { base: 'flex-start', sm: 'baseline' },
          gap: { base: '0.5', sm: '4' },
        },
        itemLabel: { minWidth: 'labelColumn', flexShrink: '0' },
        itemValue: { flexWrap: 'wrap', alignItems: 'center', gap: '2' },
      },
    },
    size: {
      sm: { root: { gap: '2' }, item: { textStyle: 'sm' } },
      md: { root: { gap: '2.5' }, item: { textStyle: 'md' } },
    },
  },
  defaultVariants: { size: 'md', orientation: 'horizontal' },
});

export const skeletonRecipe = defineRecipe({
  variants: {
    variant: {
      pulse: { background: 'bg.muted' },
    },
  },
  defaultVariants: { variant: 'pulse' },
});

export const recipes = {
  button: buttonRecipe,
  badge: badgeRecipe,
  link: linkRecipe,
  input: inputRecipe,
  textarea: textareaRecipe,
  skeleton: skeletonRecipe,
};

export const slotRecipes = {
  nativeSelect: nativeSelectSlotRecipe,
  select: selectSlotRecipe,
  checkbox: checkboxSlotRecipe,
  switch: switchSlotRecipe,
  field: fieldSlotRecipe,
  card: cardSlotRecipe,
  table: tableSlotRecipe,
  tabs: tabsSlotRecipe,
  dialog: dialogSlotRecipe,
  drawer: drawerSlotRecipe,
  menu: menuSlotRecipe,
  popover: popoverSlotRecipe,
  combobox: comboboxSlotRecipe,
  tooltip: tooltipSlotRecipe,
  toast: toastSlotRecipe,
  alert: alertSlotRecipe,
  avatar: avatarSlotRecipe,
  breadcrumb: breadcrumbSlotRecipe,
  emptyState: emptyStateSlotRecipe,
  dataList: dataListSlotRecipe,
};
