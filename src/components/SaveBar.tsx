import { useId, type ReactNode } from 'react';
import { Box, chakra, Stack, Text } from '@chakra-ui/react';
import { FilePen } from 'lucide-react';
import { Presence } from '../motion/components';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';
import { formatMessage } from '../texts/format';
import { Button } from './Button';

const UNSAVED = "{count, plural, one {# change isn't saved yet} other {# changes aren't saved yet}}";

export interface SaveBarProps {
  /** Whether there's something to save: the bar rises at the foot of the window while there is, and goes when not. */
  open: boolean;
  onSave: () => void;
  /** Puts the form back as it was saved. */
  onDiscard: () => void;
  /** How many changes wait, for the line under the question ("1 change isn't saved yet"); 1 unless given. */
  count?: number;
  /** The line under the question in the host's words, instead of the count's. */
  message?: ReactNode;
  /** The question: the `saveBar` label ("Save your changes?") unless given. */
  title?: ReactNode;
  /** The save button: the `save` label ("Save") unless given. */
  saveLabel?: ReactNode;
  /** Saving: the save button spins and Discard waits. */
  busy?: boolean;
  /** Save is off (what's typed can't be saved yet); Discard still works. */
  saveDisabled?: boolean;
}

/**
 * A settings page's unsaved changes: a bar on the selected tint floating at the foot of the window, centred, with the
 * question, how many changes wait, Discard and Save. For a page edited in place (sign-up, a portal's settings), where
 * there's no dialog to save from; a form in a dialog saves from its own footer.
 */
export function SaveBar({ open, onSave, onDiscard, count = 1, message, title, saveLabel, busy, saveDisabled }: SaveBarProps) {
  const labels = useAbpLabels();
  const { locale } = useAbpLocale();
  const heading = useId();
  return (
    <Box position="fixed" insetInline="0" bottom="6" zIndex="sticky" display="flex" justifyContent="center" px="4" pointerEvents="none">
      <Presence show={open} from="rise" maxW="full">
        <chakra.section
          aria-labelledby={heading}
          data-testid="save-bar"
          pointerEvents="auto"
          display="flex"
          flexWrap={{ base: 'wrap', sm: 'nowrap' }}
          alignItems="center"
          gap="3"
          p="2"
          borderRadius="l3"
          bg="bg.selected"
          color="accent.fg"
        >
          <Box flex="none" display="inline-flex" alignItems="center" justifyContent="center" boxSize="8" borderRadius="l2" bg="bg.panel" aria-hidden>
            <FilePen size={18} strokeWidth={1.75} />
          </Box>
          <Stack gap="0" flex="1" minW={{ base: '0', sm: '11.25rem' }} me={{ sm: '4' }} aria-live="polite">
            <Text id={heading} textStyle="body.sm" fontWeight="bold" color="fg">
              {title ?? labels.saveBar ?? 'Save your changes?'}
            </Text>
            <Text textStyle="caption">{message ?? formatMessage(locale, labels.unsavedChanges ?? UNSAVED, { count })}</Text>
          </Stack>
          <Button variant="ghost" color="accent.fg" fontWeight="bold" _hover={{ bg: 'accent.emphasized' }} onClick={onDiscard} disabled={busy}>
            {labels.discard ?? 'Discard'}
          </Button>
          <Button variant="primary" onClick={onSave} loading={busy} disabled={saveDisabled}>
            {saveLabel ?? labels.save ?? 'Save'}
          </Button>
        </chakra.section>
      </Presence>
    </Box>
  );
}
