import { useCallback, useState, type ReactNode } from 'react';
import { chakra, Drawer, Portal, SkipNavContent, SkipNavLink, useSlotRecipe, type SystemStyleObject } from '@chakra-ui/react';
import { ChevronDown, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Collapse, FadeIn, Indicator } from '../motion/components';
import { useTodaLabels } from '../provider/labels';
import { useLinkComponent } from '../provider/link';
import { useTodaLocale } from '../provider/locale';
import { IconButton } from './Button';
import { DirectionalIcon } from './DirectionalIcon';
import { Tooltip } from './Tooltip';

export interface AppShellNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  /** Marks the item as the current page (aria-current). */
  current?: boolean;
}

export interface AppShellNavSection {
  id: string;
  title?: string;
  items: AppShellNavItem[];
  /** The title opens and closes the section (a project's settings); it opens by itself when it holds the current page. */
  collapsible?: boolean;
}

export interface AppShellBrand {
  name: ReactNode;
  tagline?: ReactNode;
  /** A small square mark; defaults to the first letter of the name. */
  mark?: ReactNode;
  href?: string;
}

/** The place a sidebar belongs to (a project, Administration): shown as a card at its top. */
export interface AppShellPlace {
  name: string;
  /** Under the name: a key, a kind. */
  detail?: ReactNode;
  /** A small square mark; defaults to the first letter of the name. */
  mark?: ReactNode;
  href?: string;
}

/** A place's own menu (ADR 0058): a project's pages and settings, or Administration's. */
export interface AppShellSidebar {
  /** Which place: the current page's mark slides within it, and a new place arrives softly. */
  id: string;
  place?: AppShellPlace;
  /** Above the sections (e.g. a box to find a page in the menu). */
  top?: ReactNode;
  sections: AppShellNavSection[];
}

export interface AppShellProps {
  brand: AppShellBrand;
  /** Right after the brand, always shown (e.g. the way back from Administration). */
  topbarStart?: ReactNode;
  /** The site's pages, in the top bar. */
  topNav: AppShellNavItem[];
  /** After the site's pages in the top bar (e.g. an Apps menu). */
  topNavEnd?: ReactNode;
  /** The current place's own menu; without one there is no sidebar and the page uses the width. */
  sidebar?: AppShellSidebar | null;
  /** Extra content below the menu (e.g. a warning). */
  navFooter?: ReactNode;
  /** Shown at the bottom of the sidebar. */
  sidebarFooter?: ReactNode;
  /** Top bar, at the end (help, notices, language, colour mode, settings, account). */
  topbarEnd?: ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
}

const MAIN_ID = 'toda-main';

/**
 * Application frame (ADR 0058): the site's pages in the top bar, with a mark that slides to the current one; a place's
 * own menu (a project's, Administration's) in a sidebar on the inline start, collapsible to a rail; none elsewhere.
 * Below the lg breakpoint the site's pages, and below md the place's menu too, move into a drawer. Logical properties
 * only, so the whole frame mirrors in right-to-left locales.
 */
