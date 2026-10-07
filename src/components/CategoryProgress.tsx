'use client';

import { Box, HStack } from '@chakra-ui/react';

export interface CategoryProgressProps {
  todo: number;
  inProgress: number;
  done: number;
  /** What the bar says to screen readers ("3 of 8 done, 2 in progress"); the bar itself is a picture. */
  'aria-label': string;
  size?: 'sm' | 'md';
}

/**
 * Work by status category as one bar (releases, sprints): done, then in progress, then to do, each as wide as its
 * share. Empty work draws an empty track.
 */
export function CategoryProgress({ todo, inProgress, done, size = 'md', 'aria-label': ariaLabel }: CategoryProgressProps) {
  const total = todo + inProgress + done;
  const parts = [
    { key: 'done', value: done },
    { key: 'inProgress', value: inProgress },
    { key: 'todo', value: todo },
  ] as const;
  return (
    <HStack role="img" aria-label={ariaLabel} gap="0" h={size === 'sm' ? '1.5' : '2'} w="full" minW="16" rounded="full" overflow="hidden" bg="bg.muted">
      {total > 0 &&
        parts
          .filter((p) => p.value > 0)
          .map((p) => <Box key={p.key} h="full" flexBasis={`${(p.value / total) * 100}%`} flexShrink={0} bg={`statusCategory.${p.key}.solid`} />)}
    </HStack>
  );
}
