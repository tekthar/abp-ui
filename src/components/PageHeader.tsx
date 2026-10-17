import { Fragment, type ReactNode } from 'react';
import { Breadcrumb, chakra, useSlotRecipe } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useLinkComponent } from '../provider/link';
import { useLoading } from '../skeleton/loading';
import { TextBone } from '../skeleton/bones';

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
  actions?: ReactNode;
  /** The page is waiting for its data (ADR 0061). The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many characters wide the title's placeholder is (24). */
  titleWidth?: number;
}

/** Title block at the top of every page: breadcrumbs, title, description, meta and actions. */
export function PageHeader({ title, description, breadcrumbs, meta, actions, loading: own, titleWidth = 24 }: PageHeaderProps) {
  const recipe = useSlotRecipe({ key: 'todaPageHeader' });
  const styles = recipe({});
  const loading = useLoading(own);
  return (
    <chakra.div css={styles.root}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <chakra.div css={styles.row}>
        <chakra.div css={styles.titleGroup}>
          <chakra.h1 css={styles.title}>{loading && title == null ? <TextBone width={titleWidth} /> : title}</chakra.h1>
          {meta != null && <chakra.div css={styles.meta}>{meta}</chakra.div>}
          {description != null && <chakra.p css={styles.description}>{description}</chakra.p>}
        </chakra.div>
        {actions != null && <chakra.div css={styles.actions}>{actions}</chakra.div>}
      </chakra.div>
    </chakra.div>
  );
}

/** Breadcrumb trail; the separator chevron mirrors in right-to-left layouts. */
export function Breadcrumbs({ items, loading: own }: { items: BreadcrumbItem[]; loading?: boolean }) {
  const labels = useTodaLabels();
  const loading = useLoading(own);
  const label = (item: BreadcrumbItem, i: number) => (loading && item.label == null ? <TextBone width={8 + (i % 3) * 3} /> : item.label);
  const Link = useLinkComponent();
  return (
    <Breadcrumb.Root aria-label={labels.breadcrumb}>
      <Breadcrumb.List>
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <Breadcrumb.Separator>
                <ChevronRight />
              </Breadcrumb.Separator>
            )}
            <Breadcrumb.Item>
              {item.href && i < items.length - 1 ? (
                <Breadcrumb.Link asChild>
                  <Link href={item.href}>{label(item, i)}</Link>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.CurrentLink>{label(item, i)}</Breadcrumb.CurrentLink>
              )}
            </Breadcrumb.Item>
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
