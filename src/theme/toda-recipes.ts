import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react';

/*
 * Recipes for Toda's own components. They are registered in the system under the keys below,
 * so a host can override them the same way it overrides Chakra's built-in recipes.
 */

// ---- AppShell ------------------------------------------------------------------------------
export const appShellSlotRecipe = defineSlotRecipe({
  className: 'toda-app-shell',
  slots: [
    'root',
    'sidebar',
    'sidebarHeader',
    'brand',
    'brandMark',
    'brandText',
    'brandName',
    'brandTagline',
    'nav',
    'navSection',
    'navSectionTitle',
    'navItem',
    'navItemIcon',
    'navItemLabel',
    'sidebarFooter',
    'main',
    'topbar',
    'topbarStart',
    'topbarEnd',
    'mobileToggle',
    'desktopToggle',
    'content',
    'contentInner',
  ],
  base: {
    root: {
      display: 'flex',
      minH: '100dvh',
      bg: 'bg.canvas',
      color: 'fg',
    },
    sidebar: {
      display: { base: 'none', md: 'flex' },
      flexDirection: 'column',
      flexShrink: '0',
      position: 'sticky',
      top: '0',
      h: '100dvh',
      w: 'sidebar',
      bg: 'bg.chrome',
      borderInlineEndWidth: '1px',
      borderColor: 'border',
      zIndex: 'sidebar',
      transitionProperty: 'width',
      transitionDuration: 'moderate',
      transitionTimingFunction: 'standard',
      '&[data-mobile]': { display: 'flex', position: 'static', h: 'full', w: 'full', borderInlineEndWidth: '0' },
    },
    sidebarHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      h: 'topbar',
      px: '3',
      flexShrink: '0',
      borderBottomWidth: '1px',
      borderColor: 'border.muted',
    },
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      minW: '0',
      flex: '1',
      color: 'fg',
      borderRadius: 'l2',
      focusVisibleRing: 'outside',
    },
    brandMark: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSize: '7',
      flexShrink: '0',
      borderRadius: 'l2',
      bg: 'accent.solid',
      color: 'accent.contrast',
      textStyle: 'label',
    },
    brandText: { display: 'flex', flexDirection: 'column', minW: '0' },
    brandName: { textStyle: 'heading.section', truncate: true },
    brandTagline: { textStyle: 'caption', color: 'fg.subtle', truncate: true },
    nav: {
      flex: '1',
      overflowY: 'auto',
      px: '2',
      py: '3',
      display: 'flex',
      flexDirection: 'column',
      gap: '4',
    },
    navSection: { display: 'flex', flexDirection: 'column', gap: '0.5' },
    navSectionTitle: { textStyle: 'overline', color: 'fg.subtle', px: '2', pb: '1' },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '2.5',
      h: 'control.md',
      px: '2',
      borderRadius: 'l2',
      color: 'fg.muted',
      textStyle: 'md',
      textDecoration: 'none',
      transitionProperty: 'background, color',
      transitionDuration: 'fast',
      focusVisibleRing: 'inside',
      _hover: { bg: 'bg.muted', color: 'fg' },
      '&[aria-current=page]': { bg: 'bg.selected', color: 'fg.accent', fontWeight: 'medium' },
    },
    navItemIcon: { display: 'inline-flex', flexShrink: '0', _icon: { boxSize: '4' } },
    navItemLabel: { truncate: true, minW: '0' },
    sidebarFooter: {
      flexShrink: '0',
      px: '3',
      py: '2.5',
      borderTopWidth: '1px',
      borderColor: 'border.muted',
      textStyle: 'caption',
      color: 'fg.subtle',
      display: 'flex',
      alignItems: 'center',
      gap: '2',
    },
    main: { flex: '1', minW: '0', display: 'flex', flexDirection: 'column' },
    topbar: {
      position: 'sticky',
      top: '0',
      zIndex: 'topbar',
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      h: 'topbar',
      flexShrink: '0',
      px: { base: '3', md: 'page.x' },
      bg: 'bg.canvas',
      borderBottomWidth: '1px',
      borderColor: 'border',
    },
    topbarStart: { display: 'flex', alignItems: 'center', gap: '2', flex: '1', minW: '0' },
    topbarEnd: { display: 'flex', alignItems: 'center', gap: '1.5', flexShrink: '0' },
    mobileToggle: { display: { base: 'inline-flex', md: 'none' } },
    desktopToggle: { display: { base: 'none', md: 'inline-flex' } },
    content: { flex: '1', px: { base: '3', md: 'page.x' }, py: 'page.y' },
    contentInner: { mx: 'auto', w: 'full', maxW: 'content' },
  },
  variants: {
    collapsed: {
      true: {
        sidebar: { w: 'sidebarRail' },
        sidebarHeader: { px: '2.5', justifyContent: 'center' },
        brandText: { display: 'none' },
        brand: { flex: '0' },
        navSectionTitle: { srOnly: true },
        navItem: { justifyContent: 'center', px: '0' },
        navItemLabel: { srOnly: true },
        sidebarFooter: { display: 'none' },
      },
      false: {},
    },
  },
  defaultVariants: { collapsed: false },
});

