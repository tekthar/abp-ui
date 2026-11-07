import type { ReactNode } from 'react';
import { chakra } from '@chakra-ui/react';
import { CountBadge } from './CountBadge';
import { useLoading } from '../skeleton/loading';

export interface AttentionChipProps {
  count: number;
  children: ReactNode;
  tone?: 'danger' | 'warning' | 'neutral';
  /** It filters the list it sits over: pressed while that filter is on. */
  pressed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Its count is coming (ADR 0061): the count's ghost, the chip not yet pressable. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/**
 * Something that needs attention, with how many: "1 Overdue", "2 Due in 7 days". A button that filters to them when it
 * has a click; a quiet count when there are none.
 */
export function AttentionChip({ count, children, tone = 'neutral', pressed, onClick, disabled, loading: own }: AttentionChipProps) {
  const loading = useLoading(own);
  return (
    <chakra.button
      type="button"
      display="inline-flex"
      alignItems="center"
      gap="2"
      h="8"
      ps="2"
      pe="3"
      borderWidth="1px"
      borderRadius="l2"
      bg={pressed ? 'bg.selected' : 'bg'}
      borderColor={pressed ? 'border.accent' : 'border'}
      color="fg"
      textStyle="sm"
      whiteSpace="nowrap"
      cursor={onClick ? 'pointer' : 'default'}
      transition="background 0.15s, border-color 0.15s"
      _hover={onClick ? { bg: pressed ? 'bg.selected' : 'bg.subtle' } : undefined}
      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
      focusVisibleRing="outside"
      aria-pressed={onClick ? Boolean(pressed) : undefined}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <CountBadge loading={loading} value={count} tone={count === 0 ? 'neutral' : tone === 'neutral' ? 'neutral' : tone} />
      {children}
    </chakra.button>
  );
}
