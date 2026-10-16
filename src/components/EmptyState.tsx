import type { ReactNode } from 'react';
import { chakra, EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react';
import { Inbox } from 'lucide-react';
import { m } from 'motion/react';
import { curves, durations } from '../motion/tokens';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** A button or link that resolves the empty state. */
  action?: ReactNode;
  size?: 'sm' | 'md';
}

const MotionSpan = chakra(m.span, {}, { forwardProps: ['transition'] });

/** Where the three small sparks around the drawing settle, and when each appears (ADR 0058). */
const SPARKS = [
  { top: '-2px', insetEnd: '-6px', size: '6px', tone: 'accent.solid', delay: 0.18 },
  { bottom: '2px', insetStart: '-8px', size: '5px', tone: 'warning.solid', delay: 0.26 },
  { top: '10px', insetStart: '-10px', size: '4px', tone: 'success.solid', delay: 0.34 },
] as const;

/**
 * The empty state's drawing: its icon in a soft round badge that pops in, and three small sparks that appear once
 * around it and stay. A pleasant hello, not a loop; with reduced motion they only fade in.
 */
function Drawing({ children }: { children: ReactNode }) {
  return (
    <chakra.span position="relative" display="inline-flex">
      <MotionSpan
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        boxSize="12"
        rounded="full"
        bg="accent.subtle"
        color="accent.fg"
        _icon={{ boxSize: '5' }}
        initial={{ opacity: 0, transform: 'scale(0.9)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        transition={{ duration: durations.panel, ease: curves.out }}
      >
        {children}
      </MotionSpan>
      {SPARKS.map(({ tone, size, delay, ...place }, i) => (
        <MotionSpan
          key={i}
          aria-hidden="true"
          position="absolute"
          {...place}
          w={size}
          h={size}
          rounded="full"
          bg={tone}
          initial={{ opacity: 0, transform: 'scale(0.6)' }}
          animate={{ opacity: 0.8, transform: 'scale(1)' }}
          transition={{ duration: durations.base, ease: curves.out, delay }}
        />
      ))}
    </chakra.span>
  );
}

/** What a list, table or page shows when there is nothing in it: a small drawing, a friendly sentence, and a way on. */
export function EmptyState({ title, description, icon, action, size = 'sm' }: EmptyStateProps) {
  return (
    <ChakraEmptyState.Root size={size}>
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>
          <Drawing>{icon ?? <Inbox />}</Drawing>
        </ChakraEmptyState.Indicator>
        <VStack gap="1" textAlign="center">
          <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
          {description != null && <ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>}
        </VStack>
        {action}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  );
}
