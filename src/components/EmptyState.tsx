import type { ReactNode } from 'react';
import { chakra, EmptyState as ChakraEmptyState, HStack, Text, VStack } from '@chakra-ui/react';
import { Inbox } from 'lucide-react';
import { m } from 'motion/react';
import { curves, durations } from '../motion/tokens';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** A button or link that resolves the empty state. */
  action?: ReactNode;
  /** A second, quieter way on, beside the action ("Clear filters" beside "Create record"). */
  secondaryAction?: ReactNode;
  /**
   * Why it's empty (UI round 9, step 53; the design canvas's kinds): `first-use` (nothing yet: invites a first step, in
   * the accent), `no-results` (a search found nothing), `no-filter-match` (the filters leave nothing), `completed` (all
   * done), `prerequisite` (something else comes first), `error` (it couldn't load: the drawing in the danger tint).
   * It sets the drawing's tone unless `tone` is given.
   */
  kind?: 'first-use' | 'no-results' | 'no-filter-match' | 'completed' | 'prerequisite' | 'error';
  /**
   * How much room it takes: `xs` is one quiet line with a small icon (a board column, a short list); `sm` a block for a
   * panel or a table (the default); `md` a page's main area, with more air around it.
   */
  size?: 'xs' | 'sm' | 'md';
  /** Its drawing's colour: `neutral` (the default, calm), `accent` (a place that invites a first step) or `danger`. */
  tone?: 'neutral' | 'accent' | 'danger';
}

type Tone = 'neutral' | 'accent' | 'danger';
const TONE: Record<Tone, { border: string; bg: string; fg: string }> = {
  neutral: { border: 'border.muted', bg: 'bg.muted', fg: 'fg.muted' },
  accent: { border: 'accent.muted', bg: 'accent.subtle', fg: 'accent.fg' },
  danger: { border: 'red.muted', bg: 'red.subtle', fg: 'fg.error' },
};

const MotionSpan = chakra(m.span, {}, { forwardProps: ['transition'] });

/**
 * The empty state's drawing: its icon in a soft round badge with a hairline ring, that settles in once (ADR 0058: a
 * hello, not a loop; with reduced motion it only fades in).
 */
function Drawing({ children, size, tone }: { children: ReactNode; size: 'sm' | 'md'; tone: Tone }) {
  return (
    <MotionSpan
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      boxSize={size === 'md' ? '14' : '12'}
      rounded="full"
      borderWidth="1px"
      borderColor={TONE[tone].border}
      bg={TONE[tone].bg}
      color={TONE[tone].fg}
      _icon={{ boxSize: size === 'md' ? '6' : '5' }}
      initial={{ opacity: 0, transform: 'scale(0.92)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      transition={{ duration: durations.panel, ease: curves.out }}
    >
      {children}
    </MotionSpan>
  );
}

/** What a list, table or page shows when there is nothing in it: a calm drawing, what's missing, what to do, and a way on. */
export function EmptyState({ title, description, icon, action, secondaryAction, kind, size = 'sm', tone: own }: EmptyStateProps) {
  const tone: Tone = own ?? (kind === 'first-use' ? 'accent' : kind === 'error' ? 'danger' : 'neutral');
  const actions = action != null && secondaryAction != null ? <HStack gap="2" justify="center" wrap="wrap">{action}{secondaryAction}</HStack> : (action ?? secondaryAction);
  if (size === 'xs') {
    return (
      <HStack gap="2" justify="center" py="4" px="3" color="fg.muted" textStyle="sm" textAlign="center" _icon={{ boxSize: '4', flexShrink: 0 }}>
        {icon}
        <VStack gap="0.5">
          <Text as="span">{title}</Text>
          {description != null && <Text as="span" textStyle="caption" color="fg.subtle">{description}</Text>}
          {actions}
        </VStack>
      </HStack>
    );
  }
  return (
    <ChakraEmptyState.Root size={size} py={size === 'md' ? '16' : '10'} px="6">
      <ChakraEmptyState.Content gap="4" data-empty-kind={kind}>
        <ChakraEmptyState.Indicator>
          <Drawing size={size} tone={tone}>{icon ?? <Inbox />}</Drawing>
        </ChakraEmptyState.Indicator>
        <VStack gap="1.5" textAlign="center" maxW="md">
          <ChakraEmptyState.Title textStyle={size === 'md' ? 'lg' : 'md'} fontWeight="semibold" color="fg">
            {title}
          </ChakraEmptyState.Title>
          {description != null && (
            <ChakraEmptyState.Description textStyle="sm" color="fg.muted">
              {description}
            </ChakraEmptyState.Description>
          )}
        </VStack>
        {actions}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  );
}
