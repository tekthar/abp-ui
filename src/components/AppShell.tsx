import { useCallback, useState, type ReactNode } from 'react';
import { chakra, Drawer, Portal, SkipNavContent, SkipNavLink, useSlotRecipe, type SystemStyleObject } from '@chakra-ui/react';
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
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
}

export interface AppShellBrand {
  name: ReactNode;
  tagline?: ReactNode;
  /** A small square mark; defaults to the first letter of the name. */
  mark?: ReactNode;
  href?: string;
}

export interface AppShellProps {
  brand: AppShellBrand;
  nav: AppShellNavSection[];
  /** Extra content below the nav sections (e.g. a warning). */
  navFooter?: ReactNode;
  /** Shown at the bottom of the sidebar. */
  sidebarFooter?: ReactNode;
  /** Top bar, after the sidebar toggle (e.g. search, breadcrumbs). */
  topbarStart?: ReactNode;
  /** Top bar, at the end (language, colour mode, account). */
  topbarEnd?: ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
}

const MAIN_ID = 'toda-main';

/**
 * Application frame: a collapsible sidebar on the inline start, a top bar and the content
 * column. Below the md breakpoint the sidebar moves into a drawer. Logical properties only,
 * so the whole frame mirrors in right-to-left locales.
 */
export function AppShell({
  brand,
  nav,
  navFooter,
  sidebarFooter,
  topbarStart,
  topbarEnd,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  children,
}: AppShellProps) {
  const labels = useTodaLabels();
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? collapsedState;
  const [mobileOpen, setMobileOpen] = useState(false);
  const recipe = useSlotRecipe({ key: 'todaAppShell' });
  const styles = recipe({ collapsed });
  const mobileStyles = recipe({ collapsed: false });

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsedState(next);
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

  return (
    <chakra.div css={styles.root}>
      <SkipNavLink id={MAIN_ID}>{labels.skipToContent}</SkipNavLink>
      <chakra.aside css={styles.sidebar} aria-label={labels.navigation} data-collapsed={collapsed || undefined}>
        <SidebarContents
          styles={styles}
          brand={brand}
          nav={nav}
          navFooter={navFooter}
          footer={sidebarFooter}
          collapsed={collapsed}
        />
      </chakra.aside>

      <chakra.div css={styles.main}>
        <chakra.header css={styles.topbar}>
          <chakra.div css={styles.topbarStart}>
            <chakra.span css={styles.mobileToggle}>
              <IconButton size="sm" aria-label={labels.openNavigation} onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            </chakra.span>
            <chakra.span css={styles.desktopToggle}>
              <IconButton
                size="sm"
                aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
                aria-expanded={!collapsed}
                onClick={toggle}
              >
                <DirectionalIcon>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</DirectionalIcon>
              </IconButton>
            </chakra.span>
            {topbarStart}
          </chakra.div>
          <chakra.div css={styles.topbarEnd}>{topbarEnd}</chakra.div>
        </chakra.header>
        <SkipNavContent id={MAIN_ID} />
        <chakra.main css={styles.content}>
          <chakra.div css={styles.contentInner}>{children}</chakra.div>
        </chakra.main>
      </chakra.div>

      <Drawer.Root open={mobileOpen} onOpenChange={(e) => setMobileOpen(e.open)} placement="start" size="xs">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <chakra.div css={mobileStyles.sidebar} data-mobile="" onClick={(e) => {
                // Close after following a link.
                if ((e.target as HTMLElement).closest('a')) setMobileOpen(false);
              }}>
                <SidebarContents
                  styles={mobileStyles}
                  brand={brand}
                  nav={nav}
                  navFooter={navFooter}
                  footer={sidebarFooter}
                  collapsed={false}
                  closeButton={
                    <Drawer.CloseTrigger asChild position="static">
                      <IconButton size="sm" aria-label={labels.close}>
                        <X />
                      </IconButton>
                    </Drawer.CloseTrigger>
                  }
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

function SidebarContents({
  styles,
  brand,
  nav,
  navFooter,
  footer,
  collapsed,
  closeButton,
}: {
  styles: ShellStyles;
  brand: AppShellBrand;
  nav: AppShellNavSection[];
  navFooter?: ReactNode;
  footer?: ReactNode;
  collapsed: boolean;
  closeButton?: ReactNode;
}) {
  const Link = useLinkComponent();
  const labels = useTodaLabels();
  const mark = brand.mark ?? (typeof brand.name === 'string' ? brand.name.slice(0, 1) : null);
  const brandInner = (
    <>
      <chakra.span css={styles.brandMark} aria-hidden="true">
        {mark}
      </chakra.span>
      <chakra.span css={styles.brandText}>
        <chakra.span css={styles.brandName}>{brand.name}</chakra.span>
        {brand.tagline != null && <chakra.span css={styles.brandTagline}>{brand.tagline}</chakra.span>}
      </chakra.span>
    </>
  );
  return (
    <>
      <chakra.div css={styles.sidebarHeader}>
        {brand.href ? (
          <chakra.span asChild css={styles.brand}>
            <Link href={brand.href}>{brandInner}</Link>
          </chakra.span>
        ) : (
          <chakra.span css={styles.brand}>{brandInner}</chakra.span>
        )}
        {closeButton}
      </chakra.div>
      <chakra.nav css={styles.nav} aria-label={labels.navigation}>
        {nav
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <chakra.div key={section.id} css={styles.navSection} role="group" aria-label={section.title}>
              {section.title && (
                <chakra.div css={styles.navSectionTitle} aria-hidden="true">
                  {section.title}
                </chakra.div>
              )}
              {section.items.map((item) => (
                <NavItem key={item.id} item={item} styles={styles} collapsed={collapsed} />
              ))}
            </chakra.div>
          ))}
        {!collapsed && navFooter}
      </chakra.nav>
      {footer != null && <chakra.div css={styles.sidebarFooter}>{footer}</chakra.div>}
    </>
  );
}

function NavItem({ item, styles, collapsed }: { item: AppShellNavItem; styles: ShellStyles; collapsed: boolean }) {
  const Link = useLinkComponent();
  const { isRtl } = useTodaLocale();
  const link = (
    <chakra.a asChild css={styles.navItem}>
      <Link href={item.href} aria-current={item.current ? 'page' : undefined}>
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
