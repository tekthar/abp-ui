import { useCallback, useState, type ReactNode } from 'react';
import { chakra, Drawer, Portal, SkipNavContent, SkipNavLink, useSlotRecipe, type SystemStyleObject } from '@chakra-ui/react';
import { ChevronDown, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { ArriveOnChange, Collapse, FadeIn, Indicator, Swap } from '../motion/components';
import { useAbpLabels } from '../provider/labels';
import { useLinkComponent } from '../provider/link';
import { useAbpLocale } from '../provider/locale';
import { IconButton } from './Button';
import { DirectionalIcon } from './DirectionalIcon';
import { Tooltip } from './Tooltip';
import { Loading, useArriving } from '../skeleton/loading';
import { arriveCss, Bone, boneWidth, ghostCss, TextBone } from '../skeleton/bones';

export interface AppShellNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  /** Marks the item as the current page (aria-current). */
  current?: boolean;
  /** Pages under this one (a person's favourite views under Views), indented below it; hidden in the rail. */
  children?: AppShellNavItem[];
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
  /**
   * Its place and pages are coming (ADR 0061): the sidebar is there from the first moment, so the page beside it
   * doesn't move when they come. Its card and `skeletonItems` pages (5) are placeholders until then.
   */
  loading?: boolean;
  skeletonItems?: number;
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
  /** Changes with the page (its address): the content then arrives with a quick fade, without remounting. */
  pageKey?: string;
  children: ReactNode;
}

const MAIN_ID = 'abp-main';

/**
 * Application frame (ADR 0058): the site's pages in the top bar, with a mark that slides to the current one; a place's
 * own menu (a project's, Administration's) in a sidebar on the inline start, collapsible to a rail; none elsewhere.
 * Below the xl breakpoint the site's pages, and below md the place's menu too, move into a drawer. Logical properties
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
  pageKey,
  children,
}: AppShellProps) {
  const labels = useAbpLabels();
  const Link = useLinkComponent();
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? collapsedState;
  const [mobileOpen, setMobileOpen] = useState(false);
  const recipe = useSlotRecipe({ key: 'abpAppShell' });
  const styles = recipe({ collapsed });
  const mobileStyles = recipe({ collapsed: false });
  const hasSidebar = sidebar != null && (!!sidebar.loading || sidebar.top != null || sidebar.sections.some((s) => s.items.length > 0));

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
              <IconButton size="sm" aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar} aria-expanded={!collapsed} onClick={toggle}>
                <Swap swapKey={collapsed ? 'open' : 'close'} from="fade">
                  <DirectionalIcon>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</DirectionalIcon>
                </Swap>
              </IconButton>
              <chakra.span css={styles.sidebarFooterText} aria-hidden={collapsed || undefined}>
                {sidebarFooter}
              </chakra.span>
            </chakra.div>
          </chakra.aside>
        )}
        <chakra.div css={styles.main}>
          <SkipNavContent id={MAIN_ID} />
          <chakra.main css={styles.content}>
            <ArriveOnChange token={pageKey ?? ''} css={styles.contentInner}>
              {children}
            </ArriveOnChange>
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
                    loading: hasSidebar && sidebar.loading,
                    skeletonItems: hasSidebar ? sidebar.skeletonItems : undefined,
                    sections: [
                      { id: 'site', items: topNav },
                      ...(hasSidebar
                        ? sidebar.sections.map((s, i) => (i === 0 && !s.title && sidebar.place ? { ...s, title: sidebar.place.name } : s))
                        : []),
                    ],
                  }}
                  navFooter={navFooter}
                  collapsed={false}
                  drawer
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

/** A site page in the top bar: its name (icons are for the drawer), on the pill when it's current. */
function TopNavItem({ item, styles }: { item: AppShellNavItem; styles: ShellStyles }) {
  const Link = useLinkComponent();
  return (
    <chakra.a asChild css={styles.topNavItem}>
      <Link href={item.href} aria-current={item.current ? 'page' : undefined}>
        {item.current && <Indicator group="abp-top-nav" css={styles.topNavIndicator} />}
        <chakra.span css={styles.topNavLabel}>{item.label}</chakra.span>
      </Link>
    </chakra.a>
  );
}