// ---- PageHeader ----------------------------------------------------------------------------
export const pageHeaderSlotRecipe = defineSlotRecipe({
  className: 'toda-page-header',
  slots: ['root', 'breadcrumbs', 'row', 'titleGroup', 'title', 'description', 'meta', 'actions'],
  base: {
    root: { display: 'flex', flexDirection: 'column', gap: '2', mb: 'section' },
    row: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3' },
    titleGroup: { display: 'flex', flexDirection: 'column', gap: '1', minW: '0', flex: '1' },
    title: { textStyle: 'heading.page', color: 'fg', display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' },
    description: { textStyle: 'body', color: 'fg.muted', maxW: 'prose' },
    meta: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2', textStyle: 'sm', color: 'fg.muted' },
    actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2', flexShrink: '0' },
  },
});

// ---- Panel ---------------------------------------------------------------------------------
export const panelSlotRecipe = defineSlotRecipe({
  className: 'toda-panel',
  slots: ['root', 'header', 'titleGroup', 'title', 'description', 'actions', 'body', 'footer'],
  base: {
    root: {
      layerStyle: 'panel',
      display: 'flex',
      flexDirection: 'column',
      minW: '0',
      color: 'fg',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '3',
      px: 'panel',
      py: '2.5',
      minH: '11',
      borderBottomWidth: '1px',
      borderColor: 'border.muted',
    },
    titleGroup: { display: 'flex', flexDirection: 'column', gap: '0.5', minW: '0' },
    title: { textStyle: 'heading.section', color: 'fg', display: 'flex', alignItems: 'center', gap: '2' },
    description: { textStyle: 'caption', color: 'fg.muted' },
    actions: { display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' },
    body: { p: 'panel', flex: '1', minW: '0' },
    footer: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      px: 'panel',
      py: '2.5',
      borderTopWidth: '1px',
      borderColor: 'border.muted',
      bg: 'bg.subtle',
      borderBottomRadius: 'l3',
    },
  },
  variants: {
    flush: {
      true: { body: { p: '0', overflow: 'hidden', borderBottomRadius: 'l3' } },
      false: {},
    },
  },
  defaultVariants: { flush: false },
});

// ---- StatusPill ----------------------------------------------------------------------------
export const statusPillSlotRecipe = defineSlotRecipe({
  className: 'toda-status-pill',
  slots: ['root', 'indicator'],
  base: {
    root: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      borderRadius: 'l2',
      fontWeight: 'medium',
      whiteSpace: 'nowrap',
      borderWidth: '1px',
      verticalAlign: 'middle',
    },
    indicator: { boxSize: '1.5', borderRadius: 'full', bg: 'colorPalette.solid', flexShrink: '0' },
  },
  variants: {
    tone: {
      neutral: { root: { colorPalette: 'neutral' } },
      accent: { root: { colorPalette: 'accent' } },
      success: { root: { colorPalette: 'success' } },
      warning: { root: { colorPalette: 'warning' } },
      danger: { root: { colorPalette: 'danger' } },
      info: { root: { colorPalette: 'info' } },
      todo: { root: { colorPalette: 'todo' } },
      inProgress: { root: { colorPalette: 'inProgress' } },
      done: { root: { colorPalette: 'done' } },
    },
    variant: {
      subtle: { root: { bg: 'colorPalette.subtle', color: 'colorPalette.fg', borderColor: 'colorPalette.muted' } },
      outline: { root: { bg: 'transparent', color: 'colorPalette.fg', borderColor: 'colorPalette.border' } },
    },
    size: {
      sm: { root: { textStyle: 'xs', minH: '5', px: '1.5' } },
      md: { root: { textStyle: 'sm', minH: '6', px: '2' } },
    },
  },
  defaultVariants: { tone: 'neutral', variant: 'subtle', size: 'sm' },
});

