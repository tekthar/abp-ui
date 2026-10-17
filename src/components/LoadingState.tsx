import { Box, VisuallyHidden } from '@chakra-ui/react';
import { useTodaLabels } from '../provider/labels';
import { TextBone } from '../skeleton/bones';

/**
 * Placeholder lines while content loads, for a free-form block no component describes. A page draws its own layout
 * loading instead (ADR 0061); this is never a page's whole answer. Announces "Loading" to screen readers.
 */
export function LoadingState({ lines = 3, label }: { lines?: number; label?: string }) {
  const labels = useTodaLabels();
  return (
    <Box aria-busy="true" role="status">
      <VisuallyHidden>{label ?? labels.loading}</VisuallyHidden>
      <TextBone lines={lines} width="full" />
    </Box>
  );
}
