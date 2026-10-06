import { Skeleton, Stack, VisuallyHidden } from '@chakra-ui/react';
import { useTodaLabels } from '../provider/labels';

/** Placeholder lines while content loads. Announces "Loading" to screen readers. */
export function LoadingState({ lines = 3, label }: { lines?: number; label?: string }) {
  const labels = useTodaLabels();
  return (
    <Stack gap="2" aria-busy="true" role="status">
      <VisuallyHidden>{label ?? labels.loading}</VisuallyHidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height="4" width={i === lines - 1 ? '3/5' : 'full'} />
      ))}
    </Stack>
  );
}
