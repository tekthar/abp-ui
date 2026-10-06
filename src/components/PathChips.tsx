import { chakra, useSlotRecipe, type HTMLChakraProps } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';

export interface PathChipsProps extends Omit<HTMLChakraProps<'ol'>, 'children'> {
  /** e.g. ["backend", "engineering", "all-staff"] */
  path: string[];
  /** Emphasise the last segment (the group that was reached). Default true. */
  highlightLast?: boolean;
}

/**
 * A nesting path as chips joined by arrows. The arrow points in reading direction: right in
 * English, left in Arabic. Each segment is bidi-isolated so mixed scripts keep their order.
 */
export function PathChips({ path, highlightLast = true, css, ...rest }: PathChipsProps) {
  const labels = useTodaLabels();
  const recipe = useSlotRecipe({ key: 'todaPathChips' });
  const styles = recipe({});
  return (
    <chakra.ol aria-label={rest['aria-label'] ?? labels.path} css={[styles.root, css]} {...rest}>
      {path.map((segment, i) => (
        <chakra.li key={`${i}:${segment}`} css={styles.item}>
          {i > 0 && (
            <chakra.span css={styles.separator} aria-hidden="true">
              <ChevronRight />
            </chakra.span>
          )}
          <chakra.span css={styles.chip} aria-current={highlightLast && i === path.length - 1 ? true : undefined}>
            {segment}
          </chakra.span>
        </chakra.li>
      ))}
    </chakra.ol>
  );
}
