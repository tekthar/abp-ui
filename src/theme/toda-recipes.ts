import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react';

/*
 * Recipes for Toda's own components. They are registered in the system under the keys below,
 * so a host can override them the same way it overrides Chakra's built-in recipes.
 */

// ---- AppShell ------------------------------------------------------------------------------

/*
 * The sidebar collapsing to its rail and back (ADR 0058): the width eases on the drawer's curve while nothing inside
 * moves (icons, the place's mark and the toggle sit where the rail centres them, in both states); words fade out
 * quickly as it narrows and back in once there's room; titles and the top box fold their height away. With less
 * motion, all of it changes at once.
 */
const SIDEBAR_EASE = '300ms var(--toda-easings-drawer)';
/** Words fading: in after the room opens (a short wait), out at once. */
const WORDS_IN = 'opacity 200ms ease 120ms';
const WORDS_OUT = 'opacity 120ms ease';
const still = {
  'html[data-motion=reduced] &': { transition: 'none' },
  _motionReduce: { 'html:not([data-motion=full]) &': { transition: 'none' } },
} as const;

export const appShellSlotRecipe = defineSlotRecipe({
  className: 'toda-app-shell',
  slots: [
    'root',
    'topbar',
    'mobileToggle',
    'brand',
    'brandMark',
    'brandText',
    'brandName',
    'topbarStart',
    'topNav',
    'topNavItem',
    'topNavIndicator',
    'topbarEnd',
    'body',
    'sidebar',
    'placeHeader',
    'place',
    'placeMark',
    'placeText',
    'placeName',
    'placeDetail',
    'sidebarTop',
    'fold',
    'foldInner',
    'nav',
    'navSection',
    'navSectionTitle',
    'navSectionToggle',
    'navSectionChevron',
    'navSectionItems',
    'navItem',
    'navItemIndicator',
    'navItemIcon',
    'navItemLabel',
    'navChildren',
    'sidebarFooter',
    'sidebarFooterText',
    'drawerHeader',
    'main',
    'content',
    'contentInner',
  ],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      minH: '100dvh',
      bg: 'bg.canvas',
      color: 'fg',
    },
    // The site's bar: brand, the site's pages, then help, notices, language, colour mode, settings and the account.
    topbar: {
      position: 'sticky',
      top: '0',
      zIndex: 'topbar',
      display: 'flex',
      alignItems: 'stretch',
      gap: '2',
      h: 'topbar',
      flexShrink: '0',
      px: { base: '3', md: '4' },
      bg: 'bg.chrome',
      borderBottomWidth: '1px',
      borderColor: 'border',
    },
    mobileToggle: { display: { base: 'inline-flex', lg: 'none' }, alignItems: 'center' },
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      flexShrink: '0',
      alignSelf: 'center',
      color: 'fg',
      borderRadius: 'l2',
      textDecoration: 'none',
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
    brandText: { display: { base: 'none', sm: 'flex' }, flexDirection: 'column', minW: '0' },
    brandName: { textStyle: 'heading.section', truncate: true },
    topbarStart: { display: 'flex', alignItems: 'center', gap: '2', ms: '2', minW: '0' },
    topNav: { display: { base: 'none', lg: 'flex' }, alignItems: 'stretch', gap: '0.5', ms: '4', flex: '1', minW: '0' },
    topNavItem: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      px: '2.5',
      color: 'fg.muted',
      textStyle: 'sm',
      fontWeight: 'medium',
      whiteSpace: 'nowrap',
      textDecoration: 'none',
      transitionProperty: 'color',
      transitionDuration: 'fast',
      focusVisibleRing: 'inside',
      _icon: { boxSize: '3.5' },
      _hover: { color: 'fg' },
      '&[aria-current=page]': { color: 'fg' },
    },
    topNavIndicator: { position: 'absolute', insetInline: '2.5', bottom: '0', h: '2px', borderRadius: 'full', bg: 'accent.solid' },
    topbarEnd: { display: 'flex', alignItems: 'center', gap: '1', flexShrink: '0', ms: 'auto' },
    body: { display: 'flex', flex: '1', minH: '0' },
    // A place's own menu: its card, its pages, its settings.
    sidebar: {
      display: { base: 'none', md: 'flex' },
      flexDirection: 'column',
      flexShrink: '0',
      position: 'sticky',
      top: 'topbar',
      h: 'calc(100dvh - var(--toda-sizes-topbar))',
      w: 'sidebar',
      bg: 'bg.chrome',
      borderInlineEndWidth: '1px',
      borderColor: 'border',
      zIndex: 'sidebar',
      overflowX: 'hidden',
      transition: `width ${SIDEBAR_EASE}`,
      ...still,
      '&[data-mobile]': { display: 'flex', position: 'static', h: 'full', w: 'full', borderInlineEndWidth: '0' },
    },
    // In both states the place's mark is 12px from the edges: centred in the 56px rail.
    placeHeader: { px: '1', pt: '3', pb: '1', flexShrink: '0' },
    place: {
      display: 'flex',
      alignItems: 'center',
      gap: '2.5',
      p: '2',
      minW: '0',
      overflow: 'hidden',
      borderRadius: 'l3',
      color: 'fg',
      textDecoration: 'none',
      transitionProperty: 'background',
      transitionDuration: 'fast',
      focusVisibleRing: 'outside',
      _hover: { bg: 'bg.muted' },
    },
    placeMark: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSize: '8',
      flexShrink: '0',
      borderRadius: 'l2',
      bg: 'accent.subtle',
      color: 'accent.fg',
      textStyle: 'label',
      fontWeight: 'semibold',
    },
    placeText: { display: 'flex', flexDirection: 'column', minW: '0', transition: WORDS_IN, ...still },
    placeName: { textStyle: 'label', fontWeight: 'semibold', truncate: true },
    placeDetail: { textStyle: 'caption', color: 'fg.subtle', truncate: true },
    sidebarTop: { px: '2', pt: '3', pb: '1' },
    // What folds away in the rail (a section's title, the box at the top): its height glides to nothing as it fades.
    fold: {
      display: 'grid',
      gridTemplateRows: '1fr',
      flexShrink: '0',
      transition: `grid-template-rows ${SIDEBAR_EASE}, ${WORDS_IN}`,
      ...still,
    },
    foldInner: { minH: '0', overflow: 'hidden' },
    nav: {
      flex: '1',
      overflowY: 'auto',
      px: '2',
      py: '2',
      display: 'flex',
      flexDirection: 'column',
      gap: '3',
    },
    navSection: { display: 'flex', flexDirection: 'column', gap: '0.5' },
    navSectionTitle: { textStyle: 'overline', color: 'fg.subtle', px: '2', pb: '1' },
    navSectionToggle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      w: 'full',
      px: '2',
      py: '1',
      textStyle: 'overline',
      color: 'fg.subtle',
      borderRadius: 'l1',
      cursor: 'pointer',
      transitionProperty: 'color',
      transitionDuration: 'fast',
      focusVisibleRing: 'inside',
      _hover: { color: 'fg' },
    },
    navSectionChevron: {
      display: 'inline-flex',
      _icon: { boxSize: '3.5' },
      transitionProperty: 'transform',
      transitionDuration: 'moderate',
      transitionTimingFunction: 'out',
      transform: 'rotate(-90deg)',
      _rtl: { transform: 'rotate(90deg)' },
      '&[data-open]': { transform: 'rotate(0deg)' },
      'html[data-motion=reduced] &': { transitionProperty: 'none' },
    },
    navSectionItems: { display: 'flex', flexDirection: 'column', gap: '0.5' },
    navItem: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '2.5',
      h: 'control.md',
      // 8px of the menu's and 12px here: the 16px icon is centred in the 56px rail, and stays where it is
      px: '3',
      overflow: 'hidden',
      borderRadius: 'l2',
      color: 'fg.muted',
      textStyle: 'md',
      textDecoration: 'none',
      transitionProperty: 'background, color',
      transitionDuration: 'fast',
      focusVisibleRing: 'inside',
      _hover: { bg: 'bg.muted', color: 'fg' },
      '&[aria-current=page]': { color: 'fg.accent', fontWeight: 'medium' },
      // A page under another (a favourite view under Views): shorter and smaller, its icon at the line's side.
      '&[data-nested]': { h: 'control.sm', px: '2', gap: '2', textStyle: 'sm' },
    },
    // The current page's pill, behind its icon and name; it slides when the page changes.
    navItemIndicator: { position: 'absolute', inset: '0', borderRadius: 'l2', bg: 'bg.selected' },
    navItemIcon: { position: 'relative', display: 'inline-flex', flexShrink: '0', _icon: { boxSize: '4' } },
    navItemLabel: { position: 'relative', truncate: true, minW: '0', transition: WORDS_IN, ...still },
    // The pages under a page, indented behind a line from its icon; they fold away in the rail.
    navChildren: { display: 'flex', flexDirection: 'column', gap: '0.5', ms: '5', ps: '1.5', mt: '0.5', borderStartWidth: '1px', borderColor: 'border.muted' },
    // The toggle first, 12px from the edge (centred in the rail), its words after it.
    sidebarFooter: {
      flexShrink: '0',
      px: '3',
      py: '2',
      borderTopWidth: '1px',
      borderColor: 'border.muted',
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      overflow: 'hidden',
      '[data-mobile] &': { display: 'none' },
    },
    sidebarFooterText: { textStyle: 'caption', color: 'fg.subtle', truncate: true, px: '1', transition: WORDS_IN, ...still },
    drawerHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2',
      h: 'topbar',
      px: '3',
      flexShrink: '0',
      borderBottomWidth: '1px',
      borderColor: 'border.muted',
    },
    main: { flex: '1', minW: '0', display: 'flex', flexDirection: 'column' },
    content: { flex: '1', px: { base: '3', md: 'page.x' }, py: 'page.y' },
    contentInner: { mx: 'auto', w: 'full', maxW: 'content' },
  },
  variants: {
    collapsed: {
      true: {
        sidebar: { w: 'sidebarRail' },
        placeText: { opacity: 0, transition: WORDS_OUT },
        fold: { gridTemplateRows: '0fr', opacity: 0, transition: `grid-template-rows ${SIDEBAR_EASE}, ${WORDS_OUT}` },
        navItemLabel: { opacity: 0, textOverflow: 'clip', transition: WORDS_OUT },
        sidebarFooterText: { opacity: 0, textOverflow: 'clip', transition: WORDS_OUT },
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
    // The title keeps room for itself (16rem): on a narrow screen the actions wrap under it rather than squeezing it.
    titleGroup: { display: 'flex', flexDirection: 'column', gap: '1', minW: '0', flex: '1 1 16rem' },
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
  slots: ['root', 'scrollArea', 'sortTrigger', 'sortIcon', 'state', 'navigableRow', 'groupRow', 'groupCell', 'groupHeader', 'groupToggle', 'groupFooterRow', 'groupFooterCell'],
  base: {
    root: { position: 'relative', w: 'full', minW: '0' },
    scrollArea: { overflow: 'auto', w: 'full' },
    sortTrigger: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1',
      color: 'inherit',
      font: 'inherit',
      textTransform: 'inherit',
      letterSpacing: 'inherit',
      cursor: 'pointer',
      borderRadius: 'l1',
      focusVisibleRing: 'outside',
      _hover: { color: 'fg' },
      '&[data-sorted]': { color: 'fg' },
    },
    sortIcon: { display: 'inline-flex', color: 'fg.subtle', _icon: { boxSize: '3.5' }, '[data-sorted] &': { color: 'fg.accent' } },
    state: { px: 'panel', py: '3' },
    // A row moved to with the keyboard (DataTable's selection): selected rows use the table's bg.selected.
    navigableRow: { cursor: 'default', outline: 'none', focusVisibleRing: 'inside' },
    // A grouped table (DataTable's grouping): a group's header row on the subtle surface, its fold button turning.
    groupRow: { bg: 'bg.subtle', _hover: { bg: 'bg.subtle' } },
    groupCell: { py: '2', borderBottomWidth: '1px', borderColor: 'border.muted' },
    groupHeader: { display: 'flex', alignItems: 'center', gap: '2.5', minH: '7' },
    groupToggle: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSize: '6',
      borderRadius: 'l1',
      color: 'fg.muted',
      cursor: 'pointer',
      flexShrink: 0,
      focusVisibleRing: 'outside',
      _hover: { bg: 'bg.emphasized', color: 'fg' },
      _icon: { boxSize: '4', transition: 'transform 0.2s {easings.out}' },
      '[data-folded] &': { _icon: { transform: 'rotate(-90deg)' } },
      '[dir=rtl] [data-folded] &': { _icon: { transform: 'rotate(90deg)' } },
    },
    groupFooterRow: { _hover: { bg: 'transparent' } },
    groupFooterCell: { py: '1.5' },
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