// ---- RecordKey -----------------------------------------------------------------------------
export const recordKeyRecipe = defineRecipe({
  className: 'toda-record-key',
  base: {
    textStyle: 'key',
    color: 'fg',
    whiteSpace: 'nowrap',
    // Keys read left to right in every locale ("PAY-41" never becomes "41-PAY").
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  variants: {
    variant: {
      plain: {},
      chip: { layerStyle: 'chip', px: '1', py: '0.5' },
      muted: { color: 'fg.muted' },
    },
    size: {
      xs: { fontSize: 'xs', lineHeight: '1rem' },
      sm: {},
      md: { fontSize: 'md', lineHeight: '1.25rem' },
    },
    link: {
      true: {
        color: 'fg.link',
        borderRadius: 'l1',
        focusVisibleRing: 'outside',
        textDecoration: 'none',
        _hover: { textDecoration: 'underline', textUnderlineOffset: '0.2em' },
      },
      false: {},
    },
  },
  defaultVariants: { variant: 'plain', size: 'sm', link: false },
});

// ---- PathChips -----------------------------------------------------------------------------
export const pathChipsSlotRecipe = defineSlotRecipe({
  className: 'toda-path-chips',
  slots: ['root', 'item', 'chip', 'separator'],
  base: {
    root: { display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '1', listStyle: 'none', m: '0', p: '0' },
    item: { display: 'inline-flex', alignItems: 'center', gap: '1' },
    chip: {
      layerStyle: 'chip',
      textStyle: 'xs',
      px: '1.5',
      py: '0.5',
      unicodeBidi: 'isolate',
      '&[aria-current=true]': { bg: 'bg.emphasized', borderColor: 'border.emphasized', fontWeight: 'medium' },
    },
    separator: {
      display: 'inline-flex',
      color: 'fg.subtle',
      _icon: { boxSize: '3' },
      _rtl: { rotate: '180deg' },
    },
  },
});

// ---- DataTable -----------------------------------------------------------------------------
export const dataTableSlotRecipe = defineSlotRecipe({
  className: 'toda-data-table',
  slots: ['root', 'scrollArea', 'sortTrigger', 'sortIcon', 'state'],
  base: {
    root: { position: 'relative', w: 'full', minW: '0' },
    scrollArea: { overflow: 'auto', w: 'full' },
    sortTrigger: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1',
      color: 'inherit',
      font: 'inherit',
      cursor: 'pointer',
      borderRadius: 'l1',
      focusVisibleRing: 'outside',
      _hover: { color: 'fg' },
      '&[data-sorted]': { color: 'fg' },
    },
    sortIcon: { display: 'inline-flex', color: 'fg.subtle', _icon: { boxSize: '3.5' }, '[data-sorted] &': { color: 'fg.accent' } },
    state: { px: 'panel', py: '3' },
  },
});

export const todaRecipes = {
  todaRecordKey: recordKeyRecipe,
};

export const todaSlotRecipes = {
  todaAppShell: appShellSlotRecipe,
  todaPageHeader: pageHeaderSlotRecipe,
  todaPanel: panelSlotRecipe,
  todaStatusPill: statusPillSlotRecipe,
  todaPathChips: pathChipsSlotRecipe,
  todaDataTable: dataTableSlotRecipe,
};
