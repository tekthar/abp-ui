import { forwardRef, type ReactNode } from 'react';
import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';
import { useArriving, useLoading } from '../skeleton/loading';
import { arriveCss, ghostCss } from '../skeleton/bones';

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
  /** Its label is coming (ADR 0061): drawn as its own ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many characters wide its placeholder is, when its label isn't known yet (8). */
  skeletonWidth?: number;
  children?: ReactNode;
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(function StatusPill(
  { tone = 'neutral', category, variant = 'subtle', size = 'sm', dot = true, loading: own, skeletonWidth = 8, children, css, ...rest },
  ref,
) {
  const recipe = useSlotRecipe({ key: 'abpStatusPill' });
  const styles = recipe({ tone: category ?? tone, variant, size });
  const loading = useLoading(own);
  const arriving = useArriving(loading);
  const unknown = children == null || children === '';
  return (
    <chakra.span ref={ref} css={[styles.root, loading ? ghostCss : arriving ? arriveCss : undefined, css]} aria-hidden={loading || undefined} {...rest}>
      {dot && <chakra.span css={styles.indicator} aria-hidden="true" />}
      {loading && unknown ? <chakra.span display="inline-block" width={`${skeletonWidth}ch`}>&nbsp;</chakra.span> : children}
    </chakra.span>
  );
});
