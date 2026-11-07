import { chakra, type HTMLChakraProps } from '@chakra-ui/react';
import { useFormatters } from '../utils/format';
import { useLoading } from '../skeleton/loading';
import { ghostCss } from '../skeleton/bones';

export interface CountBadgeProps extends Omit<HTMLChakraProps<'span'>, 'children'> {
  value: number;
  tone?: 'neutral' | 'accent' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  /** Its count is coming (ADR 0061): drawn as its ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

const TONES = {
  neutral: { bg: 'bg.emphasized', color: 'fg' },
  accent: { bg: 'accent.subtle', color: 'accent.fg' },
  danger: { bg: 'red.subtle', color: 'red.fg' },
  warning: { bg: 'orange.subtle', color: 'orange.fg' },
} as const;

/** A count in a small round badge, in the reader's digits: beside a title ("Records 130"), a group, a tab. */
export function CountBadge({ value, tone = 'neutral', size = 'sm', loading: own, ...rest }: CountBadgeProps) {
  const fmt = useFormatters();
  const loading = useLoading(own);
  return (
    <chakra.span
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minW={size === 'sm' ? '5' : '6'}
      h={size === 'sm' ? '5' : '6'}
      px="1.5"
      borderRadius="full"
      textStyle="xs"
      fontWeight="semibold"
      fontVariantNumeric="tabular-nums"
      lineHeight="1"
      flexShrink={0}
      {...TONES[tone]}
      css={loading ? ghostCss : undefined}
      aria-hidden={loading || undefined}
      {...rest}
    >
      {loading ? '  ' : fmt.number(value)}
    </chakra.span>
  );
}