export function AppShell({
  brand,
  topbarStart,
  topNav,
  topNavEnd,
  sidebar,
  navFooter,
  sidebarFooter,
  topbarEnd,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  children,
}: AppShellProps) {
  const labels = useTodaLabels();
  const Link = useLinkComponent();
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? collapsedState;
  const [mobileOpen, setMobileOpen] = useState(false);
  const recipe = useSlotRecipe({ key: 'todaAppShell' });
  const styles = recipe({ collapsed });
  const mobileStyles = recipe({ collapsed: false });
  const hasSidebar = sidebar != null && (sidebar.top != null || sidebar.sections.some((s) => s.items.length > 0));

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsedState(next);
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

  const mark = brand.mark ?? (typeof brand.name === 'string' ? brand.name.slice(0, 1) : null);
  const brandInner = (
    <>
      <chakra.span css={styles.brandMark} aria-hidden="true">
        {mark}
      </chakra.span>
      <chakra.span css={styles.brandText}>
        <chakra.span css={styles.brandName}>{brand.name}</chakra.span>
      </chakra.span>
    </>
  );

  return (
    <chakra.div css={styles.root}>
      <SkipNavLink id={MAIN_ID}>{labels.skipToContent}</SkipNavLink>
      <chakra.header css={styles.topbar}>
        <chakra.span css={styles.mobileToggle}>
          <IconButton size="sm" aria-label={labels.openNavigation} onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
        </chakra.span>
        {brand.href ? (
          <chakra.span asChild css={styles.brand}>
            <Link href={brand.href}>{brandInner}</Link>
          </chakra.span>
        ) : (
          <chakra.span css={styles.brand}>{brandInner}</chakra.span>
        )}
        {topbarStart != null && <chakra.div css={styles.topbarStart}>{topbarStart}</chakra.div>}
        <chakra.nav css={styles.topNav} aria-label={labels.navigation}>
          {topNav.map((item) => (
            <TopNavItem key={item.id} item={item} styles={styles} />
          ))}
          {topNavEnd}
        </chakra.nav>
        <chakra.div css={styles.topbarEnd}>{topbarEnd}</chakra.div>
      </chakra.header>

      <chakra.div css={styles.body}>
        {hasSidebar && (
          <chakra.aside css={styles.sidebar} aria-label={sidebar.place?.name ?? labels.navigation} data-collapsed={collapsed || undefined}>
            <FadeIn key={sidebar.id} from="start" display="flex" flexDirection="column" minH="0" flex="1">
              <SidebarContents styles={styles} sidebar={sidebar} navFooter={navFooter} collapsed={collapsed} />
            </FadeIn>
            <chakra.div css={styles.sidebarFooter}>
              {!collapsed && <chakra.span css={styles.sidebarFooterText}>{sidebarFooter}</chakra.span>}
              <IconButton size="sm" aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar} aria-expanded={!collapsed} onClick={toggle}>
                <DirectionalIcon>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</DirectionalIcon>
              </IconButton>
            </chakra.div>
          </chakra.aside>
        )}
        <chakra.div css={styles.main}>
          <SkipNavContent id={MAIN_ID} />
          <chakra.main css={styles.content}>
            <chakra.div css={styles.contentInner}>{children}</chakra.div>
          </chakra.main>
        </chakra.div>
      </chakra.div>

      <Drawer.Root open={mobileOpen} onOpenChange={(e) => setMobileOpen(e.open)} placement="start" size="xs">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <chakra.div
                css={mobileStyles.sidebar}
                data-mobile=""
                onClick={(e) => {
                  // Close after following a link.
                  if ((e.target as HTMLElement).closest('a')) setMobileOpen(false);
                }}
              >
                <chakra.div css={mobileStyles.drawerHeader}>
                  <chakra.span css={mobileStyles.brand}>{brandInner}</chakra.span>
                  <Drawer.CloseTrigger asChild position="static">
                    <IconButton size="sm" aria-label={labels.close}>
                      <X />
                    </IconButton>
                  </Drawer.CloseTrigger>
                </chakra.div>
                <SidebarContents
                  styles={mobileStyles}
                  // The site's pages first, then the place's, headed by its name.
                  sidebar={{
                    id: `drawer-${sidebar?.id ?? 'site'}`,
                    top: hasSidebar ? sidebar.top : undefined,
                    sections: [
                      { id: 'site', items: topNav },
                      ...(hasSidebar
                        ? sidebar.sections.map((s, i) => (i === 0 && !s.title && sidebar.place ? { ...s, title: sidebar.place.name } : s))
                        : []),
                    ],
                  }}
                  navFooter={navFooter}
                  collapsed={false}
                />
              </chakra.div>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </chakra.div>
  );
}

type ShellStyles = Record<string, SystemStyleObject>;

/** A site page in the top bar: its name (icons are for the drawer), and the mark under it when it's current. */
function TopNavItem({ item, styles }: { item: AppShellNavItem; styles: ShellStyles }) {
  const Link = useLinkComponent();
  return (
    <chakra.a asChild css={styles.topNavItem}>
      <Link href={item.href} aria-current={item.current ? 'page' : undefined}>
        {item.label}
        {item.current && <Indicator group="toda-top-nav" css={styles.topNavIndicator} />}
      </Link>
    </chakra.a>
  );
}

