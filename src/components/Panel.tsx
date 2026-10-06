import { forwardRef, type ReactNode } from 'react';
import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';

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
}

/** The bordered surface every block of content sits in. */
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  { title, description, actions, footer, flush = false, headingAs = 'h2', children, css, ...rest },
  ref,
) {
  const recipe = useSlotRecipe({ key: 'todaPanel' });
  const styles = recipe({ flush });
  const hasHeader = title != null || actions != null || description != null;
  return (
    <chakra.section ref={ref as never} css={[styles.root, css]} {...rest}>
      {hasHeader && (
        <chakra.header css={styles.header}>
          <chakra.div css={styles.titleGroup}>
            {title != null && (
              <chakra.h2 as={headingAs} css={styles.title}>
                {title}
              </chakra.h2>
            )}
            {description != null && <chakra.p css={styles.description}>{description}</chakra.p>}
          </chakra.div>
          {actions != null && <chakra.div css={styles.actions}>{actions}</chakra.div>}
        </chakra.header>
      )}
      <chakra.div css={styles.body}>{children}</chakra.div>
      {footer != null && <chakra.footer css={styles.footer}>{footer}</chakra.footer>}
    </chakra.section>
  );
});
