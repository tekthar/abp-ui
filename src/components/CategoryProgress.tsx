'use client';

import { Box, HStack } from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { shineCss } from '../skeleton/bones';

export interface CategoryProgressProps {
  todo: number;
  inProgress: number;
  done: number;
  /** What the bar says to screen readers ("3 of 8 done, 2 in progress"); the bar itself is a picture. */
  'aria-label': string;
  size?: 'sm' | 'md';
  /** Its counts are coming (ADR 0061): the track shines. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/**
 * Work by status category as one bar (releases, sprints): done, then in progress, then to do, each as wide as its
 * share. Empty work draws an empty track.
 */
export function CategoryProgress({ todo, inProgress, done, size = 'md', loading: own, 'aria-label': ariaLabel }: CategoryProgressProps) {
  const loading = useLoading(own);
  const total = loading ? 0 : todo + inProgress + done;
  const parts = [
    { key: 'done', value: done },
    { key: 'inProgress', value: inProgress },
    { key: 'todo', value: todo },
  ] as const;
  return (
    <HStack role="img" aria-label={ariaLabel} gap="0" h={size === 'sm' ? '1.5' : '2'} w="full" minW="16" rounded="full" overflow="hidden" bg="bg.muted" css={loading ? shineCss : undefined}>
      {total > 0 &&
        parts
          .filter((p) => p.value > 0)
          .map((p) => <Box key={p.key} h="full" flexBasis={`${(p.value / total) * 100}%`} flexShrink={0} bg={`statusCategory.${p.key}.solid`} />)}
    </HStack>
  );
}
