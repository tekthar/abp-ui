import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useLoading } from '../skeleton/loading';
import { boneWidth, ghostCss } from '../skeleton/bones';

export interface PathChipsProps extends Omit<HTMLChakraProps<'ol'>, 'children'> {
  /** e.g. ["backend", "engineering", "all-staff"] */
  path: string[];
  /** Emphasise the last segment (the group that was reached). Default true. */
  highlightLast?: boolean;
  /** Its path is coming (ADR 0061): `skeletonCount` chips as ghosts. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many chips stand for the path while it loads (3). */
  skeletonCount?: number;
}

/**
 * A nesting path as chips joined by arrows. The arrow points in reading direction: right in
 * English, left in Arabic. Each segment is bidi-isolated so mixed scripts keep their order.
 */
export function PathChips({ path, highlightLast = true, loading: own, skeletonCount = 3, css, ...rest }: PathChipsProps) {
  const labels = useTodaLabels();
  const recipe = useSlotRecipe({ key: 'todaPathChips' });
  const styles = recipe({});
  const loading = useLoading(own) && path.length === 0;
  const segments = loading ? Array.from({ length: skeletonCount }, (_, i) => '\u00a0'.repeat(boneWidth(i, 6, 12))) : path;
  return (
    <chakra.ol aria-label={rest['aria-label'] ?? labels.path} aria-hidden={loading || undefined} css={[styles.root, css]} {...rest}>
      {segments.map((segment, i) => (
        <chakra.li key={`${i}:${segment}`} css={styles.item}>
          {i > 0 && (
            <chakra.span css={styles.separator} aria-hidden="true">
              <ChevronRight />
            </chakra.span>
          )}
          <chakra.span css={loading ? [styles.chip, ghostCss] : styles.chip} aria-current={!loading && highlightLast && i === path.length - 1 ? true : undefined}>
            {segment}
          </chakra.span>
        </chakra.li>
      ))}
    </chakra.ol>
  );
}
