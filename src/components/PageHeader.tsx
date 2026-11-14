import { Fragment, type ReactNode } from 'react';
import { Breadcrumb, chakra, Menu, Portal, useSlotRecipe } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { useAbpLabels } from '../provider/labels';
import { usePageTitle, type TitleParts } from '../provider/title';
import { useLinkComponent } from '../provider/link';
import { useLoading } from '../skeleton/loading';
import { TextBone } from '../skeleton/bones';
import { CountBadge } from './CountBadge';
import { foldBreadcrumbs } from '../rules';

export interface BreadcrumbItem {
  /** Its label; while the page loads, one not given yet is drawn as text that's coming. */
  label?: ReactNode;
  /** Omit for the current page. */
  href?: string;
}

export interface PageHeaderProps {
  /** The page's title; while the page loads, one not given yet is drawn as text that's coming, in the title's size. */
  title?: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Status pills, counts, owners: shown next to the title. */
  meta?: ReactNode;
  /** How many things the page holds, in a badge right after the title ("Records 130"). */
  count?: number | null;
  /** Small things that belong to the title itself, right after it (and its count): a favourite star, who sees it. */
  adornments?: ReactNode;
  actions?: ReactNode;
  /** The page is waiting for its data (ADR 0061). The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many characters wide the title's placeholder is (24). */
  titleWidth?: number;
  /**
   * What the browser's tab says for the page, most specific part first, without the site's name (PageTitleProvider).
   * By default the title, when it's text, then the breadcrumb above the page, when that's text ("Groups · People").
   * Give it for a title that's a node (a record's key and title); null claims nothing.
   */
  documentTitle?: TitleParts;
}

/** A label that can stand in the tab: text, not a node. */
const textOf = (label: ReactNode): string | undefined => (typeof label === 'string' || typeof label === 'number' ? String(label) : undefined);

/** Title block at the top of every page: breadcrumbs, title, description, meta and actions. */
export function PageHeader({ title, description, breadcrumbs, meta, count, adornments, actions, loading: own, titleWidth = 24, documentTitle }: PageHeaderProps) {
  const recipe = useSlotRecipe({ key: 'abpPageHeader' });
  const text = textOf(title);
  const where = breadcrumbs?.filter((b) => b.href).map((b) => textOf(b.label)).filter((l) => l && l !== text).pop();
  usePageTitle(documentTitle !== undefined ? documentTitle : text ? [text, where] : null);
  const styles = recipe({});
  const loading = useLoading(own);
  return (
    <chakra.div css={styles.root}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <chakra.div css={styles.row}>
        <chakra.div css={styles.titleGroup}>
          {count != null || adornments != null ? (
            <chakra.div display="flex" alignItems="center" gap="2.5" flexWrap="wrap" minW="0">
              <chakra.h1 css={styles.title}>{loading && title == null ? <TextBone width={titleWidth} /> : title}</chakra.h1>
              {count != null && <CountBadge value={count} size="md" />}
              {adornments}
            </chakra.div>
          ) : (
            <chakra.h1 css={styles.title}>{loading && title == null ? <TextBone width={titleWidth} /> : title}</chakra.h1>
          )}
          {meta != null && <chakra.div css={styles.meta}>{meta}</chakra.div>}
          {description != null && <chakra.p css={styles.description}>{description}</chakra.p>}
        </chakra.div>
        {actions != null && <chakra.div css={styles.actions}>{actions}</chakra.div>}
      </chakra.div>
    </chakra.div>
  );
}

/**
 * Breadcrumb trail; the separator chevron mirrors in right-to-left layouts. Past four levels the middle ones fold into
 * "…", a menu of them (the canvas's v12, UI round 9 step 66): the first and the last two stay.
 */
export function Breadcrumbs({ items, loading: own }: { items: BreadcrumbItem[]; loading?: boolean }) {
  const labels = useAbpLabels();
  const loading = useLoading(own);
  const label = (item: BreadcrumbItem, i: number) => (loading && item.label == null ? <TextBone width={8 + (i % 3) * 3} /> : item.label);
  const Link = useLinkComponent();
  const { shown, hidden } = foldBreadcrumbs(items);
  return (
    <Breadcrumb.Root aria-label={labels.breadcrumb}>
      <Breadcrumb.List>
        {shown.map((entry, n) => (
          <Fragment key={entry ? entry.index : 'more'}>
            {n > 0 && (
              <Breadcrumb.Separator>
                <ChevronRight />
              </Breadcrumb.Separator>
            )}
            {entry == null ? (
              <Breadcrumb.Item>
                <Menu.Root positioning={{ placement: 'bottom-start' }}>
                  <Menu.Trigger asChild>
                    <chakra.button type="button" px="1" rounded="l1" color="fg.muted" cursor="pointer" _hover={{ color: 'fg', bg: 'bg.muted' }}
                      focusVisibleRing="outside" aria-label={labels.moreBreadcrumbs} title={labels.moreBreadcrumbs}>
                      …
                    </chakra.button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content minW="40">
                        {hidden.map((h, k) => (
                          <Menu.Item key={k} value={String(k)} asChild={Boolean(h.href)}>
                            {h.href ? <Link href={h.href}>{h.label}</Link> : <span>{h.label}</span>}
                          </Menu.Item>
                        ))}
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </Breadcrumb.Item>
            ) : (
            <Breadcrumb.Item>
              {entry.item.href && entry.index < items.length - 1 ? (
                <Breadcrumb.Link asChild>
                  <Link href={entry.item.href}>{label(entry.item, entry.index)}</Link>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.CurrentLink>{label(entry.item, entry.index)}</Breadcrumb.CurrentLink>
              )}
            </Breadcrumb.Item>
            )}
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
