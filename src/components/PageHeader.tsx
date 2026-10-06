import { Fragment, type ReactNode } from 'react';
import { Breadcrumb, chakra, useSlotRecipe } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useLinkComponent } from '../provider/link';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Omit for the current page. */
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Status pills, counts, owners: shown next to the title. */
  meta?: ReactNode;
  actions?: ReactNode;
}

/** Title block at the top of every page: breadcrumbs, title, description, meta and actions. */
export function PageHeader({ title, description, breadcrumbs, meta, actions }: PageHeaderProps) {
  const recipe = useSlotRecipe({ key: 'todaPageHeader' });
  const styles = recipe({});
  return (
    <chakra.div css={styles.root}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <chakra.div css={styles.row}>
        <chakra.div css={styles.titleGroup}>
          <chakra.h1 css={styles.title}>{title}</chakra.h1>
          {meta != null && <chakra.div css={styles.meta}>{meta}</chakra.div>}
          {description != null && <chakra.p css={styles.description}>{description}</chakra.p>}
        </chakra.div>
        {actions != null && <chakra.div css={styles.actions}>{actions}</chakra.div>}
      </chakra.div>
    </chakra.div>
  );
}

/** Breadcrumb trail; the separator chevron mirrors in right-to-left layouts. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const labels = useTodaLabels();
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
                  <Link href={item.href}>{item.label}</Link>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.CurrentLink>{item.label}</Breadcrumb.CurrentLink>
              )}
            </Breadcrumb.Item>
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
