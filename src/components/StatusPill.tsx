import { forwardRef, type ReactNode } from 'react';
import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';

/** Semantic status tones. Separate from the accent: success is never "brand". */
export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
/** Work-item status categories. */
export type StatusCategory = 'todo' | 'inProgress' | 'done';

export interface StatusPillProps extends Omit<HTMLChakraProps<'span'>, 'children'> {
  tone?: StatusTone;
  /** Use a status category instead of a tone (to do / in progress / done). */
  category?: StatusCategory;
  variant?: 'subtle' | 'outline';
  size?: 'sm' | 'md';
  /** Show the coloured dot (default true): status is never told by colour alone, the label carries it. */
  dot?: boolean;
  children: ReactNode;
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(function StatusPill(
  { tone = 'neutral', category, variant = 'subtle', size = 'sm', dot = true, children, css, ...rest },
  ref,
) {
  const recipe = useSlotRecipe({ key: 'todaStatusPill' });
  const styles = recipe({ tone: category ?? tone, variant, size });
  return (
    <chakra.span ref={ref} css={[styles.root, css]} {...rest}>
      {dot && <chakra.span css={styles.indicator} aria-hidden="true" />}
      {children}
    </chakra.span>
  );
});