function SidebarContents({
  styles,
  sidebar,
  navFooter,
  collapsed,
  drawer = false,
}: {
  styles: ShellStyles;
  sidebar: AppShellSidebar;
  navFooter?: ReactNode;
  collapsed: boolean;
  /** In the drawer, where the place's name heads its pages instead of a card. */
  drawer?: boolean;
}) {
  const Link = useLinkComponent();
  const labels = useAbpLabels();
  const { place } = sidebar;
  const loading = !!sidebar.loading;
  // The real card and pages fade in where their placeholders were.
  const arrive = useArriving(loading) ? arriveCss : undefined;
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
      {place ? (
        <chakra.div css={[styles.placeHeader, arrive]}>
          {place.href ? (
            <chakra.span asChild css={styles.place}>
              <Link href={place.href}>{placeInner}</Link>
            </chakra.span>
          ) : (
            <chakra.span css={styles.place}>{placeInner}</chakra.span>
          )}
        </chakra.div>
      ) : (
        loading &&
        !drawer && (
          // The place's card, its name and key coming: the same elements, so it's as tall as the real one.
          <chakra.div css={styles.placeHeader} aria-hidden="true">
            <chakra.span css={styles.place} pointerEvents="none">
              <chakra.span css={[styles.placeMark, ghostCss]}>&nbsp;</chakra.span>
              <chakra.span css={styles.placeText}>
                <chakra.span css={styles.placeName}>
                  <TextBone width={14} />
                </chakra.span>
                <chakra.span css={styles.placeDetail}>
                  <TextBone width={4} />
                </chakra.span>
              </chakra.span>
            </chakra.span>
          </chakra.div>
        )
      )}
      {sidebar.top != null && (
        // Folded away in the rail (and out of reach of the keyboard there).
        <chakra.div css={styles.fold} inert={collapsed || undefined}>
          <chakra.div css={styles.foldInner}>
            <chakra.div css={styles.sidebarTop}>{sidebar.top}</chakra.div>
          </chakra.div>
        </chakra.div>
      )}
      <chakra.nav css={[styles.nav, arrive]} aria-label={place?.name ?? labels.navigation}>
        {sidebar.sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <NavSection key={section.id} section={section} styles={styles} collapsed={collapsed} group={sidebar.id} />
          ))}
        {loading && (
          // The place's pages, coming: rows of the nav's own items, the same in the rail and out of it (ADR 0061).
          <Loading when>
            <chakra.div css={styles.navSection} aria-hidden="true">
              <chakra.div css={styles.navSectionItems}>
                {Array.from({ length: sidebar.skeletonItems ?? 5 }, (_, n) => (
                  <chakra.span key={n} css={styles.navItem} pointerEvents="none">
                    <chakra.span css={styles.navItemIcon}>
                      <Bone width="4" height="4" />
                    </chakra.span>
                    <chakra.span css={styles.navItemLabel}>
                      <TextBone width={boneWidth(n, 6, 12)} />
                    </chakra.span>
                  </chakra.span>
                ))}
              </chakra.div>
            </chakra.div>
          </Loading>
        )}
        {navFooter != null && (
          <chakra.div css={styles.fold} inert={collapsed || undefined}>
            <chakra.div css={styles.foldInner}>{navFooter}</chakra.div>
          </chakra.div>
        )}
      </chakra.nav>
    </>
  );
}

function NavSection({ section, styles, collapsed, group }: { section: AppShellNavSection; styles: ShellStyles; collapsed: boolean; group: string }) {
  const holdsCurrent = section.items.some((i) => i.current || i.children?.some((c) => c.current));
  const [open, setOpen] = useState(holdsCurrent || !section.collapsible);
  const shown = !section.collapsible || collapsed || open || holdsCurrent;
  const items = section.items.map((item) => <NavItem key={item.id} item={item} styles={styles} collapsed={collapsed} group={group} />);
  // The same elements in the rail and out of it, so collapsing is only transitions: the title folds away (the group
  // keeps its name for screen readers), a section that opens and closes shows its pages in the rail.
  return (
    <chakra.div css={styles.navSection} role="group" aria-label={section.title}>
      {section.title && (
        <chakra.div css={styles.fold} inert={collapsed || undefined}>
          <chakra.div css={styles.foldInner}>
            {section.collapsible ? (
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
            )}
          </chakra.div>
        </chakra.div>
      )}
      {section.collapsible ? (
        <Collapse open={shown}>
          <chakra.div css={styles.navSectionItems}>{items}</chakra.div>
        </Collapse>
      ) : (
        <chakra.div css={styles.navSectionItems}>{items}</chakra.div>
      )}
    </chakra.div>
  );
}

function NavItem({ item, styles, collapsed, group, nested }: { item: AppShellNavItem; styles: ShellStyles; collapsed: boolean; group: string; nested?: boolean }) {
  const Link = useLinkComponent();
  const { isRtl } = useAbpLocale();
  const link = (
    <chakra.a asChild css={styles.navItem}>
      <Link href={item.href} aria-current={item.current ? 'page' : undefined} data-nested={nested || undefined}>
        {item.current && <Indicator group={`abp-side-${group}`} css={styles.navItemIndicator} />}
        <chakra.span css={styles.navItemIcon} aria-hidden="true">
          {item.icon ?? <chakra.span textStyle="label">{item.label.slice(0, 1)}</chakra.span>}
        </chakra.span>
        <chakra.span css={styles.navItemLabel}>{item.label}</chakra.span>
      </Link>
    </chakra.a>
  );
  // Its name beside it in the rail; the tooltip stays in place either way, so the link isn't remounted (its name fades).
  const own = (
    <Tooltip content={item.label} inactive={!collapsed} positioning={{ placement: isRtl ? 'left' : 'right' }}>
      {link}
    </Tooltip>
  );
  if (!item.children?.length) return own;
  // The pages under it fold away in the rail, as section titles do: there's no room to tell them apart from it there.
  return (
    <>
      {own}
      <chakra.div css={styles.fold} inert={collapsed || undefined}>
        <chakra.div css={styles.foldInner}>
          <chakra.div css={styles.navChildren} role="group" aria-label={item.label}>
            {item.children.map((child) => (
              <NavItem key={child.id} item={child} styles={styles} collapsed={collapsed} group={group} nested />
            ))}
          </chakra.div>
        </chakra.div>
      </chakra.div>
    </>
  );
}
