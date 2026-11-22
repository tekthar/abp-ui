import { createContext, forwardRef, useContext, useId, useState, type ReactNode } from 'react';
import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { Loading } from '../skeleton/loading';
import { Collapse } from '../motion/components';

export interface PanelProps extends Omit<HTMLChakraProps<'section'>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or meta shown at the end of the header. */
  actions?: ReactNode;
  footer?: ReactNode;
  /** No body padding: for tables and lists that run edge to edge. */
  flush?: boolean;
  /** Heading level of the title (default h2). */
  headingAs?: 'h2' | 'h3' | 'h4';
  /** What it holds is waiting for its data (ADR 0061): a `Loading` scope for its body. Its title and actions stay. */
  loading?: boolean;
  /** `card` (the bordered surface) or `section` (a heading over a rule, no box); the nearest `PanelTone`'s when not given. */
  tone?: 'card' | 'section';
  /**
   * The header folds and unfolds the panel: it becomes a button with a chevron before the title (pointing to the end
   * when folded, down when open). The actions stay where they are and work while it's folded; the body and the footer
   * go.
   */
  collapsible?: boolean;
  /** Folded when it first draws (`collapsible`, not controlled). */
  defaultCollapsed?: boolean;
  /** Folded or open, when the host keeps it (`collapsible`); with `onCollapsedChange`. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** A line of what's inside, shown in the header while it's folded ("Arabic · Riyadh", "2 groups"); hidden on narrow screens. */
  summary?: ReactNode;
}

const ToneContext = createContext<'card' | 'section'>('card');

/** The look of every Panel inside it that doesn't ask for its own (the record page's main column: `section`). */
export function PanelTone({ tone, children }: { tone: 'card' | 'section'; children: ReactNode }) {
  return <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>;
}

/** The bordered surface every block of content sits in. */
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  {
    title, description, actions, footer, flush = false, headingAs = 'h2', loading, tone, collapsible = false, defaultCollapsed = false,
    collapsed: collapsedProp, onCollapsedChange, summary, children, css, ...rest
  },
  ref,
) {
  const recipe = useSlotRecipe({ key: 'abpPanel' });
  const inherited = useContext(ToneContext);
  const [ownCollapsed, setOwnCollapsed] = useState(defaultCollapsed);
  const folded = collapsible && (collapsedProp ?? ownCollapsed);
  const styles = recipe({ flush, tone: tone ?? inherited, collapsed: folded });
  const bodyId = useId();
  const hasHeader = title != null || actions != null || description != null;
  const toggle = () => {
    const next = !folded;
    if (collapsedProp === undefined) setOwnCollapsed(next);
    onCollapsedChange?.(next);
  };

  const heading = (
    <chakra.div css={styles.titleGroup}>
      {title != null && (
        <chakra.h2 as={headingAs} css={styles.title}>
          {title}
        </chakra.h2>
      )}
      {description != null && <chakra.p css={styles.description}>{description}</chakra.p>}
    </chakra.div>
  );
  const content = (
    <>
      <chakra.div css={styles.body}>{loading === undefined ? children : <Loading when={loading}>{children}</Loading>}</chakra.div>
      {footer != null && <chakra.footer css={styles.footer}>{footer}</chakra.footer>}
    </>
  );

  return (
    <chakra.section ref={ref as never} css={[styles.root, css]} data-collapsed={folded ? '' : undefined} {...rest}>
      {hasHeader && (
        <chakra.header css={styles.header}>
          {collapsible ? (
            <chakra.button type="button" css={styles.toggle} aria-expanded={!folded} aria-controls={bodyId} onClick={toggle}>
              <chakra.span css={styles.chevron} data-open={folded ? undefined : ''} aria-hidden>
                <ChevronRight size={16} />
              </chakra.span>
              {heading}
              {folded && summary != null && <chakra.span css={styles.summary}>{summary}</chakra.span>}
            </chakra.button>
          ) : (
            heading
          )}
          {actions != null && <chakra.div css={styles.actions}>{actions}</chakra.div>}
        </chakra.header>
      )}
      {collapsible ? (
        <Collapse open={!folded} id={bodyId} display="flex" flexDirection="column" flex="1" minW="0">
          {content}
        </Collapse>
      ) : (
        content
      )}
    </chakra.section>
  );
});