function SidebarContents({
  styles,
  sidebar,
  navFooter,
  collapsed,
}: {
  styles: ShellStyles;
  sidebar: AppShellSidebar;
  navFooter?: ReactNode;
  collapsed: boolean;
}) {
  const Link = useLinkComponent();
  const labels = useTodaLabels();
  const { place } = sidebar;
  const placeMark = place ? (place.mark ?? place.name.slice(0, 1).toUpperCase()) : null;
  const placeInner = place && (
    <>
      <chakra.span css={styles.placeMark} aria-hidden="true">
        {placeMark}
      </chakra.span>
      <chakra.span css={styles.placeText}>
        <chakra.span css={styles.placeName}>{place.name}</chakra.span>
        {place.detail != null && <chakra.span css={styles.placeDetail}>{place.detail}</chakra.span>}
      </chakra.span>
    </>
  );
  return (
    <>
      {place && (
        <chakra.div css={styles.placeHeader}>
          {place.href ? (
            <chakra.span asChild css={styles.place}>
              <Link href={place.href}>{placeInner}</Link>
            </chakra.span>
          ) : (
            <chakra.span css={styles.place}>{placeInner}</chakra.span>
          )}
        </chakra.div>
      )}
      {sidebar.top != null && !collapsed && <chakra.div css={styles.sidebarTop}>{sidebar.top}</chakra.div>}
      <chakra.nav css={styles.nav} aria-label={place?.name ?? labels.navigation}>
        {sidebar.sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <NavSection key={section.id} section={section} styles={styles} collapsed={collapsed} group={sidebar.id} />
          ))}
        {!collapsed && navFooter}
      </chakra.nav>
    </>
  );
}

function NavSection({ section, styles, collapsed, group }: { section: AppShellNavSection; styles: ShellStyles; collapsed: boolean; group: string }) {
  const holdsCurrent = section.items.some((i) => i.current);
  const [open, setOpen] = useState(holdsCurrent || !section.collapsible);
  const shown = !section.collapsible || collapsed || open || holdsCurrent;
  const items = section.items.map((item) => <NavItem key={item.id} item={item} styles={styles} collapsed={collapsed} group={group} />);
  return (
    <chakra.div css={styles.navSection} role="group" aria-label={section.title}>
      {section.title &&
        (section.collapsible && !collapsed ? (
          <chakra.button type="button" css={styles.navSectionToggle} aria-expanded={shown} onClick={() => setOpen(!shown)}>
            <chakra.span>{section.title}</chakra.span>
            <chakra.span css={styles.navSectionChevron} data-open={shown || undefined} aria-hidden="true">
              <ChevronDown />
            </chakra.span>
          </chakra.button>
        ) : (
          <chakra.div css={styles.navSectionTitle} aria-hidden="true">
            {section.title}
          </chakra.div>
        ))}
      {section.collapsible && !collapsed ? (
        <Collapse open={shown}>
          <chakra.div css={styles.navSectionItems}>{items}</chakra.div>
        </Collapse>
      ) : (
        <chakra.div css={styles.navSectionItems}>{items}</chakra.div>
      )}
    </chakra.div>
  );
}

function NavItem({ item, styles, collapsed, group }: { item: AppShellNavItem; styles: ShellStyles; collapsed: boolean; group: string }) {
  const Link = useLinkComponent();
  const { isRtl } = useTodaLocale();
  const link = (
    <chakra.a asChild css={styles.navItem}>
      <Link href={item.href} aria-current={item.current ? 'page' : undefined}>
        {item.current && <Indicator group={`toda-side-${group}`} css={styles.navItemIndicator} />}
        <chakra.span css={styles.navItemIcon} aria-hidden="true">
          {item.icon ?? <chakra.span textStyle="label">{item.label.slice(0, 1)}</chakra.span>}
        </chakra.span>
        <chakra.span css={styles.navItemLabel}>{item.label}</chakra.span>
      </Link>
    </chakra.a>
  );
  if (!collapsed) return link;
  return (
    <Tooltip content={item.label} positioning={{ placement: isRtl ? 'left' : 'right' }}>
      {link}
    </Tooltip>
  );
}
